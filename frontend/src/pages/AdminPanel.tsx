// frontend/src/pages/AdminPanel.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useAuthStore, type Role, type User } from '../stores/auth';

// ==========================================
// TIPOS ANALÍTICOS (Sprint 9)
// ==========================================
interface AdminAnalytics {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  success_rate: number;
  fail_rate: number;
}

type Tab = 'analytics' | 'users';

// Sub-componente visual para métricas
const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) => (
  <div style={{
    background: 'var(--code-bg)', padding: '1.5rem', borderRadius: '8px',
    border: '1px solid var(--border)', borderLeft: `4px solid ${color}`,
    display: 'flex', alignItems: 'center', gap: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  }}>
    <div style={{ fontSize: '2.2rem' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-h)', lineHeight: 1.2 }}>{value}</div>
    </div>
  </div>
);

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [isLoading, setIsLoading] = useState(true);
  
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const isMasterAccount = currentUser?.email === 'viniciusleoncio3267@gmail.com';
  const isAdmin = currentUser?.role === 'admin' || isMasterAccount;

  // 1. Blindagem de Rota (Client-Side RBAC)
  useEffect(() => {
    if (!isAdmin) {
      toast.error('Acesso negado. Área restrita apenas a Administradores.');
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // 2. Fetcher centralizado e otimizado (Promise.all)
  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/analytics/admin')
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Erro ao carregar dados do painel de administração.');
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependências limpas para evitar renders em cascata

  useEffect(() => {
    if (isAdmin) {
      // BUGFIX SPRINT 10: Supressão exata para evitar falhas em CI/CD na atualização de estado
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAdminData();
    }
  }, [isAdmin, fetchAdminData]);

  // 3. Atualização de Papéis
  const handleRoleChange = async (userId: number, newRole: Role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, null, {
        params: { role: newRole }
      });
      toast.success('Privilégios atualizados com sucesso!', { icon: '🔐' });
      fetchAdminData(); // Recarrega os dados em pano de fundo
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao atualizar privilégios.');
      } else {
        toast.error('Erro inesperado ao atualizar privilégios.');
      }
    }
  };

  // Previne renderização enquanto a blindagem atua
  if (!isAdmin) return null;

  // Dados formatados para o gráfico de pizza (Recharts)
  const pieData = stats ? [
    { name: 'Aprovações', value: stats.success_rate, color: '#2e7d32' },
    { name: 'Reprovações', value: stats.fail_rate, color: '#d32f2f' }
  ] : [];

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'left', width: '100%' }}>
      
      {/* ── CABEÇALHO ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0' }}>Painel de Administração</h1>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px' }}>Gestão de plataforma e observabilidade de dados globais.</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="counter" style={{ margin: 0 }}>
          ← Voltar ao Dashboard
        </button>
      </div>

      {/* ── NAVEGAÇÃO DE ABAS ── */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '2rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{ 
            background: 'transparent', border: 'none', margin: 0, padding: '0.5rem 1rem', cursor: 'pointer', whiteSpace: 'nowrap',
            fontWeight: activeTab === 'analytics' ? 'bold' : 'normal',
            color: activeTab === 'analytics' ? 'var(--accent)' : 'var(--text)',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          📊 Visão Global (Analytics)
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ 
            background: 'transparent', border: 'none', margin: 0, padding: '0.5rem 1rem', cursor: 'pointer', whiteSpace: 'nowrap',
            fontWeight: activeTab === 'users' ? 'bold' : 'normal',
            color: activeTab === 'users' ? 'var(--accent)' : 'var(--text)',
            borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          👥 Gestão de Utilizadores
        </button>
      </div>

      {isLoading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text)' }}>Carregando dados da plataforma...</p>
      ) : activeTab === 'analytics' && stats ? (
        
        /* ── ABA: ANALYTICS ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease-in-out' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.2rem' }}>
            <StatCard title="Total de Usuários" value={stats.total_users} icon="🌍" color="var(--accent)" />
            <StatCard title="Cursos Criados" value={stats.total_courses} icon="📚" color="#f57c00" />
            <StatCard title="Matrículas Ativas" value={stats.total_enrollments} icon="🎓" color="#1976d2" />
          </div>

          <div style={{ background: 'var(--code-bg)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-h)' }}>Taxa de Sucesso Global</h3>
            <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 1.5rem 0', textAlign: 'center' }}>Percentual de aprovação em avaliações em todo o sistema (Nota &gt;= 70%)</p>
            
            {stats.success_rate === 0 && stats.fail_rate === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--text)', padding: '2rem' }}>
                Nenhum dado de avaliação corrigida disponível no sistema ainda.
              </p>
            ) : (
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      /* BUGFIX SPRINT 11: Tipagem any para contornar a assinatura restrita do Recharts 3.x */
                      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                      formatter={(value: any) => [`${value}%`, ''] as any}
                      contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-h)', borderRadius: '8px' }} 
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

      ) : (

        /* ── ABA: USUÁRIOS ── */
        <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
          <div style={{ overflowX: 'auto', background: 'var(--code-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--social-bg)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-h)' }}>ID</th>
                  <th style={{ padding: '1rem', color: 'var(--text-h)' }}>Nome</th>
                  <th style={{ padding: '1rem', color: 'var(--text-h)' }}>E-mail</th>
                  <th style={{ padding: '1rem', color: 'var(--text-h)' }}>Nível de Acesso</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrentMaster = u.email === 'viniciusleoncio3267@gmail.com';
                  
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', color: 'var(--text)' }}>#{u.id}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '1rem', color: 'var(--accent)' }}>{u.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          disabled={isCurrentMaster}
                          className="counter"
                          style={{ 
                            margin: 0, padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', 
                            cursor: isCurrentMaster ? 'not-allowed' : 'pointer',
                            opacity: isCurrentMaster ? 0.5 : 1, width: '100%', maxWidth: '200px'
                          }}
                        >
                          <option value="student">Estudante (Student)</option>
                          <option value="teacher">Professor (Teacher)</option>
                          <option value="admin">Administrador (Admin)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Animação Global */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}