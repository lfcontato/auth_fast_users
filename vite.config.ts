import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Durante `npm run dev`, encaminha /api para o backend direto
      // usando END_POINT_API (se definido) ou localhost:8080
      '/api': {
        target: process.env.END_POINT_API || 'http://localhost:8080',
        changeOrigin: true,
        // preserve o caminho /api no upstream? Nosso backend real não tem prefixo /api
        // então removemos o prefixo localmente no dev.
        rewrite: (p) => p.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
