# Track: Frontend Engineering — Phase 1: The Foundations — Semantic HTML5 & Accessibility (TypeScript Frontend)

Semantic HTML5 and accessibility are foundational to building inclusive, maintainable, and resilient web applications. By using meaningful HTML elements, you unlock better navigation for assistive technologies, improve SEO, and simplify collaboration across teams. This lesson ties semantic HTML5 to TypeScript frontend workflows (React/TSX) so you can apply accessible patterns in real UI work.

## 1. Semantic HTML5 Fundamentals

In this section, you’ll learn the core semantic elements, when to use them, and how to structure content so it’s meaningful to browsers, search engines, and assistive tech. You’ll see a TSX example that demonstrates a semantic page layout with landmarks, headings, figures, and time metadata.

```tsx
// SemanticLayout.tsx
import React from 'react';

type ArticleProps = {
  title: string;
  author: string;
  date: string;
  image?: { src: string; alt: string };
  children: React.ReactNode;
};

export const SemanticLayout: React.FC<{ siteTitle: string; articles: ArticleProps[] }> = ({
  siteTitle,
  articles,
}) => {
  return (
    <>
      <a href="#content" className="skip-link">Skip to content</a>
      <header>
        <div className="brand">
          <h1>{siteTitle}</h1>
        </div>
        <nav aria-label="Global">
          <ul>
            <li><a href="#articles">Articles</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>
      </header>

      <main id="content" role="main">
        <section aria-labelledby="intro-title">
          <header>
            <h2 id="intro-title">Foundations of Semantic HTML5</h2>
          </header>
          <p>Semantic tags describe meaning, aiding accessibility and SEO.</p>
        </section>

        {articles.map((a, idx) => (
          <article key={idx} aria-labelledby={`article-${idx}-title`}>
            <header>
              <h3 id={`article-${idx}-title`}>{a.title}</h3>
              <p>
                By {a.author} <time dateTime={a.date}>{new Date(a.date).toDateString()}</time>
              </p>
            </header>
            {a.image && (
              <figure>
                <img src={a.image.src} alt={a.image.alt} />
                <figcaption>{a.image.alt}</figcaption>
              </figure>
            )}
            <section>
              {a.children}
            </section>
          </article>
        ))}
      </main>

      <aside aria-label="Related links">
        <h4>Related</h4>
        <ul>
          <li><a href="#semantics">Semantics</a></li>
          <li><a href="#aria">ARIA Roles</a></li>
        </ul>
      </aside>

      <footer>
        <p>&copy; 2026 Frontend Track</p>
      </footer>
    </>
  );
};
```

### Line-by-line explanation breaking down each line
- Import React to enable TSX usage and component typing.
- Define ArticleProps to describe article data (title, author, date, optional image, content children).
- Create a functional component that accepts siteTitle and a list of articles.
- Render a skip link for keyboard users to jump to main content.
- Build a header with a brand title and a global navigation landmark.
- Use the main element with role="main" as a landmark and id="content" for skip-link targeting.
- Introduce an intro section labeled by a heading for accessibility (aria-labelledby).
- Map over the articles array to render semantic article elements with an accessible heading and author/date metadata.
- Use time with a machine-readable dateTime attribute for proper date semantics.
- If an article has an image, wrap it in a figure with a descriptive alt and a figcaption.
- Include an aside as a complementary landmark for related links.
- End with a footer containing basic site copyright.
- This structure provides clear landmarks and meaningful sections for assistive tech and SEO.

## 2. Accessibility Essentials

This section covers landmark roles, skip navigation, keyboard focus, color contrast guidance, and accessible attributes in TSX components. You’ll see an accessible layout and an interactive control with proper ARIA usage.

```tsx
// AccessibilityBench.tsx
import React, { useState, useEffect, useRef } from 'react';

export const AccessibilityBench: React.FC = () => {
  const [dark, setDark] = useState(false);
  const [tabIndex, setTabIndex] = useState(-1);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tabIndex === 0 && panelRef.current) {
      const el = panelRef.current.querySelector<HTMLElement>('button, a, input, [tabindex="0"]');
      el?.focus();
    }
  }, [tabIndex]);

  const toggle = () => setDark((d) => !d);

  return (
    <div>
      <a href="#content" className="skip-link">Skip to content</a>
      <button aria-label="Toggle theme" onClick={toggle}>
        Toggle Theme
      </button>

      <main id="content" aria-label="Main content">
        <section aria-labelledby="acc-header">
          <h2 id="acc-header">Accessibility Controls</h2>
          <p>Demo controls with accessible attributes.</p>
          <button aria-pressed={dark} onClick={toggle}>
            {dark ? 'Dark' : 'Light'} mode
          </button>
          <div ref={panelRef} role="region" aria-label="Options panel" tabIndex={0}>
            <p>Panel with focus management</p>
            <button onClick={() => setTabIndex(0)}>Focus first control</button>
            <a href="#" onClick={(e)=>e.preventDefault()}>Learn more</a>
          </div>
        </section>
      </main>
    </div>
  );
};
```

### Line-by-line explanation breaking down each line
- Import React hooks for state, effects, and element refs.
- Define a functional component for accessibility controls demo.
- Manage color theme state and a focus-management trigger.
- useEffect to move focus into a panel when activated, demonstrating focus sequencing.
- Render a skip link for keyboard users and an accessible toggle button with aria-label.
- Provide a main landmark that describes the primary content region.
- Create a section with a descriptive heading to introduce the demo.
- Use a button with aria-pressed reflecting the toggle state to convey current UI state to assistive tech.
- Provide a focusable panel region with aria-label and tabIndex to allow keyboard focus.
- Include a control inside the panel that programmatically shifts focus to demonstrate focus management.
- Include a decorative link (Learn more) to show mixed interactive elements.
- This combination demonstrates landmarks, keyboard focus, and ARIA state awareness.

## 3. Semantic HTML in Component Architecture

Learn how to compose semantic HTML5 landmarks inside reusable TSX components. This section demonstrates a Layout component that uses header, nav, main, aside, section, article, figure, and time while remaining accessible and maintainable.

```tsx
// Layout.tsx
import React from 'react';

type LayoutProps = {
  title: string;
  children: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  return (
    <>
      <a href="#content" className="skip-link">Skip to content</a>
      <header>
        <div className="container">
          <a href="/" aria-label="Home">
            <img src="/logo.png" alt="" aria-hidden="true" />
          </a>
          <nav aria-label="Main navigation">
            <ul>
              <li><a href="/docs">Docs</a></li>
              <li><a href="/api">API</a></li>
            </ul>
          </nav>
          <h1 id="site-title">{title}</h1>
        </div>
      </header>

      <main id="content" role="main" aria-labelledby="site-title">
        {children}
      </main>

      <aside aria-label="Sidebar">
        <section aria-labelledby="tips-title">
          <h2 id="tips-title">Tips</h2>
          <ul>
            <li>Use semantic tags for landmarks.</li>
            <li>Prefer native elements over ARIA where possible.</li>
          </ul>
        </section>
      </aside>

      <footer>
        <small>© 2026</small>
      </footer>
    </>
  );
};
```

### Line-by-line explanation breaking down each line
- Import React for TSX usage.
- Define props for a simple Layout: a title and children content.
- Render a skip-to-content link for accessibility.
- Build a header with a branding area and a home link with an accessible label.
- Use an actual nav element with aria-label for the main navigation landmark.
- Place the site title in an h1 for proper document outline.
- Render the main region with role="main" and aria-labelledby referencing the site-title for better landmark description.
- Include a multi-purpose aside as a complementary landmark with its own heading.
- Provide a footer with a simple copyright notice.
- This pattern yields a predictable, accessible document structure that is easy to maintain in TS projects.

## 4. Keyboard & Screen Reader Testing

Focus on testing strategies and patterns that ensure your UI remains navigable and perceivable by screen readers. This section includes a dialog example with proper ARIA attributes and a focus-trap pattern to illustrate best practices.

```tsx
// AccessibleModal.tsx
import React, { useEffect, useRef } from 'react';

export const AccessibleModal: React.FC<{ open: boolean; onClose: () => void; title: string }> = ({
  open,
  onClose,
  title,
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button[href], [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef} className="modal">
      <div className="modal-content">
        <h2 id="modal-title">{title}</h2>
        <div>{children}</div>
        <button onClick={onClose} aria-label="Close dialog">Close</button>
      </div>
    </div>
  );
};
```

### Line-by-line explanation breaking down each line
- Import React hooks needed for the modal instance.
- Define a typed modal component with open state, close callback, and a title.
- Use a ref to the dialog container for focus management.
- When opened, locate a focusable element inside the dialog and focus it to satisfy focus semantics.
- Attach a keydown listener to close on Escape, which is a standard accessibility pattern for dialogs.
- Return null when closed to avoid rendering hidden DOM.
- Render the dialog as a landmark with role="dialog" and aria-modal="true" to indicate a modal context.
- Provide a labeled dialog title with aria-labelledby for screen readers.
- Include a content area and a Close button with an accessible label.
- This pattern demonstrates proper dialog semantics, focus handling, and keyboard accessibility.

## 5. Real-World Patterns and Best Practices

Apply semantic HTML and accessibility in real systems by focusing on forms, images, headings, and predictable navigation. This section demonstrates an accessible contact form that uses proper ALIASED labels, error messaging, and semantic grouping.

```tsx
// ContactForm.tsx
import React, { useState } from 'react';

export const ContactForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setError('Please complete all required fields.');
      return;
    }
    setError(null);
    // Submit logic here (e.g., fetch('/api/contact', { method:'POST', body: JSON.stringify({name, email, message})}))
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="contact-title">
      <h2 id="contact-title">Contact Us</h2>

      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" value={name} onChange={(e)=>setName(e.target.value)} required aria-required="true" />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required aria-required="true" />
      </div>

      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" value={message} onChange={(e)=>setMessage(e.target.value)} required aria-required="true" />
      </div>

      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}

      <button type="submit">Send Message</button>
    </form>
  );
};
```

### Line-by-line explanation breaking down each line
- Import React and useState for local form state management.
- Define a stateful form with fields for name, email, and message, plus an error string.
- Process form submission with validation; if any field is empty, show a prominent error message using a live region role.
- Render a form with a labeled heading to introduce the section.
- For each field, pair a visible label with a corresponding input/textarea element using htmlFor to associate.
- Each input has required and aria-required attributes to convey necessity to assistive tech.
- If an error exists, render a descriptive alert paragraph using role="alert" for screen readers.
- Add a submit button labeled clearly.
- This approach ensures each form control has a visible label and accessible error messaging, aligning with WCAG patterns.

## X. Common Beginner Mistakes

Bad vs Good code pairs to illustrate real pitfalls and how to fix them.

- Pitfall 1: Non-semantic wrappers instead of landmarks
  Bad:
  ```tsx
  <div className="header">
    <span>Site</span>
    <span>Menu</span>
  </div>
  ```
  Good:
  ```tsx
  <header>
    <h1>Site</h1>
    <nav aria-label="Main">
      <ul>
        <li><a href="#home">Home</a></li>
        <li><a href="#docs">Docs</a></li>
      </ul>
    </nav>
  </header>
  ```

- Pitfall 2: Missing or misassociated form labels
  Bad:
  ```tsx
  <input id="name" />
  <span>Name</span>
  ```
  Good:
  ```tsx
  <label htmlFor="name">Name</label>
  <input id="name" />
  ```

- Pitfall 3: Decorative images without proper alt handling
  Bad:
  ```tsx
  <img src="decor.png" alt="decorative" />
  ```
  Good (decorative becomes alt=""):
  ```tsx
  <img src="decor.png" alt="" aria-label="decorative" />
  ```
  Note: Prefer alt="" for decorative images; provide meaningful alt text for content images.

- Pitfall 4: Overusing ARIA roles on semantic elements
  Bad:
  ```tsx
  <div role="navigation">
    <a href="/home">Home</a>
  </div>
  ```
  Good:
  ```tsx
  <nav aria-label="Main navigation">
    <a href="/home">Home</a>
  </nav>
  ```

## Y. Why This Matters In Real Systems

- Accessibility broadens your user base, including people with visual, motor, or cognitive differences, and is a core component of inclusive product design.
- Semantic HTML helps screen readers, braille devices, and other assistive technologies interpret page structure quickly, improving UX for all users.
- WCAG-compliant markup improves SEO and discoverability; engines leverage landmark and heading structures to better index content.
- Real systems require maintainable, semantic components. Reusable TSX components that emphasize meaningful tags reduce bugs, simplify refactors, and enable automated checks (lint rules, aXe, Lighthouse).
- In production, poor semantics can lead to inaccessible forms, inaccessible navigation, and poor keyboard usability, resulting in user churn and legal risk in some jurisdictions.

## Z. Study Questions

1. What are the primary semantic HTML5 elements you should consider for structure and landmarks?
2. How does a skip-to-content link improve accessibility, and where should it appear in the document?
3. In TSX, how do you correctly associate a label with an input?
4. What attributes would you add to a custom modal to ensure screen readers announce it properly?
5. Why is using the time element with a dateTime attribute beneficial for accessibility and parsing?

## Exercise

Part A — Build a semantic site shell
- Create a TSX component SiteShell that composes a semantic layout with: header (branding and global nav), main content area with at least two articles (each with a header, time, and figure), an aside with related links, and a footer.
- Include a skip link, and ensure each article uses appropriate semantic tags (article, header, section, figure, figcaption, time).
- Deliverable: SiteShell.tsx with TypeScript typings and accessible markup.

Part B — Add an accessible modal
- Implement an AccessibleModal component (as in Section 4) that traps focus, uses role="dialog" and aria-modal="true", and closes on Escape or a close button.
- Ensure a consumer can open/close the modal via props and that focus returns to the triggering element when closed.
- Deliverable: AccessibleModal.tsx with proper typing and keyboard handling.

Part C — Create an accessible contact form
- Build a ContactForm.tsx using semantic HTML form controls with labels, required indicators, aria-required where appropriate, and an inline error message rendered with role="alert" when validation fails.
- On successful submit, simulate an accessible success message (aria-live region) or redirect notice.
- Deliverable: ContactForm.tsx with complete validation and accessible feedback.

Optional extension (for deeper practice)
- Integrate all three parts into a small page that demonstrates a site shell, a trigger to open the modal, and a contact section using semantic HTML. Ensure color contrast and reduced-motion considerations are discussed in comments or accompanying CSS notes.

End of lesson.