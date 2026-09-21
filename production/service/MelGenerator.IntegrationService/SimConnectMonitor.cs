using System.Runtime.InteropServices;
using System.Text;

namespace MelGenerator.IntegrationService;

internal sealed class SimConnectMonitor(string? dllPath)
{
    private const uint SimObjectUser=0,PeriodOnce=1,DataTypeString256=9,Unused=0xffffffff;
    private const int RecvIdException=1,RecvIdQuit=3,RecvIdSimObjectData=8;

    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]
    private static extern IntPtr LoadLibrary(string fileName);
    [DllImport("kernel32.dll",CharSet=CharSet.Ansi,SetLastError=true)]
    private static extern IntPtr GetProcAddress(IntPtr module,string procedureName);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate int OpenDelegate(out IntPtr handle,byte[] name,IntPtr window,uint userEvent,IntPtr eventHandle,uint configIndex);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate int CloseDelegate(IntPtr handle);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate int AddDefinitionDelegate(IntPtr handle,uint definitionId,byte[] datumName,byte[]? unitsName,uint dataType,float epsilon,uint datumId);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate int RequestDataDelegate(IntPtr handle,uint requestId,uint definitionId,uint objectId,uint period,uint flags,uint origin,uint interval,uint limit);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] private delegate int GetDispatchDelegate(IntPtr handle,out IntPtr data,out uint size);

    private sealed class Api
    {
        internal readonly OpenDelegate Open; internal readonly CloseDelegate Close;
        internal readonly AddDefinitionDelegate AddDefinition; internal readonly RequestDataDelegate RequestData;
        internal readonly GetDispatchDelegate GetDispatch;
        internal Api(string path)
        {
            var module=LoadLibrary(Path.GetFullPath(path));
            if(module==IntPtr.Zero) throw new InvalidOperationException($"Unable to load SimConnect.dll (Win32 {Marshal.GetLastWin32Error()}).");
            Open=Load<OpenDelegate>(module,"SimConnect_Open"); Close=Load<CloseDelegate>(module,"SimConnect_Close");
            AddDefinition=Load<AddDefinitionDelegate>(module,"SimConnect_AddToDataDefinition");
            RequestData=Load<RequestDataDelegate>(module,"SimConnect_RequestDataOnSimObject");
            GetDispatch=Load<GetDispatchDelegate>(module,"SimConnect_GetNextDispatch");
        }
        private static T Load<T>(IntPtr module,string name) where T:Delegate
        {
            var pointer=GetProcAddress(module,name);
            if(pointer==IntPtr.Zero) throw new MissingMethodException(name);
            return Marshal.GetDelegateForFunctionPointer<T>(pointer);
        }
    }

    public async Task RunAsync(Func<bool,bool,string?,string?,Task> publish,CancellationToken cancellationToken)
    {
        if(String.IsNullOrWhiteSpace(dllPath) || !File.Exists(dllPath))
        {
            await publish(false,false,null,"SimConnect.dll was not found.");
            return;
        }
        Api api;
        try { api=new Api(dllPath); }
        catch(Exception error) { await publish(false,false,null,error.Message); return; }
        while(!cancellationToken.IsCancellationRequested)
        {
            var handle=IntPtr.Zero;
            try
            {
                var result=api.Open(out handle,Ascii("MEL Generator Integration Service"),IntPtr.Zero,0,IntPtr.Zero,0);
                if(result<0) Marshal.ThrowExceptionForHR(result);
                result=api.AddDefinition(handle,1,Ascii("TITLE"),null,DataTypeString256,0,Unused);
                if(result<0) Marshal.ThrowExceptionForHR(result);
                while(!cancellationToken.IsCancellationRequested)
                {
                    var title=await ReadTitleAsync(api,handle,cancellationToken);
                    await publish(true,!String.IsNullOrWhiteSpace(title),title,null);
                    await Task.Delay(2000,cancellationToken);
                }
            }
            catch(OperationCanceledException) { }
            catch(Exception error) { await publish(false,false,null,error.Message); }
            finally { if(handle!=IntPtr.Zero) try { api.Close(handle); } catch { } }
            if(!cancellationToken.IsCancellationRequested) await Task.Delay(2000,cancellationToken);
        }
    }

    private static async Task<string> ReadTitleAsync(Api api,IntPtr handle,CancellationToken cancellationToken)
    {
        var result=api.RequestData(handle,1,1,SimObjectUser,PeriodOnce,0,0,0,0);
        if(result<0) Marshal.ThrowExceptionForHR(result);
        var deadline=DateTime.UtcNow.AddSeconds(2);
        while(DateTime.UtcNow<deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();
            result=api.GetDispatch(handle,out var packet,out var size);
            if(result<0) { await Task.Delay(25,cancellationToken); continue; }
            if(size<12) continue;
            var receiveId=Marshal.ReadInt32(packet,8);
            if(receiveId==RecvIdQuit) throw new IOException("Simulator disconnected.");
            if(receiveId==RecvIdException) throw new IOException("SimConnect returned an exception.");
            if(receiveId!=RecvIdSimObjectData || size<41 || Marshal.ReadInt32(packet,12)!=1) continue;
            var length=Math.Min(256,(int)size-40); var title=new byte[length];
            Marshal.Copy(IntPtr.Add(packet,40),title,0,length);
            var end=Array.IndexOf(title,(byte)0); if(end<0) end=title.Length;
            return Encoding.UTF8.GetString(title,0,end).Trim();
        }
        throw new TimeoutException("Aircraft identity was not returned.");
    }

    private static byte[] Ascii(string value)=>Encoding.ASCII.GetBytes(value+'\0');
}
