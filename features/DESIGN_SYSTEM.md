# Nave Design System

This document is the source of truth for Nave's visual and component language. **Read this before building any UI.** All screens must be composed from the primitives and patterns described here.

> **Status:** This document describes the *target* system. The implementation lives under `src/design-system/` and is extracted from existing screens. If a component or token described here doesn't yet exist in code, it should be added the next time it's needed — derived from the existing app, not invented.

---

## Aesthetic identity

Nave is a Catholic social app. The design language is **warm, reverent, and architectural** — drawn from the visual vocabulary of basilicas: stone, ivory, candlelight gold, and classical type. It should feel calm and considered, never busy or trend-driven.

Three principles guide every design decision:

1. **Warmth over sterility.** A cream background, not pure white. Soft shadows, not hard borders. Rounded forms.
2. **Restraint with the accent.** The gold is used sparingly — for emphasis, not decoration. If everything is gold, nothing is.
3. **Type pairing carries the soul.** A bold modern sans handles UI and navigation. A classical serif appears in devotional and personal moments (scripture, profile names, reflective content). This split is intentional and meaningful — keep it.

---

## Tokens

All colors, spacing, typography, radii, and shadows live in `src/design-system/tokens/` and are exported through `@/design-system`. **Never hardcode these values in screens or components.** If you need a value that doesn't exist as a token, add it to the token file first, then use it.

### Color semantics

Tokens are named by **role**, not by hue. This keeps the system stable if values are tuned later.

- `background.canvas` — the warm cream behind everything
- `background.surface` — the white "paper" of cards and elevated content
- `background.tint` — soft cream-tinted fill used for icon tiles and subtle pills
- `text.primary` — near-black for headings and body
- `text.secondary` — muted slate for metadata, citations, and supporting copy
- `text.tertiary` — lighter slate for character counts and de-emphasized labels
- `accent.primary` — the muted gold; used for labels, underlines, rings, and selected accents
- `accent.muted` — a softer version of the gold for backgrounds and tinted fills
- `border.subtle` — very low-contrast divider for inside cards and between rows
- `interactive.primary` — near-black fill for primary buttons
- `interactive.primaryText` — white text on primary buttons

### Typography roles

Two type families. Use them by **role**, not by feel of the moment.

- **Sans (UI family)** — bold sans-serif. Used for: screen titles, buttons, body UI, navigation, form values, list items, anything functional.
- **Serif (devotional family)** — classical serif. Used for: scripture quotes, profile display names, reflective "About" content, and any moment that should feel personal or sacred.

Type variants are named by role:

- `display` — large screen titles ("Groups", "Friends", "St. Gregory the Great") — sans, bold
- `title` — card or section titles within a screen — sans, bold
- `body` — default reading text — sans, regular
- `bodyEmphasis` — bolded body for names and field values — sans, semibold
- `meta` — metadata, timestamps, citations — sans, regular, muted
- `label` — tracked-out small caps used for section headers and tags ("MASS SCHEDULE", "IDENTITY", "PARISH ANNOUNCEMENT") — sans, semibold, uppercase, letter-spaced
- `verse` — scripture and devotional quotes — serif, italic
- `nameDisplay` — profile display names — serif, regular
- `numberDisplay` — large stat numbers — sans, bold

### Spacing, radii, shadows

Spacing follows a small numeric scale (e.g. `xs`, `sm`, `md`, `lg`, `xl`, `2xl`). All padding, margins, and gaps must use these tokens.

Radii: cards use a generous rounded radius; pills and tabs use full radius; icon tiles use a smaller radius. Never use a raw pixel value.

Shadows: one subtle elevation token for cards. Avoid layering multiple shadows or harsh drops.

---

## Components

All components live in `src/design-system/components/` and are exported from `@/design-system`. Build screens by composing these — do not recreate their styling inline.

### Layout

- **`Screen`** — top-level wrapper. Applies the canvas background, safe area insets, and standard horizontal padding. Every screen starts with this.
- **`Card`** — white surface with rounded corners, soft shadow, and internal padding. The primary container for grouped content (mass schedule, post, profile section, form group).
- **`Stack` / `Inline`** — vertical and horizontal layout primitives that take a `gap` token. Replaces ad-hoc margin chains.

### Typography

- **`Text`** — single text component with a `variant` prop matching the typography roles above (`display`, `title`, `body`, `bodyEmphasis`, `meta`, `label`, `verse`, `nameDisplay`, `numberDisplay`). Use this everywhere. Do not import `Text` from `react-native` directly.
- **`SectionLabel`** — convenience wrapper for the tracked-caps label style. Used as card headers and section dividers ("MASS SCHEDULE", "ABOUT", "GROUPS AT ST. GREGORY THE GREAT"). May render with the gold accent or muted slate color depending on placement.
- **`Verse`** — scripture block with quote, citation, and optional CTA underneath. Used on the Groups and Friends tabs.

### Actions

- **`Button`** — pill-shaped. Variants: `primary` (dark fill, white text), `secondary` (white fill, thin border, dark text), and accepts an optional trailing icon.
- **`UnderlineLink`** — text + optional arrow icon with the signature gold underline. Used for inline CTAs ("Change parish →", "Find friends →", "Join", "+ New post"). This is a core Nave pattern — use it instead of plain text links.
- **`IconButton`** — circular button for utility actions (info, more, back, camera overlay on avatars).

### Content

- **`Avatar`** — circular image. Variants for plain and **gold-ringed** (used for the profile owner). Accepts an optional camera-overlay button for editable avatars.
- **`InitialsAvatar`** — colored circle with initials, used when no image is set (e.g., "GM" for Group Magoop).
- **`Tag`** — pill with tracked-caps text and optional leading icon. Used for "PARISH ANNOUNCEMENT" and similar markers. Tinted background, gold text.
- **`StatGroup`** — horizontal row of stats with thin dividers between, gold tracked-caps label above each number. Used on the profile.
- **`FieldRow`** — labeled input/display row with a tinted icon tile on the left, label in tracked caps above, value in bold below, optional character counter bottom-right. Used throughout Edit Profile.
- **`ListRow`** — avatar/image on the left, title + subtitle in the middle, action on the right (used for the Groups list).
- **`PostCard`** — community post layout: avatar, name, timestamp, optional tag pill, body, and reaction row (heart, comment).
- **`EmptyState`** — card with serif title, supporting copy, and a primary action. Used on the Friends tab.

### Navigation & chrome

- **`TabBar`** — bottom navigation with icon + label. Active state uses near-black, inactive uses muted slate. Profile tab's icon is the user's avatar with a thin ring when active.
- **`ScreenHeader`** — top-of-screen header with optional back button, centered title, and trailing action ("Save", "Done"). Used on modal and detail screens.
- **`HeroHeader`** — full-bleed image header with a gradient/overlay and title text laid over the bottom. Used on the Parish screen.

---

## Patterns and conventions

These are the rules of composition. Follow them so screens feel like they belong to the same app.

### Screen structure

Every screen follows this order:

1. `Screen` wrapper
2. Either a `ScreenHeader`, a `HeroHeader`, or a large `display` title at the top of the content
3. Optional `Verse` block under the title (used on tab roots like Groups and Friends)
4. Content composed of `Card`s separated by spacing tokens
5. Section breaks introduced by a `SectionLabel` *outside* and above the relevant `Card`(s)

### Section labels

Tracked-caps section labels are used in two places:

- **Outside cards**, above a group of cards, in muted gold ("GROUPS AT ST. GREGORY THE GREAT", "IDENTITY", "ABOUT")
- **Inside cards**, as the card's own header, in muted slate ("MASS SCHEDULE", "WEBSITE")

Both use the `label` typography variant. Use the `color` prop on `SectionLabel` to switch between them.

### Calls to action

Nave has three CTA tiers — pick the right one:

1. **`UnderlineLink`** — the default. Inline, low-weight, gold underline. Use for most navigation and actions ("Change parish", "Find friends", "Join", "+ New post").
2. **`Button` variant `secondary`** — when the action deserves a dedicated tap target but isn't the primary thing on the screen ("Edit Profile").
3. **`Button` variant `primary`** — reserved for the *one* most important action on a screen, typically inside an `EmptyState` or at the end of a flow.

If a screen has more than one primary button visible at once, something is wrong.

### Type pairing

The serif is meaningful. Use it only for:

- Scripture and verse content (`Verse` component, `verse` variant)
- Profile display names (`nameDisplay` variant)
- Reflective personal content like the "About" quote on a profile

Everything else — screen titles, buttons, body, metadata, navigation — uses the sans family. Do not introduce serif into UI chrome.

### Gold accent

The gold is a seasoning, not a base. Acceptable uses:

- Underlines beneath `UnderlineLink` text and arrows
- Section labels above grouped cards
- The ring around a profile-owner's avatar
- Tag text and tag icons
- Stat group labels
- Small accent dates ("EST. 1958")
- Decorative dividers (the short gold line under @username on profile)

Do not use gold for: body text, primary buttons, large surfaces, icons in the tab bar, or borders that aren't intentionally decorative.

### Cards on cream

The two-tone separation between the cream canvas and white card surface is a core part of Nave's visual identity. Resist the urge to put cards on white screens or remove cards in favor of dividers. When in doubt: card on cream.

### Empty states

Empty states are not afterthoughts. They use a `Card` with a serif title, a supporting line of body copy, and a single primary `Button`. See the Friends tab for the canonical example.

---

## What not to do

- Don't import `Text`, `View` styling, or color values directly from `react-native` for visual purposes — use design system primitives.
- Don't hardcode hex colors, font families, font sizes, spacing values, radii, or shadow values anywhere outside `src/design-system/tokens/`.
- Don't introduce a third type family.
- Don't add new accent colors. If a feature seems to need one, raise it as a design question first.
- Don't use the serif for buttons, tabs, screen titles, or anything navigational.
- Don't put primary buttons and underline links side-by-side competing for the same action.
- Don't wrap one card inside another. If you need nested grouping, use `SectionLabel` + spacing.
- Don't recreate a component that already exists with slightly different styling. Extend the existing one with a variant prop.

---

## Adding to the system

When you need something the system doesn't have:

1. Check whether an existing component can be extended with a new variant or prop.
2. If a new component is genuinely needed, add it under `src/design-system/components/`, export it from `src/design-system/index.ts`, and document it in this file under the appropriate section.
3. If you need a new token, add it to the relevant file in `src/design-system/tokens/` first, then use the token — never the raw value.
4. Update this document in the same change.
