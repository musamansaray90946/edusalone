// Single source of truth for class levels.
// Sierra Leone schools often run primary and secondary on one campus,
// so level is a property of the STUDENT, never of the school.

export const PRIMARY_CLASSES = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
];

export const JSS_CLASSES = ['JSS1', 'JSS2', 'JSS3'];
export const SS_CLASSES  = ['SS1', 'SS2', 'SS3'];

export const ALL_CLASSES = [...PRIMARY_CLASSES, ...JSS_CLASSES, ...SS_CLASSES];

export type SchoolLevel = 'PRIMARY' | 'JSS' | 'SS';

// Older records may be stored uppercased with spaces stripped ("CLASS1") or
// use the old "Form" naming, so match tolerantly rather than comparing
// against the picker labels.
export function detectLevel(cls?: string | null): SchoolLevel {
  const c = (cls || '').toUpperCase().replace(/\s+/g, ' ').trim();

  if (/CLASS|BASIC|PRIMARY|NURSERY|\bKG\b|PREP|GRADE/.test(c)) return 'PRIMARY';

  if (c.includes('SSS') || c.includes('SENIOR')) return 'SS';
  if (/\bSS\s*\d/.test(c)) return 'SS';
  if (c.includes('JSS') || c.includes('JUNIOR')) return 'JSS';
  if (/\bJS\s*\d/.test(c)) return 'JSS';

  const f = c.match(/FORM\s*(\d)/);
  if (f) return Number(f[1]) <= 3 ? 'JSS' : 'SS';

  return 'SS';   // unchanged default for unrecognised values
}

export const isPrimary = (cls?: string | null) => detectLevel(cls) === 'PRIMARY';