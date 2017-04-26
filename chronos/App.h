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

#include <time.h>

#include "MySQL.h"
#include "Config.h"

namespace Chronos
{
	class MySQL_DB;
	class UpdateThread;
	class WorkerThread;

	class App
	{
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
		int run();
		std::unique_ptr<MySQL_DB> createMySQLConnection();

	private:
		void startUpdateThread();
		void stopUpdateThread();
		void processJobs(time_t forTime, time_t plannedTime);
		void processJobsForTimeZone(int hour, int minute, int month, int mday, int wday, int year, time_t timestamp, const std::string &timeZone,
						const std::shared_ptr<WorkerThread> &wt);
		int calcJitterCorrectionOffset();

	public:
		std::shared_ptr<Config> config;

	private:
		bool stop = false;
		static App *instance;
		std::thread updateThread;
		std::unique_ptr<MySQL_DB> db;
		std::unique_ptr<UpdateThread> updateThreadObj;
	};
};

#endif
