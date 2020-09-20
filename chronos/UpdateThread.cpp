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

#include "UpdateThread.h"

#include <iostream>
#include <sstream>
#include <cmath>

#include <stdlib.h>
#include <time.h>

#include "App.h"
#include "Notification.h"
#include "NotificationThread.h"
#include "SQLite.h"
#include "Utils.h"

using namespace Chronos;

UpdateThread *UpdateThread::instance = nullptr;

UpdateThread::UpdateThread()
{
	if(UpdateThread::instance != nullptr)
		throw std::runtime_error("Update thread instance already exists");

	UpdateThread::instance 	= this;

	maxFailures 				= App::getInstance()->config->getInt("max_failures");
	userDbFilePathScheme 		= App::getInstance()->config->get("user_db_file_path_scheme");
	userDbFileNameScheme 		= App::getInstance()->config->get("user_db_file_name_scheme");
	userTimeDbFileNameScheme 	= App::getInstance()->config->get("user_time_db_file_name_scheme");
}

UpdateThread::~UpdateThread()
{
	UpdateThread::instance = nullptr;
}

UpdateThread *UpdateThread::getInstance()
{
	if(UpdateThread::instance == nullptr)
		throw std::runtime_error("No update thread instance available");
	return(UpdateThread::instance);
}

void UpdateThread::addResult(std::unique_ptr<JobResult> result)
{
	std::lock_guard<std::mutex> lg(queueMutex);
	queue.push(std::move(result));
	queueSignal.notify_one();
}

void UpdateThread::storeResult(const std::unique_ptr<JobResult> &result)
{
	const int DB_SCHEMA_VERSION = 2;
	const int TIMEDB_SCHEMA_VERSION = 1;

	struct tm tmStruct = { 0 };
	time_t tmTime = result->datePlanned / 1000;
	if(gmtime_r(&tmTime, &tmStruct) == nullptr)
		throw std::runtime_error("gmtime_r returned nullptr");

	std::string dbFilePath = Utils::userDbFilePath(userDbFilePathScheme, userDbFileNameScheme, result->userID, tmStruct.tm_mday, tmStruct.tm_mon);
	int jobLogID = 0;
	int jobLogIDDay = tmStruct.tm_mday;
	int jobLodIDMonth = tmStruct.tm_mon;

	try
	{
		std::unique_ptr<SQLite_DB> userDB = std::make_unique<SQLite_DB>(dbFilePath.c_str());

		userDB->prepare("PRAGMA synchronous = OFF")->execute();

		int currentSchemaVersion = 0;
		auto stmt = userDB->prepare("PRAGMA user_version");
		while(stmt->execute())
		{
			currentSchemaVersion = stmt->intValue(0);
		}

		if(currentSchemaVersion < 1)
		{
			userDB->prepare("CREATE TABLE IF NOT EXISTS \"joblog\"("
				"	\"joblogid\" INTEGER PRIMARY KEY ASC,"
				"	\"jobid\" INTEGER NOT NULL,"
				"	\"date\" INTEGER NOT NULL,"
				"	\"date_planned\" INTEGER NOT NULL,"
				"	\"jitter\" INTEGER NOT NULL,"
				"	\"url\" TEXT NOT NULL,"
				"	\"duration\" INTEGER NOT NULL,"
				"	\"status\" INTEGER NOT NULL,"
				"	\"status_text\" TEXT NOT NULL,"
				"	\"http_status\" INTEGER NOT NULL,"
				"	\"created\" INTEGER NOT NULL"
				")")->execute();
			userDB->prepare("CREATE INDEX IF NOT EXISTS \"idx_joblog_jobid\" ON \"joblog\" (\"jobid\")")->execute();

			userDB->prepare("CREATE TABLE IF NOT EXISTS \"joblog_response\"("
				"	\"joblogid\" INTEGER PRIMARY KEY,"
				"	\"jobid\" INTEGER NOT NULL,"
				"	\"date\" INTEGER NOT NULL,"
				"	\"headers\" TEXT NOT NULL,"
				"	\"body\" TEXT NOT NULL,"
				"	\"created\" INTEGER NOT NULL"
				")")->execute();
		}

		if(currentSchemaVersion < 2)
		{
			userDB->prepare("CREATE TABLE IF NOT EXISTS \"joblog_stats\"("
				"	\"joblogid\" INTEGER PRIMARY KEY,"
				"	\"jobid\" INTEGER NOT NULL,"
				"	\"date\" INTEGER NOT NULL,"
				"	\"status\" INTEGER NOT NULL,"
				"	\"name_lookup\" INTEGER NOT NULL,"
				"	\"connect\" INTEGER NOT NULL,"
				"	\"app_connect\" INTEGER NOT NULL,"
				"	\"pre_transfer\" INTEGER NOT NULL,"
				"	\"start_transfer\" INTEGER NOT NULL,"
				"	\"total\" INTEGER NOT NULL"
				")")->execute();
			userDB->prepare("CREATE INDEX IF NOT EXISTS \"idx_stats_jobid\" ON \"joblog_stats\" (\"jobid\")")->execute();
		}

		if(currentSchemaVersion != DB_SCHEMA_VERSION)
		{
			std::string pragmaQuery = "PRAGMA user_version = " + std::to_string(DB_SCHEMA_VERSION);
			userDB->prepare(pragmaQuery)->execute();
		}

		stmt = userDB->prepare("INSERT INTO \"joblog\"(\"jobid\",\"date\",\"date_planned\",\"jitter\",\"url\",\"duration\",\"status\",\"status_text\",\"http_status\",\"created\") "
			"VALUES(:jobid,:date,:date_planned,:jitter,:url,:duration,:status,:status_text,:http_status,strftime('%s', 'now'))");
		stmt->bind(":jobid", 		result->jobID);
		stmt->bind(":date", 		static_cast<int>(result->dateStarted / 1000));
		stmt->bind(":date_planned", static_cast<int>(result->datePlanned / 1000));
		stmt->bind(":jitter", 		result->jitter);
		stmt->bind(":url", 			result->url);
		stmt->bind(":duration", 	result->duration);
		stmt->bind(":status", 		static_cast<int>(result->status));
		stmt->bind(":status_text", 	result->statusText);
		stmt->bind(":http_status", 	result->httpStatus);
		stmt->execute();

		jobLogID = static_cast<int>(userDB->insertId());

		if(result->saveResponses && (!result->responseHeaders.empty() || !result->responseBody.empty()))
		{
			stmt = userDB->prepare("INSERT INTO \"joblog_response\"(\"joblogid\",\"jobid\",\"date\",\"headers\",\"body\",\"created\") "
				"VALUES(:joblogid,:jobid,:date,:headers,:body,strftime('%s', 'now'))");
			stmt->bind(":joblogid", jobLogID);
			stmt->bind(":jobid", 	result->jobID);
			stmt->bind(":date", 	static_cast<int>(result->dateStarted / 1000));
			stmt->bind(":headers", 	result->responseHeaders);
			stmt->bind(":body", 	result->responseBody);
			stmt->execute();
		}

		stmt = userDB->prepare("INSERT INTO \"joblog_stats\"(\"joblogid\",\"jobid\",\"date\",\"status\",\"name_lookup\",\"connect\",\"app_connect\",\"pre_transfer\",\"start_transfer\",\"total\") "
			"VALUES(:joblogid,:jobid,:date,:status,:name_lookup,:connect,:app_connect,:pre_transfer,:start_transfer,:total)");
		stmt->bind(":joblogid", 		jobLogID);
		stmt->bind(":jobid", 			result->jobID);
		stmt->bind(":date", 			static_cast<int>(result->dateStarted / 1000));
		stmt->bind(":status",			static_cast<int>(result->status));
		stmt->bind(":name_lookup",		result->timeNameLookup);
		stmt->bind(":connect",			result->timeConnect);
		stmt->bind(":app_connect",		result->timeAppConnect);
		stmt->bind(":pre_transfer",		result->timePreTransfer);
		stmt->bind(":start_transfer",	result->timeStartTransfer);
		stmt->bind(":total",			result->timeTotal);
		stmt->execute();
	}
	catch(const std::exception &ex)
	{
		std::cout << "Error SQLite query: " << ex.what() << std::endl;
		return;
	}

	if(result->status == JOBSTATUS_OK || result->status == JOBSTATUS_FAILED_TIMEOUT)
	{
		db->query("UPDATE `job` SET `last_status`=%d,`last_fetch`=%d,`last_duration`=%d,`fail_counter`=0 WHERE `jobid`=%d",
			static_cast<int>(result->status),
			static_cast<int>(result->dateStarted / 1000),
			static_cast<int>(result->duration),
			result->jobID);
	}
	else
	{
		db->query("UPDATE `job` SET `last_status`=%d,`last_fetch`=%d,`last_duration`=%d,`fail_counter`=`fail_counter`+1 WHERE `jobid`=%d",
			static_cast<int>(result->status),
			static_cast<int>(result->dateStarted / 1000),
			static_cast<int>(result->duration),
			result->jobID);
	}

	// get (new) fail counter
	int failCounter = 0;
	MYSQL_ROW row;
	auto res = db->query("SELECT `fail_counter` FROM `job` WHERE `jobid`=%d",
		result->jobID);
	while((row = res->fetchRow()) != NULL)
	{
		failCounter = atoi(row[0]);
	}
	res.reset();

	bool createNotification = false;
	NotificationType_t notificationType;

	// disable job?
	if(failCounter > maxFailures && result->jobType != JobType_t::MONITORING)
	{
		// disable
		db->query("UPDATE `job` SET `enabled`=0,`fail_counter`=0 WHERE `jobid`=%d",
			result->jobID);

		// notify?
		if(result->notifyDisable)
		{
			createNotification 			= true;
			notificationType 			= NOTIFICATION_TYPE_DISABLE;
		}
	}

	// send failure notification?
	if(result->notifyFailure
		&& result->status != JOBSTATUS_OK
		&& failCounter == 1)
	{
		createNotification 			= true;
		notificationType 			= NOTIFICATION_TYPE_FAILURE;
	}

	// send success notification?
	if(result->notifySuccess
		&& result->status == JOBSTATUS_OK
		&& result->oldFailCounter > 0
		&& failCounter == 0)
	{
		createNotification 			= true;
		notificationType 			= NOTIFICATION_TYPE_SUCCESS;
	}

	if(createNotification)
	{
		Notification n;
		n.userID = result->userID;
		n.jobID = result->jobID;
		n.date = time(NULL);
		n.dateStarted = result->dateStarted / 1000;
		n.datePlanned = result->datePlanned / 1000;
		n.type = notificationType;
		n.url = result->url;
		n.title = result->title;
		n.status = result->status;
		n.statusText = result->statusText;
		n.httpStatus = result->httpStatus;
		n.failCounter = failCounter;

		db->query("INSERT INTO `notification`(`jobid`,`joblogid`,`date`,`type`,`date_started`,`date_planned`,`url`,`execution_status`,`execution_status_text`,`execution_http_status`) "
			"VALUES(%d,%d,%u,%u,%u,%u,'%q',%u,'%q',%u)",
			result->jobID,
			jobLogID,
			static_cast<unsigned long>(time(NULL)),
			static_cast<unsigned long>(n.type),
			static_cast<unsigned long>(n.dateStarted),
			static_cast<unsigned long>(n.datePlanned),
			n.url.c_str(),
			static_cast<unsigned long>(n.status),
			n.statusText.c_str(),
			static_cast<unsigned long>(n.httpStatus));

		NotificationThread::getInstance()->addNotification(std::move(n));
	}

	if(result->jobType == JobType_t::MONITORING)
	{
		std::string timeDbFilePath = Utils::userTimeDbFilePath(userDbFilePathScheme, userTimeDbFileNameScheme, result->userID, tmStruct.tm_year + 1900);

		try
		{
			std::unique_ptr<SQLite_DB> timeDB = std::make_unique<SQLite_DB>(timeDbFilePath.c_str());

			timeDB->prepare("PRAGMA synchronous = OFF")->execute();

			int currentSchemaVersion = 0;
			auto stmt = timeDB->prepare("PRAGMA user_version");
			while(stmt->execute())
			{
				currentSchemaVersion = stmt->intValue(0);
			}

			if(currentSchemaVersion < 1)
			{
				timeDB->prepare("CREATE TABLE IF NOT EXISTS \"joblog_histogram\"("
					"	\"jobid\" INTEGER NOT NULL,"
					"	\"date\" INTEGER NOT NULL,"
					"	\"bin_0\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_1\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_2\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_3\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_4\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_5\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_6\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_7\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_8\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_9\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_10\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_11\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_12\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_13\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_14\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_15\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_16\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_17\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_18\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_19\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_20\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_21\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_22\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_23\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_24\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_25\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_26\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_27\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_28\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_29\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_30\" INTEGER NOT NULL DEFAULT 0,"
					"	\"bin_31\" INTEGER NOT NULL DEFAULT 0,"
					"	\"count_success\" INTEGER NOT NULL DEFAULT 0,"
					"	\"count_failure\" INTEGER NOT NULL DEFAULT 0,"
					" 	PRIMARY KEY(\"jobid\", \"date\")"
					")")->execute();
				timeDB->prepare("CREATE INDEX IF NOT EXISTS \"idx_histogram_jobid\" ON \"joblog_histogram\" (\"jobid\")")->execute();
				timeDB->prepare("CREATE INDEX IF NOT EXISTS \"idx_histogram_jobid_date\" ON \"joblog_histogram\" (\"jobid\", \"date\")")->execute();
			}

			if(currentSchemaVersion != TIMEDB_SCHEMA_VERSION)
			{
				std::string pragmaQuery = "PRAGMA user_version = " + std::to_string(TIMEDB_SCHEMA_VERSION);
				timeDB->prepare(pragmaQuery)->execute();
			}

			const unsigned int bin = std::min(31u, static_cast<unsigned int>(ceil(log(result->timeTotal / 1000) / log(sqrt(2)))));
			const unsigned int startedTimestamp = static_cast<unsigned int>(result->dateStarted / 1000);

			std::stringstream query;

			if(result->status == JobStatus_t::JOBSTATUS_OK)
			{
				query 	<< "INSERT INTO \"joblog_histogram\"(\"jobid\", \"date\", \"bin_" << bin << "\", \"count_success\") "
						<< "VALUES(:jobid, :date, 1, 1) "
						<< "ON CONFLICT(\"jobid\", \"date\") DO UPDATE SET "
						<< "	\"bin_" << bin << "\" = \"bin_" << bin << "\" + excluded.\"bin_" << bin << "\", "
						<< "	\"count_success\" = \"count_success\" + excluded.\"count_success\"";
			}
			else
			{
				query 	<< "INSERT INTO \"joblog_histogram\"(\"jobid\", \"date\",\"count_failure\") "
						<< "VALUES(:jobid, :date, 1) "
						<< "ON CONFLICT(\"jobid\", \"date\") DO UPDATE SET "
						<< "	\"count_failure\" = \"count_failure\" + excluded.\"count_failure\"";
			}

			stmt = timeDB->prepare(query.str());
			stmt->bind(":jobid", 			result->jobID);
			stmt->bind(":date", 			startedTimestamp - (startedTimestamp % 86400));
			stmt->execute();
		}
		catch(const std::exception &ex)
		{
			std::cout << "Error SQLite query: " << ex.what() << std::endl;
			return;
		}
	}
}

void UpdateThread::stopThread()
{
	stop = true;

	std::lock_guard<std::mutex> lg(queueMutex);
	queueSignal.notify_one();
}

void UpdateThread::run()
{
	std::cout << "UpdateThread::run(): Entered" << std::endl;

	decltype(queue) tempQueue;
	db = App::getInstance()->createMySQLConnection();

	stop = false;
	while(!stop)
	{
		{
			std::unique_lock<std::mutex> lock(queueMutex);
			if(queue.empty())
				queueSignal.wait(lock);
			queue.swap(tempQueue);
		}

		auto numJobs = tempQueue.size();
		if(numJobs > 100)
			std::cout << "UpdateThread::run(): " << numJobs << " update jobs fetched" << std::endl;

		time_t tStart = time(nullptr);
		if(!tempQueue.empty())
		{
			while(!tempQueue.empty())
			{
				std::unique_ptr<JobResult> res = std::move(tempQueue.front());
				tempQueue.pop();
				storeResult(res);
			}
		}
		time_t tEnd = time(nullptr);

		if(numJobs > 100)
			std::cout << "UpdateThread::run(): Processing " << numJobs << " took " << (tEnd-tStart) << " seconds" << std::endl;
	}

	std::cout << "UpdateThread::run(): Finished" << std::endl;
}
