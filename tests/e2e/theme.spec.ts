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
