# RespondaJá — respondaja.click

Assistente de resposta a avaliações para negócios locais. Landing + app em `index.html`, backend PHP em `api/`.

## Deploy (Hostinger via Git)

Este repo espelha o `public_html`. O `api/config.php` (chaves) **não está no git** — existe só no servidor. Após qualquer deploy, confirme que ele continua lá; se precisar recriar, copie de `api/config.php.example` e preencha as chaves no File Manager.

Fluxo de atualização: editar → commit → push → hPanel Git "Deploy" (ou webhook para deploy automático).

## Arquivos

- `index.html` — landing + app (bilíngue PT/EN), chama `/api/generate.php` e `/api/verify.php`
- `api/generate.php` — gera 3 respostas (Anthropic API)
- `api/verify.php` — valida pagamento no Stripe e emite token Pro
- `api/lib.php` — HMAC, quota, prompt
- `api/.htaccess` — bloqueia acesso direto a config/lib
- `api/config.php.example` — modelo das chaves (o real fica só no servidor)
