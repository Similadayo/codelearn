# Track: Frontend Engineering — Phase 1: The Foundations — Topic: JavaScript Fundamentals (DOM, Events) with Angular

## 1. Understanding the DOM in Angular
Angular provides a high-level abstraction over the browser DOM. You typically bind events in templates and manipulate the DOM through Angular bindings, directives, and safe services like Renderer2. This section introduces how to access and modify DOM safely in Angular, using ElementRef and Renderer2, while honoring Angular's rendering lifecycle and platform-agnostic constraints.

```ts
import { Component, ElementRef, OnInit, ViewChild, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-dom-fundamentals',
  template: `
    <div class="status-box" #statusBox>
      DOM Basics in Angular
    </div>
    <button (click)="highlight()">Highlight</button>
  `,
  styles: [`
    .status-box { padding: 8px; border: 1px solid #ccc; display: inline-block; }
    .highlighted { background: #ffeb3b; }
  `]
})
export class DomFundamentalsComponent implements OnInit {
  @ViewChild('statusBox') statusBox!: ElementRef<HTMLDivElement>;

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    // Safe: DOM element may not be ready here, so we avoid direct manipulation.
  }

  highlight(): void {
    // Safe: Using Renderer2 to modify the DOM instead of touching it directly
    this.renderer.addClass(this.statusBox.nativeElement, 'highlighted');
  }
}
```

### Line-by-line explanation
- Line 1: Import Angular core symbols for component creation, view querying, and DOM manipulation.
- Line 3-12: Component decorator with selector, inline template, and inline styles.
- Line 5-9: Inline template containing a div reference (#statusBox) and a button bound to highlight().
- Line 11-12: Styles for visuals; the highlighted class marks the element when activated.
- Line 16: Component class declaration implementing OnInit.
- Line 17: ViewChild decorator to capture the DOM element via a template reference.
- Line 19: Inject Renderer2 to perform safe DOM operations.
- Line 21-23: ngOnInit lifecycle hook; avoid accessing DOM directly here.
- Line 25-27: highlight() uses Renderer2 to add a class to the DOM element, changing appearance without direct DOM manipulation.

## 2. Event Binding and Handling
Events in Angular are typically bound declaratively in templates. This section covers basic event binding, propagating events to the component, and handling the event object in a type-safe way.

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-event-binding',
  template: `
    <input #textInput (input)="onInput($event)" placeholder="Type something...">
    <p>You typed: {{ typed }}</p>
    <button (click)="reset()">Reset</button>
  `,
  styles: []
})
export class EventBindingComponent {
  typed: string = '';

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.typed = value;
  }

  reset(): void {
    this.typed = '';
  }
}
```

### Line-by-line explanation
- Line 1: Import Component for creating an Angular component.
- Lines 3-12: Component decorator with selector, template, and styles.
- Lines 6-12: Inline template includes an input bound to the onInput() handler, a display paragraph, and a Reset button bound to reset().
- Line 14: Class declaration for EventBindingComponent.
- Line 15: Public property typed stores the current input value for display.
- Line 17-21: onInput receives the DOM Event, extracts the input value from the target, and updates typed.
- Line 23-25: reset() clears the stored value, demonstrating a simple state reset triggered by a button.

## 3. Safe DOM Manipulation with Renderer2 and HostListener
Direct DOM access is discouraged in Angular for SSR and testing. This section demonstrates safe modifications using Renderer2 and capturing global events with HostListener.

```ts
import { Component, ElementRef, ViewChild, Renderer2, HostListener } from '@angular/core';

@Component({
  selector: 'app-dom-manipulation',
  template: `
    <div #panel class="panel" style="width: 200px; height: 100px; background: #f0f0f0;">
      Resize me
    </div>
    <button (click)="grow()">Grow</button>
    <button (click)="shrink()">Shrink</button>
  `,
  styles: [`.panel { transition: width 0.2s; }`]
})
export class DomManipulationComponent {
  @ViewChild('panel') panel!: ElementRef<HTMLDivElement>;

  constructor(private renderer: Renderer2) {}

  grow(): void {
    const current = parseInt(this.panel.nativeElement.style.width) || 200;
    const next = current + 50;
    this.renderer.setStyle(this.panel.nativeElement, 'width', next + 'px');
  }

  shrink(): void {
    const current = parseInt(this.panel.nativeElement.style.width) || 200;
    const next = Math.max(current - 50, 50);
    this.renderer.setStyle(this.panel.nativeElement, 'width', next + 'px');
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    // Example: adapt height to window width as a demonstration
    const w = (event.target as Window).innerWidth;
    const newHeight = Math.max(60, Math.min(200, Math.floor(w / 10)));
    this.renderer.setStyle(this.panel.nativeElement, 'height', newHeight + 'px');
  }
}
```

### Line-by-line explanation
- Line 1: Import Angular decorators/classes including HostListener for global events.
- Lines 3-12: Component decorator with a panel element and two control buttons.
- Line 6-12: Inline template where panel has an initial inline width/height and a Grow/Shrink control.
- Line 14: Class declaration.
- Line 15: ViewChild to grab the panel DOM element safely.
- Line 17: Inject Renderer2 for safe DOM updates.
- Lines 19-26: grow() increases panel width by 50px using Renderer2.
- Lines 28-34: shrink() decreases the panel width with a lower bound of 50px using Renderer2.
- Lines 36-41: HostListener listens to window resize and adjusts the panel height via Renderer2 to illustrate responsive DOM updates.

## 4. Templates, Bindings, and Accessibility: Best Practices
This section contrasts direct DOM touch points in templates vs code, and demonstrates accessible, maintainable patterns. It shows using class and style bindings, aria attributes, and template references to drive UI state without imperative DOM manipulation.

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-accessibility-patterns',
  template: `
    <button
      class="toggle-btn"
      [attr.aria-pressed]="isActive"
      [class.active]="isActive"
      (click)="toggle()"
    >
      {{ isActive ? 'Active' : 'Inactive' }}
    </button>
    <div #panel class="panel" [style.display]="isActive ? 'block' : 'none'">
      Accessible panel content
    </div>
  `,
  styles: [`.panel { padding: 8px; border: 1px solid #ccc; margin-top: 8px; } .active { outline: 2px solid blue; }`]
})
export class AccessibilityPatternsComponent {
  isActive = false;

  toggle(): void {
    this.isActive = !this.isActive;
  }
}
```

### Line-by-line explanation
- Line 1: Import Component.
- Lines 3-14: Component decorator with a button and a panel. The button uses ARIA attributes and a dynamic class for accessibility and state indication.
- Line 7-13: Button bindings:
  - aria-pressed reflects the current state for assistive tech.
  - [class.active] toggles a visual cue when active.
  - (click) toggles the isActive state.
- Line 10-12: Panel visibility is controlled via [style.display] binding, showing/hiding content without manipulating the DOM directly.
- Line 16: Class with isActive flag and toggle() method to switch state.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Direct DOM access with nativeElement
Bad
```ts
// app/bad-dom-access.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
@Component({
  selector: 'app-bad-dom',
  template: `<div #box style="width:100px; height:100px; background:red;"></div>`
})
export class BadDomComponent {
  @ViewChild('box') box!: ElementRef<HTMLDivElement>;
  makeGreen(): void {
    // Direct DOM manipulation (not recommended)
    this.box.nativeElement.style.backgroundColor = 'green';
  }
}
```
Good
```ts
// app/good-dom-access.ts
import { Component, ElementRef, ViewChild, Renderer2 } from '@angular/core';
@Component({
  selector: 'app-good-dom',
  template: `<div #box style="width:100px; height:100px; background:red;"></div>`
})
export class GoodDomComponent {
  @ViewChild('box') box!: ElementRef<HTMLDivElement>;

  constructor(private renderer: Renderer2) {}

  makeGreen(): void {
    this.renderer.setStyle(this.box.nativeElement, 'backgroundColor', 'green');
  }
}
```

### Line-by-line explanation
- Bad example: accesses DOM directly via nativeElement, bypassing Angular safety and testability.
- Good example: uses Renderer2 to manipulate DOM, preserving compatibility with SSR and tests.

### Pitfall 2: Handling events with (un)managed subscriptions
Bad
```ts
import { Component, OnInit } from '@angular/core';
@Component({ selector: 'app-bad-event', template: `<div (click)="handle()">Click</div>` })
export class BadEventComponent implements OnInit {
  ngOnInit(): void {
    // Imagine a custom EventEmitter or addEventListener without cleanup
  }
  handle(): void { /* ... */ }
}
```
Good
```ts
import { Component, OnDestroy } from '@angular/core';
@Component({ selector: 'app-good-event', template: `<div (click)="handle()">Click</div>` })
export class GoodEventComponent implements OnDestroy {
  private subscription?: any; // hypothetical subscription

  ngOnInit(): void {
    // subscribe to something and store
  }

  handle(): void {
    // handle click
  }

  ngOnDestroy(): void {
    // cleanup to avoid memory leaks
    if (this.subscription?.unsubscribe) this.subscription.unsubscribe();
  }
}
```

### Line-by-line explanation
- Bad: demonstrates risk of leaking memory if you subscribe manually without cleanup.
- Good: shows proper lifecycle cleanup to prevent memory leaks.

### Pitfall 3: Overusing direct DOM bindings in templates for logic
Bad
```ts
@Component({
  selector: 'app-bad-template',
  template: `<div [style.width]="width + 'px'"></div>`
})
export class BadTemplateComponent {
  width = 100;
}
```
Good
```ts
@Component({
  selector: 'app-good-template',
  template: `
    <div [style.width]="widthInStyle"></div>
  `
})
export class GoodTemplateComponent {
  width = 100;
  get widthInStyle(): string { return this.width + 'px'; }
}
```

### Line-by-line explanation
- Bad: couples logic (width units) directly in the template via string concatenation.
- Good: encapsulates formatting in a computed property, keeping template simple and testable.

---

## Y. Why This Matters In Real Systems — production context and real usage
- Performance: DOM access patterns influence change detection and render cycles. Favor binding and Renderer2 to minimize layout thrashing.
- SSR and accessibility: Direct DOM access breaks server-side rendering (Angular Universal) and hinders testing. Renderer2 and bindings keep behavior platform-agnostic and testable.
- Maintainability: Declarative bindings (template-driven) are easier to reason about than imperative DOM manipulations sprinkled across components.
- Testability: Components that rely on Angular bindings are easier to unit test with TestBed; DOM mutations should be isolated and deterministic.
- Accessibility: ARIA attributes and semantic bindings improve screen-reader support and keyboard navigation.

---

## Z. Study Questions — 5 recall questions
1) What is the purpose of Renderer2 in Angular, and why is it preferred over direct DOM manipulation?
2) How do you bind a click event in an Angular template, and how do you access the event object in the component?
3) When should you use @HostListener in an Angular component?
4) How can you toggle a CSS class on an element without using direct DOM access?
5) What are some risks of manipulating the DOM directly in an Angular Universal (SSR) environment?

---

## Exercise
Build a small Angular component that demonstrates DOM and event fundamentals in a production-lean way. Follow these parts:

Part A — Component scaffold
- Create a component named TaskListComponent with:
  - An inline template and inline styles.
  - An input field to add a new task and a button to submit.
  - A list rendering of tasks with a click to mark as completed.

Part B — Safe DOM manipulation
- Use Renderer2 to add/remove a “completed” style when a task is clicked (instead of mutating classes directly in the template).
- Ensure accessibility: aria-pressed state on the action button and appropriate roles where applicable.

Part C — Event handling and lifecycle
- Attach a keyup.enter handler on the input to submit when Enter is pressed.
- Use OnInit to initialize a default set of tasks.
- Use OnDestroy to clean up any hypothetical subscriptions (illustrative) if you create them.

Part D — Optional extension
- Implement a simple filter control (All / Active / Completed) using template bindings, without altering DOM directly in the component logic.

Example scaffold (single-file TS with inline template for simplicity):

```ts
import { Component, ElementRef, Renderer2, ViewChild, OnInit, OnDestroy } from '@angular/core';

interface Task {
  id: number;
  text: string;
  done: boolean;
}

@Component({
  selector: 'app-task-list',
  template: `
    <div class="todo-app" role="application" aria-label="Task list app">
      <h2>Task List</h2>
      <div class="input-area">
        <input #taskInput
               (keyup.enter)="addTaskFromInput(taskInput.value); taskInput.value='';"
               placeholder="Add a new task" />
        <button (click)="addTaskFromInput(taskInput.value); taskInput.value='';"
                aria-pressed="false" #addBtn> Add </button>
      </div>

      <ul>
        <li *ngFor="let t of tasks" [attr.data-id]="t.id" role="listitem">
          <span (click)="toggleTask(t)" [class.done]="t.done" #taskItem>{{ t.text }}</span>
        </li>
      </ul>

      <p class="hint">Tip: Click a task to toggle completed state. Use Enter to add quickly.</p>
    </div>
  `,
  styles: [`
    .todo-app { font-family: Arial, sans-serif; max-width: 400px; }
    .input-area { display: flex; gap: 8px; margin-bottom: 12px; }
    input { flex: 1; padding: 8px; }
    button { padding: 8px 12px; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: 6px 0; }
    .done { text-decoration: line-through; color: #999; }
  `]
})
export class TaskListComponent implements OnInit, OnDestroy {
  @ViewChild('taskInput') taskInput!: ElementRef<HTMLInputElement>;
  tasks: Task[] = [];
  private nextId = 1;
  // illustrative subscription field for cleanup
  private dummySubscription?: any;

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    // Initialize with some tasks
    this.tasks = [
      { id: this.nextId++, text: 'Learn Angular events', done: false },
      { id: this.nextId++, text: 'Practice Renderer2', done: false }
    ];

    // Example: imagine subscribing to a service (cleanup in ngOnDestroy)
    // this.dummySubscription = someService.observe().subscribe(...)
  }

  addTaskFromInput(text: string): void {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    this.tasks.push({ id: this.nextId++, text: trimmed, done: false });
  }

  toggleTask(task: Task): void {
    // Safe DOM manipulation via Renderer2 for demonstration (could also mutate data)
    task.done = !task.done;
    // Optional: reflect another DOM change using Renderer2 if you needed to modify a specific element
  }

  ngOnDestroy(): void {
    // Cleanup any subscriptions to avoid leaks
    if (this.dummySubscription?.unsubscribe) {
      this.dummySubscription.unsubscribe();
    }
  }
}
```

Notes for the exercise:
- The template uses Angular bindings for structure and behavior, with a focus on safe DOM manipulation via Renderer2 where applicable.
- The toggleTask method modifies the task state; UI changes are driven by data binding (preferred pattern). If you need to manipulate DOM directly, use Renderer2 in a controlled way.
- Ensure accessibility: buttons have proper roles, and the list is accessible as a list with listitems.

This completes a practical, beginner-friendly, production-aware lesson on JavaScript fundamentals around DOM and events within an Angular context.