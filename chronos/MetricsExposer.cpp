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

#include "MetricsExposer.h"

#include <prometheus/exposer.h>

#include "Metrics.h"

namespace Chronos
{

MetricsExposer::MetricsExposer(const std::string &interfaceName, int port)
{
	const std::string bindAddress = interfaceName + ":" + std::to_string(port);
	exposer = std::make_unique<prometheus::Exposer>(bindAddress);
	exposer->RegisterCollectable(Metrics::instance().registry());
}

MetricsExposer::~MetricsExposer()
{
	stop();
}

void MetricsExposer::run()
{
}

void MetricsExposer::stop()
{
	exposer.reset();
}

}
