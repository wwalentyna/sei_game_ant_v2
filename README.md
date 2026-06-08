# SAI Governance Challenge V2 — English version

This is an English-only React/Vite game for GitHub Pages.

## What changed compared with the simple version

- English only, no German/English selector.
- Introduction screen added.
- Research gap added: alternative engineered aerosol particles vs sulfate.
- Level 4 added: particle material / research gap (sulfate, CaCO3/calcite, future engineered particle).
- Ten rounds: 2030 to 2130.
- Limited Governance Points per decade.
- Random/extreme event cards: termination shock, overcooling, rainfall crisis, particle surprise, crop shock.
- Earth visual status card: managed, hot, overcooled, or crisis Earth.
- New GitHub Pages workflow included.

## Local test

```bash
npm install
npm run dev
```

## Build test

```bash
npm run build
```

## GitHub Pages

1. Create a new repository, for example `sei_game_ant_v2`.
2. Upload all files from this folder.
3. Go to `Settings -> Pages`.
4. Set `Source: GitHub Actions`.
5. Go to `Actions` and run `Deploy to GitHub Pages`.

The site should appear at:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/
```

The Vite config uses `base: './'`, so the website should work even if you rename the repository.

## Source logic used in the game

The introduction now names the three research papers and connects them to the game logic:

- Seasonally Modulated Stratospheric Aerosol Geoengineering Alters the Climate Outcomes: seasonality and regional trade-offs.
- The impact of stratospheric aerosol injection: a regional case study: Global South, heat extremes, wet-season precipitation, soil moisture and crops.
- Solar Geoengineering in the Polar Regions: A Review: polar cooling, ice preservation and rainfall-shift risk.

The Level 4 material choice represents the research gap: sulfate is the studied baseline, CaCO3/calcite is partly known, and future engineered particles remain uncertain until enough lab/model evidence exists.
