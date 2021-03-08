
FROM nginx:alpine

RUN apk upgrade --update \
	&& apk add vim

RUN rm /usr/share/nginx/html/50x.html 
RUN rm /usr/share/nginx/html/index.html

COPY dist /usr/share/nginx/html
COPY nginx-default.conf /etc/nginx/conf.d/default.conf
COPY ./docker-host.sh /
RUN ["chmod", "+x", "/docker-host.sh"]
