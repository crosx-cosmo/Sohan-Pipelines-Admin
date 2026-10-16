# Upgrade the non-dashboard operations console

## Scope
- Redesign the shared navigation and every workspace except the Dashboard page.
- Preserve all routes, local data flow, filters, forms, actions, and current business behavior.
- Do not add or modify any backend, database, authentication, or API integration.

## Design direction
- Apply the selected Porcelain Aqua palette with deep navy typography, plumbing blue and pale aqua accents.
- Use Sora headings and Manrope body text in a structured canvas inspired by the selected tactical-console direction.
- Keep surfaces compact and operational: thin borders, subtle shadows, 14–18px radii, restrained motion, and strong mobile hierarchy.

## Implementation
- Refine the sidebar, top bar, command search, account area, page headers, panels, tabs, filters, tables, cards, drawers, dialogs, toggles, and feedback states.
- Add reusable workspace primitives for section headings, filter toolbars, mobile record cards, and contextual summaries where existing route data supports them.
- Improve each requested workspace in place without inventing unsupported data or replacing existing logic.
- Leave `src/routes/index.tsx` unchanged.

## Validation
- Verify every non-dashboard route at desktop and mobile sizes.
- Confirm all filters, tabs, dialogs, drawers, sidebar states, and navigation still work.
- Confirm no horizontal overflow, console errors, type errors, or build errors.
