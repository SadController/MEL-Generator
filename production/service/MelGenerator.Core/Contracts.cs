using System.Text.Json.Serialization;

namespace MelGenerator.Core;

public sealed record GenerationProfileRef(
    string SchemaVersion,
    string ProfileId,
    string ProfileVersion,
    string Simulator,
    string Provider,
    string AircraftFamily,
    string Aircraft,
    string? Configuration,
    string SourceDocumentId);

public sealed record ScenarioRequest(
    GenerationProfileRef Profile,
    int FailureCount,
    string Mode = "uniform");

public sealed record GenerationExplanation(
    string EngineVersion,
    string ProfileId,
    string ProfileVersion,
    string Strategy,
    int EligibleRecordCount,
    int CompatibleScenarioCount,
    bool Validated);

public sealed record ScenarioResult(
    string Aircraft,
    int Count,
    string Key,
    int Cycle,
    IReadOnlyList<ScenarioCard> Cards,
    GenerationExplanation Explanation);

public sealed record ScenarioCard(
    string Id,
    string Name,
    [property: JsonPropertyName("efb_path")] string EfbPath,
    [property: JsonPropertyName("source_id")] string SourceId,
    [property: JsonPropertyName("mmel_id")] string MmelId,
    [property: JsonPropertyName("mmel_title")] string MmelTitle,
    [property: JsonPropertyName("pdf_pages")] IReadOnlyList<int> PdfPages,
    [property: JsonPropertyName("rule_profile")] string RuleProfile,
    [property: JsonPropertyName("branch_id")] string BranchId,
    string Branch,
    IReadOnlyList<string> Conditions);

public sealed record CompatibilityAssessment(
    bool Allowed,
    IReadOnlyDictionary<string, RuleAlternative> Branches,
    IReadOnlyList<string> Conflicts);

public interface IRandomSource
{
    int Next(int exclusiveMaximum);
}

public sealed class SeededRandomSource(int seed) : IRandomSource
{
    private readonly Random random = new(seed);
    public int Next(int exclusiveMaximum) => random.Next(exclusiveMaximum);
}
