using System.Text.Json.Serialization;

namespace AdvancedDictionaryWindows;

public sealed record DictionaryRequest(string Word, string Section);

public sealed class DictionaryEntry
{
    public bool? Success { get; set; }
    public string? Error { get; set; }
    public string Headword { get; set; } = "";
    public List<DictionaryEntryVariant> Entries { get; set; } = new();

    public DictionaryEntryVariant? PrimaryEntry => Entries.FirstOrDefault();

    public IEnumerable<DictionarySense> Senses => PrimaryEntry?.MeaningsSummary.SelectMany(meaning =>
        meaning.Senses.Select(sense => sense with { PartOfSpeech = meaning.PartOfSpeech })) ?? Enumerable.Empty<DictionarySense>();
}

public sealed class DictionaryEntryVariant
{
    public string? Pronunciation { get; set; }

    [JsonPropertyName("meanings_summary")]
    public List<DictionaryMeaning> MeaningsSummary { get; set; } = new();
}

public sealed class DictionaryMeaning
{
    [JsonPropertyName("part_of_speech")]
    public string? PartOfSpeech { get; set; }

    public List<DictionarySense> Senses { get; set; } = new();
}

public sealed record DictionarySense(
    string? Definition,
    string? Example,
    [property: JsonPropertyName("part_of_speech")] string? PartOfSpeech
);
