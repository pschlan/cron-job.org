/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2017 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#ifndef _APP_H_
#define _APP_H_

#include <memory>
#include <thread>
#include <vector>
#include <atomic>

#include <time.h>

#include "MySQL.h"
#include "Config.h"
#include "Utils.h"

class UserGroup;

namespace Chronos
{
	class MySQL_DB;
	class UpdateThread;
	class NotificationThread;
	class WorkerThread;
	class NodeService;
	class TestRunThread;
	class MasterService;
	class HTTPRequest;

	class App
	{
		struct Private;

	public:
		App(int argc, char *argv[]);
		~App();

	private:
		App(const App &other) = delete;
		App(App &&other) = delete;
		App &operator=(const App &other) = delete;
		App &operator=(App &&other) = delete;

	public:
		static App *getInstance();
		static void signalHandler(int sig);
		void updateThreadMain();
		void notificationThreadMain();
		void nodeServiceThreadMain();
		void testRunThreadMain();
		void masterServiceThreadMain();
		int run();
		std::unique_ptr<MySQL_DB> createMySQLConnection();
		std::unique_ptr<MySQL_DB> createMasterMySQLConnection();
		UserGroup getUserGroupById(uint64_t userGroupId);

	private:
		void startUpdateThread();
		void stopUpdateThread();
		void startNotificationThread();
		void stopNotificationThread();
		void startNodeServiceThread();
		void stopNodeServiceThread();
		void startTestRunThread();
		void stopTestRunThread();
		void startMasterServiceThread();
		void stopMasterServiceThread();
		void processJobs(time_t forTime, time_t plannedTime);
		void processJobsForTimeZone(int hour, int minute, int month, int mday, int wday, int year, time_t timestamp, const std::string &timeZone,
									std::map<uint8_t, std::vector<HTTPRequest *>> &requestsByPriority);
		void cleanUpNotifications();
		void syncUserGroups();

	public:
		std::shared_ptr<Config> config;
		bool isIpAddressBlocked(in_addr_t ipAddress) const;

	private:
		std::atomic<bool> stop{false};
		static App *instance;
		std::unique_ptr<Private> priv;
		std::thread updateThread;
		std::thread notificationThread;
		std::thread nodeServiceThread;
		std::thread testRunThread;
		std::thread masterServiceThread;
		std::unique_ptr<MySQL_DB> db;
		std::unique_ptr<UpdateThread> updateThreadObj;
		std::unique_ptr<NotificationThread> notificationThreadObj;
		std::unique_ptr<NodeService> nodeServiceObj;
		std::unique_ptr<TestRunThread> testRunThreadObj;
		std::unique_ptr<MasterService> masterServiceObj;
		std::vector<Utils::Subnet> blockedSubnets;
	};
};

#endif
