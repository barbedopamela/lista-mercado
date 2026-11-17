# 🏡 Nossa Casa

App da casa para duas pessoas, em módulos (abas): **Mercado**, **A resolver** e **Finanças** (em construção). O módulo Mercado tem listas de mercado: itens com total somando sozinho, orçamento por compra e por mês, modo "no mercado" (planejado × no carrinho), pagamento dividido em várias formas e foto/nome de quem adicionou cada item. Atualiza em tempo real entre os dois celulares.

**Stack:** React + TypeScript + Tailwind (mesma base do Lovable) · Supabase (login Google, banco PostgreSQL e tempo real).

## Como funciona (o "porquê")

- **Front-end (este repositório)**: as telas. Roda no navegador e fala direto com o Supabase.
- **Supabase**: guarda os dados e cuida do login. A segurança fica no próprio banco (*Row Level Security*): só os e-mails da tabela `membros_permitidos` leem ou escrevem qualquer coisa. Um *trigger* também bloqueia o cadastro de qualquer outro e-mail.
- **Totais não são guardados**: são calculados a partir dos itens (`src/lib/calculos.ts`), então nunca ficam diferentes da soma real.

## Colocando no ar (uma vez só)

### 1. Criar o projeto no Supabase
1. Em [supabase.com](https://supabase.com), crie uma conta e um projeto (plano gratuito basta).
2. Abra `supabase/schema.sql`, **troque `TROQUE_PELO_EMAIL_DO_CAIO@gmail.com` pelo e-mail Google dele** e rode o arquivo inteiro em **SQL Editor → New query → Run**.

### 2. Ativar o login com Google
1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto → **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth** (tipo "Aplicativo da Web").
2. Em **URIs de redirecionamento autorizados**, cole o endereço que o Supabase mostra em **Authentication → Providers → Google** (termina em `/auth/v1/callback`).
3. Copie o *Client ID* e o *Client Secret* para o Supabase, no mesmo lugar, e ative o provedor Google.

### 3. Informar o endereço do app
No Supabase, em **Authentication → URL Configuration**, coloque a URL onde o app vai rodar (ex.: `https://lista-mercado.vercel.app`) em *Site URL* e também em *Redirect URLs*. Para testar no computador, adicione `http://localhost:5173`.

### 4. Variáveis do app
Copie `.env.example` para `.env` e preencha com os valores de **Project Settings → API** no Supabase:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

A *anon key* pode ficar no front-end: quem protege os dados são as regras do banco, não o segredo da chave.

### 5. Rodar localmente
```bash
npm install
npm run dev
```

### 6. Publicar (grátis)
Importe este repositório na [Vercel](https://vercel.com) (ou Netlify), adicione as duas variáveis `VITE_SUPABASE_*` em *Environment Variables* e faça o deploy. No iPhone/Android, abra o link e use **Adicionar à tela inicial**.

## Atualizações do banco (migrações)

Cada etapa nova do app traz um arquivo SQL em `supabase/migracoes/`. Rode **uma vez** no SQL Editor do Supabase, na ordem:

| Arquivo | O que adiciona |
|---|---|
| `schema.sql` | base: login, mercado, orçamento, pagamentos |
| `migracoes/002_a_resolver.sql` | aba A resolver, categorias, anexos e o bucket privado de arquivos |
| `migracoes/003_contas_fixas.sql` | Finanças: categorias, contas fixas (moldes) e contas de cada mês |
| `migracoes/004_saldo_lancamentos.sql` | Finanças: categorias de entrada, lançamentos avulsos e saldo da conta conjunta |

## Estrutura

```
supabase/                 schema.sql e migracoes/ (SQL de cada etapa)
src/modulos/mercado/      módulo Mercado (Compras e Mês)
src/modulos/resolver/     módulo A resolver
src/modulos/financas/     módulo Finanças (contas do mês e saldo; projeção e caixinhas vêm depois)
src/components/           peças compartilhadas (Anexos, Avatar, Barra…)
src/lib/                  tipos, formatação e regras de cálculo
src/hooks/useTabela.ts    carrega uma tabela e escuta mudanças em tempo real
src/pages/                Login, Ajustes e telas gerais
```

Para criar um módulo novo: uma pasta em `src/modulos/`, uma aba em `BottomNav.tsx` e o SQL em `supabase/migracoes/`.

## Testes

```bash
npm test    # testa as regras das contas fixas e do saldo da conta conjunta
```

## Próximos passos (versão 2)
- Histórico de preços: preencher o preço unitário com o último valor pago.
- Lista básica recorrente (carregar os itens do mês com um toque).
- Comparativo com o mês anterior.
- Enviar o total final como despesa "Mercado" para o Meu Caixa.
