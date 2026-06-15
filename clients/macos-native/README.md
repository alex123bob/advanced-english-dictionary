# macOS Native Client

SwiftUI starter for a native macOS dictionary client. It is intentionally lightweight and framework-standard so it can be dropped into an Xcode macOS app target.

## Included

- `AdvancedDictionaryMacApp.swift`: app entry point.
- `ContentView.swift`: split-view lookup UI optimized for desktop use.
- `DictionaryAPI.swift`: shared API client and response models for `/api/dictionary`.

## Next Integration Step

Create an Xcode macOS App project and add the files in `Sources/AdvancedDictionaryMac/` to the app target.
