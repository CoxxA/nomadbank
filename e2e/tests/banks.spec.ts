import { test, expect } from '@playwright/test';

test.describe('银行账户管理', () => {
  // 在测试前登录
  test.beforeEach(async ({ page }) => {
    // 检查是否需要注册
    const response = await page.request.get('/api/v1/system/initialized');
    const data = await response.json();

    if (!data.initialized) {
      // 注册首个用户
      await page.goto('/sign-up');
      await page.getByLabel('用户名').fill('banktest');
      await page.getByLabel('密码', { exact: true }).fill('password123');
      await page.getByLabel('确认密码').fill('password123');
      await page.getByRole('button', { name: '注册' }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });
    } else {
      // 登录
      await page.goto('/sign-in');
      await page.getByLabel('用户名').fill('banktest');
      await page.getByLabel('密码').fill('password123');
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });
    }
  });

  test('访问银行账户页面', async ({ page }) => {
    await page.goto('/accounts');

    // 验证页面标题
    await expect(page.getByRole('heading', { name: '账户' })).toBeVisible();

    // 验证有添加按钮
    await expect(page.getByRole('button', { name: /添加|新增/ })).toBeVisible();
  });

  test('创建新银行账户', async ({ page }) => {
    await page.goto('/accounts');

    // 点击添加按钮
    await page.getByRole('button', { name: /添加|新增/ }).click();

    // 等待对话框出现
    await expect(page.getByRole('dialog')).toBeVisible();

    // 填写表单
    const timestamp = Date.now();
    const bankName = `测试银行_${timestamp}`;
    await page.getByLabel('名称').fill(bankName);
    await page.getByLabel('最小金额').fill('10');
    await page.getByLabel('最大金额').fill('100');

    // 提交
    await page.getByRole('button', { name: /保存|确定|创建/ }).click();

    // 验证创建成功（对话框关闭，银行出现在列表中）
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(bankName)).toBeVisible();
  });

  test('编辑银行账户', async ({ page }) => {
    // 先创建一个银行
    const timestamp = Date.now();
    const bankName = `编辑测试_${timestamp}`;

    await page.goto('/accounts');
    await page.getByRole('button', { name: /添加|新增/ }).click();
    await page.getByLabel('名称').fill(bankName);
    await page.getByLabel('最小金额').fill('10');
    await page.getByLabel('最大金额').fill('100');
    await page.getByRole('button', { name: /保存|确定|创建/ }).click();
    await expect(page.getByText(bankName)).toBeVisible();

    // 点击行的更多操作菜单
    const row = page.getByRole('row').filter({ hasText: bankName });
    await row.getByRole('button', { name: /操作|更多/ }).click();

    // 点击编辑
    await page.getByRole('menuitem', { name: /编辑/ }).click();

    // 等待对话框出现
    await expect(page.getByRole('dialog')).toBeVisible();

    // 修改名称
    const newName = `已修改_${timestamp}`;
    await page.getByLabel('名称').clear();
    await page.getByLabel('名称').fill(newName);

    // 保存
    await page.getByRole('button', { name: /保存|确定/ }).click();

    // 验证修改成功
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(newName)).toBeVisible();
  });

  test('删除银行账户', async ({ page }) => {
    // 先创建一个银行
    const timestamp = Date.now();
    const bankName = `删除测试_${timestamp}`;

    await page.goto('/accounts');
    await page.getByRole('button', { name: /添加|新增/ }).click();
    await page.getByLabel('名称').fill(bankName);
    await page.getByLabel('最小金额').fill('10');
    await page.getByLabel('最大金额').fill('100');
    await page.getByRole('button', { name: /保存|确定|创建/ }).click();
    await expect(page.getByText(bankName)).toBeVisible();

    // 点击行的更多操作菜单
    const row = page.getByRole('row').filter({ hasText: bankName });
    await row.getByRole('button', { name: /操作|更多/ }).click();

    // 点击删除
    await page.getByRole('menuitem', { name: /删除/ }).click();

    // 确认删除
    await page.getByRole('button', { name: /确认|确定|删除/ }).click();

    // 验证删除成功
    await expect(page.getByText(bankName)).not.toBeVisible({ timeout: 5000 });
  });
});
