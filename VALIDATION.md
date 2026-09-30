# Build validation

## Completed

- Nine game-engine tests covering random weight mapping, payline rules, wild selection, all-line payout totals, scatter bonus trigger, free-spin bet locking, bonus accounting, invalid saved state, and spin history.
- Exact enumeration of the 32,768 possible five-symbol lines, plus the binomial free-spin trigger probability.
- Standalone HTML build with inline CSS, JavaScript, and SVG; no external resources needed to play.

## Environment limitation

The local browser runtime was unavailable. An attempted Chromium download failed because the downloaded archive was empty or truncated. Automated real-browser visual and interaction verification was therefore not completed. Do not interpret the passing engine tests as a completed desktop/mobile visual review.

## Browser release checklist

1. Open the game on desktop and at a 390px mobile width; check reel alignment and horizontal overflow.
2. Spin with sound off/on and quick spin off/on. Check that only one result settles per click.
3. Open and close each dialog with mouse, touch, and Escape; confirm keyboard focus returns.
4. Change the bet; confirm the amount deducted matches the total bet.
5. Reload during a spin; confirm the already-settled result and balance are restored.
6. Trigger a bonus in a separate test fixture; confirm eight free spins, locked bet, double line awards, no retrigger, and return to base mode.
7. Test reduced motion and blocked browser storage.
8. Confirm New session asks before resetting the balance and history.
