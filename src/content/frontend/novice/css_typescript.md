# CSS3 Foundations (Flexbox, Grid, Variables) - Phase 1: The Foundations

Frontends today demand fast, responsive, accessible layouts that scale with teams and features. CSS3 brings powerful layout tools like Flexbox and Grid, plus custom properties (CSS variables) to theme and evolve interfaces without touching a mountain of code. In a TypeScript frontend, these foundations pair with TS/React/Vue or vanilla TS to create predictable, maintainable, and responsive UI. This lesson builds a practical mental model and hands-on skills for crafting layouts that adapt to devices, teams, and user choices.

## 1. Flexbox fundamentals

Flexbox is a one-dimensional layout system that aligns and distributes space among items in a container. It’s ideal for toolbars, navigation, inline lists, and any row/column layout where space distribution matters.

Code example (HTML):
```html
<nav class="flex-demo" aria-label="Main navigation">
  <span class="item">Home</span>
  <span class="item">About</span>
  <span class="item">Blog</span>
  <span class="item">Contact</span>
</nav>
```

Code example (CSS):
```css
.flex-demo {
  display: flex;
  flex-direction: row;   /* horizontal layout by default */
  justify-content: space-between; /* distributes free space between items */
  align-items: center;     /* vertical alignment along cross axis */
  padding: 1rem;
  gap: 1rem;                 /* space between items (modern alternative to margins) */
  background: #f0f0f0;
}
.item {
  padding: .5rem 1rem;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e2e2e2;
}
```

Code example (TypeScript + React TSX):
```tsx
import React from 'react';

type FlexNavProps = { items: string[] };

export const FlexNav: React.FC<FlexNavProps> = ({ items }) => {
  return (
    <nav className="flex-demo" aria-label="Main">
      {items.map((name) => (
        <span key={name} className="item">{name}</span>
      ))}
    </nav>
  );
};
```

### Line-by-line explanation
- HTML block:
  - nav.flex-demo: Creates a semantic navigation container using the flex layout.
  - aria-label: Improves accessibility by describing the nav.
  - Each span.item: Represents a navigable item that will participate in flex layout.
- CSS block:
  - display: flex; enables Flexbox on the container.
  - flex-direction: row; ensures items line up horizontally.
  - justify-content: space-between; places the first item at start, last at end, and distributes equal gaps in between.
  - align-items: center; vertically centers items along the cross axis.
  - padding and gap: provide breathing room around and between items.
  - .item: visually distinct blocks (padding, background, rounded corners, border).
- TSX block:
  - FlexNav is a functional React component typed with TypeScript.
  - items prop maps to a list of rendered items, each with a stable key.
  - The component remains purely presentational; layout behavior is controlled by CSS.

## 2. Grid fundamentals

Grid is a two-dimensional layout system that handles both rows and columns. It’s ideal for dashboards, galleries, and card grids where precise control over placement and wrapping matters.

Code example (HTML):
```html
<section class="grid-demo" aria-label="Gallery grid">
  <article class="card">Card 1</article>
  <article class="card">Card 2</article>
  <article class="card">Card 3</article>
  <article class="card">Card 4</article>
  <article class="card">Card 5</article>
  <article class="card">Card 6</article>
</section>
```

Code example (CSS):
```css
.grid-demo {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  padding: 1rem;
}
.card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
  border: 1px solid rgba(0,0,0,.05);
}
```

Code example (TypeScript + React TSX):
```tsx
import React from 'react';

export const CardGrid: React.FC<{ items: string[] }> = ({ items }) => {
  return (
    <section className="grid-demo" aria-label="Cards grid">
      {items.map((t) => (
        <article key={t} className="card">{t}</article>
      ))}
    </section>
  );
};
```

### Line-by-line explanation
- HTML block:
  - section.grid-demo: A grid container to hold a collection of items.
  - article.card: Individual grid items (cards) that will be placed inside the grid.
- CSS block:
  - display: grid; activates CSS Grid on the container.
  - grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); creates as many columns as will fit, with a minimum column width of 180px and equal distribution of remaining space (1fr).
  - gap: 1rem; provides even spacing between grid items.
  - .card: styling for cards (background, padding, radius, subtle shadow, border).
- TSX block:
  - CardGrid is a generic React component rendering a list of items as cards inside the grid container.
  - key={t}: stable keys derived from item content to help React with reconciliation.

## 3. CSS Variables (Custom Properties) and usage in TS frontends

CSS variables enable theming and design system consistency. They are evaluated by the browser, can be changed at runtime with JS/TS, and cascade naturally.

Code example (CSS):
```css
:root {
  --bg: #f7f7f7;
  --text: #111;
  --card: #fff;
  --primary: #4f46e5;
  --radius: 8px;
}
:root.dark {
  --bg: #0b1020;
  --text: #e5e7eb;
  --card: #141828;
  --primary: #7c3aed;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto;
}
.card {
  background: var(--card);
  color: var(--text);
  border-radius: var(--radius);
  padding: 1rem;
  border: 1px solid rgba(0,0,0,.05);
}
.btn {
  background: var(--primary);
  color: white;
  padding: .5rem 1rem;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}
```

Code example (TypeScript + Vanilla TS for theme toggle):
```ts
// Theme toggle utility
export function toggleTheme(): void {
  const root = document.documentElement;
  root.classList.toggle('dark');
}
```

Code example (HTML usage for a toggle button):
```html
<button id="themeToggle" aria-label="Toggle theme">Toggle Theme</button>
```

Code example (TypeScript wiring for the toggle):
```ts
const btn = document.getElementById('themeToggle');
btn?.addEventListener('click', () => {
  toggleTheme();
});
```

Code example (React TSX theme toggle component):
```tsx
import React from 'react';

export const ThemeToggleButton: React.FC = () => {
  const onClick = () => document.documentElement.classList.toggle('dark');
  return (
    <button id="themeToggle" aria-label="Toggle theme" onClick={onClick}>
      Toggle Theme
    </button>
  );
};
```

### Line-by-line explanation
- CSS:
  - :root defines the default theme variables for background, text, card surfaces, primary color, and corner radius.
  - .dark variant on :root overrides the same variables for a dark theme. This is how theming is accomplished without changing component code.
  - Body uses CSS variables for global background and text color.
  - .card and .btn demonstrate using variables cross-component (background, radius, and color).
- TS utility toggleTheme():
  - Accesses the root element and toggles the 'dark' class, which switches the CSS variable values via the :root.dark selector.
- HTML button:
  - Simple trigger element to switch themes.
- TS wiring:
  - Attaches a click listener to the button to trigger the theme toggle.
- React TSX ThemeToggleButton:
  - Stateless button that toggles the theme by mutating the root class list.

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

1) Pitfall: Not using flex-wrap when needed (causes overflow)
- Bad:
```css
.flex-demo {
  display: flex;
  flex-direction: row;
}
```
- Good:
```css
.flex-demo {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
}
```

2) Pitfall: Fixed grid columns that don’t adapt to viewport
- Bad:
```css
.grid-demo {
  display: grid;
  grid-template-columns: 200px 200px 200px;
}
```
- Good:
```css
.grid-demo {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}
```

3) Pitfall: Referring to CSS variables that don’t exist or skipping fallbacks
- Bad:
```css
:root {
  --bg: #fff;
}
body {
  background: var(--background); /* typo: uses a non-existent var name */
}
```
- Good:
```css
:root {
  --bg: #fff;
}
body {
  background: var(--bg, #fff);
  color: var(--text, #111);
}
```

4) Pitfall: Not considering accessibility in layout changes
- Bad (hiding content without accessible state):
```html
<div id="sidebar" style="display:none"></div>
```
- Good (toggle with ARIA and semantic state):
```html
<aside id="sidebar" aria-hidden="true" hidden></aside>
```
And ensure ARIA attributes reflect the actual state when you reveal/hide content.

5) Pitfall: Overusing inline styles for layout instead of CSS classes
- Bad:
```tsx
<div style={{ display: 'flex', flexDirection: 'row' }}></div>
```
- Good:
```tsx
<div className="row-layout"></div>
```
With a stylesheet:
```css
.row-layout { display: flex; flex-direction: row; }
```

## 5. Why This Matters In Real Systems

- Responsiveness: Flexbox handles one-dimensional alignment and flexible growth, while Grid ensures deterministic two-dimensional placement. Real apps require both to adapt to devices, content length, and dynamic data.
- Theming and branding: CSS variables enable consistent theming across a design system. Switching themes at runtime becomes a safe, centralized operation with minimal performance cost.
- Maintainability: Clear separation of structure (HTML), presentation (CSS), and behavior (TS/TSX) reduces merge conflicts, speeds up onboarding, and improves collaboration in large teams.
- Accessibility: Semantic containers (nav, section, article) combined with logical focus order and ARIA attributes create inclusive interfaces. Layout choices should preserve readability and keyboard navigation.
- Performance: Modern layout engines optimize flex/grid rendering; avoiding excessive nesting and avoiding layout thrashing yields smoother interactions, especially on mobile.

## 6. Study Questions

1) What is the primary difference between Flexbox and CSS Grid in terms of layout direction?
2) How do you create a responsive grid that automatically fills the container width with as many columns as fit?
3) What is a CSS variable, and how would you switch a theme at runtime using JS/TS?
4) Why might you add flex-wrap: wrap to a horizontal navigation bar?
5) How can you ensure a CSS variable-based theme gracefully falls back if a variable is missing?

## 7. Exercise

Build a small, self-contained UI that demonstrates Flexbox, Grid, and CSS variables with a TypeScript frontend. Deliverables should be pure HTML/CSS/TS (or TSX if using React) and should run in a standard browser.

Part A — Header with Flexbox
- Create a header that uses a flex container to lay out:
  - Brand logo at left
  - Center navigation (3 items)
  - A search input and a theme toggle button at right
- Ensure the header is responsive: on small screens, consider stacking or compressing items.

Part B — Responsive Card Grid with Grid
- Create a responsive grid section that contains at least 6 cards.
- Use CSS Grid with auto-fill and minmax so cards reflow gracefully as the viewport changes.
- Each card should have a title and a short description.

Part C — Theming with CSS Variables
- Define a light and dark theme using CSS custom properties.
- Add a toggle button that switches themes at runtime (no page reloads).
- Style cards, header, and background using the variables.

Part D — TypeScript Wiring (Vanilla TS or React TSX)
- If using vanilla TS, wire up event listeners to:
  - Theme toggle button to switch themes (class on root or CSS variable changes)
  - A simulated filter (optional) to demonstrate dynamic content in a grid (e.g., filtering visible cards by category)
- If using React, implement a small ThemeSwitcher component and a CardGrid component, ensuring layout remains consistent with the CSS from Parts A–C.

Starter code sketch (Vanilla TS, single-file simplicity):

index.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CSS3 Foundations - Exercise</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header" role="banner">
    <div class="brand">MyBrand</div>
    <nav class="main-nav" aria-label="Main">
      <a href="#">Features</a>
      <a href="#">Pricing</a>
      <a href="#">Docs</a>
    </nav>
    <div class="header-controls">
      <input type="text" placeholder="Search…" aria-label="Search" />
      <button id="themeToggle" aria-label="Toggle theme">Toggle Theme</button>
    </div>
  </header>

  <section class="grid-demo" aria-label="Cards grid">
    <article class="card">
      <h3>Card A</h3><p>Short description.</p>
    </article>
    <article class="card">
      <h3>Card B</h3><p>Short description.</p>
    </article>
    <article class="card">
      <h3>Card C</h3><p>Short description.</p>
    </article>
    <article class="card">
      <h3>Card D</h3><p>Short description.</p>
    </article>
    <article class="card">
      <h3>Card E</h3><p>Short description.</p>
    </article>
    <article class="card">
      <h3>Card F</h3><p>Short description.</p>
    </article>
  </section>

  <script src="app.js"></script>
</body>
</html>
```

styles.css
```css
:root {
  --bg: #f7f7f7;
  --text: #111;
  --card: #fff;
  --primary: #4f46e5;
  --radius: 8px;
}
:root.dark {
  --bg: #0b1020;
  --text: #e5e7eb;
  --card: #141828;
  --primary: #7c3aed;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto;
}
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(0,0,0,.08);
  background: color-msolve;
}
.brand { font-weight: bold; font-size: 1.2rem; }
.main-nav {
  display: flex; gap: 1rem;
}
.main-nav a { color: var(--text); text-decoration: none; }
.header-controls {
  display: flex; gap: .5rem; align-items: center;
}
.grid-demo {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  padding: 1rem;
}
.card {
  background: var(--card);
  color: var(--text);
  padding: 1rem;
  border-radius: var(--radius);
  border: 1px solid rgba(0,0,0,.05);
}
#themeToggle {
  background: var(--primary);
  color: #fff;
  border: 0;
  padding: .5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}
@media (max-width: 700px) {
  .main-nav { display: none; } /* simple responsive tweak for demo */
}
```

app.ts
```ts
export function toggleTheme(): void {
  const root = document.documentElement;
  root.classList.toggle('dark');
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('themeToggle');
  btn?.addEventListener('click', () => toggleTheme());
});
```

How to run exercise:
- Place the HTML, CSS, and TS in a small project, compile the TS to JS (or use a TS playground). Ensure the theme toggle button switches between light and dark by toggling the root class.

Notes:
- The exercise reinforces: Flexbox for header alignment, Grid for responsive card layouts, and CSS variables for theming. It’s intentionally minimal and portable so you can build from it in your project scaffolds.

If you’d like, I can tailor the exercise for a specific framework (React with CSS Modules, Vue with scoped styles, or a plain TS setup) and provide a ready-to-run repository snippet.