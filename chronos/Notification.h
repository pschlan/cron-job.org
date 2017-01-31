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

#ifndef _NOTIFICATION_H_
#define _NOTIFICATION_H_

namespace Chronos
{
	enum NotificationType_t
	{
		NOTIFICATION_TYPE_FAILURE	= 0,
		NOTIFICATION_TYPE_SUCCESS	= 1,
		NOTIFICATION_TYPE_DISABLE	= 2
	};
};

#endif
