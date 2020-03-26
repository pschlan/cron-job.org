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

#ifndef _NOTIFICATIONTHREAD_H_
#define _NOTIFICATIONTHREAD_H_

#include <condition_variable>
#include <memory>
#include <mutex>
#include <queue>
#include <string>
#include <thread>
#include <unordered_map>

#include "Notification.h"

class ChronosMasterClient;
class Mail;

namespace apache { namespace thrift {

namespace protocol {
class TProtocol;
}

namespace transport {
class TTransport;
}

} }

namespace Chronos
{
	class NotificationThread
	{
	public:
		NotificationThread();
		~NotificationThread();

	private:
		NotificationThread(const NotificationThread &other) = delete;
		NotificationThread(NotificationThread &&other) = delete;
		NotificationThread &operator=(const NotificationThread &other) = delete;
		NotificationThread &operator=(NotificationThread &&other) = delete;

	public:
		static NotificationThread *getInstance();
		void run();
		void stopThread();
		void addNotification(Notification &&notification);

    private:
		void syncPhrases();
		std::string getPhrase(const std::string &lang, const std::string &key) const;
		std::string formatDate(const std::string &lang, const uint64_t date) const;
		std::string formatStatus(const std::string &lang, const Notification &notification) const;
        void processNotification(const Notification &notification);
		void sendMail(const Mail &mail) const;

	private:
		bool stop = false;
		static NotificationThread *instance;
		std::mutex queueMutex;
		std::condition_variable queueSignal;
		std::queue<Notification> queue;
		std::shared_ptr<apache::thrift::transport::TTransport> masterSocket;
		std::shared_ptr<apache::thrift::transport::TTransport> masterTransport;
		std::shared_ptr<apache::thrift::protocol::TProtocol> masterProtocol;
		std::shared_ptr<ChronosMasterClient> masterClient;
		std::string defaultLang;
		std::string mailFrom;
		std::string mailSender;
		std::string smtpServer;
		std::unordered_map<std::string, std::unordered_map<std::string, std::string>> phrases;
	};
};

#endif
