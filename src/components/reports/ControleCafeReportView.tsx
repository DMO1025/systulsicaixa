
"use client";

import React, { useMemo } from 'react';
import type { DailyLogEntry, CafeManhaNoShowItem, ControleCafeItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';

interface ControleCafeReportViewProps {
  entries: DailyLogEntry[];
  type: 'no-show' | 'controle';
}

const ControleCafeReportView: React.FC<ControleCafeReportViewProps> = ({ entries, type }) => {

    const noShowItems = useMemo(() => {
        const items: (CafeManhaNoShowItem & { entryDate: string })[] = [];
        if (type !== 'no-show') return items;

        entries.forEach(entry => {
            const noShowData = entry.cafeManhaNoShow as any;
            if (noShowData?.items && Array.isArray(noShowData.items)) {
                noShowData.items.forEach((item: CafeManhaNoShowItem) => {
                    items.push({
                        ...item,
                        entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                    });
                });
            }
        });
        return items.sort((a,b) => a.entryDate.localeCompare(b.entryDate) || (a.horario || '').localeCompare(b.horario || ''));
    }, [entries, type]);

    const controleItems = useMemo(() => {
        const items: (Partial<ControleCafeItem> & { entryDate: string })[] = [];
        if (type !== 'controle') return items;

        entries.forEach(entry => {
            const controleData = entry.controleCafeDaManha as any;
            if (controleData) { // Check if the whole object exists
                items.push({
                    adultoQtd: controleData.adultoQtd,
                    crianca01Qtd: controleData.crianca01Qtd,
                    crianca02Qtd: controleData.crianca02Qtd,
                    contagemManual: controleData.contagemManual,
                    semCheckIn: controleData.semCheckIn,
                    entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                });
            }
        });
        return items.sort((a,b) => a.entryDate.localeCompare(b.entryDate));
    }, [entries, type]);

    const formatCurrency = (value?: number) => {
        return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (type === 'no-show') {
        const totalValor = noShowItems.reduce((acc, item) => acc + (item.valor || 0), 0);
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Hóspede</TableHead>
                        <TableHead>UH</TableHead>
                        <TableHead>Reserva</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Observação</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {noShowItems.length > 0 ? noShowItems.map((item, index) => (
                        <TableRow key={item.id || index}>
                            <TableCell className="text-xs">{item.entryDate}</TableCell>
                            <TableCell className="text-xs">{item.horario || '-'}</TableCell>
                            <TableCell className="font-medium text-xs">{item.hospede || '-'}</TableCell>
                            <TableCell className="text-xs">{item.uh || '-'}</TableCell>
                            <TableCell className="text-xs">{item.reserva || '-'}</TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(item.valor)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.observation || '-'}</TableCell>
                        </TableRow>
                    )) : (
                       <TableRow>
                           <TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum registro de controle no-show encontrado no período selecionado.</TableCell>
                       </TableRow>
                    )}
                </TableBody>
                 {noShowItems.length > 0 && (
                    <TableFooter>
                        <TableRow className="font-bold">
                            <TableCell colSpan={5}>TOTAL</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalValor)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                 )}
            </Table>
        );
    }

    if (type === 'controle') {
        const totals = controleItems.reduce((acc, item) => {
            acc.adultoQtd += item.adultoQtd || 0;
            acc.crianca01Qtd += item.crianca01Qtd || 0;
            acc.crianca02Qtd += item.crianca02Qtd || 0;
            acc.contagemManual += item.contagemManual || 0;
            acc.semCheckIn += item.semCheckIn || 0;
            return acc;
        }, { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0 });

         return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Adultos</TableHead>
                        <TableHead className="text-right">Criança 01</TableHead>
                        <TableHead className="text-right">Criança 02</TableHead>
                        <TableHead className="text-right">Contagem Manual</TableHead>
                        <TableHead className="text-right">Sem Check-in</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {controleItems.length > 0 ? controleItems.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell className="text-xs">{item.entryDate}</TableCell>
                            <TableCell className="text-right text-xs">{item.adultoQtd ?? '-'}</TableCell>
                            <TableCell className="text-right text-xs">{item.crianca01Qtd ?? '-'}</TableCell>
                            <TableCell className="text-right text-xs">{item.crianca02Qtd ?? '-'}</TableCell>
                            <TableCell className="text-right text-xs">{item.contagemManual ?? '-'}</TableCell>
                            <TableCell className="text-right text-xs">{item.semCheckIn ?? '-'}</TableCell>
                        </TableRow>
                    )) : (
                       <TableRow>
                           <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum registro de controle de café da manhã encontrado no período selecionado.</TableCell>
                       </TableRow>
                    )}
                </TableBody>
                 {controleItems.length > 0 && (
                    <TableFooter>
                        <TableRow className="font-bold">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{totals.adultoQtd}</TableCell>
                            <TableCell className="text-right">{totals.crianca01Qtd}</TableCell>
                            <TableCell className="text-right">{totals.crianca02Qtd}</TableCell>
                            <TableCell className="text-right">{totals.contagemManual}</TableCell>
                            <TableCell className="text-right">{totals.semCheckIn}</TableCell>
                        </TableRow>
                    </TableFooter>
                 )}
            </Table>
        );
    }
    
    return null;
};

export default ControleCafeReportView;
