# Page Header Actions Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 统一四个管理页的 PageHeader actions 布局与按钮尺寸，消除切换抖动。

**Architecture:** 在 `PageHeader` 内统一 actions 容器布局，并在四个页面统一主按钮 `size="sm"` 与图标尺寸；不新增组件，不改变业务逻辑。

**Tech Stack:** React, TypeScript, shadcn/ui, Tailwind

---

### Task 1: 统一 PageHeader actions 容器布局

**Files:**
- Modify: `frontend/src/components/page/page-header.tsx`
- Test: none

**Step 1: Write the failing test**

No automated UI tests exist. Skip with explicit note.

**Step 2: Implement minimal change**

Set a stable actions layout to avoid visual shifts:

```tsx
{actions ? (
  <div className='flex flex-wrap items-center gap-2'>{actions}</div>
) : null}
```

(Ensure other layout classes are unchanged.)

**Step 3: Manual verification**

Open any two management pages and ensure header action alignment stays consistent.

**Step 4: Commit**

```bash
git add frontend/src/components/page/page-header.tsx
git commit -m "ui: stabilize page header actions layout"
```

---

### Task 2: 统一四个页面主按钮规格

**Files:**
- Modify: `frontend/src/features/accounts/index.tsx`
- Modify: `frontend/src/features/tasks/index.tsx`
- Modify: `frontend/src/features/strategies/index.tsx`
- Modify: `frontend/src/features/notifications/index.tsx`

**Step 1: Write the failing test**

No automated UI tests exist. Skip with explicit note.

**Step 2: Implement minimal change**

Update primary action buttons inside `PageHeader` to use:
- `size="sm"`
- icon size `h-4 w-4`
- keep existing order and handlers

**Step 3: Manual verification**

Switch among the four pages and confirm:
- Button heights align
- Icon sizes are consistent
- Header area does not jump

**Step 4: Commit**

```bash
git add frontend/src/features/accounts/index.tsx frontend/src/features/tasks/index.tsx frontend/src/features/strategies/index.tsx frontend/src/features/notifications/index.tsx
git commit -m "ui: align management header action buttons"
```

---

### Task 3: 验证与冒烟测试

**Files:**
- No code changes

**Step 1: Run tests**

Run: `go test ./...`
Expected: PASS

**Step 2: Commit**

No commit required.
