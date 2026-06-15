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

#ifndef _METRICSEXPOSER_H_
#define _METRICSEXPOSER_H_

#include <memory>
#include <string>

namespace prometheus { class Exposer; }

namespace Chronos
{
	class MetricsExposer
	{
	public:
		MetricsExposer(const std::string &interfaceName, int port);
		~MetricsExposer();

		void run();
		void stop();

	private:
		std::unique_ptr<prometheus::Exposer> exposer;
	};
}

#endif
