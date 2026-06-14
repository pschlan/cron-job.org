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

#include "RpcMetricsProcessorEventHandler.h"

#include "Metrics.h"
#include "RpcThrow.h"

namespace Chronos
{

RpcMetricsProcessorEventHandler::RpcMetricsProcessorEventHandler(std::string service)
	: service_(std::move(service))
{
}

void *RpcMetricsProcessorEventHandler::getContext(const char * /*fn_name*/, void * /*serverContext*/)
{
	return new RpcCallContext{std::chrono::steady_clock::now()};
}

void RpcMetricsProcessorEventHandler::postWrite(void *ctx, const char *fn_name, uint32_t /*bytes*/)
{
	const std::string pending = RpcThrow::takePendingException();
	if(pending.empty())
		record(fn_name, static_cast<RpcCallContext *>(ctx), "ok", "");
	else
		record(fn_name, static_cast<RpcCallContext *>(ctx), "error", pending);
}

void RpcMetricsProcessorEventHandler::handlerError(void *ctx, const char *fn_name)
{
	record(fn_name, static_cast<RpcCallContext *>(ctx), "error", "internal_error");
}

void RpcMetricsProcessorEventHandler::freeContext(void *ctx, const char * /*fn_name*/)
{
	delete static_cast<RpcCallContext *>(ctx);
}

void RpcMetricsProcessorEventHandler::record(const char *fn_name, RpcCallContext *ctx,
	const std::string &result, const std::string &exception)
{
	if(ctx == nullptr)
		return;

	const std::chrono::duration<double> elapsed = std::chrono::steady_clock::now() - ctx->start;
	Metrics::instance().recordRpcRequest(service_, fn_name, result, exception, elapsed.count());
}

}
