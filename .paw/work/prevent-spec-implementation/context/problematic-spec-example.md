# Specification: Flex Provisioning Auto-Connect and Persistent Deployment Tracking

**GitHub Issue:** [#626](https://github.com/azure-data-database-platform/vs-code-postgresql/issues/626)
**Target Branch:** `user/mjm/flex/profile`
**Status:** Draft

## Overview

Implement automatic connection profile creation and persistent deployment tracking for Azure PostgreSQL Flexible Server provisioning. The system must create connection profiles from provisioning inputs, track deployment state across VS Code sessions, auto-connect to successfully provisioned servers, and open the server dashboard.

## Objectives

1. **Auto-connect to provisioned servers**: Automatically create a connection profile and establish a connection when a Flex server is successfully provisioned
2. **Persistent deployment tracking**: Track in-progress deployments across VS Code restarts and crashes
3. **Resilient profile creation**: Create connection profiles even if VS Code closes during deployment
4. **Failure handling**: Notify users of deployment failures without creating connection profiles for failed deployments
5. **Authentication preference**: Prefer Entra ID authentication when hybrid mode is enabled
6. **User awareness**: Warn users when closing the provisioning webview that deployment will continue in the background

## Requirements

### 1. Staged Connection Profile Creation

**Requirement:** Create and persist connection profile data before ARM deployment begins, enabling profile creation even if VS Code closes during deployment.

**Implementation:**

- When user initiates provisioning (clicks "Create" in Flex create form), immediately stage connection profile data in `context.globalState`
- Staged profile data includes:
  - `server`: Constructed as `{serverName}.postgres.database.azure.com`
  - `profileName`: Server name from form
  - `database`: Empty string (default database)
  - `user`: Based on authentication mode (see Authentication Preference)
  - `authenticationType`: Derived from authentication mode (see Authentication Preference)
  - `azureResourceId`: Placeholder, populated after deployment completes
  - `azureSubscriptionId`: From `CreateServerRequest.subscriptionId`
  - `azureResourceGroup`: From `CreateServerRequest.resourceGroup.name`
  - `azureTenantId`: From `CreateServerRequest.tenantId`
  - `savePassword`: `true` for password-based auth, `false` for Entra
  - `groupId`: Default or user-selected server group
  - Additional Azure metadata as needed for dashboard integration

**Storage Key:** `pgsql.flexProvisioning.stagedProfiles` (array of staged profile objects)

**Profile Staging Structure:**

```typescript
interface StagedFlexProfile {
    // Unique identifier for this staging entry
    stagingId: string; // Generated UUID

    // Deployment tracking
    deploymentName: string; // ARM deployment name
    resourceGroupName: string;
    subscriptionId: string;
    tenantId: string;

    // Connection profile data
    connectionProfile: Partial<IConnectionDialogProfile>;

    // State tracking
    status: 'pending' | 'deploying' | 'succeeded' | 'failed';
    createdAt: number; // Timestamp
    lastCheckedAt?: number; // Last poll timestamp

    // Profile creation tracking (prevents duplicate creation)
    profileCreated?: boolean; // Set to true after profile creation attempted
    dashboardOpened?: boolean; // Set to true after dashboard opened

   // Results
   error?: string; // Error message if failed
   serverResourceId?: string; // Populated on success
   passwordSecretId?: string; // Temporary key for staged credential (cleared after profile save)
}
```

### 2. Deployment State Persistence

**Requirement:** Track deployment state in `context.globalState` to survive VS Code restarts and crashes.

**Implementation:**

- When ARM deployment begins, update staged profile status to `'deploying'`
- Store deployment identifiers:
  - Deployment name (e.g., `pgflex-{serverName}-{timestamp}`)
  - Resource group name
  - Subscription ID
  - Tenant ID
- Update `lastCheckedAt` timestamp during polling

**State Transitions:**

- `pending` → `deploying`: When `FlexServerProvisioner.create()` is called
- `deploying` → `succeeded`: When deployment completes successfully
- `deploying` → `failed`: When deployment fails or times out
- Retention is governed by the user setting `pgsql.flexProvisioning.deploymentRetentionDays` (default 30 days); see Staged Profile Cleanup for details

### 3. Background Deployment Polling

**Requirement:** Implement background polling mechanism to check deployment status outside of active webview sessions.

**Implementation:**

- Create new service: `FlexDeploymentTracker` (in `src/services/flexDeployment/`)
- Initialize during `MainController.activate()` to check for in-progress deployments in `globalState`
- Before each poll, obtain a `TokenCredential` via a shared credential provider that wraps `VSCodeAzureSubscriptionProvider` and supports renewal when the user re-authenticates

**Polling Lifecycle:**

1. **Polling Starts When**:
   - User initiates deployment (status changes to `'deploying'`)
   - Extension activates and finds staged profiles with status `'deploying'`

2. **Polling Runs**:
   - Every 15 seconds while any deployment has status `'deploying'`
   - Uses `ResourceManagementClient.deployments.get(resourceGroupName, deploymentName)`
   - Parses `provisioningState` from deployment properties
   - Updates staged profile status based on provisioning state

3. **Polling Stops When**:
   - All deployments reach terminal state (`Succeeded`, `Failed`, `Canceled`)
   - 2 hours elapsed since deployment started (timeout → mark as `'failed'`)
   - Extension deactivates

**Important**: Polling is NOT constantly running. It only runs when there are active deployments (status `'deploying'`). This ensures minimal resource usage.

**Service Interface:**

```typescript
interface IFlexDeploymentTracker {
    /**
     * Start background polling for all in-progress deployments
     */
    startPolling(): void;

    /**
     * Stop background polling
     */
    stopPolling(): void;

    /**
     * Manually check and update deployment status
     */
    checkDeploymentStatus(stagingId: string): Promise<void>;

    /**
     * Get current staged profiles
     */
    getStagedProfiles(): Promise<StagedFlexProfile[]>;
}
```

### 4. Extension Initialization Hook

**Requirement:** Check for in-progress or completed deployments during extension activation and take appropriate action.

**Implementation:**

- In `MainController.activate()`, after service initialization:
  - Create `FlexDeploymentTracker` service instance
  - Check `context.globalState` for staged profiles
  - For each staged profile:
    - If status is `'deploying'`: Resume background polling
    - If status is `'succeeded'` and `profileCreated !== true`: Create connection profile (see Profile Creation)
    - If status is `'failed'`: Show notification to user (if within 24 hours)
  - If credential acquisition fails because the user is signed out, prompt once per activation and retry polling after sign-in
  - Start polling loop if any deployments are in `'deploying'` state

**Note**: The `profileCreated` flag prevents duplicate profile creation if the user manually deletes the profile after it was created.

### 5. Connection Profile Creation

**Requirement:** Create connection profile when deployment succeeds, whether during active webview session or after VS Code restart.

**Implementation:**

**Trigger points:**

- **During active provisioning session:** When `FlexServerProvisioner.create()` returns success
- **On extension initialization:** When staged profile status is `'succeeded'` and `profileCreated !== true`
- **On background poll completion:** When deployment status changes to `'Succeeded'` and `profileCreated !== true`

**Creation logic:**

1. Check if `profileCreated === true` - if so, skip (prevents duplicates)
2. Retrieve staged profile from `globalState`
3. Populate `azureResourceId` from deployment result (if not already populated)
4. Call `connectionStore.saveProfile()` with complete profile data
5. If password-based auth, save password to credential store
6. **Set `profileCreated = true` in staged profile** (critical: prevents duplicate creation)
7. Update staged profile in `globalState`

**Post-creation actions (only if VS Code is running and user visible):**

1. Establish connection to server (add to Object Explorer tree)
2. Retrieve `TreeNodeInfo` for the new connection
3. Open server dashboard via `vscode.commands.executeCommand('pgsql.showServerDashboard', treeNode)`
4. Set `dashboardOpened = true` in staged profile

### 6. Authentication Mode Preference

**Requirement:** When hybrid authentication mode is enabled (both Entra and PostgreSQL), prefer Entra ID for the connection profile.

**Implementation:**

**Authentication mode mapping:**

- **EntraOnly mode:**
  - `authenticationType`: `AuthenticationType.AzureMFA`
  - `azureAuthType`: Appropriate Azure auth type
  - `entraUserName`: From form or Azure account context
  - `user`: Entra username
  - `password`: Not applicable
  - `savePassword`: `false`

- **PasswordOnly mode:**
  - `authenticationType`: `AuthenticationType.SqlLogin`
  - `user`: From `adminLogin` field in form
  - `password`: From `adminPassword` field (only during staging, cleared before persisting)
  - `savePassword`: `true`

- **Hybrid mode (PREFERENCE: Entra):**
  - Same as EntraOnly mode
  - Rationale: Entra provides better security and Azure integration

**Password handling:**

- For password-based auth, store password in credential store using `connectionStore.saveProfilePasswordIfNeeded()`
- Never persist passwords in `globalState`
- Store only a flag indicating password should be retrieved from credential store

### 7. Webview Closure Warning

**Requirement:** Show warning dialog when user attempts to close the Flex provisioning webview during active deployment.

**Implementation:**

**Detection:**

- Set `ReactWebviewPanelController.showRestorePromptAfterClose = true` when deployment status is `'deploying'`
- Reset to `false` when deployment completes (success or failure)

**Warning behavior:**

- When webview is disposed during active deployment, `onDidDispose` handler:
  1. Shows modal information message: "Server provisioning is still in progress. It will continue in the background. You can close VS Code safely."
  2. Offers options:
     - "Continue in Background" (default): Dismiss dialog, allow webview disposal, continue polling
     - "Show Progress": Restore webview to show progress
  3. If user chooses "Show Progress", call existing `showRestorePrompt()` logic

**Note:** Cannot prevent webview disposal directly (VS Code API limitation). Warning is informational and appears after disposal.

### 8. Failure Notification

**Requirement:** Notify users of deployment failures without creating connection profiles.

**Implementation:**

**During active session:**

- Failure already shown in webview progress UI
- Update staged profile status to `'failed'` with error message

**After VS Code restart:**

- On extension initialization, check for failed staged profiles (status `'failed'`) created within last 24 hours
- Show notification for each failed deployment:
  - Message: "Azure PostgreSQL Flexible Server provisioning failed for '{serverName}': {error}"
  - Actions:
    - "View Details": Open output channel with full error
    - "Retry": Re-open Flex create webview with prefilled values from staged profile
    - "Dismiss": Remove staged profile entry

**Cleanup:**

- Remove failed staged profiles whose terminal timestamp exceeds the configured retention window during extension activation
- Provide command to manually clear all staged profiles: `pgsql.clearStagedFlexProfiles`

### 9. Dashboard Auto-Open

**Requirement:** After successful connection profile creation, automatically establish connection and open the server dashboard.

**Implementation:**

**Conditions:**

- Only auto-open if VS Code is running and extension is active
- Only auto-open once per deployment (check `dashboardOpened !== true` in staged profile)
- Do not auto-open after VS Code restart (user may have closed intentionally)
- Only auto-open during active provisioning session (not when background polling completes)

**Flow:**

1. Create connection profile via `connectionStore.saveProfile()` (sets `profileCreated = true`)
2. Check if `dashboardOpened === true` - if so, skip (prevents duplicate opens)
3. Establish connection:
   - Use existing connection establishment flow
   - Add connection to Object Explorer tree
   - Wait for connection to complete (may require firewall rule addition)
4. Retrieve `TreeNodeInfo` for the newly connected server
5. Execute command: `vscode.commands.executeCommand('pgsql.showServerDashboard', treeNodeInfo)`
6. Set `dashboardOpened = true` in staged profile
7. Update staged profile in `globalState`

**Error handling:**

- If connection fails (e.g., firewall, authentication), show error but keep profile
- User can manually connect later from Object Explorer
- Do not retry connection automatically

### 10. Staged Profile Cleanup & History Retention

**Requirement:** Retain deployment records for future review while preventing secrets from lingering.

**Implementation:**

- Introduce a user setting `pgsql.flexProvisioning.deploymentRetentionDays` (default `30`). Deployment metadata remains in `globalState` for the configured number of days after reaching a terminal state (`'succeeded'` or `'failed'`).
- Active deployments (`'pending'` / `'deploying'`) continue to be monitored and are exempt from the retention clock until they complete or time out (2-hour timeout still applies for stalled deployments → mark `'failed'`).
- When a profile is saved (or deployment fails), immediately delete the associated `passwordSecretId` secret and clear the field from the stored record. No password material persists in history.
- On activation, purge only those records whose terminal timestamp is older than the configured retention window. In-progress entries are left intact.
- Provide the `pgsql.clearStagedFlexProfiles` command to wipe all deployment metadata (and any lingering secrets) on demand. The user setting description must explain that metadata is kept locally and can be cleared via this command.

## Technical Design

### New Components

1. **`FlexDeploymentTracker`** (`src/services/flexDeployment/flexDeploymentTracker.ts`)
   - Background polling service
   - Manages staged profiles in `globalState`
   - Handles status updates and cleanup

2. **`StagedFlexProfile` interface** (`src/sharedInterfaces/flexDeployment.ts`)
   - Type definition for staged profile structure
   - Shared between extension and potential future webview needs

3. **`FlexProvisioningCredentialProvider`** (`src/services/flexDeployment/azureCredentialProvider.ts`)
   - Centralizes `TokenCredential` acquisition for subscription/tenant pairs
   - Reuses `VSCodeAzureSubscriptionProvider` sessions when available
   - Surfaces telemetry and user prompts when reauthentication is required during background polling

4. **Extension initialization logic** (modify `src/controllers/mainController.ts`)
   - Initialize `FlexDeploymentTracker` during activation
   - Check and resume in-progress deployments

5. **Flex create webview modifications** (`src/controllers/flexCreateWebviewController.ts`)
   - Stage profile before deployment
   - Set webview closure warning during deployment
   - Update staged profile status on completion

### Modified Components

1. **`FlexServerProvisioner`** (`src/azure/flexProvisioning/flexServerProvisioner.ts`)
   - No modifications needed (already returns `CreateServerResult`)
   - Used by tracker to poll deployment status

2. **`connectionStore`** (`src/models/connectionStore.ts`)
   - No modifications needed (already has `saveProfile()` and `saveProfilePasswordIfNeeded()`)

3. **`ReactWebviewPanelController`** (`src/controllers/reactWebviewPanelController.ts`)
   - Modify `onDidDispose` handler to show custom warning when `showRestorePromptAfterClose` is true and context indicates active deployment

## Data Flow

### Happy Path: Successful Deployment with Active Webview

```text
1. User clicks "Create" in Flex create form
2. FlexCreateWebviewController stages profile in globalState (status: 'pending', profileCreated: false)
3. FlexCreateWebviewController calls FlexServerProvisioner.create()
4. Update staged profile status to 'deploying'
5. Set showRestorePromptAfterClose = true
6. Background polling starts (checking every 15 seconds)
7. FlexServerProvisioner.create() waits for deployment (blocking)
8. Deployment succeeds, returns CreateServerResult
9. Update staged profile status to 'succeeded', populate serverResourceId
10. Set showRestorePromptAfterClose = false
11. Create connection profile from staged data
12. Set profileCreated = true in staged profile
13. Establish connection to server
14. Open server dashboard
15. Set dashboardOpened = true in staged profile
16. Background polling stops (no more 'deploying' entries)
17. Record the success timestamp and rely on the retention setting to purge the entry after the configured number of days
```

### Resilient Path: VS Code Closes During Deployment

```text
1. User clicks "Create" in Flex create form
2. FlexCreateWebviewController stages profile in globalState (status: 'pending', profileCreated: false)
3. FlexCreateWebviewController calls FlexServerProvisioner.create()
4. Update staged profile status to 'deploying'
5. Background polling starts (checking every 15 seconds)
6. User closes VS Code (or crashes)
7. Deployment continues in Azure
8. User reopens VS Code
9. Extension activates, MainController.activate() runs
10. FlexDeploymentTracker checks globalState, finds 'deploying' entry
11. Start background polling for this deployment
12. Poll deployment status every 15 seconds
13. Deployment completes successfully
14. Update staged profile status to 'succeeded', populate serverResourceId
15. On next poll, detect status 'succeeded' AND profileCreated !== true
16. Create connection profile from staged data
17. Set profileCreated = true in staged profile
18. DO NOT auto-connect or open dashboard (user not actively provisioning)
19. Show success notification: "Server '{serverName}' is ready"
20. Background polling stops (no more 'deploying' entries)
21. Record the success timestamp and rely on the retention setting to purge the entry after the configured number of days
```

### Error Path: Deployment Failure

```text
1. User clicks "Create" in Flex create form
2. FlexCreateWebviewController stages profile in globalState (status: 'pending', profileCreated: false)
3. FlexCreateWebviewController calls FlexServerProvisioner.create()
4. Update staged profile status to 'deploying'
5. Background polling starts (checking every 15 seconds)
6. Deployment fails (ARM error, timeout, etc.)
7. Update staged profile status to 'failed', store error message
8. Set showRestorePromptAfterClose = false
9. Background polling stops (no more 'deploying' entries)
10. Show error in webview progress UI
11. DO NOT create connection profile
12. Keep staged profile until the retention window expires (notification on next activation)
```

## Success Criteria

1. ✅ Connection profile created automatically when deployment succeeds (webview active or after restart)
2. ✅ Connection profile includes all Azure resource metadata (`azureResourceId`, `azureSubscriptionId`, `azureResourceGroup`)
3. ✅ Deployment tracking persists across VS Code restarts and crashes
4. ✅ Background polling resumes in-progress deployments on extension activation
5. ✅ Entra ID authentication preferred for hybrid mode servers
6. ✅ Warning shown when user closes webview during deployment
7. ✅ Dashboard opens automatically after successful deployment (when webview active)
8. ✅ No connection profile created for failed deployments
9. ✅ Failure notifications shown on extension activation for recent failures
10. ✅ Staged profiles cleaned up after appropriate retention period

## Testing Strategy

### Unit Tests

- `FlexDeploymentTracker` service:
  - Profile staging and retrieval
  - Status updates
  - Cleanup logic
  - Polling interval management

### Integration Tests

- End-to-end provisioning with profile creation
- VS Code restart during deployment (mock)
- Deployment failure handling
- Authentication mode preference

### Manual Testing Scenarios

1. **Happy path:** Create server, verify auto-connect and dashboard open
2. **Restart during deployment:** Start provisioning, close VS Code, reopen, verify profile created when deployment completes
3. **Failure notification:** Cause deployment failure, restart VS Code, verify notification
4. **Hybrid auth:** Create server with hybrid mode, verify Entra profile created
5. **Webview closure warning:** Close webview during deployment, verify warning shown
6. **Cleanup:** Verify old staged profiles removed on activation

## Open Questions

None. All questions from issue #626 have been addressed based on spec research findings.

## Future Enhancements (Out of Scope)

- Deployment progress notifications during background polling
- Retry mechanism for failed deployments
- Multiple deployment tracking in single UI
- User-configurable authentication preference for hybrid mode

## References

- GitHub Issue: [#626](https://github.com/azure-data-database-platform/vs-code-postgresql/issues/626)
- Spec Research: [SpecResearch.md](./SpecResearch.md)
- Related: Connection Dialog (`connectionDialogWebviewController.ts`)
- Related: Flex Provisioning (`flexServerProvisioner.ts`, `flexCreateWebviewController.ts`)