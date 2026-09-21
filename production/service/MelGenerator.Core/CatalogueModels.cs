using System.Text.Json;
using System.Text.Json.Serialization;

namespace MelGenerator.Core;

public sealed class Catalogue
{
    [JsonPropertyName("metadata")] public JsonElement Metadata { get; init; }
    [JsonPropertyName("records")] public required List<CatalogueRecord> Records { get; init; }
}

public sealed class CatalogueRecord
{
    [JsonPropertyName("id")] public required string Id { get; init; }
    [JsonPropertyName("name")] public required string Name { get; init; }
    [JsonPropertyName("efb_path")] public required string EfbPath { get; init; }
    [JsonPropertyName("source_id")] public required string SourceId { get; init; }
    [JsonPropertyName("mmel_id")] public required string MmelId { get; init; }
    [JsonPropertyName("mmel_title")] public required string MmelTitle { get; init; }
    [JsonPropertyName("pdf_pages")] public required List<int> PdfPages { get; init; }
    [JsonPropertyName("rule_profile")] public required string RuleProfile { get; init; }
}

public sealed class RuleSet
{
    [JsonPropertyName("profiles")] public required List<RuleProfile> Profiles { get; init; }
}

public sealed class RuleProfile
{
    [JsonPropertyName("id")] public required string Id { get; init; }
    [JsonPropertyName("mmel_id")] public required string MmelId { get; init; }
    [JsonPropertyName("member_ids")] public required List<string> MemberIds { get; init; }
    [JsonPropertyName("alternatives")] public required List<RuleAlternative> Alternatives { get; init; }
}

public sealed class RuleAlternative
{
    [JsonPropertyName("id")] public required string Id { get; init; }
    [JsonPropertyName("branch")] public required string Branch { get; init; }
    [JsonPropertyName("conditions")] public required List<string> Conditions { get; init; }
    [JsonPropertyName("permitted_failed_ids")] public required List<string> PermittedFailedIds { get; init; }
    [JsonPropertyName("max_failed")] public int MaxFailed { get; init; }
    [JsonPropertyName("requires_operative_catalog_ids")] public required List<string> RequiresOperativeCatalogIds { get; init; }
    [JsonPropertyName("pdf_pages")] public required List<int> PdfPages { get; init; }
}

public static class CatalogueLoader
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNameCaseInsensitive = false };

    public static (Catalogue Catalogue, RuleSet Rules) Load(string cataloguePath, string rulesPath)
    {
        var catalogue=JsonSerializer.Deserialize<Catalogue>(File.ReadAllText(cataloguePath),Options)
            ?? throw new InvalidDataException("Catalogue is empty.");
        var rules=JsonSerializer.Deserialize<RuleSet>(File.ReadAllText(rulesPath),Options)
            ?? throw new InvalidDataException("Rules are empty.");
        return (catalogue,rules);
    }
}
