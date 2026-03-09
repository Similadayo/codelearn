# Track: Frontend Engineering — Phase 2: Modern UI Frameworks — Client-side Routing with Angular Router

Client-side routing is the keystone of modern single-page applications. It lets users navigate through views without full page reloads, preserves deep links, enables lazy loading, and provides guards and resolvers to improve UX and performance. In Angular, the Router is a first-class citizen that coordinates navigation, URL state, and data loading. This lesson shows how to design robust, scalable routes using Angular Router, with practical code examples and production-ready patterns.

## 1. Core Concepts and Setup

In this section, you’ll learn the essential building blocks of Angular routing, how to wire them up, and a simple app skeleton to illustrate common patterns like nested routes and lazy loading.

```ts
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { UsersComponent } from './users/users.component';
import { UserDetailComponent } from './users/user-detail.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  // Nested route: /users/42
  { path: 'users', component: UsersComponent,
    children: [
      { path: ':id', component: UserDetailComponent }
    ]
  },
  // Lazy-loaded module
  { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) },
  // Fallback for unknown routes
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

```html
<!-- app.component.html -->
<nav>
  <a routerLink="" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
  <a routerLink="/about" routerLinkActive="active">About</a>
  <a routerLink="/users" routerLinkActive="active">Users</a>
  <a routerLink="/admin" routerLinkActive="active">Admin</a>
</nav>

<router-outlet></router-outlet>
```

### Line-by-line explanation breaking down each line

- import { NgModule } from '@angular/core';
  - Imports the NgModule decorator to declare a module.
- import { RouterModule, Routes } from '@angular/router';
  - Imports the router module and the Routes type to configure routing.
- import { HomeComponent } from './home/home.component';
  - Imports the component to render at the home path.
- import { AboutComponent } from './about/about.component';
  - Imports the component for the about page.
- import { UsersComponent } from './users/users.component';
  - Imports the parent Users view that can host nested routes.
- import { UserDetailComponent } from './users/user-detail.component';
  - Imports the detail view for a specific user.
- const routes: Routes = [ ... ];
  - Declares the route configuration array.
- { path: '', component: HomeComponent },
  - Maps the root URL to the HomeComponent.
- { path: 'about', component: AboutComponent },
  - Maps /about to AboutComponent.
- { path: 'users', component: UsersComponent, children: [ { path: ':id', component: UserDetailComponent } ] },
  - Sets up a nested route: /users renders UsersComponent, and /users/:id renders UserDetailComponent within the Users view.
- { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) },
  - Configures lazy loading of the AdminModule when /admin is navigated to.
- { path: '**', redirectTo: '', pathMatch: 'full' }
  - Wildcard route that redirects unknown URLs to the home page.
- @NgModule({ imports: [RouterModule.forRoot(routes)], exports: [RouterModule] })
  - Registers the routes at the root level and exports RouterModule for use in components.
- export class AppRoutingModule {}
  - Exports the module so it can be imported into AppModule.

- <nav> ... </nav>
  - Simple navigation bar using Angular router links.
- <a routerLink="" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
  - RouterLink to the root; routerLinkActive toggles the active class when the link matches the URL exactly.
- <a routerLink="/about" routerLinkActive="active">About</a>, etc.
  - Other internal navigation links.
- <router-outlet></router-outlet>
  - Placeholder where routed components get rendered.

## 2. Navigation and Route Parameters

You’ll often need to navigate programmatically and read URL parameters, such as an item ID. This section demonstrates reading route params and navigating to a detail view.

```ts
// users/user-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from './user.service';
import { User } from './user.model';

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.component.html'
})
export class UserDetailComponent implements OnInit {
  user?: User;

  constructor(private route: ActivatedRoute, private userService: UserService) {}

  ngOnInit(): void {
    // Read the "id" route parameter and fetch the user
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.userService.getUser(id).subscribe(u => (this.user = u));
    });
  }
}
```

```html
<!-- users/user-detail.component.html -->
<div *ngIf="user">
  <h2>{{ user.name }}</h2>
  <p>{{ user.email }}</p>
</div>
```

### Line-by-line explanation breaking down each line

- import { ActivatedRoute } from '@angular/router';
  - Imports the service that provides access to route parameters and data.
- constructor(private route: ActivatedRoute, private userService: UserService) {}
  - Injects ActivatedRoute to access route info and a UserService to fetch data.
- this.route.paramMap.subscribe(params => { ... });
  - Subscribes to changes in the route parameters to react to navigation (e.g., when the user navigates to a different ID without leaving the page).
- const id = Number(params.get('id'));
  - Extracts the 'id' parameter from the route and converts it to a number.
- this.userService.getUser(id).subscribe(u => (this.user = u));
  - Calls a service to fetch the user by ID and stores it for rendering.
- <div *ngIf="user"> ... </div>
  - Template guard to render the user details when data is available.
- {{ user.name }}, {{ user.email }}
  - Data bindings to display user fields.

## 3. Route Guards and Data Resolution

Guarding routes prevents navigation when conditions aren’t met (e.g., authentication). Resolvers fetch data before a route activates, giving components ready data without showing a loading state.

```ts
// guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.auth.isLoggedIn();
  }
}
```

```ts
// resolvers/product.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { ProductService, Product } from './product.service';

@Injectable({ providedIn: 'root' })
export class ProductResolver implements Resolve<Product> {
  constructor(private ps: ProductService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Product> {
    const id = route.paramMap.get('id')!;
    return this.ps.getProduct(id);
  }
}
```

```ts
// app-routing.module.ts (excerpt)
{ path: 'products/:id', component: ProductDetailComponent, resolve: { product: ProductResolver }, canActivate: [AuthGuard] }
```

### Line-by-line explanation breaking down each line

- @Injectable({ providedIn: 'root' })
  - Declares the guard/resolver as an injectable service provided at the root level.
- export class AuthGuard implements CanActivate { ... }
  - Implements the CanActivate interface to control access to routes.
- constructor(private auth: AuthService) {}
  - Injects an authentication service that determines login state.
- canActivate(...): ... { return this.auth.isLoggedIn(); }
  - Returns a boolean/observable/promise indicating whether navigation is allowed.
- @Injectable({ providedIn: 'root' })
  - Marks the resolver as injectable.
- export class ProductResolver implements Resolve<Product> { ... }
  - Resolves a Product before activating the route.
- resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Product> { ... }
  - Reads route params and returns an observable that Angular will await before activating the route.
- const id = route.paramMap.get('id')!;
  - Retrieves the route parameter id.
- return this.ps.getProduct(id);
  - Fetches the product data as an observable.
- { path: 'products/:id', component: ProductDetailComponent, resolve: { product: ProductResolver }, canActivate: [AuthGuard] }
  - Configures route to use both a resolver and a guard. The resolved data will be available to the component as route data.

## 4. Lazy Loading and Modular Architecture

Lazy loading splits large apps into chunks loaded on demand, reducing initial bundle size and improving startup time. This is especially important for admin panels or feature-rich sections.

```ts
// admin/admin.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminRoutingModule } from './admin-routing.module';

@NgModule({
  declarations: [AdminDashboardComponent],
  imports: [CommonModule, AdminRoutingModule]
})
export class AdminModule {}
```

```ts
// admin/admin-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';

const routes: Routes = [{ path: '', component: AdminDashboardComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
```

```ts
// app-routing.module.ts (excerpt)
{ path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) }
```

### Line-by-line explanation breaking down each line

- export class AdminModule {}
  - Declares a dedicated module for admin features.
- declarations: [AdminDashboardComponent]
  - Registers components belonging to the AdminModule.
- imports: [CommonModule, AdminRoutingModule]
  - Imports common directives and the module’s own routes.
- const routes: Routes = [{ path: '', component: AdminDashboardComponent }]
  - Admin routing: default path shows the AdminDashboardComponent.
- RouterModule.forChild(routes)
  - Configures a child router for the AdminModule.
- { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) }
  - Lazy-loads the AdminModule when /admin is navigated to.
- import('./admin/admin.module').then(m => m.AdminModule)
  - Dynamic import returning a promise resolving to the module class.

## 5. Advanced Routing Patterns: Nested Routes and Auxiliary Routes

Beyond flat routes, you can nest routes and use named outlets (auxiliary routes) to render multiple routed components simultaneously.

```ts
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'projects',
    component: ProjectsComponent,
    children: [
      { path: '', component: ProjectsListComponent },
      { path: ':projId', component: ProjectDetailComponent,
        children: [
          { path: 'docs', component: ProjectDocsComponent }
        ]
      }
    ]
  },
  // Example of an auxiliary route (shown in a named outlet)
  { path: 'messages', component: MessagesComponent, outlet: 'sidebar' }
];
```

### Line-by-line explanation breaking down each line

- path: 'projects', component: ProjectsComponent, children: [ ... ]
  - Creates a parent route with nested child routes, enabling a multi-view layout where ProjectsComponent hosts nested views.
- { path: '', component: ProjectsListComponent }
  - Default child route showing a list when navigating to /projects.
- { path: ':projId', component: ProjectDetailComponent, children: [ { path: 'docs', ... } ] }
  - Nested route for a specific project; further nested route for documentation under that project.
- { path: 'messages', component: MessagesComponent, outlet: 'sidebar' }
  - Defines an auxiliary route that renders in a named outlet, allowing simultaneous rendering of multiple routed components (e.g., a persistent sidebar).
- Named outlets require corresponding <router-outlet name="sidebar"></router-outlet> in templates.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Pitfall 1: Using plain anchor tags for internal navigation
  - Bad:
    ```html
    <a href="/about">About</a>
    ```
  - Good:
    ```html
    <a routerLink="/about" routerLinkActive="active">About</a>
    ```
- Pitfall 2: Forgetting RouterOutlet
  - Bad:
    ```html
    <!-- app.component.html intentionally empty except for static content -->
    <div>Static shell</div>
    ```
  - Good:
    ```html
    <router-outlet></router-outlet>
    ```
- Pitfall 3: Not wiring the root router in AppModule
  - Bad:
    ```ts
    // app.module.ts
    imports: [BrowserModule] // Missing AppRoutingModule
    ```
  - Good:
    ```ts
    // app.module.ts
    imports: [BrowserModule, AppRoutingModule]
    ```
- Pitfall 4: Incorrect or missing fallback strategy
  - Bad:
    ```ts
    { path: '**', redirectTo: '' } // Redirect without pathMatch can be brittle
    ```
  - Good:
    ```ts
    { path: '**', redirectTo: '', pathMatch: 'full' }
    ```
- Pitfall 5: Over-fetching data before navigation
  - Bad (no resolver usage; component loads data after view init causing flicker)
    ```ts
    // Not using a resolver
    ngOnInit() { this.service.getData().subscribe(...); }
    ```
  - Good (or use a resolver to preload data):
    ```ts
    // Use a resolver or route data to preload
    { path: 'items/:id', component: ItemDetailComponent, resolve: { item: ItemResolver } }
    ```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Deep linking and navigability: Users can bookmark links to specific views (e.g., /users/42), and back/forward browser buttons work as expected.
- Performance through lazy loading: Large apps stay fast by loading modules only when needed, reducing initial bundle size.
- Consistent UX with guards and resolvers: Guards enforce access rules; resolvers ensure the view has data before rendering, lowering perceived latency.
- State synchronization: The router mirrors the URL to app state, enabling shareable URLs for specific app states.
- SEO and social sharing considerations: For fully client-rendered apps, consider pre-rendering or server-side rendering for critical routes to improve crawlability and share previews.
- Real-world patterns: Nested routes enable complex layouts (dashboards, admin panels), while auxiliary routes support multi-pane interfaces (e.g., chat sidebar).

## Z. Study Questions — 5 Recall Questions

1. What Angular feature renders the routed component, and where is it placed in templates?
2. How do you define a route parameter (for example, an item ID) and read it inside a component?
3. How would you configure a route to lazy-load a feature module?
4. What is a Resolver in Angular routing, and when would you use it?
5. What is the difference between a standard route and an auxiliary route (named outlet), and when would you use each?

## Exercise

Complete this practical, multi-part coding challenge to build a small Angular app that demonstrates the concepts covered.

Part A — Project Setup
- Create a new Angular project (ng new router-demo).
- Generate components: HomeComponent, AboutComponent, UsersComponent, UserDetailComponent, AdminDashboardComponent, AdminPanelComponent.
- Create services: UserService (provides mock user data), AuthService (boolean isLoggedIn), ProductService (mock data).
- Create an AppRoutingModule with routes that include:
  - '' -> HomeComponent
  - 'about' -> AboutComponent
  - 'users' with a nested '' (UsersComponent) and ':id' (UserDetailComponent)
  - 'products/:id' with a resolver to fetch product data
  - 'admin' as a lazy-loaded AdminModule
  - '**' wildcard route redirecting to Home

Part B — Navigation and Params
- In UsersComponent, display a list of sample users with links to /users/:id.
- In UserDetailComponent, read the :id route parameter and display the corresponding user info using UserService.

Part C — Guards and Resolvers
- Implement AuthGuard that uses AuthService.isLoggedIn() to protect the /admin route.
- Implement ProductResolver to fetch product data for /products/:id before activation, and display product details in ProductDetailComponent.

Part D — Lazy Loading and Admin Module
- Create AdminModule with AdminDashboardComponent and a simple AdminPanelComponent.
- Configure AdminModule to be lazy-loaded via AppRoutingModule.
- Ensure navigation to /admin loads only the AdminModule.

Part E — Nested and Auxiliary Routes
- Add a nested route structure under /projects that demonstrates a ProjectsComponent with child routes: /projects (list) and /projects/:projectId (detail) with an additional /docs child route under the detail.
- Create an auxiliary route example that renders a NotificationsComponent in a named outlet alongside the main view.

Part F — 404 and Preloading
- Add a NotFoundComponent and route { path: '**', component: NotFoundComponent } or a redirect as desired.
- Optional: configure a preloading strategy to preload lazy-loaded modules after the app stabilizes.

Deliverables (code you should implement or adapt):
- app-routing.module.ts illustrating root routes and lazy loading.
- admin/admin.module.ts and admin/admin-routing.module.ts illustrating a lazy module with its own routes.
- user-detail.component.ts showing how to read route params.
- product-detail.component.ts with a resolver binding to route data.
- auth.guard.ts implementing route protection.
- project routing demonstration with nested and auxiliary routes.
- Templates demonstrating effective routerLink usage and <router-outlet> usage.

Notes
- If you’re using a React Router mindset, remember that Angular Router has its own API and lifecycle. The concepts—deep linking, navigation, guards, resolvers, lazy loading—map cleanly, but the syntax is Angular-specific.
- Ensure AppModule imports AppRoutingModule and, for lazy modules, avoids eager loading of heavy features unless needed.

End of lesson.