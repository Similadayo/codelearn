# Digital Forensics Fundamentals

Digital forensics is the disciplined practice of identifying, preserving, collecting, analyzing, and presenting digital evidence in a manner suitable for legal and organizational decision-making. In defense and red-team contexts, it underpins incident response, threat hunting, and post-incident lessons learned. Mastery of fundamentals—artifact discovery, timeline construction, data integrity, and reproducible analysis—enables teams to detect adversary activity, understand attacker TTPs, and demonstrate evidence-driven outcomes in real systems.

---

## 1. Artifacts and The Forensics Lifecycle

A solid forensics practice starts with knowing common artifacts, the life cycle of an investigation, and how to instrument a system so evidence is usable later. This section introduces a practical tool to inventory artifacts in a directory, capturing file metadata and cryptographic hashes to support integrity checks and timeline construction.

```python
# artifact_inventory.py
import os
import json
import time
import hashlib
from datetime import datetime

def sha256_of_file(path, block_size=65536):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(block_size), b''):
            h.update(chunk)
    return h.hexdigest()

def inventory_directory(root_dir):
    artifacts = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for fname in filenames:
            full = os.path.join(dirpath, fname)
            try:
                stat = os.stat(full)
                mtime = stat.st_mtime
                size = stat.st_size
                sha256 = sha256_of_file(full)
                artifacts.append({
                    "path": os.path.relpath(full, root_dir),
                    "absolute_path": os.path.abspath(full),
                    "size": size,
                    "mtime": int(mtime),
                    "mtime_iso": datetime.utcfromtimestamp(mtime).strftime('%Y-%m-%dT%H:%M:%SZ'),
                    "sha256": sha256,
                    "extension": os.path.splitext(fname)[1].lower()
                })
            except (OSError, IOError) as e:
                # Skip unreadable files but log for auditability
                artifacts.append({
                    "path": os.path.relpath(full, root_dir),
                    "error": str(e)
                })
    return artifacts

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Artifact inventory for a directory (hash, metadata).")
    parser.add_argument("root", help="Root directory to inventory")
    parser.add_argument("--output", "-o", default=None, help="Output JSON path (default: inventory.json in root)")
    args = parser.parse_args()

    artifacts = inventory_directory(args.root)
    out_path = args.output or os.path.join(args.root, "inventory.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(artifacts, f, indent=2)
    print(f"Inventory written: {out_path}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Import modules for filesystem access, JSON, time, hashing, and date handling.
- Define sha256_of_file: creates a SHA-256 hash object, reads the file in chunks, and returns hex digest.
- Define inventory_directory: traverses root_dir recursively; for each file, collects metadata (relative path, absolute path, size, mtime), converts mtime to ISO UTC string, computes SHA-256, and records extension.
- Handle unreadable files by recording an error instead of crashing.
- Define main: parses CLI args for root directory and optional output. Calls inventory_directory and writes a JSON manifest to disk.
- Execute main if run as a script.

---

## 2. Network Forensics Basics: Analyzing PCAPs

Packet captures are central to understanding attacker behavior, lateral movement, and data exfiltration. This section provides a minimal Python tool to extract the top talking pairs from a PCAP using Scapy. It illustrates the core idea of summing communications between IPs to highlight suspicious hosts or communities.

```python
# top_talkers.py
import sys
from collections import Counter

try:
    from scapy.all import rdpcap
except Exception as e:
    print("Scapy is required for PCAP parsing. Install via 'pip install scapy'.")
    sys.exit(1)

def top_talkers(pcap_path, top_n=5):
    packets = rdpcap(pcap_path)
    pairs = []
    for pkt in packets:
        if 'IP' in pkt:
            ip_src = pkt['IP'].src
            ip_dst = pkt['IP'].dst
            pairs.append((ip_src, ip_dst))
    c = Counter(pairs)
    return c.most_common(top_n)

def main():
    if len(sys.argv) < 2:
        print("Usage: python top_talkers.py <pcap_path> [top_n]")
        sys.exit(1)
    pcap_path = sys.argv[1]
    top_n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    results = top_talkers(pcap_path, top_n)
    print("Top talkers (src -> dst) by packet count:")
    for (src, dst), count in results:
        print(f"{src} -> {dst}: {count} packets")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Import sys for CLI and Counter for tallies.
- Try to import rdpcap from Scapy; if unavailable, print a helpful error and exit.
- Define top_talkers: read the PCAP, iterate packets, filter to IP-level packets, extract source and destination IPs, collect pairs, and count occurrences.
- Create a Counter from the list of IP pairs to compute frequencies.
- In main: validate CLI usage, parse optional top_n parameter, call top_talkers, and print results with readable formatting.
- Guard to run main when executed as a script.

---

## 3. Memory Forensics Fundamentals: Strings Extraction

Memory forensics often starts with triage to surface indicators of compromise from a dump. A practical, dependency-light approach is to extract printable strings from a binary blob. This technique helps identify embedded URLs, paths, or commands that reveal attacker tools or artefacts.

```python
# extract_strings.py
import re
import sys

def extract_strings(memory_dump_path, min_len=4):
    with open(memory_dump_path, "rb") as f:
        data = f.read()
    pattern = rb"[ -~]{%d,}" % min_len  # printable ASCII
    strings = re.findall(pattern, data)
    # Decode safely; keep original bytes for authenticity
    return [s.decode("ascii", errors="ignore") for s in strings]

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_strings.py <memory_dump.bin> [min_len]")
        sys.exit(1)
    path = sys.argv[1]
    min_len = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    strs = extract_strings(path, min_len)
    for s in strs:
        print(s)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Import re for regex-based extraction and sys for CLI.
- Define extract_strings: open the memory dump in binary mode and read all bytes.
- Build a regex pattern that matches sequences of printable ASCII characters of at least min_len length.
- Use re.findall to locate all such sequences; decode each from bytes to string safely.
- Define main: validate CLI usage, parse an optional min_len, call extract_strings, and print results line-by-line.
- Run main when executed as a script.

---

## 4. Evidence Packaging and Chain of Custody

Proper packaging preserves integrity and makes artifacts shareable with auditors. This script creates a manifest with file-level hashes and then packages the artifacts into a tarball, including a signed-ish timestamp and metadata fields suitable for chain-of-custody records.

```python
# package_case.py
import os
import tarfile
import hashlib
import json
from datetime import datetime

def hash_file(path, block_size=65536):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(block_size), b''):
            h.update(chunk)
    return h.hexdigest()

def build_manifest(root_dir):
    manifest = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for fname in filenames:
            path = os.path.join(dirpath, fname)
            try:
                sha256 = hash_file(path)
                size = os.path.getsize(path)
                manifest.append({
                    "path": os.path.relpath(path, root_dir),
                    "absolute_path": os.path.abspath(path),
                    "size": size,
                    "sha256": sha256
                })
            except OSError as e:
                manifest.append({
                    "path": os.path.relpath(path, root_dir),
                    "error": str(e)
                })
    return manifest

def write_tarball(root_dir, tarball_path, manifest):
    with tarfile.open(tarball_path, "w:gz") as tar:
        # Add all files
        for dirpath, dirnames, filenames in os.walk(root_dir):
            for fname in filenames:
                full = os.path.join(dirpath, fname)
                arcname = os.path.relpath(full, root_dir)
                tar.add(full, arcname=arcname)
        # Add manifest as a separate file
        manifest_path = os.path.join(root_dir, "manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        tar.add(manifest_path, arcname="manifest.json")
        os.remove(manifest_path)  # cleanup manifest file outside tarball

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Package case directory with manifest and tarball.")
    parser.add_argument("root", help="Root directory containing artifacts")
    parser.add_argument("--output", "-o", default="case_package.tar.gz", help="Output tarball path")
    args = parser.parse_args()

    manifest = build_manifest(args.root)
    write_tarball(args.root, args.output, manifest)
    print(f"Packaged case into: {args.output}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Import modules for filesystem traversal, tar packaging, hashing, JSON, and timestamps.
- Define hash_file: read a file in chunks and update a SHA-256 hash object, returning the hex digest.
- Define build_manifest: walk the root_dir and for each file, compute its hash and size; record relative path, absolute path, size, and hash; capture errors if a file cannot be read.
- Define write_tarball: create a gzipped tarball; add all files from root_dir; generate and embed a manifest.json inside the tarball for auditability; clean up the temporary manifest file.
- Define main: parse CLI args for root and output, build the manifest, generate the tarball, and print success.
- Run main when executed as a script.

---

## X. Common Beginner Mistakes

- Bad vs Good: Handling user input paths without validation
  - Bad:
    - path = input("Enter folder: ")
    - for f in os.listdir(path): ...  # potential path traversal, invalid paths
  - Good:
    - path = os.path.abspath(input("Enter folder: "))
    - if not os.path.isdir(path): raise ValueError("Not a directory")
    - for f in os.listdir(path):
      - Use os.path.join and validate that f remains within path (or use a safer API).

- Bad vs Good: Ignoring encoding and binary data in logs and artifacts
  - Bad:
    - with open("events.log", "r") as f:
    - lines = f.readlines()
  - Good:
    - with open("events.log", "r", encoding="utf-8", errors="replace") as f:
    - lines = [line.rstrip("\n") for line in f]

- Bad vs Good: Skipping evidence integrity checks
  - Bad:
    - # Collect artifacts without hashing
  - Good:
    - Compute SHA-256 of each file before/after, verify against a baseline, and store in a manifest.

- Bad vs Good: Not preserving chain-of-custody metadata
  - Bad:
    - Tarball is created without metadata
  - Good:
    - Include a manifest.json with case_id, collector, timestamp, tool versions, and hash lineage; store and timestamp the packaging event.

- Bad vs Good: Overly aggressive logging of sensitive data
  - Bad:
    - Print or store actual credentials or private keys
  - Good:
    - Redact sensitive fields; store only necessary metadata; use placeholder values for sensitive content.

---

## Y. Why This Matters In Real Systems

- Incident Response: Forensic artifacts enable rapid containment, attribution, and remediation. A robust inventory, hash-based integrity, and PCAP analysis accelerate root-cause identification.
- Chain of Custody and Legal Readiness: Evidence packaging with a tamper-evident manifest and time-synchronized logs supports audits, legal proceedings, and internal governance.
- Reproducibility and Collaboration: Shared scripts and standard formats (JSON manifests, CSV timelines) allow teams to reproduce findings, validate results, and build playbooks.
- Real-World Constraints: Environments may be remote, high-volume, or cloud-based. Lightweight tools, streaming data handling, and safe defaults reduce risk and improve signal-to-noise in investigations.
- Red Team Considerations: Emulate adversary footprints with forensics awareness, predictability (reproducible artifacts), and stealthier collection surfaces. Conversely, defenders can simulate attacker techniques to test detection and response capabilities, using forensics as a baseline for success criteria.

Key practices to adopt in production:
- Time synchronization (NTP) and consistent timezones across all artifacts.
- Immutable or write-once storage for critical evidence (WORM storage, approved media).
- Versioned artifacts and change-detection for all tooling and manifests.
- Documentation of every step: commands run, options chosen, and expected results.
- Access controls and audit logs for forensic tooling.

---

## Z. Study Questions

1. What are the core phases of the digital forensics lifecycle, and why is each phase important?
2. How can a PCAP file be used to identify top communicating hosts, and what does a high volume of traffic between two endpoints imply?
3. Why is computing and recording a cryptographic hash for each artifact critical in a forensic investigation?
4. What is a manifest in evidence packaging, and how does it support chain-of-custody requirements?
5. How can memory forensics strings extraction help surface indicators of compromise, and what are its limitations?

---

## Exercise

Multi-part practical coding challenge to build a small, cohesive DFIR toolset.

Part A: Directory artifact inventory and baseline
- Task: Create a Python script that scans a given directory, computes SHA-256 hashes for all files, and outputs a JSON manifest with fields: path, size, mtime, sha256, and extension.
- Deliverables: A single script artifact_inventory_all.py and a sample inventory.json produced from a test directory.
- Notes: Include error handling for unreadable files and ensure relative paths are stable across runs.

Part B: Quick PCAP top-talkers script (reusable)
- Task: Extend the PCAP analysis to produce a CSV with columns: src_ip, dst_ip, packet_count, first_seen, last_seen. If the PCAP contains timestamps, capture the min and max timestamp per pair.
- Deliverables: A script top_talkers_csv.py that reads a PCAP and writes a CSV.
- Hint: If you cannot access timestamps directly, note their absence in the CSV and document assumptions.

Part C: Memory dump string triage
- Task: Create a Python script strings_triage.py that reads a binary memory dump and outputs a file strings.txt containing all printable ASCII strings of length >= 4.
- Deliverables: The script and a short example of strings.txt showing sample output lines.

Part D: Evidence packaging with manifest
- Task: Create a script package_case.py (already provided in Section 4) that packages a case directory into a tar.gz along with a manifest.json. Add a small enhancement: include a case metadata.json at the root of the tarball with fields case_id, collector, and created_at.
- Deliverables: Enhanced packaging script and a sample case directory with dummy artifacts to package.

Part E: End-to-end run and report
- Task: Create a README.md that documents:
  - How to run each script (prerequisites, e.g., Python version, dependencies)
  - Expected inputs and outputs
  - How to interpret the results (e.g., what the top talkers indicate, what a large hash delta might imply)
  - How to extend the scripts for more advanced DFIR tasks
- Deliverables: README.md in the repository.

Notes for instructors:
- Encourage learners to run the scripts on synthetic datasets first to understand input/output and to audit the results manually.
- Emphasize the importance of reproducibility: use exact Python versions, pin dependencies, and maintain a changelog of changes to the tooling.
- Discuss potential red-team and blue-team perspectives: how adversaries might attempt to evade artifacts collection and how defenders can harden evidence collection against tampering.

End of lesson.