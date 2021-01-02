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

#include "Utils.h"

#include <algorithm>
#include <iostream>
#include <sstream>
#include <string>

#include <unistd.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <arpa/inet.h>

using namespace Chronos;

uint64_t Utils::getTimestampMS()
{
	uint64_t result = 0;
	struct timeval tv;

	if(gettimeofday(&tv, nullptr) == 0)
		result = (uint64_t)tv.tv_sec * 1000 + (uint64_t)tv.tv_usec / 1000;

	return(result);
}

std::string Utils::trim(const std::string &in)
{
	std::string str = in;
	std::string whiteSpaces = " \t\f\v\n\r";
	size_t pos;

	pos = str.find_first_not_of(whiteSpaces);
	if(pos != std::string::npos)
		str.erase(0, pos);
	else
		str.clear();

	pos = str.find_last_not_of(whiteSpaces);
	if(pos != std::string::npos)
		str.erase(pos+1);
	else
		str.clear();

	return(str);
}

void Utils::replace(std::string &str, const std::string &search, const std::string &repl)
{
	size_t pos = 0;
	while((pos = str.find(search, pos)) != std::string::npos)
	{
		str.replace(pos, search.length(), repl);
		pos += search.length();
	}
}

std::string Utils::userPathPart(const int userID)
{
	std::stringstream ss;
	ss << std::hex << userID;
	std::string userIdHex = ss.str();

	std::string result;
	for(size_t i = 0; i < userIdHex.length(); ++i)
	{
		result += userIdHex[i];
		if(i % 2 != 0)
			result += '/';
	}

	if(result[result.size()-1] == '/')
		result.pop_back();

	return result;
}

std::string Utils::userDbFilePath(const std::string &userDbFilePathScheme, const std::string &userDbFileNameScheme, const int userID, const int mday, const int month)
{
	const std::string userPart = userPathPart(userID);

	// e.g. /var/lib/cron-job.org/%u
	std::string dbDirPath = userDbFilePathScheme;
	Utils::replace(dbDirPath, "%u", userPart);
	if(!Utils::directoryExists(dbDirPath))
		Utils::mkPath(dbDirPath);

	// e.g. joblog-%m-%d.db
	std::string dbFileName = userDbFileNameScheme;
	Utils::replace(dbFileName, "%d", Utils::toString(mday, 2));
	Utils::replace(dbFileName, "%m", Utils::toString(month, 2));

	return dbDirPath + "/" + dbFileName;
}

std::string Utils::userTimeDbFilePath(const std::string &userDbFilePathScheme, const std::string &userTimeDbFileNameScheme, const int userID, const int year)
{
	const std::string userPart = userPathPart(userID);

	// e.g. /var/lib/cron-job.org/%u
	std::string dbDirPath = userDbFilePathScheme;
	Utils::replace(dbDirPath, "%u", userPart);
	if(!Utils::directoryExists(dbDirPath))
		Utils::mkPath(dbDirPath);

	// e.g. timeseries-%y.db
	std::string dbFileName = userTimeDbFileNameScheme;
	Utils::replace(dbFileName, "%y", Utils::toString(year, 4));

	return dbDirPath + "/" + dbFileName;
}

std::string Utils::toString(int num, int places)
{
	std::string result = std::to_string(num);
	while(result.size() < places)
		result.insert(result.begin(), '0');
	return result;
}

bool Utils::directoryExists(const std::string &path)
{
	struct stat st;

	if(stat(path.c_str(), &st) != 0)
		return false;

	return((st.st_mode & S_IFDIR) == S_IFDIR);
}

bool Utils::mkPath(const std::string &path, const mode_t mode)
{
	std::string currentDir;
	for(const char c : path)
	{
		currentDir += c;
		if(c == '/' && currentDir.size() > 1)
		{
			if(!Utils::directoryExists(currentDir))
			{
				if(mkdir(currentDir.c_str(), mode) != 0)
					return false;
			}
		}
	}
	if(!Utils::directoryExists(currentDir))
	{
		if(mkdir(currentDir.c_str(), mode) != 0)
			return false;
	}
	return true;
}

std::string Utils::toLower(const std::string &str)
{
	std::string result;
	std::transform(str.begin(), str.end(), result.begin(), ::tolower);
	return result;
}

std::vector<std::string> Utils::split(const std::string &str, char delimiter)
{
	std::vector<std::string> result;

	std::size_t last = 0;
	std::size_t pos = 0;
	while((pos = str.find(delimiter, last)) != std::string::npos)
	{
		result.push_back(str.substr(last, pos - last));
		last = pos + 1;
	}

	result.push_back(str.substr(last));

	return result;
}

Utils::Subnet::Subnet(const std::string &cidrNotation)
{
	std::size_t slashPos = cidrNotation.find('/');
	if(slashPos == std::string::npos || slashPos < 1)
		throw std::runtime_error("Invalid CIDR notation: " + cidrNotation);

	const std::string addressString = cidrNotation.substr(0, slashPos);
	const std::string bitsString = cidrNotation.substr(slashPos + 1);

	int nBits = std::stoi(bitsString);
	if(nBits > 32)
		throw std::runtime_error("Invalid CIDR bits: " + cidrNotation);

	this->netmask = htonl(0xFFFFFFFF << (32 - nBits));
	this->maskedAddress = ::inet_addr(addressString.c_str()) & this->netmask;
}
