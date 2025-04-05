cmake_minimum_required(VERSION 3.6)
project(cron-job.org)

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/CMake/Modules")
set(CMAKE_CXX_STANDARD 14)

add_subdirectory(protocol)

option(BUILD_CHRONOS "Build chronos" ON)
if(BUILD_CHRONOS)
  add_subdirectory(chronos)
endif()

option(BUILD_WAF_VALIDATOR "Build waf-validator" OFF)
if(BUILD_WAF_VALIDATOR)
  add_subdirectory(waf-validator)
endif()
