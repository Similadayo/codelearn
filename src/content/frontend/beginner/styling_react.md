# Track: Frontend Engineering — Module: Phase 2 — Modern UI Frameworks — Topic: Modern Styling (Tailwind, CSS-in-JS) — Language/Stack: React

Modern styling in React combines utility-first CSS (Tailwind) with CSS-in-JS approaches (styled-components, emotion, Twin.macro) to deliver scalable, maintainable, and themeable UI. This lesson explores when to use Tailwind vs CSS-in-JS, how to write accessible, high-performance styles, and how these patterns fit into real-world systems such as design tokens, theming, and design systems. By the end, you’ll be able to pick an approach for a given UI, implement robust components, and reason about production considerations like bundle size, SSR, and theming.

## 1. Tailwind CSS in React: Utility-First Styling

Tailwind CSS provides a compact, composable set of utility classes that you apply directly in your JSX. This section demonstrates a simple Button component using Tailwind utilities, and then shows how to conditionally apply classes to handle variants.

Code Block 1: Tailwind Button (basic)
```jsx
import React from 'react';

export default function Button({ variant = 'primary', children, ...rest }) {
  const base =
    'px-4 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    outline:
      'border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-500',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-50',
  };
  const cls = `${base} ${variants[variant] ?? variants.primary}`;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
```

Code Block 2: Tailwind Button with conditional classes (clsx example)
```jsx
import React from 'react';
import clsx from 'clsx';

function Button({ primary, rounded, children, ...rest }) {
  const classes = clsx(
    'px-4 py-2 font-semibold', // base
    {
      'bg-blue-600 text-white hover:bg-blue-700': primary,
      'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50': !primary,
    },
    rounded && 'rounded-full'
  );
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
```

### Line-by-line explanation breaking down each line

Code Block 1:
- Line 1: Import React to define a component.
- Line 3: Define a functional component Button with props: variant, children, and rest spread for extra props.
- Line 4: Create a base string of Tailwind utilities for padding, border radius, font weight, and focus states.
- Line 5-10: Define a variants map with keys for primary, outline, and ghost styles using Tailwind classes.
- Line 11: Compute the final className by concatenating base and the chosen variant classes.
- Line 12: Render a button element with the computed className and forward any additional props.
- Line 13: Render the button’s children inside.

Code Block 2:
- Line 1: Import React.
- Line 3: Define a Button component that accepts primary, rounded, children, and rest props.
- Line 4-15: Use clsx to compose className from:
  - Base classes ('px-4 py-2 font-semibold').
  - Conditional classes depending on primary flag.
  - Optional rounded style if the rounded prop is true.
- Line 16: Render the button with the computed classes and spread remaining props.
- Line 17: Render children.

## 2. CSS-in-JS in React: Styled Components and Emotion

CSS-in-JS lets you style components with JavaScript, enabling theming, dynamic styles, and colocated styling. This section shows two classic approaches: styled-components and @emotion/styled.

Code Block 3: Button with styled-components
```jsx
import React from 'react';
import styled, { css } from 'styled-components';

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
  border: 1px solid transparent;
  background: #2563eb; /* blue-600 */
  color: white;

  &:hover {
    background: #1d4ed8;
  }

  ${props =>
    props.variant === 'outline' &&
    css`
      background: white;
      color: #1f2937;
      border-color: #e5e7eb;
    `}
`;

export default function AppButton({ children, variant, ...rest }) {
  return (
    <Button variant={variant} {...rest}>
      {children}
    </Button>
  );
}
```

Code Block 4: Button with Emotion Styled API
```jsx
import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
  border: none;
  background: #10b981; /* emerald-500 */
  color: white;

  &:hover {
    background: #059669; /* emerald-600 */
  }

  ${props =>
    props.variant === 'ghost' &&
    css`
      background: transparent;
      color: #1f2937;
      border: 1px solid #e5e7eb;
    `}
`;

export default function AppButton({ children, variant, ...rest }) {
  return (
    <Button variant={variant} {...rest}>
      {children}
    </Button>
  );
}
```

### Line-by-line explanation breaking down each line

Code Block 3:
- Line 1: Import React.
- Line 2: Import styled and css helper from styled-components.
- Line 4-13: Define a styled Button with base styles (padding, border radius, font weight, border, background, color) and a hover state.
- Line 15-22: Conditionally apply an outline variant using the css helper when prop variant equals 'outline' (changes background, text color, and border color).
- Line 24-29: Define a React component AppButton that renders the styled Button with the given variant prop and children.

Code Block 4:
- Line 1: Import React.
- Line 2: Import styled from @emotion/styled and css helper from @emotion/react.
- Line 4-12: Define a Button with base styles and hover state using Emotion's styled API.
- Line 14-21: Conditionally apply a ghost variant via the css helper when prop variant equals 'ghost' (makes background transparent, changes text color, and adds a border).
- Line 23-28: Define AppButton component that renders the Button with a given variant prop and children.

## 3. Tailwind + CSS-in-JS Synergy: Twin.macro (Tailwind inside CSS-in-JS)

Twin.macro lets you use Tailwind classes inside CSS-in-JS libraries, combining the ergonomics of both worlds. This section shows a Twin.macro example and a second approach leveraging the tw macro with a pure CSS-in-JS component.

Code Block 5: Button with Twin.macro (styled-components + Tailwind)
```jsx
import React from 'react';
import tw, { styled } from 'twin.macro';

const Button = styled.button`
  ${tw`px-4 py-2 rounded font-semibold bg-blue-600 text-white hover:bg-blue-700`}

  ${props => props.variant === 'outline' && tw`border border-blue-600 text-blue-600 bg-white`}
`;

export default function AppButton({ children, variant, ...rest }) {
  return (
    <Button variant={variant} {...rest}>
      {children}
    </Button>
  );
}
```

Code Block 6: Twin.macro using the tw prop (when configured)
```jsx
import React from 'react';
/** @jsxImportSource @emotion/react */ // if your setup uses the automatic runtime
import tw from 'twin.macro';

function Button({ children, variant, ...rest }) {
  return (
    <button
      css={[
        tw`px-4 py-2 rounded font-semibold bg-blue-600 text-white hover:bg-blue-700`,
        variant === 'outline' && tw`border border-blue-600 text-blue-600 bg-white`
      ]}
      {...rest}
    >
      {children}
    </button>
  );
}
```

### Line-by-line explanation breaking down each line

Code Block 5:
- Line 1: Import React.
- Line 2: Import tw and styled from twin.macro, enabling Tailwind within a CSS-in-JS style.
- Line 4-9: Define a Button as a styled component with Tailwind utilities, plus a conditional variant for outline using tailwind classes.
- Line 11-18: Define AppButton component that renders the Twin.macro Button with the given variant and children.

Code Block 6:
- Line 1: Import React.
- Line 3: A comment specifying the JSX runtime pragma if your bundler requires it (optional, setup-dependent).
- Line 4: Import the tw macro from twin.macro.
- Line 6-14: Define a functional Button that applies Tailwind styles via the css prop, with a conditional outline variant.
- Line 16-21: Render the button with children and any other props.

## X. Common Beginner Mistakes

### 1) Tailwind: Bad dynamic class construction; Good with explicit mappings

Bad
```jsx
function Button({ size }) {
  const sizeClass = size ? `text-${size}` : '';
  return <button className={`px-4 py-2 ${sizeClass}`}>Click</button>;
}
```

Good
```jsx
import clsx from 'clsx';

function Button({ size }) {
  const classes = clsx(
    'px-4 py-2',
    {
      'text-sm': size === 'sm',
      'text-base': size === 'md' || !size,
      'text-lg': size === 'lg',
    }
  );
  return <button className={classes}>Click</button>;
}
```

### 2) CSS-in-JS: Bad pattern—defining styled components inside render

Bad
```jsx
function Button({ label }) {
  const Primary = styled.button`
    background: #2563eb;
    color: white;
  `;
  return <Primary>{label}</Primary>;
}
```

Good
```jsx
const PrimaryButton = styled.button`
  background: #2563eb;
  color: white;
`;

function Button({ label }) {
  return <PrimaryButton>{label}</PrimaryButton>;
}
```

### 3) Theming and tokens: Bad hard-coded colors everywhere

Bad
```jsx
function Card() {
  return (
    <div style={{ background: '#f0f0f0', color: '#111' }}>
      Card content
    </div>
  );
}
```

Good
```jsx
// Design tokens + ThemeProvider
const theme = {
  colors: {
    surface: '#f8fafc',
    text: '#111827',
    primary: '#1d4ed8'
  }
};

import styled, { ThemeProvider } from 'styled-components';

const Card = styled.div`
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  padding: 1rem;
  border-radius: 0.5rem;
`;

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Card>Token-driven card</Card>
    </ThemeProvider>
  );
}
```

### 4) Accessibility: Bad focus management and keyboard support

Bad
```jsx
<button>Submit</button>
```

Good
```jsx
function SubmitButton({ children }) {
  return (
    <button
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: 'none',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // perform submit
        }
      }}
    >
      {children}
    </button>
  );
}
```

## Y. Why This Matters In Real Systems — production context and real usage

- Consistency and design systems: Tailwind enforces a consistent vocabulary of utilities, making shared design tokens easier to propagate across teams. CSS-in-JS enables strong theming, dynamic styling, and colocated concerns with components, which is valuable for complex, stateful UI.
- Performance considerations: Tailwind can lead to small, purge-able CSS bundles when properly configured. CSS-in-JS can inflate bundles if overused or misconfigured; twin.macro can help mitigate this by co-locating Tailwind with CSS-in-JS. Always measure bundle size, critical-path rendering, and server-side rendering implications.
- Theming and design tokens: Real systems rely on tokens for color, spacing, typography. CSS-in-JS or Twin.macro + Tailwind both support token-driven approaches, which improves maintainability and accessibility.
- Accessibility: Focus styles, color contrast, and keyboard navigation are easier to enforce when you centralize styling decisions. Both Tailwind and CSS-in-JS can enforce consistent focus rings and responsive states when used with a design system.
- Team collaboration: Tailwind is often preferred for rapid iteration and shared utility usage, while CSS-in-JS shines for component-level theming and complex state-driven styles. In some orgs, teams adopt a hybrid approach (Tailwind for layout utilities; CSS-in-JS for theming and dynamic styles).

## Z. Study Questions — 5 recall questions

1. What is the main difference between utility-first styling (Tailwind) and CSS-in-JS approaches (styled-components, emotion)?
2. How can you ensure Tailwind styles do not bloat your production CSS?
3. Why is it important to define styled components outside of render in React, and what problem can occur if you don’t?
4. How can design tokens be implemented to enable consistent theming across Tailwind and CSS-in-JS?
5. What are two benefits of using Twin.macro to combine Tailwind utilities with CSS-in-JS, and what setup might you need to enable it?

## Exercise — a practical multi-part coding challenge

Goal: Build a small, themeable UI kit in React that demonstrates both Tailwind-based and CSS-in-JS styling, plus a tiny accessible component library.

Part A — Setup (3 tasks)
- Task 1: Create a React component library scaffold with two components: Button and Card. Do not rely on any global CSS besides Tailwind (or your existing setup).
- Task 2: Install and configure Tailwind CSS in your project (or confirm you have a working Tailwind setup).
- Task 3: Add styled-components (or emotion) to the project for an alternate styling path.

Part B — Tailwind-based Button and Card (5 tasks)
- Task 1: Implement a Button (Tailwind) that supports variants: primary, outline, ghost.
- Task 2: Implement a Card component using Tailwind utilities (spacing, border, shadow, rounded corners).
- Task 3: Create a small page that uses the Button and Card together in a card list (data-driven rendering).
- Task 4: Add accessibility considerations: focus-visible ring and keyboard interactions.
- Task 5: Purge/Curge Tailwind in production (ensure your build removes unused classes).

Part C — CSS-in-JS Button and Card (5 tasks)
- Task 1: Implement a Button (styled-components) with at least two variants (primary, outline) and a disabled state.
- Task 2: Implement a Card (styled-components) with a small header, content area, and actions area using theming tokens.
- Task 3: Create a simple ThemeProvider that toggles light/dark mode and demonstrate in a small page.
- Task 4: Demonstrate token-driven colors and spacing (e.g., theme.colors.primary, theme.space.sm) within your components.
- Task 5: Ensure SSR-friendly patterns where applicable (avoid heavy inline styles; memoize components if needed).

Part D — Twin.macro (optional, if configured)
- Task 1: Create a Button using Twin.macro that blends Tailwind utilities with a conditional variant prop.
- Task 2: Create a small component that uses the tw prop or the styled template with Tailwind classes and a variant toggle.

Part E — Assessment (2 tasks)
- Task 1: Explain how you would decide between Tailwind vs CSS-in-JS for a given UI feature in a large codebase.
- Task 2: Write a short paragraph about accessibility considerations you enforced in your components (focus styles, color contrast, keyboard navigation).

Tips:
- When mixing Tailwind with CSS-in-JS, keep a clear boundary: Tailwind for layout and base typography, CSS-in-JS for theming, state-driven styles, and complex visual states.
- Use a design system or tokens for colors, spacing, and typography to avoid drift across components.
- Keep performance in mind: avoid re-creating styled components inside render; prefer static definitions and memoization where appropriate.
- Always verify accessibility: keyboard focus, aria-labels where needed, and color contrast checks.

If you want, I can tailor the exercise to a specific project setup (Create React App, Next.js, Vite) or provide a ready-to-run GitHub repo skeleton with all the code scaffolding.