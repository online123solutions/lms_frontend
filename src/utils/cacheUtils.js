// Cache utility functions
// Store app version to detect updates
const APP_VERSION_KEY = "app_version";
const CURRENT_APP_VERSION = "0.1.0"; // Update this when you deploy new versions

/**
 * Check if app version has changed and clear cache if needed
 */
export function checkAppVersion() {
  const storedVersion = localStorage.getItem(APP_VERSION_KEY);
  
  if (storedVersion && storedVersion !== CURRENT_APP_VERSION) {
    console.log(`App version changed from ${storedVersion} to ${CURRENT_APP_VERSION}. Clearing cache.`);
    // Clear all cached data
    localStorage.clear();
    sessionStorage.clear();
    // Store new version
    localStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
    // Force page reload to get fresh JavaScript files
    window.location.reload();
    return true; // Version changed
  }
  
  // Store current version if not present
  if (!storedVersion) {
    localStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
  }
  
  return false; // No version change
}

/**
 * Clear all cache and storage
 */
export function clearAllCache() {
  localStorage.clear();
  sessionStorage.clear();
  // Clear service worker cache if exists
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }
}
