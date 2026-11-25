# RC6.3 — Advanced Project Memory increment

Context Manager now supports case-insensitive search, category filtering, redacted filtered JSON exports and editing existing memory entries in place. Entry IDs and creation dates remain stable. All edits go through the existing project update and impact confirmation path: knowledge edits preserve approval, material decisions/constraints/blockers require the existing impact confirmation. The 40-entry limit and shared validation remain unchanged.

Prompt Lab no longer takes the first 12 entries solely by storage order. Deterministic category priority (blocker, constraint, decision, knowledge) and stage keyword matches select up to 12 notes, preserving storage order for ties. The prompt explicitly records the omitted count and instructs agents to inspect full memory and approved documents. This is heuristic retrieval, not semantic vector search, and it cannot guarantee inclusion of every relevant entry. No embeddings, remote retrieval, new database tables or background jobs are introduced.

Tests verify selection of older material notes, bounded output, project-local search, edit identity, redaction and impact policy. The Chromium regression covers filtering, editing, export and preservation of blueprint approval. Exact-commit CI and staging verification remain mandatory before release.
