# React Core (JSX, Props, State Hook) in TypeScript

React JSX, props typing, and the state hook form the backbone of interactive UI in modern frontend apps. Mastery of these concepts enables you to write reusable components, maintain strong type safety across a large codebase, and ship robust, scalable interfaces. This lesson focuses on JSX syntax, how to define and use props with TypeScript, and how to manage component state with the useState hook in a TypeScript-friendly way. You’ll learn by reading concise explanations, studying real code examples, and practicing with a hands-on exercise you can build in your project.

## 1. JSX Core: Syntax, Expressions, and Rendering

JSX lets you write markup alongside JavaScript/TypeScript inside React components. It compiles to React.createElement calls and supports expressions, conditional rendering, lists, and fragments. Getting comfortable with JSX is the first step to composing UI in React.

```tsx
import React from 'react';

type ArticleCardProps = {
  title: string;
  content: string;
  tags?: string[];
};

export const ArticleCard = ({ title, content, tags = [] }: ArticleCardProps) => {
  return (
    <article className="card">
      <header>
        <h2>{title}</h2>
      </header>
      <p>{content}</p>
      {tags.length > 0 && (
        <ul className="tags">
          {tags.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      )}
    </article>
  );
};
```

### Line-by-line explanation
- Line 1: Import React to enable JSX handling (depending on your TS config, this import may be optional with the new JSX transform).
- Line 3–7: Define a Props type for the ArticleCard component, requiring title and content and an optional tags array.
- Line 9: Create a functional component ArticleCard that destructures its props and provides a default empty array for tags.
- Line 10–21: Return JSX:
  - article.card wrapper with a header and a title in an h2.
  - A paragraph rendering the content expression.
  - Conditional rendering: if tags.length > 0, render an unordered list of tags.
  - Each tag item uses a stable key (tag string) for React’s reconciliation.
- Line 24: Export the component for use in other parts of the app.

## 2. Props: Typing and Optional/Default Props in TypeScript

Typing props ensures components are used correctly and makes refactors safer. TypeScript lets you model required vs. optional props, provide defaults, and catch mismatches at compile time.

```tsx
type UserBadgeProps = {
  username: string;
  isOnline?: boolean;
  avatarUrl?: string;
};

export const UserBadge: React.FC<UserBadgeProps> = ({
  username,
  isOnline = false,
  avatarUrl
}) => (
  <div className="user-badge">
    {avatarUrl && <img src={avatarUrl} alt={`${username}'s avatar`} className="avatar" />}
    <span className={`status ${isOnline ? 'online' : 'offline'}`} />
    <strong>{username}</strong>
  </div>
);
```

### Line-by-line explanation
- Line 2–6: Define a props interface with one required prop (username) and two optional props (isOnline, avatarUrl).
- Line 8: Declare the UserBadge component with the props type. The React.FC type provides implicit children typing (not required unless you need it) and enforces props shape.
- Line 9–12: Destructure props and provide a default for isOnline (false).
- Line 13–18: Render a badge:
  - Conditionally render an avatar image only if avatarUrl is provided.
  - Render a status indicator that reflects online state.
  - Display the username in bold.
- Line 19: Close the component.

## 3. State Hook: useState with TypeScript and Event Handling

Stateful components manage data that changes over time. useState lets you define a piece of state and a setter function. In TypeScript, you can explicitly type the state to prevent accidental misuse and to get proper IntelliSense.

```tsx
import React, { useState } from 'react';

export const CounterAndInput = () => {
  const [count, setCount] = useState<number>(0);
  const [text, setText] = useState<string>("");

  const increment = () => setCount((c) => c + 1);
  const onTextChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setText(e.target.value);

  return (
    <section>
      <div>Count: {count}</div>
      <button onClick={increment}>Increment</button>

      <div>
        <input value={text} onChange={onTextChange} placeholder="Type something" />
        <p>You typed: {text}</p>
      </div>
    </section>
  );
};
```

### Line-by-line explanation
- Line 1–2: Import React and the useState hook for stateful logic.
- Line 4: Define CounterAndInput as a functional component.
- Line 5–6: Initialize count state as a number with a starting value of 0.
- Line 7–8: Initialize text state as a string with an empty string.
- Line 10: Define a state updater for count using a functional update to safely read the current value.
- Line 11–12: Define a typed event handler for the text input that reads the value from the event target.
- Line 14–23: Render UI:
  - Show the current count and a button to increment it.
  - Render a controlled input bound to text with an onChange handler.
  - Display the current text below the input.

## 4. Integrating Props and State: A Small Interactive Component

Combine props and internal state to build reusable, interactive UI. This example shows a component that receives initial state via props and then manages its own derived state locally.

```tsx
import React, { useState } from 'react';

type StatusProps = { on: boolean; label?: string };

const StatusTag = ({ on, label = 'Status' }: StatusProps) => (
  <span className={`tag ${on ? 'on' : 'off'}`}>{label}: {on ? 'ON' : 'OFF'}</span>
);

type ToggleCardProps = {
  title: string;
  initialOn?: boolean;
};

export const ToggleCard = ({ title, initialOn = false }: ToggleCardProps) => {
  const [on, setOn] = useState<boolean>(initialOn);
  const toggle = () => setOn((v) => !v);

  return (
    <section className="card">
      <header>
        <h3>{title}</h3>
      </header>
      <StatusTag on={on} label="Power" />
      <button onClick={toggle}>{on ? 'Turn Off' : 'Turn On'}</button>
    </section>
  );
};
```

### Line-by-line explanation
- Line 1–2: Import React and useState for stateful logic.
- Line 4–8: Define a small presentational component StatusTag that shows a labeled on/off state.
- Line 10–15: Define props for ToggleCard, including a title and an optional initialOn value.
- Line 17: Create the ToggleCard component, initializing local on state from initialOn.
- Line 18: Define a toggle function to flip the on state.
- Line 20–29: Render the toggle card:
  - Show the title in a header.
  - Render a StatusTag reflecting the current on/off state.
  - Provide a button to toggle the state with appropriate label.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Not typing props; relying on any
  - Bad:
    ```tsx
    // Bad: props are implicitly any
    const Greeting = (props: any) => <div>Hello {props.name}</div>;
    ```
  - Good:
    ```tsx
    type GreetingProps = { name: string };
    const Greeting = ({ name }: GreetingProps) => <div>Hello {name}</div>;
    ```
- Pitfall 2: Mutating state directly instead of using the setter
  - Bad:
    ```tsx
    const [items, setItems] = useState<string[]>([]);
    items.push('new');
    setItems(items);
    ```
  - Good:
    ```tsx
    const [items, setItems] = useState<string[]>([]);
    setItems((prev) => [...prev, 'new']);
    ```
- Pitfall 3: Using array index as key in lists
  - Bad:
    ```tsx
    const items = ['a', 'b', 'c'];
    return (
      <ul>
        {items.map((item, idx) => <li key={idx}>{item}</li>)}
      </ul>
    );
    ```
  - Good:
    ```tsx
    // If each item has a stable id, use it
    const items = [{ id: 'a1', text: 'A' }, { id: 'b2', text: 'B' }];
    return (
      <ul>
        {items.map((item) => <li key={item.id}>{item.text}</li>)}
      </ul>
    );
    ```
- Pitfall 4: Not typing event handlers
  - Bad:
    ```tsx
    const onChange = (e) => setValue(e.target.value);
    ```
  - Good:
    ```tsx
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
      setValue(e.target.value);
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reliability and maintainability: TypeScript typing for props and state catches mismatches during development, reducing runtime bugs in production.
- Refactor safety: When props shapes evolve, the compiler helps identify all usage sites that need updates, reducing regression risk in large codebases.
- Team collaboration: Clear prop contracts act as a form of documentation, helping new engineers understand component responsibilities quickly.
- Performance and scalability: Predictable state updates (using functional setState) and stable keys in lists minimize unnecessary renders and DOM churn in production apps.
- Tooling benefits: Strong types improve IDE autocomplete, inline documentation, and automated refactoring tools, speeding up delivery cycles.

## Z. Study Questions — 5 recall questions

1. What is JSX and how does it relate to React.createElement calls?  
2. How do you define and type props in a TypeScript React component?  
3. How do you specify the type parameter for useState to store numbers, strings, or objects?  
4. Why should you avoid using array indices as keys when rendering lists? What should you use instead?  
5. How can you provide default values for optional props in TypeScript React components?

## Exercise — a practical multi-part coding challenge

Part 1: Create a reusable ProfileCard component
- Requirements:
  - Props: name (string), title (optional string), avatarUrl (optional string)
  - Renders a card with an avatar (if provided), the name, and the title (if provided)
  - Type the props with a dedicated interface
- Deliverables:
  - A TSX component ProfileCard that is visually organized and accessible (alt text for avatar, semantic headings)

Part 2: Build a ProfileList with search
- Requirements:
  - Create a ProfileList component that accepts an array of profiles (using the ProfileCard props but without needing to pass avatar for every item)
  - Maintain a local search state (string) and filter the list by name as the user types
  - Use strict TypeScript typing for the list prop
- Deliverables:
  - A TSX component ProfileList with a search input and a mapped list of ProfileCard items

Part 3: Compose a small app to demonstrate props and state interaction
- Requirements:
  - Create a simple App component that imports and uses ProfileList with a sample dataset
  - Include at least two profiles with varying presence of avatarUrl and titles
  - Ensure the UI demonstrates reactivity: typing in the search box filters results in real time
- Deliverables:
  - A single App.tsx (or similar) that composes ProfileCard and ProfileList and renders in your React application

 optional guidance for implementing exercise
- Define a type Profile = { id: string; name: string; title?: string; avatarUrl?: string };
- ProfileCard props can be derived from Profile but keep avatar and title optional
- In ProfileList, store search as useState<string>("") and compute filteredProfiles = profiles.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
- Render ProfileCard for each filtered profile, passing the correct props
- Ensure the key for each ProfileCard is the profile id for stable reconciliation

This completes a focused, practical lesson on JSX, props typing, and the state hook in TypeScript within a frontend engineering context.