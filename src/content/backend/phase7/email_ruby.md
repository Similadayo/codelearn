# Track: Backend Engineering — Phase 7 — Advanced API Features: Sending Email — Transactional & Notifications (Ruby)

Compelling introductory paragraph
Email remains a critical communication channel in modern systems. Ability to send transactional emails (password resets, order confirmations) and notifications (new comments, alerts) reliably, securely, and at scale is essential for user experience and trust. In Ruby-based backends, you’ll typically leverage mailers, background jobs, and event-driven patterns to decouple email delivery from user requests, improve latency, and provide robust retry and observability. This lesson walks through practical patterns, code samples, and real-world considerations to design and implement transactional and notification emails in Ruby environments.

## 1. Foundations of Email Sending in Ruby

Ruby has several pathways to send email. Here we cover a lightweight approach with the mail gem, suitable for non-Rails Ruby apps or service components, and contrast it with Rails-centric mailing via ActionMailer for larger Rails apps.

### Example: Simple SMTP email with the mail gem
```ruby
# Gemfile
gem 'mail', '~> 2.7'

# config/initializers/mail.rb
require 'mail'

Mail.defaults do
  delivery_method :smtp, {
    address: 'smtp.example.com',
    port: 587,
    domain: 'example.com',
    user_name: ENV['SMTP_USERNAME'],
    password: ENV['SMTP_PASSWORD'],
    authentication: :plain,
    enable_starttls_auto: true
  }
end

# app/services/email_sender.rb
class EmailSender
  def self.send_email(to:, subject:, body:)
    Mail.deliver do
      from    'no-reply@example.com'
      to      to
      subject subject
      text_part do
        body body
      end
    end
  end
end
```

### Line-by-line explanation
- Gemfile: Declares the mail gem dependency for email construction and delivery.
- require 'mail': Loads the Mail gem for use.
- Mail.defaults: Configures SMTP delivery with host, port, auth, and TLS settings.
- delivery_method :smtp, { ... }: Sets SMTP as the transport and provides credentials and security settings.
- EmailSender.send_email: Class method to compose and send a basic email.
- from: Sender address.
- to: Recipient address.
- subject: Email subject line.
- text_part: Email body in plain text (could use body or html_part for HTML emails).

### Line-by-line explanation (continued)
- ENV['SMTP_USERNAME'], ENV['SMTP_PASSWORD']: Reads credentials from environment variables to avoid hardcoding secrets.
- Mail.deliver do ... end: Sends the composed email synchronously. In a web request, this blocks the thread; see later sections for asynchronous patterns.

## 2. Transactional Emails: Patterns and Implementation

Transactional emails are triggered by user actions and must be reliable and timely. In Rails, ActionMailer paired with a background job is the common pattern. Below are typical components: a mailer, templates, and a background worker to deliver asynchronously.

### Example: Rails ActionMailer for transactional emails
```ruby
# app/mailers/transactional_mailer.rb
class TransactionalMailer < ApplicationMailer
  default from: 'no-reply@example.com'

  def password_reset(user)
    @user = user
    @reset_url = "https://example.com/password_resets/#{@user.reset_token}/edit"
    mail(to: @user.email, subject: 'Reset your password')
  end

  def order_confirmation(order)
    @order = order
    mail(to: order.user.email, subject: "Your order ##{order.id} confirmation")
  end
end
```

```erb
<!-- app/views/transactional_mailer/password_reset.html.erb -->
<p>Hi <%= @user.name %>,</p>
<p>To reset your password, please click the link below:</p>
<p><a href="<%= @reset_url %>">Reset Password</a></p>

<!-- app/views/transactional_mailer/order_confirmation.html.erb -->
<p>Hi <%= @order.user.name %>,</p>
<p>Thank you for your purchase! Your order <strong>#<%= @order.id %></strong> is confirmed.</p>
```

### Background job example to deliver emails asynchronously
```ruby
# app/jobs/deliver_transactional_email_job.rb
class DeliverTransactionalEmailJob < ApplicationJob
  queue_as :default

  def perform(mail_method, resource_id)
    resource = Object.const_get(resource_class_for(mail_method)).find(resource_id)
    TransactionalMailer.send(mail_method, resource).deliver_later
  end

  private

  def resource_class_for(method)
    case method
    when :password_reset
      'User'
    when :order_confirmation
      'Order'
    else
      raise "Unknown mail method: #{method}"
    end
  end
end
```

### Line-by-line explanation
- class TransactionalMailer < ApplicationMailer: Defines a mailer class using Rails’ ActionMailer.
- default from: 'no-reply@example.com': Sets a default sender address.
- def password_reset(user): Mailer method for password reset; assigns instance vars for templates.
- @reset_url: URL to reset the password, built with the user’s reset token.
- mail(to: ..., subject: ...): Assembles and queues the email; uses corresponding template.
- def order_confirmation(order): Mailer method for order confirmation.
- Password_reset template and Order Confirmation template: HTML bodies with embedded Ruby to render dynamic data.

### Line-by-line explanation (background job)
- DeliverTransactionalEmailJob: Encapsulates email delivery as a separate job to run in background.
- perform(mail_method, resource_id): Dynamically calls the appropriate mailer method for the given resource.
- deliver_later: Enqueues email delivery to be processed by the background worker.
- resource_class_for and a simple mapping: Helps routing mail types to ORM classes.

Notes:
- In a real app, you’d likely have dedicated jobs per mail type (PasswordResetJob, OrderConfirmationJob) for clarity and simpler error handling.
- deliver_later relies on ActiveJob adapters (Sidekiq, Resque, etc.) configured in your app.

### Why this pattern matters
- Decouples user-facing request latency from email delivery time.
- Enables reliable retries and backoffs when email providers throttle or fail.
- Works well with queue-backed systems that scale horizontally.

## 3. Notifications: Event-Driven Email

Notifications respond to events in your system. An event-driven approach reduces coupling between event producers and the email subsystem and supports richer observability.

### Example: Simple in-app event bus + email delivery
```ruby
# lib/event_bus.rb
class EventBus
  def initialize
    @subscribers = Hash.new { |h, k| h[k] = [] }
  end

  def publish(event, payload = {})
    @subscribers[event].each { |handler| handler.call(payload) }
  end

  def subscribe(event, &block)
    @subscribers[event] << block
  end
end
```

```ruby
# app/models/comment.rb (simplified)
class Comment < ApplicationRecord
  after_create :notify_post_author

  private

  def notify_post_author
    NotificationBus.publish('comment.created', comment: self)
  end
end
```

```ruby
# app/mailers/notification_mailer.rb
class NotificationMailer < ApplicationMailer
  default from: 'notifications@example.com'

  def new_comment(comment)
    @comment = comment
    mail(to: comment.post.user_email, subject: 'New comment on your post')
  end
end
```

```ruby
# config/initializers/notification_subscriber.rb
NOTIFICATION_BUS = EventBus.new

NOTIFICATION_BUS.subscribe('comment.created') do |payload|
  comment = payload[:comment]
  NotificationMailer.new_comment(comment).deliver_later
end
```

```ruby
# Alternative Rails-native approach using ActiveSupport::Notifications
ActiveSupport::Notifications.subscribe('comment.created') do |name, started, finished, id, payload|
  NotificationMailer.new_comment(payload[:comment]).deliver_later
end
```

### Line-by-line explanation
- EventBus: A tiny in-app pub/sub mechanism allowing components to publish events and subscribe handlers.
- publish(event, payload): Broadcasts an event with an associated payload to all subscribers.
- subscribe(event, &block): Registers a handler (block) to be invoked when the event is published.
- Comment model after_create: Triggers an event after a new comment is created.
- NOTIFICATION_BUS.publish: Emits the 'comment.created' event carrying the comment data.
- NotificationMailer#new_comment: Prepares an email notifying the post author of a new comment.
- deliver_later: Queues the email delivery for asynchronous processing.
- ActiveSupport::Notifications alternative: A Rails-provided event system that’s widely used in Rails apps.

### Why this matters in real systems
- Event-driven emails enable scalable notification pipelines that can emit many emails per second without blocking user requests.
- You gain clearer audit trails and easier observability by correlating events with email sends.
- It’s easier to implement fan-out patterns (e.g., notifying multiple recipients) and to integrate with external event streams.

## 4. Email Deliverability: Best Practices

Deliverability touches infrastructure, provider configuration, and content optimization. The goal is to maximize inbox placement while respecting recipient preferences and legal requirements.

### SMTP-based configuration for production (Rails)
```ruby
# config/environments/production.rb
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: 'smtp.sendgrid.net',
  port: 587,
  domain: 'yourdomain.com',
  user_name: 'apikey',
  password: ENV['SENDGRID_API_KEY'],
  authentication: 'plain',
  enable_starttls_auto: true
}
config.action_mailer.perform_deliveries = true
config.action_mailer.raise_delivery_errors = true

# Optional: default URL options for mailer helpers
config.action_mailer.default_url_options = { host: 'www.yourdomain.com' }
```

### Deliverability via API providers (example with SendGrid Ruby)
```ruby
# Gemfile
gem 'sendgrid-ruby', '~> 6.4'

# lib/email_via_sendgrid.rb
require 'sendgrid-ruby'
include SendGrid

class EmailViaSendgrid
  def self.send_email(to:, subject:, html_content:)
    from = Email.new(email: 'no-reply@yourdomain.com')
    to_email = Email.new(email: to)
    content = Content.new(type: 'text/html', value: html_content)
    mail = Mail.new(from, subject, to_email, content)

    sg = SendGrid::API.new(api_key: ENV['SENDGRID_API_KEY'])
    response = sg.client.mail._('send').post(request_body: mail.to_json)
    [response.status_code, response.body]
  end
end
```

### Line-by-line explanation
- SMTP settings: Configures the mailer to use an SMTP provider with proper authentication and TLS.
- raise_delivery_errors: Ensures failures bubble up so you can monitor and alert.
- perform_deliveries: Ensures email sending runs; if false, emails won’t be sent.
- SendGrid API example: Demonstrates sending via an API endpoint rather than SMTP, which can improve deliverability and scalability.
- ENV['SENDGRID_API_KEY']: Keeps credentials out of source control.

### DKIM, SPF, and bounce handling (high-level)
- Use provider-signed DKIM by enabling DKIM signing in your provider (e.g., SendGrid, Mailgun) and optionally verify signatures in your domain’s DNS.
- Ensure SPF aligns with your sending IPs/domains to reduce spoofing flags.
- Implement bounce and complaint handling hooks (webhooks) and suppress or re-send to invalid addresses with exponential backoff.
- Maintain unsubscribe preferences and respect opt-outs; store preferences and skip sending to unsubscribed users.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Blocking email delivery in request/response path
  - BAD:
    ```ruby
    # app/controllers/users_controller.rb
    def create
      @user = User.create!(params)
      TransactionalMailer.password_reset(@user).deliver!
      render json: { id: @user.id }
    end
    ```
  - GOOD:
    ```ruby
    def create
      @user = User.create!(params)
      PasswordResetJob.perform_later(@user.id) # background work
      render json: { id: @user.id }
    end
    ```

- Pitfall 2: Hardcoding content and not using templates or i18n
  - BAD:
    ```ruby
    # app/mailers/transactional_mailer.rb
    def welcome(user)
      mail(to: user.email, subject: 'Welcome!')
      body = "Hi #{user.name}, welcome to our service."
      mail(content_type: 'text/html', body: body)
    end
    ```
  - GOOD:
    ```ruby
    def welcome(user)
      @user = user
      mail(to: @user.email, subject: I18n.t('emails.welcome.subject'))
    end
    # app/views/transactional_mailer/welcome.html.erb
    <p>Hello <%= @user.name %>,</p>
    <p>Welcome to our service!</p>
    ```

- Pitfall 3: Not handling retries and failures
  - BAD:
    ```ruby
    def send_email(to)
      EmailSender.send_email(to: to, subject: 'Hi', body: 'Hello')
    end
    ```
  - GOOD:
    ```ruby
    def send_email(to)
      EmailSenderJob.perform_later(to)
    end

    # app/jobs/email_sender_job.rb
    class EmailSenderJob < ApplicationJob
      retry_on StandardError, wait: 5.seconds, attempts: 3

      def perform(to)
        EmailSender.send_email(to: to, subject: 'Hi', body: 'Hello')
      end
    end
    ```

- Pitfall 4: Not protecting credentials or using environment-based config
  - BAD:
    ```ruby
    # config/initializers/mail.rb
    Mail.defaults do
      delivery_method :smtp, {
        user_name: 'my_username',
        password: 'my_password'
      }
    end
    ```
  - GOOD:
    ```ruby
    # config/initializers/mail.rb
    Mail.defaults do
      delivery_method :smtp, {
        user_name: ENV['SMTP_USERNAME'],
        password: ENV['SMTP_PASSWORD']
      }
    end
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reliability and latency: Offload email sending to a worker pool so user requests remain fast and responsive.
- Idempotency and duplicates: Idempotent mail triggers or deduplication guards prevent duplicate notifications when events replay or retries occur.
- Observability: Centralized logging, metrics, and tracing for email sends, including delivery status, bounce, and complaints.
- Scalability: Horizontal scaling of workers (Sidekiq/Resque) allows handling bursts of emails without saturating API requests.
- Compliance and user control: Unsubscribe handling, preference centers, GDPR/CCPA considerations, and content localization.

Example observability snippet:
```ruby
# During email send
ActiveSupport::Notifications.instrument('email.sent', to: to, subject: subject, status: 'sent')
```

## Z. Study Questions — 5 recall questions

1. What is the difference between transactional emails and notifications in a backend system?
2. Why should email sending be moved to a background job rather than done synchronously in a web request?
3. How do deliver_now and deliver_later differ in Rails’ ActionMailer?
4. What are two common deliverability concerns you should configure for production emails?
5. How can an event-driven pattern help scale notifications, and what Rails feature can you leverage for this?

## Exercise — a practical multi-part coding challenge

Part A — Project setup and baseline mailer
- Setup a Ruby project with Bundler and add Rails (or at least ActionMailer) support. Install gems for ActionMailer, a background job adapter (e.g., sidekiq), and an email gem if not using Rails.
- Create a transactional mailer with a password reset method and a simple HTML template.
- Configure SMTP settings for a provider (e.g., SendGrid) using environment variables.

Part B — Password reset flow (transactional)
- Implement a User model stub with fields: id, email, name, reset_token.
- Implement a controller-like service method that triggers a password_reset email via deliver_later.
- Ensure the email content includes a reset link using the token.

Part C — Event-driven notification flow (notifications)
- Implement a simple in-app EventBus as shown, and wire a new_comment event to trigger NotificationMailer.new_comment.
- Create a minimal Comment model stub with after_create callback to publish the event.
- Provide a template for the notification email.

Part D — Observability and reliability
- Add basic logging around email sends and a simple instrumentation hook to capture email send events.
- Add retry behavior for the email sending job with exponential backoff (e.g., 1s, 5s, 15s).

Part E — Validation and testing
- Provide a small test illustrating that deliver_later queues a job and that the mailer method is called with correct data.
- Include a basic sanity check for environment variable presence (raise descriptive error if SMTP credentials are missing).

Deliverables (checklist)
- transactional mailer with password reset and order confirmation samples
- event-driven notification flow for a new_comment event
- background jobs for asynchronous delivery with retries
- deliverability configuration (SMTP or API-based) with environment-based credentials
- basic observability hooks (logging/instrumentation)
- tests or test-like verifications for key pathways

This lesson provides a structured, Ruby-focused pathway to mastering transactional emails and notifications in backend systems. Use these patterns as building blocks for robust, scalable email delivery in production environments.