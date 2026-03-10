# Incident Response Procedures in Phase 4 — Defense & Forensics (Red Teaming)

In modern security operations, incident response (IR) is the disciplined, repeatable process that turns a potential breach into a controlled, learnable event. Red teamers practice IR procedures to reveal gaps in detection, containment, and recovery while blue teams refine their playbooks. This lesson blends defensive playbooks with red-team realism: building playbooks, automating detection, collecting evidence, and delivering actionable post-incident reports that translate into stronger systems.

## 1. The Incident Response Lifecycle in Red Teaming

IR is a lifecycle: preparation, identification, containment, eradication, recovery, and lessons learned. In red-team context, you simulate adversary activity within controlled boundaries and then demonstrate how IR should respond in practice. This section includes a simple Python-based detector that flags potential indicators and emits a compact incident timeline.

```python
#!/usr/bin/env python3
import json
from datetime import datetime

# Simple simulated log stream (in real life, you'd tail logs or ingest SIEM data)
LOG_LINES = [
    "2026-03-10T10:01:23Z - INFO - User alice logged in from 192.0.2.12",
    "2026-03-10T10:02:47Z - WARN - Failed password for root from 203.0.113.5",
    "2026-03-10T10:04:01Z - INFO - cron job started by root",
    "2026-03-10T10:05:12Z - WARN - New user 'evilemp' created",
    "2026-03-10T10:06:33Z - INFO - SSH session from 203.0.113.5 terminated",
]

SUSPECT_INDICATORS = [
    "Failed password",
    "New user",
    "Privilege escalation",
    "unexpected process",
]

def detect_incidents(log_lines):
    incidents = []
    for line in log_lines:
        for ind in SUSPECT_INDICATORS:
            if ind in line:
                incidents.append(line)
                break
    return incidents

def build_timeline(incidents):
    timeline = []
    for i, l in enumerate(incidents, 1):
        timeline.append({
            "id": f"INC{i:03d}",
            "ts": datetime.utcnow().isoformat() + "Z",
            "note": l
        })
    return timeline

def main():
    incidents = detect_incidents(LOG_LINES)
    timeline = build_timeline(incidents)
    report = {
        "incident_id": "IR-2026-0001",
        "phase": "Identification",
        "summary": "Automated detection of credential/access indicators.",
        "timeline": timeline,
    }
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- 1-2: Shebang and imports for JSON and time stamping.
- 5-12: Define a small in-memory log stream that mimics real-world logs from hosts and services.
- 14-18: List of suspicious indicators that trigger IR discussion (e.g., failed login attempts, new user creation).
- 20-29: detect_incidents loops through logs and flags any line containing any suspect indicator.
- 31-36: build_timeline converts detected incidents into a structured timeline with unique IDs and timestamps.
- 38-46: main ties detection and timeline construction together into a report and prints it as pretty JSON.
- 48-49: Standard Python entry-point pattern.

## 2. Build an IR Runbook and Automation

A runbook defines the exact steps to take during IR, including containment, eradication, and recovery actions. In red-team practice, automation ensures repeatability and reduces cognitive load during high-pressure events. The following shows a minimal YAML runbook and a Python runner that simulates executing its steps.

```yaml
# runbook.yaml
incident_id: IR-2026-0002
title: Credential Access Simulation
phases:
  - identification
  - containment
  - eradication
  - recovery
steps:
  - name: Isolate affected host
    action: simulate
    command: "echo Isolating host-01 from network"
  - name: Disable compromised account
    action: simulate
    command: "echo Disabling accounts: evilemp"
  - name: Reset credentials
    action: simulate
    command: "echo Resetting passwords for affected users"
  - name: Restore from safe backup
    action: simulate
    command: "echo Restoring services from backup snapshot"
```

```python
#!/usr/bin/env python3
import yaml
import json

def load_runbook(path):
    with open(path, 'r') as f:
        return yaml.safe_load(f)

def simulate_execution(runbook):
    results = []
    for step in runbook.get('steps', []):
        results.append({
            "step": step.get('name'),
            "action": step.get('action'),
            "command": step.get('command'),
            "status": "completed",  # simulated
        })
    return results

def main():
    runbook = load_runbook('runbook.yaml')
    execution = simulate_execution(runbook)
    output = {
        "incident_id": runbook.get('incident_id'),
        "title": runbook.get('title'),
        "execution": execution
    }
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- YAML block:
  - Defines the incident_id, title, IR phases, and a list of steps with a simple simulated command for each.
- Python block:
  - 4-7: Import YAML loader and JSON for output serialization.
  - 9-14: load_runbook reads and parses the YAML file.
  - 16-26: simulate_execution iterates over steps and records a synthetic completion status.
  - 28-38: main wires together the runbook and simulation, then prints a structured JSON report.
- The code emphasizes a safe, non-destructive simulation suitable for training environments.

## 3. Evidence Collection and Forensics Artifacts

Evidence collection is about preserving a chain of custody, integrity, and reproducibility. The script below enumerates a set of directories, computes SHA-256 hashes for each file, assembles them into a zip archive, and writes a manifest mapping paths to hashes. This makes it easier to verify artifacts later.

```python
#!/usr/bin/env python3
import os
import hashlib
import json
import zipfile
from datetime import datetime

def hash_file(path):
    sha = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha.update(chunk)
    return sha.hexdigest()

def collect_files(dirs):
    files = []
    for d in dirs:
        for root, _, filenames in os.walk(d):
            for f in filenames:
                full = os.path.join(root, f)
                if os.path.isfile(full):
                    files.append(full)
    return files

def build_manifest(files):
    manifest = {}
    for f in files:
        manifest[f] = hash_file(f)
    return manifest

def pack_into_zip(files, manifest, out_zip):
    with zipfile.ZipFile(out_zip, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(f, arcname=os.path.relpath(f, start=os.path.commonpath(files)))
        z.writestr('manifest.json', json.dumps(manifest, indent=2))

def main():
    targets = ['logs', 'forensics']  # example dirs
    files = collect_files(targets)
    manifest = build_manifest(files)
    timestamp = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    out_zip = f'evidence_{timestamp}.zip'
    pack_into_zip(files, manifest, out_zip)
    print(f'Evidence package created: {out_zip}')

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- 1-4: Shebang and standard library imports for file operations, hashing, JSON, and zip packaging.
- 6-12: hash_file opens a file in binary mode and reads it in chunks to compute a stable SHA-256 hash.
- 14-20: collect_files recursively collects all regular files under the given directories.
- 22-27: build_manifest maps each file path to its hash value.
- 29-37: pack_into_zip creates a zip archive, adds all collected files, and embeds a manifest.json describing file hashes.
- 39-50: main defines target directories, runs collection, builds a manifest, and writes the final evidence bundle with a timestamp.

## 4. Containment, Eradication, and Recovery Techniques (Simulation)

Containment in IR stops further damage. This Python snippet demonstrates generating a containment plan and printing concrete commands you would run in a controlled lab to isolate a suspect host and block malicious traffic. It is intentionally a simulation: do not execute on production without proper approvals and rollback.

```python
#!/usr/bin/env python3
from dataclasses import dataclass, asdict
import json
import textwrap

@dataclass
class ContainmentPlan:
    target_host: str
    suspect_ip: str
    actions: list

def render_plan(plan: ContainmentPlan) -> str:
    lines = [
        f"Containment Plan for {plan.target_host}",
        f"  Suspect IP: {plan.suspect_ip}",
        "  Actions:"
    ]
    for a in plan.actions:
        lines.append(f"    - {a}")
    return "\n".join(lines)

def main():
    plan = ContainmentPlan(
        target_host="host-01",
        suspect_ip="203.0.113.5",
        actions=[
            "Block traffic from suspect_ip at network edge (simulated iptables/Firewall rule).",
            "Disconnect host-01 from any non-essential networks (segmentation).",
            "Preserve volatile data by capturing memory/dumps in a lab (not on prod).",
        ]
    )
    print(render_plan(plan))
    # Also emit a machine-readable containment command set
    commands = [
        f"iptables -I INPUT -s {plan.suspect_ip} -j DROP  # simulated",
        f"ifconfig eth0 down  # simulated network isolation for {plan.target_host}"
    ]
    print("\nCommands (simulation):")
    for c in commands:
        print(f"> {c}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- 1-4: Boilerplate: shebang, imports, and a small dataclass to model the containment plan.
- 6-15: ContainmentPlan dataclass describes target host, suspect IP, and a list of actions.
- 17-26: render_plan builds a human-readable plan string with a header, suspect IP, and a list of actions.
- 28-46: main creates a concrete plan instance with a host to isolate and an IP to block, prints the human-readable plan, and then emits a list of simulated commands for containment.
- 50-51: Standard entry-point pattern.

## 5. Red Team Collaboration: Lessons Learned and Feedback Loop

After an IR event, documentation, evidence, and a teachable output are essential. The following Python script takes a few inputs and generates a simple, structured post-incident report in JSON and Markdown. It demonstrates a reproducible, machine-readable artifact that blue teams can audit and auditors can review.

```python
#!/usr/bin/env python3
import json
import datetime

def generate_report(incident_id, title, status, findings):
    report = {
        "incident_id": incident_id,
        "title": title,
        "date": datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        "status": status,
        "findings": findings,
        "lessons_learned": []
    }
    # Basic example of adding lessons
    if "credential" in findings.lower():
        report["lessons_learned"].append("Enhance MFA requirements and rotate credentials more aggressively.")
    return report

def render_markdown(report):
    md = f"# Incident Report: {report['incident_id']}\n\n" \
         f"## Title\n{report['title']}\n\n" \
         f"## Date\n{report['date']}\n\n" \
         f"## Status\n{report['status']}\n\n" \
         f"## Findings\n{report['findings']}\n\n" \
         f"## Lessons Learned\n" + "\n".join(f"- {l}" for l in report['lessons_learned'])
    return md

def main():
    report = generate_report(
        incident_id="IR-2026-0003",
        title="Credential Access Simulation - Red Team Exercise",
        status="Closed - Lessons Implemented",
        findings="Credential access indicators detected by simple heuristic; insufficient MFA on low-privileged admin panel."
    )
    print(json.dumps(report, indent=2))
    print("\n--- Markdown Version ---\n")
    print(render_markdown(report))

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- 1-4: Standard Python imports for JSON payloads and timestamps.
- 6-16: generate_report builds a structured incident report with metadata, findings, and a placeholder for lessons learned.
- 18-25: render_markdown converts the JSON report into a readable Markdown document for humans and for shareable artifacts.
- 27-40: main creates a concrete incident report, prints the JSON, and prints the Markdown version for distribution.
- 42-43: Entry-point pattern.

## 6. Common Beginner Mistakes

- Bad: Ignoring evidence integrity and changing files directly on the source system.
  Good:
  - Bad:
    ```
    # Directly touching source logs
    cp /var/log/auth.log /tmp/evidence.log
    echo "tamper" >> /var/log/auth.log
    ```
    Good:
    ```
    # Copy with metadata preservation
    cp -p /var/log/auth.log /evidence/auth.log
    ```
- Bad: Not preserving a chain of custody or timestamped hashes.
  Good:
  ```
  # Generate a manifest and commit to a versioned artifact
  sha256sum /var/log/auth.log > /evidence/auth.log.sha256
  cp /var/log/auth.log /evidence/
  ```
- Bad: Running destructive containment without a rollback plan or dry-run.
  Good:
  ```
  # Dry-run flag and rollback plan
  if [ "$DRY_RUN" = "1" ]; then
    echo "Dry-run: would block IP 203.0.113.5"
  else
    iptables -I INPUT -s 203.0.113.5 -j DROP
  fi
  ```
- Bad: No documented decisions or runbook trace.
  Good:
  ```
  # Simple, versioned runbook entry
  # Runbook v1.0: 2026-03-10
  # Decision: Contain and collect evidence; no eradication until containment confirmed.
  ```
- Bad: Relying on human memory for critical steps during crisis.
  Good:
  ```
  # Automated playbook helper
  python runbook_runner.py --incident IR-2026-0004 --phase containment
  ```

## 7. Why This Matters In Real Systems

- Incident response is a systems design and team coordination problem, not just a script bazaar. Production IR requires:
  - Repeatable, auditable processes aligned to standards (NIST SP 800-61, MITRE ATT&CK mappings).
  - Proper role-based access, evidence integrity, and chain-of-custody practices.
  - Real-time detection, triage, and containment with minimal downtime and data loss.
  - Post-incident reviews that inform security controls, monitoring, and testing.
- Red teamers provide adversarial realism to stress-test IR: can your SOC detect a credential-stuffing attempt? Can your containment strategy survive a multi-host sweep? Can your artifacts be trusted across a compliance audit?
- In production, IR should be integrated with: SIEM, ticketing, asset management, and incident communication channels. Automated playbooks should be tested in staging, not just in production.

## 8. Study Questions

1) What are the six phases of the incident response lifecycle, and how do they relate to a red-team exercise?
2) How can a simple log parser help with the Identification phase, and what are its limitations?
3) Why is a manifest and hash-based evidence package important for forensics, and how would you verify it later?
4) What are two key differences between a real containment action and a simulated containment action, and why is rollback safety critical?
5) How would you structure a post-incident report to support both technical readers and auditors?

## 9. Exercise

Part A: Implement a small IR detector
- Create a Python script that reads a sample log file (you supply sample logs) and detects at least two indicators of compromise (e.g., failed login attempts, new user creation, anomalous sudo usage).
- Output a JSON report with an incident_id, a timestamp, and a list of detected events.

Part B: Build a mini runbook executor
- Create a YAML runbook with at least three steps mirroring containment, eradication, and recovery actions from a simulated incident.
- Write a runner (Python) that loads the YAML and prints an execution plan, then simulates "executing" each step and records a status.

Part C: Evidence collection pack
- Write a Python script that collects all files from a simulated “logs” directory, computes SHA-256 hashes, creates an evidence directory, copies the files there, and writes a manifest.json with path→hash mappings.

Part D: Post-incident report generator
- Extend the provided generator to accept findings from Part A and Part B, and produce both a JSON report and a Markdown summary that a security team could share with management.

Deliverables
- A small project folder (IR_Lab) containing:
  - detector.py (Part A)
  - runbook.yaml and runner.py (Part B)
  - collect_evidence.py and manifest.json expectations (Part C)
  - report_generator.py and a Markdown report (Part D)
- A short README.md describing how to run each part and what the expected outputs look like.

This lesson equips you with practical IR procedures that align with defense and forensics objectives in red-team exercises, provides concrete code to practice automation, and emphasizes the importance of traceability, reproducibility, and real-world applicability in production environments.