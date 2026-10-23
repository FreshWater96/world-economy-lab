# Atlas — World Economy Lab

An interactive, browser-local computational economics sandbox. The website includes a world map, synthetic trade network, six-sector output accounting, household/firm/bank observatory, quarterly macro trajectories, scenario comparisons, capital injection flow decomposition, sensitivity analysis and CSV/JSON export.

## What is implemented

- 35 named economies plus a residual rest-of-world aggregate; 216 country-sector nodes.
- World Bank World Development Indicators common-year 2023 baseline. Every original value, indicator and source update date is in `dist/baseline.json`. Missing values use explicit defaults in `prepare()`; the UI lists their series.
- Synthetic input-output coefficients and gravity-weighted import allocation. Calibrated starting country value added matches observed GDP; final demand is nonnegative.
- Convergent Leontief fixed-point solver, `x = Ax + d`, coupled to illustrative quarterly macro feedback.
- 2,304 heterogeneous representative agents: 1,296 household cohorts, 864 firms, 144 banks. Reproducible linear-congruential initialization, bounded behavioral rules and aggregate country-state interaction.
- Shocks: fiscal spending, policy rates, tariffs, energy, supply disruption, carbon cost, climate damage and sentiment.
- GDP-weighted global targeting or one-country targeting. One-off fiscal spending converts to annualized quarterly flow as `4 × budget`; cash-flow decomposition uses the actual budget.
- Native SVG map/charts/flow diagrams, accessible controls, responsive layout, local-storage scenarios, comparison and exports.

## Interpretation

This is an exploratory IO + agents + stylized macro model. It is not a fitted macroeconometric forecasting system, a full optimizing CGE model, a real-time economic digital twin, or a learned-agent simulation. Bilateral trade weights, IO coefficients, behavioral responses, debt, rates and bank stress are assumptions. WDI exports/imports are observed country ratios; the displayed corridor flows are synthetic intermediate inputs only.

GDP uses value added, not gross output. USD trajectories are real-output proxies in 2023 dollars. No-shock final demand is recalibrated each quarter from country output growth trends to preserve those trends while retaining the fixed IO structure. Supply-capacity closure uniformly rations global final demand and re-solves the IO system; this is deliberately conservative and can overstate synchronized spillovers.

Technology is a 16% allocation of observed services; energy and infrastructure each receive 50% of non-manufacturing industry. Wage, profit and tax shares in the budget decomposition are illustrative 58%, 29% and 13%. Capital allocated to those accounts conserves the budget; intermediate flows must not be added to GDP.

## Reproduce and validate

The application is buildless ES modules. Serve `dist/` with any HTTP static server (ES modules and JSON fetch cannot be run reliably from `file://`).

Run `node tests.mjs` for numerical verification. Re-fetch WDI observations with `python fetch_data.py`; regenerate simplified public-domain Natural Earth geometry with `python fetch_map.py`. These require public network access; the delivered website works from its bundled data.

Numerical tests cover baseline GDP reconciliation, productive coefficients, solver convergence, exact no-shock growth paths, same-seed reproducibility, shock directions, annualization of a $100M injection, flow conservation and finite/consistent 10-year stress runs. DOM interaction checks were performed separately. Full visual browser QA was unavailable in this environment.

## Source references

- World Bank API: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
- GDP metadata: https://data.worldbank.org/indicator/NY.GDP.MKTP.CD
- OECD ICIO methodological reference (not ingested): https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html
- Natural Earth geometry distribution: https://github.com/datasets/geo-countries

The supplied Site is private by default. Scenario storage is specific to the current browser; export JSON for portability. Refreshing WDI observations changes only the current browser session. No paid API or server compute is required.

## Terminal UI revision

Desktop uses a fixed viewport with 20/55/25 columns for policy controls, the visualization canvas and delta output/diagnostics; a full-width execution ledger occupies the bottom region. Square panels, compact rows and monospaced financial values use the requested dark palette. Compact top tabs retain all six workspaces. Mobile stacks the same regions.

Exact numeric editors complement every shock slider. The right column contains paired output deltas, quarterly playback, speed/step controls, solver iterations/residuals, accounting error, rationing, compute duration and phase space. Canvas modes switch geography, synthetic trade network and capital flows. The input-output matrix remains available through INSPECT A.

Execution ledger entries originate from the actual per-quarter solver callback or actual interface events, with timestamps and run IDs. They distinguish solver ticks from playback of precomputed states. Event filtering, JSON log export and clear controls are available. No solver equations or parameter defaults changed in this revision.
