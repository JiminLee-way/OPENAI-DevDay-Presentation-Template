**English** | [한국어](README.ko.md)

# StageDeck: DevDay-style keynote presentation skill

An agent skill that builds decks which look and move like the giant LED wall behind a tech-conference keynote, as a **single HTML file**.
The same skill works in **Claude** (Claude Code, claude.ai) and **Codex** (CLI, ChatGPT desktop app).

> Unofficial project, not affiliated with OpenAI. The screen layouts and motion of the DevDay 2026 keynote were analyzed frame by frame
> and rebuilt from scratch. No OpenAI logos, fonts, images or video frames are included. Every brand in the demo (Orbit, Pulse, Relay, …) is fictional.

**Live demo:** https://lastdance.kr/OPENAI-DevDay-Presentation-Template/
(or download [`docs/index.html`](docs/index.html) and open it in a browser). → / click: next · ←: back · F: fullscreen · O: overview.

## Install

### Claude Code: plugin (recommended)
```bash
claude plugin marketplace add JiminLee-way/OPENAI-DevDay-Presentation-Template
```
```bash
claude plugin install stagedeck@stagedeck
```
Inside a session use `/plugin marketplace add …` and `/plugin install stagedeck@stagedeck`. Run it with `/stagedeck:stagedeck`;
Claude also loads it automatically when you ask for a presentation.

### Claude Code: personal skill
```bash
git clone https://github.com/JiminLee-way/OPENAI-DevDay-Presentation-Template.git && cd OPENAI-DevDay-Presentation-Template && scripts/install.sh claude
```
Installs to `~/.claude/skills/stagedeck/`; run it with `/stagedeck`.

### claude.ai (web and desktop app)
Build `dist/stagedeck.zip` with `scripts/package.sh` (or download it from Releases if one is published) and upload it in Settings → Skills.

### Codex: plugin
```bash
codex plugin marketplace add JiminLee-way/OPENAI-DevDay-Presentation-Template
```
```bash
codex plugin add stagedeck@stagedeck
```
In the ChatGPT desktop app you can also pick this marketplace in the Plugins Directory and install it there.

### Codex: personal skill
```bash
scripts/install.sh codex
```
Installs to `~/.agents/skills/stagedeck/`; run it with `$stagedeck`. Or ask Codex:
`$skill-installer install https://github.com/JiminLee-way/OPENAI-DevDay-Presentation-Template/tree/main/plugins/stagedeck/skills/stagedeck`

## Usage
```text
$stagedeck   (in Claude Code: /stagedeck:stagedeck)
Make a 20-slide keynote-style deck for our Q3 product launch. Open with the character intro,
introduce speakers with dot-matrix names, count up the metrics, and close with the particle logo.
```
The agent first opens the skill's **reference HTML** (`examples/showcase.html`, 38 patterns), copies the markup of the slides it needs
verbatim and swaps in your content, then lints the deck and bundles it into one HTML file.

## What's inside
```
plugins/stagedeck/
  .claude-plugin/plugin.json      Claude Code plugin manifest
  plugin.json                     Portable plugin manifest (ChatGPT / Codex)
  .codex-plugin/plugin.json       Codex compatibility manifest
  skills/stagedeck/               ← the skill (shared by Claude and Codex)
    SKILL.md                      workflow, how to use the reference HTML, content and motion rules
    agents/openai.yaml            Codex / ChatGPT display metadata
    assets/stagedeck.{css,js}     the engine (no dependencies)
    examples/showcase.html        reference HTML: 38 patterns
    templates/starter.html        starting point for new decks
    reference/layouts.md          slide archetype catalog
    reference/motion.md           effects, attributes and spring presets
    scripts/                      new_deck.sh · check_deck.py · bundle.py
.claude-plugin/marketplace.json   Claude Code marketplace
.agents/plugins/marketplace.json  Codex marketplace
docs/index.html                   single-file demo (GitHub Pages)
docs/research/                    keynote frame-analysis notes
scripts/install.sh · package.sh   manual install / release build
```

## What "chewy" (쫀득) motion means here
Spring physics (Apple's duration + bounce model) tuned to measurements from the keynote footage.
1. **Fast attack, long sticky settle:** most of the distance is covered in the first 30% of the time; it comes to rest over about a second.
2. **One overshoot, about 4.6%:** bounce 0.3, damping ratio about 0.7.
3. **Jelly:** scaleX and scaleY run on springs with different periods, so shapes squash once as they land.
4. **Opacity finishes in 0.3 s, position in about 1 s.** Fast moves add blur and stretch along the direction of travel.
5. **Where it's used matters:** only characters, titles and layout shifts spring. UI mockups, screenshots and logos only fade in over 0.2–0.4 s.

## Analysis coverage
0:00–17:00 was analyzed continuously in 30-second chunks; 17:05–31:00 was sampled in ten 30-second chunks; the rest was mapped from
thumbnails taken every 10 seconds. Notes are in [`docs/research/`](docs/research/).

## Limitations
- No `.pptx` export (the motion would not survive). Printing from Chrome gives a PDF with one page per slide.
- The [Pretendard](https://github.com/orioncactus/pretendard) font (OFL) loads from a CDN; offline, the system font is used instead.

## License
MIT. See [LICENSE](LICENSE).
