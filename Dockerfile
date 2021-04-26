
# Stage 0, Build and compile the frontend (based on Node.js)
FROM node:14.16.1-alpine as build-stage

WORKDIR /app

# Build in relation to the environment
# build / build:dev / build:stage
ARG BUILDCMD=build

COPY package*.json /app/

RUN npm install

COPY ./ /app/

RUN echo "Build environment : $BUILDCMD"
RUN npm run $BUILDCMD

# Stage 1, Compiled app (based on Nginx)
FROM nginx:stable-alpine

RUN rm /usr/share/nginx/html/50x.html 
RUN rm /usr/share/nginx/html/index.html

COPY --from=build-stage /app/dist/ /usr/share/nginx/html

# Copy the nginx configuration from BIMétat
COPY ./nginx-default.conf /etc/nginx/conf.d/default.conf

# Build & Run your container :
# docker build --build-arg BUILDCMD=build:stage -t bimetat-app .
# docker run --restart always -d -p 8082:80 --name bevc tamuh/bimetat-app

