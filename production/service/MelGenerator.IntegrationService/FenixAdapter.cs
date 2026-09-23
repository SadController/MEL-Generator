using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MelGenerator.IntegrationService;

internal sealed record FailureState(bool Failed,string? FailureCondition);
internal sealed record FenixFailure(string Id,string Title,bool Failed,string? FailureCondition);
internal sealed record ActivationItem(string CatalogId,string? FenixId,string Status,string? Message=null);
internal sealed record ActivationResult(bool Requested,string Overall,IReadOnlyList<ActivationItem> Results,
    bool RolledBack=false,string? Message=null,string? RollbackError=null,int OwnedCount=0,long SessionId=0);
internal sealed record DeactivationItem(string CatalogId,string FenixId,string Status,string? Message=null);
internal sealed record DeactivationResult(string Overall,IReadOnlyList<DeactivationItem> Results,
    int RemainingCount,int PreExistingCount,string? Message=null,long SessionId=0);

internal sealed class FenixAdapter
{
    private readonly IReadOnlyDictionary<string,string> mapping;
    private readonly HttpClient client;
    private readonly string baseUrl;
    private readonly int clearSettleMs;
    private readonly Dictionary<string,(string FenixId,FailureState Expected)> owned=new(StringComparer.Ordinal);
    private int preExistingCount;
    private long ownedSessionId;

    public FenixAdapter(IReadOnlyDictionary<string,string> mapping,HttpClient? client=null,
        string baseUrl="http://127.0.0.1:8083/fenix",int clearSettleMs=750)
    {
        this.mapping=mapping;
        this.client=client ?? new HttpClient {Timeout=TimeSpan.FromMilliseconds(2500)};
        this.baseUrl=baseUrl.TrimEnd('/');
        this.clearSettleMs=clearSettleMs;
    }

    public async Task ProbeAsync(CancellationToken cancellationToken)
    {
        var catalogue=await CatalogueAsync(cancellationToken);
        var missing=mapping.Values.Where(id=>!catalogue.ContainsKey(id)).ToArray();
        if(missing.Length>0) throw new InvalidDataException($"Failure mapping is missing {missing.Length} aircraft records.");
    }

    public void BeginBriefing()
    {
        owned.Clear();
        preExistingCount=0;
        ownedSessionId=0;
    }

    public async Task<ActivationResult> ActivateAsync(IReadOnlyList<string> catalogIds,CancellationToken cancellationToken,
        long sessionId=0,Func<bool>? sessionValid=null)
    {
        if(owned.Count>0) throw new InvalidOperationException("Current briefing still has active app-owned failures.");
        var unique=catalogIds.Distinct(StringComparer.Ordinal).ToArray();
        if(unique.Length!=catalogIds.Count || unique.Any(id=>!mapping.ContainsKey(id)))
            throw new ArgumentException("Scenario contains an unsupported failure mapping.");
        var baseline=await CatalogueAsync(cancellationToken);
        var missing=mapping.Values.Where(id=>!baseline.ContainsKey(id)).ToArray();
        if(missing.Length>0) throw new InvalidDataException($"Aircraft failure catalogue is missing: {string.Join(", ",missing)}.");
        var before=mapping.Values.ToDictionary(id=>id,id=>Stable(baseline[id]),StringComparer.Ordinal);
        var results=new List<ActivationItem>();
        var activated=new List<(string CatalogId,string FenixId,FenixFailure Item)>();
        try
        {
            foreach(var catalogId in unique)
            {
                var fenixId=mapping[catalogId];
                var item=baseline[fenixId];
                if(item.Failed) { results.Add(new(catalogId,fenixId,"already-active")); continue; }
                if(item.FailureCondition is not null)
                    throw new InvalidOperationException($"{fenixId} is armed or active in an incompatible state.");
                try { await SetFailureAsync(item,true,cancellationToken); }
                catch
                {
                    try
                    {
                        var current=(await CatalogueAsync(cancellationToken))[fenixId];
                        if(current.Failed) activated.Add((catalogId,fenixId,item));
                    }
                    catch { }
                    throw;
                }
                activated.Add((catalogId,fenixId,item));
                results.Add(new(catalogId,fenixId,"activated"));
            }
            var finalState=await CatalogueAsync(cancellationToken);
            var intended=unique.Select(id=>mapping[id]).ToHashSet(StringComparer.Ordinal);
            var collateral=mapping.Values.Where(id=>!intended.Contains(id) && Stable(finalState[id])!=before[id]).ToArray();
            if(collateral.Length>0) throw new InvalidOperationException($"Other mapped failures changed: {string.Join(", ",collateral)}.");
            if(sessionValid is not null && !sessionValid()) throw new InvalidOperationException("Simulator session changed during activation.");
            foreach(var entry in activated)
                owned[entry.CatalogId]=(entry.FenixId,Stable(finalState[entry.FenixId]));
            preExistingCount=results.Count(item=>item.Status=="already-active");
            ownedSessionId=sessionId;
            return new(true,"success",results,OwnedCount:owned.Count,SessionId:sessionId);
        }
        catch(Exception error)
        {
            string? rollbackError=null;
            activated.Reverse();
            foreach(var entry in activated)
            {
                if(sessionValid is not null && !sessionValid())
                {
                    rollbackError="Simulator session changed; verify the affected failures manually.";
                    break;
                }
                try
                {
                    await SetFailureAsync(entry.Item,false,cancellationToken);
                    var index=results.FindIndex(value=>value.CatalogId==entry.CatalogId);
                    if(index>=0) results[index]=results[index] with {Status="rolled-back"};
                }
                catch(Exception rollback) { rollbackError=rollback.Message; }
            }
            var completed=results.Select(result=>result.CatalogId).ToHashSet(StringComparer.Ordinal);
            foreach(var catalogId in unique.Where(id=>!completed.Contains(id)))
                results.Add(new(catalogId,mapping[catalogId],"failed",error.Message));
            return new(true,"failed",results,activated.Count>0,error.Message,rollbackError);
        }
    }

    public async Task<DeactivationResult> DeactivateAsync(long sessionId,Func<bool> sessionValid,CancellationToken cancellationToken)
    {
        if(owned.Count==0 || ownedSessionId!=sessionId || !sessionValid())
            return new("unavailable",[],owned.Count,preExistingCount,"No active failures are owned by this briefing in the current simulator session.",sessionId);
        var results=new List<DeactivationItem>();
        foreach(var (catalogId,entry) in owned.ToArray())
        {
            if(!sessionValid())
            {
                results.Add(new(catalogId,entry.FenixId,"unavailable","The simulator session changed."));
                break;
            }
            try
            {
                var current=(await CatalogueAsync(cancellationToken))[entry.FenixId];
                if(!current.Failed && current.FailureCondition is null)
                {
                    owned.Remove(catalogId);
                    results.Add(new(catalogId,entry.FenixId,"already-inactive"));
                    continue;
                }
                if(Stable(current)!=entry.Expected)
                {
                    owned.Remove(catalogId);
                    results.Add(new(catalogId,entry.FenixId,"changed","Aircraft failure state changed; review it manually."));
                    continue;
                }
                if(!sessionValid()) throw new InvalidOperationException("The simulator session changed.");
                await SetFailureAsync(current,false,cancellationToken);
                owned.Remove(catalogId);
                results.Add(new(catalogId,entry.FenixId,"deactivated"));
            }
            catch(Exception error)
            {
                results.Add(new(catalogId,entry.FenixId,"failed",error.Message));
            }
        }
        var overall=owned.Count==0 && results.All(item=>item.Status is "deactivated" or "already-inactive")
            ? "success" : "partial";
        return new(overall,results,owned.Count,preExistingCount,
            overall=="partial" ? "Some failures could not be cleared automatically; review their card status." : null,sessionId);
    }

    private async Task<Dictionary<string,FenixFailure>> CatalogueAsync(CancellationToken cancellationToken)
    {
        using var response=await client.GetAsync($"{baseUrl}/failures/manual",cancellationToken);
        response.EnsureSuccessStatusCode();
        using var document=JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancellationToken));
        if(!document.RootElement.TryGetProperty("atas",out var atas) || atas.ValueKind!=JsonValueKind.Array)
            throw new InvalidDataException("Unexpected aircraft failure catalogue format.");
        var result=new Dictionary<string,FenixFailure>(StringComparer.Ordinal);
        foreach(var ata in atas.EnumerateArray())
        {
            if(!ata.TryGetProperty("groups",out var groups) || groups.ValueKind!=JsonValueKind.Array) continue;
            foreach(var group in groups.EnumerateArray())
            {
                if(!group.TryGetProperty("failures",out var failures) || failures.ValueKind!=JsonValueKind.Array) continue;
                foreach(var failure in failures.EnumerateArray())
                {
                    if(!failure.TryGetProperty("id",out var idNode) || idNode.GetString() is not {Length:>0} id) continue;
                    var title=failure.TryGetProperty("title",out var titleNode) ? titleNode.GetString() ?? id : id;
                    var failed=failure.TryGetProperty("failed",out var failedNode) && failedNode.ValueKind==JsonValueKind.True;
                    string? condition=null;
                    if(failure.TryGetProperty("failureCondition",out var conditionNode) && conditionNode.ValueKind!=JsonValueKind.Null)
                        condition=conditionNode.GetRawText();
                    result[id]=new(id,title,failed,condition);
                }
            }
        }
        return result;
    }

    private async Task<FenixFailure> SetFailureAsync(FenixFailure item,bool failed,CancellationToken cancellationToken)
    {
        var attempts=failed ? 1 : 2;
        for(var attempt=0;attempt<attempts;attempt++)
        {
            using var response=await client.PostAsJsonAsync($"{baseUrl}/failures/saveManual",
                new {id=item.Id,title=item.Title,failureCondition=(string?)null,failed},cancellationToken);
            response.EnsureSuccessStatusCode();
            var acknowledgement=await response.Content.ReadFromJsonAsync<SaveResponse>(cancellationToken:cancellationToken);
            if(acknowledgement?.Failed!=failed) throw new InvalidOperationException($"Aircraft failure system did not acknowledge {item.Id}.");
            var readback=(await CatalogueAsync(cancellationToken))[item.Id];
            if(failed && readback.Failed) return readback;
            if(!failed)
            {
                if(clearSettleMs>0) await Task.Delay(clearSettleMs,cancellationToken);
                readback=(await CatalogueAsync(cancellationToken))[item.Id];
                if(!readback.Failed && readback.FailureCondition is null) return readback;
            }
        }
        throw new InvalidOperationException($"Failure readback did not confirm {item.Id}={failed}.");
    }

    private static FailureState Stable(FenixFailure item) => new(item.Failed,item.FailureCondition);
    private sealed class SaveResponse { [JsonPropertyName("failed")] public bool Failed { get; init; } }
}
