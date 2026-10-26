import { expect, test } from '@playwright/test';

test('loads first problem and runs starter code', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '짝수만 더하기' }).first()).toBeVisible();
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('3/3').first()).toBeVisible();
});
