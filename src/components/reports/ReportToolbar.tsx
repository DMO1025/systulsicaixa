
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, CalendarIcon } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';
import type { FilterType, PeriodId, DateRange } from '@/lib/types';
import type { PeriodDefinition } from '@/lib/constants';

interface ReportToolbarProps {
    filterType: FilterType;
    setFilterType: (value: FilterType) => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    selectedPeriod: PeriodId | 'all';
    setSelectedPeriod: (value: PeriodId | 'all') => void;
    visiblePeriodDefinitions: PeriodDefinition[];
    selectedMonth: Date;
    setSelectedMonth: (date: Date) => void;
    selectedRange: DateRange | undefined;
    setSelectedRange: (range: DateRange | undefined) => void;
    handleExport: (format: 'pdf' | 'excel') => void;
    isDataAvailable: boolean;
    isPeriodFilterDisabled: boolean;
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
    isPeriodFilterDisabled
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

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                <div>
                    <CardTitle>Filtros de Relatório</CardTitle>
                    <CardDescription>Selecione os filtros para gerar e exportar os relatórios.</CardDescription>
                </div>
                <div className="flex space-x-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => handleExport('pdf')} className="flex-1 md:flex-none" disabled={!isDataAvailable}><Download className="mr-2 h-4 w-4" /> PDF</Button>
                    <Button variant="outline" onClick={() => handleExport('excel')} className="flex-1 md:flex-none" disabled={!isDataAvailable}><Download className="mr-2 h-4 w-4" /> Excel</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-0 md:flex md:flex-wrap md:gap-4 items-end">
                <div className="space-y-2 min-w-full md:min-w-[200px] flex-grow md:flex-grow-0">
                    <Label htmlFor="filterType">Tipo de Filtro</Label>
                    <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
                    <SelectTrigger id="filterType" className="w-full">
                        <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date">Por Data Específica</SelectItem>
                        <SelectItem value="range">Por Intervalo de Datas</SelectItem>
                        <SelectItem value="period">Por Período (dentro do Mês)</SelectItem>
                        <SelectItem value="month">Geral (Mês Inteiro)</SelectItem>
                    </SelectContent>
                    </Select>
                </div>

                {filterType === 'date' && (
                    <div className="space-y-2 min-w-full md:min-w-[240px] flex-grow md:flex-grow-0">
                        <Label htmlFor="date">Data Específica</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={ptBR} />
                            </PopoverContent>
                        </Popover>
                    </div>
                )}
                
                {filterType === 'range' && (
                    <div className="space-y-2 min-w-full md:min-w-[280px] flex-grow md:flex-grow-0">
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
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {filterType === 'period' && (
                    <div className="space-y-2 min-w-full md:min-w-[200px] flex-grow md:flex-grow-0">
                    <Label htmlFor="period">Período</Label>
                    <Select value={String(selectedPeriod)} onValueChange={(value) => setSelectedPeriod(value as PeriodId | 'all')}>
                        <SelectTrigger id="period" className="w-full">
                        <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Todos os Períodos</SelectItem>
                        {visiblePeriodDefinitions.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </div>
                )}

                {(filterType === 'month' || filterType === 'period') && (
                    <>
                        <div className="space-y-2 min-w-full md:min-w-[150px] flex-grow md:flex-grow-0">
                            <Label htmlFor="month-picker">Mês</Label>
                            <Select
                                value={selectedMonthIndex.toString()}
                                onValueChange={handleMonthChange}
                                disabled={isPeriodFilterDisabled}
                            >
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
                        <div className="space-y-2 min-w-full md:min-w-[120px] flex-grow md:flex-grow-0">
                            <Label htmlFor="year-picker">Ano</Label>
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={handleYearChange}
                                disabled={isPeriodFilterDisabled}
                            >
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
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default ReportToolbar;
