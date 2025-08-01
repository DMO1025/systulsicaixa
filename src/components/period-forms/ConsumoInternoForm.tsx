

"use client";

import React, { useState, useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, User, DollarSign, Hash, MessageSquare, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DailyEntryFormData, BilledClient, FaturadoItem as ConsumoInternoItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Combobox } from '@/components/ui/combobox';
import { getSetting } from '@/services/settingsService';
import { FormField, FormControl, FormMessage } from '@/components/ui/form';
import { getSafeNumericValue } from '@/lib/utils';


const createDefaultConsumoInternoItem = (): ConsumoInternoItem => ({
  id: uuidv4(),
  clientName: '',
  type: 'hotel', 
  quantity: undefined,
  value: undefined,
  observation: '',
});

interface ConsumoInternoFormProps {
  form: UseFormReturn<DailyEntryFormData>;
  basePath: `almocoPrimeiroTurno.subTabs.consumoInterno` | `almocoSegundoTurno.subTabs.consumoInterno` | `jantar.subTabs.consumoInterno`;
}

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const ConsumoInternoForm: React.FC<ConsumoInternoFormProps> = ({ form, basePath }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `${basePath}.consumoInternoItems`,
    keyName: "fieldId",
  });
  
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [newEntry, setNewEntry] = useState<ConsumoInternoItem>(createDefaultConsumoInternoItem());

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

  const handleInputChange = (field: keyof Omit<ConsumoInternoItem, 'id' | 'type'>, value: any) => {
    setNewEntry(prev => ({...prev, [field]: value}));
  }

  const handleInsert = () => {
    if (!newEntry.clientName.trim()) {
        form.setError("root", { type: "manual", message: "O nome da pessoa/setor não pode estar em branco." });
        return;
    }
    append({ ...newEntry, id: uuidv4() });
    setNewEntry(createDefaultConsumoInternoItem());
  };

  const periodPrefix = basePath.startsWith('almocoPrimeiroTurno') ? 'apt' : basePath.startsWith('almocoSegundoTurno') ? 'ast' : 'jnt';
  
  const watchedFormData = form.watch();
  const legacyPeriodData = watchedFormData[basePath.split('.')[0] as 'almocoPrimeiroTurno' | 'almocoSegundoTurno' | 'jantar'];
  const legacyChannels = legacyPeriodData?.subTabs?.ciEFaturados?.channels;

  const oldFormatQtd = getSafeNumericValue(legacyChannels, `${periodPrefix}CiEFaturadosConsumoInternoQtd.qtd`);
  const oldFormatReajuste = getSafeNumericValue(legacyChannels, `${periodPrefix}CiEFaturadosReajusteCI.vtotal`);
  const oldFormatTotalCI = getSafeNumericValue(legacyChannels, `${periodPrefix}CiEFaturadosTotalCI.vtotal`);
  const oldFormatValor = oldFormatTotalCI;

  const showLegacyWarning = oldFormatQtd > 0 || oldFormatValor > 0;

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
                             <p><strong>Valor Antigo:</strong> {formatCurrency(oldFormatValor)}</p>
                             <p><strong>Reajuste Antigo:</strong> {formatCurrency(oldFormatReajuste)}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="p-4 border rounded-lg bg-muted/20">
            <h4 className="text-sm font-semibold mb-3">Adicionar Novo Item de Consumo Interno</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-8">
                    <Label className="text-xs flex items-center mb-1"><User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Pessoa/Setor</Label>
                    <Combobox
                        options={clientOptions}
                        value={newEntry.clientName}
                        onChange={(value) => handleInputChange('clientName', value)}
                        placeholder="Selecione ou digite"
                    />
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
                    <PlusCircle className="mr-2 h-4 w-4" /> Inserir Item
                </Button>
            </div>
        </div>

        {fields.length > 0 && (
            <div>
                 <h4 className="text-sm font-semibold mb-2">Itens Inseridos</h4>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pessoa/Setor</TableHead>
                                <TableHead>Observação</TableHead>
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
        
        <div className="border-t pt-4">
             <FormField
                control={form.control}
                name={`${basePath}.channels.reajusteCI.vtotal` as any}
                render={({ field }) => {
                    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                        const rawValue = e.target.value;
                        const digitsOnly = rawValue.replace(/\D/g, '');
                        if (digitsOnly === '') {
                            field.onChange(undefined);
                        } else {
                            const numberValue = parseInt(digitsOnly, 10);
                            field.onChange(numberValue / 100);
                        }
                    };

                    const formatCurrencyForDisplay = (val: number | undefined) => {
                        if (val === undefined || val === null) return '';
                        return val.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        });
                    };

                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                           <Label className="text-sm font-semibold sm:col-span-2">VALOR ADICIONAL (REAJUSTE DE C.I)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="0,00"
                                    value={formatCurrencyForDisplay(field.value)}
                                    onChange={handleCurrencyChange}
                                    onFocus={(e) => e.target.select()}
                                    className="h-9 text-sm text-right w-full pl-7"
                                />
                                 <FormMessage className="text-xs mt-1 text-right" />
                            </div>
                        </div>
                    )
                }}
            />
        </div>
    </div>
  );
};

export default ConsumoInternoForm;
