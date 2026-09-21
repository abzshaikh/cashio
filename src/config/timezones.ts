const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Pacific/Auckland',
];

/**
 * Uses the browser's built-in IANA timezone database when available
 * (`Intl.supportedValuesOf`, supported in all current browsers) so this
 * list never goes stale. Falls back to a short hand-picked list otherwise.
 */
export function getTimezoneOptions(): string[] {
  try {
    const supportedValuesOf = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    if (supportedValuesOf) {
      const zones = supportedValuesOf('timeZone');
      if (zones.length > 0) return zones;
    }
  } catch {
    // Fall through to the static list below.
  }
  return FALLBACK_TIMEZONES;
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
