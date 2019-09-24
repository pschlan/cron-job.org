cmake_minimum_required(VERSION 3.1)
project(cron-job.org)

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/CMake/Modules")
set(CMAKE_CXX_STANDARD 14)

add_subdirectory(protocol)
add_subdirectory(chronos)
