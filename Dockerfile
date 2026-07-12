FROM node:24-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.26-alpine AS backend
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /src/web/dist ./web/dist
ARG VERSION=dev
ARG COMMIT=unknown
RUN CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags "-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" \
    -o /out/nomadbank ./cmd/nomadbank

FROM alpine:3.23
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S nomadbank \
    && adduser -S -G nomadbank nomadbank \
    && mkdir -p /data \
    && chown nomadbank:nomadbank /data
WORKDIR /app
COPY --from=backend --chown=nomadbank:nomadbank /out/nomadbank /app/nomadbank
USER nomadbank
ENV DATA_DIR=/data \
    PORT=8080
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/health/ready || exit 1
ENTRYPOINT ["/app/nomadbank"]
