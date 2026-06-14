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

#include "RpcThrow.h"

namespace Chronos
{
namespace RpcThrow
{

namespace {

thread_local std::string pendingException;

}

void setPendingException(const std::string &exception)
{
	pendingException = exception;
}

std::string takePendingException()
{
	std::string result = pendingException;
	pendingException.clear();
	return result;
}

[[noreturn]] void resourceNotFound()
{
	setPendingException("resource_not_found");
	throw ResourceNotFound();
}

[[noreturn]] void forbidden()
{
	setPendingException("forbidden");
	throw Forbidden();
}

[[noreturn]] void invalidArguments()
{
	setPendingException("invalid_arguments");
	throw InvalidArguments();
}

[[noreturn]] void internalError()
{
	setPendingException("internal_error");
	throw InternalError();
}

[[noreturn]] void featureNotAvailable()
{
	setPendingException("feature_not_available");
	throw FeatureNotAvailable();
}

[[noreturn]] void rethrow(const ResourceNotFound &ex)
{
	setPendingException("resource_not_found");
	throw ex;
}

[[noreturn]] void rethrow(const Forbidden &ex)
{
	setPendingException("forbidden");
	throw ex;
}

[[noreturn]] void rethrow(const InvalidArguments &ex)
{
	setPendingException("invalid_arguments");
	throw ex;
}

[[noreturn]] void rethrow(const InternalError &ex)
{
	setPendingException("internal_error");
	throw ex;
}

[[noreturn]] void rethrow(const FeatureNotAvailable &ex)
{
	setPendingException("feature_not_available");
	throw ex;
}

}
}
