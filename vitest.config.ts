import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    // 기본값(false)은 *.module.css import를 "어떤 키든 이름을 돌려주는" 프록시로
    // 바꾼다. 그러면 styles.foo가 규칙 존재 여부와 무관하게 참이라 클래스 단언이
    // 전부 항진명제가 된다. 실제 해시 이름을 받도록 모듈만 처리한다.
    css: { include: [/\.module\./] },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
