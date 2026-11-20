---
name: stagedeck
description: "Build DevDay-style keynote decks as one HTML file: dark LED-wall look, spring motion, dot-matrix names, bento stats, live charts. For presentations, slides, 발표자료, PPT."
license: MIT
---

# StageDeck

StageDeck turns an outline into a 1920×1080 HTML keynote that plays in any browser (arrow keys / click / swipe).
The look is a big-stage LED wall: one idea per slide, huge type, a few accent colors, and motion that
**arrives fast and settles slowly with a small overshoot** (the "쫀득" feel) — but only where it belongs.
All motion is built into the engine; you write HTML with a few `data-` attributes.

**Paths.** `<skill-dir>` below means the folder that contains this SKILL.md
(Claude Code: `${CLAUDE_SKILL_DIR}`; Codex lists the path next to the skill). Run scripts with that prefix.

## The reference HTML — read it before writing any slide

`<skill-dir>/examples/showcase.html` is the visual and motion source of truth: 38 numbered slides, one per
pattern, built with the same engine you will use. Treat it as the style guide and the component library.

1. Pick archetypes in `<skill-dir>/reference/layouts.md` (each row names its showcase slide number).
2. Open `examples/showcase.html`, search for the numbered comment (e.g. `<!-- 16. CATEGORY ICONS`) and **copy that
   `<section>` verbatim**, then change only the content (text, numbers, images). Keep its classes and `data-`
   attributes — that is where the timing lives.
3. Do not invent new class names or inline animation CSS when a showcase pattern exists. If no pattern fits,
   compose from the showcase's primitives (`l-split`, `stack`, `row`, `sd-card`, `sd-shot`, `sd-chip`, `sd-stat`).
4. When unsure how something looks or moves, view it: serve `<skill-dir>` with `python3 -m http.server` and open
   `/examples/showcase.html#16` (slide 16), or open the published demo if the user has one.

## Files

- `assets/stagedeck.css`, `assets/stagedeck.js` — the engine (no dependencies).
- `templates/starter.html` — minimal annotated deck; new decks start here.
- `examples/showcase.html` — the reference deck described above.
- `reference/layouts.md` — archetype catalog + snippets. `reference/motion.md` — every effect, attribute, preset.
- `scripts/new_deck.sh DIR "Title"` — scaffold a deck folder (assets + starter as `index.html`).
- `scripts/check_deck.py FILE` — lint (unknown effects, overlong titles, busy slides, step gaps).
- `scripts/bundle.py FILE -o OUT` — inline CSS+JS into one self-contained `.html`.

## Workflow

1. **Outline.** One message per slide; 15–40 slides for a 20–40 minute talk. Put what the speaker says in
   `<aside class="notes">` inside each slide, not on screen.
2. **Choose archetypes** (layouts.md). Vary rhythm: never three text-only slides in a row; alternate big-type slides
   with visual ones (bento, chart, phone, cards, collage).
3. **Scaffold:** `bash <skill-dir>/scripts/new_deck.sh <out-dir> "<Deck title>"`.
4. **Write slides** in `<out-dir>/index.html` by copying showcase sections (above) and replacing content.
5. **Lint:** `python3 <skill-dir>/scripts/check_deck.py <out-dir>/index.html` — fix every ERROR, most WARNs.
6. **Preview:** `cd <out-dir> && python3 -m http.server`, step through every slide and step, check overflow.
7. **Ship:** `python3 <skill-dir>/scripts/bundle.py <out-dir>/index.html -o <out-dir>/deck.html` → one file.
   PDF: print from Chrome (each slide = one 1920×1080 page in its final state).

## Content rules

- **One idea per slide.** Titles ≤ 6 words (Korean ≤ 14 characters per line). No paragraphs on screen.
- **Big type, few words:** `t-hero` one word · `t-display` name/product · `t-title` section · `t-h2` heading.
  `t-body` only as a caption under a visual.
- **Color means something.** Charcoal background, white text, one accent per slide. `hl` (blue) for the key phrase;
  green growth; orange build/energy; red warning/uptime; violet people/brand; cyan speed/data.
  `grad` only for a section title's second line or a product name.
- **Numbers get their own slide** and always `data-anim="count"`.
- **Real UI and photos beat icons.** Use `sd-shot`, `sd-window`, `sd-phone`, `sd-demo`; use `sd-placeholder` only
  while drafting and tell the user which image to drop in.
- **Names, logos, people:** only what the user provides. Never decorate with real companies' logos or trademarks,
  and never present the deck as made by an organization the user doesn't represent.
- Korean: `lang="ko"` on `<html>`; break long titles with `<br>` or one `<span>` per line.

## Motion rules (calibrated on a real keynote)

- **Spring only where it belongs.** Characters, titles, layout shifts (`data-flip`), carousels, rolling/flying
  objects get the chewy spring. UI mockups, screenshots, logos and app icons never overshoot: use `ui`
  (0.2 s fade + 4 px blur), `focus` (blur-clear, no scale) or `fade` (0.4 s).
- **One hero motion per slide** (dots name, roll, assemble, fly, typein, chart, cloud, race, chat, bokeh);
  everything else `rise` / `mask` / `ui`.
- **Stagger siblings 40–120 ms** with `data-anim-children="rise" data-stagger="70"` on the parent.
- **Steps for what the speaker talks through** (`data-step="1"`); `data-collapse` + `data-flip` when a reveal should
  push existing content; `data-focus` for lists where one item lights up (brightness only, no movement).
- **Transitions:** default dim-to-gray fade; `beat` between UI slides; `dip` (to black) before a brand beat;
  `cut` for the intro and demo-layout switches. Reuse `data-bg` across a section so the wall doesn't flicker;
  `data-keep="id"` keeps a shared wordmark perfectly still across slides.
- The engine honors `prefers-reduced-motion`; never let motion carry meaning on its own.

## Presenting

→ / Space / click next · ← back · F fullscreen · O overview · C counter · R replay. `#7.2` = slide 7, step 2.

## Invoking

Claude Code: `/stagedeck:stagedeck` (plugin) or `/stagedeck` (personal skill). Codex: `$stagedeck`.
Both also pick it up automatically for presentation requests.

## When the user needs .pptx

The motion cannot survive PowerPoint. Say so, build the HTML deck for presenting, and offer the PDF export or a
separate .pptx build of the same outline.
