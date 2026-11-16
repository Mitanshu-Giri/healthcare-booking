import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 5173 is fixed on purpose: the backend only allows this origin (CORS_ALLOWED_ORIGINS).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
