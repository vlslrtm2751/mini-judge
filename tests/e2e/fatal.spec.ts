import { expect, test } from '@playwright/test';

test('문법 오류로 실행이 안 되면 그 설명이 화면에 보인다', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');
  await page.locator('.cm-content').fill('function solution(numbers) { return [1,2 }');

  await page.getByRole('button', { name: '테스트 실행' }).click();

  // 설명은 결과 탭의 FatalError가 보여준다. fatal일 때 터미널로 전환하면
  // 아무것도 찍히지 않은 빈 탭을 보여주면서 정작 원인은 숨긴다.
  await expect(page.getByText('문법 오류라 실행하지 못했습니다')).toBeVisible();
});

test('치명적 오류 뒤에도 결과 탭이 선택된 상태로 남는다', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');
  await page.locator('.cm-content').fill('const x = (');

  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText(/실행하지 못했습니다|찾지 못했습니다/)).toBeVisible();

  const pressed = await page.getByRole('button', { name: '결과' }).getAttribute('aria-pressed');
  expect(pressed).toBe('true');
});
