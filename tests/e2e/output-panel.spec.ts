import { expect, test } from '@playwright/test';

const solution = (body: string) => `function solution(numbers) { ${body} }`;

test('다섯 상태의 칩이 서로 다른 색으로 렌더된다', async ({ page }) => {
  await page.goto('/');
  // 일부는 통과, 일부는 실패하도록
  await page.locator('.cm-content').fill(solution('return numbers[0] === 1 ? 12 : 0;'));
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('1/3').first()).toBeVisible();

  const colors = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-status]')).map((el) => ({
      status: el.getAttribute('data-status'),
      chip: getComputedStyle(el.querySelector('[class*="chip"]') as HTMLElement).color,
    })),
  );
  const pass = colors.find((c) => c.status === 'pass');
  const fail = colors.find((c) => c.status === 'fail');
  expect(pass).toBeTruthy();
  expect(fail).toBeTruthy();
  expect(pass!.chip).not.toBe(fail!.chip);
});

test('긴 터미널 한 줄이 패널을 밀어내지 않는다', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').fill(solution("console.log('x'.repeat(5000)); return 0;"));
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await page.getByRole('button', { name: '터미널' }).click();

  const doc = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(doc.scroll).toBeLessThanOrEqual(doc.client + 1);
});

test('제출 결과가 패널 안에서 스크롤된다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '제출' }).click();
  await expect(page.getByText(/\d+\/\d+/).first()).toBeVisible();

  const doc = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    client: document.documentElement.clientHeight,
  }));
  expect(doc.scroll).toBeLessThanOrEqual(doc.client + 1);
});
