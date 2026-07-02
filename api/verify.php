<?php
// GET /api/verify.php?session_id=cs_...        — pós-checkout: emite token Pro
// GET /api/verify.php?subscription_id=sub_...  — renovação: checa assinatura ativa
require __DIR__ . '/lib.php';
$config = require __DIR__ . '/config.php';

define('TOKEN_DAYS', 33);

if (strncmp($config['STRIPE_SECRET_KEY'], 'COLE_AQUI', 9) === 0) {
  json_out(array('error' => 'not_configured'), 500);
}

function stripe_get($path, $key) {
  $ch = curl_init('https://api.stripe.com/v1/' . $path);
  curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => array('Authorization: Bearer ' . $key),
  ));
  $res = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($res === false || $status >= 400) return null;
  $data = json_decode($res, true);
  return is_array($data) ? $data : null;
}

$sessionId = isset($_GET['session_id']) ? $_GET['session_id'] : null;
$subId = isset($_GET['subscription_id']) ? $_GET['subscription_id'] : null;
$subscription = null;

if ($sessionId) {
  if (!preg_match('/^cs_[A-Za-z0-9_]+$/', $sessionId)) json_out(array('error' => 'bad_param'), 400);
  $s = stripe_get('checkout/sessions/' . rawurlencode($sessionId), $config['STRIPE_SECRET_KEY']);
  if (!$s || (isset($s['payment_status']) ? $s['payment_status'] : '') !== 'paid' || empty($s['subscription'])) {
    json_out(array('error' => 'not_paid'), 402);
  }
  $subscription = is_string($s['subscription']) ? $s['subscription'] : (isset($s['subscription']['id']) ? $s['subscription']['id'] : '');
} elseif ($subId) {
  if (!preg_match('/^sub_[A-Za-z0-9_]+$/', $subId)) json_out(array('error' => 'bad_param'), 400);
  $sub = stripe_get('subscriptions/' . rawurlencode($subId), $config['STRIPE_SECRET_KEY']);
  $st = $sub && isset($sub['status']) ? $sub['status'] : '';
  if (!$sub || !in_array($st, array('active', 'trialing'), true)) {
    json_out(array('error' => 'inactive'), 402);
  }
  $subscription = $sub['id'];
} else {
  json_out(array('error' => 'missing_param'), 400);
}

$exp = time() + TOKEN_DAYS * 86400;
$token = sign_token(array('sub' => $subscription, 'exp' => $exp), $config['TOKEN_SECRET']);
json_out(array('token' => $token, 'subscription' => $subscription, 'exp' => $exp));
