.PHONY: build run dev clean docker frontend docs test-all

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

# 运行后端测试
test:
	go test -v ./...

# 运行所有测试（后端 + 前端）
test-all: test
	cd frontend && npm run test -- --run

# 查看 API 文档（使用 Swagger UI）
docs:
	@echo "API 文档位置: docs/api/openapi.yaml"
	@echo "在线查看: https://editor.swagger.io/ (导入 openapi.yaml)"
	@echo "或使用 Docker:"
	@echo "  docker run -p 8081:8080 -e SWAGGER_JSON=/spec/openapi.yaml -v \$$(pwd)/docs/api:/spec swaggerapi/swagger-ui"
	@echo "  然后访问 http://localhost:8081"
