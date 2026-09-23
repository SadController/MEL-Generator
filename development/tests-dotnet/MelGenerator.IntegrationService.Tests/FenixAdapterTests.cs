using System.Net;
using System.Text;
using System.Text.Json;
using MelGenerator.IntegrationService;

namespace MelGenerator.IntegrationService.Tests;

public sealed class FenixAdapterTests
{
    private sealed record Item(string Id,string Title,bool Failed,string? ConditionJson);

    private sealed class Gateway(IEnumerable<Item> initial,string? failOn=null,string? failOnClear=null) : HttpMessageHandler
    {
        internal Dictionary<string,Item> State { get; }=initial.ToDictionary(item=>item.Id,StringComparer.Ordinal);
        internal List<(string Id,bool Failed)> Writes { get; }=[];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellationToken)
        {
            if(request.Method==HttpMethod.Get) return Task.FromResult(Json(Catalogue()));
            var body=JsonDocument.Parse(request.Content!.ReadAsStringAsync(cancellationToken).Result).RootElement;
            var id=body.GetProperty("id").GetString()!;
            var failed=body.GetProperty("failed").GetBoolean();
            Writes.Add((id,failed));
            var current=State[id];
            if((id!=failOn || !failed) && (id!=failOnClear || failed))
                State[id]=current with {Failed=failed,ConditionJson=failed?"{\"id\":3}":null};
            return Task.FromResult(Json(new {id,failed=State[id].Failed}));
        }

        private object Catalogue() => new {atas=new[]{new {id="22",groups=new[]{new {groupName="Test",
            failures=State.Values.Select(item=>new {id=item.Id,title=item.Title,failed=item.Failed,
                failureCondition=item.ConditionJson is null ? null : JsonSerializer.Deserialize<object>(item.ConditionJson)}).ToArray()}}}}};

        private static HttpResponseMessage Json(object value) => new(HttpStatusCode.OK) {
            Content=new StringContent(JsonSerializer.Serialize(value),Encoding.UTF8,"application/json")
        };
    }

    [Fact]
    public async Task ActivatesMappedFailuresAndPreservesAnActiveRecord()
    {
        var gateway=new Gateway([
            new("F_ONE","One",false,null),new("F_TWO","Two",true,"{\"id\":3}")]);
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"},{"M002","F_TWO"}},
            new HttpClient(gateway),clearSettleMs:0);
        await adapter.ProbeAsync(CancellationToken.None);
        var result=await adapter.ActivateAsync(["M001","M002"],CancellationToken.None);
        Assert.Equal("success",result.Overall);
        Assert.Equal(["activated","already-active"],result.Results.Select(item=>item.Status));
        Assert.True(gateway.State["F_ONE"].Failed);
        Assert.True(gateway.State["F_TWO"].Failed);
    }

    [Fact]
    public async Task RollsBackOnlyFailuresActivatedByTheFailedOperation()
    {
        var gateway=new Gateway([
            new("F_ONE","One",false,null),new("F_TWO","Two",false,null),
            new("F_USER","User",true,null)],failOn:"F_TWO");
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"},{"M002","F_TWO"},{"M003","F_USER"}},
            new HttpClient(gateway),clearSettleMs:0);
        var result=await adapter.ActivateAsync(["M001","M002"],CancellationToken.None);
        Assert.Equal("failed",result.Overall);
        Assert.Equal("rolled-back",result.Results.Single(item=>item.CatalogId=="M001").Status);
        Assert.False(gateway.State["F_ONE"].Failed);
        Assert.True(gateway.State["F_USER"].Failed);
    }

    [Fact]
    public async Task DeactivationClearsOnlyFailuresActivatedByThisBriefing()
    {
        var gateway=new Gateway([new("F_ONE","One",false,null),new("F_TWO","Two",true,"{\"id\":3}")]);
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"},{"M002","F_TWO"}},
            new HttpClient(gateway),clearSettleMs:0);
        var activation=await adapter.ActivateAsync(["M001","M002"],CancellationToken.None,7);
        Assert.Equal(1,activation.OwnedCount);
        var result=await adapter.DeactivateAsync(7,()=>true,CancellationToken.None);
        Assert.Equal("success",result.Overall);
        Assert.Equal(1,result.PreExistingCount);
        Assert.Equal("deactivated",Assert.Single(result.Results).Status);
        Assert.False(gateway.State["F_ONE"].Failed);
        Assert.True(gateway.State["F_TWO"].Failed);
        Assert.DoesNotContain(gateway.Writes,write=>write.Id=="F_TWO");
    }

    [Fact]
    public async Task DeactivationClearsTwoNewFailuresAndCannotClearAgain()
    {
        var gateway=new Gateway([new("F_ONE","One",false,null),new("F_TWO","Two",false,null)]);
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"},{"M002","F_TWO"}},
            new HttpClient(gateway),clearSettleMs:0);
        var activation=await adapter.ActivateAsync(["M001","M002"],CancellationToken.None,1);
        Assert.Equal(2,activation.OwnedCount);
        var result=await adapter.DeactivateAsync(1,()=>true,CancellationToken.None);
        Assert.Equal("success",result.Overall);
        Assert.All(result.Results,item=>Assert.Equal("deactivated",item.Status));
        Assert.All(gateway.State.Values,item=>Assert.False(item.Failed));
        Assert.Equal("unavailable",(await adapter.DeactivateAsync(1,()=>true,CancellationToken.None)).Overall);
    }

    [Fact]
    public async Task AllPreexistingFailuresNeverBecomeOwned()
    {
        var gateway=new Gateway([new("F_ONE","One",true,"{\"id\":3}")]);
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"}},new HttpClient(gateway),clearSettleMs:0);
        var activation=await adapter.ActivateAsync(["M001"],CancellationToken.None,1);
        Assert.Equal(0,activation.OwnedCount);
        Assert.Equal("unavailable",(await adapter.DeactivateAsync(1,()=>true,CancellationToken.None)).Overall);
        Assert.Empty(gateway.Writes);
    }

    [Fact]
    public async Task ChangedFailureIsLeftForManualReview()
    {
        var gateway=new Gateway([new("F_ONE","One",false,null)]);
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"}},new HttpClient(gateway),clearSettleMs:0);
        await adapter.ActivateAsync(["M001"],CancellationToken.None,2);
        gateway.State["F_ONE"]=gateway.State["F_ONE"] with {ConditionJson="{\"armed\":true}"};
        var result=await adapter.DeactivateAsync(2,()=>true,CancellationToken.None);
        Assert.Equal("partial",result.Overall);
        Assert.Equal("changed",Assert.Single(result.Results).Status);
        Assert.Equal(0,result.RemainingCount);
        Assert.Single(gateway.Writes);
    }

    [Fact]
    public async Task SessionChangeBlocksClearing()
    {
        var gateway=new Gateway([new("F_ONE","One",false,null)]);
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"}},new HttpClient(gateway),clearSettleMs:0);
        await adapter.ActivateAsync(["M001"],CancellationToken.None,2);
        var result=await adapter.DeactivateAsync(3,()=>true,CancellationToken.None);
        Assert.Equal("unavailable",result.Overall);
        Assert.True(gateway.State["F_ONE"].Failed);
        Assert.Single(gateway.Writes);
    }

    [Fact]
    public async Task DisconnectGuardBlocksClearingBeforeAnyWrite()
    {
        var gateway=new Gateway([new("F_ONE","One",false,null)]);
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"}},new HttpClient(gateway),clearSettleMs:0);
        await adapter.ActivateAsync(["M001"],CancellationToken.None,2);
        var result=await adapter.DeactivateAsync(2,()=>false,CancellationToken.None);
        Assert.Equal("unavailable",result.Overall);
        Assert.Single(gateway.Writes);
    }

    [Fact]
    public async Task AlreadyInactiveFailureRequiresNoClearCommand()
    {
        var gateway=new Gateway([new("F_ONE","One",false,null)]);
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"}},new HttpClient(gateway),clearSettleMs:0);
        await adapter.ActivateAsync(["M001"],CancellationToken.None,2);
        gateway.State["F_ONE"]=gateway.State["F_ONE"] with {Failed=false,ConditionJson=null};
        var result=await adapter.DeactivateAsync(2,()=>true,CancellationToken.None);
        Assert.Equal("success",result.Overall);
        Assert.Equal("already-inactive",Assert.Single(result.Results).Status);
        Assert.Single(gateway.Writes);
    }

    [Fact]
    public async Task FailedClearCanRetryWithoutTouchingAlreadyClearedFailure()
    {
        var gateway=new Gateway([new("F_ONE","One",false,null),new("F_TWO","Two",false,null)],failOnClear:"F_TWO");
        var adapter=new FenixAdapter(new Dictionary<string,string>{{"M001","F_ONE"},{"M002","F_TWO"}},
            new HttpClient(gateway),clearSettleMs:0);
        await adapter.ActivateAsync(["M001","M002"],CancellationToken.None,4);
        var partial=await adapter.DeactivateAsync(4,()=>true,CancellationToken.None);
        Assert.Equal("partial",partial.Overall);
        Assert.Equal(1,partial.RemainingCount);
        Assert.False(gateway.State["F_ONE"].Failed);
        Assert.Equal(1,gateway.Writes.Count(write=>write.Id=="F_ONE" && !write.Failed));
        var retry=await adapter.DeactivateAsync(4,()=>true,CancellationToken.None);
        Assert.Single(retry.Results);
        Assert.Equal("M002",retry.Results[0].CatalogId);
        Assert.Equal(1,gateway.Writes.Count(write=>write.Id=="F_ONE" && !write.Failed));
    }
}
