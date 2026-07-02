<?php
// Core shared logic (PHP port of lib/core.js): token HMAC, quota, prompt.
// Compatível com PHP 7.4+.

define('FREE_MONTHLY_LIMIT', 5);

function b64url($bin) {
  return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function b64url_decode($s) {
  return base64_decode(strtr($s, '-_', '+/'));
}

/** Sign a Pro token. $payload must include 'exp' (unix seconds). */
function sign_token($payload, $secret) {
  $body = b64url(json_encode($payload));
  $sig  = b64url(hash_hmac('sha256', $body, $secret, true));
  return $body . '.' . $sig;
}

/** Verify a Pro token. Returns payload array or null (bad signature / expired). */
function verify_token($token, $secret) {
  if (!is_string($token) || strpos($token, '.') === false) return null;
  $parts = explode('.', $token, 2);
  $body = $parts[0];
  $sig = $parts[1];
  $expected = b64url(hash_hmac('sha256', $body, $secret, true));
  if (!hash_equals($expected, $sig)) return null;
  $raw = b64url_decode($body);
  if ($raw === false) return null;
  $payload = json_decode($raw, true);
  if (!is_array($payload) || empty($payload['exp']) || $payload['exp'] < time()) return null;
  return $payload;
}

/** Free-tier gate. */
function quota_exceeded($count, $isPro) {
  return !$isPro && intval($count) >= FREE_MONTHLY_LIMIT;
}

/** Build the LLM prompt. Returns array($prompt, $error_code). */
function build_prompt($in) {
  $review = trim(strval(isset($in['review']) ? $in['review'] : ''));
  if (mb_strlen($review) < 5) return array(null, 'invalid_review');
  if (mb_strlen($review) > 4000) return array(null, 'review_too_long');

  $tones = array(
    'professional' => array('en' => 'professional and courteous', 'pt' => 'profissional e cordial'),
    'warm'         => array('en' => 'warm and personal',          'pt' => 'caloroso e pessoal'),
    'direct'       => array('en' => 'brief and to the point',     'pt' => 'breve e direto ao ponto'),
  );
  $toneKey = isset($in['tone']) && isset($tones[$in['tone']]) ? $in['tone'] : 'professional';
  $tone = $tones[$toneKey];
  $lang = (isset($in['lang']) && $in['lang'] === 'pt') ? 'pt' : 'en';
  $language = $lang === 'pt' ? 'Brazilian Portuguese' : 'English';
  $biz = mb_substr(trim(strval(isset($in['businessName']) ? $in['businessName'] : '')), 0, 80);

  $lines = array(
    'You write replies that a small local business owner posts publicly to customer reviews.',
    'Write 3 distinct reply options in ' . $language . ', tone: ' . $tone[$lang] . '.',
  );
  if ($biz !== '') $lines[] = 'Business name: ' . $biz . '.';
  $lines[] = 'Rules: never admit legal liability; never offer compensation unless the review asks;';
  $lines[] = 'thank the reviewer; if negative, acknowledge briefly and invite offline contact; max 80 words each;';
  $lines[] = 'no emojis unless the review uses them; output ONLY the 3 replies separated by "---".';
  $lines[] = '';
  $lines[] = "Review:\n\"\"\"" . $review . "\"\"\"";
  return array(implode("\n", $lines), null);
}

/** Parse model output into up to 3 replies. */
function parse_replies($text) {
  $parts = preg_split('/\n?---\n?/', strval($text));
  $out = array();
  foreach ($parts as $p) {
    $p = trim($p);
    if ($p !== '') $out[] = $p;
    if (count($out) === 3) break;
  }
  return $out;
}

function json_out($obj, $status = 200) {  http_response_code($status);
  header('Content-Type: application/json');
  echo json_encode($obj);
  exit;
}
