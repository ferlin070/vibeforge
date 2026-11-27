# Local backup recovery

Help & Privacy now supports importing the JSON array exported by VibeForge local project backup. Files are limited to 5 MiB and 200 projects, with all records required to pass the shared project validator and have unique source IDs. The preview is local; no data is sent to a provider or uploaded to Supabase.

An explicit confirmation imports independent draft copies with fresh IDs. Existing projects are retained. The copy uses the existing snapshot-draft recovery path: recognized secrets are redacted, approval and review evidence are reset, mission history, quality records and checkpoints are omitted. Architecture editor drafts, account settings, team publications and cloud snapshots are not included. Users must inspect recovered drafts and re-establish evidence before release.

The whole new project array is persisted in one localStorage write before success is reported. Storage quota errors preserve the previous project collection; no partial import is reported. This does not provide a full-fidelity database restore, multi-tab transaction isolation or a substitute for server backup/recovery rehearsals. Large backups may need to be split. No paid services or database changes.
