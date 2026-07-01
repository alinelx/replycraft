# BACKLOG — ordenado por impacto esperado em receita

Nada daqui entra antes do primeiro pagamento de um estranho. Cada feature pré-receita atrasa a única validação real.

1. **Quota grátis por IP (Cloudflare KV)** — hoje o limite é no navegador; endurecer só se o custo de API subir de forma mensurável.
2. **Tom personalizado do negócio (feature Pro)** — campo "descreva seu negócio em 1 frase" persistido no localStorage; prometido na landing, entregar na semana 1 pós-primeiro assinante.
3. **Histórico de respostas (Pro)** — localStorage primeiro; Supabase free tier se houver demanda.
4. **Webhook do Stripe** (`checkout.session.completed` + `customer.subscription.deleted`) — hoje a renovação é polling no load da página; webhook torna o cancelamento imediato.
5. **Página "modelos de resposta" por segmento** (restaurante, salão, hotel...) — motor de SEO; são páginas estáticas geradas 1x.
6. **Detecção automática de idioma da avaliação** — responder em espanhol abre mercado LatAm.
7. **Extensão Chrome** ("responder direto no Google Maps") — canal de distribuição novo; só depois de MRR > €100.
