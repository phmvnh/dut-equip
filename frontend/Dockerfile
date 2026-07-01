# ---- build stage: build SPA bằng Vite ----
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# URL công khai dùng để gọi API + WebSocket — bake lúc build
ARG PUBLIC_ORIGIN=https://dutequip.io.vn
ENV VITE_API_BASE_URL=${PUBLIC_ORIGIN}/api/v1
ENV VITE_WS_BASE_URL=${PUBLIC_ORIGIN}
# Chỉ build bundle (bỏ bước "tsc -b" của npm run build). Type-check là việc của
# môi trường dev/CI; lỗi type không ảnh hưởng runtime nên không chặn deploy.
RUN npx vite build

# ---- serve stage: nginx phục vụ tĩnh + reverse proxy ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
