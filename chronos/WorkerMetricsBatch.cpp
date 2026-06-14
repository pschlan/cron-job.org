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

#include "WorkerMetricsBatch.h"

#include "MetricsLabels.h"

namespace Chronos
{

void WorkerMetricsBatch::record(const JobResult &result)
{
	const int jobTypeIdx = MetricsLabels::jobTypeIndex(result.jobType);
	const int statusIdx = MetricsLabels::statusIndex(result.status);

	++statusCount[jobTypeIdx][statusIdx];
	durationSeconds[jobTypeIdx].push_back(static_cast<double>(result.duration) / 1000.0);
	jitterSeconds[jobTypeIdx].push_back(static_cast<double>(result.jitter) / 1000.0);
}

}
