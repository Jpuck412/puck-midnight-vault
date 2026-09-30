# Puck’s Midnight Vault

A premium 3D-style slot game featuring five animated reels, 20 paylines, wild symbols, free spins, sound effects, and saved play credits. Built for desktop and mobile.

## Play immediately

Download **`dist/index.html`**, then open it in Chrome, Edge, Firefox, or Safari. The complete game is bundled into that single file. No API key, install, account, fonts, image downloads, or runtime dependencies are required.

The game starts with **10,000 free play credits**. Select a total bet, then press **SPIN** or the space bar. Open **How to play**, **Paytable**, or **Paylines** for the full rules. Browser saving can vary for locally opened files; serve over HTTPS for consistent origin-based saving.

This is a functioning entertainment game using play credits only. It has no deposits, purchases, withdrawals, or monetary prizes. It is not a licensed or certified real-money wagering system.

## Included

- Original emerald-and-gold cabinet with dimensional lighting and vector symbols.
- Five independently animated reels, three rows, and 20 fixed paylines.
- Cryptographic random draws with rejection sampling to avoid modulo bias.
- Wild substitution, highest-award evaluation per line, and combined line wins.
- Three or more scatters on a paid spin award eight free spins with double line payouts.
- Free spins preserve the triggering bet, cost no credits, and do not retrigger.
- Sound toggle with synthesized audio, quick spin, and reduced-motion support.
- Device-local balance, bonus progress, and the latest 20 spin results.
- Full spin settlement saved before animation, so a reload cannot discard a result.
- Keyboard controls, labeled buttons, focus-managed native dialogs, and responsive layouts.
- Reset confirmation, insufficient-credit handling, and storage-failure fallback.
- Pure game engine with automated tests and an exact theoretical-return calculation.

## Run or build

Requires Node.js 20 or later; there are no npm dependencies.

```bash
npm test
npm run build
npm start
```

Open `http://localhost:4173`. To recalculate game mathematics:

```bash
npm run math
```

## Project map

| File | Purpose |
| --- | --- |
| `src/engine.js` | Symbol weights, paylines, payouts, random draws, and credit accounting |
| `src/app.js` | Controls, reel animation, audio, dialogs, and browser saving |
| `src/style.css` | Cabinet design and desktop/mobile layouts |
| `src/index.html` | Page structure and original SVG symbols |
| `scripts/build.cjs` | Bundles the game into one standalone HTML file |
| `scripts/math.cjs` | Enumerates every possible five-symbol line for exact expected return |
| `scripts/serve.cjs` | Dependency-free local HTTP server |
| `tests/engine.test.cjs` | Game-rule and accounting tests |
| `dist/index.html` | Ready-to-play and ready-to-host game |
| `vercel.json` | Static deployment configuration |

## Rules and mathematics

All 20 lines are active. A total bet of 20 credits means 1 credit per line. Wins require three or more consecutive matching symbols from the leftmost reel. Wilds substitute for paying symbols but not scatters. Each line awards only its highest eligible payout. Awards on different lines add together.

Every one of the 15 cells is an independent weighted random draw. Weights out of 76 are: jade 20, ruby 17, sapphire 14, bell 10, crown 7, seven 4, wild 2, scatter 2. No draw depends on previous results, balance, or player behavior. The reel animation is cosmetic and does not manufacture near-misses.

Three or more scatters anywhere on a **paid** spin award exactly eight free spins at the triggering bet. All free-spin line awards are doubled. Scatters have no separate credit payout. Free spins do not retrigger.

The exact model currently gives:

- Base line return: **87.38413494%** of the total paid wager.
- Bonus trigger probability: **0.65397141%** per paid spin.
- Expected return including free spins: **96.52761106%** of the total paid wager.

These are theoretical expectations, not certification or a promise about session results. The calculation enumerates all 8^5 symbol combinations for a line. Because expectation is additive, overlapping paylines do not change the expected total return. The 15 independent cells give a binomial scatter count; bonus return is eight spins times double line return times the trigger probability.

Payouts are gross awards. A 6-credit payout after a 20-credit wager is a 14-credit net loss. The result bar reports credits won without treating every payout as profit.

## Deployment

Import this repository into your chosen Vercel account. Configuration is already included:

- Framework preset: **Other**
- Build command: **`npm run build`**
- Output directory: **`dist`**
- Environment variables: **none**

Alternatively, any static HTTPS host can serve `dist/index.html`. Publishing is a separate action from committing this project to GitHub.

## Boundaries

Browser storage is intentionally device-local and editable by its owner. It is not a financial ledger. Tabs synchronize saved sessions on storage changes, but this client-only game does not provide transactional multi-device accounts. Do not connect client-side credits to real money or prizes.

Real-money operation would need a separately scoped, professionally reviewed system including authoritative server settlement, secure accounts and ledgers, approved randomness and game certification, jurisdiction controls, and permitted payment infrastructure.

## Validation

Run `npm test`, `npm run math`, and `npm run build` after changing game rules. The unit suite covers payout selection, all 20 lines, symbol weights, scatter thresholds, bonus locking and completion, balance accounting, invalid state, and bounded history. Browser layout and interaction checks should be run before public release; see `VALIDATION.md` for the checks actually completed in this build environment.
