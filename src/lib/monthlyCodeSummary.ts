import type { CombinedTransaction } from '../types';

export function summarizeMonthlyCodes(cuts: CombinedTransaction[], useEntryDate: boolean) {
  const months = new Map<string, {
    key: string;
    month: number;
    year: number;
    total: number;
    codes: Map<string, { key: string; cut: CombinedTransaction; amount: number; establishments: Set<string> }>;
  }>();

  for (const cut of cuts) {
    const month = Number(cut.month) || 0;
    const year = Number(useEntryDate ? new Date(cut.date).getFullYear() : cut.year) || 0;
    const key = `${year}-${month}`;
    let group = months.get(key);
    if (!group) {
      group = { key, month, year, total: 0, codes: new Map() };
      months.set(key, group);
    }
    const codeKey = cut.is_income
      ? `income-${cut.income_code?.description || 'Ingreso General'}`
      : `expense-${cut.code || 'Desconocido'}`;
    let code = group.codes.get(codeKey);
    if (!code) {
      code = { key: codeKey, cut, amount: 0, establishments: new Set() };
      group.codes.set(codeKey, code);
    }
    code.amount += cut.amount;
    if (cut.establishment?.name) code.establishments.add(cut.establishment.name);
    group.total += cut.is_income ? cut.amount : -cut.amount;
  }

  return [...months.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map(group => ({
      ...group,
      codes: [...group.codes.values()].sort((a, b) => a.key.localeCompare(b.key, 'es', { numeric: true })),
    }));
}
