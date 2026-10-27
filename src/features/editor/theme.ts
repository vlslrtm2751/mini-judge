import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorView } from '@uiw/react-codemirror';
import type { Extension } from '@uiw/react-codemirror';

/**
 * 에디터 크롬. 색은 모두 tokens.css의 변수를 참조하므로 팔레트의 출처는
 * 한 곳으로 유지된다.
 */
export const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--code-bg)',
      color: 'var(--ink)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'var(--f-code)',
      fontSize: '14px',
      lineHeight: '1.6',
      caretColor: 'var(--accent)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--code-bg)',
      color: 'var(--ink-3)',
      borderRight: '1px solid var(--rule)',
      fontVariantNumeric: 'tabular-nums',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(112, 150, 255, 0.06)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ink-2)' },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--accent)',
      borderLeftWidth: '2px',
    },
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

/**
 * 구문 색. 목업(CodeMirror 5)의 .cm-keyword 같은 클래스를 CM6의 Lezer 태그로
 * 옮긴 것이다. 마지막 항목이 핵심 — 연산자와 괄호에 색이 없어서 다크 배경에
 * 묻혀 보이지 않던 것이 원래 증상이었다.
 */
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

/**
 * 구문 하이라이트만 담는다. 크롬(editorTheme)은 extensions가 아니라
 * CodeMirror의 `theme` prop으로 넘겨야 한다 — @uiw/react-codemirror의 theme
 * 기본값이 'light'라서, extensions에 넣으면 defaultLightThemeOption이 이겨
 * 에디터 배경이 흰색으로 남는다.
 */
export const editorHighlight: Extension = syntaxHighlighting(highlight);
