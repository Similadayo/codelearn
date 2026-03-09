# JavaScript Fundamentals (DOM, Events) — Phase 1: The Foundations (TypeScript Frontend)

Compelling introductory paragraph: The DOM (Document Object Model) is the living bridge between your JavaScript/TypeScript code and the page the user sees. It governs how you read, modify, and respond to the document structure, styles, and user interactions. Mastery of DOM APIs and event handling is essential for building interactive UI, improving accessibility, and delivering resilient frontends in professional-grade applications. In TypeScript, you gain strong typing, safer refactors, and clearer contracts for DOM interactions, reducing runtime surprises in production.

## 1. DOM Basics with TypeScript

Code example: selecting elements, reading and writing content, and basic attribute manipulation with proper null checks.

```ts
// TypeScript: Basic DOM read/write
// Assume HTML contains: <div id="app"></div>

const appElem = document.getElementById('app');
if (!appElem) throw new Error('App container not found');

// Read and write text content
appElem.textContent = 'Welcome to the Frontend Foundations!';

// Set a data attribute
appElem.setAttribute('data-version', '1.0');

// Optional stronger typing pattern
const appEl = document.getElementById('app');
if (appEl) {
  // Cast only when necessary and safe
  (appEl as HTMLElement).style.backgroundColor = '#f0f4f8';
}
```

### Line-by-line explanation breaking down each line

- // TypeScript: Basic DOM read/write
  - Comment describing the purpose of the block.
- // Assume HTML contains: <div id="app"></div>
  - Hint about the expected DOM structure for context.
- const appElem = document.getElementById('app');
  - Retrieve the element with id "app" from the DOM. Type is HTMLElement | null.
- if (!appElem) throw new Error('App container not found');
  - Guard clause to fail fast if the element isn’t present, avoiding null usage later.
- appElem.textContent = 'Welcome to the Frontend Foundations!';
  - Update the visible text content of the element.
- appElem.setAttribute('data-version', '1.0');
  - Set a custom data attribute on the element for metadata or styling hooks.
- const appEl = document.getElementById('app');
  - Retrieve again (demonstrating the common pattern of optional chaining vs explicit guard).
- if (appEl) {
  - Continue only if the element exists.
- (appEl as HTMLElement).style.backgroundColor = '#f0f4f8';
  - Apply inline styling; casting to HTMLElement clarifies the type for TS.
- }
  
This section demonstrates safe access patterns, basic text manipulation, and modest attribute changes that are foundational to dynamic UIs.

## 2. Creating and Inserting Elements

Code example: creating new nodes, setting content, and inserting into the DOM.

```ts
// Create and append a new list item
const list = document.querySelector<HTMLUListElement>('#todo');
if (!list) throw new Error('Todo list not found');

const newItem = document.createElement('li');
newItem.textContent = 'Learn TypeScript DOM';
newItem.setAttribute('role', 'listitem');
list.appendChild(newItem);
```

### Line-by-line explanation breaking down each line

- // Create and append a new list item
  - Comment describing the purpose of this block.
- const list = document.querySelector<HTMLUListElement('#todo');
  - Select an unordered list with id="todo" using a generic to get proper typing. Returns HTMLUListElement | null.
- if (!list) throw new Error('Todo list not found');
  - Guard against missing element to ensure subsequent operations are safe.
- const newItem = document.createElement('li');
  - Create a new list item element.
- newItem.textContent = 'Learn TypeScript DOM';
  - Set visible text for the new item.
- newItem.setAttribute('role', 'listitem');
  - Improve accessibility by explicitly marking the role.
- list.appendChild(newItem);
  - Attach the new item to the DOM as a child of the list.

This section shows how to build DOM nodes programmatically and integrate them into the existing document structure.

## 3. Event Handling (Mouse, Keyboard, Form)

Code example: responding to a click, and handling a keyboard event, with safe typing.

```ts
// Simple click counter
let count = 0;

const btn = document.getElementById('counterBtn');
const countSpan = document.getElementById('count');
if (btn && countSpan) {
  btn.addEventListener('click', (ev: MouseEvent) => {
    count++;
    countSpan.textContent = String(count);
  });
}
```

### Line-by-line explanation breaking down each line

- // Simple click counter
  - Comment that this is a basic interactive example.
- let count = 0;
  - Local state for the number of clicks.
- const btn = document.getElementById('counterBtn');
  - Grab the button element by id.
- const countSpan = document.getElementById('count');
  - Grab the display element that shows the count.
- if (btn && countSpan) {
  - Ensure both elements exist before wiring the event.
- btn.addEventListener('click', (ev: MouseEvent) => {
  - Attach a click event listener; typing the event as MouseEvent helps with intellisense and correctness.
- count++;
  - Increment the counter.
- countSpan.textContent = String(count);
  - Update UI with the new count value.
- });
  - End of the event handler.
- }
  
This segment demonstrates how to wire interactive events with TypeScript types, ensuring runtime safety with null checks.

Another event example: keyboard handling

```ts
document.addEventListener('keydown', (ev: KeyboardEvent) => {
  if (ev.key === 'Enter') {
    console.log('Enter pressed');
  }
});
```

### Line-by-line explanation breaking down each line

- document.addEventListener('keydown', (ev: KeyboardEvent) => {
  - Attach a global keyboard listener; typing the event as KeyboardEvent aids in reading properties like key.
- if (ev.key === 'Enter') {
  - Check if the pressed key is Enter.
- console.log('Enter pressed');
  - Simple side effect demonstrating handling a keyboard event.
- }
- });
  
This example illustrates handling non-mouse input, which is critical for accessibility and keyboard-driven navigation.

## 4. Event Delegation and Cleanup

Code example: using a single handler for dynamic list items and safe cleanup.

```ts
// Event delegation: listen on the parent and react to targets
const itemList = document.getElementById('items');
if (itemList) {
  function onListClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement;
    if (target && target.matches('li')) {
      console.log('Clicked item:', target.textContent);
    }
  }

  itemList.addEventListener('click', onListClick);

  // Cleanup example: remove listener later if needed
  // itemList.removeEventListener('click', onListClick);
}
```

### Line-by-line explanation breaking down each line

- // Event delegation: listen on the parent and react to targets
  - Comment describing the strategy to handle dynamic children efficiently.
- const itemList = document.getElementById('items');
  - Get the parent container that will host multiple items.
- if (itemList) {
  - Guard to ensure the container exists.
- function onListClick(ev: MouseEvent) {
  - Define a named handler for later removal and clarity.
- const target = ev.target as HTMLElement;
  - Narrow the event target to a concrete element for further checks.
- if (target && target.matches('li')) {
  - Verify the clicked element is an LI item.
- console.log('Clicked item:', target.textContent);
  - Demonstrate reading content from the clicked item.
- }
- }
- itemList.addEventListener('click', onListClick);
  - Attach the delegate handler to the UL container.
- // itemList.removeEventListener('click', onListClick);
  - Optional: show how to detach the handler to avoid leaks or on unmount.
- }
  
This demonstrates scalable event handling for dynamic content and shows how to clean up listeners when components unmount or pages navigate away.

## 5. TypeScript Nuances with DOM (Typing and Narrowing)

Code example: using generic querySelector, proper null checks, and safe event target handling with TypeScript.

```ts
// Strongly-typed DOM access patterns
const input = document.querySelector<HTMLInputElement>('#nameInput');
if (input) {
  input.value = 'Jane Doe';
  input.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement;
    console.log('Current value:', target.value);
  });
}
```

### Line-by-line explanation breaking down each line

- // Strongly-typed DOM access patterns
  - Comment describing the intent to leverage TypeScript generics and narrowing.
- const input = document.querySelector<HTMLInputElement>('#nameInput');
  - Use a generic to get a typed input element; returns HTMLInputElement | null.
- if (input) {
  - Guard to ensure the element exists.
- input.value = 'Jane Doe';
  - Set the input value directly.
- input.addEventListener('input', (e: Event) => {
  - Listen to the input event, which fires on every user change.
- const target = e.target as HTMLInputElement;
  - Narrow the event target to a known type for safe property access.
- console.log('Current value:', target.value);
  - Read and log the current value as the user types.
- });
- }

This section highlights best practices for using TypeScript with DOM APIs, including how generics and safe narrowing reduce type-related bugs.

## X. Common Beginner Mistakes

### 1) Null access without checks

Bad:
```ts
const btn = document.getElementById('startBtn');
btn.addEventListener('click', () => {
  // do something
});
```
Good:
```ts
const btn = document.getElementById('startBtn');
if (!btn) throw new Error('Start button not found');
btn.addEventListener('click', () => {
  // do something
});
```

### 2) Incorrect event.target typing

Bad:
```ts
const list = document.getElementById('list');
list?.addEventListener('click', (e: Event) => {
  const target = e.target;
  target.classList.add('selected');
});
```
Good:
```ts
const list = document.getElementById('list');
if (list) {
  list.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    target.classList.add('selected');
  });
}
```

### 3) Forgetting cleanup / memory leaks

Bad:
```ts
const div = document.getElementById('live');
div?.addEventListener('scroll', () => {
  // run forever
});
```
Good:
```ts
const div = document.getElementById('live');
function onScroll() { /* handler */ }
div?.addEventListener('scroll', onScroll);
// Later, when unmounting
div?.removeEventListener('scroll', onScroll);
```

### 4) Using innerHTML with user input (security risk)

Bad:
```ts
const container = document.getElementById('container');
container!.innerHTML = `<p>${userInput}</p>`;
```
Good:
```ts
const container = document.getElementById('container');
const p = document.createElement('p');
p.textContent = userInput;
container!.appendChild(p);
```

These examples emphasize safe typing, robust null handling, memory management, and security considerations when manipulating the DOM.

## Y. Why This Matters In Real Systems

- Stability and maintainability: TypeScript helps catch null references, wrong event types, and mismatched DOM APIs during compile time, reducing runtime errors in production.
- Accessibility and UX: Proper event handling (keyboard events, focus management, and ARIA attributes) enables inclusive interfaces that work with assistive technologies.
- Performance: Use event delegation for dynamic lists to avoid attaching many handlers; batch DOM updates and minimize layout thrashing.
- Real-world patterns:
  - Strong typing for querySelector and getElementById reduces surprising nulls.
  - Clearing listeners on component unmount prevents memory leaks in SPA frameworks.
  - Consistent event handling patterns (delegation, proper removal) simplify code reviews and testing.
- Ecosystem alignment: This foundation translates to React, Vue, or other frameworks where direct DOM interaction still happens (e.g., portals, custom elements, or performance-critical widgets). It also underpins progressive enhancement, where basic interactivity remains functional even if JavaScript is partially loaded or disabled.

## Z. Study Questions

1) What is the difference between using document.getElementById and document.querySelector with TypeScript generics, in terms of typing and nullability?
2) Why is event delegation important for dynamic content, and how do you implement a safe delegated handler?
3) How would you safely read the value of an input element inside an event handler in TypeScript?
4) What are the risks of using innerHTML with user-generated content, and how can you mitigate them?
5) How can you ensure you clean up DOM event listeners in a single-page application when a component unmounts?

## Exercise

Multi-part practical coding challenge: Build a small interactive "Task Board" in TypeScript that demonstrates DOM manipulation, event handling, delegation, and basic persistence.

Part A — HTML scaffold (provided)
- Create an HTML page (index.html) with:
  - A form containing an input (id="taskInput") and a submit button (id="addTaskBtn").
  - An unordered list (id="taskList") where tasks will be rendered as <li> elements.
  - A counter display (id="taskCount") showing how many tasks are in the list.
  - A button (id="clearAll") to remove all tasks.

Part B — TypeScript core
- Implement:
  - A function addTask(text: string) that creates and appends a new <li> to #taskList. Each <li> should include the task text and a small "Done" toggle and a "Delete" button.
  - A function renderCount() that updates #taskCount with the number of <li> items.
  - Add a delegated click handler on #taskList to:
    - Toggle "done" status when the "Done" button is clicked (apply a class "done" to the <li>).
    - Remove a task when the "Delete" button is clicked.
  - Ensure events are typed safely (e.g., cast event.target to HTMLElement when needed).

Part C — Form handling and validation
- Wire the form submission to addTask(), prevent default submission, trim input, and ignore empty strings.
- Clear the input after adding a task.

Part D — Local persistence
- On every change (add/delete/toggle), persist the current list to localStorage under key "tasks".
- On page load, read from localStorage and reconstruct the list.

Part E — Accessibility and UX
- Ensure each <li> has proper aria-labels or roles to help screen readers.
- Provide keyboard support: allow focusing "Done" and "Delete" buttons and activating with Enter/Space.

Starter TS snippet (you can adapt and extend):

```ts
// Starter scaffold (assumes the HTML structure from Part A)
type Task = { text: string; done: boolean };

const form = document.getElementById('taskForm') as HTMLFormElement | null;
const input = document.getElementById('taskInput') as HTMLInputElement | null;
const list = document.getElementById('taskList') as HTMLUListElement | null;
const countEl = document.getElementById('taskCount') as HTMLSpanElement | null;
const clearBtn = document.getElementById('clearAll') as HTMLButtonElement | null;

let tasks: Task[] = [];

function render() {
  if (!list || !countEl) return;
  list.innerHTML = '';
  for (const t of tasks) {
    const li = document.createElement('li');
    li.textContent = t.text;
    if (t.done) li.classList.add('done');
    // Simple buttons
    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Done';
    doneBtn.setAttribute('aria-label', 'Toggle done');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.setAttribute('aria-label', 'Delete task');
    li.appendChild(doneBtn);
    li.appendChild(delBtn);
    list.appendChild(li);
  }
  renderCount();
  persist();
}

function renderCount() {
  if (countEl) countEl.textContent = String(tasks.length);
}

function persist() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Event delegation
if (list) {
  list.addEventListener('click', (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    const parent = target.closest('li');
    if (!parent) return;
    // Determine which button was clicked
    if (target.textContent === 'Done') {
      const index = Array.from(list.children).indexOf(parent);
      if (index >= 0) {
        tasks[index].done = !tasks[index].done;
        render();
      }
    } else if (target.textContent === 'Delete') {
      const index = Array.from(list.children).indexOf(parent);
      if (index >= 0) {
        tasks.splice(index, 1);
        render();
      }
    }
  });
}

if (form && input) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text.length === 0) return;
    tasks.push({ text, done: false });
    input.value = '';
    render();
  });
}

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    tasks = [];
    render();
  });
}

// Load from storage on startup
function load() {
  const raw = localStorage.getItem('tasks');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Task[];
    if (Array.isArray(parsed)) {
      tasks = parsed;
      render();
    }
  } catch {
    // ignore invalid storage
  }
}
load();
```

Notes for instructors and learners:
- The exercise emphasizes safe DOM typing, null safety, event delegation, and simple persistence—core skills for robust frontend code.
- Encourage students to extend the exercise with input validation, per-item counts (done vs remaining), and error handling in storage operations.
- Discuss real-world considerations: rarely manipulate the DOM directly in large apps; use framework abstractions, but know how to work with the DOM directly when necessary or when building libraries and micro-interactions.