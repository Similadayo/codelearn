# Track: Frontend Engineering | Module: Phase 2 — Modern UI Frameworks | Topic: Client-side Routing (React Router) in TypeScript

Client-side routing is essential for modern SPAs. It enables fast, fluid navigation without full page reloads, supports nested layouts, dynamic parameters, and protected routes. In this lesson, you’ll learn how to design and implement a type-safe, scalable routing layer using React Router with TypeScript. You’ll cover basic routes, route objects, nested layouts, protected routes, data loading, and real-world considerations for production systems.

## 1. Getting Started: Basic Routing in TypeScript

This section introduces the simplest way to wire up React Router in a TypeScript React app: BrowserRouter, Routes, Route, and Link. It establishes the basic navigation graph and demonstrates type-safe components.

```tsx
// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => (
  <BrowserRouter>
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/dashboard">Dashboard</Link>
    </nav>

    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </BrowserRouter>
);

export default App;
```

```tsx
// pages/Home.tsx
import React from 'react';

const Home: React.FC = () => (
  <section>
    <h1>Home</h1>
    <p>Welcome to the app. Use the navigation bar to explore routes.</p>
  </section>
);

export default Home;
```

```tsx
// pages/About.tsx
import React from 'react';

const About: React.FC = () => (
  <section>
    <h1>About</h1>
    <p>This page demonstrates basic client-side routing with React Router.</p>
  </section>
);

export default About;
```

```tsx
// pages/Dashboard.tsx
import React from 'react';
import { Link, Routes, Route, Outlet } from 'react-router-dom';
import Settings from './Settings';

const Dashboard: React.FC = () => (
  <section>
    <h1>Dashboard</h1>
    <nav style={{ display: 'flex', gap: '1rem' }}>
      <Link to="settings">Settings</Link>
    </nav>
    <Outlet />
    <Routes>
      <Route path="settings" element={<Settings />} />
    </Routes>
  </section>
);

export default Dashboard;
```

```tsx
// pages/Settings.tsx
import React from 'react';

const Settings: React.FC = () => (
  <div>
    <h2>Settings</h2>
    <p>Configure your preferences here.</p>
  </div>
);

export default Settings;
```

### Line-by-line explanation
1. Import React and the essential routing components from react-router-dom.
2. BrowserRouter wraps the entire app to enable client-side routing.
3. The <nav> block uses <Link> instead of <a> to avoid full page reloads.
4. <Routes> defines a set of Route elements that map paths to UI components.
5. Each <Route> pairs a path with an element to render.
6. Dashboard uses nested routing via an <Outlet> to render child routes (like Settings).
7. Child route (Settings) is defined relative to the parent path.

## 2. Route Objects and Type Safety in TypeScript

React Router v6 supports a route configuration object API (createBrowserRouter) in addition to JSX-based routes. This section shows how to define routes declaratively with TS types, enabling easier composition, dynamic loading, and better type checking.

```tsx
// router.ts
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import Home from './pages/Home';
import About from './pages/About';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      {
        path: 'dashboard',
        element: <Dashboard />,
        children: [
          { path: 'settings', element: <Settings /> }
        ],
      },
    ],
  },
]);
```

```tsx
// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './styles.css';

const root = document.getElementById('root');
createRoot(root!).render(<RouterProvider router={router} />);
```

```tsx
// layouts/RootLayout.tsx
import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const RootLayout: React.FC = () => (
  <div>
    <header style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <Link to="/">Brand</Link>
      <nav style={{ marginTop: '0.5rem' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
        <Link to="/about" style={{ marginRight: '1rem' }}>About</Link>
        <Link to="/dashboard">Dashboard</Link>
      </nav>
    </header>
    <main style={{ padding: '1rem' }}>
      <Outlet />
    </main>
  </div>
);

export default RootLayout;
```

### Line-by-line explanation
1. Import createBrowserRouter and RouterProvider for the data routing API.
2. Define a route tree with a root layout and nested children.
3. The root object sets path '/' and a root layout element.
4. children contains routes for Home (index), About, and a nested Dashboard with its own child Settings.
5. RouterProvider renders the configured router.
6. RootLayout uses <Outlet /> to render nested routes within the layout.
7. Links provide navigation in the layout.

## 3. Navigation Helpers: Link, Navigate, and Programmatic Navigation

This section demonstrates user-initiated navigation via Link, conditional redirects with Navigate, and programmatic navigation using useNavigate for imperative routing.

```tsx
// components/Navigation.tsx
import React from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';

const Navigation: React.FC = () => {
  const navigate = useNavigate();

  const goToDashboard = () => navigate('/dashboard', { replace: false });

  // Optional conditional redirect
  const isLoggedIn = true; // imagine this comes from auth state
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <nav style={{ display: 'flex', gap: '1rem' }}>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <button onClick={goToDashboard}>Dashboard</button>
    </nav>
  );
};

export default Navigation;
```

### Line-by-line explanation
1. Import Link for declarative navigation and useNavigate for imperative navigation.
2. useNavigate returns a function to programmatically change routes.
3. goToDashboard calls navigate with a target path and optional navigation options.
4. Conditional redirect example using Navigate to perform a redirect in JSX based on auth state.
5. The component renders a simple navigation UI with a mix of Link and a button trigger.

## 4. Nested Layouts and Outlet: Building Shared UI

Nested routes enable shared chrome (headers, sidebars) while rendering page-specific content via Outlet. This section shows a common layout pattern.

```tsx
// layouts/MainShell.tsx
import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const MainShell: React.FC = () => (
  <div>
    <header style={{ padding: '1rem', background: '#f5f5f5' }}>
      <Link to="/">App</Link>
      <nav style={{ marginTop: '0.5rem' }}>
        <Link to="/">Home</Link> | <Link to="/projects">Projects</Link>
      </nav>
    </header>
    <section style={{ padding: '1rem' }}>
      <Outlet />
    </section>
  </div>
);

export default MainShell;
```

```tsx
// pages/Projects.tsx
import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const Projects: React.FC = () => (
  <div>
    <h2>Projects</h2>
    <ul>
      <li><Link to="alpha">Alpha</Link></li>
      <li><Link to="beta">Beta</Link></li>
    </ul>
    <Outlet />
  </div>
);

export default Projects;
```

```tsx
// pages/Projects/Alpha.tsx
import React from 'react';

const Alpha: React.FC = () => (
  <div>
    <h3>Alpha Project</h3>
    <p>Details about Alpha.</p>
  </div>
);

export default Alpha;
```

### Line-by-line explanation
1. MainShell defines a shared header and uses <Outlet /> to render nested route content.
2. Projects component renders a sub-navigation and an <Outlet /> to display nested project routes.
3. Alpha component provides the content for the nested route path "alpha".
4. This pattern scales to deeper nesting and helps keep UI consistent across sections.

## 5. Protected Routes: Guarding Access to Sensitive Pages

Protected routes prevent unauthorized access by gating route rendering with authentication state. This example uses a simple AuthContext and a ProtectedRoute wrapper.

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';

type User = { name: string };
type AuthContextType = {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const login = (name: string) => setUser({ name });
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

```tsx
// components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};
```

```tsx
// pages/Login.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [name, setName] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = () => {
    if (name.trim()) {
      login(name);
      navigate('/dashboard');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
      <button onClick={submit}>Login</button>
    </div>
  );
};

export default Login;
```

```tsx
// router-protected.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';

export const ProtectedAppRouter: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
```

### Line-by-line explanation
1. AuthContext provides a minimal auth surface (user, login, logout) with TS typings.
2. ProtectedRoute uses the auth state to decide whether to render the protected content or redirect to login.
3. Login component simulates a login flow and navigates to the protected area after login.
4. The router wiring uses a wrapper route to apply ProtectedRoute to the dashboard path.

## 6. Data Loading, Error Handling, and Lazy Loading

React Router v6.4+ introduces data APIs: loaders, actions, and errorElement. This section covers a loader that fetches data before rendering a component and a simple lazy-loaded page.

```tsx
// pages/Profile.tsx
import React from 'react';
import { useLoaderData } from 'react-router-dom';

type User = { id: string; name: string; email: string };

export const profileLoader = async (): Promise<User> => {
  // Simulated API call
  await new Promise(res => setTimeout(res, 350));
  return { id: 'u42', name: 'Alex Doe', email: 'alex@example.com' };
};

export default function Profile() {
  const user = useLoaderData() as User;
  return (
    <section>
      <h1>Profile</h1>
      <p>ID: {user.id}</p>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
    </section>
  );
}
```

```tsx
// router-loader.ts
import { RouteObject } from 'react-router-dom';
import Profile, { profileLoader } from './pages/Profile';

export const routeConfig: RouteObject[] = [
  {
    path: '/profile',
    element: <Profile />,
    loader: profileLoader,
  },
];
```

```tsx
// components/LazyPage.tsx
import React, { Suspense, lazy } from 'react';
const Settings = lazy(() => import('./Settings'));

const LazyPage: React.FC = () => (
  <Suspense fallback={<div>Loading settings...</div>}>
    <Settings />
  </Suspense>
);

export default LazyPage;
```

### Line-by-line explanation
1. Loader function simulates an asynchronous fetch and returns typed data.
2. Profile component consumes the data via useLoaderData and renders user info.
3. routeConfig wires the loader to the /profile route, enabling data loading before render.
4. LazyPage demonstrates code-splitting with React.lazy and Suspense for a non-critical page.

Note: In production, you’d typically integrate errorElement for error boundaries and handle loading states gracefully.

## 7. Type Safety Patterns and Migration Tips

To maximize safety and ergonomics in a TypeScript project, adopt the following patterns.

- Strongly type route params
```tsx
// components/Post.tsx
import { useParams } from 'react-router-dom';

type RouteParams = { id: string };

const Post: React.FC = () => {
  const { id } = useParams<RouteParams>();
  return <div>Post ID: {id}</div>;
};
```

- Explicitly type loader data and avoid any
```tsx
// types.ts
export type User = { id: string; name: string; };

// pages/UserProfile.tsx
import { useLoaderData } from 'react-router-dom';
import { User } from './types';

export const userLoader = async (): Promise<User> => ({ id: 'u1', name: 'Jane' });
export default function UserProfile() {
  const user = useLoaderData() as User;
  return <div>{user.name}</div>;
}
```

- Prefer container components and composition over props drilling for routes
- Use discriminated unions for route-based UI states (loading, loaded, error)

## X. Common Beginner Mistakes

Bad vs Good examples to illustrate real-world pitfalls.

- Mistake 1: Missing BrowserRouter wrapper
Bad:
```tsx
// App.tsx
export default function App() {
  return (
    <div>
      <Link to="/about">About</Link>
      <Routes>
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}
```
Good:
```tsx
import { BrowserRouter } from 'react-router-dom';
export default function App() {
  return (
    <BrowserRouter>
      <Link to="/about">About</Link>
      <Routes>
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- Mistake 2: Using anchor tags for internal navigation
Bad:
```tsx
<a href="/about">About</a>
```
Good:
```tsx
import { Link } from 'react-router-dom';
<Link to="/about">About</Link>
```

- Mistake 3: Not handling 404s (not adding a catch-all route)
Bad:
```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/about" element={<About />} />
  {/* Unknown route renders nothing */}
</Routes>
```
Good:
```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/about" element={<About />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

- Mistake 4: Not typing route params
Bad:
```tsx
const { id } = useParams();
```
Good:
```tsx
type RouteParams = { id: string };
const { id } = useParams<RouteParams>();
```

- Mistake 5: Not guarding protected routes (or misplacing guards)
Bad:
```tsx
<Route path="/dashboard" element={<Dashboard />} />
```
Good:
```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

## Y. Why This Matters In Real Systems

- UX and performance: Client-side routing enables instantaneous navigation and smoother transitions, contributing to perceived performance and a better user experience.
- Deep linking and shareable URLs: Routes preserve state via URLs, making bookmarks and social sharing reliable.
- Code-splitting and lazy loading: Route-based code splitting reduces initial bundle size, improving first-load performance; lazy routes are loaded on demand.
- Data loading hooks: Loaders and actions in React Router data APIs enable prefetching, server-state hydration, and centralized data management tied to the route lifecycle.
- Error handling and resilience: Proper error boundaries, NotFound routes, and fallback UIs improve robustness in production.
- Accessibility: Proper focus management and semantic landmarks (header, nav, main, footer) ensure screen-reader compatibility; ensure keyboard navigation works with route targets.
- Testing and maintenance: Typed route params, consistent layout components, and route guards simplify end-to-end tests and future refactors.

## Z. Study Questions

1. What is the difference between BrowserRouter and HashRouter, and when would you choose one over the other?
2. How do you programmatically navigate to a route in React Router v6?
3. How do nested routes and Outlet help you build shared layouts?
4. Describe a strategy to implement protected routes in React Router v6.
5. What are loaders in React Router v6.4+, and how do you use useLoaderData to access loaded data?

## Exercise

Your task is to build a small, self-contained SPA in TypeScript with React Router that exercises all major concepts covered in this lesson. Deliverables:

- A minimal app with routes: Home, About, Blog, BlogPost (dynamic id), Dashboard (protected), and Profile (data-loaded).
- Implement a shared layout with a header and a content area using nested routes.
- Implement a login screen and a simple auth flow to guard /dashboard using a ProtectedRoute-like pattern.
- Implement a dynamic BlogPost page that reads the post id from the URL and displays it.
- Implement a loader for the Profile page that simulates fetching user data and displays it using useLoaderData.
- Demonstrate lazy loading by lazy-loading a non-critical page component (e.g., a Settings page within Dashboard).
- Ensure type safety throughout (params, loader data, and component props).

Suggested steps:
1. Scaffold components and pages: Home, About, Blog, BlogPost, Dashboard, Settings (lazy), Login, Profile.
2. Create a simple in-memory auth state with login/logout to demonstrate protected routes.
3. Wire up routes using a mix of JSX Routes and a route object with createBrowserRouter (to showcase two APIs).
4. Add a NotFound route ("*") and an accessible loading UI for lazy-loaded content.
5. Write small, focused unit-style comments explaining how each piece satisfies the requirements.

If you want, I can provide a starter repository structure with all file templates and a ready-to-run npm/yarn script, and you can implement the pieces step by step.