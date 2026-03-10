# Track: Cyber Security — Module: Phase 3 — Penetration Testing — Topic: Reconnaissance and Enumeration

Reconnaissance and enumeration are the eyes of a penetration tester. They involve collecting information about a target environment to map its attack surface, identify potential weaknesses, and prioritize further testing. This phase emphasizes legality, ethics, and controlled testing in a lab or with explicit written authorization. Mastery here reduces risk and increases the likelihood of finding meaningful, actionable findings rather than noisy data.

## 1.  Reconnaissance Foundations

In this section, you’ll learn foundational concepts, trusted workflows, and first-principles techniques for gathering data about a target. You’ll see practical examples using common open-source tools and understand how to structure data for later phases.

```bash
#!/usr/bin/env bash
# recon foundations: quick, safe bootstrap for a single target
set -euo pipefail

TARGET="${1:-example.com}"

echo "[+] Target: $TARGET"

echo "[+] Determining IP address(es) for the domain"
dig +short "$TARGET" any | head -n 5

echo "[+] Fetching canonical domain information (A/AAAA, NS, MX)"
for rec in A AAAA NS MX; do
  echo "  - $rec records:"
  dig +short "$TARGET" "$rec" || true
done

echo "[+] Attempting simple subdomain checks against a tiny wordlist"
WORDLIST=(www mail ftp remote login vpn)
for sub in "${WORDLIST[@]}"; do
  host "$sub.$TARGET" >/dev/null 2>&1 \
    && echo "[+] Found subdomain: $sub.$TARGET"
done
```

### Line-by-line explanation breaking down each line

- #!/usr/bin/env bash: Uses bash as the interpreter.
- set -euo pipefail: Exit on error, treat unset variables as errors, and propagate pipe failures.
- TARGET="${1:-example.com}": Set the target domain from the first argument, default to example.com.
- echo "[+] Target: $TARGET": Print which target is being analyzed.
- echo "[+] Determining IP address(es) for the domain": Informational message.
- dig +short "$TARGET" any | head -n 5: Query the DNS for any records associated with the target and show up to 5 results.
- echo "[+] Fetching canonical domain information (A/AAAA, NS, MX)": Log intent to retrieve common DNS records.
- for rec in A AAAA NS MX; do ... done: Iterate over common DNS record types.
- dig +short "$TARGET" "$rec" || true: Query the specific DNS record type for the target; ignore failure to allow continued execution.
- echo "[+] Attempting simple subdomain checks against a tiny wordlist": Indicate small-scale subdomain enumeration.
- WORDLIST=(www mail ftp remote login vpn): Define a tiny, representative subdomain list.
- for sub in "${WORDLIST[@]}"; do ... done: Iterate subdomain attempts.
- host "$sub.$TARGET" >/dev/null 2>&1 && echo "[+] Found subdomain: $sub.$TARGET": Perform a simple DNS/hostname check; print the discovered subdomain if it resolves.

---

## 2.  Passive Reconnaissance Techniques

Passive recon gathers information without directly interacting with the target’s live network in a way that could trigger alerts. OSINT, certificate transparency logs, and DNS history can reveal relationships and exposed infrastructure without active scanning.

```python
#!/usr/bin/env python3
import subprocess, json, sys

def run(cmd):
    p = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    return [l for l in (p.stdout or "").splitlines() if l]

target = sys.argv[1] if len(sys.argv) > 1 else "example.com"

records = {}
records['A'] = run(f"dig +short {target} A")
records['AAAA'] = run(f"dig +short {target} AAAA")
records['NS'] = run(f"dig +short {target} NS")
records['MX'] = run(f"dig +short {target} MX")

print(json.dumps(records, indent=2))
```

### Line-by-line explanation breaking down each line

- #!/usr/bin/env python3: Use Python 3 interpreter.
- import subprocess, json, sys: Import libraries for running shell commands, JSON formatting, and CLI args.
- def run(cmd): ...: Helper to execute a shell command and return non-empty lines.
- p = subprocess.run(cmd, shell=True, text=True, capture_output=True): Run the command, capture stdout as text.
- return [l for l in (p.stdout or "").splitlines() if l]: Return non-empty lines from stdout.
- target = sys.argv[1] if len(sys.argv) > 1 else "example.com": Accept target domain as argument or default.
- records['A'] = run(...): Collect A records via dig.
- records['AAAA'] = run(...): Collect AAAA records via dig.
- records['NS'] = run(...): Collect NS records via dig.
- records['MX'] = run(...): Collect MX records via dig.
- print(json.dumps(records, indent=2)): Pretty-print the gathered DNS data as JSON.

---

## 3.  Active Reconnaissance: Scanning and Service Discovery

Active reconnaissance interacts with the target to identify open ports and services. Nmap is the standard tool for this, offering fast discovery, service versioning, OS detection, and scriptable outputs.

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-127.0.0.1}"
OUTPUT="${2:-scan.xml}"

# Aggressive scan: detection, versioning, OS, and scripts on all ports
nmap -sS -sV -A -T4 -p- -oX "$OUTPUT" "$TARGET"
```

### Line-by-line explanation breaking down each line

- #!/usr/bin/env bash: Use Bash interpreter.
- set -euo pipefail: Harden script; stop on errors, treat unset vars as errors, propagate pipe failures.
- TARGET="${1:-127.0.1}": Target IP or hostname; defaults to loopback for offline testing.
- OUTPUT="${2:-scan.xml}": Output file name; defaults to scan.xml.
- nmap -sS -sV -A -T4 -p- -oX "$OUTPUT" "$TARGET": Run an Nmap scan:
  - -sS: TCP SYN stealth scan (fast, less intrusive on some networks).
  - -sV: Probe services to determine version.
  - -A: Enable OS detection, version detection, script scanning, and traceroute.
  - -T4: Timing template for faster scans, with a reasonable level of aggressiveness.
  - -p-: Scan all 65535 ports.
  - -oX "$OUTPUT": Output results in XML for easy parsing.
  - "$TARGET": The target to scan.

---

## 4.  DNS Enumeration and Zone Discovery

DNS enumeration helps map domain infrastructure, subdomains, and possible misconfigurations. Attempting zone transfers is optional and should be performed only when authorized and appropriate.

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-example.com}"
SERVER="${2:-ns1.example.com}"

echo "[+] Attempting DNS AXFR (zone transfer) against $SERVER for $TARGET"
AXFR="$(dig AXFR "$TARGET" @"$SERVER" +noall +answer)"
if [[ -n "$AXFR" ]]; then
  echo "[+] Zone transfer results:"
  echo "$AXFR"
else
  echo "[-] Zone transfer not permitted or no data returned."
fi
```

### Line-by-line explanation breaking down each line

- #!/usr/bin/env bash: Bash script header.
- set -euo pipefail: Safer shell options; abort on errors.
- TARGET="${1:-example.com}": Target domain.
- SERVER="${2:-ns1.example.com}": DNS server to attempt AXFR against.
- echo "[+] Attempting DNS AXFR...": Informational log.
- AXFR="$(dig AXFR "$TARGET" @"$SERVER" +noall +answer)": Run a zone transfer attempt; capture concise output.
- if [[ -n "$AXFR" ]]; then ... else ... fi: Conditional to report success or failure.
- echo "$AXFR": Print zone transfer data if retrieved.

---

## 5.  Banner Grabbing and Service Fingerprinting

Banner grabbing helps identify running services and versions by collecting banners from open ports. This is a lightweight way to validate service fingerprints without full exploitation.

```bash
#!/usr/bin/env python3
import socket
import sys

host = sys.argv[1] if len(sys.argv) > 1 else "scanme.nmap.org"
port = int(sys.argv[2]) if len(sys.argv) > 2 else 80

# Simple HTTP banner grab
with socket.create_connection((host, port), timeout=5) as s:
    s.sendall(b"HEAD / HTTP/1.0\r\nHost: " + host.encode() + b"\r\n\r\n")
    banner = s.recv(1024)

print(banner.decode(errors="ignore", Indonesian="ignore" if False else None))
```

Note: This example demonstrates banner grabbing on HTTP; adapt to other protocols with appropriate request formats (e.g., SSH, FTP). Always obtain explicit authorization before performing any banner grabbing against live systems.

### Line-by-line explanation breaking down each line

- #!/usr/bin/env python3: Python 3 interpreter.
- import socket, sys: Import modules for network I/O and CLI handling.
- host = sys.argv[1] ... port = int(sys.argv[2]) ...: Read the target host and port, with defaults.
- with socket.create_connection((host, port), timeout=5) as s: Establish a TCP connection with a timeout.
- s.sendall(b"HEAD / HTTP/1.0\r\nHost: " + host.encode() + b"\r\n\r\n"): Send a minimal HTTP request to elicit a banner.
- banner = s.recv(1024): Read the server response (banner data).
- print(banner.decode(...)): Print the banner, decoding safely.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Scanning without authorization or broad, unscoped targets
  - Bad:
    ```bash
    # dangerous broad sweep
    nmap -sS 0.0.0.0/0
    ```
  - Good:
    ```bash
    # scoped: run only on approved target(s)
    TARGET="192.0.2.10"
    nmap -sS -p- "$TARGET"
    ```
- Mistake 2: Not saving or organizing findings
  - Bad:
    ```bash
    nmap -sV "$TARGET"
    ```
  - Good:
    ```bash
    TARGET="192.0.2.10"
    nmap -sV -oX "scan_${TARGET}.xml" "$TARGET"
    # Later, parse and aggregate results into a report
    ```
- Mistake 3: Exposing sensitive data in logs or outputs
  - Bad:
    ```bash
    echo "Scan results: $(nmap -sV "$TARGET")"
    ```
  - Good:
    ```bash
    nmap -sV "$TARGET" -oX "scan_${TARGET}.xml"
    # Only log high-level progress; store full results securely
    ```
- Mistake 4: Ignoring rate limits and network etiquette
  - Bad:
    ```bash
    nmap -T0 -p- "$TARGET"
    ```
  - Good:
    ```bash
    # Respectful tempo with a conservative timing
    nmap -T3 -p- "$TARGET" | tee "scan_${TARGET}.log"
    ```

---

## Y. Why This Matters In Real Systems

- Early visibility: Reconnaissance reveals the real footprint of the target — domains, IPs, subnets, services, and user-facing endpoints. This helps security teams map risk and plan defenses.
- Threat modeling: The data gathered during reconnaissance feeds threat modeling and helps prioritize patching, access controls, and monitoring rules.
- Detection and defense: Modern SIEMs and IDS can detect patterns from reconnaissance activities (e.g., repetitive DNS queries, rapid port scans). Designing detection rules around reconnaissance behavior improves incident response.
- Legal and ethical boundaries: Always work within a defined scope, obtain written authorization, and adhere to laws. Unauthorised scanning can be illegal and damaging.
- Production impact: Scans can trigger alerts, rate-limit defenses, or cause service disruption. Use controlled schedules, communicate with the environment owners, and prefer safe scanning options (e.g., reduced scope, verbose logging).

---

## Z. Study Questions — 5 recall questions

1. What is the difference between passive reconnaissance and active reconnaissance?
2. Which Nmap options enable service version detection and operating system fingerprinting in a single scan?
3. Why should you save scan results to files (e.g., XML/JSON) instead of printing to stdout?
4. How can certificate transparency logs help in reconnaissance?
5. What are the ethical and legal prerequisites for conducting reconnaissance on a network you do not own?

---

## Exercise

Goal: Build a small, repeatable reconnaissance pipeline that students can run in a lab environment with explicit authorization. The exercise is multi-part and reinforces code organization, data collection, and results parsing.

Part A — Bash: Passive + Active Recon Pipeline (recon_pipeline.sh)
- Requirements:
  - Accept a single target domain or IP as input.
  - Perform DNS discovery for A/AAAA/NS/MX records.
  - Attempt to enumerate a small list of common subdomains.
  - Run a focused port scan on the top 50 ports (or a pre-defined subset) and save results to XML.
  - Output a concise summary to stdout and store the full XML in a timestamped file.

- Suggested script (conceptual, adjust for your environment):
```bash
#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-example.com}"
OUT_DIR="recon_results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
XML="${OUT_DIR}/scan_${TIMESTAMP}.xml"

mkdir -p "$OUT_DIR"

echo "[*] DNS discovery for ${TARGET}"
dig +short "${TARGET}" A AAAA NS MX | tee "${OUT_DIR}/dns_${TIMESTAMP}.log"

echo "[*] Subdomain probing (small list)"
for sub in www mail ftp remote login vpn dev; do
  fqdn="${sub}.${TARGET}"
  if host "$fqdn" >/dev/null 2>&1; then
    echo "[+] Found subdomain: $fqdn" >> "${OUT_DIR}/subdomains_${TIMESTAMP}.log"
  fi
done

echo "[*] Active port scan on target"
PORTS="1-50"  # adjust as needed to be polite in your lab
nmap -sS -p "$PORTS" "$TARGET" -oX "$XML"

echo "[+] Recon complete. XML: $XML"
```

Part B — Python: Parse Nmap XML and produce a compact report
- Requirements:
  - Read the XML output from the Nmap scan.
  - Extract host, port, state, and service information into a Python dictionary.
  - Print a JSON summary suitable for ingestion by a reporting tool.

- Suggested script:
```python
#!/usr/bin/env python3
import sys, json, xml.etree.ElementTree as ET

def parse_nmap_xml(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    hosts = []
    for host in root.findall('host'):
        status = host.find('status')
        if status is not None and status.attrib.get('state') != 'up':
            continue
        addr = host.find('address')
        ip = addr.attrib['addr'] if addr is not None else None
        ports = []
        for port in host.findall('.//port'):
            pst = port.find('state')
            sv = port.find('service')
            ports.append({
                'port': int(port.attrib['portid']),
                'state': pst.attrib.get('state') if pst is not None else None,
                'service': sv.attrib.get('name') if sv is not None else None,
            })
        hosts.append({'ip': ip, 'ports': ports})
    return {'hosts': hosts}

if __name__ == '__main__':
    xml_path = sys.argv[1]
    data = parse_nmap_xml(xml_path)
    print(json.dumps(data, indent=2))
```

Part C — Validation and best practices
- Validate that you have explicit written authorization before running any scans.
- Keep results in encrypted or access-controlled storage.
- Document scope, timing, and contact information for the engagement.
- Use rate limiting and pacing to avoid disruption and detection by defense systems.

This lesson provides a structured approach to reconnaissance and enumeration, combining foundations, passive and active techniques, practical code examples, defensive considerations, and a hands-on exercise to solidify learning.