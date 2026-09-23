using System.Text.Json;
using MelGenerator.Core;
using MelGenerator.IntegrationService;

Console.OutputEncoding=new System.Text.UTF8Encoding(false);
var arguments=ParseArguments(args);
var dataDirectory=arguments.GetValueOrDefault("data") ?? Path.Combine(AppContext.BaseDirectory,"data");
var (catalogue,rules)=CatalogueLoader.Load(Path.Combine(dataDirectory,"catalog.json"),Path.Combine(dataDirectory,"rules.json"));
var mapping=JsonSerializer.Deserialize<Dictionary<string,string>>(File.ReadAllText(Path.Combine(dataDirectory,"fenix-mapping.json")))
    ?? throw new InvalidDataException("Failure mapping is empty.");
var engine=new ScenarioEngine(catalogue,rules);
var fenix=new FenixAdapter(mapping);
var writer=new ProtocolWriter();
var cancellation=new CancellationTokenSource();
var stateGate=new SemaphoreSlim(1,1);
var state=new ServiceState(BridgeError:String.IsNullOrWhiteSpace(arguments.GetValueOrDefault("dll")) ? "SimConnect.dll was not found." : null);
writer.State(state);

async Task PublishSimulatorState(bool connected,bool loaded,string? title,string? error)
{
    await stateGate.WaitAsync(cancellation.Token);
    try
    {
        var supported=connected && loaded && title is not null &&
            System.Text.RegularExpressions.Regex.IsMatch(title.Trim(),"^FenixA(?:319|320|321)\\b",System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var ready=false; string? adapterError=null;
        if(supported)
        {
            try { await fenix.ProbeAsync(cancellation.Token); ready=true; }
            catch(Exception probeError) { adapterError=probeError.Message; }
        }
        state=new ServiceState(connected,loaded,title,supported,ready,error,adapterError);
        writer.State(state);
    }
    finally { stateGate.Release(); }
}

var monitor=new SimConnectMonitor(arguments.GetValueOrDefault("dll"));
var monitorTask=Task.Run(()=>monitor.RunAsync(PublishSimulatorState,cancellation.Token));
var jsonOptions=new JsonSerializerOptions {PropertyNameCaseInsensitive=true};
string? line;
while((line=await Console.In.ReadLineAsync()) is not null)
{
    RequestEnvelope? request=null;
    try
    {
        request=JsonSerializer.Deserialize<RequestEnvelope>(line,jsonOptions)
            ?? throw new InvalidDataException("Request is empty.");
        if(request.ProtocolVersion!=ProtocolWriter.Version || request.Type!="request" || String.IsNullOrWhiteSpace(request.RequestId))
            throw new InvalidDataException("Unsupported integration protocol request.");
        object result=request.Method switch
        {
            "generate"=>Generate(engine,request.Payload),
            "activate"=>await Activate(fenix,state,request.Payload,cancellation.Token),
            "status"=>state,
            _=>throw new InvalidDataException("Unknown integration service method.")
        };
        writer.Response(request.RequestId,result);
    }
    catch(Exception error) { writer.Error(request?.RequestId ?? "invalid",error); }
}
cancellation.Cancel();
try { await monitorTask; } catch(OperationCanceledException) { }

static ScenarioResult Generate(ScenarioEngine engine,JsonElement payload)
{
    var aircraft=payload.GetProperty("aircraft").GetString() ?? throw new ArgumentException("Aircraft is required.");
    var count=payload.GetProperty("count").GetInt32();
    var profile=new GenerationProfileRef("1","fenix-faa-r32","1.0.0","MSFS2024","Fenix","A320",aircraft,null,"FAA_A320_R32");
    return engine.Generate(new ScenarioRequest(profile,count));
}

static async Task<ActivationResult> Activate(FenixAdapter fenix,ServiceState state,JsonElement payload,CancellationToken cancellationToken)
{
    var ids=payload.GetProperty("catalogIds").EnumerateArray().Select(node=>node.GetString() ?? "").ToArray();
    if(!state.SimConnected || !state.AircraftLoaded)
        return new(true,"failed",ids.Select(id=>new ActivationItem(id,null,"failed")).ToArray(),
            Message:"MSFS and a loaded aircraft were not detected.");
    if(!state.SupportedAircraft)
        return new(true,"failed",ids.Select(id=>new ActivationItem(id,null,"unsupported")).ToArray(),
            Message:"The loaded aircraft is not supported for automatic activation.");
    if(!state.AdapterReady)
        return new(true,"failed",ids.Select(id=>new ActivationItem(id,null,"failed")).ToArray(),
            Message:state.AdapterError ?? "The aircraft failure adapter is unavailable.");
    return await fenix.ActivateAsync(ids,cancellationToken);
}

static Dictionary<string,string?> ParseArguments(string[] values)
{
    var result=new Dictionary<string,string?>(StringComparer.OrdinalIgnoreCase);
    for(var index=0;index<values.Length;index++)
    {
        if(!values[index].StartsWith("--",StringComparison.Ordinal)) continue;
        var key=values[index][2..];
        result[key]=index+1<values.Length && !values[index+1].StartsWith("--",StringComparison.Ordinal) ? values[++index] : null;
    }
    return result;
}
