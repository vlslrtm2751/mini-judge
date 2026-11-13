import { Link, useLocation } from 'react-router-dom';
import styles from './chrome.module.css';

/**
 * `ProblemPicker`(select)를 대체한다. 문제를 고르는 일은 이제 목록 화면이
 * 하므로 여기서는 지금 보고 있는 문제 제목만 글자로 보여주고, "← 목록"
 * 링크로 목록 화면에 돌아간다.
 *
 * "← 목록"은 보던 목록 상태를 들고 간다(스펙 176행) — 목록의 행 `<Link>`가
 * `state={{ listSearch: location.search }}`를 싣고(`ProblemListPage.tsx`),
 * 여기서 그 state를 읽어 그대로 돌려준다. 문제 URL로 직접 들어온 경우
 * (주소창 편집·공유 링크·새 탭)는 목록을 거치지 않았으므로 넘겨받은 state가
 * 없다 — 그럴 때는 필터 없는 `/`로 간다.
 *
 * 새로고침은 여기 해당하지 않는다 — `history.state`가 새로고침을 견디므로
 * 목록에서 들어온 뒤 새로고침해도 필터는 그대로 돌아온다(실측 확인). 그게
 * 맞는 동작이기도 하다: 그 사람은 실제로 목록에서 왔다.
 */
/*
 * 의도적으로 버린 동작: 예전 `ProblemPicker`의 select는 채점 중
 * (`runState.phase === 'running'`)이면 disabled였다. 링크에는 그 대응물을 두지
 * 않았다 — 채점 도중에도 목록으로 나갈 수 있고, 그때 실행은 조용히 취소된다.
 * 안전한 것은 확인했다: `useRun`이 언마운트 때 컨트롤러를 abort하고
 * (`useRun.ts`의 cleanup), "← 목록"은 `/`를 거쳐 `IdePage`를 언마운트시키며,
 * 취소된 실행은 `record()`를 건너뛰므로 엉뚱한 진척도가 쓰이지 않는다.
 */
export function WorkspaceHeader({ title }: { title: string }) {
  const location = useLocation();
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch;
  const backTo = listSearch ? `/${listSearch}` : '/';

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>코딩테스트 연습장</span>
        <span className={styles.brandLang}>JavaScript · Node 스타일 채점</span>
      </div>
      <span className={styles.problemTitle}>{title}</span>
      <Link className={styles.backLink} to={backTo}>
        ← 목록
      </Link>
    </header>
  );
}
