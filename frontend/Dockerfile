FROM node:21 AS build

ARG CJO_PROJECT_NAME
ENV CJO_PROJECT_NAME $CJO_PROJECT_NAME
ARG CJO_BASE_URL
ENV CJO_BASE_URL $CJO_BASE_URL

COPY ./ /src/cron-job.org/frontend
COPY ./docker/Config.js /src/cron-job.org/frontend/src/utils/
COPY ./docker/update-frontend-config /usr/local/bin/

RUN chmod 0755 /usr/local/bin/update-frontend-config && /usr/local/bin/update-frontend-config

WORKDIR /src/cron-job.org/frontend
RUN npm ci && npm run build

FROM nginx:latest
COPY --from=build /src/cron-job.org/frontend/build /usr/share/nginx/html
COPY ./src/resources/logo.png /usr/share/nginx/html
COPY ./docker/default.conf /etc/nginx/conf.d/default.conf
