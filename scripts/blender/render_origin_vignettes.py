"""Realistic origin vignettes for topic-02 „תכסית טבעית / תכסית מלאכותית” (LandCoverVisuals.tsx).

The two 88 × 60 thumbnails beside the origin cards, rendered as crops of the same aerial world
as the land-cover map (render_land_cover.py is imported for its materials, crowns and light):

    natural   irregular oak crowns of mixed size over a ragged patch of understory — no rows
    planted   identical pines on an exact grid inside a sharp-edged parcel

Positions and sizes are the papercut ones (archived as OriginVignettesV1.tsx), in the
vignette's own units (1 unit ≈ 1 m, like the map). One straight-down orthographic camera per
vignette, transparent outside the patch / parcel.

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background \
        --python scripts/blender/render_origin_vignettes.py
    node scripts/blender/package_origin_vignettes.cjs
"""
import math, os, random, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render_land_cover as lc                      # noqa: E402  (its passes only run as __main__)

ROOT = lc.ROOT
OUT = os.path.join(ROOT, 'qa-output/origin-vignettes-blender')
os.makedirs(OUT, exist_ok=True)

VW, VH = 88, 60
PX = 4                                             # 352 × 240 — the 88 × 60 CSS box at 4×
SAMPLES = 256

# ── Shared with LandCoverVisuals.tsx (the papercut vignettes) ───────────────
NATURAL_HULL = 'M8,30 C6,14 22,6 40,8 C58,6 80,12 80,30 C82,46 68,56 48,54 C30,58 10,50 8,30 Z'
NATURAL_CROWNS = [(22, 22, 8), (37, 17, 6), (34, 33, 9), (52, 26, 6.5), (18, 40, 5.5), (50, 42, 7.5),
                  (66, 33, 5), (70, 46, 4), (28, 48, 3.5), (62, 18, 3.8)]
PARCEL = 'M8,5 H80 V55 H8 Z'
PLANTED = [(20 + (i % 4) * 16, 16 + (i // 4) * 14) for i in range(12)]


def build_natural(coll, M):
    poly = lc.poly_of(NATURAL_HULL)
    floor = lc.area_floor('Natural floor', poly, [M['floor_grove']], coll, feather=4, ragged=1.6, res=.35, seed=9.1)
    rng = random.Random(31)
    bl = lc.Builder()
    for (x, y, r) in NATURAL_CROWNS:
        ch = 2.6 + r * .55
        # the papercut crown + its side lobe, then a little lumpiness of its own
        lobes = [(x, y, ch, r, r * rng.uniform(.88, 1.0), r * .55),
                 (x + r * .5, y + r * .3, ch - .3, r * .62, r * .6, r * .4)]
        for _ in range(2):
            a = rng.uniform(0, 2 * math.pi)
            lobes.append((x + math.cos(a) * r * .45, y + math.sin(a) * r * .45, ch + .3, r * .5, r * .5, r * .35))
        lc.stem(bl, rng, [(x, y, 0), (x, y, ch)], max(.3, r * .06), .25, 0)
        tint = (rng.uniform(.9, 1.06), rng.uniform(.93, 1.08), rng.uniform(.88, 1.0))
        lc.crown(bl, rng, lobes, 1.9, 2.4, tint, 1, 2)
    under = lc.Builder()
    for (x, y, r) in lc.scatter(9, 44, 31, 34, 20, 1.0, 1.8, 47, 1.4, poly):
        lc.crown(under, rng, [(x, y, r * .5, r, r * .9, r * .55)], 1.0, 2.4, (1.0,) * 3, 0, 1, .35)
    return [floor, bl.build('Natural crowns', [M['bark'], M['leaves_oak'], M['core_oak']], coll),
            under.build('Natural shrubs', [M['leaves_scrub'], M['core_scrub']], coll)]


def build_planted(coll, M):
    poly = lc.poly_of(PARCEL)
    floor = lc.area_floor('Parcel floor', poly, [M['floor_planted']], coll, res=.35,
                          attrs={'edge': lambda P: lc.signed_distance(P, poly)})
    bl = lc.Builder()
    for (x, y) in PLANTED:
        rng = random.Random(55)          # identical trees: the planted-by-man cue
        r, ch = 5.0, 6.8
        lobes = [(x, y, ch, r * .95, r * .95, r * .42)]
        for k in range(5):
            a = k * 2 * math.pi / 5 + .3
            lobes.append((x + math.cos(a) * r * .5, y + math.sin(a) * r * .5, ch - .5, r * .5, r * .5, r * .32))
        lc.stem(bl, rng, [(x, y, 0), (x, y, ch)], .35, .25, 0)
        lc.crown(bl, rng, lobes, 1.9, 2.1, (1, 1, 1), 1, 2, .35)
    return [floor, bl.build('Planted pines', [M['bark'], M['leaves_pine'], M['core_pine']], coll)]


if __name__ == '__main__':
    sc = lc.setup()
    sc.render.resolution_x = VW * PX
    sc.render.resolution_y = VH * PX
    sc.camera.data.ortho_scale = VW
    sc.camera.location = (VW / 2, -VH / 2, 150)
    sc.cycles.samples = SAMPLES
    M = lc.materials()
    lc.set_season('winter')
    groups = {'natural': build_natural(lc.collection('natural'), M),
              'planted': build_planted(lc.collection('planted'), M)}
    for name in groups:
        for k, objs in groups.items():
            for ob in objs:
                ob.hide_render = k != name
        sc.render.filepath = os.path.join(OUT, name + '.png')
        lc.bpy.ops.render.render(write_still=True)
        print('PASS', name, flush=True)
    print('ORIGIN VIGNETTES COMPLETE', flush=True)
