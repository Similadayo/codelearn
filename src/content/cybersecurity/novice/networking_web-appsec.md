# Networking for Security (OSI, Ports)

This lesson introduces how security professionals use network concepts to protect web apps. We’ll cover the OSI model as a mental model for applying security controls, how ports and protocols define attack surfaces, and practical patterns for testing, filtering, and segmenting traffic. Understanding these basics is essential for hardening services, designing defenses, and performing effective security assessments in real systems.

## 1. OSI Model and Security Basics

The OSI model is a layered mental model that helps engineers reason about where data travels and where security controls can be applied. In practice, most modern Internet traffic sits atop TCP/IP, but mapping controls to OSI layers helps you design defense-in-depth strategies, validate where an attack could occur, and communicate security requirements to teammates.

Code example: a small Python helper that maps OSI layers to recommended security controls and returns them as a list.

```python
# osi_security_controls.py
from typing import List

# OSI layers 1..7
OSI_CONTROLS = {
    1: ["Physical access controls", "Cable management", "Tamper-evident seals"],
    2: ["Port security", "VLAN segmentation", "MAC filtering"],
    3: ["Network firewall rules", "Router ACLs", "Subnet segmentation"],
    4: ["TLS/DTLS for transport", "Cipher suite management", "Perfect forward secrecy"],
    5: ["Secure session management", "CSRF protection", "Token binding"],
    6: ["Data encoding sanity checks", "Encryption in transit", "Data normalization"],
    7: ["Input validation", "Authentication and authorization checks", "Logging and monitoring", "Rate limiting"]
}

def osi_security_controls(layer: int) -> List[str]:
    """
    Return recommended security controls for a given OSI layer (1-7).
    """
    if 1 <= layer <= 7:
        return OSI_CONTROLS[layer]
    raise ValueError("Layer must be between 1 and 7 (inclusive)")

# Example usage
if __name__ == "__main__":
    for l in range(1, 8):
        print(f"OSI Layer {l}: {osi_security_controls(l)}")
```

### Line-by-line explanation
- from typing import List: Imports the List type for type hints.
- OSI_CONTROLS = { … }: Defines a mapping from each OSI layer (1–7) to a list of recommended security controls.
- def osi_security_controls(layer: int) -> List[str]: Declares a function that returns a list of controls for a given layer.
- if 1 <= layer <= 7: return OSI_CONTROLS[layer]: Validates the input and returns the corresponding controls.
- raise ValueError("Layer must be between 1 and 7 (inclusive)"): Throws a clear error if the layer is out of range.
- if __name__ == "__main__": …: Simple usage example that prints controls for all layers 1–7.

What this teaches you professionally:
- OSI helps you think about where to apply controls (physical, data link, network, transport, session, presentation, application).
- Security—a defense-in-depth approach—spans many layers; mapping to OSI clarifies ownership and responsibilities.

## 2. Ports, Protocols, and Scanning

Ports are the gateways where services listen for traffic. Knowing which ports should be open, which are risky, and how to test them is foundational for hardening systems. We’ll look at common TCP ports, difference between TCP and UDP, and simple port-scanning code you can reuse in assessments.

Code block A: Python port scanner for a list of common TCP ports.

```python
# port_scanner.py
import socket
from typing import List, Tuple

def scan_ports(host: str, ports: List[int], timeout: float = 0.5) -> List[Tuple[int, bool]]:
    """
    Scan a host for a list of TCP ports. Returns (port, is_open).
    """
    results: List[Tuple[int, bool]] = []
    for port in ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            try:
                res = s.connect_ex((host, port))
                is_open = (res == 0)
            except Exception:
                is_open = False
            results.append((port, is_open))
    return results

def main():
    host = "scanme.nmap.org"  # Replace with target you are authorized to scan
    common_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 587, 993, 995, 3306, 3389]
    results = scan_ports(host, common_ports)
    for port, is_open in results:
        status = "OPEN" if is_open else "CLOSED"
        print(f"{host}:{port} -> {status}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- import socket: Imports the socket module to perform network connections.
- from typing import List, Tuple: Type hints for readability and reliability.
- def scan_ports(host: str, ports: List[int], timeout: float = 0.5) -> List[Tuple[int, bool]]: Declares the scanner function.
- results: List[Tuple[int, bool]] = []: Initializes an empty results list.
- with socket.socket(...) as s: Creates a new TCP socket and ensures it is closed automatically.
- s.settimeout(timeout): Sets a per-connection timeout to avoid hanging.
- res = s.connect_ex((host, port)): Attempts to connect; returns 0 on success.
- is_open = (res == 0): Determines open/closed based on return code.
- results.append((port, is_open)): Records the outcome for this port.
- host = "scanme.nmap.org": Default target host; replace with your authorized target.
- main(): Entry point to run a quick scan over common ports.
- if __name__ == "__main__": main(): Standard Python entry guard.

Code block B: Bash port test using netcat (nc)

```bash
#!/usr/bin/env bash
# Quick port availability check using netcat (nc)
host="${1:-localhost}"
ports=(22 23 25 53 80 443 8080 3306 5432)
echo "Scanning ports on ${host}"
for p in "${ports[@]}"; do
  if nc -z -w 1 "$host" "$p" >/dev/null 2>&1; then
    echo "Port $p: OPEN"
  else
    echo "Port $p: CLOSED"
  fi
done
```

### Line-by-line explanation
- #!/usr/bin/env bash: Shebang for Bash scripting.
- host="${1:-localhost}": Uses first argument as target host; defaults to localhost.
- ports=(...): Array of ports to test.
- echo "Scanning ports on ${host}": Informational output.
- for p in "${ports[@]}"; do … done: Iterates over ports.
- nc -z -w 1 "$host" "$p" >/dev/null 2>&1: Uses netcat to probe port status (TCP, zero-I/O).
- if … then … else … fi: Branches on open vs closed, prints result.

What this teaches you professionally:
- TCP ports indicate where services listen; TCP is connection-oriented, UDP is connectionless and often used for DNS, DHCP, streaming.
- Simple, deterministic checks help you identify misconfigurations, unauthorized exposures, and potential attack surfaces.

## 3. Firewalling, Segmentation, and Access Controls

To protect services, you often implement firewall rules to limit inbound and outbound traffic, enforce minimum exposure, and segment networks. A defensible default-deny posture is a common and effective pattern in production. The following example demonstrates a minimal, explicit rule set using iptables (Linux).

Code block: Simple default-deny firewall with explicit allowances for web traffic and admin SSH.

```bash
#!/bin/bash
# Simple default-deny firewall template using iptables (Linux)
set -euo pipefail

# Must be run as root
# Reset existing rules
iptables -F
iptables -X
iptables -Z

# Default policies: drop all inbound/outbound by default, allow outbound
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow all traffic on the local loopback interface
iptables -A INPUT -i lo -j ACCEPT

# Allow established/related connections to continue
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Admin access: allow SSH from trusted admin network (example)
# Replace 203.0.113.0/24 with your admin network
iptables -A INPUT -p tcp -s 203.0.113.0/24 --dport 22 -m state --state NEW,ESTABLISHED -j ACCEPT

# Web traffic: allow HTTP/HTTPS to reach web services
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Optional: block all other inbound traffic explicitly (redundant with default DROP)
# iptables -A INPUT -j DROP

echo "Firewall rules applied. Current INPUT chain:"
iptables -L -n --line-number
```

### Line-by-line explanation
- #!/bin/bash: Shebang for Bash.
- set -euo pipefail: Robust shell settings to stop on errors and treat unset vars as errors.
- iptables -F / -X / -Z: Clear all existing rules, user-defined chains, and counters.
- iptables -P INPUT DROP: Default policy for inbound traffic is DROP.
- iptables -P FORWARD DROP: Default policy for forwarded traffic is DROP.
- iptables -P OUTPUT ACCEPT: Default policy for outbound traffic is ACCEPT.
- iptables -A INPUT -i lo -j ACCEPT: Always allow loopback traffic.
- iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT: Allow responses to outbound requests.
- iptables -A INPUT -p tcp -s 203.0.113.0/24 --dport 22 -m state --state NEW,ESTABLISHED -j ACCEPT: Allow SSH from a trusted admin network (adjust as needed).
- iptables -A INPUT -p tcp --dport 80 -j ACCEPT: Allow HTTP traffic.
- iptables -A INPUT -p tcp --dport 443 -j ACCEPT: Allow HTTPS traffic.
- iptables -L -n --line-number: Display the current rules in a numbered list.

What this teaches you professionally:
- In production, a default-deny posture reduces the blast radius and restricts lateral movement.
- Policy- and rule-driven security should be tested in staging with accurate inventories of trusted networks and services.

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

1) Forgetting to close sockets or using resources without a context manager
- Bad:
```python
# bad.py
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("example.com", 80))
# socket not closed
```
- Good:
```python
# good.py
import socket
with socket.create_connection(("example.com", 80), timeout=2) as s:
    pass  # use s as needed
```

2) Not handling timeouts or exceptions during network calls
- Bad:
```python
# bad.py
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("example.com", 80))
print("connected")
```
- Good:
```python
# good.py
import socket
try:
    with socket.create_connection(("example.com", 80), timeout=2) as s:
        print("connected")
except (socket.timeout, ConnectionError) as e:
    print(f"Connection failed: {e}")
```

3) Logging sensitive information or verbose data in production logs
- Bad:
```python
# bad.py
print("PORT_SCAN_RESULT: 80 OPEN on host user-secret-password")
```
- Good:
```python
# good.py
print("PORT_SCAN_RESULT: PORT 80 STATUS_REPORTED")  # avoid leaking secrets
```

4) Assuming OSI layers map one-to-one with actual protocol behavior
- Bad (over-simplified):
```python
# bad.py
def security_for_layer(layer):
    return f"Apply {layer}-specific controls"
# e.g., layer 3 always implies firewall here
```
- Good:
```python
# good.py
def security_for_layer(layer):
    controls = {
        1: ["Physical access controls"],
        2: ["VLAN segmentation"],
        3: ["Network firewall rules"],
        4: ["TLS for transport"],
        5: ["Secure session management"],
        6: ["Data encoding checks"],
        7: ["Input validation and auth"]
    }
    return controls.get(layer, [])
```

Why these matters:
- Real-world code runs in production with limited maintenance windows. Proper resource handling, error handling, and safe logging are essential to avoid outages and data leakage.

## Y. Why This Matters In Real Systems

- Defense in depth: OSI-based thinking helps you assign responsibilities: physical security around devices, secure configurations at the network and transport layers, and secure software behavior at the application layer.
- Port discipline reduces attack surface: Only necessary ports/services should be exposed to the network. Regular port-scanning and inventory are part of secure SDLC and incident response.
- Segmentation and least privilege: Firewall rules and ACLs create barriers between trust zones (e.g., web tier, app tier, database). This limits blast radius during breaches.
- Security testing integration: Port scans, firewall rule validation, and OSI-level threat modeling should be part of CI/CD gates and production monitoring.

Real-system considerations:
- Use IDS/IPS, WAF, and logging to correlate OSI-layer events with security incidents.
- Prefer TLS everywhere, including internal service-to-service calls (mTLS if possible).
- Automate firewall rule provisioning via infrastructure as code (IaC) to avoid drift.
- Maintain up-to-date inventories of open ports, services, and known vulnerabilities.

## Z. Study Questions

1) What is the purpose of the OSI model in security design, and which layer would TLS operate in?

2) How does a TCP port differ from a UDP port in terms of connection semantics?

3) Why is a default-deny firewall policy considered a best practice in production?

4) Describe a simple Python function that maps an OSI layer to recommended security controls.

5) What basic steps would you take to verify that a newly deployed web service does not expose unnecessary ports?

## Exercise

Complete this practical multi-part coding challenge. You will implement a small security tooling module and run basic tests against a local mock environment.

Part A — OSI controls mapping module
- Task: Create a Python module that exports a function osi_controls_for_layer(layer) returning a list of controls. Include a test function that prints the controls for layers 1–7.
- Deliverable: A Python file osi_controls.py with a main() that prints layers and their controls.

Part B — Port scanning utility
- Task: Extend or reuse the Python port_scanner from Section 2 to accept a hostname and a list of ports via command-line args, then print a summary table of open/closed ports.
- Deliverable: A runnable script port_scanner_cli.py with argparse support. Example: python port_scanner_cli.py -H example.com -p 22 80 443

Part C — Lightweight firewall rule generator
- Task: Write a small Bash script firewall_generate.sh that takes a list of allowed ports and prints a ready-to-run iptables script that implements a default-deny posture with those ports open.
- Deliverable: The script prints to stdout or writes to a file firewalls.sh. Include instructions to run with root privileges.

Part D — Quick integration test (optional)
- Task: Create a tiny CI-friendly script test_integration.sh that:
  - Runs the port scanner against localhost ports 80, 443, 22 and checks for expected OPEN/CLOSED statuses (you can mock by starting a tiny HTTP server on port 8080 for demonstration).
- Deliverable: test_integration.sh with clear expectations and exit codes.

Notes for execution:
- Run local tests in a sandbox or development environment. Do not scan external hosts without explicit authorization.
- The Port Scanner code uses network I/O; ensure firewall rules allow the test environment to avoid false negatives.
- For the firewall script, run with root privileges and adjust IP ranges to your environment.

This complete lesson equips you to reason about security boundaries, test exposure surfaces, and implement practical controls aligned with real-world systems.