# Track: Frontend Engineering — Phase 1: The Foundations — JavaScript Fundamentals (DOM, Events) in Vue

JavaScript fundamentals around the Document Object Model (DOM) and events are foundational for building interactive web applications. In Vue, you’ll often rely on the framework’s reactivity and directives to handle UI changes declaratively, but understanding the underlying DOM APIs and event system is essential for debugging, integrating with third-party libraries, and optimizing real-world experiences. This lesson teaches the core ideas—selecting and manipulating DOM nodes, handling events, and coordinating between Vue’s reactivity and direct DOM interactions—using Vue 3 with the Composition API.

## 1.  The DOM in Vue: Overview and Rendering

The DOM represents the structured document that the browser renders. Vue renders DOM from your template and keeps it in sync with reactive state. Understanding when and how to interact with the DOM directly (via refs) helps you integrate non-Vue libraries or perform low-level tweaks without sacrificing reactivity.

Code example (Vue 3 SFC, Composition API):

```vue
<template>
  <div class="card">
    <h1 ref="titleRef">DOM in Vue</h1>
    <p>This paragraph will be styled via direct DOM access.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const titleRef = ref(null)

onMounted(() => {
  // Access the real DOM node after it's mounted
  if (titleRef.value) {
    titleRef.value.style.color = '#2c7be5'
    titleRef.value.textContent = 'Mounted: DOM is ready'
  }
})
</script>
```

### Line-by-line explanation
- <template> block defines the DOM structure and a DOM node to access via ref.
- titleRef is declared as a Vue ref to hold the DOM node reference.
- onMounted runs after the component is mounted to the DOM, guaranteeing the node exists.
- titleRef.value is the actual DOM element; we set its inline style color to blue and change its text content to indicate mounting.
- The rest of the template remains reactive and declarative; direct DOM changes are isolated to this mounted phase.

## 2.  Accessing DOM Elements with Refs

In Vue, the recommended way to work with actual DOM nodes is via refs. This keeps a clean boundary between Vue’s reactive state and imperative DOM manipulation. refs are assigned in the template and then used in the script to read or mutate the node.

Code example (Vue 3 SFC):

```vue
<template>
  <div>
    <button @click="highlight">Highlight Paragraph</button>
    <p ref="para" class="text">Watch me change color</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const para = ref(null)

function highlight() {
  if (para.value) {
    para.value.style.backgroundColor = 'yellow'
  }
}
</script>
```

### Line-by-line explanation
- A button triggers the highlight function on click; a paragraph is assigned a ref named para.
- para is a Vue ref initially holding null, later bound to the DOM node once mounted.
- highlight checks for a valid DOM node and then directly updates the style property to apply a yellow background.
- The approach keeps DOM manipulation localized to an explicit interaction, avoiding side effects in the template.

## 3.  Event Handling in Vue: Directives and Methods

Vue provides declarative event handling through directives like v-on or the shorthand @. You wire up handlers in script and reference reactive state to reflect changes in the DOM.

Code example (Vue 3 SFC):

```vue
<template>
  <div>
    <input v-model="name" placeholder="Your name" @input="onInput" />
    <button @click="submit">Submit</button>
    <p>You typed: {{ name }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const name = ref('')

function onInput(event) {
  // event is a native InputEvent; you can inspect or transform input here
  console.log('value:', event.target.value)
}

function submit() {
  console.log('Submitted name:', name.value)
}
</script>
```

### Line-by-line explanation
- v-model binds the input’s value to the reactive name state and keeps it in sync.
- The @input directive wires a handler to the native input event; onInput receives the event object and logs the current value.
- The submit function logs the current name when the button is clicked.
- The paragraph displays the reactive name, reflecting user input in real time.

## 4.  Event Modifiers and the Event Object

Vue event modifiers simplify common tasks like preventing default behavior, stopping propagation, or limiting an action to the first occurrence. You can also access the native event object to glean details for custom logic.

Code example (Vue 3 SFC):

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="email" placeholder="Email" />
    <button type="submit">Submit</button>
  </form>

  <div @click="parentClick" style="margin-top: 1rem; padding: 0.5rem; border: 1px solid #ccc;">
    Click me
  </div>

  <button @click.stop="stopPropagation" style="margin-top: 0.5rem;">
    Stop propagation
  </button>

  <p>Last key: {{ lastKey }}</p>
  <input @keyup.enter="handleEnter" placeholder="Press Enter" />
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const lastKey = ref('')

function handleSubmit() {
  console.log('Form submitted with', email.value)
}

function parentClick() {
  console.log('Parent element clicked')
}

function stopPropagation() {
  console.log('This click does not bubble to the parent')
}

function handleEnter(event) {
  lastKey.value = event.key
}
</script>
```

### Line-by-line explanation
- The form uses @submit.prevent to prevent default submission behavior and run handleSubmit.
- An additional div demonstrates click handling with a separate event handler.
- The button uses .stop to stop the click event from bubbling to the parent element.
- handleEnter receives a KeyboardEvent; event.key is stored to lastKey to reflect the key pressed (Enter in this case).
- The reactive lastKey state is shown in the UI to confirm event details.

## 5.  Interacting with Native DOM Events and Cleanup

Sometimes you need to listen to native DOM events outside Vue’s template system (e.g., window, document, or third-party libraries). It’s crucial to clean up those listeners when the component unmounts to avoid leaks.

Code example (Vue 3 SFC):

```vue
<template>
  <div ref="box" class="box">Resize the window to update text</div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const box = ref(null)
let resizeListener = null

function updateBox() {
  if (!box.value) return
  box.value.textContent = `W:${window.innerWidth} H:${window.innerHeight}`
}

onMounted(() => {
  resizeListener = () => updateBox()
  window.addEventListener('resize', resizeListener)
  updateBox()
})

onUnmounted(() => {
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener)
  }
})
</script>

<style scoped>
.box {
  padding: 8px;
  border: 1px solid #ccc;
  display: inline-block;
  margin-top: 0.5rem;
}
</style>
```

### Line-by-line explanation
- A div with a ref acts as a placeholder for potential DOM updates, while we listen to window resize events to update content.
- resizeListener is declared to hold the event handler so we can remove it later.
- updateBox reads window dimensions and writes them into the DOM node’s textContent.
- onMounted registers the resize listener and immediately updates the display.
- onUnmounted ensures the listener is removed when the component is destroyed, preventing memory leaks.

## X. Common Beginner Mistakes

- Bad vs Good: Direct DOM manipulation outside Vue’s reactivity
- Bad
```js
// Bad: manipulating DOM directly without Vue's reactivity
export default {
  mounted() {
    const el = document.querySelector('.title')
    if (el) el.innerText = 'Mounted'
  }
}
```
- Good
```vue
<template><h1 class="title">{{ title }}</h1></template>

<script setup>
import { ref } from 'vue'
const title = ref('Initial')
/* Vue-driven update keeps DOM in sync without manual DOM manipulation */
</script>
```

- Bad vs Good: Forgetting to cleanup non-Vue event listeners
- Bad
```js
export default {
  mounted() {
    window.addEventListener('resize', this.onResize)
  },
  methods: {
    onResize() {
      // do something
    }
  }
}
```
- Good
```js
import { onMounted, onUnmounted } from 'vue'
export default {
  setup() {
    const onResize = () => { /* do something */ }

    onMounted(() => {
      window.addEventListener('resize', onResize)
    })
    onUnmounted(() => {
      window.removeEventListener('resize', onResize)
    })
  }
}
```

- Bad vs Good: Accessing DOM before mount
- Bad
```js
export default {
  mounted() {
    this.$refs.input.focus()
  }
}
```
- Good
```vue
<template><input ref="inputRef" /></template>

<script setup>
import { onMounted, ref } from 'vue'
const inputRef = ref(null)

onMounted(() => {
  inputRef.value?.focus()
})
</script>
```

- Bad vs Good: Over-relying querySelector in Vue components
- Bad
```js
mounted() {
  const el = document.querySelector('#manual')
  el?.classList.add('active')
}
```
- Good
```vue
<template><div ref="autoDiv" :class="{ active: isActive }"></div></template>

<script setup>
import { ref, onMounted } from 'vue'
const autoDiv = ref(null)
const isActive = ref(false)

onMounted(() => {
  isActive.value = true
  // Vue's reactivity handles class updates
})
</script>
```

## Y. Why This Matters In Real Systems

- Reliability: Properly using Vue refs and lifecycle hooks prevents timing bugs (manipulating DOM before it exists) and ensures user interactions reflect in the UI as expected.
- Maintainability: Declarative templates and reactive state reduce the cognitive load when maintaining complex UIs. Direct DOM manipulation should be isolated and well-documented, so future developers understand when and why it’s used.
- Performance: Minimizing unnecessary DOM touches and avoiding global listeners unless necessary helps with rendering performance, especially on low-power devices.
- Interoperability: Real-world apps often integrate third-party libraries that manipulate the DOM. Understanding DOM fundamentals and safe integration patterns (like using refs or lifecycle hooks) reduces risk and debugging time.
- Testing: Unit tests should favor state-driven UI updates over imperative DOM mutations. When imperative actions are necessary, keep them compartmentalized and mockable.

## Z. Study Questions

1. What is the purpose of the ref() API in Vue, and how does it relate to DOM nodes?
2. How does @submit.prevent differ from a plain form submit in Vue templates?
3. When should you use native DOM event listeners (like window resize) in a Vue component, and how do you clean them up?
4. How do event modifiers like .stop and .prevent affect event propagation and default behavior?
5. Why is it generally better to update your UI through reactive state rather than calling innerHTML or directly setting DOM properties?

## Exercise

Part 1: Build a small DOM-events playground component
- Create a Vue 3 SFC that demonstrates:
  - An input field bound with v-model to a name state.
  - A button that, when clicked, appends the name to a list below using an array in state.
  - Each list item should be clickable; clicking logs the event object and marks the item as selected.
  - After adding an item, automatically focus the input field (use a ref and nextTick).
  - A footer area that shows current viewport width and height; update on window resize and clean up on unmount.

Starter template (copy, modify, and complete):

```vue
<template>
  <section class="exercise-playground">
    <div class="input-row">
      <input ref="inputRef" v-model="name" placeholder="Type a name..." />
      <button @click="addItem">Add</button>
    </div>

    <ul class="items">
      <li
        v-for="(item, index) in items"
        :key="index"
        @click="selectItem($event, index)"
        :class="{ selected: selectedIndex === index }"
      >
        {{ item }}
      </li>
    </ul>

    <footer class="viewport">
      Viewport: {{ viewport.width }} x {{ viewport.height }}
    </footer>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'

// State
const name = ref('')
const inputRef = ref(null)
const items = ref([])
const selectedIndex = ref(null)
const viewport = reactive({ width: window.innerWidth, height: window.innerHeight })

// Add item and focus input
function addItem() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  items.value.push(trimmed)
  name.value = ''
  // Focus the input after DOM updates
  nextTick(() => {
    inputRef.value && inputRef.value.focus()
  })
}

// Select item and log event
function selectItem(event, index) {
  console.log('Item clicked:', { event, index, item: items.value[index] })
  selectedIndex.value = index
}

// Update viewport
function updateViewport() {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
})
</script>

<style scoped>
.exercise-playground { padding: 1rem; border: 1px solid #ddd; }
.input-row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.items { list-style: none; padding: 0; margin: 0; }
.items li { padding: 0.25rem 0.5rem; cursor: pointer; }
.items li.selected { background-color: #e6f7ff; }
.viewport { margin-top: 0.75rem; font-family: monospace; color: #555; }
</style>
```

Part 2: Implement and reflect on the exercise
- Run the component within a Vue 3 project (Vue CLI, Vite, or Nuxt) and verify:
  - Typing updates the name state and the list reflects new entries upon pressing Add.
  - Clicking a list item logs the event object and highlights the item.
  - After adding, the input is automatically focused.
  - Resizing the window updates the viewport width/height in real time, and the listener is properly removed when the component unmounts.

Notes for learners
- Compare how the UI updates when you mutate reactive state (items, name) versus when you manually update DOM nodes (avoid this approach in Vue unless bridging to a non-Vue library).
- Pay attention to lifecycle hooks: the DOM elements exist only after mounting, so use onMounted to access refs reliably.
- Practice using event objects to glean details about user interactions and propagate or prevent events as needed.

If you’d like, I can tailor the exercises to a specific Vue project structure (Options API, Composition API with defineComponent, or a Composition API + script setup) or expand the exercise with additional constraints (e.g., keyboard accessibility, accessibility ARIA attributes, or unit tests for the event handlers).