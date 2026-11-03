import { expect, test } from '@playwright/test';

test('loads first problem and runs starter code', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');
  await expect(page.getByRole('heading', { name: '짝수만 더하기' }).first()).toBeVisible();
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('3/3').first()).toBeVisible();
});

test('console output from the submission reaches the terminal', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');
  await page.locator('.cm-content').fill('function solution(nums) { console.log("hello-terminal"); return 0; }');

  await page.getByRole('button', { name: '테스트 실행' }).click();
  await page.getByRole('button', { name: '터미널' }).click();

  await expect(page.getByText(/hello-terminal/).first()).toBeVisible();
});

test('switching problems clears the previous editor content and results', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('3/3').first()).toBeVisible();

  await page.locator('.cm-content').fill('// marker-from-first-problem');

  // 문제를 바꾸는 길은 이제 상단바의 select가 아니라 목록이다. 해시만 바꿔
  // 같은 문서 안에서 오간다 — 문서가 새로 로드되면 runStore가 처음부터 비어
  // 있어서 "이전 결과가 남지 않는다"는 단언이 저절로 참이 되고, 이 테스트는
  // 지키려던 것을 잃는다. 새로고침되면 사라지는 표시를 달아 그 전제도 검사한다.
  await page.evaluate(() => document.documentElement.setAttribute('data-same-document', 'yes'));
  await page.goto('#/');
  await page.locator('a[data-status]').nth(1).click();
  await expect(page.getByRole('heading', { name: '문자열 n번 이어붙이기' }).first()).toBeVisible();
  await expect(page.locator('html[data-same-document="yes"]')).toHaveCount(1);

  await expect(page.locator('.cm-content')).not.toContainText('marker-from-first-problem');
  await expect(page.getByText('3/3')).toHaveCount(0);
});
