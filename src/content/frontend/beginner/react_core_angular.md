# Track: Frontend Engineering — Phase 2 — Modern UI Frameworks | Topic: React Core (JSX, Props, State hook) | Language/Stack: Angular

React Core concepts—JSX, props, and the state hook—are foundational for building interactive, component-based interfaces. Even if your primary stack is Angular, understanding JSX-like templating, data flow via props, and local component state helps you reason about UI composition, reactivity, and performance across frameworks. This lesson presents React-style patterns with clear code examples, plus a cross-framework comparison to Angular to deepen your professional intuition.

## 1. JSX: Syntactic Foundations and Rendering

JSX lets you write UI in a familiar, HTML-like syntax that ultimately maps to React.createElement calls. It enables expressive, declarative UIs and makes composition straightforward.

```jsx
import React from 'react';

function Greeting({ name }) {
  return <div className="greeting">Hello, {name}!</div>;
}

function App() {
  return (
    <section>
      <Greeting name="Alex" />
      <Greeting name="Jordan" />
    </section>
  );
}

export default App;
```

### Line-by-line explanation
- import React from 'react'; — Imports the React library, enabling JSX to be transformed and used in this module.
- function Greeting({ name }) { ... } — Defines a functional component that receives props and destructures name from them.
- return <div className="greeting">Hello, {name}!</div>; — Renders a div with a class and a dynamic name interpolated into the string.
- function App() { return ( ... ); } — Defines a parent component that composes UI by rendering Greeting twice with different props.
- <Greeting name="Alex" /> — Passes the string "Alex" as the name prop to Greeting.
- <Greeting name="Jordan" /> — Passes the string "Jordan" as the name prop to Greeting.
- export default App; — Exposes App as the default export of this module.

## 2. Props: Data Flow and Component Interfaces

Props are inputs to components. They enable composition and reusable UI elements by allowing parent components to pass data and callbacks to children.

```jsx
import React from 'react';

function UserCard({ user, onGreet }) {
  return (
    <div className="card">
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
      <button onClick={() => onGreet(user.name)}>Greet</button>
    </div>
  );
}

function App() {
  const user = { name: 'Ada', bio: 'Frontend engineer' };
  const greet = (name) => alert(`Hello, ${name}!`);
  return (
    <div>
      <UserCard user={user} onGreet={greet} />
    </div>
  );
}

export default App;
```

### Line-by-line explanation
- function UserCard({ user, onGreet }) { ... } — A functional component with two props: user (an object) and onGreet (a callback).
- <div className="card"> ... </div> — Card container for layout and styling.
- <h2>{user.name}</h2> — Renders the user’s name from the props.
- <p>{user.bio}</p> — Renders the user’s bio from the props.
- <button onClick={() => onGreet(user.name)}>Greet</button> — Attaches a click handler that calls the provided callback with the user’s name.
- const user = { name: 'Ada', bio: 'Frontend engineer' }; — Sample data object used as a prop.
- const greet = (name) => alert(`Hello, ${name}!`); — Callback function passed to the child.
- <UserCard user={user} onGreet={greet} /> — Demonstrates how to pass data and behavior into a child component.
- export default App; — Exposes App as the default export.

Note: In React, props are read-only from the child’s perspective. Children should not mutate props directly; they should call callbacks to request state changes upward (see State Hook section for state management).

## 3. State Hook: Local State and Reactivity

The useState hook adds local state to functional components, enabling interactivity and dynamic rendering without class components.

```jsx
import React, { useState } from 'react';

function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(initial)}>Reset</button>
    </div>
  );
}

export default Counter;
```

### Line-by-line explanation
- import React, { useState } from 'react'; — Imports React and the useState hook for local component state.
- function Counter({ initial = 0 }) { ... } — Defines Counter with a prop to set the starting value, defaulting to 0.
- const [count, setCount] = useState(initial); — Declares a state variable count and its updater setCount, initializing with the initial prop.
- <p>Count: {count}</p> — Renders the current count value from state.
- <button onClick={() => setCount(count + 1)}>Increment</button> — Increments count by 1 on click.
- <button onClick={() => setCount(count - 1)}>Decrement</button> — Decrements count by 1 on click.
- <button onClick={() => setCount(initial)}>Reset</button> — Resets count back to the initial value.
- export default Counter; — Exposes Counter as the default export.

Key concepts to watch:
- State is isolated to the component unless lifted up (shared state via callbacks).
- Updating state triggers a re-render with the new values.
- State initialization happens on first render; subsequent updates replace the previous value with the new one.

## 4. Interplay: Lifting State and Simple Component Composition

In real apps, you often lift state to a common ancestor to coordinate data between siblings. Here’s a small example that combines props, state, and list rendering to illustrate a simple UI with controlled inputs.

```jsx
import React, { useState } from 'react';

function TaskItem({ text, initialDone = false, onToggle }) {
  const [done, setDone] = useState(initialDone);

  const toggle = () => {
    const next = !done;
    setDone(next);
    onToggle?.(text, next);
  };

  return (
    <li>
      <input type="checkbox" checked={done} onChange={toggle} />
      <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{text}</span>
    </li>
  );
}

function TaskList({ tasks }) {
  const [completed, setCompleted] = useState({});

  const handleToggle = (text, isDone) => {
    setCompleted((prev) => ({ ...prev, [text]: isDone }));
  };

  return (
    <div>
      <ul>
        {tasks.map((t, idx) => (
          <TaskItem
            key={idx}
            text={t}
            initialDone={Boolean(completed[t])}
            onToggle={handleToggle}
          />
        ))}
      </ul>
      <p>
        Completed: {Object.values(completed).filter(Boolean).length} / {tasks.length}
      </p>
    </div>
  );
}

function App() {
  const tasks = ['Design UI', 'Implement components', 'Write tests'];
  return (
    <section>
      <h1>My Tasks</h1>
      <TaskList tasks={tasks} />
    </section>
  );
}

export default App;
```

### Line-by-line explanation
- import React, { useState } from 'react'; — Imports React and the useState hook for local state in TaskList and TaskItem.
- function TaskItem({ text, initialDone = false, onToggle }) { ... } — A child component that manages its own done state, and notifies the parent via onToggle.
- const [done, setDone] = useState(initialDone); — Local state for whether the task is completed.
- const toggle = () => { const next = !done; setDone(next); onToggle?.(text, next); }; — Toggles local state, and conditionally calls the parent callback with the updated status.
- <input type="checkbox" checked={done} onChange={toggle} /> — Checkbox bound to local state; onChange triggers toggle.
- <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{text}</span> — Renders task text with strikethrough when done.
- function TaskList({ tasks }) { ... } — Parent component that maintains a map of completed statuses via state.
- const [completed, setCompleted] = useState({}); — Initializes an empty object to track completion per task.
- const handleToggle = (text, isDone) => { setCompleted((prev) => ({ ...prev, [text]: isDone })); }; — Updates completion status for a given task.
- {tasks.map((t, idx) => ( <TaskItem key={idx} text={t} initialDone={Boolean(completed[t])} onToggle={handleToggle} /> ))} — Renders a list of TaskItem components, passing text and derived initialDone status.
- <p>Completed: {Object.values(completed).filter(Boolean).length} / {tasks.length}</p> — Displays a live count of completed tasks.
- export default App; — Exposes App as the entry point for this example.

Angular bridge note (brief):
- JSX doesn't exist in Angular templates; Angular uses HTML templates with data binding. The equivalent data flow is:
  - Props analogy: @Input() in Angular components.
  - State analogy: component properties and services for shared state.
  - Rendering list and events via *ngFor and (click) bindings.
  - See the Angular section below for concrete examples.

Angular analogs: quick reference
- Greeting component (Angular):
  - @Component({ selector: 'greeting', template: `<div class="greeting">Hello, {{ name }}!</div>` })
    export class GreetingComponent { @Input() name: string = ''; }
- Counter component (Angular):
  - @Component({ selector: 'counter', template: `<button (click)="increment()">Count: {{ count }}</button>` })
    export class CounterComponent { count = 0; increment() { this.count++; } }

## 5. Why This Matters In Real Systems — Production Context

- Reusability and maintainability: JSX encourages modular, reusable components with explicit interfaces (props). This makes large codebases easier to reason about, test, and refactor.
- Predictable data flow: Props define a unidirectional data flow from parent to child, reducing side effects and making components easier to compose.
- Local vs global state balance: The state hook empowers components to manage local interactivity efficiently. Lifting state upward ensures siblings share a single source of truth, preventing UI drift.
- Performance considerations: Immutable updates (setCount with a new value, not mutating previous state) enable React’s diffing algorithm to minimize DOM updates. In large lists, keying items and memoization strategies help avoid unnecessary renders.
- Cross-framework thinking: By understanding React primitives (JSX, props, state), you can better compare with Angular’s templates, @Input, and component state, enabling hybrid approaches, migration planning, and better collaboration in multi-stack teams.

## Z. Study Questions — 5 recall questions

1. What is JSX and how does it relate to React.createElement calls?
2. How do props enforce a one-way data flow between parent and child components?
3. What is the purpose of the useState hook, and what happens when you call its setter?
4. How can you lift state up to coordinate changes across sibling components?
5. In Angular, what are the equivalents of React’s props and state, and how do you bind data in templates?

## Exercise — Practical multi-part coding challenge

Part A: Build a small React component set that demonstrates JSX, props, and state.
- Part A1: Create a functional component named ProfileCard that accepts props: name (string), title (string), and avatarUrl (string). It should render a card with the avatar, name, and title.
- Part A2: Add a local state boolean isFollowing with a button that toggles follow/unfollow. The button label should reflect the current state.
- Part A3: Compose ProfileCard in a parent App to render three profiles with distinct data.

Part B: Extend with a simple list interaction.
- Part B1: Create a component called BookmarkList that takes a prop items: string[]. It should render a list of items with a checkbox next to each.
- Part B2: Add local state to track which items are checked, and render a summary line: “X of Y items checked.”
- Part B3: Ensure each list item has a stable key.

Part C: Angular bridge (optional, for cross-framework practice)
- Angular equivalents (brief): Provide minimal Angular snippets for a ProfileCard-like component with @Input properties and a follow toggle using a local component state, plus a BookmarkList-like component using *ngFor and (change) handlers.
- Note: You don’t have to implement Angular code in this exercise, but sketching the approach reinforces cross-framework thinking.

Deliverables:
- React code for ProfileCard and App composing three cards with follow toggles.
- React code for BookmarkList with item checkboxes and a summary.
- A short mapping note describing how these would translate to Angular concepts (@Input, template binding, and component state).

End of lesson.