# mini-judge UI 디자인 시스템

작성일: 2026-10-27

## 배경

레이아웃 버그(커밋 `2994025`)를 고쳐 비율은 정상이 됐지만, 화면은 여전히 브라우저
기본값 그대로다. `tokens.css`에 색 변수가 3개(`--bg`, `--fg`, `--border`)뿐이고,
간격·타이포·상태색·radius가 없다. 스타일 대부분이 컴포넌트 안에 인라인
`style={{ padding: 8 }}`로 박혀 있어 `:hover`, `:focus-visible`, `:disabled`를
표현할 수 없다. CodeMirror에는 `theme` prop이 없어 기본 라이트 테마가 적용되고,
다크 배경 위에서 괄호와 연산자가 배경색에 묻혀 코드가 읽히지 않는다.

## 목표

아티팩트 `KELeNQQq68XbhWaFWRisTe`("JS 코딩테스트 연습장")의 비주얼 언어를 이
저장소에 이식한다. 그 목업은 단순한 다크 테마가 아니라 **시험지 채점 메타포**를
가진 완성된 디자인이다 — 통과는 빨간 펜 동그라미, 실패는 사선, 점수는 손글씨.
목업의 CSS와 토큰은 가져오되, 구현(CodeMirror 5, 자체 워커 하네스, 마크다운
파서)은 가져오지 않는다. 그쪽은 이 저장소의 것이 이미 더 낫다.

다크 전용으로 간다. 라이트 테마와 `prefers-color-scheme` 분기는 제거한다.
이에 딸린 기계장치도 함께 걷어낸다 — `uiStore`의 `theme` 상태와 `setTheme`
(호출처가 없다), `AppShell`이 `<html>`에 `data-theme`을 심는 효과, 그리고
`tokens.css`의 `[data-theme='dark']` 블록이 전부 의미를 잃는다.

## 성공 기준

- 레이아웃 기하 테스트(`tests/e2e/layout.spec.ts`) 4개가 계속 통과한다
- 다크 배경에서 코드의 모든 토큰이 배경과 구분된다
- 버튼에 primary / default / ghost 위계가 있고 hover·focus·disabled가 보인다
- 채점 결과가 통과/실패/시간초과/에러를 색과 마크로 구분해 보여준다
- 새 런타임 의존성이 없다

## 비목표

- 라이트 테마
- 레퍼런스에 보이는 새 기능(제출 내역, 테스트 케이스 추가, 에디터 설정)
- 번들 크기 최적화 (별도 작업)

---

## 1. 토큰 레이어

`src/styles/tokens.css`를 목업의 다크 팔레트로 교체한다. 라이트 값과 미디어쿼리
분기는 삭제하고 `:root` 하나만 남긴다.

```css
:root {
  color-scheme: dark;

  /* 표면 */
  --paper: #0d1218;      /* 앱 배경 */
  --sheet: #151c25;      /* 패널 표면 */
  --sheet-2: #1b2430;    /* 보조 표면: 테이블 헤더, 코드 칩, pre */

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
  --pen: #ff5f6b;        /* 빨간 펜 / 오류 */
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
}
```

기존 `--bg` / `--fg` / `--border`는 사용처가 남아 있으므로, 각 컴포넌트를 옮길
때마다 `--paper` / `--ink` / `--rule`로 치환하고 마지막에 세 변수를 삭제한다.

## 2. 타이포그래피

역할 네 개. 색과 같은 자리(`tokens.css`의 `:root`)에 토큰으로 둔다. 모두
`@fontsource`로 이미 설치돼 있어 추가 의존성이 없다. 앞서 `nanum-pen-script`와
`noto-serif-kr`을 미사용으로 판단했으나, 목업에서 각각 점수 표시와 문제 제목에
쓰인다. 제거하지 않는다.

```css
--f-ui:    "IBM Plex Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif;
--f-title: "Noto Serif KR", Georgia, serif;
--f-code:  "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
--f-pen:   "Nanum Pen Script", cursive;
```

| 역할 | 토큰 | 쓰임 |
|---|---|---|
| 본문 | `--f-ui` | 전역 기본 |
| 제목 | `--f-title` | 문제 제목(`h1`) 24px/1.35 |
| 코드·수치 | `--f-code` | 에디터, 터미널, 파일 탭, 테이블 헤더, 소요 시간, `kbd` |
| 점수 | `--f-pen` | 채점 점수 46px, `rotate(-4deg)` |

본문 15px / `line-height: 1.75`, 보조 13px, 캡션 12px.
수치에는 `font-variant-numeric: tabular-nums`를 적용해 자릿수가 흔들리지 않게 한다.

## 3. 레이아웃 셸

패널을 카드로 만든다.

- `.pane`: `background: var(--sheet)`, `border: 1px solid var(--rule)`,
  `border-radius: 10px`, `overflow: hidden`, `min-height/min-width: 0`
- 앱 셸: `gap: 10px`, `padding-block: 10px 12px`,
  `padding-inline: max(16px, env(safe-area-inset-left/right, 0px))`
- 상단바 `min-height: 38px`, 패널 헤더(에디터 바 / 출력 바) `height: 38px`

리사이즈는 **`react-resizable-panels`을 그대로 쓴다.** 커밋 `2994025`에서
`orientation`과 퍼센트 크기를 바로잡았으므로 동작은 정상이다. 목업은 자체 CSS
Grid 스플리터를 쓰지만 그쪽으로 갈아탈 이유가 없다. `Separator`에 목업의 그립
표시만 입힌다.

```css
.separatorV::before { width: 3px;  height: 40px; }
.separatorH::before { width: 40px; height: 3px;  }
/* 평소 --rule-strong, hover/dragging/focus-visible 시 --accent */
```

전역 포커스 링: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`
그리고 `prefers-reduced-motion` 블록으로 애니메이션을 끈다.

## 4. 에디터 테마 (가장 손이 많이 가는 부분)

목업은 CodeMirror **5**를 쓴다. 색이 `.cm-keyword`, `.cm-def` 같은 클래스에
직접 걸려 있다. 이 저장소는 `@uiw/react-codemirror`를 통한 CodeMirror **6**이고,
테마 API가 다르다. 색값은 가져오되 구현은 새로 쓴다.

**필요한 의존성 승격.** `@uiw/react-codemirror`는 `@codemirror/view`와
`@codemirror/state`를 재노출하므로 `EditorView`는 그대로 쓸 수 있다. 그러나
`HighlightStyle` / `syntaxHighlighting`(`@codemirror/language`)과
`tags`(`@lezer/highlight`)는 재노출하지 않는다. 둘 다 transitive로는 설치돼
있으므로, 커밋 `16185e7`에서 `@codemirror/commands`에 했던 것과 같이
`package.json`과 `package-lock.json`의 루트 `dependencies` 양쪽에 추가한다.
한쪽만 고치면 CI의 `npm ci`가 락 불일치로 실패한다.

- `@codemirror/language` `^6.13.1`
- `@lezer/highlight` `^1.2.5`

**기본 하이라이트와의 충돌.** `@uiw/react-codemirror`는 `basicSetup`을 기본
활성화하고, 거기에 `syntaxHighlighting(defaultHighlightStyle, { fallback: true })`이
포함된다. `fallback: true`는 다른 하이라이트 스타일이 없을 때만 적용된다는
뜻이므로, fallback이 아닌 우리 스타일을 등록하면 우선한다. 적용 후 실제로
우리 색이 나오는지 스크린샷으로 확인한다.

`src/features/editor/theme.ts`를 만들어 두 가지를 내보낸다.

1. `EditorView.theme({...}, { dark: true })` — 에디터 크롬:
   배경 `--code-bg`, 거터 배경/우측 보더, 줄번호 `--ink-3` + `tabular-nums`,
   커서 `2px solid var(--accent)`, 선택 영역 `--sel`, 활성 줄,
   매칭 괄호(`--sel` 배경 + radius 2px)
2. `HighlightStyle.define([...])` — Lezer 태그 → 색 매핑

CM5 클래스에서 CM6 태그로의 대응:

| CM5 | CM6 태그 | 토큰 |
|---|---|---|
| `cm-keyword` | `tags.keyword`, `tags.controlKeyword`, `tags.moduleKeyword` | `--tok-kw` |
| `cm-def` | `tags.definition(tags.variableName)`, `tags.function(tags.variableName)` | `--tok-def` |
| `cm-variable-2` | `tags.variableName` | `--tok-var2` |
| `cm-string` | `tags.string`, `tags.special(tags.string)` | `--tok-str` |
| `cm-number` | `tags.number` | `--tok-num` |
| `cm-atom` | `tags.bool`, `tags.null`, `tags.atom` | `--tok-atom` |
| `cm-property` | `tags.propertyName` | `--tok-prop` |
| `cm-comment` | `tags.comment` (italic) | `--tok-comment` |
| `cm-operator` | `tags.operator`, `tags.punctuation` | `--ink-2` |

`cm-operator`가 `--ink-2`라는 점이 중요하다. 지금 괄호와 연산자가 안 보이는
직접적 원인이 이 자리의 색이 없기 때문이다.

CSS 변수를 CM6 테마 객체에서 `var(--tok-kw)` 문자열로 참조할 수 있으므로,
팔레트는 `tokens.css` 한 곳에만 둔다.

문법 오류 표시(`--err-wash` 줄 배경, `--pen` 물결 밑줄)는 기존 `linter` 확장에
맞춰 스타일만 얹는다.

## 5. 컴포넌트 프리미티브

반복되는 것만 뽑는다. 나머지는 컴포넌트별 `*.module.css`.

**`src/ui/Button.tsx`** — `variant: 'primary' | 'default' | 'ghost'`
높이 40px, `padding: 0 16px`, `radius 8px`, 14px/600.
- `default`: `--sheet` 배경, `--rule-strong` 테두리, hover 시 테두리 `--ink-3`
- `primary`: `--accent` 배경, `--accent-ink` 글자, hover `brightness(1.06)`
- `ghost`: 투명, `--ink-2`, `padding: 0 10px`; 초기화 확인 상태에서 `--pen`
- `:disabled`: `opacity: .55`, `cursor: progress`

**탭** — 하단 2px 보더 인디케이터. 비활성 `--ink-3`, 활성 `--ink` + 보더.
에디터 파일 탭은 `--accent` 보더에 `--f-code`.

**칩** — 12px/600, `padding: 2px 8px`, `radius: 999px`.
상태별: pass `--ok`/`--ok-wash`, fail·error `--pen`/`--pen-wash`,
timeout `--warn`/`--warn-wash`, running `--accent`/`--accent-wash`.

**채점 마크** — 24px 정사각 안의 가상 요소.
- 통과: `border: 2.5px solid var(--pen)`, `border-radius: 50% 44% 54% 47%`,
  `rotate(-14deg)` — 일부러 비뚤어진 손그림 동그라미
- 실패·에러·시간초과: 3px 막대, `rotate(-58deg)` 사선
- 대기: 6px 점 / 진행: 회전 스피너
- 등장 시 `ink` 키프레임(0.22s)

**점수** — `--f-pen` 46px, `--pen`, `rotate(-4deg)`.
만점이면 `::before`로 비뚤어진 원을 두른다.

## 6. 적용 범위

| 파일 | 작업 |
|---|---|
| `src/styles/tokens.css` | 전면 교체 |
| `src/styles/global.css` | 다크 전용, 폰트 역할, 포커스 링, reduced-motion |
| `src/app/AppShell.tsx` | `data-theme` 설정 효과 제거 |
| `src/stores/uiStore.ts` | `theme` / `setTheme` / `partialize` 제거 |
| `src/features/workspace/workspace.module.css` | 앱 셸, 패널 카드, 스플리터 그립 |
| `src/features/workspace/IdePage.tsx` | 패널에 `.pane` 적용 |
| `src/features/workspace/ProblemPicker.tsx` | 브랜드 + 커스텀 select |
| `src/features/workspace/ActionBar.tsx` | Button 프리미티브, `kbd` 힌트 |
| `src/features/workspace/MobileTabs.tsx` | 세그먼트 탭 |
| `src/features/problem/*` | 제목·메타·마크다운·예시 테이블 |
| `src/features/editor/CodeEditor.tsx` | `theme` prop 연결 |
| `src/features/editor/EditorPanel.tsx` | 파일 탭 + 문법 상태 표시 |
| `src/features/output/*` | 탭 바, 케이스 카드, 마크, 점수, 터미널, 치명적 오류 |
| `src/ui/Button.tsx` (신규) | 버튼 프리미티브. 기능 간 공용이라 `src/features/` 밖에 새 최상위 폴더로 둔다 |
| `src/features/editor/theme.ts` (신규) | CM6 테마 + 하이라이트 |
| `package.json` · `package-lock.json` | `@codemirror/language`, `@lezer/highlight` 직접 의존성 추가 |

`global.css`에는 현재 `th, td { border: 1px solid var(--border); padding: 6px; }`
라는 전역 규칙이 있어 예시 테이블 스타일과 충돌한다. 1단계에서 이 규칙을
제거하고, 테이블 스타일은 3단계의 예시 테이블 쪽으로 옮긴다.

## 7. 검증

- `tests/e2e/layout.spec.ts` 4개가 계속 통과해야 한다 (기하는 변하지 않음)
- 에디터 토큰 대비를 e2e로 검증한다. CM6의 하이라이트 클래스는 자동 생성
  이름이라 선택자로 특정할 수 없으므로, `.cm-line` 안의 모든 자식 `span`을
  순회하며 `getComputedStyle(el).color`를 모아 에디터 배경(`--code-bg`)과의
  채널별 차이를 구하고, **모든 토큰이 배경과 최소 거리 이상 떨어져 있는지**
  확인한다. 지금처럼 연산자가 배경에 묻히면 이 테스트가 실패한다. 현재 상태에
  대해 먼저 돌려 red를 확인한 뒤 테마를 적용한다
- 단계마다 Playwright 스크린샷을 찍어 **실제로 눈으로 확인한다.**
  이번 사태의 원인이 아무도 화면을 보지 않은 것이었다
- 유닛 테스트 22개와 타입체크는 계속 통과해야 한다
- 보조 텍스트 `--ink-3`(#6e7b8d)이 패널 배경 `--sheet`(#151c25) 위에서 WCAG AA
  본문 기준(4.5:1)에 미치는지 확인한다. 미달이면 보조 텍스트 전용으로 한 단계
  밝은 값을 두되, 테두리·구분선 용도의 `--ink-3` 사용처는 그대로 둔다

## 8. 단계 구분

패널 단위로 나눠 적용하고 각 단계에서 스크린샷으로 확인한다.

1. 토큰 + 전역 + 앱 셸 (패널 카드, 스플리터)
2. 에디터 테마 (CM6 포팅) — 가장 큰 덩어리, 단독 단계
3. 문제 패널 (제목, 메타, 마크다운, 예시 테이블)
4. 출력 패널 (탭, 케이스 카드, 채점 마크, 점수, 터미널)
5. 액션 바 + 문제 선택기 + 모바일 탭
