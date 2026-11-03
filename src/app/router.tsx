import { createHashRouter, Navigate } from 'react-router-dom';
import { repository } from './services';
import { AppShell } from './AppShell';
import { IdePage } from '@/features/workspace/IdePage';
import { ProblemListPage } from '@/features/problems/ProblemListPage';
import { ProblemNotFoundError } from '@/problems/localRepository';

export const router = createHashRouter([
  {
    element: <AppShell />,
    errorElement: <NotFound />,
    children: [
      {
        path: '/',
        loader: () => repository.list(),
        element: <ProblemListPage />,
      },
      {
        path: '/problems/:id',
        loader: async ({ params }) => {
          const id = params.id;
          if (!id) throw new ProblemNotFoundError('');
          const problem = await repository.get(id);
          return { problem };
        },
        element: <IdePage />,
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

function NotFound() {
  return <div style={{ padding: 16 }}>문제를 찾을 수 없습니다.</div>;
}
