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

#ifndef _UTILS_H_
#define _UTILS_H_

#include <string>

#include <stdint.h>
#include <sys/stat.h>

namespace Chronos
{
	namespace Utils
	{
		uint64_t getTimestampMS();
		std::string trim(const std::string &in);
		void replace(std::string &str, const std::string &search, const std::string &repl);
		std::string userPathPart(const int userID);
		std::string toString(int num, int places);
		bool directoryExists(const std::string &path);
		bool mkPath(const std::string &path, const mode_t mode = 0755);
	};
};

#endif
