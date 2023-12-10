FROM php:8.1-fpm

RUN docker-php-ext-install pdo pdo_mysql
RUN pecl install redis \
    && rm -rf /tmp/pear \
    && docker-php-ext-enable redis opcache

RUN apt-get -y update \
    && apt-get install -y msmtp msmtp-mta \
	&& apt-get clean \
	&& rm -r /var/lib/apt/lists/*

RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"

COPY ./docker/msmtprc /etc/msmtprc
COPY ./docker/api-entry /usr/local/bin/

RUN chmod 0755 /usr/local/bin/api-entry

COPY ./ /var/www/html/

RUN rm -rf /var/www/html/docker

ENTRYPOINT ["api-entry"]

# TODO: Cron tasks (UpdateNodeLoad ProcessUserGroupChanes + stuff from old cron.php)
