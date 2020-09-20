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

#ifndef _JOBRESULT_H_
#define _JOBRESULT_H_

#include <stdint.h>

#include <string>

namespace Chronos
{
	enum JobStatus_t
	{
		JOBSTATUS_UNKNOWN			= 0,
		JOBSTATUS_OK				= 1,
		JOBSTATUS_FAILED_DNS		= 2,
		JOBSTATUS_FAILED_CONNECT	= 3,
		JOBSTATUS_FAILED_HTTPERROR	= 4,
		JOBSTATUS_FAILED_TIMEOUT	= 5,
		JOBSTATUS_FAILED_SIZE		= 6,
		JOBSTATUS_FAILED_URL		= 7,
		JOBSTATUS_FAILED_INTERNAL	= 8,
		JOBSTATUS_FAILED_OTHERS 	= 9
	};

	enum class JobType_t : int
	{
		DEFAULT		= 0,
		MONITORING	= 1
	};

	struct JobResult
	{
		int userID = 0;
		int jobID = 0;
		uint64_t dateStarted = 0;	// in ms
		uint64_t datePlanned = 0;	// in ms
		uint64_t dateDone = 0 ;		// in ms
		int jitter = 0;				// in ms
		std::string url;
		std::string title;
		int duration = 0;			// in ms
		JobStatus_t status = JOBSTATUS_UNKNOWN;
		int httpStatus = 0;
		std::string responseHeaders;
		std::string responseBody;
		std::string statusText;
		bool notifyFailure = false;
		bool notifySuccess = false;
		bool notifyDisable = false;
		bool saveResponses = false;
		int oldFailCounter = 0;
		std::string peerAddress;
		int peerPort = 0;

		int timeNameLookup = 0;		// in us
		int timeConnect = 0;		// in us
		int timeAppConnect = 0;		// in us
		int timePreTransfer = 0;	// in us
		int timeStartTransfer = 0;	// in us
		int timeTotal = 0;			// in us

		JobType_t jobType = JobType_t::DEFAULT;
	};
};

#endif
