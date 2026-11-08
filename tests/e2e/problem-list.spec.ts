import { expect, test } from '@playwright/test';

// 해시 라우터라 IDE로 바로 들어가려면 '#/...' 형태를 써야 한다. baseURL이
// `.../mini-judge/#`로 끝나므로 '/problems/...'는 URL() 해석에서 base path를
// 벗어나 프리뷰 서버의 404로 떨어진다.
const IDE_001 = '#/problems/001-even-sum';

/** 목록의 행. 행 전체가 링크이고, 유도된 상태를 data-status로 드러낸다. */
const rows = (page: import('@playwright/test').Page) => page.locator('a[data-status]');

/** 목록의 스크롤 영역. 문서가 아니라 이쪽이 넘침을 떠안아야 한다. */
const scroller = (page: import('@playwright/test').Page) => page.locator('[class*="scroller"]').first();

test('/를 열면 문제 세 개가 행으로 보인다', async ({ page }) => {
  await page.goto('#/');

  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(0)).toContainText('짝수만 더하기');
  await expect(rows(page).nth(1)).toContainText('문자열 n번 이어붙이기');
  await expect(rows(page).nth(2)).toContainText('중복 제거 후 정렬');
  // 난이도와 태그도 행에서 읽혀야 고르는 데 쓸 수 있다.
  await expect(rows(page).nth(0)).toContainText('Lv.0');
  await expect(rows(page).nth(0)).toContainText('배열');
  await expect(rows(page).nth(2)).toContainText('Lv.1');
});

test('상단에 진척도 한 줄이 보인다', async ({ page }) => {
  await page.goto('#/');
  await expect(page.getByText('3문제 중 0개 통과')).toBeVisible();
});

test('행을 클릭하면 그 문제의 작업 화면으로 간다', async ({ page }) => {
  await page.goto('#/');
  await rows(page).first().click();

  await expect(page).toHaveURL(/#\/problems\/001-even-sum$/);
  await expect(page.getByRole('heading', { name: '짝수만 더하기' }).first()).toBeVisible();
});

test('위아래 화살표로 행을 옮기고 Enter로 문제를 연다', async ({ page }) => {
  await page.goto('#/');
  const list = rows(page);
  await list.first().focus();

  // 첫 행에는 "이전" 행이 없다 — preventDefault 없이 조용히 빠져나가고
  // (ProblemListPage.tsx:61-63) 포커스가 그대로 남아야 한다. 끝 행에서는
  // 목록이 평소처럼 스크롤되는 것이 의도된 동작이다.
  await page.keyboard.press('ArrowUp');
  await expect(list.nth(0)).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(list.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(list.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowDown');

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/problems\/002-string-repeat$/);
  await expect(page.getByRole('heading', { name: '문자열 n번 이어붙이기' }).first()).toBeVisible();
});

// 이 기능의 핵심 약속 — 내 풀이 상태가 목록에 보인다 — 을 한 줄로 꿰는
// 유일한 테스트다. 제출 기록 저장소(Task 1), 그 기록을 남기는 useRun(Task 3),
// 기록을 읽어 마크와 진척도를 그리는 목록(Task 4)이 모두 걸려 있다.
// `0개 통과`는 제출이 없으면 자동으로 참이라, 0이 아닌 쪽을 봐야 배선이 검증된다.
test('제출해서 통과하면 목록의 마크와 진척도가 바뀐다', async ({ page }) => {
  await page.goto(IDE_001);
  await page.getByRole('button', { name: '제출' }).click();
  await expect(page.getByText('6/6').first()).toBeVisible();

  await page.goto('#/');

  await expect(page.getByText('3문제 중 1개 통과')).toBeVisible();
  const passed = rows(page).filter({ has: page.locator('[data-mark="pass"]') });
  await expect(passed).toHaveCount(1);
  await expect(passed).toHaveAttribute('href', /001-even-sum$/);
});

test('목록이 길어지면 문서가 아니라 목록이 스크롤된다', async ({ page }) => {
  await page.goto('#/');
  await rows(page).first().waitFor();

  // 문제가 세 개뿐이라 자연히는 넘치지 않는다. 행을 복제해 실제로 넘침을 만든
  // 뒤 그것을 떠안는 당사자를 본다 — 넘칠 게 없어서 통과하는 경우와 구분하려고
  // scrollHeight > clientHeight를 먼저 단언한다.
  await page.evaluate(() => {
    const item = document.querySelector('a[data-status]')?.parentElement;
    const list = item?.parentElement;
    if (!item || !list) throw new Error('목록 행을 찾지 못했다');
    for (let i = 0; i < 60; i += 1) list.appendChild(item.cloneNode(true));
  });

  const m = await scroller(page).evaluate((el) => ({
    scroll: el.scrollHeight,
    client: el.clientHeight,
    overflowY: getComputedStyle(el).overflowY,
  }));
  expect(m.scroll).toBeGreaterThan(m.client);
  expect(m.overflowY).toBe('auto');

  const doc = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    client: document.documentElement.clientHeight,
  }));
  expect(doc.scroll).toBeLessThanOrEqual(doc.client + 1);
});
