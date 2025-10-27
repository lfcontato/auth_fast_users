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

Config de API via .env:
- Edite `web/.env` e defina `API_BASE` (ex.: `API_BASE=http://localhost:8080`).
- O front carrega esse arquivo em runtime; `localStorage` (campo “API Base” no topo) sobrescreve o valor do `.env` se você salvar por lá.

## Estrutura
- `index.html` — layout e seções
- `style.css` — estilos básicos
- `api.js` — cliente para as rotas (fetch)
- `app.js` — lógica de UI e binding dos formulários
 - `.env` — configura `API_BASE` (há também `.env.example`)

## Notas
- Tokens (`access_token` e `refresh_token`) ficam armazenados em `localStorage`.
- Endpoints privados usam `Authorization: Bearer <access_token>`.
- Caso a API esteja atrás de um gateway (ex.: Vercel), ajuste a base para incluir o prefixo (ex.: `/api`).
