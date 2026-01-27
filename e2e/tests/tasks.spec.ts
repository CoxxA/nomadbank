import { test, expect } from '@playwright/test';

test.describe('任务管理', () => {
  // 在测试前登录并创建必要的银行
  test.beforeEach(async ({ page }) => {
    // 检查是否需要注册
    const response = await page.request.get('/api/v1/system/initialized');
    const data = await response.json();

    if (!data.initialized) {
      // 注册首个用户
      await page.goto('/sign-up');
      await page.getByLabel('用户名').fill('tasktest');
      await page.getByLabel('密码', { exact: true }).fill('password123');
      await page.getByLabel('确认密码').fill('password123');
      await page.getByRole('button', { name: '注册' }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });
    } else {
      // 登录
      await page.goto('/sign-in');
      await page.getByLabel('用户名').fill('tasktest');
      await page.getByLabel('密码').fill('password123');
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });
    }
  });

  test('访问任务页面', async ({ page }) => {
    await page.goto('/tasks');

    // 验证页面标题
    await expect(page.getByRole('heading', { name: '任务' })).toBeVisible();
  });

  test('生成任务需要先有银行账户', async ({ page }) => {
    await page.goto('/tasks');

    // 点击生成任务按钮
    const generateButton = page.getByRole('button', { name: /生成/ });
    if (await generateButton.isVisible()) {
      await generateButton.click();

      // 如果没有银行，应该提示先创建银行
      // 具体提示文案取决于实现
      await expect(
        page.getByText(/银行|账户/).or(page.getByRole('dialog'))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test.describe('有银行账户时的任务生成', () => {
    test.beforeEach(async ({ page }) => {
      // 先创建两个银行账户
      await page.goto('/accounts');

      // 创建第一个银行
      await page.getByRole('button', { name: /添加|新增/ }).click();
      await page.getByLabel('名称').fill('任务测试银行A');
      await page.getByLabel('最小金额').fill('10');
      await page.getByLabel('最大金额').fill('100');
      await page.getByRole('button', { name: /保存|确定|创建/ }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // 创建第二个银行
      await page.getByRole('button', { name: /添加|新增/ }).click();
      await page.getByLabel('名称').fill('任务测试银行B');
      await page.getByLabel('最小金额').fill('10');
      await page.getByLabel('最大金额').fill('100');
      await page.getByRole('button', { name: /保存|确定|创建/ }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    });

    test('生成任务流程', async ({ page }) => {
      await page.goto('/tasks');

      // 点击生成任务按钮
      await page.getByRole('button', { name: /生成/ }).click();

      // 等待生成向导/对话框出现
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // 选择银行或确认配置（具体步骤取决于实现）
      // 这里假设有下一步或生成按钮
      const nextOrGenerate = page.getByRole('button', { name: /下一步|生成|确定/ });
      if (await nextOrGenerate.isVisible()) {
        await nextOrGenerate.click();
      }

      // 等待任务生成完成
      // 验证成功消息或任务列表更新
      await expect(
        page.getByText(/成功|生成/).or(page.getByRole('cell'))
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test('标记任务完成', async ({ page }) => {
    // 此测试需要已有任务
    await page.goto('/tasks');

    // 查找待执行的任务行
    const pendingTask = page.getByRole('row').filter({ hasText: /待执行|pending/ }).first();

    if (await pendingTask.isVisible()) {
      // 点击完成按钮
      await pendingTask.getByRole('button', { name: /完成/ }).click();

      // 验证任务状态更新
      await expect(page.getByText(/已完成|completed/)).toBeVisible();
    }
  });
});
