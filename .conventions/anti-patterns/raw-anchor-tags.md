# Anti-Pattern: Raw Anchor Tags

## The Bug

Using `<a href="...">` in components breaks locale-aware routing.
In Next.js App Router with `[locale]` segment, raw anchors skip the
locale prefix:

```tsx
// BAD — resolves to /missions/roles instead of /en/missions/roles
<a href="../roles">Back</a>

// BAD — loses locale entirely
<a href="/roles">Back</a>
```

## The Fix

Always use `Link` from `@/i18n/navigation`:

```tsx
import { Link } from '@/i18n/navigation'

// GOOD — automatically prefixes with current locale
<Link href="/roles">Back</Link>
```

## Where This Applies

- All internal navigation in components and pages
- Both server components and client components
- The `href` prop accepts route paths without locale prefix

## Exception

External links (https://...) still use regular `<a>` tags.
