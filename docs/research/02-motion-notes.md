# Motion notes (measured from 30fps frame crops)

## 00:00–00:02 Intro: giant face → dot
- Full-screen green field with two giant black glyph "eyes" (font glyphs, not drawings).
- 0.43s: right eye swaps to "<" (wink) and both eyes tilt/shift; 0.83s back to "o o".
- 1.27→1.70s slow push-out (eyes shrink ~10%), then 1.73s snaps to a small green dot with "o o" face on black.
  → The character IS a colored circle + two text glyphs. Faces seen: "o o", "^ ^", "> <", "- -", "+ +", "* *", "<".

## 00:15 Speaker name — "dot-matrix resolve" (≈1.4s total)
1. 0.00–0.40s orange dots (r≈3px @720p) pop in left→right on a coarse grid sampled from the glyphs; a few stray dots
   lead the front.
2. 0.37–0.80s thin violet outline of each glyph traces in over the dots (left→right).
3. 0.83–1.40s glyphs fill solid violet left→right; dots shrink away right behind the fill front.
- Per-letter offset ≈ 40ms. Exit (00:30.23) = reverse: text breaks into dots that scatter and fade (~0.6s).

## 00:32 Stats bento
- Entire grid fades in at once in ≈0.25s (opacity + slight blur), no per-tile stagger.
- After entry each tile keeps a micro-loop (spiral galaxy rotating, sphere fading in, UI typing).
- Exit: ≈0.15s fade.

## 00:44–00:57 Quote-card cloud
- Tweet-like dark cards float at different depths; deeper = more blur + dimmer. Slow drift.
- Focus set: cards sharp + a "✓ label" pill top-left.
- Set change (≈0.5s): outgoing set drifts UP (~15% H) while blurring/fading, label fades first;
  incoming set rises from below, blurred → sharp. Cards move at different speeds (parallax).

## "쫀득" synthesis (research + measurement)
- Sources: Apple WWDC23 "Animate with springs" (duration+bounce model; bounce 0.15 brisk, 0.3 noticeable, >0.4 too
  much for UI), open-design.ai easing article (ease-out starts at ~3× average speed), mtmograph overshoot expression.
- Korean term not defined in sources; our working definition:
  1. **Fast attack, long sticky settle** – most of the distance in the first ~30% of time, then a long deceleration.
  2. **Small overshoot (3–6%) with one soft rebound** – spring bounce ≈ 0.25–0.32 (damping ratio ζ ≈ 0.68–0.75).
  3. **Jelly** – scaleX/scaleY on slightly different springs so shapes squash/stretch once as they land.
  4. **Overlap** – 40–70ms staggers; opacity finishes early (≈0.3s) while transform keeps settling.
  5. **Blur as motion blur** – 8–14px blur at start of fast moves, gone by 50% of the move.
- Spring math (Apple model, mass 1): stiffness = (2π/duration)², damping = 4π(1−bounce)/duration.

## 01:00–02:30
- 01:17–01:22 **Dot parade**: giant character circles (≈½ screen tall) zip across in 0.2–0.3s each with heavy
  directional smear + ghosting, rolling (face glyphs rotate). Last ones land cropped on the right/top edges.
- 01:26 "We build for **all of you**" + tiny crowd of colored dots.
- 01:30–01:34 **Particle logo**: multicolor particles swirl in and converge into the mark (~3s), hold, fade.
- 01:52 **Growing checklist card** on a diagonal star band: card fades from gray, items are appended one by one and
  the card height grows with each (chewy). 02:03 next card slides in from the right; previous card slides left and
  goes gray/dim.
- 02:07–02:19 ~~Dive into one word~~ — corrected: this is the broadcast camera zooming in on the presenter, not
  LED-wall content. Not reproduced.
- 02:26 Wordmark with iridescent sheen + cluster of 3D blob characters.

## 17:05–31:00 (sampled chunks)
- Section titles **type in character by character** (~20 chars/s), second line in violet→blue gradient. New title
  crossfades in while the old one dims.
- "Specialist dots": title appears centered, then **slides up** (chewy) as colored icon chips fade in one by one
  (row 1 then row 2). → FLIP layout shift.
- Pillars (Models / Building / Distribution): later only the focused pillar stays lit.
- Starfield has a few **large bokeh stars**; a **sun glow** sits on the left edge behind big model names.
- Exits **dim to gray first**, then fade (~0.4s); entries fade up from dim.
- "Ultrafast" hero word → **race compare**: two white cards, left (fast) finishes generating first.
- **Tier ladder**: "Pro 500" block centered → "200" appears lower-left and block shifts right → "100" lower still.
- Category icon row; each category is spotlighted in turn; cutaways show the category word flying across huge
  (kinetic type in the category color).
- Charts: line draws **slowly over ~20s** like a live trace over faint scatter; bar chart highlights the winning bar
  in blue (lower is better).
- Lockup "Product + icon" → fades → "in the cloud" lockup in the same place.
- Partner logos fade in left→right; big-number stats in green/violet/red.
