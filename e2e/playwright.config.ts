import { defineConfig, devices } from '@playwright/test';

/**
 * NomadBankKeeper E2E 测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // 每个测试的超时时间
  timeout: 30 * 1000,
  // 测试断言的超时时间
  expect: {
    timeout: 5000,
  },
  // 测试运行配置
  fullyParallel: true,
  // CI 中失败时不重试
  forbidOnly: !!process.env.CI,
  // CI 中失败测试重试次数
  retries: process.env.CI ? 2 : 0,
  // 并行工作进程数
  workers: process.env.CI ? 1 : undefined,
  // 测试报告
  reporter: process.env.CI ? 'github' : 'html',
  // 所有测试共享的配置
  use: {
    // 基础 URL
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    // 失败时截图
    screenshot: 'only-on-failure',
    // 失败时录制视频
    video: 'retain-on-failure',
    // 收集跟踪信息
    trace: 'on-first-retry',
    // 语言设置
    locale: 'zh-CN',
  },
  // 测试项目（浏览器）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Mobile viewport
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  // 本地开发时自动启动服务器
  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd .. && make run',
        url: 'http://localhost:8080/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
