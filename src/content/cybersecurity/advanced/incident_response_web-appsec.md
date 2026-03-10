# Incident Response Procedures in Web App Security

A well-defined incident response (IR) procedure is essential for protecting web applications, users, and data. In Phase 4 — Defense & Forensics, IR combines detection, triage, containment, eradication, recovery, and post-incident analysis to minimize blast radius, accelerate recovery, and improve future resilience. This lesson provides practical, code-backed procedures tailored to web app security contexts (logs, WAFs, containers, cloud-hosted services), with line-by-line explanations, common pitfalls, and real-system considerations.

## 1. Detection, Triage, and Initial Containment

This section covers automatic detection of suspicious activity, triage prioritization, and immediate containment actions to stop the spread of an incident. The example script reads web app logs, identifies suspicious patterns, and emits a triage summary with an incident score and recommended actions.

```python
# triage_alerts.py
import json
import re
from datetime import datetime, timedelta
from collections import defaultdict

LOG_FILE = "webapp_logs.jsonl"  # each line is a JSON object
SUSPICIOUS_PATTERNS = [
    r"\b(select|union|and 1=1|or 1=1)\b",  # SQLi-like patterns
    r"(?i)passwd|password|credential",       # credential leakage
    r"/wp-admin|/xmlrpc\.php",                # common CMS abuse
]
MIN_REQUESTS = 4          # threshold within window to raise alert
WINDOW_MINUTES = 5

def is_suspicious(entry):
    path = entry.get("path", "")
    status = int(entry.get("status", 0))
    ua = entry.get("user_agent", "")
    ip = entry.get("ip", "")
    # Heavy-handed but common indicators
    pattern_hit = any(re.search(pat, path, re.IGNORECASE) or
                      re.search(pat, ua, re.IGNORECASE) for pat in SUSPICIOUS_PATTERNS)
    return status >= 400 or pattern_hit

def parse_log_line(line):
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return None

def triage(log_path=LOG_FILE):
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=WINDOW_MINUTES)
    alerts = defaultdict(int)
    incidents = []

    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            entry = parse_log_line(line.strip())
            if not entry:
                continue
            ts = entry.get("timestamp")
            try:
                ts_dt = datetime.fromisoformat(ts.replace("Z","+00:00"))
            except Exception:
                continue
            if ts_dt < window_start:
                continue
            if is_suspicious(entry):
                ip = entry.get("ip", "unknown")
                alerts[(ip, ts_dt.strftime("%Y-%m-%d %H:%M"))] += 1

    for (ip, t), count in alerts.items():
        if count >= MIN_REQUESTS:
            incidents.append({"ip": ip, "window_start": window_start.isoformat(),
                              "window_end": now.isoformat(), "count": count,
                              "triaged_at": now.isoformat(),
                              "notes": "High-frequency suspicious activity"})

    triage_report = {
        "generated_at": now.isoformat(),
        "window_minutes": WINDOW_MINUTES,
        "incident_count": len(incidents),
        "incidents": incidents
    }

    with open("triage_report.json", "w", encoding="utf-8") as out:
        json.dump(triage_report, out, indent=2)
    return triage_report

if __name__ == "__main__":
    triage()
```

### Line-by-line explanation

- import json, re, datetime, defaultdict: Bring in libraries for JSON parsing, regex matching, time windows, and convenient counting.
- LOG_FILE = "webapp_logs.jsonl": Path to the JSON Lines log file; each line is a separate event.
- SUSPICIOUS_PATTERNS = [...]: List of regex patterns commonly associated with abuse (SQLi-like strings, credential keywords, CMS endpoints).
- MIN_REQUESTS, WINDOW_MINUTES: Thresholds to convert noisy data into actionable incidents and the time window for triage.
- def is_suspicious(entry): Extracts path, status, user_agent, and IP; uses patterns to flag suspicious activity or high error status.
- def parse_log_line(line): Safely parses a single JSON line; returns None on failure.
- def triage(log_path): Core triage routine:
  - Compute current time and the start of the analysis window.
  - Iterate log entries, parse, and filter to the window.
  - If an entry is suspicious, record it per IP and minute.
  - Create incident entries when counts exceed the threshold.
  - Write triage_report.json with generated metadata and incidents.
- if __name__ == "__main__": Run triage when executed as a script.

## 2. Containment Strategies and Immediate Actions

Containment is about stopping the spread of the incident while preserving evidence. This example demonstrates automated blocking of suspicious IPs using a firewall/CDN API (e.g., Cloudflare). It assumes you’ve already aggregated a list of abusive IPs from triage.

```python
# containment_block_ips.py
import os
import json
import requests
from datetime import datetime

ZONE_ID = os.environ.get("CF_ZONE_ID")
API_TOKEN = os.environ.get("CF_API_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
}

def block_ip(ip, note="IR-auto-block"):
    url = f"https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/firewall/access_rules/rules"
    payload = {
        "mode": "block",
        "configuration": {"target": "ip", "value": ip},
        "notes": f"{note} @ {datetime.utcnow().isoformat()}",
    }
    resp = requests.post(url, json=payload, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()

def load_suspicious_ips(file_path="triage_report.json"):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    ips = {item["ip"] for item in data.get("incidents", [])}
    return list(ips)

def main():
    ips_to_block = load_suspicious_ips()
    results = {}
    for ip in ips_to_block:
        try:
            results[ip] = block_ip(ip)
        except Exception as e:
            results[ip] = {"error": str(e)}
    with open("blocked_ips.json", "w", encoding="utf-8") as f:
        json.dump({"timestamp": datetime.utcnow().isoformat(), "results": results}, f, indent=2)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation

- import os, json, requests: Bring in OS utilities, JSON handling, and HTTP requests.
- ZONE_ID, API_TOKEN: Read Cloudflare credentials from environment variables to avoid hard-coding secrets.
- HEADERS: Prepare HTTP headers with the API token for Cloudflare API calls.
- def block_ip(ip, note): Builds a payload to block a specific IP via Cloudflare Access Rules API and posts it.
- url: REST endpoint for adding a firewall rule in the given zone.
- payload: Mode is "block"; target is "ip" with the IP value; notes include a timestamp for audit.
- resp = requests.post(...): Send the request; raise an exception if the call failed.
- def load_suspicious_ips(file_path): Load triage results and extract unique IPs flagged as suspicious.
- def main(): Iterate IPs and attempt to block each; capture success or error per IP; persist results to blocked_ips.json.
- if __name__ == "__main__": Run containment when executed as a script.

## 3. Eradication, Recovery, and Patch Deployment

Eradication removes root causes and pivot points the attacker exploited, while recovery restores services and validates integrity. This example shows rotating secrets and triggering a redeploy to ensure the corrected posture is live.

```python
# eradicate_recover.py
import os
import hmac
import hashlib
import json
import subprocess
from pathlib import Path

CONFIG_PATH = Path("config.yaml")
SECRET_KEYS = ["db_password", "api_secret", "jwt_signing_key"]
REDEploy_WEBHOOK = os.environ.get("CI_CD_WEBHOOK")

def read_config():
    import yaml
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def write_config(cfg):
    import yaml
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump(cfg, f)

def generate_secret(length=32):
    import secrets
    return secrets.token_hex(length)

def rotate_secrets():
    cfg = read_config()
    if "secrets" not in cfg:
        cfg["secrets"] = {}
    for key in SECRET_KEYS:
        cfg["secrets"][key] = generate_secret()
    write_config(cfg)
    return cfg

def trigger_redeploy():
    if not REDEploy_WEBHOOK:
        return {"status": "skipped", "reason": "no webhook configured"}
    payload = {"event": "incident_recovery", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
    resp = __import__("requests").post(REDEploy_WEBHOOK, json=payload, timeout=10)
    return {"status": "triggered", "code": resp.status_code}

def main():
    rotated = rotate_secrets()
    redeploy = trigger_redeploy()
    with open("eradicate_recover.log", "a", encoding="utf-8") as log:
        log.write(json.dumps({"rotated": rotated, "redeploy": redeploy}) + "\n")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation

- Import statements and constants: Set up paths, keys, and webhook URL. SECRET_KEYS lists what to rotate.
- read_config / write_config: Load and save the YAML config using PyYAML, preserving structure.
- generate_secret: Create cryptographically strong random hex strings for secrets.
- rotate_secrets: Load current config, generate new secrets for defined keys, and persist.
- trigger_redeploy: If a CI/CD webhook is configured, post a trigger to redeploy; capture outcome.
- main: Perform rotation, trigger redeploy, and log results to eradication/recovery log.
- if __name__ == "__main__": Run the orchestrator.

Note: In production, ensure secret rotation is synchronized with credential stores (e.g., AWS Secrets Manager, Vault) and coordinate with CI/CD to avoid service downtime.

## 4. Post-Incident Reporting and Documentation

Post-incident reporting captures what happened, root cause, actions taken, and lessons learned. This script generates a structured Markdown incident report from the triage data and containment actions.

```python
# generate_incident_report.py
import json
from datetime import datetime

def load_triage(triage_path="triage_report.json"):
    with open(triage_path, "r", encoding="utf-8") as f:
        return json.load(f)

def create_report(triage, incident_id, root_cause, actions, stakeholders, output_path="incident_report.md"):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    lines = []
    lines.append(f"# Incident Report: {incident_id}")
    lines.append("")
    lines.append(f"**Generated:** {now}")
    lines.append("")
    lines.append("## Executive Summary")
    lines.append(root_cause)
    lines.append("")
    lines.append("## Timeline")
    for it in triage.get("incidents", []):
        lines.append(f"- IP: {it.get('ip')}  Count: {it.get('count')}  Window: {triage.get('window_minutes')}m")
    lines.append("")
    lines.append("## Root Cause")
    lines.append(root_cause)
    lines.append("")
    lines.append("## Actions Taken")
    for a in actions:
        lines.append(f"- {a}")
    lines.append("")
    lines.append("## Stakeholders")
    lines.append(", ".join(stakeholders))
    lines.append("")
    lines.append("## Post-Incident Improvements")
    lines.append(" - Fix identified vulnerability, patch deployment process, improve logging.")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return output_path

def main():
    triage = load_triage()
    incident_id = f"IR-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    root_cause = "Example: Unsanitized input allowed pattern-based abuse; insufficient request rate limiting."
    actions = [
        "Implemented IP blocking for confirmed abusive IPs.",
        "Applied WAF rule to drop suspicious paths.",
        "Rotated database and API secrets; redeployed service.",
        "Enhanced log collection and centralized SIEM correlation rules."
    ]
    stakeholders = ["SRE", "Security", "Product", "Legal"]
    report_path = create_report(triage, incident_id, root_cause, actions, stakeholders)
    print(f"Report generated at: {report_path}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation

- load_triage: Reads the triage_report.json to base the report on observed incidents.
- create_report: Builds a Markdown document with sections for executive summary, timeline, root cause, actions, stakeholders, and improvements.
- The lines assembling the report include dates, incident IDs, and a concise narrative of what happened and what was done.
- main: Orchestrates loading triage data, generating an incident_id, and composing the report; prints the path to the generated report.

## 5. Forensics and Evidence Handling

Forensics focuses on preserving evidence integrity for investigations and potential legal actions. This example demonstrates hashing log files to detect tampering and packaging a minimal evidence bundle for transfer to a secure storage location.

```python
# forensics_evidence.py
import hashlib
import json
import os
import tarfile
from pathlib import Path
from datetime import datetime

LOG_FILES = ["webapp_logs.jsonl", "auth_events.log"]
EVIDENCE_DIR = "evidence_bundle"
BUNDLE_NAME = f"evidence_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.tar.gz"

def sha256_of(file_path):
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def bundle_evidence(files, dest_dir, bundle_name):
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    manifest = {}
    for f in files:
        manifest[f] = sha256_of(f)
        # In real usage, copy file to bundle dir
    bundle_path = os.path.join(dest_dir, bundle_name)
    with tarfile.open(bundle_path, "w:gz") as tar:
        for f in files:
            tar.add(f, arcname=os.path.basename(f))
    with open(os.path.join(dest_dir, "manifest.json"), "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, indent=2)
    return bundle_path

def main():
    bundle = bundle_evidence(LOG_FILES, EVIDENCE_DIR, BUNDLE_NAME)
    print(f"Evidence bundle created: {bundle}")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation

- LOG_FILES: List of log files to include in the evidence bundle; ensure only necessary data is collected.
- sha256_of: Computes a SHA-256 hash for a given file to guarantee integrity of each file.
- bundle_evidence: Creates a destination directory, computes a manifest of hashes, and packages the files into a compressed tarball; writes a manifest.json mapping file names to hashes.
- manifest.json: Acts as an integrity record for the bundle.
- main: Runs the bundling process and reports the bundle path.

## X. Common Beginner Mistakes

Below are typical pitfalls in incident response workflows, with bad and good code practices side-by-side.

| Bad Practice | Good Practice |
| - | - |
| Not validating or sanitizing inputs when parsing logs, leading to brittle parses or injection of malformed data. | Validate and sanitize inputs; use strict JSON parsing and define a schema before processing. Example: use jsonschema to validate event structures before triage. |
| Writing logs and results to a single shared file without proper locking, risking data races and corruption in concurrent IR runs. | Use atomic writes or a dedicated write channel (e.g., a queue or per-run log file) and file locking when needed. Example: write to a unique per-run file, then atomically rename. |
| Blocking IPs via shell commands without escaping or validation, risking command injection and misconfigurations. | Build API calls or use structured libraries; validate IP format, and avoid shell=True. If using shell tools, sanitize inputs and use parameterized calls. |
| Not separating duties or access to credentials, embedding secrets in scripts. | Use environment variables or secret stores; never hard-code credentials; rotate secrets and follow least-privilege access. |
| Incomplete post-incident documentation, leaving a vague RCA and no actionable improvements. | Produce a structured post-incident report with timeline, root cause, corrective actions, and concrete improvement items; link to artifacts (triage, hashes, blocklists). |

## Y. Why This Matters In Real Systems

In real production environments, incident response touches people, processes, and technology across multiple layers:

- Detection realities: SIEMs, WAFs, EDR, and anomaly detection signal IR teams with time-stamped events; triage quality depends on data richness and alert fidelity.
- Containment in dynamic environments: Cloud-hosted apps, Kubernetes clusters, and serverless functions require rapid, scoped containment (e.g., CSP is tightened, WAF rules updated, service meshes adjusted) without breaking legitimate traffic.
- Eradication and recovery at scale: Secrets rotation, dependency patching, and blue/green or canary deployments minimize blast radius and risk of rollback.
- Forensics under compliance: Evidence integrity, chain-of-custody, and traceable actions are critical for audits, litigation readiness, and regulatory requirements (e.g., GDPR, CCPA, SOC 2).
- Documentation and learning: Post-incident reviews feed back into runbooks, training, and detection rule tuning to reduce future dwell time and improve responders' readiness.
- Automation vs. human judgment: Scripts and playbooks accelerate routine parts, but seasoned responders must validate automated containment and ensure business continuity.

In web app contexts, IR must account for containers, CI/CD pipelines, service meshes, and multi-region deployments. Runbooks should specify roles, escalation paths, communication templates, data retention constraints, and legal/compliance considerations.

## Z. Study Questions

1. What are the core phases of an incident response lifecycle, and where does Phase 4 fit in?  
2. Give two practical containment actions you can automate for a suspected web app attack and two you should reserve for manual review.  
3. What is the difference between containment and eradication in incident response? Provide an example for a web application.  
4. Why is a cryptographic hash of log files important in forensics, and how would you create one in Python?  
5. What information should be included in a post-incident report to drive future improvements?

## Exercise

Part A — Build a small triage pipeline and generate a triage report

- Given a sample logs file sample_logs.jsonl (one JSON object per line). Each entry has fields: timestamp (ISO 8601), ip, path, status, user_agent.
- Task: Write a Python script triage_sample.py that reads sample_logs.jsonl, identifies suspicious activity using patterns from Section 1, and outputs triage_report.json with a list of incidents containing ip, timestamp, and a short note.
- Deliverables:
  - triage_sample.py (implements detection and triage)
  - sample triage_report.json generated by running the script
  - A short README.md describing how to run it and what the output means

Part B — Add containment automation

- Extend the system by wiring a containment step that blocks the IPs emitted by your triage script using a mock or real API (you can simulate with a local HTTP server if you prefer).
- Create containment_ips.py that reads triage_report.json and, for each incident, issues a block request to a mock API endpoint (or Cloudflare-like endpoint if you have credentials).
- Deliverables:
  - containment_ips.py
  - A simple mock server (optional) that records blocked IPs
  - blocked_ips_log.txt recording blocked IPs and timestamps

Part C — Generate a post-incident report

- Implement generate_report.py (similar to Section 4) that reads triage_report.json and creates an incident_report.md with an executive summary and a simple timeline.
- Deliverables:
  - generate_report.py
  - incident_report.md (sample output)

Part D — Forensics bundle (optional)

- Implement forensics_evidence.py (as in Section 5) to hash the log files and create an evidence bundle tar.gz with a manifest.json
- Deliverables:
  - forensics_evidence.py
  - evidence bundle and manifest

Hints and tips

- Use virtual environments to keep dependencies isolated.
- Do not run destructive containment in production environments from test scripts; use a safe sandbox or mock services.
- Keep all credentials in environment variables or secret stores; never commit into the repository.
- Add unit tests for your triage detection (e.g., test that a known suspicious log line triggers an incident).

This completes the comprehensive lesson on Incident Response Procedures tailored for Web App Security within the Defense & Forensics phase. You now have actionable scripts, explanations, common pitfalls, and a concrete multi-part exercise to solidify your capabilities in real systems.