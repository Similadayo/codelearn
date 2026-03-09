# Track: Backend Engineering — Phase 7: Advanced API Features — Topic: Sending Email — Transactional & Notifications (JavaScript / Node.js)

Emails are a foundational channel for user engagement in modern apps. Transactional emails deliver important, user-triggered information such as order confirmations or password resets, while notifications keep users informed about relevant events. Building robust, scalable email capabilities requires clean API design, reliable transport, queueing and retries, and observability to ensure deliverability and operational health in production.

## 1. Understanding Email Types and API Design

- Transactional emails are user-specific and time-critical. They must reach the recipient reliably and promptly.
- Notifications (non-transactional) are ongoing communications like digests, feature updates, or promotional content. They can be batched or rate-limited.

This section covers a clean API shape, template rendering, and a simple email sender that distinguishes between the two types.

```js
// emailTemplates.js
const templates = {
  transactional: {
    orderConfirmation: (data) => `
      <h1>Order Confirmation #${data.orderId}</h1>
      <p>Hi ${data.name}, thanks for your purchase!</p>
      <p>Items:</p>
      <ul>${(data.items || []).map((i) => `<li>${i}</li>`).join('')}</ul>
      <p>Total: ${data.total ?? ''}</p>
    `,
    passwordReset: (data) => `
      <h1>Reset Your Password</h1>
      <p>Click the link to reset: <a href="${data.resetLink}">${data.resetLink}</a></p>
    `
  },
  notification: {
    digest: (data) => `
      <h1>Weekly Digest</h1>
      <p>Hello ${data.name}, here are your updates for ${data.date}.</p>
      <p>${data.summary || ''}</p>
    `
  }
};

function renderTemplate(type, name, data) {
  const tmpl = templates[type];
  if (!tmpl) throw new Error(`Unknown template type: ${type}`);
  const fn = tmpl[name];
  if (!fn) throw new Error(`Unknown template name: ${name}`);
  return fn(data);
}

module.exports = { renderTemplate };
```

```js
// emailService.js
const nodemailer = require('nodemailer');
const { renderTemplate } = require('./emailTemplates');

// SMTP config from environment (fallbacks for local dev)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
  // Optional: enable debug for development
  logger: process.env.SMTP_DEBUG === 'true' ? true : false,
  debug: process.env.SMTP_DEBUG === 'true' ? true : false,
});

async function sendEmail({ to, subject, html, text, from = 'no-reply@example.com' }) {
  const info = await transporter.sendMail({ from, to, subject, html, text });
  return info;
}

async function sendTransactionalEmail({ to, orderId, name, items, total, resetLink, data }) {
  // Use template for order confirmation; allow override via data if needed
  const html = renderTemplate(
    'transactional',
    'orderConfirmation',
    { orderId, name, items, total, resetLink, ...data }
  );
  const text = `Order Confirmation #${orderId}\nHi ${name}, thanks for your purchase!\nItems: ${JSON.stringify(items)}`;
  const subject = `Your order #${orderId} is confirmed`;
  return sendEmail({ to, subject, html, text });
}

async function sendNotificationEmail({ to, name, date, summary }) {
  const html = renderTemplate('notification', 'digest', { name, date, summary });
  const text = `Digest for ${name} - ${date}\n${summary || ''}`;
  const subject = `Your digest for ${date}`;
  return sendEmail({ to, subject, html, text });
}

module.exports = { sendTransactionalEmail, sendNotificationEmail };
```

### Line-by-line explanation

- emailTemplates.js
  - Line 1-2: Define a templates object with two top-level sections: transactional and notification.
  - Line 3-18: Provide a set of templates for transactional emails (orderConfirmation, passwordReset) that generate HTML strings from data.
  - Line 19-30: Provide a digest template under notification, generating HTML with name/date/summary data.
  - Line 32-40: renderTemplate(type, name, data) selects the correct template and invokes it with the provided data; throws meaningful errors if type/name are unknown.
  - Line 42: Export renderTemplate for use by the service layer.

- emailService.js
  - Line 1-2: Import dependencies (nodemailer and renderTemplate).
  - Line 5-14: Create an SMTP transporter using environment-sourced configuration. Includes options useful for development (debug).
  - Line 16-22: sendEmail is a thin wrapper around transporter.sendMail, returning delivery info.
  - Line 24-33: sendTransactionalEmail builds the HTML/text payload using order data, sets a descriptive subject, and delegates to sendEmail.
  - Line 35-41: sendNotificationEmail builds a digest email using the notification template and sends it.
  - Line 43-44: Export the two high-level functions.

Usage example (optional quick reference)
```js
// usage.js
const { sendTransactionalEmail, sendNotificationEmail } = require('./emailService');

(async () => {
  await sendTransactionalEmail({
    to: 'customer@example.com',
    orderId: 12345,
    name: 'Alex',
    items: ['Widget A', 'Widget B'],
    total: '$49.99'
  });

  await sendNotificationEmail({
    to: 'subscriber@example.com',
    name: 'Alex',
    date: '2026-03-09',
    summary: 'New features released this week.'
  });
})();
```

### Line-by-line explanation (usage snippet)
- Line 1-4: Import the two service functions to use in an application workflow.
- Line 6-15: Example invocation of sendTransactionalEmail with order data; the template engine renders HTML/text, which is then sent via SMTP.
- Line 17-23: Example invocation of sendNotificationEmail for a digest; similar flow.
- Line 25-31: Self-invoking async block to demonstrate usage; in real apps this would be within request handlers or background jobs.

## 2. Transport, Security, and Queuing to Improve Reliability

Delivery reliability often requires choosing a transport that matches your scale and a queue to decouple email work from user-facing paths. This section demonstrates a transport abstraction and a simple, retry-capable queue.

```js
// mailer.js
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'user',
      pass: process.env.SMTP_PASS || 'pass',
    },
  });
}

module.exports = { createTransporter };
```

```js
// queue.js
class EmailQueue {
  constructor({ transporter, concurrency = 1, maxRetries = 2 }) {
    this.transporter = transporter;
    this.queue = [];
    this.active = 0;
    this.concurrency = concurrency;
    this.maxRetries = maxRetries;
  }

  enqueue(mail) {
    // mail: { mail: MailOptions, retries?: number, id?: string }
    return new Promise((resolve, reject) => {
      const item = { ...mail, retries: mail.retries || 0, id: mail.id };
      this.queue.push({ item, resolve, reject });
      this._processNext();
    });
  }

  _processNext() {
    if (this.active >= this.concurrency) return;
    const next = this.queue.shift();
    if (!next) return;

    this.active += 1;
    const { item, resolve, reject } = next;

    this.transporter.sendMail(item.mail)
      .then((info) => {
        this.active -= 1;
        resolve(info);
        this._processNext();
      })
      .catch((err) => {
        this.active -= 1;
        if (item.retries < this.maxRetries) {
          item.retries += 1;
          // simple exponential backoff simulated with a tiny delay
          const delay = Math.min(1000 * Math.pow(2, item.retries), 8000);
          setTimeout(() => {
            this.queue.unshift({ item, resolve, reject });
            this._processNext();
          }, delay);
        } else {
          reject(err);
        }
        this._processNext();
      });
  }
}

module.exports = EmailQueue;
```

```js
// index.js (wire-up example)
const { createTransporter } = require('./mailer');
const EmailQueue = require('./queue');
const { sendTransactionalEmail, sendNotificationEmail } = require('./emailService');

(async () => {
  const transporter = createTransporter();
  const queue = new EmailQueue({ transporter, concurrency: 2, maxRetries: 3 });

  // Enqueue a transactional email
  queue.enqueue({
    mail: {
      from: 'no-reply@example.com',
      to: 'customer@example.com',
      subject: 'Your order is confirmed',
      html: '<p>Order details here</p>',
      text: 'Order details here',
    },
  }).then(console.log).catch(console.error);

  // Enqueue a notification email via the service API
  queue.enqueue({
    mail: await (async () => {
      // Build the mail payload using the service's renderer
      const html = require('./emailTemplates').renderTemplate('notification', 'digest', {
        name: 'Alex',
        date: '2026-03-09',
        summary: 'New features released this week.'
      });
      return {
        from: 'no-reply@example.com',
        to: 'subscriber@example.com',
        subject: 'Your digest for 2026-03-09',
        html,
        text: 'Digest for 2026-03-09',
      };
    })(),
  }).then(console.log).catch(console.error);
})();
```

### Line-by-line explanation

- mailer.js
  - Line 1-9: Export a createTransporter function that returns a configured Nodemailer transporter using env vars with sensible defaults.
  - Line 11-14: Exports the factory function; this allows test and prod configurations to be swapped easily.

- queue.js
  - Line 1-2: Define EmailQueue class that accepts a transporter, and tuning options.
  - Line 5-12: enqueue(mail) pushes a mail item into the internal queue and returns a Promise that resolves when the mail is sent or rejects on final failure.
  - Line 14-35: _processNext orchestrates concurrent sending up to the configured concurrency, handles success resolution, and implements exponential backoff with a retry limit.
  - Line 18-31: On send failure, if retries remain, schedule a retry after an increasing delay; otherwise reject with error.
  - Line 33: Export the queue class.

- index.js
  - Line 1-4: Import transporter factory, queue, and email service logic.
  - Line 6-7: Instantiate transporter and a queue with concurrency 2 and 3 max retries.
  - Line 10-28: Demonstrate enqueuing a raw transactional email and a notification email crafted via templates (via the EmailTemplates module). The exact payload structures can be adjusted to your templates.

## 3. Observability, Idempotency & Failure Handling

In production, you need to prevent duplicates, track delivery outcomes, and recover from transient errors. This section demonstrates a simple idempotency pattern, basic metrics hooks, and deterministic handling of retries.

```js
// idempotentSend.js
const { createTransporter } = require('./mailer');
const transporter = createTransporter();

const sentMessageIds = new Set();

async function idempotentSend(mail, messageId) {
  if (sentMessageIds.has(messageId)) {
    // Idempotent path: avoid resending the same message
    return { skipped: true, id: messageId };
  }
  const info = await transporter.sendMail(mail);
  sentMessageIds.add(messageId);
  return info;
}

// example usage
idempotentSend(
  {
    from: 'no-reply@example.com',
    to: 'customer@example.com',
    subject: 'Password reset',
    html: '<p>Reset link</p>',
    text: 'Reset link'
  },
  'password-reset-abc123'
).then(console.log).catch(console.error);
```

```js
// observability.js
const { createTransporter } = require('./mailer');
const transporter = createTransporter();

// Very lightweight metrics example (replace with real metrics library in prod)
let deliveredCount = 0;
let failedCount = 0;

async function sendWithMetrics(mail) {
  try {
    const info = await transporter.sendMail(mail);
    deliveredCount += 1;
    console.log(`EMAIL_DELIVERED ${info.messageId} total=${deliveredCount}`);
    return info;
  } catch (err) {
    failedCount += 1;
    console.error(`EMAIL_FAILED total=${failedCount}`, err);
    throw err;
  }
}
```

### Line-by-line explanation

- idempotentSend.js
  - Line 1-3: Import a transporter instance (could be from a shared module) and create it.
  - Line 5-9: Maintain an in-memory Set of message IDs that have already been sent.
  - Line 11-17: idempotentSend checks if the messageId has already been sent; if so, it returns a “skipped” result; otherwise, it sends the mail and records the messageId to guarantee idempotency on repeats.
  - Line 19-31: Example usage showing how to call idempotentSend with a password reset mail and a deterministic ID.

- observability.js
  - Line 1-3: Import a mail transporter.
  - Line 5-7: Simple in-memory counters for delivered and failed emails.
  - Line 9-18: sendWithMetrics wraps transporter.sendMail, increments counters, and logs a structured line suitable for parsing by monitoring systems.
  - Line 20-26: On error, logs and rethrows for caller-level handling.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Pitfall 1: Not using templates; hard-coding email content
  - Bad:
    ```js
    // bad.js
    const mail = {
      from: 'no-reply@example.com',
      to: 'user@example.com',
      subject: 'Welcome!',
      html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
      text: 'Welcome! Thanks for joining.'
    };
    // direct transporter.sendMail(mail)...
    ```
  - Good:
    ```js
    // good.js
    const { renderTemplate } = require('./emailTemplates');
    const mail = {
      from: 'no-reply@example.com',
      to: 'user@example.com',
      subject: 'Welcome!',
      html: renderTemplate('notification', 'digest', { name: 'User', date: 'today' }),
      text: 'Welcome! Thanks for joining.'
    };
    // then send via a unified service
    ```

- Pitfall 2: No error handling or retries
  - Bad:
    ```js
    // bad.js
    transporter.sendMail(mail); // no try/catch, no retries
    ```
  - Good:
    ```js
    // good.js
    try {
      const info = await transporter.sendMail(mail);
      console.log('Email sent', info.messageId);
    } catch (err) {
      // implement retry/backoff or push to failed queue
      console.error('Email failed', err);
    }
    ```

- Pitfall 3: Ignoring delivery feedback & deduplication
  - Bad:
    ```js
    // bad.js
    transporter.sendMail(mail); // no idempotency
    ```
  - Good:
    ```js
    // good.js
    const messageId = `${mail.to}-${Date.now()}`;
    // use a store (redis/db) to deduplicate on subsequent retries
    ```

- Pitfall 4: Not separating transactional vs notification logic
  - Bad:
    ```js
    // bad.js
    // Single function that sends both types with logic branching inside
    async function sendEmail(type, payload) { /* complex switch */ }
    ```
  - Good:
    ```js
    // good.js
    async function sendTransactionalEmail(payload) { /* specific template */ }
    async function sendNotificationEmail(payload) { /* specific template */ }
    ```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Reliability and delivery guarantees: Use queues, retries with backoff, and idempotency keys to ensure a single email per event even under failure.
- Scalable transport: SMTP works for small to moderate load; API providers (SendGrid, Mailgun, SES, etc.) scale better and provide analytics, bounce handling, and deliverability features.
- Observability: Track delivery success/failure rates, bounce rates, and open/ click-through metrics if you integrate with provider analytics or a separate metrics platform.
- Deliverability and compliance: Respect rate limits, avoid spam triggers, and handle bounce/ unsubscribe events to maintain sender reputation and comply with regulations.
- Idempotency and auditing: Maintain an event log with message IDs to prevent duplicates and to facilitate troubleshooting and dashboards for SLA reporting.

## Z. Study Questions — 5 Recall Questions

1. What is the difference between transactional emails and notifications in terms of content and delivery guarantees?
2. How can a template renderer improve maintainability for email content?
3. Why is an email queue beneficial in a backend service, and what are common retry strategies?
4. What is idempotency in the context of sending emails, and how can you implement it?
5. Name two observable signals you would collect for email delivery health in production.

## Exercise — a Practical Multi-Part Coding Challenge

Part A — Build a Small Email Service (Core)
- Objective: Create a small, testable email service that can send transactional and notification emails using a simple template system.
- Deliverables:
  - A templates module (emailTemplates.js) with at least two transactional templates and one notification template.
  - A service module (emailService.js) that exports:
    - sendTransactionalEmail(payload)
    - sendNotificationEmail(payload)
  - A minimal SMTP transporter configuration that reads from environment variables and includes a safe local-dev fallback.
- Steps:
  1) Implement templates for:
     - Order confirmation (transactional)
     - Password reset (transactional)
     - Digest (notification)
  2) Implement the email service that renders templates and sends via the transporter.
  3) Create a simple script to invoke both transactional and notification sends to verify integration.

Part B — Add a Lightweight Queue with Retries
- Objective: Decouple email sending from API paths and provide retry logic.
- Deliverables:
  - A queue module (queue.js) that accepts mail jobs and sends using a provided transporter.
  - Retry with exponential backoff up to a configurable max retries.
- Steps:
  1) Wire the queue to the email transporter.
  2) Enqueue both transactional and notification emails as separate jobs.
  3) Observe retry behavior on simulated transient errors (you can mock errors in a test environment).

Part C — Observability, Idempotency, and Monitoring
- Objective: Introduce idempotency and simple metrics to monitor health.
- Deliverables:
  - Idempotent send function that uses a messageId to deduplicate duplicates.
  - Lightweight metrics hooks that print or emit counts for delivered and failed emails.
- Steps:
  1) Implement idempotentSend(mail, messageId) ensuring no duplicate sends for the same messageId.
  2) Implement a wrapper around the queue that increments simple counters on success/failure.
  3) Write a small script to simulate a series of sends including duplicates and log the results.

Hints and tips:
- For local testing, you can use nodemailer’s test account (via createTestAccount) and a fake SMTP server; adjust code to detect test mode and switch transports accordingly.
- In real systems, migrate the in-memory deduplication to a persistent store (Redis, DynamoDB, etc.) to survive process restarts.
- Consider using a dedicated email provider with webhook support for bounce and complaint handling to improve deliverability.

This lesson provides a solid blueprint for building transactional and notification email features in Node.js, balancing API clarity, transport reliability, and operational observability for real-world systems.