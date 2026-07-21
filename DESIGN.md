---
name: Aria Bene Comune
description: A community-owned air quality dashboard for Taranto, built like a warning from a neighbor, not a printout from a machine.
colors:
  ink: "#1A1A1A"
  paper: "#FAF8F7"
  ash: "#DDDAD3"
  ash-muted: "#9B9790"
  brick: "#B7410E"
  safe-green: "#77BF85"
  fair-green: "#318665"
  caution-amber: "#F0A500"
  poor-red: "#EA5154"
  very-poor-red: "#951635"
  danger-purple: "#7C2181"
typography:
  display:
    fontFamily: "'Ronzino Variable', sans-serif"
    fontSize: "clamp(64px, 14vw, 520px)"
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: "-0.02em"
    fontVariation: "'BLND' axis, 0-1000, driven live by today's AQI level (0-5 -> 0-1000)"
  headline:
    fontFamily: "Epilogue, sans-serif"
    fontSize: "23px-28px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Epilogue, sans-serif"
    fontSize: "16px-20px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Epilogue, sans-serif"
    fontSize: "12px-14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Epilogue, sans-serif"
    fontSize: "9px-11px"
    fontWeight: 700
    letterSpacing: "0.04em-0.12em"
rounded:
  none: "0px"
  card: "20px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  xxl: "100px"
components:
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 28px"
  nav-link-active:
    backgroundColor: "transparent"
    textColor: "{colors.brick}"
    typography: "{typography.label}"
  pollutant-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 6px"
  sensor-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  sensor-card-hover:
    backgroundColor: "{colors.ash}"
  map-glass-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.md} {spacing.lg}"
  symptom-glass-card:
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "{spacing.md} {spacing.lg}"
  footer-band:
    backgroundColor: "{colors.brick}"
    textColor: "{colors.paper}"
    padding: "{spacing.md} {spacing.lg}"
---

# Design System: Aria Bene Comune

## 1. Overview

**Creative North Star: "The Kitchen-Table Readout"**

This isn't a lab printout — it's a neighbor telling you the truth about the air outside, in words you don't need a degree to act on. Plain, warm language carries the page: a reading is never just a number, it's what to actually do about it. The precision is real and sits underneath — the six-step hazard scale, the WHO-anchored NO₂ thresholds, the worst-pollutant-wins logic — but it never gets to talk over the plain language on top of it. Square corners, an off-white paper ground instead of stark white, and a single restrained accent keep the frame quiet so the warmth in the words and the honesty in the color scale can carry the page.

What this explicitly is not: a corporate SaaS analytics product (no cheerful gradient cards, no generic "insights" chrome — this isn't being sold to anyone), and not a government or bureaucratic portal (it should never read as an official ARPA or comune site — the citizen ownership has to be legible in the feel, not just stated in a footer).

**Key Characteristics:**
- Off-white paper ground (#FAF8F7), never stark white — warm without tipping into "cream SaaS" territory
- One accent color (brick #B7410E) used sparingly — active states, hover, the footer band
- A separate six-step hazard scale (green → purple) does all the alarming; it never bleeds into the neutral palette
- Every corner is square (0px) *except* surfaces that lift off the page — floating map/symptoms filter chrome, symptom severity cards, home sensor cards — which share one "elevated card" treatment (20px radius, one shadow recipe); see Elevation
- Bilingual (IT/EN) from a single flag, not a bolted-on translation layer
- One expressive typeface (Ronzino Variable) reserved for exactly one line per page — everything else is Epilogue

## 2. Colors

A quiet, warm-neutral ground carries one restrained accent; a separate, plainly-named hazard scale does all the alarming, and it never touches the neutral palette's restraint.

### Primary
- **Brick** (#B7410E): the one accent color in the entire system — active nav states, hover, the footer band. It fills rarely; its rarity is the point.

### Neutral
- **Ink** (#1A1A1A): body text, default nav text on white pages
- **Paper** (#FAF8F7): the page ground — warm off-white, never pure #FFFFFF
- **Ash** (#DDDAD3): hover fills, dividers, disabled surfaces
- **Ash Muted** (#9B9790): secondary text — sub-labels, timestamps, captions

### Status Scale (semantic — never decorative)
- **Safe Green** (#77BF85): level 0, Buono/Good
- **Fair Green** (#318665): level 1, Sufficiente/Fair
- **Caution Amber** (#F0A500): level 2, Mediocre/Moderate
- **Poor Red** (#EA5154): level 3, Scarso/Poor
- **Very Poor Red** (#951635): level 4, Molto Scarso/Very Poor
- **Danger Purple** (#7C2181): level 5, Estremamente Scarso/Extremely Poor

### Named Rules
**The Worst-Pollutant Rule.** A sensor's color is always the single worst-scoring pollutant out of the eight tracked — pm2.5, pm10, no2, o3, so2, co, nh3, c6h6 — never an average. One bad pollutant can't hide behind seven good ones.

**The One-Accent Rule.** Brick is the only saturated color allowed outside the status scale. If a screen needs a second accent, the answer is a status color used correctly, not a new hue.

## 3. Typography

**Display Font:** Ronzino Variable (fallback: sans-serif) — reserved for exactly one line per page.
**Body/Label Font:** Epilogue (with `-apple-system, 'Segoe UI', sans-serif` fallback) — carries everything else, weights 400 through 900.

**Character:** Warm before precise. The body voice is plain-spoken Epilogue at regular weight — no serif pairing survives anywhere in the current build. Precision shows up only in the label tier: tracked, uppercase, instrument-adjacent, and confined to chrome (chips, filters, table headers) rather than to anything a resident actually reads as a sentence.

### Hierarchy
- **Display** (400, `clamp(64px, 14vw, 520px)`, 0.88 line-height): the home hero wordmark only. Its custom `BLND` variation axis is driven live by today's worst AQI level (0–5 maps to 0–1000) — the wordmark itself visibly distorts as the air gets worse.
- **Headline** (700, 23–28px, 1.2): page and section headers.
- **Title** (600, 16–20px, 1.3): card titles, popup headers, panel intros.
- **Body** (400, 12–14px, 1.5): nav links, card copy, table cells, form fields.
- **Label** (700, 9–11px, tracked 0.04–0.12em, uppercase): chips, filter labels, matrix headers — the only place the type carries instrument-panel precision.

### Named Rules
**The One-Word Rule.** Ronzino Variable appears exactly once per page — the hero wordmark. Every other character, from headlines to footnotes, is Epilogue. A second expressive typeface is never the answer to a page that feels flat; more weight contrast within Epilogue is.

## 4. Elevation

Flat by doctrine everywhere text and layout live — no shadow, no blur, depth conveyed through solid fills (ash hover states, the brick footer band) and hairline dividers. One inconsistency worth fixing rather than copying forward: the `--border` token is defined at zero alpha (`2px solid #11101000`) and is invisible everywhere it's referenced; every real divider in the app hardcodes `1px` or `2px solid` ash directly instead.

The one deliberate exception: surfaces that visually float above other content — the map's filter/sensor-list/detail-panel chrome (reused as-is for the Symptoms page's own filter panel), the symptom severity cards, and the home sensor cards — share a single **elevated card** treatment (`rounded.card`, 20px) instead of staying flat. This was introduced when the map moved to a real interactive basemap that needed its controls to read as floating above imagery, not printed on it; it then had to spread to every other "card that sits on top of a photo or a map" for the three to feel like one system instead of three separate experiments. It is still exactly one accent's worth of exception — everything else (nav, buttons, the archive table, form fields) stays flat.

### Named Rules
**The Flat-By-Default Rule.** No shadows anywhere text or layout chrome lives. Depth there is a solid fill or a hairline border, never a blur.

**The One-Elevation Rule.** Every surface that does get a shadow uses the exact same recipe (`rounded.card` + the shared elevated-card shadow) — never a one-off blur or radius tuned per component. If a fourth surface ever needs to float, it reuses this token pair rather than inventing a fourth set of numbers.

## 5. Components

Instrument-grade but warm: precise and legible like a dashboard gauge, but the chrome is never cold — rounded language, never rounded corners.

### Buttons / Nav Links
- **Shape:** square corners, always (0px)
- **Default:** transparent background, ink text, label typography, tracked uppercase
- **Active / Hover:** text shifts to brick; `transition: background 0.15s` — the one motion token used across the entire interface
- **On the home hero:** the topbar goes fully transparent and absolutely positioned so the sky photo reads to the very top edge; nav text flips to paper-white to stay legible over the photo. Everywhere else it's solid paper and sticky.

### Chips
- **Style:** bordered, square, paper background — pollutant name in ash-muted label type, value in bold ink
- **State:** the RecordPage pollutant grid is built from these; clicking one retargets the chart below it

### Cards
- **Corner Style:** square (0px) — the default for any card that sits directly on the paper ground
- **Background:** paper at rest, ash on hover
- **Shadow Strategy:** none — see Elevation
- **Border:** none by default; the sensor card relies on hover-fill contrast, not an outline

### Elevated Card (map filter chrome, symptom cards, home sensor cards)
- **Corner Style:** `rounded.card` (20px) — the one radius exception in the system, never tuned per component
- **Shadow:** one shared recipe everywhere it appears — `inset 0 -1px 0 rgba(0,0,0,0.05), 0 0 22px rgba(0,0,0,0.16), 0 6px 16px rgba(0,0,0,0.16)`. No border, no white/black hairline, no top highlight — earlier passes added an inset highlight and a specular edge line and both read as an unwanted stray border once shipped; the surviving recipe is deliberately just the shadow.
- **Background:** two material variants, same shape/shadow — *glass* (map filter chrome, backdrop-blurred, translucent warm-white, used for anything sitting over live map tiles or a photo) and *solid* (symptom cards keep their AQI status color, home sensor cards stay opaque paper) for content where the color itself is meaningful and blurring it would hurt legibility.
- **Buttons inside a glass panel** go fully pill-shaped (`border-radius: 999px`) — square everywhere else, but a glass surface reads as tactile chrome, not page content, so its buttons follow glass's own shape logic instead of the app's.

### Inputs / Fields
- **Style:** ash-bordered, square corners, paper background — used in the symptom-report form
- **Focus / Error:** not yet distinctly styled in the current build; worth defining explicitly in the next pass rather than inheriting browser defaults

### Navigation
- Topbar: three-zone flex row (logo / language toggle / nav links), transparent-and-absolute on Home, solid-and-sticky elsewhere
- Mobile: a fixed 56px bottom bar replaces the nav links under 900px; the topbar collapses to logo-only above it

### AQI Circle & Dot Grid (signature)
The home hero's pollution-level circle and the animated `HeroDots` grid are the most literal expression of the whole system: both are colored directly from today's worst AQI level, with no averaging and no override. Where every other component whispers the brand, these two say it outright.

## 6. Do's and Don'ts

### Do:
- **Do** let the six-step status scale be the only saturated color on any given screen — everything else stays ink, paper, ash, or brick.
- **Do** keep every corner square (0px) unless the surface is an elevated card, in which case it's always exactly `rounded.card` (20px) — never a third radius invented in between.
- **Do** pair every reading with what to actually do about it. A bare number is a failure state, not a finished screen.
- **Do** keep the WHO-vs-legal gap on screen, not filed under a footnote — it's a stated Design Principle, not a nice-to-have.
- **Do** write body copy plain and warm first; let precision live in the label tier and the status scale, not in the sentence structure.

### Don't:
- **Don't** build toward a corporate SaaS analytics look — no gradient cards, no generic "insights" chrome. This isn't a product being sold.
- **Don't** let it read as a government or bureaucratic portal — no official ARPA/comune feel. The citizen ownership has to be visible in the interface, not just claimed in a disclaimer.
- **Don't** average AQI levels across pollutants. The worst pollutant always wins.
- **Don't** add drop shadows or elevation to page/text/layout chrome — flat is the doctrine there. Elevated cards are the sole exception, and they all share one shadow recipe — don't tune a new one per component, and don't add a border or highlight line back onto them.
- **Don't** introduce a second expressive typeface. Ronzino stays reserved for the one hero line; every other hierarchy problem is solved with Epilogue's weight range.
