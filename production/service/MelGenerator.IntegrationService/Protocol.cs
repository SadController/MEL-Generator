using System.Text.Json;
using System.Text.Json.Serialization;

namespace MelGenerator.IntegrationService;

internal sealed class ProtocolWriter
{
    public const int Version=2;
    private readonly object gate=new();
    private readonly JsonSerializerOptions options=new() {
        PropertyNamingPolicy=JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition=JsonIgnoreCondition.WhenWritingNull
    };

    public void State(ServiceState state) => Write(new {
        protocolVersion=Version,type="state",state.SimConnected,state.AircraftLoaded,
        state.AircraftTitle,state.SupportedAircraft,state.AdapterReady,
        state.SessionId,error=state.BridgeError,adapterError=state.AdapterError
    });
    public void Response(string requestId,object result) => Write(new {
        protocolVersion=Version,type="response",requestId,ok=true,result
    });
    public void Error(string requestId,Exception error) => Write(new {
        protocolVersion=Version,type="response",requestId,ok=false,
        error=new {code="SERVICE_REQUEST_FAILED",message=error.Message}
    });
    private void Write(object value)
    {
        var json=JsonSerializer.Serialize(value,options);
        lock(gate) { Console.Out.WriteLine(json); Console.Out.Flush(); }
    }
}

internal sealed record ServiceState(bool SimConnected=false,bool AircraftLoaded=false,
    string? AircraftTitle=null,bool SupportedAircraft=false,bool AdapterReady=false,
    string? BridgeError=null,string? AdapterError=null,long SessionId=0);

internal sealed class RequestEnvelope
{
    [JsonPropertyName("protocolVersion")] public int ProtocolVersion { get; init; }
    [JsonPropertyName("type")] public string? Type { get; init; }
    [JsonPropertyName("requestId")] public string? RequestId { get; init; }
    [JsonPropertyName("method")] public string? Method { get; init; }
    [JsonPropertyName("payload")] public JsonElement Payload { get; init; }
}
