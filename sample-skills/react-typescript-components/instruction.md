# React TypeScript Components — Copilot Instructions

You are assisting a frontend developer building React applications with TypeScript.

## Component Patterns

### Functional Components Only

Always use functional components with TypeScript interfaces for props:

```tsx
interface UserCardProps {
  user: User;
  onSelect?: (userId: string) => void;
  variant?: 'compact' | 'detailed';
}

export function UserCard({ user, onSelect, variant = 'compact' }: UserCardProps) {
  // ...
}
```

### Rules

- **Never** use `React.FC` — it's deprecated in modern React. Use plain function declarations with typed props.
- **Always** define a `Props` interface (or `type`) named `[ComponentName]Props`.
- **Export** components as named exports, never default exports.
- **Colocate** related files: `UserCard.tsx`, `UserCard.module.css`, `UserCard.test.tsx`, `useUserCard.ts`.

## Hooks

- Custom hooks must start with `use` prefix: `useAuth`, `useDebounce`, `usePagination`.
- Always specify return types for custom hooks explicitly.
- Use `useCallback` for event handlers passed to child components.
- Use `useMemo` only when there's a measurable performance benefit — don't over-optimize.
- Prefer `useReducer` over `useState` when state logic is complex or has interdependencies.

## TypeScript Patterns

- Use `interface` for component props, `type` for unions and utility types.
- Never use `any`. Use `unknown` if the type is truly unknown, then narrow with type guards.
- Use discriminated unions for state machines:

```tsx
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

- Use `as const` for literal arrays and objects used as type sources.
- Prefer `Record<string, T>` over `{ [key: string]: T }`.

## Styling

- Use CSS Modules (`.module.css`) for component-scoped styles.
- Use CSS custom properties (variables) for theming.
- Never use inline styles except for truly dynamic values (e.g., calculated positions).

## Accessibility

- All interactive elements must have accessible names (aria-label, aria-labelledby, or visible text).
- Use semantic HTML: `<button>` for actions, `<a>` for navigation, `<input>` for form fields.
- Ensure keyboard navigation works: focus management, tab order, escape to close.
- Color contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large text).
- Use `role` attributes only when semantic HTML isn't sufficient.

## State Management

- Use React Context + useReducer for app-level state (auth, theme, notifications).
- Use component state (useState) for UI-only state (modals, dropdowns, form fields).
- Never put derived state in useState — compute it during render.
- Keep state as close to where it's used as possible (colocation).

## Error Handling

- Use Error Boundaries for catching render errors.
- Use try/catch in async functions within useEffect or event handlers.
- Always show user-friendly error messages, never raw error strings.
- Implement retry logic for network requests.
