FROM php:8.1-fpm

RUN apt-get -y update \
    && apt-get install -y msmtp msmtp-mta zlib1g-dev libpng-dev libfreetype-dev \
	&& apt-get clean \
	&& rm -r /var/lib/apt/lists/*

RUN docker-php-ext-install pdo pdo_mysql gd
RUN pecl install redis \
    && rm -rf /tmp/pear \
    && docker-php-ext-enable redis opcache gd

RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"

COPY ./docker/msmtprc /etc/msmtprc
COPY ./docker/api-entry /usr/local/bin/

RUN chmod 0755 /usr/local/bin/api-entry

COPY ./ /var/www/html/

RUN rm -rf /var/www/html/docker

ENTRYPOINT ["api-entry"]

# TODO: Cron tasks (UpdateNodeLoad ProcessUserGroupChanes + stuff from old cron.php)
