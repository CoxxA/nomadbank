# NomadBankKeeper

数字游民银行保活助手 - 管理多个银行账户，根据配置的策略自动生成转账任务以保持账户活跃。

## 功能特性

- **多用户支持** - 首个注册用户自动成为管理员，管理员可管理其他用户
- **银行账户管理** - 添加、编辑、分组管理多个银行账户
- **保活策略配置** - 自定义转账间隔、金额范围等策略
- **智能任务生成** - 根据策略自动生成非闭环转账任务
- **任务日历视图** - 可视化查看和管理待办任务
- **通知推送** - 支持 Bark、Telegram、Webhook 推送任务提醒
- **数据统计** - 仪表盘展示完成情况

## 快速开始

### 使用 Docker（推荐）

```bash
docker run -d \
  --name nomadbank \
  -p 8080:8080 \
  -v nomadbank_data:/data \
  -e JWT_SECRET=your-secret-change-in-production \
  ghcr.io/coxxa/nomadbank:latest
```

访问 http://localhost:8080 即可使用。

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/CoxxA/nomadbank.git
cd nomadbank

# 构建（需要 Go 1.22+ 和 Node.js 20+）
make all

# 运行
./bin/nomadbank
```

### 开发模式

```bash
# 后端（需要 Go）
make run

# 前端（另开终端）
cd frontend && npm run dev
```

## 技术栈

- **后端**: Go 1.22 + Echo + GORM + SQLite
- **前端**: React 19 + Vite + TypeScript + shadcn/ui
- **部署**: 单二进制，前端嵌入

## 项目结构

```
nomadbank/
├── cmd/nomadbank/       # 程序入口
├── server/              # Echo 服务器和中间件
├── api/v1/              # REST API 处理器
├── store/               # 数据存储层
│   └── model/           # GORM 数据模型
├── internal/config/     # 配置管理
├── web/                 # 前端嵌入 (go:embed)
├── frontend/            # React 前端源码
├── Dockerfile           # 多阶段构建
└── Makefile             # 构建脚本
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 8080 |
| `DATA_DIR` | 数据目录 | ./data |
| `MODE` | 运行模式 (dev/prod) | dev |
| `JWT_SECRET` | JWT 签名密钥 | - |
| `JWT_EXPIRE_HOURS` | Token 过期时间(小时) | 168 |

## API 路由

```
# 系统
GET    /api/v1/system/initialized  # 检查是否已初始化

# 认证
POST   /api/v1/auth/register       # 注册（首个用户自动成为管理员）
POST   /api/v1/auth/login          # 登录
GET    /api/v1/auth/me             # 当前用户信息
PUT    /api/v1/auth/password       # 修改密码
PUT    /api/v1/auth/profile        # 更新个人资料

# 用户管理（管理员）
GET    /api/v1/users               # 用户列表
POST   /api/v1/users               # 创建用户
PUT    /api/v1/users/:id           # 更新用户
DELETE /api/v1/users/:id           # 删除用户
PUT    /api/v1/users/:id/password  # 重置用户密码

# 银行账户
GET    /api/v1/banks               # 银行列表
POST   /api/v1/banks               # 创建银行
GET    /api/v1/banks/:id           # 银行详情
PUT    /api/v1/banks/:id           # 更新银行
DELETE /api/v1/banks/:id           # 删除银行

# 保活策略
GET    /api/v1/strategies          # 策略列表
POST   /api/v1/strategies          # 创建策略
GET    /api/v1/strategies/:id      # 策略详情
PUT    /api/v1/strategies/:id      # 更新策略
DELETE /api/v1/strategies/:id      # 删除策略

# 转账任务
GET    /api/v1/tasks               # 任务列表
POST   /api/v1/tasks/generate      # 生成任务
PUT    /api/v1/tasks/:id/complete  # 完成任务
DELETE /api/v1/tasks               # 删除所有任务

# 通知渠道
GET    /api/v1/notifications       # 渠道列表
POST   /api/v1/notifications       # 创建渠道
PUT    /api/v1/notifications/:id   # 更新渠道
DELETE /api/v1/notifications/:id   # 删除渠道
POST   /api/v1/notifications/:id/test # 测试渠道

# 标签
GET    /api/v1/tags                # 标签列表
POST   /api/v1/tags                # 创建标签
DELETE /api/v1/tags/:id            # 删除标签

# 统计
GET    /api/v1/stats/dashboard     # 仪表盘统计
```

## License

MIT License
