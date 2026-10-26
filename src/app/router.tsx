import { createHashRouter, Navigate, redirect } from 'react-router-dom';
import { repository } from './services';
import { AppShell } from './AppShell';
import { IdePage } from '@/features/workspace/IdePage';
import { ProblemNotFoundError } from '@/problems/localRepository';

export const router = createHashRouter([
  {
    element: <AppShell />,
    errorElement: <NotFound />,
    children: [
      {
        path: '/',
        loader: async () => {
          const list = await repository.list();
          if (!list.length) throw new Error('문제가 없습니다');
          throw redirect(`/problems/${list[0].id}`);
        },
      },
      {
        path: '/problems/:id',
        loader: async ({ params }) => {
          const list = await repository.list();
          const id = params.id;
          if (!id) throw new ProblemNotFoundError('');
          const problem = await repository.get(id);
          return { problem, list };
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
