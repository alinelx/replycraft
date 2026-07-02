<?php
// POST /api/generate.php — gera 3 respostas.
// Body JSON: { review, tone, lang, businessName, usedCount, proToken }
require __DIR__ . '/lib.php';
$config = require __DIR__ . '/config.php';

if ((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '') !== 'POST') {
  json_out(array('error' => 'method'), 405);
}
if (strncmp($config['ANTHROPIC_API_KEY'], 'COLE_AQUI', 9) === 0) {
  json_out(array('error' => 'not_configured'), 500);
}

$raw = file_get_contents('php://input');
$body = json_decode($raw ? $raw : '', true);
if (!is_array($body)) json_out(array('error' => 'bad_json'), 400);

$pro = verify_token(isset($body['proToken']) ? $body['proToken'] : null, $config['TOKEN_SECRET']);

// usedCount vem do navegador (localStorage) — enforcement suave, aceitável no MVP:
// uma chamada grátis abusada custa ~€0,001. Endurecimento por IP está no BACKLOG.
if (quota_exceeded(isset($body['usedCount']) ? $body['usedCount'] : 0, $pro !== null)) {
  json_out(array('error' => 'quota', 'upgrade' => true), 402);
}

$result = build_prompt($body);
$prompt = $result[0];
$err = $result[1];
if ($err) json_out(array('error' => $err), 400);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, array(
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 60,
  CURLOPT_HTTPHEADER => array(
    'content-type: application/json',
    'x-api-key: ' . $config['ANTHROPIC_API_KEY'],
    'anthropic-version: 2023-06-01',
  ),
  CURLOPT_POSTFIELDS => json_encode(array(
    'model' => 'claude-haiku-4-5-20251001', // custo ~ €0,001/geração
    'max_tokens' => 600,
    'messages' => array(array('role' => 'user', 'content' => $prompt)),
  )),
));
$res = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false || $status >= 400) json_out(array('error' => 'llm_unavailable'), 502);
$data = json_decode($res, true);
$text = '';
if (is_array($data) && isset($data['content'][0]['text'])) $text = $data['content'][0]['text'];
$replies = parse_replies($text);
if (!$replies) json_out(array('error' => 'llm_empty'), 502);
json_out(array('replies' => $replies, 'pro' => $pro !== null));
