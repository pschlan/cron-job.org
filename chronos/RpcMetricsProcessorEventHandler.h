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

#ifndef _RPCMETRICSPROCESSOREVENTHANDLER_H_
#define _RPCMETRICSPROCESSOREVENTHANDLER_H_

#include <chrono>
#include <memory>
#include <string>

#include <thrift/TProcessor.h>

namespace Chronos
{
	class RpcMetricsProcessorEventHandler : public apache::thrift::TProcessorEventHandler
	{
	public:
		explicit RpcMetricsProcessorEventHandler(std::string service);

		void *getContext(const char *fn_name, void *serverContext) override;
		void postWrite(void *ctx, const char *fn_name, uint32_t bytes) override;
		void handlerError(void *ctx, const char *fn_name) override;
		void freeContext(void *ctx, const char *fn_name) override;

	private:
		struct RpcCallContext
		{
			std::chrono::steady_clock::time_point start;
		};

		void record(const char *fn_name, RpcCallContext *ctx, const std::string &result,
			const std::string &exception);

		std::string service_;
	};
}

#endif
