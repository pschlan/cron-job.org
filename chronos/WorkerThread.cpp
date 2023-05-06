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

#include "WorkerThread.h"

#include <iostream>
#include <memory>
#include <stdexcept>

#include <unistd.h>

#include "CurlWorker.h"
#include "UpdateThread.h"
#include "App.h"

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/transport/TSocket.h>
#include <thrift/transport/TBufferTransports.h>
#include <thrift/transport/TTransportUtils.h>

#include "ChronosMaster.h"

using namespace Chronos;

WorkerThread::WorkerThread(int mday, int month, int year, int hour, int minute, std::size_t parallelJobs, std::size_t deferMs)
	: mday(mday), month(month), year(year), hour(hour), minute(minute), parallelJobs(parallelJobs), deferMs(deferMs)
{
}

WorkerThread::~WorkerThread()
{
}

void WorkerThread::addJob(HTTPRequest *req)
{
	requestQueue.push(req);
}

void WorkerThread::run()
{
	if(requestQueue.empty())
		return;

	keepAlive = shared_from_this();

	workerThread = std::thread(std::bind(&WorkerThread::threadMain, this));
	workerThread.detach();
}

void WorkerThread::runJobs()
{
	if(inRunJobs)
		return;

	inRunJobs = true;

	while(runningJobs < parallelJobs && !requestQueue.empty())
	{
		HTTPRequest *job = requestQueue.front();
		requestQueue.pop();

		++runningJobs;

		job->onDone = std::bind(&WorkerThread::jobDone, this, job);
		job->submit(curlWorker.get());
	}

	inRunJobs = false;
}

void WorkerThread::jobDone(HTTPRequest *req)
{
	jitterSum += req->result->jitter;
	if(req->result->jitter > jitterMax)
	{
		jitterMax = req->result->jitter;
	}
	if(req->result->jitter < jitterMin)
	{
		jitterMin = req->result->jitter;
	}

	int timeTotalMs = req->result->timeTotal / 1000;
	timeTotalSum += timeTotalMs;
	if(timeTotalMs > timeTotalMax)
	{
		timeTotalMax = timeTotalMs;
	}
	if(timeTotalMs < timeTotalMin)
	{
		timeTotalMin = timeTotalMs;
	}

	if(req->result->status == JOBSTATUS_OK)
	{
		++succeededJobs;
	}
	else
	{
		++failedJobs;
	}

	// push result to result queue
	UpdateThread::getInstance()->addResult(std::move(req->result));

	// clean up
	delete req;
	if(runningJobs > 0)
		--runningJobs;

	// start more jobs
	runJobs();

	// exit event loop when all requests have finished
	if(runningJobs == 0 && curlWorker)
		curlWorker->stop();
}

void WorkerThread::addStat()
{
	std::shared_ptr<apache::thrift::transport::TTransport> masterSocket
		= std::make_shared<apache::thrift::transport::TSocket>(
			App::getInstance()->config->get("master_service_address"),
			App::getInstance()->config->getInt("master_service_port"));
	std::shared_ptr<apache::thrift::transport::TTransport> masterTransport
		= std::make_shared<apache::thrift::transport::TBufferedTransport>(masterSocket);
	std::shared_ptr<apache::thrift::protocol::TProtocol> masterProtocol
		= std::make_shared<apache::thrift::protocol::TBinaryProtocol>(masterTransport);
	std::shared_ptr<ChronosMasterClient> masterClient
		= std::make_shared<ChronosMasterClient>(masterProtocol);

	try
	{
		masterTransport->open();

		const double jitterAvg = jitterSum / static_cast<double>(jobCount);
		const double timeTotalAvg = timeTotalSum / static_cast<double>(jobCount);
		const double failureRate = static_cast<double>(failedJobs) / static_cast<double>(jobCount);

		NodeStatsEntry stats;
		stats.d = mday;
		stats.m = month;
		stats.y = year;
		stats.h = hour;
		stats.i = minute;
		stats.jobs = jobCount;
		stats.jitter = jitterAvg;

		masterClient->reportNodeStats(App::getInstance()->config->getInt("node_id"),
			stats);

		masterTransport->close();

		std::cout << "WorkerThread::addStat(): mday = " << mday << ", month = " << month << ", hour = " << hour << ", minute = " << minute << ": "
			<< "jobCount = " << jobCount << ", succeededJobs = " << succeededJobs << ", failedJobs = " << failedJobs << " (" << (failureRate * 100.0) << " %), "
			<< "jitterMin = " << jitterMin << ", jitterMax = " << jitterMax << ", jitterAvg = " << jitterAvg << ", "
			<< "timeTotalMin = " << timeTotalMin << ", timeTotalMax = " << timeTotalMax << ", timeTotalAvg = " << timeTotalAvg << ", "
			<< std::endl;
	}
	catch(const apache::thrift::TException &ex)
	{
		std::cerr << "WorkerThread::addStat(): Failed to report node stats: " << ex.what() << std::endl;
	}
}

void WorkerThread::threadMain()
{
	try
	{
		std::cout << "WorkerThread::threadMain(): Entered" << std::endl;

		if(deferMs > 0)
		{
			std::cout << "WorkerThread::threadMain(): Deferring thread by " << deferMs << " ms..." << std::endl;
			usleep(deferMs * 1000);
		}

		jobCount = requestQueue.size();

		curlWorker = std::make_unique<CurlWorker>();

		curlWorker->onDone([] (CURL *easy, CURLcode res) {
			HTTPRequest *req = nullptr;
			if(curl_easy_getinfo(easy, CURLINFO_PRIVATE, &req) != CURLE_OK || req == nullptr)
				throw std::runtime_error("Failed to retrieve associated HTTPRequest!");
			req->done(res);
		});

		// add jobs
		runJobs();

		// main loop
		curlWorker->run();

		// clean up
		curlWorker.reset();

		addStat();

		std::cout << "WorkerThread::threadMain(): Finished" << std::endl;
	}
	catch(const std::runtime_error &ex)
	{
		std::cout << "WorkerThread::threadEntry(): Exception: " << ex.what() << std::endl;
	}

	keepAlive.reset();
}
