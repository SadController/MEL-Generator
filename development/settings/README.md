# Application Settings Specification

Decision date: 19 September 2026  
Backlog items: BL-001, BL-003 and BL-005  
Status: Implemented and verified in the packaged 1.1.0 alpha build.

## Design rule

The Settings screen contains only persistent choices that change application behavior.
Values selected on the main screen are restored automatically and are not duplicated as
settings menu items.

The approved Settings screen contains:

1. `Check for updates on startup` — boolean setting.
2. `Automatically activate failures when generating the briefing` — boolean setting.
3. `Enable diagnostic log` — boolean setting.
4. `Check for updates` — manual action, not a stored setting.

No other settings are currently approved.

## Main-screen state

The application automatically stores the last valid values selected on the main screen,
including:

- aircraft profile;
- source document when BL-007 makes document selection available;
- failure count;
- later main-screen generation parameters introduced by approved backlog items.

These values are restored on the next launch. They remain main-screen state and are not
shown in the Settings menu. Each stored value must use a stable ID, be validated when it
is read and fall back to an available value if its aircraft profile, document or option
no longer exists.

## Check for updates on startup

**Control:** Boolean toggle labelled `Check for updates on startup`.

When enabled:

1. The application performs a non-blocking update check after startup.
2. If a newer compatible release is available, an `Update available` button appears in
   the application header on the main screen.
3. Selecting `Update available` starts the approved application update flow.
4. If no update exists, no additional element is shown on the main screen.

When disabled, the application performs no automatic update request during startup.
The manual `Check for updates` action remains available.

The default value is enabled.

## Enable diagnostic log

**Control:** Boolean toggle labelled `Enable diagnostic log`.

When enabled, the application records a local diagnostic log of its operation. The log
must include application lifecycle events, update checks, MSFS connection changes,
aircraft and adapter detection, failure-activation requests, verification results and
errors. It must not contain unrestricted high-frequency telemetry, personal credentials
or GitHub authentication tokens.

When disabled, the application does not append routine diagnostic events to a log. A
change to the toggle takes effect immediately and does not require an application
restart. Disabling logging does not delete existing log files.

Logs are stored in the MEL Generator log directory under the application's per-user data
folder. They must not be written into the Windows installation directory, which may be
read-only for a normally installed application.

At every application startup, the application scans only its own log directory and
deletes log files whose last-modified time is more than seven days earlier than that
startup time. It must not delete subdirectories or unrelated files. Log maintenance runs
even when diagnostic logging is disabled so expired files are eventually removed.

The default value is disabled. Logs use JSON Lines, one UTC-dated file at a time, with
rotation at 10 MB and seven-day retention.

## Automatic connection and header status

MSFS connection is automatic application behavior and is not a user setting. The
application starts the integration service and attempts to establish a SimConnect
connection without requiring user action. If the connection is lost or MSFS is started
after the application, connection attempts continue in the background.

The application header displays two equal circular status indicators next to each
other. The previous `MSFS` text indicator is removed.

The first circle represents simulator and aircraft detection:

- green means that a live SimConnect connection to MSFS is established and a loaded
  user aircraft has been identified;
- gray means that MSFS is disconnected, no user aircraft is loaded, or the aircraft
  identity is not yet available.

The second circle represents automatic-activation support:

- green means that the loaded aircraft is recognized as supported for automatic
  failure activation and its applicable adapter is ready;
- gray means that no supported aircraft is detected or its adapter is unavailable.

The first circle does not imply that the aircraft is supported. The second circle does
not imply that a particular generated failure has activated successfully; command and
readback errors must still be reported with the generated result.

No label or other explanatory text is displayed beside either circle in the normal
header layout. Hovering over a circle shows a small tooltip identifying its purpose and
current state. The circles also retain non-visible accessible text for screen readers.
Suggested English tooltip text is `Simulator and aircraft detected` for the first
circle and `Automatic activation available` for the second.

Detected-aircraft identity and adapter-selection details are recorded in the diagnostic
log when logging is enabled. They are not displayed on the Settings screen.

## Version information

The Settings screen displays the following read-only values:

- application version;
- Integration Service version.

These values are information, not stored settings. Connected-aircraft information is
not shown here.

## Deferred settings actions

The following ideas are retained for possible later development but are not included in
the current Settings scope:

- export diagnostic report;
- reset settings.

There are no `Open log folder` or `Clear diagnostic logs` actions. Users can access the
application data folder through Windows if required, while routine log cleanup is
automatic.

## Automatically activate failures when generating the briefing

**Control:** Boolean toggle labelled
`Automatically activate failures when generating the briefing`.

When enabled, selecting `Prepare briefing` generates the briefing and starts automatic
activation of the generated failures in the loaded aircraft through the applicable
aircraft adapter.

When disabled, selecting `Prepare briefing` generates and displays the briefing without
sending activation commands to the simulator.

Automatic activation must not report success solely because commands were sent. Each
failure requires the readback defined by its verified adapter mapping. For Fenix, a
separate `failed=true` readback from the Fenix Manual Failures manager is the accepted
verification; empirical cockpit-effect confirmation is not required. A simulator
connection error, aircraft mismatch, unsupported mapping or failed readback must be
shown as an activation failure and must not prevent the generated briefing from being
displayed.

The 1.1.0 alpha default is disabled, so generating a briefing cannot change the loaded
aircraft until the user explicitly enables automatic activation.

## Check for updates

**Control:** Button labelled `Check for updates` on the Settings screen. This is an
action and has no persisted value.

When selected:

1. The button enters a checking state and cannot start a duplicate request.
2. If a newer compatible release is available, the `Update available` button appears
   in the application header on the main screen.
3. If the installed version is current, `No updates available` appears directly below
   the `Check for updates` button.
4. A network, metadata, signature or server error is displayed as an update-check error
   and is not presented as `No updates available`.

A later successful check replaces the previous result. The result message does not
need to persist after the application closes.

## Update available button

The header button is shared by automatic and manual update checks. It is visible only
when a newer compatible version has been found during the current application session.
In the settings implementation milestone, selecting it opens the exact matching release
page on GitHub for manual installation. BL-005 will replace this temporary manual route
with the approved download, integrity verification, restart and installation process.

## Persisted structure

The exact storage format is an implementation detail. The minimum logical structure is:

```json
{
  "schemaVersion": 3,
  "settings": {
    "checkForUpdatesOnStartup": true,
    "activateFailuresOnBriefing": false,
    "enableDiagnosticLog": false
  },
  "lastSelection": {
    "aircraftProfileId": "fenix-a321",
    "sourceDocumentId": "faa-a320-mmel-r32",
    "failureCount": 2
  },
  "window": {
    "width": 1180,
    "height": 860,
    "maximized": false
  }
}
```

Existing last-selection and window-state values are migrated rather than discarded.

## Remaining decisions

- Exact download, restart and installation interaction after `Update available` is
  selected; the release must still use the approved installed-app-only update model.
