# `BIMetat-app`

This project is bootstrapped by [aurelia-cli](https://github.com/aurelia/cli).

For more information, go to https://aurelia.io/docs/cli/webpack

## Run dev app

1. Clone repo : 
  - `git clone repoUrl`
2. Run `npm install` for installing all packages
3. Run `npm run start:stage`, then open `http://localhost:8082` in your browser


## Plugin run in dev mode

1. Clone plugin repo at the same level as this repo : 
  - `cd ..`
  - `git clone https://github.com/bimaps/aurelia-three.git`
  - Example of structure :
    -  /web/bimetat-app
    -  /web/aurelia-three

2. In aurelia-three run `npm install`
3. npm link ..\aurelia-three\
4. In bimetat-app edit config : `webpack.config.js`
- Line 4 : `const useSrcFor = ['aurelia-three'];`

5. Run `npm run start:stage`, then open `http://localhost:8082` in your browser


## Build for production

Run `npm run build`


## Build with Docker

1. Run `npm install`
2. Run `npm run build`
3. Build Docker, for example :
    ```
    docker build -t bimetat-app .
    docker tag bimetat-app:latest bimetat-app:$VERSION
    docker push bimetat-app:$VERSION
    docker push bimetat-app:latest
    ```
4. Start container `docker run --restart always --name bimetat -p 80:80 -d --network=sdionet -e HOST=${urlAPI:3000} bimetat-app`
5. Change API URL in Docker App run : `docker exec -it bimetat sh /docker-host.sh`
