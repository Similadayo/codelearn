# Modern Styling in Frontend: Tailwind & CSS-in-JS (TypeScript)

In modern frontend development, teams choose between utility-first styling (Tailwind) and CSS-in-JS approaches (e.g., Emotion, styled-components). Both aim to deliver scalable, maintainable, and accessible UIs in a TypeScript React environment. This lesson covers when and how to use Tailwind utilities alongside CSS-in-JS techniques, patterns for theming and accessibility, and how to blend the approaches in real systems.

## 1. Tailwind CSS basics in React TypeScript

Tailwind offers a utility-first approach where design is expressed through small, composable classes directly in the markup. This can speed up UI iteration, enforce design consistency, and reduce CSS file maintenance—especially in multi-team environments.

Code example: a simple Card component using Tailwind classes
```tsx
import React from 'react';

type CardProps = {
  title: string;
  description: string;
};

export const TailwindCard: React.FC<CardProps> = ({ title, description }) => {
  return (
    <div className="bg-white shadow rounded-lg p-4 max-w-sm">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};
```

Code example: a CSS-in-JS Card with Emotion (TypeScript)
```tsx
import React from 'react';
import styled from '@emotion/styled';

type CardProps = {
  title: string;
  description: string;
};

const CardRoot = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  max-width: 20rem;
`;

export const JsCard: React.FC<CardProps> = ({ title, description }) => (
  <CardRoot>
    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
      {title}
    </h3>
    <p style={{ color: '#64748b' }}>{description}</p>
  </CardRoot>
);
```

### Line-by-line explanation
- TailwindCard.tsx
  - Line 1: Import React for JSX types.
  - Line 3-7: Define props for the Card component.
  - Line 9: Export a functional component with props.
  - Line 10: Outer container uses Tailwind utilities for white bg, light shadow, rounded corners, padding, and a max width.
  - Line 11-13: Render the title with typography utilities.
  - Line 14: Render the description with a muted gray color.
- JsCard.tsx
  - Line 1: Import React.
  - Line 2: Import styled from Emotion.
  - Line 4-7: Define CardProps.
  - Line 9-14: Create a styled root div for consistent card shell.
  - Line 16-23: Render the title and description with inline styles to demonstrate non-Tailwind styling options.

## 2. Advanced Tailwind patterns in TypeScript

Beyond basic usage, you’ll often need conditional classes, responsive layouts, and theming variants with Tailwind. This section demonstrates class composition and responsive design.

Code example: Button with conditional variants using clsx
```tsx
import React from 'react';
import clsx from 'clsx';

type ButtonProps = {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  rounded?: boolean;
};

export const TailwindButton: React.FC<ButtonProps> = ({
  label,
  size = 'md',
  variant = 'primary',
  rounded = true,
}) => {
  const base = 'inline-flex items-center justify-center font-medium';
  const sizeCls = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }[size];

  const variantCls =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-gray-100 text-gray-800 hover:bg-gray-200';

  const roundedCls = rounded ? 'rounded-md' : 'rounded-none';

  return <button className={clsx(base, sizeCls, variantCls, roundedCls)}>{label}</button>;
};
```

Code example: Tailwind with dark mode and responsive layout
```tsx
import React from 'react';

export const Hero: React.FC = () => (
  <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
      Welcome
    </h1>
    <p className="text-gray-600 dark:text-gray-300">
      Responsive and accessible.
    </p>
  </section>
);
```

### Line-by-line explanation
- TailwindButton.tsx
  - Line 1: Import React.
  - Line 3-12: Define a ButtonProps type with optional sizing and variant props.
  - Line 14-31: Compute className using a combination of base, size-specific, variant-specific, and rounded classes. clsx helps conditionally join classes without duplications.
  - Line 33: Render a button with the computed className and label.
- Hero.tsx
  - Line 1: Import React.
  - Line 3-11: A simple hero section that adapts to dark mode using Tailwind’s dark: variant and responsive font sizing.

## 3. CSS-in-JS patterns in TypeScript

CSS-in-JS gives you strong typing, dynamic styling, and the ability to co-locate theme tokens with components. This section shows a themed button and a simple global theme integration using Emotion.

Code example: Themed Button with Emotion and ThemeProvider
```tsx
import React from 'react';
import styled, { ThemeProvider } from '@emotion/styled';

type ButtonProps = {
  label: string;
  color?: 'primary' | 'secondary';
};

const theme = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
  },
  radii: {
    md: '8px',
  },
};

const Button = styled.button<{ color?: 'primary' | 'secondary' }>`
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: ${p => p.theme.radii.md};
  color: white;
  background: ${p =>
    p.color === 'secondary' ? p.theme.colors.secondary : p.theme.colors.primary};
  cursor: pointer;
  &:hover {
    filter: brightness(0.95);
  }
`;

export const EmotionButton: React.FC<ButtonProps> = ({ label, color = 'primary' }) => (
  <ThemeProvider theme={theme}>
    <Button color={color}>{label}</Button>
  </ThemeProvider>
);
```

### Line-by-line explanation
- Line 1-2: Import React and Emotion styled/ThemeProvider.
- Line 4-12: Define ButtonProps.
- Line 14-23: Define a theme object with color tokens and radii.
- Line 25-36: Create a styled Button that reads color and radius values from the theme. The color prop selects which token to use.
- Line 38-46: Export a component that wraps Button in ThemeProvider to supply the theme at render time.

Code example: Global theming and a styled badge
```tsx
import React from 'react';
import styled, { ThemeProvider, createGlobalStyle } from '@emotion/styled';

type BadgeProps = { text: string; tone?: 'success' | 'warning' | 'error' };

const Global = createGlobalStyle`
  html, body, #root { height: 100%; }
  body { margin: 0; font-family: Inter, system-ui, -apple-system; }
`;

const theme = {
  colors: {
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#dc2626',
    text: '#111827',
  },
};

const Badge = styled.span<{ tone?: BadgeProps['tone'] }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: ${p => (p.tone ? p.theme.colors[p.tone] : '#e5e7eb')};
  color: white;
  font-size: 12px;
`;

export const ThemedBadgeCard: React.FC<BadgeProps> = ({ text, tone = 'success' }) => (
  <ThemeProvider theme={theme}>
    <Global />
    <div className="p-4 bg-white shadow rounded">
      <Badge tone={tone}>{text}</Badge>
    </div>
  </ThemeProvider>
);
```

### Line-by-line explanation
- Line 1-3: Import React, Emotion tools.
- Line 5-7: Define BadgeProps.
- Line 9-14: Create a Global style and a theme object with color tokens.
- Line 16-22: Create a Badge component that reads tone color from the theme.
- Line 24-34: Export a component that wraps content in ThemeProvider, renders a card with the badge.

## 4. Mixing Tailwind with CSS-in-JS and real-world patterns

Many teams blend both approaches: use Tailwind for layout, spacing, and structure, while CSS-in-JS handles dynamic styling, theming, and complex states. This pattern helps maintain fast iteration with Tailwind's utility ecosystem and enables robust, strongly-typed styling where needed.

Code example: Mixed Card with Tailwind base and Emotion accent bar
```tsx
import React from 'react';
import styled from '@emotion/styled';

type MixedCardProps = {
  title: string;
  content: string;
  accent?: string;
};

const Accent = styled.span<{ color: string }>`
  display: block;
  height: 4px;
  width: 100%;
  border-radius: 0 0 6px 6px;
  background: ${p => p.color};
  margin-bottom: 8px;
`;

export const MixedCard: React.FC<MixedCardProps> = ({
  title,
  content,
  accent = '#10b981',
}) => (
  <div className="bg-white rounded-lg shadow p-4">
    <Accent color={accent} />
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-700">{content}</p>
  </div>
);
```

### Line-by-line explanation
- Line 1-2: Import React and Emotion’s styled.
- Line 4-9: Define MixedCardProps with an accent color.
- Line 11-17: Create an Accent bar using CSS-in-JS to render a dynamic color.
- Line 19-28: Render a container with Tailwind classes for base layout and a CSS-in-JS Accent bar for a dynamic visual cue.

More patterns you might adopt in real systems:
- Use Tailwind for grids, flex layouts, spacing, and typography tokens; reserve CSS-in-JS for component-level theming, state-driven styles, and token-ed color systems.
- Use a design system: extract color tokens, radii, shadows, and typography scales into a single TS-friendly token file consumed by both Tailwind config and CSS-in-JS theme objects.
- For SSR apps, ensure CSS-in-JS styles are server-rendered or styled-components/Emotion SSR is properly configured to avoid flicker.

## 5. Theming and accessibility considerations across both approaches

Theming makes it possible to support dark mode, branding changes, and user accessibility needs without duplicating components.

Tailwind dark mode pattern (via class)
```tsx
import React, { useState } from 'react';
import { TailwindButton } from './TailwindButton';

export const ThemeToggleApp: React.FC = () => {
  const [dark, setDark] = useState(false);

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
        <TailwindButton label={dark ? 'Switch to Light' : 'Switch to Dark'} onClick={() => setDark(d => !d)} />
      </div>
    </div>
  );
};
```

CSS-in-JS theming with a dynamic color token
```tsx
import React from 'react';
import styled, { ThemeProvider } from '@emotion/react';

type Theme = {
  colors: { background: string; text: string; primary: string };
};

const light: Theme = {
  colors: { background: '#ffffff', text: '#111827', primary: '#1d4ed8' },
};

const dark: Theme = {
  colors: { background: '#111827', text: '#f8fafc', primary: '#3b82f6' },
};

const Card = styled.div<{ bg?: string }>`
  background: ${p => p.bg ?? '#fff'};
  color: ${p => (p.theme as Theme).colors.text};
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

export const ThemeedCardApp: React.FC = () => {
  // Demonstrates a simple toggle between light and dark tokens
  const [mode, setMode] = React.useState<'light' | 'dark'>('light');
  const theme = mode === 'light' ? light : dark;

  return (
    <ThemeProvider theme={theme}>
      <div style={{ padding: 16, background: theme.colors.background, minHeight: '100vh' }}>
        <button onClick={() => setMode(m => (m === 'light' ? 'dark' : 'light'))}>
          Toggle Theme
        </button>
        <Card bg={mode === 'dark' ? '#1f2937' : '#fff'} style={{ marginTop: 12 }}>
          A themable card in {mode} mode.
        </Card>
      </div>
    </ThemeProvider>
  );
};
```

### Line-by-line explanation
- Tailwind dark mode
  - Line 1-7: Create a small app that toggles a wrapping element with a "dark" class, enabling Tailwind's dark variant.
  - Line 9-16: Show a button that toggles the dark state and a container that responds to dark mode via Tailwind classes.
- CSS-in-JS theming
  - Line 1-11: Define a simple Theme type and two theme objects for light and dark.
  - Line 13-28: Create a Card component that consumes theme colors and demonstrates a dynamic background depending on mode.
  - Line 30-50: Compose a ThemeProvider-based app that toggles between light and dark themes and renders a themed card.

## X. Common Beginner Mistakes

1) Overusing long Tailwind class strings; hard-to-read JSX
- Bad
```tsx
<div className="bg-white shadow rounded-lg p-4 max-w-sm text-base text-gray-700">
  Content
</div>
```
- Good
```tsx
const cardClasses = [
  'bg-white', 'shadow', 'rounded-lg', 'p-4', 'max-w-sm',
  'text-base', 'text-gray-700'
].join(' ');

<div className={cardClasses}>Content</div>
```

2) Skipping TypeScript types with CSS-in-JS props
- Bad
```tsx
const Button = styled.button`
  background: ${p => p.color}; // p is any
`;
```
- Good
```tsx
type ButtonProps = { color?: string };
const Button = styled.button<ButtonProps>`
  background: ${p => p.color ?? 'blue'};
`;
```

3) Not sharing design tokens between Tailwind and CSS-in-JS
- Bad
```tsx
// Tailwind uses a token palette A
<div className="bg-blue-600" />
```
and
```tsx
// CSS-in-JS uses a different hard-coded color
<div style={{ background: '#0b5ed7' }} />
```
- Good
```ts
// Centralized token file
export const tokens = {
  colors: { primary: '#2563eb' as const },
};

// Tailwind config (simplified) uses tokens.colors.primary
// CSS-in-JS uses tokens.colors.primary
<div className="bg-primary" />
<div style={{ background: tokens.colors.primary }} />
```

4) Ignoring accessibility and ARIA in interactive components
- Bad
```tsx
<button>Submit</button>
```
- Good
```tsx
<button aria-label="Submit form" title="Submit" type="button">
  Submit
</button>
```

## Y. Why This Matters In Real Systems

- Consistency and scale: Design systems rely on tokens and consistent spacing. Tailwind speeds up iteration for layout and typography while CSS-in-JS scales complex, stateful styling with strong type guarantees.
- Cross-team collaboration: Utility-first styling reduces context-switching between design and implementation, while CSS-in-JS provides a robust avenue for component-level theming and accessibility features.
- Performance considerations: Tailwind purges unused utilities in production, minimizing CSS footprint. CSS-in-JS can incur runtime costs if not memoized; careful use of memoization, theming, and SSR patterns mitigate this.
- Theming and branding: In production apps, you often need multiple themes (light/dark, brand variants). CSS-in-JS makes token wiring explicit; Tailwind can derive tokens from a centralized config to keep both approaches aligned.

## Z. Study Questions

1) What is the primary difference between Tailwind’s utility classes and CSS-in-JS styling?
2) How do you enable and toggle dark mode in a Tailwind-based React app?
3) Why is it beneficial to centralize design tokens and share them between Tailwind config and CSS-in-JS theme objects?
4) What is a practical approach to combine Tailwind for layout with CSS-in-JS for dynamic component styling?
5) How can you ensure accessibility when styling interactive components in both approaches?

## Exercise

Goal: Build a small card gallery page that demonstrates both Tailwind-based cards and a CSS-in-JS variant, with dark mode support and a shared token system.

Part A — Setup (no code execution required)
- Create a React + TypeScript app skeleton (e.g., Vite or Create React App TS).
- Install Tailwind CSS and Emotion (or styled-components) dependencies.
- Create a tokens.ts with color and radius design tokens.

Part B — Tailwind-based Card Gallery
- Implement a Card component using Tailwind utilities that accepts:
  - title: string
  - description: string
  - accent?: string (optional color for a top accent bar)
- Render 3 cards with varying titles and descriptions.
- Add a dark mode toggle that applies the dark class on a root container.
- Ensure responsive layout: single column on small screens, 2 columns on medium, 3 on large.

Part C — CSS-in-JS Card
- Implement a separate CardJs component using Emotion that accepts the same props.
- Use ThemeProvider to inject tokens from tokens.ts.
- Include an optional accent bar rendered via CSS-in-JS with a color from the theme or prop.

Part D — Mixed Pattern Page
- Create a MixedCard that uses Tailwind for layout, and a small Accent bar styled via CSS-in-JS as shown in Section 4.
- Render one Tailwind Card, one Emotion Card, and one MixedCard.

Part E — Accessibility and Theming Review
- Ensure all interactive elements have ARIA labels where appropriate.
- Implement a simple theme toggle (light/dark) that affects colors in both Tailwind and CSS-in-JS variants.
- Verify that text remains readable against both light and dark backgrounds (contrast check conceptually; no automated tests required).

Starter code snippets (you can adapt into your project):

Starter App.tsx
```tsx
import React from 'react';
import { TailwindCard } from './TailwindCard';
import { JsCard } from './JsCard';
import { ThemeedCardApp } from './ThemeedCardApp';
import './index.css'; // Tailwind CSS import

function App(): JSX.Element {
  return (
    <div className="p-6 space-y-6">
      <TailwindCard title="Tailwind Card" description="This is a utility-first card." />
      <JsCard title="CSS-in-JS Card" description="Styled with Emotion." />
      <ThemeedCardApp />
    </div>
  );
}
export default App;
```

TailwindCard.tsx (reference)
```tsx
import React from 'react';

export const TailwindCard: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="bg-white shadow rounded-lg p-4 max-w-sm">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);
```

JsCard.tsx (reference)
```tsx
import React from 'react';
import styled from '@emotion/styled';

type CardProps = { title: string; description: string };

const CardRoot = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  max-width: 20rem;
`;

export const JsCard: React.FC<CardProps> = ({ title, description }) => (
  <CardRoot>
    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
      {title}
    </h3>
    <p style={{ color: '#64748b' }}>{description}</p>
  </CardRoot>
);
```

This lesson provides a structured, practical exploration of Modern Styling with Tailwind and CSS-in-JS in a TypeScript frontend environment, balancing quick iteration with robust, typed styling patterns for real-world systems.