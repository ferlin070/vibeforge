# RC9 — Visual architecture draft

The Architecture Workbench now has a temporary structured model editor. Add up to twelve named entities with validated typed fields, define relationships between existing distinct entities and record proposed API method/path/access/purpose contracts. Removing an entity also removes its associated relationships. The model exports to JSON and is not applied to the project, persisted to Supabase or executed as SQL. Entity cards and relationship rows are responsive, not a drag-and-drop ERD editor. The API catalog is not a complete OpenAPI contract. Validate actual keys, constraints, authorization and migrations before approving a design. Export the draft before navigating away.

Tests check identifier and type validation, duplicate routes, dangling relationship removal, export semantics and the browser flow without changing an approved blueprint.
