# Exp layout design

## Problem

Card stats row currently includes `Exp` as tenth stat input. User wants `Exp`
removed from stats row and shown next to cost summary instead, as:

`Base: X  Total: X  Exp: X`

30-box experience track should stay.

## Chosen approach

Move numeric `Exp` input from stats grid into card header meta area beside base
and total cost. Keep experience track unchanged and keep both controls bound to
same `fighter.exp` field.

## Alternatives considered

1. Move only numeric `Exp` input and keep exp track unchanged. Chosen because
   it matches requested UX with least risk.
2. Rework whole header meta layout while moving `Exp`. Rejected because scope
   bigger than needed.
3. Make `Exp` read-only near total and edit only through track. Rejected
   because it changes editing behavior.

## Design

### Markup

- Remove `.stat-exp-col` from `.stats-table` in fighter card template.
- Add new exp summary/input block inside `.cost-info` so row reads:
  `Base: X  Total: X  Exp: X`.

### Behavior

- Header exp input reads/writes `currentWarband.fighters[index].exp`.
- Experience track still reads/writes same field.
- Updating either exp control refreshes other exp control and track.
- Total cost behavior stays unchanged. Exp remains separate from cost.

### Styling

- Adjust cost row layout so three values fit on one line on card width.
- Preserve readable wrapping behavior on smaller widths if needed.
- Keep folded-card and print styles stable.

### Testing

- Add or update UI regression tests to confirm:
  - `Exp` no longer appears in stats row template
  - exp input exists in cost/meta row
  - app logic still binds exp input and exp track together
- Keep existing print and exp-track tests passing.

## Out of scope

- No change to data model, import/export, rating calculation, or validation.
- No change to experience track visuals or interaction model.
