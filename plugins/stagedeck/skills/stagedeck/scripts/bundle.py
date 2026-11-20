#!/usr/bin/env python3
"""Inline local stagedeck.css / stagedeck.js (and other local <link rel=stylesheet>/<script src>) into one HTML file.
usage: bundle.py deck.html -o deck.single.html [--images]   (--images also inlines local <img src> as data URIs)
"""
import argparse, base64, mimetypes, os, re, sys

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('-o', '--out', required=True); ap.add_argument('--images', action='store_true')
a = ap.parse_args()
base = os.path.dirname(os.path.abspath(a.src))
html = open(a.src, encoding='utf-8').read()
is_local = lambda u: not re.match(r'^(https?:)?//|^data:', u)
def read(u):
    p = os.path.normpath(os.path.join(base, u.split('?')[0]))
    return open(p, encoding='utf-8').read()

def css(m):
    href = m.group(1)
    if not is_local(href): return m.group(0)
    return '<style>\n' + read(href) + '\n</style>'
html = re.sub(r'<link[^>]+rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)["\'][^>]*>', css, html)
html = re.sub(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\']stylesheet["\'][^>]*>', css, html)

def js(m):
    src = m.group(1)
    if not is_local(src): return m.group(0)
    return '<script>\n' + read(src).replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script[^>]+src=["\']([^"\']+)["\'][^>]*>\s*</script>', js, html)

if a.images:
    def img(m):
        src = m.group(2)
        if not is_local(src): return m.group(0)
        p = os.path.normpath(os.path.join(base, src))
        mt = mimetypes.guess_type(p)[0] or 'application/octet-stream'
        data = base64.b64encode(open(p, 'rb').read()).decode()
        return f'{m.group(1)}data:{mt};base64,{data}{m.group(3)}'
    html = re.sub(r'(<img[^>]+src=["\'])([^"\']+)(["\'])', img, html)

open(a.out, 'w', encoding='utf-8').write(html)
print(f'wrote {a.out} ({len(html)/1024:.0f} KB)')
