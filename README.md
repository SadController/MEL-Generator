# MEL Generator 1.1.0

MEL Generator creates random failure briefings for the Fenix Airbus A319, A320,
and A321 in Microsoft Flight Simulator 2024. It uses a built-in catalogue based
on FAA A320 MMEL Revision 32. The app is for flight simulation only.

## Install

1. Download `MEL-Generator-Setup-1.1.0.exe` from the [v1.1.0 release](https://github.com/SadController/MEL-Generator/releases/tag/v1.1.0).
2. Run the installer on Windows x64, then open **MEL Generator** from the Start menu or your desktop shortcut.

The installer is unsigned, so Windows may show an unknown-publisher warning. No
separate runtime or browser is needed.

## Create a briefing

1. Select a Fenix **A319**, **A320**, or **A321**.
2. Choose **1**, **2**, or **3** failures.
3. Click **Prepare briefing** to see the failure cards and their conditions.

You can create a briefing without running the simulator. Click **View source**
on a card to open the relevant page of the bundled MMEL. To get another random
briefing, return to the main menu and click **Prepare briefing** again.

If MSFS 2024 is running with a supported Fenix aircraft loaded, you can click
**Activate failures** on the briefing page. Alternatively, enable
**Automatically activate failures** in Settings before creating a briefing.
After a successful activation, **Deactivate failures** removes the failures
activated by that briefing.

For development and technical details, see [CONTRIBUTING.md](CONTRIBUTING.md)
and [production/README.md](production/README.md).

