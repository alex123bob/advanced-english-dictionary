# Windows Native Client

WinUI-style C# starter for a Windows dictionary client. This is source-level scaffolding intended to be added to a Windows App SDK project.

## Included

- `App.xaml.cs`: app bootstrap.
- `MainWindow.xaml`: desktop lookup layout.
- `MainWindow.xaml.cs`: search flow, recent words, and result rendering.
- `DictionaryApiClient.cs`: HTTP client for `/api/dictionary`.
- `DictionaryModels.cs`: API response models.

## Next Integration Step

Create a Windows App SDK / WinUI project and copy `src/AdvancedDictionaryWindows/` into the project.
