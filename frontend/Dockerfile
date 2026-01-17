# 前端 Dockerfile - 多阶段构建

# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建参数（可在 docker-compose 中传入）
ARG VITE_API_URL=http://localhost:8001

# 设置环境变量
ENV VITE_API_URL=$VITE_API_URL

# 构建生产版本
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
