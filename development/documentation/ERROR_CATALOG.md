# MEL Generator user-facing error catalogue

Version 1.1.0 uses one central error catalogue. Each entry has a stable code, a short
title, a plain-English explanation, a recovery action, a severity and a retry flag.
The interface never displays raw exceptions, stack traces, HRESULT values, credentials
or local paths. When diagnostic logging is enabled, the raw technical message is written
to the local log together with the failed operation.

## Presentation rules

- Fatal startup and renderer failures use a Windows error dialog because the normal
  interface may be unavailable.
- Recoverable failures use the persistent message banner on the main screen. A failed
  Settings change is shown inside the Settings dialog so it remains visible.
- Update failures also appear below the update controls in Settings.
- Activation failures remain attached to the generated briefing and its cards so the
  user can apply the failures manually.
- The two header lights remain the passive connection display. Their hover text can
  explain an unavailable integration state without adding labels to the header.
- A successful update check with no newer version displays `No updates available`.
  Network, service and metadata failures always display their own error code instead.
- Retryable errors require a user action. The application does not run an unbounded
  automatic retry loop.

## Catalogue

| Code | Title | Recovery action | Severity | Retry |
|---|---|---|---|---|
| `APP_START_FAILED` | MEL Generator could not start | Close and reopen the app; reinstall if it continues. | Error | Yes |
| `APP_RESOURCE_MISSING` | A required application file is missing | Reinstall from the official release. | Error | No |
| `APP_RENDERER_STOPPED` | The interface stopped unexpectedly | Close and reopen the app. | Error | Yes |
| `SETTINGS_RECOVERED` | Settings were reset | Review Settings before the next briefing. | Warning | No |
| `SETTINGS_SAVE_FAILED` | Settings were not saved | Check free space and user-profile permissions, then retry. | Warning | Yes |
| `GENERATION_UNAVAILABLE` | Scenario generation is unavailable | Reopen the app and retry. | Error | Yes |
| `GENERATION_DATA_INVALID` | The scenario data is unavailable | Reinstall; enable diagnostics and report the code if it continues. | Error | No |
| `SOURCE_MISSING` | The MMEL document is missing | Reinstall from the official release. | Error | No |
| `SOURCE_OPEN_FAILED` | The MMEL document could not be opened | Close the source window and retry; reopen the app if needed. | Error | Yes |
| `INTEGRATION_SERVICE_MISSING` | Simulator integration is unavailable | Reinstall from the official release. | Error | No |
| `INTEGRATION_SERVICE_STOPPED` | Simulator integration stopped | Reopen the app and retry activation. | Error | Yes |
| `SIMCONNECT_RUNTIME_MISSING` | SimConnect is unavailable | Reinstall from the official release. | Error | No |
| `SIMULATOR_NOT_READY` | Simulator is not ready | Start MSFS, load a flight and wait for the first light to turn green. | Warning | Yes |
| `AIRCRAFT_UNSUPPORTED` | Automatic activation is unavailable for this aircraft | Load a supported Fenix aircraft or activate manually. | Warning | Yes |
| `FENIX_UNAVAILABLE` | Fenix failure manager is unavailable | Confirm Fenix is loaded and retry, or activate manually. | Warning | Yes |
| `FENIX_MAPPING_INCOMPLETE` | A generated failure is not mapped | Activate the marked failure manually and update the app. | Error | No |
| `ACTIVATION_REJECTED` | Fenix rejected automatic activation | Clear conflicting manager entries and retry, or activate manually. | Warning | Yes |
| `ACTIVATION_NOT_CONFIRMED` | Failure activation was not confirmed | Review card status and activate unconfirmed failures manually. | Error | Yes |
| `ACTIVATION_ROLLBACK_FAILED` | Failure rollback was incomplete | Review every briefing failure in the Fenix manager. | Error | No |
| `ACTIVATION_FAILED` | Automatic activation was not completed | Review status, retry when ready, or activate manually. | Warning | Yes |
| `UPDATE_NETWORK_UNAVAILABLE` | Could not connect to GitHub | Check the internet connection and retry later. | Warning | Yes |
| `UPDATE_RATE_LIMITED` | GitHub temporarily limited update checks | Wait and retry later. | Warning | Yes |
| `UPDATE_METADATA_INVALID` | Update information is invalid | Keep the installed version and retry later. | Error | Yes |
| `UPDATE_NO_SPACE` | Not enough disk space for the update | Free space on the Windows system drive and retry. | Warning | Yes |
| `UPDATE_PERMISSION_DENIED` | Windows blocked the update | Close other app copies and retry from the user account. | Error | Yes |
| `UPDATE_VERIFICATION_FAILED` | The update could not be verified | Keep the installed version and do not run the download manually. | Error | Yes |
| `UPDATE_SIGNING_PENDING` | Automatic installation is not available yet | Use the official GitHub release page for a manual update. | Warning | No |
| `UPDATE_DOWNLOAD_FAILED` | The update was not downloaded | Retry later or use the official GitHub release page. | Warning | Yes |
| `UPDATE_INSTALL_FAILED` | The update could not be installed | Restart and retry, or install the official release manually. | Error | Yes |
| `UPDATE_NOT_AVAILABLE` | No compatible update is ready | Run Check for updates again. | Warning | Yes |
| `UNEXPECTED_ERROR` | The operation could not be completed | Retry; enable diagnostics and report the code if it continues. | Error | Yes |

The executable catalogue in `production/desktop/user-errors.cjs` is authoritative for
the exact interface strings. This document records the reviewed behavior and recovery
intent for release acceptance.
