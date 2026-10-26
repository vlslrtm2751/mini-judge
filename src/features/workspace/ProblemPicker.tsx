import { useNavigate } from 'react-router-dom';
import type { ProblemId, ProblemMeta } from '@/domain/types';

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
    <header style={{ display: 'flex', gap: 12, padding: 8, borderBottom: '1px solid var(--border)' }}>
      <strong>mini judge</strong>
      <select disabled={disabled} value={selected} onChange={(e) => navigate(`/problems/${e.target.value}`)}>
        {list.map((p) => (
          <option value={p.id} key={p.id}>
            {p.id} - {p.title}
          </option>
        ))}
      </select>
    </header>
  );
}
