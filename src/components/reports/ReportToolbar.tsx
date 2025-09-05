

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, CalendarIcon, Refrigerator, FileCheck2, Wallet, Users, ListFilter, CalendarDays, BarChartBig, UserSquare, ClipboardCheck, BedDouble, Building2, Building } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';
import type { FilterType, PeriodId, DateRange } from '@/lib/types';
import { getPeriodIcon, type PeriodDefinition } from '@/lib/config/periods';
import { Switch } from '@/components/ui/switch';

interface ReportToolbarProps {
    filterType: FilterType;
    setFilterType: (value: FilterType) => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    selectedPeriod: PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService';
    setSelectedPeriod: (value: PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService') => void;
    visiblePeriodDefinitions: PeriodDefinition[];
    selectedMonth: Date;
    setSelectedMonth: (date: Date) => void;
    selectedRange: DateRange | undefined;
    setSelectedRange: (range: DateRange | undefined) => void;
    handleExport: (format: 'pdf' | 'excel') => void;
    isDataAvailable: boolean;
    datesWithEntries: Date[];
    consumptionType: string;
    setConsumptionType: (value: string) => void;
    companyName: string;
    setCompanyName: (value: string) => void;
    selectedDezena?: string;
    setSelectedDezena?: (value: string) => void;
    includeCompanyData: boolean;
    setIncludeCompanyData: (value: boolean) => void;
}

const ReportToolbar: React.FC<ReportToolbarProps> = ({
    filterType,
    setFilterType,
    selectedDate,
    setSelectedDate,
    selectedPeriod,
    setSelectedPeriod,
    visiblePeriodDefinitions,
    selectedMonth,
    setSelectedMonth,
    selectedRange,
    setSelectedRange,
    handleExport,
    isDataAvailable,
    datesWithEntries,
    consumptionType,
    setConsumptionType,
    companyName,
    setCompanyName,
    selectedDezena,
    setSelectedDezena,
    includeCompanyData,
    setIncludeCompanyData
}) => {
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthIndex = selectedMonth.getMonth();

    const months = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(2000, i), 'MMMM', { locale: ptBR })
    }));

    const currentSystemYear = new Date().getFullYear();
    const years = Array.from({ length: currentSystemYear - 2019 }, (_, i) => 2020 + i).reverse();

    const handleMonthChange = (monthValue: string) => {
        const newMonthIndex = parseInt(monthValue, 10);
        if (!isNaN(newMonthIndex)) {
            const newDate = new Date(selectedYear, newMonthIndex, 1);
            setSelectedMonth(newDate);
        }
    };

    const handleYearChange = (yearValue: string) => {
        const newYear = parseInt(yearValue, 10);
        if (!isNaN(newYear)) {
            const newDate = new Date(newYear, selectedMonthIndex, 1);
            setSelectedMonth(newDate);
        }
    };
    
    const modifiers = { hasEntry: datesWithEntries };
    const modifiersClassNames = { hasEntry: 'has-entry-dot' };

    const sortedPeriodOptions = React.useMemo(() => {
        const specialPeriods = [
            { id: 'roomService', label: 'Room Service', icon: BedDouble },
            { id: 'consumoInterno', label: 'Consumo Interno', icon: FileCheck2 },
            { id: 'faturado', label: 'Faturado', icon: Wallet },
            { id: 'frigobar', label: 'Frigobar', icon: Refrigerator },
        ];
        
        const regularPeriods = visiblePeriodDefinitions
            .filter(p => p.type === 'entry') // Filter out control types
            .map(p => ({ ...p, icon: getPeriodIcon(p.id) }));

        const allOptions = [...regularPeriods, ...specialPeriods];
        return allOptions.sort((a, b) => a.label.localeCompare(b.label));
    }, [visiblePeriodDefinitions]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Selecione os parâmetros para gerar e exportar os relatórios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 items-end">
                    
                    {filterType === 'date' && (
                        <div className="space-y-2">
                            <Label htmlFor="date">Data Específica</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                    locale={ptBR}
                                    modifiers={modifiers}
                                    modifiersClassNames={modifiersClassNames}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                    
                    {(filterType === 'range' || filterType.startsWith('controle-cafe')) && (
                       <div className="space-y-2">
                         <Label htmlFor="date-range">Intervalo de Datas</Label>
                            <Popover>
                            <PopoverTrigger asChild>
                            <Button id="date-range" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedRange?.from ? (
                                selectedRange.to ? (
                                    <>
                                    {format(selectedRange.from, "LLL dd, y", {locale: ptBR})} -{" "}
                                    {format(selectedRange.to, "LLL dd, y", {locale: ptBR})}
                                    </>
                                ) : (
                                    format(selectedRange.from, "LLL dd, y", {locale: ptBR})
                                )
                                ) : (
                                <span>Escolha um intervalo</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={selectedRange?.from}
                                selected={selectedRange}
                                onSelect={setSelectedRange}
                                numberOfMonths={2}
                                locale={ptBR}
                                modifiers={modifiers}
                                modifiersClassNames={modifiersClassNames}
                            />
                            </PopoverContent>
                        </Popover>
                       </div>
                    )}

                    {(filterType === 'month' || filterType === 'period' || filterType.startsWith('client-')) && (
                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="month-picker">Mês</Label>
                                <Select value={selectedMonthIndex.toString()} onValueChange={handleMonthChange}>
                                    <SelectTrigger id="month-picker" className="w-full">
                                        <SelectValue placeholder="Selecione o Mês" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(month => (
                                            <SelectItem key={month.value} value={month.value.toString()}>{month.label.charAt(0).toUpperCase() + month.label.slice(1)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 w-[120px]">
                                <Label htmlFor="year-picker">Ano</Label>
                                <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                                    <SelectTrigger id="year-picker" className="w-full">
                                        <SelectValue placeholder="Selecione o Ano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(year => (
                                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {filterType === 'period' && (
                        <div className="space-y-2">
                        <Label htmlFor="period">Período</Label>
                        <Select value={String(selectedPeriod)} onValueChange={(value) => setSelectedPeriod(value as any)}>
                            <SelectTrigger id="period" className="w-full">
                                <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                        Todos os Períodos
                                    </div>
                                </SelectItem>
                                {sortedPeriodOptions.map(p => {
                                    const Icon = p.icon;
                                    return (
                                        <SelectItem key={p.id} value={p.id}>
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                {p.label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        </div>
                    )}

                    {filterType.startsWith('client-') && (
                        <div className="space-y-2">
                            <Label htmlFor="consumptionType">Tipo de Consumo</Label>
                            <Select value={consumptionType} onValueChange={setConsumptionType}>
                                <SelectTrigger id="consumptionType" className="w-full">
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="ci">Apenas Consumo Interno</SelectItem>
                                    <SelectItem value="faturado-all">Apenas Faturado (Todos)</SelectItem>
                                    <SelectItem value="faturado-hotel">Apenas Faturado (Hotel)</SelectItem>
                                    <SelectItem value="faturado-funcionario">Apenas Faturado (Funcionário)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {(setSelectedDezena && (filterType === 'controle-cafe' || filterType === 'controle-cafe-no-show')) && (
                        <div className="space-y-2">
                            <Label htmlFor="dezena-select">Imprimir Dezena (PDF)</Label>
                            <Select value={selectedDezena} onValueChange={setSelectedDezena}>
                                <SelectTrigger id="dezena-select" className="w-full">
                                    <SelectValue placeholder="Selecione a dezena" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Dezenas</SelectItem>
                                    <SelectItem value="1">1ª Dezena</SelectItem>
                                    <SelectItem value="2">2ª Dezena</SelectItem>
                                    <SelectItem value="3">3ª Dezena</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="companyName" className="flex items-center gap-1.5"><Building className="h-4 w-4 text-muted-foreground"/>Empresa</Label>
                        <Select value={companyName} onValueChange={setCompanyName}>
                            <SelectTrigger id="companyName" className="w-full">
                                <SelectValue placeholder="Selecione a empresa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Avalon Restaurante e Eventos Ltda">Avalon Restaurante e Eventos Ltda</SelectItem>
                                <SelectItem value="Momentum Gastronomico Ltda">Momentum Gastronomico Ltda</SelectItem>
                                <SelectItem value="Rubi Restaurante e Eventos Ltda">Rubi Restaurante e Eventos Ltda</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-end space-y-2 pb-1">
                        <div className="flex items-center space-x-2">
                            <Switch id="include-company-data" checked={includeCompanyData} onCheckedChange={setIncludeCompanyData}/>
                            <Label htmlFor="include-company-data">Incluir Dados da Empresa</Label>
                        </div>
                    </div>


                </div>
                <div className="pt-4 mt-4 border-t flex items-center justify-end">
                    <div className="flex space-x-2">
                        <Button variant="outline" onClick={() => handleExport('pdf')} className="flex-1 md:flex-none" disabled={!isDataAvailable}><Download className="mr-2 h-4 w-4" /> PDF</Button>
                        <Button variant="outline" onClick={() => handleExport('excel')} className="flex-1 md:flex-none" disabled={!isDataAvailable}><Download className="mr-2 h-4 w-4" /> Excel</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ReportToolbar;
