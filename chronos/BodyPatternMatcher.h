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

#ifndef _BODYPATTERNMATCHER_H_
#define _BODYPATTERNMATCHER_H_

#include <stddef.h>
#include <stdint.h>

#include <string>
#include <vector>

namespace Chronos
{
	// Streaming exact-substring search over curl write chunks.
	// Each Pattern matches once every one of its strings has appeared
	// anywhere in the body, in any order. The matcher matches when any
	// Pattern matches.
	// Only the last (longest string - 1) bytes are retained, so a string
	// split across callbacks is still found. The pattern list is not copied
	// and must outlive the matcher.
	class BodyPatternMatcher
	{
	public:
		using Pattern = std::vector<std::string>;

		static constexpr size_t kMaxPatternLen = 255;

		explicit BodyPatternMatcher(const std::vector<Pattern> &patterns);

		BodyPatternMatcher(const BodyPatternMatcher &) = delete;
		BodyPatternMatcher &operator=(const BodyPatternMatcher &) = delete;

		void feed(const char *data, size_t size);
		bool didMatch() const { return matched_; }

	private:
		struct GroupState
		{
			size_t begin;
			size_t remaining;
		};

		const std::vector<Pattern> &patterns_;
		std::vector<GroupState> groups_;
		std::vector<uint8_t> found_;
		char overlap_[kMaxPatternLen - 1] = {};
		uint8_t overlapLen_ = 0;
		uint8_t maxKeep_ = 0;
		bool matched_ = false;
	};
};

#endif
