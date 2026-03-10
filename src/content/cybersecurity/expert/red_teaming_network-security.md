# Track: Cyber Security — Module: Phase 5 — Advanced Topics — Topic: Red Teaming & Active Directory Abuse

Red Teaming in the context of Active Directory (AD) focuses on simulating adversary behavior to uncover weaknesses in controls, configurations, and monitoring. This lesson teaches safe, lab-focused approaches to understanding AD abuse patterns from a red-teaming perspective, while emphasizing detection, containment, and risk reduction in real systems. You’ll learn to model AD-like structures, map actions to MITRE ATT&CK techniques, and design defensive detections that minimize risk while still exercising realistic tactics in a controlled environment.

## 1. Red Teaming and Active Directory: Concepts, Scope, and Safe Practice

- Concept: Red Teaming in AD involves emulating attacker behaviors within a consented environment to validate security controls, detection, and response capabilities. It emphasizes lawful engagement, scope, and reproducible assessments.
- Why it matters professionally: AD is the backbone of many enterprise identities and access control decisions. Weak configurations, mispermissions, or lax monitoring can enable lateral movement and privilege escalation. A well-scoped red-team exercise helps teams harden defenses, improve incident response, and prove security posture to stakeholders.

```python
# Safe, mock AD model (no real endpoints or credentials)
# This is a lightweight, in-memory representation for training and detection practice only.

from dataclasses import dataclass, field
from typing import List, Dict

@dataclass
class User:
    name: str
    user_id: str
    password_hash: str = ""  # empty or "weak" simulates weak auth in a lab
    groups: List[str] = field(default_factory=list)

@dataclass
class Group:
    name: str
    gid: str
    members: List[str] = field(default_factory=list)
    permissions: List[str] = field(default_factory=list)

@dataclass
class MockAD:
    users: Dict[str, User] = field(default_factory=dict)
    groups: Dict[str, Group] = field(default_factory=dict)

    def add_user(self, user: User):
        self.users[user.user_id] = user

    def add_group(self, group: Group):
        self.groups[group.gid] = group

    def add_user_to_group(self, user_id: str, gid: str):
        user = self.users[user_id]
        group = self.groups[gid]
        if gid not in user.groups:
            user.groups.append(gid)
        if user_id not in group.members:
            group.members.append(user_id)

# Example lab setup (no real AD interactions)
lab = MockAD()

lab.add_user(User(name="Alice Admin", user_id="U1", password_hash="weak"))
lab.add_user(User(name="Bob User", user_id="U2", password_hash="strong"))
lab.add_group(Group(name="Administrators", gid="G-A", permissions=["full_control"]))
lab.add_group(Group(name="Users", gid="G-U", permissions=["read"]))

lab.add_group_to_user = lab.add_user_to_group
lab.add_user_to_group("U1", "G-A")
lab.add_user_to_group("U2", "G-U")
```

### Line-by-line explanation
- import lines: Bring in dataclass functionality and typing for clean data models.
- @dataclass User: Defines a simple user with a name, ID, password status, and group memberships.
- @dataclass Group: Defines a group with a name, ID, member list, and permissions (simulated).
- @dataclass MockAD: Container for users and groups with helpers to mutate state.
- add_user/add_group: Add objects to the in-memory store.
- add_user_to_group: Establish a membership relationship in both user and group records.
- lab setup: Creates a small lab environment with one “Administrators” group (high privilege) and one normal user.
- Example calls: Demonstrate adding users to groups to model typical AD membership.

## 2. Safe AD Surface Understanding: Enumerating and Detecting Misconfigurations (Lab-Only)

- Concept: In real environments, attackers enumerate objects and permissions. In a safe lab, you model similar surfaces to practice detection and remediation without touching real systems.
- Practice goals: Identify over-privileged groups, nested memberships, and weak authentication signals in a mock AD.

```python
from typing import List

def find_overprivileged_entries(ad: MockAD) -> List[str]:
    """Return a list of users who are in admin-like groups and have weak auth signals."""
    results: List[str] = []
    for gid, grp in ad.groups.items():
        if "Admin" in grp.name or "Administrators" in grp.name:
            for user_id in grp.members:
                user = ad.users[user_id]
                # Lab-only heuristic for weak auth
                if user.password_hash in ("", "weak"):
                    results.append(f"{user.name} is in privileged group {grp.name} with weak auth.")
    return results

# Run the detection on the lab AD
alerts = find_overprivileged_entries(lab)
for a in alerts:
    print(a)
```

### Line-by-line explanation
- import List: For typing the function return.
- def find_overprivileged_entries(ad): Defines a detector over the MockAD instance.
- results = []: Initialize storage for findings.
- for gid, grp in ad.groups.items(): Iterate all groups.
- if "Admin" in grp.name ...: Identify admin-like groups by name.
- for user_id in grp.members: Inspect each member of the privileged group.
- user = ad.users[user_id]: Retrieve the User object for evaluation.
- if user.password_hash in ("", "weak"): Simple lab heuristic for weak authentication status.
- results.append(...): Record a finding describing the relationship and weakness.
- return results: Provide the list of detected issues.
- alerts = find_overprivileged_entries(lab): Execute the detector on the lab instance.
- print each alert: Produce human-readable output for review.

### Notes
- This is intentionally abstract and lab-focused. Real-world AD assessments would use auditing/logging data, not direct code checks.
- The detector focuses on visibility into over-privileged configurations and weak credentials in a safe, reproducible way.

## 3. Tying Red Team Concepts to Reality: ATT&CK Mapping and Safe Event Simulation

- Concept: Align red-team-like activities with MITRE ATT&CK techniques to improve detection engineering and alert triage. Use a safe, mock event stream to simulate how a defender would observe activity.
- Practice goals: Build a small event generator that tags actions with technique IDs, and provide a simple detection view that flags suspicious sequences without exposing real attack steps.

```python
from typing import Dict, List

def generate_events(ad: MockAD) -> List[Dict]:
    """Create a small, safe event stream with technique tags for practice."""
    events = []
    # A benign session
    events.append({"time": "2025-01-01T12:00:00Z", "user": "Alice Admin", "action": "logon", "techniques": ["T1078"]})
    # A membership change that could be suspicious in real environments
    events.append({"time": "2025-01-01T12:05:00Z", "user": "Alice Admin", "action": "group_add_member", "target_group": "Administrators", "member": "Bob User", "techniques": ["T1069"]})
    return events

def simple_detection(events: List[Dict]) -> List[str]:
    """Very basic detector that flags a group membership change involving admin groups."""
    flags = []
    for e in events:
        if e["action"] == "group_add_member" and "Administrators" in e.get("target_group", ""):
            flags.append(f"Suspicious membership: {e['user']} added {e['member']} to {e['target_group']}")
    return flags

events = generate_events(lab)
detections = simple_detection(events)
for d in detections:
    print(d)
```

### Line-by-line explanation
- from typing import Dict, List: Import typing helpers for clarity.
- generate_events: Creates a safe, mocked event stream with technique tags.
- events.append(...): Adds a logon event for Alice, tagged with a benign technique T1078 (valid accounts in ATT&CK).
- events.append(...): Adds a group membership change event, tagged with T1069-like grouping concept (permission changes), to illustrate detection logic.
- simple_detection: A lightweight rule-based detector that looks for admin-group membership changes.
- for e in events: Iterate events and apply the rule.
- if e["action"] == "group_add_member" and "Administrators" in e.get("target_group", ""): Rule condition for suspicious admin-group changes.
- print(detections): Output detected items for review.

### Notes
- The technique IDs are illustrative and intentionally non-operational; they help learners map to real ATT&CK concepts without enabling misuse.
- In real deployments, detections would rely on SIEM data, Windows Event Logs, and AD-change auditing rather than in-memory simulations.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Mistake 1: Hard-coding credentials in tests
  - Bad:
    ```python
    # Bad: credentials hard-coded in source
    AD_USERNAME = "admin"
    AD_PASSWORD = "P@ssw0rd!"
    ```
  - Good:
    ```python
    # Good: load from environment variables or a vault stub
    import os
    AD_USERNAME = os.getenv("AD_TEST_USER")
    AD_PASSWORD = os.getenv("AD_TEST_PASSWORD")
    ```
- Mistake 2: Trusting API responses without validation
  - Bad:
    ```python
    def get_user_roles(user_id):
        return ad_api.get_roles(user_id)  # assume always valid
    ```
  - Good:
    ```python
    def get_user_roles(user_id):
        resp = ad_api.get_roles(user_id)
        if resp.status_code != 200:
            raise RuntimeError("API error fetching roles")
        roles = resp.json()
        if not isinstance(roles, list):
            raise ValueError("Unexpected roles schema")
        return roles
    ```
- Mistake 3: Testing against production AD
  - Bad:
    ```bash
    # Danger: directly targets prod AD
    ./audit_ad.sh --target corp-prod
    ```
  - Good:
    ```bash
    # Safe: isolated lab environment
    ./audit_ad.sh --target ad_lab
    ```
- Mistake 4: Exposing sensitive data in logs
  - Bad:
    ```python
    print(f"User {user.name} password: {user.password_hash}")
    ```
  - Good:
    ```python
    print(f"User {user.name} group_count={len(user.groups)}")
    ```
- Mistake 5: Narrow detection perspective
  - Bad:
    ```python
    if "Admin" in grp.name:
        alert("Admin-like group detected")  # overly simple
    ```
  - Good:
    ```python
    # Consider multiple signals: nested groups, direct admin membership, and unusual time of changes
    if "Admin" in grp.name or any(m in admin_like_names for m in grp.members):
        alert("Admin-like group detected with multiple signals")
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Real AD environments are complex, dynamic, and integrated across identity, access, and auditing pipelines. Red-team simulations highlight:
  - Misconfigurations: Directly placing users into highly privileged groups, overly permissive ACLs, or weak password policies.
  - Detection gaps: Missing, delayed, or noisy alerts for privilege changes, lateral movement indicators, or anomalous authentication patterns.
  - Response gaps: Containment, privileged account rotation, and incident playbooks that aren’t exercised regularly.
- Best practices for real systems:
  - Enforce least privilege and just-in-time access where possible.
  - Enable comprehensive auditing (directory services, domain controller logs, security logs).
  - Build detection rules that combine multiple signals (auth events, group membership changes, and resource access patterns).
  - Conduct legally compliant, permissioned red-team exercises with defined scopes, rollback plans, and post-engagement reporting.
  - Use lab environments or sandboxed domains for exercise scenarios to avoid impacting production systems.
- In defense, map every AD-related finding to MITRE ATT&CK techniques, prioritize by risk, and integrate remediation into change management.

## Z. Study Questions — 5 recall questions

1. What is the primary purpose of a red-team exercise in an Active Directory environment?
2. Why is it important to map AD-related activities to MITRE ATT&CK techniques?
3. Name two common misconfigurations in AD that can enable privilege escalation.
4. What are safe practices for testing AD-related detections in real environments?
5. How can you distinguish between legitimate admin-group changes and suspicious activity in a detection rule?

## Exercise — a practical multi-part coding challenge

Part A: Build a small in-memory AD model (Python)
- Create a module that defines User and Group classes and an in-memory AD view with at least three users and two groups (one admin-like group and one standard group).
- Establish membership relationships to reflect typical organizational structures.

Part B: Implement a detection rule for admin-group membership
- Write a function that identifies users who are direct members of an admin group or who are members of nested admin-like groups.
- Extend the model to support nested groups if feasible.

Part C: Create a safe event generator and a detection harness
- Implement a simple event generator that emits events such as logon, group_add_member, and group_change with technique tags (non-operational).
- Implement a detection function that processes the events and flags suspicious admin-group changes.

Part D: Execute and review
- Run the exercise with a small lab dataset. Modify a user's group membership to trigger the detector and verify the output.
- Document the detected events, the rationale, and any false positives you observed. Propose mitigations.

Deliverables
- A README describing the lab setup, data model, and detection rules.
- A Python script (or a small package) implementing parts A–C with minimal dependencies.
- A short write-up explaining how the exercise maps to real-world AD abuse patterns and what defenders should prioritize in production environments.

End of lesson.