set(NAME chronos)

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
	NodeService.cpp
	MasterService.cpp
	NotificationThread.cpp
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

add_executable(${NAME} ${SOURCES} ${CCTZ_SOURCES})

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
target_link_libraries(${NAME}
	${MySQLClient_LIBRARIES}
	${CURL_LIBRARIES}
	${LIBEV_LIBRARIES}
	${SQLITE_LIBRARIES}
	${CMAKE_THREAD_LIBS_INIT}
	${OPENSSL_CRYPTO_LIBRARY}
	protocol
)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

install(TARGETS ${NAME} DESTINATION bin)

