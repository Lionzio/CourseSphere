import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import api from '../services/api';
import { registerSchema, type RegisterFormValues } from '../schemas/auth';

export function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await api.post('/auth/register', data);
      toast.success('Conta criada com sucesso! Faça login.');
      navigate('/login');
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao registrar.');
      } else {
        toast.error('Erro ao registrar.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Criar Conta</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input {...register('name')} placeholder="Nome completo" className="counter" style={{ width: '100%' }} />
        {errors.name && <span style={{ color: 'red' }}>{errors.name.message}</span>}
        
        <input {...register('email')} placeholder="E-mail" className="counter" style={{ width: '100%' }} />
        {errors.email && <span style={{ color: 'red' }}>{errors.email.message}</span>}
        
        <input type="password" {...register('password')} placeholder="Senha" className="counter" style={{ width: '100%' }} />
        {errors.password && <span style={{ color: 'red' }}>{errors.password.message}</span>}

        <button type="submit" disabled={isSubmitting} className="counter" style={{ background: 'var(--accent)', color: 'white' }}>
          {isSubmitting ? 'Carregando...' : 'Registrar'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }}>Já tem conta? <Link to="/login">Entre aqui</Link></p>
    </div>
  );
}