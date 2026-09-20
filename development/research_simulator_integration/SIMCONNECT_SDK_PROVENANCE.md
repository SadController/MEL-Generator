# Official SimConnect SDK provenance

Verification date: 20 September 2026.

## Selected SDK

The installed simulator executable reports MSFS 2024 version `1.8.16.0`. The official
Microsoft manifest at `https://sdk.flightsimulator.com/msfs2024/files/sdk.json` maps the
`1.8.x` simulator line to Core SDK `1.7.3`:

`https://sdk.flightsimulator.com/msfs2024/files/installers/1.7.3/MSFS2024_SDK_Core_Installer_1.7.3.zip`

Downloaded ZIP SHA-256:

`AAE63270C9420E099FFA2D21565C267F0603F8E226CF2C8AB2CA8966F6A052BF`

The SDK was administratively extracted into the ignored `development/tools` directory.
The native client library is:

`MSFS 2024 SDK/SimConnect SDK/lib/SimConnect.dll`

- size: 84,480 bytes;
- SHA-256: `B10DE7ADF4C62E5F66C89DD6D01B64091BBBCEC83411CFE191D6B85FBEE61D15`;
- Authenticode status: `NotSigned`.

The local application support override now points to this official SDK copy. With MSFS
not running, the Integration Service loaded the library and reached `SimConnect_Open`,
which returned `E_FAIL` as expected for an unavailable simulator. This replaces the
ChasePlane copy as the local development dependency.

## Distribution status

The SDK EULA prohibits sharing the SDK except for code separately classified as
distributable. The SDK package does not identify `SimConnect.dll` as distributable and
does not include a SimConnect-specific redistribution notice. A current Microsoft/Asobo
DevSupport request for a written determination remains unanswered. Therefore the
official DLL is approved for local development only and must not be committed, uploaded
to GitHub Releases or included in the public installer until redistribution permission
is established.

## Installed simulator candidate

The installed Steam simulator contains one Microsoft-owned candidate at:

`F:/SteamLibrary/steamapps/common/MSFS2024/SimConnect_internal.dll`

- size: 85,504 bytes;
- SHA-256: `628CA0D4F7857E3162FF1D1C34B40D17283ABE9DA6664793E3EB2BFF930686BE`;
- Authenticode status: `NotSigned`.

No public `SimConnect.dll` is installed in the simulator root. Other matching files found
under the simulator tree belong to Community add-ons and are not usable distribution
dependencies.

The root `SimConnect_internal.dll` loads successfully and exports every native function
currently used by the Integration Service, including `SimConnect_Open`, data-definition,
dispatch, SimObject write and Client Data functions. With MSFS stopped, it reaches
`SimConnect_Open` and returns the same `E_FAIL` as the official SDK client DLL.

Asobo describes the root file as the simulator's renamed internal library and distinguishes
its same-process version handling from the SDK client library. It is therefore a promising
no-redistribution fallback, but not yet an approved production dependency. Before adoption,
test connection, aircraft-title readback and reconnect behavior with MSFS running, then
repeat after a simulator update. Installation-path discovery must cover both Steam and
Microsoft Store installations without scanning Community add-ons.
