# JavaScript Fundamentals (DOM, Events) in React

Frontend engineering thrives on how users interact with your applications. The Document Object Model (DOM) represents the page structure, while events drive interactivity—from clicking buttons to resizing the window. In React, you work with a declarative UI while still needing to understand the underlying DOM and event flow to build accessible, robust, and high-performance interfaces. This lesson grounds you in DOM basics, React's synthetic event system, and practical patterns for binding, handling, and coordinating events in real-world apps.

## 1. The DOM, React's Virtual DOM, and Event Flow

Learn the essentials of how React interacts with the DOM, what the synthetic event system is, and how event propagation works in a React app.

```jsx
import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = (e) => {
    console.log('Event type:', e.type); // SyntheticEvent
    // React’s event system wraps native events for consistency
    setCount((c) => c + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}
```

### Line-by-line explanation
- Line 1: Import React and the useState hook to manage component state.
- Line 3: Define a functional component named Counter and export it as default.
- Line 4: Initialize a state variable count to 0 and a setter setCount.
- Line 6: Declare handleClick, receiving a synthetic event object e when the button is pressed.
- Line 7: Log the event type from the synthetic event (e.type) to demonstrate React’s wrapper around the native event.
- Line 9: Update the count state using a functional update to safely read the previous value.
- Line 12-17: Render a paragraph showing the current count and a button wired to onClick={handleClick} to trigger the event.

Notes:
- React uses a synthetic event system that normalizes behavior across browsers.
- The event object is pooled for performance; access it synchronously or persist it if needed later (not shown here).

## 2. Selecting Elements, Refs, and Event Binding in React

When you need direct DOM access, such as focusing an input on mount or reading a value outside React state, use refs and lifecycle hooks. This section shows a focus-on-mount pattern and keyboard handling.

```jsx
import React, { useEffect, useRef, useState } from 'react';

function FocusableInput() {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');

  // Focus the input when the component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      alert(`Submitted: ${value}`);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type something and press Enter"
      />
      <p>You typed: {value}</p>
    </div>
  );
}
```

### Line-by-line explanation
- Line 1: Import React, useEffect, useRef, and useState for DOM refs and state.
- Line 3: Define a functional component FocusableInput.
- Line 4: Create a ref object inputRef initialized to null.
- Line 5: Create a state variable value to hold the input text.
- Line 8-11: useEffect with an empty dependency array runs once after mount; focuses the input if the element exists.
- Line 13: Define onKeyDown to handle key presses; if Enter is pressed, show an alert with the current value.
- Line 17-26: Render an input element that is wired to ref, value, onChange, and onKeyDown handlers, plus a friendly placeholder. Show the current value below.

Notes:
- Refs provide a way to access DOM nodes directly in React.
- useEffect with an empty dependency array is the typical pattern for “component did mount.”
- OnChange keeps React state in sync with user input; onKeyDown demonstrates handling keyboard interactions.

## 3. Event Propagation, Prevent Default, and Nested Handlers

Events can bubble up through the DOM, and React’s synthetic events preserve the familiar event model. You’ll also learn how to prevent default behavior for anchors and stop propagation to parent handlers.

```jsx
import React from 'react';

function Card({ onCardClick }) {
  return (
    <div onClick={onCardClick} style={{ padding: 20, border: '1px solid gray' }}>
      <button onClick={(e) => { e.stopPropagation(); alert('Button clicked'); }}>
        Click me
      </button>
      <p>Clicking the card should trigger the card handler, but clicking the button stops propagation.</p>
    </div>
  );
}

export default function App() {
  const onCardClick = () => alert('Card clicked');

  return (
    <div>
      <Card onCardClick={onCardClick} />
      <p>
        <a
          href="https://example.com"
          onClick={(e) => {
            e.preventDefault();
            alert('Navigation prevented');
          }}
        >
          Don’t navigate
        </a>
      </p>
    </div>
  );
}
```

### Line-by-line explanation
- Line 1: Import React.
- Lines 3-11: Define a Card component that receives onCardClick as a prop; the outer div listens for onClick, triggering the card handler. The inner button has its own onClick handler that calls e.stopPropagation() to prevent the click from bubbling to the card.
- Line 13: Export an App component as default.
- Line 14: Define onCardClick to alert when the card is clicked.
- Lines 17-26: Render Card and a paragraph containing an anchor tag. The anchor has an onClick handler that calls e.preventDefault() to stop navigation and show an alert.
- Lines 24-26: Demonstrate the separation of concerns: the card click vs. the button click, with propagation controlled explicitly.

Notes:
- Propagation (bubbling) means events on a child can trigger parent handlers unless stopped.
- e.preventDefault() cancels the browser’s default action for the event (e.g., following a link).
- This pattern helps you build predictable, accessible interactions in complex UIs.

## 4. Working with the DOM Directly in React (When Necessary)

There are rare cases where you must read or manipulate the DOM directly. Prefer React state/placeholders, but know how to safely work with the DOM when needed.

```jsx
import React, { useEffect } from 'react';

function DataAttributeReader() {
  useEffect(() => {
    // Accessing DOM directly to demonstrate a case where you might do this
    const el = document.querySelector('[data-role="note"]');
    if (el) {
      console.log('Note:', el.textContent);
    }
  }, []);

  return (
    <div data-role="note">
      This is a NOTE element
    </div>
  );
}
```

### Line-by-line explanation
- Line 1: Import React and useEffect.
- Line 3: Define a functional component DataAttributeReader.
- Lines 5-11: useEffect runs after mount to query the DOM for an element with data-role="note". If found, log its textContent.
- Lines 13-16: Render a div with the data-role attribute used for the query. This demonstrates how you might read data attributes directly from the DOM if necessary.
- This pattern should be avoided for data that React should own; prefer props and state to keep UI in sync.

Notes:
- Direct DOM access can be necessary for integrating with third-party libraries or legacy code, but it should be minimized and properly cleaned up.
- Always favor React state/props for data that drives the UI to maintain a single source of truth.

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

1) Direct DOM manipulation in React components

- Bad:
```jsx
// BAD: Mutating DOM directly
function BadDomManip() {
  useEffect(() => {
    document.querySelector('#title').innerText = 'Updated';
  }, []);
  return <h1 id="title">Original</h1>;
}
```
- Good:
```jsx
// GOOD: Use React state to drive UI
function GoodDomManip() {
  const [title, setTitle] = useState('Original');
  useEffect(() => {
    setTitle('Updated');
  }, []);
  return <h1 id="title">{title}</h1>;
}
```

2) Missing cleanup of event listeners in useEffect

- Bad:
```jsx
function BadListener() {
  useEffect(() => {
    const onResize = () => console.log('resize');
    window.addEventListener('resize', onResize);
  }, []);
  return <div>Resize the window</div>;
}
```
- Good:
```jsx
function GoodListener() {
  useEffect(() => {
    const onResize = () => console.log('resize');
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return <div>Resize the window</div>;
}
```

3) Creating new functions on every render in JSX

- Bad:
```jsx
function BadInlineFn() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>Increment</button>;
}
```
- Good (useCallback or defined function outside render):
```jsx
function GoodInlineFn() {
  const [count, setCount] = useState(0);
  const increment = () => setCount((c) => c + 1);
  return <button onClick={increment}>Increment</button>;
}
```

4) Accessing event properties asynchronously (without persisting)

- Bad:
```jsx
function BadEventAsync() {
  const handleClick = (e) => {
    setTimeout(() => {
      console.log(e.type); // e has been released (pooled) by React
    }, 100);
  };
  return <button onClick={handleClick}>Click</button>;
}
```
- Good:
```jsx
function GoodEventAsync() {
  const handleClick = (e) => {
    const type = e.type;
    setTimeout(() => {
      console.log(type);
    }, 100);
  };
  return <button onClick={handleClick}>Click</button>;
}
```

## Y. Why This Matters In Real Systems

- Maintainability: Clear, declarative event handling makes code easier to reason about and refactor.
- Accessibility: Keyboard and screen-reader users rely on proper event wiring (e.g., onKeyDown, onClick, role/aria attributes). Mis-wiring can create barriers.
- Performance: Avoid unnecessary re-renders from inline arrow functions in render; use useCallback or memoization when appropriate.
- Robustness: Proper cleanup of listeners prevents memory leaks and stray behavior when components unmount or navigate.
- Real-world patterns: Integrating with third-party libraries often requires careful DOM interactions, lifecycle-aware effects, and state synchronization.

## Z. Study Questions

1) What is a synthetic event in React, and why is it useful?
2) How do you focus a DOM element on component mount in a functional React component?
3) How can you prevent a link from navigating while still handling a click in React?
4) Why is it important to clean up window or DOM event listeners in useEffect?
5) When would you consider manipulating the DOM directly in React, and what precautions should you take?

## Exercise

Build a small interactive widget in React that demonstrates practical DOM/event skills. Complete the following parts and ensure your code is clean, accessible, and well-documented.

Part A — Interactive List with Keyboard Navigation
- Create a React component that renders a list of items.
- Allow the user to navigate the list with Up/Down arrow keys.
- Pressing Enter toggles a selected item as "done" (visually marked, e.g., strike-through).
- Use state to track the list and selection. Ensure aria-live or aria-current is used for accessibility.

Part B — Global Keyboard Shortcuts
- Add a global keyboard shortcut (e.g., Ctrl/Cmd + K) that focuses a search input in the component.
- Implement a safe focus mechanism using a ref and a useEffect to listen for the key combo.

Part C — Pointer / Hover Tooltip (DOM Interaction + Accessibility)
- When an item is hovered or focused, show a tooltip near the item with a descriptive label.
- Implement keyboard-accessible tooltip activation (focus) and dismiss on blur.

Part D — Resize Awareness with Cleanup
- Attach a window resize listener that updates the displayed viewport width.
- Ensure cleanup in the effect to avoid leaks when the component unmounts.

Part E — Accessibility and Semantics
- Ensure all interactive controls are keyboard accessible, provide appropriate ARIA attributes, and avoid using non-semantic elements for interactive actions (prefer buttons for actions).

Deliverables
- A single React component (or a small set of components) implementing Parts A–D.
- Clear comments explaining why each piece exists and how it ties to DOM/Events fundamentals.
- If you use any custom hooks (e.g., useEventListener), include their implementation within the same file or as a clearly separated block.

Tips
- Keep the UI simple but polished: a visually distinct selected item, a visible search input, and accessible tooltips (aria-label or aria-description).
- Use functional components and React hooks (useState, useRef, useEffect).
- Write small, testable units and ensure the code runs in a typical React environment (Create React App, Vite, etc.).

End of lesson.