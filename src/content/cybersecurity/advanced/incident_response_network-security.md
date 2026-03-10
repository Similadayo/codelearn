# Incident Response Procedures in Phase 4 — Defense & Forensics (Network Security)

Intro: Incident Response Procedures are the applied, repeatable steps teams use when a security incident occurs. They bridge prevention and recovery by detailing detection, triage, containment, eradication, and post-incident analysis. In real networks, well-defined incident response procedures reduce dwell time, minimize blast radius, preserve evidence integrity, and accelerate recovery. This lesson focuses on concrete, runnable examples you can adapt to your organization's IR playbooks and runbooks.

## 1. Incident Response Lifecycle Overview

An incident response lifecycle defines the sequence of actions from detection through lessons learned. It ensures consistent handling across teams, supports auditability, and enables automation where appropriate. The example below encodes a simple IR playbook in JSON that can be ingested by an automation layer or a human-runbook.

```json
{
  "playbook": {
    "version": "1.0",
    "name": "IR Playbook v1.0",
    "roles": ["IR Lead", "Forensic Analyst", "Communications"],
    "phases": [
      { "id": "triage", "action": "Assess scope and impact", "owner": "IR Lead" },
      { "id": "contain", "action": "Isolate affected hosts", "owner": "Network Team" },
      { "id": "eradicate", "action": "Remove malware artifacts", "owner": "Forensic Analyst" },
      { "id": "recover", "action": "Restore services from clean state", "owner": "SysAdmin" },
      { "id": "lessons", "action": "Post-incident review and improvements", "owner": "IR Lead" }
    ],
    "artifacts": ["timeline.csv", "memory.dmp", "logs/", "network.pcap"],
    "escalation": {
      "thresholds": {
        "critical": true,
        "high": true
      },
      "contacts": ["Security Manager", "CIO"]
    }
  }
}
```

### Line-by-line explanation
- "playbook": Root object containing the IR playbook data.
- "version": Version of the playbook for compatibility and tracking changes.
- "name": Human-friendly title for the runbook.
- "roles": List of roles involved in the IR process.
- "phases": Ordered list of incident phases with an id, a high-level action, and the owner responsible.
- "artifacts": Artifacts to collect for evidence, timelines, and post-incident analysis.
- "escalation": How and when to escalate to higher authorities or executives, with contact points.

## 2. Preparation: Detection, Logging, and Baseline Configuration

Preparation ensures you have the data, tooling, and playbooks required to respond quickly and correctly. The following Python baseline collector demonstrates a portable, minimal approach to capture system metadata and a snapshot of runtime state for later comparison.

```python
#!/usr/bin/env python3
import json
import platform
import socket
import subprocess
import time

def collect_baseline():
    data = {}
    data['timestamp'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    data['host'] = socket.gethostname()
    data['system'] = {
        'node': platform.node(),
        'os': platform.system(),
        'release': platform.release(),
        'version': platform.version(),
        'arch': platform.machine()
    }

    # Network information (best-effort; falls back gracefully)
    try:
        ip_out = subprocess.check_output(['ip', '-o', 'addr', 'show'], text=True)
        data['network'] = {'addresses': ip_out.strip().splitlines()}
    except Exception:
        data['network'] = {'addresses': []}

    # Running processes (best-effort, portable fallback)
    try:
        proc_out = subprocess.check_output(['ps', '-eo', 'pid,comm'], text=True)
        data['processes'] = proc_out.strip().splitlines()[1:]  # skip header
    except Exception:
        data['processes'] = []

    # Persist baseline
    with open('baseline.json', 'w') as f:
        json.dump(data, f, indent=2)

    return data

if __name__ == '__main__':
    baseline = collect_baseline()
    print(json.dumps(baseline, indent=2))
```

### Line-by-line explanation
- Shebang and imports: Prepare the Python environment and bring necessary modules.
- collect_baseline(): Main function to assemble baseline data.
- data['timestamp']: Time in UTC when baseline was captured.
- data['host']: System hostname for identity.
- data['system']: OS metadata including node name, OS, release, version, and architecture.
- Network info block attempts to run ip addr inspection; if unavailable, it gracefully records an empty list.
- Processes block attempts to list running processes; fallback to empty if not available.
- Baseline persistence: Writes a structured JSON file baseline.json for comparison against future IR activity.
- Main guard: Executes collection when run as a script and prints the result.

## 3. Triage, Containment, Eradication, and Recovery Workflow

A defensible IR workflow is decision-driven and repeatable. The example below shows a tiny engine that generates containment commands tailored to the host OS and can optionally execute them. This helps you rapidly isolate a compromised host while preserving evidence.

```python
#!/usr/bin/env python3
import json
import platform
import subprocess
import sys
from datetime import datetime

def contain_ip(target_ip, execute=False, mode='block'):
    cmds = []
    osname = platform.system()
    if osname == 'Linux':
        cmds.append(f"iptables -A INPUT -s {target_ip} -j DROP")
        cmds.append(f"iptables -A OUTPUT -d {target_ip} -j DROP")
    elif osname == 'Windows':
        cmds.append(f"netsh advfirewall firewall add rule name=\"IR_Block_{target_ip}\" dir=in action=block remoteip={target_ip}")
        cmds.append(f"netsh advfirewall firewall add rule name=\"IR_Block_{target_ip}\" dir=out action=block remoteip={target_ip}")
    else:
        cmds.append("# Containment commands for this OS are not implemented")

    if execute:
        for c in cmds:
            try:
                subprocess.run(c, shell=True, check=True)
            except subprocess.CalledProcessError as e:
                print(f"Failed to execute: {c}", file=sys.stderr)
                raise
    return cmds

def main():
    # Expect a JSON payload on stdin for flexibility
    payload = sys.argv[1] if len(sys.argv) > 1 else '{"target_ip": "0.0.0.0", "execute": false}'
    data = json.loads(payload)
    target_ip = data.get('target_ip')
    action = data.get('action', 'contain')
    should_execute = data.get('execute', False)

    results = contain_ip(target_ip, execute=should_execute)

    out = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'target_ip': target_ip,
        'action': action,
        'commands_generated': results
    }
    print(json.dumps(out, indent=2))

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- Shebang and imports: Prepare environment for OS-specific containment.
- contain_ip(target_ip, execute, mode): Builds containment commands according to OS. Linux uses iptables; Windows uses netsh. For unknown OS, it emits a placeholder.
- OS branching: Chooses the appropriate containment commands for Linux and Windows.
- execute flag: If true, executes each command via subprocess. Errors cause a stop to preserve safety.
- main(): Accepts a JSON payload, parses target_ip and execute flag, generates commands, and outputs a JSON result.
- Payload example: Demonstrates how you might invoke this tool to generate containment steps without immediately executing them (safe practice in many environments).
- Guard: Runs main() when the script is executed as a program.

## 4. Forensic Data Collection and Chain of Custody

Collecting artifacts must be deterministic and repeatable, preserving integrity and enabling traceability. The Linux and Windows examples below show how to snapshot artifacts and generate hashes for integrity verification.

Linux Bash script (artifact collection and hashing)

```bash
#!/usr/bin/env bash
set -euo pipefail

OUTPUT=${1:-./artifacts}
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
ROOT="$OUTPUT/artifact_$TIMESTAMP"

mkdir -p "$ROOT"

# Copy logs (preserve timestamps and metadata)
cp -a /var/log "$ROOT/"

# Copy critical binaries for hashing
BINARIES=("/bin/bash" "/bin/ls" "/bin/sh" "/usr/bin/python3")
mkdir -p "$ROOT/bin"
for B in "${BINARIES[@]}"; do
  if [[ -f "$B" ]]; then
    cp -a "$B" "$ROOT/bin/"
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum "$B" >> "$ROOT/manifest.sha256"
    elif command -v shasum >/dev/null 2>&1; then
      shasum -a 256 "$B" >> "$ROOT/manifest.sha256"
    fi
  fi
done

# Optional: archive for transport
tar -czf "${ROOT}.tar.gz" -C "$ROOT" .
echo "$ROOT.tar.gz" > "$ROOT/../artifact_manifest.txt"
```

PowerShell script (Windows) to collect artifacts

```powershell
# Collect-ForensicArtifacts.ps1
param(
  [string]$OutputFolder = "$env:TEMP\IR_Artifacts",
  [switch]$Compress = $true
)

$Date = Get-Date -Format "yyyyMMddTHHmmssZ"
$Root = Join-Path -Path $OutputFolder -ChildPath "Artifact_$Date"
New-Item -ItemType Directory -Path $Root -Force | Out-Null

# Collect Event Logs (exported for portability)
$logs = @("System","Application","Security")
foreach ($log in $logs) {
  $path = Join-Path -Path $Root -ChildPath "Logs"
  New-Item -ItemType Directory -Path $path -Force | Out-Null
  Get-WinEvent -LogName $log -MaxEntries 1000 | Export-Clixml -Path (Join-Path $path "$log.xml")
  # Optional: also export EVTX for native tooling
  $evtxPath = Join-Path -Path $path -ChildPath "$log.evtx"
  if (Test-Path $evtxPath) { Remove-Item $evtxPath -Force }
}

# Running processes
Get-Process | Select-Object Id,ProcessName,StartTime,Path | Export-Csv -NoTypeInformation (Join-Path $Root "Processes.csv")

# Network connections
Get-NetTCPConnection | Export-Csv -NoTypeInformation (Join-Path $Root "NetConnections.csv")

# Hash critical binaries
$Targets = @("C:\Windows\System32\cmd.exe", "C:\Windows\System32\conhost.exe")
foreach ($t in $Targets) {
  if (Test-Path $t) {
    $hash = Get-FileHash $t -Algorithm SHA256
    "$($hash.Hash)  $t" | Out-File -FilePath (Join-Path $Root "hashes.txt") -Append
  }
}

if ($Compress) {
  $Archive = "$Root.zip"
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($Root, $Archive)
}
```

### Line-by-line explanation
- Purpose: Both scripts collect artifacts for forensic analysis and preserve them in a structured layout with verifiable hashes.
- Linux script: Creates a timestamped artifact directory, copies logs, copies key binaries, and computes SHA-256 hashes for each binary, then archives the data for transport.
- Windows script: Creates a timestamped artifact directory, exports event logs to XML, captures process and network connection data, computes SHA-256 hashes for critical binaries, and optionally compresses the bundle.
- Hashing: Produces a manifest of integrity checks that can be validated later in a chain-of-custody workflow.

## 5. Evidence Handling and Preservation

Evidence must be documented, tamper-evident, and traceable through a chain-of-custody record. The following Python example models a minimal custody log that records who collected what, when, and how it was transferred.

```python
#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime

def add_custody_event(evidence_path, event):
    index_path = os.path.join(evidence_path, 'evidence_chain.json')
    if os.path.exists(index_path):
        with open(index_path) as f:
            chain = json.load(f)
    else:
        chain = []
    chain.append(event)
    with open(index_path, 'w') as f:
        json.dump(chain, f, indent=2)

def main():
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    if not os.path.isdir(root):
        print("Invalid evidence path", file=sys.stderr)
        sys.exit(2)

    event = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "role": "IR Analyst",
        "action": "Collected canonical evidence bundle",
        "source": os.getcwd(),
        "notes": "Hash manifest validated; bundle stored in secure location"
    }

    add_custody_event(root, event)
    print("Custody event recorded:", json.dumps(event, indent=2))

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- add_custody_event(): Appends an event to the evidence chain stored at evidence_path/evidence_chain.json to maintain a verifiable history.
- main(): Builds a custody event with timestamp, role, action, and notes, then records it.
- Usage: Run after collecting artifacts to log who touched the evidence, when, and why, ensuring a traceable history for audits and legal holds.

## 6. Post-Incident Analysis and Reporting

After containment and eradication, you need a clear, actionable report of what happened, what was affected, and how to prevent recurrence. The following Python snippet reads a simple timeline (CSV) and prints a concise summary, which you can extend to generate full PDFs or dashboards.

```python
#!/usr/bin/env python3
import csv
import sys
from collections import defaultdict

def load_timeline(path):
    items = []
    with open(path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            items.append(row)
    return items

def summarize(timeline):
    summary = defaultdict(int)
    for event in timeline:
        t = event.get('type', 'unknown')
        summary[t] += 1
    return dict(summary)

def main():
    path = 'timeline.csv'
    if len(sys.argv) > 1:
        path = sys.argv[1]
    timeline = load_timeline(path)
    summary = summarize(timeline)
    print("Incident Summary:")
    for k, v in summary.items():
        print(f"  {k}: {v}")

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- load_timeline(path): Reads a CSV timeline with a header; returns a list of event dictionaries.
- summarize(timeline): Aggregates counts by event type to produce a high-level view of incident phases and activities.
- main(): Orchestrates loading and summarizing; prints a readable summary to stdout.

## X. Common Beginner Mistakes

Mistakes in incident response often compound the damage or obscure evidence. Here are three real pitfalls with bad vs good code illustrations.

- Pitfall 1: Not preserving original data; destructive edits
  Bad
  ```bash
  # BAD: moves logs away, risking loss and altering state
  mv /var/log/syslog /tmp/ir_syslog
  ```
  Good
  ```bash
  # GOOD: preserves original logs by copying with metadata
  cp -a /var/log/syslog /var/log/ir_syslog.bak.$(date +%F)
  ```
  ### Line-by-line explanation
  - BAD: The log file is moved, which can contaminate the evidence trail and break forensic integrity.
  - GOOD: Copy preserves the original and creates a time-stamped backup for safety and auditing.

- Pitfall 2: Failing to verify data integrity with cryptographic hashes
  Bad
  ```bash
  # BAD: uses a non-cryptographic timestamp only
  echo "Collected at $(date)" > timeline.log
  ```
  Good
  ```bash
  # GOOD: compute and store SHA-256 hashes to verify integrity
  sha256sum /path/to/artifact > /path/to/artifact.sha256
  ```
  ### Line-by-line explanation
  - BAD: A timestamp alone does not guarantee data integrity or detect tampering.
  - GOOD: Hashing artifacts provides a tamper-evident fingerprint that can be re-checked later.

- Pitfall 3: Not using a structured, version-controlled runbook
  Bad
  ```bash
  # BAD: ad-hoc commands without a defined runbook
  iptables -A INPUT -s 1.2.3.4 -j DROP
  ```
  Good
  ```json
  // GOOD: runbook entry stored in version control (JSON)
  {
    "step": "Contain",
    "command": "iptables -A INPUT -s 1.2.3.4 -j DROP",
    "os": "Linux",
    "owner": "Network Team"
  }
  ```
  ### Line-by-line explanation
  - BAD: Commands are executed ad hoc, making audits and repeatability difficult.
  - GOOD: A runbook stored in a version-controlled format (JSON) enables traceability, rollback, and cross-team consistency.

## Y. Why This Matters In Real Systems

- Real networks produce noisy telemetry; structured IR procedures enable rapid triage and consistent containment across dozens or hundreds of hosts.
- Evidence retainment and chain of custody are not just academic—they govern legal and regulatory compliance in many sectors.
- Playbooks and runbooks enable automation, reducing mean time to respond (MTTR) and minimizing human error.
- Separation of duties (IR Lead, Forensic Analyst, Network Admin) prevents unilateral actions that could compromise evidence integrity.
- Post-incident analysis informs prevention: you can map root causes, update controls, and tighten logging and monitoring to reduce recurrence risk.

## Z. Study Questions

1. What are the five canonical phases of incident response, and what primary objective does each serve?
2. Why is it important to hash artifacts, and what hash algorithm is recommended in modern IR workflows?
3. How would you design a cross-platform containment approach that works on both Linux and Windows hosts?
4. What is the purpose of a chain-of-custody log, and what key fields should it include?
5. How can you leverage a simple IR playbook JSON to drive automation or human decision-making?

## Exercise

Part 1 — Create a minimal IR runbook in JSON
- Objective: Produce a simple, versioned IR runbook that encodes triage, containment, eradication, and recovery steps along with ownership.
- Deliverable: A single JSON file named ir_runbook.json with at least:
  - playbook.version
  - phases: an ordered list of 4 phases (triage, contain, eradicate, recover)
  - artifacts: a list of evidence artifacts to collect
  - escalation: thresholds and contacts

Code block (example to adapt):

```json
{
  "playbook": {
    "version": "1.0",
    "name": "IR Runbook Exercise",
    "phases": [
      {"id": "triage", "action": "Assess scope and impact", "owner": "IR Lead"},
      {"id": "contain", "action": "Isolate affected hosts", "owner": "Network Team"},
      {"id": "eradicate", "action": "Remove artifacts and persistence mechanisms", "owner": "Forensic Analyst"},
      {"id": "recover", "action": "Restore services from clean state and harden", "owner": "SysAdmin"}
    ],
    "artifacts": ["timeline.csv", "memory.dmp", "logs/", "pcap/"],
    "escalation": {
      "thresholds": {"critical": true},
      "contacts": ["Security Manager", "CIO"]
    }
  }
}
```

Part 2 — Implement a baseline collector
- Objective: Write a Python script that collects baseline data as shown in section 2 and can be invoked as a module or script.
- Deliverable: A script named collect_baseline.py (the code from Section 2) plus a brief README explaining how to run it and interpret baseline.json.

Code block (same as Section 2, for convenience):

```python
#!/usr/bin/env python3
import json
import platform
import socket
import subprocess
import time

def collect_baseline():
    data = {}
    data['timestamp'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    data['host'] = socket.gethostname()
    data['system'] = {
        'node': platform.node(),
        'os': platform.system(),
        'release': platform.release(),
        'version': platform.version(),
        'arch': platform.machine()
    }

    try:
        ip_out = subprocess.check_output(['ip', '-o', 'addr', 'show'], text=True)
        data['network'] = {'addresses': ip_out.strip().splitlines()}
    except Exception:
        data['network'] = {'addresses': []}

    try:
        proc_out = subprocess.check_output(['ps', '-eo', 'pid,comm'], text=True)
        data['processes'] = proc_out.strip().splitlines()[1:]
    except Exception:
        data['processes'] = []

    with open('baseline.json', 'w') as f:
        json.dump(data, f, indent=2)

    return data

if __name__ == '__main__':
    baseline = collect_baseline()
    print(json.dumps(baseline, indent=2))
```

Part 3 — Implement a containment engine
- Objective: Use the Python containment engine from Section 3 to generate containment commands for a given target IP, with an option to execute.
- Deliverable: A script named ir_engine.py. Provide a short test payload you can run locally to verify the generated commands without actually applying them.

Code block (Section 3):

```python
#!/usr/bin/env python3
import json
import platform
import subprocess
import sys
from datetime import datetime

def contain_ip(target_ip, execute=False, mode='block'):
    cmds = []
    osname = platform.system()
    if osname == 'Linux':
        cmds.append(f"iptables -A INPUT -s {target_ip} -j DROP")
        cmds.append(f"iptables -A OUTPUT -d {target_ip} -j DROP")
    elif osname == 'Windows':
        cmds.append(f"netsh advfirewall firewall add rule name=\"IR_Block_{target_ip}\" dir=in action=block remoteip={target_ip}")
        cmds.append(f"netsh advfirewall firewall add rule name=\"IR_Block_{target_ip}\" dir=out action=block remoteip={target_ip}")
    else:
        cmds.append("# Containment commands for this OS are not implemented")

    if execute:
        for c in cmds:
            try:
                subprocess.run(c, shell=True, check=True)
            except subprocess.CalledProcessError as e:
                print(f"Failed to execute: {c}", file=sys.stderr)
                raise
    return cmds

def main():
    data = json.loads(sys.argv[1])
    target_ip = data.get('target_ip')
    action = data.get('action', 'contain')
    execute = data.get('execute', False)

    results = contain_ip(target_ip, execute=execute)

    out = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'target_ip': target_ip,
        'action': action,
        'commands_generated': results
    }
    print(json.dumps(out, indent=2))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: ir_engine.py "<incident_json>"', file=sys.stderr)
        sys.exit(2)
    main()
```

Note: For safety, run with execute=false and feed a JSON payload like {"target_ip": "10.0.0.42", "execute": false}.

End of lesson. If you’d like, I can tailor these examples to your specific stack (e.g., Windows Server, Linux distributions, cloud environments) or convert all code to a single language (e.g., all Python) for consistency.