/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2020-2024 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#include "NotificationThread.h"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <functional>
#include <iomanip>
#include <iostream>
#include <map>
#include <memory>
#include <random>
#include <regex>
#include <sstream>

#include <stdlib.h>
#include <time.h>

#include <openssl/hmac.h>

#include <curl/curl.h>

#include <nlohmann/json.hpp>

#include "App.h"
#include "CurlWorker.h"
#include "Notification.h"
#include "NotificationThread.h"
#include "SQLite.h"
#include "Utils.h"
#include "Metrics.h"
#include "MetricsLabels.h"
#include "MasterClientMetrics.h"

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/transport/TSocket.h>
#include <thrift/transport/TBufferTransports.h>
#include <thrift/transport/TTransportUtils.h>

#include "ChronosMaster.h"

namespace {

constexpr int PHRASE_SYNC_INTERVAL_SECONDS = 300;
constexpr int MASTER_SYNC_TIMEOUT_MS = 1000;

constexpr size_t MIME_ENCODED_WORD_MAX_LEN = 75;
constexpr size_t MIME_ENCODED_WORD_PREFIX_LEN = 10; // =?UTF-8?Q?
constexpr size_t MIME_ENCODED_WORD_SUFFIX_LEN = 2;  // ?=
constexpr size_t MIME_ENCODED_TEXT_MAX_LEN =
	MIME_ENCODED_WORD_MAX_LEN - MIME_ENCODED_WORD_PREFIX_LEN - MIME_ENCODED_WORD_SUFFIX_LEN;

bool needsMimeHeaderEncoding(const std::string &value)
{
	for (unsigned char c : value)
	{
		if (c < 0x20 || c > 0x7E)
			return true;
	}
	return false;
}

size_t utf8CharLen(unsigned char c)
{
	if ((c & 0x80) == 0)
		return 1;
	if ((c & 0xE0) == 0xC0)
		return 2;
	if ((c & 0xF0) == 0xE0)
		return 3;
	if ((c & 0xF8) == 0xF0)
		return 4;
	return 1;
}

std::string qpEncodeMimeQ(const unsigned char *data, const size_t len)
{
	static const char hex[] = "0123456789ABCDEF";
	std::string result;
	result.reserve(len * 3);

	for (size_t i = 0; i < len; ++i)
	{
		const unsigned char c = data[i];
		if (c == ' ')
		{
			result += '_';
		}
		else if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
			|| c == '!' || c == '*' || c == '+' || c == '-' || c == '/')
		{
			result += static_cast<char>(c);
		}
		else
		{
			result += '=';
			result += hex[c >> 4];
			result += hex[c & 0x0F];
		}
	}

	return result;
}

std::string encodeMimeWords(const std::string &utf8)
{
	std::string result;
	std::string currentChunk;

	auto flush = [&]() {
		if (currentChunk.empty())
			return;

		if (!result.empty())
			result += ' ';

		result += "=?UTF-8?Q?";
		result += currentChunk;
		result += "?=";
		currentChunk.clear();
	};

	for (size_t i = 0; i < utf8.size(); )
	{
		const size_t charLen = std::min(utf8CharLen(static_cast<unsigned char>(utf8[i])), utf8.size() - i);
		const std::string encoded = qpEncodeMimeQ(
			reinterpret_cast<const unsigned char *>(utf8.data() + i), charLen);

		if (!currentChunk.empty() && currentChunk.size() + encoded.size() > MIME_ENCODED_TEXT_MAX_LEN)
			flush();

		currentChunk += encoded;
		i += charLen;
	}

	flush();
	return result;
}

std::string encodeHeaderValue(std::string value)
{
	const std::string forbidden = "\r\n";

	std::size_t pos;
	while ((pos = value.find_first_of(forbidden)) != std::string::npos)
		value.erase(value.begin() + static_cast<std::ptrdiff_t>(pos));

	if (value.size() >= 5 && value[0] == '"')
	{
		const std::size_t closeQuote = value.find('"', 1);
		if (closeQuote != std::string::npos && closeQuote + 2 < value.size()
			&& value[closeQuote + 1] == ' ' && value[closeQuote + 2] == '<'
			&& value.back() == '>')
		{
			const std::string displayName = value.substr(1, closeQuote - 1);
			const std::string addressPart = value.substr(closeQuote);

			if (needsMimeHeaderEncoding(displayName))
				return '"' + encodeMimeWords(displayName) + '"' + addressPart;

			return value;
		}
	}

	if (needsMimeHeaderEncoding(value))
		return encodeMimeWords(value);

	return value;
}

// Mirrors PHP htmlentities($value, ENT_COMPAT, 'UTF-8') for the characters that
// matter inside HTML text/attributes. Non-ASCII bytes are left as UTF-8, which
// renders identically since the HTML part is sent as UTF-8.
std::string htmlEscape(const std::string &in)
{
	std::string out;
	out.reserve(in.size());
	for (const char c : in)
	{
		switch (c)
		{
		case '&': out += "&amp;"; break;
		case '<': out += "&lt;"; break;
		case '>': out += "&gt;"; break;
		case '"': out += "&quot;"; break;
		default:  out += c; break;
		}
	}
	return out;
}

// Mirrors PHP nl2br(): inserts <br /> before each line break while keeping the
// original newline characters.
std::string nl2br(const std::string &in)
{
	std::string out;
	out.reserve(in.size() + 16);
	for (size_t i = 0; i < in.size(); ++i)
	{
		const char c = in[i];
		if (c == '\r')
		{
			out += "<br />";
			out += '\r';
			if (i + 1 < in.size() && in[i + 1] == '\n')
			{
				out += '\n';
				++i;
			}
		}
		else if (c == '\n')
		{
			out += "<br />";
			out += '\n';
			if (i + 1 < in.size() && in[i + 1] == '\r')
			{
				out += '\r';
				++i;
			}
		}
		else
		{
			out += c;
		}
	}
	return out;
}

std::string currentYear()
{
	const time_t now = time(nullptr);
	struct tm parsedTime;
	if(gmtime_r(&now, &parsedTime) == nullptr)
		return "";

	char buffer[8];
	if(std::strftime(buffer, sizeof(buffer), "%Y", &parsedTime) == 0)
		return "";

	return buffer;
}

std::string typeToString(Chronos::NotificationType_t type)
{
	using namespace Chronos;

	switch (type)
	{
	case NOTIFICATION_TYPE_FAILURE:
		return "failure";
	case NOTIFICATION_TYPE_SUCCESS:
		return "success";
	case NOTIFICATION_TYPE_DISABLE:
		return "disable";
	case NOTIFICATION_TYPE_SSL_CERT_EXPIRY:
		return "ssl_cert_expiry";
	default:
		return "unknown";
	}
}

std::string replaceVars(const std::string &text, const std::unordered_map<std::string, std::string> &vars)
{
	static const std::regex re(R"(\$\{([A-Za-z0-9]+)\})");

	std::string out;
	out.reserve(text.size());

	auto it = std::sregex_iterator(text.begin(), text.end(), re);
	const auto end = std::sregex_iterator();
	std::size_t lastPos = 0;

	for(; it != end; ++it)
	{
		const std::smatch &m = *it;
		const std::size_t matchPos = static_cast<std::size_t>(m.position(0));
		out.append(text, lastPos, matchPos - lastPos);

		const auto vit = vars.find(m[1].str());
		if(vit != vars.end())
		{
			out += vit->second;
		}
		else
		{
			out += m[0].str();
		}

		lastPos = matchPos + static_cast<std::size_t>(m.length(0));
	}

	out.append(text, lastPos, std::string::npos);
	return out;
}

void replaceVars(::nlohmann::json &j, const std::unordered_map<std::string, std::string> &vars, unsigned int depth = 0)
{
	constexpr unsigned int MAX_DEPTH = 10;

	if (depth > MAX_DEPTH)
	{
		throw std::runtime_error("Maximum recursion depth reached!");
	}

	for(auto it = j.begin(); it != j.end(); ++it)
	{
		if (it->is_structured())
		{
			replaceVars(*it, vars, depth + 1);
		}
		else if (it->is_string())
		{
			*it = replaceVars(it->get<std::string>(), vars);
		}
	}
}

struct ResponseLimiterState
{
	size_t bytes{0};
	size_t maxBytes{0};
};

size_t curlResponseLimiterWriteFunction(char *buffer, size_t size, size_t nitems, void *userData)
{
	ResponseLimiterState *state = reinterpret_cast<ResponseLimiterState *>(userData);
	std::size_t bytes = size * nitems;

	state->bytes += bytes;
	if (state->bytes > state->maxBytes)
	{
		return 0;
	}

	return bytes;
}

struct WebhookRequest
{
	~WebhookRequest()
	{
		if (headers != nullptr)
		{
			curl_slist_free_all(headers);
		}
	}

	curl_slist *headers{nullptr};
	std::string payload;
	ResponseLimiterState responseLimiterState;
};

struct MailRequest
{
	~MailRequest()
	{
		if (recipients != nullptr)
		{
			curl_slist_free_all(recipients);
		}
	}

	curl_slist *recipients{nullptr};
	std::string data;
};

bool webhookHttpStatusRetryable(long httpCode)
{
	switch(httpCode)
	{
	case 408:
	case 429:
	case 500:
	case 502:
	case 503:
	case 504:
		return true;
	default:
		return false;
	}
}

bool webhookCurlRetryable(CURLcode res)
{
	switch(res)
	{
	case CURLE_COULDNT_CONNECT:
	case CURLE_OPERATION_TIMEDOUT:
	case CURLE_GOT_NOTHING:
	case CURLE_SEND_ERROR:
	case CURLE_RECV_ERROR:
	case CURLE_SSL_CONNECT_ERROR:
	case CURLE_COULDNT_RESOLVE_HOST:
	case CURLE_FAILED_INIT:
#ifdef CURLE_HTTP2
	case CURLE_HTTP2:
#endif
#ifdef CURLE_HTTP2_STREAM
	case CURLE_HTTP2_STREAM:
#endif
		return true;
	default:
		return false;
	}
}

bool webhookFailureRetryable(CURLcode res, long httpCode)
{
	if(httpCode >= 200 && httpCode < 300)
		return false;
	if(httpCode > 0)
		return webhookHttpStatusRetryable(httpCode);
	if(res == CURLE_WRITE_ERROR || res == CURLE_ABORTED_BY_CALLBACK)
		return false;
	return webhookCurlRetryable(res);
}

double webhookRetryDelaySeconds(int retryNumber, int baseDelayMs, int maxDelayMs, curl_off_t retryAfterSeconds)
{
	double delayMs = 0;
	if(retryAfterSeconds > 0)
	{
		delayMs = static_cast<double>(retryAfterSeconds) * 1000.0;
	}
	else
	{
		if(retryNumber < 1)
			retryNumber = 1;
		int shift = retryNumber - 1;
		if(shift > 20)
			shift = 20;
		delayMs = static_cast<double>(baseDelayMs) * std::ldexp(1.0, shift);
	}

	const double maxMs = static_cast<double>(maxDelayMs > 0 ? maxDelayMs : 0);
	if(delayMs > maxMs)
		delayMs = maxMs;

	static thread_local std::mt19937 rng{std::random_device{}()};
	std::uniform_real_distribution<double> dist(0.5, 1.5);
	delayMs *= dist(rng);
	if(delayMs > maxMs)
		delayMs = maxMs;
	if(delayMs < 0)
		delayMs = 0;
	return delayMs / 1000.0;
}

} // anon ns

class Mail
{
	struct HeaderItem
	{
		std::string value;
		bool placeholders;
	};

public:
	Mail()
	{
		std::random_device rd;
		std::mt19937_64 gen(static_cast<uint64_t>(rd())
			^ static_cast<uint64_t>(std::chrono::steady_clock::now().time_since_epoch().count()));

		std::stringstream ss;
		ss << "--==_boundary_" << std::hex << std::setfill('0') << std::setw(16) << gen();
		m_boundary = ss.str();
	}

	void addHeader(const std::string &key, const std::string &value, bool placeholders = false)
	{
		m_headers.emplace(key, HeaderItem{value, placeholders});
	}

	void assign(const std::string &key, const std::string &value)
	{
		m_vars[key] = value;
	}

	void setPlainText(const std::string &plainText)
	{
		m_plainText = plainText;
	}

	void setHtmlText(const std::string &htmlText)
	{
		m_htmlText = htmlText;
	}

	void setMailFrom(const std::string &address)
	{
		m_mailFrom = address;
	}

	void setVerp(const std::string &type, const std::string &arg, const std::string &address, const std::string &secret)
	{
		const std::string payload = type + "-" + arg;

		unsigned char md[EVP_MAX_MD_SIZE];
		unsigned int mdLength = 0;

		if (HMAC(EVP_sha256(), secret.c_str(), secret.size(), reinterpret_cast<const unsigned char *>(payload.c_str()), payload.size(), md, &mdLength) == nullptr)
		{
			throw std::runtime_error("HMAC() failed!");
		}

		if (mdLength != 32)
		{
			throw std::runtime_error("Unexpected HMAC md length!");
		}

		std::stringstream hash;
		for (unsigned int i = 0; i < 8; ++i)
		{
			hash << std::setfill('0') << std::setw(2) << std::hex << static_cast<unsigned int>(md[i]);
		}

		std::string mailFrom = address;
		Chronos::Utils::replace(mailFrom, "%s", payload + "-" + hash.str());
		setMailFrom(mailFrom);
	}

	void setRcptTo(const std::string &address)
	{
		m_rcptTo = address;
	}

	const std::string &mailFrom() const
	{
		return m_mailFrom;
	}

	const std::string &rcptTo() const
	{
		return m_rcptTo;
	}

	std::string dump() const
	{
		std::stringstream ss;
		buildMail(ss);
		return ss.str();
	}

private:
	void buildMail(std::stringstream &out) const
	{
		constexpr const char CRLF[] = "\r\n";

		for(const auto &headerItem : m_headers)
		{
			out << headerItem.first << ": "
				<< sanitizeHeader(headerItem.second.placeholders
					? prepareText(headerItem.second.value, false)
					: headerItem.second.value)
				<< CRLF;
		}

		out << "Mime-Version: 1.0" << CRLF;
		out << "Content-Type: multipart/alternative; boundary=\"" << m_boundary << "\"; charset=UTF-8" << CRLF;
		out << CRLF;

		// Plain text part first (least preferred), HTML part last, as in the PHP API.
		out << "--" << m_boundary << CRLF;
		out << "Content-Type: text/plain; charset=UTF-8" << CRLF;
		out << "Content-Transfer-Encoding: 8bit" << CRLF;
		out << CRLF;
		out << prepareText(m_plainText, false) << CRLF;

		out << "--" << m_boundary << CRLF;
		out << "Content-Type: text/html; charset=UTF-8" << CRLF;
		out << "Content-Transfer-Encoding: 8bit" << CRLF;
		out << CRLF;
		out << prepareText(m_htmlText, true) << CRLF;

		out << "--" << m_boundary << "--" << CRLF;
	}

	// Mirrors PHP Mail::prepareText() in api/lib/Mail.php: a variable pass
	// ($var / $.var with recursive expansion for the leading dot) followed by a
	// link pass ({link|url|text}).
	std::string prepareText(const std::string &text, bool isHtml) const
	{
		return renderLinks(renderVars(text, isHtml), isHtml);
	}

	std::string renderVars(const std::string &text, bool isHtml) const
	{
		static const std::regex re(R"(\$(\.?[A-Za-z0-9]+))");

		std::string out;
		out.reserve(text.size());

		auto it = std::sregex_iterator(text.begin(), text.end(), re);
		const auto end = std::sregex_iterator();
		std::size_t lastPos = 0;

		for(; it != end; ++it)
		{
			const std::smatch &m = *it;
			const std::size_t matchPos = static_cast<std::size_t>(m.position(0));
			out.append(text, lastPos, matchPos - lastPos);

			std::string key = m[1].str();
			bool expand = false;
			if(!key.empty() && key[0] == '.')
			{
				expand = true;
				key = key.substr(1);
			}

			const auto vit = m_vars.find(key);
			if(vit != m_vars.end())
			{
				std::string value = vit->second;
				if(isHtml)
					value = nl2br(htmlEscape(value));
				if(expand)
					value = prepareText(value, isHtml);
				out += value;
			}
			else
			{
				out += "UNKNOWN_VARIABLE:" + key;
			}

			lastPos = matchPos + static_cast<std::size_t>(m.length(0));
		}

		out.append(text, lastPos, std::string::npos);
		return out;
	}

	std::string renderLinks(const std::string &text, bool isHtml) const
	{
		static const std::regex re(R"(\{([A-Za-z]+)\|([^|]+)\|([^}]+)\})");

		std::string out;
		auto it = std::sregex_iterator(text.begin(), text.end(), re);
		const auto end = std::sregex_iterator();
		std::size_t lastPos = 0;

		for(; it != end; ++it)
		{
			const std::smatch &m = *it;
			const std::size_t matchPos = static_cast<std::size_t>(m.position(0));
			out.append(text, lastPos, matchPos - lastPos);

			if(m[1].str() == "link")
			{
				if(isHtml)
					out += "<a href=\"" + m[2].str() + "\" target=\"_blank\">" + m[3].str() + "</a>";
				else
					out += m[2].str();
			}

			lastPos = matchPos + static_cast<std::size_t>(m.length(0));
		}

		out.append(text, lastPos, std::string::npos);
		return out;
	}

	std::string sanitizeHeader(const std::string &in) const
	{
		return encodeHeaderValue(in);
	}

private:
	std::string m_mailFrom;
	std::string m_rcptTo;
	std::string m_boundary;
	std::unordered_map<std::string, HeaderItem> m_headers;
	std::unordered_map<std::string, std::string> m_vars;
	std::string m_plainText;
	std::string m_htmlText;
};

namespace {

size_t curlStringReadFunction(char *buffer, size_t size, size_t nitems, void *userData)
{
	if(userData == nullptr)
	{
		std::cerr << "curlStringReadFunction(): userData is nullptr!" << std::endl;
		return 0;
	}

	std::string *stringData = reinterpret_cast<std::string *>(userData);

	std::size_t bytesToRead = std::min(stringData->size(), size * nitems);
	if(bytesToRead > 0)
	{
		std::memcpy(buffer, stringData->c_str(), bytesToRead);
		stringData->erase(stringData->begin(), stringData->begin() + bytesToRead);
	}

	return bytesToRead;
}

void storeNotification(const Chronos::Notification &n,
	const NotificationChannel &channel,
	NotificationResult::type result,
	const std::string &resultDetails,
	const std::unique_ptr<Chronos::MySQL_DB> &db)
{
	try
	{
		db->query("INSERT INTO `notification`(`jobid`,`joblogid`,`date`,`type`,`date_started`,`date_planned`,`url`,`execution_status`,`execution_status_text`,`execution_http_status`,`notificationchannelid`,`notificationchanneltype`,`notificationchanneldestination`,`result`,`result_details`) "
			"VALUES(%d,%d,%u,%u,%u,%u,'%q',%u,'%q',%u,%v,%u,'%q',%u,'%q')",
			n.jobID,
			n.jobLogID,
			static_cast<unsigned long>(time(nullptr)),
			static_cast<unsigned long>(n.type),
			static_cast<unsigned long>(n.dateStarted),
			static_cast<unsigned long>(n.datePlanned),
			n.url.c_str(),
			static_cast<unsigned long>(n.status),
			n.statusText.c_str(),
			static_cast<unsigned long>(n.httpStatus),
			channel.channelId,
			static_cast<unsigned long>(channel.type),
			channel.destination.c_str(),
			static_cast<unsigned long>(result),
			resultDetails.c_str());
	}
	catch (const std::exception &ex)
	{
		std::cerr << "NotificationThread::storeNotification(): Failed to store notification: " << ex.what() << std::endl;
		Chronos::Metrics::instance().incrementMysqlWriteError("notification_insert");
	}
}

} // anon ns

using namespace Chronos;

class NotificationThread::DispatchThread
{
public:
	using DoneCallback = std::function<void(CURLcode, const std::unique_ptr<MySQL_DB> &)>;

private:
	struct QueueEntry
	{
		CURL *handle;
		DoneCallback onDone;
	};

	struct PendingRequest
	{
		DoneCallback onDone;
	};

public:
	DispatchThread()
	{
		retryQueueMax = App::getInstance()->config->getInt("webhook_retry_queue_max", 2048);
		if(retryQueueMax < 0)
			retryQueueMax = 0;

		queueProcessingTrigger = curlWorker.addAsyncWatcher([this] () {
			processQueue();
		});

		stopTrigger = curlWorker.addAsyncWatcher([this] () {
			curlWorker.stop();
		});

		retryTimer = curlWorker.addTimerWatcher([this] () {
			flushDelayed();
		});

		curlWorker.onDone([this] (CURL *easy, CURLcode res) {
			curlWorker.remove(easy);

			auto it = pendingRequests.find(easy);
			if (it == pendingRequests.end())
			{
				std::cerr << "NotificationThread::DispatchThread::curlWorker.onDone(): Easy handle not found in pending requests!" << std::endl;
				curl_easy_cleanup(easy);
				return;
			}

			it->second.onDone(res, db);
			pendingRequests.erase(it);
			Metrics::instance().setNotificationDispatchInflight(static_cast<double>(pendingRequests.size()));
		});
	}

	void run()
	{
		std::cout << "NotificationThread::DispatchThread::run(): Entered" << std::endl;

		db = App::getInstance()->createMySQLConnection();

		stop = false;
		while(!stop)
		{
			curlWorker.run();
		}

		if(retryTimer)
			retryTimer->stop();
		while(!delayed.empty())
		{
			curl_easy_cleanup(delayed.begin()->second.handle);
			delayed.erase(delayed.begin());
		}
		Metrics::instance().setNotificationRetryQueueDepth(0);

		std::cout << "NotificationThread::DispatchThread::run(): Finished" << std::endl;
	}

	void stopThread()
	{
		stop = true;
		stopTrigger->fire();
	}

	bool isStopping() const
	{
		return stop.load();
	}

	void submit(CURL *handle, const DoneCallback &onDone)
	{
		{
			std::lock_guard<std::mutex> lg(queueMutex);
			queue.push(QueueEntry{handle, onDone});
			Metrics::instance().setNotificationDispatchQueueDepth(static_cast<double>(queue.size()));
		}
		queueProcessingTrigger->fire();
	}

	// Dispatch-thread only (webhook onDone / retry timer).
	bool submitDelayed(CURL *handle, const DoneCallback &onDone, double delaySeconds)
	{
		if(stop)
			return false;
		if(static_cast<int>(delayed.size()) >= retryQueueMax)
			return false;

		const auto due = std::chrono::steady_clock::now()
			+ std::chrono::duration_cast<std::chrono::steady_clock::duration>(
				std::chrono::duration<double>(delaySeconds));
		delayed.emplace(due, QueueEntry{handle, onDone});
		Metrics::instance().setNotificationRetryQueueDepth(static_cast<double>(delayed.size()));
		armRetryTimer();
		return true;
	}

private:
	void armRetryTimer()
	{
		if(!retryTimer)
			return;
		if(delayed.empty())
		{
			retryTimer->stop();
			return;
		}

		const auto now = std::chrono::steady_clock::now();
		double delay = std::chrono::duration<double>(delayed.begin()->first - now).count();
		if(delay < 0)
			delay = 0;
		retryTimer->set(delay);
	}

	void flushDelayed()
	{
		const auto now = std::chrono::steady_clock::now();
		while(!delayed.empty() && delayed.begin()->first <= now)
		{
			QueueEntry entry = std::move(delayed.begin()->second);
			delayed.erase(delayed.begin());
			if(stop)
			{
				curl_easy_cleanup(entry.handle);
				continue;
			}
			submit(entry.handle, entry.onDone);
		}
		Metrics::instance().setNotificationRetryQueueDepth(static_cast<double>(delayed.size()));
		armRetryTimer();
	}

	void processQueue()
	{
		decltype(queue) tempQueue;
		{
			std::unique_lock<std::mutex> lock(queueMutex);
			if(stop)
				return;
			queue.swap(tempQueue);
			Metrics::instance().setNotificationDispatchQueueDepth(static_cast<double>(queue.size()));
		}

		if(!tempQueue.empty())
		{
			while (!tempQueue.empty())
			{
				QueueEntry entry = std::move(tempQueue.front());
				tempQueue.pop();

				pendingRequests.emplace(entry.handle, PendingRequest{entry.onDone});

				if (!curlWorker.add(entry.handle))
				{
					pendingRequests.erase(entry.handle);
					entry.onDone(CURLE_FAILED_INIT, db);
				}

				Metrics::instance().setNotificationDispatchInflight(static_cast<double>(pendingRequests.size()));
			}
		}

		{
			std::lock_guard<std::mutex> lock(queueMutex);
			Metrics::instance().setNotificationDispatchQueueDepth(static_cast<double>(queue.size()));
		}
	}

private:
	std::atomic<bool> stop{false};
	CurlWorker curlWorker;
	std::shared_ptr<AsyncWatcher> queueProcessingTrigger;
	std::shared_ptr<AsyncWatcher> stopTrigger;
	std::shared_ptr<TimerWatcher> retryTimer;

	std::mutex queueMutex;
	std::queue<QueueEntry> queue;
	std::multimap<std::chrono::steady_clock::time_point, QueueEntry> delayed;
	int retryQueueMax = 2048;

	std::unordered_map<CURL *, PendingRequest> pendingRequests;

	std::unique_ptr<MySQL_DB> db;
};

namespace {

struct WebhookSendState
{
	CURL *curl = nullptr;
	std::shared_ptr<WebhookRequest> request;
	Notification notification;
	NotificationChannel channel;
	int attempt = 1;
	int maxAttempts = 3;
	int baseDelayMs = 2000;
	int maxDelayMs = 30000;
	NotificationThread::DispatchThread *dt = nullptr;
};

void webhookOnDone(const std::shared_ptr<WebhookSendState> &state, CURLcode res, const std::unique_ptr<MySQL_DB> &db)
{
	long httpCode = 0;
	curl_easy_getinfo(state->curl, CURLINFO_RESPONSE_CODE, &httpCode);

	const std::string typeLabel = MetricsLabels::notificationTypeLabel(state->notification.type);
	const std::string channelLabel = MetricsLabels::notificationChannelLabel(static_cast<int>(state->channel.type));
	const std::string attemptSuffix = " (attempt " + std::to_string(state->attempt)
		+ "/" + std::to_string(state->maxAttempts) + ")";

	if(httpCode >= 200 && httpCode < 300)
	{
		curl_easy_cleanup(state->curl);
		state->curl = nullptr;
		Metrics::instance().incrementNotificationsSent(typeLabel, channelLabel);
		storeNotification(state->notification, state->channel, NotificationResult::SUCCESS,
			"Success (HTTP " + std::to_string(httpCode) + ")" + attemptSuffix, db);
		return;
	}

	std::string resultDetails;
	if(res != CURLE_OK)
		resultDetails = std::string(curl_easy_strerror(res));
	else
		resultDetails = "HTTP error: " + std::to_string(httpCode);
	resultDetails += attemptSuffix;

	if(webhookFailureRetryable(res, httpCode) && state->attempt < state->maxAttempts)
	{
		curl_off_t retryAfter = 0;
#ifdef CURLINFO_RETRY_AFTER
		curl_easy_getinfo(state->curl, CURLINFO_RETRY_AFTER, &retryAfter);
#endif
		const double delay = webhookRetryDelaySeconds(state->attempt, state->baseDelayMs, state->maxDelayMs, retryAfter);
		state->request->responseLimiterState.bytes = 0;
		if(state->dt->submitDelayed(state->curl, [state](CURLcode r, const std::unique_ptr<MySQL_DB> &d) {
			webhookOnDone(state, r, d);
		}, delay))
		{
			std::cerr << "NotificationThread::sendWebhookNotification(): Retrying webhook in "
				<< delay << "s after " << resultDetails << std::endl;
			Metrics::instance().incrementNotificationRetries(channelLabel);
			++state->attempt;
			return;
		}

		if(state->dt->isStopping())
			resultDetails += "; retries cancelled (stopping)";
		else
			resultDetails += "; retry queue full";
	}

	std::cerr << "NotificationThread::sendWebhookNotification(): Failed to send webhook notification: "
		<< resultDetails << std::endl;
	curl_easy_cleanup(state->curl);
	state->curl = nullptr;
	Metrics::instance().incrementNotificationSendErrors(typeLabel, channelLabel);
	storeNotification(state->notification, state->channel, NotificationResult::FAILED_SEND, resultDetails, db);
}

} // anon ns

NotificationThread *NotificationThread::instance = nullptr;

NotificationThread::NotificationThread()
	: dispatchThread(std::make_unique<DispatchThread>())
{
	if(NotificationThread::instance != nullptr)
		throw std::runtime_error("Notification thread instance already exists");

	NotificationThread::instance = this;

	masterSocket = std::make_shared<apache::thrift::transport::TSocket>(
		App::getInstance()->config->get("master_service_address"),
		App::getInstance()->config->getInt("master_service_port"));
	masterSocket->setConnTimeout(MASTER_SYNC_TIMEOUT_MS);
	masterSocket->setRecvTimeout(MASTER_SYNC_TIMEOUT_MS);
	masterSocket->setSendTimeout(MASTER_SYNC_TIMEOUT_MS);
	masterTransport = std::make_shared<apache::thrift::transport::TBufferedTransport>(masterSocket);
	masterProtocol = std::make_shared<apache::thrift::protocol::TBinaryProtocol>(masterTransport);
	masterClient = std::make_shared<ChronosMasterClient>(masterProtocol);

	defaultLang = App::getInstance()->config->get("default_lang");
	mailFrom = App::getInstance()->config->get("notification_mail_from");
	mailVerpSecret = App::getInstance()->config->get("notification_mail_verp_secret");
	mailSender = App::getInstance()->config->get("notification_mail_sender");
	mailProjectName = App::getInstance()->config->get("notification_mail_project_name");
	mailLogoURL = App::getInstance()->config->get("notification_mail_logo_url");
	smtpServer = App::getInstance()->config->get("smtp_server");
}

NotificationThread::~NotificationThread()
{
	NotificationThread::instance = nullptr;
}

NotificationThread *NotificationThread::getInstance()
{
	if(NotificationThread::instance == nullptr)
		throw std::runtime_error("No notification thread instance available");
	return(NotificationThread::instance);
}

void NotificationThread::addNotification(Notification &&notification)
{
	std::lock_guard<std::mutex> lg(queueMutex);
	queue.push(std::move(notification));
	Metrics::instance().setNotificationQueueDepth(static_cast<double>(queue.size()));
	queueSignal.notify_one();
}

void NotificationThread::stopThread()
{
	stop = true;

	std::lock_guard<std::mutex> lg(queueMutex);
	queueSignal.notify_all();
}

void NotificationThread::run()
{
	std::cout << "NotificationThread::run(): Entered" << std::endl;

	db = App::getInstance()->createMySQLConnection();

	std::thread dispatchThreadObj(std::bind(&DispatchThread::run, dispatchThread.get()));

	decltype(queue) tempQueue;
	time_t tLastPhraseSync = 0;

	stop = false;
	while(!stop)
	{
		{
			std::unique_lock<std::mutex> lock(queueMutex);
			if(queue.empty() && !stop)
				queueSignal.wait(lock);
			if(stop)
				break;
			queue.swap(tempQueue);
		}

		auto numNotifications = tempQueue.size();
		if(numNotifications > 100)
			std::cout << "NotificationThread::run(): " << numNotifications << " notification jobs fetched" << std::endl;

		Metrics::instance().setNotificationQueueDepth(static_cast<double>(numNotifications));

		const auto batchStart = std::chrono::steady_clock::now();
		while(!tempQueue.empty())
		{
			try
			{
				masterTransport->open();

				if(phrases.empty() || (tLastPhraseSync + PHRASE_SYNC_INTERVAL_SECONDS < time(nullptr)))
				{
					syncPhrases();
					tLastPhraseSync = time(nullptr);
				}

				while(!tempQueue.empty())
				{
					Notification notification = std::move(tempQueue.front());
					tempQueue.pop();
					processNotification(notification);
				}

				masterTransport->close();
			}
			catch (const apache::thrift::TException &ex)
			{
				std::cerr << "NotificationThread::run(): Caught thrift exception: " << ex.what() << std::endl;

				// Sleep a bit to avoid too frequent retries
				std::this_thread::sleep_for(std::chrono::milliseconds(250));
			}
		}
		const std::chrono::duration<double> batchElapsed = std::chrono::steady_clock::now() - batchStart;
		Metrics::instance().observeNotificationBatchDurationSeconds(batchElapsed.count());
		{
			std::lock_guard<std::mutex> lg(queueMutex);
			Metrics::instance().setNotificationQueueDepth(static_cast<double>(queue.size()));
		}

		if(numNotifications > 100)
			std::cout << "NotificationThread::run(): Processing " << numNotifications << " took " << batchElapsed.count() << " seconds" << std::endl;
	}

	dispatchThread->stopThread();
	dispatchThreadObj.join();

	std::cout << "NotificationThread::run(): Finished" << std::endl;
}

void NotificationThread::syncPhrases()
{
	try
	{
		Phrases newPhrases;
		callMaster("getPhrases", [&]() {
			masterClient->getPhrases(newPhrases);
		});

		phrases.clear();
		for (const auto &langItem : newPhrases.phrases) {
			for (const auto &phraseItem : langItem.second) {
				phrases[langItem.first][phraseItem.first] = phraseItem.second;
			}
		}
		Metrics::instance().incrementPhraseSync();
	}
	catch (const apache::thrift::TException &ex)
	{
		std::cerr << "NotificationThread::syncPhrases(): Failed to sync phrases: " << ex.what() << std::endl;
		Metrics::instance().incrementPhraseSyncError();
	}
}

std::string NotificationThread::getPhrase(const std::string &lang, const std::string &key) const
{
	auto it = phrases.find(lang);
	if(it != phrases.end())
	{
		const auto it2 = it->second.find(key);
		if(it2 != it->second.end())
			return it2->second;
	}

	if(lang != defaultLang)
		return getPhrase(defaultLang, key);

	std::cerr << "NotificationThread::getPhrase(): Unknown phrase: " << lang << " " << key << std::endl;
	return "${unknownPhrase:" + key + "}";
}

std::string NotificationThread::formatDate(const std::string &lang, const uint64_t date) const
{
	if(date == 0)
	{
		return "-";
	}

	time_t timeVal = static_cast<time_t>(date);
	struct tm parsedTime;

	if(gmtime_r(&timeVal, &parsedTime) == nullptr)
	{
		std::cerr << "NotificationThread::formatDate(): gmtime_r() failed!" << std::endl;
		return "?";
	}

	const std::string format = getPhrase(lang, "format.date.full");

	char dateBuffer[255];
	if (std::strftime(dateBuffer, sizeof(dateBuffer), format.c_str(), &parsedTime) == 0)
	{
		std::cerr << "NotificationThread::formatDate(): strftime() failed!" << std::endl;
		return "?";
	}

	return dateBuffer;
}

std::string NotificationThread::formatStatus(const std::string &lang, const Notification &notification) const
{
	std::string result;

	switch(notification.status)
	{
	case JOBSTATUS_OK:					result = getPhrase(lang, "job.status.ok");		break;
	case JOBSTATUS_FAILED_TIMEOUT:		result = getPhrase(lang, "job.status.timeout");	break;
	case JOBSTATUS_FAILED_SIZE:			result = getPhrase(lang, "job.status.size");	break;
	case JOBSTATUS_FAILED_URL:			result = getPhrase(lang, "job.status.url");		break;
	default:							result = getPhrase(lang, "job.status.failed");	break;
	}

	switch(notification.status)
	{
	case JOBSTATUS_OK:
	case JOBSTATUS_FAILED_HTTPERROR:
		result += " (" + std::to_string(notification.httpStatus) + " " + notification.statusText + ")";
		break;
	default:
		break;
	}

	return result;
}

void NotificationThread::processNotification(Notification &notification)
{
	std::cout << "NotificationThread::processNotification(): Processing notification of type " << notification.type << std::endl;

	Metrics::instance().incrementNotificationsProcessed(MetricsLabels::notificationTypeLabel(notification.type));

	UserDetails userDetails;

	try
	{
		callMaster("getUserDetails", [&]() {
			masterClient->getUserDetails(userDetails, notification.userID);
		});
	}
	catch (const apache::thrift::TException &ex)
	{
		std::cerr << "NotificationThread::processNotification(): Failed to retrieve user details: " << ex.what() << std::endl;

		NotificationChannel dummyChannel;
		dummyChannel.channelId = 0;
		dummyChannel.destination = {};
		storeNotification(notification, dummyChannel, NotificationResult::FAILED_PREPROCESS,
			"Exception during user details retrieval: " +std::string(ex.what()), db);

		Metrics::instance().incrementNotificationsDropped("user_details_failed");

		return;
	}

	// Always increment the suppressed metric if suppression is active
	if (userDetails.__isset.suppressNotifications && userDetails.suppressNotifications)
	{
		Metrics::instance().incrementEmailsSuppressed(MetricsLabels::notificationTypeLabel(notification.type));
	}

	std::vector<NotificationChannel> notificationChannels;
	if (userDetails.__isset.notificationChannels)
	{
		std::cout << "NotificationThread::processNotification(): User " << userDetails.userId << " has " << userDetails.notificationChannels.size() << " notification channels" << std::endl;
		notificationChannels = std::move(userDetails.notificationChannels);
	}
	else
	{
		std::cout << "NotificationThread::processNotification(): User " << userDetails.userId << " has no notification channels, using default email channel" << std::endl;

		if (userDetails.__isset.suppressNotifications && userDetails.suppressNotifications)
		{
			std::cerr << "NotificationThread::processNotification(): Notifications suppressed for user " << userDetails.userId << std::endl;
			return;
		}

		NotificationChannel emailChannel;
		emailChannel.channelId = 0;
		emailChannel.type = NotificationChannelType::EMAIL;
		emailChannel.destination = userDetails.email;
		emailChannel.enabled = true;
		emailChannel.settings = {};
		notificationChannels.emplace_back(std::move(emailChannel));
	}

	// Remove query part of URL (might contain sensitive data)
	std::size_t qmPos = notification.url.find('?');
	if(qmPos != std::string::npos)
	{
		notification.url = notification.url.substr(0, qmPos + 1) + "...";
	}

	for (const auto &notificationChannel : notificationChannels)
	{
		if (!notificationChannel.enabled)
		{
			std::cout << "NotificationThread::processNotification(): Notification channel " << notificationChannel.channelId << " is disabled" << std::endl;
			continue;
		}

		try
		{
			switch (notificationChannel.type)
			{
			case NotificationChannelType::EMAIL:
				sendMailNotification(notification, userDetails, notificationChannel);
				break;

			case NotificationChannelType::WEBHOOK:
				sendWebhookNotification(notification, userDetails, notificationChannel);
				break;

			default:
				std::cerr << "NotificationThread::processNotification(): Unknown notification channel type: " << notificationChannel.type << std::endl;
				Metrics::instance().incrementNotificationsDropped("unknown_channel_type");
				break;
			}
		}
		catch (const std::exception &ex)
		{
			std::cerr << "NotificationThread::processNotification(): Failed to send notification: " << ex.what() << std::endl;

			Metrics::instance().incrementNotificationsDropped("preprocess_failed");

			storeNotification(notification, notificationChannel, NotificationResult::FAILED_PREPROCESS,
				"Exception during pre-processing: " +std::string(ex.what()), db);
		}
	}
}

void NotificationThread::sendWebhookNotification(const Notification &notification, const UserDetails &userDetails, const NotificationChannel &channel) const
{
	using ::nlohmann::json;

	constexpr size_t MAX_WEBHOOK_RESPONSE_SIZE = 16 * 1024; // 16 KB

	std::unordered_map<std::string, std::string> variables = {
		{ "firstname", userDetails.firstName },
		{ "lastname", userDetails.lastName },
		{ "title", !notification.title.empty() ? notification.title : notification.url },
		{ "url", notification.url },
		{ "executed", formatDate(userDetails.language, notification.dateStarted) },
		{ "executedTimestamp", std::to_string(notification.dateStarted) },
		{ "scheduled", formatDate(userDetails.language, notification.datePlanned) },
		{ "scheduledTimestamp", std::to_string(notification.datePlanned) },
		{ "attempts", std::to_string(notification.failCounter) },
		{ "status", formatStatus(userDetails.language, notification) },
		{ "certexpiry", formatDate(userDetails.language, notification.sslCertExpiry) },
		{ "type", typeToString(notification.type) }
	};

	json settings = json::object();
	if (!channel.settings.empty())
	{
		try
		{
			settings = json::parse(channel.settings);
		}
		catch (const std::exception &ex)
		{
			std::cerr << "NotificationThread::sendWebhookNotification(): Failed to parse settings: " << ex.what() << std::endl;
			throw std::runtime_error("Failed to parse settings: " + std::string(ex.what()));
		}
	}

	std::string payloadJson;
	try
	{
		// `payload` is a user-supplied JSON string and not a nested object, so we need to parse it
		json payload = json::parse(settings.value("payload", "{}"));
		replaceVars(payload, variables);
		payloadJson = payload.dump();
	}
	catch (const std::exception &ex)
	{
		std::cerr << "NotificationThread::sendWebhookNotification(): Failed to prepare payload: " << ex.what() << std::endl;
		throw std::runtime_error("Failed to prepare payload: " + std::string(ex.what()));
	}

	CURL *curl = curl_easy_init();
	if(curl == nullptr)
	{
		std::cerr << "NotificationThread::sendWebhookNotification(): curl_easy_init() failed!" << std::endl;
		throw std::runtime_error("curl_easy_init() failed");
	}

	auto whRequest = std::make_shared<WebhookRequest>();
	whRequest->payload = payloadJson;
	whRequest->responseLimiterState.maxBytes = MAX_WEBHOOK_RESPONSE_SIZE;

	whRequest->headers = nullptr;
	whRequest->headers = curl_slist_append(whRequest->headers, "Content-Type: application/json");

	if (settings.contains("headers"))
	{
		const auto &headers = settings["headers"];
		if (headers.is_array())
		{
			for (const auto &header : headers)
			{
				if (!header.is_object() || !header.contains("key") || !header.contains("value")
					|| !header["key"].is_string() || !header["value"].is_string())
				{
					continue;
				}

				const std::string headerKey = Utils::sanitizeHttpHeaderKey(header["key"].get<std::string>());
				if (Utils::isBannedHeaderKey(headerKey))
				{
					continue;
				}
				std::string head = headerKey + ": " + Utils::sanitizeHttpHeaderValue(header["value"].get<std::string>());
				whRequest->headers = curl_slist_append(whRequest->headers, head.c_str());
			}
		}
	}

	curl_easy_setopt(curl, CURLOPT_URL, channel.destination.c_str());
	curl_easy_setopt(curl, CURLOPT_POST, 1L);
	curl_easy_setopt(curl, CURLOPT_POSTFIELDS, whRequest->payload.c_str());
	curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, payloadJson.size());
	curl_easy_setopt(curl, CURLOPT_HTTPHEADER, whRequest->headers);
	curl_easy_setopt(curl, CURLOPT_TIMEOUT, 20L);
	curl_easy_setopt(curl, CURLOPT_USERAGENT, App::getInstance()->config->get("user_agent").c_str());
	curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0);
	curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0);
	curl_easy_setopt(curl, CURLOPT_CAINFO, NULL);
	curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 0);
	curl_easy_setopt(curl, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
	curl_easy_setopt(curl, CURLOPT_DNS_CACHE_TIMEOUT, 0);
	curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 1);
	curl_easy_setopt(curl, CURLOPT_PROTOCOLS_STR, "http,https");
	curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curlResponseLimiterWriteFunction);
	curl_easy_setopt(curl, CURLOPT_WRITEDATA, &whRequest->responseLimiterState);
	curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, curlResponseLimiterWriteFunction);
	curl_easy_setopt(curl, CURLOPT_HEADERDATA, &whRequest->responseLimiterState);
	curl_easy_setopt(curl, CURLOPT_MAXFILESIZE,	MAX_WEBHOOK_RESPONSE_SIZE);

	int maxAttempts = App::getInstance()->config->getInt("webhook_retry_max_attempts", 3);
	if(maxAttempts < 1)
		maxAttempts = 1;

	auto state = std::make_shared<WebhookSendState>();
	state->curl = curl;
	state->request = whRequest;
	state->notification = notification;
	state->channel = channel;
	state->attempt = 1;
	state->maxAttempts = maxAttempts;
	state->baseDelayMs = App::getInstance()->config->getInt("webhook_retry_base_delay_ms", 2000);
	state->maxDelayMs = App::getInstance()->config->getInt("webhook_retry_max_delay_ms", 30000);
	state->dt = dispatchThread.get();

	dispatchThread->submit(curl, [state](CURLcode res, const std::unique_ptr<MySQL_DB> &db) {
		webhookOnDone(state, res, db);
	});
}

void NotificationThread::sendMailNotification(const Notification &notification, const UserDetails &userDetails, const NotificationChannel &channel) const
{
	Mail mail;
	mail.setVerp("notify", std::to_string(notification.jobID) + "." + std::to_string(static_cast<int>(notification.type)) + "." + std::to_string(channel.channelId), mailFrom, mailVerpSecret);
	mail.setRcptTo(channel.destination);
	mail.addHeader("From", mailSender);
	mail.addHeader("To", std::string("<") + channel.destination + std::string(">"));
	mail.addHeader("Auto-Submitted", "auto-generated");

	// Shared branded wrapper (stored language-independently under the sentinel
	// language '*' in the master phrases table). The notification body is slotted
	// into $.body and the localized subject into $.subject.
	mail.setHtmlText(getPhrase("*", "mail.template.html"));
	mail.setPlainText(getPhrase("*", "mail.template.text"));

	mail.assign("projectName", mailProjectName);
	mail.assign("logoURL", mailLogoURL);
	mail.assign("year", currentYear());
	mail.assign("unsubscribeFooter", getPhrase(userDetails.language, "notify.mail.footer"));

	mail.assign("firstname", userDetails.firstName);
	mail.assign("lastname", userDetails.lastName);
	mail.assign("title", !notification.title.empty() ? notification.title : notification.url);
	mail.assign("url", notification.url);
	mail.assign("executed", formatDate(userDetails.language, notification.dateStarted));
	mail.assign("scheduled", formatDate(userDetails.language, notification.datePlanned));
	mail.assign("attempts", std::to_string(notification.failCounter));
	mail.assign("status", formatStatus(userDetails.language, notification));
	mail.assign("certexpiry", formatDate(userDetails.language, notification.sslCertExpiry));

	std::string subjectKey;
	std::string bodyKey;
	switch(notification.type)
	{
	case NOTIFICATION_TYPE_FAILURE:
		subjectKey = "notify.failure.mail.subject";
		bodyKey = "notify.failure.mail.text";
		break;

	case NOTIFICATION_TYPE_SUCCESS:
		subjectKey = "notify.success.mail.subject";
		bodyKey = "notify.success.mail.text";
		break;

	case NOTIFICATION_TYPE_DISABLE:
		subjectKey = "notify.disable.mail.subject";
		bodyKey = "notify.disable.mail.text";
		break;

	case NOTIFICATION_TYPE_SSL_CERT_EXPIRY:
		subjectKey = "notify.sslcertexpiry.mail.subject";
		bodyKey = "notify.sslcertexpiry.mail.text";
		break;

	default:
		std::cerr << "NotificationThread::processNotification(): Unknown notification type!" << std::endl;
		Metrics::instance().incrementNotificationsDropped("unknown_type");
		return;
	}

	const std::string subject = getPhrase(userDetails.language, subjectKey);
	mail.assign("subject", subject);
	mail.assign("body", getPhrase(userDetails.language, bodyKey));
	mail.addHeader("Subject", subject, true);

	CURL *curl = curl_easy_init();
	if(curl == nullptr)
	{
		std::cerr << "NotificationThread::sendMail(): curl_easy_init() failed!" << std::endl;
		throw std::runtime_error("curl_easy_init() failed");
	}

	auto mailRequest = std::make_shared<MailRequest>();
	mailRequest->data = mail.dump();

	mailRequest->recipients = nullptr;
	mailRequest->recipients = curl_slist_append(mailRequest->recipients, mail.rcptTo().c_str());

	curl_easy_setopt(curl, CURLOPT_URL, smtpServer.c_str());
	curl_easy_setopt(curl, CURLOPT_MAIL_FROM, mail.mailFrom().c_str());
	curl_easy_setopt(curl, CURLOPT_MAIL_RCPT, mailRequest->recipients);
	curl_easy_setopt(curl, CURLOPT_READFUNCTION, curlStringReadFunction);
	curl_easy_setopt(curl, CURLOPT_READDATA, &mailRequest->data);
	curl_easy_setopt(curl, CURLOPT_UPLOAD, 1L);
	curl_easy_setopt(curl, CURLOPT_TIMEOUT, 20L);

	dispatchThread->submit(curl, [curl, mailRequest, notification, channel] (CURLcode res, const std::unique_ptr<Chronos::MySQL_DB> &db) {
		curl_easy_cleanup(curl);

		NotificationResult::type result;
		std::string resultDetails;
		const std::string typeLabel = MetricsLabels::notificationTypeLabel(notification.type);
		const std::string channelLabel = MetricsLabels::notificationChannelLabel(static_cast<int>(channel.type));

		if (res != CURLE_OK)
		{
			std::cerr << "NotificationThread::sendMail(): Failed to send email: " << res << std::endl;
			Metrics::instance().incrementNotificationSendErrors(typeLabel, channelLabel);
			resultDetails = std::string(curl_easy_strerror(res));

			result = NotificationResult::FAILED_SEND;
		}
		else
		{
			Metrics::instance().incrementNotificationsSent(typeLabel, channelLabel);

			result = NotificationResult::SUCCESS;
		}

		storeNotification(notification, channel, result, resultDetails, db);
	});
}
