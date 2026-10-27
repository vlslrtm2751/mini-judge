import { expect, test } from '@playwright/test';

// colorScheme을 light로 고정해 둔다. 다크 전용이므로 OS 선호와 무관하게
// 같은 팔레트가 나와야 하고, 라이트 분기가 되살아나면 여기서 잡힌다.
test.use({ colorScheme: 'light' });

test('OS가 라이트를 선호해도 다크 팔레트로 렌더된다', async ({ page }) => {
  await page.goto('/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // --paper #0d1218
  expect(bg).toBe('rgb(13, 18, 24)');
});

test('디자인 토큰이 다크 값으로 정의돼 있다', async ({ page }) => {
  await page.goto('/');
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const read = (name: string) => s.getPropertyValue(name).trim();
    return { sheet: read('--sheet'), ink: read('--ink'), accent: read('--accent'), codeBg: read('--code-bg') };
  });
  expect(tokens).toEqual({ sheet: '#151c25', ink: '#e5eaf1', accent: '#7096ff', codeBg: '#121820' });
});

test('패널이 카드로 렌더된다', async ({ page }) => {
  await page.goto('/');
  // CSS Modules가 클래스 이름을 해시하므로 부분 일치로 찾는다. Panel의
  // className은 중첩된 div에 적용되므로 [data-panel] 자신이 아닐 수 있다.
  const card = page.locator('[class*="pane"]').first();
  await card.waitFor();

  const style = await card.evaluate((el) => {
    const s = getComputedStyle(el);
    return { radius: s.borderTopLeftRadius, bg: s.backgroundColor };
  });
  expect(style.radius).toBe('10px');
  expect(style.bg).toBe('rgb(21, 28, 37)'); // --sheet
});
