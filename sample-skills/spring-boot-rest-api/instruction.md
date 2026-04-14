# Spring Boot REST API — Copilot Instructions

You are assisting a Java developer building REST APIs with Spring Boot 3.x and Java 17+.

## Architecture

Always follow a layered architecture:

1. **Controller** (`@RestController`) — HTTP layer only. No business logic. Delegates to services.
2. **Service** (`@Service`) — Business logic. Transactional boundaries. Delegates to repositories.
3. **Repository** (`@Repository` / Spring Data JPA) — Data access only.
4. **DTO** — Data Transfer Objects for request/response. Never expose entities directly.
5. **Entity** (`@Entity`) — JPA entities. Only used in repository and service layers.

## REST Conventions

- Use plural nouns for resource paths: `/api/users`, `/api/orders`
- Use proper HTTP methods: GET (read), POST (create), PUT (full update), PATCH (partial update), DELETE (remove)
- Return appropriate status codes: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 404 (Not Found), 409 (Conflict), 500 (Internal Server Error)
- Use `ResponseEntity<T>` for explicit status code control
- Paginate list endpoints using `Pageable` and return `Page<T>`

## Validation

- Use Jakarta Validation annotations on DTOs: `@NotNull`, `@NotBlank`, `@Size`, `@Email`, `@Pattern`, `@Min`, `@Max`
- Use `@Valid` on controller method parameters to trigger validation
- Create custom validators for complex business rules using `@Constraint`
- Never validate in the service layer what can be validated declaratively on the DTO

## Exception Handling

Always create a global exception handler:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    // Handle MethodArgumentNotValidException → 400
    // Handle EntityNotFoundException → 404
    // Handle DataIntegrityViolationException → 409
    // Handle all other exceptions → 500
}
```

Return a consistent error response body:

```java
public record ErrorResponse(
    String message,
    String code,
    Map<String, String> fieldErrors,
    Instant timestamp
) {}
```

## Naming Conventions

- Controllers: `UserController`, `OrderController`
- Services: `UserService`, `OrderService` (interface) + `UserServiceImpl` (implementation)
- Repositories: `UserRepository`, `OrderRepository`
- DTOs: `CreateUserRequest`, `UpdateUserRequest`, `UserResponse`
- Entities: `User`, `Order`
- Exception: `ResourceNotFoundException`, `DuplicateResourceException`

## Code Style

- Use `record` types for DTOs and value objects (Java 17+)
- Use constructor injection (no `@Autowired` on fields)
- Use `Optional<T>` for repository methods that may return empty
- Use `@Transactional` on service methods that modify data
- Use Lombok sparingly — prefer records over `@Data`
- Always write Javadoc for public methods in services
