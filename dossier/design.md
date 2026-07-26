---
name: Aria Bene Comune — Book-Derived Design System
description: Typographic and layout rules extracted directly from the printed thesis book "Aria Bene Comune: Reclaiming Data Sovereignty and the Means of Information Production in the Sacrifice Zone of Taranto" (Matteo Falcone, MA Information Design, Design Academy Eindhoven, 2025/2026), to guide the companion web dossier and its scrollytelling build.
source: Type_MatteoFalcone_AriaBeneComune.pdf (35 spreads / 68 printed pages, InDesign)
colors:
  ink: "#231F20"
  paper: "#FFFFFF"
  evidence: "#B23720"
typography:
  display:
    fontFamily: "'Epilogue', sans-serif"
    role: "titles, chapter headings, running heads, index/TOC entries' section names"
  body:
    fontFamily: "'Source Serif 4', serif"
    role: "body copy, footnotes, epigraphs/pull-quotes, page numbers, bibliography, chapter numerals"
---

# Design System: The Book

This file documents the visual rules of the actual printed thesis — not an interpretation of them. It's the reference we work from as the web dossier (`dossier/`) evolves into a full scrollytelling piece. Update it whenever we learn something new from the book, or deliberately decide to depart from it for the web.

## 1. Source

Sampled directly from `Type_MatteoFalcone_AriaBeneComune.pdf`: the cover, index, introduction, three chapter openers, body/footnote spreads, epigraph pages, and the bibliography. Colors below are pixel-sampled from the rendered pages, not guessed.

## 2. Colors

The book is almost aggressively restrained: black text on white paper, and exactly **one** accent color, used for exactly **one** purpose.

- **Ink** `#231F20` — near-black (not pure `#000`), all body text, headings, page numbers, footnotes.
- **Paper** `#FFFFFF` — pure white page ground. No off-white, no tint.
- **Evidence Red** `#B23720` — a burnt terracotta-red. Its *only* job in the whole book is epigraphs/pull-quote pages (standalone quotations from Calvino, Buzzati's film script, etc.) — full-page quotes set entirely in this color. It never appears in running body text, headers, footnotes, or as a highlight/underline. One color, one job, no exceptions.

This is close to — but more precise than — the `--evidence` red already used in the dossier site's CSS (`#C4401A`). **Action: tighten the site's accent to `#B23720` to match exactly.**

## 3. Typography

Two typefaces, strictly divided by role — never mixed within the same text element.

- **Epilogue** (sans-serif) — every title-level element: the cover title ("Aria Bene Comune"), the "Index" label, chapter titles ("The Territory of Extraction: Necropolitics and the Infrastructure of Sacrifice"), and section running heads. Regular/medium weight, no bold treatment observed — hierarchy comes from size, not weight.
- **Source Serif 4** (serif) — everything you actually *read*: body paragraphs, footnote text, epigraph quotes, bibliography entries, page numbers, and — notably — the small chapter numeral ("1.", "2.") that sits beside a chapter title is set in the serif, not the sans, even though the title next to it is sans. The serif carries old-style figures and a genuine italic (used for cited book/report titles inline, e.g. *Necropolitics*, *Capital*).

No third typeface anywhere — no monospace, no display/script face. The cover subtitle and every chapter title share the same size logic (large, tight leading, sans); the reading experience is 100% serif.

### Named rule: The Two-Voice Rule
Sans = navigation/orientation (what section am I in). Serif = content (what am I actually reading). If we ever add a UI chrome element to the web version, ask which of the two jobs it's doing and use the matching typeface — never invent a third register.

## 4. Grid & Margins

- Page format: portrait, single column per page.
- The defining move: an oversized, asymmetric margin. Each page's text block sits toward the **right side of the page**, leaving a large, uninterrupted blank zone on the left/inner side. Across a spread, this produces one continuous quiet band of whitespace, not just a normal inner gutter.
- No visible grid lines, no rules, no boxes, no borders anywhere in the book. Structure is carried entirely by whitespace and type size — there is nothing to draw.
- Paragraphs are separated by a full blank line, never a first-line indent.
- Footnotes sit at the foot of the same page as their reference, small serif type, numeral flush left with a hanging indent for the citation.
- Page numbers: small serif numeral, centered at the bottom of each page.

### 4a. Exact numbers, measured from the source file

Section 4's description above was written from pixel-sampling the rendered PDF. Matteo then supplied the real `.indd`/`.idml` source, so these numbers are now measured directly from the InDesign geometry (page bounds, text frame `ItemTransform` + anchor points, `MarginPreference`, `Preferences.xml`) across all 35 spreads, not estimated from an image. Treat this subsection as the source of truth over anything above it that it contradicts.

- **Page size:** 396.85 × 595.28pt (≈ 140 × 210mm, A5).
- **Text column width is constant at 268.3pt (67.6% of page width) on every page** — the "narrow column" impression from the flattened PDF was really about which page in a spread is left blank (openers/epigraphs leave the verso blank), not a different, narrower column.
- **Recto (right-hand) pages** — where every chapter opener, epigraph, and the Introduction actually sit: left inset **105.8pt (26.65%)**, right inset **22.7pt (5.72%)**.
- **Verso (left-hand) pages** (regular running body copy only — never openers): left/outer inset **77.5pt (19.53%)**, right/inner inset **51.0pt (12.85%)**.
- These are genuinely asymmetric, not a mirrored inner/outer margin pair — confirmed consistent across ~40 sampled frames, not a one-off.
- **Baseline grid: 14.5pt increment** (`BaselineDivision="14.5"` in `Preferences.xml`).
- **Body type: 12pt, ~120% auto-leading** (≈14.4–14.5pt) — lands almost exactly on the baseline grid. Font is Source Serif (Variable).
- **Cover title:** Epilogue, 36pt, Regular weight, with a manual line break (not word-wrap) between "Aria Bene" and "Comune".
- **Cover subtitle:** Source Serif Variable, regular weight, solid ink black (`#231F20` — same as body, not a dimmed/gray tone), modest size with comfortable (not cramped) leading, broken across three manual lines ("Reclaiming Data Sovereignty and / the Means of Information Production / in the Sacrifice Zone of Taranto"). An initial pixel-measurement pass here mistakenly read the subtitle as much larger and tighter-leaded than it is — that measurement conflated the full ascender-to-descender ink band with cap-height. Matteo's direct screenshot of the actual cover corrected it; trust that over the earlier derived numbers.

### 4b. How this maps to the site

The web dossier is one continuous column, not alternating recto/verso spreads, so it uses the **recto ratio** (26.65% left / 5.72% right) as the single running margin — that's the ratio that governs every chapter-opener-equivalent moment in the book anyway. Implemented as two CSS custom properties in `index.css`:

```css
--gutter: clamp(16px, 5.7vw, 56px);   /* the 5.72% outer margin, used as the base on both sides */
--indent: clamp(0px, 20.9vw, 300px);  /* extra left-only amount, so gutter + indent ≈ 26.65% */
```

Body copy line-height was pulled from the book's loose-looking 1.65–1.75 (a misread from the rendered images) down to **1.4** everywhere, closer to the book's real 1.208 baseline-grid ratio — not identical, since 12pt/14.5pt reads as too tight on a lit screen at web sizes, but a deliberate move toward it rather than away from it.

### Named rule: The No-Rules Rule
No hairlines, no dividers, no boxes, no drop shadows, anywhere. Every separation in this book is whitespace or a type-size change. (This is a direct contradiction of the hairline/monospace "investigative dossier" treatment currently in `dossier/src/index.css` — see §6.)

## 5. Page Archetypes

**Cover.** Title in Epilogue, two short lines, large (dominates the upper third of the page). Long gap. Subtitle in Source Serif 4, three lines, moderate size, positioned roughly mid-page. Long gap. Footer credits in small sans, two columns (program/institution left, author/year right).

**Index / TOC.** "Index" as an Epilogue headline, top right of a spread. Entries below: page-range in Epilogue-ish small caps/numerals on the left (e.g. "13–28"), chapter title in Source Serif 4 to its right, generous vertical gap between entries. No leader dots, no rule lines.

**Chapter opener.** Chapter numeral ("1.") in serif, small, positioned at the far left edge of the text column — well outside where body paragraphs start, almost back into the blank margin. Chapter title in Epilogue, large (comparable to a big pull-quote), up to three lines, tight leading, regular weight. Body copy resumes well below, at normal size, after a large vertical gap.

**Epigraph / pull-quote page.** An entire page (sometimes a full spread) with nothing but a standalone quotation, set in Source Serif 4 italic-adjacent size (larger than body, ~1.5–1.8×), in the Evidence Red, aligned to the same right-hand column as everything else. Attribution in smaller type, same color, directly below with a visible gap — no rule line separating them.

**Body text.** Standard reading page: serif, justified, generous line-height, superscript footnote numerals inline, footnotes at the foot of the same page.

**Bibliography.** Two columns per spread, serif, hanging-indent style entries, alphabetical, no rule lines between entries — just paragraph spacing.

## 6. Translating to the Web — Status

The first `dossier/` build (dark "investigative field dossier" look: near-black ground, hairline borders, IBM Plex Mono case-file labels) was a starting guess made *before* seeing the actual book. On Matteo's instruction ("make it as similar as possible to the book, the website changes come later"), the site has since been restyled to match §1–5 directly:

- **Background/ink flipped to match the book:** white paper (`#FFFFFF`), near-black ink (`#231F20`) text. No more dark ground.
- **Monospace demoted to its one legitimate job:** IBM Plex Mono now appears only inside real `<code>`/terminal blocks (ESP32 sketch, shell commands) — a functional exception, not a decorative "case-file" register. All former mono labels (nav, stamps, table headers, evidence-card metadata) now use Epilogue, matching the book's Two-Voice Rule.
- **Hairlines/borders removed** from cards, callouts, tables, code blocks, nav, and section dividers. Structure now comes from whitespace and type-size shifts, per the No-Rules Rule. A couple of very light, low-opacity `--hairline` uses remain available in the CSS for cases where whitespace alone genuinely isn't enough (none currently used) — treat adding a new one as a decision, not a default.
- **Oversized asymmetric left margin implemented:** a shared `--gutter` + `--indent` pair pushes `.case-header`, `.section-marker`, `.dossier-col`, and the landing hero's title/subtitle into the book's right-hand column, leaving the same large quiet left band the book has. The chapter-opener numeral gets a small hanging outdent relative to its title, matching the book's "1." placement.
- **Accent tightened** to the sampled `#B23720` and pulled back to (mostly) one job: the lede/pull-quote color. It still shows up in a few interactive hover states (nav, buttons, code-copy) as a pragmatic website affordance — those are exactly the kind of "this needs to read as a website" exceptions still open for a later pass, not book-accurate choices.
- **Typefaces:** unchanged, already aligned (Epilogue display / Source Serif 4 body).

### Still deliberately website, not book (next pass)
- Sticky top nav, the two-"door" landing grid, the evidence-card photo grid, and button/link hover states have no equivalent in the book — they're kept functional and typographically quiet, but are the obvious candidates for the later "make it feel like a real website" pass once the script and images arrive.
- Code blocks keep a very light gray background (`#F4F2EE`) for legibility — the book has no code, so this is a pragmatic invention, not a sourced rule.

## 7. Do's and Don'ts

**Do:**
- Keep Epilogue strictly for titles/navigation, Source Serif 4 strictly for reading content.
- Let whitespace (especially the oversized left margin) carry structure before reaching for a rule or a box.
- Reserve the accent red for one job at a time — don't let it multitask as both "epigraph color" and "UI active state" without a deliberate reason.
- Keep chapter numerals in serif even when the adjacent title is sans — that pairing is a real, observed detail of the book, not a typo to "fix."

**Don't:**
- Don't introduce a third typeface.
- Don't add rule lines/borders as a default structuring device without checking this file first — the book's answer is almost always "more whitespace," not "add a line."
- Don't let the accent red creep into body text, navigation, or chrome — in the book it is exclusively the epigraph color.
