/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // No GitHub Pages o app mora em /busca-autocomplete/. Localmente fica na raiz.
  base: process.env.GITHUB_PAGES ? '/busca-autocomplete/' : '/',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/testes/preparar.ts'],
  },
})
