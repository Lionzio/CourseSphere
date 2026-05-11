// frontend/src/__tests__/AdminPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AdminPanel } from '../pages/AdminPanel';
import { useAuthStore } from '../stores/auth';
import toast from 'react-hot-toast';

// Mock das dependências externas
vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock do recharts: evita erro de 'react-is' não encontrado no ambiente jsdom do CI.
// O AdminPanel usa recharts para gráficos, mas este teste cobre apenas o RBAC.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
}));

const mockedUseAuthStore = vi.mocked(useAuthStore);

describe('AdminPanel - Route Protection (RBAC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve redirecionar e exibir toast de erro se o utilizador for Aluno (Student)', () => {
    mockedUseAuthStore.mockReturnValue({
      id: 1,
      name: 'Aluno',
      email: 'aluno@teste.com',
      role: 'student',
    });

    const { container } = render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    expect(container).toBeEmptyDOMElement();
    expect(toast.error).toHaveBeenCalledWith(
      'Acesso negado. Área restrita apenas a Administradores.'
    );
  });

  it('deve renderizar o painel perfeitamente se o utilizador for Administrador (Admin)', () => {
    mockedUseAuthStore.mockReturnValue({
      id: 3,
      name: 'Admin',
      email: 'admin@teste.com',
      role: 'admin',
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    expect(screen.getByText('Painel de Administração')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});