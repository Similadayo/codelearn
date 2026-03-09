# Frontend Engineering — Phase 2: Modern UI Frameworks — Client-side Routing with Vue Router

Client-side routing is how a single-page application (SPA) navigates between "pages" without reloading the entire page. In Vue, Vue Router provides a powerful, flexible, and type-safe way to map URLs to components, manage nested layouts, pass data via route parameters, and implement authentication guards. Mastery of client-side routing is essential for building scalable, maintainable, and responsive apps where users expect fast, fluid navigation and deep linking.

---

## 1. Setting Up Vue Router in a Vue 3 App

In this section, you’ll scaffold a minimal Vue 3 application with Vue Router, defining the core routes and a simple navigation shell. You’ll learn how to wire up the router to the Vue app, declare basic routes, and render the matched component via router-view.

Code blocks:
### main.js
```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
```

### router/index.js
```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: About },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

### App.vue
```vue
<!-- App.vue -->
<template>
  <nav>
    <router-link to="/">Home</router-link>
    <router-link to="/about">About</router-link>
  </nav>
  <router-view />
</template>

<script setup>
// no script logic needed for a simple shell
</script>
```

### views/Home.vue
```vue
<!-- views/Home.vue -->
<template>
  <section>
    <h1>Home</h1>
    <p>Welcome to the Vue Router basics lesson.</p>
  </section>
</template>
```

### views/About.vue
```vue
<!-- views/About.vue -->
<template>
  <section>
    <h1>About</h1>
    <p>This page demonstrates the basics of Vue Router configuration.</p>
  </section>
</template>
```

### Line-by-line explanation
- main.js: Creates a Vue app, imports the router, and mounts the app to the DOM element with id "app". This wires the router into the app so it can manage navigation.
- router/index.js: Imports createRouter and createWebHistory to set up a history-based router. Routes array maps paths to components. The router instance is exported for use by the app.
- App.vue: Defines a simple navigation bar using <router-link> for client-side navigation and a <router-view> to render the matched route component.
- Home.vue / About.vue: Basic page components that will render when their routes are active.

---

## 2. Defining Routes and Navigating with <router-link> and <router-view>

In this section, you’ll build out a clear navigation structure and confirm how Vue Router renders the active route via <router-view>. You’ll see how to use <router-link> for declarative navigation and how to slot in nested views later.

Code blocks:
### router/index.js (enhanced basic routes)
```js
// router/index.js (enhanced)
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'
import User from '@/views/User.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: About },
  // Named route for convenience in navigation
  { path: '/users/:id', name: 'User', component: User, props: true },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

### views/User.vue
```vue
<!-- views/User.vue -->
<template>
  <section>
    <h2>User Details</h2>
    <p>User ID: {{ id }}</p>
  </section>
</template>

<script setup>
import { defineProps } from 'vue'
const props = defineProps({ id: String })
// id is available as a prop due to props: true in the route
</script>
```

### App.vue (navigation shell using named route)
```vue
<!-- App.vue (enhanced) -->
<template>
  <nav>
    <router-link to="/">Home</router-link>
    <router-link to="/about">About</router-link>
    <router-link :to="{ name: 'User', params: { id: 42 } }">User 42</router-link>
  </nav>
  <router-view />
</template>

<script setup>
// no script logic required
</script>
```

### Line-by-line explanation
- router/index.js: Adds a dynamic route '/users/:id' with a named route 'User' and enables props so the id param is passed as a prop to the User component.
- User.vue: Declares a prop id (string). This component will render the user id passed via the route param.
- App.vue: Adds a link to navigate to a specific user by using a named route and passing the id param. router-view renders the matched route component.
- The combination enables clean, declarative navigation and dynamic rendering of data-bound routes without full page reloads.

---

## 3. Nested Routes and Dynamic Segments

This section introduces nested routes (shared layouts) and dynamic segments (params). You’ll learn how to compose layouts around sub-pages and how child routes render within a parent route.

Code blocks:
### router/index.js (nested routes with dynamic segment)
```js
// router/index.js (nested + dynamic)
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import UsersLayout from '@/views/UsersLayout.vue'
import UserProfile from '@/views/UserProfile.vue'
import UserPosts from '@/views/UserPosts.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  {
    path: '/users/:id',
    component: UsersLayout,
    props: true,
    children: [
      { path: '', name: 'UserProfile', component: UserProfile },
      { path: 'posts', name: 'UserPosts', component: UserPosts }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

### views/UsersLayout.vue
```vue
<!-- views/UsersLayout.vue -->
<template>
  <section>
    <h2>User: {{ userId }}</h2>
    <nav>
      <router-link :to="{ name: 'UserProfile', params: { id: userId } }">Profile</router-link>
      <router-link :to="{ name: 'UserPosts', params: { id: userId } }">Posts</router-link>
    </nav>
    <!-- Nested route renderer for child routes -->
    <router-view />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const userId = computed(() => route.params.id)
</script>
```

### views/UserProfile.vue
```vue
<!-- views/UserProfile.vue -->
<template>
  <div>
    <h3>Profile Page</h3>
    <p>Display public profile info for user {{ userId }} here.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const userId = computed(() => route.params.id)
</script>
```

### views/UserPosts.vue
```vue
<!-- views/UserPosts.vue -->
<template>
  <div>
    <h3>Posts</h3>
    <p>List posts authored by user {{ userId }} here.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const userId = computed(() => route.params.id)
</script>
```

### Line-by-line explanation
- routes: Defines a dynamic segment '/users/:id' with a parent layout (UsersLayout) and two child routes: UserProfile and UserPosts. The parent uses props: true to expose the route param to the component, and children render within the parent via <router-view>.
- UsersLayout.vue: Reads the dynamic id from the route, displays a header, and provides navigation to child routes using the same id. The nested <router-view> renders the current child route.
- UserProfile.vue / UserPosts.vue: Each reads the same id from the route (via useRoute) to render user-specific content. Props are not strictly required here because child routes can directly access route params; the setup demonstrates a consistent per-user UI.
- Understanding: Nested routes allow you to compose common layouts (e.g., user chrome, sidebars) while swapping inner content, and dynamic segments enable per-entity rendering (users, products, etc.) without creating many top-level routes.

---

## 4. Lazy-loading Routes and Code-splitting

Code-splitting improves initial load performance by loading route components only when the route is visited. This section shows how to configure lazy-loaded components with dynamic imports for routes.

Code blocks:
### router/index.js (lazy-loaded routes)
```js
// router/index.js (lazy-loaded)
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue') // lazy-loaded
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue') // lazy-loaded
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue') // lazy-loaded
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

### views/Dashboard.vue
```vue
<!-- views/Dashboard.vue -->
<template>
  <section>
    <h2>Dashboard</h2>
    <p>Protected and heavy UI loaded on demand.</p>
  </section>
</template>
```

### Line-by-line explanation
- router/index.js: Each route uses a dynamic import (component: () => import(...)). Vue Router will split these into separate chunks that are loaded only when the route is navigated to, improving initial payload and enabling faster first render.
- Dashboard.vue: A simple view used to demonstrate a lazily-loaded route. When the user navigates to /dashboard, the corresponding chunk is loaded and rendered.
- Benefit: In large apps, code-splitting reduces the amount of JavaScript the browser must parse on initial load, speeding up startup and improving perceived performance.

---

## 5. Navigation Guards and Basic Auth

Real-world apps require access control for certain routes. This section demonstrates a simple route guard that prevents access to protected routes until a user is "logged in" (mocked).

Code blocks:
### router/index.js (guards)
```js
// router/index.js (route guards)
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Dashboard from '@/views/Dashboard.vue'

let isLoggedIn = false // mock authentication state

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// navigation guard
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
```

### views/Login.vue
```vue
<!-- views/Login.vue -->
<template>
  <section>
    <h2>Login</h2>
    <button @click="login">Click to Mock Login</button>
  </section>
</template>

<script setup>
const login = () => {
  // In a real app, you'd set auth state here and refresh guards
  // This is a placeholder to illustrate the flow
  console.log('Mock login triggered')
}
</script>
```

### Line-by-line explanation
- router/index.js: Defines a protected route '/dashboard' with meta: { requiresAuth: true }. A simple mock isLoggedIn flag determines access. The global navigation guard (beforeEach) checks the target route's requiresAuth flag and redirects to /login if the user isn’t authenticated.
- Login.vue: A minimal login view that simulates an authentication action. In a real app, you’d hook this into a central auth store (e.g., Vuex or Pinia) and refresh guards accordingly.
- Guard logic: Centralizes access control in one place, preventing unauthorized users from navigating to sensitive routes and improving UX by providing predictable redirects.

---

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side, plus quick fixes.

### 1) Not Rendering a Router Outlet

Bad:
```vue
<!-- Bad: no router-view, nothing renders for routes -->
<template>
  <nav>
    <router-link to="/">Home</router-link>
    <router-link to="/about">About</router-link>
  </nav>
</template>
```

Good:
```vue
<!-- Good: includes router-view to render matched components -->
<template>
  <nav>
    <router-link to="/">Home</router-link>
    <router-link to="/about">About</router-link>
  </nav>
  <router-view />
</template>
```

### 2) Using Regular Anchors for In-App Navigation

Bad:
```vue
<template>
  <a href="/about">About</a> <!-- full page reload -->
</template>
```

Good:
```vue
<template>
  <router-link to="/about">About</router-link> <!-- SPA navigation -->
</template>
```

### 3) Not Using Route Params Correctly (or Props)

Bad:
```js
// router/index.js
{ path: '/users/:id', component: User }
```

```vue
<!-- views/User.vue -->
<template><div>User {{ $route.params.id }}</div></template>
```

Good:
```js
// router/index.js
{ path: '/users/:id', component: User, props: true }
```

```vue
<!-- views/User.vue -->
<template><div>User {{ id }}</div></template>

<script setup>
defineProps({ id: String })
</script>
```

### 4) Missing a Catch-All 404 Route

Bad:
```js
const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: About }
  // no 404 route
]
```

Good:
```js
const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: About },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound }
]
```

### 5) Not Lazy-loading Heavy Routes

Bad:
```js
const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard }
]
```

Good:
```js
const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/Home.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') }
]
```

### Line-by-line explanation
- For each pair, the “Bad” example demonstrates the fundamental misstep (e.g., not rendering router-view, using standard anchors, failing to pass route params as props, missing 404 route, or preloading heavy routes).
- The “Good” example demonstrates the correct pattern that aligns with Vue Router best practices.
- Each code change directly reduces common pitfalls: proper outlet usage, SPA navigation, explicit prop handling, robust routing coverage, and performance-oriented code-splitting.

---

## Y. Why This Matters In Real Systems

- User Experience (UX): Client-side routing enables instantaneous navigation without full page reloads, delivering a feel like a native app.
- Deep Linking: Users can share and bookmark URLs to specific views or entities (e.g., /users/123/posts), important for referrals, analytics, and user workflows.
- Maintainability and Scale: A well-structured router with nested routes, lazy-loaded components, and guards scales with teams and product features.
- Performance: Code-splitting via lazy-loading reduces initial payloads, speeding up first paint and improving Time-to-Interactive.
- Security and UX: Route guards enforce access control and reduce exposure to sensitive UI by gating routes before navigation completes.
- Real-world constraints: SPA routing often coexists with server routing. You typically configure the server to fallback to index.html for unknown routes, enabling Vue Router to handle the path client-side.

Notes:
- SEO: Pure SPA routes are not easily crawlable by default. For SEO-critical pages, consider server-side rendering solutions (e.g., Nuxt 3 or pre-rendering) or dynamic rendering strategies.
- Analytics: Track route changes with router.afterEach or on route changes to populate analytics dashboards.

---

## Z. Study Questions

1) What is the role of <router-view> in a Vue application?

2) How do you define a dynamic route parameter, and how can you access it inside a component?

3) What is route guarding and how can you implement a simple guard to protect a route?

4) Explain the benefits of route-level code-splitting and how it is achieved in Vue Router.

5) How would you implement a nested route to share a common layout for a group of related pages?

---

## Exercise

Goal: Build a small Vue 3 SPA with Vue Router that demonstrates basic routing, nested routes, lazy-loading, route params, and a simple authentication guard.

Part A — Project Setup (assume using Vite or Vue CLI)
- Create a new Vue 3 project.
- Install and configure Vue Router (Vue Router 4).
- Ensure your index.html has a root element matching your main mounting point.

Part B — Core Pages and Routing
- Create a Home page ("/") and an About page ("/about").
- Create a dynamic user route "/users/:id" with a UserLayout parent that renders a header and a <router-view/> for child routes.
- Add two child routes under "/users/:id": 
  - "" (default) -> UserProfile.vue, shows "Profile for user {id}"
  - "posts" -> UserPosts.vue, shows "Posts by user {id}"
- Use a single-page navigation bar with <router-link> to Home, About, and an example user (e.g., id: 7).

Part C — Lazy Loading
- Refactor the routes so that Home, About, UserProfile, and UserPosts are lazy-loaded with dynamic imports.

Part D — Route Guards
- Add a simple login page at "/login".
- Protect the "/dashboard" route with a route guard using meta.requiresAuth and a mock isLoggedIn flag.
- Implement a basic login action on the Login page that toggles the mock auth state and redirects to the previously requested destination after login.

Part E — Extra: 404 and Accessibility
- Add a catch-all 404 NotFound component for unknown routes.
- Ensure all interactive elements are accessible (keyboard navigable, semantic elements, and aria-labels where appropriate).

Deliverables:
- A short README that explains how to run the app, what features are demonstrated, and how to test the guard and lazy-loading paths.
- A brief reflection on how this routing approach would scale to a larger app and where to apply more advanced techniques (e.g., nested layouts, per-route guards, or using state management for auth).

Hints:
- Use script setup syntax for new Vue components to keep code concise.
- Prefer named routes for programmatic navigation and to avoid hard-coding paths.
- Leverage Vue Router’s route props for clean parameter handling in components.

End of lesson.