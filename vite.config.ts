import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Durante `npm run dev`, encaminha /api para o backend direto
      // usando END_POINT_API (se definido) ou localhost:8080.
      // Mantemos o prefixo /api pois o backend expõe rotas em /api/*.
      '/api': {
        target: process.env.END_POINT_API || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
