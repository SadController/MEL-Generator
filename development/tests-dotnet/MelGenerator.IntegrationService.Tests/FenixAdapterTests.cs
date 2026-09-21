using System.Net;
using System.Text;
using System.Text.Json;
using MelGenerator.IntegrationService;

namespace MelGenerator.IntegrationService.Tests;

public sealed class FenixAdapterTests
{
    private sealed record Item(string Id,string Title,bool Failed,string? ConditionJson);

    private sealed class Gateway(IEnumerable<Item> initial,string? failOn=null) : HttpMessageHandler
    {
        internal Dictionary<string,Item> State { get; }=initial.ToDictionary(item=>item.Id,StringComparer.Ordinal);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellationToken)
        {
            if(request.Method==HttpMethod.Get) return Task.FromResult(Json(Catalogue()));
            var body=JsonDocument.Parse(request.Content!.ReadAsStringAsync(cancellationToken).Result).RootElement;
            var id=body.GetProperty("id").GetString()!;
            var failed=body.GetProperty("failed").GetBoolean();
            var current=State[id];
            if(id!=failOn || !failed) State[id]=current with {Failed=failed,ConditionJson=failed?"{\"id\":3}":null};
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
}
