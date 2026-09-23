using System.Security.Cryptography;

namespace MelGenerator.Core;

public sealed class CryptoRandomSource : IRandomSource
{
    public int Next(int exclusiveMaximum) => RandomNumberGenerator.GetInt32(exclusiveMaximum);
}

public sealed class ScenarioEngine
{
    public const string Version = "1.0.0";
    private readonly IReadOnlyDictionary<string,CatalogueRecord> records;
    private readonly RuleSet rules;
    private readonly IRandomSource random;
    private readonly Dictionary<int,List<string[]>> pools=[];
    private readonly Dictionary<int,Bag> bags=[];

    private sealed class Bag
    {
        public required int[] Order { get; init; }
        public int Cursor { get; set; }
        public int Cycle { get; init; }
        public int? Last { get; set; }
    }

    public ScenarioEngine(Catalogue catalogue,RuleSet rules,IRandomSource? random=null)
    {
        this.rules=rules;
        this.random=random ?? new CryptoRandomSource();
        records=catalogue.Records.ToDictionary(record=>record.Id,StringComparer.Ordinal);
        if(records.Count != catalogue.Records.Count) throw new InvalidDataException("Duplicate catalogue ID.");
        foreach(var record in records.Values)
        {
            var matches=rules.Profiles.Count(profile=>profile.Id==record.RuleProfile && profile.MemberIds.Contains(record.Id));
            if(matches!=1) throw new InvalidDataException($"Missing or duplicate profile: {record.Id}");
        }
        foreach(var profile in rules.Profiles)
        foreach(var alternative in profile.Alternatives)
        {
            if(alternative.Conditions.Count==0 || alternative.PdfPages.Count==0)
                throw new InvalidDataException($"Incomplete branch: {alternative.Id}");
            foreach(var id in profile.MemberIds.Concat(alternative.PermittedFailedIds)
                         .Concat(alternative.RequiresOperativeCatalogIds))
                if(!records.ContainsKey(id)) throw new InvalidDataException($"Unknown catalogue ID: {id}");
        }
    }

    public CompatibilityAssessment Assess(IEnumerable<string> ids)
    {
        var values=ids?.ToArray() ?? throw new ArgumentException("Failures are required.",nameof(ids));
        if(values.Length is <1 or >3 || values.Distinct(StringComparer.Ordinal).Count()!=values.Length ||
           values.Any(id=>!records.ContainsKey(id)))
            throw new ArgumentException("Select one to three distinct catalogue failures.",nameof(ids));
        var selected=values.ToHashSet(StringComparer.Ordinal);
        var branches=new Dictionary<string,RuleAlternative>(StringComparer.Ordinal);
        var conflicts=new List<string>();
        foreach(var profile in rules.Profiles)
        {
            var failed=profile.MemberIds.Where(selected.Contains).ToArray();
            if(failed.Length==0) continue;
            var viable=profile.Alternatives.FirstOrDefault(alternative=>
                failed.Length<=alternative.MaxFailed &&
                failed.All(alternative.PermittedFailedIds.Contains) &&
                !alternative.RequiresOperativeCatalogIds.Any(selected.Contains));
            if(viable is null) conflicts.Add(profile.Id); else branches[profile.Id]=viable;
        }
        return new CompatibilityAssessment(conflicts.Count==0,branches,conflicts);
    }

    public IReadOnlyList<string[]> Pool(int count)
    {
        if(count is <1 or >3) throw new ArgumentOutOfRangeException(nameof(count),"Failure count must be 1, 2 or 3.");
        if(pools.TryGetValue(count,out var cached)) return cached;
        var ids=records.Keys.Order(StringComparer.Ordinal).ToArray();
        var pool=Combinations(ids,count).Where(candidate=>Assess(candidate).Allowed).ToList();
        pools[count]=pool;
        return pool;
    }

    public ScenarioResult Generate(ScenarioRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ValidateProfile(request.Profile);
        if(request.Mode!="uniform") throw new ArgumentException("Only the uniform compatibility mode is implemented.");
        var pool=Pool(request.FailureCount);
        if(pool.Count==0) throw new InvalidOperationException("No compatible scenarios are available.");
        if(!bags.TryGetValue(request.FailureCount,out var bag) || bag.Cursor==bag.Order.Length)
        {
            var previous=bag?.Last;
            var order=Enumerable.Range(0,pool.Count).ToArray();
            for(var index=order.Length-1;index>0;index--)
            {
                var selected=random.Next(index+1);
                (order[index],order[selected])=(order[selected],order[index]);
            }
            if(order.Length>1 && order[0]==previous)
            {
                var selected=1+random.Next(order.Length-1);
                (order[0],order[selected])=(order[selected],order[0]);
            }
            bag=new Bag {Order=order,Cursor=0,Cycle=(bag?.Cycle ?? 0)+1};
            bags[request.FailureCount]=bag;
        }
        var poolIndex=bag.Order[bag.Cursor++];
        bag.Last=poolIndex;
        var ids=pool[poolIndex];
        var assessment=Assess(ids);
        var cards=ids.Select(id=>
        {
            var record=records[id];
            var branch=assessment.Branches[record.RuleProfile];
            return new ScenarioCard(record.Id,record.Name,record.EfbPath,record.SourceId,
                record.MmelId,record.MmelTitle,branch.PdfPages.ToArray(),record.RuleProfile,
                branch.Id,branch.Branch,branch.Conditions.ToArray());
        }).ToArray();
        return new ScenarioResult(request.Profile.Aircraft,request.FailureCount,string.Join('+',ids),bag.Cycle,cards,
            new GenerationExplanation(Version,request.Profile.ProfileId,request.Profile.ProfileVersion,
                "uniform-without-replacement",records.Count,pool.Count,assessment.Allowed));
    }

    private static void ValidateProfile(GenerationProfileRef profile)
    {
        ArgumentNullException.ThrowIfNull(profile);
        if(profile.SchemaVersion!="1" || profile.ProfileId!="fenix-faa-r32" ||
           profile.ProfileVersion!="1.0.0" || profile.Simulator!="MSFS2024" ||
           profile.Provider!="Fenix" || profile.AircraftFamily!="A320" ||
           profile.SourceDocumentId!="FAA_A320_R32" || profile.Aircraft is not ("A319" or "A320" or "A321"))
            throw new ArgumentException("The generation profile is not supported.",nameof(profile));
    }

    private static IEnumerable<string[]> Combinations(string[] ids,int count,int start=0,string[]? prefix=null)
    {
        prefix ??=[];
        if(count==0) { yield return prefix; yield break; }
        for(var index=start;index<=ids.Length-count;index++)
            foreach(var result in Combinations(ids,count-1,index+1,[..prefix,ids[index]])) yield return result;
    }
}
