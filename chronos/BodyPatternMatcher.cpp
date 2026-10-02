/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2026 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#include "BodyPatternMatcher.h"

#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace Chronos
{

namespace
{

bool containsPattern(const char *haystack, size_t haystackLen, const char *needle, size_t needleLen)
{
	if(needleLen == 0 || haystackLen < needleLen)
		return false;

	const char *haystackEnd = haystack + haystackLen;
	return std::search(haystack, haystackEnd, needle, needle + needleLen) != haystackEnd;
}

bool patternSeen(const std::string &pattern, const char *overlap, uint8_t overlapLen, const char *data, size_t size)
{
	const size_t patLen = pattern.size();

	// A spanning match starts in the retained suffix and needs at most
	// patLen-1 bytes of this chunk. Shorter strings only use their own
	// last patLen-1 suffix bytes.
	if(overlapLen > 0 && patLen > 1)
	{
		const size_t fromOverlap = std::min(static_cast<size_t>(overlapLen), patLen - 1);
		const size_t fromChunk = std::min(size, patLen - 1);
		char window[(BodyPatternMatcher::kMaxPatternLen - 1) * 2];
		std::memcpy(window, overlap + (overlapLen - fromOverlap), fromOverlap);
		std::memcpy(window + fromOverlap, data, fromChunk);
		if(containsPattern(window, fromOverlap + fromChunk, pattern.data(), patLen))
			return true;
	}

	return containsPattern(data, size, pattern.data(), patLen);
}

}

BodyPatternMatcher::BodyPatternMatcher(const std::vector<Pattern> &patterns)
	: patterns_(patterns)
{
	groups_.reserve(patterns_.size());

	size_t totalStrings = 0;
	size_t maxLen = 0;
	for(const Pattern &group : patterns_)
	{
		if(group.empty())
			throw std::invalid_argument("BodyPatternMatcher pattern has no strings");

		for(const std::string &text : group)
		{
			if(text.empty() || text.size() > kMaxPatternLen)
				throw std::invalid_argument("BodyPatternMatcher pattern string is empty or longer than 255 bytes");

			if(text.size() > maxLen)
				maxLen = text.size();
		}

		groups_.push_back(GroupState{totalStrings, group.size()});
		totalStrings += group.size();
	}

	found_.assign(totalStrings, 0);

	if(maxLen > 0)
		maxKeep_ = static_cast<uint8_t>(maxLen - 1);
}

void BodyPatternMatcher::feed(const char *data, size_t size)
{
	if(matched_ || size == 0 || data == nullptr)
		return;

	for(size_t groupIndex = 0; groupIndex < patterns_.size(); ++groupIndex)
	{
		GroupState &groupState = groups_[groupIndex];
		const Pattern &group = patterns_[groupIndex];

		for(size_t i = 0; i < group.size(); ++i)
		{
			const size_t foundIndex = groupState.begin + i;
			if(found_[foundIndex])
				continue;

			if(!patternSeen(group[i], overlap_, overlapLen_, data, size))
				continue;

			found_[foundIndex] = 1;
			if(--groupState.remaining == 0)
			{
				matched_ = true;
				return;
			}
		}
	}

	if(maxKeep_ == 0)
		return;

	if(size >= maxKeep_)
	{
		std::memcpy(overlap_, data + size - maxKeep_, maxKeep_);
		overlapLen_ = maxKeep_;
		return;
	}

	const size_t total = static_cast<size_t>(overlapLen_) + size;
	if(total > maxKeep_)
	{
		const size_t drop = total - maxKeep_;
		std::memmove(overlap_, overlap_ + drop, overlapLen_ - drop);
		overlapLen_ = static_cast<uint8_t>(overlapLen_ - drop);
	}

	std::memcpy(overlap_ + overlapLen_, data, size);
	overlapLen_ = static_cast<uint8_t>(overlapLen_ + size);
}

}
