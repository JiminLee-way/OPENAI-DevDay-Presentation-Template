# Slide archetypes

Every archetype has a working example in `examples/showcase.html` — search for `<!-- N.` to find it.
The stage is a fixed 1920×1080 canvas; sizes in the snippets are canvas pixels.

| # | Archetype | Use it for | Signature motion | Key markup |
|---|---|---|---|---|
| 1 | Intro character | Cold open, brand moment | `zoomout` giant face → small dot | `.sd-dot[data-anim=zoomout]`, `data-bg="black"`, `data-transition="cut"` |
| 2 | Speaker name | Every speaker hand-off | `dots` (dot-matrix → outline → fill) | `h1.sd-name[data-anim=dots]` |
| 3 | Stats bento | Opening "state of the union", year in review | grid `blur` in + living tiles | `.sd-bento` 12-col grid, `.sd-tile c-N r-N`, `canvas.sd-spiral`, `.sd-orb` |
| 4 | Quote cloud | "You asked, we shipped", customer voice | depth-of-field sets, steps swap sets | `.sd-cloud > [data-set] > .sd-qcard[data-z]`, `.sd-cloud__label` |
| 5 | Section title | Chapter breaks | `typein` (or `mask`) | `.t-display`, line 2 `.grad` |
| 6 | Dot parade | Mission / audience moment | `roll` with motion smear | `.sd-dot[data-anim=roll][data-from-x]` (+ `data-to-x` to pass through) |
| 7 | Particle logo | Brand reveal, closing | `assemble` | `div[data-anim=assemble] > svg|img` (or text) |
| 8 | Checklist carousel | "What it can do for you" lists | `grow` items, carousel steps | `.sd-carousel > .sd-card > ul.sd-checklist`, `li[data-done]` |
| 9 | Wordmark + crew | Product name reveal | `zoom` + sheen | `.t-hero.sheen`, `.sd-dots-row` with `pop` |
| 10 | Title → chips | Categories, use cases, integrations | `glow` title + FLIP up, chips `rise` | title `data-flip`, chip row `data-step="1" data-collapse` |
| 11 | Plan pills | Availability, tiers, platforms | `rise` stagger | `.sd-pill` |
| 12 | Pillars | 3 strategic pillars, then focus each | `pop`, focus steps | `[data-focus-group] > [data-focus="n"]` |
| 13 | Hero word | One-word product/feature | `zoom` | `.t-hero`, `data-bg="stars glow-left"` |
| 14 | Race compare | Speed / quality A-vs-B | `race` cards | `.sd-card.sd-race[data-time]` |
| 15 | Tier ladder | Pricing tiers | FLIP staircase | `.sd-tiers`, lower tiers `data-step data-collapse`, main `data-flip` |
| 16 | Category icons | Capability dimensions | `pop`, focus steps | `.sd-icon.is-lg` + colored label |
| 17 | Kinetic word | Transition beat, emphasis | `fly` | `.sd-kinetic[data-anim=fly]` |
| 18 | Quote | Leadership quote, mission line | `words` | `blockquote.sd-quote` with `.hl` phrase, date above |
| 19 | Title + line chart | Growth, benchmark over time | `chart` slow draw | `.sd-chart[data-type=line][data-values][data-duration]` |
| 20 | Title + bar chart | Benchmarks, "lower is better" | `chart` bars | `.sd-chart[data-type=bar][data-highlight]` |
| 21 | Price table | Comparison table | `rise` rows | `table.sd-table`, best cells `.is-best` |
| 22 | Lockup swap | Product → sub-feature | `data-until` + `data-step` | `.sd-lockup` (icon + name) |
| 23 | Logo row | Partners, customers | `rise` stagger | `.sd-logo` (text or `<img>`; images are made white) |
| 24 | Big stats | Hard numbers | `count` | `.sd-stat[data-color] > .sd-stat__num[data-anim=count]` |
| 25 | Headline in collage | Scale / community | `blur` floats + `mask` | `.sd-float` absolutely placed images |
| 26 | Recap bento | Final recap of all announcements | `zoom` stagger | dense `.sd-bento`, `.sd-tile.is-accent` |
| 27 | Agenda | What's next / sessions | `rise` columns | `.sd-agenda > div[style="--c:…"]` |
| 28 | Film title | Opening a video, chapter card | `bokeh` in, `data-exit="smear"` out | `.t-hero.t-glowmark[data-anim=bokeh][data-seed]`, `data-bg="black"` |
| 29 | Wordmark + phone chat | Product moment with a conversation | `chat` thread | `.sd-phone > .sd-phone__body > .sd-chat[data-anim=chat] > .sd-msg[data-at]`; wordmark `data-keep` |
| 30 | Device hub | Integrations around a device | `ui` tiles, random stagger | `.sd-phone` bleeding off the bottom + `.sd-sat` / `.sd-sat.is-tile` / `.is-ghost`, parent `data-stagger-order="random"` |
| 31 | UI + feature nav | Walk through features of one product | nav focus + in-frame swap | `.sd-window` with `.sd-swap > [data-focus]` + `.sd-nav[data-focus-group]` |
| 32 | Camera in a screenshot | Point at a detail, scroll a long doc | `.sd-cam` zoom steps, `data-scroll-step` | `.sd-shot > .sd-cam[data-cam="0:50% 50% 1 \| 1:14% 9% 2.4"]` |
| 33 | App + integrations grid | What an app connects to | icon `focus`, grid `rise` 12px | `.sd-applockup` + `.sd-applockup__grid > figure` |
| 34 | Live demo frame | Screen recordings / live demo | hard cuts between layouts, `.sd-swap` media | `.slide.sd-demo` + `.sd-demo__window` (+ `.sd-pip`, `.sd-phone`); modes `is-program`, `is-cam-phone` |
| 35 | App icon card | Brand beat after a demo (use `data-transition="dip"` before it) | plain `fade` | `.sd-appicon > .sd-appicon__icon + .sd-appicon__name` |
| 36 | 3D collage fly-through | Community, "space", scale | parallax drift + slow dolly | `.sd-flythrough > div[data-z]` (+ `.sd-nametag`), title outside the box |
| 37 | Stacked area chart + agent pill | Composition over time, "agent at work" | `chart` wipe, `tick` counter | `.sd-chart[data-type=stack]` in a dark card, `.sd-agentpill` with `.sd-shimmer` |
| 38 | Closing | Thank-you | `assemble data-from="center"` + `pop` crew | |

Global options: `<div class="sd-bug" data-text="Event 2026">` after `.deck` adds a living corner bug (mark → color dot → words type on → delete → mark).

Also available: `.l-split` (title column + media column), `.sd-shot` (screenshot frame), `.sd-window` (app chrome),
`.sd-status` ("In preview" line), `.sd-partner` (A │ B lockup), `.sd-nav` (feature list with focus steps).

## Canonical snippets

### Slide shell
```html
<section class="slide l-center" data-bg="stars">
  …content…
  <aside class="notes">What the speaker says here.</aside>
</section>
```
Layout helpers on `.slide`: `l-center` (center everything), `l-bottom`; inside: `stack`, `row`, `gap-s|m|l|xl`,
`mt-s|m|l|xl`, `w-60|70|80`, `l-split` (`.is-even`, `.is-wide-left`).

### Title + product shot (the workhorse)
```html
<section class="slide">
  <div class="l-split grow">
    <div class="stack gap-s">
      <h2 class="t-h2" data-anim="rise">Decisions API</h2>
      <span class="sd-status" style="--c:var(--sd-blue)" data-anim="rise" data-delay="120">In preview</span>
    </div>
    <div class="sd-shot is-light" data-anim="blur" data-delay="150" style="height:640px">
      <img src="shot.png" alt="Decisions API console">
    </div>
  </div>
</section>
```

### Feature list beside UI (focus moves with each click)
```html
<div class="l-split grow is-wide-left">
  <div class="sd-shot is-light" data-anim="blur" style="height:700px"><img src="ui.png" alt=""></div>
  <div class="sd-nav" data-focus-group data-anim-children="rise" data-stagger="70">
    <div class="sd-nav__item" data-focus="0 1"><i>●</i>Living pages</div>
    <div class="sd-nav__item" data-focus="2"><i>●</i>Work with agents</div>
    <div class="sd-nav__item" data-focus="3"><i>●</i>Manage pages<small>Coming soon</small></div>
  </div>
</div>
```

### Stats row
```html
<div class="row gap-xl" data-anim-children="rise" data-stagger="120">
  <div class="sd-stat" data-color="green"><span class="sd-stat__num" data-anim="count">30%+</span><span class="sd-stat__label">faster tool calls</span></div>
  <div class="sd-stat" data-color="violet"><span class="sd-stat__num" data-anim="count">45%+</span><span class="sd-stat__label">faster first token</span></div>
</div>
```

### Charts
```html
<div class="sd-chart" data-anim="chart" data-type="line" data-values="12,15,21,33,52,61"
     data-labels="Jan,Apr,Jul,Oct" data-color="blue" data-duration="1800" style="height:600px"></div>
<div class="sd-chart" data-anim="chart" data-type="bar" data-values="9.6,5.7,2.4"
     data-labels="A,B,Ours" data-highlight="2" data-suffix="%" style="height:600px"></div>
```
Multiple line series: `data-values="1,2,3|2,3,5"`, `data-colors="white,blue"`, `data-highlight="1"`.
Options: `data-max`, `data-min`, `data-prefix`, `data-suffix`, `data-area="false"`, `data-end-label="false"`,
`data-scatter="120"` (faint background points), `data-duration` (ms; >3000 draws linearly, "live").

### Phone with a chat that plays itself
```html
<div class="sd-phone" data-anim="fade" style="position:absolute;left:1160px;top:110px;height:1060px">
  <div class="sd-phone__status"><span>9:41</span><span>●●●</span></div>
  <div class="sd-phone__head"><span class="sd-dot" data-color="green" data-face="o o"></span>Assistant</div>
  <div class="sd-phone__body">
    <div class="sd-chat is-phone" data-anim="chat" data-delay="500" style="padding-bottom:170px">
      <div class="sd-msg is-me" data-at="0">Sort out my week</div>
      <div class="sd-msg is-note" data-at="500">Read</div>
      <div class="sd-msg is-typing" data-at="1500" data-hide-at="2900"><i></i><i></i><i></i></div>
      <div class="sd-msg" data-at="2900">Tuesday afternoon is free — I moved the team sync to 3pm.</div>
    </div>
  </div>
</div>
```
`padding-bottom` keeps the newest message above the stage edge when the phone bleeds off the bottom.
`data-keep="name"` on the same wordmark in consecutive slides keeps it perfectly still across the cut.

### Demo frame
```html
<section class="slide sd-demo" data-bg="black" data-step-class="2:is-program" data-transition="dip">
  <div class="sd-demo__window sd-swap">
    <video data-focus="0" src="demo-1.mp4" autoplay muted loop playsinline></video>
    <video data-focus="1 2" src="demo-2.mp4" autoplay muted loop playsinline></video>
  </div>
  <div class="sd-pip"><video src="presenter.mp4" autoplay muted loop playsinline></video></div>
</section>
```
