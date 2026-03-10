# Track: Cyber Security - Phase 3 — Penetration Testing: Reconnaissance and Enumeration (Web App Security)

Reconnaissance and enumeration are the reconnaissance phases of a penetration test. They involve gathering publicly available information and mapping an application's attack surface before any intrusion attempts. In formal engagements, this step helps defenders understand what an attacker could discover, prioritize assets, and scope tests. In professional practice, this means working within the legal scope, using ethical OSINT techniques, and documenting everything for the final report.

## 1. Reconnaissance Fundamentals for Web Apps
This section covers the core concepts of passive and active reconnaissance, and how to methodically collect web-app-focused intelligence without attacking or destabilizing the target.

```python
# 1. Reconnaissance Fundamentals - Passive OSINT and basic web asset discovery
import requests
import dns.resolver

DOMAIN = "example.com"

def get_dns_records(domain):
    records = {"A": [], "AAAA": [], "MX": [], "NS": [], "CNAME": []}
    for qtype in records.keys():
        try:
            answers = dns.resolver.resolve(domain, qtype)
            records[qtype] = [r.to_text() for r in answers]
        except Exception:
            records[qtype] = []
    return records

def crt_sh_subdomains(domain):
    url = f"https://crt.sh/?q=%25.{domain}&output=json"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            return []
        data = r.json()
        subs = set()
        for item in data:
            name_value = item.get("name_value")
            if not name_value:
                continue
            for sub in name_value.split("\n"):
                sub = sub.strip().lower()
                if sub and sub.endswith(domain):
                    subs.add(sub)
        return sorted(subs)
    except Exception:
        return []

def main():
    dns = get_dns_records(DOMAIN)
    subs = crt_sh_subdomains(DOMAIN)
    print("DNS records:", dns)
    print("Subdomains (crt.sh):", subs)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Line 1: Import the requests library for HTTP requests.
- Line 2: Import dns.resolver from dnspython to perform DNS lookups.
- Line 4: Define the target domain for reconnaissance.
- Line 6-14: Function get_dns_records(domain) builds a dictionary of common DNS record types and queries them, collecting results or empty lists on failure.
- Line 16-28: Function crt_sh_subdomains(domain) queries crt.sh for subdomains, parses JSON results, splits multiple names, normalizes to lowercase, and returns a sorted list.
- Line 30-36: main() runs DNS and subdomain discovery and prints results.
- Line 38: Standard Python entry point to run main() when executed as a script.

## 2. Web App Endpoint Discovery: Robots, Sitemaps, and OpenAPI
This section demonstrates how to discover web app endpoints by parsing public artifacts and API specifications, which are often exposed or discoverable in test environments.

```python
# 2. Web App Endpoint Discovery: robots.txt, sitemap.xml, and OpenAPI
import requests
from urllib.parse import urljoin
import re
import json

def fetch(url):
    try:
        r = requests.get(url, timeout=6)
        if r.status_code == 200:
            return r
    except requests.RequestException:
        pass
    return None

def parse_sitemap(xml_text):
    urls = re.findall(r'<loc>([^<]+)</loc>', xml_text)
    return urls

def extract_openapi_paths(base_url):
    candidates = [
        "/openapi.json", "/swagger.json", "/v3/api-docs", "/docs/openapi.json"
    ]
    for c in candidates:
        full = urljoin(base_url, c)
        resp = fetch(full)
        if resp and "json" in resp.headers.get("Content-Type",""):
            try:
                data = resp.json()
                paths = []
                if isinstance(data, dict):
                    raw = data.get("paths") or data
                    if isinstance(raw, dict):
                        paths = list(raw.keys())
                return full, paths
            except ValueError:
                pass
    return None, []

def main():
    base = "https://example.com/"
    # robots.txt
    robots = fetch(urljoin(base, "robots.txt"))
    if robots:
        print("Robots.txt:")
        print(robots.text)
    # sitemap.xml
    sitemap = fetch(urljoin(base, "sitemap.xml"))
    if sitemap and sitemap.text:
        for u in parse_sitemap(sitemap.text):
            print("Sitemap URL:", u)
    # OpenAPI
    openapi_url, endpoints = extract_openapi_paths(base)
    if openapi_url:
        print("OpenAPI at:", openapi_url)
        for e in endpoints:
            print("OpenAPI path:", e)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Line 1: Import requests for HTTP operations.
- Line 2: Import urljoin to build full URLs from base and paths.
- Line 3: Import re for simple XML-like parsing of sitemap entries.
- Line 4: Import json for potential JSON handling of OpenAPI data.
- Line 6-12: fetch(url) sends a GET and returns the response if status 200; otherwise returns None.
- Line 14-16: parse_sitemap(xml_text) extracts URLs from <loc> elements using a regex.
- Line 18-31: extract_openapi_paths(base_url) tries common OpenAPI endpoints, validates JSON content, and extracts the top-level "paths" keys as endpoints.
- Line 33-44: main() orchestrates robots.txt, sitemap.xml, and OpenAPI discovery and prints findings.
- Line 46: Standard entry point.

## 3. Directory and Parameter Discovery: Brute-forcing and parameter spotting
This section shows how to perform lightweight, controlled directory enumeration to surface hidden or misconfigured endpoints, with careful handling of responses.

```python
# 3. Directory and Parameter Discovery
import requests
from urllib.parse import urljoin
import time

WORDLIST = ["admin","login","config","dashboard","api","data","assets","uploads","wordpress","wp-admin"]

def test_paths(base_url, paths, delay=0.25):
    results = []
    for p in paths:
        url = urljoin(base_url, p if p.startswith("/") else "/" + p)
        try:
            r = requests.get(url, timeout=5, allow_redirects=False)
            results.append((url, r.status_code))
        except requests.RequestException:
            results.append((url, None))
        time.sleep(delay)
    return results

def main():
    base = "https://example.com/"
    for url, code in test_paths(base, WORDLIST):
        print(code if code is not None else "ERR", url)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Line 1: Import requests for HTTP requests.
- Line 2: Import urljoin to safely concatenate base URL and path.
- Line 3: Import time to enforce delays between requests (rate limiting).
- Line 5: Define a small, reusable wordlist of common endpoints.
- Line 7-18: test_paths(base_url, paths, delay) builds full URLs, performs a GET without following redirects, records the HTTP status, handles exceptions, and enforces a delay between requests to respect rate limits.
- Line 20-29: main() runs the brute-force against the base URL and prints status codes with URLs.
- Line 31: Entry point.

## 4. Fingerprinting and CMS/Server Discovery
This section shows how to infer server details and possible CMSs from headers and content, which helps tailor further testing and attack simulation.

```python
# 4. Fingerprinting and CMS/Server Discovery
import requests

def fingerprint(base_url):
    try:
        r = requests.get(base_url, timeout=6)
    except requests.RequestException:
        return None
    info = {
        "Server": r.headers.get("Server",""),
        "X-Powered-By": r.headers.get("X-Powered-By",""),
        "CMS_guess": None
    }
    text = ""
    try:
        text = r.text.lower()
    except Exception:
        pass
    if "wordpress" in text:
        info["CMS_guess"] = "WordPress"
    elif "drupal" in text:
        info["CMS_guess"] = "Drupal"
    elif "joomla" in text:
        info["CMS_guess"] = "Joomla"
    return info

def main():
    url = "https://example.com/"
    res = fingerprint(url)
    if res:
        print(res)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Line 1: Import requests for network operations.
- Line 3: Define fingerprint(base_url) to collect server, framework, and CMS hints.
- Line 4-9: Attempt to fetch the base URL and handle network errors gracefully.
- Line 10-13: Build a dictionary with HTTP header hints: Server and X-Powered-By.
- Line 14-19: Convert page content to lowercase and heuristically check for CMS signatures (WordPress, Drupal, Joomla).
- Line 21-29: main() executes fingerprinting and prints the result.
- Line 31: Entry point.

## X. Common Beginner Mistakes
3+ real-world beginner pitfalls with bad vs good code shown side-by-side.

- Pitfall 1: No scope or authorization checks
  - Bad
  ```python
  # Bad: No scope awareness or consent check
  import requests
  def brute(base, paths):
      for p in paths:
          requests.get(base + p)
  ```
  - Good
  ```python
  # Good: Enforce scope and consent; small, controlled set
  ALLOWED_DOMAINS = {"lab.local", "example.lab"}
  def safe_brute(base, paths, allowed=ALLOWED_DOMAINS, delay=0.5):
      if urlparse(base).netloc not in allowed:
          raise ValueError("Domain out of scope")
      for p in paths:
          url = base.rstrip("/") + "/" + p.lstrip("/")
          r = requests.get(url, timeout=6, allow_redirects=False)
          print(r.status_code, url)
          time.sleep(delay)
  ```

- Pitfall 2: Ignoring responsible disclosure and safety controls
  - Bad
  ```python
  # Bad: No user agent and no rate limiting
  import requests
  def fetch(url):
      return requests.get(url, verify=False)  # insecure TLS and no UA
  ```
  - Good
  ```python
  # Good: Respect TLS, set User-Agent, and rate limit
  import requests, time
  HEADERS = {"User-Agent":"ReconLab/1.0 (lab@example.com)"}
  def fetch(url, delay=0.5):
      r = requests.get(url, headers=HEADERS, timeout=6, verify=True)
      time.sleep(delay)
      return r
  ```

- Pitfall 3: Building URLs with naive string concatenation
  - Bad
  ```python
  # Bad: Simple string concat may miss slashes
  def build(base, path):
      return base + path
  ```
  - Good
  ```python
  # Good: Use urljoin to normalize paths
  from urllib.parse import urljoin
  def build(base, path):
      return urljoin(base, path)
  ```

## Y. Why This Matters In Real Systems
- Accurate reconnaissance creates the asset inventory, which is foundational for threat modeling and risk assessment. In production, recon results guide:
  - Scope definition and rules of engagement to ensure legal and ethical boundaries are respected.
  - Asset prioritization: identifying publicly exposed endpoints that attackers are most likely to target.
  - Security testing plan: focusing on discovered endpoints, auth mechanics, input validation, and API surfaces.
- Production usage considerations:
  - Respect robots.txt and sitemap when allowed, but never rely on them for security assumptions.
  - Rate-limit and throttle tests to avoid affecting live services.
  - Store findings securely; endpoint inventories and banners (e.g., CMS banners) can reveal sensitive implementation details.
  - Integrate findings with ticketing and reporting pipelines for remediation and risk tracking.
  - Use this information to inform defensive controls: WAF rules, API gateway policies, and monitoring dashboards.

## Z. Study Questions
1) What is the difference between passive and active reconnaissance in web apps?
2) Name two OSINT sources you can use to discover subdomains or endpoints for a target domain.
3) How can OpenAPI or Swagger endpoints be discovered and enumerated?
4) Why is robots.txt useful for recon, and what are the ethical considerations around it?
5) What quick signals can indicate a CMS (WordPress, Drupal, Joomla) from web content?

## Exercise
Complete a practical, lab-safe reconnaissance script and demonstrate its capabilities end-to-end.

Part A: Implement a Python reconnaissance tool (recon_lab.py) that:
- Accepts a single domain as a command-line argument.
- Downloads and prints robots.txt if present.
- Attempts to fetch and parse sitemap.xml, printing discovered URLs.
- Attempts to locate an OpenAPI spec at common paths (openapi.json, swagger.json, v3/api-docs) and prints the discovered endpoint paths.
- Performs a small, rate-limited directory enumeration using a built-in wordlist and prints HTTP status codes for each candidate.
- Outputs all results in a structured JSON file results.json with fields: domain, robots, sitemap, openapi_endpoints, dir_endpoints.

Starter code (you can expand from here):
```python
import sys
import json
import time
import requests
from urllib.parse import urljoin

WORDLIST = ["admin","login","config","dashboard","api","data","assets","uploads","wordpress","wp-admin"]

def fetch(url):
    try:
        r = requests.get(url, timeout=6)
        return r
    except requests.RequestException:
        return None

def parse_sitemap(xml_text):
    import re
    return re.findall(r'<loc>([^<]+)</loc>', xml_text)

def extract_openapi_paths(base_url):
    candidates = ["/openapi.json","/swagger.json","/v3/api-docs","/docs/openapi.json"]
    for c in candidates:
        full = urljoin(base_url, c)
        resp = fetch(full)
        if resp and 'application/json' in resp.headers.get('Content-Type',''):
            try:
                data = resp.json()
                paths = []
                if isinstance(data, dict):
                    raw = data.get("paths") or data
                    if isinstance(raw, dict):
                        paths = list(raw.keys())
                return full, paths
            except ValueError:
                pass
    return None, []

def main():
    if len(sys.argv) != 2:
        print("Usage: python recon_lab.py <target-domain>")
        sys.exit(1)
    domain = sys.argv[1]
    base = f"https://{domain}/"

    results = {"domain": domain, "robots": None, "sitemap": [], "openapi_endpoints": [], "dir_endpoints": []}

    # Robots.txt
    r = fetch(urljoin(base, "robots.txt"))
    if r:
        results["robots"] = r.text

    # Sitemap
    s = fetch(urljoin(base, "sitemap.xml"))
    if s and s.text:
        results["sitemap"] = parse_sitemap(s.text)

    # OpenAPI
    openapi_url, endpoints = extract_openapi_paths(base)
    if endpoints:
        results["openapi_endpoints"] = endpoints

    # Directory brute-force
    for path in WORDLIST:
        url = urljoin(base, path if path.startswith("/") else "/" + path)
        resp = fetch(url)
        code = resp.status_code if resp else None
        results["dir_endpoints"].append({"url": url, "status": code})

        # Be gentle in a lab; sleep a bit
        time.sleep(0.15)

    # Write results
    with open("results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()

```

Part B: Run and validate
- Ensure you have Python 3.x and the requests library installed (pip install requests).
- Run in a lab environment with explicit authorization: python recon_lab.py lab.example.local
- Review the generated results.json and validate that the fields populate as expected.
- Extend the wordlist and add error handling or multi-threading (with care to not overwhelm the target in a real environment).

Notes and safety
- Always operate within an authorized scope and in a test or lab environment.
- Do not use these techniques against systems you do not own or do not have explicit permission to test.
- Use the results to inform defensive improvements and risk-based remediation.