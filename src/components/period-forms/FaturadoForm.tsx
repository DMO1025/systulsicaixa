

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Hotel, User, DollarSign, Hash, Info, MessageSquare } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DailyEntryFormData, FaturadoItem, BilledClient } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Combobox } from '@/components/ui/combobox';
import { getSetting } from '@/services/settingsService';
import { getSafeNumericValue } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const createDefaultFaturadoItem = (): FaturadoItem => ({
  id: uuidv4(),
  clientName: '',
  type: 'hotel',
  quantity: undefined,
  value: undefined,
  observation: '',
});

interface FaturadoFormProps {
  form: UseFormReturn<DailyEntryFormData>;
  basePath: `almocoPrimeiroTurno.subTabs.faturado` | `almocoSegundoTurno.subTabs.faturado` | `jantar.subTabs.faturado`;
}

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const FaturadoForm: React.FC<FaturadoFormProps> = ({ form, basePath }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `${basePath}.faturadoItems`,
    keyName: "fieldId",
  });
  
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [newEntry, setNewEntry] = useState<FaturadoItem>(createDefaultFaturadoItem());

  const watchedItems = form.watch(`${basePath}.faturadoItems`);

  const totals = useMemo(() => {
    const items = Array.isArray(watchedItems) ? watchedItems : [];
    const acc = {
        hotel: { qtd: 0, valor: 0 },
        funcionario: { qtd: 0, valor: 0 },
        outros: { qtd: 0, valor: 0 },
        geral: { qtd: 0, valor: 0 },
    };

    items.forEach(item => {
        const qtd = item.quantity || 0;
        const valor = item.value || 0;
        
        if (item.type === 'hotel') {
            acc.hotel.qtd += qtd;
            acc.hotel.valor += valor;
        } else if (item.type === 'funcionario') {
            acc.funcionario.qtd += qtd;
            acc.funcionario.valor += valor;
        } else {
            acc.outros.qtd += qtd;
            acc.outros.valor += valor;
        }
        acc.geral.qtd += qtd;
        acc.geral.valor += valor;
    });

    return acc;
  }, [watchedItems]);


  useEffect(() => {
    async function fetchClients() {
        try {
            const storedClients = await getSetting('billedClients');
            if (Array.isArray(storedClients)) {
                setClientOptions(storedClients.map(c => ({ value: c.name, label: c.name })));
            }
        } catch (error) {
            console.error("Failed to fetch clients for autocomplete:", error);
        }
    }
    fetchClients();
  }, []);

  const handleInputChange = (field: keyof Omit<FaturadoItem, 'id'>, value: any) => {
    setNewEntry(prev => ({...prev, [field]: value}));
  }

  const handleInsert = () => {
    if (!newEntry.clientName.trim()) {
        form.setError("root", { type: "manual", message: "O nome da pessoa não pode estar em branco." });
        return;
    }
    append({ ...newEntry, id: uuidv4() });
    setNewEntry(createDefaultFaturadoItem());
  };

  const periodPrefix = basePath.startsWith('almocoPrimeiroTurno') ? 'apt' : basePath.startsWith('almocoSegundoTurno') ? 'ast' : 'jnt';
  
  const watchedFormData = form.watch();
  const legacyPeriodData = watchedFormData[basePath.split('.')[0] as 'almocoPrimeiroTurno' | 'almocoSegundoTurno' | 'jantar'];
  const legacyChannels = legacyPeriodData?.subTabs?.ciEFaturados?.channels;
  
  const oldFormatQtd = getSafeNumericValue(legacyChannels, `${periodPrefix}CiEFaturadosFaturadosQtd.qtd`);
  const oldFormatValorHotel = getSafeNumericValue(legacyChannels, `${periodPrefix}CiEFaturadosValorHotel.vtotal`);
  const oldFormatValorFuncionario = getSafeNumericValue(legacyChannels, `${periodPrefix}CiEFaturadosValorFuncionario.vtotal`);
  const oldFormatTotal = oldFormatValorHotel + oldFormatValorFuncionario;

  const showLegacyWarning = oldFormatQtd > 0 || oldFormatTotal > 0;

  return (
    <div className="space-y-6">

        {showLegacyWarning && (
             <div className="p-4 border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Dados de Formato Antigo Detectados</h4>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                            Encontramos os seguintes totais lançados no formato anterior. Se desejar, insira-os como novos itens na lista abaixo para atualizá-los e então apague os valores antigos.
                        </p>
                        <div className="mt-2 text-xs font-mono rounded bg-yellow-100 dark:bg-yellow-900/50 p-2 space-y-1">
                             <p><strong>Qtd Antiga:</strong> {oldFormatQtd}</p>
                             <p><strong>Valor Hotel Antigo:</strong> {formatCurrency(oldFormatValorHotel)}</p>
                             <p><strong>Valor Funcionário Antigo:</strong> {formatCurrency(oldFormatValorFuncionario)}</p>
                             <p><strong>Total Antigo:</strong> {formatCurrency(oldFormatTotal)}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="p-4 border rounded-lg bg-muted/20">
            <h4 className="text-sm font-semibold mb-3">Adicionar Novo Lançamento Faturado</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5">
                    <Label className="text-xs flex items-center mb-1"><User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Pessoa</Label>
                    <Combobox
                        options={clientOptions}
                        value={newEntry.clientName}
                        onChange={(value) => handleInputChange('clientName', value)}
                        placeholder="Selecione ou digite"
                    />
                </div>
                 <div className="md:col-span-3">
                     <Label className="text-xs flex items-center mb-1"><Hotel className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Tipo</Label>
                     <Select value={newEntry.type} onValueChange={(value: 'hotel' | 'funcionario' | 'outros') => handleInputChange('type', value)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hotel">Hotel</SelectItem>
                            <SelectItem value="funcionario">Funcionário</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                     </Select>
                </div>
                 <div className="md:col-span-2">
                    <Label className="text-xs flex items-center mb-1"><Hash className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Qtd</Label>
                    <Input
                        type="number"
                        placeholder="0"
                        value={newEntry.quantity ?? ''}
                        onChange={e => handleInputChange('quantity', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                        className="h-9 text-sm"
                    />
                </div>
                 <div className="md:col-span-2">
                     <Label className="text-xs flex items-center mb-1"><DollarSign className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Valor</Label>
                     <Input
                        type="text"
                        placeholder="0,00"
                        value={newEntry.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? ''}
                        onChange={e => {
                            const rawValue = e.target.value;
                            const digitsOnly = rawValue.replace(/\D/g, '');
                            const numberValue = digitsOnly === '' ? undefined : parseInt(digitsOnly, 10) / 100;
                            handleInputChange('value', numberValue);
                        }}
                        className="h-9 text-sm"
                     />
                 </div>
            </div>

            <div className="mt-4 flex justify-between items-end gap-4">
                <div className="flex-grow">
                    <Label className="text-xs flex items-center mb-1"><MessageSquare className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Observação</Label>
                    <Input
                        type="text"
                        placeholder="Opcional"
                        value={newEntry.observation ?? ''}
                        onChange={e => handleInputChange('observation', e.target.value)}
                        className="h-9 text-sm"
                    />
                 </div>
                <Button type="button" onClick={handleInsert}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Inserir na Lista
                </Button>
            </div>
        </div>

        <Separator />

        <div>
            <h4 className="text-sm font-semibold mb-2">Totais Faturados</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground font-medium">HOTEL</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.hotel.valor)}</p>
                    <p className="text-xs text-muted-foreground">{totals.hotel.qtd} Itens</p>
                </div>
                 <div className="p-3 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground font-medium">FUNCIONÁRIO</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.funcionario.valor)}</p>
                    <p className="text-xs text-muted-foreground">{totals.funcionario.qtd} Itens</p>
                </div>
                 <div className="p-3 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground font-medium">OUTROS</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.outros.valor)}</p>
                    <p className="text-xs text-muted-foreground">{totals.outros.qtd} Itens</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <p className="text-xs font-semibold">TOTAL GERAL</p>
                    <p className="text-lg font-extrabold">{formatCurrency(totals.geral.valor)}</p>
                    <p className="text-xs font-semibold">{totals.geral.qtd} Itens</p>
                </div>
            </div>
        </div>


        {fields.length > 0 && (
            <div>
                 <h4 className="text-sm font-semibold mb-2">Lançamentos Adicionados</h4>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pessoa</TableHead>
                                <TableHead>Observação</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Qtd</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((item, index) => (
                                <TableRow key={item.fieldId}>
                                    <TableCell className="font-medium">{item.clientName}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{item.observation || '-'}</TableCell>
                                    <TableCell className="capitalize">{item.type}</TableCell>
                                    <TableCell className="text-right">{item.quantity ?? '-'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            className="text-destructive h-8 w-8"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )}
    </div>
  );
};

export default FaturadoForm;
