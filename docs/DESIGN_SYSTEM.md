# Design System

The visual identity of the VA Learning Platform, and the reasoning behind it.

**Read this before changing anything in `src/styles/`.** The tokens are the output
of the decisions below. Editing a value without knowing which decision it serves
is how a design system turns into a pile of overrides.

**Status: M1 foundation.** Colour, type, space, radius, motion and elevation are
defined. Components exist as a demonstration of the tokens, not as a library. Nothing
here is final except the reasoning.

---

## 1. What this platform is not

This is a platform someone will read for an hour at a time, on a phone, possibly on a
cheap one, while also trying to remember what they were doing yesterday.

That single sentence decides most of the design.

It is **not** a SaaS dashboard. It is not a marketing site with a login form. It is
not a game with a streak counter bolted on. Those are different products with
different goals, and borrowing their visual language would make this one lie about
what it is.

**Explicitly rejected, and why.** These were considered and refused on purpose:

| Rejected                                     | Why                                                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A single-hue blue/indigo primary             | The default of every SaaS dashboard. A distinct product should not read as a generic one, and a blue primary also collides with the "in progress" state hue |
| Dark-mode-first "hacker" aesthetic           | Wrong audience and wrong task. This is study material, not a terminal                                                                                       |
| Glassmorphism, heavy gradients, glow effects | Decoration that costs contrast and legibility and communicates nothing about the learning                                                                   |
| A large hero section                         | There is no landing page to sell. The learner arrived to work                                                                                               |
| Gamified streaks, XP, confetti               | Mastery already means something honest; a points layer on top would not. See `AGENTS.md`                                                                    |
| Webfonts for visual distinction              | ~200 kB per visit on the connections this audience actually has, for a difference most readers cannot name                                                  |
| A component library (MUI, Chakra, shadcn)    | A system this project owns is cheaper than adopting and fighting someone else's, and every abstraction is a maintenance cost                                |
| A utility-first framework (Tailwind)         | Considered. At M1 there are about a dozen components; a utility class in JSX should be readable on its own                                                  |

The result is deliberately quieter than most of what it is compared to. That is the
point, not a failure of ambition.

## 2. The four principles

Everything else follows from these.

### 2.1 Colour is never the only signal

A learner must never need to distinguish two states by noticing a hue shift. Colour
blindness affects roughly 1 in 12 men; more importantly, colour-blindness is not the
only reason colour fails — glare, a bad screen in sunlight, a projector, a printed
screenshot in a forum answer.

So every state in this system is **colour plus text, or colour plus shape**:

- Progress bars carry a numeric label (`3 of 8`), not just a fill level.
- State badges include the state word (`Complete`, `In progress`), not just a colour.
- The roadmap stage indicator distinguishes complete from in-progress with a check
  glyph or a filled marker as well as a hue.
- Focus is a two-tone outline, so it survives any background it lands on.

This is not an accessibility afterthought. It is the primary design constraint.

### 2.2 Calm is a feature

Saturation is a budget, spent only where it carries meaning. The neutral ramp is
95% of the interface. Colour appears on: the brand accent (links, primary actions,
active nav), the five progression states, and focus.

Consequence: a dashboard with eleven coloured cards is a dashboard where nothing is
emphasised. Most surfaces here are greyscale, and that is what makes the coloured
elements read as information rather than decoration.

### 2.3 Density over decoration

A learner scanning a roadmap wants to see more of the structure per screen. Padding is
generous but the chrome is restrained: one border, one subtle shadow, no ornaments.
Elevation is communicated by a surface step and a hairline border — in dark mode,
almost entirely by the border, because shadows barely read on a dark surface.

### 2.4 Motion is a confirmation, not a performance

Transitions are 120 ms and under 180 ms, and they exist to confirm that something
happened. There is no entrance animation, no staggered reveal, no parallax. A learner
who has just opened a lesson should be reading it, not waiting for it.

Every duration is a token, and `prefers-reduced-motion: reduce` sets them all to `0ms`.
Honouring the preference is then a matter of reading a token rather than auditing
every transition in the codebase.

## 3. Colour

### 3.1 The palette

Raw values live in `src/styles/tokens.css` under two headings: **primitives** (ramps)
and **semantic** (roles). Only the semantic tokens are ever used outside that file.

- **Neutral ramp** — a single ramp, 0–950, with a very slight cool cast. Pure grey
  reads as unfinished; a faint blue cast reads as "screen". Used for every surface,
  border and text in both themes.
- **Brand ramp** — deep teal-cyan. Chosen over blue precisely because blue is the
  default of the genre, and because teal stays clearly distinguishable from the
  complete-state green. A primary that looks like a status colour is a bug.
- **Five state ramps** — one hue per progression state, closed set. Nothing else may
  use them.

### 3.2 The five states

These map to the five progression states the domain layer already models, and to
`roadmap.outcomes[].evidence` semantics. They are assigned by a `data-state`
attribute, so a component styles itself from `--state-*` without knowing the theme.

| State         | Hue        | Means                                                             |
| ------------- | ---------- | ----------------------------------------------------------------- |
| `complete`    | green      | Demonstrated, with evidence                                       |
| `in-progress` | blue       | Started, not finished                                             |
| `available`   | neutral    | Reachable now, no special claim                                   |
| `recommended` | violet     | A good next step — advisory, never a lock                         |
| `locked`      | muted grey | Gated, with a stated reason. Clickable, never a dead end (see D5) |

`locked` is muted rather than red on purpose. It is a soft gate with an explanation,
not an error.

### 3.3 Contrast

Every text/background pair meets WCAG AA, and body text meets it with margin.

**These numbers are not estimates.** They are computed from the token values by
`npm run check:contrast`, which fails the build if any pair drops below its required
level. If you change a colour, that script is what tells you whether this table is
still true.

| Pair                               | Light   | Dark    | Required       |
| ---------------------------------- | ------- | ------- | -------------- |
| `text-primary` on `surface`        | 18.1    | 16.6    | 4.5 (AAA)      |
| `text-secondary` on `surface`      | 10.0    | 11.5    | 4.5 (AAA)      |
| `text-muted` on `surface`          | 6.8     | 7.3     | 4.5 (AA)       |
| `text-primary` on `canvas`         | 17.2    | 17.8    | 4.5 (AAA)      |
| `text-muted` on `surface-inset`    | 6.1     | 7.6     | 4.5 (AA)       |
| `text-on-brand` on `accent-fill`   | 7.3     | 10.0    | 4.5 (AA)       |
| `accent-text` on `surface` (links) | 7.3     | 9.4     | 4.5 (AA)       |
| `focus-ring` on `surface`          | 3.4     | 9.4     | 3.0 (non-text) |
| `focus-ring` on `canvas`           | 3.2     | 10.0    | 3.0 (non-text) |
| state chip text on chip background | 5.0–7.2 | 8.9–9.5 | 4.5 (AA)       |

Notes on the deliberate asymmetries:

- `text-muted` is the lightest permitted body colour. The temptation is to go
  lighter for "secondary metadata"; metadata is still content, so it does not get a
  lower bar.
- The brand fill is `brand-700`, not `brand-500`. `brand-500` is kept for large text
  and non-text indicators only. In dark mode the ramp is walked **up** rather than
  down, because a dark teal on a dark surface fails contrast.
- **State chips have a dark-theme ramp of their own.** The light soft variants are
  94–96% lightness pastels, which would be a glare source on an 18% surface. In dark
  mode the soft variant becomes a dark tint of the same hue and the foreground a
  light tint. Contrast _improves_ in dark mode (5.0–7.2 becomes 8.9–9.5) because the
  chips are darker, which is the opposite of the usual pattern and is intentional.

### A note on how these were computed

The first run of `check:contrast` reported 23 failures. All 23 were bugs in the
checker, not in the palette:

1. WCAG relative luminance is defined on **linear** light. The script was
   gamma-encoding the channels first, which reported a known-good 10:1 pair as
   3.2:1.
2. The dark-theme lookup did not fall back to the `:root` primitives, so every
   dark lookup of `--brand-*` and `--state-*` reported "not found".

Both are the kind of error that produces confident, plausible, wrong numbers — which
is precisely why the check is code rather than a claim, and why the ratios above are
copied from its output.

**When you add a colour, verify its contrast rather than assuming.** That is why the
ratios are recorded here — the next person should not have to re-derive them.

### 3.4 Both themes from day one

Dark is a designed theme, not an inverted one:

- Surfaces get **lighter** as they come forward, not darker. Pure black causes
  halation on OLED and makes long reading harder.
- Elevation is carried by a border plus a surface step, because shadows are nearly
  invisible on dark surfaces.
- `color-scheme` is set per theme, so form controls and scrollbars follow.

The mechanism is a `data-theme` attribute on `<html>`, plus a `prefers-color-scheme`
media query for the default. A manual choice persists through the `StorageAdapter`
under its own key — never `localStorage` directly, because progress persistence goes
through the port and a theme preference must not be the thing that bypasses it.

## 4. Typography

A **system font stack**. Zero webfont bytes. This is a deliberate trade: the audience
includes people on mid-range phones and metered connections, and 200 kB of font per
visit is a real cost for a difference most readers cannot name.

Identity is carried by colour, space, weight and structure instead.

- **Scale:** 1.2 ratio, `clamp()`-fluid between 320 px and 1440 px. No media-query
  ladder for type, and a readable floor on a small screen.
- **Line length:** `--measure-prose: 68ch` for lesson prose, `--measure-tight: 46ch`
  for UI text. Defined now so the shell and the M2 content engine agree.
- **Headings:** `--weight-semibold`, tight leading, slight negative tracking.
- **Body:** `--leading-normal` (1.55). Long-form reading needs air; 1.5 is the
  threshold where paragraphs stop feeling dense.
- **`overflow-wrap: break-word`** is set globally. A content id or a long URL in a
  card must not force a horizontal scrollbar at 375 px.

## 5. Space, radius, elevation

- **Space:** a 4 px base. Named by size, not by role (`--space-4`), because the same
  step means different things in different layouts and role-named tokens get
  misremembered.
- **Layout:** `--layout-max-width: 76rem` with fluid gutters via
  `--layout-gutter: clamp(...)`. This is why there are no width breakpoints: a max
  width plus `padding-inline` adapts continuously from 320 px to ultrawide.
- **Radius:** 4 values. Cards and panels at `--radius-lg`, controls at `--radius-md`,
  chips at `--radius-full`, inline code at `--radius-sm`.
- **Elevation:** three levels, two-layer shadows (tight contact + soft ambient).
  `--shadow-md` is the default for cards; `--shadow-lg` for overlays only.

## 6. Responsive strategy

Breakpoints, where one is genuinely needed:

| Name | Width | Nav             |
| ---- | ----- | --------------- |
| `sm` | 30rem | (base)          |
| `md` | 48rem | Sidebar appears |
| `lg` | 64rem | Wider gutters   |

Everything else is fluid. The layout adapts by `clamp()`, `min()`/`max()`, flex and
grid wrapping, so 375 → 1440 needs no per-breakpoint CSS.

The nav is the one place a breakpoint earns its cost, because the choice is
structural: a horizontal bar that fits at 768 px and a sidebar at 1024 px are
genuinely different layouts, not the same layout at two sizes.

## 7. Accessibility commitments

These are requirements, not aspirations. A change that breaks one is a bug.

1. **Semantic HTML first.** A `<button>` that navigates is a bug; it is an `<a>`. A
   `<div onClick>` is always a bug.
2. **Visible focus everywhere.** One focus treatment, `:focus-visible`, two-tone so
   it survives any background. Never `outline: none` without a replacement.
3. **Heading hierarchy is real.** One `<h1>` per page, no level skipped. A page's
   structure should make sense as an outline.
4. **Skip link.** First focusable element on every page.
5. **Landmarks.** `header`/`nav`/`main`/`footer`, `main` focusable for skip-link
   targets, nav labelled.
6. **Colour is never the only signal.** See §2.1.
7. **Reduced motion honoured** via tokens, not per-component exceptions.
8. **Touch targets ≥ 44×44 px** on all interactive elements. Enforced on nav links
   and buttons, which is where it actually matters.
9. **Forced-colours mode supported.** The focus ring switches to `Highlight` and
   anything relying on a background to convey state gets a system colour.
10. **Icons are decorative unless they carry meaning.** An icon next to a text label
    is `aria-hidden`; an icon-only control has an accessible name.

## 8. Component conventions

- **One component per file, colocated CSS.** `Button.tsx` + `Button.css`. CSS is
  colocated rather than in a global sheet so a component can be read in one place and
  deleted in one place.
- **CSS Modules.** Class names are scoped, which is why they can stay plain and
  readable instead of becoming `Button_root__2xKq`.
- **Class naming:** `block__element--modifier`.
- **A component renders one thing.** If a component needs a `variant` prop with four
  options, that is usually four components.
- **Variants over configuration.** A `size` prop is fine; a `padding` prop is not.
- **Props are typed unions**, so an invalid combination is a compile error.
- **No business logic in components.** A component receives data and renders it.
  Computation belongs in `src/domain/`, and data access in `src/app/`.

## 9. Adding to the system

The bar for adding a token or a component:

**A token** earns its place if at least two components need the same value and the
value is a real decision rather than an accident. If a value appears once, it is not a
token — use it directly and see whether it recurs.

**A component** earns its place if it is used by more than one feature. A component
used by exactly one feature lives in that feature's folder, per `ARCHITECTURE.md`. The
shared set is intentionally small: `Button`, `Card`, `Badge`, `Callout`,
`ProgressBar`, `Breadcrumbs`, `EmptyState`, plus the layout shell.

The test for both: _could this be expressed by combining what already exists?_ If yes,
it should be.

## 10. Known gaps at M1

Honest list, so nothing here is mistaken for settled:

- **No dark-mode toggle in the shell yet.** The tokens and the `data-theme` mechanism
  support it and the preference persists through the storage port, but the control
  itself is not in the M1 shell.
- **No focus-trap or dialog primitive.** The mobile nav needs one; it is not built, so
  the mobile nav is a non-modal disclosure rather than a trap.
- **Iconography is lucide-react, unmodified.** Every icon is `aria-hidden` unless it is
  the only content of a control. A bespoke icon set is a later decision, and it should
  be one.
- **The type scale is unvalidated with real lesson prose.** It is tuned against UI text
  and card copy. M2 brings the long-form content that will prove or break it.
- **Contrast is verified from token values, not from rendered pixels.** The check
  resolves `oklch()` and computes WCAG ratios mathematically, which catches a bad
  token but not a bug in a component's CSS that puts a good token on an unintended
  background. Auditing rendered output is a worthwhile M2 task.
