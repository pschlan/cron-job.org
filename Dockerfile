FROM ubuntu:bionic AS build
RUN apt-get update && \
  apt-get install -y build-essential git cmake autoconf libtool pkg-config libmysqlclient-dev \
  libev-dev libsqlite3-dev libboost-all-dev libssl-dev flex bison wget

WORKDIR /src/deps
RUN wget https://c-ares.org/download/c-ares-1.21.0.tar.gz
RUN tar -xzf c-ares-1.21.0.tar.gz
RUN cd c-ares-1.21.0 && ./configure --prefix=/opt/chronos && make -j && make install && cd ..
RUN wget https://curl.haxx.se/download/curl-8.4.0.tar.gz
RUN tar -xzf curl-8.4.0.tar.gz
RUN cd curl-8.4.0 && ./configure --prefix=/opt/chronos --with-openssl --enable-ares=/opt/chronos && make -j && make install && cd ..
RUN wget https://archive.apache.org/dist/thrift/0.13.0/thrift-0.13.0.tar.gz
RUN tar -xzf thrift-0.13.0.tar.gz
RUN cd thrift-0.13.0 && ./configure --prefix=/opt/chronos --with-php=no --with-erlang=no --with-go=no --with-java=no --with-python=no --with-py3=no --with-ruby=no --with-nodejs=no --with-c_glib=no --with-cpp=yes && make -j && make install && cd ..

COPY ./ /src/cron-job.org/
WORKDIR /src/cron-job.org/build/
ENV PKG_CONFIG_PATH=/opt/chronos/lib/pkgconfig
RUN cmake -DCMAKE_INSTALL_PREFIX=/opt/chronos .. && make -j && make install

FROM ubuntu:bionic
RUN apt-get update && \
  apt-get install -y libmysqlclient20 libev4 libsqlite3-0 libssl1.1 tzdata locales

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

RUN mkdir -p /opt/chronos
RUN mkdir -p /opt/chronos/etc

WORKDIR /opt/chronos
COPY --from=build /opt/chronos ./
COPY ./docker/chronos/chronos-entry /opt/chronos/bin/
COPY ./docker/chronos/chronos.cfg /opt/chronos/etc/

RUN rm -rf /opt/chronos/include
RUN rm -rf /opt/chronos/share/man
RUN rm -f /opt/chronos/bin/thrift
RUN rm -f /opt/chronos/bin/curl-config
RUN chmod 0755 /opt/chronos/bin/chronos-entry

CMD "/opt/chronos/bin/chronos-entry"

# TODO: Cron task for data folder cleanup
