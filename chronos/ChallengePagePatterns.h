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

 #ifndef _CHALLENGEPAGEPATTERNS_H_
 #define _CHALLENGEPAGEPATTERNS_H_

 #include <string>
 #include <vector>

 namespace Chronos
 {
    const std::vector<std::vector<std::string>> &getChallengePagePatterns();
 };

 #endif
