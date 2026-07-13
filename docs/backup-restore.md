# 备份与恢复

NomadBank 的全部持久化数据位于 `DATA_DIR`。v2 默认数据库文件是 `nomadbank-v2.db`，SQLite WAL 模式还可能产生 `-wal` 和 `-shm` 文件。仓库提供的 Compose 配置把命名卷固定为 `nomadbank_data`，因此下面的备份命令不受项目目录名影响。

## 推荐备份

最稳妥的方式是在停止写入后备份整个数据目录。

Docker Compose：

```bash
docker compose stop nomadbank
docker run --rm \
  -v nomadbank_data:/data:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/nomadbank-backup.tar.gz -C /data .
docker compose start nomadbank
```

直接运行二进制时，停止进程后复制 `DATA_DIR` 即可。

## 恢复

1. 停止 NomadBank。
2. 把当前数据目录移到安全位置。
3. 将备份完整解压到原数据目录。
4. 确认目录所有者和权限正确。
5. 启动应用并访问 `/health/ready`。
6. 登录后检查账户、策略和任务数量。

不要只复制正在写入的主 `.db` 文件而忽略 WAL 文件。恢复前不要覆盖唯一的备份副本。
