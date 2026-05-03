# Snippet to add to your existing CLAUDE.md

Append the following section to your existing `CLAUDE.md`. It only references `DESIGN_SYSTEM.md` and the design system path — it shouldn't conflict with anything else you have in there.

---

```markdown
## Design system

Nave has a design system documented in `DESIGN_SYSTEM.md` at the repo root. Before building or modifying any UI:

1. Read `features/DESIGN_SYSTEM.md` for the rules of composition, type pairing, and the gold accent.
2. Read `src/design-system/index.ts` to see what's available.
3. Compose screens from `@/design-system` exports. Do not import `Text` or styling primitives from `react-native` for visual purposes.
4. Never hardcode colors, font families, font sizes, spacing, radii, or shadows outside `src/design-system/tokens/`. If a value you need doesn't exist as a token, add it to the appropriate token file first.
5. Never recreate an existing component with different inline styling — extend it with a variant or prop.

When `DESIGN_SYSTEM.md` and existing code conflict, treat the document as authoritative for *intent* and the code as authoritative for *current values*; surface the conflict rather than silently picking one.
```
