# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

**所有回复用中文，代码注释用中文**

NomadBankKeeper - 数字游民银行保活助手。管理多个银行账户，根据配置的策略自动生成转账任务以保持账户活跃。

## Role

你是我的全栈技术合伙人。这是一个用于管理多个银行账户、自动生成转账任务以保持账户活跃（Keep-Alive）的 Dashboard 系统。采用单二进制架构（类似 usememos/memos），前后端一体化部署。

---

## Tech Stack

### 后端技术栈 (Go)
- **语言**: Go 1.24.0
- **框架**: Echo v4.15.0（高性能 HTTP 框架）
- **ORM**: GORM v1.31.1
- **数据库**: SQLite（单文件，零配置）
- **认证**: JWT (golang-jwt/jwt/v5) - HS256 算法
- **密码**: bcrypt 加密
- **依赖**:
  - google/uuid - UUID 生成
  - labstack/echo - Web 框架
  - golang-jwt/jwt - JWT 支持
  - gorm.io/gorm + gorm.io/driver/sqlite - 数据持久化
  - golang.org/x/crypto - 加密库

### 前端技术栈 (frontend/)
- **框架**: React 19.2.3
- **构建工具**: Vite 7.3.0
- **语言**: TypeScript 5.9.3
- **路由**: TanStack Router 1.141.2（文件路由系统）
- **数据获取**: TanStack Query 5.90.12（服务器状态管理 + 缓存）
- **状态管理**: Zustand 5.0.9（客户端状态）
- **表单**: React Hook Form 7.68.0 + Zod 验证
- **UI 组件**: shadcn/ui (new-york 风格)
- **样式**: Tailwind CSS 4 + Vite 集成
- **HTTP 客户端**: 原生 Fetch API（自定义封装）
- **通知**: Sonner 2.0.7 (Toast)
- **图表**: Recharts 3.6.0
- **图标**: Lucide React 0.561.0
- **日期**: React Day Picker 9.12.0
- **表格**: TanStack Table 8.21.3

---

## 目录结构

```
nomadbank/
├── .claude/                      # Claude Code 配置和技能定义
├── api/v1/                       # REST API 处理器（2,103 行代码）
│   ├── auth.go                   # 认证 API（275 行）
│   ├── user.go                   # 用户管理 API（271 行）
│   ├── bank.go                   # 银行 API（253 行）
│   ├── task.go                   # 任务生成 API（421 行，核心业务逻辑）
│   ├── strategy.go               # 策略管理 API（230 行）
│   ├── notification.go           # 通知渠道 API（319 行）
│   └── stats.go                  # 统计数据 API（31 行）
├── server/                       # Echo HTTP 服务器
│   ├── server.go                 # 服务器实例（60 行）
│   ├── router.go                 # 路由配置（80 行）
│   └── middleware/
│       ├── jwt.go                # JWT 认证中间件
│       └── cors.go               # CORS 中间件
├── store/                        # 数据持久化层（522 行）
│   ├── store.go                  # 数据存储接口（404 行，所有 CRUD 操作）
│   ├── db.go                     # SQLite 初始化与自动迁移（118 行）
│   └── model/                    # GORM 数据模型
│       ├── user.go               # 用户模型（34 行）
│       ├── bank.go               # 银行账户模型（26 行）
│       ├── strategy.go           # 保活策略模型（36 行）
│       ├── task.go               # 转账任务模型（38 行）
│       ├── notification.go       # 通知渠道模型（52 行）
├── internal/config/              # 配置管理
│   └── config.go                 # 环境变量与配置加载
├── web/                          # 前端静态文件嵌入
│   ├── embed.go                  # go:embed 前端资源
│   └── dist/                     # 前端构建产物
├── frontend/                     # React 前端源码（121 个 TSX 文件）
│   ├── src/
│   │   ├── main.tsx              # React 应用入口
│   │   ├── routes/               # TanStack Router 文件路由系统
│   │   │   ├── __root.tsx        # 根路由，全局提供者
│   │   │   ├── (auth)/           # 认证路由组（不需要登录）
│   │   │   │   ├── sign-in.tsx   # 登录页
│   │   │   │   └── sign-up.tsx   # 注册页
│   │   │   ├── (errors)/         # 错误页路由组
│   │   │   │   ├── 401.tsx, 403.tsx, 404.tsx, 500.tsx, 503.tsx
│   │   │   └── _authenticated/   # 受保护路由组（需要有效 Token）
│   │   │       ├── route.tsx     # 路由守卫，检查认证
│   │   │       ├── index.tsx     # 仪表盘主页
│   │   │       ├── accounts/index.tsx     # 银行管理页
│   │   │       ├── tasks/index.tsx        # 任务管理页
│   │   │       ├── strategies/index.tsx   # 策略管理页
│   │   │       ├── notifications/index.tsx # 通知管理页
│   │   │       └── settings/              # 设置页面
│   │   │           ├── route.tsx          # 设置路由
│   │   │           ├── index.tsx          # 个人资料
│   │   │           ├── appearance.tsx     # 外观设置
│   │   │           └── members.tsx        # 成员管理（管理员）
│   │   ├── features/             # 功能模块（8 个特性）
│   │   │   ├── dashboard/        # 仪表盘组件（统计卡片、日历、任务预览）
│   │   │   ├── accounts/         # 银行管理页面（35KB，CRUD + 批量操作）
│   │   │   ├── tasks/            # 任务管理页面（35KB，生成向导 + 周期管理）
│   │   │   ├── strategies/       # 策略管理页面（17KB）
│   │   │   ├── notifications/    # 通知管理页面（27KB，支持 Bark/Telegram/Webhook）
│   │   │   ├── settings/         # 设置功能（个人资料、外观、成员管理）
│   │   │   ├── auth/             # 认证功能（登录、注册）
│   │   │   └── errors/           # 错误处理页面
│   │   ├── components/           # UI 组件库
│   │   │   ├── ui/               # shadcn/ui 组件（20+ 组件）
│   │   │   ├── data-table/       # 数据表格组件（分页、筛选、排序、批量操作）
│   │   │   └── layout/           # 布局组件（Sidebar、Header 等）
│   │   ├── lib/                  # 工具库
│   │   │   ├── api.ts            # API 客户端（535 行，原生 Fetch 封装）
│   │   │   ├── types.ts          # TypeScript 类型定义
│   │   │   ├── utils.ts          # 工具函数
│   │   │   ├── cookies.ts        # Cookie 操作
│   │   │   └── handle-server-error.ts # 错误处理
│   │   ├── hooks/                # 自定义 Hooks
│   │   │   ├── use-queries.ts    # TanStack Query Hooks（20+ 个）
│   │   │   └── use-table-url-state.ts # 表格状态管理
│   │   ├── stores/               # Zustand 状态管理
│   │   │   └── auth-store.ts     # 认证状态管理
│   │   ├── context/              # React Context
│   │   │   ├── theme-provider.tsx      # 主题切换
│   │   │   ├── font-provider.tsx       # 字体选择
│   │   │   └── direction-provider.tsx  # 文本方向
│   │   ├── config/               # 配置文件
│   │   ├── styles/               # 全局样式
│   │   └── assets/               # 资源文件
│   ├── package.json              # NPM 依赖配置
│   ├── tsconfig.json             # TypeScript 配置
│   ├── vite.config.ts            # Vite 构建配置
│   └── .env.example              # 环境变量示例
├── docs/                         # 项目文档
│   └── plans/                    # 计划文档
├── Dockerfile                    # 多阶段 Docker 构建
├── Makefile                      # 构建脚本（12 个目标）
├── go.mod                        # Go 模块文件
├── go.sum                        # Go 依赖锁定
├── .air.toml                     # Air 热重载配置
├── .golangci.yml                 # Go Lint 配置
├── .editorconfig                 # 编辑器配置
├── CLAUDE.md                     # 本文件
└── README.md                     # 项目说明文档
```

---

## API 路由（共 38 个端点）

### 系统与认证
```
GET  /api/v1/system/initialized    # 检查系统初始化状态

POST /api/v1/auth/register         # 用户注册（首个用户自动成为管理员）
POST /api/v1/auth/login            # 用户登录（返回 JWT Token）
GET  /api/v1/auth/me               # 当前用户信息
PUT  /api/v1/auth/password         # 修改密码
PUT  /api/v1/auth/profile          # 更新个人资料（昵称、头像）
```

### 用户管理（管理员权限）
```
GET    /api/v1/users               # 获取用户列表
POST   /api/v1/users               # 创建用户
PUT    /api/v1/users/:id           # 更新用户
DELETE /api/v1/users/:id           # 删除用户
PUT    /api/v1/users/:id/password  # 重置用户密码
```

### 银行账户
```
GET    /api/v1/banks               # 获取银行列表（含下一个任务信息）
POST   /api/v1/banks               # 创建银行
GET    /api/v1/banks/:id           # 获取银行详情
PUT    /api/v1/banks/:id           # 更新银行
DELETE /api/v1/banks/:id           # 删除银行
```

### 保活策略
```
GET    /api/v1/strategies          # 获取策略列表（含系统预设策略）
POST   /api/v1/strategies          # 创建策略
GET    /api/v1/strategies/:id      # 获取策略详情
PUT    /api/v1/strategies/:id      # 更新策略
DELETE /api/v1/strategies/:id      # 删除策略
```

### 转账任务
```
GET    /api/v1/tasks               # 获取任务列表（支持过滤）
POST   /api/v1/tasks/generate      # 生成任务（核心业务逻辑）
PUT    /api/v1/tasks/:id/complete  # 标记任务完成
DELETE /api/v1/tasks               # 删除所有任务（需确认）
```

### 通知渠道
```
GET    /api/v1/notifications       # 获取通知渠道列表
POST   /api/v1/notifications       # 创建通知渠道
PUT    /api/v1/notifications/:id   # 更新通知渠道
DELETE /api/v1/notifications/:id   # 删除通知渠道
POST   /api/v1/notifications/:id/test # 测试通知渠道
```

### 统计数据
```
GET    /api/v1/stats/dashboard     # 获取仪表盘统计数据
```

---

## 数据库表（7 个表）

### users - 用户表
- `id` (主键, UUID)
- `username` (唯一, 用户名)
- `password_hash` (bcrypt 加密)
- `role` (admin/user)
- `nickname` (昵称)
- `avatar` (头像 URL)
- `created_at`, `updated_at`

### banks - 银行账户
- `id` (主键, UUID)
- `user_id` (外键, 关联用户)
- `name` (银行名称)
- `amount_min`, `amount_max` (转账金额范围)
- `strategy_id` (外键, 关联策略)
- `group_name` (分组名称，可选)
- `is_active` (是否活跃)
- `created_at`, `updated_at`

### strategies - 保活策略
- `id` (主键, UUID)
- `user_id` (外键, 关联用户)
- `name` (策略名称)
- `interval_min`, `interval_max` (间隔天数范围)
- `time_start`, `time_end` (执行时间段，HH:MM 格式)
- `skip_weekend` (是否跳过周末)
- `amount_min`, `amount_max` (金额范围)
- `daily_limit` (单日任务上限)
- `is_system` (是否系统预设策略，不可删除)
- `created_at`, `updated_at`

### transfer_tasks - 转账任务
- `id` (主键, UUID)
- `user_id` (外键, 关联用户)
- `group_name` (分组名称)
- `cycle` (周期编号)
- `anchor_date` (锚点日期，YYYY-MM-DD)
- `exec_date` (执行日期，YYYY-MM-DD)
- `from_bank_id` (转出银行)
- `to_bank_id` (转入银行)
- `amount` (转账金额)
- `status` (pending/completed/skipped)
- `completed_at` (完成时间)
- `created_at`, `updated_at`

### notification_channels - 通知渠道
- `id` (主键, UUID)
- `user_id` (外键, 关联用户)
- `name` (渠道名称)
- `type` (bark/telegram/webhook)
- `config` (JSON 配置，包含 API Key、URL 等)
- `is_enabled` (是否启用)
- `created_at`, `updated_at`

---

## 关键模式与架构

### 1. 认证流程
- **JWT (HS256)**: 用户登录后获得 JWT Token
- **前端存储**: Token 存储在 Cookie 中（通过 `lib/cookies.ts`）
- **状态管理**: 用户状态由 Zustand (`stores/auth-store.ts`) 管理
- **路由守卫**: `_authenticated/route.tsx` 中的 `beforeLoad` 检查 accessToken
- **API 请求**: `lib/api.ts` 自动从 Cookie 读取 Token 并附加到 Authorization 头
- **后端验证**: `middleware.JWTMiddleware` 验证每个受保护的请求

### 2. 数据获取模式
- **服务器状态**: TanStack Query 管理所有服务器数据
- **缓存策略**: 查询结果自动缓存，减少重复请求
- **自动重新获取**: 窗口聚焦时自动刷新数据
- **乐观更新**: 部分操作（如完成任务）使用乐观更新
- **Hooks**: 在 `hooks/use-queries.ts` 中定义所有数据查询 Hooks

### 3. 文件路由系统
- **约定式路由**: TanStack Router 根据 `routes/` 目录结构自动生成路由
- **路由组**: 使用 `()` 包裹的目录（如 `(auth)/`）不影响 URL 路径
- **受保护路由**: `_authenticated/` 目录下的所有路由需要认证
- **错误边界**: 每个路由可以定义自己的错误处理

### 4. UI 组件架构
- **shadcn/ui**: 基于 Radix UI 的无样式组件 + Tailwind CSS
- **样式风格**: new-york 风格（圆角、阴影）
- **组件库位置**: `components/ui/`（20+ 个可复用组件）
- **数据表格**: 自定义 `components/data-table/` 包含分页、筛选、排序、批量操作
- **Toast 通知**: 使用 Sonner 库，全局配置在 `__root.tsx`

### 5. 任务生成算法（核心业务）
- **位置**: `api/v1/task.go` (421 行)
- **特点**:
  - 支持按分组或全部银行生成
  - 智能随机选择转出/转入银行（非闭环）
  - 尊重策略约束（时间段、周末、金额、单日上限）
  - 周期管理（每个周期独立编号）
  - 锚点日期（每个周期的起始日期）

### 6. 单二进制部署
- **go:embed**: 前端静态资源嵌入到 Go 二进制文件中
- **零依赖**: 除了 SQLite，无需外部服务
- **数据目录**: 所有数据存储在 `DATA_DIR` 指定的目录（默认 `./data`）
- **自动迁移**: 首次启动时自动创建数据库表

---

## 环境变量

| 变量 | 说明 | 默认值 | 备注 |
|------|------|--------|------|
| `PORT` | 服务端口 | 8080 | |
| `DATA_DIR` | 数据目录 | ./data | 存放 SQLite 数据库 |
| `MODE` | 运行模式 | dev | dev/prod（影响日志级别、CORS） |
| `JWT_SECRET` | JWT 签名密钥 | nomadbank-secret-change-in-production | **生产环境必须修改** |
| `JWT_EXPIRE_HOURS` | Token 有效期（小时） | 168 (7 天) | |
| `VITE_API_URL` | 前端 API 基础 URL | 空（使用同源） | 开发时可配置代理 |

---

## 构建与运行命令

### 本地开发

```bash
# 后端（端口 8080）
make run

# 或使用热重载（需要先安装 air）
make dev

# 前端（另开终端，端口 5173）
cd frontend && npm run dev
```

### 完整构建

```bash
# 构建前端 + 后端（单二进制文件）
make all

# 仅构建后端
make build

# 仅构建前端
make frontend

# 清理构建产物
make clean
```

### Docker 部署（推荐）

```bash
# 构建 Docker 镜像
make docker

# 运行容器
make docker-run

# 或手动运行
docker run -d \
  --name nomadbank \
  -p 8080:8080 \
  -v nomadbank_data:/data \
  -e JWT_SECRET=your-strong-secret \
  -e MODE=prod \
  nomadbank:latest
```

### 其他命令

```bash
make deps      # 下载 Go 依赖
make test      # 运行测试
```

---

## 已实现的功能模块

### ✅ 完整实现

1. **认证与授权**
   - 用户注册（首个用户自动为管理员）
   - 用户登录（JWT）
   - 基于角色的访问控制（admin/user）
   - 密码修改

2. **多用户支持**
   - 用户创建/更新/删除（管理员）
   - 密码重置（管理员）
   - 个人资料编辑（昵称、头像）

3. **银行账户管理**
   - 创建/编辑/删除银行
   - 银行分组管理
   - 批量操作
   - 金额范围配置

4. **保活策略配置**
   - 自定义策略创建
   - 时间段配置（避免周末、执行时间）
   - 金额范围配置
   - 间隔天数配置
   - 单日任务上限
   - 系统预设策略（默认保活、长期保活）

5. **智能任务生成**
   - 根据策略自动生成非闭环转账任务
   - 周期管理
   - 执行日期规划
   - 分组任务生成
   - 智能随机选择转出/转入银行

6. **任务管理**
   - 任务列表展示
   - 按状态过滤（待执行、已完成、已跳过）
   - 任务完成标记
   - 批量删除
   - 下一天任务预览
   - 日历视图

7. **通知系统**
   - 通知渠道配置（Bark、Telegram、Webhook）
   - 通知测试
   - 启用/禁用管理

8. **数据统计**
   - 仪表盘统计（总数据、活跃数据、完成情况）
   - 最近活动记录
   - 日历视图（任务分布）
   - 统计卡片

9. **UI/UX**
   - 响应式设计（shadcn/ui）
   - 主题切换（深色/浅色）
   - 字体选择
   - 数据表格（搜索、排序、过滤）
   - 日历组件
   - 实时 Toast 通知
   - 错误页面（401、403、404、500、503）

### ❌ 未实现或部分实现

1. **高级通知功能**
   - 定时任务提醒
   - 邮件通知
   - 推送消息通知

2. **Webhook 功能**
   - Webhook 配置管理
   - Webhook 日志记录
   - Webhook 事件触发

3. **数据导入导出**
   - CSV/Excel 导入
   - JSON 导出
   - 批量导入银行

4. **实时同步**
   - WebSocket 实时推送
   - 多窗口实时更新

5. **高级分析**
   - 财务报表
   - 行为分析
   - 预测模型

6. **移动应用**
   - Native App
   - PWA 支持

7. **单元测试**
   - 后端单元测试
   - 前端单元测试
   - E2E 测试

---

## 代码规范

### 通用规范
- **语言**: 中文界面和注释
- **架构**: Clean Architecture + DDD
- **命名**: 避免 utils/helpers，使用领域特定名称
- **代码质量**: 早期返回，避免深层嵌套，函数 <50 行，文件 <200 行

### 后端规范 (Go)
- **包命名**: 小写，简短，不使用下划线
- **错误处理**: 必须处理所有错误，不忽略
- **数据库**: 使用 GORM，避免原生 SQL
- **API 响应**: 统一使用 `c.JSON(code, data)` 返回
- **日志**: 使用 Echo 内置 Logger

### 前端规范 (React/TypeScript)
- **组件**: 函数式组件 + Hooks
- **类型**: 所有函数和组件都要有类型定义
- **状态**: 服务器状态用 TanStack Query，客户端状态用 Zustand
- **样式**: 使用 Tailwind CSS，避免内联样式
- **文件命名**: kebab-case（如 `sign-in.tsx`）
- **组件导入**: 使用 `@/` 别名（如 `@/components/ui/button`）

---

## 开发工作流

### 添加新功能

1. **后端**:
   - 在 `store/model/` 添加数据模型（如需要）
   - 在 `store/store.go` 添加数据访问方法
   - 在 `api/v1/` 添加 API 处理器
   - 在 `server/router.go` 注册路由

2. **前端**:
   - 在 `lib/api.ts` 添加 API 调用函数
   - 在 `hooks/use-queries.ts` 添加数据查询 Hook
   - 在 `features/` 创建功能模块
   - 在 `routes/` 添加路由页面
   - 在 `components/ui/` 添加可复用组件（如需要）

### 修改现有功能

1. **定位文件**: 使用 `Glob` 或 `Grep` 工具搜索相关代码
2. **阅读代码**: 理解现有实现逻辑
3. **修改代码**: 保持与现有代码风格一致
4. **测试**: 手动测试修改后的功能
5. **提交**: 使用清晰的 commit message

### 调试技巧

- **后端日志**: 在 `api/v1/` 中使用 `c.Logger().Debug()`
- **前端日志**: 在浏览器控制台查看 TanStack Query 的 DevTools
- **数据库**: SQLite 数据库文件在 `data/nomadbank.db`，可用 DB Browser 查看
- **网络请求**: 浏览器开发者工具的 Network 标签

---

## 关键文件速查表

| 功能 | 文件路径 | 说明 |
|------|---------|------|
| 程序入口 | 根目录的 `main.go` | Go 程序入口点 |
| API 路由注册 | `server/router.go` | 所有 API 端点在此注册 |
| 认证实现 | `api/v1/auth.go` | 登录、注册、修改密码 |
| 任务生成逻辑 | `api/v1/task.go` | 核心业务逻辑，421 行 |
| 数据存储接口 | `store/store.go` | 所有数据库 CRUD 操作 |
| 数据库初始化 | `store/db.go` | SQLite 初始化和自动迁移 |
| API 客户端 | `frontend/src/lib/api.ts` | 前端 API 调用，535 行 |
| 认证状态管理 | `frontend/src/stores/auth-store.ts` | Zustand 认证状态 |
| 数据查询 Hooks | `frontend/src/hooks/use-queries.ts` | TanStack Query Hooks |
| 路由守卫 | `frontend/src/routes/_authenticated/route.tsx` | 认证检查 |
| 仪表盘实现 | `frontend/src/features/dashboard/` | 仪表盘页面 |
| 账户管理 | `frontend/src/features/accounts/` | 银行管理页面 |
| 任务管理 | `frontend/src/features/tasks/` | 任务管理页面 |

---

## 常见问题

### 如何添加新的通知渠道类型？

1. 在 `store/model/notification.go` 中添加新类型常量
2. 在 `api/v1/notification.go` 中的 `TestNotificationChannel` 添加测试逻辑
3. 在前端 `features/notifications/` 中添加配置表单

### 如何修改任务生成算法？

- 编辑 `api/v1/task.go` 中的 `GenerateTasks` 函数
- 注意保持非闭环特性（转出 != 转入）
- 遵循策略约束（时间、金额、周期）

### 如何添加新的统计数据？

1. 在 `api/v1/stats.go` 中添加新的统计查询
2. 在 `frontend/src/lib/api.ts` 中添加 API 调用
3. 在 `frontend/src/features/dashboard/` 中添加展示组件

### 如何自定义主题颜色？

- 编辑 `frontend/src/styles/globals.css` 中的 CSS 变量
- shadcn/ui 使用 CSS 变量实现主题切换

---

## 部署建议

### 生产环境部署清单

- [ ] 修改 `JWT_SECRET` 为强密钥
- [ ] 设置 `MODE=prod`
- [ ] 配置持久化存储（Docker Volume 或主机目录）
- [ ] 配置反向代理（Nginx/Caddy）
- [ ] 启用 HTTPS
- [ ] 设置定期备份 SQLite 数据库
- [ ] 配置日志收集
- [ ] 设置资源限制（内存、CPU）

### 数据备份

```bash
# 备份 SQLite 数据库
cp data/nomadbank.db data/nomadbank.db.backup

# 或使用 SQLite 备份命令
sqlite3 data/nomadbank.db ".backup data/nomadbank.db.backup"
```

### 反向代理示例（Nginx）

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 项目成熟度

- **功能完整性**: ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ (8/10)
- **代码质量**: ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ (8/10)
- **部署就绪度**: ⭐⭐⭐⭐⭐⭐⭐⭐⭐☆ (9/10)
- **可维护性**: ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ (8/10)

**总体评价**: 项目处于**可上线使用状态**，适合 MVP 产品或个人使用。核心功能完整，代码质量高，部署简单。后续可根据需求逐步完善高级功能（Webhook、导入导出、实时同步、单元测试等）。

---

## 更新日志

- **2026-01-18**: 全面更新 CLAUDE.md，反映最新代码库状态
  - 补充详细的前端目录结构
  - 添加技术栈版本信息
  - 添加已实现与未实现功能清单
  - 添加开发工作流和关键文件速查表
  - 添加部署建议和常见问题
