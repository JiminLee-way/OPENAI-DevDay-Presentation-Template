#!/usr/bin/env python3
"""Lint a StageDeck HTML file. usage: check_deck.py deck.html"""
import re, sys
from html.parser import HTMLParser

ANIMS = {'none','fade','rise','drop','left','right','zoom','pop','blur','mask','words','count','type','typein','draw','fly',
         'dots','zoomout','kenburns','roll','grow','assemble','chart','glow','race',
         'ui','focus','scroll','bokeh','chat','tick','settle'}
BGS = {'stars','warp','glow-left','horizon','top','white','black','plain'}
TRANS = {'fade','push','zoom','cut','dive','beat','dip'}
TITLE_CLASSES = {'t-hero','t-display','t-title','t-h2','sd-name'}
HEROES = {'dots','roll','assemble','fly','zoomout','typein','chart','race','bokeh','chat'}

class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.slides=[]; s.cur=None; s.stack=[]; s.issues=[]
    def handle_starttag(s, tag, attrs):
        a = dict(attrs); cls = set((a.get('class') or '').split())
        if tag == 'section' or ('slide' in cls and tag in ('div','section')):
            s.cur = {'n': len(s.slides)+1, 'anims': [], 'steps': [], 'titles': [], 'text': '', 'bg': a.get('data-bg',''), 'tr': a.get('data-transition')}
            s.slides.append(s.cur); s.depth = 0
        if s.cur is None: return
        if cls & {'sd-cloud', 'sd-carousel', 'sd-demo', 'sd-swap', 'sd-cam'}: s.cur['anims'].append('none'); s.cur['visual'] = True
        an = a.get('data-anim') or a.get('data-anim-children')
        if an: s.cur['anims'].append(an)
        if a.get('data-step'): s.cur['steps'].append(a['data-step'])
        if tag == 'img' and not a.get('alt') and a.get('alt') != '': s.issues.append(('WARN', s.cur['n'], '<img> without alt'))
        if cls & TITLE_CLASSES: s.stack.append(['title', tag, ''])
        elif tag in ('h1','h2'): s.stack.append(['title', tag, ''])
        if tag == 'aside' and 'notes' in cls: s.stack.append(['notes', tag, ''])
    def handle_endtag(s, tag):
        if s.stack and s.stack[-1][1] == tag:
            kind, _, txt = s.stack.pop()
            if kind == 'title' and s.cur is not None: s.cur['titles'].append(re.sub(r'\s+', ' ', txt).strip())
    def handle_data(s, d):
        for fr in s.stack:
            fr[2] += d
        if s.cur is not None and not any(f[0]=='notes' for f in s.stack): s.cur['text'] += d

src = open(sys.argv[1], encoding='utf-8').read()
p = P(); p.feed(src)
iss = p.issues
if not p.slides: iss.append(('ERROR', 0, 'no <section class="slide"> found'))
for s in p.slides:
    n = s['n']
    for a in s['anims']:
        if a not in ANIMS: iss.append(('ERROR', n, f'unknown data-anim "{a}"'))
    for b in s['bg'].split():
        if b not in BGS: iss.append(('ERROR', n, f'unknown data-bg "{b}"'))
    if s['tr'] and s['tr'] not in TRANS: iss.append(('ERROR', n, f'unknown data-transition "{s["tr"]}"'))
    for t in s['titles']:
        limit = 28 if re.search('[가-힣]', t) else 48
        if len(t) > limit: iss.append(('WARN', n, f'title is long ({len(t)} chars): "{t[:40]}…" — split it or move detail to notes'))
    words = len(re.findall(r'\S+', s['text']))
    if words > 70 and not s.get('visual'): iss.append(('WARN', n, f'{words} words on screen — move explanation to <aside class="notes">'))
    heroes = [a for a in s['anims'] if a in HEROES]
    if len(set(heroes)) > 2: iss.append(('WARN', n, f'several hero effects on one slide: {sorted(set(heroes))} — keep one'))
    if len(s['anims']) > 16: iss.append(('WARN', n, f'{len(s["anims"])} animated elements — slide may feel busy'))
    st = sorted({int(x) for x in s['steps'] if x.isdigit()})
    if st and st != list(range(1, st[-1]+1)): iss.append(('WARN', n, f'step numbers have gaps: {st}'))
    if not s['anims']: iss.append(('INFO', n, 'no animation on this slide'))
for lvl in ('ERROR','WARN','INFO'):
    for l, n, m in [i for i in iss if i[0]==lvl]:
        print(f'{l:5} slide {n}: {m}')
e = sum(1 for i in iss if i[0]=='ERROR'); w = sum(1 for i in iss if i[0]=='WARN')
print(f'\n{len(p.slides)} slides · {e} errors · {w} warnings')
sys.exit(1 if e else 0)
