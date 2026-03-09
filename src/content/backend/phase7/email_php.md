# Track: Backend Engineering — Module: Phase 7 — Advanced API Features — Topic: Sending Email — Transactional & Notifications (PHP)

Email is a core channel for user communication in modern systems. Transactional emails (receipts, resets, confirmations) demand high reliability, fast delivery, and strong idempotency. Notifications (alerts, updates, promos) often require batching, templating, and observability. In PHP-backed services, you typically choose between SMTP-based transports (via PHPMailer/PHPMailer-like libraries) or API-based providers (Mailgun, SendGrid, etc.), add template rendering, and build a lightweight queue with retries to ensure resilience in production. This lesson teaches practical patterns, code sketches, and production considerations for building a robust email subsystem.

## 1. Core Concepts: Transactional vs Notifications (and the reliability mindset)
Transactional emails must not be lost or delivered twice; they often include a strict sequencing and content guarantees. Notifications may be bulk-delivered, rate-limited, and starved for performance but still require traceability.

Key patterns illustrated:
- Different transports for different needs (SMTP for legacy, API for scale).
- Template rendering to separate content from code.
- Idempotent delivery using a stable message_id.
- Queuing and retries to decouple sending from request latency.

Code sketch: a simple interface and a function signature for a transactional email sender.
```php
<?php
// Conceptual signature: transactional emails use templating and idempotency keys.
function sendTransactionalEmail(string $to, string $subject, string $templateName, array $vars): bool {
    // 1) render content from templateName with $vars
    // 2) send via chosen transport (SMTP or API)
    // 3) return success/failure; do not throw for normal delivery issues
    return true;
}
```
### Line-by-line explanation
- Line 1: PHP opening tag.
- Line 3: Define a function sendTransactionalEmail with typed parameters for clarity.
- Line 4: Placeholder to render content from a template with variables.
- Line 5: Placeholder to send via a transport (SMTP or API).
- Line 6: Return a boolean indicating success or failure.
- Line 7: End function.
- Line 8: End of code block.

## 2. PHP Email Sending with PHPMailer (SMTP) — transactional example
This section demonstrates a real, production-ready SMTP sending path using PHPMailer.

```php
<?php
// Ensure you have installed PHPMailer via Composer: composer require phpmailer/phpmailer
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendTransactionalEmail(string $to, string $subject, string $htmlBody, string $plainBody): bool {
    $mail = new PHPMailer(true);
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = getenv('SMTP_HOST');
        $mail->SMTPAuth = true;
        $mail->Username = getenv('SMTP_USER');
        $mail->Password = getenv('SMTP_PASS');
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = intval(getenv('SMTP_PORT') ?: '465');
        
        // Recipients
        $mail->setFrom('no-reply@yourdomain.com', 'Your Service');
        $mail->addAddress($to);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = $plainBody;
        
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('Mailer Error: ' . $mail->ErrorInfo);
        return false;
    }
}

// Example usage
$sent = sendTransactionalEmail(
    'customer@example.com',
    'Your Order Receipt',
    '<h1>Thanks!</h1><p>Your receipt is attached.</p>',
    'Thanks! Your receipt is attached.'
);
```
### Line-by-line explanation
- Line 1: PHP opening tag.
- Line 3-7: Include PHPMailer via Composer autoload.
- Line 9-14: Define function sendTransactionalEmail with strong typing for inputs/outputs.
- Line 11: Create a new PHPMailer instance in exception mode.
- Line 12: Begin try block to catch mail errors gracefully.
- Line 15: Switch to SMTP transport.
- Line 16-19: Configure SMTP host, authentication, username, and password from environment variables.
- Line 20: Enable encryption (SMTPS) for security.
- Line 21: Set SMTP port, defaulting to 465 if not provided.
- Line 24-26: Set sender and recipient.
- Line 29-31: Enable HTML content and assign Subject/Body/AltBody.
- Line 33: Attempt to send; on success, return true.
- Line 34-37: If an exception occurs, log and return false.
- Line 41-45: Example usage showing how to call the function.
- Line 46: End of code block.

## 3. Template-driven Content: Separating content from code
Templates keep content out of code, enabling non-developers to adapt copy and formatting. This example shows a tiny renderer with safe placeholder substitution.

```php
<?php
// Simple PHP template renderer using placeholders like {{name}} and {{order_id}}
function renderTemplate(string $templatePath, array $vars): string {
    $template = file_get_contents($templatePath);
    foreach ($vars as $key => $value) {
        $template = str_replace('{{'.$key.'}}', htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'), $template);
    }
    return $template;
}

$name = 'Alex';
$orderId = 'ABC123';
$html = renderTemplate(__DIR__ . '/templates/order_email.html', [
    'name' => $name,
    'order_id' => $orderId
]);

$plain = "Hello $name,\n\nYour order $orderId has been placed.";
// You would send using PHPMailer or an API as shown in the previous section
```
### Line-by-line explanation
- Line 1: PHP opening tag.
- Line 3-9: Define a simple renderTemplate function that loads a file and replaces placeholders with safe values.
- Line 10-12: Prepare sample variables (name and order_id).
- Line 13-17: Render an HTML body from a template file, substituting placeholders with escaped content.
- Line 18-19: Create a plain-text fallback version.
- Line 20-21: Note on integration with a sending path (PHPMailer/API) as shown earlier.
- Line 22: End of code block.

Notes:
- Template file example: templates/order_email.html might contain: "<p>Hi {{name}}, your order {{order_id}} is confirmed.</p>"
- This approach avoids embedding logic in templates and helps with localization and approvals.

## 4. Sending via Email Service Provider API (Mailgun) — REST path
API-based sending scales well and reduces mail-server maintenance. Here’s a minimal Mailgun example using cURL in PHP.

```php
<?php
// Requires cURL and Mailgun API key
$apiKey = getenv('MAILGUN_API_KEY');
$domain = getenv('MAILGUN_DOMAIN'); // e.g. sandbox123.mailgun.org
$to = 'customer@example.com';
$subject = 'Your Order Confirmation';
$html = '<h1>Thank you</h1><p>Your order is confirmed.</p>';
$text = "Thank you. Your order is confirmed.";

$url = "https://api.mailgun.net/v3/{$domain}/messages";

$data = [
    'from' => 'Your Service <no-reply@yourdomain.com>',
    'to' => $to,
    'subject' => $subject,
    'text' => $text,
    'html' => $html
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
curl_setopt($ch, CURLOPT_USERPWD, 'api:' . $apiKey);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo "Mail sent: $response";
} else {
    error_log("Mailgun error: HTTP $httpCode - $response");
}
```
### Line-by-line explanation
- Line 1: PHP opening tag.
- Line 3-5: Fetch API credentials and target recipient from environment variables.
- Line 7-11: Prepare API call parameters for Mailgun (from, to, subject, text, html).
- Line 13-17: Build the Mailgun URL for the domain.
- Line 19-28: Initialize and configure a cURL request to Mailgun with Basic Auth, sending the data as form-encoded.
- Line 29-31: Execute and capture response; extract HTTP status code.
- Line 32: Close the cURL handle.
- Line 34-38: Simple success/failure check with logging on error.
- Line 39: End of code block.

Notes:
- API-based sending avoids hosting an SMTP server but requires proper API key management, domain verification, and handling bounces/webhooks for deliverability.

## 5. Reliability and Asynchrony: Queues, Idempotency, and Retries
In production, you typically decouple the request that triggers emails from the actual sending, add idempotency keys, and retry on transient errors. A simple SQLite-backed queue (for illustration) with a worker demonstrates the core ideas without pulling in a full-blown queue system.

enqueue_email.php
```php
<?php
// Simple SQLite-based email queue
$db = new PDO('sqlite:' . __DIR__ . '/email_queue.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Ensure table exists
$db->exec("CREATE TABLE IF NOT EXISTS email_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT UNIQUE,
    to_email TEXT,
    subject TEXT,
    html_body TEXT,
    text_body TEXT,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TEXT,
    updated_at TEXT
)");

// Generate a deterministic message_id for idempotency
function getMessageId(string $to, string $subject, string $templateHash): string {
    return hash('sha256', $to . '|' . $subject . '|' . $templateHash);
}

// Example enqueue
$to = 'customer@example.com';
$subject = 'Your Order';
$html = '<p>Hi there</p>';
$text = 'Hi there';
$templateHash = md5($html . $text);

$messageId = getMessageId($to, $subject, $templateHash);

$st = $db->prepare("INSERT OR IGNORE INTO email_queue
  (message_id, to_email, subject, html_body, text_body, status, created_at, updated_at)
  VALUES (:message_id, :to_email, :subject, :html_body, :text_body, 'pending', datetime('now'), datetime('now'))");
$st->execute([
  ':message_id' => $messageId,
  ':to_email' => $to,
  ':subject' => $subject,
  ':html_body' => $html,
  ':text_body' => $text
]);

echo "Enqueued with ID " . $db->lastInsertRowID();
```

worker.php
```php
<?php
require __DIR__ . '/vendor/autoload.php'; // If you use PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Reusable send function (SMTP path)
function sendEmailViaPHPMailer(string $to, string $subject, string $html, string $text): bool {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = getenv('SMTP_HOST');
        $mail->SMTPAuth = true;
        $mail->Username = getenv('SMTP_USER');
        $mail->Password = getenv('SMTP_PASS');
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = intval(getenv('SMTP_PORT') ?: '465');
        $mail->setFrom('no-reply@yourdomain.com', 'Your Service');
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = $text;
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('Mailer Error: ' . $mail->ErrorInfo);
        return false;
    }
}

// Simple SQLite-based queue worker
$db = new PDO('sqlite:' . __DIR__ . '/email_queue.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

while (true) {
   $stmt = $db->prepare("SELECT * FROM email_queue WHERE status = 'pending' ORDER BY created_at LIMIT 1");
   $stmt->execute();
   $row = $stmt->fetch(PDO::FETCH_ASSOC);
   if (!$row) { sleep(5); continue; }

   $upd = $db->prepare("UPDATE email_queue SET status = 'processing', updated_at = datetime('now') WHERE id = :id");
   $upd->execute([':id' => $row['id']]);

   $sent = sendEmailViaPHPMailer($row['to_email'], $row['subject'], $row['html_body'], $row['text_body']);
   if ($sent) {
       $db->prepare("UPDATE email_queue SET status = 'sent', updated_at = datetime('now') WHERE id = :id")->execute([':id' => $row['id']]);
   } else {
       $db->prepare("UPDATE email_queue SET status = 'failed', attempts = attempts + 1, updated_at = datetime('now') WHERE id = :id")->execute([':id' => $row['id']]);
   }
}
```

Line-by-line explanation
- Line 1-2: Optional autoload if you use PHPMailer.
- Line 6-28: Reusable helper to send via PHPMailer (SMTP). This mirrors the earlier sample but is isolated for worker use.
- Line 34-40: Database connection for the queue.
- Line 46-61: Main loop: fetch next pending item, mark it processing, attempt to send, and update status accordingly.
- Line 63-66: If no item found, sleep briefly to avoid busy-waiting.

Idempotency and retries:
- The enqueue path uses a deterministic message_id to deduplicate identical requests.
- The worker updates status to sent on success; on failure, increments attempts and can be extended with exponential backoff or max_attempts.

## X. Common Beginner Mistakes — 3+ real pitfalls, side-by-side bad vs good
- Pitfall 1: Not validating inputs or escaping content
Bad:
```php
$to = $_GET['to'];
$subject = $_GET['subject'];
$mail->Body = $_GET['body']; // raw user input
```
Good:
```php
$to = filter_var($_GET['to'], FILTER_VALIDATE_EMAIL);
$subject = trim($_GET['subject'] ?? '');
$rawBody = $_POST['body'] ?? '';
$bodyHtml = htmlspecialchars($rawBody, ENT_QUOTES, 'UTF-8');
$mail->Body = $bodyHtml;
```

- Pitfall 2: Not setting both HTML and plain-text bodies
Bad:
```php
$mail->Body = $htmlOnly;
```
Good:
```php
$mail->Body = $htmlBody;
$mail->AltBody = $textBody;
```

- Pitfall 3: Skipping proper headers for HTML emails when using mail()
Bad:
```php
mail($to, $subject, $html);
```
Good:
```php
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= "From: Your Service <no-reply@yourdomain.com>\r\n";
mail($to, $subject, $html, $headers);
```

- Pitfall 4: No idempotency key to prevent duplicates
Bad:
```php
// Enqueue raw subject/body without idempotency handling
```
Good:
```php
$messageId = hash('sha256', $to . '|' . $subject . '|' . md5($html . $text));
```

- Pitfall 5: No observability or logging
Bad:
```php
// Silent failure
```
Good:
```php
error_log("Email to $to failed with status $httpCode");
```

## Y. Why This Matters In Real Systems — production context and real usage
- Deliverability and reputation: Use SPF/DKIM/DMARC, reputable domains, and provider-based sending to improve inbox placement.
- Observability: Centralized logging, per-email tracing (message_id), and webhooks for bounces, complaints, and deliveries.
- Reliability: Queueing decouples user actions from network variability; retries and backoffs reduce lost emails during transient outages.
- Compliance and security: Validate inputs, redact sensitive content in logs, rotate credentials, and audit email events.
- Scale and cost: API-based providers often provide analytics and deliverability insights; SMTP might be cheaper at scale but requires uptime and maintenance.
- Operational patterns: Rate limiting, batching (for notifications), and parallelism with safe concurrency controls.

## Z. Study Questions — 5 recall questions
1) What is the difference between transactional emails and notifications, and how does that influence your sender configuration?
2) How does idempotency help prevent duplicate emails, and what would be a practical approach to implement it in a PHP app?
3) Why is it important to send both HTML and plain-text bodies, and how do you implement AltBody in PHPMailer?
4) When would you prefer an SMTP-based approach vs an API-based provider (Mailgun/SendGrid), and what are the trade-offs?
5) Describe a basic queue pattern for email sending and a simple worker loop. What are the key failure modes to handle?

## Exercise — practical multi-part coding challenge
Goal: Build a small, end-to-end PHP email subsystem supporting transactional emails with templates, idempotency, and a simple queue.

Part A — Setup
- Create a PHP project (Composer-based if desired).
- Install PHPMailer (composer require phpmailer/phpmailer) for SMTP transport.
- Create a templates/order_email.html with placeholders {{name}} and {{order_id}}.
- Configure environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAILGUN_API_KEY (optional if using API path).

Part B — EmailService class
- Implement a class EmailService with:
  - __construct($transport = 'smtp') to choose between SMTP and API sending.
  - render(string $templateName, array $vars): string to render templates safely.
  - sendTransactional(string $to, string $subject, string $templateName, array $vars): bool using PHPMailer or API depending on transport.
  - enqueue(string $to, string $subject, string $templateName, array $vars): string returns the queued_id or message_id for idempotency.
  - processQueue(): void to pull from a simple queue (SQLite is fine) and send with retries; ensure idempotency by a message_id.

Part C — Idempotency
- Compute a message_id (e.g., SHA-256 of to|subject|template_hash) and store it in a unique database column to avoid duplicating the same email.

Part D — Simple Queue and Worker
- Implement a lightweight queue with a table (email_queue) containing message_id, to_email, subject, html_body, text_body, status, attempts, created_at, updated_at.
- Implement enqueue and a worker loop that fetches pending items, sends them, and marks status as sent or failed with retry logic.

Part E — Validation and Edge Cases
- Validate recipient emails; sanitize inputs; ensure HTML is escaped in templates.
- Add basic logging of success/failure and number of emails sent in a run.

Part F — Optional Enhancements
- Add a two-path sending strategy: SMTP for transactional emails; API-based provider for notification emails or high-volume bursts.
- Implement rate limiting and exponential backoff in the worker.
- Add webhooks handling example for delivery events.

What you should produce:
- A working EmailService class (or set of related functions) with at least:
  - SMTP-based transactional sending path
  - Template rendering
  - Idempotent enqueue and a basic queue worker
- A small README that describes how to run the code, how to test with a mock or real SMTP, and where to extend for production needs.

Note: In production, you’ll likely integrate a full-featured queue system (RabbitMQ, Redis-based queues, Symfony Messenger, Laravel Queues, etc.), and you’ll use a robust templating engine (Twig, Blade) and a dedicated mail service interface. The exercise focuses on core concepts: transport choice, templating, idempotency, queuing, and observability, all demonstrated here with PHP.