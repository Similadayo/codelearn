# Track: Cyber Security — Module: Phase 5 — Advanced Topics — Topic: Red Teaming & Active Directory Abuse

Red teaming against Active Directory (AD) in a tightly controlled, authorized lab environment is a critical skill for modern defenders and red teams. This lesson focuses on safe, high-level concepts, telemetry-driven detection, and practical exercises to model AD abuse scenarios without enabling real-world misuse. You’ll learn how to plan, simulate, detect, and respond to AD abuse in a responsible way, aligning practice with MITRE ATT&CK concepts while emphasizing safe tooling and environments.

## 1. Understanding AD Attack Surfaces in a Red Team Context (Safe Lab Perspective)

In professional red teaming, you model the AD surface to understand where abuse could occur and how defenders would detect it. This section introduces a safe, in-memory model of AD objects for lab use, plus a minimal event stream that simulates potential abuse scenarios. The goal is to reason about possible paths an adversary might take and to design defensive telemetry and alerts around those patterns—without touching real AD.

```python
from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class ADObject:
    dn: str
    object_class: str
    attributes: Dict[str, Any] = field(default_factory=dict)

def build_mock_ad():
    # Lightweight in-memory AD model for safe lab exercises
    users = [
        ADObject("CN=Alice,CN=Users,DC=lab,DC=local", "user", {"sAMAccountName": "alice", "adminCount": 0}),
        ADObject("CN=Bob,CN=Users,DC=lab,DC=local", "user", {"sAMAccountName": "bob", "adminCount": 1}),
    ]
    groups = [
        ADObject("CN=Domain Admins,CN=Users,DC=lab,DC=local", "group", {"members": ["alice", "eve"]}),
    ]
    computers = [
        ADObject("CN=DC1,OU=Computers,DC=lab,DC=local", "computer", {"dnsHostName": "dc1.lab.local"}),
    ]
    return {"users": users, "groups": groups, "computers": computers}

def simulate_change_events():
    # Simulated events representing potential abuse in a lab dataset
    return [
        {"timestamp": "2025-08-01T02:15:00Z", "type": "group_change", "target_group": "Domain Admins",
         "performed_by": "eve", "action": "add_member", "details": {"added_user": "eve"}},
        {"timestamp": "2025-08-01T14:22:10Z", "type": "logon", "user": "alice",
         "host": "workstation11", "result": "success"},
        {"timestamp": "2025-08-01T03:01:05Z", "type": "group_change", "target_group": "Developers",
         "performed_by": "mallory", "action": "modify", "details": {"new_role": "maintainer"}}
    ]

def detect_admin_group_changes(events):
    # Simple detector for Domain Admins changes in a lab
    alerts = []
    for e in events:
        if e.get("type") == "group_change" and e.get("target_group") == "Domain Admins":
            alerts.append({
                "timestamp": e["timestamp"],
                "alert": "Domain Admins group modified",
                "details": e
            })
    return alerts

if __name__ == "__main__":
    ad = build_mock_ad()
    events = simulate_change_events()
    alerts = detect_admin_group_changes(events)
    print("Detected Admin-Group Changes:")
    for a in alerts:
        print(a)
```

### Line-by-line explanation
- Line 1-2: Importing data modeling utilities to create simple, structured objects for AD-like entities.
- Line 4-8: Define ADObject as a lightweight data container with a distinguished name (dn), object class, and a dictionary of attributes.
- Line 10-18: build_mock_ad constructs in-memory collections of users, groups, and computers to model a small AD-like environment for safe testing.
- Line 20-27: simulate_change_events returns a small list of dictionaries representing potential AD changes and logon events in a lab.
- Line 29-37: detect_admin_group_changes scans events for group_change actions targeting Domain Admins and returns alert dictionaries for each match.
- Line 39-44: The main block runs the mock environment and prints any detected admin-group changes, illustrating how a detection might surface in a SOC-like workflow.

---

## 2. Telemetry Schema and Safe Mapping to Threat Techniques (Non-Actionable, Lab-Focused)

In real systems, telemetry feeds (logs, events) are the lifeblood of detection. This section defines a safe, lab-focused telemetry schema and a high-level mapping to MITRE ATT&CK techniques, without providing real-world exploitation steps. The goal is to enable you to design engines that classify events into techniques for detection and alerting within a controlled environment.

```python
from typing import Dict, Any, List

# Safe telemetry schema for lab AD events
TELEMETRY_SCHEMA: Dict[str, type] = {
    "timestamp": str,
    "source": str,
    "event_id": int,
    "user": str,
    "description": str,
    "tags": List[str],
}

# High-level mapping to MITRE ATT&CK techniques (non-actionable in lab)
TECHNIQUE_MAP: Dict[str, str] = {
    "T1003": "Credential Access",
    "T1036": "Masquerading",
    "T1059": "Command and Scripting Interpreter",
    "T1078": "Valid Accounts",
}
```

```python
from typing import Dict, Any, List

def tag_events_with_techniques(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    tagged = []
    for e in events:
        # naive heuristic: if log contains "admin" in description, tag as credential access
        description = e.get("description","")
        tags = e.get("tags", [])
        if "admin" in description.lower():
            tags = tags + ["T1003"]
        elif "logon" in description.lower():
            tags = tags + ["T1036"]
        e = dict(e)
        e["tags"] = list(set(tags))
        tagged.append(e)
    return tagged
```

### Line-by-line explanation
- Telemetry_SCHEMA definition: Establishes expected fields and types for lab telemetry, enabling consistent parsing and validation in detection pipelines.
- TECHNIQUE_MAP: Provides a high-level, non-operational mapping from event themes to MITRE technique labels, useful for dashboards and reporting in training labs.
- tag_events_with_techniques: Iterates over events, uses simple textual cues to assign technique tags, and returns a new list with updated tags. This demonstrates how telemetry enrichment could feed a SIEM or analytics layer in a safe environment.

---

## 3. Detection Engine in a Safe Lab: From Telemetry to Alerts

This section shows a safe, pretend-detection engine that ingests lab telemetry and surfaces alerts for suspicious AD-like activity. The goal is to illustrate how you would structure detection logic, test it in a controlled dataset, and reason about alert quality without enabling real attacks.

```python
from datetime import datetime

def detect_suspicious_patterns(logs):
    alerts = []
    for log in logs:
        t = log.get("timestamp", "")
        user = log.get("user", "")
        event = log.get("event", log.get("type", ""))
        # Try to parse the timestamp; if parsing fails, skip time-based checks
        try:
            dt = datetime.fromisoformat(t.replace("Z", "+00:00"))
        except Exception:
            dt = None

        # Rule: Domain Admins group modification
        if log.get("type") == "group_change" and log.get("target_group") == "Domain Admins":
            alerts.append({"timestamp": t, "alert": "Domain Admins membership change detected", "log": log})

        # Rule: Unusual logon time (lab-safe heuristic)
        if log.get("type") == "logon" and dt is not None and dt.hour < 6:
            alerts.append({"timestamp": t, "alert": "Unusual early-morning logon detected", "log": log})

    return alerts
```

```python
# Example usage with a small in-lab log set
import json

sample_logs = [
    {"timestamp":"2025-08-01T02:15:00Z", "type":"logon", "user":"alice", "host":"workstation1"},
    {"timestamp":"2025-08-01T14:22:10Z", "type":"group_change","target_group":"Domain Admins","performed_by":"eve"},
    {"timestamp":"2025-08-01T03:01:05Z", "type":"group_change","target_group":"Developers","performed_by":"mallory"},
]

alerts = detect_suspicious_patterns(sample_logs)
print("Alerts:")
print(json.dumps(alerts, indent=2))
```

### Line-by-line explanation
- Line 1: Import datetime to parse ISO-like timestamps for time-based detections.
- Line 3-19: detect_suspicious_patterns iterates over each log, parses the timestamp when possible, and applies two safe rules: (a) detect changes to Domain Admins group, (b) flag logons during atypical hours (before 6 AM in lab context). Each match yields an alert dict with a timestamp, message, and the original log payload.
- Line 22-31: Sample usage demonstrates how to feed a small set of lab logs into the detector and print structured alerts. This is a safe demonstration in a contained dataset.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code (side-by-side)

- Pitfall 1: Hard-coding secrets or keys in code
  - Bad:
    ```python
    # Bad: secret key embedded in source
    API_KEY = "supersecretkey"
    ```
  - Good:
    ```python
    import os
    API_KEY = os.environ.get("API_KEY")
    ```
  - Line-by-line explanation (for both blocks)
    - Bad: Exposes secrets, risk if repo is leaked; hard to rotate; not environment-aware.
    - Good: Reads from environment, enabling secret management and rotation outside code.

- Pitfall 2: Using bare except blocks and swallowing errors
  - Bad:
    ```python
    try:
        run_detection()
    except:
        pass
    ```
  - Good:
    ```python
    try:
        run_detection()
    except ValueError as e:
        log_error(e)
        raise
    ```
  - Line-by-line explanation
    - Bad: Silences errors, hides root causes, hampers debugging and reliability.
    - Good: Catches specific exceptions, logs, and optionally re-raises or handles gracefully.

- Pitfall 3: Relying on global mutable state
  - Bad:
    ```python
    state = {}
    def add_member(x):
        state[x] = True
    ```
  - Good:
    ```python
    def add_member(state, x):
        new_state = state.copy()
        new_state[x] = True
        return new_state
    ```
  - Line-by-line explanation
    - Bad: Hard to test, thread-unsafe, and leads to surprising side effects.
    - Good: Explicit state passing and return of new state improves testability and determinism.

- Pitfall 4: Inadequate input validation
  - Bad:
    ```python
    def parse_event(line):
        parts = line.split(",")
        return {"timestamp": parts[0], "user": parts[1]}
    ```
  - Good:
    ```python
    def parse_event(line):
        parts = line.split(",")
        if len(parts) < 2:
            raise ValueError("malformed line")
        ts, user = parts[0], parts[1]
        return {"timestamp": ts, "user": user}
    ```
  - Line-by-line explanation
    - Bad: Assumes well-formed input, leading to index errors.
    - Good: Validates structure, raises clear errors, improving reliability.

- Pitfall 5: Hard-to-read, unstructured logging
  - Bad:
    ```python
    log("err", "something went wrong", {"code": 500})
    ```
  - Good:
    ```python
    import logging
    logger = logging.getLogger(__name__)
    logger.error("Detection engine failed", extra={"code": 500, "location": "detector.py:85"})
    ```
  - Line-by-line explanation
    - Bad: Sparse, difficult to correlate across systems.
    - Good: Structured logs with context, easier to query in SIEM.

---

## Y. Why This Matters In Real Systems — production context and real usage

Active Directory sits at the heart of many enterprise environments. Red teaming in AD helps you validate defenses, incident response, and detection rules in a realistic, controlled setting. Real systems rely on telemetry from Windows Event Logs, Security logs, PowerShell transcripts, logon sessions, GPO changes, and directory modification events. Effective practice includes:
- Designing telemetry schemas that capture the right signals, with consistent normalization for SIEM ingestion.
- Building detection rules that minimize false positives while still surfacing meaningful anomalies, such as unusual logon times, unexpected privilege changes, or anomalous group membership actions.
- Aligning red-team objectives with organizational policies, risk tolerances, and legal/ethical boundaries; always operate in an authorized lab or engagement with explicit permission.
- Creating playbooks for defenders: triage steps, evidence collection, containment, and post-incident review.
- Documenting mappings to MITRE ATT&CK techniques at a high level to communicate risk and control gaps to stakeholders, without exposing operational exploitation details.

In production, these capabilities translate into safer, auditable security tests, faster detection engineering cycles, and stronger resilience against real AD abuse attempts.

---

## Z. Study Questions — 5 recall questions

1. What is the primary purpose of a red-team exercise focused on Active Directory in an enterprise context?
2. Name two safe telemetry signals you would collect in a lab to indicate potential AD abuse.
3. What is MITRE ATT&CK, and how is it useful in mapping AD abuse signals to defensive detections?
4. Why is it important to test detection logic in a controlled lab rather than on live production AD?
5. Describe one common pitfall when writing detection code and how to mitigate it.

---

## Exercise — Practical multi-part coding challenge

Part A — Create a safe AD telemetry dataset
- Build a small in-memory dataset representing AD-like entities (users, groups, computers) and a few event records (group changes, logons) as shown in the labs above.
- Output the dataset as a JSON array of event records suitable for ingestion by a detector.

Part B — Implement a detector for Domain Admins changes
- Write a function detect_admin_group_changes(events) that returns a list of alerts when a Domain Admins group change event is observed.
- Run the detector on your sample dataset and print the resulting alerts.

Part C — Add time-based detection
- Extend the detector to flag logon events that occur outside typical lab hours (e.g., before 6 AM or after 8 PM local lab time).
- Ensure parsing of ISO 8601 timestamps and robust handling of malformed timestamps.

Part D — Tie the detector to a lightweight telemetry enrichment
- Implement a simple tag_events_with_techniques(events) function (as shown in Section 2) that adds a technique tag based on the event description.
- Run the enrichment on your event set, then pass the enriched events to the detector and print combined results.

Part E — Reflective write-up
- Document your design decisions, potential false positives, and suggested mitigations or monitoring improvements for a real AD environment.
- Propose at least two defense-oriented enhancements you would add to a production lab, such as additional detectors, SIEM rules, or alert dashboards.

Notes for safe practice:
- All code and data used in this lesson are designed for a controlled, authorized lab environment and do not interact with real Active Directory.
- Do not attempt real AD exploitation outside a sanctioned engagement. Always use isolated test labs and obtain written permission for red-team activities.