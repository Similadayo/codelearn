# React Core (JSX, Props, State Hook) in a Vue-oriented Stack

This lesson introduces the core concepts of React—JSX for declarative UI, props for data flow between components, and the useState hook for local state—framed for developers in a Vue-oriented environment. Although the syntax here uses React JSX and hooks, the underlying ideas map to familiar Vue concepts like template rendering, props, and reactive state. You’ll see clear code examples, line-by-line breakdowns, common beginner pitfalls, real-world usage notes, recall questions, and a practical exercise.

## 1. JSX Fundamentals

JSX lets you write UI markup directly in JavaScript. It looks like HTML but is transformed into React.createElement calls under the hood. This enables a declarative approach to composing UI from reusable components.

```jsx
import React from 'react';

function Greeting() {
  // JSX element: a heading
  return <h1>Hello, world!</h1>;
}

export default Greeting;

// Example usage within another component
function App() {
  return (
    <div>
      <Greeting />
      <p>JSX lets you embed HTML-like syntax inside JavaScript functions.</p>
    </div>
  );
}
```

### Line-by-line explanation

- import React from 'react';  
  Imports the React library so the JSX can be transformed. In modern setups with automatic JSX runtime, this import is often omitted, but it remains common.

- function Greeting() { ... }  
  Defines a functional component named Greeting. Components are the building blocks of React UIs.

- return <h1>Hello, world!</h1>;  
  JSX syntax that describes the UI for this component. This JSX will be compiled to React.createElement calls.

- export default Greeting;  
  Exposes the Greeting component as the default export of the module.

- function App() { ... }  
  Defines another component that composes UI by using the Greeting component and a paragraph.

- <Greeting />  
  Renders the Greeting component within App. In React, components are invoked as JSX tags.

- <p>JSX ...</p>  
  A standard HTML-like element embedded in JSX.

- The whole App function returns a tree of React elements that describe the UI structure.

Note: In Vue terms, you’re seeing a declarative render of components and composition. In Vue, you’d typically use templates, but JSX is also supported in Vue projects with the appropriate plugin. The core idea—reusable components and declarative rendering—remains the same.

## 2. Props: Passing Data into Components

Props are the mechanism by which data flows from a parent component into a child component. They are read-only from the child’s perspective, enabling predictable data flow and easier reasoning about UI.

```jsx
function Welcome({ name }) {
  // 'name' is a prop passed from the parent
  return <div>Welcome, {name}!</div>;
}

function App() {
  return (
    <div>
      <Welcome name="Ada" />
      <Welcome name="Grace" />
    </div>
  );
}
```

### Line-by-line explanation

- function Welcome({ name }) { ... }  
  Defines a functional component that destructures its props. The prop named name is expected to be provided by the parent.

- return <div>Welcome, {name}!</div>;  
  Renders a div containing a personalized message. The curly braces insert the prop value into the DOM.

- function App() { ... }  
  App composes multiple child components to build the UI.

- <Welcome name="Ada" /> and <Welcome name="Grace" />  
  Pass the string literals Ada and Grace as the name prop to each Welcome instance. Props are a way to customize a component’s output.

Note: In Vue, props are also defined and consumed by child components, though the syntax for passing values differs (often via attributes in templates and a props option in the component definition). The concept of data flowing from parent to child remains a core parallel.

## 3. State Hook: Managing Local State with useState

State represents mutable data that affects what is rendered. The useState hook provides a simple primitive for adding local state to functional components.

```jsx
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}

export default Counter;
```

### Line-by-line explanation

- import React, { useState } from 'react';  
  Imports React and the useState hook from React. useState is the primary hook for adding state to function components.

- function Counter() { ... }  
  Defines a functional component named Counter.

- const [count, setCount] = useState(0);  
  Initializes a state variable count with an initial value of 0 and a setter function setCount to update it. The array destructuring is a common pattern with useState.

- <p>Count: {count}</p>;  
  Renders the current value of count inside a paragraph. The expression {count} is dynamic and updates on state changes.

- <button onClick={() => setCount(count + 1)}>Increment</button>;  
  Attaches an event handler that increments the count when clicked. The function passed to onClick is invoked on user interaction.

- <button onClick={() => setCount(0)}>Reset</button>;  
  Resets the count to 0 when clicked.

- export default Counter;  
  Exposes the component as the module’s default export.

Note: Vue has a similar concept with reactive state in the Composition API (ref, reactive) and the setup function, but the syntax and lifecycle details differ. The useState pattern here is a foundational React concept that maps to Vue’s reactive state management in spirit.

## 4. Common Beginner Mistakes

Here are common pitfalls learners often encounter when starting with JSX, props, and state, with bad vs good code side-by-side.

### Pitfall 1: Mutating state directly instead of using the setter function

- Bad
```jsx
import React, { useState } from 'react';

function MutateState() {
  const [person, setPerson] = useState({ name: 'Alice' });

  function rename(newName) {
    person.name = newName; // BAD: direct mutation
    setPerson(person);     // may not trigger re-render correctly
  }

  return (
    <div>
      <p>Name: {person.name}</p>
      <button onClick={() => rename('Bob')}>Rename</button>
    </div>
  );
}
```

- Good
```jsx
import React, { useState } from 'react';

function MutateState() {
  const [person, setPerson] = useState({ name: 'Alice' });

  function rename(newName) {
    setPerson(prev => ({ ...prev, name: newName })); // create a new object
  }

  return (
    <div>
      <p>Name: {person.name}</p>
      <button onClick={() => rename('Bob')}>Rename</button>
    </div>
  );
}
```

### Line-by-line explanation

- Bad example explanation: mutating person.name directly mutates the existing state object, which can lead to stale UI and React not recognizing changes. setPerson(person) passes the same object reference, making re-renders unreliable.

- Good example explanation: setPerson(prev => ({ ...prev, name: newName })) creates a new object merging previous fields with an updated name, ensuring React detects the change and re-renders safely.

### Pitfall 2: Forgetting keys when rendering lists

- Bad
```jsx
function TodoList({ items }) {
  return (
    <ul>
      {items.map(item => <li>{item.label}</li>)}
    </ul>
  );
}
```

- Good
```jsx
function TodoList({ items }) {
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.label}</li>)}
    </ul>
  );
}
```

### Line-by-line explanation

- Bad: Each <li> lacks a unique key. Without keys, React cannot reliably track list elements across re-renders, leading to inefficient updates or incorrect DOM state during reordering.

- Good: Providing key={item.id} (or another stable unique identifier) lets React efficiently reconcile list items as data changes.

### Pitfall 3: Deriving state from props or keeping unnecessary local state

- Bad
```jsx
function UserCard({ user }) {
  const [displayName, setDisplayName] = useState(user.name);
  // If the user prop changes, displayName won't automatically update
  return <div>{displayName}</div>;
}
```

- Good
```jsx
function UserCard({ user }) {
  // Derive from props directly, or sync with useEffect if you truly need derived state
  const displayName = user.name;
  return <div>{displayName}</div>;
}
```

### Line-by-line explanation

- Bad example explanation: initializing local state from props creates a separate source of truth. If the parent updates user.name, the child’s displayName won’t reflect the change, causing UI inconsistencies.

- Good example explanation: either read from props directly (displayName = user.name) or derive via useMemo/useEffect if you need a derived value that reacts to prop changes. This keeps the UI in sync with the parent data.

Optional Pitfall 4 (bonus): Inline functions that recreate on every render

- Bad
```jsx
function ChildButton({ onClick }) {
  return <button onClick={onClick}>Click</button>;
}

function Parent() {
  return <ChildButton onClick={() => doSomething()} />;
}
```

- Good
```jsx
import React, { useCallback } from 'react';

function ChildButton({ onClick }) {
  return <button onClick={onClick}>Click</button>;
}

function Parent() {
  const handleClick = useCallback(() => doSomething(), []);
  return <ChildButton onClick={handleClick} />;
}
```

### Line-by-line explanation

- Bad: onClick is an inline arrow function, causing a new function to be created on every render. This can cause child components to re-render unnecessarily or prevent certain optimizations.

- Good: useCallback memoizes the function so the same reference is passed unless dependencies change, reducing unnecessary re-renders.

## 5. Why This Matters In Real Systems

Understanding JSX, props, and state is fundamental to building maintainable, scalable frontend systems. Real-world systems rely on:

- Predictable data flow: Props as input, state as internal mutable data, all leading to deterministic rendering.
- Component reuse and composition: Small, focused components (like Greeting, Welcome) can be combined to create complex UIs without churn.
- Performance discipline: Avoiding direct state mutations, providing stable keys for lists, and memoizing callbacks to prevent unnecessary re-renders.
- Debuggability and testing: Clear boundaries between props and state simplify unit tests and UI reasoning; predictable renders make it easier to reproduce issues.

In production, these concepts translate to design systems, consistent component APIs, and maintainable codebases where changes are localized and easily tested. Vue-based teams often map these React concepts to Vue’s reactivity system (ref, reactive) and template-based rendering, but the core principles—data flow, state, and rendering—remain consistent.

## 6. Study Questions

1) What is JSX and why is it useful in React development?  
2) How do you pass data from a parent to a child component in React?  
3) What does useState return, and how do you update the state?  
4) Why should you avoid mutating state directly? Provide an example of the correct approach.  
5) Why are keys important when rendering lists in React, and how should you choose a key?

## 7. Exercise

Practical multi-part coding challenge: Build a Mini Profile Editor with a Task List

Part A — Component design
- Create a small app with three pieces:
  - ProfileCard: displays user.name and user.email (provided via props).
  - ProfileEditor: allows editing name and email; uses local state to hold edits.
  - App: holds the master user state, renders ProfileCard and ProfileEditor, and passes down props accordingly.

Part B — State and editing
- Implement ProfileEditor so that changes in the input fields update local state.
- Add a Save button that, when clicked, calls a callback from App to update the master user state.

Part C — List of skills (props and rendering)
- Add a SkillsList component that receives an array of skills via props and renders them as a list. Ensure each item uses a stable key.

Part D — Persist to localStorage
- Extend App to save the master user data and skills to localStorage on changes, and to initialize from localStorage if available.

Part E — Basic interactions and UX quality
- Add a Reset button to revert edits in ProfileEditor back to the master user data from App.
- Show a small summary: “Profile cached” or “Unsaved changes” based on whether the local edits differ from the master data.

Starter scaffold (you may fill in the details as you implement):

```jsx
// src/App.jsx
import React, { useState, useEffect } from 'react';
import ProfileCard from './ProfileCard';
import ProfileEditor from './ProfileEditor';
import SkillsList from './SkillsList';

const INITIAL = {
  name: 'Alex Doe',
  email: 'alex@example.com',
  skills: ['React', 'Vue', 'JavaScript']
};

export default function App() {
  // TODO: initialize state from LOCAL_STORAGE if present
  // TODO: render ProfileCard, ProfileEditor, and SkillsList
  // TODO: implement Save to update master state
  return <div>Exercise scaffold</div>;
}
```

```jsx
// src/ProfileCard.jsx
import React from 'react';

export default function ProfileCard({ user }) {
  // TODO: render user.name and user.email
  return <div>ProfileCard placeholder</div>;
}
```

```jsx
// src/ProfileEditor.jsx
import React, { useState, useEffect } from 'react';

export default function ProfileEditor({ user, onSave, onReset }) {
  // TODO: manage local edits, call onSave({ name, email }) when saving
  // TODO: render inputs for name and email, and Save/Reset buttons
  return <div>ProfileEditor placeholder</div>;
}
```

```jsx
// src/SkillsList.jsx
import React from 'react';

export default function SkillsList({ skills }) {
  // TODO: render a list of skills with stable keys
  return <div>SkillsList placeholder</div>;
}
```

What you should deliver after completing the exercise:
- A small React app (or a subset you can run in a sandbox) that demonstrates:
  - JSX-based rendering of a ProfileCard and a ProfileEditor with local state.
  - Props-based data flow from App to children.
  - A list (skills) rendered from an array with proper keys.
  - LocalStorage persistence so data survives page reloads.

Note: If you’re using Vue in your project, you can map these patterns to Vue’s Composition API (ref/reactive for state, props for data, and template syntax) to achieve similar behavior, while recognizing the React-specific syntax and hooks in this exercise.