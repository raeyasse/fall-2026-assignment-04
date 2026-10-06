---
name: kysely-migration-generator
description: Translates a Mermaid ERD (docs/architecture/schema.mmd, or the .mmd source behind docs/architecture/erd.svg) into a type-safe Kysely PostgreSQL migration written to src/db/migrations/. Use when the user asks to generate, create, or write a database migration, Kysely migration, or database tables from an ERD, schema.mmd, data model, or Mermaid diagram.
---

# Kysely Migration Generator

Convert a Mermaid `erDiagram` into a Kysely migration that compiles and runs cleanly.

## Workflow

### 1. Read the inputs
- Read the ERD from `docs/architecture/schema.mmd`. If only `erd.svg` is given, use the `.mmd` file next to it as the source.
- Read every existing file in `src/db/migrations/`. Any table already created there (for example `users` in `001_initial_schema.ts`) must NOT be created again or dropped by the new migration.
- Use `src/db/migrations/001_initial_schema.ts` as the reference for code style.

### 2. Apply the translation rules

**Entities → tables**
- Convert each entity name to a snake_case, lowercase table name: `USERS` → `users`, `BOOK_AUTHORS` → `book_authors`.
- Skip entities whose table already exists in an earlier migration. Other tables may still reference them.

**Primary keys**
- Map a `PK` attribute to an auto-generating integer ID, matching `users.id`:
  `.addColumn('id', 'serial', (col) => col.primaryKey())`

**Foreign keys**
- Map an `FK` attribute to an `integer` column that references the parent's `id` and cascades on delete:
  `.addColumn('user_id', 'integer', (col) => col.references('users.id').onDelete('cascade').notNull())`
- Find the parent table from the relationship line that connects the two entities.

**Cardinalities**
- `||--o{` (one-to-many): plain FK on the "many" side.
- `||--o|` (one-to-one): FK on the child side, plus `.unique()` on that FK column.

**Data types**
| Mermaid | Kysely |
|---|---|
| `int` | `'integer'` |
| `string` | `'varchar(255)'` |
| `text` | `'text'` |
| `boolean` | `'boolean'` |
| `date` | `'date'` |
| `timestamp` / `datetime` | `'timestamp'` |
| `decimal` | `'numeric(10, 2)'` |
| `uuid` | `'uuid'` |

- Mark columns `.notNull()` unless the ERD or requirements say they are optional (e.g. `returned_at`).

### 3. Order the tables
- In `up()`, create tables in dependency order: a table must be created after every table it references.
- In `down()`, drop the same tables in exact reverse order. Never drop tables created by earlier migrations.

### 4. Write the file
Write the migration to `src/db/migrations/<timestamp>_<migration_name>.ts`:
- `<timestamp>` is the current time as `YYYYMMDDHHMMSS` (e.g. `20261005223000`), so it sorts after existing migrations.
- `<migration_name>` is a short snake_case description (e.g. `library_schema`).

The file must use this structure:

```ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('genres')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('books')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('genre_id', 'integer', (col) =>
      col.references('genres.id').onDelete('cascade').notNull()
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('books').execute();
  await db.schema.dropTable('genres').execute();
}
```

- Both `up(db: Kysely<any>)` and `down(db: Kysely<any>)` must be exported.
- Import `sql` from `kysely` only if the file uses it.
````