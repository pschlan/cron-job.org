/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2017-2024 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#include "Utils.h"

#include <algorithm>
#include <ctime>
#include <functional>
#include <iostream>
#include <random>
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
		pos += repl.length();
	}
}

std::string Utils::userPathPart(const int userID)
{
	std::stringstream ss;
	ss << std::hex << userID;
	std::string userIdHex = ss.str();

	std::string result;
	result.reserve(userIdHex.length() * 2);
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
	std::string dbDirPath = formatString(userDbFilePathScheme, {{'u', userPart}});
	if(!Utils::directoryExists(dbDirPath))
		Utils::mkPath(dbDirPath);

	// e.g. joblog-%m-%d.db
	std::string dbFileName = formatString(userDbFileNameScheme, {{'d', Utils::toString(mday, 2)}, {'m', Utils::toString(month, 2)}});

	return dbDirPath + "/" + dbFileName;
}

std::string Utils::userTimeDbFilePath(const std::string &userDbFilePathScheme, const std::string &userTimeDbFileNameScheme, const int userID, const int year)
{
	const std::string userPart = userPathPart(userID);

	// e.g. /var/lib/cron-job.org/%u
	std::string dbDirPath = formatString(userDbFilePathScheme, {{'u', userPart}});
	if(!Utils::directoryExists(dbDirPath))
		Utils::mkPath(dbDirPath);

	// e.g. timeseries-%y.db
	std::string dbFileName = formatString(userTimeDbFileNameScheme, {{'y', Utils::toString(year, 4)}});

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

std::string Utils::formatString(const std::string &in, const std::unordered_map<char, std::string> &arguments)
{
	std::string result;
	result.reserve(in.size());

	for(auto it = in.begin(); it != in.end(); ++it)
	{
		if(*it == '%' && it != in.end())
		{
			char c = *++it;
			auto argIt = arguments.find(c);
			if(argIt != arguments.end())
			{
				result.append(argIt->second);
			}
			else
			{
				result.append(1, c);
			}
		}
		else
		{
			result.append(1, *it);
		}
	}

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

std::string Utils::generateUuid4()
{
	static const char HEX_CHARS[] = "0123456789abcdef";
	static_assert(sizeof(HEX_CHARS) == 16+1, "HEX_CHARS has unexpected size!");

	static thread_local std::mt19937 rng{std::random_device{}()};
	std::uniform_int_distribution<> dist(0, 15);

	std::string res(36, '-');
	res[14] = '4';
	for(std::size_t i = 0; i < 36; ++i)
	{
		if (i != 8 && i != 13 && i != 14 && i != 18 && i != 19 && i != 23)
		{
			res[i] = HEX_CHARS[dist(rng)];
		}
		else if (i == 19)
		{
			res[i] = HEX_CHARS[(dist(rng) & 0x3) | 0x8];
		}
	}
	return res;
}

std::string Utils::replaceVariables(const std::string &in)
{
	static const std::string VAR_PREFIX = "%cjo:";

	static const std::unordered_map<std::string, std::function<std::string()>> VARIABLES =
	{
		{ "%cjo:unixtime%", [] () { return std::to_string(static_cast<uint64_t>(::time(nullptr))); } },
		{ "%cjo:uuid4%", [] () { return Utils::generateUuid4(); } },
	};

	std::string res = in;
	std::size_t pos = 0;
	while((pos = res.find(VAR_PREFIX, pos)) != std::string::npos)
	{
		bool varMatched = false;

		for(const auto &var : VARIABLES)
		{
			if(res.substr(pos, var.first.size()) == var.first)
			{
				std::string repl = var.second();
				res.replace(pos, var.first.size(), repl);
				pos += repl.size();
				varMatched = true;
				break;
			}
		}

		if(!varMatched)
		{
			pos += VAR_PREFIX.size();
		}
	}

	return res;
}
