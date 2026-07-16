export function localizeWorkoutLabel(value, t) {
  if (typeof value !== 'string') return value;

  const normalized = value
    .trim()
    .toLocaleLowerCase('da-DK')
    .replace(/[.]+$/, '')
    .replace(/\s+/g, ' ');

  if ([
    'hvile pga skade',
    'hvile pga. skade',
    'hvile på grund af skade',
    'rest due to injury',
    'injury rest',
  ].includes(normalized)) {
    return t('workoutLabels.injuryRest');
  }

  if (['hvile', 'rest', 'rest day'].includes(normalized)) {
    return t('workoutLabels.rest');
  }

  return value;
}

export default localizeWorkoutLabel;
