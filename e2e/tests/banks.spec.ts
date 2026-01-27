import { test, expect } from '@playwright/test';

test.describe('银行账户 API', () => {
  test('未认证访问银行 API 返回 401', async ({ page }) => {
    await page.context().clearCookies();
    const response = await page.request.get('/api/v1/banks');
    expect(response.status()).toBe(401);
  });
});
