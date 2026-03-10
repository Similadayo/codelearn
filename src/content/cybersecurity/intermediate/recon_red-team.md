# Reconnaissance and Enumeration in Red Teaming

Reconnaissance and enumeration are the foundational stages of a red-team engagement. Reconnaissance is the disciplined gathering of information about the target environment from public and private sources, while enumeration actively identifies assets, services, and configurations within a controlled scope. Mastery of these phases enables you to build an accurate attack surface model, prioritize targets, and plan realistic, risk-conscious simulations. In professional practice, this means working within an authorized scope, documenting assumptions, and producing actionable intel for defenders to fix.

## 1. Reconnaissance Fundamentals (Passive vs Active)

This section introduces core concepts, data models, and a safe, lab-based Python example that demonstrates how to collect and normalize asset information from a small, mocked inventory. It emphasizes the distinction between passive collection (observing without directly interacting with the target) and active collection (direct interaction within a controlled scope).

```python
from dataclasses import dataclass
from typing import List, Dict, Optional

@dataclass
class Asset:
    hostname: str
    ip: str
    type: str  # domain|host|ip
    services: List[str]
    notes: Optional[str] = None

def mock_dns_lookup(hostname: str) -> List[str]:
    """
    Mock DNS resolution for a lab environment.
    In real use, this would call a resolver (e.g., dnspython) in a controlled setting.
    """
    dns_map = {
        "web.example.local": ["10.0.2.15"],
        "api.example.local": ["10.0.2.20"],
        "auth.example.local": ["203.0.113.5"],
    }
    return dns_map.get(hostname, [])

def assemble_inventory() -> List[Asset]:
    """
    Builds a small, self-contained inventory for a lab.
    In a real scenario, you would fetch this from a CMDB, asset repository, or a prior engagement report.
    """
    items = [
        Asset(hostname="web.example.local", ip="10.0.2.15", type="host", services=["http", "https"], notes="Public-facing web app"),
        Asset(hostname="api.example.local", ip="10.0.2.20", type="host", services=["http-api"], notes="Backend API"),
        Asset(hostname="auth.example.local", ip="203.0.113.5", type="host", services=["ldap", "smb"], notes="Directory services"),
    ]
    return items

def mock_port_profile(asset: Asset) -> Dict[int, List[str]]:
    """
    Simulated port profile for an asset in a lab environment.
    In real engagements, you would use nmap/masscan with consent.
    """
    profile = {
        "web.example.local": {80: ["http"], 443: ["https"], 22: ["ssh"]},
        "api.example.local": {8080: ["http-alt"], 8443: ["https"]},
        "auth.example.local": {389: ["ldap"], 445: ["smb"]},
    }
    return profile.get(asset.hostname, {})

def enumerate_assets() -> List[Asset]:
    """
    Orchestrates the lab-based enumeration: builds inventory, resolves domains, and augments with a mock port profile.
    """
    assets = assemble_inventory()
    for a in assets:
        # Passive-like enrichment: resolve any hostname-containing strings
        if a.hostname.endswith(".local"):
            a.ip = mock_dns_lookup(a.hostname)[0] if mock_dns_lookup(a.hostname) else a.ip
        # Attach a mock port profile summarizing services
        port_map = mock_port_profile(a)
        a.notes = f"Ports: {', '.join(str(p) for p in port_map)}" if port_map else a.notes
    return assets

def main():
    assets = enumerate_assets()
    for a in assets:
        print(f"Asset: {a.hostname} ({a.ip}) | Type: {a.type} | Services: {', '.join(a.services)} | Notes: {a.notes or 'none'}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Import statements: bring in dataclass for clean data modeling and typing hints for clarity.
- Asset dataclass: models a discovered asset with hostname, IP, type, services, and optional notes.
- mock_dns_lookup: simulates DNS resolution in a lab without network calls; returns a list of IPs for a hostname.
- assemble_inventory: builds a small, self-contained list of Asset objects representing the lab target set.
- mock_port_profile: returns a mapping of ports to services for a given asset, simulating an active fingerprint.
- enumerate_assets: core orchestration function that enriches each asset with DNS data where applicable and attaches a port profile summary.
- main: runs the enumeration and prints a readable summary of each asset.
- The code is designed for a safe, lab environment to illustrate data modeling and integration of reconnaissance data without performing real network scans.

## 2. Passive Recon Techniques (Public and Observable Data)

Passive recon relies on information openly available or indirectly observable, minimizing risk and avoiding direct interaction with the target. In this lab-focused example, we simulate gathering data from public-like sources and demonstrate how to normalize and deduplicate it for asset awareness.

```python
import json
from urllib.parse import urlparse

def extract_domain(url: str) -> str:
    parsed = urlparse(url)
    return parsed.hostname or ""

def parse_public_sources(sources: List[str]) -> Dict[str, List[str]]:
    """
    Simulate parsing of public sources (security.txt, well-known endpoints, leaked data dumps).
    Returns a mapping: domain -> observed artifacts (e.g., endpoints or service hints).
    """
    domain_map = {}
    for s in sources:
        domain = extract_domain(s)
        if not domain:
            continue
        artifacts = domain_map.get(domain, [])
        # Simulated artifact extraction
        if "security.txt" in s:
            artifacts.append("security contact: admin@" + domain)
        if "/well-known" in s:
            artifacts.append("well-known endpoint: /well-known/security")
        if "subdomain" in s:
            artifacts.append("observed subdomain: " + domain)
        domain_map[domain] = artifacts
    return domain_map

def simulate_passive_recon() -> Dict[str, List[str]]:
    sources = [
        "https://web.example.local/.well-known/security",
        "https://example.com/security.txt",
        "https://subdomain.example.local/",
    ]
    return parse_public_sources(sources)

def merge_with_inventory(public_map: Dict[str, List[str]], inventory: List[Asset]) -> None:
    for a in inventory:
        artifacts = public_map.get(a.hostname, [])
        if artifacts:
            a.notes = (a.notes + " | " if a.notes else "") + ", ".join(artifacts)

def main():
    # Lab-based inventory
    inventory = assemble_inventory()
    public_map = simulate_passive_recon()
    merge_with_inventory(public_map, inventory)
    for a in inventory:
        print(f"Passive Asset: {a.hostname} | Artifacts: {a.notes or 'none'}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Import statements: json for potential payloads, urlparse to safely extract domain.
- extract_domain: helper to extract hostname from a URL-like string.
- parse_public_sources: processes a list of public-like sources and creates a domain-to-artifacts map by simulating artifact extraction (security.txt, well-known endpoints, subdomain hints).
- simulate_passive_recon: builds a small set of public-like sources and returns their parsed artifacts.
- merge_with_inventory: augments each Asset in the inventory with any artifacts found in the public map.
- main: ties everything together by building an inventory, performing simulated passive recon, and printing results.

## 3. Active Recon Techniques (Safe Simulation within Scope)

Active recon typically involves direct interaction with the target to gather details (port state, service banners, etc.). In red-team practice, you must always operate under explicit authorization. This lab uses a safe, simulated “port state” dataset to illustrate how you would organize and interpret active findings without performing real scans.

```python
def simulate_active_scan(asset: Asset) -> Dict[str, str]:
    """
    Simulated active scan results for an asset.
    Returns a mapping: port -> banner/service fingerprint.
    """
    simulated_profiles = {
        "web.example.local": {80: "http/1.1", 443: "https/1.2", 22: "ssh-7.9"},
        "api.example.local": {8080: "http-api/v1", 8443: "https/1.1"},
        "auth.example.local": {389: "ldap/3.0", 445: "microsoft-ds/4.0"},
    }
    return {str(p): b for p, b in simulated_profiles.get(asset.hostname, {}).items()}

def enumerate_active(asset_list: List[Asset]) -> Dict[str, Dict[str, str]]:
    """
    Returns a per-asset port-banner map for the provided list.
    """
    results = {}
    for a in asset_list:
        results[a.hostname] = simulate_active_scan(a)
    return results

def main():
    assets = assemble_inventory()
    active = enumerate_active(assets)
    for hostname, ports in active.items():
        print(f"Active Recon for {hostname}:")
        for port, banner in ports.items():
            print(f"  Port {port}: {banner}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- simulate_active_scan: returns a dictionary mapping ports to fingerprint strings for a given asset, simulating banner/granular service details.
- enumerate_active: iterates assets and builds a per-asset dictionary of port -> banner data.
- main: loads the lab inventory, runs the simulated active scan, and prints structured results per asset.
- The approach demonstrates how you would organize and interpret active data, while remaining in a constrained, ethical lab setting.

## 4. Asset Mapping and Relationship Enrichment (Data Normalization)

Enumeration is not just listing assets; it’s about connecting data into a usable map for risk assessment and defense alignment. This section demonstrates a simple graph-like representation of assets and their discovered properties, using a lightweight in-memory structure.

```python
from collections import defaultdict

def build_asset_graph(assets: List[Asset]) -> Dict[str, Dict]:
    """
    Builds a simple graph-like representation:
    node: hostname
    edges: relationships inferred from same IP, common domain family, shared services
    """
    graph = defaultdict(lambda: {"hosts": set(), "services": set(), "ips": set()})
    # Index by IP for quick cross-linking
    ip_index = defaultdict(list)
    for a in assets:
        graph[a.hostname]["ips"].add(a.ip)
        graph[a.hostname]["services"].update(a.services)
        ip_index[a.ip].append(a.hostname)
    # Connect assets sharing IPs
    for ip, hosts in ip_index.items():
        hosts = list(hosts)
        for i in range(len(hosts)):
            for j in range(i + 1, len(hosts)):
                graph[hosts[i]]["hosts"].add(hosts[j])
                graph[hosts[j]]["hosts"].add(hosts[i])
    # Convert sets to sorted lists for readability
    for k in graph:
        graph[k]["hosts"] = sorted(list(graph[k]["hosts"]))
        graph[k]["services"] = sorted(list(graph[k]["services"]))
        graph[k]["ips"] = sorted(list(graph[k]["ips"]))
    return graph

def print_graph(graph: Dict[str, Dict]):
    for host, data in graph.items():
        print(f"Asset: {host}")
        print(f"  IPs: {', '.join(data['ips'])}")
        print(f"  Services: {', '.join(data['services'])}")
        if data['hosts']:
            print(f"  Related hosts: {', '.join(data['hosts'])}")
        print()

def main():
    assets = assemble_inventory()
    graph = build_asset_graph(assets)
    print_graph(graph)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- build_asset_graph: creates a simple in-memory graph where each node is an asset (hostname). Edges capture relationships such as shared IPs and co-located services.
- ip_index: helps quickly link assets that share the same IP.
- Loop through assets: populate ips and services, then connect assets that share IPs by adding mutual references in the hosts field.
- Graph normalization: convert sets to sorted lists for readability.
- print_graph: outputs a readable representation of the asset relationships.
- main: ties together asset assembly, graph construction, and display.

## X. Common Beginner Mistakes

- Pitfall 1: Running scans or collection without explicit scope or consent.
  Bad:
  ```python
  # BAD: Scanning a target without consent
  import requests
  def scan_target(target: str):
      resp = requests.get(f"http://{target}", timeout=5)
      return resp.status_code
  ```
  Good:
  ```python
  # GOOD: Enforce scope and consent
  def scan_target(target: str, in_scope: bool, consent: bool) -> int:
      if not in_scope or not consent:
          raise ValueError("Target not in scope or consent not provided")
      # In a safe lab, you would mock or simulate rather than hitting real endpoints
      return 200  # simulated OK
  ```

- Pitfall 2: Assuming a single data source is complete or trustworthy.
  Bad:
  ```python
  # BAD: Trusting a single source without validation
  inventory = fetch_inventory_from_api("https://internal-api.local/assets")
  for a in inventory:
      print(a["hostname"])
  ```
  Good:
  ```python
  # GOOD: Validate and normalize data from multiple sources
  def normalize_asset(raw: dict) -> Asset:
      hostname = raw.get("hostname", "").lower()
      ip = raw.get("ip", "")
      services = raw.get("services", [])
      if not hostname or not isinstance(services, list):
          raise ValueError("Invalid asset record")
      return Asset(hostname=hostname, ip=ip, type="host", services=services)

  sources = [fetch_inventory_from_api("https://internal-api.local/assets"), fetch_inventory_from_api("https://public-api.local/assets")]
  normalized = []
  for src in sources:
      for r in src:
          normalized.append(normalize_asset(r))
  ```

- Pitfall 3: Neglecting data hygiene and rate-limiting in real recon tasks.
  Bad:
  ```python
  # BAD: No rate limiting or retry policy
  def fetch(url):
      return requests.get(url).text
  ```
  Good:
  ```python
  # GOOD: Respect limits, implement retries and backoff
  import time
  import requests
  def fetch_with_backoff(url, retries=3, backoff=1.0):
      for i in range(retries):
          try:
              resp = requests.get(url, timeout=5)
              resp.raise_for_status()
              return resp.text
          except requests.RequestException:
              time.sleep(backoff * (2 ** i))
      raise RuntimeError("Max retries exceeded")
  ```

- Pitfall 4: Blindly correlating data without documenting provenance.
  Bad:
  ```python
  # BAD: No provenance or timestamp
  assets += [{"hostname": "new.example.local", "ip": "10.0.2.99"}]
  ```
  Good:
  ```python
  # GOOD: Attach provenance and timestamp
  from datetime import datetime
  assets.append({"hostname": "new.example.local", "ip": "10.0.2.99", "source": "public_sources", "ts": datetime.utcnow().isoformat()})
  ```

- Pitfall 5: Overlooking authorization, auditability, and governance artifacts.
  Bad:
  ```python
  # BAD: Logging disabled
  def log_event(event: str): pass
  ```
  Good:
  ```python
  # GOOD: Structured logging with audit trail
  import logging
  logging.basicConfig(level=logging.INFO, filename="recon_audit.log", encoding="utf-8")
  def log_event(event: str, metadata: dict):
      logging.info("RECON_EVENT: %s | META: %s", event, metadata)
  ```

## Y. Why This Matters In Real Systems

In production environments, reconnaissance and enumeration feed threat modeling, asset inventory, and defense prioritization. Real systems require:
- Clear scope, authorization, and a defensible audit trail for every data collection activity.
- Automated asset discovery integrated with CMDB/ITSM to maintain an up-to-date inventory.
- Safe, instrumented tooling with rate limits, logging, and robust error handling to avoid service disruption.
- Data normalization and deduplication to reduce noise and improve signal quality for defenders (e.g., SOC, threat intel teams).
- Collaboration with defenders to turn reconnaissance findings into concrete hardening actions (patching, firewall rules, IAM improvements, network segmentation).

In red-team engagements, reconnaissance enables realistic scenario planning—identifying critical assets (e.g., public-facing apps, directory services, internal databases), the services they expose, and how those surfaces might be attacked within policy. The end deliverable should be an asset map, risk scores for surface areas, and prioritized remediation recommendations, all produced with explicit permission and in a reproducible format (CSV, JSON, or a notebook).

## Z. Study Questions

1. What is the fundamental difference between reconnaissance and enumeration in the context of penetration testing?
2. Why is it critical to separate passive recon from active recon, and when should each be used?
3. How can you safely simulate reconnaissance in a lab without touching real targets? Give two design patterns.
4. What are common data hygiene practices you should apply when aggregating reconnaissance results?
5. How does asset correlation help in prioritizing defender actions after a red-team engagement?

## Exercise

Part A: Lab-safe asset discovery and normalization

- Objective: Build a small Python script that simulates asset discovery, DNS enrichment, and a port-profile augmentation, all in a safe lab dataset.
- Deliverables:
  - A single Python file recon_lab.py that:
    - Defines an Asset data model (hostname, ip, type, services, notes).
    - Builds a lab inventory with 3–4 assets.
    - Performs a mock DNS enrichment for assets ending with .local.
    - Attaches a mock port profile for each asset.
    - Outputs a human-readable summary of each asset including enriched data.
- Steps:
  1) Create recon_lab.py with the following structure:
     - Import statements
     - Asset dataclass
     - mock_dns_lookup(hostname) with a few lab mappings
     - mock_port_profile(asset) with a few port/service mappings
     - assemble_inventory() returns 3 assets
     - enumerate_assets() applies DNS enrichment and port profile
     - main() prints the final asset summaries
  2) Run the script in your local lab environment (or a sandbox) to verify the output matches the expected enriched inventory.
  3) Extend the script to read inventory from a JSON string or file and print a CSV summary as well.

Part B: Passive recon data fusion

- Objective: Implement a small module that fuses public-source-like hints with your inventory.
- Deliverables:
  - A Python function parse_public_sources(sources) that returns a mapping domain -> artifacts (as in section 2).
  - A function merge_with_inventory(public_map, inventory) that appends artifacts to each asset’s notes field.
- Steps:
  1) Build a 3-asset inventory (as in Part A).
  2) Provide a list of 3 public-like sources (strings).
  3) Run the fusion and print the final inventory with artifacts included.

Part C: Active recon (simulation)

- Objective: Demonstrate how you would structure the data from an active recon phase without performing real scans.
- Deliverables:
  - A Python function simulate_active_scan(asset) returning a port-to-banner map.
  - A function enumerate_active(asset_list) returning a per-asset map.
  - A small driver that prints each asset with its simulated active data.
- Steps:
  1) Add the simulate_active_scan function with a couple of example assets from your inventory.
  2) Run the active enumeration and verify the banner strings appear under each asset.

Important notes for all exercises:
- Do not perform any real network scans or access targets without explicit authorization within a clearly defined scope.
- Use mock data or a local lab environment to illustrate concepts.
- Document provenance for all data sources and maintain an auditable trail of activities and findings.

If you’d like, I can tailor the exercises to a particular language, lab setup (virtual machines, Docker, or a specific simulation framework), or extend the data model to include risk scoring and automation hooks for defenders.