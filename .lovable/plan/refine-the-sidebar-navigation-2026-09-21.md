# Refine the sidebar navigation

## Scope
- Redesign only the existing sidebar and its navigation configuration.
- Keep all current page paths, page content, mock data, and functionality unchanged.

## Changes
- Convert the sidebar to a clean light enterprise surface in both app themes, with a subtle border, dark labels, muted headings, and restrained blue active states.
- Preserve the current navigation destinations and grouping. Because the project has no separate subsection routes, do not create fake links; use expandable parent rows only where valid child destinations can map to existing pages.
- Add accessible accordion behavior with right-aligned rotating chevrons, smooth height/opacity transitions, stable indentation, and clear parent/child active states.
- Refine section spacing, icon alignment, profile spacing, collapsed icon-only behavior, tooltips, and mobile drawer touch targets.
- Keep the single existing sidebar trigger and the current desktop collapse/mobile drawer behavior.

## Validation
- Check every requested destination through the sidebar.
- Verify accordion, active states, desktop collapse, tooltips, and mobile open/close behavior.
- Run the project’s automated build checks and inspect desktop/mobile screenshots for overlap or overflow.

## Technical details
- Use the installed Radix Collapsible primitive and existing shadcn sidebar components.
- Use semantic sidebar tokens in the global design system; no page-specific hardcoded colors.
- Keep animation within 150–300ms and respect reduced-motion preferences.
