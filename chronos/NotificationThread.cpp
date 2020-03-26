/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2020 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#include "NotificationThread.h"

#include <iostream>
#include <sstream>

#include <stdlib.h>
#include <time.h>

#include <curl/curl.h>

#include "App.h"
#include "Notification.h"
#include "NotificationThread.h"
#include "SQLite.h"
#include "Utils.h"

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/transport/TSocket.h>
#include <thrift/transport/TBufferTransports.h>
#include <thrift/transport/TTransportUtils.h>

#include "ChronosMaster.h"

class Mail
{
	struct HeaderItem
	{
		std::string value;
		bool placeholders;
	};

public:
	void addHeader(const std::string &key, const std::string &value, bool placeholders = false)
	{
		m_headers.emplace(key, HeaderItem{value, placeholders});
	}

	void assign(const std::string &key, const std::string &value)
	{
		m_placeholders.emplace(key, value);
	}

	void setText(const std::string &mailText)
	{
		m_text = mailText;
	}

	void setMailFrom(const std::string &address)
	{
		m_mailFrom = address;
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
					? replacePlaceholders(headerItem.second.value)
					: headerItem.second.value)
				<< CRLF;
		}
		out << CRLF;

		out << replacePlaceholders(m_text);
	}

	std::string replacePlaceholders(const std::string &in) const
	{
		std::string result = in;
		for(const auto &item : m_placeholders)
			Chronos::Utils::replace(result, item.first, item.second);
		return result;
	}

	std::string sanitizeHeader(const std::string &in) const
	{
		std::string result = in;
		const std::string forbidden = "\r\n";

		std::size_t pos;
		while ((pos = result.find_first_of(forbidden)) != std::string::npos)
			result.erase(result.begin() + pos);

		return result;
	}

private:
	std::string m_mailFrom;
	std::string m_rcptTo;
	std::unordered_map<std::string, HeaderItem> m_headers;
	std::unordered_map<std::string, std::string> m_placeholders;
	std::string m_text;
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
	mailSender = App::getInstance()->config->get("notification_mail_sender");
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
	queueSignal.notify_one();
}

void NotificationThread::stopThread()
{
	stop = true;

	std::lock_guard<std::mutex> lg(queueMutex);
	queueSignal.notify_one();
}

void NotificationThread::run()
{
	std::cout << "NotificationThread::run(): Entered" << std::endl;

	decltype(queue) tempQueue;

	stop = false;
	while(!stop)
	{
		{
			std::unique_lock<std::mutex> lock(queueMutex);
			if(queue.empty())
				queueSignal.wait(lock);
			queue.swap(tempQueue);
		}

		auto numNotifications = tempQueue.size();
		if(numNotifications > 100)
			std::cout << "NotificationThread::run(): " << numNotifications << " notification jobs fetched" << std::endl;

		time_t tStart = time(nullptr);
		if(!tempQueue.empty())
		{
			masterTransport->open();

			syncPhrases();

			while(!tempQueue.empty())
			{
				Notification notification = std::move(tempQueue.front());
				tempQueue.pop();
				processNotification(notification);
			}

			masterTransport->close();
		}
		time_t tEnd = time(nullptr);

		if(numNotifications > 100)
			std::cout << "NotificationThread::run(): Processing " << numNotifications << " took " << (tEnd-tStart) << " seconds" << std::endl;
	}

	std::cout << "NotificationThread::run(): Finished" << std::endl;
}

void NotificationThread::syncPhrases()
{
	try
	{
		Phrases newPhrases;
		masterClient->getPhrases(newPhrases);

		phrases.clear();
		for (const auto &langItem : newPhrases.phrases) {
			for (const auto &phraseItem : langItem.second) {
				phrases[langItem.first][phraseItem.first] = phraseItem.second;
			}
		}
	}
	catch (const apache::thrift::TException &ex)
	{
		std::cerr << "NotificationThread::syncPhrases(): Failed to sync phrases: " << ex.what() << std::endl;
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
	UserDetails userDetails;

	try
	{
		masterClient->getUserDetails(userDetails, notification.userID);
	}
	catch (const apache::thrift::TException &ex)
	{
		std::cerr << "NotificationThread::processNotification(): Failed to retrieve user details: " << ex.what() << std::endl;
	}

	Mail mail;
	mail.setMailFrom(mailFrom);
	mail.setRcptTo(userDetails.email);
	mail.addHeader("From", mailSender);
	mail.addHeader("To", std::string("<") + userDetails.email + std::string(">"));
	mail.addHeader("Content-Type", "text/plain; charset=UTF-8");
	mail.addHeader("Content-Transfer-Encoding", "8bit");
	mail.addHeader("Precedence", "bulk");

	mail.assign("$firstname", userDetails.firstName);
	mail.assign("$lastname", userDetails.lastName);
	mail.assign("$title", !notification.title.empty() ? notification.title : notification.url);
	mail.assign("$url", notification.url);
	mail.assign("$executed", formatDate(userDetails.language, notification.dateStarted));
	mail.assign("$scheduled", formatDate(userDetails.language, notification.datePlanned));
	mail.assign("$attempts", std::to_string(notification.failCounter));
	mail.assign("$status", formatStatus(userDetails.language, notification));

	switch(notification.type)
	{
	case NOTIFICATION_TYPE_FAILURE:
		mail.addHeader("Subject", getPhrase(userDetails.language, "notify.failure.mail.subject"), true);
		mail.setText(getPhrase(userDetails.language, "notify.failure.mail.text"));
		break;

	case NOTIFICATION_TYPE_SUCCESS:
		mail.addHeader("Subject", getPhrase(userDetails.language, "notify.success.mail.subject"), true);
		mail.setText(getPhrase(userDetails.language, "notify.success.mail.text"));
		break;

	case NOTIFICATION_TYPE_DISABLE:
		mail.addHeader("Subject", getPhrase(userDetails.language, "notify.disable.mail.subject"), true);
		mail.setText(getPhrase(userDetails.language, "notify.disable.mail.text"));
		break;

	default:
		std::cerr << "NotificationThread::processNotification(): Unknown notification type!" << std::endl;
		return;
	}

	sendMail(mail);
}

void NotificationThread::sendMail(const Mail &mail) const
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
		std::cerr << "NotificationThread::sendMail(): Failed to send email: " << res << std::endl;

	curl_slist_free_all(recipients);
	curl_easy_cleanup(curl);
}
