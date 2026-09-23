# Briefing failure deactivation — proposal

Status: implemented on the beta development branch, 23 September 2026. No release target
is assigned. This extends the existing briefing activation action; it does not change
scenario generation or the automatic-activation setting.

## User interaction

Use the existing action position beside the failure count. After successful activation,
replace the disabled `Failures active` label with one `Deactivate failures` button. While
working, show `Deactivating…` and disable repeat clicks. After verified deactivation,
show a short result summary and return the action to `Activate failures`, allowing the
same briefing to be activated again without regeneration. Keep all briefing cards visible.
No confirmation dialog is proposed for the ordinary one-click action.

The button is offered only if this briefing activated at least one failure. If every
selected failure was already active before the briefing, there is nothing owned by this
briefing to deactivate. Do not show a button that suggests it will clear those existing
failures.

## Scope and safety rule

Only clear failures that this application changed from inactive to active during this
briefing. Preserve failures that were already active, armed, manually changed, or not
part of the briefing. Never clear all failures in the aircraft as a shortcut.

The Integration Service should retain an activation ledger containing the aircraft and
simulator session identity, mapped failure IDs, and each item's state before activation.
The service, not the renderer, authorizes the deactivation request. A new aircraft or
simulator session invalidates that ledger; the action then stays unavailable with a
plain-language explanation. The current implementation does not persist briefings across
application restarts, so no deactivation button is offered after a restart.

Before each clear command, reload the aircraft's failure state. If an item is already
inactive, report that state without writing. If it is still in the expected active
state, clear it and reload again to confirm. If the item was changed into an unexpected
or armed state, leave it untouched and ask for manual review. For a multi-item request,
report each outcome. If one clear fails, do not re-activate items already cleared;
allow retry only for the remaining app-owned failures.

## Proposed states

| Situation | Action and result |
| --- | --- |
| Briefing not activated | Existing `Activate failures` action. |
| App-owned failures active | `Deactivate failures` action. |
| Deactivation in progress | Disabled `Deactivating…` action. |
| All app-owned failures confirmed clear | `Failures deactivated` summary; action returns to `Activate failures`. |
| Some items remain active | Per-card status and actionable partial-failure message; retry targets only the remaining app-owned items. |
| Aircraft/session changed or adapter unavailable | No clear command; explain why the action is unavailable. |

The success summary should distinguish app-owned failures from any selected failures
that were already active, for example: `1 failure deactivated. 1 was active before this
briefing and was left unchanged.`

## Acceptance examples

- Two inactive failures: activate both, deactivate once, independently read both as
  inactive in the aircraft's failure system.
- One pre-existing active and one app-activated failure: clear only the latter and
  preserve the former.
- One item manually changed after activation: skip it, show its per-card status, and
  leave it for manual review.
- Disconnection, aircraft change, failed clear or failed readback: no unrelated failure
  is changed; the briefing remains available and the outcome is explicit.

Open product choice: whether a future, separately labelled action should ever clear
pre-existing failures. This draft recommends preserving them.

Implementation: the Integration Service stores app-owned failure IDs and their verified
active state in memory, bound to a simulator session number. The briefing page reuses
the activation action for deactivation and reports each clear result. The ledger is
discarded when a new briefing is generated or the application restarts. Live simulator
acceptance remains necessary before a release because automated tests use a simulated
aircraft failure interface.
