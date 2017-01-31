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

#include "Config.h"

#include <iostream>
#include <stdexcept>

#include <stdio.h>
#include <string.h>

#include "Utils.h"

using namespace Chronos;

Config::Config(const std::string &fileName)
{
	//! @todo This should really be done properly in a C++ way.

	char buffer[512];

	FILE *fp = fopen(fileName.c_str(), "r");
	if(fp == nullptr)
		throw std::runtime_error(std::string("Config::Config(): Failed to open config file: ") + fileName);

	while(!feof(fp) && fgets(buffer, sizeof(buffer)-2, fp) != nullptr)
	{
		if(strlen(buffer) < 3 || buffer[0] == '#')
			continue;

		char *eqPos = strchr(buffer, '=');
		if(eqPos != nullptr)
		{
			std::string key(buffer, (size_t)(eqPos-buffer)), value(eqPos+1, strlen(eqPos)-1);
			this->data[Utils::trim(key)] = Utils::trim(value);
		}
	}

	fclose(fp);
}

Config::~Config()
{
}

std::string Config::get(const std::string &key)
{
	std::lock_guard<std::mutex> lg(this->lock);
	return this->data[key];
}

int Config::getInt(const std::string &key)
{
	return std::stoi(get(key));
}

unsigned int Config::getUInt(const std::string &key)
{
	return std::stoul(get(key));
}
