.PHONY: build run dev clean docker frontend

# 版本信息
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION) -X main.commit=$(COMMIT)"

# 构建 Go 后端
build:
	go build $(LDFLAGS) -o bin/nomadbank ./cmd/nomadbank

# 运行（开发模式）
run: build
	./bin/nomadbank -mode dev

# 开发模式（热重载，需要安装 air）
dev:
	air

# 构建前端
frontend:
	cd frontend && npm ci && npm run build
	mkdir -p web/dist
	cp -r frontend/dist/* web/dist/

# 完整构建（前端 + 后端）
all: frontend build

# Docker 构建
docker:
	docker build -t nomadbank:latest .

# Docker 运行
docker-run:
	docker run -d \
		--name nomadbank \
		-p 8080:8080 \
		-v nomadbank_data:/data \
		-e JWT_SECRET=your-secret-change-in-production \
		nomadbank:latest

# 清理
clean:
	rm -rf bin/
	rm -rf web/dist/

# 安装依赖
deps:
	go mod download
	go mod tidy

# 运行测试
test:
	go test -v ./...
