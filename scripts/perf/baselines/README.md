# 3D benchmark baselines

Results of `npm run perf:3d` (scripts/perf/bench-3d.mjs) to compare a later run with:

```
npm run build
npm run perf:3d -- --json=after.json --compare=scripts/perf/baselines/rtx-a5000-hw.json
```

`--compare` exits 1 when a model got worse beyond the tolerances in bench-3d.mjs (`LIMITS`): more frames at
rest or off-screen, more draw calls, triangles or shadow passes, a slower drag, a slower return to full
resolution, more live WebGL contexts, more heap growth or more closed canvases kept alive over mount cycles.

A baseline is only comparable with a run **on the same machine, with the same options**. Frame rates are
the machine's; draw calls, triangles, shadow passes, idle and off-screen frames are the model's own and
travel better. On another machine, take a baseline of the current main first, then compare the change
with it.

| File | Machine | Options |
|---|---|---|
| `rtx-a5000-hw.json` | NVIDIA RTX A5000, Xeon W-2265, Windows 11, Chrome 156, 1440 × 900 at 1× | `--cycles=3` |
| `rtx-a5000-cpu4-low.json` | the same | `--cpu=4 --tier=low` (a slow CPU, the integrated-GPU policy) — a subset |
| `rtx-a5000-swiftshader.json` | the same | `--gpu=sw` (SwiftShader: a browser drawing without the GPU) — a subset |

Taken 2026-11-10 from the build that introduced the shared 3D performance system (design/docs/assumptions.md,
"3D performance, second pass"). The CPU-throttled and SwiftShader files were measured just before the last
change of that pass (the closed-renderer release, which does not touch drawing). Simulated weak hardware is a stand-in, not a measurement of a real Intel UHD 630.
