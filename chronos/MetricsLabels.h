/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2025 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#ifndef _METRICSLABELS_H_
#define _METRICSLABELS_H_

#include <cstdint>
#include <string>

#include "JobResult.h"
#include "Notification.h"

namespace Chronos
{
	namespace MetricsLabels
	{
		std::string jobTypeLabel(JobType_t jobType);
		std::string statusLabel(JobStatus_t status);
		std::string priorityBin(int8_t executionPriority);
		std::string notificationTypeLabel(NotificationType_t type);
		std::string httpStatusClass(int httpStatus);

		int jobTypeIndex(JobType_t jobType);
		int statusIndex(JobStatus_t status);
		int priorityIndex(int8_t executionPriority);
	}
}

#endif
