import { getSafeNumericValue } from '@/lib/utils';
import type { FaturadoItem } from '@/lib/types';

export const calculateFaturadoFromItems = (items: FaturadoItem[] | undefined): { qtd: number; valor: number } => {
    if (!items || !Array.isArray(items)) return { qtd: 0, valor: 0 };
    return items.reduce((acc, item) => {
        acc.qtd += getSafeNumericValue(item, 'quantity');
        acc.valor += getSafeNumericValue(item, 'value');
        return acc;
    }, { qtd: 0, valor: 0 });
};
