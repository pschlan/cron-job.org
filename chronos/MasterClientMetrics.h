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

#ifndef _MASTERCLIENTMETRICS_H_
#define _MASTERCLIENTMETRICS_H_

#include "Metrics.h"

namespace Chronos
{

template<typename Fn>
auto callMaster(const char *method, Fn &&fn) -> decltype(fn())
{
	Metrics::instance().incrementMasterClientRequest(method);
	try
	{
		return fn();
	}
	catch(...)
	{
		Metrics::instance().incrementMasterClientError(method);
		throw;
	}
}

}

#endif
