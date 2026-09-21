using MelGenerator.Core;
using System.Text.Json;

namespace MelGenerator.Core.Tests;

public sealed class ScenarioEngineTests
{
    private static ScenarioEngine Create(IRandomSource? random=null)
    {
        var root=AppContext.BaseDirectory;
        var (catalogue,rules)=CatalogueLoader.Load(Path.Combine(root,"data","catalog.json"),
            Path.Combine(root,"data","rules.json"));
        return new ScenarioEngine(catalogue,rules,random);
    }

    private static ScenarioRequest Request(string aircraft="A321",int count=2) => new(
        new GenerationProfileRef("1","fenix-faa-r32","1.0.0","MSFS2024","Fenix","A320",
            aircraft,null,"FAA_A320_R32"),count);

    [Fact]
    public void CompatibilityPoolsMatchReviewedLegacyCounts()
    {
        var engine=Create();
        Assert.Equal(53,engine.Pool(1).Count);
        Assert.Equal(1289,engine.Pool(2).Count);
        Assert.Equal(19311,engine.Pool(3).Count);
        Assert.False(engine.Assess(["M001","M002"]).Allowed);
        Assert.False(engine.Assess(["M257","M267","M268"]).Allowed);
        Assert.True(engine.Assess(["M042","M144","M323"]).Allowed);
        Assert.Equal("AP_BOTH",engine.Assess(["M042","M043"]).Branches["AP"].Id);
    }

    [Fact]
    public void EveryLegacyCombinationMatchesTheIndependentForbiddenPatterns()
    {
        var engine=Create();
        using var document=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"data","forbidden_combinations.json")));
        var patterns=new List<string[]>();
        foreach(var property in new[]{"forbidden_pairs","minimal_forbidden_triples"})
        foreach(var item in document.RootElement.GetProperty(property).EnumerateArray())
            patterns.Add(item.GetProperty("ids").EnumerateArray().Select(node=>node.GetString()!).ToArray());
        var ids=engine.Pool(1).Select(item=>item[0]).Order(StringComparer.Ordinal).ToArray();
        foreach(var count in new[]{1,2,3})
        foreach(var candidate in Combinations(ids,count))
        {
            var expected=!patterns.Any(pattern=>pattern.All(candidate.Contains));
            Assert.Equal(expected,engine.Assess(candidate).Allowed);
        }
    }

    [Fact]
    public void SeededGenerationIsReproducibleAndCarriesVersionedExplanation()
    {
        var left=Create(new SeededRandomSource(20260920));
        var right=Create(new SeededRandomSource(20260920));
        var first=left.Generate(Request());
        var second=right.Generate(Request());
        Assert.Equal(first.Key,second.Key);
        Assert.Equal(2,first.Cards.Count);
        Assert.Equal("fenix-faa-r32",first.Explanation.ProfileId);
        Assert.Equal("uniform-without-replacement",first.Explanation.Strategy);
        Assert.True(first.Explanation.Validated);
    }

    [Fact]
    public void BagsDoNotRepeatBeforeTheirCycleEnds()
    {
        var engine=Create(new SeededRandomSource(17));
        var seen=new HashSet<string>(StringComparer.Ordinal);
        var previous="";
        for(var index=0;index<53;index++)
        {
            previous=engine.Generate(Request(count:1)).Key;
            Assert.True(seen.Add(previous));
        }
        var next=engine.Generate(Request(count:1));
        Assert.Equal(2,next.Cycle);
        Assert.NotEqual(previous,next.Key);
    }

    [Fact]
    public void FutureModesAndUnknownProfilesAreRejectedExplicitly()
    {
        var engine=Create();
        Assert.Throws<ArgumentException>(()=>engine.Generate(Request() with {Mode="weighted"}));
        var invalid=Request() with {Profile=Request().Profile with {Provider="PMDG"}};
        Assert.Throws<ArgumentException>(()=>engine.Generate(invalid));
    }

    private static IEnumerable<string[]> Combinations(string[] ids,int count,int start=0,string[]? prefix=null)
    {
        prefix ??=[];
        if(count==0) { yield return prefix; yield break; }
        for(var index=start;index<=ids.Length-count;index++)
        foreach(var result in Combinations(ids,count-1,index+1,[..prefix,ids[index]])) yield return result;
    }
}
