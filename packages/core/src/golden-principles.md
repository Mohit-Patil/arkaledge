# Golden Principles for Arkaledge Agent Code Generation

These principles encode "human taste" into the system. Once captured, they are enforced continuously on every line of code.

## TypeScript Conventions

1. **Always use explicit type annotations** for function parameters and return types
2. **Never use `any`** — use `unknown` if type is truly uncertain, then narrow
3. **Use strict null checks** — check for null/undefined explicitly
4. **Prefer interfaces over type aliases** for object shapes
5. **Use `readonly` modifier** for parameters that should not be mutated

## Error Handling

1. **Always use try/catch** around async operations, log the error with context
2. **Never silently swallow errors** — at minimum, log and rethrow or handle explicitly
3. **Use custom error classes** for domain-specific errors
4. **Include correlation IDs** in error messages for traceability

## Testing

1. **Use Vitest** as the testing framework (not Jest)
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Test file naming**: `*.test.ts` alongside the module
4. **One assertion per test** for clarity — use `it.each` for parameterized tests
5. **Mock external dependencies** (file system, network calls)

## Code Organization

1. **One export per file** for utilities — use `index.ts` for re-exports
2. **Barrel files** (`index.ts`) should only re-export, never have implementation
3. **Use absolute imports** with `@/` prefix (configured in tsconfig)
4. **Group by feature**, not by type (e.g., `/features/auth/` not `/types/` + `/utils/`)

## Async Patterns

1. **Always await promises** — never use `.then()` chains in new code
2. **Use async iterables** for streaming data, not callbacks
3. **Set reasonable timeouts** on async operations (30s default)

## Security

1. **Never log secrets** — API keys, tokens, passwords
2. **Validate all external input** — use Zod for config and user input
3. **Use environment variables** for configuration, never hardcode
