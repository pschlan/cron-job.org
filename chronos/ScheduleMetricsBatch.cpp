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

#include "ScheduleMetricsBatch.h"

#include "MetricsLabels.h"

namespace Chronos
{

void ScheduleMetricsBatch::add(JobType_t jobType, int8_t executionPriority)
{
	++counts[MetricsLabels::jobTypeIndex(jobType)][MetricsLabels::priorityIndex(executionPriority)];
}

}
