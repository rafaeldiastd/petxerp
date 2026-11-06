# Petx ERP

Gestão para ONGs de proteção animal: animais (boletim de entrada), adoções com termo, pessoas,
estoque de ração com "dias até acabar", despesas com clínicas parceiras, doações (Stripe, Mercado Pago
e Pix) e equipe com acesso granular. Web e mobile, multi-ONG.

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | Vue 3 + Vite, shadcn-vue (Reka UI), Tailwind v4, TanStack Query, Pinia |
| API / "edge functions" | Cloudflare Workers + Hono (mesmo deploy do front, rotas `/api/*`) |
| Banco | **Neon Postgres** via `@neondatabase/serverless` (HTTP) + Drizzle ORM |
| Autenticação | Better Auth (o mesmo motor do Neon Auth) rodando no Worker, dados no Neon |
| Realtime | Durable Object por ONG (WebSocket) → invalida o cache do TanStack Query |
| Arquivos | Cloudflare R2 (fotos públicas; documentos privados só para membros) |

## Primeiros passos

1. **Neon** — crie um projeto em console.neon.tech e copie a connection string *pooled*.
2. Copie `.dev.vars.example` para `.dev.vars` e preencha `DATABASE_URL` e `BETTER_AUTH_SECRET`
   (`openssl rand -base64 32`).
3. Instale e crie as tabelas no Neon:
   ```bash
   npm install
   npm run db:migrate
   ```
4. Rode: `npm run dev` → abra `/cadastro`, crie sua conta e cadastre a ONG.

## Deploy (Cloudflare)

```bash
npx wrangler r2 bucket create petxerp-uploads
npx wrangler secret put DATABASE_URL
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL      # ex.: https://app.suaong.org
npx wrangler secret put ENCRYPTION_KEY
npm run deploy
```

## Estrutura

```
server/            Worker (Hono): rotas, auth, realtime, schema Drizzle e migrations
shared/            Código usado pelos dois lados: enums PT-BR, permissões, schemas Zod, Pix
src/               App Vue: views por módulo, componentes, composables
```

## Permissões

Funções: Administrador, Atendimento, Veterinário, Financeiro e Voluntário (`shared/permissions.ts`).
Cada membro pode ter permissões personalizadas além do preset da função.
