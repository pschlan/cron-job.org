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

#ifndef _RPCTHROW_H_
#define _RPCTHROW_H_

#include <string>

#include "protocol_types.h"

namespace Chronos
{
namespace RpcThrow
{
	void setPendingException(const std::string &exception);
	std::string takePendingException();

	[[noreturn]] void resourceNotFound();
	[[noreturn]] void forbidden();
	[[noreturn]] void invalidArguments();
	[[noreturn]] void internalError();
	[[noreturn]] void featureNotAvailable();

	[[noreturn]] void rethrow(const ResourceNotFound &ex);
	[[noreturn]] void rethrow(const Forbidden &ex);
	[[noreturn]] void rethrow(const InvalidArguments &ex);
	[[noreturn]] void rethrow(const InternalError &ex);
	[[noreturn]] void rethrow(const FeatureNotAvailable &ex);
}
}

#endif
