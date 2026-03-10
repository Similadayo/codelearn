# Introduction to Burp Suite

Burp Suite is a leading integrated platform for web application security testing. It provides a range of tools to inspect, manipulate, and automate attacks against web apps, making it essential for security professionals who assess, validate, and harden online systems. This lesson introduces Burp Suite, its core components, and practical workflows you’ll use on real projects—whether you’re a developer doing secure coding checks or a penetration tester discovering and validating vulnerabilities.

---

## 1. Getting Started with Burp Suite: Goals, Setup, and First Interactions

This section covers what Burp Suite brings to the table, how to install it, and how to begin interacting with a target web app via the Burp Proxy. You’ll learn the high-level workflow and see simple, concrete examples of HTTP traffic you're likely to encounter.

### Code Example 1: Launching Burp Suite (Community Edition) and Basic Proxy Setup

```bash
# Start Burp Suite (Community Edition) from the command line
# Note: In practice you might launch the GUI from your OS launcher; this is a minimal command example.
java -jar burpsuite_community_v2024.jar
```

### Line-by-line explanation

- `# Start Burp Suite (Community Edition) from the command line`
  - Comment explaining the command's purpose.
- `java -jar burpsuite_community_v2024.jar`
  - Runs the Burp Suite JAR file using the Java runtime. This starts the Burp GUI so you can configure proxies, scanning, and testing workflows.

### Code Example 2: Basic Intercept Configuration (conceptual)

Note: Burp Suite is primarily a GUI tool, but you configure it by interacting with the UI. The following snippet shows the typical proxy target you’d configure in your browser to route traffic through Burp.

```text
Burp Proxy Listener
Address: 127.0.0.1
Port: 8080

Browser Proxy Settings (conceptual):
HTTP Proxy: 127.0.0.1
Port: 8080
```

### Line-by-line explanation

- The first block describes Burp’s Proxy Listener configuration you enable in Burp’s UI (not a terminal command). This listener is what receives traffic from your browser or automated tools.
- The “Browser Proxy Settings (conceptual)” shows how you direct traffic to Burp via localhost:8080. In practice you’d configure your browser to use this proxy so Burp can intercept.

### Code Example 3: A Target HTTP Request You Might Intercept

```
GET /login HTTP/1.1
Host: vulnerable-app.local
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Accept: text/html,application/xhtml+xml
```

### Line-by-line explanation

- `GET /login HTTP/1.1`
  - An HTTP GET request for the login page. Burp can intercept and display this request for inspection or modification.
- `Host: vulnerable-app.local`
  - The target host header. Burp uses this to route the request context to the right domain in your test environment.
- `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)`
  - Client identity string. Some tests rely on user-agent handling or fingerprinting.
- `Accept: text/html,application/xhtml+xml`
  - Content negotiation header indicating acceptable response formats.

### Code Example 4: A Target HTTP Response You Might See

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 512

<!doctype html>
<html>...</html>
```

### Line-by-line explanation

- `HTTP/1.1 200 OK`
  - Standard HTTP status indicating success.
- `Content-Type: text/html; charset=utf-8`
  - Response content type; helps Burp parse and display content correctly.
- `Content-Length: 512`
  - Size of the response body. Burp uses this to know how much data to read.
- The HTML body follows; Burp presents this for inspection and manipulation in Repeater, Intruder, etc.

### Why this matters in real systems (preview)

- Burp’s proxy is the entry point for most testing workflows. Being able to intercept and alter requests/responses is foundational for identifying vulnerabilities like input validation gaps, authentication weaknesses, and misconfigurations.

---

## 2. Intercepting, Inspecting, and Modifying Traffic with Burp Proxy

This section dives into how to capture traffic, inspect requests/responses, and perform live modifications using Burp Proxy and Repeater. You’ll see practical examples of common vulnerability tests (e.g., improper authentication, parameter tampering) and how to validate results safely.

### Code Example 1: A Tampered Login Request in Burp Repeater

```
POST /authenticate HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 58

username=admin&password=wrongpassword' OR '1'='1
```

### Line-by-line explanation

- `POST /authenticate HTTP/1.1`
  - A POST request targeting the authentication endpoint.
- `Host: target.local`
  - Target host header for routing.
- `Content-Type: application/x-www-form-urlencoded`
  - Body encoding type used for form data.
- `Content-Length: 58`
  - Length of the request body.
- `username=admin&password=wrongpassword' OR '1'='1`
  - A crafted payload that attempts SQL injection via the password parameter.

### Code Example 2: Intended (Good) Login Request

```
POST /authenticate HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 31

username=admin&password=correctP@ss!
```

### Line-by-line explanation

- Same structure as the tampered request, but with a proper password. This demonstrates normal traffic you might compare against.

### Code Example 3: Burp Repeater’s Resent Request and Response (Illustrative)

```
Request:
POST /authenticate HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 31

username=admin&password=correctP@ss!

Response:
HTTP/1.1 200 OK
Content-Type: application/json
{
  "status": "success",
  "token": "abc123def456"
}
```

### Line-by-line explanation

- The “Request” block repeats a valid login attempt.
- The “Response” shows a successful login with a token. In a real test, you’d look for logic flaws, token handling weaknesses, or error messages that leak information.

### Code Example 4: A Basic Repeater Workflow (Pseudo-logging)

```
# Pseudo-steps (not actual Burp code)
1. Copy the request to Repeater
2. Modify parameter values (e.g., password)
3. Send and observe response
4. Save evidence (status, response body)
```

### Line-by-line explanation

- These steps outline the workflow you’ll perform in Burp Repeater to test varying payloads and observe server behavior without changing production data.

### Why this matters in real systems (preview)

- Intercepting and modifying traffic lets you validate whether the app properly handles unexpected inputs, enforces authentication, and resists common injection flaws. It also helps you verify whether error messages reveal sensitive information.

---

## 3. Repeater, Intruder, and Scanner: Practical Tooling Within Burp

This section highlights the three core Burp tools you’ll use to repeatedly test, automate, and verify vulnerabilities. You’ll see concrete examples of how to craft tests, apply payloads, and assess results.

### 3.1 Repeater: Ad-hoc Request Testing

- Purpose: Manually craft and re-send requests to observe how the server responds.
- Workflow: Capture → Send to Repeater → Edit → Send → Analyze.

### Code Example 1: Repeater Test for Resource-Based Access

```
GET /admin/panel HTTP/1.1
Host: target.local
Authorization: Bearer abc123token
```

### Line-by-line explanation

- `GET /admin/panel HTTP/1.1`
  - Access attempt to a sensitive admin resource.
- `Host: target.local`
  - Target domain.
- `Authorization: Bearer abc123token`
  - Token-based auth header; you might test with an invalid token to see how errors are handled.

### 3.2 Intruder: Automated Payload Fuzzing

- Purpose: Automate the injection of values into parameters to identify weaknesses.
- Workflow: Mark positions → Provide payloads → Run → Review results.

### Code Example 2: Intruder Payload List (HTTP form-based)

```
POST /search HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded

query=%7Bpayload%7D&category=all
```

Payloads list (in Burp Intruder, conceptually):
- payload1: admin' OR '1'='1
- payload2: <script>alert(1)</script>
- payload3: ../../../../etc/passwd
- payload4: 

### Line-by-line explanation

- `query=%7Bpayload%7D&category=all`
  - A form parameter where the Intruder will substitute payloads.
- Payload list items show typical test strings for SQLi, XSS, or path traversal. Burp replaces the marker with each payload.

### 3.3 Scanner: Passive/Active Vulnerability Scanning (Professional/Advanced)

- Purpose: Automated detection of security issues (SQLi, XSS, CSRF, etc).
- Workflow: Define scope → Run scanner → Review issues → Verify.

### Code Example 3: Example of a Baseline Issue Report (Illustrative)

```
{
  "issue": "SQL Injection possible on /search",
  "severity": "High",
  "confidence": "Firm",
  "url": "https://target.local/search?q=payload"
}
```

### Line-by-line explanation

- This illustrates the kind of structured report Burp Scanner might generate: issue type, severity, confidence, and location URL for verification.

### Burp Extender conceptually: Extending Burp to automate checks (Java)

- If you want to automate checks, you can create extensions using Burp's Extender API. The next section provides a minimal Java example.

---

## 4. Burp Extender: A Minimal Java Extension to Log Requests

This section shows a small Burp Extender that logs each HTTP request to a file. It introduces the idea of extending Burp to tailor testing to your environment.

### Code Example: BurpExtender.java

```java
import burp.*;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.PrintWriter;

public class BurpExtender implements IBurpExtender, IHttpListener {
    private IBurpExtenderCallbacks callbacks;
    private IExtensionHelpers helpers;

    @Override
    public void registerExtenderCallbacks(IBurpExtenderCallbacks callbacks) {
        this.callbacks = callbacks;
        this.helpers = callbacks.getHelpers();

        callbacks.setExtensionName("Simple Request Logger");
        callbacks.registerHttpListener(this);
        // Notify user
        PrintWriter stdout = new PrintWriter(callbacks.getStdout(), true);
        stdout.println("Extension loaded: Simple Request Logger");
    }

    @Override
    public void processHttpMessage(int toolFlag, boolean isRequest, IHttpRequestResponse messageInfo) {
        // We only log requests for demonstration
        if (!isRequest) return;

        IRequestInfo requestInfo = helpers.analyzeRequest(messageInfo);
        String url = requestInfo.getUrl().toString();

        try (PrintWriter log = new PrintWriter(new FileOutputStream("burp_extender.log", true))) {
            log.println(url);
        } catch (IOException e) {
            // In a real extension, handle properly
        }
    }
}
```

### Line-by-line explanation

- `import burp.*; import java.io.FileOutputStream; import java.io.IOException; import java.io.PrintWriter;`
  - Import Burp's API classes and standard I/O for logging.
- `public class BurpExtender implements IBurpExtender, IHttpListener { ... }`
  - Defines a Burp extension class that integrates with Burp via the Extender API and listens to HTTP traffic.
- `private IBurpExtenderCallbacks callbacks; private IExtensionHelpers helpers;`
  - Fields to hold Burp’s callbacks and helper utilities for request analysis.
- `public void registerExtenderCallbacks(IBurpExtenderCallbacks callbacks) { ... }`
  - Entry point called by Burp when the extension loads. Stores references, sets a name, and registers the HTTP listener.
- `this.callbacks = callbacks; this.helpers = callbacks.getHelpers();`
  - Initialize fields so we can analyze requests later.
- `callbacks.setExtensionName("Simple Request Logger"); callbacks.registerHttpListener(this);`
  - Expose the extension name in Burp and register to receive HTTP messages.
- `public void processHttpMessage(int toolFlag, boolean isRequest, IHttpRequestResponse messageInfo) { if (!isRequest) return; ... }`
  - Callback invoked for each HTTP message Burp handles. We filter to requests only.
- `IRequestInfo requestInfo = helpers.analyzeRequest(messageInfo); String url = requestInfo.getUrl().toString();`
  - Extracts the request URL for logging.
- `try (PrintWriter log = new PrintWriter(new FileOutputStream("burp_extender.log", true))) { log.println(url); } catch (IOException e) { }`
  - Appends the URL to a log file, creating the file if needed; simple error handling shims for demonstration.

### Line-by-line explanation (continued: how to run and test)

- To use this extension, place this Java file in a project configured with Burp's API (burp-extender.jar) in your build path.
- Compile to BurpExtender.class and load the resulting JAR into Burp Suite via Extensions → Burp Extensions.
- When Burp processes HTTP requests, the extension will append each request URL to burp_extender.log in the working directory.

### Why this matters in real systems (preview)

- Extensions let you tailor Burp to your environment. For example, you can automatically log traffic, enforce custom checks, or integrate Burp tests with your CI/CD pipelines.

---

## 4. Common Beginner Mistakes in Burp Suite Use (X)

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

1) Pitfall: Testing with unencoded payloads and unsafe inputs
- Bad:
```text
POST /search HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded

q=admin' OR '1'='1
```
- Good:
```text
POST /search HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded

q=admin%27+OR+%271%27%3D%271
```

2) Pitfall: Skipping scope definition and blasting tests to production
- Bad:
```text
# Test everything under example.com
GET /admin HTTP/1.1
Host: example.com
```
- Good:
```text
# Define a precise scope and only test the authenticated app
Scope: https://staging.app.example.com
Target: /admin, /user/profile
```

3) Pitfall: Relying on a single test without token/CSRF handling
- Bad:
```text
POST /update-profile HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded

name=Alice&email=alice@example.com
```
- Good:
```text
# Retrieve and use CSRF token before updating
GET /profile/edit HTTP/1.1
Host: target.local

# Then fetch CSRF token from response or cookie and resend:
POST /update-profile HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded
X-CSRF-Token: abc123
name=Alice&email=alice@example.com
```

4) Pitfall: Not documenting tests and results
- Bad:
```text
# A bunch of attempts without notes
```
- Good:
```text
# Documented notes
Test: SQLi attempt on /search
Payload: admin' OR '1'='1
Result: 200 OK, response contains user data in body
```

---

## 5. Why This Matters in Real Systems

In real-world environments, Burp Suite is a practical instrument for ensuring software quality, security, and regulatory compliance. Key reasons:

- Detects critical vulnerabilities before production: SQLi, XSS, CSRF, SSRF, id and authorization flaws.
- Improves secure development lifecycle: integrate tests into QA and pre-prod pipelines; track remediation.
- Supports compliance and risk management: aligns with OWASP Top 10, PCI DSS, HIPAA, and other frameworks that require proactive vulnerability testing.
- Fosters responsible disclosure and risk mitigation: tests help teams understand attack paths and build effective mitigations.

Important professional considerations:
- Always have explicit authorization for testing any system you don’t own.
- Use isolated test/staging environments and protect production data.
- Document findings with evidence, reproduction steps, and recommended remediations.
- Combine Burp with other testing tools and manual review for comprehensive coverage.

---

## 6. Study Questions (Z)

1) What are the main components of Burp Suite you’d use for manual testing and why?
2) How would you configure Burp Proxy to test a web app running on http://localhost:3000?
3) What is the difference between Burp Repeater and Burp Intruder?
4) How can Burp Extender be used to tailor automated checks? Provide a short example concept.
5) Why is it important to test within a defined scope and how can improper scope affect results?

---

## 7. Exercise

A practical multi-part coding challenge to apply what you’ve learned. You can perform this using Burp Suite Community Edition or Pro if available, on a local test environment (e.g., Juice Shop, OWASP WebGoat, or a simple local app).

Part A: Setup and Interception
- Task: Configure Burp Proxy to intercept a browser request to a simple local page (e.g., http://localhost:3000/profile).
- Steps:
  - Start Burp Suite.
  - Set the browser to use Burp's proxy at 127.0.0.1:8080.
  - Navigate to http://localhost:3000/profile and observe the request in Burp Proxy.
- Deliverables:
  - A screenshot of Burp Proxy intercepting the request.
  - The raw HTTP request text captured.

Part B: Repeater and Payload Testing
- Task: Use Burp Repeater to test for a basic input validation issue on a search endpoint.
- Steps:
  - Capture a GET or POST request to /search?q=<query>.
  - Send to Repeater and modify the query using a few payloads (e.g., admin, admin' OR '1'='1, and a benign value).
  - Observe responses; record any anomalies (times, error messages, reflection).
- Deliverables:
  - The original request and each modified request in Repeater.
  - A short note on which payloads produced notable behavior.

Part C: Burp Extender – Simple Logger (Coding Challenge)
- Task: Create a minimal Burp Extender that logs HTTP request URLs to a file.
- Steps:
  - Write BurpExtender.java (as shown in Code Example: BurpExtender.java above).
  - Compile with Burp’s API library and package as a JAR.
  - Load the JAR into Burp Suite (Extensions → Burp Extensions).
  - Trigger several requests in your test app and verify burp_extender.log contains the requested URLs.
- Deliverables:
  - The BurpExtender.java source (or your compiled JAR).
  - A short explanation of how the extension works and where logs are written.

Hints:
- Use an intentionally vulnerable test app or a local mock endpoint to practice without risking production systems.
- Always record steps, observed results, and any remediation ideas when you find a vulnerability.
- If you’re using Burp Suite Pro, leverage the Scanner to identify issues automatically, then validate findings manually with Repeater.

End of lesson.