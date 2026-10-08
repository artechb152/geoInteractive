"""
Headless Blender build for the topic-02 "mountain as a layer cake" interaction
(ContoursScene → #scene-contours). Run with:

  blender --background --python scripts/blender/build_contour_mountain.py

(on this machine: "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")

Geometry, vegetation and every mask are procedural (numpy + bpy). The only
external inputs are four CC0 photo textures and one CC0 HDRI from Poly Haven
(https://polyhaven.com — CC0, no attribution required), fetched with curl
into a temp cache on first run and re-encoded into the asset folder.

ONE mountain, several outputs, so the 3D view and the 2D map can never drift:

  public/assets/lessons/topic02/contour-mountain/contour-mountain.glb  (Draco)
      Node contract consumed by ContourCake3D.tsx (glTF Y-up, 1 unit = 50 m):
        - "Base"      everything below the 10 m contour: the ground, the foot
                      of the mountain, the diorama walls and bottom.
        - "Slice_1".."Slice_5"  the mountain between two contour levels
                      (10–20 m, 20–30, 30–40, 40–50, 50 m → summit). Each is a
                      closed solid made by a boolean intersect, so its flat
                      bottom face is EXACTLY the contour polygon at its lower
                      level.
        - Every node's origin is the world origin; lifting = translate in y.
        - Materials by name (the runtime builds its own shaders per name):
            Terrain  — splat-blended photo textures (runtime shader)
            Cut      — flat cut faces            Wall — diorama sides
        - Positions + normals only: every runtime shader works from
          object-space position, so no UVs or vertex colours are exported.

      PLANTS = True restores the optional dressing — ~1,150 trees, boulders
      and ~48k grass tufts merged into the slices they stand on (materials
      Leaves / LeafCore / Bark / Boulder / Grass, per-item COLOR_0 tint, plus
      leaves.png / grass.png card textures). It is off: it was ~90 % of the
      GLB (4.3 of 4.8 MB) and the runtime no longer builds those materials.

  .../contour-mountain/textures/
        {grass,dry,rock,forest}_{diff,nor}.jpg   Poly Haven photo textures (TEX_RES²)
        splat.png   RGBA weights: R grass, G dry ground, B rock, A woodland floor
        macro.jpg   large-scale shading (cavity AO) ×0.5
  .../contour-mountain/env/sky.hdr   image-based lighting (downsampled — it
        only lights matte ground, so a 256 × 128 sky is indistinguishable)

  src/components/lessons/topic-02/contourMountain.data.ts   (GENERATED)
      Contour rings extracted from the very same triangles the slices were
      cut from, in map coordinates (0–100, north up), plus the summit, label
      anchors and the steep/gentle measuring rays.
"""

import json
import math
import os
import struct
import subprocess
import tempfile
import zlib

import bpy
import numpy as np

# ---------------------------------------------------------------- constants

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_ASSET_DIR = os.path.join(ROOT, 'public', 'assets', 'lessons', 'topic02', 'contour-mountain')
OUT_TEX_DIR = os.path.join(OUT_ASSET_DIR, 'textures')
OUT_ENV_DIR = os.path.join(OUT_ASSET_DIR, 'env')
OUT_DATA_TS = os.path.join(ROOT, 'src', 'components', 'lessons', 'topic-02', 'contourMountain.data.ts')
CACHE_DIR = os.path.join(tempfile.gettempdir(), 'contour-mountain-polyhaven')

M_PER_UNIT = 50.0            # 1 three.js unit = 50 m on the ground
VE = 1.4                     # vertical exaggeration (see design/docs/assumptions.md)
HALF_M = 110.0               # diorama is 220 × 220 m
HALF_U = HALF_M / M_PER_UNIT
GRID_N = 320                 # cells per side (~0.69 m) → 205k surface triangles
BASE_DEPTH_U = 0.16          # diorama plinth thickness below z = 0
LEVELS_M = [10, 20, 30, 40, 50]
MAP_RES = 2048               # splat / macro raster (0.11 m per pixel)
TEX_RES = 512                # photo textures, px per side (one tile is 4–10 m)
SKY_RES = (256, 128)         # IBL equirect
PLANTS = False               # trees, boulders and grass tufts (see docstring)

SUMMIT_M = (-18.0, 12.0)     # summit sits a little west/north of centre
PEAK_M = 58.0
GENTLE_DIR = math.radians(-32.0)   # long, gentle spur runs ESE
GULLY_DIR = math.radians(-118.0)   # the main re-entrant cuts the SSW flank

# Rays from the summit (radians, math convention, north up) that the 2D map's
# labels and steep/gentle rulers hang off.
RAYS = {
    'label': math.radians(-74.0),
    'steep': math.radians(162.0),
    'gentle': math.radians(-50.0),
}

# Poly Haven assets (all CC0), by terrain layer.
POLYHAVEN = {
    'grass': 'aerial_grass_rock',
    'dry': 'dry_ground_rocks',
    'rock': 'cliff_side',
    'forest': 'forest_leaves_02',
}
POLYHAVEN_HDRI = 'drakensberg_solitary_mountain_puresky'

MATS = ['Terrain', 'Cut', 'Wall', 'Leaves', 'LeafCore', 'Bark', 'Boulder', 'Grass']
MI = {n: i for i, n in enumerate(MATS)}


def z_units(h_m):
    return h_m * VE / M_PER_UNIT


def srgb(hex_color):
    """Hex → linear RGB (Blender material / vertex-colour space)."""
    h = hex_color.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return np.array(out, dtype=np.float32)


def hex01(hex_color):
    """Hex → sRGB 0–1 (texture authoring space)."""
    h = hex_color.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float32)


# ---------------------------------------------------------------- noise

class Perlin:
    def __init__(self, seed):
        rng = np.random.default_rng(seed)
        p = rng.permutation(256)
        self.perm = np.concatenate([p, p]).astype(np.int64)
        ang = rng.uniform(0, 2 * np.pi, 256)
        self.gx = np.cos(ang)
        self.gy = np.sin(ang)

    def __call__(self, x, y):
        x0 = np.floor(x)
        y0 = np.floor(y)
        xf = x - x0
        yf = y - y0
        xi = x0.astype(np.int64) & 255
        yi = y0.astype(np.int64) & 255
        u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
        v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)

        def g(ix, iy, dx, dy):
            h = self.perm[self.perm[ix] + iy]
            return self.gx[h] * dx + self.gy[h] * dy

        n00 = g(xi, yi, xf, yf)
        n10 = g(xi + 1, yi, xf - 1, yf)
        n01 = g(xi, yi + 1, xf, yf - 1)
        n11 = g(xi + 1, yi + 1, xf - 1, yf - 1)
        nx0 = n00 + u * (n10 - n00)
        nx1 = n01 + u * (n11 - n01)
        return (nx0 + v * (nx1 - nx0)) * 1.41


PN = [Perlin(s) for s in (11, 23, 37, 41, 53, 67, 71, 83, 97, 101, 113)]


def fbm(p, x, y, octaves, gain=0.5):
    s = 0.0
    a = 1.0
    norm = 0.0
    for o in range(octaves):
        f = 2.0 ** o
        s = s + a * p(x * f + 17.3 * o, y * f - 9.1 * o)
        norm += a
        a *= gain
    return s / norm


def ridged(p, x, y, octaves):
    """Ridged multifractal in ~[0, 1] — sharp crests, for rock and crags."""
    s = 0.0
    a = 0.5
    w = 1.0
    norm = 0.0
    for o in range(octaves):
        f = 2.0 ** o
        n = 1.0 - np.abs(p(x * f + 5.3 * o, y * f + 1.7 * o))
        n = n * n * w
        w = np.clip(n * 1.8, 0.0, 1.0)
        s = s + n * a
        norm += a
        a *= 0.5
    return s / norm


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _window(t, a, b):
    u = np.clip((t - a) / (b - a), 0.0, 1.0)
    return np.sin(np.pi * u) ** 2


# ---------------------------------------------------------------- height field (metres)

def macro_height(X, Y):
    """The mountain's large-scale form: a steep WNW face, a long gentle ESE
    spur, a NNE shoulder and one main SSW gully."""
    dx = X - SUMMIT_M[0]
    dy = Y - SUMMIT_M[1]
    r = np.hypot(dx, dy)
    rel = np.arctan2(dy, dx) - GENTLE_DIR
    R = 78.0 + 46.0 * np.cos(rel) + 8.0 * np.cos(2.0 * (rel + 0.5))
    rho = r / R
    h = PEAK_M * np.exp(-2.1 * rho ** 1.6)

    def along(dir_rad):
        ux, uy = math.cos(dir_rad), math.sin(dir_rad)
        return dx * ux + dy * uy, -dx * uy + dy * ux

    t, s = along(GENTLE_DIR)
    h = h + 9.0 * np.exp(-(s / 15.0) ** 2) * _window(t, 15.0, 105.0)
    t, s = along(math.radians(68.0))
    h = h + 5.0 * np.exp(-(s / 10.0) ** 2) * _window(t, 8.0, 62.0)
    t, s = along(GULLY_DIR)
    h = h - 9.0 * np.exp(-(s / 8.0) ** 2) * _window(t, 10.0, 80.0)
    return h, dx, dy, r, rho


def _make_ravines():
    """Erosion ravines radiating from the summit: narrow couloirs on the steep
    face, wider V-valleys on the gentle side. They leave the spur crest (-32°)
    and the NNE shoulder (68°) standing as ridges."""
    rng = np.random.default_rng(5)
    out = []
    for a in (-172, -150, -135, -100, -84, -62, -45, -14, 8, 26, 44, 86, 104, 122, 140, 158):
        ang = math.radians(a + rng.uniform(-5, 5))
        steep = math.cos(ang - GENTLE_DIR) < -0.3
        out.append({
            'ang': ang,
            'depth': rng.uniform(2.5, 4.0) if steep else rng.uniform(3.0, 5.5),
            'w0': rng.uniform(2.0, 3.0) if steep else rng.uniform(3.0, 4.5),
            'wk': 0.05 if steep else 0.09,
            'mamp': math.radians(rng.uniform(3, 8)),
            'mlen': rng.uniform(12, 22),
            'ph': rng.uniform(0, 2 * math.pi),
            'rho0': rng.uniform(0.12, 0.22),
            'rho1': rng.uniform(0.95, 1.2),
        })
    return out


RAVINES = _make_ravines()


def ravine_carve(dx, dy, r, rho):
    carve = np.zeros_like(r)
    for rv in RAVINES:
        a = rv['ang'] + rv['mamp'] * np.sin(r / rv['mlen'] + rv['ph'])
        ux, uy = np.cos(a), np.sin(a)
        along = dx * ux + dy * uy
        s = -dx * uy + dy * ux
        w = rv['w0'] + rv['wk'] * r
        t = np.clip(1.0 - np.abs(s) / w, 0.0, 1.0)
        prof = t * t * (3.0 - 2.0 * t)
        win = _window(rho, rv['rho0'], rv['rho1']) * (along > 0)
        carve = np.maximum(carve, rv['depth'] * prof * win)
    return carve


def terrain(X, Y):
    """Final mesh-scale height (m) plus the masks the texturing needs."""
    h0, dx, dy, r, rho = macro_height(X, Y)
    e = 1.5
    gx = (macro_height(X + e, Y)[0] - macro_height(X - e, Y)[0]) / (2 * e)
    gy = (macro_height(X, Y + e)[0] - macro_height(X, Y - e)[0]) / (2 * e)
    rock = smoothstep(0.72, 1.25, np.hypot(gx, gy))
    m = np.clip(h0 / PEAK_M, 0.0, 1.0)

    # Domain-warped undulation: the slopes stop reading as a smooth cone.
    wx = X + 16.0 * fbm(PN[0], X / 85.0, Y / 85.0, 3)
    wy = Y + 16.0 * fbm(PN[1], X / 85.0 + 7.1, Y / 85.0 - 3.4, 3)
    h = h0 + 2.2 * np.sin(np.pi * m) ** 1.2 * fbm(PN[2], wx / 42.0, wy / 42.0, 4)

    h = h - ravine_carve(dx, dy, r, rho)

    # Crags on the steep face, and the summit's broken rock.
    crag = ridged(PN[3], X / 20.0, Y / 20.0, 3)
    h = h + rock * 2.2 * (crag - 0.45)
    h = h + smoothstep(0.82, 0.97, m) * 1.0 * (crag - 0.5)

    # Rock strata: irregular ledges and short cliff bands where the face is
    # steep (the noise offset keeps them from reading as even stripes).
    step, off = 4.2, 1.1
    t = (h - off + 1.8 * fbm(PN[9], X / 24.0, Y / 24.0, 2)) / step
    f = t - np.floor(t)
    terr = h + (smoothstep(0.3, 0.7, f) - f) * step
    h = h + rock * 0.45 * (terr - h)

    # Surrounding ground: gently undulating, always far below 10 m.
    h = h + 0.9 + 0.55 * fbm(PN[4], X / 70.0, Y / 70.0, 3) + 0.25 * fbm(PN[5], X / 20.0, Y / 20.0, 2)
    return h, rock, m


def eval_raster(res, fn, chunk=256):
    """Evaluate fn(X, Y) on a res×res raster, row 0 = north edge (map top)."""
    cell = 2 * HALF_M / res
    c = (np.arange(res) + 0.5) * cell - HALF_M
    rows = c[::-1]
    parts = None
    for r0 in range(0, res, chunk):
        Xc, Yc = np.meshgrid(c, rows[r0:r0 + chunk])
        out = fn(Xc, Yc)
        out = out if isinstance(out, tuple) else (out,)
        if parts is None:
            parts = [[] for _ in out]
        for k, o in enumerate(out):
            parts[k].append(o.astype(np.float32))
    return [np.concatenate(p, axis=0) for p in parts], cell


def box_blur(a, radius_px):
    """Separable box blur ×2 (≈ gaussian), edge-clamped."""
    k = max(1, int(radius_px))
    out = a
    for _ in range(2):
        for axis in (0, 1):
            pad = [(0, 0)] * out.ndim
            pad[axis] = (k + 1, k)
            p = np.pad(out, pad, mode='edge')
            cs = np.cumsum(p, axis=axis, dtype=np.float64)
            if axis == 0:
                out = (cs[2 * k + 1:] - cs[:-2 * k - 1]) / (2 * k + 1)
            else:
                out = (cs[:, 2 * k + 1:] - cs[:, :-2 * k - 1]) / (2 * k + 1)
    return out.astype(np.float32)


# ---------------------------------------------------------------- image IO

def paeth_filter(img):
    """PNG filter type 4 on every row — smooth rasters (weights, shading)
    deflate several times smaller than unfiltered."""
    x = img.astype(np.int16)
    a = np.zeros_like(x)
    a[:, 1:] = x[:, :-1]
    b = np.zeros_like(x)
    b[1:] = x[:-1]
    c = np.zeros_like(x)
    c[1:, 1:] = x[:-1, :-1]
    p = a + b - c
    pa, pb, pc = np.abs(p - a), np.abs(p - b), np.abs(p - c)
    pred = np.where((pa <= pb) & (pa <= pc), a, np.where(pb <= pc, b, c))
    return ((x - pred) & 0xFF).astype(np.uint8)


def write_png(path, rgba_u8):
    h, w, ch = rgba_u8.shape
    filtered = paeth_filter(rgba_u8)
    raw = b''.join(b'\x04' + filtered[y].tobytes() for y in range(h))

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    color_type = 6 if ch == 4 else 2
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, color_type, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def u8(a):
    return np.round(np.clip(a, 0, 1) * 255).astype(np.uint8)


def save_jpeg_from_array(path, rgb, quality):
    """Encode an sRGB float array (row 0 = top) as JPEG through Blender."""
    h, w, _ = rgb.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[..., :3] = rgb
    img.pixels.foreach_set(rgba[::-1].ravel())
    img.file_format = 'JPEG'
    img.save(filepath=path, quality=quality)
    bpy.data.images.remove(img)


# ---------------------------------------------------------------- Poly Haven

def curl(url, dest):
    if not (os.path.exists(dest) and os.path.getsize(dest) > 0):
        subprocess.run(['curl', '-sSfL', '--max-time', '300', '-o', dest, url], check=True)
    return dest


def fetch_polyhaven():
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(OUT_TEX_DIR, exist_ok=True)
    os.makedirs(OUT_ENV_DIR, exist_ok=True)
    for layer, asset in POLYHAVEN.items():
        with open(curl(f'https://api.polyhaven.com/files/{asset}', os.path.join(CACHE_DIR, f'{asset}.json'))) as f:
            meta = json.load(f)
        for kind, key in (('diff', 'Diffuse'), ('nor', 'nor_gl')):
            url = meta[key]['2k']['jpg']['url']
            src = curl(url, os.path.join(CACHE_DIR, os.path.basename(url)))
            img = bpy.data.images.load(src)
            img.colorspace_settings.name = 'Non-Color'   # bytes pass through untouched
            img.scale(TEX_RES, TEX_RES)
            img.file_format = 'JPEG'
            dst = os.path.join(OUT_TEX_DIR, f'{layer}_{kind}.jpg')
            img.save(filepath=dst, quality=86 if kind == 'diff' else 90)
            bpy.data.images.remove(img)
            print(f'TEXTURE {layer}_{kind}: {os.path.getsize(dst) // 1024} KB ({asset})')
    with open(curl(f'https://api.polyhaven.com/files/{POLYHAVEN_HDRI}', os.path.join(CACHE_DIR, 'hdri.json'))) as f:
        meta = json.load(f)
    src = curl(meta['hdri']['1k']['hdr']['url'], os.path.join(CACHE_DIR, 'sky_1k.hdr'))
    img = bpy.data.images.load(src)
    img.scale(*SKY_RES)
    img.file_format = 'HDR'
    dst = os.path.join(OUT_ENV_DIR, 'sky.hdr')
    img.save(filepath=dst)
    bpy.data.images.remove(img)
    print(f'ENV sky: {os.path.getsize(dst) // 1024} KB')


# ---------------------------------------------------------------- generated textures

def leaf_atlas(path, size=1024):
    """2×2 atlas of leaf clusters on transparent ground (straight alpha, with
    colour bled into the transparent area so mipmaps don't fringe dark)."""
    rng = np.random.default_rng(3)
    C = np.zeros((size, size, 3), np.float32)       # premultiplied colour
    A = np.zeros((size, size), np.float32)
    cell = size // 2
    greens = [hex01(c) for c in ('#3E4B27', '#4B5A2D', '#566634', '#62713A', '#445229', '#6E7C42')]
    for ci in range(4):
        ox, oy = (ci % 2) * cell, (ci // 2) * cell
        for _ in range(240):
            ang = rng.uniform(0, 2 * np.pi)
            rad = cell * 0.44 * rng.uniform(0, 1) ** 0.6
            cx = ox + cell / 2 + rad * math.cos(ang)
            cy = oy + cell / 2 + rad * math.sin(ang)
            a = rng.uniform(13, 24)
            b = a * rng.uniform(0.33, 0.45)
            rot = ang + rng.normal(0, 0.8)
            base = greens[rng.integers(len(greens))] * rng.uniform(0.85, 1.15)
            shade = (0.65 + 0.35 * rad / (cell * 0.44)) * (1.08 - 0.2 * (cy - oy) / cell)
            x0, x1 = int(max(ox, cx - a - 2)), int(min(ox + cell, cx + a + 3))
            y0, y1 = int(max(oy, cy - a - 2)), int(min(oy + cell, cy + a + 3))
            if x1 <= x0 or y1 <= y0:
                continue
            yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
            lx = (xx - cx) * math.cos(rot) + (yy - cy) * math.sin(rot)
            ly = -(xx - cx) * math.sin(rot) + (yy - cy) * math.cos(rot)
            taper = np.clip(1.0 - 0.45 * (lx / a) ** 2, 0.2, 1.0)   # pointed tips
            d = np.sqrt((lx / a) ** 2 + (ly / (b * taper)) ** 2)
            al = np.clip((1.0 - d) * b * 0.9, 0, 1)
            tone = shade * (0.9 + 0.15 * (1 - np.clip(np.abs(ly) / b, 0, 1)))
            rgb = base[None, None, :] * tone[..., None]
            C[y0:y1, x0:x1] = rgb * al[..., None] + C[y0:y1, x0:x1] * (1 - al[..., None])
            A[y0:y1, x0:x1] = al + A[y0:y1, x0:x1] * (1 - al)
    blurC = box_blur(C, 12)
    blurA = box_blur(A, 12)
    straight = np.where(A[..., None] > 0.02, C / np.maximum(A[..., None], 1e-4),
                        blurC / np.maximum(blurA[..., None], 1e-4))
    out = np.zeros((size, size, 4), np.uint8)
    out[..., :3] = u8(straight)
    out[..., 3] = u8(A)
    write_png(path, out)
    print(f'TEXTURE leaves: {os.path.getsize(path) // 1024} KB')


def grass_texture(path, cell=512):
    """Two grass-tuft cells side by side: tapered, bending blades, dark olive
    at the root to dry straw at the tips (Mediterranean late spring)."""
    rng = np.random.default_rng(4)
    W, H = cell * 2, cell
    C = np.zeros((H, W, 3), np.float32)
    A = np.zeros((H, W), np.float32)
    root, mid, tip = hex01('#3B4523'), hex01('#6E7440'), hex01('#B3A56E')
    for ci in range(2):
        ox = ci * cell
        for _ in range(70):
            x0 = ox + rng.uniform(0.12, 0.88) * cell
            height = rng.uniform(0.4, 0.97) * H
            w0 = rng.uniform(4, 10)
            bend = rng.normal(0, 0.22) * height
            ys = np.arange(int(height))
            t = ys / height
            cx = x0 + bend * t ** 2
            hw = w0 * (1 - t) ** 0.85 / 2 + 0.35
            col = np.where(t[:, None] < 0.5,
                           root + (mid - root) * (t[:, None] / 0.5),
                           mid + (tip - mid) * ((t[:, None] - 0.5) / 0.5))
            col = col * rng.uniform(0.85, 1.15)
            xlo = int(max(ox, cx.min() - w0 - 2))
            xhi = int(min(ox + cell, cx.max() + w0 + 2))
            if xhi <= xlo:
                continue
            xx = np.arange(xlo, xhi, dtype=np.float32)
            al = np.clip(hw[:, None] + 0.5 - np.abs(xx[None, :] - cx[:, None]), 0, 1)
            rows = H - 1 - ys                        # root at the bottom edge
            sub_c = C[rows, xlo:xhi]
            sub_a = A[rows, xlo:xhi]
            C[rows, xlo:xhi] = col[:, None, :] * al[..., None] + sub_c * (1 - al[..., None])
            A[rows, xlo:xhi] = al + sub_a * (1 - al)
    blurC = box_blur(C, 8)
    blurA = box_blur(A, 8)
    straight = np.where(A[..., None] > 0.02, C / np.maximum(A[..., None], 1e-4),
                        blurC / np.maximum(blurA[..., None], 1e-4))
    out = np.zeros((H, W, 4), np.uint8)
    out[..., :3] = u8(straight)
    out[..., 3] = u8(A)
    write_png(path, out)
    print(f'TEXTURE grass: {os.path.getsize(path) // 1024} KB')


# ---------------------------------------------------------------- surface fields

def base_fields():
    """Every mask the splat map and the vegetation read, on one raster."""
    (H, rock0, m), cell = eval_raster(MAP_RES, terrain)
    res = MAP_RES
    c = (np.arange(res) + 0.5) * cell - HALF_M
    X, Y = np.meshgrid(c, c[::-1])
    X = X.astype(np.float32)
    Y = Y.astype(np.float32)

    d_row, dHdx = np.gradient(H, cell)
    dHdy = -d_row
    slope = np.hypot(dHdx, dHdy)
    south = np.clip(dHdy / (slope + 1e-6), -1, 1) * smoothstep(0.05, 0.3, slope)

    n_a = fbm(PN[9], X / 28.0, Y / 28.0, 3)
    dryness = np.clip(0.05 + 0.2 * m + 0.28 * south + 0.4 * fbm(PN[1], X / 55.0, Y / 55.0, 3), 0, 0.8)
    cav = box_blur(H, 7.0 / cell) - H
    wet = smoothstep(0.4, 2.5, cav)

    outcrop = smoothstep(0.64, 0.78, ridged(PN[5], X / 9.0, Y / 9.0, 3)) * smoothstep(0.3, 0.7, slope) * (0.35 + 0.65 * m)
    rock = np.clip(smoothstep(0.95, 1.45, slope) + 0.3 * rock0 * smoothstep(0.5, 0.9, slope) + outcrop, 0, 1)

    mosaic = smoothstep(0.06, 0.26, fbm(PN[2], X / 7.0, Y / 7.0, 3) + 0.3 * fbm(PN[8], X / 30.0, Y / 30.0, 2))
    woods = smoothstep(0.0, 0.35, fbm(PN[8], X / 16.0, Y / 16.0, 3))
    mq = np.clip(0.7 * mosaic + 0.5 * woods + 0.6 * wet, 0, 1)
    mq *= (1 - rock) * (1 - smoothstep(0.75, 0.97, m)) * (0.6 + 0.4 * np.clip(0.3 - south, 0, 1))
    mq *= np.where(m < 0.06, 0.4, 1.0)

    soil = smoothstep(0.8, 0.95, m) * 0.5 * np.clip(0.6 + n_a, 0, 1)
    scree = np.clip(box_blur(rock, 10.0 / cell) * 1.5 - rock, 0, 1) * smoothstep(0.12, 0.45, slope)

    # A foot trail up the gentle spur to the summit.
    ts = np.linspace(0, 175, 60)
    ux, uy = math.cos(GENTLE_DIR), math.sin(GENTLE_DIR)
    px = SUMMIT_M[0] + ts * ux - 3.0 * np.sin(ts / 13.0) * uy
    py = SUMMIT_M[1] + ts * uy + 3.0 * np.sin(ts / 13.0) * ux
    dist = np.full(X.shape, 1e9, dtype=np.float32)
    for k in range(len(ts) - 1):
        ax, ay, bx, by = px[k], py[k], px[k + 1], py[k + 1]
        vx, vy = bx - ax, by - ay
        L2 = vx * vx + vy * vy
        tt = np.clip(((X - ax) * vx + (Y - ay) * vy) / L2, 0, 1)
        dist = np.minimum(dist, np.hypot(X - ax - tt * vx, Y - ay - tt * vy))
    trail = (1 - smoothstep(0.7, 1.4, dist)) * (1 - rock)

    return {
        'cell': cell, 'X': X, 'Y': Y, 'H': H, 'slope': slope, 'rock': rock, 'dryness': dryness,
        'mq': mq, 'soil': soil, 'scree': scree, 'trail': trail, 'cav': cav, 'm': m,
    }


def sample(field, fields, x, y):
    cell = fields['cell']
    ci = np.clip(((x + HALF_M) / cell).astype(np.int64), 0, MAP_RES - 1)
    ri = np.clip(((HALF_M - y) / cell).astype(np.int64), 0, MAP_RES - 1)
    return fields[field][ri, ci]


def write_surface_maps(fields, trees):
    res = MAP_RES
    cell = fields['cell']
    shade = np.zeros((res, res), dtype=np.float32)
    for t in trees:
        ci = int((t['x'] + HALF_M) / cell)
        ri = int((HALF_M - t['y']) / cell)
        rad = t['crown'] * 1.3 / cell
        R = int(rad) + 1
        r0, r1 = max(0, ri - R), min(res, ri + R + 1)
        c0, c1 = max(0, ci - R), min(res, ci + R + 1)
        yy, xx = np.mgrid[r0:r1, c0:c1]
        d2 = ((yy - ri) ** 2 + (xx - ci) ** 2) / (rad * rad)
        shade[r0:r1, c0:c1] = np.maximum(shade[r0:r1, c0:c1], np.clip(1 - d2, 0, 1))
    shade = box_blur(shade, 3)

    def toward(w, target, t):
        return w + (np.array(target, np.float32) - w) * t[..., None]

    w = np.zeros((res, res, 4), np.float32)
    w[..., 0] = 1.0
    w = toward(w, (0, 1, 0, 0), fields['dryness'])
    w = toward(w, (0, 0, 0, 1), np.clip(fields['mq'] * 0.9 + shade * 0.7, 0, 1))   # leaf litter under trees
    w = toward(w, (0, 1, 0, 0), fields['soil'])
    w = toward(w, (0, 0, 1, 0), fields['rock'])
    w = toward(w, (0, 0.6, 0.4, 0), fields['scree'] * 0.7)
    w = toward(w, (0, 1, 0, 0), fields['trail'] * 0.95)
    # Quarter resolution (0.43 m/px) is plenty: the runtime shader height-blends
    # the layers, which gives the transitions their crisp, natural edges.
    w = w.reshape(res // 4, 4, res // 4, 4, 4).mean(axis=(1, 3))
    path = os.path.join(OUT_TEX_DIR, 'splat.png')
    write_png(path, u8(w))
    print(f'TEXTURE splat: {os.path.getsize(path) // 1024} KB')

    X, Y = fields['X'], fields['Y']
    ao = np.clip(1.0 - 0.09 * fields['cav'], 0.7, 1.1)
    variation = 1.0 + 0.1 * fbm(PN[6], X / 25.0, Y / 25.0, 3)
    macro = ao * variation * (1 - 0.32 * shade)
    macro = macro.reshape(res // 2, 2, res // 2, 2).mean(axis=(1, 3))   # low-frequency: half res is plenty
    path = os.path.join(OUT_TEX_DIR, 'macro.jpg')
    save_jpeg_from_array(path, np.repeat((macro * 0.5)[..., None], 3, axis=2), 90)
    print(f'TEXTURE macro: {os.path.getsize(path) // 1024} KB')


# ---------------------------------------------------------------- vegetation & rocks (placement)

def level_band_clear(H, above):
    """False where a point sits just above a contour level — anything planted
    there would poke out under its slice when the slice is lifted."""
    ok = np.ones(H.shape, dtype=bool)
    for L in LEVELS_M:
        ok &= ~((H > L - 0.1) & (H < L + above))
    return ok


def place_trees(fields):
    """Mediterranean woodland: maquis shrubs and oaks on the lower and middle
    slopes (cooler north faces and ravine floors first), and Aleppo-pine groves
    — the planted-forest look of Israeli hills — on the gentle side."""
    rng = np.random.default_rng(99)
    spacing = 2.3
    g = np.arange(-HALF_M + 4, HALF_M - 4, spacing)
    GX, GY = np.meshgrid(g, g)
    X = (GX + rng.uniform(-1.0, 1.0, GX.shape)).ravel()
    Y = (GY + rng.uniform(-1.0, 1.0, GY.shape)).ravel()
    H, _, m = terrain(X, Y)
    e = 1.2
    sx = (terrain(X + e, Y)[0] - terrain(X - e, Y)[0]) / (2 * e)
    sy = (terrain(X, Y + e)[0] - terrain(X, Y - e)[0]) / (2 * e)
    slope = np.hypot(sx, sy)
    north = np.clip(-sy / (slope + 1e-6), -1, 1) * smoothstep(0.05, 0.3, slope)

    forest = smoothstep(-0.2, 0.25, fbm(PN[8], X / 30.0, Y / 30.0, 3))
    dens = forest * (1 - smoothstep(0.6, 0.95, slope)) * (1 - smoothstep(0.68, 0.86, m))
    dens *= 0.55 + 0.45 * np.clip(north + 0.4, 0, 1)
    dens *= np.where(m < 0.06, 0.14, 1.0)
    dens *= (1 - sample('rock', fields, X, Y)) * (1 - sample('trail', fields, X, Y))
    dens *= level_band_clear(H, 1.6)
    keep = rng.random(X.shape) < dens * 0.95
    idx = np.nonzero(keep)[0]
    if len(idx) > 1400:
        idx = rng.choice(idx, 1400, replace=False)

    pine_zone = smoothstep(0.05, 0.25, fbm(PN[10], X / 55.0, Y / 55.0, 2)) * smoothstep(0.08, 0.14, m) * (1 - smoothstep(0.5, 0.62, m))
    trees = []
    for i in idx:
        r = rng.random()
        if pine_zone[i] > 0.5 and r < 0.8:
            sp = 'pine'
        elif r < 0.5:
            sp = 'shrub'
        else:
            sp = 'oak'
        crown = {'pine': rng.uniform(2.4, 3.5), 'oak': rng.uniform(1.8, 3.0), 'shrub': rng.uniform(0.7, 1.4)}[sp]
        trees.append({'x': X[i], 'y': Y[i], 'h': H[i], 'species': sp, 'crown': crown, 'seed': int(rng.integers(1 << 30))})
    return trees


def place_boulders(fields):
    rng = np.random.default_rng(7)
    n = 40000
    X = rng.uniform(-HALF_M + 3, HALF_M - 3, n)
    Y = rng.uniform(-HALF_M + 3, HALF_M - 3, n)
    rock = sample('rock', fields, X, Y)
    scree = sample('scree', fields, X, Y)
    p = 0.012 * rock + 0.03 * scree
    H = terrain(X, Y)[0]
    keep = (rng.random(n) < p) & level_band_clear(H, 0.9)
    out = []
    for i in np.nonzero(keep)[0][:380]:
        r = rng.uniform(0.35, 1.0) if rng.random() < 0.75 else rng.uniform(1.0, 1.9)
        out.append({'x': X[i], 'y': Y[i], 'h': H[i], 'r': r, 'seed': int(rng.integers(1 << 30))})
    return out


def place_grass(fields):
    rng = np.random.default_rng(11)
    n = 170000
    X = rng.uniform(-HALF_M + 1, HALF_M - 1, n)
    Y = rng.uniform(-HALF_M + 1, HALF_M - 1, n)
    rock = sample('rock', fields, X, Y)
    dry = sample('dryness', fields, X, Y)
    mq = sample('mq', fields, X, Y)
    trail = sample('trail', fields, X, Y)
    slope = sample('slope', fields, X, Y)
    p = (1 - rock) * (1 - trail) * (1 - 0.6 * mq) * (1 - smoothstep(0.8, 1.2, slope)) * 0.42
    keep = rng.random(n) < p
    X, Y, dry = X[keep], Y[keep], dry[keep]
    H = terrain(X, Y)[0]
    ok = level_band_clear(H, 0.35)
    X, Y, H, dry = X[ok], Y[ok], H[ok], dry[ok]
    cap = 48000
    if len(X) > cap:
        sel = rng.choice(len(X), cap, replace=False)
        X, Y, H, dry = X[sel], Y[sel], H[sel], dry[sel]
    return {'x': X, 'y': Y, 'h': H, 'dry': dry, 'rng': rng}


# ---------------------------------------------------------------- vegetation & rocks (geometry)

def _ico():
    t = (1 + 5 ** 0.5) / 2
    v = np.array([(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t),
                  (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)], dtype=np.float64)
    v /= np.linalg.norm(v, axis=1, keepdims=True)
    f = np.array([(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2),
                  (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5),
                  (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)], dtype=np.int64)
    return v[:, [0, 2, 1]], f[:, [0, 2, 1]]     # to z-up, keep outward winding


def _subdivide(v, f):
    verts = [tuple(p) for p in v]
    cache = {}

    def mid(a, b):
        key = (min(a, b), max(a, b))
        if key not in cache:
            p = (np.array(verts[a]) + np.array(verts[b])) / 2
            verts.append(tuple(p / np.linalg.norm(p)))
            cache[key] = len(verts) - 1
        return cache[key]

    out = []
    for a, b, c in f:
        ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
        out += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
    return np.array(verts), np.array(out, dtype=np.int64)


ICO_V, ICO_F = _ico()
ICO2_V, ICO2_F = _subdivide(ICO_V, ICO_F)


def vertex_normals(co, tris):
    fn = np.cross(co[tris[:, 1]] - co[tris[:, 0]], co[tris[:, 2]] - co[tris[:, 0]])
    vn = np.zeros_like(co)
    for k in range(3):
        np.add.at(vn, tris[:, k], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


class Deco:
    """Accumulates triangle geometry (units, Blender z-up) with per-vertex
    uv / colour / normal and per-face material, to be merged into a slice."""

    def __init__(self):
        self.co, self.tris, self.uv, self.col, self.nrm, self.mat = [], [], [], [], [], []
        self.n = 0

    def add(self, co, tris, mat, uv=None, col=None, nrm=None):
        co = np.asarray(co, np.float64)
        tris = np.asarray(tris, np.int64)
        V = len(co)
        self.co.append(co)
        self.tris.append(tris + self.n)
        self.n += V
        self.uv.append(np.zeros((V, 2)) if uv is None else np.asarray(uv, np.float64))
        col = np.ones(4) if col is None else np.asarray(col, np.float64)
        self.col.append(np.broadcast_to(col, (V, 4)) if col.ndim == 1 else col)
        self.nrm.append(vertex_normals(co, tris) if nrm is None else np.asarray(nrm, np.float64))
        self.mat.append(np.full(len(tris), MI[mat]))

    def empty(self):
        return self.n == 0


def tree_geometry(t, deco):
    rng = np.random.default_rng(t['seed'])
    sp = t['species']
    x, y, z0 = t['x'] / M_PER_UNIT, t['y'] / M_PER_UNIT, z_units(t['h'])
    cr = t['crown'] / M_PER_UNIT
    up = np.array([0.0, 0.0, 1.0])

    if sp == 'pine':
        trunk_h = rng.uniform(4.5, 7.0) / M_PER_UNIT
        leaf = srgb('#3A4A2E') * rng.uniform(0.85, 1.1)
        lumps = []
        for k in range(rng.integers(6, 9)):
            a = rng.uniform(0, 2 * math.pi)
            d = cr * rng.uniform(0.15, 0.7)
            lumps.append((np.array([d * math.cos(a), d * math.sin(a), rng.uniform(-0.15, 0.2) * cr]), cr * rng.uniform(0.38, 0.55), 0.55))
        center_z = z0 + trunk_h + cr * 0.15
    elif sp == 'oak':
        trunk_h = rng.uniform(1.0, 2.0) / M_PER_UNIT
        leaf = srgb('#4E5C30') * rng.uniform(0.85, 1.12)
        lumps = [(np.array([0.0, 0.0, 0.15 * cr]), cr * 0.62, 0.85)]
        for k in range(rng.integers(3, 6)):
            a = rng.uniform(0, 2 * math.pi)
            d = cr * rng.uniform(0.35, 0.6)
            lumps.append((np.array([d * math.cos(a), d * math.sin(a), rng.uniform(-0.25, 0.3) * cr]), cr * rng.uniform(0.42, 0.58), 0.8))
        center_z = z0 + trunk_h + cr * 0.55
    else:
        trunk_h = 0.0
        leaf = srgb('#55623A') * rng.uniform(0.8, 1.15)
        lumps = []
        for k in range(rng.integers(2, 4)):
            a = rng.uniform(0, 2 * math.pi)
            d = cr * rng.uniform(0.0, 0.45)
            lumps.append((np.array([d * math.cos(a), d * math.sin(a), 0.0]), cr * rng.uniform(0.55, 0.8), 0.7))
        center_z = z0 + cr * 0.45

    lean = rng.normal(0, 0.08, 2) * cr
    center = np.array([x + lean[0], y + lean[1], center_z])

    # trunk: 5-sided tapered prism, slightly leaning into the crown
    if trunk_h > 0:
        r0 = (rng.uniform(0.14, 0.24) if sp == 'oak' else rng.uniform(0.16, 0.26)) / M_PER_UNIT
        n = 5
        ang = np.arange(n) * 2 * math.pi / n + rng.uniform(0, 1)
        bot = np.stack([x + r0 * np.cos(ang), y + r0 * np.sin(ang), np.full(n, z0 - 0.2 / M_PER_UNIT)], 1)
        top_c = np.array([center[0], center[1], center_z - 0.1 * cr])
        top = np.stack([top_c[0] + 0.55 * r0 * np.cos(ang), top_c[1] + 0.55 * r0 * np.sin(ang), np.full(n, top_c[2])], 1)
        co = np.vstack([bot, top])
        tris = []
        for k in range(n):
            k1 = (k + 1) % n
            tris += [(k, k1, n + k1), (k, n + k1, n + k)]
        axis_c = np.vstack([np.repeat([[x, y, 0.0]], n, 0), np.repeat([[top_c[0], top_c[1], 0.0]], n, 0)])
        nrm = co - axis_c
        nrm[:, 2] = 0
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        deco.add(co, tris, 'Bark', col=np.append(srgb('#4A3B2C') * rng.uniform(0.8, 1.2), 1.0), nrm=nrm)

    def crown_normal(p):
        v = p - (center - up * 0.25 * cr)
        return v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-9)

    leaf_col = np.append(leaf, 1.0)
    core_col = np.append(leaf * 0.5, 1.0)
    for off, r, cover in lumps:
        c = center + off
        squash = np.array([1.0, 1.0, 0.6 if sp == 'pine' else 0.85])
        core = c + ICO_V * r * 0.78 * squash * rng.uniform(0.9, 1.1, (len(ICO_V), 1))
        deco.add(core, ICO_F, 'LeafCore', col=core_col, nrm=crown_normal(core))
        # leaf cards around the lump, facing outward with a random roll
        k_cards = 7 if sp != 'shrub' else 6
        for _ in range(k_cards):
            d = rng.normal(0, 1, 3)
            d[2] = abs(d[2]) * 0.8 + 0.1
            d /= np.linalg.norm(d)
            pos = c + d * r * rng.uniform(0.3, 0.75) * squash
            s = r * rng.uniform(1.05, 1.45)
            a = rng.normal(0, 1, 3)
            u = np.cross(d, a)
            u /= np.linalg.norm(u)
            v = np.cross(d, u)
            quad = np.array([pos - u * s / 2 - v * s / 2, pos + u * s / 2 - v * s / 2,
                             pos + u * s / 2 + v * s / 2, pos - u * s / 2 + v * s / 2])
            cell = rng.integers(4)
            u0, v0 = (cell % 2) * 0.5, (cell // 2) * 0.5
            uv = np.array([(u0, v0), (u0 + 0.5, v0), (u0 + 0.5, v0 + 0.5), (u0, v0 + 0.5)])
            tint = leaf_col * np.array([*(rng.uniform(0.88, 1.12, 1).repeat(3)), 1.0])
            deco.add(quad, [(0, 1, 2), (0, 2, 3)], 'Leaves', uv=uv, col=tint, nrm=crown_normal(quad))


def boulder_geometry(b, deco):
    rng = np.random.default_rng(b['seed'])
    r = b['r'] / M_PER_UNIT
    v = ICO2_V.copy()
    disp = np.ones(len(v))
    for _ in range(3):
        k = rng.normal(0, 1, 3)
        disp += 0.12 * np.sin(v @ k * rng.uniform(2, 4) + rng.uniform(0, 6))
    v = v * disp[:, None]
    scale = np.array([r, r * rng.uniform(0.75, 1.2), r * rng.uniform(0.45, 0.75)])
    yaw = rng.uniform(0, 2 * math.pi)
    rot = np.array([[math.cos(yaw), -math.sin(yaw), 0], [math.sin(yaw), math.cos(yaw), 0], [0, 0, 1]])
    co = (v * scale) @ rot.T
    co += np.array([b['x'] / M_PER_UNIT, b['y'] / M_PER_UNIT, z_units(b['h']) - 0.3 * scale[2]])
    grey = srgb('#9A9486') * rng.uniform(0.75, 1.15)
    deco.add(co, ICO2_F, 'Boulder', col=np.append(grey, 1.0))


def grass_geometry(g, sel, deco):
    """Two crossed quads per tuft, vectorised. Normals point straight up so
    the tufts light like the ground they grow from."""
    rng = g['rng']
    x = g['x'][sel] / M_PER_UNIT
    y = g['y'][sel] / M_PER_UNIT
    z = z_units(g['h'][sel]) - 0.04 / M_PER_UNIT
    N = len(x)
    if N == 0:
        return
    yaw = rng.uniform(0, math.pi, N)
    w = rng.uniform(0.5, 0.95, N) / M_PER_UNIT
    h = rng.uniform(0.3, 0.62, N) / M_PER_UNIT
    variant = rng.integers(0, 2, N)
    co = np.zeros((N, 8, 3))
    for k in range(2):
        a = yaw + k * math.pi / 2
        dx, dy = np.cos(a) * w / 2, np.sin(a) * w / 2
        base = 4 * k
        co[:, base + 0] = np.stack([x - dx, y - dy, z], 1)
        co[:, base + 1] = np.stack([x + dx, y + dy, z], 1)
        co[:, base + 2] = np.stack([x + dx, y + dy, z + h], 1)
        co[:, base + 3] = np.stack([x - dx, y - dy, z + h], 1)
    tris1 = np.array([(0, 1, 2), (0, 2, 3), (4, 5, 6), (4, 6, 7)])
    tris = (tris1[None, :, :] + (np.arange(N) * 8)[:, None, None]).reshape(-1, 3)
    u0 = variant * 0.5
    uv = np.zeros((N, 8, 2))
    for k in range(2):
        b = 4 * k
        uv[:, b + 0] = np.stack([u0, np.zeros(N)], 1)
        uv[:, b + 1] = np.stack([u0 + 0.5, np.zeros(N)], 1)
        uv[:, b + 2] = np.stack([u0 + 0.5, np.ones(N)], 1)
        uv[:, b + 3] = np.stack([u0, np.ones(N)], 1)
    olive, straw = srgb('#6A7340'), srgb('#B6A874')
    dry = g['dry'][sel][:, None]
    tint = (olive + (straw - olive) * dry) * rng.uniform(0.85, 1.12, (N, 1))
    col = np.repeat(np.hstack([tint, np.ones((N, 1))])[:, None, :], 8, axis=1)
    nrm = np.zeros((N * 8, 3))
    nrm[:, 2] = 1
    deco.add(co.reshape(-1, 3), tris, 'Grass', uv=uv.reshape(-1, 2), col=col.reshape(-1, 4), nrm=nrm)


def part_index(h):
    return int(sum(h >= L for L in LEVELS_M))


# ---------------------------------------------------------------- materials

def new_material(name, hex_color, roughness=0.9, vertex_color=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*srgb(hex_color), 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    if vertex_color:
        attr = nt.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Col'
        nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def build_materials():
    vc = {'Leaves', 'LeafCore', 'Bark', 'Boulder', 'Grass'}
    colors = {'Terrain': '#8A8A5A', 'Cut': '#EFE4CC', 'Wall': '#8A7353'}
    return {n: new_material(n, colors.get(n, '#FFFFFF'), vertex_color=n in vc) for n in MATS}


# ---------------------------------------------------------------- terrain mesh + slicing

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def surface_triangles():
    """Fixed alternating-diagonal triangulation, CCW seen from +z."""
    n1 = GRID_N + 1
    j, i = np.meshgrid(np.arange(GRID_N), np.arange(GRID_N), indexing='ij')
    a = (j * n1 + i).ravel()
    b = a + 1
    c = a + n1 + 1
    d = a + n1
    even = ((i + j) % 2 == 0).ravel()
    t1 = np.where(even[:, None], np.stack([a, b, c], 1), np.stack([a, b, d], 1))
    t2 = np.where(even[:, None], np.stack([a, c, d], 1), np.stack([b, c, d], 1))
    return np.concatenate([t1, t2], axis=0).astype(np.int64)


def build_terrain_solid(X, Y, H, tris, mats):
    n1 = GRID_N + 1
    top = np.stack([X.ravel() / M_PER_UNIT, Y.ravel() / M_PER_UNIT, z_units(H.ravel())], axis=1)
    ring = [i for i in range(n1)]                                   # south, W→E
    ring += [j * n1 + GRID_N for j in range(1, n1)]                 # east, S→N
    ring += [GRID_N * n1 + i for i in range(GRID_N - 1, -1, -1)]    # north, E→W
    ring += [j * n1 for j in range(GRID_N - 1, 0, -1)]              # west, N→S
    ring = np.array(ring)
    bottom = top[ring].copy()
    bottom[:, 2] = -BASE_DEPTH_U
    verts = np.vstack([top, bottom])
    bs = len(top)
    rn = len(ring)
    k = np.arange(rn)
    k1 = (k + 1) % rn
    sides = np.stack([ring[k], bs + k, bs + k1, ring[k1]], 1)

    faces = [tuple(t) for t in tris.tolist()] + [tuple(s) for s in sides.tolist()]
    faces.append(tuple(bs + kk for kk in range(rn - 1, -1, -1)))
    mat_idx = [MI['Terrain']] * len(tris) + [MI['Wall']] * (rn + 1)

    mesh = bpy.data.meshes.new('TerrainSolid')
    mesh.from_pydata(verts.tolist(), [], faces)
    mesh.update()
    for n in MATS:
        mesh.materials.append(mats[n])
    mesh.polygons.foreach_set('material_index', mat_idx)

    # Planar top-down UVs: u = east, v = north.
    uv = mesh.uv_layers.new(name='UVMap')
    loop_v = np.zeros(len(mesh.loops), dtype=np.int64)
    mesh.loops.foreach_get('vertex_index', loop_v)
    co = verts[loop_v]
    uvs = np.stack([(co[:, 0] / HALF_U + 1) / 2, (co[:, 1] / HALF_U + 1) / 2], axis=1)
    uv.data.foreach_set('uv', uvs.ravel())

    obj = bpy.data.objects.new('TerrainSolid', mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def box_object(name, z0, z1, mat):
    e = HALF_U + 0.25
    verts = [(-e, -e, z0), (e, -e, z0), (e, e, z0), (-e, e, z0),
             (-e, -e, z1), (e, -e, z1), (e, e, z1), (-e, e, z1)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def intersect_slice(solid, z0, z1, name, mats):
    """Boolean INTERSECT of the terrain solid with a z-slab → new object whose
    material slots are exactly MATS (so decoration can be merged in)."""
    result = None
    for solver in ('MANIFOLD', 'EXACT'):
        cutter = box_object(f'{name}_cutter', z0, z1, mats['Cut'])
        mod = solid.modifiers.new('slice', 'BOOLEAN')
        mod.operation = 'INTERSECT'
        mod.solver = solver
        mod.object = cutter
        if hasattr(mod, 'material_mode'):
            mod.material_mode = 'TRANSFER'
        depsgraph = bpy.context.evaluated_depsgraph_get()
        mesh = bpy.data.meshes.new_from_object(solid.evaluated_get(depsgraph))
        solid.modifiers.remove(mod)
        bpy.data.objects.remove(cutter, do_unlink=True)
        names = [mt.name if mt else '' for mt in mesh.materials]
        idx = np.zeros(len(mesh.polygons), dtype=np.int64)
        mesh.polygons.foreach_get('material_index', idx)
        cut_faces = sum(1 for i in idx if names[i] == 'Cut') if len(idx) else 0
        if len(mesh.polygons) and cut_faces:
            result = (mesh, names, idx, solver)
            break
        print(f'  {name}: solver {solver} gave no cut faces, retrying')
        bpy.data.meshes.remove(mesh)
    mesh, names, idx, solver = result
    idx = np.array([MI.get(names[i], MI['Wall']) for i in idx])
    mesh.materials.clear()
    for n in MATS:
        mesh.materials.append(mats[n])
    mesh.polygons.foreach_set('material_index', idx)
    mesh.polygons.foreach_set('use_smooth', idx == MI['Terrain'])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    print(f'SLICE {name}: {len(mesh.polygons)} faces via {solver}')
    return obj


def merge_decoration(obj, deco):
    """Rebuild obj's mesh as (slice geometry + decoration) straight from numpy
    arrays, with a colour attribute and custom split normals for everything."""
    mesh = obj.data
    nv, npoly, nl = len(mesh.vertices), len(mesh.polygons), len(mesh.loops)
    co = np.empty(nv * 3, np.float32)
    mesh.vertices.foreach_get('co', co)
    ls = np.empty(npoly, np.int32)
    mesh.polygons.foreach_get('loop_start', ls)
    mi = np.empty(npoly, np.int32)
    mesh.polygons.foreach_get('material_index', mi)
    sm = np.empty(npoly, bool)
    mesh.polygons.foreach_get('use_smooth', sm)
    lv = np.empty(nl, np.int32)
    mesh.loops.foreach_get('vertex_index', lv)
    uv = np.empty(nl * 2, np.float32)
    mesh.uv_layers['UVMap'].data.foreach_get('uv', uv)
    cn = np.empty(nl * 3, np.float32)
    mesh.corner_normals.foreach_get('vector', cn)

    if deco.empty():
        dco = np.zeros((0, 3))
        dtris = np.zeros((0, 3), np.int64)
        duv = np.zeros((0, 2))
        dcol = np.zeros((0, 4))
        dnrm = np.zeros((0, 3))
        dmat = np.zeros(0, np.int64)
    else:
        dco = np.vstack(deco.co)
        dtris = np.vstack(deco.tris)
        vuv, vcol, vnrm = np.vstack(deco.uv), np.vstack(deco.col), np.vstack(deco.nrm)
        loops = dtris.ravel()
        duv, dcol, dnrm = vuv[loops], vcol[loops], vnrm[loops]
        dmat = np.concatenate(deco.mat)
    F = len(dtris)

    co_all = np.concatenate([co, dco.ravel().astype(np.float32)])
    lv_all = np.concatenate([lv, (dtris.ravel() + nv).astype(np.int32)])
    ls_all = np.concatenate([ls, (nl + 3 * np.arange(F)).astype(np.int32)])
    mi_all = np.concatenate([mi, dmat.astype(np.int32)])
    sm_all = np.concatenate([sm, np.ones(F, bool)])
    uv_all = np.concatenate([uv, duv.ravel().astype(np.float32)])
    col_all = np.concatenate([np.ones(nl * 4, np.float32), dcol.ravel().astype(np.float32)])
    cn_all = np.concatenate([cn, dnrm.ravel().astype(np.float32)]).reshape(-1, 3)

    new = bpy.data.meshes.new(obj.name)
    new.vertices.add(len(co_all) // 3)
    new.vertices.foreach_set('co', co_all)
    new.loops.add(len(lv_all))
    new.loops.foreach_set('vertex_index', lv_all)
    new.polygons.add(len(ls_all))
    new.polygons.foreach_set('loop_start', ls_all)
    new.update(calc_edges=True)
    new.polygons.foreach_set('material_index', mi_all)
    new.polygons.foreach_set('use_smooth', sm_all)
    for m in mesh.materials:
        new.materials.append(m)
    uvl = new.uv_layers.new(name='UVMap')
    uvl.data.foreach_set('uv', uv_all)
    col = new.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    col.data.foreach_set('color', col_all)
    # Make it the one colour set the exporter writes (as COLOR_0) — otherwise
    # it emits a white COLOR_0 and puts the tints in COLOR_1, which three.js ignores.
    new.color_attributes.active_color_name = 'Col'
    new.color_attributes.default_color_name = 'Col'
    new.normals_split_custom_set(cn_all)
    new.update()
    obj.data = new
    bpy.data.meshes.remove(mesh)
    print(f'  {obj.name}: +{F} decoration tris, {len(ls_all)} faces total')


# ---------------------------------------------------------------- contours

def extract_contour(xy, zs, tris, level_z):
    """Exact iso-line of the triangle surface at z = level_z → list of loops."""
    above = zs[tris] > level_z
    cnt = above.sum(axis=1)
    mixed = np.nonzero((cnt == 1) | (cnt == 2))[0]
    adj = {}
    pts = {}

    def cross(a, b):
        key = (a, b) if a < b else (b, a)
        if key not in pts:
            za, zb = zs[a], zs[b]
            t = (level_z - za) / (zb - za)
            pts[key] = xy[a] + t * (xy[b] - xy[a])
        return key

    for ti in mixed:
        a, b, c = (int(v) for v in tris[ti])
        keys = []
        for p, q in ((a, b), (b, c), (c, a)):
            if (zs[p] > level_z) != (zs[q] > level_z):
                keys.append(cross(p, q))
        if len(keys) == 2:
            k0, k1 = keys
            adj.setdefault(k0, []).append(k1)
            adj.setdefault(k1, []).append(k0)

    loops = []
    seen = set()
    for start in adj:
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        prev, cur = None, start
        while True:
            nxt = [k for k in adj[cur] if k != prev]
            if not nxt or nxt[0] == start or nxt[0] in seen:
                break
            loop.append(nxt[0])
            seen.add(nxt[0])
            prev, cur = cur, nxt[0]
        loops.append(np.array([pts[k] for k in loop]))
    loops.sort(key=len, reverse=True)
    return loops


def to_map(p_units):
    x, y = p_units
    return ((x + HALF_U) / (2 * HALF_U) * 100.0, (HALF_U - y) / (2 * HALF_U) * 100.0)


def douglas_peucker(points, tol):
    pts = np.asarray(points)
    if len(pts) < 3:
        return pts
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        s, e = stack.pop()
        if e <= s + 1:
            continue
        a, b = pts[s], pts[e]
        ab = b - a
        seg = pts[s + 1:e] - a
        L = np.hypot(*ab)
        d = np.hypot(seg[:, 0], seg[:, 1]) if L == 0 else np.abs(ab[0] * seg[:, 1] - ab[1] * seg[:, 0]) / L
        k = int(np.argmax(d))
        if d[k] > tol:
            m = s + 1 + k
            keep[m] = True
            stack.append((s, m))
            stack.append((m, e))
    return pts[keep]


def simplify_closed(loop_map, tol):
    pts = np.asarray(loop_map)
    far = int(np.argmax(np.hypot(pts[:, 0] - pts[0, 0], pts[:, 1] - pts[0, 1])))
    a = douglas_peucker(pts[:far + 1], tol)
    b = douglas_peucker(np.vstack([pts[far:], pts[:1]]), tol)
    return np.vstack([a, b[1:-1]])


def ray_hit(rings, origin, angle_rad):
    """Nearest crossing of a ray (map coords, north up) with any ring."""
    ox, oy = origin
    dx, dy = math.cos(angle_rad), -math.sin(angle_rad)   # map y grows southward
    best = None
    for loop_map in rings:
        n = len(loop_map)
        for i in range(n):
            p = loop_map[i]
            q = loop_map[(i + 1) % n]
            ex, ey = q[0] - p[0], q[1] - p[1]
            den = dx * ey - dy * ex
            if abs(den) < 1e-12:
                continue
            wx, wy = p[0] - ox, p[1] - oy
            t = (wx * ey - wy * ex) / den
            u = (wx * dy - wy * dx) / den
            if t > 0 and 0 <= u <= 1 and (best is None or t < best[0]):
                best = (t, ox + t * dx, oy + t * dy, math.degrees(math.atan2(ey, ex)))
    if best is None:
        raise RuntimeError('ray missed contour')
    _, x, y, ang = best
    if ang > 90:
        ang -= 180
    elif ang < -90:
        ang += 180
    return x, y, ang


# ---------------------------------------------------------------- data module

def fmt(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s in ('', '-0') else s


def write_data_ts(path, levels, summit_map, summit_h):
    L = []
    L.append('// AUTO-GENERATED by scripts/blender/build_contour_mountain.py — do not edit by hand.')
    L.append('// Contour rings are the exact iso-lines of the same triangle surface the')
    L.append('// contour-mountain.glb slices were cut from. Map coords: 0–100, north up.')
    L.append('')
    L.append('export type MapPoint = readonly [number, number];')
    L.append('export type RayHit = { readonly x: number; readonly y: number; readonly angle: number };')
    L.append('export type ContourLevel = {')
    L.append('  /** Contour height in metres. */')
    L.append('  readonly heightM: number;')
    L.append('  /** Contour height in model units (three.js y) — includes vertical exaggeration. */')
    L.append('  readonly yUnits: number;')
    L.append('  /** Closed rings, longest first (usually one; detail can split off small islands). */')
    L.append('  readonly rings: readonly (readonly MapPoint[])[];')
    L.append('  /** Where each measuring ray from the summit crosses this contour. */')
    L.append('  readonly label: RayHit;')
    L.append('  readonly steep: RayHit;')
    L.append('  readonly gentle: RayHit;')
    L.append('};')
    L.append('')
    L.append('export const MOUNTAIN = {')
    L.append('  /** Half the diorama side in model units; map 0–100 spans [-half, +half]. */')
    L.append(f'  halfUnits: {fmt(HALF_U)},')
    L.append(f'  metersPerUnit: {fmt(M_PER_UNIT)},')
    L.append(f'  verticalExaggeration: {fmt(VE)},')
    L.append(f'  summit: {{ x: {fmt(summit_map[0])}, y: {fmt(summit_map[1])}, heightM: {summit_h} }},')
    L.append('  levels: [')
    for lv in levels:
        L.append('    {')
        L.append(f"      heightM: {lv['heightM']},")
        L.append(f"      yUnits: {lv['yUnits']:.4f},")
        for key in ('label', 'steep', 'gentle'):
            x, y, a = lv[key]
            L.append(f'      {key}: {{ x: {fmt(x)}, y: {fmt(y)}, angle: {a:.1f} }},')
        L.append('      rings: [')
        for ring in lv['rings']:
            L.append('        [' + ', '.join(f'[{fmt(x)}, {fmt(y)}]' for x, y in ring) + '],')
        L.append('      ],')
        L.append('    },')
    L.append('  ] as readonly ContourLevel[],')
    L.append('} as const;')
    L.append('')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(L))
    print(f'WROTE_DATA:{path} ({os.path.getsize(path) // 1024} KB)')


# ---------------------------------------------------------------- main

def main():
    clear_scene()
    os.makedirs(OUT_TEX_DIR, exist_ok=True)

    fetch_polyhaven()
    if PLANTS:
        leaf_atlas(os.path.join(OUT_TEX_DIR, 'leaves.png'))
        grass_texture(os.path.join(OUT_TEX_DIR, 'grass.png'))

    xs = np.linspace(-HALF_M, HALF_M, GRID_N + 1)
    X, Y = np.meshgrid(xs, xs)             # [j, i]: j along y (south→north), i along x
    H = terrain(X, Y)[0]
    tris = surface_triangles()
    peak = float(H.max())
    print(f'PEAK_M:{peak:.2f}')

    fields = base_fields()
    trees = place_trees(fields) if PLANTS else []
    if PLANTS:
        boulders = place_boulders(fields)
        grass = place_grass(fields)
        print(f'PLANTS: {len(trees)} trees ({sum(t["species"] == "pine" for t in trees)} pines), '
              f'{len(boulders)} boulders, {len(grass["x"])} grass tufts')
    write_surface_maps(fields, trees)
    del fields

    mats = build_materials()
    solid = build_terrain_solid(X, Y, H, tris, mats)
    zl = [z_units(L) for L in LEVELS_M]
    z_top = z_units(peak) + 0.5
    parts = [intersect_slice(solid, -BASE_DEPTH_U - 1.0, zl[0], 'Base', mats)]
    for i in range(len(zl)):
        z1 = zl[i + 1] if i + 1 < len(zl) else z_top
        parts.append(intersect_slice(solid, zl[i], z1, f'Slice_{i + 1}', mats))
    bpy.data.objects.remove(solid, do_unlink=True)

    # Everything planted belongs to the slice its base stands on.
    if PLANTS:
        grass_part = np.array([part_index(h) for h in grass['h']])
        for k, obj in enumerate(parts):
            deco = Deco()
            for t in trees:
                if part_index(t['h']) == k:
                    tree_geometry(t, deco)
            for b in boulders:
                if part_index(b['h']) == k:
                    boulder_geometry(b, deco)
            grass_geometry(grass, grass_part == k, deco)
            merge_decoration(obj, deco)

    # --- contours from the very same triangles
    xy = np.stack([X.ravel() / M_PER_UNIT, Y.ravel() / M_PER_UNIT], axis=1)
    zs = z_units(H.ravel())
    summit_map = to_map(xy[int(np.argmax(H))])
    levels = []
    for L, z in zip(LEVELS_M, zl):
        loops = [lp for lp in extract_contour(xy, zs, tris, z) if len(lp) >= 12]
        rings = []
        for lp in loops:
            lm = np.array([to_map(p) for p in lp])
            if np.any((lm < 0.5) | (lm > 99.5)):
                raise RuntimeError(f'contour {L} m touches the diorama edge')
            rings.append(simplify_closed(lm, 0.03))
        lv = {'heightM': L, 'yUnits': z, 'rings': rings}
        for key, ang in RAYS.items():
            lv[key] = ray_hit(rings, summit_map, ang)
        levels.append(lv)
        print(f'CONTOUR {L} m: {len(rings)} ring(s), {[len(r) for r in rings]} pts')

    write_data_ts(OUT_DATA_TS, levels, summit_map, int(round(peak)))

    # --- export (geometry only — every texture is loaded by the runtime)
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    out_glb = os.path.join(OUT_ASSET_DIR, 'contour-mountain.glb')
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=PLANTS,     # only the card textures read UVs
        export_materials='EXPORT',
        export_image_format='NONE',
        export_vertex_color='ACTIVE',
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=16,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_draco_color_quantization=8,
    )
    tri_total = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in parts)
    print(f'WROTE_GLB:{out_glb} ({os.path.getsize(out_glb) // 1024} KB, ~{tri_total} tris)')


main()
