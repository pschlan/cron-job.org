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

#ifndef _WORKERMETRICSBATCH_H_
#define _WORKERMETRICSBATCH_H_

#include <cstdint>
#include <vector>

#include "JobResult.h"

namespace Chronos
{
	struct WorkerMetricsBatch
	{
		static constexpr int NUM_JOB_TYPES = 2;
		static constexpr int NUM_STATUSES = 10;

		uint64_t statusCount[NUM_JOB_TYPES][NUM_STATUSES] = {};
		std::vector<double> durationSeconds[NUM_JOB_TYPES];
		std::vector<double> jitterSeconds[NUM_JOB_TYPES];

		void record(const JobResult &result);
	};
}

#endif
