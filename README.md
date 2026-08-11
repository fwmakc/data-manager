# data-manager

App for organizing and managing instance data. Runs via Vite dev server.

## Getting started

```bash
npm install
npm start
```

Opens at http://localhost:5173/

## Projects

Data is organized into projects. Each project is a folder inside `projects/` with its own config and notes.

```
projects/
  default/
    config/
      actions.json
      labels.json
    notes/
      *.json
  another-project/
    config/
      actions.json
      labels.json
    notes/
      *.json
```

### Project management

From the **Projects** panel:

- **Switch project** — click project name to switch
- **Rename** — pencil button, enter new name (error if name already taken)
- **Delete** — cross button, confirmation required
- **Export** — download current project as `.zip` archive
- **Import** — select a `.zip` archive, extracts into `projects/` folder

Settings (selections, filters, sections, tags) are saved per-project in localStorage.

### Import rules

- Archive is extracted into a folder named after the `.zip` file (`def2.zip` → `def2/`)
- If `config/` and `notes/` are not at root, looks one level deeper (`def2/sub/config/` → `def2/config/`)
- If neither `config/` nor `notes/` found — import fails
- If project with same name exists — auto-renames (`def2` → `def2_1`)

## Structure

```
projects/
  <project>/
    config/
      actions.json    — action buttons (url / buffer / file)
      labels.json     — section and field labels
    notes/
      *.json          — instance data (one file per instance)
src/
  index.html
  css/style.css
  js/                 — TypeScript modules
```

## Instances

Each file in `notes/` is one instance. The filename is ignored — the `name` field is used as the identifier.

`notes/dev.test.ru.json`:

```json
{
  "name": "dev.test.ru",
  "tags": ["active"],
  "aliases": ["alias.test.ru"],
  "base": {
    "admin": "admin:1234"
  },
  "ssh": {
    "user": "admin",
    "password": "1234"
  },
  "db": {
    "name": "test",
    "primary": {
      "user": "root",
      "password": "1234"
    }
  },
  "apiv1": {
    "port": "3000"
  }
}
```

### Required fields

The fields `name` and `tags` are **required** and hardcoded in the app logic. They cannot be defined in `labels.json` and will not appear as sections.

| Field     | Type       | Description                                  |
|-----------|------------|----------------------------------------------|
| `name`    | `string`   | Unique instance identifier                   |
| `tags`    | `string[]` | Tags for filtering and bulk selection        |

All other fields are arbitrary — they are rendered based on `labels.json`.

## Labels (`config/labels.json`)

Defines section names, field labels, and sub-group labels. The nesting level is determined by the number of dots in the key:

- **0 dots** — section header
- **1 dot, has children** — sub-group label
- **1 dot, no children** — field label
- **2+ dots** — field label (nested)

```json
{
  "ssh": "SSH",
  "ssh.user": "user",
  "ssh.password": "password",

  "db": "DB",
  "db.name": "database name",
  "db.primary": "primary connection",
  "db.primary.user": "user",
  "db.primary.password": "password",

  "apiv1": "APIv1",
  "apiv1.port": "port in env"
}
```

How this maps to data:

```
ssh              → section header "SSH"
  ssh.user       → field "user"         → inst.ssh.user
  ssh.password   → field "password"     → inst.ssh.password

db               → section header "DB"
  db.name        → field "database name"    → inst.db.name
  db.primary     → sub-group "primary connection"
    db.primary.user     → field "user"      → inst.db.primary.user
    db.primary.password → field "password"  → inst.db.primary.password

apiv1            → section header "APIv1"
  apiv1.port     → field "port in env"     → inst.apiv1.port
```

Any top-level key in an instance that is not `name`, `status`, or `aliases` is treated as a section.

Fields within each section are displayed in the same order as their keys appear in `labels.json`. Fields not listed in `labels.json` are placed last, sorted alphabetically.

## Actions (`config/actions.json`)

Array of rows. Each row is an array of action buttons displayed together.

```json
[
  [
    { "name": "site", "method": "url", "data": "https://{name}" }
  ],
  [
    { "name": "ssh", "method": "buffer", "data": "ssh {ssh.user}@192.168.0.0" }
  ],
  [
    { "name": "env", "method": "file", "filename": "{ssh.user}.env", "data": "SSH={ssh.user}\n\nHOST=192.168.0.0\n" }
  ]
]
```

### Methods

| Method    | Behavior                                          |
|-----------|---------------------------------------------------|
| `url`     | Renders as a link that opens in a new tab         |
| `buffer`  | Copies resolved text to clipboard                 |
| `file`    | Downloads a file with the resolved content        |

### Templates

Both `data` and `filename` (for `file` method) support `{path.to.field}` placeholders. These are resolved from the instance data:

```
"data": "ssh {ssh.user}@192.168.0.0"
inst.ssh.user = "admin"  →  "ssh admin@192.168.0.0"
```

If a field is missing or empty, the placeholder is kept as-is.

### Pattern matching

Instead of a static `data` field, you can use `match` to select the template based on an instance field value. The first matching entry wins:

```json
{
  "name": "db",
  "method": "url",
  "data": "https://localhost:3306/index.php",
  "match": [
    {
      "field": "db.type",
      "value": "mysql",
      "data": "https://localhost:3306/phpmyadmin/index.php"
    },
    {
      "field": "db.type",
      "value": "pg",
      "data": "https://localhost:8000/?pgsql=192.168.0.0&username={db.primary.user}&db={db.name}"
    }
  ]
}
```

Each match entry checks `inst[field]` against `value`. If the field is an array, it checks whether the array includes `value`. In both cases, the **first matching entry** wins.

**Fallback:** if no match entry matches, the action falls back to the top-level `data` field (if present). If `data` is `null`, missing, or an empty string, the button is hidden for that instance.

## Export

The app supports several export formats from the sidebar:

- **Copy** — copies selected data as markdown to clipboard
- **Copy Excel** — copies as tab-separated values (paste into Excel)
- **Save MD** — downloads a `.md` file
- **Save CSV** — downloads a `.csv` file (`;` delimiter)
- **Save Excel** — downloads an `.xlsx` file
- **Save ODS** — downloads an `.ods` file
- **Print** — opens print dialog
- **Export project** — downloads current project as `.zip`

## Search

The **Filter** field in the sidebar filters instances by name. The **Search by data** field in the header filters visible fields and sections by their values. Matches are highlighted. Neither search affects copy or export — they only change what is displayed.

## Direct linking

You can link to a specific instance or comparison:

```
#dev.test.ru                    — select one instance
#compare:dev.test.ru,test.ru    — compare two instances
```
