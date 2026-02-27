FROM node:24

WORKDIR /project

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_GC=1

RUN corepack enable && corepack prepare yarn@1.22.22 --activate
RUN npx -y playwright@1.57.0 install --with-deps chromium firefox
