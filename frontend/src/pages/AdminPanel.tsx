import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import api from '../services/api';
import { useAuthStore, type Role, type User } from '../stores/auth';

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Já inicia como true
  
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // 1. Blindagem de Rota (Client-Side RBAC)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      toast.error('Acesso negado. Área restrita apenas a Administradores.');
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    try {
      // Removido o setIsLoading(true) síncrono para satisfazer o linter
      // e evitar que a tabela "pisque" ao recarregar dados.
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch { // Removida a variável 'error' não utilizada
      toast.error('Erro ao carregar a lista de utilizadores.');
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega os dados apenas se a blindagem aprovar o acesso
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      // O linter tenta forçar o uso de React Query. Aqui, o useEffect é o padrão correto.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers();
    }
  }, [currentUser]);

  const handleRoleChange = async (userId: number, newRole: Role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, null, {
        params: { role: newRole }
      });
      toast.success('Privilégios atualizados com sucesso!', { icon: '🔐' });
      fetchUsers(); // Recarrega os dados em pano de fundo
    } catch (error) {
      // Substituição do 'any' por Type Guard do Axios (isAxiosError)
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao atualizar os privilégios.');
      } else {
        toast.error('Erro ao atualizar os privilégios.');
      }
    }
  };

  // Previne renderização enquanto a blindagem atua
  if (currentUser?.role !== 'admin') return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'left', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Painel de Administração</h1>
        <button onClick={() => navigate('/dashboard')} className="counter">
          Voltar ao Dashboard
        </button>
      </div>

      {isLoading ? (
        <p>Carregando utilizadores...</p>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--code-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--social-bg)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Nome</th>
                <th style={{ padding: '1rem' }}>E-mail</th>
                <th style={{ padding: '1rem' }}>Nível de Acesso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                // Lógica de UI para refletir a imutabilidade da Conta Mestre
                const isMasterAccount = u.email === 'viniciusleoncio3267@gmail.com';
                
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{u.id}</td>
                    <td style={{ padding: '1rem' }}>{u.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--accent)' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        disabled={isMasterAccount} // Desativa o seletor para a conta mestre
                        className="counter"
                        style={{ 
                          margin: 0, 
                          padding: '0.5rem', 
                          background: 'var(--bg)', 
                          color: 'var(--text)', 
                          cursor: isMasterAccount ? 'not-allowed' : 'pointer',
                          opacity: isMasterAccount ? 0.5 : 1
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
      )}
    </div>
  );
}