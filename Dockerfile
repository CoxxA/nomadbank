# 阶段 1: 构建前端
FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# 输出到 /build/dist 而不是 ../web/dist
RUN npm run build -- --outDir dist

# 阶段 2: 构建 Go 后端
FROM golang:1.22-alpine AS backend
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY go.mod ./
RUN go mod download || true
COPY . .
COPY --from=frontend /build/dist ./web/dist
RUN go mod tidy && CGO_ENABLED=1 go build -ldflags "-s -w" -o nomadbank ./cmd/nomadbank

# 阶段 3: 最终镜像
FROM alpine:3.19
RUN apk add --no-cache ca-certificates sqlite-libs tzdata
WORKDIR /app
COPY --from=backend /app/nomadbank .
VOLUME /data
EXPOSE 8080
ENV TZ=Asia/Shanghai
ENV DATA_DIR=/data
ENV MODE=prod
CMD ["./nomadbank"]
