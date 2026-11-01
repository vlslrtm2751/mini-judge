import { describe, expect, it } from 'vitest';
import { serializeError } from '@/runner/serializeError';

/** 주어진 스택을 가진 Error를 만든다. 브라우저별 스택 형식을 재현하기 위함. */
function errorWith(name: string, message: string, stack: string): Error {
  const err = new Error(message);
  err.name = name;
  err.stack = stack;
  return err;
}

describe('serializeError', () => {
  it('V8의 헤더 줄을 버리고 프레임만 남긴다', () => {
    const info = serializeError(
      errorWith(
        'TypeError',
        'numbers.fliter is not a function',
        ['TypeError: numbers.fliter is not a function', '    at solution (solution.js:2:18)', '    at solution.js:6:1'].join(
          '\n',
        ),
      ),
    );

    expect(info.name).toBe('TypeError');
    expect(info.frames[0]).toContain('solution.js:2:18');
    expect(info.line).toBe(2);
    expect(info.column).toBe(18);
  });

  it('Firefox처럼 첫 줄부터 프레임인 스택에서 그 프레임을 잃지 않는다', () => {
    // Firefox/Safari의 stack에는 "Error: message" 헤더가 없다. 첫 줄을 무조건
    // 버리면 오류가 난 바로 그 자리를 잃고, 다음 프레임의 줄 번호가 보고된다.
    const info = serializeError(
      errorWith(
        'TypeError',
        'numbers.fliter is not a function',
        ['solution@solution.js:2:18', '@solution.js:6:1'].join('\n'),
      ),
    );

    expect(info.frames[0], `첫 프레임 유실: ${JSON.stringify(info.frames)}`).toContain('solution.js:2:18');
    expect(info.line).toBe(2);
    expect(info.column).toBe(18);
  });

  it('Safari의 global code 프레임도 유지한다', () => {
    const info = serializeError(
      errorWith('ReferenceError', 'x is not defined', ['solution@solution.js:3:5', 'global code@solution.js:8:1'].join('\n')),
    );

    expect(info.frames[0]).toContain('solution.js:3:5');
    expect(info.line).toBe(3);
  });

  it('Error가 아닌 값을 던지면 thrown으로 담는다', () => {
    const info = serializeError({ code: 42 });
    expect(info.thrown).toContain('42');
    expect(info.frames).toEqual([]);
  });
});
