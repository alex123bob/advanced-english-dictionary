using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;

namespace AdvancedDictionaryWindows;

public sealed partial class MainWindow : Window
{
    private readonly DictionaryApiClient apiClient = new();
    private readonly List<string> recentWords = new();

    public MainWindow()
    {
        InitializeComponent();
    }

    private async void SearchButton_Click(object sender, RoutedEventArgs e)
    {
        await SearchAsync(SearchBox.Text);
    }

    private async void SearchBox_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (e.Key == Windows.System.VirtualKey.Enter)
        {
            await SearchAsync(SearchBox.Text);
        }
    }

    private async void RecentList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (RecentList.SelectedItem is string word)
        {
            SearchBox.Text = word;
            await SearchAsync(word);
        }
    }

    private async Task SearchAsync(string rawWord)
    {
        var word = rawWord.Trim();
        if (string.IsNullOrWhiteSpace(word)) return;

        StatusText.Text = "Looking up word...";
        ResultPanel.Children.Clear();
        ResultPanel.Children.Add(StatusText);

        try
        {
            var result = await apiClient.LookupAsync(word, ApiBaseUrlBox.Text);
            RenderResult(result);
            AddRecent(word);
        }
        catch (Exception error)
        {
            StatusText.Text = error.Message;
        }
    }

    private void RenderResult(DictionaryEntry entry)
    {
        ResultPanel.Children.Clear();
        ResultPanel.Children.Add(new TextBlock
        {
            Text = entry.Headword,
            FontSize = 48,
            FontWeight = Microsoft.UI.Text.FontWeights.Bold
        });

        if (!string.IsNullOrWhiteSpace(entry.PrimaryEntry?.Pronunciation))
        {
            ResultPanel.Children.Add(new TextBlock { Text = entry.PrimaryEntry.Pronunciation, Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Gray) });
        }

        foreach (var item in entry.Senses.Take(8).Select((sense, index) => new { sense, index }))
        {
            var card = new StackPanel { Spacing = 6, Padding = new Thickness(14) };
            card.Children.Add(new TextBlock
            {
                Text = $"{item.index + 1}. {item.sense.Definition ?? "Definition unavailable in summary."}",
                TextWrapping = TextWrapping.Wrap,
                FontWeight = Microsoft.UI.Text.FontWeights.SemiBold
            });

            if (!string.IsNullOrWhiteSpace(item.sense.Example))
            {
                card.Children.Add(new TextBlock { Text = item.sense.Example, TextWrapping = TextWrapping.Wrap, Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Gray) });
            }

            ResultPanel.Children.Add(card);
        }
    }

    private void AddRecent(string word)
    {
        recentWords.RemoveAll(item => string.Equals(item, word, StringComparison.OrdinalIgnoreCase));
        recentWords.Insert(0, word);
        if (recentWords.Count > 10) recentWords.RemoveRange(10, recentWords.Count - 10);
        RecentList.ItemsSource = null;
        RecentList.ItemsSource = recentWords;
    }
}
