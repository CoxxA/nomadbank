import { test, expect } from '@playwright/test';

test.describe('任务 API', () => {
  test('未认证访问任务 API 返回 401', async ({ page }) => {
    await page.context().clearCookies();
    const response = await page.request.get('/api/v1/tasks');
    expect(response.status()).toBe(401);
  });
});
