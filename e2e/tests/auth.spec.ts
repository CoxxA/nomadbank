import { test, expect } from '@playwright/test';

test.describe('用户认证', () => {
  test.describe('用户注册', () => {
    test('首个用户注册成为管理员', async ({ page }) => {
      // 访问注册页面
      await page.goto('/sign-up');

      // 填写注册表单
      const timestamp = Date.now();
      const username = `admin_${timestamp}`;
      await page.getByLabel('用户名').fill(username);
      await page.getByLabel('密码', { exact: true }).fill('password123');
      await page.getByLabel('确认密码').fill('password123');

      // 提交注册
      await page.getByRole('button', { name: '注册' }).click();

      // 等待跳转到首页
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // 验证登录成功（应该能看到仪表盘内容）
      await expect(page.getByText('仪表盘')).toBeVisible({ timeout: 5000 });
    });

    test('注册时用户名必填', async ({ page }) => {
      await page.goto('/sign-up');

      // 只填写密码
      await page.getByLabel('密码', { exact: true }).fill('password123');
      await page.getByLabel('确认密码').fill('password123');

      // 提交注册
      await page.getByRole('button', { name: '注册' }).click();

      // 应该显示错误
      await expect(page.getByText('用户名至少')).toBeVisible();
    });

    test('注册时密码太短显示错误', async ({ page }) => {
      await page.goto('/sign-up');

      await page.getByLabel('用户名').fill('testuser');
      await page.getByLabel('密码', { exact: true }).fill('12345');
      await page.getByLabel('确认密码').fill('12345');

      await page.getByRole('button', { name: '注册' }).click();

      // 应该显示密码错误
      await expect(page.getByText('密码至少')).toBeVisible();
    });

    test('注册时两次密码不一致显示错误', async ({ page }) => {
      await page.goto('/sign-up');

      await page.getByLabel('用户名').fill('testuser');
      await page.getByLabel('密码', { exact: true }).fill('password123');
      await page.getByLabel('确认密码').fill('differentpassword');

      await page.getByRole('button', { name: '注册' }).click();

      // 应该显示密码不匹配错误
      await expect(page.getByText('密码不一致')).toBeVisible();
    });
  });

  test.describe('用户登录', () => {
    // 在登录测试前先注册一个用户
    test.beforeEach(async ({ page }) => {
      // 检查是否需要注册
      const response = await page.request.get('/api/v1/system/initialized');
      const data = await response.json();

      if (!data.initialized) {
        // 注册首个用户
        await page.goto('/sign-up');
        await page.getByLabel('用户名').fill('testadmin');
        await page.getByLabel('密码', { exact: true }).fill('password123');
        await page.getByLabel('确认密码').fill('password123');
        await page.getByRole('button', { name: '注册' }).click();
        await expect(page).toHaveURL('/', { timeout: 10000 });
        // 登出
        await page.evaluate(() => {
          document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        });
      }
    });

    test('使用正确凭据登录成功', async ({ page }) => {
      await page.goto('/sign-in');

      await page.getByLabel('用户名').fill('testadmin');
      await page.getByLabel('密码').fill('password123');

      await page.getByRole('button', { name: '登录' }).click();

      // 等待跳转到首页
      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('使用错误密码登录失败', async ({ page }) => {
      await page.goto('/sign-in');

      await page.getByLabel('用户名').fill('testadmin');
      await page.getByLabel('密码').fill('wrongpassword');

      await page.getByRole('button', { name: '登录' }).click();

      // 应该显示错误
      await expect(page.getByText('用户名或密码错误')).toBeVisible();
    });

    test('未登录访问受保护页面重定向到登录页', async ({ page }) => {
      // 清除 cookies
      await page.context().clearCookies();

      // 尝试访问受保护的页面
      await page.goto('/accounts');

      // 应该重定向到登录页
      await expect(page).toHaveURL(/sign-in/, { timeout: 5000 });
    });
  });
});
