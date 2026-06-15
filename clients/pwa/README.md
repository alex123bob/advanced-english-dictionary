# PWA Client

This is a lightweight installable Progressive Web App client. It uses the same dictionary API contract as the web and Chrome extension clients while keeping a smaller app shell suitable for offline startup and quick lookup.

## Development

The source lives in `src/` and has no framework dependency.

```bash
npm --prefix clients/pwa run build
```

The build output is copied to `clients/pwa/dist/`.

## API Contract

The PWA posts to `/api/dictionary` with this request body:

```json
{ "word": "example", "section": "basic" }
```

Set the API base URL from the in-app settings panel. It defaults to `http://localhost:8000`.
