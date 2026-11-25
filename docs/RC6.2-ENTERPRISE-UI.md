# RC6.2 — Enterprise workspace increment

The overview now includes an actionable project portfolio rather than rendering every project as a generic card. Status and task counts derive from the existing dashboard summary and reviewed mission evidence, not estimated completion or release certification. The portfolio prioritizes pending evidence, then project creation date. It filters by name, type, agent and planning/implementation/review status and shows five projects at a time. The resume action uses existing guarded navigation and the next action derived from the active project's actual workflow state.

The layout uses the existing dark design system, keyboard-accessible native controls, visible pressed states, labeled progress and a live result count. The sidebar can scroll on short desktop viewports. No stored schema, approvals, provider configuration, dependencies, billing or team permissions are changed.

Verification: unit tests cover derived status, filtering, order and nonmutation. A Chromium regression test exercises empty results, filter reset and resuming the correct mission. The existing responsive layout checks continue to apply. These checks do not constitute a complete accessibility or visual design audit.

RC6.1 production is a protected UAT deployment, not a public launch. Keep deployment protection and noindex until live Auth, backup recovery, external agent, legal and production release gates are completed.
