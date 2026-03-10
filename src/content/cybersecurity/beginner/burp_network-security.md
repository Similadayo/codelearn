# Introduction to Burp Suite

Burp Suite is an integrated platform for testing web application security. It acts as a powerful gateway between your browser (or any HTTP client) and the target application, intercepting, inspecting, modifying, and replaying traffic to reveal vulnerabilities. In professional security testing, Burp Suite is a foundational tool for discovering issues such as SQL injection, cross-site scripting, authorization flaws, and more. Mastery of Burp Suite enables you to perform repeatable, auditable, and professional web vulnerability assessments in a controlled, legally-authorized environment.

## 1. Burp Suite Core Concepts and Setup

Code
```bash
#!/bin/bash
# 1) Prepare a project workspace for Burp Suite (optional but good practice)
mkdir -p ~/burp_projects/phase2_intro
cd ~/burp_projects/phase2_intro

# 2) Download Burp Suite Community edition (example URL; use the official site for the latest)
# Note: In practice, download from Burp's site and save to burpsuite_community.jar
curl -L -o burpsuite_community.jar "https://portswigger.net/burp/releases/download?product=community&version=2024.6&type=jar"

# 3) Start Burp Suite (GUI)
# This will launch the Burp UI where you can configure the Proxy listener (default 127.0.0.1:8080)
java -jar burpsuite_community.jar &
echo "Burp Suite started. PID $!"
```

### Line-by-line explanation
- Line 1-2: Creates a dedicated workspace for organizing Burp projects during Phase 2, etc.
- Line 5: Downloads the Burp Suite Community edition jar (URL is representative; use the official download in practice).
- Line 8: Launches Burp Suite as a background GUI application.
- Line 9: Prints the PID to help you manage the process later.

Code
```http
GET / HTTP/1.1
Host: example-vuln.local
User-Agent: BurpDemo/1.0
Accept: */*

```

### Line-by-line explanation
- Line 1: Start of a minimal HTTP GET request to the root of the target.
- Line 2: Host header specifying the target domain.
- Line 3-4: Common HTTP headers used by clients; demonstrates a simple request Burp can capture.
- This block is an example of traffic you will intercept and inspect with Burp Proxy.

Code
```python
# Simple curl-like request in Python through Burp Proxy (example)
import requests
proxies = {
  "http": "http://127.0.0.1:8080",
  "https": "http://127.0.0.1:8080",
}
resp = requests.get("https://example-vuln.local/", proxies=proxies, verify=False)
print(resp.status_code)
print(resp.headers.get("Content-Type"))
```

### Line-by-line explanation
- Line 1-4: Imports and a dictionary configuring the HTTP/HTTPS proxies to point at Burp's default listener (127.0.0.1:8080).
- Line 5: Sends a GET request through Burp, with TLS verification disabled to avoid certificate issues in test environments.
- Line 6-7: Outputs the HTTP status code and content type for quick sanity checks.
- This demonstrates how a tool or script can route traffic through Burp for testing.

## 2. Setting Up Burp Suite and the Proxy

Code
```bash
# 1) Ensure Burp's Proxy listener is enabled on 127.0.0.1:8080 (via Burp UI)
# 2) Start Burp Proxy listener (default)
# 3) Export Burp's CA certificate for client trust (manual step in UI)
# This snippet focuses on env setup for clients to route traffic through Burp
echo "Configure your browser or script to use http://127.0.0.1:8080 as the proxy."
```

### Line-by-line explanation
- Line 1-3: Comments describing typical in-app steps to enable the Burp Proxy listener and install the CA certificate.
- Line 4: A minimal reminder to route traffic through Burp’s proxy; this is the practical outcome you want from the setup.

Code
```bash
# 2) Example: route curl through Burp Proxy temporarily
curl -x http://127.0.0.1:8080 http://example-vuln.local/login -d "user=admin&pass=secret" -s
```

### Line-by-line explanation
- Line 1: Uses the -x option to specify a proxy (Burp's listener).
- Line 2: The target URL to test.
- Line 3: POST data payload to simulate a login form.
- Line 4: -s to keep output silent on progress; the response will be shown.
- This demonstrates how a standard HTTP client can be directed to Burp for inspection.

## 3. Intercepting, Replaying, and Modifying Traffic

Code
```http
POST /login HTTP/1.1
Host: vulnerable-app.local
User-Agent: BurpSuiteIntro/1.0
Content-Type: application/x-www-form-urlencoded
Content-Length: 35

username=admin&password=secret
```

### Line-by-line explanation
- Line 1: The first line of an HTTP POST request to the login endpoint.
- Line 2: The target host header.
- Line 3-4: Basic headers for user agent and content type.
- Line 5: Content length for the body.
- Line 6: Body with credentials (typical login form data).

Code
```http
POST /login HTTP/1.1
Host: vulnerable-app.local
Content-Type: application/x-www-form-urlencoded

username=admin' OR '1'='1&password=whatever
```

### Line-by-line explanation
- Line 1-2: The same framing as the original request.
- Line 3-4: Content type header.
- Line 5: Body showing an injection attempt in the username field (SQL injection style) to test server-side validation.
- Burp Repeater allows you to modify and resend such requests to verify vulnerability presence or absence.

Code
```bash
# 3) How to reproduce a basic Repeater scenario (manual)
# Use Burp UI to send this modified request, observe the response, and compare to the original.
```

### Line-by-line explanation
- This block demonstrates the workflow rather than a literal code block. In Burp, you would copy the request from the Intercept tab, paste into Repeater, modify, and resend to observe behavior.

Code
```python
# 4) Example: simple Intruder payload list (text file)
# File: intruder_payloads.txt
admin
' OR '1'='1
<script>alert(1)</script>
test' -- 
```

### Line-by-line explanation
- Line 1-4: Each line is a separate payload Burp Intruder can inject into a marked position.
- This payload list is a minimal demonstration of typical test strings used to probe for injection or XSS.

Code
```http
# 4) Example: positions in Burp Intruder
POST /login HTTP/1.1
Host: vulnerable-app.local
Content-Type: application/x-www-form-urlencoded

username=§admin§&password=§{payload}§
```

### Line-by-line explanation
- Line 1-2: Basic request skeleton.
- Line 3: Content type header.
- Line 4: Shows how Burp marks positions with § to indicate where payloads will be injected during an Intruder run.
- This illustrates how to prepare a target request for automated fuzzing.

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not configuring the client to use Burp as a proxy
  - Bad
 ```bash
curl http://target-app/login -d "username=admin&password=secret"
```
  - Good
  ```bash
  curl -x http://127.0.0.1:8080 http://target-app/login -d "username=admin&password=secret"
  ```

- Pitfall 2: Failing to install Burp's CA certificate, causing TLS trust errors
  - Bad
  ```http
  # Client connects with TLS; certificate trust fails; no mitigation
  curl https://target-app/secure -k
  ```
  - Good
  ```bash
  # Install Burp's CA cert and connect normally
  curl https://target-app/secure
  # Or, for testing in environments with self-signed certs, use a trusted CA bundle
  curl --cacert /path/to/burp_ca.pem https://target-app/secure
  ```

- Pitfall 3: Running scans without scope or authorization
  - Bad
  ```bash
  # Broad, unsupervised scan that touches production
  burp-scanner --target=https://prod-app.example.com
  ```
  - Good
  ```bash
  # Scoped testing with written authorization and a defined target set
  burp-scanner --target=https://test-env.example.com/login --scope=/login,/search
  ```

- Pitfall 4: Logging sensitive data without redaction
  - Bad
  ```python
  print("Payload used:", payload)  # logs credentials in plaintext
  ```
  - Good
  ```python
  print("Payload used: [redacted]")  # avoid printing sensitive data
  payload = "<redacted>"
  ```

- Pitfall 5: Not validating test results against a baseline
  - Bad
  ```python
  resp = requests.get("https://target-app/login", proxies=proxies)
  print(resp.status_code)
  # Assume everything is fine without comparing to a known baseline
  ```
  - Good
  ```python
  baseline = 200  # known-good response
  resp = requests.get("https://target-app/login", proxies=proxies)
  assert resp.status_code == baseline, "Unexpected status code"
  ```

## Y. Why This Matters In Real Systems

- Burp Suite is used by security professionals to identify and validate vulnerabilities before release. It provides hands-on inspection of requests and responses, enabling precise manipulation to verify behavior, error handling, and input validation.
- In real-world teams, Burp supports:
  - Manual testing: intercept, modify, and replay traffic to test server-side protections.
  - Reproducible testing: use Repeater and Intruder to create repeatable test cases for audit trails.
  - Collaboration: sharing findings with teammates, documenting remediation steps, and tracking progress.
- Legal and ethical context:
  - Always have written authorization and a defined scope before testing any system.
  - Avoid testing production data without safeguards; use staging or lab environments when possible.
  - Respect data privacy and regulatory requirements during testing.

## Z. Study Questions

1. What are the primary components of Burp Suite, and what is each used for?
2. How do you configure a client (browser or script) to route traffic through Burp’s proxy?
3. What is the difference between Burp Repeater and Burp Intruder?
4. How can you test for SQL injection using Burp’s Repeater and Intruder workflow?
5. Why is installing Burp’s CA certificate important when intercepting TLS traffic?

## Exercise

Multi-part practical coding challenge: Set up Burp Suite in a safe, local lab environment and perform a basic vulnerability assessment on a deliberately vulnerable web app (e.g., DVWA, WebGoat, or another staging target you have authorization to test).

Part A — Environment and proxy setup
- Objective: Configure Burp's Proxy and route a test browser or curl through it.
- Steps:
  1) Start Burp Suite Community edition and ensure the Proxy listener is enabled on 127.0.0.1:8080.
  2) Install Burp's CA certificate in your browser or in your test script’s trust store.
  3) Route traffic from a browser or a curl command through Burp:
     - curl -x http://127.0.0.1:8080 https://test-env.local/login -d "username=admin&password=secret" -s

Code block (Python example routing through Burp)
```python
import requests

proxies = {
  "http": "http://127.0.0.1:8080",
  "https": "http://127.0.0.1:8080",
}

url = "https://test-env.local/login"
payload = {"username": "admin", "password": "secret"}

# TLS verification disabled only in test environments; prefer installing Burp's CA instead
resp = requests.post(url, data=payload, proxies=proxies, verify=False)

print(resp.status_code)
print(resp.text[:500])  # preview first 500 chars
```

Line-by-line explanation
- Line 1-6: Import requests and define a proxies dict pointing to Burp’s 127.0.0.1:8080 listener.
- Line 8: Define the target URL for the login endpoint.
- Line 9: Set up the form data payload to submit.
- Line 12-13: Send the POST request through Burp, with TLS verification disabled for test environments.
- Line 15-16: Print the HTTP status code and a portion of the response body for quick verification.

Part B — Repeater exercise
- Objective: Capture a valid login request, then modify it to test for one common vulnerability (e.g., basic SQL injection) using Burp Repeater.
- Tasks:
  1) In Burp, intercept the login request from the browser.
  2) Copy the request into Repeater and modify the username field to test for vulnerability:
     - username=admin' OR '1'='1
  3) Compare the responses to determine if the server accepts the injection.

Part C — Intruder payloads (conceptual)
- Objective: Create a small payload file and simulate a position marking for a few test inputs.
- Tasks:
  1) Create a file intruder_payloads.txt with sample payloads:
     - admin
     - admin' -- 
     - <script>alert(1)</script>
  2) Mark a target parameter with Burp’s position markers in the request:
     - username=§admin§&password=§{payload}§
  3) Explain how Intruder would loop over payloads for the marked position(s) and what to observe (error messages, timing, or content changes).

Deliverables you should produce:
- A short write-up summarizing what you tested, what you observed, and any mitigations you would recommend (e.g., input validation, prepared statements, CSRF protections, TLS/PKI hygiene).
- A Python script (as shown in Part A) that demonstrates routing HTTP requests through Burp’s proxy, with proper certificate handling in a real environment (i.e., install Burp’s CA certificate and set verify=True with a trusted CA bundle).

Note: Always conduct security testing only on systems you own or have explicit authorization to assess, and ensure you follow all applicable laws and organizational policies.