# Clients

This repository is organized as a multi-client workspace.

## Current clients

- `web`: the existing browser website, kept as a standalone client with its own build system.
- `chrome-extension`: the Chrome extension client that reuses the dictionary API and opens the website for full searches.

## Reserved client slots

- `macos-native`
- `windows-native`
- `ios-app`
- `android-app`
- `pwa`

Each future client should live in its own folder under `clients/` and consume the shared dictionary API contract rather than duplicating the web app structure.
