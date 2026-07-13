import { expect, test } from '@playwright/test'

test('所有者可以完成核心保活流程', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/setup$/)

  await page.getByLabel('用户名', { exact: true }).fill('owner')
  await page.getByLabel('显示名称（可选）', { exact: true }).fill('测试用户')
  await page.getByLabel('密码', { exact: true }).fill('playwright-safe-password')
  await page.getByRole('button', { name: '创建并进入 NomadBank', exact: true }).click()
  await expect(page.getByRole('heading', { name: '今天的账户计划', exact: true })).toBeVisible()

  await page.getByRole('link', { name: '账户' }).click()
  for (const account of ['测试银行 A', '测试银行 B']) {
    await page.getByRole('button', { name: '新建账户', exact: true }).click()
    const accountDialog = page.getByRole('dialog', {
      name: '新建账户',
      exact: true,
    })
    await accountDialog.getByLabel('账户名称', { exact: true }).fill(account)
    await accountDialog.getByLabel('分组（可选）', { exact: true }).fill('测试分组')
    await accountDialog.getByRole('button', { name: '保存账户', exact: true }).click()
    await expect(page.getByText(account, { exact: true })).toBeVisible()
  }

  await page.getByRole('link', { name: '任务' }).click()
  await page.getByRole('button', { name: '生成任务', exact: true }).click()
  const generateDialog = page.getByRole('dialog', {
    name: '生成任务',
    exact: true,
  })
  await generateDialog.getByLabel('账户分组', { exact: true }).selectOption('测试分组')
  await generateDialog.getByLabel('生成周期', { exact: true }).fill('1')
  await generateDialog.getByRole('button', { name: '生成任务', exact: true }).click()

  const completeButton = page.getByRole('button', { name: '标记完成', exact: true }).first()
  await expect(completeButton).toBeVisible()
  await completeButton.click()
  await expect(page.getByText('任务已完成', { exact: true })).toBeVisible()
})
