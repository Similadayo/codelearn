# Track: Frontend Engineering — Phase 1: The Foundations — Semantic HTML5 & Accessibility in React

Semantic HTML5 and accessibility are foundational skills for building inclusive, maintainable, and scalable frontend applications. By using semantic elements, proper landmarks, and accessible patterns, you ensure your UI is understandable to assistive technologies, easier to reason about for teammates, and friendlier to search engines and future tooling. In React, you can embrace these practices without sacrificing componentization or interactivity. This lesson walks you through practical patterns, real-code examples, and production-oriented considerations.

## 1. Semantic HTML5 in React: Landmarks, Elements, and Reasoning

In this section, you’ll see how to structure a React component using semantic HTML5 elements (header, nav, main, section, article, aside, footer) and landmarks to convey meaning and improve accessibility. You’ll also learn how to add a skip link for keyboard users and how to compose a clean, navigable layout.

```jsx
import React from 'react';

export default function SiteLayout() {
  return (
    <>
      {/* Skip link enables keyboard users to jump straight to main content */}
      <a href="#main" className="skip-link">Skip to main content</a>

      <header>
        <h1 className="site-title" aria-label="Acme Tech">Acme Tech</h1>
        <nav aria-label="Primary">
          <ul>
            <li><a href="#intro">Intro</a></li>
            <li><a href="#learn">Learn</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>

      <main id="main" role="main">
        <section id="intro" aria-labelledby="intro-title">
          <h2 id="intro-title">Introduction to Semantic HTML</h2>
          <p>
            Semantic HTML5 uses elements that describe their meaning in a way both humans and machines can interpret.
            This improves accessibility, SEO, and maintainability.
          </p>
        </section>

        <section id="learn" aria-labelledby="learn-title">
          <h2 id="learn-title">Practical Semantics in React</h2>
          <article aria-labelledby="article-why">
            <header>
              <h3 id="article-why">Why it matters in React apps</h3>
            </header>
            <p>
              React renders semantic HTML the same way you write it. The framework doesn’t change the meaning of elements;
              it helps you compose them as components.
            </p>
          </article>
        </section>

        <aside aria-label="Related resources">
          <h4>Related resources</h4>
          <ul>
            <li><a href="#aria">ARIA patterns</a></li>
            <li><a href="#contrast">Color contrast</a></li>
          </ul>
        </aside>
      </main>

      <footer>
        <p>© {new Date().getFullYear()} Acme Tech</p>
      </footer>
    </>
  );
}
```

### Line-by-line explanation breaking down each line

- Line 1: Import React to use JSX and component APIs.
- Line 3: Define a functional component named SiteLayout.
- Line 4: Return a fragment to group multiple root elements without extra DOM nodes.
- Line 6: Skip link for keyboard users; anchors help jump to the main content.
- Line 8: Render a semantic header containing site branding.
- Line 9: h1 with a descriptive label for accessibility tooling.
- Line 10: Navigation element with aria-label to announce its purpose to screen readers.
- Lines 11-15: Simple primary navigation list with anchor links to sections.
- Line 18: Main landmark with role="main" to clearly denote the primary content region.
- Line 19: First section: intro, identified with id and labelled by a heading.
- Line 20-22: Section heading and descriptive paragraph about semantic HTML5.
- Line 25: Second section that covers practical semantics in React.
- Line 26: Section heading for the learn block.
- Line 27: Article inside the section; LC/ARIA: article is itself a self-contained composition.
- Line 28: Header for the article with a subheading for clarity.
- Line 29: Subheading for the article content.
- Line 31: Paragraph elaborating on how React interacts with semantic HTML.
- Line 35: Aside element providing related resources; convey contextual information without interrupting main flow.
- Line 36-41: Simple list of related links.
- Line 44: Footer with a dynamic year to keep content fresh.
- The component demonstrates proper use of semantic HTML5 elements and landmark roles within a React component.

## 2. Accessible Forms in React: Labels, Errors, and ARIA

Accessible forms require explicit label associations, meaningful error messaging, and appropriate ARIA attributes to convey validation state to assistive tech. This section demonstrates a small signup form that is fully labeled and uses aria-invalid and aria-describedby for accessibility.

```jsx
import React, { useState } from 'react';

export default function SignUpForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});

  const onSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.includes('@')) errs.email = 'Please provide a valid email';
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      // In a real app you'd call an API here
      console.log('Submitted', { name, email });
    }
  };

  return (
    <form onSubmit={onSubmit} aria-label="Registration form" noValidate>
      <div>
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && <div id="name-error" role="alert">{errors.name}</div>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && <div id="email-error" role="alert">{errors.email}</div>}
      </div>

      <button type="submit">Sign up</button>
    </form>
  );
}
```

### Line-by-line explanation breaking down each line

- Line 1: Import React and useState for local component state management.
- Line 3: Define SignUpForm component.
- Line 4-6: Local state for name, email, and an errors object.
- Line 8: onSubmit handler; prevent default form submission.
- Line 9-12: Build a simple synchronous validation object; add errors for missing name and invalid email.
- Line 13: Update errors state with validation results.
- Line 14-17: If there are no errors, log a submission (replace with real API call in production).
- Line 20: Begin form with an accessible label and disable default browser validation (we manage it ourselves).
- Line 21-28: Name input: labeled via label htmlFor and input id; aria-invalid reflects error state; aria-describedby points to error text if present.
- Line 29: Conditional error message for name, with role="alert to announce to assistive tech.
- Line 33-40: Email input: same pattern as name with its own error messaging.
- Line 41: Conditional error message for email.
- Line 44: Submit button.
- This pattern ensures screen readers announce validation states and error messages promptly.

## 3. Images, Figures, and Media for Accessibility

Accessible media includes meaningful alt text for images, descriptive captions, and captions for video/audio. This section covers images with proper figure/figcaption usage and media with captions tracks.

```jsx
import React from 'react';

export function ImageWithCaption() {
  return (
    <figure>
      <img src="https://via.placeholder.com/800x400" alt="Snowy mountain landscape with a clear blue sky" />
      <figcaption>A serene sunrise over snow-covered peaks.</figcaption>
    </figure>
  );
}

export function VideoWithCaptions() {
  return (
    <div>
      <video controls width="640" aria-label="Product demo video">
        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
        <track label="English" kind="captions" srclang="en" srcLang="en" default />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
```

### Line-by-line explanation breaking down each line

- ImageWithCaption
- Line 1: Import React (not always strictly necessary in new React versions, but keeps clarity).
- Line 3: Define ImageWithCaption component.
- Line 4: Render a figure to group image and caption semantically.
- Line 5: Image element with a descriptive alt attribute for screen readers.
- Line 6: figcaption provides a textual description of the figure.
- Line 9: Define VideoWithCaptions component.
- Line 10: Render a video element with controls and a width for layout consistency.
- Line 11: aria-label describes the video for assistive tech.
- Line 12: Source element provides the video URL and type.
- Line 13-14: Track element links to captions to help users who rely on text captions.
- Line 15: Fallback text for browsers that don’t support video.
- This pattern ensures visible and non-visual users receive meaningful information about media content.

## 4. Keyboard, Focus Management, and Skip Links

Keyboard accessibility includes predictable focus order, skip links, and accessible focus handling for components like modals. This section demonstrates a minimal accessible modal and a skip link pattern.

```jsx
import React, { useState, useEffect, useRef } from 'react';

export function AccessibleModal() {
  const [open, setOpen] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Focus the first focusable element inside the modal when it opens
    const focusables = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} aria-haspopup="dialog" aria-controls="sample-modal">
        Open modal
      </button>

      {open && (
        <div
          id="sample-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Example accessible modal"
          ref={modalRef}
          style={{
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '1rem',
            background: 'white',
            border: '1px solid #ccc',
            zIndex: 1000,
          }}
        >
          <h2>Modal title</h2>
          <p>This dialog is announced as a modal dialog and traps focus within itself.</p>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}
```

### Line-by-line explanation breaking down each line

- Line 1: Import React, useState for visibility and useEffect/useRef for focus handling.
- Line 3: Define AccessibleModal component.
- Line 4: Local state to toggle modal visibility.
- Line 5: Create a ref to access the modal DOM node.
- Line 7-13: When modal opens, find the first focusable element inside and focus it to satisfy focus management expectations.
- Line 16: Trigger to open the modal, with ARIA attributes describing its role and relationship.
- Line 20: Conditional render of the modal container.
- Line 21-28: Modal container with role="dialog" and aria-modal="true" signals; initial focus is directed to the first interactive element inside.
- Line 29: Simple close button to hide the modal.
- This pattern demonstrates a minimal, accessible modal using semantic roles without relying on heavy libraries.

## 5. Accessibility Styling: Color Contrast and Motion Preferences

Visual accessibility includes adequate color contrast and respecting users’ motion preferences. You can implement these concerns with CSS and, in React, conditionally applying classes or using prefers-contrast/motion media queries.

```css
/* Basic color tokens to maintain accessible contrast */
:root {
  --bg: #0b1020;
  --fg: #e9f0ff;
  --accent: #4dabf7;
}
body {
  background: var(--bg);
  color: var(--fg);
}
a { color: var(--accent); }

/* Respect users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  .fade { animation: none !important; transition: none !important; }
}
```

### Line-by-line explanation breaking down each line

- Line 1-3: Define CSS variables for a high-contrast color scheme; using a dark background and light foreground improves readability.
- Line 4-6: Apply the color tokens to body and links for consistent, accessible visuals.
- Line 9-12: Respect user preferences for reduced motion by disabling animations and transitions when requested.
- This approach ensures predictable visuals for low-vision users and minimizes potential discomfort for users who cannot tolerate motion.

## X. Common Beginner Mistakes — 3+ Pitfalls with Bad vs Good Code (Side-by-Side)

- Pitfall 1: Non-semantic wrappers for major blocks
  - Bad:
    ```jsx
    // Before
    const Header = () => (
      <div className="header">
        <div className="logo">Acme</div>
        <div className="nav">
          <a href="#">Home</a>
          <a href="#">About</a>
        </div>
      </div>
    );
    ```
  - Good:
    ```jsx
    // After
    const Header = () => (
      <header className="header">
        <div className="logo" aria-label="Acme logo">Acme</div>
        <nav aria-label="Main">
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>
      </header>
    );
    ```
  - Why it matters: Semantics improve accessibility and toolability (screen readers, SEO, maintainability).

- Pitfall 2: Missing or misassociated form labels
  - Bad:
    ```jsx
    // Before
    <input placeholder="Your name" />
    <input placeholder="Email" />
    ```
  - Good:
    ```jsx
    // After
    <label htmlFor="name">Name</label>
    <input id="name" name="name" />
    <label htmlFor="email">Email</label>
    <input id="email" name="email" type="email" />
    ```
  - Why it matters: Screen readers rely on explicit label associations; placeholders are not substitutes for labels.

- Pitfall 3: Ignoring keyboard interactions for modals and menus
  - Bad:
    ```jsx
    // Before: modal with no focus management
    <div role="dialog" aria-label="Example">
      <button>Close</button>
    </div>
    ```
  - Good:
    ```jsx
    // After: accessible dialog with focus trap-like behavior
    // See AccessibleModal example in section 4
    ```
  - Why it matters: Without proper focus management, keyboard users cannot navigate safely.

- Pitfall 4: Overusing ARIA where native semantics suffice
  - Bad:
    ```jsx
    <nav role="navigation" aria-label="Main">...</nav>
    ```
  - Good:
    ```jsx
    <nav aria-label="Main">...</nav>
    ```
  - Why it matters: Native elements already communicate semantics; ARIA should augment, not replace, native semantics.

- Pitfall 5: Inaccessible images
  - Bad:
    ```jsx
    <img src="/banner.png" />
    ```
  - Good:
    ```jsx
    <img src="/banner.png" alt="Descriptive caption for the banner" />
    ```
  - Why it matters: Alt text provides essential context for blind users and those with slow connections.

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Accessibility expands your audience: People with disabilities are a large and diverse user group; accessible apps translate into broader adoption and compliance with accessibility laws and standards.
- Improved UX for all users: Semantic structure improves cognitive load, faster navigation, and predictable keyboard behavior, benefiting power users and mobile users alike.
- Better maintainability and tooling: Clear landmarks, labels, and React components that honor semantics lead to cleaner code, easier testing, and more robust automated checks (linting, unit tests).
- SEO and discoverability: Semantic HTML helps search engines understand page structure, improving indexation and SERP features.
- Real-world constraints: Teams must balance development speed with accessibility reviews; starting with semantics in Phase 1 yields sustainable improvements and reduces rework later.

## Z. Study Questions — 5 Recall Questions

1. What is the purpose of a skip link in a web page, and where should it typically point?
2. Name three semantic HTML5 elements you can use in a typical page layout and describe their general purpose.
3. How do you associate a label with an input in React, and why is this important for accessibility?
4. What ARIA attributes are commonly used to communicate the state of a modal dialog to assistive technologies?
5. What is the purpose of the prefers-reduced-motion media query, and how would you apply it to a UI animation?

## Exercise — Practical multi-part coding challenge

Goal: Build a small, accessible product gallery in React that uses semantic HTML5, proper labeling, focus management for a modal, and an accessible sign-up form. You’ll implement a single-page layout with a skip link, a gallery of products, a details modal, and a sign-up form.

Part A — Project scaffolding
- Create a React component tree with:
  - A semantic layout container (header, nav, main, footer).
  - A skip link at the top of the page.
  - A gallery section that renders ProductCard components.
  - A SignUpForm component embedded in the page.

Part B — ProductCard component (semantic and accessible)
- Each card should be:
  - An article element with a header containing the product name (h3 for each card).
  - A figure with an image and a caption.
  - A descriptive paragraph.
  - A Details button that opens a modal with more information.
- Focus management: ensure the Details button is focusable and the modal traps focus while open.

Part C — Accessible Modal for Product Details
- Implement a modal using role="dialog" and aria-modal="true".
- When opened, set focus to the first focusable element in the modal.
- Provide a Close button that returns focus to the Details button that opened the modal.
- Ensure the modal content is readable by screen readers and properly announced.

Part D — Sign-up form
- Implement SignUpForm (as shown in Section 2) with:
  - Proper labels for inputs.
  - Validation and ARIA attributes (aria-invalid, aria-describedby).
  - A small confirmation message upon successful submission (aria-live region if appropriate).

Part E — Accessibility checks and styling
- Ensure color contrast is sufficient for text over backgrounds.
- Add a minimal style block demonstrating prefers-reduced-motion behavior.
- Ensure the page remains navigable with a keyboard alone (no mouse required for core flows).

Deliverables:
- A small React app (function components only) demonstrating:
  - Semantic HTML5 structure (header, nav, main, section, article, figure/figcaption).
  - A skip link.
  - A product gallery with accessible details modal.
  - An accessible sign-up form.
  - A CSS snippet showing accessible color contrast and prefers-reduced-motion handling.

Optional enhancements (for deeper exploration):
- Add ARIA live regions for dynamic updates (e.g., sign-up success message).
- Implement a simple focus trap utility (without external libraries) for the modal.
- Expand keyboard navigation to support closing the modal with Escape key.

This lesson integrates semantic HTML5 and accessibility practices into practical React patterns, equipping you to craft inclusive, maintainable frontend interfaces from Phase 1 and beyond.