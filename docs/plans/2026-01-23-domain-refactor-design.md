# 域驱动目录重构设计（方案 B）

## 背景
当前前后端代码按技术层与功能文件分散，领域相关逻辑跨目录跳转，阅读与维护成本高。目标是在不改变运行行为的前提下，重排目录结构并统一命名规范，提升可读性与协作效率。

## 目标
- 前端按领域聚合：bank/task/strategy/notification/auth/settings/dashboard/shared。
- 后端保持现有 Go 包结构不拆包，通过文件命名与分区提升领域可读性。
- 保持 API/路由/响应结构完全不变。
- 清理未使用代码，统一命名与目录结构规范。

## 非目标
- 不引入新的功能与行为变更。
- 不修改 API 路径与响应字段。
- 不进行 Go 包级拆分。

## 方案 B：前端域驱动 + 后端域分区但保包

### 前端目录结构目标
```
frontend/src/
  domains/
    bank/
      api.ts
      types.ts
      hooks.ts
      components/
      views/
    task/
      api.ts
      types.ts
      hooks.ts
      components/
      views/
    strategy/
    notification/
    auth/
    settings/
    dashboard/
    shared/
      components/
      hooks/
      types.ts
  components/
    ui/
  lib/
    api.ts        # 仅保留 request/通用封装
    utils.ts
    types.ts      # 仅保留通用类型（如 PagedResult）
```

迁移策略：保留 `routes/` 结构稳定，路由文件仅改为引用新的领域 `views` 组件，避免路由层大改。

### 后端文件分区目标（不拆包）
```
api/v1/
  bank_handlers.go
  bank_routes.go
  bank_responses.go
  task_handlers.go
  task_routes.go
  task_responses.go
store/
  bank_queries.go
  bank_filters.go
  task_queries.go
  task_filters.go
internal/tasks/
  task_generator.go
  task_scheduler.go
```
仅调整文件拆分/命名与职责归类，不改变包路径与导出接口。

## 命名规范
- 目录：`kebab-case`
- 文件：`kebab-case.tsx` / `kebab-case.ts`
- React 组件：`PascalCase`
- 领域内 API/类型/hooks：`api.ts` / `types.ts` / `hooks.ts`

## 迁移策略与验证
1. 以领域为批次迁移（优先 task/bank 影响最大者）。
2. 每一批次完成后执行：
   - `go test ./...`
   - `npm run build`（frontend）
3. 手工回归关键页面：银行、任务、策略、通知、设置、仪表盘。

## 风险与缓解
- **导入路径错误**：分批迁移 + 每批编译验证。
- **遗漏未使用代码**：全量 `rg` 扫描 + build/tsc 验证。
- **Go 文件拆分引发遗漏**：只做文件重排，不改导出签名。

## 验收标准
- 目录结构符合领域划分。
- 命名规范统一（目录/文件/组件）。
- 前后端构建与测试通过。
- 功能行为不变。
