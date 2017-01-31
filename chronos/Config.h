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

#ifndef _CONFIG_H_
#define _CONFIG_H_

#include <map>
#include <mutex>
#include <string>

namespace Chronos
{
	class Config
	{
	public:
		Config(const std::string &fileName);
		~Config();

	public:
		std::string get(const std::string &key);
		int getInt(const std::string &key);
		unsigned int getUInt(const std::string &key);

	private:
		std::map<std::string, std::string> data;
		std::mutex lock;
	};
};

#endif
