# Digital Forensics Fundamentals — Phase 4: Defense & Forensics (Network Security)

Compelling intro paragraph:
In modern cyber defense, digital forensics is the backbone of incident response, post-attack analysis, and proactive threat hunting. This lesson covers fundamentals for collecting, preserving, analyzing, and reporting network-related evidence in a defensible, auditable manner. You’ll learn how to handle PCAPs, logs, and artifacts with reproducible processes, ensuring chain-of-custody and actionable insights in real systems.

## 1. Evidence Lifecycle and Forensics Principles

Digital forensics focuses on the lifecycle of evidence: identification, collection, preservation, analysis, and presentation. Proper handling ensures integrity, reproducibility, and legal defensibility in investigations. In network security, this means treating PCAPs, log files, and disk artifacts as evidence, applying hash verification, time synchronization, and documented methodologies.

```python
# collect_evidence.py
import hashlib, json, datetime, os, uuid, sys

def sha256_of_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def collect_evidence(file_path: str, metadata=None, dest_dir=None):
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Evidence file not found: {file_path}")
    evidence = {
        'id': str(uuid.uuid4()),
        'original_path': os.path.abspath(file_path),
        'sha256': sha256_of_file(file_path),
        'timestamp_utc': datetime.datetime.utcnow().isoformat() + 'Z',
        'metadata': metadata or {}
    }
    dest = dest_dir or os.path.dirname(file_path)
    json_path = os.path.join(dest, os.path.basename(file_path) + '.evidence.json')
    with open(json_path, 'w') as jf:
        json.dump(evidence, jf, indent=2, sort_keys=True)
    return evidence

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python collect_evidence.py <path_to_file> [metadata_json]")
        sys.exit(1)
    path = sys.argv[1]
    meta = None
    if len(sys.argv) > 2:
        try:
            import json as _json
            meta = _json.loads(sys.argv[2])
        except Exception:
            meta = {}
    ev = collect_evidence(path, meta)
    print(json.dumps(ev, indent=2))
```

### Line-by-line explanation
- import hashlib, json, datetime, os, uuid, sys: Bring in standard libraries for hashing, JSON, timestamps, path handling, unique IDs, and command-line args.
- def sha256_of_file(path): ...: Compute a secure SHA-256 hash by streaming the file in chunks.
- def collect_evidence(...): Build a structured evidence object including a unique ID, original path, hash, UTC timestamp, and optional metadata.
- if not os.path.isfile(file_path): raise FileNotFoundError(...): Guard against missing evidence input.
- evidence = { ... }: Assemble the evidence descriptor with essential fields.
- dest = dest_dir or os.path.dirname(file_path): Decide where to write the evidence manifest.
- json_path = os.path.join(dest, os.path.basename(file_path) + '.evidence.json'): Choose a deterministic JSON filename tied to the evidence file.
- with open(json_path, 'w') as jf: json.dump(...): Persist the evidence manifest in a readable, auditable format.
- if __name__ == '__main__': ...: Simple CLI to run the collector with optional metadata JSON.
- ev = collect_evidence(...); print(...): Execute and output the generated manifest.

## 2. Collecting and Analyzing Network Evidence

This section demonstrates practical techniques to collect and analyze network-related evidence, focusing on PCAP data and network-visible artifacts. You’ll see:
- A CLI-based extraction of network activity from a PCAP using Tshark.
- A Python-based approach using PyShark to parse HTTP requests for deeper inspection.

Bash + Tshark: quick extraction of HTTP requests from a PCAP
```bash
# Extract HTTP requests from incident.pcap with key fields
tshark -r incident.pcap -Y 'http.request' \
  -T fields -e frame.time -e ip.src -e ip.dst \
  -e http.request.method -e http.host -e http.request.uri \
  -E separator=, -E quote=d -E header=y > http_requests.csv
```

Python (PyShark) for iterating HTTP requests in a PCAP
```python
# analyze_pcap_http.py
import sys
try:
    import pyshark
except ImportError:
    print("Please install pyshark: pip install pyshark")
    sys.exit(1)

def main(pcap_path: str):
    cap = pyshark.FileCapture(pcap_path, display_filter='http.request',
                              only_summaries=False)
    for pkt in cap:
        try:
            ts = pkt.sniff_timestamp
            src = pkt.ip.src
            dst = pkt.ip.dst
            host = getattr(pkt.http, 'host', '')
            uri = getattr(pkt.http, 'request_uri', '')
            method = getattr(pkt.http, 'request_method', '')
            detail = f"{src} -> {dst} {method} {host}{uri}"
            print(f"[{ts}] {detail}")
        except AttributeError:
            # non-HTTP packet
            continue

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python analyze_pcap_http.py <pcap_path>")
        sys.exit(1)
    main(sys.argv[1])
```

### Line-by-line explanation
- # Extract HTTP requests from incident.pcap ...: Tshark command to parse a PCAP and output a CSV of HTTP request fields.
- -Y 'http.request': Apply a display filter to include only HTTP requests.
- -T fields -e ...: Select specific fields to extract.
- -E separator=, -E quote=d -E header=y: Format output as CSV with headers and proper quoting.
- > http_requests.csv: Write results to a file for downstream processing.
- import pyshark: Import the PyShark library for programmatic PCAP parsing.
- if __name__ == '__main__': ...: Basic CLI entry point.
- cap = pyshark.FileCapture(..., display_filter='http.request'): Create a capture object focusing on HTTP requests.
- for pkt in cap: Iterate packets; extract timestamps, IPs, and HTTP fields.
- ts = pkt.sniff_timestamp, src = pkt.ip.src, dst = pkt.ip.dst: Pull packet-level metadata.
- host = getattr(pkt.http, 'host', ''), uri = getattr(pkt.http, 'request_uri', ''), method = getattr(pkt.http, 'request_method', ''): Safely access HTTP fields.
- detail = f"...": Build a human-readable summary line.
- print(f"[{ts}] {detail}"): Emit a line suitable for a timeline or log file.

### Line-by-line explanation (continued)
- The code gracefully handles non-HTTP packets via try/except AttributeError, ensuring robustness when the PCAP contains mixed traffic.

## 3. Timeline and Event Correlation

Timeline creation and correlation help investigators correlate network activity with logs, alerts, and user actions. This example shows how to merge a PCAP-derived event list with system/application logs into a single time-ordered timeline for fast investigative synthesis.

```python
# timeline_merge.py
import csv, json
from datetime import datetime
import sys

def read_pcap_csv(csv_path):
    events = []
    with open(csv_path, newline='') as f:
        r = csv.DictReader(f)
        for row in r:
            t = row.get('frame.time')
            src = row.get('ip.src', '')
            dst = row.get('ip.dst', '')
            proto = row.get('_ws.col.Protocol', row.get('Protocol', ''))
            uri = row.get('http.request.uri', '')
            detail = f"{src} -> {dst} {proto} {uri}".strip()
            if t:
                events.append({'ts': t, 'event': detail or 'pcap_event'})
    return events

def read_logs(log_path):
    events = []
    with open(log_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line[0] == '[':
                end = line.find(']')
                ts = line[1:end]
                rest = line[end+2:] if end != -1 else line
                events.append({'ts': ts, 'event': rest})
    return events

def to_datetime(ts: str) -> datetime:
    # Attempt ISO-like parsing; adjust to your environment's formats
    try:
        return datetime.fromisoformat(ts)
    except ValueError:
        # If ts is not ISO, try common formats
        for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
            try:
                return datetime.strptime(ts, fmt)
            except ValueError:
                continue
        # Fallback to epoch for unknown formats
        return datetime.fromtimestamp(0)

def merge_events(pcap_events, log_events):
    all_events = pcap_events + log_events
    all_events.sort(key=lambda e: to_datetime(e['ts']))
    return all_events

if __name__ == '__main__':
    pcap_csv = 'http_requests.csv'  # produced by Tshark in section 2
    logs_path = 'system_logs.txt'   # generic log file with timestamped entries

    pcap_events = read_pcap_csv(pcap_csv)
    log_events = read_logs(logs_path)

    timeline = merge_events(pcap_events, log_events)

    with open('timeline.json', 'w') as jf:
        json.dump(timeline, jf, indent=2, default=str)

    print(f"Wrote timeline with {len(timeline)} events to timeline.json")
```

### Line-by-line explanation
- import csv, json, from datetime import datetime, import sys: Prepare for CSV parsing, JSON output, timestamp handling, and CLI args.
- def read_pcap_csv(csv_path): …: Parse PCAP-derived CSV into a list of events with timestamp and a detail string.
- def read_logs(log_path): …: Parse plain logs into events with timestamp and message.
- def to_datetime(ts: str) -> datetime: Normalize various timestamp formats to a consistent Python datetime for comparison.
- def merge_events(...): Concatenate and sort all events by timestamp so the timeline is strictly time-ordered.
- if __name__ == '__main__': …: CLI bootstrap to generate timeline.json.
- Writing and printing: Persist the timeline and provide a summary count.

## 4. Artifact Discovery and Data Carving Basics

Beyond live network traces, forensic work often involves discovering usable artifacts and carving files within disk images or volatile data. This section covers two practical approaches:
- File-type identification and selective carving with a tooling approach.
- Simple programmatic artifact discovery based on common file signatures.

```bash
# Example: identify potential images and documents in a data carve using binwalk
binwalk -e -M disk_image.dd
```

Python (basic file signature detection for carving)
```python
# carve_by_signature.py
import os, binascii

# Very small demo: signatures for JPEG and PDF
SIGNATURES = {
    b'\xff\xd8\xff': ('jpg', 0),
    b'%PDF-': ('pdf', 0)
}

def carve_by_signatures(root_dir, output_dir):
    for root, _, files in os.walk(root_dir):
        for f in files:
            path = os.path.join(root, f)
            try:
                with open(path, 'rb') as fh:
                    data = fh.read(1024)  # examine first KB
                    for sig, (ext, offset) in SIGNATURES.items():
                        if sig in data:
                            out_path = os.path.join(output_dir, f"{f}.{ext}")
                            with open(out_path, 'wb') as out_f:
                                out_f.write(data)  # simplified carve preview
                            break
            except OSError:
                continue

if __name__ == '__main__':
    carve_by_signatures('/path/to/case/disk_image', '/path/to/output/artifacts')
```

### Line-by-line explanation
- binwalk -e -M disk_image.dd: Binwalk recursively scans and extracts embedded files and data from a disk image, enabling automated carving of artifacts (images, documents, etc.).
- SIGNATURES dict: Define a tiny set of magic-number signatures to detect common file types (JPEG, PDF) for quick carving decisions.
- carve_by_signatures(root_dir, output_dir): Walks the directory structure, reads a portion of each file, and checks for signature matches to infer potential file types.
- If a signature matches, writes a small carved output to the artifacts folder; this is a simplified demonstration and should be expanded in real workflows.

## 5. Reproducibility, Reporting, and Chain of Custody

Producing defensible reports requires reproducible steps, stable environments, and documented provenance. This section shows how to aggregate evidence manifests and produce a compact incident report that can be archived, shared with teams, or handed to legal.

```python
# generate_report.py
import json, datetime, os

def generate_report(evidence_dir: str, output_path: str):
    items = []
    for fname in os.listdir(evidence_dir):
        if not fname.endswith('.evidence.json'):
            continue
        with open(os.path.join(evidence_dir, fname)) as jf:
            items.append(json.load(jf))
    report = {
        'report_generated_at': datetime.datetime.utcnow().isoformat() + 'Z',
        'evidence_count': len(items),
        'evidences': items
    }
    with open(output_path, 'w') as jf:
        json.dump(report, jf, indent=2, sort_keys=True)
    return report

if __name__ == '__main__':
    report = generate_report('evidence_collection', 'incident_report.json')
    print(json.dumps(report, indent=2))
```

### Line-by-line explanation
- import json, datetime, os: Import core utilities for JSON handling, timestamps, and filesystem operations.
- def generate_report(evidence_dir: str, output_path: str): Build an aggregated incident report by reading all .evidence.json manifests in a directory.
- items = [] and for fname in os.listdir(...): Collect all manifests into a list.
- with open(...) as jf: Load each manifest into a Python dictionary.
- report = { ... }: Create a structured incident report containing a timestamp, count, and all evidence entries.
- with open(output_path, 'w') as jf: Persist the final report in JSON for reproducibility and auditing.
- if __name__ == '__main__': ...: CLI wrapper to produce the report from a predefined directory.

## X. Common Beginner Mistakes

- Pitfall 1 — Bad: Incomplete or missing hashes; Good: include hashes and metadata
Bad:
```python
# Bad
evidence = {'id': 'e1', 'path': '/tmp/evidence.bin'}
```
Good:
```python
# Good
evidence = {
  'id': 'e1',
  'path': '/tmp/evidence.bin',
  'sha256': sha256_of_file('/tmp/evidence.bin'),
  'timestamp_utc': datetime.datetime.utcnow().isoformat() + 'Z',
  'metadata': {'source': 'server1', 'case_id': 'IR-2026-04'}
}
```

- Pitfall 2 — Bad: Naive timestamps without timezone awareness
Bad:
```python
# Bad
timestamp = datetime.datetime.now()
```
Good:
```python
# Good
timestamp = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)
```

- Pitfall 3 — Bad: Overwriting evidence without a controlled path
Bad:
```bash
# Bad
cp /tmp/evidence.bin /evidence.bin
```
Good:
```bash
# Good
cp /tmp/evidence.bin /case/evidence/2026-04-01/evidence.bin
# Also, store a manifest alongside it:
cp /tmp/evidence.bin /case/evidence/2026-04-01/evidence.bin.evidence.json
```

- Pitfall 4 — Bad: Ignoring validation and error handling in analysis scripts
Bad:
```python
# Bad
capture = pyshark.FileCapture('unknown.pcap')
print(next(capture))
```
Good:
```python
# Good
try:
    capture = pyshark.FileCapture('unknown.pcap')
    first = next(iter(capture), None)
    if first is None:
        raise ValueError("PCAP is empty or unreadable")
except Exception as err:
    print(f"Error loading PCAP: {err}")
```

## Y. Why This Matters In Real Systems

- Chain of custody and legal defensibility: Evidence must be collected in a reproducible way, with immutable timestamps and tamper-evident logging. Hash verification helps prove integrity.
- Time synchronization: NTP and consistent time references across hosts and devices ensure that events align correctly across PCAPs, logs, and artifacts.
- Reproducibility and automation: Scripted collection, hashing, and reporting enable SOCs and IR teams to reproduce investigations, share artifacts, and perform audits without ad-hoc manual steps.
- Integration with security tooling: Forensics outputs feed into SIEMs, incident response playbooks, and blue-team exercises. Structured JSON and standardized metadata improve automation and triage.
- Data preservation and privacy: Collect only what’s necessary, secure sensitive artifacts, and ensure retention policies comply with legal and organizational requirements.

## Z. Study Questions

1. What is the purpose of computing and recording a SHA-256 hash for each piece of evidence?
2. How can Tshark be used to quickly extract network-visible evidence from a PCAP?
3. Why is timestamp normalization important when building a cross-source timeline?
4. What are the benefits of combining PCAP-derived events with system logs into a single timeline?
5. What are two key practices to maintain chain-of-custody in a digital forensic investigation?

## Exercise

Multi-part practical challenge to apply digital forensics fundamentals in a network security context.

Part A — Evidence collection and hashing
- Create a Python script (reuse collect_evidence.py from Section 1) that:
  - Accepts a file path to evidence and an optional JSON metadata object.
  - Calculates SHA-256, assigns a unique ID, captures UTC timestamp, and writes a .evidence.json manifest next to the file.
  - Saves the manifest in a controlled directory named evidence_collection, preserving an immutable path structure.

Part B — PCAP analysis and artifact extraction
- Given a sample PCAP (sample_incident.pcap):
  - Use Tshark to extract HTTP requests into a CSV (as in Section 2).
  - Use the PyShark-based analyzer to print a compact list of HTTP requests with timestamps.
  - Save the output to http_requests.log.

Part C — Timeline assembly
- Use the timeline_merge.py script from Section 3 to merge:
  - The http_requests.csv derived from Part B (convert to a valid CSV with headers expected by read_pcap_csv).
  - A sample system log file (system_logs.txt) with timestamped entries.
  - Produce timeline.json and verify it is sorted by timestamp.

Part D — Report generation and review
- Run generate_report.py (Section 5) on the evidence_collection directory to produce incident_report.json.
- Validate that each evidence entry in the report contains: id, path, sha256, timestamp_utc, and metadata.
- Prepare a short 1-page write-up (markdown or text) summarizing:
  - The timeline of events observed in the PCAP and logs.
  - Any notable communication patterns (e.g., repeated external destinations, unusual hosts).
  - Recommended containment and remediation actions based on the findings.

Deliverables
- evidence_collection/ directory with at least one .bin file and its .evidence.json manifest.
- http_requests.csv and http_requests.log derived from Part B.
- timeline.json showing merged events in chronological order.
- incident_report.json summarizing the investigation artifacts.

Notes
- You can substitute sample data where required, but ensure the code paths and filenames you use are consistent across all parts.
- Ensure Python environments have dependencies installed: pip install pyshark (and tshark system package as needed).
- For real-world scenarios, expand the carving and artifact discovery to support broader file types and more robust error handling.