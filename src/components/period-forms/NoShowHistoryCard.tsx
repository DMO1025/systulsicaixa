
"use client";

import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Trash2, History } from 'lucide-react';
import type { DailyEntryFormData } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface NoShowHistoryCardProps {
    form: UseFormReturn<DailyEntryFormData>;
    triggerMainSubmit: () => Promise<void>;
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const NoShowHistoryCard: React.FC<NoShowHistoryCardProps> = ({ form, triggerMainSubmit }) => {
    const { remove } = useFieldArray({
        name: "cafeManhaNoShow.items",
        control: form.control,
    });

    const items = form.watch('cafeManhaNoShow.items') || [];
    
    const displayDate = form.watch('date')
    ? format(form.watch('date'), "PPP", { locale: ptBR })
    : "Data não selecionada";

    const handleDelete = async (index: number) => {
        remove(index);
        await triggerMainSubmit();
    };

    return (
        <Card className="mt-8 lg:mt-0">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <History className="h-6 w-6 text-primary" />
                    <CardTitle>Registros Salvos</CardTitle>
                </div>
                <CardDescription>Itens já salvos para {displayDate}.</CardDescription>
            </CardHeader>
            <CardContent>
                {items.length > 0 ? (
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hóspede</TableHead>
                                    <TableHead>Detalhes</TableHead>
                                    <TableHead>Observação</TableHead>
                                    <TableHead className="text-right w-[120px]">Valor</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-sm font-medium">{item.hospede || '-'}</TableCell>
                                        <TableCell className="text-xs">
                                            <div>Horário: {item.horario || '-'}</div>
                                            <div>Reserva: {item.reserva || '-'}</div>
                                            <div className="text-muted-foreground">UH: {item.uh || '-'}</div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{item.observation || '-'}</TableCell>
                                        <TableCell className="text-right text-sm">{formatCurrency(item.valor)}</TableCell>
                                        <TableCell>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(index)} className="text-destructive h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum registro salvo para esta data.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export default NoShowHistoryCard;
