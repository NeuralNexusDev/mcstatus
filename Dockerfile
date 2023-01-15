FROM node:18

WORKDIR /app

COPY package.json ./

RUN npm install

COPY ./index.js .

ENV DISCORD_TOKEN="" SUPABASE_URL="" SUPABASE_KEY="" PET_NAME="" BOT_CLIENT_ID=""

CMD [ "node", "."]