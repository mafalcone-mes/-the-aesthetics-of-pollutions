# The Aesthetics of Pollution — Field Dossier

A standalone companion site to the **Aria Bene Comune** dashboard. Where the dashboard shows live(-simulated) readings, this site explains the research behind the project and walks anyone through building their own sensor node.

Separate codebase on purpose — its visual language is a deliberate departure from the dashboard's warm "Kitchen-Table Readout" look, styled instead as a investigative field dossier (stark dark ground, monospace case-file labels, serif display type, a single red "evidence" accent), inspired by Forensic Architecture's site design.

## Structure

- **Landing** (`src/pages/Landing.jsx`) — case-file cover page, two entry points.
- **The Research** (`src/pages/Research.jsx`) — why the project exists, the WHO-vs-legal gap (with a real numbers table), the six-level scale, citizen-owned data framing.
- **Build the Sensor** (`src/pages/Guide.jsx`) — the full six-chapter build guide (components, breadboard basics, ESP32 wiring + firmware, Raspberry Pi server setup, calibration & troubleshooting, DIY enclosure), ported from the dashboard's existing About/guide page content.

Bilingual (IT/EN) via a `lang` state string, same pattern as the main dashboard.

## Running it

```bash
npm install
npm run dev       # dev server
npm run build     # production build -> dist/
npm run preview   # serve the dist/ build locally
```

## Content sources

All research/build content was ported from the live dashboard's existing `AboutPage.jsx` and `PRODUCT.md` — nothing here is invented; it's the same accurate, already-reviewed copy, restyled and reorganized into two focused sections instead of one long page.

## Known TODOs

- The nav's "Dashboard ↗" link points to `ariabenecomune.com` (from the main repo's `docs/CNAME`) — update if that changes.
- Component photos, wiring diagrams, and a few evidence photos were copied into `public/assets/` from the main repo's `public/assets/`. If those source images change, re-copy them here too (no shared asset pipeline between the two projects by design).
- No router library — page switching is a `page` state string in `App.jsx`, same convention as the main dashboard.
