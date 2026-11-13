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
 * (주소창 편집·공유 링크·새로고침)는 목록을 거치지 않았으므로 넘겨받은
 * state가 없다 — 그럴 때는 필터 없는 `/`로 간다.
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
      <span className={styles.title}>{title}</span>
      <Link className={styles.back} to={backTo}>
        ← 목록
      </Link>
    </header>
  );
}
