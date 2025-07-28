FROM ghcr.io/openconext/openconext-basecontainers/apache2:latest
RUN rm -rf /etc/apache2/sites-enabled/*.conf
COPY ./docker/appconf.conf /etc/apache2/sites-enabled/
COPY ./dist/ /var/www/
