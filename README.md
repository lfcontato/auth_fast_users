# Users SPA (Vite + TS) com Proxy na Vercel

Front-end SPA em TypeScript (Vite) com UI em HTML + Bootstrap e função Serverless em `api/` para proxy até o backend definido por `END_POINT_API` (no `.env` do projeto Vercel).

## Stack
- Vite + TypeScript (SPA) — entrada em `index.html` / `src/main.ts`.
- Bootstrap via CDN para UI.
- Função serverless: `api/[...slug].js` (catch‑all de `/api/*`).
- Proxy: `END_POINT_API` aponta para o backend real.

## Desenvolvimento
- Requisitos: Node 18+
- Instale deps e rode:
  - `npm install`
  - `npm run dev`
- A SPA consome o proxy em `/api/*`, logo não precisa expor o backend direto ao navegador durante dev se você rodar com `vercel dev`.
  - Alternativa: `.env` local + `vercel dev` (carrega variáveis) para exercitar o proxy.

## Build
- `npm run build` — gera `dist/`.

## Deploy na Vercel
- Arquivo `vercel.json` já configurado para:
  - `@vercel/static-build` (gera e serve `dist/`).
  - `@vercel/node` para `api/*`.
  - SPA fallback para `index.html`.
- Configure a variável de ambiente do projeto:
  - Key: `END_POINT_API`
  - Value: URL base do backend (ex.: `https://auth-basics-api.vercel.app` ou `http://localhost:8080` para dev).
  - Scopes: Production (e Preview/Development se quiser).
- Deploy:
  - `vercel` (preview) ou `vercel --prod` (produção)

## Uso
- A SPA oferece abas para:
  - Login e Refresh de tokens
  - Criar Usuário (signup)
  - Verificação de conta (código + senha), Verificar via Link, Reenviar Código
  - Recuperação de senha
  - Listar e Criar UsersSpaces (JWT necessário; criação requer `tools_role=admin`)
- Os requests são feitos para `/api/...` e o proxy repassa para `${END_POINT_API}/...`.
- Para signup, a SPA envia `POST /api/user` com `{ email, username, password?, confirm_password?, redirect_uri }`. O campo `redirect_uri` é preenchido automaticamente com a URL do site (ex.: `https://seusite.vercel.app`). Se senha for omitida, o backend pode gerar automaticamente conforme política.

## Observações
- O armazenamento de tokens é em `localStorage` (chave `users_spa_tokens_v1`).
- Se seu backend exigir CORS, não é necessário habilitar quando usar o proxy (mesma origem).
- Para consumir diretamente sem proxy, altere `apiBase` em `src/main.ts` para apontar para a URL pública (não recomendado em produção quando há CORS/preflight).
