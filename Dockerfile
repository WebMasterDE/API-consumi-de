FROM node:26.13.0

WORKDIR /usr/src/app
COPY package*.json ./

# typescript e gli altri tool di build sono nelle devDependencies del progetto
RUN npm install \
    && npm install pm2 -g

COPY . .

EXPOSE 8446

CMD npm run build && pm2-runtime dist/app.js

# command to build docker image
# sudo docker-compose up -d --build

