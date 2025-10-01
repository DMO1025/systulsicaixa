

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { DailyLogEntry, PeriodData, ConsumoInternoItem, FaturadoItem } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { extractPersonTransactions } from '@/lib/reports/person/generator';
import EditObservationModal from './EditObservationModal';
import EditPersonNameModal from './EditPersonNameModal';
import type { UnifiedPersonTransaction } from '@/lib/types';


interface ClientExtractViewProps {
  entries: DailyLogEntry[];
  consumptionType: string;
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  startDate?: string;
  endDate?: string;
  onTransactionsUpdate: (transactions: UnifiedPersonTransaction[]) => void;
}


const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatNumber = (value: number) => (value || 0).toLocaleString('pt-BR');

const ClientExtractView: React.FC<ClientExtractViewProps> = ({ entries, consumptionType, selectedClient, setSelectedClient, startDate, endDate, onTransactionsUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedPersonTransaction | null>(null);
  
  const { personList, allTransactions, refetch } = useMemo(() => {
    const data = extractPersonTransactions(entries, consumptionType);
    return { ...data, refetch: () => extractPersonTransactions(entries, consumptionType) };
  }, [entries, consumptionType]);
  
  const [displayedData, setDisplayedData] = useState(allTransactions);
  const [currentPersonList, setCurrentPersonList] = useState(personList);

  useEffect(() => {
    setDisplayedData(allTransactions);
    setCurrentPersonList(personList);
    onTransactionsUpdate(allTransactions); // Pass initial data to parent
  }, [allTransactions, personList, onTransactionsUpdate]);


  useEffect(() => {
    let filtered;
    if (selectedClient === 'all') {
        filtered = allTransactions;
    } else {
        filtered = allTransactions.filter(t => t.personName === selectedClient);
    }
    setDisplayedData(filtered);
    onTransactionsUpdate(filtered);
  }, [selectedClient, allTransactions, onTransactionsUpdate]);
  

  const clientTotals = useMemo(() => {
    return displayedData.reduce((acc, item) => {
        acc.quantity += item.quantity;
        acc.value += item.value;
        return acc;
    }, { quantity: 0, value: 0 });
  }, [displayedData]);

  useEffect(() => {
    if(selectedClient !== 'all' && !currentPersonList.includes(selectedClient)) {
      setSelectedClient('all');
    }
  }, [currentPersonList, selectedClient, setSelectedClient]);

  const handleObservationUpdated = (updatedTransaction: UnifiedPersonTransaction) => {
      const updatedData = displayedData.map(item =>
          item.id === updatedTransaction.id ? updatedTransaction : item
      );
      setDisplayedData(updatedData);
      onTransactionsUpdate(updatedData);
  };
  
  const handleNameUpdated = (oldName: string, newName: string) => {
    const updatedData = displayedData.map(item =>
        item.personName === oldName ? { ...item, personName: newName } : item
    );
    setDisplayedData(updatedData);
    onTransactionsUpdate(updatedData);

    setCurrentPersonList(prevList => {
        const newList = prevList.map(name => name === oldName ? newName : name);
        return [...new Set(newList)].sort((a,b) => a.localeCompare(b));
    });

    if (selectedClient === oldName) {
        setSelectedClient(newName);
    }
  };

  return (
    <>
    <div className="space-y-4">
      <div className="max-w-sm">
         <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
                <SelectValue placeholder="Selecione uma pessoa..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todas as Pessoas</SelectItem>
                {currentPersonList.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
                 {currentPersonList.length === 0 && (
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
                            <TableRow key={item.id || index}>
                                {selectedClient === 'all' && 
                                  <TableCell className="text-xs font-medium group">
                                    <div className="flex items-center gap-2">
                                      <span>{item.personName}</span>
                                      <EditPersonNameModal 
                                        oldName={item.personName} 
                                        onNameUpdated={handleNameUpdated}
                                        startDate={startDate}
                                        endDate={endDate}
                                      />
                                    </div>
                                  </TableCell>
                                }
                                <TableCell className="text-xs">{item.date}</TableCell>
                                <TableCell className="text-xs">
                                     <Badge variant={item.origin.includes('Faturado') ? 'secondary' : 'outline'}>{item.origin}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground group">
                                  <div className="flex items-center gap-2">
                                    <span>{item.observation}</span>
                                    <EditObservationModal 
                                      transaction={item} 
                                      onObservationUpdated={handleObservationUpdated}
                                    />
                                  </div>
                                </TableCell>
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
    </>
  );
};

export default ClientExtractView;
