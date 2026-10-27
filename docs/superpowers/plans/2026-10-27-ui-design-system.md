# mini-judge UI 디자인 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아티팩트 `KELeNQQq68XbhWaFWRisTe`의 시험지 채점 비주얼 언어를 이 저장소에 다크 전용 디자인 시스템으로 이식한다.

**Architecture:** `tokens.css`의 CSS 변수 한 곳에 팔레트·타이포를 모으고, 반복되는 것만 `src/ui/` 프리미티브로 뽑고, 나머지는 기능별 `*.module.css`로 둔다. 레이아웃은 이미 고쳐진 `react-resizable-panels`을 그대로 쓰고 비주얼만 입힌다. 에디터는 목업의 CodeMirror 5 색값을 CodeMirror 6의 Lezer 태그 기반 `HighlightStyle`로 다시 쓴다.

**Tech Stack:** React 19, TypeScript, Vite, CSS Modules, zustand, `@uiw/react-codemirror` (CodeMirror 6), vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-10-27-ui-design-system-design.md`

## Global Constraints

- 다크 전용. `prefers-color-scheme` 분기, 라이트 값, `[data-theme]` 블록을 만들지 않는다.
- 새 런타임 의존성을 추가하지 않는다. 단 하나의 예외는 이미 transitive로 설치된 `@codemirror/language` `^6.13.1`과 `@lezer/highlight` `^1.2.5`의 직접 의존성 승격이다.
- 의존성을 추가할 때는 `package.json`과 `package-lock.json`의 루트 `dependencies` **양쪽**을 고친다. 한쪽만 고치면 CI의 `npm ci`가 락 불일치로 실패한다.
- 색·간격·폰트는 `tokens.css`의 변수로만 쓴다. 컴포넌트에 색 리터럴을 쓰지 않는다.
- 인라인 `style={{}}`를 새로 쓰지 않는다. `:hover` / `:focus-visible` / `:disabled`를 표현할 수 없기 때문이다.
- 기존 유닛 테스트 22개와 `npm run typecheck`는 모든 커밋에서 통과해야 한다.
- `tests/e2e/layout.spec.ts`의 기하 테스트 4개는 모든 커밋에서 통과해야 한다. 이 작업은 비주얼만 바꾸고 기하는 바꾸지 않는다.
- 각 태스크 끝에서 Playwright 스크린샷을 찍어 **실제로 눈으로 확인한다.** 이번 레이아웃 버그가 아무도 화면을 보지 않아 생겼다.

## Review Focus

스펙이 전제하지만 어느 태스크의 테스트도 건드리지 않는, 사용자를 물 가능성이 높은 순서:

1. **좁아진 문제 패널에서 긴 코드/긴 제목의 가로 오버플로** — 사용자가 스플리터를 최소 폭(25%)까지 당겼을 때 예시 테이블과 인라인 코드가 패널을 가로로 밀어내면 안 된다. → Task 5에서 테스트.
2. **줄바꿈 없는 아주 긴 터미널 한 줄** — `console.log('x'.repeat(5000))`이 `white-space: pre`인 `<pre>`를 통해 출력 패널 폭을 밀어내면 안 된다. 컨테이너가 가로 스크롤해야 한다. → Task 6에서 테스트.
3. **pass 이외의 상태** — 마크와 칩을 pass만 보고 끝내기 쉽다. fail·error·timeout·running·pending 다섯 상태가 모두 서로 구분되는 색과 모양으로 렌더되어야 한다. → Task 6에서 테스트.
4. **키보드 포커스 가시성** — Tab으로 이동할 때 모든 인터랙티브 요소(선택기, 탭, 버튼, 스플리터)에 `focus-visible` 링이 보여야 한다. 마우스로만 확인하면 놓친다. → Task 7에서 테스트.
5. **제출 시 10개 케이스의 세로 스크롤** — 결과 목록이 출력 패널 높이를 넘으면 패널 안에서 스크롤해야 하고, 페이지 전체가 스크롤되면 안 된다. → Task 6에서 테스트.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/styles/tokens.css` | 팔레트·타이포 변수의 유일한 출처 |
| `src/styles/global.css` | 리셋, 폰트 로드, 전역 포커스 링, reduced-motion |
| `src/ui/Button.tsx` · `Button.module.css` | 버튼 프리미티브 3종 |
| `src/features/workspace/workspace.module.css` | 앱 셸, 패널 카드, 스플리터 그립 |
| `src/features/editor/theme.ts` | CM6 에디터 크롬 + 구문 하이라이트 |
| `src/features/problem/problem.module.css` | 문제 본문 타이포, 메타, 예시 테이블 |
| `src/features/output/output.module.css` | 탭 바, 케이스 카드, 채점 마크, 점수, 터미널 |
| `tests/e2e/theme.spec.ts` | 다크 적용·토큰 대비·포커스 링 검증 |

---

## Task 1: 다크 전용 토큰 레이어

**Files:**
- Modify: `src/styles/tokens.css` (전면 교체)
- Modify: `src/styles/global.css`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/stores/uiStore.ts`
- Test: `tests/e2e/theme.spec.ts` (신규)

**Interfaces:**
- Consumes: 없음
- Produces: `tokens.css`의 CSS 변수 전체. 이후 모든 태스크가 `var(--sheet)` 같은 이름으로 참조한다. `UiState`에서 `theme`과 `setTheme`이 **사라진다** — 이후 태스크는 `useUiStore`에 `outputTab` / `mobileView`와 각 setter만 있다고 가정한다.

- [ ] **Step 1: 다크 적용을 검증하는 실패 테스트 작성**

`tests/e2e/theme.spec.ts`를 만든다. OS가 라이트를 선호해도 다크로 나와야 한다는 것이 핵심이다.

```ts
import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'light' });

test('OS가 라이트를 선호해도 다크 팔레트로 렌더된다', async ({ page }) => {
  await page.goto('/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // --paper #0d1218
  expect(bg).toBe('rgb(13, 18, 24)');
});

test('라이트 테마 분기가 남아 있지 않다', async ({ page }) => {
  await page.goto('/');
  const attr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(attr).toBeNull();
});
```

- [ ] **Step 2: 실패 확인**

```
npm run build && npx playwright test tests/e2e/theme.spec.ts
```

기대: 두 테스트 모두 FAIL. 현재 `--bg`는 라이트에서 `#ffffff`라 `rgb(255, 255, 255)`가 나온다.

- [ ] **Step 3: `tokens.css` 전면 교체**

기존 내용을 모두 지우고 아래로 바꾼다. 스펙 1·2절의 값이다.

```css
:root {
  color-scheme: dark;

  /* 표면 */
  --paper: #0d1218;
  --sheet: #151c25;
  --sheet-2: #1b2430;

  /* 텍스트 */
  --ink: #e5eaf1;
  --ink-2: #a8b3c2;
  --ink-3: #6e7b8d;

  /* 경계 */
  --rule: #28323f;
  --rule-strong: #364252;

  /* 강조 */
  --accent: #7096ff;
  --accent-ink: #0b1220;
  --accent-wash: #1b2540;

  /* 채점 상태 */
  --pen: #ff5f6b;
  --pen-wash: #2a171b;
  --pen-line: #5a2a31;
  --ok: #4cc98f;
  --ok-wash: #13281f;
  --warn: #e9a640;
  --warn-wash: #2b2114;

  /* 기타 */
  --shadow: rgba(0, 0, 0, 0.4);
  --sel: #2a3a63;
  --err-wash: rgba(255, 95, 107, 0.12);

  /* 코드 */
  --code-bg: #121820;
  --tok-kw: #ff7ab6;
  --tok-def: #8eb0ff;
  --tok-var2: #8cc4ff;
  --tok-str: #7fd6a3;
  --tok-num: #f3b26b;
  --tok-atom: #c3a1ff;
  --tok-prop: #c2cddb;
  --tok-comment: #6e7b8d;

  /* 터미널 */
  --term-bg: #0a0e14;
  --term-fg: #d6dde7;
  --term-dim: #7a879a;
  --term-path: #7fa6ff;
  --term-err: #ff7b7b;
  --term-ok: #5fd39a;
  --term-warn: #f0b75a;

  /* 타이포 */
  --f-ui: 'IBM Plex Sans KR', 'Apple SD Gothic Neo', system-ui, sans-serif;
  --f-title: 'Noto Serif KR', Georgia, serif;
  --f-code: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace;
  --f-pen: 'Nanum Pen Script', cursive;
}
```

- [ ] **Step 4: `global.css` 교체**

전역 `th, td` 규칙을 제거한다(Task 5의 예시 테이블과 충돌한다). 포커스 링과 reduced-motion을 추가한다.

```css
@import './tokens.css';
@import '@fontsource/ibm-plex-sans-kr/400.css';
@import '@fontsource/ibm-plex-sans-kr/600.css';
@import '@fontsource/ibm-plex-sans-kr/700.css';
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';
@import '@fontsource/nanum-pen-script/400.css';
@import '@fontsource/noto-serif-kr/700.css';

* { box-sizing: border-box; }

html, body, #root {
  margin: 0;
  width: 100%;
  height: 100%;
}

body {
  font-family: var(--f-ui);
  font-size: 14px;
  background: var(--paper);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}

code, pre, .cm-editor { font-family: var(--f-code); }

button, select, input, textarea { font: inherit; color: inherit; }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition: none !important;
  }
}
```

위 7개 import는 `node_modules/@fontsource/*`에 해당 weight 파일이 실제로 있는지 확인한 목록이다 — sans-kr은 100~700, mono는 100~700, nanum-pen-script는 400만, noto-serif-kr은 200~900이 있다. 다른 weight를 추가하려면 먼저 파일 존재를 확인한다. 없는 파일을 import하면 빌드가 실패한다.

- [ ] **Step 5: `AppShell.tsx`에서 `data-theme` 효과 제거**

`useUiStore`에서 `theme`을 읽어 `<html>`에 속성을 심던 `useEffect`와 그 import를 지운다. 다크 전용이라 심을 값이 없다. 나머지 렌더 내용은 그대로 둔다.

- [ ] **Step 6: `uiStore.ts`에서 테마 상태 제거**

`UiState`에서 `theme`과 `setTheme`을 지우고, 구현에서도 지운다. `partialize`가 `theme`만 저장하고 있었으므로 `persist` 래퍼 전체를 걷어낸다.

```ts
import { create } from 'zustand';

interface UiState {
  outputTab: 'results' | 'terminal';
  mobileView: 'problem' | 'code' | 'result';
  setOutputTab(tab: 'results' | 'terminal'): void;
  setMobileView(view: 'problem' | 'code' | 'result'): void;
}

export const useUiStore = create<UiState>((set) => ({
  outputTab: 'results',
  mobileView: 'code',
  setOutputTab: (outputTab) => set({ outputTab }),
  setMobileView: (mobileView) => set({ mobileView }),
}));
```

- [ ] **Step 7: 통과 확인**

```
npm run typecheck && npm run test && npm run build && npx playwright test
```

기대: 타입체크 통과, 유닛 22개 통과, e2e 9개 통과(기존 7 + 신규 2).

- [ ] **Step 8: 눈으로 확인**

```
npx playwright screenshot --viewport-size=1600,900 --wait-for-timeout=2500 \
  "http://127.0.0.1:4173/mini-judge/#/" /tmp/t1.png
```

(`npm run preview`를 먼저 띄운다.) 배경이 어두워졌는지, 글자가 읽히는지 본다. 이 단계에서는 아직 패널 카드가 없으므로 레이아웃은 밋밋한 게 정상이다.

- [ ] **Step 9: 커밋**

```bash
git add src/styles/tokens.css src/styles/global.css src/app/AppShell.tsx src/stores/uiStore.ts tests/e2e/theme.spec.ts
git commit -m "feat(ui): 다크 전용 토큰 레이어 도입"
```

---

## Task 2: 버튼 프리미티브

**Files:**
- Create: `src/ui/Button.tsx`, `src/ui/Button.module.css`
- Test: `tests/unit/button.test.tsx` (신규)

**Interfaces:**
- Consumes: Task 1의 토큰
- Produces:
  ```ts
  export type ButtonVariant = 'primary' | 'default' | 'ghost';
  export function Button(
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant },
  ): React.ReactElement;
  ```
  `variant` 기본값은 `'default'`. 나머지 props는 `<button>`에 그대로 전달된다. Task 6·7이 쓴다.

- [ ] **Step 1: 실패 테스트 작성**

`vitest` 환경이 jsdom이므로 렌더 테스트가 가능하다. `@testing-library/react`는 설치돼 있지 않으므로 `react-dom/client`로 직접 렌더한다(새 의존성 금지).

```tsx
import { describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Button } from '@/ui/Button';

function render(node: React.ReactElement): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => { createRoot(host).render(node); });
  return host;
}

describe('Button', () => {
  it('기본 variant로 렌더되고 라벨을 보여준다', () => {
    const host = render(<Button>제출</Button>);
    const btn = host.querySelector('button');
    expect(btn?.textContent).toBe('제출');
    expect(btn?.className).toMatch(/default/);
  });

  it('variant에 따라 다른 클래스를 붙인다', () => {
    expect(render(<Button variant="primary">a</Button>).querySelector('button')?.className).toMatch(/primary/);
    expect(render(<Button variant="ghost">a</Button>).querySelector('button')?.className).toMatch(/ghost/);
  });

  it('disabled와 onClick 같은 button 속성을 그대로 전달한다', () => {
    const btn = render(<Button disabled>a</Button>).querySelector('button');
    expect(btn?.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

```
npm run test -- button
```

기대: FAIL — `@/ui/Button`을 찾을 수 없음.

- [ ] **Step 3: `Button.module.css` 작성**

```css
.btn {
  appearance: none;
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--rule-strong);
  background: var(--sheet);
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover:not(:disabled) { border-color: var(--ink-3); }
.btn:disabled { opacity: 0.55; cursor: progress; }

/* 기본 variant에도 클래스 이름이 필요하다. Button.tsx가 styles[variant]로
   참조하므로 이 규칙이 없으면 undefined가 되어 className에 붙지 않는다. */
.default { }

.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}
.primary:hover:not(:disabled) { filter: brightness(1.06); }

.ghost {
  border-color: transparent;
  background: transparent;
  color: var(--ink-2);
  padding: 0 10px;
}
.ghost:hover:not(:disabled) { color: var(--ink); }
```

- [ ] **Step 4: `Button.tsx` 작성**

```tsx
import type { ButtonHTMLAttributes, ReactElement } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'default' | 'ghost';

export function Button({
  variant = 'default',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }): ReactElement {
  const classes = [styles.btn, styles[variant], className].filter(Boolean).join(' ');
  return <button type="button" className={classes} {...rest} />;
}
```

Step 3의 `.default { }` 빈 규칙이 있어야 `styles.default`가 해시된 클래스 이름을 돌려주고 테스트의 `/default/` 매칭이 성립한다. CSS Modules는 선언이 비어 있어도 클래스를 생성한다.

- [ ] **Step 5: 통과 확인**

```
npm run test -- button && npm run typecheck
```

기대: 3개 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/ui/Button.tsx src/ui/Button.module.css tests/unit/button.test.tsx
git commit -m "feat(ui): 버튼 프리미티브 추가"
```

---

## Task 3: 앱 셸 — 패널 카드와 스플리터 그립

**Files:**
- Modify: `src/features/workspace/workspace.module.css`
- Modify: `src/features/workspace/IdePage.tsx`
- Test: `tests/e2e/theme.spec.ts` (추가)

**Interfaces:**
- Consumes: Task 1 토큰
- Produces: `.pane` 클래스. Task 5·6이 패널 내부를 채울 때 이 카드 안에 들어간다고 가정한다.

- [ ] **Step 1: 실패 테스트 추가**

`tests/e2e/theme.spec.ts`에 덧붙인다.

```ts
test('패널이 카드로 렌더된다', async ({ page }) => {
  await page.goto('/');
  const pane = page.locator('[data-panel]').first();
  const style = await pane.evaluate((el) => {
    const s = getComputedStyle(el.firstElementChild ?? el);
    return { radius: s.borderTopLeftRadius, bg: s.backgroundColor };
  });
  expect(style.radius).toBe('10px');
  expect(style.bg).toBe('rgb(21, 28, 37)'); // --sheet
});
```

- [ ] **Step 2: 실패 확인**

```
npm run build && npx playwright test tests/e2e/theme.spec.ts
```

기대: radius가 `0px`이라 FAIL.

- [ ] **Step 3: `workspace.module.css`에 셸과 카드 추가**

기존 `.page` / `.layoutMain` / `.layoutRight` / `.mobileStack` / `.mobilePanel`은 **그대로 둔다**(Task 0에서 고친 기하다). 여백과 카드만 얹는다.

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  padding-block: 10px 12px;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  background: var(--paper);
  color: var(--ink);
}

.pane {
  background: var(--sheet);
  border: 1px solid var(--rule);
  border-radius: 10px;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  height: 100%;
}
```

스플리터는 그립 표시로 바꾼다. 기존 `.separatorV` / `.separatorH`의 통짜 배경을 지우고 가상 요소로 만든다.

```css
.separatorV, .separatorH { position: relative; background: transparent; }
.separatorV { width: 10px; cursor: col-resize; }
.separatorH { height: 10px; cursor: row-resize; }

.separatorV::before, .separatorH::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 2px;
  background: var(--rule-strong);
  transition: background-color 0.15s;
}
.separatorV::before { width: 3px; height: 40px; }
.separatorH::before { width: 40px; height: 3px; }

.separatorV:hover::before,
.separatorH:hover::before,
.separatorV:focus-visible::before,
.separatorH:focus-visible::before { background: var(--accent); }
```

- [ ] **Step 4: `IdePage.tsx`에서 패널에 `.pane` 적용**

세 개의 `<Panel>` 각각의 자식을 `.pane` 클래스를 가진 래퍼로 감싸거나, `<Panel className={styles.pane}>`를 쓴다. `PanelProps.className`은 "nested HTMLDivElement에 적용된다"고 문서화돼 있으므로 `className`을 쓰는 쪽이 Flex 레이아웃을 깨지 않는다.

```tsx
<Panel className={styles.pane} defaultSize="42" minSize="25" maxSize="65">
  <ProblemPanel problem={problem} />
</Panel>
```

에디터와 출력 패널에도 같은 방식으로 `className={styles.pane}`을 더한다.

- [ ] **Step 5: 통과 확인**

```
npm run typecheck && npm run build && npx playwright test
```

기대: 기존 layout 4개 + theme 3개 전부 통과. **layout 테스트가 깨지면 되돌린다** — 기하를 바꾸면 안 된다.

- [ ] **Step 6: 눈으로 확인**

스크린샷을 찍어 패널이 카드로 분리돼 보이는지, 패널 사이 간격과 스플리터 그립이 보이는지 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add src/features/workspace/workspace.module.css src/features/workspace/IdePage.tsx tests/e2e/theme.spec.ts
git commit -m "feat(ui): 작업 영역 패널을 카드로, 스플리터에 그립 표시"
```

---

## Task 4: 에디터 테마 (CM6 포팅)

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/features/editor/theme.ts`
- Modify: `src/features/editor/CodeEditor.tsx`
- Test: `tests/e2e/theme.spec.ts` (추가)

**Interfaces:**
- Consumes: Task 1의 `--code-bg`, `--tok-*`, `--sel`, `--accent`, `--ink-2`, `--ink-3`
- Produces:
  ```ts
  export const miniJudgeDark: Extension[];
  ```
  `CodeEditor`의 `extensions` 배열에 펼쳐 넣는다.

- [ ] **Step 1: 토큰 대비를 검증하는 실패 테스트 추가**

CM6의 하이라이트 클래스는 자동 생성 이름이라 선택자로 특정할 수 없다. `.cm-line` 안의 모든 `span`을 순회해 계산된 색과 배경의 거리를 잰다.

```ts
test('에디터의 모든 구문 토큰이 배경과 구분된다', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').waitFor();

  const result = await page.evaluate(() => {
    const parse = (c: string) => (c.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    const editor = document.querySelector('.cm-editor') as HTMLElement;
    const bg = parse(getComputedStyle(editor).backgroundColor);
    const spans = Array.from(document.querySelectorAll('.cm-line span'));
    return spans.map((el) => {
      const fg = parse(getComputedStyle(el as HTMLElement).color);
      const dist = Math.abs(fg[0] - bg[0]) + Math.abs(fg[1] - bg[1]) + Math.abs(fg[2] - bg[2]);
      return { text: (el.textContent ?? '').slice(0, 12), dist };
    });
  });

  expect(result.length).toBeGreaterThan(0);
  const tooClose = result.filter((r) => r.dist < 120);
  expect(tooClose, `배경에 묻히는 토큰: ${JSON.stringify(tooClose)}`).toEqual([]);
});
```

- [ ] **Step 2: 실패 확인**

```
npm run build && npx playwright test tests/e2e/theme.spec.ts
```

기대: FAIL. 현재 라이트 테마라 연산자·괄호가 어두운 배경에 묻혀 `dist`가 작다.

- [ ] **Step 3: 의존성 승격**

`package.json`의 `dependencies`에 알파벳 순서를 지켜 추가한다.

```json
"@codemirror/commands": "^6.11.1",
"@codemirror/lang-javascript": "^6.2.4",
"@codemirror/language": "^6.13.1",
"@codemirror/lint": "^6.9.2",
```
그리고 `"@lezer/highlight": "^1.2.5",`를 `@fontsource/*` 앞에 넣는다.

`package-lock.json`의 `packages[""].dependencies`에도 **같은 두 줄을 같은 순서로** 추가한다. `node_modules/@codemirror/language`와 `node_modules/@lezer/highlight` 항목은 이미 존재하므로 건드리지 않는다.

검증:
```
npm ci --dry-run
```
기대: 락 불일치 오류 없음.

- [ ] **Step 4: `theme.ts` 작성**

```ts
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorView } from '@uiw/react-codemirror';
import type { Extension } from '@uiw/react-codemirror';

const chrome = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--code-bg)', color: 'var(--ink)', height: '100%' },
    '.cm-content': { fontFamily: 'var(--f-code)', fontSize: '14px', lineHeight: '1.6', caretColor: 'var(--accent)' },
    '.cm-gutters': {
      backgroundColor: 'var(--code-bg)',
      color: 'var(--ink-3)',
      borderRight: '1px solid var(--rule)',
      fontVariantNumeric: 'tabular-nums',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(112, 150, 255, 0.06)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ink-2)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'var(--sel)',
    },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
      backgroundColor: 'var(--sel)',
      borderRadius: '2px',
      color: 'inherit',
    },
    '.cm-nonmatchingBracket': { color: 'var(--pen)' },
    '.cm-lintRange-error': {
      textDecoration: 'underline wavy var(--pen)',
      textUnderlineOffset: '3px',
    },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword], color: 'var(--tok-kw)' },
  { tag: [tags.definition(tags.variableName), tags.function(tags.variableName)], color: 'var(--tok-def)' },
  { tag: tags.variableName, color: 'var(--tok-var2)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--tok-str)' },
  { tag: tags.number, color: 'var(--tok-num)' },
  { tag: [tags.bool, tags.null, tags.atom], color: 'var(--tok-atom)' },
  { tag: tags.propertyName, color: 'var(--tok-prop)' },
  { tag: tags.comment, color: 'var(--tok-comment)', fontStyle: 'italic' },
  { tag: [tags.operator, tags.punctuation, tags.separator, tags.bracket], color: 'var(--ink-2)' },
]);

export const miniJudgeDark: Extension[] = [chrome, syntaxHighlighting(highlight)];
```

마지막 항목이 핵심이다. 지금 괄호와 연산자가 안 보이는 직접적 원인이 그 자리에 색이 없어서다.

- [ ] **Step 5: `CodeEditor.tsx`에 연결**

`extensions` 배열에 펼쳐 넣는다. `basicSetup`의 기본 하이라이트는 `fallback: true`라 우리 것이 우선한다.

```tsx
import { miniJudgeDark } from './theme';
...
extensions={[javascript(), syntaxLinter, ...miniJudgeDark]}
```

- [ ] **Step 6: 통과 확인**

```
npm run typecheck && npm run test && npm run build && npx playwright test
```

- [ ] **Step 7: 눈으로 확인 (이 태스크에서 가장 중요)**

스크린샷을 찍어 `function solution(numbers) {`의 **괄호와 중괄호가 보이는지** 확인한다. 테스트가 통과해도 색이 이상할 수 있으므로 반드시 본다.

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json src/features/editor/theme.ts src/features/editor/CodeEditor.tsx tests/e2e/theme.spec.ts
git commit -m "feat(ui): CodeMirror 6 다크 테마 작성"
```

---

## Task 5: 문제 패널

**Files:**
- Create: `src/features/problem/problem.module.css`
- Modify: `ProblemPanel.tsx`, `ProblemMeta.tsx`, `ExamplesTable.tsx`
- Test: `tests/e2e/problem-panel.spec.ts` (신규)

**Interfaces:**
- Consumes: Task 1 토큰, Task 3의 `.pane`
- Produces: 없음 (잎 노드)

- [ ] **Step 1: 가로 오버플로 실패 테스트 작성** (Review Focus 1)

```ts
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
```

- [ ] **Step 2: 실패 확인**

```
npm run build && npx playwright test tests/e2e/problem-panel.spec.ts
```

기대: 예시 테이블이 좁은 폭에서 넘쳐 FAIL. (통과하면 그대로 두고 Step 3으로 간다 — 스타일 적용 후 깨지지 않는지가 핵심이다.)

- [ ] **Step 3: `problem.module.css` 작성**

```css
.panel { height: 100%; overflow: auto; overscroll-behavior: contain; }
.body { padding: 24px 28px 40px; max-width: 72ch; }

.title {
  font-family: var(--f-title);
  font-weight: 700;
  font-size: 24px;
  line-height: 1.35;
  letter-spacing: -0.01em;
  margin: 0 0 10px;
  text-wrap: balance;
}

.meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; color: var(--ink-2); margin: 0 0 6px; }
.meta span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.meta .lv { font-weight: 700; color: var(--accent); }
.meta span + span::before {
  content: '';
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--ink-3); margin-right: 8px;
}

.md p, .md li { font-size: 15px; line-height: 1.75; }
.md p { margin: 0 0 12px; }
.md ul, .md ol { margin: 0 0 12px; padding-left: 20px; }
.md li::marker { color: var(--ink-3); }
.md h2 {
  font-size: 13px; font-weight: 700; color: var(--ink-2);
  letter-spacing: 0.02em; margin: 28px 0 10px;
  padding-top: 16px; border-top: 1px solid var(--rule);
}
.md h3 { font-size: 14px; margin: 20px 0 8px; }
.md code {
  font-family: var(--f-code); font-size: 0.87em;
  background: var(--sheet-2); border: 1px solid var(--rule);
  padding: 1px 5px; border-radius: 4px;
}
.md pre {
  background: var(--sheet-2); border: 1px solid var(--rule);
  border-radius: 8px; padding: 12px 14px; overflow-x: auto;
}
.md pre code { background: none; border: 0; padding: 0; font-size: 13px; }

/* 가로 넘침은 이 래퍼가 흡수한다 */
.tableWrap { overflow-x: auto; margin: 4px 0 8px; border: 1px solid var(--rule); border-radius: 8px; }
.io { border-collapse: collapse; width: 100%; font-size: 14px; }
.io th {
  text-align: left; font-family: var(--f-code); font-weight: 500; font-size: 13px;
  color: var(--ink-2); background: var(--sheet-2);
  padding: 8px 12px; border-bottom: 1px solid var(--rule);
}
.io td { padding: 8px 12px; border-top: 1px solid var(--rule); vertical-align: top; }
.io tr:first-child td { border-top: 0; }
.io td code { white-space: pre-wrap; overflow-wrap: anywhere; }
```

- [ ] **Step 4: 컴포넌트에 적용**

`ProblemPanel.tsx`: 인라인 style을 `className={styles.panel}`과 `<div className={styles.body}>`로 바꾼다.

`ProblemMeta.tsx`: 제목에 `styles.title`, 메타 줄을 `<p>` 하나에서 `<div className={styles.meta}>` 안의 `<span>` 나열로 바꾼다. 레벨은 `<span className={styles.lv}>Lv. {meta.level}</span>`.

`ExamplesTable.tsx`: `<table>`을 `<div className={styles.tableWrap}>`으로 감싸고 `className={styles.io}`를 준다. 셀 값은 `<code>{show(item)}</code>`로 감싼다.

`MarkdownView`는 `ProblemPanel`에서 `<div className={styles.md}>`로 감싼다.

- [ ] **Step 5: 통과 확인**

```
npm run typecheck && npm run build && npx playwright test
```

- [ ] **Step 6: 눈으로 확인** — 스크린샷으로 제목이 세리프로, 메타가 가운뎃점으로 구분되는지, 테이블이 카드로 보이는지 본다.

- [ ] **Step 7: 커밋**

```bash
git add src/features/problem tests/e2e/problem-panel.spec.ts
git commit -m "feat(ui): 문제 패널 타이포와 예시 테이블 스타일 적용"
```

---

## Task 6: 출력 패널 — 탭, 채점 마크, 점수, 터미널

**Files:**
- Create: `src/features/output/output.module.css`
- Modify: `OutputPanel.tsx`, `ResultsView.tsx`, `CaseItem.tsx`, `Summary.tsx`, `FatalError.tsx`, `TerminalView.tsx`
- Test: `tests/e2e/output-panel.spec.ts` (신규)

**Interfaces:**
- Consumes: Task 1 토큰, Task 2 `Button`, Task 3 `.pane`
- Produces: 없음

- [ ] **Step 1: 실패 테스트 작성** (Review Focus 2·3·5)

```ts
import { expect, test } from '@playwright/test';

const solution = (body: string) => `function solution(numbers) { ${body} }`;

test('다섯 상태의 칩이 서로 다른 색으로 렌더된다', async ({ page }) => {
  await page.goto('/');
  // 일부는 통과, 일부는 실패하도록
  await page.locator('.cm-content').fill(solution('return numbers[0] === 1 ? 12 : 0;'));
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await expect(page.getByText('1/3').first()).toBeVisible();

  const colors = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-status]')).map((el) => ({
      status: el.getAttribute('data-status'),
      chip: getComputedStyle(el.querySelector('[class*="chip"]') as HTMLElement).color,
    })),
  );
  const pass = colors.find((c) => c.status === 'pass');
  const fail = colors.find((c) => c.status === 'fail');
  expect(pass).toBeTruthy();
  expect(fail).toBeTruthy();
  expect(pass!.chip).not.toBe(fail!.chip);
});

test('긴 터미널 한 줄이 패널을 밀어내지 않는다', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').fill(solution("console.log('x'.repeat(5000)); return 0;"));
  await page.getByRole('button', { name: '테스트 실행' }).click();
  await page.getByRole('button', { name: '터미널' }).click();

  const doc = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(doc.scroll).toBeLessThanOrEqual(doc.client + 1);
});

test('제출 결과가 패널 안에서 스크롤된다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '제출' }).click();
  await expect(page.getByText(/\d+\/\d+/).first()).toBeVisible();

  const doc = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    client: document.documentElement.clientHeight,
  }));
  expect(doc.scroll).toBeLessThanOrEqual(doc.client + 1);
});
```

- [ ] **Step 2: 실패 확인**

```
npm run build && npx playwright test tests/e2e/output-panel.spec.ts
```

기대: 첫 테스트는 `data-status` 속성이 없어 FAIL.

- [ ] **Step 3: `output.module.css` 작성**

```css
.bar {
  display: flex; align-items: stretch; gap: 4px;
  height: 38px; flex: none;
  padding: 0 10px 0 4px;
  border-bottom: 1px solid var(--rule);
}
.tab {
  appearance: none; background: none; border: 0;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  padding: 0 10px;
  font-size: 13px; font-weight: 600; color: var(--ink-3);
  cursor: pointer;
}
.tab[aria-selected='true'] { color: var(--ink); border-bottom-color: var(--ink); }
.summaryCount { margin-left: auto; align-self: center; font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }

.body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.results { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 14px; }
.empty { padding: 18px; color: var(--ink-2); display: grid; gap: 8px; max-width: 60ch; line-height: 1.6; }

.cases { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.case { border: 1px solid var(--rule); border-radius: 8px; background: var(--sheet); }
.caseHead { display: flex; align-items: center; gap: 10px; padding: 7px 12px; min-height: 42px; }
.caseName { font-weight: 600; font-size: 14px; white-space: nowrap; }
.chip { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--sheet-2); color: var(--ink-3); white-space: nowrap; }
.case[data-status='pass'] .chip { color: var(--ok); background: var(--ok-wash); }
.case[data-status='fail'] .chip, .case[data-status='error'] .chip { color: var(--pen); background: var(--pen-wash); }
.case[data-status='timeout'] .chip { color: var(--warn); background: var(--warn-wash); }
.case[data-status='running'] .chip { color: var(--accent); background: var(--accent-wash); }
.hiddenTag { font-size: 11px; color: var(--ink-3); border: 1px dashed var(--rule-strong); padding: 0 6px; border-radius: 4px; }
.time { margin-left: auto; font-family: var(--f-code); font-size: 12px; color: var(--ink-3); font-variant-numeric: tabular-nums; }

/* 빨간 펜 채점 마크 */
.mark { width: 24px; height: 24px; position: relative; flex: none; }
.mark::before { content: ''; position: absolute; }
.case[data-status='pending'] .mark::before { left: 9px; top: 9px; width: 6px; height: 6px; border-radius: 50%; background: var(--rule-strong); }
.case[data-status='running'] .mark::before { inset: 4px; border-radius: 50%; border: 2px solid var(--accent-wash); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
.case[data-status='pass'] .mark::before {
  inset: 1px; border: 2.5px solid var(--pen);
  border-radius: 50% 44% 54% 47%; transform: rotate(-14deg); animation: ink 0.22s ease-out;
}
.case[data-status='fail'] .mark::before,
.case[data-status='error'] .mark::before,
.case[data-status='timeout'] .mark::before {
  left: 1px; right: 1px; top: 10.5px; height: 3px; border-radius: 2px;
  background: var(--pen); transform: rotate(-58deg); animation: ink 0.22s ease-out;
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes ink { from { opacity: 0; transform: rotate(-14deg) scale(0.6); } }

.detail { margin: 0; padding: 2px 12px 12px 46px; display: grid; gap: 6px; }
.detail > div { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 10px; align-items: baseline; }
.detail dt { font-size: 12px; color: var(--ink-3); }
.detail dd { margin: 0; min-width: 0; }
.detail pre { font-family: var(--f-code); font-size: 13px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; background: var(--sheet-2); padding: 6px 9px; border-radius: 6px; max-height: 180px; overflow: auto; }

/* 손글씨 점수 */
.summary { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; min-height: 48px; }
.score { font-family: var(--f-pen); color: var(--pen); font-size: 46px; line-height: 0.9; transform: rotate(-4deg); padding: 4px 10px 0; white-space: nowrap; }
.scorePerfect { position: relative; }
.scorePerfect::before {
  content: ''; position: absolute; inset: -6px -6px -4px;
  border: 2.5px solid var(--pen); border-radius: 50% 46% 52% 48%; transform: rotate(-5deg);
}
.summaryText { display: grid; gap: 2px; }
.summarySub { font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }

.fatal { border: 1px solid var(--pen-line); background: var(--pen-wash); border-radius: 8px; padding: 14px 16px; display: grid; gap: 8px; }
.fatalTitle { margin: 0; font-weight: 700; color: var(--pen); font-size: 15px; }
.fatal pre { margin: 0; font-family: var(--f-code); font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ink); }

/* 터미널: pre가 패널을 밀지 않도록 컨테이너가 스크롤을 흡수한다 */
.terminal { background: var(--term-bg); height: 100%; overflow: auto; }
.terminalText {
  margin: 0; padding: 12px 14px 16px;
  font-family: var(--f-code); font-size: 13px; line-height: 1.55;
  color: var(--term-fg); white-space: pre; tab-size: 4; min-width: 0;
}
```

- [ ] **Step 4: 컴포넌트 적용**

`CaseItem.tsx`가 핵심이다. 루트에 `data-status`를 심고 마크·칩·시간을 배치한다.

```tsx
export function CaseItem({ index, item }: { index: number; item: { status: CaseStatus; hidden: boolean; result?: CaseResult } }) {
  return (
    <li className={styles.case} data-status={item.status}>
      <div className={styles.caseHead}>
        <span className={styles.mark} aria-hidden />
        <span className={styles.caseName}>#{index + 1}</span>
        <span className={styles.chip}>{label(item.status)}</span>
        {item.hidden ? <span className={styles.hiddenTag}>숨김</span> : null}
        {item.result?.timeMs != null ? <span className={styles.time}>{Math.round(item.result.timeMs)}ms</span> : null}
      </div>
      {item.result?.actual || item.result?.error ? (
        <dl className={styles.detail}>
          {item.result.actual ? (<div><dt>결과</dt><dd><pre>{item.result.actual}</pre></dd></div>) : null}
          {item.result.error ? (<div><dt>오류</dt><dd><pre>{item.result.error.name}: {item.result.error.message}</pre></dd></div>) : null}
        </dl>
      ) : null}
    </li>
  );
}
```

`ResultsView.tsx`는 `<div className={styles.results}>` 안에 `<ul className={styles.cases}>`로 감싼다. 빈 상태는 `styles.empty`.

`Summary.tsx`는 점수를 손글씨로:

```tsx
const perfect = report.total > 0 && report.passed === report.total;
<div className={styles.summary}>
  {typeof report.score === 'number' ? (
    <span className={`${styles.score} ${perfect ? styles.scorePerfect : ''}`}>{report.score}점</span>
  ) : null}
  <div className={styles.summaryText}>
    <strong>{report.passed}/{report.total} 통과</strong>
    {report.cancelled ? <span className={styles.summarySub}>중지됨</span> : null}
  </div>
</div>
```

`TerminalView.tsx`는 스크롤 컨테이너와 `<pre>`를 분리한다. 지금은 `<pre>` 자체가 스크롤러라 긴 줄이 패널을 민다.

```tsx
<div ref={ref} className={styles.terminal}>
  <pre className={styles.terminalText}>
    {lines.map((line, idx) => <div key={idx}>{line.text}</div>)}
    <div>$</div>
  </pre>
</div>
```
`ref`의 타입을 `HTMLDivElement`로 바꾼다.

`OutputPanel.tsx`는 탭 버튼에 `className={styles.tab}`과 `aria-selected`를 주고, 바를 `styles.bar`, 본문을 `styles.body`로 감싼다. '지우기'는 `<Button variant="ghost">`.

`FatalError.tsx`는 `styles.fatal` / `styles.fatalTitle` 적용.

- [ ] **Step 5: 통과 확인**

```
npm run typecheck && npm run test && npm run build && npx playwright test
```

- [ ] **Step 6: 눈으로 확인** — 테스트를 실행해 통과/실패 마크가 빨간 펜 모양으로 나오는지, 제출 후 점수가 손글씨로 기울어 나오는지 본다.

- [ ] **Step 7: 커밋**

```bash
git add src/features/output tests/e2e/output-panel.spec.ts
git commit -m "feat(ui): 채점 결과에 빨간 펜 마크와 손글씨 점수 적용"
```

---

## Task 7: 상단바, 액션바, 모바일 탭

**Files:**
- Modify: `ProblemPicker.tsx`, `ActionBar.tsx`, `MobileTabs.tsx`, `EditorPanel.tsx`, `LintStatus.tsx`
- Create: `src/features/workspace/chrome.module.css`
- Test: `tests/e2e/theme.spec.ts` (추가)

**Interfaces:**
- Consumes: Task 1 토큰, Task 2 `Button`
- Produces: 없음

- [ ] **Step 1: 포커스 링 실패 테스트 추가** (Review Focus 4)

```ts
test('Tab으로 이동하면 포커스 링이 보인다', async ({ page }) => {
  await page.goto('/');
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
```

- [ ] **Step 2: 실패 확인**

```
npm run build && npx playwright test tests/e2e/theme.spec.ts
```

Task 1에서 전역 `:focus-visible`을 넣었으므로 통과할 수도 있다. 통과하면 회귀 방지용으로 남기고 Step 3으로 간다.

- [ ] **Step 3: `chrome.module.css` 작성**

```css
.topbar { display: flex; align-items: center; gap: 14px; min-height: 38px; flex: none; }
.brandName { font-weight: 700; font-size: 15px; white-space: nowrap; letter-spacing: -0.01em; }
.brandLang { font-family: var(--f-code); font-size: 12px; color: var(--ink-3); white-space: nowrap; }

.picker { margin-left: auto; position: relative; min-width: 0; }
.picker::after {
  content: ''; position: absolute; right: 13px; top: 50%;
  width: 7px; height: 7px;
  border-right: 1.5px solid var(--ink-2); border-bottom: 1.5px solid var(--ink-2);
  transform: translateY(-70%) rotate(45deg); pointer-events: none;
}
.picker select {
  appearance: none; font-size: 14px; font-weight: 500; max-width: 100%;
  padding: 7px 34px 7px 12px;
  border: 1px solid var(--rule-strong); border-radius: 8px;
  background: var(--sheet); color: var(--ink); cursor: pointer;
}
.picker select:disabled { opacity: 0.6; cursor: progress; }

.actions { display: flex; align-items: center; gap: 8px; flex: none; }
.grow { flex: 1; }
.kbdHint { font-size: 12px; color: var(--ink-3); white-space: nowrap; }
.kbdHint kbd {
  font-family: var(--f-code); font-size: 11px;
  border: 1px solid var(--rule-strong); border-bottom-width: 2px;
  border-radius: 4px; padding: 0 5px; background: var(--sheet); color: var(--ink-2);
}

.editorBar {
  display: flex; align-items: center; gap: 4px; height: 38px; flex: none;
  padding: 0 10px 0 4px; border-bottom: 1px solid var(--rule);
}
.fileTab {
  display: inline-flex; align-items: center; gap: 8px; height: 100%; padding: 0 10px;
  font-family: var(--f-code); font-size: 13px; font-weight: 500;
  border-bottom: 2px solid var(--accent); margin-bottom: -1px;
}
.lint { margin-left: auto; font-size: 12px; color: var(--ink-3); display: inline-flex; align-items: center; gap: 6px; }
.lint::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--ok); flex: none; }
.lint[data-state='error'] { color: var(--pen); }
.lint[data-state='error']::before { background: var(--pen); }

.mobileTabs { display: flex; gap: 3px; padding: 3px; background: var(--sheet-2); border: 1px solid var(--rule); border-radius: 10px; flex: none; }
.mobileTabs button {
  flex: 1; height: 34px; border: 0; border-radius: 7px; background: transparent;
  font-size: 14px; font-weight: 600; color: var(--ink-2); cursor: pointer;
}
.mobileTabs button[aria-selected='true'] { background: var(--sheet); color: var(--ink); box-shadow: 0 1px 2px var(--shadow); }
```

- [ ] **Step 4: 컴포넌트 적용**

`ProblemPicker.tsx`: `<header className={styles.topbar}>`에 브랜드 두 줄(`코딩테스트 연습장` / `JavaScript · Node 스타일 채점`)과 `<label className={styles.picker}>`로 감싼 select.

`ActionBar.tsx`: raw `<button>`을 `Button`으로 바꾼다. 초기화는 `variant="ghost"`, 테스트 실행/중지는 `default`, 제출은 `primary`. 단축키 힌트는 `<kbd>` 사용.

```tsx
<footer className={styles.actions}>
  <Button variant="ghost" onClick={...}>{confirmReset ? '정말 초기화?' : '초기화'}</Button>
  <span className={styles.kbdHint}><kbd>Ctrl</kbd> + <kbd>Enter</kbd> 테스트 실행</span>
  <span className={styles.grow} />
  {phase === 'running'
    ? <Button onClick={onStop}>중지</Button>
    : <Button onClick={onRunTest}>테스트 실행</Button>}
  <Button variant="primary" onClick={onSubmit} disabled={phase === 'running'}>제출</Button>
</footer>
```

`MobileTabs.tsx`: `aria-selected`와 `role="tab"`을 붙이고 `styles.mobileTabs` 적용.

`EditorPanel.tsx`: 헤더를 `styles.editorBar` + `styles.fileTab`(`solution.js`)로, 하단의 `problem.meta.id` 줄은 제거한다(목업에 없고 공간만 차지한다).

`LintStatus.tsx`: `data-state`를 내보내 점 색이 바뀌게 한다.

```tsx
const err = checkSyntax(code);
return (
  <span className={styles.lint} data-state={err ? 'error' : 'ok'}>
    {err ? `${err.line}번째 줄: ${err.message}` : '문법 오류 없음'}
  </span>
);
```

- [ ] **Step 5: 통과 확인**

```
npm run typecheck && npm run test && npm run build && npx playwright test
```

전체 e2e가 통과해야 한다. `basic.spec.ts`가 '테스트 실행' 버튼 이름으로 찾으므로 라벨을 바꾸지 않는다.

- [ ] **Step 6: 눈으로 확인 — 데스크톱과 모바일 둘 다**

```
npx playwright screenshot --viewport-size=1600,900 ... /tmp/t7-desktop.png
npx playwright screenshot --viewport-size=390,844  ... /tmp/t7-mobile.png
```

모바일에서 탭이 세그먼트로 보이고 버튼이 넘치지 않는지 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add src/features/workspace src/features/editor tests/e2e/theme.spec.ts
git commit -m "feat(ui): 상단바·액션바·모바일 탭 스타일 적용"
```

---

## 마무리

- [ ] 전체 게이트 실행: `npm run typecheck && npm run lint && npm run verify:problems && npm run test && npm run build && npm run test:e2e`
- [ ] `src/` 전체에서 `--bg` / `--fg` / `--border` 잔존 사용처를 grep해 `--paper` / `--ink` / `--rule`로 치환
- [ ] 데스크톱·모바일 스크린샷을 최종 확인
- [ ] 스펙 7절의 `--ink-3` 대비(4.5:1) 확인, 미달이면 보조 텍스트용 값을 한 단계 밝게 조정
