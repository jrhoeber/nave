# Initial setup prompt for Claude Code

After adding `DESIGN_SYSTEM.md` to your repo root and appending the snippet to your `CLAUDE.md`, paste the following into Claude Code as your first message. This is an extraction-and-consolidation task, not a from-scratch build — Claude Code will derive the system from your existing code.

---

```
I've added DESIGN_SYSTEM.md to the repo root and updated CLAUDE.md to reference it. Read both before doing anything else.

Your job is to extract a design system from the code that already exists, not to invent one. Concretely:

1. Audit my UI code. Identify the actual colors, font families, font sizes, weights, letter-spacing, spacing values, corner radii, and shadows currently in use. Look at every screen and shared component you can find — not just the ones I mention. Build an internal catalog of what's there.

2. Reconcile duplicates. Where the same role has multiple slightly different values (two near-blacks, two card paddings, two button styles that should be one), pick a single canonical value or pattern and note the conflict so I can confirm before you commit. Bias toward the version that appears most often or in the most polished screens (Profile, Edit Profile, parish detail).

3. Build src/design-system/ from what exists. Create:
     - tokens/ files (colors, typography, spacing, radii, shadows, plus a barrel index) populated with values extracted from the audit, named by ROLE per DESIGN_SYSTEM.md (e.g. background.canvas, accent.primary), not by hue.
     - components/ files for each component in DESIGN_SYSTEM.md, built from whichever existing implementation in the codebase is the strongest starting point. Where a component is described in the doc but doesn't exist in code yet, leave it as a documented stub with a clear contract; do not invent a full implementation.
     - index.ts barrel exporting tokens and components.

4. Configure the path alias '@/design-system' → 'src/design-system' in tsconfig.json and the Metro/Babel config if not already set up.

5. Validate by refactoring the Profile screen to use only design system primitives. Don't touch any other screens. The Profile screen should look identical to its current rendering after the refactor — if it doesn't, the tokens or components are wrong.

6. Reply with:
     - A summary of what you extracted (key tokens with their values, components consolidated, components stubbed).
     - Any conflicts you found and how you resolved them.
     - Any patterns in the existing code that DESIGN_SYSTEM.md doesn't describe — propose how they should be incorporated.
     - Any places where existing code violates the principles in DESIGN_SYSTEM.md (hardcoded colors, recreated components, serif/sans misuse, gold overuse) — list them but don't fix them yet.
     - A note confirming the Profile refactor renders identically.

Constraints:
  - Do not invent values, colors, type families, or accent colors that don't exist in my code.
  - Do not refactor screens beyond Profile in this pass.
  - Do not delete existing duplicate implementations until I've confirmed the consolidated version. Leave old files in place; the design system should import or re-export, not break callers.
  - Surface ambiguity as questions instead of guessing.
```

---

After this pass succeeds:

1. Review the conflicts and violations report. Decide on canonical values.
2. Migrate remaining screens one at a time — Parish, Community, Groups, Friends, Edit Profile — each as its own focused prompt.
3. Once all screens use `@/design-system`, delete the now-unused old implementations in a cleanup pass.

From that point on, every new feature is built directly from `@/design-system` and `DESIGN_SYSTEM.md` is updated whenever the system grows.
