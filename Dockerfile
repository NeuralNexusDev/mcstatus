FROM node:18

WORKDIR /app

COPY package.json ./

RUN npm install

COPY ./lib ./lib

COPY ./* ./

RUN /app/node_modules/typescript/bin/tsc -p /app/tsconfig.build.json

CMD ["node", "./dist/index.js"]