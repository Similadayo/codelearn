# CSS3 Foundations (Flexbox, Grid, Variables) — React Edition

CSS3 brings powerful, expressive layout and theming capabilities to modern web apps. Flexbox lets you design one-dimensional layouts that adapt gracefully as content changes, Grid enables two-dimensional, dense yet responsive grids, and CSS Variables provide design tokens for consistent theming across components. In a React context, combining these techniques yields maintainable, scalable UI patterns: predictable alignment, responsive grids, and easy theme switching without sprinkling style logic through components. This lesson walks you through practical, code-ready patterns you can reuse in production-grade interfaces.

## 1. Flexbox Fundamentals

This section introduces the core Flexbox concepts you’ll rely on to build flexible, responsive layouts in React: a flexible container, wrapping behavior, and alignment controls.

### Example: Flexbox card row (React)

```jsx
import React from 'react';
import './Flexbox.css';

const items = Array.from({ length: 6 }, (_, i) => `Item ${i + 1}`);

export default function FlexboxDemo() {
  return (
    <section aria-label="Flexbox demo" className="flex-demo">
      <div className="flex-container">
        {items.map((label) => (
          <div key={label} className="card">
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
```

```css
/* Flexbox.css */
.flex-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f5;
}
.card {
  flex: 0 1 120px;     /* shrink allowed, grow disabled, base width 120px */
  height: 80px;
  display: flex;
  align-items: center; /* vertical centering of content */
  justify-content: center; /* horizontal centering of content */
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```

### Line-by-line explanation breaking down each line

- React import: pulls in React for JSX syntax and component creation.
- CSS import: brings in styling for the Flexbox demo.
- items array: creates 6 labeled items to render as cards.
- FlexboxDemo component: defines a simple functional component.
- section element: semantic container with an accessible label.
- div.flex-container: establishes the flex context and wrapping behavior.
- map over items: renders a card for each item with a stable key.
- div.card: card styling element with centered content.
- CSS .flex-container: enables flex layout, wrapping, and spacing (gap).
- CSS .card: constrains width with flex-basis, ensures consistent height, and centers text.
- align-items: center and justify-content: center: center content both axes inside each card.
- background/border/radius/shadow: visual styling for the cards.

### Practical takeaways
- Use display: flex and flex-wrap: wrap to create responsive rows that reflow as container width changes.
- The flex shorthand flex: 0 1 120px gives predictable minimum sizing while allowing wrapping.
- Gap provides consistent spacing without needing margin hacks on each item.

## 2. Grid Fundamentals

Grid is designed for two-dimensional layouts, enabling precise control over rows and columns. This section covers a practical grid-based gallery that adapts to available space.

### Example: Responsive card grid (React)

```jsx
import React from 'react';
import './GridGallery.css';

export default function GridGallery() {
  const cards = Array.from({ length: 8 }, (_, i) => `Card ${i + 1}`);
  return (
    <section aria-label="Grid demo" className="grid-demo">
      <div className="grid-container">
        {cards.map((c) => (
          <div key={c} className="grid-card">
            {c}
          </div>
        ))}
      </div>
    </section>
  );
}
```

```css
/* GridGallery.css */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  padding: 1rem;
}
.grid-card {
  height: 100px;
  background: #fff;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;   /* vertical centering inside grid item */
  justify-content: center; /* horizontal centering inside grid item */
  border-radius: 8px;
}
```

### Line-by-line explanation breaking down each line

- Import React: enables JSX and component usage.
- Import CSS: links GridGallery styling.
- cards array: creates eight labeled cards to render in the grid.
- GridGallery component: functional component returning grid markup.
- section element: semantic container with accessible label.
- div.grid-container: sets up the CSS Grid layout.
- grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)): creates as many 120px columns as will fit, each growing to fill available space; auto-fill fills the row with as many items as fit.
- gap: 12px: defines consistent spacing between grid items.
- padding: 1rem: internal spacing around the grid.
- grid-card: individual grid items with fixed height and centering.
- display: flex; align-items: center; justify-content: center: center content inside each card both vertically and horizontally.
- background, border, border-radius: visual styling for grid items.

### Practical takeaways
- Use grid-template-columns with repeat and minmax to create responsive columns that adapt to screen size.
- auto-fill and minmax enable fluid, dense layouts that gracefully fill space without manual breakpoint definitions.
- Combine Grid with fixed-height cards for predictable card-like layouts that scale smoothly.

## 3. CSS Variables for Theming

CSS Variables (custom properties) let you define design tokens that can be changed at runtime, enabling theming and design-system consistency without touching component logic. This section shows a simple runtime theme switch in a React context.

### Example: Theming with CSS variables (React)

```jsx
import React, { useState } from 'react';
import './Variables.css';

export default function ThemeDemo() {
  const [theme, setTheme] = useState('light');
  return (
    <div className="variables-demo" data-theme={theme}>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      <div className="card" aria-label="themed card">
        Themed content using CSS variables
      </div>
    </div>
  );
}
```

```css
/* Variables.css */
:root {
  --bg: #ffffff;
  --text: #111111;
  --card: #f3f4f6;
}
[data-theme="dark"] {
  --bg: #0f111a;
  --text: #e6e6f6;
  --card: #1b1f2a;
}
.variables-demo {
  background: var(--bg);
  color: var(--text);
  padding: 1rem;
  border-radius: 8px;
}
.variables-demo .card {
  background: var(--card);
  border: 1px solid #444;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
}
```

### Line-by-line explanation breaking down each line

- React import: enables use of useState and JSX.
- useState import: manages the current theme state.
- ThemeDemo component: defines a simple theme toggle example.
- <div className="variables-demo" data-theme={theme}>: wraps content and exposes current theme via a data-theme attribute for CSS.
- Button onClick: toggles between 'light' and 'dark' themes.
- .card div: visually demonstrates theming on a nested element.
- :root CSS variables: define base theme tokens for background, text, and cards.
- [data-theme="dark"] CSS variables: override tokens to provide a dark theme.
- .variables-demo styling: uses CSS variables to paint background and text.
- .card styling: uses CSS variables to paint card surface, borders, and padding.

### Practical takeaways
- CSS Variables enable runtime theming with minimal JavaScript. Change a single token set to recolor the UI.
- Use a data attribute (like data-theme) to scope theme changes to a subtree without global side effects.
- Fallbacks and naming conventions improve resilience; consider using a token naming strategy (e.g., color-*, space-*, radii-*).

## X. Common Beginner Mistakes

### 1) Forgetting to specify a flex item’s growth/shrink behavior
Bad:
```css
.flex-container { display: flex; }
.card { width: 140px; } /* rigid width, can break wrapping on small screens */
```
Good:
```css
.flex-container { display: flex; flex-wrap: wrap; gap: 1rem; }
.card { flex: 0 1 140px; } /* base width, allows shrinking slightly if needed */
```

### 2) Over-nesting Flexbox inside a Grid (or vice versa) without clear intent
Bad:
```jsx
<div className="grid">
  <div className="grid-item">
    <div className="inner-flex" style={{ display: 'flex' }}>
      <span>Item</span>
    </div>
  </div>
  <!-- more items -->
</div>
```
Good:
```css
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.grid-item { display: flex; align-items: center; justify-content: center; }
```
```jsx
<div className="grid">
  <div className="grid-item">
    <span>Item</span>
  </div>
  <!-- more items -->
</div>
```

### 3) Using CSS Variables without fallbacks or scoping
Bad:
```css
:root { --bg: #fff; --text: #111; }
body { background: var(--bg); color: var(--text); }

/* No dark theme support or scoping */
```
Good:
```css
:root { --bg: #ffffff; --text: #111; --card: #f7f7f7; }
[data-theme="dark"] { --bg: #0b0f14; --text: #e6e6f6; --card: #1a1f2a; }
.app { background: var(--bg); color: var(--text); }
.card { background: var(--card); }
```

## Y. Why This Matters In Real Systems

- Responsiveness: Flexbox and Grid are the backbone of responsive UI. They dramatically reduce boilerplate for common layouts like navbars, galleries, dashboards, and form grids.
- Maintainability: CSS Variables enable design tokens, ensuring consistent theming across many components. Designers and developers speak a common language for colors, spacing, and radii.
- Theming and accessibility: Runtime theming supports dark/light modes and high-contrast themes, improving accessibility and user comfort.
- Performance and scalability: layout decisions are declarative in CSS; less JS-driven layout logic means fewer reflows and smoother interactions in large apps.
- Real-world integration: Design systems often ship with tokens and layout primitives. Mastery of Flexbox, Grid, and Variables helps you implement and extend such systems reliably in React apps.

## Z. Study Questions

1) How does grid-template-columns with repeat(auto-fill, minmax(...)) differ from a fixed-column layout, and why is it useful for responsive grids?  
2) What is the purpose of flex-wrap: wrap in a Flexbox container, and how does it affect item placement as container width changes?  
3) How can CSS Variables be changed at runtime to switch themes without re-mounting components?  
4) In a React app, why might you prefer CSS Grid for two-dimensional layouts over using nested Flexbox containers?  
5) Describe a minimal approach to implement a dark mode theme using only CSS variables and a data-theme attribute.

## Exercise

Goal: Build a small, reusable React layout that demonstrates Flexbox, Grid, and CSS Variables in a production-like pattern.

Part A — Create a responsive header using Flexbox
- Task: Implement a header with a brand on the left and a navigation menu on the right. The header should remain nicely aligned on desktop but wrap gracefully on narrow viewports.
- Deliverables:
  - React component: Header.jsx
  - CSS: Header.css
- Starter code:
```jsx
// Header.jsx
import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="brand">Acme Co</div>
      <nav aria-label="Main navigation" className="nav">
        {['Home','Projects','Blog','Contact'].map((t) => (
          <a key={t} href="#" className="nav-link">{t}</a>
        ))}
      </nav>
    </header>
  );
}
```
```css
/* Header.css */
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--bg);
  color: var(--text);
  border-bottom: 1px solid #ddd;
}
.brand { font-weight: 700; font-size: 1.1rem; }
.nav { display: flex; gap: 1rem; }
.nav-link { text-decoration: none; color: inherit; }
@media (max-width: 600px) {
  .site-header { flex-wrap: wrap; gap: 0.5rem; }
  .nav { width: 100%; justify-content: space-between; }
}
```

Part B — Create a responsive content grid using CSS Grid
- Task: Below the header, render a grid of 6 cards that adapts to screen width (3 columns on large, 2 on medium, 1 on small).
- Deliverables:
  - React component: ContentGrid.jsx
  - CSS: ContentGrid.css
- Starter code:
```jsx
// ContentGrid.jsx
import React from 'react';
import './ContentGrid.css';

export default function ContentGrid() {
  const cards = Array.from({ length: 6 }, (_, i) => `Card ${i + 1}`);
  return (
    <section className="content-grid" aria-label="Content grid">
      {cards.map((c) => (
        <div key={c} className="grid-card">{c}</div>
      ))}
    </section>
  );
}
```
```css
/* ContentGrid.css */
.content-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1rem;
}
.grid-card {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border: 1px solid #ddd;
  border-radius: 8px;
}
@media (max-width: 1024px) {
  .content-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .content-grid { grid-template-columns: 1fr; }
}
```

Part C — Implement theming for light/dark via CSS Variables
- Task: Add a theme switch that toggles a light/dark appearance using CSS Variables, and ensure the header and grid pick up the theme.
- Deliverables:
  - React component: ThemeToggle.jsx
  - CSS: Variables.css
- Starter code:
```jsx
// ThemeToggle.jsx
import React, { useState } from 'react';
import './Variables.css';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  return (
    <div className="theme-tog" data-theme={theme}>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      <p className="hint">Theme uses CSS variables for tokens.</p>
    </div>
  );
}
```
```css
/* Variables.css */
:root {
  --bg: #ffffff;
  --text: #111111;
  --card: #f3f4f6;
}
[data-theme="dark"] {
  --bg: #0f111a;
  --text: #e6e6f6;
  --card: #1b1f2a;
}
.theme-tog {
  background: var(--bg);
  color: var(--text);
  padding: 1rem;
  border-top: 1px solid #ddd;
}
.theme-tog .hint {
  color: color-mix(in oklab, var(--text) 60%, transparent);
}
```

Part D — Wire it together in a simple App (optional)
- Task: Compose Header, ContentGrid, and ThemeToggle into a single page. Ensure Flexbox handles the header, Grid handles content, and CSS Variables drive theming.
- Deliverables:
  - App.jsx
  - Styles.css (global tokens)
- Starter code:
```jsx
// App.jsx
import React from 'react';
import Header from './Header';
import ContentGrid from './ContentGrid';
import ThemeToggle from './ThemeToggle';
import './Global.css';

export default function App() {
  return (
    <div className="app" data-theme="light">
      <Header />
      <ContentGrid />
      <ThemeToggle />
    </div>
  );
}
```
```css
/* Global.css (global tokens) */
:root {
  --bg: #ffffff;
  --text: #111;
  --card: #f8f9fa;
}
.app {
  background: var(--bg);
  color: var(--text);
}
```

What you should deliver for the exercise
- A small React app (or a set of components) demonstrating: a Flexbox header, a responsive Grid content area, and a CSS-Variables-based light/dark theme toggle.
- The UI should be accessible (semantic elements, ARIA labels) and responsive across devices.
- Code should be modular (separate components and CSS files) and easy to reuse in larger projects.

Notes
- The examples in this lesson focus on practical, copy-paste-ready patterns you can adapt to your real projects.
- When styling for production, you may want to use CSS Modules or CSS-in-JS for scoping and maintainability, but the underlying Flexbox/Grid/Variables concepts remain the same.