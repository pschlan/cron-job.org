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

#ifndef _WORKERTHREAD_H_
#define _WORKERTHREAD_H_

#include "HTTPRequest.h"

#include <memory>
#include <queue>
#include <thread>
#include <unordered_set>

namespace Chronos
{
	class CurlWorker;

	class WorkerThread : public std::enable_shared_from_this<WorkerThread>
	{
	public:
		WorkerThread(int mday, int month, int year, int hour, int minute, std::size_t parallelJobs, std::size_t deferMs);
		~WorkerThread();

	private:
		WorkerThread(const WorkerThread &other) = delete;
		WorkerThread(WorkerThread &&other) = delete;
		WorkerThread &operator=(const WorkerThread &other) = delete;
		WorkerThread &operator=(WorkerThread &&other) = delete;

	public:
		void addJob(HTTPRequest *req);
		bool empty() const { return requestQueue.empty(); }
		std::size_t numJobs() const { return requestQueue.size(); }
		void run();
		void threadMain();
		void jobDone(HTTPRequest *req);

	private:
		void runJobs();
		void addStat();

	private:
		std::shared_ptr<WorkerThread> keepAlive;
		std::unique_ptr<CurlWorker> curlWorker;
		std::queue<HTTPRequest *> requestQueue;
		std::size_t runningJobs = 0;
		std::thread workerThread;
		std::size_t parallelJobs;
		std::size_t deferMs;
		double jitterSum = 0;
		int jitterMax = 0;
		int jitterMin = std::numeric_limits<int>::max();
		double timeTotalSum = 0;
		int timeTotalMax = 0;
		int timeTotalMin = std::numeric_limits<int>::max();
		int jobCount = 0;
		int succeededJobs = 0;
		int failedJobs = 0;
		int mday;
		int month;
		int year;
		int hour;
		int minute;
		bool inRunJobs = false;
	};
};

#endif
