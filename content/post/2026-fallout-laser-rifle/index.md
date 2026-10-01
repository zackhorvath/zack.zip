---
title: Fallout Automatic Laser Rifle
description: Build log of my Automatic Laser Rifle
slug: fallout-automatic-laser-rifle
date: 2026-09-28T05:24:26.329Z
tags:
    - cosplay
    - prop
    - fallout
    - 3d-printed
categories:
    - cosplay
    - 3d-printing
---
# Fallout Automatic Laser Rifle


## Decals & Stencils
One of the things I thought would really elevate this build would be to include game accurate decals on the laser. I had a pretty hard time finding resources on these, so I ended up making my own based on texture rips from the Fallout 4 HD pack.

### Tools Used
#### Software
This could be its own blog post, so I'll keep the nerd shit short.

I started with the [Bethesda Archive Extractor](https://www.nexusmods.com/skyrimspecialedition/mods/974) to dump out the DDS files, which look like this:
![Triple Barrel Laser Texture](AssaultBarrel_d.png)

From there a series of python and machine learning libraries were used to isolate, clean up, and export the decals, running locally in my lab environment:
```
game textures (.dds/.png)  ──┐
STL stencils                 ├─► measure (NumPy/SciPy/trimesh)
A4 reference PDF (Poppler)  ──┘         │
                                        ▼
                     rebuild as geometry (Shapely + fontTools)
                                        │
                        ┌───────────────┼────────────────┐
                        ▼               ▼                ▼
                 curves-only SVG   600 DPI PNG     weathered PNG
                 (mm canvases)     (cairosvg)      (noise pipeline)
```

The end results were fairly accurate to the texture rips, with some SVG cleanup happening directly in Inkscape to close bodies and make them stencil cutter friendly.