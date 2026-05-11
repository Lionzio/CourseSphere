/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Permite usar describe, it, expect sem importar em cada arquivo
    environment: 'jsdom', // Simula o navegador no terminal
    setupFiles: './src/setupTests.ts', // Ficheiro executado antes dos testes
    css: false, // Otimização: ignora CSS nos testes para maior velocidade
  },
});