# Networking for Security (OSI, Ports)

Compelling introductory paragraph: In cybersecurity, understanding how networks operate at the protocol and OSI layer level is foundational. The OSI model provides a blueprint for how data travels from and to devices, while ports and protocols define the exact surfaces that attackers may probe. Mastery of these concepts enables you to design, deploy, and defend networks with a precise map of where to enforce controls, monitor activity, and detect anomalies. This lesson grounds you in OSI layering, common ports and protocols, and practical hardening techniques you’ll apply in real systems.

## 1. OSI Model and Security Fundamentals

In this section you’ll learn how the OSI model maps to security responsibilities and how to categorize events by OSI layer. You’ll also see a small Python example that demonstrates mapping descriptive security events to OSI layers, a useful skill for log triage and incident response.

```python
# OSI layer Roles mapping and event-to-layer classifier
OSI_LAYER_ROLES = {
    1: "Physical",
    2: "Data Link",
    3: "Network",
    4: "Transport",
    5: "Session",
    6: "Presentation",
    7: "Application",
}

def event_to_osi_layer(event):
    text = event.lower()
    # Heuristic mapping based on keywords
    if any(k in text for k in ["ethernet","frame","mac","switch","vlan"]):
        return 2
    if any(k in text for k in ["ip","routing","icmp","gateway","packet","arp"]):
        return 3
    if any(k in text for k in ["tcp","udp","socket","handshake"]):
        return 4
    if any(k in text for k in ["session","dialog","auth","login","token"]):
        return 5
    if any(k in text for k in ["ssl","tls","encryption","cert","cipher"]):
        return 6
    if any(k in text for k in ["http","https","dns","smtp","ssh","ftp","api","application"]):
        return 7
    return 1  # default to Physical if nothing matches

# Demonstration with representative events
examples = [
    "TCP SYN flood",
    "MAC address spoofing",
    "IP spoofing",
    "DNS query"
]

for example in examples:
    layer = event_to_osi_layer(example)
    print(f"{example} -> OSI Layer: {layer} ({OSI_LAYER_ROLES[layer]})")
```

### Line-by-line explanation
- OSI_LAYER_ROLES: Defines a mapping from layer number to human-friendly name for reference in outputs.
- The event_to_osi_layer function: Accepts a string event description and lowers its case to simplify keyword matching.
- text = event.lower(): Normalize the input to enable substring comparisons.
- The if/elif blocks: Check for keywords associated with each OSI layer. Each block returns the first matching layer number.
  - For example, keywords like "ethernet" or "mac" map to Data Link (2).
  - Keywords like "ip" or "routing" map to Network (3).
  - Keywords like "tcp" or "handshake" map to Transport (4).
  - Keywords like "auth" or "login" map to Session (5).
  - Keywords like "ssl" or "encryption" map to Presentation (6).
  - Keywords like "http" or "dns" map to Application (7).
- The final return 1 provides a fallback to Physical (layer 1) if no keywords match.
- The examples loop runs the classifier on sample events and prints the resulting OSI layer and its name.

## 2. Ports, Protocols, and Security Implications

This section covers how ports and their associated protocols expand or shrink the attack surface. You’ll see a simple local port scanner to illustrate how open ports can be discovered in a lab environment, plus practical firewall rule examples to close or allow traffic. Remember to run port-scanning code only on hosts you own or have explicit permission to test.

```python
import socket

def is_port_open(host, port, timeout=0.25):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        try:
            s.connect((host, port))
            return True
        except (ConnectionRefusedError, OSError, socket.timeout):
            return False

def scan_range(host, start_port, end_port):
    open_ports = []
    for port in range(start_port, end_port + 1):
        if is_port_open(host, port):
            open_ports.append(port)
    return open_ports

host = "127.0.0.1"  # run in a safe lab environment
print(f"Scanning {host} ports 1-1024...")
open_ports = scan_range(host, 1, 1024)
print("Open ports:", open_ports)
```

### Line-by-line explanation
- import socket: Imports the standard socket module used for TCP connections.
- def is_port_open(host, port, timeout=0.25): Defines a helper to test if a single port is open.
- with socket.socket(...): Creates a TCP socket and ensures it closes via context manager.
- s.settimeout(timeout): Sets a short timeout to avoid long waits on closed ports.
- try: s.connect((host, port)): Attempts a TCP handshake to the target port.
- except (ConnectionRefusedError, OSError, socket.timeout): Catches common failures (closed port, network error, or timeout) and returns False.
- def scan_range(host, start_port, end_port): Scans a contiguous range of ports on the given host.
- for port in range(start_port, end_port + 1): Iterates over each port in the range.
- if is_port_open(host, port): If the port responds, it is added to open_ports.
- host = "127.0.0.1": Localhost target to avoid affecting external networks; ensure you’re in a safe lab.
- print and open_ports: Output the list of ports detected as open.

Firewall rule examples (Linux, iptables) to illustrate how to enforce port controls in production:

```bash
# Block all incoming by default
sudo iptables -P INPUT DROP

# Allow essential services (SSH on 22, HTTP on 80, HTTPS on 443)
sudo iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# Optional: allow localhost traffic
sudo iptables -A INPUT -i lo -j ACCEPT

# Save rules (depends on distro)
sudo service iptables save
```

### Line-by-line explanation
- sudo iptables -P INPUT DROP: Sets the default policy for incoming traffic to DROP, creating a closed baseline.
- sudo iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT: Allows new and established TCP connections on port 22 (SSH).
- sudo iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT: Allows HTTP traffic (port 80).
- sudo iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT: Allows HTTPS traffic (port 443).
- sudo iptables -A INPUT -i lo -j ACCEPT: Permits loopback traffic for internal components.
- Saving rules ensures persistence across reboots.

## 3. Defense-in-Depth: Practical Hardening of Network Components

Security in depth combines OSI understanding with concrete controls—firewalls, intrusion detection, secure defaults, and monitoring. This section demonstrates a lightweight log-parsing example that can feed into SIEMs or alerting rules, plus a quick set of hardening commands you’ll apply in a real environment.

```python
import re

def parse_block_log(line):
    # Example: "BLOCK IN=eth0 SRC=203.0.113.5 DST=198.51.100.1 DPT=22"
    m = re.search(r'SRC=([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+).*DPT=(\d+)', line)
    if m:
        src = m.group(1)
        dpt = int(m.group(2))
        return src, dpt
    return None

log_lines = [
    "Jun 1 12:01:23 BLOCK IN=eth0 SRC=203.0.113.5 DST=198.51.100.1 DPT=22",
    "Jun 1 12:02:10 BLOCK IN=eth0 SRC=198.51.100.2 DST=198.51.100.1 DPT=443",
    "Jun 1 12:03:05 ALLOW IN=eth0 SRC=198.51.100.3 DST=198.51.100.1 DPT=80",
]

blocked = [parse_block_log(l) for l in log_lines if "BLOCK" in l]
print("Blocked attempts:", blocked)
```

### Line-by-line explanation
- import re: Imports the regular expressions module for parsing log lines.
- def parse_block_log(line): Defines a function to extract the source IP and destination port from a firewall-like log line.
- m = re.search(...): Uses a regex to capture SRC and DPT values from the log line.
- if m: src = m.group(1); dpt = int(m.group(2)): Extracts the captured groups and converts the port to an integer.
- return src, dpt: Returns the parsed data for this log line.
- log_lines: A small sample of log lines to illustrate parsing.
- blocked = [parse_block_log(l) for l in log_lines if "BLOCK" in l]: Filters and parses only BLOCK entries.
- print("Blocked attempts:", blocked): Outputs the parsed information suitable for alerting or enrichment in a SIEM.

### Line-by-line explanation
- The code extracts attacker source and port data from firewall-like logs, demonstrating how security telemetry can be normalized for detection pipelines.
- This kind of parsing supports rate-limiting, IP reputation lookups, and automated incident response triggers when combined with alerting systems.

## X. Common Beginner Mistakes

- 1) Bad: Scanning without timeouts or with unbounded concurrency
- Good: Use timeouts and bounded concurrency to prevent hangs and resource exhaustion

```python
# Bad
import socket
def scan(host, port):
    s = socket.socket()
    s.connect((host, port))  # Blocks until success or fail
    s.close()

# Good
import socket
def scan(host, port, timeout=0.25):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        try:
            s.connect((host, port))
            return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            return False
```

- 2) Bad: Spawning a thread per port for large scans
- Good: Use a bounded thread pool or asynchronous I/O

```python
# Bad
import threading
def spawn(host, port): pass
threads = []
for port in range(1, 1025):
    t = threading.Thread(target=spawn, args=(host, port))
    t.start()
    threads.append(t)

# Good
from concurrent.futures import ThreadPoolExecutor
def check(port): pass
with ThreadPoolExecutor(max_workers=50) as ex:
    results = list(ex.map(check, range(1, 1025)))
```

- 3) Bad: Hard-coding sensitive targets or credentials
- Good: Parameterize inputs and secure them (env vars, config management)

```python
# Bad
TARGET = "127.0.0.1"
OPEN_PORTS = [22, 80, 443]  # plain, environment-agnostic

# Good
import os
TARGET = os.getenv("TARGET_HOST", "127.0.0.1")
OPEN_PORTS = [int(p) for p in os.getenv("OPEN_PORTS", "22,80,443").split(",")]
```

- 4) Bad: Ignoring input validation and type safety
- Good: Validate and convert types, provide helpful errors

```python
# Bad
def is_open(host, port):
    s.connect((host, port))  # port may be a string, etc.

# Good
def is_open(host, port):
    port = int(port)
    if not (0 < port < 65536):
        raise ValueError("Port out of range")
    with socket.create_connection((host, port), timeout=0.5) as s:
        return True
```

## Y. Why This Matters In Real Systems

- OSI awareness helps security teams map incidents to the exact network stack and plan mitigations that are appropriate for the layer (e.g., link-layer confinement vs. transport protection vs. application-layer validation).
- Port and protocol discipline directly shapes the attack surface. Unsecured or unnecessary open ports provide easy vectors for reconnaissance, exploitation, and lateral movement.
- Defense-in-depth requires combining network controls (firewalls, segmentation), secure service configuration (disable unused protocols), monitoring (IDS/IPS, logs, baselines), and rapid incident response. In production, you’ll implement baseline hardening, continuous validation (scans, audits), and automated containment when anomalies trigger alerts.
- Practical outcomes you’ll implement: 
  - A default-deny firewall posture with explicit allow rules for essential services.
  - Regular, permissioned network scans in a controlled lab or staging environment.
  - Centralized logs and alerting for blocked attempts and anomalous port access.
  - Secure configurations for common services (SSH, HTTP/HTTPS) and enforcement of encryption in transit.

## Z. Study Questions

1. What is the OSI layer most associated with IP routing and logical addressing, and why is this important for security planning?
2. Why should you avoid scanning large port ranges without safeguards, and what techniques help mitigate risk?
3. How can firewall default policies influence your security posture in a production environment?
4. In the code samples, what role do timeouts play in port scanning or network operations?
5. How can you map a raw security event description to an OSI layer, and why is this mapping useful for incident response?

## Exercise

Part A — OSI Layer Classifier
- Implement a function in Python that, given a short security event description, returns the most likely OSI layer number and name. Extend the classifier to handle at least 12 example keywords per layer and add unit tests that cover at least 8 distinct events.
- Deliverables:
  - A module named osi_classifier.py with a function event_to_osi(event: str) -> (int, str)
  - A tests/osi_classifier_test.py with 8 test cases

Part B — Local Port Scanner Lab
- Build a safe, local port scanner that:
  - Scans ports 1-256 on localhost
  - Uses a timeout to avoid hangs
  - Uses a bounded thread pool (max 20 workers) or a sequential fallback if you prefer
  - Outputs a clean list of open ports
- Deliverables:
  - A script named scanner_lab.py that can be run in a lab environment
  - A README.md with safety notes about testing only on hosts you own

Part C — Firewall Rule Generator
- Write a small utility that takes a service name and port, and outputs a set of iptables rules (or ufw commands) to allow that service and drop everything else. Include validation for port numbers and a dry-run toggle.
- Deliverables:
  - A script named firewall_gen.py with a function generate_rules(service: str, port: int, protocol="tcp", dry_run=True) -> str
  - Example usage in a separate run script or shell snippet

Part D — Firewall Log Parser (Optional extension)
- Create a log parser that ingests a sample firewall log, extracts SRC IP and DPT values for BLOCK entries, and prints a summary of blocked attempts per source IP.
- Deliverables:
  - A script named log_parser.py
  - A small sample log file data in logs/sample_firewall.log

Notes:
- Perform all networked exercises in a controlled lab or on a VM you own. Do not run scans against networks you do not own or have explicit permission to test.
- Comment your code and include minimal unit tests or simple assertions where appropriate.
- If you want to expand further, connect the port scan results to alerting logic (e.g., when a port is unexpectedly open on an external host) and tie that into a SIEM-like workflow.

End of lesson.