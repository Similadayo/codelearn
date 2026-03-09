# Track: Backend Engineering — Phase 1: Language Foundations — Topic: Modules, Packages & Dependency Management (Python)

Modules and packages are the building blocks of Python code organization. They help you maintain clean, scalable backends by isolating functionality, enabling reuse, and making deployments reproducible. In professional backends, you’ll regularly create small modules for common utilities, assemble them into packages, and manage dependencies across services. Mastering these concepts reduces integration headaches, speeds up onboarding, and improves deployment reliability.

## 1. Modules vs. Packages: what they are and how Python finds them

A module is a single file of Python code (e.g., math_utils.py). A package is a directory containing a collection of modules, along with an __init__.py that designates it as a package. Python's import system searches for modules and packages along the directories in sys.path, which includes the script’s directory, PYTHONPATH, and installed site-packages.

### Code: a simple module (math_utils.py)
```python
# math_utils.py

def add(a, b):
    return a + b

def mul(a, b):
    return a * b
```

### Line-by-line explanation
- Line 1: A comment; not executed.
- Line 3: Defines a function named add with parameters a and b.
- Line 4: Returns the sum of a and b.
- Line 6: Defines a function named mul with parameters a and b.
- Line 7: Returns the product of a and b.

---

## 2. Importing modules and using names in different scopes

Importing modules lets you reuse code without duplicating logic. You can import a full module, or specific functions using from ..., as, etc. Understanding scope and import style helps avoid name clashes and improves readability in larger backends.

### Code: using a module and specific imports
```python
# main.py
import math_utils
from math_utils import add
from math import sqrt  # standard library

def main():
    print("2 + 3 =", add(2, 3))
    print("sqrt(16) =", sqrt(16))

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Line 1: Imports the entire math_utils module, bound to the name math_utils.
- Line 2: Imports the add function directly from math_utils into the current namespace.
- Line 3: Imports the sqrt function from Python’s standard math module.
- Line 5: Defines a function main to run on script execution.
- Line 6: Calls the imported add function with 2 and 3 and prints the result.
- Line 7: Calls the imported sqrt function with 16 and prints the result.
- Lines 9-10: Standard Python idiom to execute main only when the script is run directly, not when imported.

---

## 3. Packages and __init__.py: organizing modules into reusable units

A package is a directory with an __init__.py file (which can be empty or define exports). Packages allow you to structure modules hierarchically and control what the consumer imports.

### Code: package layout with __init__.py and validators
```python
# utils/__init__.py
from .validators import is_email, is_phone

# utils/validators.py
import re

EMAIL_RE = r"^[\w\.-]+@[\w\.-]+\.\w+$"

def is_email(s: str) -> bool:
    return bool(re.match(EMAIL_RE, s))

def is_phone(s: str) -> bool:
    PHONE_RE = r"^\+\d{1,3}\s\d{7,}$"
    return bool(re.match(PHONE_RE, s))
```

### Line-by-line explanation
- Line 1: In utils/__init__.py, import is_email and is_phone from the sibling validators module.
- Line 3: Start of utils/validators.py.
- Line 4: Import the regular expressions module.
- Line 6: Define a simple email regex pattern.
- Line 8: is_email checks whether s matches the EMAIL_RE pattern and returns True/False.
- Line 10: Define a phone regex pattern (e.g., +1 5551234567).
- Line 11: is_phone checks whether s matches the PHONE_RE pattern and returns True/False.

### Code: using the package
```python
# demo.py
from utils import is_email, is_phone

print(is_email("test@example.com"))  # True
print(is_email("not-an-email"))      # False

print(is_phone("+1 5551234567"))     # True
print(is_phone("555-1234"))           # False
```

### Line-by-line explanation
- Line 1: Import is_email and is_phone from the utils package (exposed by __init__.py).
- Line 3-4: Print results of is_email with a valid and invalid email.
- Line 6-7: Print results of is_phone with a valid and invalid example.

---

## 4. Dependency management and packaging basics: virtual environments, requirements, and packaging formats

In production backends, you must isolate dependencies per project, pin versions for reproducibility, and be able to ship code as packages or wheels. This section covers core practices for creating isolated environments, capturing dependencies, and packaging a Python project.

### Code: creating and using a virtual environment
```bash
# 1) Create a virtual environment
python3 -m venv venv

# 2) Activate (macOS/Linux)
source venv/bin/activate

# 3) Install a pinned dependency
pip install requests==2.31.0

# 4) Freeze dependencies for reproducibility
pip freeze > requirements.txt
```

### Line-by-line explanation
- Line 1: Invokes Python’s venv module to create an isolated environment named venv.
- Line 3: Activates the virtual environment (bash syntax; Windows uses a different script).
- Line 6: Installs a specific version of the requests library into the venv.
- Line 9: Writes the exact installed packages and their versions to requirements.txt for reproducibility.

### Code: example requirements.txt
```
# requirements.txt
requests==2.31.0
```

### Line-by-line explanation
- Line 1: Comment line for readability (not parsed by pip).
- Line 2: Pin the requests package to version 2.31.0 to avoid unexpected upgrades.

### Code: modern packaging with pyproject.toml (PEP 621)
```toml
# pyproject.toml
[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "my_package"
version = "0.1.0"
description = "A sample Python package illustrating modules, packages, and dependencies."
dependencies = [
    "requests>=2.20.0"
]
```

### Line-by-line explanation
- Line 1-4: Define build system requirements so the package can be built into distributions.
- Line 6-11: Metadata for the project, including name, version, and description.
- Line 12-15: Dependencies declared for the project (pinned or range-based).

### Code: a basic setup.py for setuptools-based packaging
```python
# setup.py
from setuptools import setup, find_packages

setup(
    name="my_package",
    version="0.1.0",
    packages=find_packages(),
)
```

### Line-by-line explanation
- Line 1: Import setup function and a utility to discover packages automatically.
- Lines 3-9: Call setup with package metadata; find_packages() locates all subpackages automatically.

### Line-by-line explanation
- These tooling choices impact how you build, test, and deploy code. For modern projects, pyproject.toml with PEP 621 is preferred; setuptools-based setup.py is still common in many codebases.

### Code: building and installing a local package (example workflow)
```bash
# From project root (where setup.py or pyproject.toml lives)
python -m build  # if using PEP 517/518 build process (requires 'build' package)
# OR
python setup.py sdist bdist_wheel  # classic approach with setuptools

# Install the built artifact locally
pip install .
```

### Line-by-line explanation
- The first command builds the distribution (sdist and wheel) if using the legacy setuptools workflow.
- The second command installs the current project as a package locally, useful for testing the packaging before publishing.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Wildcard imports can pollute the namespace and hide dependencies.
  - Bad:
    ```python
    # bad.py
    from utils import *  # wildcard import
    is_email("test@example.com")
    ```
  - Good:
    ```python
    # good.py
    from utils.validators import is_email
    is_email("test@example.com")
    ```
  - Why it matters: Wildcard imports make it unclear where names come from, increasing the risk of naming conflicts and making refactors harder.

- Pitfall 2: Not pinning dependencies in a production project.
  - Bad:
    ```
    requests
    ```
  - Good:
    ```
    requests==2.31.0
    ```
  - Why it matters: Without pinning, you risk drift in environments, tests, and deployments, leading to unpredictable behavior.

- Pitfall 3: Circular imports within a package (bad structuring and top-level side effects).
  - Bad:
    ```python
    # a.py
    from b import process
    def start():
        return process(1)

    # b.py
    from a import start
    def process(x):
        return x + 1
    ```
  - Good:
    ```python
    # a.py
    from b import process

    def start():
        return process(1)

    # b.py
    from a import a_function  # avoid circular imports; use clear interfaces instead

    def process(x):
        return x + 1
    ```
  - Why it matters: Circular dependencies can cause import-time failures and make the codebase harder to test and refactor.

- Pitfall 4: Improper package exports and confusing public API
  - Bad:
    ```python
    # utils/__init__.py
    from .validators import *  # everything exported, unclear surface
    ```
  - Good:
    ```python
    # utils/__init__.py
    from .validators import is_email, is_phone

    __all__ = ["is_email", "is_phone"]
    ```
  - Why it matters: A clean, predictable public API reduces chaos for downstream consumers and internal teams.

---

## Y. Why This Matters In Real Systems — production context and real usage

- Consistency and reproducibility: Virtual environments, pinned versions, and proper packaging ensure identical environments across development, CI, and production. This minimizes "works on my machine" issues.
- Safe deployments: Packaging (wheel/sdist) enables clean, auditable deployments. Build artifacts can be stored in artifact repositories and rolled back if needed.
- Microservice ecosystems: Teams often publish small, well-defined packages to internal registries. Proper package boundaries prevent tight coupling and enable independent versioning.
- Security and compliance: Pinning dependencies helps you track known vulnerabilities and apply patches promptly. Packaging metadata supports license auditing and dependency scanning.
- Maintainability: Clear module boundaries, explicit imports, and clean __init__ behavior reduce onboarding time for new engineers and accelerate feature work.

---

## Z. Study Questions — 5 recall questions

1. What is the difference between a Python module and a Python package?
2. How does Python determine where to find modules and packages during imports?
3. Why is it important to pin dependency versions in a production project?
4. What is the purpose of __init__.py in a package?
5. Name two common packaging formats or tools used in Python projects.

---

## Exercise — a practical multi-part coding challenge

Goal: Build a small, self-contained Python package that demonstrates modules, packaging, and dependency management. You will create a package, a consumer script, and a simple local environment to run and test it.

Part A: Create a package with calculator utilities
- 1) Create a directory structure:
  - bk_pkg/
    - __init__.py
    - calc.py
    - validators.py
- 2) Implement in bk_pkg/calc.py:
  - add(a, b)
  - sub(a, b)
  - mul(a, b)
  - div(a, b) with basic error handling for division by zero.
- 3) Implement in bk_pkg/validators.py:
  - is_positive(n) -> bool
  - is_non_negative(n) -> bool

Part B: Re-export and simple API surface
- 4) Edit bk_pkg/__init__.py to re-export these functions:
  - from .calc import add, sub, mul, div
  - from .validators import is_positive, is_non_negative
  - Define __all__ accordingly.

Part C: Consumer script
- 5) Create a top-level script consumer.py that:
  - Imports add, div, is_positive
  - Performs a small computation: (5 + 3) / 2 and checks if the result is positive
  - Prints a friendly summary

Part D: Dependency management setup (local, reproducible)
- 6) Create a Python virtual environment and install a small dependency (requests) pinned to a specific version.
- 7) Create a requirements.txt capturing the pinned dependency.
- 8) Run your consumer.py to demonstrate the package usage with a real dependency in a separate environment.

Part E: Packaging a local distribution (optional, advanced)
- 9) Create a pyproject.toml with a minimal project, including a dependency on requests (same version as in Part D).
- 10) Build a wheel locally and install it into a clean virtual environment, then run consumer.py again to demonstrate installation from a built artifact.

Deliverables:
- The bk_pkg package with __init__.py, calc.py, and validators.py.
- The consumer.py script that exercises the package.
- A requirements.txt with at least one pinned dependency.
- A brief README-style summary of steps taken and commands to reproduce.

Note: If you’re practicing in an environment without a network, you can simulate dependency management by pinning a dummy version and ensuring the packaging steps are correct in structure and commands. The important learning outcomes are module/package structure, explicit imports, and reproducible packaging workflows.