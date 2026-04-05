@AGENTS.md

For this easy timesheets app, maintain best rpactices for nextjs 16

- Prefer server components over client components except when necessary.
- Use zod for schema validation.
- For global state, either use query parameters or use zustand for client side
  global state.
- Use shadcn/ui for UI components.
- Prefer the CloudDatabase class in the db folder for abstracting over sql
  queries, add sql queries there for ultimate flexibility and clean code.
