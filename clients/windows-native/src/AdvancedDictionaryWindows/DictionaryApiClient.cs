using System.Net.Http.Json;

namespace AdvancedDictionaryWindows;

public sealed class DictionaryApiClient
{
    private readonly HttpClient httpClient = new();

    public async Task<DictionaryEntry> LookupAsync(string word, string apiBaseUrl)
    {
        var baseUrl = apiBaseUrl.TrimEnd('/');
        var response = await httpClient.PostAsJsonAsync($"{baseUrl}/api/dictionary", new DictionaryRequest(word, "basic"));
        var result = await response.Content.ReadFromJsonAsync<DictionaryEntry>();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Dictionary request failed ({(int)response.StatusCode}).");
        }

        if (result is null)
        {
            throw new InvalidOperationException("Dictionary response was empty.");
        }

        if (result.Success == false && !string.IsNullOrWhiteSpace(result.Error))
        {
            throw new InvalidOperationException(result.Error);
        }

        return result;
    }
}
