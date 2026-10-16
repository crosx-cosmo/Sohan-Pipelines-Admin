<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Scope non-dashboard operations styling under `.operations-workspace` and keep the Dashboard route untouched, so shared presentation refinements do not alter the existing Dashboard.
- Data: `src/lib/mock-data.ts` holds shared types plus live snapshot arrays filled from the user's Supabase by `loadAll()` in `AuthGate`; all writes go through `src/lib/db.ts` then `reload()` — keeps pages unchanged while using real data.
- Auth: browser Supabase client (publishable key) + admin-only RLS (`has_role`); `AuthGate` in __root shows sign-in and blocks non-admins. No service key in app code.
- Password login exchanges credentials in a public server function only after single-use Turnstile verification; browser session installation and the existing admin gate remain unchanged, so the app cannot skip its CAPTCHA through a client flag.
- Shared shell width and scoped operations typography handle screen sizing; keep data and Dashboard source unchanged to avoid presentation changes rewriting business logic.
- Render unknown-path recovery outside the admin gate without exposing protected content; keep the branded 404 in a dedicated shared component.
- Pages re-sync local copies of snapshot data via a `useEffect` on `useData().version`; the shell must not remount pages with `key={version}`, so saves update in place without a full-page refresh.
