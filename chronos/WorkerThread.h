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

#include <curl/curl.h>
#include <ev.h>

namespace Chronos
{
	struct SockInfo
	{
		curl_socket_t sockfd;
		CURL *easy;
		int action;
		long timeout;
		struct ev_io ev;
		int evset;
	};

	class WorkerThread : public std::enable_shared_from_this<WorkerThread>
	{
	public:
		WorkerThread(int mday, int month, int year, int hour, int minute);
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

		int timerFunction(CURLM *multi, long timeout_ms);
		int socketFunction(CURL *e, curl_socket_t s, int what, SockInfo *sockInfo);
		void removeSocket(SockInfo *sockInfo);
		void addSocket(CURL *e, curl_socket_t s, int what);
		void setSocket(SockInfo *sockInfo, CURL *e, curl_socket_t s, int what);

		void evTimerFunction(struct ev_timer *w, int revents);
		void evEventFunction(struct ev_io *w, int revents);

		void checkResults();

	private:
		void runJobs();
		void addStat();

	public:
		CURLM *curlHandle = nullptr;

	private:
		struct ev_loop *evLoop = nullptr;
		struct ev_timer timerEvent;
		std::shared_ptr<WorkerThread> keepAlive;
		std::queue<HTTPRequest *> requestQueue;
		int runningJobs = 0;
		std::thread workerThread;
		int parallelJobs;
		int curlStillRunning = 0;
		double jitterSum = 0;
		int jobCount = 0;
		int mday;
		int month;
		int year;
		int hour;
		int minute;
		bool inRunJobs = false;
	};
};

#endif
