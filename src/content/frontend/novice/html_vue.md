# Semantic HTML5 & Accessibility in Vue — Phase 1: The Foundations

In professional frontend work, building UI with semantic HTML5 and strong accessibility (a11y) is non-negotiable. Semantics help browsers, search engines, and assistive technologies understand structure and meaning, while accessibility ensures all users—regardless of ability or device—can interact with your app. In Vue projects, you combine clean, semantic markup with reactive state and interaction patterns to deliver inclusive, maintainable interfaces.

## 1. Semantic HTML5 Basics for Vue Apps

Semantic HTML5 tags (header, nav, main, section, article, aside, footer, etc.) express document structure and roles without extra ARIA. In Vue, you should still favor these elements over generic divs when the markup conveys meaning. This section demonstrates a small Vue component that uses semantic HTML5 for a simple page layout, plus a skip link for keyboard users.

```vue
<template>
  <a href="#content" class="skip-link">Skip to content</a>

  <header>
    <h1>My Vue App</h1>
    <nav aria-label="Main">
      <ul>
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main id="content" role="main" class="layout">
    <section aria-labelledby="intro-title">
      <h2 id="intro-title">Introduction</h2>
      <p>This section demonstrates semantic HTML5 usage in a Vue template.</p>
    </section>

    <article aria-labelledby="article-title">
      <header>
        <h3 id="article-title">Accessible UI Patterns</h3>
        <time datetime="2026-03-01">March 1, 2026</time>
      </header>
      <p>Using semantic elements like article, section, header, and main helps assistive tech understand the document structure.</p>
    </article>

    <aside aria-label="Related resources">
      <h4>Resources</h4>
      <ul>
        <li><a href="#a11y">ARIA & HTML5</a></li>
        <li><a href="#docs">Docs</a></li>
      </ul>
    </aside>
  </main>

  <footer aria-label="Site footer">
    <p>&copy; 2026</p>
  </footer>
</template>

<script setup>
</script>

<style>
.skip-link { position:absolute; left:-9999px; top:auto; width:1px; height:1px; overflow:hidden; }
.skip-link:focus { left:0; top:0; background:#fff; padding:8px; z-index:100; }
</style>
```

### Line-by-line explanation breaking down each line

- Line: `<a href="#content" class="skip-link">Skip to content</a>` — A skip link to allow keyboard users to jump straight to the main content, improving navigation for screen readers and those who rely on keyboard.
- Line: `<header>` — Semantically groups branding and primary navigation.
- Line: `<nav aria-label="Main">` — Landmark for navigation with an accessible label.
- Lines: `<main id="content" role="main" class="layout">` — Main content container; role="main" reinforces semantics for assistive tech.
- Lines: `<section aria-labelledby="intro-title">` and `<h2 id="intro-title">Introduction</h2>` — Section with a labeled heading for structure.
- Lines: `<article aria-labelledby="article-title">` and `<header>...<time datetime="...">` — Article with a header containing a title and a human-readable time; time element expresses date in a machine-parseable way.
- Line: `<aside aria-label="Related resources">` — Related content placed aside from the main flow; aria-label clarifies purpose.
- Line: `<footer aria-label="Site footer">` — Global site footer landmark.
- Line: `<style> .skip-link { ... } ... </style>` — CSS to visually hide the skip link until focus, then reveal it for accessibility.

## 2. Accessible Forms in Vue

Accessible forms require clear labeling, association between labels and inputs, and meaningful error messaging. In Vue, you can bind state and ARIA attributes to show live validation feedback without sacrificing semantics.

```vue
<template>
  <form @submit.prevent="handleSubmit" novalidate aria-describedby="form-note">
    <div>
      <label for="name">Name</label>
      <input
        id="name"
        v-model="form.name"
        :class="{ 'is-invalid': errors.name }"
        :aria-invalid="!!errors.name"
        aria-describedby="name-error"
      />
      <p id="name-error" v-if="errors.name" class="error" role="alert">{{ errors.name }}</p>
    </div>

    <div>
      <label for="email">Email</label>
      <input
        id="email"
        type="email"
        v-model="form.email"
        :aria-invalid="!!errors.email"
        aria-describedby="email-help email-error"
      />
      <p id="email-help" class="hint" v-if="emailHelp">We will not share your email.</p>
      <p id="email-error" v-if="errors.email" class="error" role="alert">{{ errors.email }}</p>
    </div>

    <div>
      <label for="message">Message</label>
      <textarea
        id="message"
        v-model="form.message"
        :aria-invalid="!!errors.message"
        aria-describedby="message-error"
      ></textarea>
      <p id="message-error" v-if="errors.message" class="error" role="alert">{{ errors.message }}</p>
    </div>

    <button type="submit" :disabled="hasErrors">Send</button>
  </form>
</template>

<script setup>
import { reactive, computed } from 'vue'

const form = reactive({
  name: '',
  email: '',
  message: ''
})

const errors = reactive({ name: null, email: null, message: null })

function validate() {
  errors.name = form.name.trim() ? null : 'Name is required.'
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? null : 'Please enter a valid email.'
  errors.message = form.message.trim().length >= 10 ? null : 'Message must be at least 10 characters.'
}

function handleSubmit() {
  validate()
  if (!errors.name && !errors.email && !errors.message) {
    // simulate submission
    console.log('Submitted', form)
  }
}
const hasErrors = computed(() => errors.name || errors.email || errors.message)
</script>

<style>
.input { display:block; margin-bottom:8px; }
.is-invalid { border-color: red; }
.error { color: red; font-size: 0.875em; }
.hint { font-size: 0.875em; color: #666; }
</style>
```

### Line-by-line explanation breaking down each line

- Line: `<form @submit.prevent="handleSubmit" novalidate aria-describedby="form-note">` — Form with custom submit handler; novalidate disables native browser validation to rely on custom messages; aria-describedby points to a form-level note for context.
- Lines: Each input pair includes a `<label for="...">` and a corresponding input with `id="..."` — Proper label association improves screen-reader navigation.
- Line: `:aria-invalid="!!errors.name"` — Reflects validation state to assistive tech.
- Line: `aria-describedby="name-error"` — Points to the error message so assistive tech can announce it when present.
- Line: `<p id="name-error" v-if="errors.name" class="error" role="alert">{{ errors.name }}</p>` — Live error message; role="alert" ensures screen readers announce changes.
- Lines: Repeats for email and message fields, including optional help text for email.
- Line: `:disabled="hasErrors"` — Disables submit when there are errors.
- Script: Creates reactive form data and error state; `validate()` sets error messages; `handleSubmit()` validates and logs a submission when valid.
- Style: Simple visual cues for invalid fields and error text.

## 3. Keyboard & Focus Management

Keyboard accessibility and focus management improve usability for all users, especially those relying on keyboards or assistive tech. This example shows a simple, accessible modal implemented in Vue that uses a native dialog-like pattern with proper focus handling and ESC-to-close behavior.

```vue
<template>
  <button @click="openModal" ref="openBtn" aria-controls="demo-modal" aria-haspopup="dialog">
    Open modal
  </button>

  <div v-if="show" class="modal-backdrop" @keydown.esc="closeModal" role="presentation" aria-hidden="true">
    <div class="modal" role="dialog" aria-label="Demo modal" tabindex="-1" ref="modal" @click.stop>
      <div class="modal-content" tabindex="0">
        <h2>Modal Title</h2>
        <p>Content here. Press Esc to close.</p>
        <button @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
const show = ref(false)
const openBtn = ref(null)
const modal = ref(null)

function openModal() {
  show.value = true
  nextTick(() => {
    // Focus the inner content to trap initial focus
    modal.value?.querySelector('.modal-content')?.focus()
  })
}
function closeModal() {
  show.value = false
  // Return focus to the button that opened the modal
  openBtn.value?.focus()
}
</script>

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}
.modal {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  min-width: 320px;
  box-shadow: 0 2px 12px rgba(0,0,0,.2);
}
.modal-content {
  outline: none;
}
</style>
```

### Line-by-line explanation breaking down each line

- Line: `<button @click="openModal" ref="openBtn" aria-controls="demo-modal" aria-haspopup="dialog">Open modal</button>` — Trigger for the modal; includes ARIA attributes to indicate a dialog control and control target.
- Line: `<div v-if="show" class="modal-backdrop" @keydown.esc="closeModal" role="presentation" aria-hidden="true">` — Backdrop that captures ESC to close; visually covers the page to emphasize focus on the modal.
- Line: `<div class="modal" role="dialog" aria-label="Demo modal" tabindex="-1" ref="modal" @click.stop>` — The modal container announced as a dialog; tabindex allows programmatic focus.
- Line: `<div class="modal-content" tabindex="0">` — Inner content is focusable; initial focus is placed here to begin a logical reading order.
- Script: `openModal()` sets show to true and uses `nextTick` to move focus inside the modal to the content.
- Script: `closeModal()` hides the modal and returns focus to the trigger button.
- Style: Defines the overlay and modal visuals to clearly separate modal content from the page.

## X. Common Beginner Mistakes

Three or more common pitfalls in semantic HTML5 and accessibility, with bad vs. good code side-by-side.

### Pitfall 1 — Using divs for everything instead of semantic elements

Bad:
```html
<div class="header">
  <div class="title">My App</div>
  <div class="nav">
    <a href="#home">Home</a>
    <a href="#about">About</a>
  </div>
</div>
```

Good:
```html
<header>
  <h1>My App</h1>
  <nav aria-label="Main">
    <ul>
      <li><a href="#home">Home</a></li>
      <li><a href="#about">About</a></li>
    </ul>
  </nav>
</header>
```

### Line-by-line explanation

- Bad snippet uses generic divs with no semantic roles.
- Good snippet uses <header> and <nav> landmarks, improving screen reader navigation and document structure.

### Pitfall 2 — Labels not associated with inputs

Bad:
```html
<label>Name</label>
<input />
```

Good:
```html
<label for="name">Name</label>
<input id="name" />
```

### Line-by-line explanation

- Bad: label has no association with input; screen readers don’t know which input the label describes.
- Good: label uses for/id linkage, enabling correct association and larger clickable target for users.

### Pitfall 3 — Images without alt text or decorative images with empty alt

Bad:
```html
<img src="logo.png" />
```

Good:
```html
<img src="logo.png" alt="Company Logo" />
```

### Line-by-line explanation

- Bad: missing alt means screen readers may skip or misinterpret the image.
- Good: descriptive alt provides context; if decorative, use alt="".

### Pitfall 4 — Insufficient skip links and keyboard traps

Bad:
```html
<a href="/home" class="nav-link">Home</a>
```

Good:
```html
<a href="#content" class="skip-link">Skip to content</a>
```
and ensure all interactive elements are reachable via keyboard with visible focus states.

### Line-by-line explanation

- Bad: helps screen readers but not keyboard users jumping into sections.
- Good: provides a skip link to jump to primary content; add visible focus styles for accessibility.

## Y. Why This Matters In Real Systems

- Semantics drive accessibility; search engines and screen readers leverage landmarks and headings to summarize pages, improving SEO and discoverability.
- Accessibility reduces barriers, expands user reach, and aligns with legal and organizational guidelines (e.g., WCAG).
- In production, semantic markup couples with assistive tech testing, automated checks (linting for semantic elements, ARIA usage), and manual QA focused on keyboard navigation and screen reader experience.
- Real systems implement consistent landmark scaffolding across pages, reusable components that respect semantic roles, and progressive enhancement to ensure basic HTML remains functional without JS.
- Focus management patterns (modal dialogs, dropdowns) prevent users from becoming trapped and ensure a predictable reading order.

## Z. Study Questions

1. What is the purpose of a skip link, and where should it appear in the DOM?
2. Why should forms label inputs with for and id attributes, and how do ARIA attributes help when native validation is insufficient?
3. How does the time element improve accessibility for dates and times?
4. What is a landmark, and which HTML5 elements serve as landmarks in semantic markup?
5. In a modal, why should focus be returned to the opener after closing, and how can you implement that in Vue?

## Exercise

Create a small Vue 3 Single-File Component (SFC) that demonstrates a production-ready, accessible page using semantic HTML5 landmarks. Your component should include:

- A skip link that focuses the main content.
- A semantic header with a navigation region (semantic nav).
- A main region containing at least two sections:
  - A hero/intro section with a readable heading and a subheading.
  - An article with a figure and figcaption to illustrate content with media.
- An aside containing related resources.
- A footer.
- An accessible form section inside the main area using:
  - Labels properly associated with inputs.
  - ARIA attributes for validation states and descriptions.
  - A live region for error or success messages (aria-live="polite" or role="alert" as appropriate).
- A keyboard-accessible modal/dialog that opens from the page and returns focus to the opener on close.
- All images include meaningful alt text (or decorative with empty alt if appropriate).
- Consider adding a skip link and focus-visible styling for tight accessibility.

Deliverables (as code snippets you would implement in your project):
- The main Vue SFC implementing the above features.
- A brief justification of how each feature supports accessibility and semantics.
- Brief notes on testing strategies you would use in real systems (e.g., keyboard navigation checks, screen reader testing, WCAG alignment).

If you want, I can scaffold a ready-to-run Vue 3 SFC with all sections wired up and runnable in a standard Vue CLI / Vite environment.