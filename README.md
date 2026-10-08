# מעבדת המאקרו: סימולטור IS-LM, AD-AS ומנדל-פלמינג

An interactive macroeconomics simulator for the Hebrew University course *Macroeconomics A*.
The interface is in Hebrew (RTL); the code is in English.

## Features

- **Control panel in three steps:** (1) the economy (closed, small open, or two economies; exchange-rate regime and band options), (2) what changed (direction buttons per shock, grouped as a question lists them, with a summary of the chosen shocks; arrow keys move between ↓ – ↑), (3) alternative assumptions (collapsed). Curve shapes and capital-mobility extensions sit in a collapsed "advanced" section.
- **Signs, not numbers (as in the course's exercises and exams):** shocks are entered by direction only (↑ / ↓). Every result is a sign (+, −, =, ?) computed over a grid of admissible slopes and relative shock sizes, so opposing shocks give "?" exactly as in the exam keys (tests reproduce several official keys from 2024–2026). The charts have no numbers on their axes; they draw one realization, and when the outcome depends on sizes a case picker lists the distinct cases (like the case splits in the exam solutions). Case studies and learning-center questions load with their given sizes; one click explores every size instead.
- **Timeline (Lecture 5, slide 3):** starting point (long-run equilibrium) → immediate run (P, w, K fixed; Y set by demand) → short run (P adjusts on SRAS, w fixed) → medium run (w adjusts, Y = Y\*), advanced with "Next Period". The names match the course and its exams.
- **Linked charts** as a 2×2 square (RTL, so the first column is on the right):
  - top row: IS-LM, and the money market to its left (same i axis);
  - bottom row: AD-AS directly below IS-LM (same Y axis), and the labor market (Lecture 4: W/P against L, labor demand = MPL, full employment L*) below the money market;
  - a compact "how to read" strip sits above the square, and a full-width "change vs. origin" panel below it lets students pick any variables and see each one's change at every horizon on its own scale.
- **Fixed axes:** every chart uses a fixed range (`FIXED_DOMAINS` in `src/engine/model.js`), so sliders and shocks never rescale the axes and the starting point (Y = 1000, i = 3%, P = 1) never moves. A point that leaves the range is pinned to the edge, drawn hollow, and flagged under the chart.
  - Dashed guides at the current equilibrium carry i across and Y down. On narrow screens the charts stack in reading order.
  - Below the square: the FX market (open economy; E against the quantity of foreign currency, supply and demand of foreign currency, the peg or band edges, and the central bank's intervention at the held rate, as the exam solutions draw it).
- **Transmission chains:** immediate-run chains are theory templates; short- and medium-run chains are generated from the solved model.
- **Live algebra:** every number is bound to the solved equilibrium and flashes in its sector color when it changes.
- **Sign table:** the variables table uses the learning-center format (+ / − / = per horizon, plus a medium run vs. origin column). In the open economy it includes external debt, the sum of the trade deficits of the horizons so far.
- **Economic debugger:** pop-up alerts for theoretical constraints, including the liquidity trap, the trilemma, money neutrality, fiscal policy under a floating rate, and a missing long-run equilibrium.
- **Assumption toggles:**
  - Supply side as in the course (no "schools" toggle). Instead, an **alternative-assumptions** panel switches on the single changes that exams and learning centers make: investment independent of i, consumption depending on i, investment depending on Y, money demand independent of Y, money demand perfectly elastic in i (closed), exports independent of a\*, fixed labor demand (vertical short-run AS, horizontal immediate AS), and a central bank that keeps M/P constant (vertical AD, no medium-run equilibrium).
  - Economy: closed or small open.
  - Exchange-rate regime: fixed, floating, or an exchange-rate band (learning center 7): E floats inside [E_low, E_high]; at an edge the central bank buys or sells foreign currency, so the economy behaves as under a peg at that edge, and the money created or absorbed stays in the economy in later steps. The band width is a sensitivity slider, the rate can start inside the band or exactly at either edge, the band can be one-sided (floor or ceiling only), and both edges can be shifted as shocks.
  - Capital mobility: perfect, partial or none.
  - Economy size: small open economy, or a **two-economy world** (Lecture 12) with a slider for the home share of world output ω. ω = 0.5 gives two equal economies; a small ω converges to the small-open-economy results.
- **Sensitivity sliders:** c, b, t, δ, h, k, m, n, κ (and ω). They rotate the curves around the starting equilibrium.
  - t: proportional tax T = T̄ + tY (Lecture 2 exercise), an automatic stabilizer; multiplier 1/[1 − c(1 − t)].
  - δ: government spending G = G₀ + δY (learning center 4); multiplier 1/(1 − c − δ).
  - k = 0 (closed economy): money demand independent of output, flat LM (learning center 4).
- **Monetary instrument:** the money stock M, as in the course model (Lectures 3, 5). The zero lower bound still applies in the closed economy.
- **Supply side (Lecture 4):** the capital stock and productivity are held fixed, as in the course; supply shocks enter through the nominal contract wage W (AS shifts left from the short run; wages return in the medium run).
- **IS-LM without LM (Lecture 3):** on impact the chart marks the output the economy would reach at an unchanged interest rate, so the gap to the IS-LM point is the crowding out.
- **External effects (Lecture 12):** world interest rate, foreign prices and foreign demand for a small economy; in the two-economy world, foreign monetary and fiscal policy (M\*, G\*), the endogenous world rate, the closed-economy benchmark rate (r_closed), currency wars and coordinated policy, with a foreign IS\*-LM\* chart.
- **Exchange-rate expectations (Lectures 8–9):** UIP, r = r\* + Δeᵉ. Expectations are fully present in the immediate run, half in the short run and gone in the medium run, so the overshooting story can be stepped through.
- **Learning centers 1–8:** a quiz section with the IS-LM questions from the course's learning centers (IS shifts, balanced budget with LM, exogenous vs. endogenous, policy mix, AS when workers set hours, δ, the k = 0 comparison, and the sign tables of LC 3, 4 and 5 with the course's horizon names). Sign-table keys are computed by the engine over a parameter grid. Centers 6–8 (floating rate, exchange-rate band, and two exam questions: expectations under a floating rate and tax- vs. deficit-financed spending under a fixed rate) use the course's own answer keys; a test checks that the engine agrees with every determinate cell.
- **Case studies and quiz mode:** 16 case studies. Each comes with further reading: two Hebrew articles from reliable sources, an English article on the event and an English retrospective on its effects (links verified in October 2026). The quiz has "identify the cause" and "predict the signs" questions; answer keys are computed over a parameter grid, so genuinely ambiguous signs come out as "?".

## Project structure

```
src/
  engine/        Economic logic: pure JS, no React, no DOM
    constants.js   calibration, parameter and shock definitions
    model.js       demand solvers per regime, AS, horizon state machine
    curves.js      IS / LM / CM / AD / AS / money-market samplers
    chains.js      transmission mechanisms
    pitfalls.js    debugger rules
    quiz.js        question generators + robust answer keys
    cases.js       case studies
  store/         useSimulator: reducer holding user inputs only; everything else is derived
  ui/            presentation layer (components, charts, theme)
tests/engine.test.js   course results pinned as tests
```

## Run locally

```bash
npm install
npm test        # engine tests
npm run dev     # http://localhost:5173
```

## Deploy

**Vercel**

1. Push this folder to a GitHub repository.
2. In Vercel, choose *Add New → Project* and import the repository.
3. Vercel detects Vite automatically (build `npm run build`, output `dist`). Click *Deploy*.

**Railway**

1. Push this folder to a GitHub repository.
2. In Railway, choose *New Project → Deploy from GitHub repo*.
3. Railway's builder runs `npm run build` and then `npm start`. The start script serves `dist` on `$PORT`.
4. Under *Settings → Networking*, generate a public domain.

## Model summary

| Block | Equation |
|---|---|
| Consumption | C = C₀ + c(Y − T), with T = T̄ + tY |
| Government | G = G₀ + δY (δ = 0 by default) |
| Investment | I = I₀ − b·r |
| Trade balance | TB = x₀ + n(e − 1) + φa\* − m·a, with absorption a = C + I + G (Lecture 8: TB = TB(a, a\*, e) with signs −, +, +). n > 0. |
| IS | Y = C + I + G + TB |
| LM | M/P = L₀ + kY − h·r, with r ≥ 0 in the closed economy |
| CM | TB + κ(i − i\* − ΔEᵉ) = 0. κ = ∞ (the course's case) gives the CM line i = i\* + ΔEᵉ (UIP); partial and no mobility are extensions. |
| Two-economy world | Foreign economy = σ-scaled copy (σ = (1 − ω)/ω) with its own IS\*, LM\*, AS\*. X = n(e − 1) + (m/σ)·a\*, IM = m·a, TB\* = −TB, common rate i = i\* + ΔEᵉ. Both price levels adjust jointly over the horizons. |
| Real exchange rate | e = E·P\*/P |
| AS (Lecture 4) | Y / Y\* = (A/A₀)·√(K/K₀)·(P/Pᵉ) |

Additional assumptions:

- **Fixed rate:** M is endogenous, and reserves absorb the difference.
- **Floating rate:** e clears the goods market.
- **Calibration:** Y\* = 1000, r\* = 3%, P₀ = 1, C₀ = 82, I = 100, G = T = 90.

Notation (UI) follows the slides: i is the nominal interest rate (the code calls it r), E is the nominal exchange rate (code: e), e is the real exchange rate (code: eps), and TB is the trade balance (code: NX).

## Verification against the course

`tests/courseClaims.js` lists every directional result stated in the fall-2025 slides (Lectures 2–5, 8, 9, 12) and the official answer keys of learning centers 6–8 (about 400 sign cells, by horizon and comparison base). `npm test` checks each one against the simulator's sign tables, checks the learning-center 1–5 keys, checks reproduced exam keys (2024–2026), and checks that every transmission chain agrees with the solved model for each shock, direction, regime and alternative assumption (including direction words such as capital inflow/outflow and depreciation/appreciation).
