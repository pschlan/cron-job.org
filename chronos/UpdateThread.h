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

#ifndef _UPDATETHREAD_H_
#define _UPDATETHREAD_H_

#include <condition_variable>
#include <memory>
#include <mutex>
#include <queue>
#include <string>
#include <thread>

#include "MySQL.h"
#include "JobResult.h"

namespace Chronos
{
	class UpdateThread
	{
	public:
		UpdateThread();
		~UpdateThread();

	private:
		UpdateThread(const UpdateThread &other) = delete;
		UpdateThread(UpdateThread &&other) = delete;
		UpdateThread &operator=(const UpdateThread &other) = delete;
		UpdateThread &operator=(UpdateThread &&other) = delete;

	public:
		static UpdateThread *getInstance();
		void run();
		void stopThread();
		void addResult(std::unique_ptr<JobResult> result);

	private:
		void storeResult(const std::unique_ptr<JobResult> &result);

	private:
		bool stop = false;
		std::unique_ptr<MySQL_DB> db;
		static UpdateThread *instance;
		std::mutex queueMutex;
		std::condition_variable queueSignal;
		std::queue<std::unique_ptr<JobResult>> queue;
		int maxFailures = 0;
		std::string userDbFilePathScheme;
		std::string userDbFileNameScheme;
		std::string userTimeDbFileNameScheme;
	};
};

#endif
