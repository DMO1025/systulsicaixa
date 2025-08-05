import type { DailyLogEntry, EventosPeriodData } from '@/lib/types';

export function calculateEventosTotals(entry: DailyLogEntry) {
    const eventosDireto = { qtd: 0, valor: 0 };
    const eventosHotel = { qtd: 0, valor: 0 };
    (entry.eventos as EventosPeriodData)?.items?.forEach(item => { (item.subEvents || []).forEach(subEvent => {
        const qty = subEvent.quantity || 0; 
        const val = subEvent.totalValue || 0;
        if (subEvent.location === 'DIRETO') { 
            eventosDireto.qtd += qty; 
            eventosDireto.valor += val; 
        } else if (subEvent.location === 'HOTEL') { 
            eventosHotel.qtd += qty; 
            eventosHotel.valor += val; 
        }
    }); });

    return {
        direto: eventosDireto,
        hotel: eventosHotel,
    };
}
