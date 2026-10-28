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

test('보조 텍스트가 패널 위에서 WCAG AA 대비를 넘는다', async ({ page }) => {
  await page.goto('/');

  const ratio = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const hex = (name: string) => {
      const v = s.getPropertyValue(name).trim().replace('#', '');
      return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
    };
    const lum = (rgb: number[]) => {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const a = lum(hex('--ink-3'));
    const b = lum(hex('--sheet'));
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  });

  // 본문 텍스트 기준 4.5:1. --ink-3는 줄번호·소요 시간·힌트 등 읽어야 하는
  // 보조 텍스트에 쓰인다.
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test('Tab으로 순회하는 모든 인터랙티브 요소에 포커스 링이 보인다', async ({ page }) => {
  await page.goto('/');
  // 앱이 렌더되기 전에 Tab을 누르면 포커스할 대상이 없어 body에 머문다.
  await page.locator('select').waitFor();

  const probe = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return {
        label: `${el.tagName}:${(el.getAttribute('class') ?? '').replace(/_[a-z0-9]{5,}_\d+/gi, '').trim() || (el.textContent ?? '').trim().slice(0, 8)}`,
        // 에디터는 자체 커서로 포커스를 드러내고 테마가 outline을 끈다.
        inEditor: Boolean(el.closest('.cm-editor')),
        ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2,
      };
    });

  const visited: { label: string; ring: boolean }[] = [];
  for (let i = 0; i < 14; i += 1) {
    await page.keyboard.press('Tab');
    const info = await probe();
    if (!info) continue;
    if (info.inEditor) {
      // CodeMirror는 indentWithTab이 켜져 있어 Tab을 삼킨다. Escape로 빠져나온다.
      await page.keyboard.press('Escape');
      continue;
    }
    visited.push({ label: info.label, ring: info.ring });
  }

  const noRing = visited.filter((v) => !v.ring);
  expect(noRing, `포커스 링이 없는 요소: ${JSON.stringify(noRing)}`).toEqual([]);

  // 선택기·스플리터·탭·액션 버튼을 모두 지나왔는지 — 한 종류만 보고 끝내지 않는다.
  // 순회는 한 바퀴를 돌아 같은 요소를 다시 만날 수 있으므로 고유 개수로 센다.
  // 등장 횟수로 세면 같은 버튼을 두 번 만난 것만으로 임계값을 넘길 수 있다.
  const distinct = [...new Set(visited.map((v) => v.label))];
  expect(distinct.some((l) => l.startsWith('SELECT')), `선택기 미방문: ${distinct}`).toBe(true);
  expect(distinct.filter((l) => l.startsWith('DIV')).length, `스플리터 미방문: ${distinct}`).toBeGreaterThanOrEqual(2);
  expect(distinct.filter((l) => l.startsWith('BUTTON')).length, `버튼 부족: ${distinct}`).toBeGreaterThanOrEqual(5);
});

test('클래스 이름과 정규식 리터럴에도 색이 입혀진다', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').fill('const m = new Map(); const re = /[0-9]+/g; class Foo {}');

  // CM6는 스타일이 걸린 범위에만 span을 만든다. 색이 없는 토큰은 아예 span으로
  // 나오지 않으므로, 대비 테스트는 이런 누락을 원리적으로 볼 수 없다.
  const spans = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.cm-line span')).map((el) => el.textContent ?? ''),
  );

  expect(spans.some((t) => t.includes('Map')), `Map이 무채색: ${JSON.stringify(spans)}`).toBe(true);
  expect(spans.some((t) => t.includes('Foo')), `Foo가 무채색: ${JSON.stringify(spans)}`).toBe(true);
  expect(spans.some((t) => t.includes('[0-9]+')), `정규식이 무채색: ${JSON.stringify(spans)}`).toBe(true);
});

test('버튼 세 variant가 서로 다른 위계로 보이고 disabled가 드러난다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '제출' }).waitFor();

  const styles = await page.evaluate(() => {
    const byText = (t: string) =>
      Array.from(document.querySelectorAll('button')).find((b) => (b.textContent ?? '').trim() === t)!;
    const read = (el: HTMLElement) => {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.borderTopColor, s.color].join('|');
    };

    const submit = byText('제출');
    // disabled는 실행 중에만 나타나 붙잡기 어렵다. 복제본으로 규칙만 확인한다.
    const clone = submit.cloneNode(true) as HTMLButtonElement;
    clone.disabled = true;
    clone.style.cssText = 'position:absolute;left:-9999px';
    document.body.appendChild(clone);
    const disabled = { opacity: getComputedStyle(clone).opacity, cursor: getComputedStyle(clone).cursor };
    clone.remove();

    return {
      ghost: read(byText('초기화')),
      standard: read(byText('테스트 실행')),
      primary: read(submit),
      disabled,
    };
  });

  // 세 variant가 서로 구별돼야 위계가 성립한다.
  expect(new Set([styles.ghost, styles.standard, styles.primary]).size).toBe(3);

  // 토큰에서 온 값인지 — 스타일이 통째로 빠지면 브라우저 기본값이 나온다.
  expect(styles.primary).toContain('rgb(112, 150, 255)'); // --accent
  expect(styles.standard).toContain('rgb(21, 28, 37)'); // --sheet
  expect(styles.ghost).toContain('rgba(0, 0, 0, 0)'); // 투명

  expect(parseFloat(styles.disabled.opacity)).toBeLessThan(1);
  expect(styles.disabled.cursor).toBe('progress');
});
