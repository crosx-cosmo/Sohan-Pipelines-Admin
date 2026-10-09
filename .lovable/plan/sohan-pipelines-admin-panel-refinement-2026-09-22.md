# SOHAN PIPELINES Admin Panel Refinement

## Scope
- Preserve the existing frontend architecture, routes, mock data source, and all working features.
- Remove only the two requested Dashboard New booking controls.
- Add status-specific submenu destinations that reuse and filter existing records.
- Upgrade dashboard analytics and shared presentation styling without changing business logic.

## Implementation
1. Extend the existing nested sidebar configuration with Pending/Cancelled booking and service links, plus Upcoming/Paused area links and dynamic counts where the current records support them.
2. Add lightweight status views through the existing page components and data arrays, preserving All views.
3. Replace the two dashboard visualizations with richer, responsive chart compositions and data-derived summaries/tooltips.
4. Refine global surface, card, table, badge, control, and motion tokens so all current pages inherit a cohesive premium treatment.
5. Verify desktop, collapsed sidebar, mobile drawer, filtering routes, charts, overflow, and all existing destinations.

## Technical notes
- Frontend-only: no backend, database, authentication, or API changes.
- Status counts and chart summaries are computed from existing data at runtime.
- Motion remains subtle and respects reduced-motion preferences.
