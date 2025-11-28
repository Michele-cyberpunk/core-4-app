/**
 * Helper di ambiente per esecuzione in contesto browser/Gemini Studio AI Build.
 * Nessun side-effect: solo funzioni pure di feature detection.
 */

export function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function hasDocument(): boolean {
  return typeof document !== 'undefined';
}

export function isBrowser(): boolean {
  return hasWindow() && hasDocument();
}

export function hasLocalStorage(): boolean {
  if (!hasWindow()) return false;
  try {
    const testKey = '__core_env_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function hasSpeechRecognition(): boolean {
  if (!hasWindow()) return false;
  const anyWindow = window as any;
  return !!(anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition);
}

export function hasAudioContext(): boolean {
  if (!hasWindow()) return false;
  const anyWindow = window as any;
  return !!(anyWindow.AudioContext || anyWindow.webkitAudioContext);
}