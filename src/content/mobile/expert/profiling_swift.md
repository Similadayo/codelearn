# Memory Profiling and Leak Detection in Swift iOS — Phase 5: Publishing & At-Scale

Memory profiling and leak detection are essential in mobile app development to ensure apps stay responsive, stable, and energy-efficient at scale. With Phase 5 you’ll move from building features to guaranteeing long-lived performance in production, where memory pressure, background tasks, and user sessions can expose subtle retain cycles. This lesson covers ARC fundamentals, common leak patterns in Swift, practical profiling workflows using Instruments, and production-ready patterns to keep memory usage under control.

## 1. Understanding ARC, Retain Cycles, and Leaks

ARC (Automatic Reference Counting) automatically tracks object ownership. A retain cycle occurs when two or more objects hold strong references to each other, preventing deallocation. In mobile apps, leaks manifest as increasing memory usage over time, degraded performance, and crashes under memory pressure.

Code: Leaking timer example (strong capture)
```swift
import Foundation

class LeakingTimerExample {
    var timer: Timer?

    func start() {
        // The closure captures self strongly by default.
        // This keeps 'self' alive as long as the timer is alive.
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            self.doWork()
        }
    }

    func doWork() {
        // Simulated work
        print("LeakingTimerExample doing work...")
    }

    deinit {
        print("LeakingTimerExample deinitialized")
    }
}
```

### Line-by-line explanation
- import Foundation: Bring in foundational types, including Timer.
- class LeakingTimerExample: Define a class that will own a Timer.
- var timer: Timer?: Optional reference to a timer; this model simulates a long-lived timer.
- func start(): Creates and schedules a repeating timer.
- timer = Timer.scheduledTimer(... { _ in self.doWork() }): The closure captures self strongly by default, creating a potential retain cycle if the timer retains the closure and the class retains the timer.
- func doWork(): Placeholder for work performed each tick.
- deinit: Called when the instance is deallocated; if a leak exists, this line may not print.

Code: Fixing a leak with weak capture and explicit invalidation
```swift
import Foundation

class FixedTimerExample {
    var timer: Timer?

    func start() {
        // Capture self weakly to break the retain cycle
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.doWork()
        }
    }

    func doWork() {
        print("FixedTimerExample doing work...")
    }

    deinit {
        // Ensure timer is stopped when the owner is deallocated
        timer?.invalidate()
        print("FixedTimerExample deinitialized")
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }
}
```

### Line-by-line explanation
- class FixedTimerExample: Define a class that owns a timer.
- var timer: Timer?: Optional timer reference.
- start(): Schedule a repeating timer.
- [weak self] in closure: Breaks the retain cycle by not keeping a strong reference to self.
- self?.doWork(): Optional chaining to call work if self still exists.
- deinit: Invalidation ensures timer doesn’t hold onto resources after deallocation.
- stop(): Explicitly stop and clear the timer.
- The combination of weak capture and explicit invalidation prevents a memory leak.

Common takeaway: When you see a closure that captures self and the object owning that closure is also retained by that closure, you likely have a retain cycle. Use [weak self] or [unowned self] where appropriate, and invalidate long-lived timers or display links.

## 2. Retain Cycles in Async Work: Closures, Delegates, and Long-lived Tasks

Long-lived async work can extend the lifetime of objects if closures capture self strongly and those closures are retained by objects that self owns (or by global/static references). This section contrasts a leaky pattern with a safe pattern using weak references.

Bad: Retain cycle via a closure in a data loader
```swift
class DataLoader {
    var onFinish: (() -> Void)?
    func load() {
        // Simulated long-running async work
        DispatchQueue.global().async {
            // After work completes, call the completion
            self.onFinish?()
        }
    }
}

class PresenterBad {
    let loader = DataLoader()

    init() {
        // Closure captures self strongly
        loader.onFinish = {
            self.updateUI()
        }
    }

    func updateUI() {
        print("PresenterBad updating UI")
    }
}
```

Good: Weak self in the completion to break the cycle
```swift
class DataLoader {
    var onFinish: (() -> Void)?
    func load() {
        DispatchQueue.global().async {
            // Simulate some work
            Thread.sleep(forTimeInterval: 0.5)
            self.onFinish?()
        }
    }
}

class PresenterGood {
    let loader = DataLoader()

    init() {
        // Capture self weakly to avoid a retain cycle
        loader.onFinish = { [weak self] in
            self?.updateUI()
        }
    }

    func updateUI() {
        print("PresenterGood updating UI")
    }
}
```

### Line-by-line explanation (Bad)
- DataLoader: A simple class with a closure property to run on completion.
- load(): Simulates async work and executes onFinish when done.
- PresenterBad: Instantiates a loader and assigns a closure that references self.
- Closure: self is captured strongly; since PresenterBad retains the loader, a cycle forms.
- updateUI(): Called from the closure; contributes to the cycle.
- The deallocation of PresenterBad will be prevented by the cycle, causing a memory leak.

### Line-by-line explanation (Good)
- The same DataLoader concept, but the onFinish closure uses [weak self].
- [weak self] capture breaks the strong reference from the closure to PresenterGood.
- self?.updateUI() ensures we only call if self still exists.
- This eliminates the retain cycle while preserving intended behavior if PresenterGood is alive.

Best practice: Whenever a long-lived or asynchronous task keeps a closure around that references self, prefer [weak self] (or [unowned self] when you’re certain self will outlive the closure) and guard with optional binding.

## 3. Profiling Toolbox: Instruments, Memory Graphs, Leaks, and Annotations

Profiling memory requires tooling and disciplined workflows. Instruments helps you locate leaks, track allocations, and visualize memory graphs. You can annotate code to improve traceability and pinpoint hotspots.

Code: Basic memory profiling annotation with os_signpost (for Instruments)
```swift
import os

let log = OSLog(subsystem: "com.example.app", category: "MemoryProfiling")

func profileMemorySpike() {
    // Begin an annotated region
    let signpostID = OSSignpostID(log: log)
    os_signpost(.begin, log: log, name: "MemorySpike", signpostID: signpostID, "start")

    // Simulate a memory spike by allocating a chunk
    var payload = [UInt8](repeating: 0, count: 25 * 1024 * 1024) // 25 MB

    // End the annotated region
    os_signpost(.end, log: log, name: "MemorySpike", signpostID: signpostID, "end")
    // Use payload to prevent optimization from removing it
    print("Allocated \(payload.count) bytes for profiling.")
}
```

### Line-by-line explanation
- import os: Access system-wide logging and signposts for Instruments.
- let log = OSLog(...): Create a log object for grouping related signposts.
- profileMemorySpike(): Function that demonstrates a memory-intensive region to profile.
- let signpostID = OSSignpostID(log: log): Create a unique identifier for this signpost region.
- os_signpost(.begin, ...): Mark the start of a region in Instruments.
- var payload = [UInt8](repeating: 0, count: 25 MB): Allocate memory to simulate a spike.
- os_signpost(.end, ...): Mark the end of the region in Instruments.
- print(...): Force use of the payload to avoid optimization removing the allocation.

Code: Using NSCache to cache expensive resources safely
```swift
import UIKit

class ImageCache {
    private let cache = NSCache<NSString, UIImage>()

    func image(forKey key: String) -> UIImage? {
        return cache.object(forKey: key as NSString)
    }

    func set(image: UIImage, forKey key: String) {
        cache.setObject(image, forKey: key as NSString)
    }

    func clear() {
        cache.removeAllObjects()
    }
}
```

### Line-by-line explanation
- import UIKit: Needed for UIImage type used in the cache.
- class ImageCache: Encapsulates a memory-friendly image cache.
- private let cache = NSCache<NSString, UIImage>(): NSCache is a memory-sensitive cache that can automatically purge items under memory pressure.
- image(forKey:): Retrieve an image if cached.
- set(image:forKey:): Store an image in the cache.
- clear(): Explicitly purge all cached items when needed.
- Why NSCache helps: It automatically evicts items under memory pressure, reducing the likelihood of memory bloat from large image sets.

Common takeaway: Use memory-friendly data structures (like NSCache) for expensive objects and annotate long-running blocks to identify memory hotspots with Instruments.

## 4. Architectural Patterns for Memory Efficiency

Memory efficiency isn’t just about fixes; it’s about patterns that scale. This section covers strategies that reduce peak memory use and improve stability under load.

Code: Safe observer management with NotificationCenter (avoid leaks)
```swift
import Foundation

class ObserverSafe {
    init() {
        NotificationCenter.default.addObserver(self, selector: #selector(handleNotification), name: .UIApplicationDidEnterBackground, object: nil)
    }

    @objc private func handleNotification() {
        // react to backgrounding
    }

    deinit {
        // Important: removeObserver to avoid leaks
        NotificationCenter.default.removeObserver(self)
    }
}
```

### Line-by-line explanation
- NotificationCenter.default.addObserver(self, selector: ...): Subscribes to a system notification; NotificationCenter retains the observer.
- handleNotification(): Responds to the notification.
- deinit: Clean-up hook to release the observer when the instance is deallocated.
- NotificationCenter.removeObserver(self): Prevents potential leaks by severing the retention and avoids running handlers on a deallocated object.

Code: Using unowned vs weak in lifecycle-bound relationships
```swift
class ViewControllerPresenter {
    let model = DataModel()

    func setup() {
        // If the presenter will outlive model, use [weak self]/[weak model] patterns as appropriate
        model.onData = { [weak self] data in
            self?.render(data)
        }
    }

    func render(_ data: String) {
        print("Rendering with data: \(data)")
    }
}
```

### Line-by-line explanation
- DataModel and onData: Model holds a closure to deliver data updates.
- setup(): Establishes the binding between model updates and UI rendering.
- [weak self]: Ensures this closure does not strongly capture the presenter, preventing a retention cycle if the model keeps a long-lived reference to the closure.
- render(_ data): UI update logic guarded by optional self.

Best practice: Prefer weak or unowned references in callback closures that are retained by objects with similar lifetimes, especially for long-running fetches, caches, or background tasks.

## 5. Why This Matters In Real Systems

In real apps, memory leaks and unbounded memory growth cause cascading failures: slower UI, erratic behavior, and abrupt terminations in background/foreground transitions. At scale, even small leaks multiply across millions of sessions, affecting user satisfaction and cost (crashes, reset, watchdogs). Production relevance includes:

- Predictable memory budgets per screen and per feature.
- Robust cleanup of observers, timers, and long-running tasks.
- Profiling telemetry integrated into CI to catch regressions early.
- Clear patterns for safe asynchronous code, especially around closures and delegates.
- Practical strategies for memory-sensitive caches and background processing.

Production-context recommendations:
- Instrument critical paths with Instruments (Leaks, Allocations, and Time Profiler) during QA and before releases.
- Build lightweight, testable memory regression tests (XCTest) that assert no growth for a fixed scenario.
- Use NSCache for image resources and similar data to allow system-driven eviction.
- Invalidate timers, CADisplayLink, or operations in deinit or on view disappear.
- Remove NotificationCenter observers on deinit to avoid leaks and stale callbacks.

Code: Memory regression test pattern (XCTest)
```swift
import XCTest

class MemoryLeakRegressionTests: XCTestCase {
    func testViewControllerMemoryLeaks() {
        weak var vc: SampleViewController?

        autoreleasepool {
            let viewController = SampleViewController()
            // Force loading the view to ensure outlets get set up
            _ = viewController.view
            vc = viewController
        }

        // After pool, there should be no strong reference to the VC
        XCTAssertNil(vc, "SampleViewController should be deallocated without leaks")
    }
}
```

Notes:
- This test checks that a view controller does not leak when its life cycle ends. It’s a starting point for memory regression tests in CI.

## Z. Study Questions

1) What is a retain cycle, and how can closures contribute to it in Swift?  
2) How does [weak self] differ from [unowned self], and when should you use each in asynchronous code?  
3) Why is it important to invalidate Timer or CADisplayLink when an object is deallocated?  
4) How can NSCache help manage memory for image resources in a scrolling UI?  
5) What steps would you include in a production memory profiling workflow before publishing an app?

## Exercise

Part A — Identify and fix a memory leak in a small app snippet
1) You are given a tiny ViewController-like class with a network task that leaks:
```swift
import Foundation

class LeakyViewController {
    var task: URLSessionDataTask?

    func fetchProfile() {
        guard let url = URL(string: "https://example.com/profile") else { return }
        task = URLSession.shared.dataTask(with: url) { data, response, error in
            // parse and update UI (hypothetical)
            print("Fetched profile data")
        }
        task?.resume()
    }
}
```
- Task: Identify the leak pattern and refactor to avoid retain cycles, including proper cancellation and deallocation checks. Provide both a fixed code block and a short explanation of what was changed and why.

2) Add a memory profiling annotation to help identify the leak during profiling (use os_signpost as demonstrated in Section 3). Provide the modified fetchProfile function with a signpost around the network call.

3) Propose an XCTest-based regression test that would help catch this leak in CI.

Part B — Implement a memory-friendly image cache
1) Implement an ImageCache class using NSCache that safely caches and retrieves UIImages. Include thread-safe access if you wish (basic approach is fine for this exercise). Provide code and a brief justification of memory behavior.

Part C — Production readiness: Memory profiling workflow
1) Outline a minimal set of steps you would run in a CI system to ensure a memory regression does not slip between PRs. Include which Instruments or tooling you would invoke and what metrics you would compare.

Deliverable: Provide the code blocks for the fixes in Part A, the NSCache sample in Part B, and a concise seven-step CI workflow in Part C, each with brief explanations.

Note: All code blocks should be Swift, and explanations should avoid assuming external dependencies beyond the standard iOS/macOS toolchain. The goal is to build intuition for memory profiling, common leak patterns, and production-ready patterns for Swift iOS apps.