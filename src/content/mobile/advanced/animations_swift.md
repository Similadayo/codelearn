# Track: Mobile App Development — Module: Phase 4 — Native Modules — Topic: Fluid 60FPS Mobile Animations (Swift iOS)

Fluid 60fps animations are the backbone of a polished mobile experience. In professional apps, smooth motion is not a luxury—it communicates responsiveness, quality, and reliability. This lesson covers native animation primitives on iOS (CADisplayLink, Core Animation, UIViewPropertyAnimator) and teaches how to structure animation code so it stays fluid at 60fps under real-world constraints (device power, background tasks, and layout interactions). You’ll learn patterns to keep the main thread free of heavy work while delivering smooth, physics-inspired motion.

## 1. Understanding 60FPS Rendering and iOS Animation Pipeline

In iOS, the screen refresh is typically 60 frames per second (fps). The system uses a display link (CADisplayLink) tied to the screen refresh to advance animations. For a motion to feel fluid, your per-frame work must be minimal and deterministic, and UI state should be updated in small, predictable steps. Heavy work or long-running calculations must be moved off the per-frame path or cached.

```swift
import UIKit

class FrameAnimator {
    private var displayLink: CADisplayLink?
    private var lastTimestamp: CFTimeInterval = 0
    var onFrame: ((CFTimeInterval, CGFloat) -> Void)?

    func start() {
        stop()
        displayLink = CADisplayLink(target: self, selector: #selector(step))
        displayLink?.add(to: .main, forMode: .default)
    }

    func stop() {
        displayLink?.invalidate()
        displayLink = nil
        lastTimestamp = 0
    }

    @objc private func step(link: CADisplayLink) {
        if lastTimestamp == 0 {
            lastTimestamp = link.timestamp
            return
        }
        let dt = link.timestamp - lastTimestamp
        lastTimestamp = link.timestamp
        onFrame?(link.timestamp, CGFloat(dt))
    }
}
```

### Line-by-line explanation

- Line 1: Import UIKit to access iOS UI primitives and CADisplayLink.
- Line 3: Define a class responsible for driving per-frame updates.
- Line 5: Private storage for the CADisplayLink instance.
- Line 6: Track the last timestamp to compute delta time (dt) between frames.
- Line 7: A callback you can attach to for per-frame work.
- Line 9: start() creates and starts the display link, ensuring any prior link is torn down.
- Line 10: stop() invalidates and clears the display link to stop updates.
- Line 11: Add the display link to the main run loop for default tracking.
- Line 13: stop() invalidates any existing link to prevent leaks.
- Line 17: step() is invoked every frame; CADisplayLink provides the current timestamp.
- Line 18–21: If this is the first frame, initialize lastTimestamp and skip movement.
- Line 22: Calculate dt as the time elapsed since the last frame.
- Line 23: Update lastTimestamp for the next frame.
- Line 24: Propagate the per-frame data to the consumer via onFrame callback.

## 2. Techniques for 60FPS: CADisplayLink, Core Animation, and UIViewPropertyAnimator

In production apps you’ll combine several approaches. The right tool depends on whether you’re driving a custom physics loop, animating standard properties, or leveraging the Core Animation pipeline for GPU-accelerated transforms.

### 2.1 CADisplayLink-driven spring physics (custom per-frame integration)

This pattern uses a per-frame loop to integrate a simple spring-damper system, giving natural, fluid motion that remains in control of the app.

```swift
final class SpringPhysicsView: UIView {
    private var displayLink: CADisplayLink?
    private var velocity: CGPoint = .zero
    private var position: CGPoint = .zero
    private let stiffness: CGFloat = 180.0
    private let damping: CGFloat = 15.0
    private var target: CGPoint = .zero

    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }

    private func commonInit() {
        position = center
        backgroundColor = .systemBlue
        displayLink = CADisplayLink(target: self, selector: #selector(loop))
        displayLink?.add(to: .main, forMode: .default)
    }

    deinit {
        displayLink?.invalidate()
    }

    @objc private func loop() {
        // Simple 2D spring-damper toward the target position
        let dx = target.x - position.x
        let dy = target.y - position.y

        // Acceleration term proportional to displacement
        velocity.x += dx * (stiffness * 0.001)
        velocity.y += dy * (stiffness * 0.001)

        // Damping reduces velocity over time
        velocity.x *= (1.0 - damping * 0.001)
        velocity.y *= (1.0 - damping * 0.001)

        // Integrate velocity to position
        position.x += velocity.x
        position.y += velocity.y

        // Apply new position
        center = position
    }

    func setTarget(_ t: CGPoint) {
        target = t
    }
}
```

### Line-by-line explanation

- Line 1: Mark class as final for optimization; it won’t be subclassed.
- Line 2: Private displayLink to drive per-frame updates.
- Line 3: Velocity vector representing the current motion.
- Line 4: Current position used for rendering; initialized from the view’s center.
- Line 5–6: Spring constants: stiffness and damping that shape motion.
- Line 7: Target position the view should approach.
- Line 9–15: Standard initializers; call commonInit to configure visuals and display link.
- Line 17: Ensure display link is invalidated on deallocation to avoid leaks.
- Line 20: Per-frame loop invoked each frame; uses the delta to update physics.
- Line 23–30: Compute displacement to target, apply spring force, apply damping, integrate velocity to position.
- Line 33–34: Apply the computed position to the view for rendering.
- Line 36: Helper to update the target position externally.

### 2.2 Springy animation using UIViewPropertyAnimator

Leverage the high-level, system-optimized path for springy motion on standard view properties like transform or frame, while still getting natural feel.

```swift
func animateSpring(view: UIView, toX offsetX: CGFloat) {
    let finalTransform = CGAffineTransform(translationX: offsetX, y: 0)
    let spring = UIViewPropertyAnimator(duration: 0.8, dampingRatio: 0.6) {
        view.transform = finalTransform
    }
    spring.addCompletion { _ in
        // Return to identity for a continuous loop feel
        UIViewPropertyAnimator(duration: 0.25, dampingRatio: 1.0) {
            view.transform = .identity
        }.startAnimation()
    }
    spring.startAnimation()
}
```

### Line-by-line explanation

- Line 1: Define a function to perform a spring-like translation along the X axis.
- Line 2: Compute the final transform representing the desired offset.
- Line 3: Create a UIViewPropertyAnimator with a spring-like damping ratio to drive the transform.
- Line 4: In the animation block, apply the translation transform to the view.
- Line 6–9: When the spring animation completes, optionally snap back with a separate animation for a continuous feel.
- Line 10: Start the primary spring animation.
- Line 11–12: End of function declaration.

### 2.3 Core Animation with CASpringAnimation (GPU-accelerated)

Core Animation provides a powerful, GPU-accelerated path for smooth, physics-inspired motion without driving per-frame logic in Swift.

```swift
let redLayer = CALayer()
redLayer.backgroundColor = UIColor.red.cgColor
redLayer.bounds = CGRect(x: 0, y: 0, width: 60, height: 60)
redLayer.position = CGPoint(x: 100, y: 150)
containerView.layer.addSublayer(redLayer)

let spring = CASpringAnimation(keyPath: "transform.translation.x")
spring.fromValue = 0
spring.toValue = 180
spring.mass = 1
spring.stiffness = 180
spring.damping = 12
spring.initialVelocity = 0
redLayer.add(spring, forKey: "springX")
// Commit final state so the model layer ends at the target position
redLayer.transform = CATransform3DMakeTranslation(180, 0, 0)
```

### Line-by-line explanation

- Line 1–2: Create a dedicated CALayer to animate; layers separate rendering from layout.
- Line 3–5: Configure a red square visible in the container view.
- Line 6: Add the layer to the container’s layer hierarchy.
- Line 8: Create a CASpringAnimation that targets horizontal translation via a transform key path.
- Line 9–12: Configure the spring’s physics: displacement range, mass, stiffness, damping.
- Line 13: Start the animation by adding it to the layer.
- Line 15: Immediately set the layer’s final transform so the model layer ends in the intended state.

## 3. Optimizing Layout Passes and Rendering for Fluidity

To maintain 60fps, avoid per-frame layout recalculations and frame-based updates that trigger layoutIfNeeded or expensive constraints resolution. Prefer transform-based animations and compute-heavy work off the main render path. The examples below illustrate a few best practices.

```swift
class TransformOnlyAnimator {
    private var displayLink: CADisplayLink?
    private var start: CFTimeInterval = 0
    private var elapsed: CFTimeInterval = 0
    private weak var targetView: UIView?

    init(view: UIView) {
        self.targetView = view
        start = CACurrentMediaTime()
        displayLink = CADisplayLink(target: self, selector: #selector(step))
        displayLink?.add(to: .main, forMode: .default)
    }

    @objc private func step(link: CADisplayLink) {
        guard let view = targetView else {
            displayLink?.invalidate()
            return
        }
        if elapsed == 0 { elapsed = link.timestamp - start }
        let dt = max(min(link.timestamp - (start + elapsed), 0.033), 0.0) // clamp ~30-60fps
        elapsed += dt

        // Example: a subtle horizontal parallax using transform (no layout changes)
        let x = sin(elapsed * 2.0) * 8.0
        view.transform = CGAffineTransform(translationX: CGFloat(x), y: 0)
    }

    deinit {
        displayLink?.invalidate()
    }
}
```

### Line-by-line explanation

- Line 1: Declare a simple animator that updates a transform-only motion.
- Line 2–4: Store a weak reference to the target view to avoid strong retention cycles.
- Line 6–10: Initialize and start a CADisplayLink to drive updates on the main run loop.
- Line 12: Per-frame step; if the view is gone, stop the display link to avoid crashes.
- Line 14–16: Compute a stable elapsed time with a conservative clamp to avoid large jumps.
- Line 18–23: Use a harmless sinusoid to apply a transform-based parallax, which avoids any layout pass.
- Line 27: Invalidate the display link when the object is deallocated.

Note: This pattern emphasizes avoiding layout-related work in the per-frame path. It keeps all updates to transform properties, which are handled efficiently by the GPU.

## 4. Common Beginner Mistakes — 3+ Pitfalls with Bad vs Good Code (Side-by-Side)

### Pitfall 1 — Heavy work on the per-frame path and UI blocking
- Bad

```swift
// Called every frame via CADisplayLink
@objc private func step() {
    // Expensive computation (e.g., image processing) runs on main thread
    let result = heavyComputation()
    imageView.image = result
}
```

- Good

```swift
@objc private func step() {
    // Move heavy work off the per-frame path
    DispatchQueue.global(qos: .userInitiated).async {
        let result = heavyComputation()
        DispatchQueue.main.async {
            self.imageView.image = result
        }
    }
}
```

### Pitfall 2 — Not using delta time (dt) leading to drift and inconsistent speeds
- Bad

```swift
@objc private func step() {
    // No dt usage; velocity grows with each frame
    position.x += velocity.x
    velocity.x += (target.x - position.x) * 0.02
    view.center = position
}
```

- Good

```swift
private var lastTime: CFTimeInterval = 0
@objc private func step(link: CADisplayLink) {
    let dt = max(0.001, link.timestamp - lastTime)
    lastTime = link.timestamp
    position.x += velocity.x * CGFloat(dt)
    velocity.x += (target.x - position.x) * stiffness * CGFloat(dt)
    view.center = position
}
```

### Pitfall 3 — Retain cycles with CADisplayLink
- Bad

```swift
class MyView: UIView {
    private var displayLink: CADisplayLink?
    init() {
        super.init(frame: .zero)
        displayLink = CADisplayLink(target: self, selector: #selector(loop))
        displayLink?.add(to: .main, forMode: .default)
    }
    @objc private func loop() { /* update */ }
}
```

- Good

```swift
class DisplayLinkProxy {
    weak var owner: MyView?
    @objc func loop() { owner?.step() }
}

class MyView: UIView {
    private var displayLink: CADisplayLink?
    private let proxy = DisplayLinkProxy()

    init() {
        super.init(frame: .zero)
        proxy.owner = self
        displayLink = CADisplayLink(target: proxy, selector: #selector(DisplayLinkProxy.loop))
        displayLink?.add(to: .main, forMode: .default)
    }
    @objc func step() {
        // Update logic
    }
    deinit {
        displayLink?.invalidate()
    }
}
```

### Pitfall 4 — Animating layout-affecting properties every frame
- Bad

```swift
@objc private func step() {
    // Adjusting frame triggers layout passes every frame
    frame.origin.x += 1
}
```

- Good

```swift
@objc private func step() {
    // Animate via transform to avoid layout passes
    let tx = (transform.tx ?? 0) + 1
    self.transform = CGAffineTransform(translationX: tx, y: 0)
}
```

## 5. Why This Matters In Real Systems — Production Context and Real Usage

- Perceived performance: 60fps animations with minimal per-frame work feel instantly responsive, which elevates user trust and engagement.
- Battery and thermal management: GPU-accelerated Core Animation and transform-based animation are typically more power-efficient than large CPU-bound computations on every frame.
- Complex UIs: Fluid gestures (cards, drawers, parallax, charts) rely on predictable dt-based physics and well-structured animation layers to prevent jank during user interactions.
- Maintenance in teams: Encapsulating animation logic (e.g., a SpringPhysicsView or a dedicated AnimationModule) improves readability and makes it easier to swap strategies (manual CADisplayLink vs. Core Animation) without changing call sites.
- Real-world integration: Native modules can expose animation primitives to higher-level layers or cross-platform bridges, enabling consistent motion semantics across platforms while preserving 60fps guarantees.

Key takeaways for production:
- Favor transform-based rendering over frame-based layout changes.
- Use CADisplayLink when you need custom physics-like updates; prefer Core Animation when possible for performance.
- Always compute and apply with a fixed dt where motion consistency matters.
- Invalidate display links on deallocation to prevent leaks and runaway CPU usage.
- Profile with Instruments (Core Animation, Time Profiler) to identify bottlenecks early.

## 6. Study Questions — 5 Recall Questions

1) What role does CADisplayLink play in achieving 60fps animations on iOS?
2) Why is updating view transforms generally more performance-friendly than updating frame or constraints on every frame?
3) How can you safely use CADisplayLink without creating memory leaks or retain cycles?
4) What is the advantage of CASpringAnimation over a per-frame physics loop in some scenarios?
5) How would you incorporate delta time (dt) into a per-frame animation to maintain consistent motion across devices with different frame rates?

## 7. Exercise — Practical multi-part coding challenge

Goal: Build a small, reusable, fluid card interaction demonstration that runs at 60fps using Swift/iOS native animation primitives. You will implement a draggable card with springy physics and a subtle background parallax, using a mix of CADisplayLink and transform-based animations. Deliverables: a single ViewController subclass (or a small set of coordinated classes) you can drop into a project.

Part A — Draggable Card with Spring Physics
- Create a CardView (a UIView subclass or plain UIView) centered on screen.
- When the user drags the card, track the finger position and smoothly pull the card toward the finger with spring-like resistance.
- When the user releases, animate the card back to the center using a per-frame spring integrator (CADisplayLink) or a CASpringAnimation.
- Use transform-based updates (not frame changes) to avoid layout passes.

Part B — Subtle Background Parallax
- Add two background layers behind the card (e.g., a gradient view and a star field view).
- Move the layers with a small, dt-based parallax as the card moves, using transforms rather than layout changes.

Part C — Stability and Cleanup
- Ensure CADisplayLink is invalidated on deallocation or when the card leaves the screen.
- Use a weak/indirect reference pattern to avoid retain cycles.
- Clamp or cap dt to avoid jumps during app wake-up or multitasking.

Suggested scaffolding (you can adapt to your project structure):

- A CardPhysicsView or SpringCardView with:
  - A method to bind to pan gestures and return to center on release.
  - An internal CADisplayLink-based spring integrator for the return-to-center motion.
  - A method setTarget(_:) to update target during drag.

- A ParallaxBackground controller that applies small transform translations to two background layers in response to the card’s movement.

- A simple ViewController to wire everything together and present the card on screen.

Sample starter snippets you can build upon (drop into a project as-is or adapt to your architecture):

```swift
import UIKit

class CardPhysicsView: UIView {
    private var displayLink: CADisplayLink?
    private var velocity = CGPoint.zero
    private var position = CGPoint.zero
    private let stiffness: CGFloat = 200.0
    private let damping: CGFloat = 14.0
    private var target = CGPoint.zero
    private weak var hostView: UIView?

    init(frame: CGRect, host: UIView) {
        self.hostView = host
        super.init(frame: frame)
        self.backgroundColor = .systemTeal
        self.layer.cornerRadius = 12
        self.position = center
        self.target = center
        self.displayLink = CADisplayLink(target: self, selector: #selector(loop))
        self.displayLink?.add(to: .main, forMode: .default)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    deinit {
        displayLink?.invalidate()
    }

    func bindPanGesture(_ pan: UIPanGestureRecognizer) {
        let loc = pan.location(in: hostView)
        switch pan.state {
        case .began, .changed:
            // Move target toward the finger for a springy feel
            target = loc
        case .ended, .cancelled, .failed:
            // Release to center
            target = hostView?.center ?? CGPoint(x: 0, y: 0)
        default:
            break
        }
    }

    @objc private func loop() {
        // dt-based integration toward the target
        // compute dt using the display link timestamp if needed
        // Use a very small step to keep it stable
        let dx = target.x - position.x
        let dy = target.y - position.y

        velocity.x += dx * (stiffness * 0.001)
        velocity.y += dy * (stiffness * 0.001)

        velocity.x *= (1.0 - damping * 0.001)
        velocity.y *= (1.0 - damping * 0.001)

        position.x += velocity.x
        position.y += velocity.y

        self.center = position
    }
}
```

```swift
class ParallaxBackground {
    private weak var layer1: UIView?
    private weak var layer2: UIView?

    init(layer1: UIView, layer2: UIView) {
        self.layer1 = layer1
        self.layer2 = layer2
    }

    func update(withCardCenter center: CGPoint) {
        // Simple dt-free parallax based on card position
        let t1 = CGAffineTransform(translationX: center.x * -0.02, y: 0)
        let t2 = CGAffineTransform(translationX: center.x * -0.04, y: 0)
        layer1?.transform = t1
        layer2?.transform = t2
    }
}
```

In this exercise, you should deliver a working, well-documented Swift module that can be embedded into a native iOS app. Provide comments explaining the decisions behind using transforms, how you handle dt, and how the code avoids common pitfalls. If you have time, add unit-level integration tests for the physics step or a small UI-driven test harness to simulate drags and releases.

If you want, I can tailor the exercise to match a specific project setup (UIKit-only vs. SwiftUI, single view vs. a nav stack, or a particular design language).