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

### Integrações Tools: Faciendum e Automata
- Faciendum: módulo de tarefas/Kanban por espaço do usuário.
  - Base de rotas (backend): `/user/spaces/{space_id}/faciendum/...`
  - Exige JWT de usuário verificado (Authorization: Bearer ...).
  - Variável(s) de ambiente do backend (referência): `FACIENDUM_DATABASE_URL`.
- Automata: estúdio de agentes (prompts, chaves e chats) por espaço do usuário.
  - Base de rotas (backend): `/user/spaces/{space_id}/automata/...`
  - Exige JWT de usuário verificado.
  - Variável(s) de ambiente do backend (referência): `AUTOMATA_DATABASE_URL`.
- Status no front: UI ainda não implementada; ficará sob a aba UsersSpaces (após seleção do espaço) ou em abas próprias. Ver “Pendente”.
- Referências: `REFERENCES/TOOLS.md`, `REFERENCES/HOWTOUSE_TOOLS.md`.

## Observações
- O armazenamento de tokens é em `localStorage` (chave `users_spa_tokens_v1`).
- Se seu backend exigir CORS, não é necessário habilitar quando usar o proxy (mesma origem).
- Para consumir diretamente sem proxy, altere `apiBase` em `src/main.ts` para apontar para a URL pública (não recomendado em produção quando há CORS/preflight).

## Diretrizes de Documentação
- Mantenha este README sempre atualizado a cada alteração significativa do front-end.
- Atualize obrigatoriamente os checklists (Implementado, Pendente, Sugestões) refletindo o que já foi entregue e o que falta.
- Descreva claramente o que foi implementado no front (telas/abas, rotas chamadas, payloads, requisitos de env) e possíveis impactos.
- Ao adicionar funcionalidades, sincronize com as referências em `REFERENCES/` e, quando aplicável, crie/atualize guias em `docs/` (HOWTOUSE_...).
- Evite divergência entre README e o comportamento da UI; o README é a fonte de verdade do estado atual do front.

## Histórico de Implementações e Backlog

### Implementado
- [x] Proxy serverless na Vercel com roteamento `/api/*`, preservando prefixo `/api`, compatível com ESM e cabeçalhos ajustados.
- [x] Login: Request/Response separados, exibição de status “Logado como …”, Refresh e Logout com atualização do status.
- [x] Criar Usuário (signup): inclui `redirect_uri` (origin do site) no payload; Request/Response separados.
- [x] Verificar conta (código + senha): Request/Response separados e descrição de que ativa a conta usando código e senha atual.
- [x] Verificar via link: página dedicada em `public/user/auth/verify-link/` (GET com `login` e `code`), botão Confirmar e “Fechar página”.
- [x] Recuperação de senha: inclui `redirect_uri` (origin do site) no payload; Request/Response separados.
- [x] Redefinir senha via link: página dedicada em `public/user/auth/verify-password/` (POST com `password`/`confirm_password`), Request/Response e “Fechar página”.
- [x] UsersSpaces: listar e criar com Request/Response separados (JWT de usuário verificado).
- [x] Diagnóstico: Ping `/healthz` e `whoami` (usa JWT quando presente).

### Pendente (conforme referências de USERS)
- [ ] UsersSpaces – gerenciamento de membros (adicionar/listar/alterar/remover) via UI.
- [ ] Convites/aceite de membros por link/token com expiração e possibilidade de saída voluntária.
- [ ] Transferência de propriedade de UsersSpace (owner para outro admin do espaço).
- [ ] Exclusão/arquivamento de UsersSpace e UX de confirmação.
- [ ] Gerenciar sessões (logout atual e “logout all”) do usuário.
- [ ] Tratamento e exibição padronizados de erros (códigos i18n-friendly) e estados de carregamento em todos os fluxos.
- [ ] Documentos HOWTOUSE por funcionalidade em `docs/` (ex.: HOWTOUSE_USERS_SPACES.md) seguindo o PROMPT de desenvolvimento contínuo.
- [ ] Faciendum (por espaço): UI para Boards/Tracks/Tasks (CRUD e mover tasks) consumindo `/api/user/spaces/{space_id}/faciendum/...`.
- [ ] Automata (por espaço): UI para Keys/Prompts/Chats consumindo `/api/user/spaces/{space_id}/automata/...`.

### Sugestões
- [ ] Auto-refresh de token em 401/expired com retry transparente e indicador de sessão expirada.
- [ ] Máscara/validação de força de senha e dicas de complexidade (sincronizar com política do backend).
- [ ] Melhorar acessibilidade (labels, aria, foco, leitura de alertas) e UX de loading (desabilitar botões enquanto envia).
- [ ] Telemetria opcional de erro (console/report) condicional por env para facilitar suporte.
- [ ] Link visível na SPA para as páginas dedicadas de verificação e redefinição de senha.
