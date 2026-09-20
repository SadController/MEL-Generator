using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

internal static class SimConnectBridge
{
    private const uint SimObjectUser = 0;
    private const uint PeriodOnce = 1;
    private const uint DataTypeString256 = 9;
    private const uint Unused = 0xffffffff;
    private const int RecvIdException = 1;
    private const int RecvIdQuit = 3;
    private const int RecvIdSimObjectData = 8;
    private static volatile bool running = true;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr LoadLibrary(string fileName);

    [DllImport("kernel32.dll", CharSet = CharSet.Ansi, SetLastError = true)]
    private static extern IntPtr GetProcAddress(IntPtr module, string procedureName);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int OpenDelegate(out IntPtr handle, byte[] name, IntPtr window,
        uint userEvent, IntPtr eventHandle, uint configIndex);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int CloseDelegate(IntPtr handle);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int AddDefinitionDelegate(IntPtr handle, uint definitionId,
        byte[] datumName, byte[] unitsName, uint dataType, float epsilon, uint datumId);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int RequestDataDelegate(IntPtr handle, uint requestId,
        uint definitionId, uint objectId, uint period, uint flags, uint origin,
        uint interval, uint limit);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetDispatchDelegate(IntPtr handle, out IntPtr data, out uint size);

    private sealed class Api
    {
        internal readonly OpenDelegate Open;
        internal readonly CloseDelegate Close;
        internal readonly AddDefinitionDelegate AddDefinition;
        internal readonly RequestDataDelegate RequestData;
        internal readonly GetDispatchDelegate GetDispatch;

        internal Api(string dllPath)
        {
            IntPtr module = LoadLibrary(Path.GetFullPath(dllPath));
            if (module == IntPtr.Zero)
                throw new InvalidOperationException("Unable to load SimConnect.dll (Win32 " + Marshal.GetLastWin32Error() + ").");
            Open = Load<OpenDelegate>(module, "SimConnect_Open");
            Close = Load<CloseDelegate>(module, "SimConnect_Close");
            AddDefinition = Load<AddDefinitionDelegate>(module, "SimConnect_AddToDataDefinition");
            RequestData = Load<RequestDataDelegate>(module, "SimConnect_RequestDataOnSimObject");
            GetDispatch = Load<GetDispatchDelegate>(module, "SimConnect_GetNextDispatch");
        }

        private static T Load<T>(IntPtr module, string name) where T : class
        {
            IntPtr pointer = GetProcAddress(module, name);
            if (pointer == IntPtr.Zero) throw new MissingMethodException(name);
            return Marshal.GetDelegateForFunctionPointer(pointer, typeof(T)) as T;
        }
    }

    private static byte[] Ascii(string value)
    {
        return Encoding.ASCII.GetBytes(value + "\0");
    }

    private static string Json(string value)
    {
        if (value == null) return "null";
        StringBuilder result = new StringBuilder("\"");
        foreach (char character in value)
        {
            switch (character)
            {
                case '\\': result.Append("\\\\"); break;
                case '"': result.Append("\\\""); break;
                case '\r': result.Append("\\r"); break;
                case '\n': result.Append("\\n"); break;
                case '\t': result.Append("\\t"); break;
                default:
                    if (character < 32) result.Append("\\u" + ((int)character).ToString("x4"));
                    else result.Append(character);
                    break;
            }
        }
        return result.Append('"').ToString();
    }

    private static void Emit(bool connected, bool aircraftLoaded, string title, string error)
    {
        Console.WriteLine("{\"protocolVersion\":1,\"type\":\"state\",\"simConnected\":" +
            (connected ? "true" : "false") + ",\"aircraftLoaded\":" +
            (aircraftLoaded ? "true" : "false") + ",\"aircraftTitle\":" + Json(title) +
            ",\"error\":" + Json(error) + "}");
    }

    private static string ReadTitle(Api api, IntPtr handle)
    {
        const uint definitionId = 1;
        const uint requestId = 1;
        int result = api.RequestData(handle, requestId, definitionId, SimObjectUser,
            PeriodOnce, 0, 0, 0, 0);
        if (result < 0) Marshal.ThrowExceptionForHR(result);
        DateTime deadline = DateTime.UtcNow.AddSeconds(2);
        while (DateTime.UtcNow < deadline && running)
        {
            IntPtr packet;
            uint size;
            result = api.GetDispatch(handle, out packet, out size);
            if (result < 0)
            {
                Thread.Sleep(25);
                continue;
            }
            if (size < 12) continue;
            int receiveId = Marshal.ReadInt32(packet, 8);
            if (receiveId == RecvIdQuit) throw new IOException("Simulator disconnected.");
            if (receiveId == RecvIdException) throw new IOException("SimConnect returned an exception.");
            if (receiveId != RecvIdSimObjectData || size < 41) continue;
            if (Marshal.ReadInt32(packet, 12) != requestId) continue;
            int length = Math.Min(256, (int)size - 40);
            byte[] title = new byte[length];
            Marshal.Copy(IntPtr.Add(packet, 40), title, 0, length);
            int end = Array.IndexOf(title, (byte)0);
            if (end < 0) end = title.Length;
            return Encoding.UTF8.GetString(title, 0, end).Trim();
        }
        throw new TimeoutException("Aircraft identity was not returned.");
    }

    public static int Main(string[] args)
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs e) { running = false; e.Cancel = true; };
        if (args.Length != 2 || args[0] != "--dll")
        {
            Emit(false, false, null, "Usage: SimConnectBridge.exe --dll <path>");
            return 2;
        }

        Api api;
        try { api = new Api(args[1]); }
        catch (Exception error)
        {
            Emit(false, false, null, error.Message);
            return 3;
        }

        while (running)
        {
            IntPtr handle = IntPtr.Zero;
            try
            {
                int result = api.Open(out handle, Ascii("MEL Generator Integration Service"),
                    IntPtr.Zero, 0, IntPtr.Zero, 0);
                if (result < 0) Marshal.ThrowExceptionForHR(result);
                result = api.AddDefinition(handle, 1, Ascii("TITLE"), null,
                    DataTypeString256, 0, Unused);
                if (result < 0) Marshal.ThrowExceptionForHR(result);

                while (running)
                {
                    string title = ReadTitle(api, handle);
                    Emit(true, !String.IsNullOrWhiteSpace(title), title, null);
                    for (int i = 0; i < 20 && running; i++) Thread.Sleep(100);
                }
            }
            catch (Exception error)
            {
                Emit(false, false, null, error.Message);
            }
            finally
            {
                if (handle != IntPtr.Zero) try { api.Close(handle); } catch { }
            }
            for (int i = 0; i < 20 && running; i++) Thread.Sleep(100);
        }
        return 0;
    }
}
