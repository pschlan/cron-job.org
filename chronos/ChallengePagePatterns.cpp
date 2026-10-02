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

#include "ChallengePagePatterns.h"

namespace Chronos
{
    const std::vector<std::vector<std::string>> &getChallengePagePatterns()
    {
        static const std::vector<std::vector<std::string>> challengePagePattern = {
            {
                "<title>One moment, please...</title>",
                "Please wait while your request is being verified...",
                "var a0I=a0v;(function(d,Q){"
            }
        };
        return challengePagePattern;
    }
}
