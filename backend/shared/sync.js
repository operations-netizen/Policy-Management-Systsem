// Keep these constants shared between frontend and backend.
// Bump API_SYNC_VERSION when frontend/backend contract changes.
export const API_SYNC_VERSION = "2026.02.16.1";

// Frontend must match this version to be considered in-sync with backend APIs.
export const FRONTEND_SYNC_VERSION_REQUIRED = API_SYNC_VERSION;

// Increment when DB schema or required DB shape changes.
export const DB_SCHEMA_VERSION = 1;

export const DB_SCHEMA_META_KEY = "db_schema_version";
