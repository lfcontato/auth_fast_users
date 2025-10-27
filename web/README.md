# Users Front (static)

Pequeno front-end estático para consumir as rotas de Usuários e UsersSpaces descritas em `REFERENCES/USERS.md`.

## Funcionalidades
- Login (`POST /user/auth/token`) e Refresh (`POST /user/auth/token/refresh`)
- Verificar conta (`POST /user/auth/verify`) e via link público (`GET /user/auth/verify-link`)
- Reenviar código de verificação (`POST /user/auth/verification-code`)
- Recuperar senha (`POST /user/auth/password-recovery`)
- Listar e criar UsersSpaces (`GET/POST /user/spaces`, exige JWT; criação requer `tools_role=admin`)

## Rodando localmente
1. Garanta a API rodando em `http://localhost:8080` (padrão).
2. Sirva os arquivos estáticos da pasta `web/` (evite abrir via `file://` por conta de CORS).

Exemplos de servidor estático:
- Python: `python -m http.server 5173 -d web`
- Node (serve): `npx serve web -l 5173`

Depois acesse: `http://localhost:5173`.

Config de API via .env/env:
- Edite `web/.env` e defina `API_BASE` (ex.: `API_BASE=http://localhost:8080`).
- Caso seu host não sirva dotfiles (ex.: Vercel), use `web/env` (sem ponto). Há `web/env.example`.
- O front carrega o arquivo `env` (ou `.env`) em runtime; `localStorage` (campo “API Base” no topo) sobrescreve o valor salvo.

## Estrutura
- `index.html` — layout e seções
- `style.css` — estilos básicos
- `api.js` — cliente para as rotas (fetch)
- `app.js` — lógica de UI e binding dos formulários
 - `.env` / `env` — configura `API_BASE` (há também `.env.example` e `env.example`)

## Deploy na Vercel
- O repositório inclui `vercel.json` para servir a pasta `web/` como estática.
- O arquivo `web/env` é publicado para expor `API_BASE` em runtime (dotfiles não são publicados).
- Ajuste `API_BASE` em `web/env` para seu domínio de API (ex.: `/api` se usar funções Serverless da Vercel ou um proxy).
- Faça o deploy:
  - `vercel` (preview) ou `vercel --prod` (produção)

## Notas
- Tokens (`access_token` e `refresh_token`) ficam armazenados em `localStorage`.
- Endpoints privados usam `Authorization: Bearer <access_token>`.
- Caso a API esteja atrás de um gateway (ex.: Vercel), ajuste a base para incluir o prefixo (ex.: `/api`).
