import { useNavigate } from 'react-router-dom';
import type { ProblemId, ProblemMeta } from '@/domain/types';
import styles from './chrome.module.css';

export function ProblemPicker({
  list,
  selected,
  disabled,
}: {
  list: ProblemMeta[];
  selected: ProblemId;
  disabled: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>코딩테스트 연습장</span>
        <span className={styles.brandLang}>JavaScript · Node 스타일 채점</span>
      </div>
      <label className={styles.picker}>
        <span className="sr-only">문제 선택</span>
        <select disabled={disabled} value={selected} onChange={(e) => navigate(`/problems/${e.target.value}`)}>
          {list.map((p) => (
            <option value={p.id} key={p.id}>
              Lv.{p.level} · {p.title}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
