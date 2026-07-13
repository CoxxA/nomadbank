# NomadBank

NomadBank 是一个面向个人自托管场景的银行账户保活任务助手。它根据你配置的账户和策略生成转账计划，帮助你记住何时在自己的账户之间进行小额转账。

> NomadBank 不连接银行、不读取余额，也不会自动执行真实转账。所有任务都需要你自行确认和完成。

## 特点

- 单实例、单所有者，首次启动完成初始化
- 管理银行账户和可选分组
- 配置间隔、执行时段、金额范围、周末和每日上限
- 每个周期为所有账户生成平衡的转入/转出计划
- 按批次查看、完成或删除任务
- React 前端嵌入 Go 二进制
- SQLite 本地存储，无需外部数据库或 Redis
- 提供 Docker 镜像和跨平台单文件程序

## 使用 Docker 快速开始

从源码构建并启动：

```bash
git clone https://github.com/CoxxA/nomadbank.git
cd nomadbank
docker compose up -d --build
```

打开 <http://localhost:8080>，创建所有者账户即可开始使用。数据保存在 Docker 卷 `nomadbank_data` 中。

使用正式发布版本时，把下面的版本变量改为 GitHub Releases 中实际存在的版本号；如果还没有可用的 v2 Release，请继续使用上面的源码构建方式：

```bash
VERSION=2.0.0 # 必须是已经发布的版本
docker run -d \
  --name nomadbank \
  -p 8080:8080 \
  -v nomadbank_data:/data \
  --restart unless-stopped \
  ghcr.io/coxxa/nomadbank:${VERSION}
```

生产部署、反向代理和二进制运行方式参见 [部署文档](docs/deployment.md)。

## 核心流程

1. 首次启动时创建唯一所有者。
2. 添加至少两个银行账户。
3. 使用默认策略或创建自定义策略。
4. 选择策略、账户分组和周期数生成任务批次。
5. 实际完成转账后，在任务页面标记完成。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8080` | HTTP 监听端口 |
| `DATA_DIR` | `./data` | 数据目录 |
| `SESSION_DAYS` | `30` | 会话有效天数，范围 1～365 |
| `TZ` | 系统时区 | 容器进程和日志时区；不决定任务排期 |

所有者在界面中配置的 IANA 时区用于任务排期。v2 数据库文件为 `nomadbank-v2.db`。

## 本地开发

要求：

- Go 1.26
- Node.js 24
- npm 10+
- GNU Make 和 POSIX shell（仅用于仓库提供的便捷命令）

```bash
# 终端一：后端
make run

# 终端二：前端
cd frontend
npm install
npm run dev
```

前端开发服务器会将 `/api` 和 `/health` 代理到 `localhost:8080`。

完整验证：

```bash
make verify
```

更多信息参见 [开发指南](docs/development.md) 和 [架构说明](docs/architecture.md)。

## 数据与升级

- 数据、会话和密码哈希都保存在 SQLite 数据库中。
- 备份时应保护整个数据目录，具体步骤见 [备份与恢复](docs/backup-restore.md)。
- v2 是破坏式重写，不读取旧版 `nomadbank.db`。详情见 [升级说明](docs/upgrading.md)。

## API

公开契约位于 [OpenAPI 规范](docs/api/openapi.yaml)。错误响应统一为：

```json
{
  "code": "error_code",
  "message": "面向用户的错误说明"
}
```

## 参与贡献

提交代码前请阅读 [贡献指南](CONTRIBUTING.md)。安全问题请按照 [安全策略](SECURITY.md) 私下报告。

仓库维护者应通过 PR 合并改动，并使用 GitHub Actions 发布正式版本；完整步骤见[维护与发布指南](docs/releasing.md)。

## License

[MIT](LICENSE)
