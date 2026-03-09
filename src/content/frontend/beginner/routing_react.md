# Track: Frontend Engineering

Compelling frontend routing is what makes a modern app feel fast, snappy, and scalable. Client-side routing lets you map URLs to views without full-page reloads, enables deep linking, and supports dynamic data loading and nested layouts. In React, React Router is the de facto standard for implementing this behavior in a predictable, composable way. This lesson walks you through the core concepts, common patterns, and practical pitfalls you’ll encounter when building production-grade SPAs.

## 1. Getting Started with React Router (BrowserRouter, Routes, Route)

This section introduces the minimal setup to render multiple views in a single-page application using React Router v6+. We’ll build a tiny app with Home, About, and a dynamic User detail route.

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h2>Home</h2>
      <p>Welcome to the app.</p>
      <nav>
        <Link to="/about">About</Link> |{' '}
        <Link to="/users/42">User 42</Link>
      </nav>
    </div>
  );
}

function About() {
  return (
    <div>
      <h2>About</h2>
      <p>This is the about page.</p>
    </div>
  );
}

function UserDetail() {
  const { id } = useParams();
  return (
    <div>
      <h2>User {id}</h2>
      <p>Details for user {id}.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Line-by-line explanation
- Import React and necessary components from react-router-dom.
- Define Home, About, and UserDetail components. UserDetail uses useParams to extract the dynamic id from the URL.
- App wraps the app in BrowserRouter, then defines Routes with three Route entries:
  - "/" renders Home
  - "/about" renders About
  - "/users/:id" renders UserDetail with a dynamic id
- The app is exported as the default component.

---

## 2. Link, NavLink, and Active States

Understanding Link versus NavLink helps you build intuitive navigation with visual cues for the current route.

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h2>Home</h2>
      <p>Welcome to the app.</p>
    </div>
  );
}

function About() {
  return (
    <div>
      <h2>About</h2>
      <p>About page with active link highlighting.</p>
    </div>
  );
}

function UserDetail() {
  // simple example; no useParams here to keep the demo focused
  return (
    <div>
      <h2>User</h2>
      <p>Public user page.</p>
    </div>
  );
}

function NavBar() {
  return (
    <nav>
      <NavLink to="/" end>Home</NavLink> {' '}
      <NavLink to="/about">About</NavLink> {' '}
      <NavLink to="/users/1">User 1</NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Line-by-line explanation
- NavBar uses NavLink instead of Link to enable active styling.
- The end prop on the Home NavLink ensures exact matching for the root path, avoiding a partial-active state when on deeper routes.
- The rest of the routes render as in the basic example.
- Active styling can be customized with a function passed to className or style to reflect isActive.

Notes:
- NavLink receives a render-prop-like API via className or style callbacks. This is how you implement active state visuals without manual state tracking.

---

## 3. Nested Routes and Layouts

Nested routes allow you to share a common layout (header, footer, sidebar) across multiple child routes. Use Outlet to render the nested route’s element.

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      <header>
        <h1>App Layout</h1>
        <nav>
          <Link to="/">Home</Link> {' '}
          <Link to="/dashboard">Dashboard</Link> {' '}
          <Link to="/dashboard/stats">Stats</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>© 2026</footer>
    </div>
  );
}

function Home() {
  return <div><h2>Home</h2><p>Welcome home.</p></div>;
}
function Dashboard() {
  return (
    <section>
      <h2>Dashboard</h2>
      <Outlet />
    </section>
  );
}
function DashboardOverview() {
  return <div>Overview content</div>;
}
function DashboardStats() {
  return <div>Stats content</div>;
}
function DashboardSettings() {
  return <div>Settings content</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />}>
            <Route index element={<DashboardOverview />} />
            <Route path="stats" element={<DashboardStats />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### Line-by-line explanation
- Layout defines a shared header and footer and uses <Outlet /> to render nested route content.
- The route tree nests Dashboard under the root path, and further nests DashboardOverview, DashboardStats, and DashboardSettings under /dashboard.
- In React Router v6, the index route (Route index) renders when the parent path exactly matches, while nested paths render their respective components into the Outlet.

Notes:
- This pattern enables consistent chrome (header, nav, etc.) while swapping only the content area for child routes.
- To access the child route, visit /dashboard, /dashboard/stats, or /dashboard/settings.

---

## 4. Programmatic Navigation and Redirects

Sometimes you need to navigate in response to events (form submission, authentication, etc.). useNavigate enables programmatic navigation. Navigate can perform declarative redirects.

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  const login = () => {
    // pretend authentication
    window.localStorage.setItem('token', 'fake-token');
    navigate('/dashboard', { replace: true });
  };

  return (
    <div>
      <h2>Login</h2>
      <button onClick={login}>Log in</button>
    </div>
  );
}

function Dashboard() {
  return <div><h2>Dashboard</h2><p>Protected content.</p></div>;
}

function NotFound() {
  return <div>404: Page not found</div>;
}

export default function App() {
  const isAuth = Boolean(window.localStorage.getItem('token'));

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            isAuth ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Line-by-line explanation
- useNavigate returns a function that lets you imperatively navigate to another route.
- In LoginPage, login stores a token and navigates to /dashboard, replacing history to avoid back navigation to the login page.
- The Dashboard route uses a simple isAuth check to redirect to /login with Navigate when unauthenticated.
- A catch-all route ("*") renders a NotFound component for any unknown path.

Notes:
- For real apps, move auth state into a context/provider to avoid direct global checks and to support multiple components reacting to auth changes.

---

## 5. Route Protection, Data Loading, and Advanced Patterns

Production apps often combine authentication, route guards, and data loading. Here we showcase a compact pattern using route guards and a simple data loader example (React Router v6.4+ data APIs).

```jsx
import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  Link,
  Outlet,
  useLoaderData,
  Navigate
} from 'react-router-dom';

// Mock auth
let isAuthenticated = false;

function Layout() {
  return (
    <div>
      <header><Link to="/">Home</Link> | <Link to="/dashboard">Dashboard</Link></header>
      <main><Outlet /></main>
    </div>
  );
}

function Home() {
  return <div><h2>Home</h2></div>;
}

function Dashboard() {
  return (
    <div>
      <h2>Dashboard</h2>
      <Outlet />
    </div>
  );
}

function Overview() {
  return <div>Overview content</div>;
}

async function userLoader({ params }) {
  // Simulated fetch; in real apps, fetch from API
  // const res = await fetch(`/api/users/${params.id}`);
  // return res.json();
  return { id: params.id, name: 'User ' + params.id };
}

function UserDetail() {
  const user = useLoaderData();
  return (
    <div>
      <h3>User {user.id}</h3>
      <p>Name: {user.name}</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  // In a real app, read from a context/provider
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Login() {
  return <div><h2>Login Page</h2></div>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Overview /> },
          {
            path: 'users/:id',
            element: <UserDetail />,
            loader: userLoader
          }
        ]
      }
    ]
  },
  { path: '/login', element: <Login /> }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

### Line-by-line explanation
- This example demonstrates a nested route setup with a protected route and a data loader.
- ProtectedRoute component gates access to dashboard children; if not authenticated, it redirects to /login using Navigate.
- userLoader simulates a data fetch and returns user data; UserDetail uses useLoaderData to access it.
- The router defines a root Layout with nested dashboard routes and a catch-all login route.

Notes:
- React Router v6.4+ data APIs (loader, useLoaderData) enable data-aware routes, reducing boilerplate data fetching in components and facilitating server-side rendering compatibility.
- In a real system, auth state would be managed via context/providers and persisted in a secure manner.

---

## X. Common Beginner Mistakes

Here are real pitfalls with bad vs good code. The bad examples are common, and the good examples fix them.

- Pitfall 1: Not wrapping the app in a Router
  - Bad:
  ```jsx
  // App.jsx
  import { Routes, Route } from 'react-router-dom';
  function App() {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    );
  }
  ```
  - Good:
  ```jsx
  // App.jsx
  import { BrowserRouter, Routes, Route } from 'react-router-dom';
  function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    );
  }
  ```

- Pitfall 2: Using the v5 API prop names in v6
  - Bad:
  ```jsx
  <Route path="/about" component={About} />
  ```
  - Good:
  ```jsx
  <Route path="/about" element={<About />} />
  ```

- Pitfall 3: Not using the new “element” prop and forgetting to render children routes
  - Bad:
  ```jsx
  <Route path="/dashboard">
    <Dashboard />
  </Route>
  ```
  - Good:
  ```jsx
  <Route path="/dashboard" element={<Dashboard />}>
    <Route index element={<Overview />} />
  </Route>
  ```

- Pitfall 4: Missing 404 route
  - Bad:
  ```jsx
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
  </Routes>
  ```
  - Good:
  ```jsx
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
  ```

- Pitfall 5: Not using a Layout/Outlet for shared chrome
  - Bad:
  ```jsx
  function App() {
    return (
      <>
        <Header />
        <Home />
      </>
    );
  }
  ```
  - Good:
  ```jsx
  function Layout() {
    return (
      <>
        <Header />
        <Outlet />
        <Footer />
      </>
    );
  }
  // Then nest Home under Layout with Routes and Outlet
  ```

---

## Y. Why This Matters In Real Systems

- Deep linking and UX: Client-side routing lets users bookmark and share direct URLs to specific app views, improving UX and onboarding.
- Performance and code-splitting: Route-based code splitting (React.lazy, Suspense) reduces initial payloads and speeds up perceived loading times.
- Layout consistency: Nested routes with a shared Layout enable uniform chrome (navigation, header, footer) across many views without duplicating code.
- Data loading patterns: Route loaders and useLoaderData (v6.4+) encourage co-locating data dependencies with routes, simplifying data management and enabling better SSR support.
- Accessibility: Proper semantic structure and predictable navigation (NavLink active states, keyboard focus, and focus management on navigation) are essential for accessible apps.
- Real-world constraints: SEO for SPAs is limited; if SEO is critical, consider SSR (e.g., Next.js) or prerendering to ensure crawlers see meaningful content. Client-side routing remains essential for internal navigation and user experience, even in hybrid setups.

---

## Z. Study Questions

1) What is the difference between Link and NavLink in React Router, and when would you prefer NavLink?

2) How does the Outlet component work in a nested route layout, and why is it important for shared chrome?

3) Why is it important to wrap your app in BrowserRouter at the top level, and what common mistakes occur if you don’t?

4) How would you implement a protected route that redirects unauthenticated users to a login page?

5) What are the benefits of using route loaders (data APIs) in React Router v6.4+ compared to fetching data inside components?

---

## Exercise

Complete the following multi-part coding challenge to build a small, production-like SPA using React Router.

Part A — Scaffold a simple SPA with Home, About, and Users
- Create a React app structure with the following routes:
  - / -> Home component
  - /about -> About component
  - /users/:id -> UserDetail component (reads id from URL)
- Include a simple navigation bar with Link components at the top.

Part B — Add a shared layout with nested routes
- Create a Layout component with a header and a content area.
- Wrap Home and the user routes under this Layout using nested routes.
- Use Outlet to render child routes.

Part C — Implement active navigation styling
- Replace the simple Link components in the navigation with NavLink.
- Apply an “active” class when a link is active and demonstrate a simple CSS style change.

Part D — Implement a protected dashboard route
- Add a /dashboard route that is protected.
- Create a fake auth flag (boolean) to simulate logged-in state.
- If not authenticated, redirect to /login. If authenticated, show a Dashboard component with placeholder content.
- Add a /login route with a button to “log in” (set the auth flag to true and navigate to /dashboard).

Part E — Add a 404 Not Found page
- Implement a catch-all route that renders a NotFound component for any unknown path.

Part F — Optional: Data loading with a loader
- If you’re using React Router v6.4+, implement a loader for /users/:id that returns mock user data (e.g., id and name).
- In the UserDetail component, read the loaded data via useLoaderData and display the user’s name.

Deliverables:
- A minimal, working codebase (or clearly organized code blocks) showing:
  - Router setup with BrowserRouter, Routes, Route, and nested layouts
  - NavBar using NavLink with active styling
  - Protected route logic with redirect
  - 404 catch-all route
  - Optional loader-based data for /users/:id
- Brief justification for the design choices (layout, nested routes, and data loading pattern) and how they map to real-world app needs.

Note: You can present your solution as a single-file React app or as modular files (App.jsx, Layout.jsx, components/*.jsx) with clear imports. The focus is on demonstrating correct React Router usage, clean structure, and the patterns discussed in this lesson.