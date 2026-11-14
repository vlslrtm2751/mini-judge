import { expect, test } from '@playwright/test';

// 해시 라우터라 IDE로 바로 들어가려면 '#/...' 형태를 써야 한다. baseURL이
// `.../mini-judge/#`로 끝나므로 '/problems/...'는 URL() 해석에서 base path를
// 벗어나 프리뷰 서버의 404로 떨어진다.
const IDE_001 = '#/problems/001-even-sum';

/** 진척도 줄이 말하는 전체 문제 수. 예전에는 3을 그대로 박아 뒀는데, 문제를
 *  하나 추가하자 이 파일에서만 단언 10개가 깨졌다 — 문제를 늘리는 일에
 *  테스트 수선이 매번 따라붙는 구조였다.
 *
 *  파일시스템을 읽는 쪽이 더 독립적이지만, 이 스펙은 브라우저 프로젝트에서
 *  타입체크돼 node 전역이 없다(tsconfig.app.json의 types가 vite/client뿐).
 *  거기에 node를 더하면 src의 브라우저 코드에도 node 전역이 열려서, 더 나쁜
 *  거래다. 대신 화면이 스스로 말하는 수를 읽고, 그 수와 행 수가 **서로
 *  맞는지**를 본다 — 둘은 같은 metas에서 나오지만 갈라진 적이 실제로 있다
 *  (진척도가 필터 결과를 세던 리뷰 지적). 그 불일치를 이 단언이 잡는다. */
async function totalFromProgress(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.locator('[class*="progress"]').first().innerText();
  const match = /(\d+)문제 중/.exec(text);
  if (!match) throw new Error(`진척도 줄을 읽지 못했다: ${JSON.stringify(text)}`);
  return Number(match[1]);
}

/** 목록의 행. 행 전체가 링크이고, 유도된 상태를 data-status로 드러낸다. */
const rows = (page: import('@playwright/test').Page) => page.locator('a[data-status]');

/** 목록의 스크롤 영역. 문서가 아니라 이쪽이 넘침을 떠안아야 한다. */
const scroller = (page: import('@playwright/test').Page) => page.locator('[class*="scroller"]').first();

/** IDE 상단바(WorkspaceHeader). "← 목록" 링크와 현재 문제 제목이 여기 있다.
 *  ProblemMeta.tsx도 문제 제목을 <header><h1>으로 그리지만 그 <header>는
 *  클래스가 없다 — 클래스가 붙은 <header>는 WorkspaceHeader뿐이라 그것으로
 *  좁혀야 둘을 구분할 수 있다. */
const chromeHeader = (page: import('@playwright/test').Page) => page.locator('header[class]');

test('/를 열면 저장소의 모든 문제가 행으로 보인다', async ({ page }) => {
  await page.goto('#/');

  await expect(rows(page)).toHaveCount(await totalFromProgress(page));
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
  await expect(page.locator('[class*="progress"]').first()).toContainText('0개 통과');
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

  await expect(page.locator('[class*="progress"]').first()).toContainText('1개 통과');
  const passed = rows(page).filter({ has: page.locator('[data-mark="pass"]') });
  await expect(passed).toHaveCount(1);
  await expect(passed).toHaveAttribute('href', /001-even-sum$/);
});

// 제목·난이도 열 머리는 정렬 버튼이다. 같은 열을 다시 누르면 방향이
// 뒤집히고, 새 정렬은 URL 쿼리에 쌓인다(토글 두 번으로 왕복까지 본다).
// name을 exact로 매치한다 — substring 매치는 ', 오름차순 정렬 중' 접미사가
// 빠져도(리뷰 Important 1의 변형 중 하나) 똑같이 찾아내 그 결함을 놓친다.
test('제목 열 머리를 누르면 제목 기준으로 바뀌고, 다시 누르면 방향이 뒤집힌다', async ({ page }) => {
  await page.goto('#/');

  // 전체 수열을 박아 두면 문제를 하나 추가할 때마다 깨진다. 제목 순서가
  // 확실히 갈리는 두 문제의 **상대 순서**만 본다 — 'ㅁ'(문자열)이 'ㅉ'(짝수)
  // 앞이고, 방향을 뒤집으면 반대가 된다. 정렬이 빠지면 둘 다 깨진다.
  const indexOf = async (title: string): Promise<number> => {
    const titles = await page.locator('[class*="cellTitle"]').allInnerTexts();
    return titles.findIndex((t) => t.includes(title));
  };

  await page.getByRole('button', { name: '제목', exact: true }).click();
  await expect(page).toHaveURL(/#\/\?sort=title$/);
  expect(await indexOf('문자열 n번')).toBeLessThan(await indexOf('짝수만 더하기'));

  await page.getByRole('button', { name: '제목, 오름차순 정렬 중', exact: true }).click();
  await expect(page).toHaveURL(/#\/\?sort=title&dir=desc$/);
  expect(await indexOf('문자열 n번')).toBeGreaterThan(await indexOf('짝수만 더하기'));
});

// theme.spec.ts의 "Tab으로 순회하는 모든 인터랙티브 요소에 포커스 링이
// 보인다"는 #/problems/001-even-sum(IDE)만 돌고 목록 화면(#/)에는 가지
// 않는다 — 정렬 버튼은 그 테스트에서 한 번도 포커스되지 않는다(task-5a
// 보고서 3-B가 처음 그렇다고 적었던 것은 틀렸다 — 아래에서 실제 브라우저로
// 직접 확인한다, 리뷰 Important 2).
test('정렬 버튼도 Tab으로 도달하면 포커스 링이 보인다', async ({ page }) => {
  await page.goto('#/');
  await rows(page).first().waitFor();

  const probe = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el.tagName !== 'BUTTON') return null;
      const s = getComputedStyle(el);
      // 활성 버튼은 aria-label로 이름을 주므로(SortHeaderButton 주석 참조)
      // textContent만 보면 상태 문구가 빠진 이름을 키로 쓰게 된다.
      return {
        text: el.getAttribute('aria-label') ?? (el.textContent ?? '').trim(),
        ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2,
      };
    });

  // 지금의 탭 순서(입력, 난이도, 상태, 태그, 제목 버튼(5번째), 난이도
  // 버튼(6번째))에 정확히 맞춘 상한은 6이다 — 헤더 행 앞에 포커스 가능한
  // 컨트롤이 하나만 더 생겨도(예: 0건 상태의 "필터 초기화"가 끼어드는
  // 변형) 두 버튼 모두 무관한 이유로 못 잡는다(리뷰 Minor 8). 여유를 둔다.
  const seen = new Map<string, boolean>();
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    const info = await probe();
    if (info) seen.set(info.text, info.ring);
  }

  expect(seen.get('제목'), `방문한 버튼: ${JSON.stringify([...seen])}`).toBe(true);
  expect(seen.get('난이도, 오름차순 정렬 중'), `방문한 버튼: ${JSON.stringify([...seen])}`).toBe(true);
});

// URL이 유일한 출처다 — 클릭을 거치지 않고 쿼리로 직접 들어가도 같은
// 순서로 보여야 한다(새로고침·공유 링크가 기대는 바로 그 동작).
test('정렬 쿼리로 직접 들어가면 그 순서로 보인다', async ({ page }) => {
  await page.goto('#/?sort=title&dir=desc');

  await expect(rows(page).nth(0)).toContainText('짝수만 더하기');
  await expect(rows(page).nth(1)).toContainText('중복 제거 후 정렬');
  await expect(rows(page).nth(2)).toContainText('문자열 n번 이어붙이기');
});

// 알 수 없는 값은 던지거나 목록을 비우지 않고 기본 정렬(난이도 오름차순)로
// 조용히 떨어진다.
test('알 수 없는 정렬 쿼리로 들어가면 기본 정렬로 떨어지고 목록이 보인다', async ({ page }) => {
  await page.goto('#/?sort=nope&dir=sideways');

  await expect(rows(page)).toHaveCount(await totalFromProgress(page));
  await expect(rows(page).nth(0)).toContainText('짝수만 더하기');
  await expect(rows(page).nth(1)).toContainText('문자열 n번 이어붙이기');
  await expect(rows(page).nth(2)).toContainText('중복 제거 후 정렬');
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

// 검색은 제목과 태그를 나눠 단언한다. 브리프 작성자가 실제 데이터로 확인한
// 표: 문자열·정렬은 제목과 태그 둘 다에 걸려 "제목만 보는" 구현도 통과시킨다
// — 배열(태그에서만, 제목 "짝수만 더하기"에는 없음)과 짝수(제목에서만, 태그
// "배열"에는 없음)로 각각 단언해야 태그 검색이 실제로 검증된다.
// 접근 가능한 이름은 보이는 placeholder("제목·태그 검색")와 같다 — sr-only
// 글자를 다른 말("문제 검색")로 따로 두면 보이는 글자가 이름에 전혀 안
// 나타나 Label-in-Name(SC 2.5.3) 위반이다(리뷰 Minor 14, SortHeaderButton의
// 주석이 이 저장소가 2.5.3을 의도적으로 지킨다는 선례).
test('검색 입력은 제목에 없어도 태그에 걸리는 검색어를 찾는다 (배열 → 001)', async ({ page }) => {
  await page.goto('#/');

  await page.getByLabel('제목·태그 검색').fill('배열');

  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('짝수만 더하기');
  // 검색하면 URL에 ?q=가 붙는다. 한글이라 percent-encoding이 섞이므로 정확한
  // 인코딩을 손으로 계산하지 않고 "q= 뒤에 뭔가 있고 그게 유일한 쿼리다"만
  // 확인한다.
  await expect(page).toHaveURL(/#\/\?q=[^&]+$/);
});

test('검색 입력은 태그에 없어도 제목에 걸리는 검색어를 찾는다 (짝수 → 001)', async ({ page }) => {
  await page.goto('#/');

  await page.getByLabel('제목·태그 검색').fill('짝수');

  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('짝수만 더하기');
  await expect(page).toHaveURL(/#\/\?q=[^&]+$/);
});

// 리뷰 Important 3: ProblemListPage.tsx:163-166의 URL→입력 동기화 effect는
// 지워도 유닛 124/124가 그대로 green이었다 — 딥링크는 useState(query.q)
// 초기값이 담당하고, 이 effect의 유일한 역할은 뒤로/앞으로인데 q로 history를
// 오가는 테스트가 전혀 없었다. 디바운스가 끝나기 전에(= 아직 history에
// 실리지 않은 두 번째 검색어가 있는 채로) 뒤로 가면, 입력창과 목록이 함께
// 그 전 history 상태로 돌아가는지를 본다.
test('디바운스가 끝나기 전에 뒤로 가면 검색창과 목록이 함께 그 전 상태로 돌아간다', async ({ page }) => {
  await page.goto('#/');
  const total = await totalFromProgress(page);

  // 첫 검색어 — 디바운스가 끝나길 기다려 URL에 커밋되게 한다(history
  // entry 하나가 쌓인다).
  await page.getByLabel('제목·태그 검색').fill('배열');
  await expect(page).toHaveURL(/#\/\?q=[^&]+$/);
  // 개수를 박지 않는다 — 문제가 늘면 태그가 겹칠 수 있다. 걸러졌다는 것과
  // 기대한 문제가 들어 있다는 것만 본다.
  await expect.poll(() => rows(page).count()).toBeLessThan(total);
  await expect(rows(page).filter({ hasText: '짝수만 더하기' })).toHaveCount(1);

  // 두 번째 검색어 — 디바운스 커밋을 기다리지 않고 바로 뒤로 간다. 화면은
  // 로컬 qInput으로 이미 바뀌어 있지만 URL에는 아직 안 실린 상태다.
  await page.getByLabel('제목·태그 검색').fill('중복');
  await expect(rows(page).filter({ hasText: '중복 제거 후 정렬' })).toHaveCount(1);
  // 첫 검색어의 결과는 사라졌어야 한다 — 화면이 로컬 입력에 즉시 반응한다는 뜻.
  await expect(rows(page).filter({ hasText: '짝수만 더하기' })).toHaveCount(0);

  await page.goBack();

  // 두 번째 검색어는 history에 실린 적이 없으므로, 뒤로 가면 첫 검색어
  // 이전(필터 없는 초기 상태)으로 간다 — 입력창도 목록도 함께 돌아가야
  // 한다. effect가 없으면 qInput이 'string 1'에 그대로 남아 입력창·목록이
  // URL과 어긋난다.
  await expect(page).toHaveURL(/#\/$/);
  await expect(rows(page)).toHaveCount(await totalFromProgress(page));
  await expect(page.getByLabel('제목·태그 검색')).toHaveValue('');
});

// 리뷰 포커스 5 / 브리프 Step 5: 0건 URL로 바로 들어가도(클릭으로 거쳐가지
// 않아도) 빈 표가 아니라 안내와 초기화가 보여야 한다.
test('0건이 되는 URL로 직접 들어가면 안내와 초기화 버튼이 보이고, 누르면 전체가 돌아오며 URL이 깨끗해진다', async ({
  page,
}) => {
  await page.goto('#/?level=9');

  await expect(rows(page)).toHaveCount(0);
  // 같은 문구가 sr-only 라이브 리전에도 그대로 있어(의도한 동작 — 비시각
  // 사용자도 같은 안내를 듣는다) getByText는 두 곳에 걸려 strict mode
  // violation이 난다. 눈에 보이는 안내 블록으로 범위를 좁힌다.
  await expect(page.locator('[class*="empty"]')).toContainText('조건에 맞는 문제가 없습니다');
  await expect(page.locator('[class*="empty"]')).toBeVisible();
  // 필터를 걸어 0건이 되어도 진척도 줄은 전체 문제 수 기준이다.
  await expect(page.locator('[class*="progress"]').first()).toContainText('0개 통과');
  // 리뷰 Important 1: 9는 levels에 없는 값이라 일치하는 <option>이 없으면
  // 네이티브 select가 value=""로 떨어져 "전체 난이도"를 보여준다 — 목록은
  // 0건이라고 하는데 컨트롤은 "필터 없음"이라고 말하는 모순. select가
  // 여전히 9를 보여주는지(그리고 그 옵션 글자가 "전체 난이도"가 아닌지)
  // 직접 본다.
  await expect(page.getByLabel('난이도 필터')).toHaveValue('9');
  await expect(page.getByLabel('난이도 필터').locator('option:checked')).not.toHaveText('전체 난이도');

  await page.getByRole('button', { name: '필터 초기화', exact: true }).click();

  await expect(rows(page)).toHaveCount(await totalFromProgress(page));
  await expect(page).toHaveURL(/#\/$/);
});

test('필터를 건 상태에서도 진척도 줄의 분모는 전체 문제 수로 남는다', async ({ page }) => {
  await page.goto('#/');

  // 거르기 **전에** 읽어 둔다. 거른 뒤에 읽어서 비교하면 순환이라 분모가
  // 필터를 따라가도 알아채지 못한다.
  const total = await totalFromProgress(page);
  await expect(rows(page)).toHaveCount(total);

  await page.getByLabel('난이도 필터').selectOption('1');

  // 몇 건이 남는지는 문제 구성에 달렸다. 중요한 건 걸러졌다는 것과,
  // 그래도 분모가 전체 문제 수로 남는다는 것이다(스펙 226행).
  await expect.poll(() => rows(page).count()).toBeLessThan(total);
  expect(await totalFromProgress(page)).toBe(total);
});

// Task 6: select가 사라지고 "← 목록" 링크로 바뀐다. 그 링크는 목록에서 넘어올
// 때 실린 라우터 state(listSearch)를 읽어 돌아간다 — 목록 행 <Link>가 그 state를
// 싣는(생산자) 쪽과 WorkspaceHeader가 그걸 읽는(소비자) 쪽 중 하나라도 끊기면
// 똑같이 필터 없는 '/'로 떨어진다. 이 테스트는 그 배선 전체를 한 번에 본다 —
// "되돌아갈 때 쿼리를 들고 간다"는 약속은 Back/Forward처럼 클릭을 거치지 않는
// 길이 아니라 이 링크 자체의 동작이라, state를 빼도 유닛이 아니라 이 e2e만이
// 잡을 수 있다.
test('필터를 건 뒤 문제를 열고 "← 목록"을 누르면 필터가 그대로다', async ({ page }) => {
  await page.goto('#/?q=배열');
  await expect(rows(page)).toHaveCount(1);

  await rows(page).first().click();
  await expect(page).toHaveURL(/#\/problems\/001-even-sum$/);

  await page.getByRole('link', { name: '← 목록', exact: true }).click();

  await expect(page).toHaveURL(/#\/\?q=[^&]+$/);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('짝수만 더하기');
});

// 문제 URL로 직접 들어오면(주소창 편집·공유 링크·새 탭) 목록을 거치지
// 않았으므로 넘겨받은 state가 없다 — "← 목록"은 이때 필터 없는 목록으로
// 가야 한다(스펙 178행). 새로고침은 여기 해당하지 않는다: history.state가
// 새로고침을 견뎌 필터가 그대로 돌아온다.
test('문제 URL로 직접 들어가 "← 목록"을 누르면 필터 없는 목록으로 간다', async ({ page }) => {
  await page.goto('#/problems/001-even-sum');

  await page.getByRole('link', { name: '← 목록', exact: true }).click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(rows(page)).toHaveCount(await totalFromProgress(page));
});

// select가 사라지면 "지금 어디 있는지"를 보여줄 수단이 select의 선택값 말고
// 없어진다 — 현재 문제 제목이 상단바에 글자로 남아야 한다(스펙 174행).
// ProblemMeta.tsx도 같은 제목을 <h1>으로 그리므로, 클래스가 붙은(=WorkspaceHeader만
// 해당) <header>로 좁혀 본다 — 좁히지 않으면 문제 패널의 <h1>만으로도 이
// 단언이 거짓으로 통과해 상단바 쪽 구현이 비어 있어도 들키지 않는다.
test('IDE 상단바에 현재 문제 제목이 글자로 보인다', async ({ page }) => {
  await page.goto('#/problems/002-string-repeat');

  await expect(chromeHeader(page)).toContainText('문자열 n번 이어붙이기');
  await expect(chromeHeader(page).getByRole('link', { name: '← 목록', exact: true })).toBeVisible();
});

// Task 7: 760px 이하에서는 표 행이 카드로 바뀐다. 실측(390×844, HEAD bc45945):
// grid-template-columns가 28px 48px 52px 180px라 태그 열이 180px를 고정으로
// 쥐는 동안 제목 열만 48px로 찌그러진다. 세 제목이 필요로 하는 폭은 각각
// 73·118·90px(가장 긴 "문자열 n번 이어붙이기"가 118px)인데 48px만 받아 전부
// "짝수만...", "문자열...", "중복 ..."으로 잘린다 — 문제를 구분할 수 없다.
// scrollWidth > clientWidth로 직접 잡는다. 세 행 모두 본다 — 길이가 서로 달라
// 가장 긴 제목이 안 잡히면 의미가 없다.
test('좁은 화면에서 제목이 잘리지 않고 카드로 쌓인다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/');
  await expect(rows(page)).toHaveCount(await totalFromProgress(page));

  const titleCells = page.locator('a[data-status] [class*="cellTitle"]');
  const count = await titleCells.count();
  expect(count).toBe(await totalFromProgress(page));
  for (let i = 0; i < count; i += 1) {
    const metrics = await titleCells.nth(i).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(metrics.scroll, `행 ${i}의 제목이 잘렸다: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(
      metrics.client,
    );

    // 이름이 약속하는 "쌓인다"를 실제로 고정한다. 이게 없으면 태그 열을
    // 줄여 잘림만 없앤 구현도 같은 이름으로 통과한다 — 테스트 이름을 믿는
    // 다음 사람이 속는다.
    const stacked = await rows(page)
      .nth(i)
      .evaluate((row) => {
        const t = row.querySelector('[class*="cellTitle"]')!.getBoundingClientRect();
        const lv = row.querySelector('[class*="cellLevel"]')!.getBoundingClientRect();
        return { titleY: Math.round(t.y), levelY: Math.round(lv.y) };
      });
    expect(stacked.levelY, `행 ${i}가 쌓이지 않았다: ${JSON.stringify(stacked)}`).toBeGreaterThan(
      stacked.titleY,
    );
  }

  // 열 머리는 카드에서 의미가 없어 display:none으로 지운다. 보이기만 감추는
  // 방식이면 정렬 버튼이 스크린리더·탭에는 남아 "숨겨졌는데 닿는" 상태가
  // 된다(Task 5a가 고친 버그와 같은 부류). 요소가 트리에서 빠졌는지를 본다.
  await expect(page.locator('[class*="head"]').first()).toBeHidden();
  const focusableLeft = await page.evaluate(() => {
    const head = document.querySelector('[class*="head"]');
    if (!head) return -1;
    return [...head.querySelectorAll('button')].filter((b) => {
      b.focus();
      return document.activeElement === b;
    }).length;
  });
  expect(focusableLeft, '열 머리의 정렬 버튼이 숨겨진 채 포커스된다').toBe(0);

  // 문서가 가로로 넘치지 않는지도 회귀 방지로 함께 둔다 — 다만 지금도(카드
  // 레이아웃 전에도) 참이므로 이 단언 하나만으로는 카드 레이아웃을 증명하지
  // 못한다. 핵심은 위 scrollWidth <= clientWidth다.
  const doc = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(doc.scroll).toBeLessThanOrEqual(doc.client + 1);
});

// iOS Safari는 포커스되는 입력의 font-size가 16px 미만이면 화면을 확대한다.
// 이 지식은 Task 6이 지운 chrome.module.css의 .picker select 규칙에 있었다 —
// 그 select가 사라지며 지식도 같이 사라졌고, 같은 함정이 목록의 검색 입력 +
// 필터 select 세 개로 옮겨왔다. 넷 다 실측 13px이다.
test('검색 입력과 필터 select 세 개의 글자 크기가 16px 이상이라 iOS가 확대하지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/');

  const controls = page.locator('input[type="search"], [class*="select"] select');
  await expect(controls).toHaveCount(4);
  const count = await controls.count();
  for (let i = 0; i < count; i += 1) {
    const fontSize = await controls.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize, `컨트롤 ${i}의 font-size가 16px 미만이다`).toBeGreaterThanOrEqual(16);
  }
});
