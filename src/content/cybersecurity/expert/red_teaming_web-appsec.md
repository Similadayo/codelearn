# Phase 5: Advanced Topics — Red Teaming & Active Directory Abuse (Web App Security)

Red teaming and Active Directory (AD) abuse are advanced topics in modern security practice. This lesson explores how adversaries think about AD within enterprise environments, how red teams emulate real-world pressure in a controlled lab, and how defenders detect and mitigate AD-focused abuse that can threaten web applications and overall system integrity. You’ll gain hands-on, defensive compute examples in PowerShell that illustrate common AD abuse patterns in a safe, lab-oriented context, along with guidelines for production environments and risk-aware testing.

## 1. Red Teaming Fundamentals in AD Context

Red teaming in the AD domain aims to mimic real attacker behavior to uncover gaps in detection, response, and governance. In the context of web app security, AD often anchors identity, access control, and resource authorization. The goal is to validate how privilege boundaries affect web app access, API consent, and data exposure across the network. Key ideas:
- Scope and rules of engagement (ROE): define what is permissible, what constitutes data exfiltration, and how movement should be contained.
- Emulation vs exploitation: emphasize detection and response over weaponization; avoid destructive actions.
- Safe AD visibility: use read-only or simulated changes in a lab; build datasets that mirror abuse scenarios without altering real permissions.

```powershell
# Safe AD reconnaissance for defense – map user-to-group associations (lab-safe)
# Note: This script is for defense/detection practice in a lab.
$dangerGroupNames = @('Domain Admins','Enterprise Admins','Administrators','Schema Admins')

# Resolve distinguished names for dangerous groups (read-only)
$dangerGroupDNs = @()
foreach ($name in $dangerGroupNames) {
    $grp = Get-ADGroup -Filter "Name -eq '$name'"
    if ($grp) { $dangerGroupDNs += $grp.DistinguishedName }
}

# Enumerate all users and their group memberships in a read-only fashion
$allUsers = Get-ADUser -Filter * -Properties MemberOf
$results = foreach ($u in $allUsers) {
    $associatedGroups = @()
    foreach ($dn in $u.MemberOf) {
        if ($dangerGroupDNs -contains $dn) {
            $grpName = (Get-ADGroup -Identity $dn).Name
            $associatedGroups += $grpName
        }
    }
    [PSCustomObject]@{
        SamAccountName = $u.SamAccountName
        AdminGroups = ($associatedGroups | Sort-Object) -join ';'
    }
}

$results
```
### Line-by-line explanation
- $dangerGroupNames = ...: Define which AD groups are considered high-risk (e.g., Domain Admins). This sets the scope for the check.
- $dangerGroupDNs = @(): Initialize a list to store Distinguished Names (DNs) of dangerous groups.
- foreach ($name in $dangerGroupNames) { ... }: Loop through each dangerous group name.
- $grp = Get-ADGroup -Filter "Name -eq '$name'": Retrieve the AD group object by name (read-only).
- if ($grp) { $dangerGroupDNs += $grp.DistinguishedName }: If found, store its DN for later membership checks.
- $allUsers = Get-ADUser -Filter * -Properties MemberOf: Get every user and their group memberships (read-only).
- foreach ($u in $allUsers) { ... }: Iterate over users.
- foreach ($dn in $u.MemberOf) { ... }: For each group DN the user belongs to:
  - if ($dangerGroupDNs -contains $dn): Is this user a member of a dangerous group?
  - $grpName = (Get-ADGroup -Identity $dn).Name: Resolve the group name for readability.
  - $associatedGroups += $grpName: Track dangerous groups the user belongs to.
- [PSCustomObject]@{ ... }: Emit a simple object with the user and any dangerous groups found.
- $results: Output the assembled results.

## 2. Active Directory Attack Surfaces: Tactics at a High Level

Understanding typical AD abuse patterns helps designers build detection rules, alerting, and response playbooks. Common attack surfaces include credential theft, privilege escalation, and lateral movement that leverage AD identities for web app access, API calls, or service accounts. In production, you’ll pair this understanding with instrumentation (logging, SIEM rules, EDR telemetry) to catch behavior like privileged logons, unusual permission changes, or abnormal domain trust activity.

```powershell
# Safe AD monitoring: detect potentially suspicious AD activity from the Windows Security Event Log
# This script reads last 24 hours of select event IDs that are commonly associated with AD abuse.
$startTime = (Get-Date).AddHours(-24)
$eventIds = 4624, 4625, 4672, 4728, 4729, 4732, 4733, 4740, 4768, 4769

$filter = @{
    LogName   = 'Security'
    StartTime = $startTime
    Id        = $eventIds
}

try {
    $events = Get-WinEvent -FilterHashtable $filter -ErrorAction Stop
} catch {
    Write-Error "Failed to read security event logs: $_"
    exit 1
}

# Simple summary: count events by ID to surface spikes
$summary = $events | Group-Object Id | ForEach-Object {
    [PSCustomObject]@{ EventId = $_.Name; Count = $_.Count }
}
$summary
```
### Line-by-line explanation
- $startTime = (Get-Date).AddHours(-24): Define the window of interest (last 24 hours) for events to analyze.
- $eventIds = 4624, 4625, 4672, 4728, 4729, 4732, 4733, 4740, 4768, 4769: Select common AD-related events that often surface credential use, privilege changes, or logon anomalies.
- $filter = @{ ... }: Build a filter hash for Get-WinEvent to query the Security log with a time range and specific event IDs.
- try { $events = Get-WinEvent -FilterHashtable $filter -ErrorAction Stop } catch { ... }: Attempt to fetch events; if something goes wrong, log and exit safely.
- $events | Group-Object Id | ForEach-Object { ... }: Group events by their ID to summarize volumes per event type.
- [PSCustomObject]@{ EventId = $_.Name; Count = $_.Count }: Create a simple object showing event type and count for quick inspection.
- $summary: Output the high-level summary of suspicious activity volumes.

## 3. Active Directory Permissions Abuse Simulations (Safe)

A common abuse scenario is when users gain privileged access through misconfigured group memberships or delegation. In a safe lab, you can audit who belongs to highly privileged groups and highlight potential risk, without changing anything.

```powershell
# Safe audit: identify users who are members of Domain Admins or Enterprise Admins
$dangerGroupNames = @('Domain Admins','Enterprise Admins','Administrators')
$dangerGroupDNs = @()
foreach ($name in $dangerGroupNames) {
    $g = Get-ADGroup -Filter "Name -eq '$name'"
    if ($g) { $dangerGroupDNs += $g.DistinguishedName }
}

$users = Get-ADUser -Filter * -Properties MemberOf
$potentialPrivUsers = foreach ($u in $users) {
    $badGroups = @()
    foreach ($dn in $u.MemberOf) {
        if ($dangerGroupDNs -contains $dn) {
            $badGroups += (Get-ADGroup -Identity $dn).Name
        }
    }
    if ($badGroups.Count -gt 0) {
        [PSCustomObject]@{
            User = $u.SamAccountName
            AdminGroups = ($badGroups | Sort-Object) -join ', '
        }
    }
}
$potentialPrivUsers | Where-Object { $_ -ne $null }
```

### Line-by-line explanation
- $dangerGroupNames = @('Domain Admins','Enterprise Admins','Administrators'): List of high-privilege groups to check against.
- $dangerGroupDNs = @(): Initialize a container for DNs of those groups.
- foreach ($name in $dangerGroupNames) { ... }: For each dangerous group name:
  - $g = Get-ADGroup -Filter "Name -eq '$name'": Fetch the group object.
  - if ($g) { $dangerGroupDNs += $g.DistinguishedName }: Save the DN if the group exists.
- $users = Get-ADUser -Filter * -Properties MemberOf: Get users and their membership, in a read-only audit context.
- foreach ($u in $users) { ... }: Iterate users to inspect their memberships.
- foreach ($dn in $u.MemberOf) { ... }: Check each group the user belongs to:
  - if ($dangerGroupDNs -contains $dn) { ... }: If membership is in a dangerous group:
  - $badGroups += (Get-ADGroup -Identity $dn).Name: Record the group name for readability.
- if ($badGroups.Count -gt 0) { ... }: If any dangerous memberships were found for the user, emit a result row.
- $potentialPrivUsers: Output of users with privileged group membership.

## X. Common Beginner Mistakes

Below are real pitfalls with side-by-side bad vs good code. Each pair highlights safer, more robust patterns in AD-related scripting and red-team-like exercises.

- Pitfall 1: Unfiltered AD queries that pull everything and then filter client-side.
  - Bad:
    ```powershell
    # Bad: pulling all users then filtering locally
    $users = Get-ADUser -Filter * -Properties MemberOf
    $privUsers = $users | Where-Object { $_.MemberOf -match 'Domain Admins' }
    ```
  - Good:
    ```powershell
    # Good: filter on server side when possible
    $privUsers = Get-ADUser -Filter "MemberOf -like '*Domain Admins*'" -Properties MemberOf
    ```
  Explanation: Server-side filtering reduces network load and memory usage; use LDAP/PowerShell filters to limit data.

- Pitfall 2: Embedding credentials in scripts.
  - Bad:
    ```powershell
    # Bad: plaintext or insecure handling
    $cred = New-Object System.Management.Automation.PSCredential("domain\user", (ConvertTo-SecureString "P@ssw0rd" -AsPlainText -Force))
    ```
  - Good:
    ```powershell
    # Good: prompt for credentials or use a secure vault
    $cred = Get-Credential
    ```
  Explanation: Do not hard-code credentials. Favor interactive prompts or vaults (Windows Credential Manager, CI secrets).

- Pitfall 3: Not handling errors or failing fast.
  - Bad:
    ```powershell
    Get-WinEvent -FilterHashtable $filter -ErrorAction SilentlyContinue
    ```
  - Good:
    ```powershell
    try {
      Get-WinEvent -FilterHashtable $filter -ErrorAction Stop
    } catch {
      Write-Error "Event log read failed: $_"
      # Optional: exit or fallback
    }
    ```
  Explanation: Proper error handling improves reliability in production-like labs and reduces silent failures.

- Pitfall 4: Assuming all AD groups are present or that membership lists are complete.
  - Bad:
    ```powershell
    $groups = Get-ADUser -Filter * -Properties MemberOf
    foreach ($g in $groups.MemberOf) { Write-Output $g }
    ```
  - Good:
    ```powershell
    foreach ($dn in $user.MemberOf) {
      try {
        (Get-ADGroup -Identity $dn).Name
      } catch {
        # Handle missing/moved groups gracefully
        $dn
      }
    }
    ```
  Explanation: AD objects can be moved or renamed; code should gracefully handle missing groups or stale DNs.

- Pitfall 5: Over-privileging scripts in production settings.
  - Bad:
    ```powershell
    # Script runs as admin and can read or modify sensitive data
    # No audit trail
    ```
  - Good:
    ```powershell
    # Run with least privilege; log all sensitive actions
    Start-Transcript -Path "C:\Logs\ad_script.log" -Append
    # ... script body ...
    Stop-Transcript
    ```
  Explanation: Restrict privileges of automation, and maintain an audit trail for detection and post-incident analysis.

## Y. Why This Matters In Real Systems

In real enterprise environments, red teams simulate attacker paths across AD to reveal how identity, access, and web app integrations can be abused. Why it matters:
- Privilege escalation is a common objective for attackers seeking persistence and access to web apps, CI/CD pipelines, and sensitive data stores.
- Web apps often rely on AD for authentication and authorization. Spoofed or compromised AD identities can bypass app controls, leading to data leakage or unauthorized actions.
- Detected AD abuse patterns feed into SOC workflows: SIEM correlation rules, EDR telemetry, and incident response playbooks. Early detection reduces dwell time and containment needs.
- Defenses rely on least privilege, rigorous auditing (who has which rights), and robust change management for AD ACLs and delegation. Regular red-team-to-blue-team exercise cycles improve detection and response readiness.

Real systems require:
- Centralized auditing of AD changes (group membership, ACL updates, delegation).
- Effective alerting for privileged logons and anomalous authentication events.
- Segmentation between web app identity layers and sensitive AD operations.
- Safe, sanctioned lab practices to validate detection logic without impacting production.

## Z. Study Questions

1. What is the primary objective of a red team exercise in an AD-enabled enterprise?
2. Name two Windows Security Event IDs commonly investigated to detect privilege escalation or unusual logons.
3. Why is server-side filtering (in AD queries) generally preferred over client-side filtering?
4. How can you reduce the risk of credential exposure in automation scripts?
5. In a production SOC, how would you translate red-team findings into concrete defense improvements for web applications?

## Exercise

Part A – Build a Defender-focused AD Audit Script (PowerShell)
- Objective: Write a script that identifies users who are members of Domain Admins or Enterprise Admins and outputs a compact report.
- Requirements:
  - Use safe, read-only queries to enumerate members of the dangerous groups.
  - Produce a CSV report with columns: User, AdminGroups.
  - Include basic error handling and a short summary of counts.
- Deliverable: A single .ps1 script file or a block of code you can paste into a lab console.

Part B – Detect Suspicious Logon Patterns (PowerShell)
- Objective: Create a script that reads the last 24 hours of security events for IDs 4624, 4625, and 4672, and prints a simple alert count per ID.
- Requirements:
  - Use Get-WinEvent with a proper filter.
  - Print a concise summary suitable for daily review.
  - Include a try/catch block for robust error handling.
- Deliverable: Script snippet.

Part C – Safe Lab Simulation: Detect and Report (Combined)
- Objective: Create a small data-driven lab exercise using a CSV of mock AD events (Time, EventId, User, SourceIP, LogonType).
- Requirements:
  - Import-Csv the dataset.
  - Flag suspicious patterns (e.g., EventId 4624 with LogonType 3 from unusual SourceIP ranges).
  - Output a final “suspicious activities” report to a file and print to console.
- Deliverable: A runnable script that processes the sample dataset.

Notes:
- All scripts above assume a safe, isolated lab environment (not connected to production AD) and use standard PowerShell AD cmdlets.
- Adapt paths, group names, and event IDs to fit your lab’s configuration.
- Do not run destructive operations (e.g., modifying ACLs or deleting accounts) in training environments unless you have explicit authorization and a safe rollback plan.

If you’d like, I can tailor these sections to match a specific lab setup (e.g., a provided AD test domain, a sample AD event CSV, or a GitHub repository with test data) and attach ready-to-run scripts in a workspace-friendly format.