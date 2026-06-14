# Clients

This repository is organized as a multi-client workspace.

## Current clients

- `web`: the existing browser website, kept as a standalone client with its own build system.
- `chrome-extension`: the Chrome extension client that reuses the dictionary API and opens the website for full searches.
- `pwa`: an installable static PWA starter with service-worker app-shell caching.
- `macos-native`: SwiftUI source starter for a native macOS app.
- `windows-native`: WinUI-style C# source starter for a native Windows app.
- `ios-app`: SwiftUI source starter for a native iOS app.
- `android-app`: Jetpack Compose source starter for a native Android app.

## Buildable clients

- `web`, `chrome-extension`, and `pwa` include local npm build scripts.
- Native clients are source-level starters intended to be opened in Xcode, Android Studio, or Visual Studio.

Each client lives in its own folder under `clients/` and consumes the shared dictionary API contract rather than duplicating the website implementation.
