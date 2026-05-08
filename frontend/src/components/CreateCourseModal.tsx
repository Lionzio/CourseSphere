import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import api from '../services/api';
import { courseSchema, type CourseFormValues } from '../schemas/course';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCourseModal({ onClose, onSuccess }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
  });

  const onSubmit = async (data: CourseFormValues) => {
    try {
      await api.post('/courses/', data);
      toast.success('Curso criado com sucesso!');
      onSuccess(); // Recarrega a lista no Dashboard
      onClose();   // Fecha o modal
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao criar curso.');
      } else {
        toast.error('Erro desconhecido.');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: 'var(--bg)', padding: '2rem', borderRadius: '8px', width: '450px', border: '1px solid var(--border)', textAlign: 'left' }}>
        <h2>Novo Curso</h2>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          
          <input {...register('name')} placeholder="Nome do Curso" className="counter" style={{ width: '100%', boxSizing: 'border-box' }} />
          {errors.name && <span style={{ color: 'red', fontSize: '14px' }}>{errors.name.message}</span>}

          <textarea {...register('description')} placeholder="Descrição (opcional)" className="counter" rows={3} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} />

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>Data de Início</label>
              <input type="date" {...register('start_date')} className="counter" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>Data de Término</label>
              <input type="date" {...register('end_date')} className="counter" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          {errors.start_date && <span style={{ color: 'red', fontSize: '14px' }}>{errors.start_date.message}</span>}
          {errors.end_date && <span style={{ color: 'red', fontSize: '14px' }}>{errors.end_date.message}</span>}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="counter" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="counter" style={{ flex: 1, background: 'var(--accent)', color: 'white' }}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}