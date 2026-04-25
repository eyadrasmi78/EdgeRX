/**
 * Compatibility shim. The real implementation now lives in services/apiClient.ts
 * and routes every call through the Laravel backend instead of localStorage.
 *
 * Existing imports `import { DataService } from '../services/mockData'` still
 * resolve to the same surface so component files don't need import edits.
 */
export { DataService } from './apiClient';
