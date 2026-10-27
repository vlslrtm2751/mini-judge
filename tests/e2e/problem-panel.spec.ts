import { expect, test } from '@playwright/test';

test('문제 패널을 최소 폭으로 줄여도 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/');
  const pane = page.locator('[data-panel]').first();
  await pane.waitFor();

  const overflow = await pane.evaluate((el) => {
    const scroller = el.querySelector('section') ?? el;
    return { scroll: scroller.scrollWidth, client: scroller.clientWidth };
  });
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
});

test('문제 제목이 한 번만 렌더된다', async ({ page }) => {
  await page.goto('/');
  // meta.json의 title과 problem.md의 선두 h1이 같은 제목이라 둘 다 그리면 겹친다.
  await expect(page.getByRole('heading', { name: '짝수만 더하기' })).toHaveCount(1);
});
