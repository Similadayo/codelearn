# Track: Backend Engineering — Phase 7: Advanced API Features — Sending Email (Transactional & Notifications) in Go

Email is a mission-critical capability in modern backends. Transactional emails (order confirmations, password resets) must be reliable, timely, and with proper guarantees, while notifications (promotions, alerts) require scalable delivery and clear observability. This lesson builds a reusable email subsystem in Go that supports templating, multiple transport adapters (SMTP and API-based providers), queuing/retries, and observability to help you ship robust email features in production systems.

## 1. Core data model, interfaces, and contract

Code demonstrates the fundamental data structures and an abstract sender interface. This is the core abstraction you’ll swap for real transports without changing business logic.

```go
package email

type EmailType string

const (
    EmailTypeTransactional EmailType = "transactional"
    EmailTypeNotification  EmailType = "notification"
)

type Email struct {
    To, From, Subject string
    BodyHTML, BodyText string
    Type EmailType
    Data map[string]interface{} // data for templating
}
```

```go
package email

type EmailSender interface {
    Send(e Email) error
}
```

### Line-by-line explanation
- Defines EmailType as a string alias to distinguish kinds of emails.
- Declares two concrete email types: transactional and notification.
- Email struct models recipient, sender, subject, HTML/text bodies, the type, and templating data.
- EmailSender is a minimal interface that any transport must implement to send an email.

## 2. Templating and rendering

Templates keep business logic out of the transport layer and enable consistent branding and dynamic content.

```go
package email

import (
    "bytes"
    "html/template"
)

type TemplateEngine struct {
    htmlT *template.Template
    textT *template.Template
}

func NewTemplateEngine() *TemplateEngine {
    htmlTpl := template.Must(template.New("html").Parse(`<html><body><h1>{{.Subject}}</h1><div>{{.BodyHTML}}</div></body></html>`))
    textTpl := template.Must(template.New("text").Parse(`Subject: {{.Subject}}\n\n{{.BodyText}}`))
    return &TemplateEngine{
        htmlT: htmlTpl,
        textT: textTpl,
    }
}

func (te *TemplateEngine) Render(e Email) (htmlOut string, textOut string, err error) {
    // Prepare a simple data model for templates
    data := map[string]interface{}{
        "Subject":  e.Subject,
        "BodyHTML": e.BodyHTML,
        "BodyText": e.BodyText,
        "Data":     e.Data,
    }

    var htmlBuf bytes.Buffer
    if err = te.htmlT.Execute(&htmlBuf, data); err != nil {
        return "", "", err
    }

    var textBuf bytes.Buffer
    if err = te.textT.Execute(&textBuf, data); err != nil {
        return "", "", err
    }

    return htmlBuf.String(), textBuf.String(), nil
}
```

### Line-by-line explanation
- TemplateEngine holds precompiled HTML and plaintext templates.
- NewTemplateEngine builds HTML and text templates with placeholders for Subject and content.
- Render fills templates with a data map derived from the Email (Subject, BodyHTML, BodyText, and optional Data).
- Returns rendered HTML and text bodies or an error if templating fails.

## 3. SMTP and API transport implementations

Two concrete senders: one using SMTP, another using an HTTP API (e.g., SendGrid, Mailgun). Both render templates first, then dispatch.

SMTP sender:

```go
package email

import (
    "fmt"
    "net/smtp"
)

type SMTPConfig struct {
    Host     string
    Port     int
    Username string
    Password string
    From     string
}

type SMTPSender struct {
    cfg      SMTPConfig
    template *TemplateEngine
}

func NewSMTPSender(cfg SMTPConfig, te *TemplateEngine) *SMTPSender {
    return &SMTPSender{cfg: cfg, template: te}
}

func (s *SMTPSender) Send(e Email) error {
    htmlBody, textBody, err := s.template.Render(e)
    if err != nil {
        return err
    }

    boundary := "BOUNDARY123"
    msg := []byte(
        fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=%s\r\n\r\n",
            s.cfg.From, e.To, e.Subject, boundary),
    )
    // Multipart body
    msg = append(msg, []byte(fmt.Sprintf("--%s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n", boundary, textBody))...)
    msg = append(msg, []byte(fmt.Sprintf("--%s\r\nContent-Type: text/html; charset=utf-8\r\n\r\n%s\r\n", boundary, htmlBody))...)
    msg = append(msg, []byte(fmt.Sprintf("--%s--", boundary))...)

    addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
    auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)

    return smtp.SendMail(addr, auth, s.cfg.From, []string{e.To}, msg)
}
```

API-based sender:

```go
package email

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type APIConfig struct {
    Endpoint string
    APIKey   string
    From     string
    Client   *http.Client
}

type APISender struct {
    cfg      APIConfig
    template *TemplateEngine
}

func NewAPISender(cfg APIConfig, te *TemplateEngine) *APISender {
    if cfg.Client == nil {
        cfg.Client = http.DefaultClient
    }
    return &APISender{cfg: cfg, template: te}
}

func (a *APISender) Send(e Email) error {
    htmlBody, textBody, err := a.template.Render(e)
    if err != nil {
        return err
    }

    payload := map[string]interface{}{
        "from":    a.cfg.From,
        "to":      e.To,
        "subject": e.Subject,
        "text":    textBody,
        "html":    htmlBody,
    }
    body, _ := json.Marshal(payload)
    req, err := http.NewRequest("POST", a.cfg.Endpoint, bytes.NewReader(body))
    if err != nil {
        return err
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+a.cfg.APIKey)

    resp, err := a.cfg.Client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    if resp.StatusCode >= 200 && resp.StatusCode < 300 {
        return nil
    }
    return fmt.Errorf("email API responded with status %d", resp.StatusCode)
}
```

### Line-by-line explanation
- APIConfig stores endpoint, API key, sender address, and an HTTP client.
- APISender combines the template engine and API transport for sending.
- NewAPISender provides a default HTTP client if none is supplied.
- Send renders the email into HTML and text, builds a JSON payload, and POSTs it to the endpoint with a Bearer token.
- The method returns nil on success or an error on failure or non-2xx responses.

## 4. Transactional vs. Notification routing and a simple service layer

This section shows how you might wire the business intent (transactional vs notification) to a concrete transport and defaults, keeping the business logic transport-agnostic.

```go
package email

type EmailService struct {
    Sender EmailSender
    From   string
}

func (s *EmailService) Send(e Email) error {
    if e.From == "" {
        e.From = s.From
    }
    // Ensure a subject even if the caller forgot it
    if e.Subject == "" {
        switch e.Type {
        case EmailTypeTransactional:
            e.Subject = "Update from Your Service"
        case EmailTypeNotification:
            e.Subject = "New Notification"
        default:
            e.Subject = "Notification"
        }
    }
    // Render body content can be customized per type if needed
    return s.Sender.Send(e)
}

// Convenience helpers
func (s *EmailService) SendTransactional(to, subject, html, text string, data map[string]interface{}) error {
    e := Email{
        To:       to,
        From:     s.From,
        Subject:  subject,
        BodyHTML: html,
        BodyText: text,
        Type:     EmailTypeTransactional,
        Data:     data,
    }
    return s.Send(e)
}

func (s *EmailService) SendNotification(to, subject, html, text string, data map[string]interface{}) error {
    e := Email{
        To:       to,
        From:     s.From,
        Subject:  subject,
        BodyHTML: html,
        BodyText: text,
        Type:     EmailTypeNotification,
        Data:     data,
    }
    return s.Send(e)
}
```

### Line-by-line explanation
- EmailService holds a generic EmailSender and a default From address.
- Send fills missing metadata (From and Subject) to ensure consistent defaults.
- SendTransactional/SendNotification are convenience helpers creating properly-typed Email instances.
- The Send method delegates to the underlying transporter, keeping business logic transport-agnostic.

## 5. Queuing, retries, and reliability (simple in-process worker)

A production system often decouples web requests from email delivery. This snippet shows a simple in-process queue with a worker that retries with backoff.

```go
package email

import (
    "context"
    "time"
)

type EmailJob struct {
    E         Email
    Retries   int
    MaxRetries int
    Backoff    time.Duration
}

type EmailQueue struct {
    ch chan EmailJob
}

func NewEmailQueue(size int) *EmailQueue {
    return &EmailQueue{ch: make(chan EmailJob, size)}
}

func (q *EmailQueue) Enqueue(job EmailJob) {
    q.ch <- job
}

func (q *EmailQueue) StartWorker(ctx context.Context, svc *EmailService) {
    go func() {
        for {
            select {
            case <-ctx.Done():
                return
            case job := <-q.ch:
                if err := svc.Send(job.E); err != nil {
                    if job.Retries < job.MaxRetries {
                        // exponential backoff
                        next := job.Backoff * (1 << job.Retries)
                        time.AfterFunc(next, func() {
                            job.Retries++
                            q.Enqueue(job)
                        })
                    } else {
                        // drop or dead-letter
                    }
                }
            }
        }
    }()
}
```

### Line-by-line explanation
- EmailJob models a single email attempt with retry metadata.
- EmailQueue is a buffered channel-based queue for EmailJob items.
- NewEmailQueue constructs a queue with a given capacity.
- Enqueue places a new job onto the queue.
- StartWorker runs a background goroutine that processes jobs and retries on failure using exponential backoff.
- On success, the job completes; on repeated failure, it either retries or dead-letters/drops after MaxRetries.

## 6. Observability, tracing, and security considerations

Code-level hints:
- Instrument counters for total sent, succeeded, and failed emails.
- Emit latency histograms for Send operations.
- Use context propagation for tracing (e.g., OpenTelemetry).
- Store credentials in a secret manager; avoid hard-coding secrets.

Example snippet (conceptual, not a full setup):

```go
// Pseudo-code: metrics (Prometheus style)
var (
    emailsSent    = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "emails_sent_total", Help: "Total emails sent"}, []string{"type"})
    emailsFailed  = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "emails_failed_total", Help: "Total emails failed"}, []string{"type"})
    emailLatency  = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "email_latency_seconds", Help: "Send latency"}, []string{"type"})
)
```

### Line-by-line explanation
- Declares metrics for counts and latency by email type to observe throughput and reliability.
- In real code, you would initialize and register these metrics with your Prometheus exporter or your chosen observability stack.
- Trace and propagate a tracing span around each Send operation for end-to-end visibility.

## X. Common Beginner Mistakes — 3+ real pitfalls (bad vs good)

- Pitfall 1: Ignoring errors from template rendering or transports
  - Bad:
    ```go
    func (s *SMTPSender) Send(e Email) error {
        s.template.Render(e) // ignore error
        // ... proceed
        smtp.SendMail(...)
        return nil
    }
    ```
  - Good:
    ```go
    func (s *SMTPSender) Send(e Email) error {
        html, text, err := s.template.Render(e)
        if err != nil { return err }
        // build message with html/text
        return smtp.SendMail(addr, auth, from, []string{to}, msg)
    }
    ```

- Pitfall 2: Embedding credentials in code
  - Bad:
    ```go
    cfg := SMTPConfig{Host: "smtp.example.com", Username: "user", Password: "pass"}
    ```
  - Good:
    ```go
    cfg := SMTPConfig{
      Host:     os.Getenv("SMTP_HOST"),
      Port:     587,
      Username: os.Getenv("SMTP_USERNAME"),
      Password: os.Getenv("SMTP_PASSWORD"),
    }
    // Secrets retrieved from env or a secret manager, not hard-coded
    ```

- Pitfall 3: Not idempotent/deduplicated sending
  - Bad:
    ```go
    // Endpoint triggers Send immediately on every call
    svc.Send(Email{To: "...", Subject: "...", ...})
    ```
  - Good:
    ```go
    // Use idempotency keys and a durable queue or DB dedupe
    if existsInStore(email.UID) { return nil }
    enqueueEmailJob(email)
    ```

- Pitfall 4: Mixing business logic with transport logic
  - Bad:
    ```go
    // Endpoint handler directly formats MIME and calls SMTP
    ```
  - Good:
    ```go
    // Use EmailService abstraction and transport adapters; keep HTTP layer thin
    svc.SendTransactional(to, subject, html, text, data)
    ```

- Pitfall 5: Not handling content-type and encoding properly
  - Bad:
    ```go
    msg := []byte("Subject: " + e.Subject + "\r\n\r\n" + e.BodyHTML)
    ```
  - Good:
    ```go
    // Proper multipart MIME with text and HTML parts (as shown in SMTPSender)
    ```

## Y. Why This Matters In Real Systems — production context and usage

- Reliability: transactional emails must deliver and be retried with controlled backoffs to avoid spamming users or hitting provider rate limits.
- Scalability: a transport-agnostic design lets you swap SMTP for an API provider without touching business logic; you can route notification emails to a lighter-weight API vs. more personalized transactional emails through dedicated templates.
- Observability: metrics, traces, and structured logging help identify bottlenecks, bounce rates, and SLA adherence.
- Security: never embed credentials; use environment variables or a secrets manager and rotate credentials periodically; validate email addresses to prevent abuse.
- Compliance and deliverability: manage unsubscribe handling for notifications, respect user preferences, and apply DKIM/SPF with providers to improve inbox placement.

## Z. Study Questions — 5 recall questions

1) What is the difference between transactional and notification emails, and how should the system reflect that difference in code?
2) Why is template rendering separated from the transport layer, and what are the benefits?
3) What are the main concerns when introducing a queue and retry mechanism for sending emails?
4) How would you implement deduplication to prevent duplicate emails for the same event?
5) Which observability signals would you collect for email delivery, and why?

## Exercise — practical multi-part coding challenge

Part A — Implement a reusable email pipeline
- Goal: Build a small Go module that ties together the core data model, templating, and two transports (SMTP and API).
- Steps:
  1) Create a new Go module and package email with the code blocks from Sections 1–3 above.
  2) Wire a TemplateEngine with two sample templates (HTML and Text) and verify Render produces coherent output.
  3) Implement SMTPSender and APISender using the sample configuration or mock endpoints.
  4) Create EmailService with From address and helper methods to send transactional and notification emails.
  5) Write a small main function that constructs an EmailService, chooses a transport based on an environment variable, and sends one transactional and one notification email.

Part B — Add a simple in-process queue with backoff
- Goal: Demonstrate decoupling and retry for reliability.
- Steps:
  1) Use the EmailQueue and EmailJob types from Section 5.
  2) Create a small producer that enqueues a few email jobs, some with a simulated failure.
  3) Spin up a worker in a context that processes jobs and retries with exponential backoff.
  4) Observe that failed jobs eventually move to dead-letter or stop retrying after MaxRetries.

Part C — Basic observability
- Goal: Add metrics to the sending path.
- Steps:
  1) Wire in two counters (emails_sent_total, emails_failed_total) and a latency histogram (email_latency_seconds) by email type.
  2) Increment metrics in the Send path accordingly and expose them via a simple HTTP endpoint using a minimal Prometheus exporter.
  3) Run the program and curl the metrics endpoint to verify the counts update.

Part D — Security and production readiness
- Goal: Identify and mitigate common production risks.
- Steps:
  1) Replace hard-coded credentials with environment variables.
  2) Add input validation for email fields (recipient format, subject length).
  3) Implement a primitive deduplication check (e.g., by a unique event ID) to prevent resending the same email.
  4) Document how you would add a real dead-letter queue (e.g., RabbitMQ/Kafka) for failed deliveries.

This completes a complete, structured, practical lesson on sending email in Go for transactional and notification use cases, with templates, transports, reliability, observability, and production considerations.