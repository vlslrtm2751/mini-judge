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

test('에디터의 모든 구문 토큰이 배경과 구분된다', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').waitFor();

  const result = await page.evaluate(() => {
    const channels = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    // 배경이 투명하면 실제로 칠해지는 조상까지 올라가야 한다. 투명을 그대로
    // 읽으면 rgba(0,0,0,0)이 검정으로 파싱돼 어떤 색이든 멀어 보인다.
    const paintedBg = (start: Element): number[] => {
      let node: Element | null = start;
      while (node) {
        const ch = channels(getComputedStyle(node).backgroundColor);
        if (ch.length >= 3 && (ch.length < 4 || ch[3] > 0)) return ch.slice(0, 3);
        node = node.parentElement;
      }
      return [0, 0, 0];
    };

    const editor = document.querySelector('.cm-editor') as HTMLElement;
    const bg = paintedBg(editor);
    const spans = Array.from(document.querySelectorAll('.cm-line span'));
    const tokens = spans.map((el) => {
      const fg = channels(getComputedStyle(el as HTMLElement).color).slice(0, 3);
      const dist = Math.abs(fg[0] - bg[0]) + Math.abs(fg[1] - bg[1]) + Math.abs(fg[2] - bg[2]);
      return { text: (el.textContent ?? '').slice(0, 12), dist };
    });
    return { bg, tokens };
  });

  // 에디터 표면은 코드 배경(--code-bg #121820)이어야 한다.
  expect(result.bg).toEqual([18, 24, 32]);

  expect(result.tokens.length).toBeGreaterThan(0);
  const tooClose = result.tokens.filter((t) => t.dist < 120);
  expect(tooClose, `배경에 묻히는 토큰: ${JSON.stringify(tooClose)}`).toEqual([]);
});

test('Tab으로 이동하면 포커스 링이 보인다', async ({ page }) => {
  await page.goto('/');
  // 앱이 렌더되기 전에 Tab을 누르면 포커스할 대상이 없어 body에 머문다.
  await page.locator('select').waitFor();
  await page.keyboard.press('Tab');

  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, style: s.outlineStyle, tag: el.tagName };
  });

  expect(outline).not.toBeNull();
  expect(outline!.style).not.toBe('none');
  expect(parseFloat(outline!.width)).toBeGreaterThanOrEqual(2);
});
