# 银行管理与任务管理页面重构 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将银行管理页与任务管理页重构为“概览区 + 表格”结构，并应用轻量玻璃 + 亮色基底视觉风格，提升信息层级与操作效率。

**Architecture:** 在现有页面内引入可复用的页头与概览卡组件，抽取页面级统计计算为纯函数模块，页面仅负责布局与交互。新增轻量“玻璃卡片”样式与页面背景纹理，避免大范围重写全局组件。

**Tech Stack:** React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, TanStack Query/Router.

---

## 先决条件与基线
- 依赖安装：`frontend` 下已执行 `npm ci`。
- Lint 基线：`npm run lint` 有 21 条 warning（无 error），需要在实现完成后保持不增加。
- Go 工具链缺失：`go` 未安装，后端测试无法运行。

---

### Task 1: 新增轻量玻璃样式与页面级布局工具

**Files:**
- Modify: `frontend/src/styles/theme.css`
- Modify: `frontend/src/styles/index.css`

**Step 1: 写一个失败的样式断言（视觉占位）**
- 在计划阶段无法自动化样式断言，记录人工验收项：
  - 玻璃卡片在浅色背景下可见（边框可见、文本对比充足）。
  - 卡片阴影不显脏，背景无明显色带。

**Step 2: 最小化实现样式变量与工具类**
```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(148, 163, 184, 0.35);
  --glass-shadow: 0 18px 40px -32px rgba(15, 23, 42, 0.45);
}

@layer components {
  .glass-card {
    @apply border border-border/50 bg-white/80 shadow-[var(--glass-shadow)] backdrop-blur;
    border-color: var(--glass-border);
  }
}
```

**Step 3: 手动校验**
- 运行 `npm run dev`，在浏览器确认浅色背景与卡片对比。

**Step 4: 提交**
```bash
git add frontend/src/styles/theme.css frontend/src/styles/index.css
git commit -m "feat(ui): add light glass surface utilities"
```

---

### Task 2: 添加最小化前端测试框架（Vitest）

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/smoke.test.ts`

**Step 1: 写一个失败的测试**
```ts
// frontend/src/test/smoke.test.ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('basic arithmetic', () => {
    expect(1 + 1).toBe(3)
  })
})
```

**Step 2: 运行测试并确认失败**
Run: `npm run test`
Expected: FAIL（1 + 1 不等于 3）

**Step 3: 添加 Vitest 配置并修正测试**
```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  // ...existing config
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```
```ts
// setup.ts
import '@testing-library/jest-dom'
```
```ts
// smoke.test.ts
expect(1 + 1).toBe(2)
```

**Step 4: 运行测试确认通过**
Run: `npm run test`
Expected: PASS

**Step 5: 提交**
```bash
git add frontend/package.json frontend/vite.config.ts frontend/src/test/setup.ts frontend/src/test/smoke.test.ts
git commit -m "test(frontend): add vitest baseline"
```

---

### Task 3: 新增页面级通用组件（页头 + 概览卡）

**Files:**
- Create: `frontend/src/components/page/page-header.tsx`
- Create: `frontend/src/components/page/metric-card.tsx`
- Create: `frontend/src/components/page/__tests__/page-header.test.tsx`
- Create: `frontend/src/components/page/__tests__/metric-card.test.tsx`

**Step 1: 写失败测试（PageHeader）**
```ts
import { render, screen } from '@testing-library/react'
import { PageHeader } from '../page-header'

it('renders title and description', () => {
  render(<PageHeader title="银行管理" description="管理账户" />)
  expect(screen.getByText('银行管理')).toBeInTheDocument()
  expect(screen.getByText('管理账户')).toBeInTheDocument()
})
```

**Step 2: 运行测试确认失败**
Run: `npm run test`
Expected: FAIL（组件不存在）

**Step 3: 最小实现 PageHeader**
```tsx
export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
```

**Step 4: MetricCard 同理（测试→实现→测试）**
- 测试验证 label 与 value 渲染。
- 组件内部使用 `glass-card` 类与 `Card` 结构。

**Step 5: 运行测试确认通过**
Run: `npm run test`
Expected: PASS

**Step 6: 提交**
```bash
git add frontend/src/components/page
 git commit -m "feat(ui): add page header and metric card components"
```

---

### Task 4: 银行管理页统计计算抽取与测试

**Files:**
- Create: `frontend/src/features/accounts/summary.ts`
- Create: `frontend/src/features/accounts/__tests__/summary.test.ts`
- Modify: `frontend/src/features/accounts/index.tsx`

**Step 1: 写失败测试（统计计算）**
```ts
import { getAccountsSummary } from '../summary'

it('computes totals and active counts', () => {
  const result = getAccountsSummary([{ is_active: true }, { is_active: false }])
  expect(result.total).toBe(2)
  expect(result.active).toBe(1)
})
```

**Step 2: 运行测试确认失败**
Run: `npm run test`
Expected: FAIL（函数不存在）

**Step 3: 实现 summary 纯函数**
- 统计 total/active。
- 计算最近一次或下一次转账（选最早的 `next_exec_date`）。

**Step 4: 运行测试确认通过**
Run: `npm run test`
Expected: PASS

**Step 5: 提交**
```bash
git add frontend/src/features/accounts/summary.ts frontend/src/features/accounts/__tests__/summary.test.ts frontend/src/features/accounts/index.tsx
git commit -m "feat(accounts): add summary helpers"
```

---

### Task 5: 银行管理页布局与交互重构

**Files:**
- Modify: `frontend/src/features/accounts/index.tsx`

**Step 1: 写失败的 UI 测试占位（仅记录人工验收）**
- 概览区展示总数/启用数/下一次转账。
- 筛选栏保持一行布局（搜索/分组/状态）。
- 批量操作条在选择后出现。

**Step 2: 实现布局调整**
- 引入 `PageHeader`、`MetricCard`。
- 新增概览卡网格（3–4 张）。
- 调整“下次转账”列展示格式。
- 将批量操作集中到工具栏区域。

**Step 3: 手动验收**
- 10/100 条数据下布局稳定。
- 主按钮/次要按钮层级明确。

**Step 4: 提交**
```bash
git add frontend/src/features/accounts/index.tsx
git commit -m "refactor(accounts): redesign layout and overview section"
```

---

### Task 6: 任务管理页统计计算抽取与测试

**Files:**
- Create: `frontend/src/features/tasks/summary.ts`
- Create: `frontend/src/features/tasks/__tests__/summary.test.ts`
- Modify: `frontend/src/features/tasks/index.tsx`

**Step 1: 写失败测试（统计计算）**
```ts
import { getTasksSummary } from '../summary'

it('computes pending and completed counts', () => {
  const result = getTasksSummary([
    { status: 'pending' },
    { status: 'completed' },
  ])
  expect(result.pending).toBe(1)
  expect(result.completed).toBe(1)
})
```

**Step 2: 运行测试确认失败**
Run: `npm run test`
Expected: FAIL（函数不存在）

**Step 3: 实现 summary 纯函数**
- 统计 pending/completed/skipped。
- 计算最近完成日期（可选）。

**Step 4: 运行测试确认通过**
Run: `npm run test`
Expected: PASS

**Step 5: 提交**
```bash
git add frontend/src/features/tasks/summary.ts frontend/src/features/tasks/__tests__/summary.test.ts frontend/src/features/tasks/index.tsx
git commit -m "feat(tasks): add summary helpers"
```

---

### Task 7: 任务管理页布局与交互重构

**Files:**
- Modify: `frontend/src/features/tasks/index.tsx`

**Step 1: 写失败的 UI 测试占位（仅记录人工验收）**
- 概览区展示待处理/已完成/最近完成。
- 筛选栏统一在一行（状态/周期/分组/搜索）。
- 生成任务/导入/导出入口清晰。

**Step 2: 实现布局调整**
- 引入 `PageHeader`、`MetricCard`。
- 优化行操作按钮显示（hover 显示）。
- 批量操作条在选择后出现。

**Step 3: 手动验收**
- 过滤组合正确；分页与选择稳定。

**Step 4: 提交**
```bash
git add frontend/src/features/tasks/index.tsx
git commit -m "refactor(tasks): redesign layout and overview section"
```

---

### Task 8: 最终验证

**Step 1: 运行前端检查**
Run: `npm run lint`
Expected: 无新增 warning

**Step 2: 运行前端构建**
Run: `npm run build`
Expected: PASS

**Step 3: 手动验证**
- 银行页与任务页在 375/768/1024/1440px 下无横向滚动。
- 玻璃卡片在浅色背景下可见、对比度达标。

**Step 4: 提交**
```bash
git add frontend
 git commit -m "chore: verify bank/task redesign"
```
