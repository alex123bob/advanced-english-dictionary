# Android App Client

Jetpack Compose starter for a native Android dictionary app. This folder contains source-level scaffolding and API models that can be added to a standard Android Studio project.

## Included

- `DictionaryActivity.kt`: Compose UI for search, recent words, settings, and results.
- `DictionaryApi.kt`: coroutine-based API client for `/api/dictionary`.
- `DictionaryModels.kt`: serializable API response models.

## Suggested Gradle Dependencies

```kotlin
implementation("androidx.activity:activity-compose:<latest>")
implementation("androidx.compose.material3:material3:<latest>")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:<latest>")
implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:<latest>")
```

## Next Integration Step

Create an Android Studio project and copy `app/src/main/java/com/lijialab/dictionary/` into your app module.
