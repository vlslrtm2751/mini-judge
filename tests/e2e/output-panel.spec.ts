import { expect, test } from '@playwright/test';

const solution = (body: string) => `function solution(numbers) { ${body} }`;

/** 출력 패널의 스크롤러. .page가 overflow:hidden이라 documentElement에 대한
 *  넘침 단언은 구조적으로 실패할 수 없다 — 넘침을 떠안는 당사자를 봐야 한다. */
const outBody = (page: import('@playwright/test').Page) =>
  page.locator('section:has(> [class*="bar"]) > [class*="body"]').first();

const outPane = (page: import('@playwright/test').Page) => page.locator('[data-panel]').last();

test('네 가지 채점 상태가 마크와 칩으로 서로 구분된다', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').fill(solution('return numbers[0] === 1 ? 12 : 0;'));
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('1/3').first()).toBeVisible();

  // 실제로 렌더된 케이스에서 해시된 클래스 이름을 얻어, 나머지 상태를 같은
  // 클래스로 재현한다. timeout/running/pending은 평소 화면에 남지 않는다.
  const sigs = await page.evaluate(async () => {
    const sample = document.querySelector('li[data-status]') as HTMLElement;
    const mark = sample.querySelector('span') as HTMLElement;
    const chip = sample.querySelector('[class*="chip"]') as HTMLElement;
    const host = document.createElement('ul');
    host.style.cssText = 'position:absolute;left:-9999px;top:0';
    document.body.appendChild(host);

    const make = (status: string) => {
      const li = document.createElement('li');
      li.className = sample.className;
      li.dataset.status = status;
      const m = document.createElement('span');
      m.className = mark.className;
      const c = document.createElement('span');
      c.className = chip.className;
      li.append(m, c);
      host.appendChild(li);
      return { mark: m, chip: c };
    };

    const read = ({ mark: m, chip: c }: { mark: HTMLElement; chip: HTMLElement }) => {
      const sig = (pseudo: string) => {
        const b = getComputedStyle(m, pseudo);
        return [b.content, b.backgroundColor, b.borderTopColor, b.borderTopLeftRadius, b.transform].join(',');
      };
      return [sig('::before'), sig('::after'), getComputedStyle(c).color].join('|');
    };

    const nodes: Record<string, { mark: HTMLElement; chip: HTMLElement }> = {};
    for (const s of ['pass', 'fail', 'error', 'timeout']) nodes[s] = make(s);

    // ink 키프레임이 도는 동안에는 transform이 애니메이션 중간값이라 서로
    // 다른 마크가 같게 측정된다. 끝날 때까지 기다린 뒤 읽는다.
    await new Promise((r) => setTimeout(r, 400));

    const out: Record<string, string> = {};
    for (const [s, n] of Object.entries(nodes)) out[s] = read(n);
    host.remove();
    return out;
  });

  const seen = new Map<string, string>();
  for (const [status, sig] of Object.entries(sigs)) {
    const clash = seen.get(sig);
    expect(clash, `${status}와 ${clash}의 마크·칩이 완전히 동일하다`).toBeUndefined();
    seen.set(sig, status);
  }
});

test('긴 터미널 한 줄을 터미널 스크롤러가 떠안는다', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').fill(solution("console.log('x'.repeat(5000)); return 0;"));
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await page.getByRole('button', { name: '터미널' }).click();

  const term = page.locator('[class*="terminal"]').first();
  await term.waitFor();

  const m = await term.evaluate((el) => ({
    termScroll: el.scrollWidth,
    termClient: el.clientWidth,
    overflowX: getComputedStyle(el).overflowX,
  }));
  // 스크롤러가 실제로 넘침을 떠안았는지 — 넘칠 게 없어서 통과하는 경우와 구분된다.
  expect(m.termScroll).toBeGreaterThan(m.termClient);
  expect(m.overflowX).toBe('auto');

  // 그리고 패널 자신은 밀려나지 않아야 한다.
  const pane = await outPane(page).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(pane.scroll).toBeLessThanOrEqual(pane.client + 1);
});

test('제출 결과를 출력 패널 안에서 스크롤해 마지막 케이스까지 볼 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '제출' }).click();
  await expect(page.getByText('6/6').first()).toBeVisible();

  const body = outBody(page);
  const m = await body.evaluate((el) => ({
    scroll: el.scrollHeight,
    client: el.clientHeight,
    overflowY: getComputedStyle(el).overflowY,
  }));
  expect(m.scroll).toBeGreaterThan(m.client);
  expect(m.overflowY).toBe('auto');

  // 스크롤해서 마지막 케이스에 실제로 닿는지 확인한다.
  const last = page.locator('li[data-status]').last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport({ ratio: 0.9 });
});
