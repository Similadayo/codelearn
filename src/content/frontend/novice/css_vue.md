# Track: Frontend Engineering — Phase 1: The Foundations — CSS3 Foundations (Flexbox, Grid, Variables) in Vue

CSS3 Foundations empower you to build robust, responsive, and accessible user interfaces. When paired with a modern framework like Vue, you can compose flexible layouts, themeable designs, and predictable styling that scales with your app. This lesson focuses on Flexbox, Grid, and CSS Variables, illustrated with Vue single-file components and practical patterns you’ll reuse in real projects.

## 1. Flexbox Foundations in Vue

Flexbox is ideal for one-dimensional layouts (row or column) and excels at distributing space, aligning items, and handling varying content sizes.

### Code Example
```vue
<template>
  <header class="site-header" aria-label="Site header">
    <div class="logo">MySite</div>
    <nav class="nav" aria-label="Main">
      <a class="nav-item" href="#">Home</a>
      <a class="nav-item" href="#">Docs</a>
      <a class="nav-item" href="#">Blog</a>
    </nav>
  </header>
</template>

<script setup>
// No reactive data needed for this static layout
</script>

<style scoped>
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2c3e50;
  color: white;
}
.logo {
  font-weight: 700;
  font-size: 1.25rem;
}
.nav {
  display: flex;
  gap: 16px;
}
.nav-item {
  color: white;
  text-decoration: none;
  font-family: inherit;
}
</style>
```

### Line-by-line Explanation
- <template> defines the component's markup with a header containing a logo and navigation.
- header.site-header sets up a flex container to place the logo on one end and the nav on the other.
- display: flex establishes a flex formatting context for the header.
- justify-content: space-between pushes the logo to the left and the nav to the right.
- align-items: center vertically centers the logo and nav items.
- padding, background, and color styles customize the header’s appearance.
- .logo styles the branding text, making it visually prominent.
- .nav uses display: flex to lay out nav items in a row.
- gap creates consistent spacing between nav links.
- .nav-item styles the links (color and no underline) to blend with the header.
- The script block is empty here because this is a static demonstration; you can populate items dynamically later.
- style scoped ensures CSS applies only to this component.

## 2. Grid Foundations in Vue

CSS Grid handles two-dimensional layouts, letting you define rows and columns and place items precisely or adaptively.

### Code Example
```vue
<template>
  <section class="grid-grid" aria-label="Card grid">
    <article class="card" v-for="n in 8" :key="n">
      Card {{ n }}
    </article>
  </section>
</template>

<script setup>
// No script logic needed for this grid demonstration
</script>

<style scoped>
.grid-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.card {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}
</style>
```

### Line-by-line Explanation
- <template> defines a grid container with a sequence of cards created by v-for.
- .grid-grid sets up a CSS Grid layout as a two-dimensional canvas.
- display: grid activates Grid mode for the container.
- grid-template-columns uses repeat(auto-fill, minmax(180px, 1fr)) to create responsive columns that fill available space with a minimum width of 180px.
- auto-fill allows the grid to create as many columns as fit the container width.
- gap controls the spacing between grid items.
- .card defines the visual style of each card (background, border, radius, padding, and center alignment).
- The script block remains empty for this static grid example.
- style scoped confines styles to this component.

## 3. CSS Variables and Theming in Vue

CSS Variables (custom properties) enable theming, easy maintenance, and dynamic style changes without writing new CSS. In Vue, you can bind CSS variables via inline styles to switch themes at runtime.

### Code Example (Dynamic Theming with CSS Variables)
```vue
<template>
  <div class="app" :style="styleVars">
    <button @click="toggleTheme" aria-label="Toggle theme">Toggle Theme</button>
    <section class="panel">
      Themed panel
    </section>
    <div class="card" aria-label="Themed card">Themed card</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const isDark = ref(false)
function toggleTheme() {
  isDark.value = !isDark.value
}

const styleVars = computed(() => ({
  // CSS variables exposed to descendants
  '--bg': isDark.value ? '#1f2937' : '#ffffff',
  '--fg': isDark.value ? '#f9fafb' : '#111827',
  '--surface': isDark.value ? '#1f2a37' : '#f8fafc',
  '--surface-border': isDark.value ? '#334155' : '#e5e7eb',
  // Bind skin to actual CSS properties
  backgroundColor: 'var(--bg)',
  color: 'var(--fg)',
}))
</script>

<style scoped>
.app {
  min-height: 100vh;
  padding: 20px;
  background: var(--bg, #fff);
  color: var(--fg, #111);
}
.panel {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  padding: 16px;
  border-radius: 8px;
  margin-top: 8px;
}
.card {
  margin-top: 8px;
  padding: 12px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
}
button { cursor: pointer; }
</style>
```

### Line-by-line Explanation
- The template binds a style object to the root .app element, enabling dynamic CSS variables.
- The Toggle Theme button triggers a function to switch isDark, simulating a light/dark theme.
- The script uses Vue's composition API to manage theme state and compute a styleVars object.
- isDark toggles between false and true to switch themes.
- styleVars is a computed object that defines CSS variables (e.g., --bg, --fg) and real CSS properties bound to those variables.
- The CSS in this component consumes the variables via var(--...). For example, background uses var(--bg) and color uses var(--fg).
- The .panel and .card styles rely on the CSS variables to render correctly in both themes.
- The button and overall layout demonstrate how CSS variables enable consistent theming across components.

### Additional CSS Variables (Global)
```css
/* global.css or <style> in a non-scoped block for clarity */
:root {
  --bg: #ffffff;
  --fg: #111827;
  --surface: #f8fafc;
  --surface-border: #e5e7eb;
}
.app { background: var(--bg); color: var(--fg); }
.panel { background: var(--surface); border-color: var(--surface-border); }
```

### Line-by-line Explanation (Global Variables)
- :root defines base CSS variables that apply globally across the app.
- The .app background and text colors consume the global variables.
- Panels and cards inherit surface colors and borders from the same variables, ensuring consistent theming site-wide.

## 4. Responsive Patterns: When Flexbox Meets Grid (Vue Patterns)

Blend Flexbox (for one-dimensional layouts) with Grid (for two-dimensional content) to craft responsive, maintainable UIs. This example shows a header (Flexbox) and a content area with a responsive grid of cards (Grid).

### Code Example
```vue
<template>
  <div class="layout">
    <header class="topbar" aria-label="Top navigation">
      <div class="brand">Dashboard</div>
      <nav class="topnav" aria-label="Top navigation items">
        <a href="#" class="link">Overview</a>
        <a href="#" class="link">Reports</a>
        <a href="#" class="link">Settings</a>
      </nav>
    </header>

    <main class="content">
      <aside class="filters" aria-label="Filters">
        <div class="filter-item">Status</div>
        <div class="filter-item">Date</div>
      </aside>
      <section class="cards" aria-label="Cards">
        <article class="card" v-for="n in 12" :key="n">Item {{ n }}</article>
      </section>
    </main>
  </div>
</template>

<script setup>
// No reactive data required for this layout
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: #0b5ed7;
  color: #fff;
}
.brand { font-weight: 700; font-size: 1.1rem; }
.topnav { display: flex; gap: 16px; }
.link { color: #fff; text-decoration: none; }

.content {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  padding: 16px;
}
@media (max-width: 800px) {
  .content { grid-template-columns: 1fr; }
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.filter-item {
  height: 40px;
  background: #f1f5f9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 8px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.card {
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  text-align: center;
}
</style>
```

### Line-by-line Explanation
- The layout uses a columnar flex container to stack header and content vertically.
- .topbar is a horizontal flex container that places the brand on the left and nav on the right.
- display: flex creates a one-dimensional layout for the header.
- justify-content: space-between spreads header items across the available width.
- .content uses CSS Grid to define a two-column layout: a fixed-width sidebar (filters) and a flexible main area (cards).
- grid-template-columns: 260px 1fr creates the sidebar and content proportions.
- The media query collapses to a single column on narrow viewports for responsiveness.
- .filters is a vertical flex container listing filter blocks, with padding and border for a card-like feel.
- .cards uses grid with auto-fill and minmax to create a responsive card grid.
- Each .card is styled with padding, borders, and background to resemble a dashboard tile.

## 5. Vue-Specific Styling Best Practices (Scoped Styles, CSS Variables)

- Always prefer scoped styles in SFCs to avoid unintended leakage.
- Use CSS variables for themeable values (colors, spacing, radii) so you can switch themes or apply design-system-wide changes without editing many selectors.
- When using dynamic theming, bind CSS variables via the style binding (as in Section 3) and keep most layout logic in CSS rather than in Vue inline styles.
- Prefer responsive units (rem, em, or percentages) for typography and spacing to improve accessibility and reflow.
- Accessibility matters: maintain visible focus states, use aria-labels where appropriate, and ensure color contrast remains adequate when theming.

## X. Common Beginner Mistakes

- Pitfall 1 — Fixed-column grids that break on narrow screens
  Bad:
  ```css
  .grid { grid-template-columns: 3fr 3fr 3fr; }
  @media (max-width: 600px) { /* nothing changes */ }
  ```
  Good:
  ```css
  .grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  @media (max-width: 480px) { .grid { grid-template-columns: 1fr; } }
  ```

- Pitfall 2 — Ignoring theme variables or not providing fallbacks
  Bad:
  ```css
  .btn { background: var(--primary); color: #fff; }
  ```
  Good:
  ```css
  .btn { background: var(--primary, #3b82f6); color: #fff; }
  ```

- Pitfall 3 — Missing scoping in Vue styles
  Bad:
  ```vue
  <style>
  .card { padding: 12px; }
  </style>
  ```
  Good:
  ```vue
  <style scoped>
  .card { padding: 12px; }
  </style>
  ```

- Pitfall 4 — Overly-specific selectors leading to brittle CSS
  Bad:
  ```css
  div.app > header > nav > a { color: red; }
  ```
  Good:
  ```css
  .topnav { color: red; }
  ```

- Pitfall 5 — Not considering accessibility in layout decisions (e.g., color contrast, focus states)
  Bad:
  ```css
  .button { background: #333; color: #333; }
  ```
  Good:
  ```css
  .button { background: #2563eb; color: #fff; }
  .button:focus { outline: 2px solid #fff; outline-offset: 2px; }
  ```

## Y. Why This Matters In Real Systems

- Maintainability: Flexbox and Grid provide predictable, declarative layout rules that scale with features and content changes.
- Theming and design systems: CSS Variables enable consistent theming across components and pages, reducing duplication and drift.
- Performance: Layout is handled by the browser's optimized algorithms; keeping layout logic in CSS (rather than inline styles) improves rendering performance and readability.
- Accessibility and UX: Proper alignment, spacing, and focus management lead to easier navigation and better user experience, especially on varying screen sizes.
- Real-world patterns: Most dashboards, content grids, and responsive menus rely on a mix of Flexbox and Grid; Vue makes it easy to compose these patterns in components while maintaining scope and reusability.

## Z. Study Questions

1. What is the primary difference between Flexbox and Grid, and when would you choose one over the other?
2. How does grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) work to create responsive layouts?
3. How can CSS Variables enable dynamic theming in a Vue component? Provide a brief code example.
4. Why is it important to use scoped styles in Vue SFCs, and what problems can arise if you don’t?
5. Give two best practices for building responsive layouts that remain accessible across devices.

## Exercise

Build a small Vue app that demonstrates a themed, responsive dashboard using Flexbox and Grid with CSS Variables.

Instructions:
- Part A: Create a header using Flexbox with a brand on the left and three navigation links on the right.
- Part B: Create a content area with:
  - A left sidebar (filters) and a right grid of 8 cards.
  - The grid should adapt to screen width using grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)).
- Part C: Implement theming with CSS Variables. Include a Toggle Theme button that switches between light and dark themes by updating CSS variables (as shown in Section 3).
- Part D: Ensure the entire component uses scoped styles and that colors have appropriate contrast in both themes.

Deliverables:
- A single Vue SFC (or a set of components) implementing the above with clear separation of concerns.
- Include at least one CSS variable-based color (e.g., --bg, --fg, --surface).
- Provide brief notes on how the layout adapts when resizing the browser window.

Notes:
- You can reuse the patterns from the examples in this lesson, but compose them into a cohesive, small app.
- Focus on clarity, accessibility (aria labels), and responsiveness.