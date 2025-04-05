set(NAME waf-validator)

set(CMAKE_INSTALL_RPATH "${CMAKE_INSTALL_PREFIX}/lib")

set(SOURCES
  main.cpp
)

add_executable(${NAME} ${SOURCES})

find_package(CURL REQUIRED)
find_package(libmodsecurity REQUIRED)

target_include_directories(${NAME} PRIVATE
  ${CURL_INCLUDE_DIRS}
  ${libmodsecurity_INCLUDE_DIRS}
)
target_link_libraries(${NAME} PRIVATE
	${CMAKE_THREAD_LIBS_INIT}
	${CURL_LIBRARIES}
  ${libmodsecurity_LIBRARIES}
	chronos-protocol
)

set_property(TARGET ${NAME} PROPERTY CXX_STANDARD 17)

install(TARGETS ${NAME} DESTINATION bin)
