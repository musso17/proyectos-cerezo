const UI_PREFERENCES_KEY = 'cerezo-ui-preferences';

const isBrowserEnvironment = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const cloneValue = (value) => {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const readPreferences = () => {
  if (!isBrowserEnvironment()) return {};
  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('Error reading UI preferences:', error);
    return {};
  }
};

const writePreferences = (preferences) => {
  if (!isBrowserEnvironment()) return;
  try {
    window.localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(preferences || {}));
  } catch (error) {
    console.error('Error persisting UI preferences:', error);
  }
};

export const getUIPreference = (key, fallback = undefined) => {
  const preferences = readPreferences();
  if (Object.prototype.hasOwnProperty.call(preferences, key)) {
    return cloneValue(preferences[key]);
  }
  return cloneValue(fallback);
};

export const setUIPreference = (key, value) => {
  const preferences = readPreferences();
  const next = { ...preferences, [key]: value };
  writePreferences(next);
};

export const mergeUIPreferences = (partialPreferences) => {
  if (!partialPreferences || typeof partialPreferences !== 'object') return;
  const preferences = readPreferences();
  const next = { ...preferences, ...partialPreferences };
  writePreferences(next);
};

export const clearUIPreference = (key) => {
  const preferences = readPreferences();
  if (!Object.prototype.hasOwnProperty.call(preferences, key)) return;
  const { [key]: _, ...rest } = preferences;
  writePreferences(rest);
};
