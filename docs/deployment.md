# 部署指南

## Docker Compose

```bash
cp .env.example .env
# 编辑 .env，把 NOMADBANK_VERSION 设置为已发布的版本号
docker compose pull
docker compose up -d
docker compose ps
```

默认访问地址是 <http://localhost:8080>。把 `NOMADBANK_VERSION` 设置为 GitHub Releases 中实际存在的版本号；如果还没有可用的 v2 Release，请使用源码构建。生产环境不要长期跟随 `latest`。

查看日志：

```bash
docker compose logs -f nomadbank
```

就绪检查：

```bash
curl --fail http://localhost:8080/health/ready
```

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
