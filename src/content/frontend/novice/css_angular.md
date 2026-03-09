# CSS3 Foundations (Flexbox, Grid, Variables) — Angular

Frontend Engineering Phases: Phase 1 — The Foundations. In this lesson, we explore CSS3 foundations—Flexbox for one-dimensional layouts, Grid for two-dimensional layouts, and CSS Custom Properties (variables) for theming and runtime styling—within an Angular context. These techniques underpin responsive, maintainable UI systems in real-world apps. We’ll pair theory with concrete Angular-ready examples, show how to structure component styles, and demonstrate how to leverage CSS variables for light/dark theming and design tokens across components.

## 1. Flexbox Fundamentals in Angular

Flexbox lets you arrange items along a single axis with precise alignment controls. In Angular apps, you typically apply Flexbox styles in component SCSS/CSS while keeping markup semantic and accessible.

```html
<!-- flex-demo.component.html -->
<header class="flex-toolbar" role="banner">
  <div class="brand" aria-label="Brand">MyApp</div>

  <nav class="nav" aria-label="Primary">
    <a href="#" class="link">Overview</a>
    <a href="#" class="link">Docs</a>
    <a href="#" class="link">Examples</a>
  </nav>

  <button class="cta" (click)="onCta()">Get Started</button>
</header>
```

```ts
// flex-demo.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-flex-demo',
  templateUrl: './flex-demo.component.html',
  styleUrls: ['./flex-demo.component.scss']
})
export class FlexDemoComponent {
  onCta(): void {
    console.log('CTA clicked');
  }
}
```

```scss
/* flex-demo.component.scss */
:host {
  display: block;
  padding: 1rem;
  --accent: #4f46e5;
  --bg: #fff;
  background: var(--bg);
}

.flex-toolbar {
  display: flex;
  align-items: center;        /* cross-axis alignment (vertical if row) */
  justify-content: space-between; /* main-axis distribution */
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(0,0,0,.08);
  background: var(--bg);
}

.brand {
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: .2px;
}

.nav { display: flex; gap: 1rem; }
.link { text-decoration: none; color: #374151; }

.cta {
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
@media (max-width: 700px) {
  .flex-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .nav { justify-content: space-between; }
  .cta { width: 100%; }
}
```

### Line-by-line explanation (HTML)
- Header element with class "flex-toolbar" acts as a flex container.
- Brand div provides the app name on the left.
- Nav contains primary navigation links laid out horizontally.
- CTA button sits on the right and triggers onCta() when clicked.

### Line-by-line explanation (TS)
- Import Angular core to define a component.
- Component decorator wires template and stylesheet.
- onCta() logs a message; in real apps you’d route or dispatch an action.

### Line-by-line explanation (SCSS)
- :host is a wrapper for this component; sets base padding and CSS vars.
- .flex-toolbar uses display: flex to create a single-row flex container.
- align-items centers items along the cross-axis (vertical alignment).
- justify-content: space-between pushes first and last items to edges; middle items distribute evenly.
- .nav uses a second flex container for inner items.
- @media query flips layout to vertical stack on small screens.

## 2. Grid Layout Essentials in Angular

CSS Grid provides powerful two-dimensional layouts. In Angular, you can structure the DOM semantically and apply grid areas for readability and maintainability.

```html
<!-- grid-demo.component.html -->
<div class="grid-layout" aria-label="Dashboard grid">
  <header class="grid-header">Dashboard</header>

  <aside class="grid-sidebar" aria-label="Sidebar">
    <nav>
      <a href="#">Overview</a>
      <a href="#">Reports</a>
      <a href="#">Settings</a>
    </nav>
  </aside>

  <main class="grid-main" aria-label="Main content">
    <section class="card" *ngFor="let c of cards">
      {{ c.title }}
    </section>
  </main>

  <footer class="grid-footer">© 2026 MyApp</footer>
</div>
```

```ts
// grid-demo.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-grid-demo',
  templateUrl: './grid-demo.component.html',
  styleUrls: ['./grid-demo.component.scss']
})
export class GridDemoComponent {
  cards = [
    { title: 'Sales' },
    { title: 'Users' },
    { title: 'Engagement' },
    { title: 'Conversion' }
  ];
}
```

```scss
/* grid-demo.component.scss */
.grid-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 64px 1fr 48px;
  grid-template-areas: "header header" "sidebar main" "footer footer";
  gap: 16px;
  min-height: 100vh;
}

.grid-header  { grid-area: header; display:flex; align-items:center; padding: 0 1rem; background: #111; color: #fff; }
.grid-sidebar { grid-area: sidebar; padding: 1rem; background: #f3f4f6; }
.grid-main    { grid-area: main; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; padding: 1rem; }
.card         { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.grid-footer  { grid-area: footer; padding: 0.5rem 1rem; background: #111; color: #fff; text-align: center; }

@media (max-width: 900px) {
  .grid-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "sidebar"
      "main"
      "footer";
  }
}
```

### Line-by-line explanation (HTML)
- grid-layout is a grid container with named areas: header, sidebar, main, footer.
- grid-header, grid-sidebar, grid-main, grid-footer map to the respective areas.
- grid-main uses a responsive grid of cards via repeat(auto-fill, minmax(...)).

### Line-by-line explanation (TS)
- cards array provides content for the grid cards; *ngFor iterates to render cards.

### Line-by-line explanation (SCSS)
- grid-template-columns defines two columns: a fixed 260px sidebar and a fluid main area.
- grid-template-areas explicitly wires DOM sections to named regions.
- The media query collapses to a single column on smaller screens for responsiveness.

## 3. CSS Variables and Theming in Angular

CSS custom properties (variables) enable design tokens and runtime theming. In Angular apps, you can centralize tokens in global styles and override them via a data-theme attribute for dynamic theming.

```scss
/* styles.scss (global) - Tokens and theming scaffold */
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --card: #ffffff;
  --primary: #3b82f6;
}

[data-theme="dark"] {
  --bg: #0b1020;
  --surface: #141a2a;
  --text: #e5e7eb;
  --muted: #9ca3af;
  --card: #1f2542;
  --primary: #93c5fd;
}
```

```html
<!-- theming-demo.component.html -->
<div class="themed-shell" style="background: var(--bg); color: var(--text); padding: 1rem;">
  <button (click)="toggleTheme()">Toggle Theme</button>

  <div class="card" style="margin-top: 1rem;">
    Themed content uses CSS variables for colors and surfaces.
  </div>
</div>
```

```ts
// theming-demo.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-theming-demo',
  templateUrl: './theming-demo.component.html',
  styleUrls: ['./theming-demo.component.scss']
})
export class ThemingDemoComponent {
  toggleTheme(): void {
    const next = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark'
      ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
  }
}
```

```scss
/* theming-demo.component.scss */
:host { display: block; border: 1px solid rgba(0,0,0,.08); padding: 1rem; border-radius: 8px; }

.themed-shell { padding: 1rem; border-radius: 8px; background: var(--surface); color: var(--text); }

.card {
  padding: 1rem;
  border-radius: 8px;
  background: var(--card);
  border: 1px solid rgba(0,0,0,.08);
}
button {
  background: var(--primary);
  color: white;
  border: none;
  padding: .5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}
```

### Line-by-line explanation (CSS Variables)
- Global tokens defined on :root provide default theme values.
- [data-theme="dark"] overrides tokens for dark theme.
- Elements using var(--token) automatically pick up the current theme.

### Line-by-line explanation (TS)
- toggleTheme reads current theme from data-theme on the document root and toggles to the opposite value.
- It then applies the new theme by setting data-theme on the document element, which changes CSS variable values across the app.

### Line-by-line explanation (HTML)
- The themed-shell uses CSS variables for its background and text color.
- The button triggers theme toggling to demonstrate runtime theming.

## 4. Putting It Together: Responsive Patterns in a Small Angular Component

This section demonstrates combining Flexbox, Grid, and Variables to build a compact, responsive UI component in Angular.

```html
<!-- app-dashboard.component.html -->
<div class="app-shell" [class.dark]="isDark">
  <header class="topbar">
    <div class="brand">Analytics</div>
    <button (click)="toggleTheme()">Theme</button>
  </header>

  <div class="layout">
    <aside class="sidebar" aria-label="Sidebar">
      <nav>
        <a href="#">Overview</a>
        <a href="#">Reports</a>
        <a href="#">Settings</a>
      </nav>
    </aside>

    <main class="content" aria-label="Content area">
      <div class="widget" *ngFor="let w of widgets">
        <h4>{{ w.title }}</h4>
        <p>{{ w.value }}</p>
      </div>
    </main>
  </div>
</div>
```

```ts
// app-dashboard.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './app-dashboard.component.html',
  styleUrls: ['./app-dashboard.component.scss']
})
export class AppDashboardComponent {
  isDark = false;
  widgets = [
    { title: 'Revenue', value: '$12k' },
    { title: 'Active Users', value: '1,234' },
    { title: 'Conversion', value: '3.8%' },
    { title: 'Bounce Rate', value: '41%' }
  ];

  toggleTheme(): void {
    this.isDark = !this.isDark;
    const next = this.isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
  }
}
```

```scss
/* app-dashboard.component.scss */
:host {
  display: block;
  padding: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.app-shell { display: flex; flex-direction: column; height: 100%; }

.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem; background: var(--surface);
  border-bottom: 1px solid rgba(0,0,0,.08);
}

.brand { font-weight: 700; }

.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  padding: 1rem;
  flex: 1;
}

.sidebar {
  background: var(--surface);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,.08);
}

.content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  padding: 1rem;
}

.widget {
  background: var(--card);
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 8px;
  padding: 1rem;
}

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { order: 2; }
}
```

### Line-by-line explanation (HTML)
- The app-dashboard component composes a header (topbar), a left sidebar, and a responsive content grid.
- The toggleTheme button switches app-wide theme via data-theme attributes.
- The content area renders a responsive set of widgets using ngFor.

### Line-by-line explanation (TS)
- isDark tracks whether dark mode is enabled.
- widgets array provides data for the grid of widgets.
- toggleTheme flips isDark and applies the corresponding theme class to the document root.

### Line-by-line explanation (SCSS)
- The topbar uses Flexbox to place the brand and theme button.
- The layout uses CSS Grid for a two-column dashboard with a responsive content area.
- The content grid auto-fits cards via repeat(auto-fill, minmax(...)).
- Media query collapses to a single-column layout on narrow viewports.

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not using box-sizing border-box
  - Bad
  ```css
  .card {
    width: 300px;
    padding: 16px;
  }
  ```
  - Good
  ```css
  *, *::before, *::after { box-sizing: border-box; }
  .card { width: 100%; padding: 16px; }
  ```

- Pitfall 2: Over-reliance on fixed widths/heights in responsive layouts
  - Bad
  ```css
  .sidebar { width: 240px; height: 600px; }
  .content { width: calc(100% - 240px); }
  ```
  - Good
  ```css
  .layout { display: grid; grid-template-columns: 260px 1fr; }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }
  ```

- Pitfall 3: Using pure floats for layout
  - Bad
  ```css
  .left { float: left; width: 200px; }
  .right { float: right; width: calc(100% - 200px); }
  ```
  - Good
  ```css
  .container { display: flex; gap: 1rem; }
  .left { width: 260px; }
  .right { flex: 1; }
  ```

- Pitfall 4: Not leveraging CSS variables for theming
  - Bad
  ```css
  .card { background: #fff; color: #111; }
  ```
  - Good
  ```css
  :root { --card-bg: #fff; --text: #111; }
  [data-theme="dark"] { --card-bg: #1f2542; --text: #e5e7eb; }
  .card { background: var(--card-bg); color: var(--text); }
  ```

Y. Why This Matters In Real Systems — production context and real usage

- Consistency and design tokens: CSS variables enable a single source of truth for colors, typography, spacings, and component tokens, making theming across large apps feasible.
- Theming at runtime: By toggling data-theme (or design tokens), you can switch themes without reworking markup, enabling dark mode and design-system variants.
- Responsive UX: Flexbox and Grid let you support a wide range of devices—from phones to desktops—without duplicating markup or CSS.
- Accessibility and semantics: Clear separation of structure (HTML) and style (CSS) improves accessibility and maintainability. Semantic HTML (header, nav, main, footer) pairs well with grid/flex layouts.
- Maintainability and collaboration: Component-scoped styles in Angular help teams avoid global CSS conflicts while still allowing global tokens via CSS variables.

Z. Study Questions — 5 recall questions

1) What is the difference between the main axis and the cross axis in Flexbox? How would you align items vertically in a row?  
2) When would you choose CSS Grid over Flexbox, and what is the advantage of grid-template-areas?  
3) How do you define a CSS custom property and apply it to multiple components in Angular?  
4) How can you implement a responsive dashboard that collapses a sidebar on small screens using CSS Grid and media queries?  
5) How can you toggle themes in an Angular app using a data-theme attribute and CSS variables? Briefly describe the steps.

Exercise — a practical multi-part coding challenge

Goal: Build a small Angular component that uses Flexbox for the header, CSS Grid for the content area, and CSS variables for theming. Implement a theme toggle and a responsive sidebar.

Part A — Project setup and skeleton
- Create an Angular component named DashboardComponent (selector: app-dashboard) with template and stylesheet references.
- Provide a header area with a brand and a Theme toggle button.
- Create a 2-column layout: a left Sidebar and a right Content area.

Provide code skeleton for files:
- dashboard.component.html
- dashboard.component.ts
- dashboard.component.scss
- Optionally add a cards data array in TS to render a few widgets in the grid.

Part B — Flexbox header and global tokens
- Implement the header using Flexbox to place brand on the left, a spacer, and a Theme toggle on the right.
- Use a CSS variable for the header background color (e.g., --surface) and for text color (--text).

Part C — Grid content and responsive behavior
- In the Content area, render a grid of 6 cards with responsive columns using grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)).
- Ensure the grid collapses gracefully on smaller screens via a media query.

Part D — Theming with CSS variables
- Define global tokens in styles.scss (or a design-tokens file) for background, surface, text, card, and primary color.
- Add a dark mode override (data-theme="dark") with different token values.
- Add a Theme toggle function in TS to switch between light and dark themes by updating data-theme on the document element.

Part E — Accessibility and polish
- Add ARIA roles where appropriate (e.g., header role, main content region).
- Ensure focus styles are visible on interactive elements (buttons, links).
- Keep markup semantic and readable.

Example starter references (you can adapt to your project structure):

dashboard.component.html
```
<header class="topbar" role="banner">
  <div class="brand" aria-label="Brand">Dashboard</div>
  <button class="theme-btn" (click)="toggleTheme()" aria-label="Toggle theme">Theme</button>
</header>

<div class="layout" role="main" aria-label="Dashboard layout">
  <aside class="sidebar" aria-label="Sidebar navigation">
    <nav>
      <a href="#">Overview</a>
      <a href="#">Reports</a>
      <a href="#">Settings</a>
    </nav>
  </aside>

  <section class="content" aria-label="Widget grid">
    <div class="widget" *ngFor="let w of widgets">
      <h3>{{ w.title }}</h3>
      <p>{{ w.value }}</p>
    </div>
  </section>
</div>
```

dashboard.component.ts
```
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  isDark = false;
  widgets = [
    { title: 'Revenue', value: '$12k' },
    { title: 'Active Users', value: '1,234' },
    { title: 'Engagement', value: '72%' },
    { title: 'Sessions', value: '3.4k' },
    { title: 'Conversions', value: '4.1%' },
    { title: 'New Signups', value: '320' }
  ];

  toggleTheme(): void {
    this.isDark = !this.isDark;
    const next = this.isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
  }
}
```

dashboard.component.scss
```
:host { display: block; min-height: 100vh; background: var(--bg); color: var(--text); }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--surface); border-bottom: 1px solid rgba(0,0,0,.08); }
.brand { font-weight: 700; }
.theme-btn { background: var(--primary); color: #fff; border: 0; padding: .5rem 1rem; border-radius: 6px; cursor: pointer; }

.layout { display: grid; grid-template-columns: 260px 1fr; gap: 16px; padding: 1rem; }
.sidebar { padding: 1rem; border-radius: 8px; background: var(--surface); border: 1px solid rgba(0,0,0,.08); }
.content { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; padding: 1rem; }
.widget { background: var(--card); border: 1px solid rgba(0,0,0,.08); border-radius: 8px; padding: 1rem; }

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
}
```

styles.scss (global tokens)
```
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --card: #ffffff;
  --primary: #3b82f6;
}
[data-theme="dark"] {
  --bg: #0b1020;
  --surface: #141a2a;
  --text: #e5e7eb;
  --muted: #9ca3af;
  --card: #1f2542;
  --primary: #93c5fd;
}
```

Answers to the Study Questions (from Z) should be reviewable by checking your implementation:
- Ensure you can articulate axis concepts in Flexbox, describe Grid areas, apply CSS variables for theming, and implement responsive patterns that hold under real device sizes.

Notes for instructors or self-study:
- When teaching, emphasize the separation of concerns: structure in HTML, layout in CSS, and theming tokens in CSS variables.
- Highlight Angular-specific considerations: ViewEncapsulation typically doesn’t prevent CSS variables from cascading; prefer global tokens for tokens used across many components, and component-level selectors for local styling.
- Encourage building a design token surface (colors, spacing, radii) that can be consumed by both CSS and TypeScript (via a token service or JSON) for larger teams.

This lesson provides a comprehensive, Angular-friendly dive into CSS3 foundations, balancing theory with practical, production-oriented patterns.