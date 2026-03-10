# Track: Cyber Security — Phase 5: Advanced Topics — Malware Analysis & Reverse Engineering (Red Teaming)

Malware analysis and reverse engineering (MA/RE) is the art and science of understanding how malicious software operates, persists, and evades defenses. In red team engagements, MA/RE enables you to profile attacker techniques, map kill chains, and craft enduring, controllable test payloads that mimic real-world threats without harming live systems. Mastery here unlocks defensive insight, improves detection rules, and strengthens adversary emulation in controlled labs.

## 1. Static Analysis Fundamentals

Static analysis is the first line of defense in MA/RE: you examine a binary without executing it to identify its behavior, capabilities, and potential persistence channels. This section provides a safe, approachable way to start with lightweight tooling and small, non-disruptive examples.

Code: A simple Python static analyzer that extracts printable strings and searches for common Windows API hints in a binary.

```python
# static_analysis.py
import sys
import re

def extract_strings(path, min_len=4):
    with open(path, 'rb') as f:
        data = f.read()
    strings = set()
    current = bytearray()
    for b in data:
        if 32 <= b <= 126:  # ASCII printable
            current.append(b)
        else:
            if len(current) >= min_len:
                strings.add(current.decode('ascii', errors='ignore'))
            current.clear()
    if len(current) >= min_len:
        strings.add(current.decode('ascii', errors='ignore'))
    return sorted(strings)

def find_api_hints(strings):
    # Heuristic: look for common Windows API names inside strings
    hints = []
    patterns = [
        'LoadLibrary', 'GetProcAddress', 'CreateFile', 'OpenProcess',
        'VirtualAlloc', 'WriteProcessMemory', 'CreateRemoteThread',
        'Sleep', 'ExitProcess'
    ]
    for s in strings:
        for p in patterns:
            if p in s:
                hints.append(s)
    return sorted(set(hints))

def main():
    if len(sys.argv) != 2:
        print("Usage: python static_analysis.py <binary>")
        sys.exit(1)

    path = sys.argv[1]
    strings = extract_strings(path, min_len=4)
    hints = find_api_hints(strings)

    print("Strings (sample):")
    for s in strings[:20]:
        print("  ", s)
    print("\nDetected API hints:")
    for h in hints:
        print("  ", h)

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- Line 1-3: Import necessary modules for file I/O and text processing.
- Line 5-14: define extract_strings to scan a binary for printable ASCII sequences, collecting strings with minimum length.
- Line 16-26: define find_api_hints to search the extracted strings for common Windows API names as quick indicators of suspicious behavior.
- Line 28-39: main() validates input, runs string extraction, derives hints, and prints a concise report.
- Line 41-42: Standard Python entry point to execute main when run as a script.

Explanation notes:
- This is a non-executive analysis that highlights what a binary might reveal without running it.
- It uses a simple heuristic (logical for beginners) to surface potential cues such as API names or persistence tricks.

## 2. Dynamic Analysis & Sandboxing

Dynamic analysis observes a binary at runtime to uncover behavior that static analysis may miss, including network activity, process injection, or file system changes. Always run samples in isolated, permission-controlled labs (VMs, sandbox, or containerized environments) and only with approved test artifacts.

Code: A safe dynamic runner that executes a binary with a timeout and captures stdout/stderr. It demonstrates how to observe output behavior without compromising host safety.

```python
# dynamic_run.py
import subprocess
import time

def run_with_timeout(cmd, timeout=5):
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        stdout, stderr = proc.communicate(timeout=timeout)
        return {
            'rc': proc.returncode,
            'stdout': stdout.decode('utf-8', errors='replace'),
            'stderr': stderr.decode('utf-8', errors='replace')
        }
    except subprocess.TimeoutExpired:
        proc.kill()
        return {'rc': None, 'stdout': '', 'stderr': 'TimeoutExpired: killed process'}

def main():
    import sys
    if len(sys.argv) != 2:
        print("Usage: python dynamic_run.py <binary>")
        sys.exit(1)
    path = sys.argv[1]
    result = run_with_timeout([path], timeout=5)
    print("Return code:", result['rc'])
    print("Stdout:\n", result['stdout'])
    print("Stderr:\n", result['stderr'])

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- Line 1-2: Import subprocess for process control and time for safety (not used directly but ready for extension).
- Line 4-15: run_with_timeout launches the target binary, captures output, and enforces a timeout to prevent hangs. It handles normal completion and timeout as distinct outcomes.
- Line 17-28: main() validates input, then runs the target binary with a 5-second cap and prints a concise result summary.
- Line 30-31: Standard Python entry point.

Notes:
- In a real lab, pair this with tracing tools (strace, dtrace) to observe system calls and signals, but do not rely solely on stdout/stderr for complete behavior.
- For Linux, you can extend to strace by running: strace -f -tt -o trace.log ./sample_bin

Code: Quick strace usage to observe system calls (shell command)

```
strace -f -tt -o trace.log ./sample_bin
```

### Line-by-line explanation
- Line 1: strace starts a trace of system calls for the target binary.
- Line 2: -f traces child processes spawned by the binary.
- Line 3: -tt logs precise timestamps for each system call.
- Line 4: -o trace.log writes the trace to a file for later analysis.
- Line 5: Executes the target binary.

Notes:
- Strace is a powerful lens into runtime behavior, especially for I/O, networking, and memory-related calls.

## 3. Disassembly & Binary Instrumentation Basics

Disassembly and instrumentation help you understand the low-level mechanics of how code executes, which is essential when emulating or mimicking attacker behavior in controlled tests or when validating defense detections.

Code: Minimal disassembly example using objdump (Linux) and a safe, tiny byte sequence with Capstone (Python) to illustrate disassembly concepts.

A) Disassembling a real binary (shell)

```
objdump -D -M intel sample_bin | sed -n '1,60p'
```

### Line-by-line explanation
- Line 1: objdump invokes the disassembler, -D disassembles all sections.
- Line 2-3: -M intel selects Intel syntax for readability; sed truncates the output to a preview window.
- Notes: Disassembly of a real binary reveals function boundaries, imports/exports, and potential obfuscation patterns.

B) Tiny Capstone-based disassembler (Python)

```python
# capstone_disasm.py
from capstone import *
CODE = b"\x55\x48\x89\xe5"  # push rbp; mov rbp, rsp
md = Cs(CS_ARCH_X86, CS_MODE_64)
for i in md.disasm(CODE, 0x1000):
    print("0x{0:x}:\t{1}\t{2}".format(i.address, i.mnemonic, i.op_str))
```

### Line-by-line explanation
- Line 1: Import Capstone library for disassembly.
- Line 3: CODE holds a tiny sequence that corresponds to a function prologue (safe and benign).
- Line 4: Create a disassembler object for x86-64 architecture.
- Line 5-7: Iterate over the disassembled instructions, printing address, mnemonic, and operands.
- Notes: This is a self-contained demonstration; replace CODE with actual bytes from an analyzed sample for real work.

C) Quick disassembly of a real binary using a script wrapper (shell + Python)

```
#!/bin/bash
BINARY="$1"
if [ -z "$BINARY" ]; then
  echo "Usage: $0 <binary>"
  exit 1
fi
objdump -D -M intel "$BINARY" | head -n 20
```

### Line-by-line explanation
- Line 1: Shebang for bash.
- Line 2-7: Capture the binary path and validate input.
- Line 9: Run objdump in Intel syntax and preview the first 20 lines.
- Notes: This provides a fast, readable entry into disassembly without heavy tooling.

## 4. Automated Analysis Pipeline (Lightweight)

An automated pipeline helps you scale MA/RE work in controlled environments: collect static results, run dynamic tests, and summarize signals in a machine-readable form for SOC/detection teams.

Code: A small Python harness that runs the static analyzer, optionally runs a dynamic check, and emits a JSON summary.

```python
# analysis_pipeline.py
import json
import subprocess
import sys
import os

def run_static(binary_path):
    result = {"strings": [], "api_hints": []}
    try:
        out = subprocess.check_output(["python", "static_analysis.py", binary_path], stderr=subprocess.STDOUT)
        lines = out.decode().splitlines()
        # Very lightweight parse: last section contains hints
        result["strings"] = [l.strip() for l in lines if l.strip().startswith("Strings (sample):") or len(l.strip()) == 0]
        result["api_hints"] = []
        for line in lines:
            if line.strip().startswith("Detected API hints:") or "  " in line:
                pass
        # In practice, you'd parse structured output; this is a teaching placeholder
    except Exception as e:
        result["error"] = str(e)
    return result

def main():
    if len(sys.argv) != 2:
        print("Usage: python analysis_pipeline.py <binary>")
        sys.exit(1)

    binary = sys.argv[1]
    static = run_static(binary)
    combined = {
        "binary": os.path.basename(binary),
        "static": static,
        "notes": "This is a lightweight scaffold for MA/RE lab reporting."
    }

    print(json.dumps(combined, indent=2))

if __name__ == '__main__':
    main()
```

### Line-by-line explanation
- Line 1-4: Import modules for JSON generation, subprocess calls, and filesystem ops.
- Line 6-23: Define run_static to invoke the static analyzer and collect a basic report. The example demonstrates integration without hard dependencies on a full MA/RE stack.
- Line 25-33: main validates input, runs the static pass, and assembles a JSON summary.
- Line 35-36: Script entry point.

Notes:
- In a real lab, extend this pipeline to persist results to a lab notebook, correlate with YARA rules, and tag artifacts with tags like “emulation,” “persistence,” or "privilege escalation."
- Guardrails: ensure sample artifacts are non-destructive and used only in a controlled environment.

## X. Common Beginner Mistakes

- Bad: Using string-based “search” on raw bytes without handling encoding or binary boundaries.
- Good: Use a proper binary-safe approach (e.g., scanning bytes and using regex on byte sequences).

- Bad: os.system("command " + user_input) for external tools.
- Good: Use subprocess.run with a list of arguments and proper error handling.

- Bad: Not closing file handles or resources; memory leaks in long-running analysts.
- Good: Use context managers (with statements) and explicit cleanup.

- Bad: Assuming strings alone reveal intent; ignoring file headers, entropy, and section structure.
- Good: Combine string extraction with section entropy checks, imports, and cross-checks against known packers.

- Bad: Running analysis in an untrusted environment or reading binaries from unknown sources without hashes.
- Good: Validate sources, verify hashes, use isolated sandboxes, and document provenance.

- Bad: Over-reliance on a single tool; tool-specific results can mislead.
- Good: Cross-validate with multiple tools (strings, objdump, radare2, Capstone) and interpret results with context.

## Y. Why This Matters In Real Systems

- Real-world red teams rely on MA/RE to simulate attacker capabilities, revealing how a system would respond to a plausible threat. By analyzing sample malware or emulated payloads in a safe lab, you can:
  - Identify persistence mechanisms and privilege escalation paths to test SOC detections and EDR rule coverage.
  - Map attacker TTPs (Tactics, Techniques, and Procedures) from code and runtime behavior to blue-team playbooks.
  - Validate detection content (YARA rules, Sigma rules) against controlled samples to improve signal-to-noise ratios.
  - Build reproducible, auditable lab artifacts (hashes, notes, and sandboxed binaries) for post-engagement debriefs.

- Production context: MA/RE feeds into threat intel, incident response playbooks, and red-teaming reports. Knowledge of static signatures, dynamic behaviors, and disassembly patterns supports:
  - Faster triage during incidents
  - Better alert tuning and reduced false positives
  - Safer, more believable attacker emulation in scoped exercises

- Ethical and legal guidelines: Always work with explicit authorization, use only lab artifacts, maintain chain-of-custody for binaries, and avoid distributing malware or exploit code outside approved contexts.

## Z. Study Questions

1. What is the primary distinction between static analysis and dynamic analysis?
2. Why is running malware samples in a sandbox essential in MA/RE training?
3. Name two common indicators in strings that might hint at API usage or persistence.
4. What is the purpose of using a disassembler like objdump or Capstone in reverse engineering?
5. What are some key considerations when building an automated MA/RE analysis pipeline for a red team lab?

## Exercise

 multi-part practical challenge to cement MA/RE skills in a safe, controlled lab.

Part A: Build a tiny static analyzer
- Objective: Create a script that extracts printable strings and looks for common Windows APIs in a provided binary.
- Steps:
  1) Implement a Python script static_analysis.py (provided in this lesson) that reads a binary, extracts strings, and surfaces API hints.
  2) Create a safe, compiled example binary that includes a few Windows API-like strings (e.g., "LoadLibraryA", "CreateFile", "OpenProcess") embedded in the text segment. You can create this as a short C program that prints a string containing these substrings and compile it into a binary.
  3) Run the static analyzer on the binary and capture the output. Use the line-by-line explanations from this lesson to interpret the results.
  4) Extend the script to return a JSON summary containing a list of strings and detected hints.

Part B: Do a safe dynamic test in a sandbox
- Objective: Observe runtime behavior without causing harm.
- Steps:
  1) Take the same binary from Part A, place it in a controlled Linux sandbox, and run it with a time limit.
  2) Use the dynamic_run.py script or strace to observe what the process prints and what system calls it makes.
  3) Document the observed behavior and correlate it with the strings/hints found in Part A.

Part C: Disassemble a tiny snippet
- Objective: Practice basic disassembly and interpretation.
- Steps:
  1) Use a small, benign binary (or the sample you created) and disassemble the first few instructions using objdump or Capstone.
  2) Write a short note on what the first few instructions do and how that aligns with the extracted strings.

Part D: Build a tiny automated report
- Objective: Produce a structured report that could feed SOC analysts.
- Steps:
  1) Run the static analyzer, dynamic tester, and disassembler steps for your binary.
  2) Generate a JSON report with fields: binary, strings, api_hints, runtime_stdout, runtime_stderr, and disassembly_preview.
  3) Write a short summary narrative interpreting the findings, including what you would test next in a larger red-team simulation.

Deliverables:
- static_analysis.py (as provided)
- dynamic_run.py (as provided)
- analysis_pipeline.py (as provided)
- capstone_disasm.py (as provided)
- 1 small C program source code that prints a string containing sample API hints (to compile into binary for Part A). 
- A sample lab report JSON produced by analysis_pipeline.py for the test binary.

Context note:
- Use only safe, non-destructive binaries in this exercise. Do not analyze or execute real-world malware. The aim is to practice MA/RE workflows in an ethical, controlled environment and to improve your ability to reason about what a sample-based malicious behavior would look like in a red-team engagement.

End of lesson.