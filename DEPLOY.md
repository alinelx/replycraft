# DEPLOY — RespondaJá

## Passos (nesta ordem)

1. **Suba o código no GitHub**: crie um repositório e envie a pasta `replycraft/`.
2. **Cloudflare Pages**: dash.cloudflare.com → Workers & Pages → Create → Pages → conecte o repo. Build settings: framework "None", build output directory `public`. As functions em `functions/` são detectadas automaticamente.
3. **Variáveis de ambiente** (Pages → Settings → Environment variables, produção):
   - `ANTHROPIC_API_KEY` — crie em console.anthropic.com (adicione ~US$5 de crédito).
   - `STRIPE_SECRET_KEY` — dashboard.stripe.com → Developers → API keys.
   - `TOKEN_SECRET` — gere com `openssl rand -hex 32` (ou qualquer string longa aleatória).
4. **Stripe Payment Link**: dashboard.stripe.com → Payment Links → criar produto "RespondaJá Pro", preço recorrente mensal (sugestão: R$ 29 no Brasil; crie um segundo link de US$ 7 para o público EN). Em "After payment" → redirect para `https://SEU-DOMINIO.com/?session_id={CHECKOUT_SESSION_ID}`. Cole a URL do link no `public/index.html` (procure por `SUBSTITUA_PELO_SEU_LINK`).
5. **Domínio**: compre (~€10/ano; Cloudflare Registrar é o mais barato) e conecte no Pages → Custom domains. Atualize `data-domain` do Plausible no `index.html`.
6. **E-mail capture**: crie conta grátis no Buttondown (ou Tally) e substitua a URL do form no `index.html` (procure por `SUBSTITUA` no bloco capture). Opcional no dia 1.
7. **Analytics**: crie o site no plausible.io (trial 30 dias; alternativa 100% grátis: Cloudflare Web Analytics — troque o script).
8. **Monitoramento**: uptimerobot.com (grátis) → monitor HTTP para a home + um POST sintético em `/api/generate` 1x/dia.
9. **Teste de fumaça**: gere uma resposta no plano grátis; faça um checkout de teste (Stripe test mode primeiro) e confirme que o badge "Pro ✓" aparece.
10. **Rode os testes**: `node --test tests/` — tudo verde antes de divulgar.

## Human required (não dá para automatizar)

- Conta Stripe ativa (CPF/CNPJ + dados bancários). MEI é suficiente.
- Conta Anthropic com billing (cartão).
- Compra do domínio (~€10/ano) — **verifique antes se o nome escolhido não conflita com marca registrada** (busca no INPI para BR e USPTO para EUA) e se o domínio .com/.com.br está livre.
- Contas Cloudflare, Buttondown/Tally, UptimeRobot, Plausible (todas grátis).

## Custos do dia 1

Domínio ~€10/ano + ~US$5 de crédito Anthropic. Todo o resto: €0/mês.
