FROM node:18

WORKDIR /app

COPY package.json ./

COPY tsconfig.json ./

COPY tsconfig.build.json ./

RUN apt-get update && apt-get install cmake -y && npm install

COPY ./lib ./lib

COPY index.ts ./

COPY ./lib ./lib

RUN /app/node_modules/typescript/bin/tsc -p /app/tsconfig.build.json

CMD ["node", "./dist/index.js"]