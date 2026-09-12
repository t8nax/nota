const rules = new Intl.PluralRules('ru-RU')

/** Русское согласование числа с существительным: 1 задача, 2 задачи, 5 задач. */
export function plural(count: number, forms: { one: string; few: string; many: string }): string {
  const rule = rules.select(count)

  if (rule === 'one') return forms.one
  if (rule === 'few') return forms.few

  return forms.many
}
