# Malware Analysis & Reverse Engineering in Web App Security — Phase 5: Advanced Topics

Malware analysis and reverse engineering in the context of web applications focuses on understanding how malicious code behaves when embedded in or delivered to web assets. This skill helps security engineers identify, dissect, and mitigate threats such as malicious JavaScript in apps, supply-chain payloads, and obfuscated scripts that exfiltrate data or compromise users. Mastery here enables you to build robust detection pipelines, write safer code, and respond quickly when incidents occur in production environments.

## 1. Malware Analysis Workflow for Web Apps
In web app security, malware analysis starts from artifact collection to actionable remediation. You isolate suspicious assets (JS files, injected scripts, or downloaded payloads), perform static analysis to reveal obfuscation and payloads, then use dynamic analysis to observe runtime behavior in a sandbox. The goal is to identify indicators of compromise (IOCs), understand the attack vectors, and create effective mitigations.

```python
# Python: lightweight static analysis for web assets
# - Scans a directory of web assets (.js) for common malicious tokens
# - Extracts base64-like strings and attempts to decode to reveal hidden payloads
import os
import re
import base64
import hashlib

ROOT = '/path/to/webapp/assets'  # adjust to your repo or build output
SUSPECT_PATTERNS = [
    b'eval\\(',        # dynamic code execution
    b'atob\\(',         # base64 decode usage
    b'Function\\s*\\(', # potential dynamic function constructor
    b'window\\.(location|open)',  # redirects
]

def scan_file(path, data):
    sha256 = hashlib.sha256(data).hexdigest()
    found = []
    for pat in SUSPECT_PATTERNS:
        if re.search(pat, data):
            found.append(pat.decode('ascii'))
    # Attempt to extract candidate base64 payloads
    base64_matches = re.findall(br'(?:[A-Za-z0-9+/]{20,})={0,2}', data)
    payloads = []
    for m in base64_matches:
        try:
            dec = base64.b64decode(m, validate=True)
        except Exception:
            continue
        if b'http://' in dec or b'https://' in dec or b'GET ' in dec:
            payloads.append(m.decode('ascii', errors='ignore')[:60])
    return sha256, found, payloads

def main(root: str):
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            if not fname.endswith('.js'):
                continue
            path = os.path.join(dirpath, fname)
            with open(path, 'rb') as f:
                data = f.read()
            sha256, found, payloads = scan_file(path, data)
            if found or payloads:
                print(f'SUSPICIOUS: {path} | sha256={sha256}')
                if found:
                    print('  Patterns:', ', '.join(found))
                if payloads:
                    print('  Possible base64 payloads (first 3):', payloads[:3])

if __name__ == '__main__':
    main(ROOT)
```

### Line-by-line explanation
1) Import standard modules for filesystem traversal, regex, base64 decoding, and hashing.  
2) Set the root directory containing web assets to inspect.  
3) Define patterns commonly associated with client-side malware (eval, atob, Function, redirects).  
4) Define a function to scan a single file: compute SHA-256 and collect any suspicious patterns found.  
5) Within the function, iterate over each suspect pattern and record matches.  
6) Use a regex to pull candidate base64 payload strings from the file.  
7) Attempt to base64-decode each candidate; if decoding yields a string containing network indicators, collect the payload hint.  
8) Scan the entire asset tree, but only process .js files to keep focus on web payloads.  
9) Open and read each JavaScript file in binary mode to avoid encoding issues.  
10) Print a structured report for any file that has suspicious patterns or decoded payload hints, including the file’s SHA-256 hash.  
11) Wire up the script’s entry point to run the main function with the configured root path.

---

## 2. Static Analysis Techniques for JavaScript and Web Payloads
Static analysis catches obfuscation, encoded payloads, and suspicious API usage without executing the code. A practical approach for web assets is to deobfuscate common patterns (base64-encoded strings, character-by-character ops, and atob usage) and inspect the resulting code for risky behavior.

```python
import re
import base64

def deobfuscate_js(js_code: str) -> str:
    # Decode atob("base64") calls
    js_code = re.sub(
        r"atob\(['\"]([^'\"]+)['\"]\)",
        lambda m: base64.b64decode(m.group(1)).decode('utf-8', errors='ignore'),
        js_code
    )
    # Decode String.fromCharCode(...) sequences
    js_code = re.sub(
        r"String\.fromCharCode\(([^)]+)\)",
        lambda m: ''.join(chr(int(n.strip())) for n in m.group(1).split(',') if n.strip().isdigit()),
        js_code
    )
    return js_code

# Example usage
with open('malicious.js', 'r', encoding='utf-8', errors='ignore') as f:
    obf = f.read()

clean = deobfuscate_js(obf)
print(clean[:1000])
```

### Line-by-line explanation
1) Import regex and base64 modules for pattern-based substitution and decoding.  
2) Define a function that takes obfuscated JavaScript code as input and returns deobfuscated output.  
3) Replace atob("BASE64") calls by decoding the embedded Base64 payload to plain text.  
4) Use a regex to locate String.fromCharCode(...) sequences and convert the numeric codes to characters.  
5) For the fromCharCode replacement, split the arguments by comma, trim whitespace, filter numeric values, convert to characters, and assemble a string.  
6) Read a sample JS file presumed to be obfuscated.  
7) Run the deobfuscation function and print the first 1000 characters of the cleaned code for inspection.  
8) This approach handles lightweight, script-level obfuscation typical of malicious web payloads. More advanced obfuscation may require AST-based deobfuscation or executing code in a sandbox for full clarity.

---

## 3. Dynamic Analysis and Sandboxing Web Payloads
Dynamic analysis executes the code in a controlled environment to observe runtime behavior, network activity, and interactions with the browser or DOM. A common practice is to run a headless browser, intercept outbound requests, and log suspicious actions without exposing users.

```javascript
// Node.js with Puppeteer: dynamic analysis of a web page
// Install: npm i puppeteer
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Simple blacklist of domains considered suspicious for a test run
  const banned = [
    'https://example-malicious.com',
    'https://tracker.example.org'
  ];

  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (banned.some((d) => url.startsWith(d))) {
      console.log('Blocking request to', url);
      req.abort();
      return;
    }
    req.continue();
  });

  // Optional: log response status codes for insights
  page.on('response', res => {
    // Example: console.log(`${res.status()} ${res.url()}`);
  });

  await page.goto('https://target-site.example');
  const content = await page.content();
  console.log(content.substring(0, 500)); // show a snippet for quick review
  await browser.close();
})();
```

### Line-by-line explanation
1) Import Puppeteer, a library to control Chromium for dynamic testing.  
2) Start an asynchronous IIFE to enable await/async usage.  
3) Launch a headless browser instance for isolated execution.  
4) Create a new browser page context to load the target site.  
5) Define a small blacklist of domains to treat as suspicious during the test run.  
6) Enable request interception so you can inspect or block outbound requests.  
7) On every network request, extract the URL and compare it against the blacklist.  
8) If a match is found, log the blocked URL and abort the request; otherwise, let it continue.  
9) Optional: hook into response events to capture status codes and URLs for additional IO analysis.  
10) Navigate the page to the target site.  
11) Retrieve the page’s HTML content for quick manual review or automated checks.  
12) Print a short snippet of the page content to confirm the page loaded.  
13) Close the browser to clean up resources.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Evaluating untrusted code directly in a production-like environment
  - Bad:
    ```javascript
    // Dangerous: executing unknown payloads with eval
    const payload = fetchPayload();
    eval(payload);
    ```
  - Good:
    ```javascript
    // Safer approach with a sandbox (conceptual; require a proper sandbox module)
    // Note: In Node.js, using a true sandbox requires a library like vm2 with strict limits
    const { VM } = require('vm2');
    const vm = new VM({ timeout: 1000, sandbox: {} });
    // Input should be from trusted sources only; otherwise, do not execute
    const safeCode = "console.log('safe');";
    vm.run(safeCode);
    ```
- Pitfall 2: Naive base64 detection without validation
  - Bad:
    ```python
    # Overly simplistic: assumes any base64-like string is payload
    import re
    data = open('script.js','rb').read()
    for m in re.findall(br'(?:[A-Za-z0-9+/]{20,})={0,2}', data):
        print(base64.b64decode(m))
    ```
  - Good:
    ```python
    import re, base64
    data = open('script.js','rb').read()
    for m in re.findall(br'(?:[A-Za-z0-9+/]{20,})={0,2}', data):
        try:
            dec = base64.b64decode(m, validate=True)
        except Exception:
            continue
        # Heuristics: look for network calls or readable strings
        if b'http://' in dec or b'https://' in dec or b'GET ' in dec:
            print("Decoded payload hints:", m[:60])
    ```
- Pitfall 3: Logging or printing sensitive data in production
  - Bad:
    ```python
    # Logging entire payloads to console or logs
    print(payload)
    ```
  - Good:
    ```python
    # Redact sensitive content; log only metadata
    print({
        'filename': fname,
        'payload_len': len(payload),
        'heuristic_flags': flags  # e.g., 'contains_http', 'base64_decoded'
    })
    ```
- Pitfall 4: Ignoring error handling and crash resilience
  - Bad:
    ```python
    for f in files:
        data = open(f).read()
        analyze(data)
    ```
  - Good:
    ```python
    for f in files:
        try:
            data = open(f).read()
        except IOError as e:
            print(f"Warning: could not read {f}: {e}")
            continue
        analyze(data)
    ```

---

## Y. Why This Matters In Real Systems — production context and real usage
Malware analysis techniques for web apps underpin many real-world security operations:

- Early detection and response: Static and dynamic analysis help triage suspicious assets before they reach production and after incidents.
- Threat intelligence integration: Outputs from analyses feed SIEMs, EDR, and WAFs to improve alerting and automated mitigation.
- Supply-chain risk management: Web assets may include third-party libraries that are compromised; rigorous checks help uncover malicious injections or refactors.
- Compliance and audit trails: Maintaining artifact inventories and reproducible analysis steps supports regulatory and incident-response requirements.
- Scalable pipelines: In real systems, you build automated workflows where static checks run on PRs, while dynamic analysis is reserved for flagged assets or nightly scans.

Example artifact: a concise scan result in JSON that could feed downstream systems.

```json
{
  "scan_date": "2026-03-10T12:00:00Z",
  "project": "my-web-app",
  "findings": [
    {
      "path": "static/js/app.js",
      "issue": "Suspicious eval usage",
      "severity": "high",
      "suggested_remediation": "Remove or sandbox these calls; prefer safe APIs.",
      "examples": ["eval(payload)", "new Function(...)"]
    },
    {
      "path": "static/js/lib/obfuscated.js",
      "issue": "Base64-encoded payloads detected",
      "severity": "medium",
      "suggested_remediation": "Deobfuscate; validate payload origins; restrict execution."
    }
  ],
  "report_url": "https://internal-reports.example/incident/20260310-001"
}
```

Integrating this into a CI/CD pipeline (high level):

- Stage 1: Static analysis across JS assets; fail on high-severity findings.
- Stage 2: Optional deobfuscation pass for flagged files; generate expert-readable reports.
- Stage 3: If dynamic analysis is enabled, run a sandboxed Puppeteer analysis on suspicious URLs and feed results to the incident response team.
- Stage 4: Summary artifacts saved to a central security repository for audits.

---

## Z. Study Questions — 5 recall questions
1) What is the primary difference between static analysis and dynamic analysis in malware research for web apps?  
2) Name two common JavaScript obfuscation techniques you might encounter in web payloads.  
3) How can you safely observe a web page’s outbound network activity without risking user exposure?  
4) What is the purpose of a sandbox in reverse engineering, and why is it important for web payloads?  
5) Give one example of an IOC you might extract from a suspicious .js asset during analysis.

---

## Exercise
Complete the following multi-part challenge to practice malware analysis and reverse engineering techniques in a web-app security context.

Part A — Static Scan
- Task: Implement a Python script that scans a given directory of web assets for suspicious patterns (eval, atob, Function, redirects) and reports the file path, sha256 hash, and matched patterns.
- Deliverables: A single Python file scan_assets.py and a short README describing how to run it.

Part B — Deobfuscation Pass
- Task: Extend your scanner to identify base64-encoded strings in JavaScript and attempt to decode them. If decoding yields readable content or network-like payloads, log a warning with the snippet.
- Deliverables: Updated scan_assets.py; sample obfuscated.js included in the repo for testing.

Part C — Dynamic Analysis (Optional)
- Task: Create a Node.js script using Puppeteer to load a given URL in headless mode, intercept outbound requests, and log any requests to a list of suspicious domains. The script should output a JSON report with the URLs blocked and a snippet of the HTML content.
- Deliverables: A separate dynamic_analysis.js script; instructions to install Puppeteer and run it against a test URL.

Part D — Integration and Reporting
- Task: Write a minimal report generator that aggregates findings from Part A, Part B, and Part C into a JSON artifact matching the structure shown in the Y section. Ensure the report includes a scan date, project name, and a findings array with path, issue, severity, and remediation fields.
- Deliverables: A report.json generator script and a sample run demonstrating the end-to-end workflow.

Notes and tips:
- Run Part A and Part B locally with a small, representative set of JavaScript files before attempting large repositories.
- When implementing dynamic analysis, start with a safe, private test URL or a local page containing a known benign script to validate your tooling before using real sites.
- Consider expanding your tooling to include basic YARA rule checks for known malicious JS patterns and to tag findings with contextual metadata (e.g., line numbers, code snippets).

This lesson provides practical, hands-on approaches to malware analysis and reverse engineering within the web app security domain, reinforcing how robust tooling, safe analysis environments, and disciplined reporting translate into real-world security resilience.