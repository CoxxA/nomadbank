import { test, expect } from '@playwright/test';

test.describe('用户认证', () => {
  test('健康检查端点正常', async ({ page }) => {
    const response = await page.request.get('/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('系统初始化 API 正常', async ({ page }) => {
    const response = await page.request.get('/api/v1/system/initialized');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(typeof data.initialized).toBe('boolean');
  });

  test('访问登录页面', async ({ page }) => {
    await page.goto('/sign-in');
    // 验证页面加载成功（有用户名输入框）
    await expect(page.getByLabel('用户名')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('密码')).toBeVisible();
  });

  test('访问注册页面', async ({ page }) => {
    await page.goto('/sign-up');
    // 验证页面加载成功
    await expect(page.getByLabel('用户名')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('密码')).toBeVisible();
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();
  });

  test('未登录访问受保护页面重定向', async ({ page }) => {
    // 清除 cookies
    await page.context().clearCookies();

    // 尝试访问受保护的页面
    await page.goto('/accounts');

    // 应该重定向到登录页
    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
  });
});
