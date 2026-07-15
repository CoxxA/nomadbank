# 部署指南

## Docker Compose

```bash
cp .env.example .env
docker compose pull
docker compose up -d
docker compose ps
```

默认访问地址是 <http://localhost:8080>。`.env.example` 固定到经过验证的正式版本；部署前可以在 [GitHub Releases](https://github.com/CoxxA/nomadbank/releases) 确认该版本存在。Compose 不提供 `latest` 默认值，也不会从当前源码隐式构建镜像。

查看日志：

```bash
docker compose logs -f nomadbank
```

就绪检查：

```bash
curl --fail http://localhost:8080/health/ready
```

升级时先按[备份与恢复](backup-restore.md)停止写入并备份整个数据目录，再修改 `.env` 中的 `NOMADBANK_VERSION`：

```bash
docker compose pull
docker compose up -d
docker compose ps
```

## 配置

| 变量                | 默认值                                     | 适用方式        | 说明                                                       |
| ------------------- | ------------------------------------------ | --------------- | ---------------------------------------------------------- |
| `NOMADBANK_VERSION` | 无，必须设置                               | Docker Compose  | 已发布的精确版本号，例如 `2.0.0`                           |
| `NOMADBANK_PORT`    | `8080`                                     | Docker Compose  | 映射到宿主机的 HTTP 端口                                   |
| `PORT`              | `8080`                                     | 二进制/容器内部 | 应用监听端口                                               |
| `DATA_DIR`          | `./data`                                   | 二进制          | SQLite 数据目录；官方容器固定使用 `/data`                  |
| `SESSION_DAYS`      | `30`                                       | 全部            | 会话有效天数，范围 1～365                                  |
| `TZ`                | Compose：`Asia/Shanghai`；二进制：系统时区 | 全部            | 进程和日志时区；任务排期使用所有者在界面中设置的 IANA 时区 |

Compose 会从 `.env` 读取 `SESSION_DAYS` 和 `TZ` 并传入容器。不要把密码或银行凭据写入 `.env`。

## Docker Run

```bash
VERSION=2.0.0 # 必须是已经发布的版本
docker run -d \
  --name nomadbank \
  -p 8080:8080 \
  -e TZ=Asia/Shanghai \
  -v nomadbank_data:/data \
  --restart unless-stopped \
  ghcr.io/coxxa/nomadbank:${VERSION}
```

容器以非 root 用户运行。`/data` 必须可写，应用本身和根文件系统可以保持只读。

## 单文件程序

从 GitHub Release 下载与你的系统和架构对应的压缩包以及 `SHA256SUMS`。例如 Linux amd64：

```bash
VERSION=2.0.0
grep "nomadbank_${VERSION}_linux_amd64.tar.gz" SHA256SUMS | sha256sum --check
tar -xzf "nomadbank_${VERSION}_linux_amd64.tar.gz"
chmod +x nomadbank
DATA_DIR=/var/lib/nomadbank ./nomadbank
```

前端、时区数据库和 SQLite 驱动已经包含在程序中，不需要安装 Node.js、Go 或外部数据库。

## 反向代理

NomadBank 应通过同一个域名提供前端和 `/api`。代理必须保留：

- `Host`
- `X-Forwarded-For`
- `X-Forwarded-Proto`

HTTPS 代理需要传递 `X-Forwarded-Proto: https`，应用才会为会话 Cookie 设置 `Secure`。

## 文件权限

数据目录包含密码哈希、会话和账户任务，应视为敏感数据：

```bash
chmod 700 /var/lib/nomadbank
```

不要把数据目录放在公开 Web 目录或同步到公开仓库。
