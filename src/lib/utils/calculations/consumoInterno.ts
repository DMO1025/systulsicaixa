import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodData, ConsumoInternoItem } from '@/lib/types';

export const calculateConsumoInternoFromItems = (items: ConsumoInternoItem[] | undefined): { qtd: number; valor: number } => {
    if (!items || !Array.isArray(items)) return { qtd: 0, valor: 0 };
    return items.reduce((acc, item) => {
        acc.qtd += getSafeNumericValue(item, 'quantity');
        acc.valor += getSafeNumericValue(item, 'value');
        return acc;
    }, { qtd: 0, valor: 0 });
};

const calculateOldFormatConsumoInterno = (period: PeriodData | undefined, prefix: 'apt' | 'ast' | 'jnt'): { qtd: number; valor: number, reajuste: number } => {
    if (!period?.subTabs?.ciEFaturados?.channels) return { qtd: 0, valor: 0, reajuste: 0 };
    const channels = period.subTabs.ciEFaturados.channels;
    const qtd = getSafeNumericValue(channels, `${prefix}CiEFaturadosConsumoInternoQtd.qtd`);
    const reajuste = getSafeNumericValue(channels, `${prefix}CiEFaturadosReajusteCI.vtotal`);
    const totalCI = getSafeNumericValue(channels, `${prefix}CiEFaturadosTotalCI.vtotal`);
    
    const valorBaseCI = totalCI - reajuste;
    return { qtd, valor: valorBaseCI, reajuste };
};

export function calculateCITotals(entry: DailyLogEntry) {
    const aptCI = {
        new: calculateConsumoInternoFromItems((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        old: calculateOldFormatConsumoInterno(entry.almocoPrimeiroTurno as PeriodData, 'apt'),
        reajusteNew: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
    };

    const astCI = {
        new: calculateConsumoInternoFromItems((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        old: calculateOldFormatConsumoInterno(entry.almocoSegundoTurno as PeriodData, 'ast'),
        reajusteNew: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
    };
    
    const jntCI = {
        new: calculateConsumoInternoFromItems((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        old: calculateOldFormatConsumoInterno(entry.jantar as PeriodData, 'jnt'),
        reajusteNew: getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
    };

    const almocoCITotal = { 
        qtd: aptCI.new.qtd + aptCI.old.qtd + astCI.new.qtd + astCI.old.qtd, 
        valor: aptCI.new.valor + aptCI.old.valor + astCI.new.valor + astCI.old.valor 
    };
    const jantarCITotal = { 
        qtd: jntCI.new.qtd + jntCI.old.qtd, 
        valor: jntCI.new.valor + jntCI.old.valor 
    };

    const totalCI = {
        qtd: almocoCITotal.qtd + jantarCITotal.qtd,
        valor: almocoCITotal.valor + jantarCITotal.valor,
    };
    
    const reajusteCIAlmoco = aptCI.old.reajuste + aptCI.reajusteNew + astCI.old.reajuste + astCI.reajusteNew;
    const reajusteCIJantar = jntCI.old.reajuste + jntCI.reajusteNew;
    const totalReajusteCI = reajusteCIAlmoco + reajusteCIJantar;

    return {
        almocoCI: almocoCITotal,
        jantarCI: jantarCITotal,
        totalReajusteCI,
        totalCI,
        reajusteCIAlmoco,
        reajusteCIJantar,
    };
}
