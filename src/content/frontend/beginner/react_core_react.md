# React Core (JSX, Props, State hook)

React Core fundamentals power modern frontend apps. JSX provides a declarative syntax for describing UI, props enable reusable components with data-driven rendering, and the useState hook lets components manage internal state. Mastery of these basics is essential for building scalable, maintainable user interfaces in real systems.

## 1. JSX Essentials: Syntax and Embedding

Code demonstrates how to create UI with JSX, embed dynamic data, and use JSX attributes and children.

```jsx
import React from 'react';

function Greeting({ name }) {
  return <div>Hello, {name}!</div>;
}

export default Greeting;
```

### Line-by-line explanation breaking down each line

- Line 1: Import React to enable JSX transformation and React APIs (in older setups; newer setups with automatic JSX runtime may not require this line).
- Line 3: Declare a functional component named Greeting that receives props, destructuring to extract name.
- Line 4: Return a JSX element (div) with static text and a dynamic expression {name} that interpolates the prop value.
- Line 6: Export the Greeting component as the default export for use in other modules.

## 2. Props: Passing Data to Components

Props allow components to be reusable with different data. This section shows props destructuring, passing data, and using children for composition.

```jsx
// UserCard.jsx
import React from 'react';

function UserCard({ user, children }) {
  return (
    <div className="card">
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
      {children}
    </div>
  );
}

export default UserCard;
```

```jsx
// App.jsx
import React from 'react';
import UserCard from './UserCard';

function App() {
  const user = { name: 'Alex', bio: 'Frontend engineer' };

  function sayHi() {
    alert(`Hi ${user.name}!`);
  }

  return (
    <UserCard user={user}>
      <button onClick={sayHi}>Greet</button>
    </UserCard>
  );
}

export default App;
```

### Line-by-line explanation breaking down each line

- UserCard.jsx
- Line 1: Import React (for JSX and component APIs).
- Line 3: Define UserCard with props destructured into user and children.
- Line 5: Return a div with a header showing the user's name extracted from user.name and a paragraph with user.bio.
- Line 8: Render {children} to support composition (whatever is placed inside <UserCard>…</UserCard>).
- Line 10: Export UserCard for use elsewhere.

- App.jsx
- Line 1: Import React.
- Line 3: Import the UserCard component.
- Line 5: Define App and create a user object to pass as props.
- Line 9: Include a button as children to demonstrate composition via props.children.
- Line 13: Export App.

## 3. State Hook: useState for Local UI State

State lets a component remember information between renders and respond to user interactions. This example shows initializing state, updating it with setters, and using functional updates to avoid stale closures.

```jsx
import React, { useState } from 'react';

function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);

  const increment = () => setCount((c) => c + 1);
  const decrement = () => setCount((c) => c - 1);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
}

export default Counter;
```

### Line-by-line explanation breaking down each line

- Line 1: Import React and the useState hook from React.
- Line 3: Define Counter component with an optional initial prop (default 0).
- Line 4: Declare a state variable count and its setter setCount, initialized to initial.
- Line 6: Define increment as a function that updates count using a functional update to ensure correctness if state updates are batched.
- Line 7: Define decrement similarly using a functional update.
- Line 9-16: Render a div containing the current count and two buttons wired to increment and decrement.
- Line 18: Export Counter for use in other modules.

Optional extended example (illustrating updating an object in state) for awareness (do not overuse with large objects in simple components):

```jsx
import React, { useState } from 'react';

function ToggleBox() {
  const [state, setState] = useState({ on: false });

  const flip = () => setState((s) => ({ ...s, on: !s.on }));
  return (
    <div>
      <p>{state.on ? 'ON' : 'OFF'}</p>
      <button onClick={flip}>Flip</button>
    </div>
  );
}
export default ToggleBox;
```

### Line-by-line explanation breaking down each line

- Line 1: Import React and useState.
- Line 3: Define ToggleBox component.
- Line 4: Initialize state with an object containing on: false.
- Line 6: Define flip to toggle the on property using a functional state update and object spread.
- Line 7-12: Render current state and a button that triggers flip.
- Line 14: Export ToggleBox.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Directly mutating state instead of using the setter
  - Bad
  ```jsx
  // Bad: mutating state directly (not allowed)
  function CounterBad() {
    const [count, setCount] = useState(0);
    count = count + 1; // illegal mutation; React won't re-render
  }
  ```
  - Good
  ```jsx
  // Good: use setter with functional update to avoid stale state
  function CounterGood() {
    const [count, setCount] = useState(0);
    const increment = () => setCount((c) => c + 1);
  }
  ```

- Pitfall 2: Not providing keys when rendering lists
  - Bad
  ```jsx
  function TodoListBad({ items }) {
    return (
      <ul>
        {items.map((item) => <li>{item.text}</li>)}
      </ul>
    );
  }
  ```
  - Good
  ```jsx
  function TodoListGood({ items }) {
    return (
      <ul>
        {items.map((item) => <li key={item.id}>{item.text}</li>)}
      </ul>
    );
  }
  ```

- Pitfall 3: Creating new functions in render leading to unnecessary re-renders
  - Bad
  ```jsx
  function ButtonListBad({ onClick }) {
    return <button onClick={() => onClick('ok')}>Click</button>;
  }
  ```
  - Good
  ```jsx
  function ButtonListGood({ onClick }) {
    const handleClick = () => onClick('ok');
    return <button onClick={handleClick}>Click</button>;
  }
  ```

- Pitfall 4: Missing or incorrect effect dependencies
  - Bad
  ```jsx
  import React, { useEffect, useState } from 'react';
  function TitleUpdaterBad({ count }) {
    useEffect(() => {
      document.title = `Count ${count}`;
    }, []); // dependencies missing
  }
  ```
  - Good
  ```jsx
  import React, { useEffect, useState } from 'react';
  function TitleUpdaterGood({ count }) {
    useEffect(() => {
      document.title = `Count ${count}`;
    }, [count]);
  }
  ```

## Y. Why This Matters In Real Systems — production context and real usage

- Predictable UI: JSX makes the UI a function of state and props, which reduces side effects and makes reasoning about rendering easier in large apps.
- Reusability and composition: Props and children enable building small, focused components that can be composed to form complex interfaces with consistent behavior.
- State management discipline: useState (and higher-level state libraries) help isolate local interactivity, easing maintenance and testing.
- Performance considerations: every state update can trigger a render. Understanding when to use local state, memoization (React.memo), and stable handlers (useCallback) matters in production with large component trees.
- Accessibility and semantics: JSX maps to DOM semantics; embracing proper markup, ARIA attributes, and keyboard navigation is essential for real users.
- Real-world patterns: Often you’ll lift state up to common ancestors, manage asynchronous data with effects, and coordinate between components via props, context, or state libraries. Design components with clear props contracts and minimal side effects to keep systems scalable.

## Z. Study Questions — 5 recall questions

1. What is JSX and how does it relate to HTML and JavaScript?
2. How do you pass data into a React component, and how can you access it inside the component?
3. What does useState return, and how do you update state safely?
4. How do you handle events in React, and why should you avoid inline function definitions inside render in performance-critical sections?
5. Why are keys important when rendering lists in React, and what happens if you use indices as keys?

## Exercise — a practical multi-part coding challenge

Part A: Set up a small React app structure (no external libraries required).

- Create two components:
  - UserCard: receives props { user } with fields { id, name, email, online } and renders a card with name, email, and a toggle button.
  - App: holds a list of users in state and renders a list of UserCard components.

Part B: Add interactivity

- Implement a toggleOnline function in App that flips the online flag for a given user id.
- Pass onToggleOnline to UserCard via props and wire the button to call it with the correct id.

Part C: Sorting and filtering

- Add a simple control (select or buttons) to sort users by name (ascending) or by online status (online first).
- Add a text input to filter users by name.

Part D: Accessibility and clean code

- Ensure buttons have discernible text, aria-labels if needed, and semantic markup.
- Use PropTypes (or a brief TypeScript annotation) to document the props contract for UserCard.

Starter code (you can adapt into your project):

```jsx
import React, { useState } from 'react';

// UserCard component: props: user { id, name, email, online }
function UserCard({ user, onToggleOnline }) {
  return (
    <div className="card" role="article" aria-label={`User ${user.name}`}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <p>Status: {user.online ? 'Online' : 'Offline'}</p>
      <button onClick={() => onToggleOnline(user.id)} aria-label={`Toggle ${user.name} online status`}>
        {user.online ? 'Set Offline' : 'Set Online'}
      </button>
    </div>
  );
}

// App component: holds users state and renders UserCard list
function App() {
  const initialUsers = [
    { id: 1, name: 'Alex', email: 'alex@example.com', online: true },
    { id: 2, name: 'Sam', email: 'sam@example.com', online: false },
    { id: 3, name: 'Jordan', email: 'jordan@example.com', online: true },
  ];

  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('name'); // 'name' | 'online'

  const toggleOnline = (id) => {
    setUsers((list) =>
      list.map((u) => (u.id === id ? { ...u, online: !u.online } : u))
    );
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'online') {
      // online first
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.name.localeCompare(b.name);
    } else {
      // name sort
      return a.name.localeCompare(b.name);
    }
  });

  return (
    <div>
      <h1>User Directory</h1>

      <div>
        <label>
          Search by name:
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a name..."
          />
        </label>

        <label>
          Sort:
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="online">Online Status</option>
          </select>
        </label>
      </div>

      <div className="card-grid" aria-label="User list">
        {sorted.map((user) => (
          <UserCard key={user.id} user={user} onToggleOnline={toggleOnline} />
        ))}
      </div>
    </div>
  );
}

export default App;
```

Notes for the exercise:
- You can run this in any modern React setup. The focus is on applying JSX, props, and state hooks to build an interactive, reusable UI.
- Ensure you test toggling online status, searching by name, and sorting as described.
- Optional enhancements: add PropTypes or TypeScript types, extract common styles, or introduce a lightweight state-management approach as you scale.