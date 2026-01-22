# 管理页头部操作区统一设计

日期: 2026-01-22

## 目标
- 统一银行管理、任务管理、策略管理、通知管理页面的头部操作区（actions）布局与按钮尺寸。
- 消除页面切换时头部按钮位置/高度的细微抖动。
- 保持业务逻辑与页面结构不变，最小化改动风险。

## 范围
- `frontend/src/components/page/page-header.tsx`：统一 actions 容器布局。
- `frontend/src/features/accounts/index.tsx`
- `frontend/src/features/tasks/index.tsx`
- `frontend/src/features/strategies/index.tsx`
- `frontend/src/features/notifications/index.tsx`

## 非目标
- 不抽取新的页面级组件（如 ManagementHeader/Toolbar）。
- 不调整筛选条、表格、分页、弹窗等结构。
- 不改变任何业务逻辑与 API 行为。

## 统一策略
1. **PageHeader actions 容器**
   - 固定 `flex` 布局、`gap-2`、`items-center`，允许 `flex-wrap`。
   - 保障在有/无 actions 时的高度一致性。

2. **按钮规格**
   - 主操作按钮统一 `size="sm"`，图标统一 `h-4 w-4`。
   - 文案与图标间距保持一致（如需要可使用 `gap-2`）。

3. **顺序与一致性**
   - 保持现有操作顺序，不改变行为，仅统一样式与尺寸。

## 成功标准
- 四个页面之间切换时，标题与按钮区的基线对齐一致。
- 按钮高度一致、图标大小一致、间距一致。
- 视觉抖动消失或显著降低。

## 测试/验证
- 手动目测四个页面切换对比。
- 不涉及自动化测试更新。
