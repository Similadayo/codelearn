# Sending Email — Transactional & Notifications in Python

Emails are the backbone of reliable customer communications. In backend systems, transactional emails (order confirmations, password resets) require reliability, security, and predictable delivery. Notifications (alerts, onboarding messages) often run at higher volume and must scale, tolerate retries, and integrate with observability. This lesson teaches you how to design, implement, and operate Python-based email sending for both transactional and notification use cases, with hands-on code, best practices, and production considerations.

## 1. Conceptual foundations: transactional vs notifications

- Transactional emails: triggered by user actions or system events (e.g., password reset, order receipt). They must be delivered reliably and with accurate, personalized content. Deliverability and timing are critical.
- Notifications: often higher-volume messages about events (alerts, reminders, digest emails). They prioritize throughput, batching, and user-specific preferences (time windows, suppression lists).

Key considerations across both:
- Security: protect credentials, use TLS, and validate recipients.
- Personalization: templates with data placeholders.
- Deliverability: proper sender reputation, SPF/DKIM, unsubscribe handling.
- Observability: trace IDs, logging, metrics for delivery success/failure.
- Reliability: retries with backoff, idempotency keys to avoid duplicates.

Code examples in this lesson focus on four pillars: SMTP basics, templating, asynchronous sending for throughput, and integrating with a modern email service API.

---

## 1.0. Prerequisites and project structure (quick tour)

- Python 3.8+ (async features used in sections)
- Basic libraries: smtplib, ssl, email.message, typing
- Optional: aiosmtplib for async SMTP, requests for external API
- Optional: a small templating approach (string.Template) to keep dependencies light

A typical project layout for a backend service might look like:
- app/
  - email/
    - sender.py
    - templates/
      - welcome.html
      - password_reset.txt
  - workers/
    - email_worker.py
- config.py (loads env vars)
- requirements.txt

---

## 2. 1. SMTP basics: sending a simple email

This section demonstrates sending a plain-text transactional email via SMTP with TLS.

Code: SMTP simple send (plain text)

```python
import smtplib
import ssl
from email.message import EmailMessage

def send_email_smtp(to_email: str, subject: str, body: str,
                    from_email: str,
                    smtp_host: str, smtp_port: int,
                    username: str, password: str,
                    use_tls: bool = True) -> None:
    # Build the email message
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email
    msg.set_content(body)

    # Create a secure SSL context
    context = ssl.create_default_context()

    # Connect and authenticate
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        if use_tls:
            server.starttls(context=context)
        server.login(username, password)
        server.send_message(msg)
```

### Line-by-line explanation
- import smtplib, ssl: Bring in SMTP client and TLS context utilities.
- from email.message import EmailMessage: Use a modern, easy-to-construct email object.
- def send_email_smtp(...): Define a function to send a single email via SMTP.
- msg = EmailMessage(): Create a new email message container.
- msg['Subject'] = subject: Set the email subject header.
- msg['From'] = from_email: Set the sender address.
- msg['To'] = to_email: Set the recipient address.
- msg.set_content(body): Set the plain-text body of the email.
- context = ssl.create_default_context(): Prepare a secure TLS context for encryption.
- with smtplib.SMTP(smtp_host, smtp_port) as server:: Open an SMTP connection with the given host/port.
- if use_tls: server.starttls(context=context): If TLS is requested, elevate the connection to TLS.
- server.login(username, password): Authenticate to the SMTP server.
- server.send_message(msg): Send the constructed email message to the recipient.
- The context manager ensures the connection is closed cleanly.

---

## 2. 2. Templating and HTML emails: personalization and rich content

Transactional emails often need HTML content and personalization. This example uses Python's built-in string.Template to render both a plain-text and HTML version from a small template.

Code: HTML + text templates with simple substitution

```python
from string import Template
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def render_template(template_str: str, data: dict) -> str:
    tmpl = Template(template_str)
    return tmpl.safe_substitute(data)

def send_email_with_templates(to_email: str, subject: str, from_email: str,
                              smtp_host: str, smtp_port: int,
                              username: str, password: str,
                              user_name: str, reset_link: str) -> None:
    # Templates
    text_tpl = (
        "Hello ${name},\n\n"
        "To reset your password, click the following link:\n"
        "${link}\n\n"
        "If you did not request this, please ignore."
    )
    html_tpl = """
    <html>
      <body>
        <p>Hello <strong>${name}</strong>,</p>
        <p>To reset your password, click the link below:</p>
        <p><a href="${link}">${link}</a></p>
        <p>If you did not request this, please ignore.</p>
      </body>
    </html>
    """

    data = {'name': user_name, 'link': reset_link}
    text_body = render_template(text_tpl, data)
    html_body = render_template(html_tpl, data)

    # Build a multipart email (plain + HTML)
    msg = MIMEMultipart("alternative")
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email
    part1 = MIMEText(text_body, "plain")
    part2 = MIMEText(html_body, "html")
    msg.attach(part1)
    msg.attach(part2)

    # SMTP sending (TLS)
    import smtplib, ssl
    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls(context=context)
        server.login(username, password)
        server.send_message(msg)
```

### Line-by-line explanation
- from string import Template: Import a simple template engine.
- from email.mime.multipart import MIMEMultipart; from email.mime.text import MIMEText: Prepare a MIME multipart message with both text and HTML parts.
- def render_template(template_str: str, data: dict) -> str: Simple helper to render a string-based template with data.
- tmpl = Template(template_str); return tmpl.safe_substitute(data): Perform safe substitution with data values.
- def send_email_with_templates(...): High-level function to send a templated email.
- text_tpl, html_tpl: Plain-text and HTML templates with placeholders for name and link.
- data = {'name': user_name, 'link': reset_link}: Fill in dynamic content.
- text_body = render_template(text_tpl, data); html_body = render_template(html_tpl, data): Generate final bodies.
- msg = MIMEMultipart("alternative"): Create a container that can hold multiple representations.
- msg['Subject'/ 'From'/ 'To']: Set headers.
- part1 = MIMEText(text_body, "plain"); part2 = MIMEText(html_body, "html"); msg.attach(...): Attach both representations to the email.
- The rest of the block opens a TLS connection and sends the message.

---

## 2. 3. Async sending for throughput: aiosmtplib example

For high-throughput backends, asynchronous sending allows overlapping I/O and better utilization of connections.

Code: Async SMTP sending with aiosmtplib

```python
import asyncio
from email.message import EmailMessage
from aiosmtplib import SMTP

async def send_email_async(to_email: str, subject: str, body: str,
                           from_email: str,
                           smtp_host: str, smtp_port: int,
                           username: str, password: str) -> None:
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email
    msg.set_content(body)

    smtp = SMTP(hostname=smtp_host, port=smtp_port, use_tls=True)

    await smtp.connect()
    await smtp.starttls()
    await smtp.login(username, password)
    await smtp.send_message(msg)
    await smtp.quit()

# Example usage
# asyncio.run(send_email_async("user@example.com", "Subject", "Body", "no-reply@example.com", "smtp.example.com", 587, "user", "pass"))
```

### Line-by-line explanation
- import asyncio: Bring in the asynchronous runtime for Python.
- from email.message import EmailMessage: Email container for the message.
- from aiosmtplib import SMTP: Async SMTP client library.
- async def send_email_async(...): Define an asynchronous function to send email.
- msg = EmailMessage(): Create the email container and set headers.
- smtp = SMTP(..., use_tls=True): Prepare an async SMTP client with TLS.
- await smtp.connect(): Open the connection to the SMTP server.
- await smtp.starttls(): Upgrade to a secure TLS channel.
- await smtp.login(...): Authenticate with the SMTP server.
- await smtp.send_message(msg): Send the constructed email.
- await smtp.quit(): Close the connection gracefully.
- Example usage commented: Shows how to call the coroutine with asyncio.

Notes:
- Async sending shines when you need to dispatch many emails concurrently (e.g., event-driven notifications).
- Consider connection pooling and rate limiting in production to avoid overwhelming the SMTP server.

---

## 2. 4. Using an external email service API (SendGrid-like) via REST

Many teams prefer a dedicated email service for deliverability, metrics, and retries. Here’s a straightforward approach using a REST API.

Code: REST API send via requests (illustrative, no external dependencies beyond requests)

```python
import json
import requests

def send_email_via_api(to_email: str, subject: str, html_body: str,
                       from_email: str, api_key: str,
                       transaction_id: str = None) -> dict:
    url = "https://api.mailprovider.example/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "personalizations": [
            {
                "to": [{"email": to_email}],
                "subject": subject,
                "headers": {"X-Transaction-Id": transaction_id or ""}
            }
        ],
        "from": {"email": from_email},
        "content": [
            {"type": "text/html", "value": html_body}
        ]
    }
    response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=10)
    response.raise_for_status()
    return response.json()
```

### Line-by-line explanation
- import json, requests: Bring in JSON handling and HTTP library for REST API calls.
- def send_email_via_api(...): Define a function to send an email via a provider’s API.
- url = "https://api.mailprovider.example/v3/mail/send": Endpoint for the provider’s API.
- headers = { "Authorization": f"Bearer {api_key}", "Content-Type": "application/json" }: Authorization and content type.
- payload = { ... }: Build the API payload with recipient, subject, and content. You can extend with templates, substitutions, attachments, CC/BCC.
- "personalizations": [{"to": [{"email": to_email}], "subject": subject, "headers": {"X-Transaction-Id": transaction_id or ""}}]: Personalization details including an optional transaction ID for tracing.
- "from": {"email": from_email}: Sender information.
- "content": [{"type": "text/html", "value": html_body}]: HTML content; many providers also support a plain text alternative.
- response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=10): Make the HTTP request with a timeout.
- response.raise_for_status(): Raise an exception for non-2xx responses.
- return response.json(): Return parsed API response for success or to log delivery status.

Notes:
- Replace the URL with the actual provider endpoint (SendGrid, Mailgun, SES, etc.).
- Use environment variables or a secrets manager for api_key.
- Many providers offer templates and substitutions you can map to your data model.

---

## 2. 5. Observability, error handling, and retries

A robust email pipeline must be observable and resilient.

Code: Simple retry with exponential backoff (no external deps)

```python
import time
import smtplib
import ssl
from email.message import EmailMessage

def send_email_with_retries(to_email, subject, body, from_email,
                            smtp_host, smtp_port, username, password,
                            max_retries: int = 3, backoff_factor: float = 0.5) -> None:
    attempt = 0
    while True:
        try:
            msg = EmailMessage()
            msg['Subject'] = subject
            msg['From'] = from_email
            msg['To'] = to_email
            msg.set_content(body)

            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls(context=context)
                server.login(username, password)
                server.send_message(msg)
            return  # success
        except Exception as ex:
            attempt += 1
            if attempt > max_retries:
                # In real systems, log and surface a failure to a dead-letter queue
                print(f"Email send failed after {max_retries} retries: {ex}")
                raise
            sleep = backoff_factor * (2 ** (attempt - 1))
            time.sleep(sleep)
```

### Line-by-line explanation
- import time: For sleep-based backoff between retries.
- The function defines a retry loop with exponential backoff.
- The try block contains the standard SMTP sending logic.
- If sending fails, we increment attempt and, if retries remain, sleep for a backoff period before retrying.
- After exhausting retries, we log and re-raise the exception to surface the failure to the caller.

Observability tips for production:
- Add a correlation_id to every email (per-user or per-event) and include it in logs and metrics.
- Emit metrics for: attempts, successes, failures, and latency.
- Use a queue (e.g., RabbitMQ, Redis Queue) so failed messages can be retried without blocking the main path.
- Implement dead-letter queues for undeliverable emails (bounces, hard failures).

---

## X. Common Beginner Mistakes

### Pitfall 1: Hardcoding credentials
Bad
```python
# Never do this in production
SMTP_PASSWORD = "supersecret"
```

Good
```python
import os
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SMTP_USER = os.environ.get("SMTP_USER")
```

### Pitfall 2: Not using TLS/secure channels
Bad
```python
with smtplib.SMTP(smtp_host, smtp_port) as server:
    server.login(user, password)
    server.send_message(msg)
```

Good
```python
with smtplib.SMTP(smtp_host, smtp_port) as server:
    server.starttls(context=ssl.create_default_context())
    server.login(user, password)
    server.send_message(msg)
```

### Pitfall 3: Plain text emails only; no HTML or proper MIME parts
Bad
```python
msg = EmailMessage()
msg['Subject'] = subject
msg['From'] = from_email
msg['To'] = to_email
msg.set_content(body)  # plain text only
```

Good
```python
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

msg = MIMEMultipart("alternative")
msg['Subject'] = subject
msg['From'] = from_email
msg['To'] = to_email

text = body
html = f"<html><body><p>{body}</p></body></html>"
part1 = MIMEText(text, "plain")
part2 = MIMEText(html, "html")
msg.attach(part1)
msg.attach(part2)
```

### Pitfall 4: Ignoring delivery failures and bounce handling
Bad
```python
# Fire and forget; no error handling or retries
server.send_message(msg)
```

Good
```python
try:
    server.send_message(msg)
except smtplib.SMTPException as e:
    # Log, retry, or route to dead-letter queue
    logger.error("Email send failed: %s", e)
```

---

## Y. Why This Matters In Real Systems

- Deliverability and trust: Use TLS, SPF, DKIM, and DMARC to improve inbox placement. Keep a clean sender reputation by handling bounces and unsubscribes properly.
- Personalization at scale: Templating enables tailored content without duplicating code. Use data models to map user data to template fields and ensure content is safe (escape user-provided data).
- Throughput and reliability: Async sending and worker-based pipelines prevent blocking request threads and improve user experience for high-volume notifications.
- Observability and tracing: Correlate emails with requests using IDs, track statuses (queued, delivered, opened), and monitor retry counts.
- Security posture: Store credentials securely (env vars or secret managers), rotate credentials, and minimize permissions (read-only where possible).

In real systems, emails are often part of a larger communications platform with queues, workers, A/B testing for templates, analytics dashboards, and alerting on failures. The patterns shown here form the core building blocks you’ll extend with queues, templating engines, and provider integrations.

---

## Z. Study Questions

1) What is the difference between transactional emails and notifications in backend systems?  
2) Why should you use TLS when sending emails via SMTP, and what common mistakes exist around TLS configuration?  
3) How can you implement simple HTML templates without introducing heavy dependencies?  
4) What are the benefits of asynchronous email sending in high-throughput systems?  
5) Name two production concerns you’d address beyond just sending the email (e.g., observability, retries, deduplication).

---

## Exercise

Part A: Build a reusable EmailService in Python

- Create a module email_sender.py that exposes a class EmailService.
- It should support:
  - Initialization with SMTP config (host, port, user, password, use_tls).
  - send_plain(to, subject, body) for plain-text transactional emails.
  - send_html(to, subject, text_body, html_body) to send a multipart email with both text and HTML.
  - Optional: render_template(subject, to, template_str, data) using string.Template for simple templating.
- Implement environment-variable-based config loading to avoid hardcoding credentials.
- Add basic error handling and retry logic with exponential backoff (3 retries).
- Provide a small usage example in a separate snippet demonstrating how to send a password-reset email with a rendered template.

Part B: Async path and integration sketch

- Extend the EmailService with an async_send_plain(to, subject, body) method using aiosmtplib (or outline how you’d wire to a worker/queue).
- Show a minimal async example invoking the method concurrently for two recipients.
- Sketch how you would integrate this into a message queue (e.g., push email tasks to a Redis-backed queue) and an accompanying worker that calls the async path.

Part C: External service integration mini-project

- Implement a function send_email_via_provider(to, subject, html_body, from_email, api_key) using a REST API pattern as shown in section 2.2.
- Add simple unit-test-like usage to ensure you’d call the correct endpoint and payload.

Deliverables:
- A self-contained Python package (code snippets) that demonstrates the patterns above.
- A short README-style explanation documenting the choices, configuration, and extension points for your team.