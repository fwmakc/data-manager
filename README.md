# data-manager

App for organizing and managing your data.

## Getting started

```bash
npm install
npm run dev
```

Opens at http://localhost:5173/

## Build

```bash
npm run build
```

Produces a single `dist/index.html` file that can be opened directly in a browser.

## Preview build

```bash
npm run preview
```

## Structure

```
config/
  actions.json    — actions (url/buffer buttons for instances)
  labels.json     — field and section labels
projects/
  *.json          — instance data (one file per instance)
src/
  index.html
  css/style.css
  js/             — TypeScript modules
```

## Adding an instance

Create a file `projects/<name>.json`:

```json
{
  "name": "example.com",
  "status": ["active"],
  "aliases": ["alias.com"],
  ...
}
```

Fields and sections are defined in `config/labels.json`.
