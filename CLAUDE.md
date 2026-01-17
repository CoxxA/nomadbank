# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

所有回复用中文
代码注释用中文

NomadBankKeeper - 数字游民银行保活助手。管理多个银行账户，根据配置的策略自动生成转账任务以保持账户活跃。

## Role

你是我的全栈技术合伙人。这是一个用于管理多个银行账户、自动生成转账任务以保持账户活跃（Keep-Alive）的 Dashboard 系统。

## Tech Stack

单二进制架构，类似 usememos/memos：

### 后端技术栈 (Go)
- **语言**: Go 1.22+
- **框架**: Echo v4
- **ORM**: GORM
- **数据库**: SQLite（单文件，零配置）
- **认证**: JWT (golang-jwt/jwt/v5)
- **密码**: bcrypt

### 前端技术栈 (frontend/)
- **框架**: React 19 + Vite 7 + TypeScript
- **路由**: TanStack Router (文件路由)
- **状态管理**: Zustand
- **数据获取**: TanStack Query
- **UI 组件**: shadcn/ui (new-york 风格)
- **样式**: Tailwind CSS 4

## 构建与运行命令

### Docker 部署（推荐）
```bash
docker run -d --name nomadbank -p 8080:8080 -v nomadbank_data:/data nomadbank:latest
```

### 本地开发

```bash
# 后端
make run

# 前端（另开终端）
cd frontend && npm run dev
```

### 完整构建
```bash
make all        # 构建前端 + 后端
make docker     # Docker 镜像
```

## 目录结构

```
nomadbank/
├── cmd/nomadbank/
│   └── main.go              # 程序入口
├── server/
│   ├── server.go            # Echo 服务器
│   ├── router.go            # 路由注册
│   └── middleware/
│       ├── jwt.go           # JWT 认证
│       └── cors.go          # CORS
├── api/v1/
│   ├── auth.go              # 认证 API
│   ├── bank.go              # 银行 API
│   ├── task.go              # 任务 API
│   ├── strategy.go          # 策略 API
│   ├── notification.go      # 通知 API
│   ├── tag.go               # 标签 API
│   └── stats.go             # 统计 API
├── store/
│   ├── store.go             # Store 接口
│   ├── db.go                # GORM 初始化
│   └── model/
│       ├── user.go
│       ├── bank.go
│       ├── task.go
│       ├── strategy.go
│       ├── notification.go
│       └── tag.go
├── internal/config/
│   └── config.go            # 配置管理
├── web/
│   ├── embed.go             # go:embed 前端
│   └── dist/                # 前端构建产物
├── frontend/                # React 前端源码
├── Dockerfile               # 多阶段构建
├── Makefile
└── go.mod
```

## API 路由

```
# 系统（无需登录）
/api/v1/system/initialized    GET    检查是否已初始化

# 认证
/api/v1/auth/register         POST   注册（首个用户自动成为管理员）
/api/v1/auth/login            POST   登录
/api/v1/auth/me               GET    当前用户
/api/v1/auth/password         PUT    修改密码
/api/v1/auth/profile          PUT    更新个人资料

# 用户管理（管理员）
/api/v1/users                 GET/POST
/api/v1/users/:id             PUT/DELETE
/api/v1/users/:id/password    PUT    重置密码

# 银行
/api/v1/banks                 GET/POST
/api/v1/banks/:id             GET/PUT/DELETE

# 策略
/api/v1/strategies            GET/POST
/api/v1/strategies/:id        GET/PUT/DELETE

# 任务
/api/v1/tasks                 GET/DELETE
/api/v1/tasks/generate        POST
/api/v1/tasks/:id/complete    PUT

# 通知
/api/v1/notifications         GET/POST
/api/v1/notifications/:id     PUT/DELETE
/api/v1/notifications/:id/test POST

# 标签
/api/v1/tags                  GET/POST
/api/v1/tags/:id              DELETE

# 统计
/api/v1/stats/dashboard       GET
```

## 关键模式

- **认证**: JWT (HS256)，前端用 Zustand，后端用 middleware.JWTMiddleware
- **路由守卫**: `_authenticated/route.tsx` 中 `beforeLoad` 检查 accessToken
- **数据获取**: TanStack Query hooks
- **API 客户端**: `lib/api.ts`
- **UI 组件**: shadcn/ui + Tailwind CSS，Toast 使用 Sonner

## 数据库表

- `users` - 用户表（username, password_hash, role, nickname, avatar）
- `banks` - 银行账户
- `transfer_tasks` - 转账任务
- `strategies` - 保活策略
- `notification_channels` - 通知渠道
- `tags` - 标签
- `bank_tags` - 银行-标签关联
- `webhooks` - Webhook 配置

## 环境变量

```bash
PORT=8080                    # 服务端口
DATA_DIR=./data              # 数据目录
MODE=dev                     # dev/prod
JWT_SECRET=your-secret       # JWT 密钥
JWT_EXPIRE_HOURS=168         # Token 有效期（小时）
```

## 代码规范

- **语言**: 中文界面和注释
- **架构**: Clean Architecture + DDD
- **命名**: 避免 utils/helpers，使用领域特定名称
- **代码质量**: 早期返回，避免深层嵌套，函数 <50 行，文件 <200 行
