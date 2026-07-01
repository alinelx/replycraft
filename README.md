# RespondaJá / ReplyCraft

Assistente de resposta a avaliações para negócios locais. Cole a avaliação (Google, iFood, TripAdvisor), escolha o tom, receba 3 respostas prontas em PT-BR ou inglês. Grátis: 5 respostas/mês. Pro (assinatura Stripe): ilimitado.

**Nota sobre o nome:** "RespondaJá" e "ReplyCraft" são placeholders — verifique disponibilidade de domínio e conflito de marca antes de lançar (ver DEPLOY.md).

## Estrutura

```
replycraft/
├── public/index.html          # Landing + app (arquivo único, bilíngue PT/EN)
├── functions/api/generate.js  # Cloudflare Pages Function: gera respostas (Anthropic API)
├── functions/api/verify.js    # Emite/renova token Pro validando com Stripe
├── lib/core.js                # Token HMAC, quota, prompt (compartilhado + testável)
├── tests/money-paths.test.mjs # Testes dos caminhos de receita
├── DEPLOY.md                  # Passo a passo de deploy
└── BACKLOG.md                 # Features adiadas, ordenadas por impacto em receita
```

## Deploy em <10 passos

Ver `DEPLOY.md`. Resumo: criar projeto no Cloudflare Pages apontando para este repo, configurar 3 variáveis de ambiente, criar um Stripe Payment Link e colar a URL no `index.html`.

## Variáveis de ambiente (Cloudflare Pages → Settings → Environment variables)

| Variável | O que é |
|----------|---------|
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic (console.anthropic.com) |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (sk_live_...) |
| `TOKEN_SECRET` | String aleatória longa (ex.: `openssl rand -hex 32`) |

## Testes

```
node --test tests/
```

Cobrem os caminhos que perdem dinheiro se quebrarem: assinatura/verificação do token Pro, expiração, gate de quota grátis, validação de input (evita queimar créditos de API) e parsing das respostas.

## Custo de operação (estimado)

Cloudflare Pages free tier: €0. Anthropic API (Haiku): ~€0,001 por geração → 1.000 gerações ≈ €1. Stripe: ~3% por transação. Total: bem abaixo de €20/mês até milhares de usuários.

## Limitações conhecidas do MVP

A quota grátis é aplicada no navegador (localStorage) — um usuário técnico pode burlá-la, e o custo disso é ~€0,001 por chamada. Endurecimento via contador por IP em Cloudflare KV está no BACKLOG.
