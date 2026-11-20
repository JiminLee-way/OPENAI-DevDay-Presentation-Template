# Motion reference

## What "쫀득" means here

Measured from keynote footage and grounded in spring physics (Apple WWDC23 *Animate with springs*: duration +
bounce model; stiffness = (2π/duration)², damping ratio ζ = 1 − bounce):

1. **Fast attack, long sticky settle** — most of the distance is covered in the first ~30% of the time.
2. **Small overshoot, one soft rebound** — 3–6% (bounce 0.25–0.32, ζ ≈ 0.7). More than ~10% reads as "bouncy", not chewy.
3. **Jelly** — `pop` drives scaleX and scaleY with two springs of different periods, so shapes squash/stretch once as they land.
4. **Opacity is quick, transform is slow** — opacity is done in ~0.3 s while position keeps settling for ~1 s.
5. **Blur stands in for motion blur** — 10–14 px at the start of a move, gone by mid-move. Fast travel (`roll`, `fly`) also stretches along the direction of motion.
6. **Overlap** — siblings stagger 40–120 ms; exits start before entrances finish.

## Where chewy belongs (calibrated on 2:30–17:00 of the reference keynote)

- **Springy:** characters, titles, layout shifts (`data-flip`), carousels, rolling/flying objects.
- **Never springy:** UI mockups, screenshots, logos/app icons, content that *replaces* other content.
  Those use `ui` (0.2 s fade + 4 px blur), `focus` (0.3 s blur-clear, no scale) or `fade` (0.4 s).
- Small things move little: `rise` distance scales with the element (12–56 px). Icon grids ≈ 12 px.
- Slide changes between UI slides are sequential, not overlapped: `data-transition="beat"`
  (0.35 s dim → 0.4 s dark → next fades in). Before a brand beat use `dip` (0.6 s to black, 0.53 s hold).
- Focus changes (nav, pillars) are brightness only: the new item lights in 150 ms, the old one dims 170 ms later over 250 ms.

## Spring presets (`StageDeck.SPRINGS`, `[duration s, bounce]`)

| name | params | overshoot | settle | use |
|---|---|---|---|---|
| `smooth` | .55, 0 | 0% | ~.6 s | fades, exits, anything that must not wobble |
| `snappy` | .42, .14 | ~1% | ~.6 s | small UI moves |
| `chewy` (default) | .62, .30 | ~4.6% | ~1.0 s | text, cards, FLIP moves |
| `soft` | .85, .16 | ~1% | ~1.1 s | large blurred cards, focus pulls |
| `bouncy` | .60, .46 | ~13% | ~1.4 s | playful characters only |
| `heavy` | 1.0, .20 | ~2% | ~1.4 s | big objects, camera-like moves |
| `jellyX`/`jellyY` | .50/.64, .38 | ~8% | ~1.1 s | `pop` squash & stretch |

Per element: `data-spring="soft"` or `data-spring="[0.7,0.25]"` is not supported — use a preset name.
CSS gets the same curves as variables: `var(--sd-ease-chewy)` (a `linear()` easing) + `var(--sd-dur-chewy)`.

## `data-anim` effects

| value | does | notes |
|---|---|---|
| `rise` | up 64 px + blur → sharp | default for anything. `data-dist` |
| `drop` / `left` / `right` | same from above / left / right | `data-dist` |
| `zoom` | scale .82 → 1 | hero words, logos, tiles |
| `pop` | jelly scale 0 → 1 | dots, icons, chips, badges. `data-from` (start scale) |
| `blur` | focus pull: blurred + 7% larger → sharp | cards, screenshots, photos |
| `fade` | opacity only, 0.4 s | logos, app icons, brand beats |
| `glow` | dim gray → bright | statement lines |
| `mask` | each line slides up through a mask | lines = `<br>`-separated or one child element per line. `data-line-stagger` |
| `typein` | character typing, gradients stay intact | `data-cps` (18 Latin / 12 Hangul default) |
| `words` | word-by-word rise | quotes. `data-word-stagger` |
| `type` | typewriter with caret (plain text only) | prompts, UI text. `data-cps` |
| `count` | number counts up (keeps prefix/suffix/commas/decimals) | `data-duration` |
| `dots` | dot-matrix → outline → fill (speaker names) | single line, ≤ 30 chars. `--dot-color` CSS var |
| `assemble` | multicolor particles swirl into the shape | child `<svg>`/`<img>` (same-origin) or text. `data-colors`, `data-density`, `data-duration`, `data-from="center"` (born from a point) |
| `roll` | rolls in from offset with motion smear | `data-from-x/-y`; add `data-to-x/-y` + `data-duration` to pass through |
| `fly` | kinetic word flies in with smear, then drifts | `data-from="left"`, `data-dist`, `data-drift` |
| `zoomout` | giant (×22) → normal; winks first | `.sd-dot` intro. `data-from`, `data-hold` |
| `grow` | height 0 → auto (pushes the container) | list items in growing cards |
| `draw` | strokes SVG paths | any inline SVG illustration |
| `chart` | builds + animates `.sd-chart` | see layouts.md |
| `race` | progress bar + timer, media sharpens at finish | `.sd-race[data-time]` |
| `kenburns` | slow push on photos | |
| `ui` | 0.2 s fade + 4 px blur, no movement | anything inside a UI mockup |
| `focus` | blur 10 → 0 with opacity, no scale | screenshots, windows, app icons |
| `bokeh` | soft disc collapses to a point, letters resolve outward with a color split | film titles. `data-seed` = index of the first letter |
| `chat` | children appear at `data-at` ms, `data-hide-at` removes them (typing dots); older bubbles slide up | `.sd-chat` |
| `tick` | live counter, `data-format="Working · {n}s"`, `data-from` | status pills |
| `settle` | lands 16% too close and eases back (heavy) | camera-like arrivals |

Timing attributes: `data-delay="ms"` on any element; on a parent `data-anim-children="rise"` assigns an effect to
every child and `data-stagger="ms"` spaces them (parent `data-delay` offsets the group).

## Steps (builds the speaker clicks through)

| attribute | behavior |
|---|---|
| `data-step="n"` | hidden until step n; its children's `data-anim` play when it appears |
| `data-collapse` | with `data-step`/`data-until`: takes no space while hidden (so others can move) |
| `data-flip` | element animates (chewy) to its new layout position whenever a step changes layout |
| `data-until="n"` | visible until step n, then fades out (in-place replacement) |
| `data-focus-group` + `data-focus="n m"` | item is highlighted at listed steps; siblings dim |
| `data-done="n"` | adds `.is-done` at step n (checklists tick) |
| `data-step-class="n:class"` | adds a class at step n (custom state) |
| `data-autotick="ms"` on a list | ticks items one by one after entering |
| `data-scroll-step="n"` | tall content scrolls inside its frame at step n (motion blur), `data-to`, `data-duration` |
| `.sd-cam[data-cam="0:50% 50% 1 \| 1:14% 9% 2.4"]` | camera inside a frame: at step n center that point at that zoom (heavy spring, blur mid-move) |
| `.sd-swap > [data-focus]` | frame stays put, content crossfades 250 ms on focus change |
| `data-keep="id"` | same id on consecutive slides = element stays perfectly still across the slide change |
| `data-exit="smear"` | on leaving, letters fade right→left 70 ms apart with a horizontal smear |
| `data-stagger-order="random"` (on a parent) | stagger children in shuffled order |
| `.sd-cloud` sets / `.sd-carousel` items | each step advances one set / card |

## Slide attributes

| attribute | values |
|---|---|
| `data-bg` | space-separated: `stars`, `warp`, `glow-left`, `horizon`, `top`, `white`, `black` |
| `data-transition` (exit of this slide) | `fade` (default, 0.32 s dim-to-gray), `beat` (dim, dark gap, then next), `dip` (to black + hold), `push`, `zoom`, `cut`, `dive` (+ `data-origin`) |
| `data-enter-delay` | ms before this slide's entrance starts (default 160) |

## JS API

`StageDeck.go(slideNumber, step)`, `.next()`, `.prev()`, `.spring(duration, bounce)` → `{f(t), T}`,
`.play(el, t => cssObject, T, {delay, keep})`, `.FX.myEffect = (el, opts) => …` to register a custom effect.
