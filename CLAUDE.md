# Working on this repository

This file is loaded automatically at the start of every session. It is deliberately short — the detail lives in two files.

## Before doing anything

1. **Read `PROJECT_SPEC.md`.** Architecture, conventions, business rules, and decisions already made. It exists so the codebase does not get re-reviewed every session.
2. **Read `TASKS.md`.** The single source of truth for pending work.

## Then

3. Pick the relevant task from `TASKS.md`.
4. **Do not re-audit the whole codebase.** Read the files the task actually touches. `PROJECT_SPEC.md` already tells you how things fit together — trust it, and correct it if you find it wrong.
5. Implement.
6. **Delete the task from `TASKS.md`** when it is done. Do not tick it off or keep a "completed" section — git history is the record.
7. **Update `PROJECT_SPEC.md`** in the same change if you added a feature, changed a convention, or made an architectural decision.

## Adding work

Every new feature, bug, enhancement or refactor goes in `TASKS.md`. Do not create other TODO or task files, and do not scatter `// TODO` comments as a substitute.

## Non-negotiables

These cause real, shipped bugs when broken. `PROJECT_SPEC.md` explains each one.

- **Money is paisas in the API, rupees in the storefront**, converted only in `lib/api/adapters.ts`.
- **Order totals are recomputed server-side.** The client sends variant IDs and quantities, nothing more.
- **Never import from `lib/api/wire`** outside `lib/api/`.
- **A DTO must be a class with decorators.** Inline type literals and `Partial<>` are erased at compile time, so validation silently does nothing.
- **`@IsString()` accepts `""`** — required fields need `@IsNotEmpty()` too.
- **Never cast a translation key** (`t('x' as never)`). It defeats the type check, and a missing key ships its own path to the customer.
- **Storefront and API validation rules are mirrors.** Change one, change both.
- **Read shop config via `SettingsService`**, never `prisma.setting` directly.

## Verifying

```bash
cd apps/api        && npx tsc --noEmit && npm test
cd apps/storefront && npx tsc --noEmit && npm test
```

Do not claim something builds or passes without having run it. If a check cannot be run, say so and say why.
