# Track: Cyber Security — Module Phase 1 — Security Basics — Topic: Networking for Security (OSI, Ports) — Language/Stack: Red Teaming

Compelling introductory paragraph:
Networking is the backbone of modern security. In red teaming, you’ll simulate how an attacker discovers, enumerates, and moves through a target by understanding how layers in the OSI model interact with real network services and ports. Mastery of OSI concepts, port usage, and safe enumeration enables you to design better detections, identify misconfigurations, and exercise containment strategies in a controlled, authorized environment.

## 1. OSI Model and Security Basics

In this section, you’ll connect the abstract seven-layer OSI model to practical security tasks. Understanding how data moves from the physical medium up to applications helps you reason about where to monitor, what to test, and how to interpret artifacts left by a potential attacker.

Code: OSI layer mapping and a tiny protocol-to-layer mapper (educational scaffold)

```
# OSI layer mapping example (educational)
OSI_LAYERS = [
    (7, "Application"),
    (6, "Presentation"),
    (5, "Session"),
    (4, "Transport"),
    (3, "Network"),
    (2, "Data Link"),
    (1, "Physical"),
]

def layer_from_protocol(protocol):
    protocol = protocol.upper().strip()
    protocol_to_layer = {
        "HTTP": 7, "HTTPS": 7, "SSH": 7, "DNS": 7, "SMTP": 7,
        "TCP": 4, "UDP": 4,  # common transport
        "IP": 3, "ARP": 2, "ETHERNET": 2
    }
    return protocol_to_layer.get(protocol, 4)

# Simple demonstration
for proto in ["HTTP", "TCP", "IP", "Ethernet", "Unknown"]:
    print(f"Protocol {proto} maps to OSI Layer {layer_from_protocol(proto)}")
```

### Line-by-line explanation
- Line 1-3: Define a structured list of OSI layers with their numbers and names (top-down). This creates a reference you’ll reuse for mapping examples.
- Line 5: Define a function layer_from_protocol that accepts a protocol name (string).
- Line 6: Normalize the input protocol to upper case and trim whitespace for robust matching.
- Line 7-12: Create a dictionary mapping common protocols to their OSI layer numbers. This is a simplified educational mapping for demonstrations.
- Line 13: Return the layer number if the protocol exists in the mapping; default to 4 (Transport) if unknown.
- Line 16-20: Iterate over a small set of protocol examples and print the OSI layer it maps to using the function above. This illustrates how different protocol types relate to layers in practice.

Notes for real-world use:
- This is a simplified educational mapper. Real OSI-to-protocol mappings can be nuanced (e.g., some protocols span multiple layers via encapsulation).
- In blue/red team exercises, you’ll often annotate data flows to identify where to place sensors (IDS/IPS, firewalls) and how to interpret logs from different layers.

## 2. Ports, Protocols, and Basic Port Scanning

Ports are the doors to services on a host. TCP provides reliable, connection-oriented communication; UDP is connectionless and can be faster but less reliable. Understanding well-known ports, ephemeral ports, and how to test reachability helps you assess an environment safely and ethically.

Code: Simple port tester and a basic port scanner (sequential)

```
import socket

def is_port_open(host, port, timeout=0.5):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        s.close()
        return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def scan_ports(host, ports, timeout=0.5):
    results = {}
    for p in ports:
        results[p] = is_port_open(host, int(p), timeout)
    return results

host = "127.0.0.1"
ports_to_check = [22, 80, 443, 3389, 8080]
print(scan_ports(host, ports_to_check, timeout=0.5))
```

### Line-by-line explanation
- Line 1: Import the standard socket module to perform basic TCP connections.
- Line 3-10: Define is_port_open(host, port, timeout) which creates a TCP socket, applies a timeout, attempts to connect to the target, then closes and returns True if successful or False if an exception occurs (timeout, refused, or other OS errors).
- Line 12-17: Define scan_ports(host, ports, timeout) to loop over a list of ports, call is_port_open for each, and accumulate results in a dictionary keyed by port numbers with boolean values indicating open (True) or closed (False).
- Line 19-21: Set a target host (localhost) and a small set of ports commonly observed in environments.
- Line 22: Run the scan and print the results. This provides a quick snapshot of which ports respond to a TCP connection attempt.

Code: Lightweight multi-threaded port scanning (optional enhancement)

```
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed

def check_port(host, port, timeout=0.5):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        try:
            s.connect((host, port))
            return port, True
        except:
            return port, False

def scan_host(host, ports, max_workers=50):
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(check_port, host, p): p for p in ports}
        for fut in as_completed(futures):
            port, is_open = fut.result()
            results.append((port, is_open))
    return sorted(results)

host = "127.0.0.1"
ports = list(range(75, 85))  # small range for demonstration
print(scan_host(host, ports, max_workers=10))
```

### Line-by-line explanation
- Line 1: Import socket for network operations and ThreadPoolExecutor for concurrency.
- Line 3-11: check_port creates a temporary socket, attempts to connect to a single port, and returns a tuple (port, True/False) indicating open status.
- Line 13-20: scan_host sets up a thread pool with a configurable number of workers, submits a check_port task for each port, collects futures, and aggregates results. It then sorts the results by port for readability.
- Line 22-24: Define a small port range to test and call scan_host to print a concurrent scan result map.
- Line 25: The output shows which ports responded (OPEN) versus those that did not (CLOSED).

Notes for safe practice:
- Run scans only on systems you own or have explicit authorization to test.
- Keep scans limited in scope and duration to avoid impacting production traffic.
- Consider adding rate limiting and polite scanning intervals (sleep between requests) in real tests.

## 3. Service Discovery and Banner Grabbing in a Lab

Banner grabbing is a basic technique used to identify services on open ports by reading the initial data that a service sends when connected. In a lab environment with permission, you can practice these techniques to understand what your detection systems should log and alert on. Some services do not disclose banners or may require specific handshake messages.

Code: Simple banner grabbing attempt on a set of ports

```
import socket

def read_banner(host, port, timeout=0.5):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        try:
            s.connect((host, port))
            # Many services send an initial greeting or banner; try to read
            s.settimeout(timeout)
            try:
                data = s.recv(1024)
            except socket.timeout:
                data = b""
            return data.decode('latin-1', errors='replace')
        except Exception as e:
            return f"Error: {e}"

host = "127.0.0.1"
ports = [22, 80, 443, 21, 25]

for p in ports:
    print(f"Port {p} banner: {read_banner(host, p)[:200]!r}")
```

### Line-by-line explanation
- Line 1: Import socket for network operations.
- Line 3-14: Define read_banner that creates a TCP socket, connects to host:port, attempts to read up to 1024 bytes, decodes the bytes with a permissive encoding, and returns the resulting string. If a banner is not sent or timed out, it returns an empty string or an error message.
- Line 16-18: Set the target host (localhost) and a list of ports to probe for banners.
- Line 20-21: Iterate through the ports and print the banner content (or the error) truncated to 200 characters for readability.
- Important note: Banner grabbing can reveal sensitive service strings but should be performed only in authorized environments. Some services do not advertise banners, may require TLS, or may actively block such probes.

Line-by-line explanation for the banner code highlights:
- The use of a short timeout minimizes wait time in a lab but may miss slower banner responses.
- We handle exceptions gracefully to avoid crashing the script if a port is closed or filtered.
- We decode with latin-1 and replace errors to ensure we always have readable output even if non-text data is received.

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: No timeouts on sockets
  - Bad:
    ```
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("127.0.0.1", 80))
    ```
  - Good:
    ```
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect(("127.0.0.1", 80))
    except socket.timeout:
        print("Connection attempt timed out")
    finally:
        s.close()
    ```
  Rationale: Without a timeout, a scan can hang indefinitely and waste time or trigger IDS alarms.

- Pitfall 2: Not closing sockets (resource leaks)
  - Bad:
    ```
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("127.0.0.1", 80))
    # forgot to close
    ```
  - Good:
    ```
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        s.connect(("127.0.0.1", 80))
    # socket automatically closed by context manager
    ```
  Rationale: Not closing sockets can exhaust file descriptors and skew results.

- Pitfall 3: Assuming all banners indicate the real service
  - Bad:
    ```
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("127.0.0.1", 80))
    data = s.recv(1024)
    print(data)
    ```
  - Good:
    ```
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect(("127.0.0.1", 80))
        s.sendall(b"HEAD / HTTP/1.0\r\n\r\n")
        data = s.recv(1024)
        banner = data.decode(errors="replace")
        print(banner)
    ```
  Rationale: Some banners are generic or absent; inference should be validated against service fingerprints and official documentation.

- Pitfall 4: Scanning without permission or rate limiting
  - Bad:
    ```
    import socket
    for port in range(1, 1024):
        socket.socket().connect(("target.local", port))
    ```
  - Good:
    ```
    import socket, time
    def polite_scan(target, ports, delay=0.05):
        for p in ports:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(0.5)
                    s.connect((target, p))
                    print(p, "OPEN")
            except Exception:
                pass
            time.sleep(delay)
    polite_scan("127.0.0.1", range(1, 1024))
    ```
  Rationale: Ethical scanning requires authorization, rate control, and logging.

- Pitfall 5: Not handling errors gracefully
  - Bad:
    ```
    port = 80
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("host", port))
    ```
  - Good:
    ```
    port = 80
    try:
        with socket.create_connection(("host", port), timeout=0.5) as s:
            pass
    except Exception as e:
        print("Connection issue:", e)
    ```
  Rationale: Network environments are noisy; robust error handling and timeouts prevent crashes and misinterpretation.

Y. Why This Matters In Real Systems — production context and real usage

- OSI awareness helps you reason about detection opportunities: where to place sensors (e.g., at network, transport, and application boundaries), what logs to correlate (firewall logs, IDS/IPS outputs, TCP handshake patterns, banner strings), and how to interpret anomalies during reconnaissance.
- Port and protocol knowledge informs risk assessments: ports exposed to the internet increase attack surface (SSH on 22, RDP on 3389, database ports like 3306). In a real system, you’d expect a well-hardened environment to enforce:
  - Least privilege on exposed ports
  - Strong authentication and encryption (TLS, SSH keys)
  - Network segmentation and firewall rules to restrict access
- Red team practice with safe, authorized tools teaches you how attackers enumerate, verify, and pivot. It also reveals how detections can be triggered by port scans, banner grabs, and unusual handshake patterns. The goal is to build defenses and improve incident response, not to cause disruption.
- Practical takeaways:
  - Always operate in a controlled lab or with explicit authorization.
  - Document findings with scope, timing, and observed service behavior.
  - Use this knowledge to design detections, harden configurations, and verify remediation via repeatable tests.

Z. Study Questions — 5 recall questions

1. What is the purpose of the OSI model, and which layer is most associated with end-user applications?
2. Differentiate TCP and UDP in terms of reliability and connection orientation.
3. What is a “well-known port,” and give three examples commonly seen in networks.
4. Why should port scanning be performed with permission and rate limiting in real environments?
5. What is banner grabbing, and why might it fail to reveal a service’s identity in some cases?

Exercise — a practical multi-part coding challenge

Part A: Build a simple, safe port tester
- Task: Implement a function that tests a given host and a list of ports for openness using TCP connect with a timeout. Return a dict of port -> True/False.
- Deliverables:
  - A function is_port_open(host, port, timeout) and a function scan_ports(host, ports, timeout).
  - A small main block that tests localhost on a curated port list and prints a readable summary.

Part B: Extend to a small concurrent port scanner
- Task: Replace the sequential approach with a ThreadPoolExecutor-based scanner to improve speed on larger port ranges. Ensure sockets are properly closed using a context manager.
- Deliverables:
  - A function scan_host_concurrent(host, ports, max_workers).
  - A sample run that prints a sorted list of open ports.

Part C: Lightweight banner grab (lab-safe)
- Task: Implement a function that connects to a port and attempts to read the initial banner data, without causing blocking behavior if the service doesn’t respond.
- Deliverables:
  - A function read_banner(host, port, timeout) and a small demonstration loop over a safe set of ports.
  - Note in code comments: run only in authorized lab environments; some services won’t reveal banners.

Part D: Documentation and defense framing
- Task: For each open port discovered in your lab run, map the port to its typical service name (where known) and craft a short entry noting potential security considerations (e.g., “SSH exposed; ensure strong keys; rotate credentials; enable MFA”).
- Deliverables:
  - A simple report generator function that prints “Port X: Service Y — Security notes.”

Tips for success
- Use a controlled lab host (your own VM or a purpose-built lab image) and obtain explicit permission to test.
- Keep runs small, deterministic, and well-documented to support blue-team improvements.
- Focus on safe, observable outcomes: open vs closed, banner strings when present, and corresponding security implications rather than attempting aggressive exploitation.

If you’d like, I can tailor the exercises to a specific lab setup (e.g., a Docker-based lab with a few intentionally exposed services) and provide a ready-to-run script bundle.