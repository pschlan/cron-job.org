cmake_minimum_required(VERSION 3.1)
project(chronos)

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/CMake/Modules")

set(CMAKE_CXX_STANDARD 14)

set(SOURCES
	main.cpp
	App.cpp
	Config.cpp
	HTTPRequest.cpp
	MySQL_DB.cpp
	MySQL_Result.cpp
	SQLite.cpp
	UpdateThread.cpp
	Utils.cpp
	WorkerThread.cpp
)

set(CCTZ_SOURCES
	cctz/src/civil_time_detail.cc
	cctz/src/time_zone_fixed.cc
	cctz/src/time_zone_format.cc
	cctz/src/time_zone_if.cc
	cctz/src/time_zone_impl.cc
	cctz/src/time_zone_info.cc
	cctz/src/time_zone_libc.cc
	cctz/src/time_zone_lookup.cc
	cctz/src/time_zone_posix.cc
)

add_executable(${PROJECT_NAME} ${SOURCES} ${CCTZ_SOURCES})

find_package(MySQLClient REQUIRED)
find_package(CURL REQUIRED)
find_package(libev REQUIRED)
find_package(SQLite REQUIRED)
find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

include_directories(
	cctz/include/
	${MySQLClient_INCLUDE_DIRS}
	${CURL_INCLUDE_DIRS}
	${LIBEV_INCLUDE_DIRS}
	${SQLITE_INCLUDE_DIRS}
	${OPENSSL_INCLUDE_DIR}
)
target_link_libraries(${PROJECT_NAME}
	${MySQLClient_LIBRARIES}
	${CURL_LIBRARIES}
	${LIBEV_LIBRARIES}
	${SQLITE_LIBRARIES}
	${CMAKE_THREAD_LIBS_INIT}
	${OPENSSL_CRYPTO_LIBRARY}
)

include_directories(${PROJECT_SOURCE_DIR})

install(TARGETS ${PROJECT_NAME} DESTINATION bin)

