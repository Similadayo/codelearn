# Track: Cyber Security — Phase 2: Web Vulnerabilities — Introduction to Burp Suite

Burp Suite is the industry-standard toolkit for web application security assessment. In red-team engagements, it helps you map the attack surface, intercept and modify traffic, identify vulnerabilities, and automate repetitive testing tasks. This lesson introduces Burp Suite from a practical, hands-on perspective: understanding its components, writing lightweight extensions, and using it to emulate real-world attacker workflows. By the end, you’ll have a foundational ability to extend Burp’s capabilities with Java-based extensions and to integrate basic automated checks into your red-team tooling.

## 1. Burp Suite Anatomy and First Extension

In this section you’ll learn the core components of Burp Suite and how to start building your own extension. You’ll also see a minimal Java extension that logs every non-request HTTP response to Burp’s stdout. This gives you a taste of how to hook into Burp’s event model and begin automating tasks.

```java
import burp.*;

import java.io.PrintWriter;
import java.net.URL;

public class BurpExtender implements IBurpExtender, IHttpListener {
    private static final String EXTENSION_NAME = "Beginner Burp Extender";
    private IBurpExtenderCallbacks callbacks;
    private IExtensionHelpers helpers;
    private PrintWriter stdout;

    @Override
    public void registerExtenderCallbacks(IBurpExtenderCallbacks callbacks) {
        this.callbacks = callbacks;
        this.helpers = callbacks.getHelpers();
        this.stdout = new PrintWriter(callbacks.getStdout(), true);

        callbacks.setExtensionName(EXTENSION_NAME);
        callbacks.registerHttpListener(this);

        stdout.println("[" + EXTENSION_NAME + "] active");
    }

    @Override
    public void processHttpMessage(int toolFlag, boolean messageIsRequest, IHttpRequestResponse messageInfo) {
        if (!messageIsRequest) {
            // Inspect the response
            IRequestInfo reqInfo = helpers.analyzeRequest(messageInfo);
            URL url = reqInfo.getUrl();
            stdout.println("Visited: " + url);
        }
    }
}
```

### Line-by-line explanation

- Line 1-2: Import Burp interfaces and utilities needed to implement extensions.
- Line 4-6: Define the class that Burp will load as an extension.
- Line 9-13: Declare internal fields for the callbacks, helpers, and stdout logging.
- Line 15: Override registerExtenderCallbacks to initialize the extension.
- Line 16-18: Store references to Burp’s callbacks and helpers, and set up stdout.
- Line 20: Set a readable, user-facing extension name.
- Line 21: Register this class as an HTTP listener to receive traffic events.
- Line 23: Log that the extension is active.
- Line 26-33: Implement processHttpMessage to react to HTTP messages.
- Line 28: Only act on responses (skip requests for this basic example).
- Line 29-30: Analyze the response to extract the URL.
- Line 31-32: Print each visited URL to Burp’s stdout.

What this teaches you
- How to bootstrap a Burp extension.
- How to hook into Burp’s event lifecycle (HTTP messages).
- How to perform lightweight processing and logging during a red-team engagement.

## 2. Building a Simple Intruder Payload Generator

Burp Intruder is a powerful component for automated payload testing. In this section you’ll see a minimal, self-contained Intruder payload generator (XSS test payloads) and a factory to register it with Burp. This lets you automatically inject several XSS payloads against target parameters.

Code Block A: XSSPayloadGenerator.java

```java
import burp.*;

import java.util.ArrayList;
import java.util.List;

public class XSSPayloadGenerator implements IIntruderPayloadGenerator {
    private int index = 0;
    private final String[] payloads = new String[] {
        "<script>alert(1)</script>",
        "\";!--<script>alert(1)</script>",
        "<IMG SRC=javascript:alert('XSS')>"
    };

    @Override
    public boolean hasMorePayloads() {
        return index < payloads.length;
    }

    @Override
    public byte[] getNextPayload(byte[] baseValue) {
        String payload = payloads[index++];
        return payload.getBytes();
    }

    @Override
    public void reset() {
        index = 0;
    }

    @Override
    public String getPayloadName() {
        return "XSS Basic Payloads";
    }
}
```

Code Block B: XSSPayloadFactory.java

```java
import burp.*;

public class XSSPayloadFactory implements IIntruderPayloadGeneratorFactory {
    @Override
    public String getGeneratorName() {
        return "XSS Basic Payload Generator";
    }

    @Override
    public IIntruderPayloadGenerator createNewInstance(IContext context) {
        return new XSSPayloadGenerator();
    }
}
```

### Line-by-line explanation (Code Block A)

- Line 1-2: Import Burp interfaces for Intruder payloads.
- Line 4-6: Import Java utility classes.
- Line 8: Class declaration implementing IIntruderPayloadGenerator, the Burp interface Burp uses to fetch payloads.
- Line 10: Initialize an index pointer for the current payload.
- Line 11-15: Define a small, representative array of XSS payloads to test injection points.
- Line 17-19: hasMorePayloads returns true while there are remaining payloads.
- Line 21-25: getNextPayload returns the next payload as a byte array to Burp Intruder and advances the index.
- Line 27-29: reset resets the payload sequence for a new scan.
- Line 31-33: getPayloadName returns a human-friendly name for the generator.

### Line-by-line explanation (Code Block B)

- Line 1-2: Import Burp interfaces for payload generation factory.
- Line 4: Class declaration implementing IIntruderPayloadGeneratorFactory.
- Line 6-9: getGeneratorName provides a friendly name in Burp’s UI.
- Line 11-14: createNewInstance returns a new XSSPayloadGenerator instance for each insertion point or context.

How to wire these into Burp (high level)
- In your BurpExtender (the extension entrypoint), you would call:
  - callbacks.registerIntruderPayloadGeneratorFactory(new XSSPayloadFactory());
  - This makes Burp aware of your payload generator so you can select it as a generator in Intruder.

What this teaches you
- How to scaffold a basic Intruder payload generator (useful for automating red-team validation of input handling and XSS opportunities).
- How to structure a factory to register your generator with Burp’s UI and Intruder engine.
- The separation of concerns: a generator providing payloads, and a factory that Burp uses to instantiate the generator with context.

## 3. Extending Burp with a Custom UI Tab (ITab)

Many workflows benefit from a dedicated UI panel within Burp that shows findings, results, or live statistics from your extensions. This section provides a minimal example of a Burp ITab implementation that creates a simple, read-only panel. You can wire this into your BurpExtender so users have quick access to your extension’s results.

Code Block C: XssResultsTab.java

```java
import burp.ITab;

import javax.swing.*;
import java.awt.*;

public class XssResultsTab implements ITab {
    private final JPanel panel;

    public XssResultsTab() {
        panel = new JPanel(new BorderLayout());
        JTextArea textArea = new JTextArea();
        textArea.setEditable(false);
        textArea.setText("XSS Scan Results:\n- Awaiting data...\n");
        panel.add(new JScrollPane(textArea), BorderLayout.CENTER);
        panel.setPreferredSize(new Dimension(600, 300));
    }

    @Override
    public String getTabCaption() {
        return "XSS Results";
    }

    @Override
    public Component getUiComponent() {
        return panel;
    }

    // Convenience method for extension to update content
    public void appendLine(String line) {
        for (Component c : panel.getComponents()) {
            if (c instanceof JScrollPane) {
                JTextArea ta = (JTextArea) ((JScrollPane) c).getViewport().getView();
                ta.append(line + "\n");
            }
        }
    }
}
```

### Line-by-line explanation

- Line 1-2: Import Burp’s ITab interface and Swing components.
- Line 4: Import AWT classes for layout and sizing.
- Line 6: Class declaration implements ITab, enabling Burp to treat it as a tab.
- Line 8-9: Create a JPanel that will host the UI.
- Line 11-16: Build a basic UI: a non-editable JTextArea with a scroll pane to display results.
- Line 17-18: Add the scroll pane to the panel using a BorderLayout.
- Line 19-20: Set a reasonable default size for the tab.
- Line 23-25: Implement getTabCaption to name the tab in Burp’s UI.
- Line 27-29: Implement getUiComponent to return the panel to Burp.
- Line 32-37: Provide a convenience method to append lines to the UI from your extension logic.

What this teaches you
- How to extend Burp’s UI with a custom tab to visualize extension data.
- A basic pattern for updating UI components from your extension logic.

Note: Integrating ITab with Burp’s main lifecycle typically requires wiring the tab into the BurpExtender (e.g., adding the tab to a central UI container or returning the tab in a method Burp calls). The snippet shows a standalone ITab pattern that you can integrate into a fuller BurpExtender project.

## 4. Common Beginner Mistakes — 3+ real pitfalls (with bad vs good code)

- Mistake 1: Blocking I/O on the UI thread
  - Bad:
    - public void processHttpMessage(...) { stdout.println(someHeavyComputation()); }
    - This can freeze Burp’s UI during high-traffic runs.
  - Good:
    - Run heavy tasks on a background thread and push results to the UI via a thread-safe mechanism (e.g., SwingUtilities.invokeLater).
  - Why it matters: Keeps Burp responsive during engagements.

- Mistake 2: Not handling Burp’s API contracts (nulls, API changes)
  - Bad:
    - Callback objects may be null; code assumes they exist.
  - Good:
    - Validate and guard against nulls; handle API version differences gracefully.
  - Why it matters: Ensures extensions don’t crash Burp or leak sensitive data.

- Mistake 3: Logging too aggressively or incorrectly
  - Bad:
    - Console or file logging inside every message without throttling, causing I/O bottlenecks.
  - Good:
    - Debounce logging, use a bounded queue, and write in batches or via a dedicated logger with rotation.
  - Why it matters: Prevents performance degradation and bloated logs.

- Mistake 4: Hardcoding test payloads without escaping or context
  - Bad:
    - Injecting raw payloads into all contexts without understanding input points.
  - Good:
    - Use parameter-aware insertion points, respect content types, and sanitize/escape appropriately.
  - Why it matters: Increases risk of false positives and test contamination.

- Mistake 5: Not providing a clear, reproducible test plan or results format
  - Bad:
    - Relying on ad-hoc prints without structured results or a repeatable process.
  - Good:
    - Provide a deterministic test plan, reproducible steps, and a structured results summary (e.g., JSON, CSV, or a UI panel).
  - Why it matters: Facilitates collaboration, remediation tracking, and auditability in real engagements.

## 5. Why This Matters In Real Systems — production context and real usage

- Burp Suite is not only a testing tool; it’s a platform for automation. Red teams often create lightweight extensions to rapidly test common web app weaknesses (XSS, injection, CSRF) and to triage findings without manual clicking.
- Extensions enable repeatable workflows: intercepting traffic, injecting payloads, and reporting results from a single pane of glass. A well-designed ITab can present results to analysts, while Intruder payload generators can scale testing across many endpoints.
- Real-world considerations:
  - Security of your tooling: ensure extensions don’t leak sensitive test data to external systems.
  - Performance and stability: extensions should avoid blocking Burp’s main UI thread and should gracefully handle errors.
  - Compliance and ethics: always have authorization for testing and clearly document scope.
  - Reproducibility: maintain a consistent extension interface to allow teammates to reproduce tests or automate them in CI-like environments.

- Practical usage scenarios:
  - Rapid triage: a lightweight extension that logs and filters traffic to highlight suspicious responses.
  - Automated payloads: a small Intruder extension to test common XSS vectors across a suite of endpoints.
  - Results visualization: a UI tab that aggregates test results and flags high-severity issues for immediate follow-up.

## 6. Study Questions — 5 recall questions

1) What Burp Suite component is primarily used for intercepting and modifying traffic in real-time?  
2) Which interface must you implement to create an HTTP listener in Burp Extender?  
3) How do you register a custom Intruder payload generator with Burp from your extension?  
4) What Burp UI feature does ITab enable you to create, and why might you use it?  
5) Name two production considerations when deploying Burp extensions in a real engagement.

## 7. Exercise — practical multi-part coding challenge

Part A — Create a basic Burp extension that logs traffic
- Task: Implement a BurpExtender that logs every HTTP response URL to Burp’s stdout (like in Section 1).
- Deliverable: A single Java file or a small Maven/Gradle project that compiles into a JAR and loads in Burp.
- Validation: Run Burp with the extension enabled and confirm that “Visited: <URL>” prints for a test walkthrough.

Part B — Extend with an Intruder payload generator
- Task: Add an Intruder payload generator (like the XSSPayloadGenerator in Section 2) and a factory to register it.
- Deliverable: Two Java classes (XSSPayloadGenerator and XSSPayloadFactory) and an updated BurpExtender wiring that registers the factory.
- Validation: In Burp Intruder, select your generator and run a simple scan against a controlled test page. Observe payloads cycling through and verify there are no runtime errors.

Part C — Add a custom UI tab to display results
- Task: Implement a lightweight ITab (e.g., XssResultsTab) that shows a static header and can be updated via a public method (appendLine).
- Deliverable: A Java class for the tab (and a minimal usage note in your BurpExtender to instantiate and wire the tab).
- Validation: Ensure Burp shows a tab labeled “XSS Results” and can display new lines when you call appendLine from your extension logic.

Part D — End-to-end quick test plan
- Create a one-page test plan that includes:
  - Target scope and preconditions (e.g., test environment, authorization).
  - A list of payloads and insertion points you will test (parameters, headers, body fields).
  - Expected outcomes and how you will verify them (e.g., reflectance, error messages, console logs).
  - How you will report and triage findings (structured notes or a simple JSON/CSV export).
- Deliverable: A document outlining the plan and a short demonstration script or notes showing how your extension reports results to the UI tab.

If you want, I can tailor these examples to a specific Burp version (e.g., Burp Suite Community vs Pro) or provide a ready-to-compile Maven project structure with all dependencies and a sample test target to help you run through the exercise quickly.