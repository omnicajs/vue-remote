FROM node:24

WORKDIR /project

RUN corepack enable && corepack prepare yarn@1.22.22 --activate \
  && mkdir -p /home/node/.cache/node \
  && cp -a /root/.cache/node/corepack /home/node/.cache/node/corepack \
  && chown -R node:node /home/node/.cache
