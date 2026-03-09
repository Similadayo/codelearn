# Track: Backend Engineering — Module Phase 7 — Advanced API Features
## Topic: Sending Email — Transactional & Notifications (Java)

Compelling introductory paragraph: Email delivery is a cornerstone of user communications in modern systems. Whether you’re sending order confirmations, password resets, or real-time notifications, reliable transactional emails and timely user notifications are essential for trust, security, and engagement. This lesson walks you through Java-based strategies to send, template, queue, retry, and observe email delivery in real systems, with a focus on correctness, scalability, and maintainability.

## 1. SMTP Email with JavaMail (Transactional Basics)

Code: basic SMTP email send using JavaMail (Jakarta Mail / javax.mail).

```java
// Basic SMTP email sender using JavaMail (javax.mail)
import javax.mail.*;
import javax.mail.internet.*;
import java.util.Properties;

public class EmailService {
  private final String host;
  private final int port;
  private final String username;
  private final String password;

  public EmailService(String host, int port, String username, String password) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
  }

  public void sendEmail(String to, String subject, String htmlBody) throws MessagingException {
    Properties props = new Properties();
    props.put("mail.smtp.auth", "true");
    props.put("mail.smtp.starttls.enable", "true");
    props.put("mail.smtp.host", host);
    props.put("mail.smtp.port", String.valueOf(port));

    Session session = Session.getInstance(props, new Authenticator() {
      @Override
      protected PasswordAuthentication getPasswordAuthentication() {
        return new PasswordAuthentication(username, password);
      }
    });

    Message message = new MimeMessage(session);
    message.setFrom(new InternetAddress(username));
    message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to, false));
    message.setSubject(subject);
    message.setContent(htmlBody, "text/html; charset=utf-8");

    Transport.send(message);
  }
}
```

### Line-by-line explanation
- Imports: bring in JavaMail classes needed to construct and send emails.
- Class fields: store SMTP host, port, and credentials used for authentication.
- Constructor: initializes SMTP configuration.
- sendEmail: builds the SMTP session with authentication and TLS.
- Properties: enable authentication and TLS, and set host/port.
- Session.getInstance: creates a mail session with an Authenticator that returns credentials.
- MimeMessage: constructs the email with a from address, recipients, subject, and HTML body.
- setContent: defines the content type as HTML.
- Transport.send: sends the message using the configured session.

## 2. Async Sending, Templates, and Personalization

Code: asynchronous sending wrapper, and template rendering with FreeMarker for personalization.

```java
// Async email sender using a small thread pool
import java.util.concurrent.*;

public class AsyncEmailSender {
  private final EmailService emailService;
  private final ExecutorService executor;

  public AsyncEmailSender(EmailService emailService, int poolSize) {
    this.emailService = emailService;
    this.executor = Executors.newFixedThreadPool(poolSize);
  }

  public CompletableFuture<Void> sendAsync(String to, String subject, String htmlBody) {
    return CompletableFuture.runAsync(() -> {
      try {
        emailService.sendEmail(to, subject, htmlBody);
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    }, executor);
  }

  public void shutdown() {
    executor.shutdown();
  }
}
```

```java
// FreeMarker-based HTML template rendering for personalized emails
import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateException;

import java.io.StringWriter;
import java.util.Map;

public class TemplateRenderer {
  private final Configuration cfg;

  public TemplateRenderer() {
    cfg = new Configuration(Configuration.VERSION_2_3_31);
    cfg.setClassForTemplateLoading(getClass(), "/templates");
    cfg.setDefaultEncoding("UTF-8");
  }

  public String render(String templateName, Map<String, Object> data) throws Exception {
    Template template = cfg.getTemplate(templateName);
    StringWriter writer = new StringWriter();
    template.process(data, writer);
    return writer.toString();
  }
}
```

```java
// Example usage: render a transactional email and send asynchronously
import java.util.Map;

public class EmailWorkflowExample {
  public static void main(String[] args) throws Exception {
    EmailService emailService = new EmailService("smtp.example.com", 587, "no-reply@example.com", "secret");
    AsyncEmailSender asyncSender = new AsyncEmailSender(emailService, 4);
    TemplateRenderer renderer = new TemplateRenderer();

    Map<String, Object> data = Map.of(
      "userName", "Alice",
      "orderId", "ORD-12345",
      "status", "shipped"
    );
    String html = renderer.render("order_status.ftl", data);

    asyncSender.sendAsync("alice@example.com", "Your order ORD-12345 is now shipped", html)
      .thenRun(() -> System.out.println("Email enqueue/delivery attempted"))
      .exceptionally(ex -> {
        ex.printStackTrace();
        return null;
      });

    // Allow async task to complete in this simple demo
    Thread.sleep(5000);
    asyncSender.shutdown();
  }
}
```

### Line-by-line explanation
- AsyncEmailSender: wraps EmailService with a fixed-size thread pool and exposes a non-blocking API using CompletableFuture.
- sendAsync: submits the email send task to the executor; exceptions are propagated as runtime exceptions for centralized handling.
- TemplateRenderer: configures FreeMarker, loads templates from the classpath under /templates, and renders templates with a data map.
- render: loads a template by name and processes it with the provided data, producing HTML content.
- EmailWorkflowExample: demonstrates rendering a personalized order-status email and sending it asynchronously to a user.

## 3. Cloud Email Service: AWS SES (V2 SDK)

Code: sending email via AWS SES using the Java SDK (recommended for scalable, managed delivery).

```java
// AWS SES v2: Send an HTML email
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

public class SesEmailService {
  private final SesClient client;
  private final String source;

  public SesEmailService(Region region, String source) {
    this.client = SesClient.builder().region(region).build();
    this.source = source;
  }

  public void sendEmail(String to, String subject, String htmlBody) {
    Destination dest = Destination.builder().toAddresses(to).build();

    Content subjectContent = Content.builder().data(subject).charset("UTF-8").build();
    Content htmlContent = Content.builder().data(htmlBody).charset("UTF-8").build();
    Body body = Body.builder().html(htmlContent).build();
    Message message = Message.builder().subject(subjectContent).body(body).build();

    SendEmailRequest request = SendEmailRequest.builder()
        .source(source)
        .destination(dest)
        .message(message)
        .build();

    client.sendEmail(request);
  }

  public void close() {
    client.close();
  }
}
```

### Line-by-line explanation
- SES client creation: initializes a managed AWS SES client in a specific region.
- Destination: defines recipient email addresses.
- Content: constructs the subject and HTML body; UTF-8 encoding ensures correctness for international content.
- Message and Body: assemble the full email payload for SES.
- SendEmailRequest: encapsulates all parts of the email to SES for delivery.
- client.sendEmail: performs the API call to AWS SES.
- close: cleans up AWS SDK resources when done.

Note: For production, ensure proper IAM permissions, cross-account sending if needed, DKIM/SPF configuration, and region alignment with your SES setup.

## 4. Templates, Personalization, and Security Best Practices

Code: secure templates and escaping to avoid injection, plus a quick example of a minimal templating approach without leaking secrets.

```java
// Example: safe string escaping for HTML (minimal, in-place)
public class HtmlEscaper {
  public static String escapeHtml(String input) {
    if (input == null) return "";
    return input
      .replace("&", "&amp;")
      .replace("<", "&lt;")
      .replace(">", "&gt;")
      .replace("\"", "&quot;")
      .replace("'", "&#x27;");
  }
}

// Simple usage with a template string (no external engine for this minimal example)
public class SimpleHtmlEmail {
  public static String render(String userName, String orderId, String status) {
    String safeUser = HtmlEscaper.escapeHtml(userName);
    String safeOrder = HtmlEscaper.escapeHtml(orderId);
    String safeStatus = HtmlEscaper.escapeHtml(status);
    return "<html><body>"
      + "<p>Hi " + safeUser + ",</p>"
      + "<p>Your order " + safeOrder + " is now " + safeStatus + ".</p>"
      + "</body></html>";
  }
}
```

### Line-by-line explanation
- HtmlEscaper: provides a minimal HTML escaping function to prevent basic injection in email content.
- SimpleHtmlEmail.render: demonstrates composing a basic HTML email with escaped user-supplied data to reduce risk of XSS-like content in email clients.
- This approach complements full templating engines by illustrating the importance of input sanitization before rendering content.

Production takeaway: prefer a robust templating engine (FreeMarker, Thymeleaf) for complex templates, consistent escaping settings, and easy internationalization. Always sanitize user-supplied content before embedding in HTML, and consider URL escaping for any links in emails.

## 5. Observability, Reliability, and Delivery Patterns

Code: basic retry with exponential backoff and a simple in-memory queue example to illustrate reliability patterns.

```java
// Simple exponential backoff retry utility
public class RetryInterceptor {
  private final int maxRetries;
  private final long initialDelayMs;

  public RetryInterceptor(int maxRetries, long initialDelayMs) {
    this.maxRetries = maxRetries;
    this.initialDelayMs = initialDelayMs;
  }

  public void executeWithRetry(Runnable task) {
    int attempt = 0;
    long delay = initialDelayMs;
    while (true) {
      try {
        task.run();
        return;
      } catch (Exception e) {
        attempt++;
        if (attempt > maxRetries) {
          throw e;
        }
        try {
          Thread.sleep(delay);
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          throw new RuntimeException(ie);
        }
        delay = Math.min(delay * 2, 60_000); // cap at 60 seconds
      }
    }
  }
}
```

```java
// Simple in-process email queue with a worker
import java.util.concurrent.*;

public class EmailQueue {
  private final BlockingQueue<EmailTask> queue = new LinkedBlockingQueue<>();
  private final EmailService emailService;
  private final RetryInterceptor retry;

  public EmailQueue(EmailService emailService, int maxRetries) {
    this.emailService = emailService;
    this.retry = new RetryInterceptor(maxRetries, 1000);
    startWorker();
  }

  public void enqueue(String to, String subject, String htmlBody) {
    queue.add(new EmailTask(to, subject, htmlBody));
  }

  private void startWorker() {
    new Thread(() -> {
      while (true) {
        try {
          EmailTask t = queue.take();
          retry.executeWithRetry(() -> {
            try {
              emailService.sendEmail(t.to, t.subject, t.htmlBody);
            } catch (Exception e) {
              throw new RuntimeException(e);
            }
          });
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          break;
        } catch (Exception e) {
          // log and continue
          e.printStackTrace();
        }
      }
    },).start();
  }

  private static class EmailTask {
    final String to;
    final String subject;
    final String htmlBody;
    EmailTask(String to, String subject, String htmlBody) {
      this.to = to;
      this.subject = subject;
      this.htmlBody = htmlBody;
    }
  }
}
```

### Line-by-line explanation
- RetryInterceptor: provides a generic retry mechanism with exponential backoff for any Runnable task.
- executeWithRetry: runs the task; on failure, sleeps with increasing delay until maxRetries is reached.
- EmailQueue: demonstrates decoupling email sending from request handling by enqueueing EmailTask items and processing them in a background worker.
- startWorker: continuously takes tasks from the queue and executes them with retry logic.
- EmailTask: simple container for email payload.

Production takeaway: combine queuing, background processing, and backoff to achieve high reliability and throughput. Add dead-letter handling, metrics (emails enqueued, delivered, failed), and circuit breakers if a provider is degraded. Ensure idempotency to avoid duplicate emails if the system retries.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Blocking email send in a request thread (no async) vs async sending
  - Bad:
  ```java
  // within a request handler
  emailService.sendEmail(userEmail, subject, body); // blocks the request thread
  ```
  - Good:
  ```java
  // enqueue instead of blocking
  emailQueue.enqueue(userEmail, subject, body);
  ```
- Mistake 2: No retries or improper retry without backoff
  - Bad:
  ```java
  try {
    emailService.sendEmail(to, subject, body);
  } catch (Exception e) {
    // swallow or exit silently
  }
  ```
  - Good:
  ```java
  RetryInterceptor retry = new RetryInterceptor(5, 200);
  retry.executeWithRetry(() -> {
    emailService.sendEmail(to, subject, body);
  });
  ```
- Mistake 3: Hard-coded credentials or configuration in code
  - Bad:
  ```java
  props.put("mail.smtp.password", "password123"); // plain text in code
  ```
  - Good:
  ```java
  // externalized config via environment or a config service
  String password = getenv("SMTP_PASSWORD");
  props.put("mail.smtp.password", password);
  ```
- Mistake 4: Unsafe content injection into HTML (no escaping)
  - Bad:
  ```java
  String html = "<p>Hello " + userInput + "</p>";
  ```
  - Good:
  ```java
  String html = "<p>Hello " + HtmlEscaper.escapeHtml(userInput) + "</p>";
  ```
- Mistake 5: Passive observability (no metrics/log correlation)
  - Bad:
  ```java
  // fire-and-forget with no tracing or metrics
  emailService.sendEmail(...);
  ```
  - Good:
  ```java
  // add correlation IDs, log delivery attempts, and emit metrics
  ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reliability: Emails are often essential for onboarding, security flows, and transactional updates. Missing deliveries or delays degrade user experience and trust.
- Observability: Track delivery success/failures, latency, and queue backlogs. Correlate email events with user actions using a correlationId or message-id.
- Deliverability: Proper authentication (DKIM, SPF, DMARC), bounce handling, complaint management, and rate limits from providers matter. Use reputable providers and region-appropriate endpoints.
- Idempotency and deduplication: Ensure repeated triggers don’t deliver duplicate emails; store a delivery key or idempotency key for each email attempt.
- Scalability: For high throughput, decouple email generation from delivery using queues, asynchronous workers, and scalable cloud providers (SES, SendGrid, Mailgun, etc.).
- Personalization and accessibility: Use templates with proper escaping, alt text, and accessibility considerations. Tailor content to user data with safe templating.
- Security: Do not leak credentials in logs, and avoid constructing HTML with untrusted content. Use well-maintained libraries and rotate credentials regularly.

## Z. Study Questions — 5 recall questions

1. What is the difference between transactional emails and notifications in backend systems, and when would you use each?
2. How can you decouple email sending from a request/response thread to improve latency and reliability?
3. Name at least two reliability patterns for email sending and describe when to apply them.
4. Why is template escaping important in email content, and how can you safely render personalized content?
5. What observability signals should you collect for email sending, and how would you use them to diagnose issues?

## Exercise — practical multi-part coding challenge

Goal: Build a small, end-to-end emailing feature that supports transactional emails with templates, asynchronous delivery, and retry/backoff.

Part A — Basic SMTP EmailService
- Implement a simple Java class EmailService (as shown in Section 1) that can send an HTML email via an SMTP server.
- Requirements:
  - Accept host, port, username, password via constructor or config.
  - Provide a method sendEmail(String to, String subject, String htmlBody) that throws a checked exception.
  - Use TLS and authentication.

Part B — Async Delivery with Queue
- Build an EmailQueue similar to Section 5 that decouples sending from request threads.
- Include:
  - enqueue(to, subject, body)
  - Background worker that processes tasks and uses EmailService to send.
  - Basic logging of successes and failures.

Part C — Template Rendering for Personalization
- Add a TemplateRenderer (as in Section 2) using FreeMarker.
- Create a sample template order_status.ftl and demonstrate rendering with a data model to HTML.
- Integrate rendering into a workflow that sends a personalized transaction email via AsyncEmailSender.

Part D — Retry with Backoff
- Implement a RetryInterceptor like in Section 5.
- Wrap the email send call in a retry block with exponential backoff.
- Ensure a maximum retry count and a maximum backoff cap.

Part E — Quick Validation
- Write a small main class that simulates placing an order and sends a transactional email asynchronously with the template rendered content.
- Validate:
  - The email content is personalized.
  - The email delivery path is asynchronous (no blocking on the main thread).
  - Retries are attempted on simulated transient failures (you can mock EmailService to throw intermittently).

Deliverables:
- Java files for EmailService, AsyncEmailSender, TemplateRenderer, SesEmailService (optional alternative), EmailQueue, RetryInterceptor, HtmlEscaper (for Section 4), and a small Main or Test demonstrating the flow.
- A templates/order_status.ftl file with placeholders for userName, orderId, and status.
- A README snippet describing how to run the example and how to configure SMTP/SES settings.

Note: In a real project, you would separate concerns further (dependency injection, configuration management, metrics export via Prometheus, tracing via OpenTelemetry). This exercise focuses on building a concrete, working baseline that you can expand into a robust production feature.