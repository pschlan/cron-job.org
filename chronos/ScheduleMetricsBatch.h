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

#ifndef _SCHEDULEMETRICSBATCH_H_
#define _SCHEDULEMETRICSBATCH_H_

#include <cstdint>

#include "JobResult.h"

namespace Chronos
{
	struct ScheduleMetricsBatch
	{
		static constexpr int NUM_JOB_TYPES = 2;
		static constexpr int NUM_PRIORITIES = 3;

		uint64_t counts[NUM_JOB_TYPES][NUM_PRIORITIES] = {};

		void add(JobType_t jobType, int8_t executionPriority);
	};
}

#endif
