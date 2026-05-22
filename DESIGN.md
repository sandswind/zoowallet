---
tokens:
  colors:
    # ── Brand palette (MongoDB)
    forest:       "#001E2B"   # canvas / deepest background
    midnight:     "#023430"   # card / elevated surface
    canopy:       "#00684A"   # medium green, borders, secondary actions
    neon:         "#00ED64"   # primary brand accent — electric leaf green
    sky:          "#016BF8"   # links, info states
    # ── Neutrals
    white:        "#FFFFFF"
    fog:          "#F9FBFA"   # near-white text on dark
    slate:        "#89989B"   # secondary / muted text
    ash:          "#3D4F58"   # subtle borders on dark surfaces
    coal:         "#1C2D38"   # hover surface, slightly lighter than forest
    # ── Semantic
    success:      "#00ED64"   # same as neon — affirmative
    warning:      "#FFC010"   # amber / caution
    danger:       "#EF4444"   # error / destructive
    info:         "#016BF8"   # sky blue
    # ── Overlay / scrim
    scrim:        "rgba(0,30,43,0.72)"

  typography:
    fontFamily:   "'Euclid Circular A', 'Inter', system-ui, sans-serif"
    fontMono:     "'JetBrains Mono', 'Fira Code', monospace"
    scale:
      display:    { size: "28px", weight: "700", lineHeight: "1.2", letterSpacing: "-0.02em" }
      h1:         { size: "22px", weight: "700", lineHeight: "1.25", letterSpacing: "-0.015em" }
      h2:         { size: "18px", weight: "600", lineHeight: "1.3",  letterSpacing: "-0.01em" }
      h3:         { size: "15px", weight: "600", lineHeight: "1.4" }
      body:       { size: "14px", weight: "400", lineHeight: "1.5" }
      bodySmall:  { size: "13px", weight: "400", lineHeight: "1.45" }
      caption:    { size: "11px", weight: "500", lineHeight: "1.4",  letterSpacing: "0.04em", textTransform: "uppercase" }
      mono:       { size: "12px", weight: "400", lineHeight: "1.6",  fontFamily: "mono" }

  spacing:
    unit:  "4px"
    scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]
    # Usage: space-1=4px, space-2=8px, … space-8=32px

  radius:
    none:   "0px"
    sm:     "6px"
    md:     "10px"
    lg:     "14px"
    xl:     "20px"
    full:   "9999px"

  shadows:
    card:   "0 1px 4px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,104,74,0.18)"
    raised: "0 4px 16px rgba(0,0,0,0.4)"
    glow:   "0 0 0 3px rgba(0,237,100,0.25)"   # focus ring / neon glow

  borders:
    subtle:  "1px solid rgba(0,104,74,0.28)"
    default: "1px solid rgba(0,104,74,0.45)"
    strong:  "1px solid #00684A"
    accent:  "1px solid #00ED64"

  motion:
    duration: { fast: "120ms", base: "200ms", slow: "300ms" }
    easing:   { default: "cubic-bezier(0.2,0,0,1)", spring: "cubic-bezier(0.34,1.56,0.64,1)" }
---

# ZooWallet — MongoDB-Inspired Design System

## Design Philosophy

ZooWallet's visual language is drawn from MongoDB's brand identity: a deep forest-floor darkness as canvas, punctuated by an electric neon-leaf green accent that feels both organic and technical. Every surface should evoke the density of a database and the growth of a forest.

**Core principles:**
1. **Depth over flatness** — layered surfaces using forest/midnight/coal create spatial hierarchy
2. **Green as life** — the neon `#00ED64` accent is reserved for primary actions, confirmations, and live data; never decorate with it
3. **Type-first clarity** — generous whitespace, clear typographic hierarchy, no visual clutter
4. **Purposeful motion** — micro-interactions confirm actions; 200ms base, spring easing for reveals
5. **Terminal precision** — monospace for addresses, hashes, hex values; clear delineation between data and chrome

---

## Color Usage Rules

| Token       | Background | Text | Border | Usage |
|-------------|-----------|------|--------|-------|
| `forest`    | ✓ primary  | ✗   | ✗      | Page canvas, deepest layer |
| `midnight`  | ✓ card     | ✗   | ✗      | Cards, modal sheets, elevated panels |
| `coal`      | ✓ hover    | ✗   | ✗      | Hover states, secondary surfaces |
| `neon`      | ✓ CTA      | on dark | ✓ accent | Primary buttons, active states, success icons |
| `canopy`    | ✓ secondary | ✗  | ✓ border | Secondary actions, borders, tags |
| `sky`       | ✗          | ✓ link | ✗    | Links, external references, info |
| `fog`       | ✗          | ✓ primary | ✗ | Primary body text on dark backgrounds |
| `slate`     | ✗          | ✓ secondary | ✗ | Labels, captions, placeholder text |

**Never use neon as text color on light backgrounds. Never use forest as text.**

---

## Typography Rules

- **Headings**: Euclid Circular A Bold/SemiBold, tight tracking
- **Body**: Euclid Circular A Regular, 14px/1.5, `fog` color
- **Labels / captions**: ALL-CAPS, 11px, 0.04em letter-spacing, `slate` color
- **Addresses & hashes**: JetBrains Mono, 12px, `slate` → `fog` on hover
- **Numbers / amounts**: SemiBold, tight; use tabular numerals (`font-variant-numeric: tabular-nums`)

---

## Component Patterns

### Buttons
- **Primary**: `bg-neon text-forest font-semibold` — the only solid green button; high contrast
- **Secondary**: `bg-coal border-canopy/50 text-fog` — recessed, subtle border
- **Ghost**: `text-neon border-neon/30 hover:border-neon/70` — transparent, accent outline
- **Danger**: `bg-danger/10 border-danger/50 text-danger`
- Size: 36px (sm) / 42px (md) / 48px (lg); border-radius `md` (10px); px-4 py-2.5
- Loading state: spinner in neon color, label fades to 50%

### Inputs
- Background: `coal` (#1C2D38)
- Border default: `1px solid rgba(0,104,74,0.45)`
- Border focus: `1px solid #00ED64` + `box-shadow: 0 0 0 3px rgba(0,237,100,0.15)`
- Label: caption style (uppercase 11px slate)
- Error: danger border, `danger` error text below

### Cards / Panels
- Background: `midnight` (#023430)
- Border: `subtle` (`rgba(0,104,74,0.28)`)
- Border-radius: `xl` (20px) for main cards, `lg` (14px) for list items
- Padding: 20px (standard), 16px (compact)

### Navigation / Action Row
- 4 equal buttons below balance card: Send | Receive | History | Security
- Each: icon + label, 42px height, `coal` background, `canopy` border
- Active/hover: neon text, neon border bottom 2px

### Balance Display
- Large 3xl/bold amount in `fog`
- USD equivalent in `slate` below
- 24h change: `success` (↑) or `danger` (↓), with directional arrow glyph
- Hidden state: `●●●●●` in `ash`

### Modals (bottom sheet)
- Slides up from bottom with spring easing (300ms)
- Background: `midnight`; top border: `1px solid canopy`
- Title: h2; backdrop: `scrim`

### Address / Hash chips
- Background: `coal`; border: `subtle`; font-mono 12px; `slate` text
- Copy icon appears on hover; copied state turns neon

### Toast notifications
- Position: top-center, 12px from edge
- Variants: `neon` bg for success, `danger/10` for error, `coal` for info
- Border-radius: `full`; max-width 320px; slide-down + fade animation

---

## Icons

Use simple SVG line icons (1.5px stroke). Preferred icon style: **Lucide** or hand-crafted equivalents.
- Size: 16px (inline), 20px (action buttons), 24px (nav/feature)
- Color: inherits text color
- No fills except semantic icons (success checkmark → neon fill)

---

## Spacing System

Based on 4px unit. Common uses:
- Between label and input: `space-1` (4px)
- Between form fields: `space-4` (16px)
- Page horizontal padding: `space-4` (16px) mobile, `space-6` (24px) tablet
- Card internal padding: `space-5` (20px)
- Section gaps: `space-8` (32px)

---

## Animation Tokens

```css
--motion-fast:   120ms cubic-bezier(0.2, 0, 0, 1);
--motion-base:   200ms cubic-bezier(0.2, 0, 0, 1);
--motion-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

- Page transitions: fade (opacity 0→1, 200ms)
- Modal open: slide-up + fade, 300ms spring
- Button press: scale(0.97) on active, 120ms
- Balance update: brief `neon` glow pulse (1 cycle, 600ms)

---

## Accessibility

- All interactive elements: focus ring = `box-shadow: 0 0 0 3px rgba(0,237,100,0.35)`
- Color contrast: fog (#F9FBFA) on forest (#001E2B) = 15.8:1 ✓
- Neon (#00ED64) on forest (#001E2B) = 9.1:1 ✓ (passes AA large + AAA)
- Never rely on color alone to convey state — always pair with icon/text
- Touch targets: minimum 44px × 44px

---

## Writing / Copy Tone

- Concise, technical, trust-building — like developer documentation
- Confirmations use present tense: "Sent", not "Your transaction has been sent"
- Errors state what happened + what to do: "密码不正确 — 请重试"
- Labels: sentence case for descriptions, ALL-CAPS for field labels
