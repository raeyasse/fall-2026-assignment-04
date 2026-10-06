---
name: erd-generator
description: Designs a database Entity-Relationship Diagram (ERD) from a plain-language domain description, writes it as Mermaid erDiagram syntax to docs/architecture/schema.mmd, and validates and renders it to docs/architecture/erd.svg. Use when the user asks to design, draft, or update an ERD, data model, database schema, entity relationships, or architecture diagram for a system.
---

# ERD Generator

Turn domain requirements into a validated Mermaid ERD and a rendered SVG diagram.

## Execution Workflow

### 1. Parse the requirements
From the user's description, identify:
- **Entities** (e.g. USERS, BOOKS, LOANS), named in UPPER_SNAKE_CASE.
- **Attributes** for each entity, with a type (`int`, `string`, `text`, `boolean`, `date`, `timestamp`, `decimal`, `uuid`).
- **Primary keys**: mark one attribute per entity with `PK`.
- **Foreign keys**: mark each reference to another entity with `FK`, named `<entity>_id` (e.g. `user_id`).
- **Cardinalities** between entities:
  - `||--o{` one-to-many
  - `||--o|` one-to-one (optional)
  - `||--||` one-to-one (required)
  - Model many-to-many as two one-to-many relationships through a join entity.

Follow any business rules the user states. If something is ambiguous, choose the simplest reasonable option and note the assumption in the final output.

### 2. Write the Mermaid file
Write the diagram directly to `docs/architecture/schema.mmd`, overwriting any existing content. The file must contain only Mermaid syntax (no ``` fences), starting with `erDiagram`. Example:

```
erDiagram
    USERS ||--o{ LOANS : makes
    USERS {
        int id PK
        string email
    }
    LOANS {
        int id PK
        int user_id FK
        date due_date
    }
```

Syntax rules:
- Each attribute line is `type name` followed by an optional `PK` or `FK`.
- Relationship lines are `ENTITY_A <cardinality> ENTITY_B : label`. The label must be a single word or a quoted string.
- No commas, parentheses, or spaces inside types or attribute names.

### 3. Validate and render
From the repository root, run:

```
node .agent/skills/erd-generator/scripts/render_erd.js docs/architecture/schema.mmd
```

- Output `SUCCESS` means `docs/architecture/erd.svg` was generated. Go to step 5.
- Output beginning with `SYNTAX_ERROR:` means the Mermaid syntax is invalid. Go to step 4.

### 4. Self-correction loop (max 3 retries)
If the script reports `SYNTAX_ERROR`:
1. Read the error trace and find the line or token it points to.
2. Fix that problem in `docs/architecture/schema.mmd` using the syntax rules above.
3. Re-run the command from step 3.

Repeat up to **3 retries**. If it still fails after the third retry, stop and report the last error trace to the user along with the current contents of `schema.mmd`.

### 5. Final output
Present to the user:
- The final raw Mermaid code in a ```mermaid code block.
- The path to the rendered diagram: `docs/architecture/erd.svg`.
- Any assumptions made about ambiguous requirements.