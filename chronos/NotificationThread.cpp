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
#include <iomanip>
#include <iostream>
#include <random>
#include <regex>
#include <sstream>

#include <stdlib.h>
#include <time.h>

#include <openssl/hmac.h>

#include <curl/curl.h>

#include "App.h"
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
		ss << "==_boundary_" << std::hex << std::setfill('0') << std::setw(16) << gen();
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

}

using namespace Chronos;

NotificationThread *NotificationThread::instance = nullptr;

NotificationThread::NotificationThread()
{
	if(NotificationThread::instance != nullptr)
		throw std::runtime_error("Notification thread instance already exists");

	NotificationThread::instance = this;

	masterSocket = std::make_shared<apache::thrift::transport::TSocket>(
		App::getInstance()->config->get("master_service_address"),
		App::getInstance()->config->getInt("master_service_port"));
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

void NotificationThread::processNotification(const Notification &notification)
{
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
		Metrics::instance().incrementNotificationsDropped("user_details_failed");
		return;
	}

	if (userDetails.__isset.suppressNotifications && userDetails.suppressNotifications)
	{
		std::cerr << "NotificationThread::processNotification(): Notifications suppressed for user " << userDetails.userId << std::endl;
		Metrics::instance().incrementEmailsSuppressed(MetricsLabels::notificationTypeLabel(notification.type));
		return;
	}

	// Remove query part of URL (might contain sensitive data)
	std::string url = notification.url;
	std::size_t qmPos = url.find('?');
	if(qmPos != std::string::npos)
	{
		url = url.substr(0, qmPos + 1) + "...";
	}

	Mail mail;
	mail.setVerp("notify", std::to_string(notification.jobID) + "." + std::to_string(static_cast<int>(notification.type)), mailFrom, mailVerpSecret);
	mail.setRcptTo(userDetails.email);
	mail.addHeader("From", mailSender);
	mail.addHeader("To", std::string("<") + userDetails.email + std::string(">"));
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
	mail.assign("title", !notification.title.empty() ? notification.title : url);
	mail.assign("url", url);
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

	sendMail(mail, notification.type);
}

void NotificationThread::sendMail(const Mail &mail, NotificationType_t type) const
{
	CURL *curl = curl_easy_init();
	if(curl == nullptr)
	{
		std::cerr << "NotificationThread::sendMail(): curl_easy_init() failed!" << std::endl;
		return;
	}

	struct curl_slist *recipients = nullptr;
	recipients = curl_slist_append(recipients, mail.rcptTo().c_str());

	std::string mailData = mail.dump();

	curl_easy_setopt(curl, CURLOPT_URL, smtpServer.c_str());
	curl_easy_setopt(curl, CURLOPT_MAIL_FROM, mail.mailFrom().c_str());
	curl_easy_setopt(curl, CURLOPT_MAIL_RCPT, recipients);
	curl_easy_setopt(curl, CURLOPT_READFUNCTION, curlStringReadFunction);
	curl_easy_setopt(curl, CURLOPT_READDATA, &mailData);
	curl_easy_setopt(curl, CURLOPT_UPLOAD, 1L);

	int res = curl_easy_perform(curl);
	if(res != CURLE_OK)
	{
		std::cerr << "NotificationThread::sendMail(): Failed to send email: " << res << std::endl;
		Metrics::instance().incrementEmailSendErrors();
	}
	else
	{
		Metrics::instance().incrementEmailsSent(MetricsLabels::notificationTypeLabel(type));
	}

	curl_slist_free_all(recipients);
	curl_easy_cleanup(curl);
}
