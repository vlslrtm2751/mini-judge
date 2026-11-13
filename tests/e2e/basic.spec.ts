import { expect, test } from '@playwright/test';

test('loads first problem and runs starter code', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');
  await expect(page.getByRole('heading', { name: '짝수만 더하기' }).first()).toBeVisible();
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('3/3').first()).toBeVisible();
});

test('console output from the submission reaches the terminal', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');
  await page.locator('.cm-content').fill('function solution(nums) { console.log("hello-terminal"); return 0; }');

  await page.getByRole('button', { name: '테스트 실행' }).click();
  await page.getByRole('button', { name: '터미널' }).click();

  await expect(page.getByText(/hello-terminal/).first()).toBeVisible();
});

test('switching problems clears the previous editor content and results', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('3/3').first()).toBeVisible();

  await page.locator('.cm-content').fill('// marker-from-first-problem');

  // 문제를 바꾸는 길은 이제 상단바의 select가 아니라 목록이다. 해시만 바꿔
  // 같은 문서 안에서 오간다 — 문서가 새로 로드되면 runStore가 처음부터 비어
  // 있어서 "이전 결과가 남지 않는다"는 단언이 저절로 참이 되고, 이 테스트는
  // 지키려던 것을 잃는다. 새로고침되면 사라지는 표시를 달아 그 전제도 검사한다.
  await page.evaluate(() => document.documentElement.setAttribute('data-same-document', 'yes'));
  await page.goto('#/');
  await page.locator('a[data-status]').nth(1).click();
  await expect(page.getByRole('heading', { name: '문자열 n번 이어붙이기' }).first()).toBeVisible();
  await expect(page.locator('html[data-same-document="yes"]')).toHaveCount(1);

  await expect(page.locator('.cm-content')).not.toContainText('marker-from-first-problem');
  await expect(page.getByText('3/3')).toHaveCount(0);
});

test('switching problems via a direct hash change still rebuilds the editor', async ({ page }) => {
  // 위 테스트는 목록을 거쳐 문제를 바꾸므로 '/' → '/problems/:id'로 라우트가
  // 바뀌어 IdePage가 매번 언마운트·재마운트된다 — useState가 처음부터 다시
  // 초기화되니 IdePage.tsx:38-41의 loadedProblemId 재조정은 전혀 실행되지
  // 않아도 테스트가 통과한다. 그 코드가 실제로 지키는 경로는 '/problems/:id'
  // 안에서 id만 바뀌는 경우다 — 주소창을 직접 바꾸거나, 문제 링크를 따라가거나,
  // 두 문제 URL 사이를 뒤로/앞으로 가는 경우. 셋 다 같은 라우트에 머물러
  // IdePage를 마운트된 채로 둔다. 여기서는 그 상황을 goto로 재현한다.
  await page.goto('#/problems/001-even-sum');
  await page.locator('.cm-content').fill('// marker-from-first-problem');

  // 같은 이유로 새로고침이 섞이지 않았는지를 검사에 넣는다 — 전체 새로고침이면
  // IdePage가 마운트부터 다시 되어, 고치려는 재조정 코드 없이도 통과해버린다.
  await page.evaluate(() => document.documentElement.setAttribute('data-same-document', 'yes'));
  await page.goto('#/problems/002-string-repeat');
  await expect(page.getByRole('heading', { name: '문자열 n번 이어붙이기' }).first()).toBeVisible();
  await expect(page.locator('html[data-same-document="yes"]')).toHaveCount(1);

  await expect(page.locator('.cm-content')).not.toContainText('marker-from-first-problem');
});
