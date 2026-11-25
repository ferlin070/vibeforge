# RC2 Phase 8 — UX, accessibility and routing

Workspace views use allowlisted query-string routes and local project IDs. Refresh and browser back/forward restore valid routes; unknown project IDs fall back to a local project with feedback. The app remains a single Next.js route. Browser back cancellation restores the current URL by adding a history entry, so forward history can change. Recovery fragments remain handled separately. Links are local-device references, not shared project access.

Grouped navigation, active aria-current state, skip link, main landmark focus, mobile native modal dialog, keyboard dismissal, focus indicators, reduced-motion loading, responsive card grids, empty/filter states, clearer error recovery and accessible progress labels. Dark violet design retained with refinements rather than a full redesign.

Wizard, documentation editor, AI candidate and task-report drafts are guarded on view/project change and beforeunload. The browser's native confirmation is retained for destructive actions. Other module input drafts and in-flight requests are not comprehensively protected. No secrets are saved as draft data. Actual keyboard, browser history and viewport tests remain Phase 10 requirements. No deployment.
