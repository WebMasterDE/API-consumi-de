FROM node:22.11.0

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm install\
    && npm install pm2 -g \
    && npm install -g typescript

COPY . .

EXPOSE 8444

CMD npm run build && pm2-runtime dist/app.js

# command to build docker image
# sudo docker-compose up -d --build

