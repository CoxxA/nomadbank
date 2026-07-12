.PHONY: build run frontend api-check test test-go test-race test-web lint verify docker clean

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
LDFLAGS := -s -w -X main.version=$(VERSION) -X main.commit=$(COMMIT)

frontend:
	cd frontend && npm ci && npm run build

build: frontend
	CGO_ENABLED=0 go build -trimpath -ldflags "$(LDFLAGS)" -o bin/nomadbank ./cmd/nomadbank

run:
	go run ./cmd/nomadbank

api-check:
	cd frontend && npm run api:check

test-go:
	go test ./...

test-race:
	go test -race ./...

test-web:
	cd frontend && npm run test -- --run

test: test-go test-web

lint:
	test -z "$$(gofmt -l cmd internal web)"
	go vet ./...
	cd frontend && npm run lint && npm run format:check

verify: api-check lint test
	cd frontend && npm run build

docker:
	docker build --build-arg VERSION=$(VERSION) --build-arg COMMIT=$(COMMIT) -t nomadbank:local .

clean:
	rm -rf bin web/dist/assets web/dist/index.html
