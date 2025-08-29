

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { DailyLogEntry } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { extractPersonTransactions } from '@/lib/reports/person/generator';


interface ClientExtractViewProps {
  entries: DailyLogEntry[];
  consumptionType: string;
  selectedClient: string;
  setSelectedClient: (client: string) => void;
}


const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatNumber = (value: number) => (value || 0).toLocaleString('pt-BR');

const ClientExtractView: React.FC<ClientExtractViewProps> = ({ entries, consumptionType, selectedClient, setSelectedClient }) => {

  const { personList: clientList, allTransactions } = useMemo(() => {
    return extractPersonTransactions(entries, consumptionType);
  }, [entries, consumptionType]);


  const displayedData = useMemo(() => {
    if (selectedClient === 'all') {
        return allTransactions;
    }
    return allTransactions.filter(t => t.personName === selectedClient);
  }, [selectedClient, allTransactions]);
  

  const clientTotals = useMemo(() => {
    return displayedData.reduce((acc, item) => {
        acc.quantity += item.quantity;
        acc.value += item.value;
        return acc;
    }, { quantity: 0, value: 0 });
  }, [displayedData]);

  // Reset client selection if the selected client is not in the new list
  useEffect(() => {
    if(selectedClient !== 'all' && !clientList.includes(selectedClient)) {
      setSelectedClient('all');
    }
  }, [clientList, selectedClient, setSelectedClient]);


  return (
    <div className="space-y-4">
      <div className="max-w-sm">
         <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
                <SelectValue placeholder="Selecione uma pessoa..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todas as Pessoas</SelectItem>
                {clientList.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
                 {clientList.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground p-4">Nenhuma pessoa encontrada com os filtros aplicados.</div>
                )}
            </SelectContent>
        </Select>
      </div>

      {(selectedClient) && (
        <Card>
            <CardHeader>
                <CardTitle>Extrato para: {selectedClient === 'all' ? 'Todas as Pessoas' : selectedClient}</CardTitle>
                <CardDescription>
                    Total Consumido (nos filtros atuais): {formatNumber(clientTotals.quantity)} itens, somando {formatCurrency(clientTotals.value)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {selectedClient === 'all' && <TableHead>Pessoa</TableHead>}
                            <TableHead>Data</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Observação</TableHead>
                            <TableHead className="text-right">Quantidade</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedData.length > 0 ? displayedData.map((item, index) => (
                            <TableRow key={index}>
                                {selectedClient === 'all' && <TableCell className="text-xs font-medium">{item.personName}</TableCell>}
                                <TableCell className="text-xs">{item.date}</TableCell>
                                <TableCell className="text-xs">
                                     <Badge variant={item.origin.includes('Faturado') ? 'secondary' : 'outline'}>{item.origin}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.observation}</TableCell>
                                <TableCell className="text-right text-xs">{formatNumber(item.quantity)}</TableCell>
                                <TableCell className="text-right text-xs">{formatCurrency(item.value)}</TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                               <TableCell colSpan={selectedClient === 'all' ? 6 : 5} className="text-center text-muted-foreground">Nenhum consumo encontrado para esta pessoa com os filtros aplicados.</TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                    {displayedData.length > 0 && (
                        <TableFooter>
                            <TableRow className="font-bold bg-muted/50">
                                <TableCell colSpan={selectedClient === 'all' ? 4 : 3}>TOTAL</TableCell>
                                <TableCell className="text-right">{formatNumber(clientTotals.quantity)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(clientTotals.value)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientExtractView;
