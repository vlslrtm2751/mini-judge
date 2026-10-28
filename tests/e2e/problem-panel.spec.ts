import { expect, test } from '@playwright/test';

/** 스플리터를 왼쪽 끝까지 끌어 문제 패널을 minSize(25%)로 만든다. */
async function dragToMinimum(page: import('@playwright/test').Page) {
  const sep = page.locator('[class*="separatorV"]').first();
  const box = await sep.boundingBox();
  if (!box) throw new Error('separator has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(10, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
}

const scroller = (page: import('@playwright/test').Page) =>
  page.locator('[data-panel]').first().locator('section').first();

test('문제 패널을 최소 폭으로 줄여도 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/');
  await scroller(page).waitFor();
  await dragToMinimum(page);

  const overflow = await scroller(page).evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
  }));
  // 실제로 최소 폭까지 줄었는지 먼저 확인한다. 안 줄었으면 이 테스트는
  // 이름이 말하는 조건을 검사하지 않은 것이다.
  expect(overflow.client).toBeLessThan(900 * 0.35);
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
});

test('본문의 긴 인라인 코드가 문제 패널을 가로로 밀지 않는다', async ({ page }) => {
  await page.goto('/');
  await scroller(page).waitFor();

  // 현재 세 문제에는 이런 토큰이 없지만, 끊기지 않는 긴 식별자는 문제 설명에
  // 흔하다. Review Focus 1이 인라인 코드를 명시한다.
  await page.evaluate(() => {
    const md = document.querySelector('[class*="md"]');
    if (!md) throw new Error('markdown container not found');
    const p = document.createElement('p');
    const code = document.createElement('code');
    code.textContent = 'veryLongUnbrokenIdentifierThatCannotWrapAnywhereAtAllNoReallyItCannot';
    p.appendChild(code);
    md.appendChild(p);
  });

  const overflow = await scroller(page).evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
});

test('문제 제목이 한 번만 렌더된다', async ({ page }) => {
  await page.goto('/');
  // meta.json의 title과 problem.md의 선두 h1이 같은 제목이라 둘 다 그리면 겹친다.
  await expect(page.getByRole('heading', { name: '짝수만 더하기' })).toHaveCount(1);
});
