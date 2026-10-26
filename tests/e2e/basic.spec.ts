import { expect, test } from '@playwright/test';

test('loads first problem and runs starter code', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '짝수만 더하기' }).first()).toBeVisible();
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('3/3').first()).toBeVisible();
});

test('console output from the submission reaches the terminal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').fill('function solution(nums) { console.log("hello-terminal"); return 0; }');

  await page.getByRole('button', { name: '테스트 실행' }).click();
  await page.getByRole('button', { name: '터미널' }).click();

  await expect(page.getByText(/hello-terminal/).first()).toBeVisible();
});

test('switching problems clears the previous editor content and results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('3/3').first()).toBeVisible();

  await page.locator('.cm-content').fill('// marker-from-first-problem');
  await page.locator('select').selectOption({ index: 1 });

  await expect(page.locator('.cm-content')).not.toContainText('marker-from-first-problem');
  await expect(page.getByText('3/3')).toHaveCount(0);
});
