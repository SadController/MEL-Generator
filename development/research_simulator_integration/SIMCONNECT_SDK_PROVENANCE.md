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

