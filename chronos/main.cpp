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

#include <iostream>
#include <memory>
#include <stdexcept>

#include "App.h"

int main(int argc, char *argv[])
{
	int result = 1;
	std::unique_ptr<Chronos::App> app;

	try
	{
		app = std::make_unique<Chronos::App>(argc, argv);
		result = app->run();
	}
	catch(const std::runtime_error &ex)
	{
		std::cout << "Chronos runtime error: " << ex.what() << std::endl;
	}

	return(result);
}
