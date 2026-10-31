-- Revoke DELETE privilege on PluginInstallation from orbitox_runtime
-- Requirement 2b-5: Uninstalling sets status ARCHIVED; rows are retained immutably.
REVOKE DELETE ON TABLE "PluginInstallation" FROM orbitox_runtime;
