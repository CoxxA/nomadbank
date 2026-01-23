# 任务/银行分页与存储性能优化设计

日期: 2026-01-22

## 目标
- 将银行列表与任务列表改为服务端分页，减少全量加载。
- 通过索引与查询优化提升列表与关联数据性能。
- 前端分页/筛选改为后端驱动，响应结构统一。

## 范围
- API: `/api/v1/banks`、`/api/v1/tasks` 改为分页响应
- Store: 增加分页查询与计数方法
- DB: 针对常用过滤字段添加索引
- Frontend: hooks、api 客户端与页面分页逻辑调整

## 接口设计
统一分页响应结构：
```json
{
  "items": [],
  "total": 123,
  "page": 1,
  "page_size": 20
}
```

### /api/v1/banks
Query 参数：
- `page` (默认 1)
- `page_size` (默认 20，设置最大值)
- `status` (active/inactive/all)
- `group`
- `q` (名称模糊)

响应为 `BankWithNextTaskResponse` 的分页。

### /api/v1/tasks
Query 参数：
- `page` (默认 1)
- `page_size` (默认 20，设置最大值)
- `status`
- `cycle`
- `group`
- `q` (关键词)

响应为 `TaskResponse` 的分页。

## 后端实现要点
- Store 增加：
  - `ListBanksByUserIDPaged(userID, filters, page, pageSize)`
  - `CountBanksByUserID(userID, filters)`
  - `ListTasksByUserIDPaged(userID, filters, page, pageSize)`
  - `CountTasksByUserID(userID, filters)`
- 银行“下次任务”仅对当前页银行计算：
  - 获取当前页银行 ID
  - 查询 `pending` 任务中 `from_bank_id IN (?)` 且按 `exec_date ASC`
  - 每个银行只取最早一条
- 任务排序仍为 `exec_date ASC`，银行排序固定（如 `created_at ASC`）保证分页稳定。

## 索引优化
- `transfer_tasks`: `(user_id, status, exec_date)`、`(user_id, exec_date)`
- `banks`: `(user_id, is_active, group_name)`、`(user_id, name)`

## 前端改造
- `api.ts` 增加 `PagedResult<T>` 类型与分页参数
- `use-queries.ts` 的 `useTasks/useBanksWithNextTasks` 改为分页返回
- 页面使用服务端分页：筛选/搜索改变时重置 `page=1`

## 测试与验证
- 后端：分页参数默认值、非法参数返回 400、过滤生效
- 前端：筛选/分页/搜索一致性与性能提升

