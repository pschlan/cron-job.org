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

#include "App.h"

#include <stdexcept>
#include <iostream>
#include <functional>
#include <algorithm>

#include <civil_time.h>
#include <time_zone.h>

#include <signal.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#include <curl/curl.h>
#include <openssl/crypto.h>

#include "UpdateThread.h"
#include "NotificationThread.h"
#include "WorkerThread.h"
#include "NodeService.h"
#include "MasterService.h"
#include "Config.h"

namespace
{

int g_numLocks = 0;
pthread_mutex_t *g_sslLocks = nullptr;

void sslThreadIdCallback(CRYPTO_THREADID *threadId)
{
	CRYPTO_THREADID_set_pointer(threadId, reinterpret_cast<void *>(pthread_self()));
}

void sslLockCallback(int mode, int type, const char * /*file*/, int /*line*/)
{
	if(mode & CRYPTO_LOCK)
	{
		pthread_mutex_lock(&(g_sslLocks[type]));
	}
	else
	{
		pthread_mutex_unlock(&(g_sslLocks[type]));
	}
}

void initSSLLocks()
{
	g_numLocks = CRYPTO_num_locks();
	if(g_numLocks <= 0)
	{
		std::cerr << "CRYPTOP_num_locks() <= 0!" << std::endl;
		return;
	}

	g_sslLocks = reinterpret_cast<pthread_mutex_t *>(OPENSSL_malloc(g_numLocks * sizeof(pthread_mutex_t)));
	if(g_sslLocks == nullptr)
	{
		std::cerr << "OPENSSL_malloc() failed!" << std::endl;
		return;
	}

	for(int i = 0; i < g_numLocks; ++i)
	{
		pthread_mutex_init(&(g_sslLocks[i]), nullptr);
	}

	CRYPTO_THREADID_set_callback(sslThreadIdCallback);
	CRYPTO_set_locking_callback(sslLockCallback);
}

void uninitSSLLocks()
{
	CRYPTO_set_locking_callback(nullptr);

	for(int i = 0; i < g_numLocks; ++i)
	{
		pthread_mutex_destroy(&(g_sslLocks[i]));
	}

	OPENSSL_free(g_sslLocks);
	g_sslLocks = nullptr;
}

}

using namespace Chronos;

App *App::instance = nullptr;

App::App(int argc, char *argv[])
{
	if(App::instance != nullptr)
		throw std::runtime_error("App instance already exists");

	if(argc != 2)
		throw std::runtime_error(std::string("Usage: ") + std::string(argv[0]) + std::string(" [config-file]"));

	this->config 		= std::make_shared<Config>(argv[1]);
	App::instance		= this;

	std::vector<std::string> blockedSubnetStrings = Utils::split(this->config->get("blocked_subnets"), ' ');
	std::for_each(blockedSubnetStrings.begin(), blockedSubnetStrings.end(), [this] (const std::string &subnet) {
		const std::string trimmedSubnet = Utils::trim(subnet);
		if(!trimmedSubnet.empty())
		{
			blockedSubnets.emplace_back(trimmedSubnet);
		}
	});
}

App::~App()
{
	App::instance		= nullptr;
}

App *App::getInstance()
{
	if(App::instance == nullptr)
			throw std::runtime_error("No app instance available");
	return(App::instance);
}

bool App::isIpAddressBlocked(in_addr_t ipAddress) const
{
	for(const auto &subnet : blockedSubnets)
	{
		if(subnet.contains(ipAddress))
			return true;
	}
	return false;
}

void App::processJobs(time_t forTime, time_t plannedTime)
{
	std::cout 	<< "App::processJobs(): Called for "
				<< "forTime = " << forTime << ", "
				<< "plannedTime = " << plannedTime
				<< std::endl;

	struct tm t = { 0 };
	if(gmtime_r(&plannedTime, &t) == nullptr)
		throw std::runtime_error("gmtime_r returned nullptr");

	const std::size_t numThreads = config->getInt("num_threads");
	const std::size_t numMonitoringThreads = config->getInt("num_monitoring_threads");

	std::vector<std::shared_ptr<WorkerThread>> workerThreads;
	for (std::size_t i = 0; i < numThreads + numMonitoringThreads; ++i)
	{
		workerThreads.push_back(std::make_shared<WorkerThread>(t.tm_mday, t.tm_mon+1, t.tm_year+1900, t.tm_hour, t.tm_min));
	}

	std::size_t i = 0;
	MYSQL_ROW row;
	auto res = db->query("SELECT DISTINCT(`timezone`) FROM `job` WHERE `enabled`=1");
	while((row = res->fetchRow()) != nullptr)
	{
		std::string timeZone(row[0]);

		cctz::time_zone tz;
		if(!cctz::load_time_zone(timeZone, &tz))
		{
			std::cout << "App::processJobs(): Failed to load time zone: " << timeZone << ", skipping" << std::endl;
			continue;
		}

		auto civilTime = cctz::convert(std::chrono::system_clock::from_time_t(forTime), tz);
		auto cWDay = cctz::get_weekday(cctz::civil_day(civilTime));
		int wday = -1;
		switch(cWDay)
		{
		case cctz::weekday::monday:		wday = 1;	break;
		case cctz::weekday::tuesday:	wday = 2;	break;
		case cctz::weekday::wednesday:	wday = 3;	break;
		case cctz::weekday::thursday:	wday = 4;	break;
		case cctz::weekday::friday:		wday = 5;	break;
		case cctz::weekday::saturday:	wday = 6;	break;
		case cctz::weekday::sunday:		wday = 0;	break;
		default:						wday = -1;	break;
		}

		processJobsForTimeZone(civilTime.hour(), civilTime.minute(), civilTime.month(), civilTime.day(), wday, civilTime.year(),
			plannedTime, timeZone, workerThreads, i, numThreads, numMonitoringThreads);
	}

	std::cout << "App::processJobs(): Waiting for plannedTime = " << plannedTime << "..." << std::endl;
	while(time(nullptr) < plannedTime && !stop)
	{
		usleep(100*1000);
	}

	if(stop)
	{
		std::cout << "App::processJobs(): Stop requested, aborting." << std::endl;
		return;
	}

	for(std::size_t i = 0; i < numThreads + numMonitoringThreads; ++i)
	{
		const auto &wt = workerThreads[i];

		if(!wt->empty())
		{
			std::cout << "App::processJobs(): Starting worker thread " << i << " with " << wt->numJobs() << " jobs" << std::endl;
			wt->run();
		}
		else
		{
			std::cout << "App::processJobs(): No jobs for worker thread " << i << std::endl;
		}
	}
}

void App::processJobsForTimeZone(int hour, int minute, int month, int mday, int wday, int year, time_t timestamp, const std::string &timeZone,
	const std::vector<std::shared_ptr<WorkerThread>> &workerThreads, std::size_t &i, std::size_t numThreads, std::size_t numMonitoringThreads)
{
	std::cout 	<< "App::processJobsForTimeZone(): Called for "
				<< "hour = " << hour << ", "
				<< "minute = " << minute << ", "
				<< "month = " << month << ", "
				<< "mday = " << mday << ", "
				<< "wday = " << wday << ", "
				<< "timestamp = " << timestamp << ", "
				<< "timeZone = " << timeZone
				<< std::endl;

	auto res = db->query("SELECT TRIM(`url`),`job`.`jobid`,`auth_enable`,`auth_user`,`auth_pass`,`notify_failure`,`notify_success`,`notify_disable`,`fail_counter`,`save_responses`,`job`.`userid`,`request_method`,COUNT(`job_header`.`jobheaderid`),`job_body`.`body`,`title`,`job`.`type` FROM `job` "
									"INNER JOIN `job_hours` ON `job_hours`.`jobid`=`job`.`jobid` "
									"INNER JOIN `job_mdays` ON `job_mdays`.`jobid`=`job`.`jobid` "
									"INNER JOIN `job_wdays` ON `job_wdays`.`jobid`=`job`.`jobid` "
									"INNER JOIN `job_minutes` ON `job_minutes`.`jobid`=`job`.`jobid` "
									"INNER JOIN `job_months` ON `job_months`.`jobid`=`job`.`jobid` "
									"LEFT JOIN `job_header` ON `job_header`.`jobid`=`job`.`jobid` "
									"LEFT JOIN `job_body` ON `job_body`.`jobid`=`job`.`jobid` "
									"WHERE (`hour`=-1 OR `hour`=%d) "
									"AND (`minute`=-1 OR `minute`=%d) "
									"AND (`mday`=-1 OR `mday`=%d) "
									"AND (`wday`=-1 OR `wday`=%d) "
									"AND (`month`=-1 OR `month`=%d) "
									"AND `job`.`timezone`='%q' "
									"AND `enabled`=1 "
									"GROUP BY `job`.`jobid` "
									"ORDER BY `fail_counter` ASC, `job`.`jobid` ASC",
									hour, minute, mday, wday, month, timeZone.c_str());

	int jobCount = res->numRows();
	std::cout << "App::processJobs(): " << jobCount << " jobs found" << std::endl;

	if(jobCount > 0)
	{
		MYSQL_ROW row;
		while((row = res->fetchRow()) != nullptr)
		{
			HTTPRequest *req = HTTPRequest::fromURL(row[0], atoi(row[10]));
			req->result->jobID 			= atoi(row[1]);
			req->result->datePlanned	= (uint64_t)timestamp * 1000;
			req->result->notifyFailure 	= strcmp(row[5], "1") == 0;
			req->result->notifySuccess 	= strcmp(row[6], "1") == 0;
			req->result->notifyDisable 	= strcmp(row[7], "1") == 0;
			req->result->oldFailCounter	= atoi(row[8]);
			req->result->saveResponses	= strcmp(row[9], "1") == 0;
			if(atoi(row[2]) == 1)
			{
				req->useAuth 		= true;
				req->authUsername 	= row[3];
				req->authPassword 	= row[4];
			}
			req->requestMethod		= static_cast<RequestMethod>(atoi(row[11]));

			if(row[12] != NULL && atoi(row[12]) > 0)
			{
				auto headerRes = db->query("SELECT `key`,`value` FROM `job_header` WHERE `jobid`=%s",
					row[1]);
				while(MYSQL_ROW row = headerRes->fetchRow())
				{
					req->requestHeaders.push_back({ std::string(row[0]), std::string(row[1]) });
				}
			}

			if(row[13] != NULL)
			{
				req->requestBody	= row[13];
			}

			req->result->title		= row[14];
			req->result->jobType  	= static_cast<JobType_t>(atoi(row[15]));

			const auto &wt = workerThreads[req->result->jobType == JobType_t::MONITORING ? ((i % numMonitoringThreads) + numThreads) : (i % numThreads)];
			wt->addJob(req);

			++i;
		}
	}

	res.reset();

	std::cout << "App::processJobsForTimeZone(): Finished" << std::endl;
}

void App::cleanUpNotifications()
{
	std::cout << "App::cleanUpNotifications()" << std::endl;

    static constexpr const int TIME_ONE_DAY = 86400;

	db->query("DELETE FROM `notification` WHERE `date` < UNIX_TIMESTAMP()-%d",
		TIME_ONE_DAY);
}

void App::signalHandler(int sig)
{
	if(sig == SIGINT)
		App::getInstance()->stop = true;
}

int App::run()
{
	setlocale(LC_ALL, "en_US.UTF-8");

	curl_global_init(CURL_GLOBAL_ALL);
	MySQL_DB::libInit();
	initSSLLocks();

	signal(SIGINT, App::signalHandler);

	if(config->getInt("master_service_enable"))
	{
		startMasterServiceThread();
	}

	if(config->getInt("node_service_enable"))
	{
		startNodeServiceThread();
	}

	if(config->getInt("job_executor_enable"))
	{
		db = createMySQLConnection();
		startNotificationThread();
		startUpdateThread();

		struct tm lastTime = { 0 };
		while(!stop)
		{
			time_t currentTime = time(nullptr);
			struct tm t = { 0 };
			if(gmtime_r(&currentTime, &t) == nullptr)
				throw std::runtime_error("gmtime_r returned nullptr");

			if(t.tm_min > lastTime.tm_min
				|| t.tm_hour > lastTime.tm_hour
				|| t.tm_mday > lastTime.tm_mday
				|| t.tm_mon > lastTime.tm_mon
				|| t.tm_year > lastTime.tm_year)
			{
				// update last time
				memcpy(&lastTime, &t, sizeof(struct tm));

				processJobs(currentTime + 60, currentTime + 60 - t.tm_sec);
				cleanUpNotifications();
			}
			else
			{
				usleep(100*1000);
			}
		}

		stopUpdateThread();
		stopNotificationThread();
	}
	else
	{
		while(!stop)
		{
			usleep(100*1000);
		}
	}

	if(config->getInt("node_service_enable"))
	{
		stopNodeServiceThread();
	}

	if(config->getInt("master_service_enable"))
	{
		stopMasterServiceThread();
	}

	uninitSSLLocks();
	MySQL_DB::libCleanup();
	curl_global_cleanup();

	return(1);
}

void App::updateThreadMain()
{
	try
	{
		updateThreadObj = std::make_unique<UpdateThread>();
		updateThreadObj->run();
		updateThreadObj.reset();
	}
	catch(const std::runtime_error &ex)
	{
		std::cout << "Update thread runtime error: " << ex.what() << std::endl;
		stop = true;
	}
}

void App::notificationThreadMain()
{
	try
	{
		notificationThreadObj = std::make_unique<NotificationThread>();
		notificationThreadObj->run();
		notificationThreadObj.reset();
	}
	catch(const std::runtime_error &ex)
	{
		std::cout << "Notification thread runtime error: " << ex.what() << std::endl;
		stop = true;
	}
}

void App::nodeServiceThreadMain()
{
	std::cout << "App::nodeServiceThreadMain(): Entered" << std::endl;

	try
	{
		nodeServiceObj = std::make_unique<NodeService>(config->get("node_service_interface"), config->getInt("node_service_port"));
		nodeServiceObj->run();
		nodeServiceObj.reset();
	}
	catch(const std::runtime_error &ex)
	{
		std::cout << "Node service thread runtime error: " << ex.what() << std::endl;
		stop = true;
	}

	std::cout << "App::nodeServiceThreadMain(): Finished" << std::endl;
}

void App::masterServiceThreadMain()
{
	std::cout << "App::masterServiceThreadMain(): Entered" << std::endl;

	try
	{
		masterServiceObj = std::make_unique<MasterService>(config->get("master_service_interface"), config->getInt("master_service_port"));
		masterServiceObj->run();
		masterServiceObj.reset();
	}
	catch(const std::runtime_error &ex)
	{
		std::cout << "Master service thread runtime error: " << ex.what() << std::endl;
		stop = true;
	}

	std::cout << "App::masterServiceThreadMain(): Finished" << std::endl;
}

void App::startUpdateThread()
{
	updateThread = std::thread(std::bind(&App::updateThreadMain, this));
}

void App::stopUpdateThread()
{
	updateThreadObj->stopThread();
	updateThread.join();
}

void App::startNotificationThread()
{
	notificationThread = std::thread(std::bind(&App::notificationThreadMain, this));
}

void App::stopNotificationThread()
{
	notificationThreadObj->stopThread();
	notificationThread.join();
}

void App::startNodeServiceThread()
{
	nodeServiceThread = std::thread(std::bind(&App::nodeServiceThreadMain, this));
}

void App::stopNodeServiceThread()
{
	nodeServiceObj->stop();
	nodeServiceThread.join();
}

void App::startMasterServiceThread()
{
	masterServiceThread = std::thread(std::bind(&App::masterServiceThreadMain, this));
}

void App::stopMasterServiceThread()
{
	masterServiceObj->stop();
	masterServiceThread.join();
}

std::unique_ptr<MySQL_DB> App::createMySQLConnection()
{
	return(std::make_unique<MySQL_DB>(config->get("mysql_host"),
						config->get("mysql_user"),
						config->get("mysql_pass"),
						config->get("mysql_db"),
						config->get("mysql_sock")));
}

std::unique_ptr<MySQL_DB> App::createMasterMySQLConnection()
{
	return(std::make_unique<MySQL_DB>(config->get("master_mysql_host"),
						config->get("master_mysql_user"),
						config->get("master_mysql_pass"),
						config->get("master_mysql_db"),
						config->get("master_mysql_sock")));
}
