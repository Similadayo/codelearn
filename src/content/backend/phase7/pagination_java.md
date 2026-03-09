# Track: Backend Engineering — Phase 7: Advanced API Features — Pagination, Filtering & Sorting APIs (Java)

Pagination, filtering, and sorting are foundational capabilities for scalable APIs. They empower clients to fetch precisely what they need, reduce server load, and enable world-class user experiences in dashboards, admin panels, and data-heavy services. In Java-based backends, the canonical approach uses Spring Data JPA with Pageable, Sort, and Specifications to compose flexible, efficient queries that operate under stateless REST contracts.

## 1. Pagination Basics with Pageable

This section covers offset-based pagination using Spring Data's Pageable and Page. It demonstrates a straightforward endpoint that returns a page of users with a stable sort.

```java
// User.java (entity)
@Entity
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private String name;
  private String email;
  private String status; // e.g., "ACTIVE", "INACTIVE"
  // getters/setters omitted for brevity
}
```

```java
// UserRepository.java
public interface UserRepository extends JpaRepository<User, Long> {
  // JpaRepository already provides Page<User> findAll(Pageable)
}
```

```java
// UserController.java
@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserRepository userRepository;

  public UserController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @GetMapping
  public Page<User> getUsers(
      @RequestParam(value = "page", defaultValue = "0") int page,
      @RequestParam(value = "size", defaultValue = "20") int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
    return userRepository.findAll(pageable);
  }
}
```

### Line-by-line explanation
- @Entity and class fields define the User table with id, name, email, and status.
- UserRepository extends JpaRepository<User, Long>, which provides built-in pagination methods like findAll(Pageable).
- @RestController and @RequestMapping set up a REST controller at /api/users.
- Constructor injects UserRepository for data access.
- @GetMapping maps GET requests to /api/users.
- The method accepts page and size query params with sensible defaults.
- PageRequest.of constructs a Pageable with the requested page, size, and a stable ascending sort by id.
- findAll(pageable) returns a Page<User> containing content, total elements, page info, etc.

## 2. Dynamic Filtering with Specifications

Filtering can be dynamic and composable. This section shows how to build a Specification-based query to filter by status, role, and partial name, while still paginating results.

```java
// UserSpecifications.java
public class UserSpecifications {

  public static Specification<User> hasStatus(String status) {
    return (root, query, cb) -> {
      if (status == null || status.isEmpty()) return cb.conjunction();
      return cb.equal(root.get("status"), status);
    };
  }

  public static Specification<User> hasNameContaining(String name) {
    return (root, query, cb) -> {
      if (name == null || name.isEmpty()) return cb.conjunction();
      return cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    };
  }

  public static Specification<User> build(String status, String name) {
    return Specification.where(hasStatus(status))
                      .and(hasNameContaining(name));
  }
}
```

```java
// UserRepository.java (updated)
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
  // findAll(Specification<T>, Pageable) is provided by JpaSpecificationExecutor
}
```

```java
// UserController.java (advanced filter endpoint)
@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserRepository userRepository;

  public UserController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @GetMapping("/search")
  public Page<User> searchUsers(
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "name", required = false) String name,
      @RequestParam(value = "page", defaultValue = "0") int page,
      @RequestParam(value = "size", defaultValue = "20") int size) {

    Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
    Specification<User> spec = UserSpecifications.build(status, name);
    return userRepository.findAll(spec, pageable);
  }
}
```

### Line-by-line explanation
- UserSpecifications provides modular Specifications for status and name filters.
- hasStatus returns a predicate that is a no-op when status is null/empty; otherwise it filters by status.
- hasNameContaining applies a case-insensitive LIKE filter when name is provided.
- build combines status and name filters using and, allowing flexible combinations.
- UserRepository now extends JpaSpecificationExecutor to support specification-based queries.
- The controller’s /search endpoint accepts optional status and name params, plus pagination.
- PageRequest constructs a pageable with sorting by id to ensure stable paging.
- findAll(spec, pageable) executes the dynamic filter with pagination.

## 3. Sorting Fundamentals and Dynamic Sort

Sorting can be dynamic and multi-field. This section demonstrates parsing a multi-parameter sort input into a Spring Sort object and applying it to a paged query.

```java
// Utility to parse dynamic sort parameters
public class SortUtil {
  // Expected format: ["name,asc","createdAt,desc"]
  public static Sort parseSortParams(String[] sortParams) {
    if (sortParams == null || sortParams.length == 0) {
      return Sort.by("id").ascending();
    }
    List<Sort.Order> orders = new ArrayList<>();
    for (String s : sortParams) {
      String[] parts = s.split(",");
      String property = parts[0];
      Sort.Direction dir = parts.length > 1 && "desc".equalsIgnoreCase(parts[1])
                          ? Sort.Direction.DESC
                          : Sort.Direction.ASC;
      orders.add(new Sort.Order(dir, property));
    }
    return Sort.by(orders);
  }
}
```

```java
// Updated controller with dynamic sorting
@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserRepository userRepository;

  public UserController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @GetMapping
  public Page<User> getUsersWithDynamicSort(
      @RequestParam(value = "page", defaultValue = "0") int page,
      @RequestParam(value = "size", defaultValue = "20") int size,
      @RequestParam(value = "sort", required = false) String[] sort) {

    Pageable pageable = PageRequest.of(page, size, SortUtil.parseSortParams(sort));
    return userRepository.findAll(pageable);
  }
}
```

### Line-by-line explanation
- SortUtil.parseSortParams converts an array of sort directives into a Spring Sort object.
- If no sort params are provided, it defaults to id ascending for stability.
- Each directive is parsed into a Sort.Order with a property name and direction (asc/desc).
- The controller method accepts a variadic sort parameter and delegates to SortUtil for construction.
- PageRequest.of ties the pageable to the computed Sort, ensuring the database applies the sorting.
- findAll(pageable) fetches a sorted page of users.

## 4. Combining Pagination, Filtering, Sorting

Real-world endpoints mix page, size, filters, and sorts. This example shows a single endpoint that accepts all of these and returns a filtered, sorted, paged result.

```java
// Advanced combined endpoint
@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserRepository userRepository;

  public UserController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @GetMapping("/advanced")
  public Page<User> getUsersAdvanced(
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "name", required = false) String name,
      @RequestParam(value = "page", defaultValue = "0") int page,
      @RequestParam(value = "size", defaultValue = "20") int size,
      @RequestParam(value = "sort", required = false) String[] sort) {

    Pageable pageable = PageRequest.of(page, size, SortUtil.parseSortParams(sort));
    Specification<User> spec = UserSpecifications.build(status, name);
    return userRepository.findAll(spec, pageable);
  }
}
```

### Line-by-line explanation
- This endpoint blends the previous sections: you can filter by status and name, sort dynamically, and paginate.
- The SortUtil and UserSpecifications provide the dynamic parts; pagination remains PageRequest.
- The method returns a Page<User> containing content, total, and metadata for UI navigation.

## 5. Performance Considerations: Offset vs Keyset Pagination

Choosing the right pagination strategy matters at scale. Offset pagination (with LIMIT/OFFSET) is simple but can degrade as offset grows. Keyset pagination (also known as cursor pagination) offers constant-time paging for large datasets but requires stable ordering and exposure of the last seen key.

Offset-based (usual Page/offset approach)
```java
@GetMapping("/offset")
public Page<User> getUsersOffset(
    @RequestParam(value = "page", defaultValue = "0") int page,
    @RequestParam(value = "size", defaultValue = "20") int size) {

  Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
  return userRepository.findAll(pageable);
}
```

Keyset pagination
```java
// Repository method for keyset paging
public interface UserRepository extends JpaRepository<User, Long> {
  Page<User> findAllByIdGreaterThan(Long lastId, Pageable pageable);
}
```

```java
// Controller for keyset paging
@GetMapping("/keyset")
public Page<User> getUsersKeyset(
    @RequestParam(value = "lastId", required = false) Long lastId,
    @RequestParam(value = "limit", defaultValue = "20") int limit) {

  Pageable pageable = PageRequest.of(0, limit, Sort.by("id").ascending());
  if (lastId == null) {
    return userRepository.findAll(pageable);
  } else {
    return userRepository.findAllByIdGreaterThan(lastId, pageable);
  }
}
```

### Line-by-line explanation
- Offset-based: Page and size drive the LIMIT/OFFSET, which can require large offsets to skip past many pages.
- Keyset: Uses a last seen id to fetch the next set of rows with a simple "id > lastId" predicate, which is more scalable for deep paging.
- findAllByIdGreaterThan(lastId, pageable) leverages Spring Data query derivation to fetch the next slice where id is greater than lastId, applying the same limit as pageable.
- For a production system, keyset pagination often requires ensuring unique, monotonically increasing sort keys and careful UI state management to keep the user in sync with the last seen key.

## X. Common Beginner Mistakes

1) N+1 queries when loading related data with pagination
- Bad:
```java
Page<User> page = userRepository.findAll(pageable);
List<Order> allOrders = new ArrayList<>();
for (User u : page.getContent()) {
  allOrders.addAll(u.getOrders()); // triggers N+1 if orders are lazy-loaded
}
```
- Good:
```java
@Query("select distinct u from User u left join fetch u.orders where ...")
Page<User> findAllWithOrders(Pageable pageable);
```

2) Unvalidated or unsafe sort parameters leading to SQL injection or invalid columns
- Bad:
```java
Sort sort = Sort.by(sortParam); // sortParam from user input
```
- Good:
```java
Sort sort = SortUtil.parseSortParams(new String[]{sortParam});
```
or restrict to a whitelist:
```java
private static final Set<String> ALLOWED_FIELDS = Set.of("name", "id", "createdAt");
```

3) Not including total counts or page metadata
- Bad:
```java
List<User> users = userRepository.findAll(pageable).getContent();
```
- Good:
```java
Page<User> page = userRepository.findAll(pageable);
return page; // includes content, totalElements, totalPages, etc.
```

4) Over-fetching fields or not using DTOs
- Bad:
```java
List<User> users = userRepository.findAll(pageable).getContent();
return users; // returns full entities with potentially large graphs
```
- Good:
```java
public class UserDTO { Long id; String name; String status; }
Page<UserDTO> dtos = userRepository.findAll(pageable)
  .map(u -> new UserDTO(u.getId(), u.getName(), u.getStatus()));
```

5) Assuming a single fixed sort in all endpoints
- Bad:
```java
Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
```
- Good:
```java
Sort sort = SortUtil.parseSortParams(sortParams);
Pageable pageable = PageRequest.of(page, size, sort);
```

## Y. Why This Matters In Real Systems

- Performance at scale: Pagination reduces data transfer and DB load. Keyset pagination can dramatically reduce latency for deep pages in large tables.
- UX and consistency: Stable sorting prevents content shifts between pages. Sorting should be stable and deterministic to avoid row jumps.
- Filtering breadth: Dynamic filtering enables dashboards and admin UIs to slice data without creating dozens of endpoints.
- Index design: Proper indices on filter/sort columns (e.g., status, name, createdAt, id) are critical for performance. Consider composite indices where queries frequently filter on multiple fields.
- API contracts: Consistent endpoint shapes with well-documented query parameters enable client teams to compose complex queries safely.
- Observability: Track query performance, page sizes, and latency; implement rate limiting and paging metrics to detect slow paths.

## Z. Study Questions

1) What is the difference between offset-based pagination and keyset (cursor) pagination? When would you choose one over the other?
2) How do you implement dynamic filtering in Spring Data JPA using Specifications?
3) How can you safely expose dynamic sort parameters from an API without risking invalid or unsafe column names?
4) What is a Page and a Pageable in Spring Data JPA, and what information do they provide to the client?
5) Why is it important to normalize and keep stable sort orders across pages, and how can you ensure it in an API design?

## Exercise

Part A: Build a Spring Boot REST endpoint that supports pagination, filtering by status and name, and sorting by multiple fields.

- Deliverables:
  - A User entity with at least id, name, email, status, and createdAt fields.
  - A UserRepository supporting paging and specifications.
  - A UserController with endpoints:
    - GET /api/users?page&size&sort; returns paged, optionally sorted results.
    - GET /api/users/search?status=&name=&page=&size= returns filtered and paged results.
  - Sorting supports multiple fields: sort=name,asc&createdAt,desc.
  - Filtering supports status and name (name partial match).

Part B: Extend with Keyset Pagination (cursor-based) endpoint.

- Deliverables:
  - Endpoint GET /api/users/keyset?lastId=&limit= returns next page of results after lastId (or first page if lastId is absent).
  - Implement the repository method and update documentation/comments.
  - Discuss trade-offs in code comments.

Part C: DTO Projection

- Deliverables:
  - Create a UserDTO with id, name, status.
  - Expose an endpoint that returns Page<UserDTO> instead of User, preserving pagination metadata.
  - Ensure mapping is done efficiently (no N+1) and explain how you avoided it.

Notes for implementation
- Use Spring Data JPA with Hibernate (or your preferred JPA provider).
- Aim for clean separation: controller handles API contract, service (if added) contains business logic, repository handles data access.
- Include validation where appropriate (e.g., restrict sort fields to an allowlist).
- Provide comments in code explaining design decisions and potential performance implications.

This completes a comprehensive, practical lesson on Pagination, Filtering, and Sorting APIs in Java for backend systems.