const pluralRules = new Intl.PluralRules('pl');

export function countedNoun(count, one, few, many) {
  const forms = {one, few, many};
  return `${count} ${forms[pluralRules.select(count)] || many}`;
}

export const warningCount = count => countedNoun(count, 'uwaga', 'uwagi', 'uwag');
export const errorCount = count => countedNoun(count, 'błąd', 'błędy', 'błędów');
