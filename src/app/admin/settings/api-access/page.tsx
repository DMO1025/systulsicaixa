
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, RefreshCw, Copy, Server, Globe, Calendar as CalendarIcon } from 'lucide-react'; 
import { getSetting } from '@/services/settingsService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import type { PeriodId, FilterType, DateRange } from '@/lib/types';


const CodeBlock = ({ code }: { code: string }) => {
    return (
        <pre className="p-3 rounded-md bg-muted text-muted-foreground text-xs overflow-x-auto max-h-96">
            <code>{code}</code>
        </pre>
    );
};

const exampleApiResponseByFilter: Record<FilterType, { description: string; json: string }> = {
    month: {
        description: 'Abaixo está um exemplo da estrutura de dados retornada pela API para um filtro "Geral (Mês Inteiro)".',
        json: `{
  "type": "general",
  "data": {
    "dailyBreakdowns": [
      {
        "date": "01/07/2024",
        "periodTotals": {
          "madrugada": { "qtd": 2, "valor": 55.5 },
          "cafeDaManha": { "qtd": 10, "valor": 150 },
          "almocoPrimeiroTurno": { "qtd": 25, "valor": 750.2 },
          "jantar": { "qtd": 30, "valor": 1200 }
        },
        "totalComCI": 2155.7,
        "totalSemCI": 2055.7,
        "totalReajusteCI": 10,
        "totalQtd": 67,
        "totalCIQtd": 5
      }
    ],
    "summary": {
      "periodTotals": {
        "madrugada": { "qtd": 50, "valor": 1250.75 }
      },
      "grandTotalComCI": 53000.75,
      "grandTotalSemCI": 50500.75,
      "grandTotalReajusteCI": 250,
      "grandTotalQtd": 1650,
      "grandTotalCIQtd": 100
    },
    "reportTitle": "GERAL (MÊS)"
  }
}`
    },
    date: {
        description: 'Para o filtro "Por Data Específica", a API retorna o objeto completo do lançamento diário.',
        json: `{
  "id": "2024-07-15",
  "date": "2024-07-15T00:00:00.000Z",
  "generalObservations": "Dia movimentado com evento da Empresa X.",
  "madrugada": {
    "channels": {
      "madrugadaRoomServiceValorServico": { "vtotal": 150.50 }
    }
  },
  "cafeDaManha": {
    "channels": {
      "cdmListaHospedes": { "qtd": 50, "vtotal": 750 }
    }
  }
}`
    },
    range: {
        description: 'O filtro "Por Intervalo de Datas" retorna a mesma estrutura do relatório "Geral (Mês Inteiro)", consolidando os dados do intervalo.',
        json: `{
  "type": "general",
  "data": {
    "dailyBreakdowns": [
      {
        "date": "15/07/2024",
        "periodTotals": { "jantar": { "qtd": 30, "valor": 1200 } }
      },
      {
        "date": "16/07/2024",
        "periodTotals": { "jantar": { "qtd": 35, "valor": 1400 } }
      }
    ],
    "summary": {
      "periodTotals": { "jantar": { "qtd": 65, "valor": 2600 } }
    },
    "reportTitle": "GERAL (INTERVALO)"
  }
}`
    },
    period: {
        description: 'Para o filtro "Por Período", a API retorna um detalhamento diário para cada sub-categoria do período selecionado.',
        json: `{
  "type": "period",
  "data": {
    "dailyBreakdowns": {
      "roomService": [
        { "date": "01/07/2024", "qtd": 2, "valor": 155.5 },
        { "date": "02/07/2024", "qtd": 3, "valor": 250 }
      ],
      "hospedes": [
        { "date": "01/07/2024", "qtd": 10, "valor": 450 }
      ]
    },
    "summary": {
      "roomService": { "qtd": 5, "total": 405.5 },
      "hospedes": { "qtd": 10, "total": 450 }
    },
    "reportTitle": "JANTAR"
  }
}`
    },
    'client-extract': {
        description: 'O filtro "Por Pessoa (Extrato Detalhado)" retorna uma lista (array) de todas as transações individuais para o tipo de consumo selecionado.',
        json: `[
  {
    "personName": "Demetrios",
    "date": "05/07/2024",
    "origin": "Faturado - Hotel",
    "observation": "Consumo frigobar",
    "quantity": 1,
    "value": 75.50
  },
  {
    "personName": "Demetrios",
    "date": "10/07/2024",
    "origin": "Consumo Interno - Jantar",
    "observation": "Jantar diretoria",
    "quantity": 4,
    "value": 320.00
  }
]`
    },
    'client-summary': {
        description: 'O filtro "Por Pessoa (Resumo Mensal)" retorna um objeto com os totais consolidados por pessoa.',
        json: `{
  "Demetrios": {
    "qtd": 5,
    "valor": 395.50
  },
  "Felipe": {
    "qtd": 1,
    "valor": 45.00
  }
}`
    },
    'controle-cafe': {
      description: 'Retorna os dados do controle de café da manhã.',
      json: `[]`
    },
    'controle-cafe-no-show': {
      description: 'Retorna os dados de no-show do café da manhã.',
      json: `[]`
    },
    'history': {
        description: 'Este filtro não é acessível via API no momento.',
        json: `{ "message": "Endpoint não disponível." }`
    }
};

export default function ApiAccessSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiDomain, setApiDomain] = useState<string>('');

  // State for API query builder
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date()});
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodId | 'all'>('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [consumptionType, setConsumptionType] = useState('all');


  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiDomain(window.location.origin);
    }

    if (!authLoading) {
      if (userRole !== 'administrator') {
        toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
        router.push('/');
        return;
      }
      
      const loadSettings = async () => {
        setIsLoading(true);
        try {
          const storedConfig = await getSetting('apiAccessConfig');
          setApiKey(storedConfig?.apiKey || null);
        } catch (error) {
          console.error("Failed to load API key:", error);
          toast({ title: "Erro ao carregar chave de API", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
        const response = await fetch('/api/db-admin?action=regenerate-api-key', { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao gerar nova chave.');
        }
        const { apiKey: newApiKey } = await response.json();
        setApiKey(newApiKey);
        toast({ title: "Chave de API Gerada", description: "Sua nova chave de API foi gerada e salva com sucesso." });
    } catch (error) {
        toast({ title: "Erro ao Gerar Chave", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "O texto foi copiado para a área de transferência." });
  };

  const { exampleUrl, curlExample } = useMemo(() => {
    const baseUrl = `${apiDomain}/api/v1/reports`;
    const params = new URLSearchParams();
    params.set('filterType', filterType);

    switch(filterType) {
        case 'date':
            if (selectedDate) params.set('date', format(selectedDate, 'yyyy-MM-dd'));
            break;
        case 'range':
        case 'client-extract':
        case 'client-summary':
            if (selectedRange?.from) params.set('startDate', format(selectedRange.from, 'yyyy-MM-dd'));
            if (selectedRange?.to) params.set('endDate', format(selectedRange.to, 'yyyy-MM-dd'));
            if (filterType === 'client-extract' || filterType === 'client-summary') {
                params.set('consumptionType', consumptionType);
                if (filterType === 'client-extract' && selectedClient !== 'all') {
                    params.set('personName', selectedClient);
                }
            }
            break;
        case 'month':
        case 'period':
            params.set('month', format(selectedMonth, 'yyyy-MM'));
            if (filterType === 'period') params.set('periodId', selectedPeriod);
            break;
    }
    
    const url = `${baseUrl}?${params.toString()}`;
    const curl = `curl -X GET "${url}" \\\n-H "Authorization: Bearer ${apiKey || 'SUA_CHAVE_API'}"`;
    
    return { exampleUrl: url, curlExample: curl };
  }, [apiDomain, filterType, selectedDate, selectedRange, selectedMonth, selectedPeriod, consumptionType, selectedClient, apiKey]);
  
  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null; 
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Acesso via API</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sua Chave de API</CardTitle>
          <CardDescription>Use esta chave para autenticar suas requisições à API de relatórios. Mantenha-a segura.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {apiKey ? (
                <div className="flex items-center gap-2">
                    <Input 
                        type="text"
                        value={apiKey}
                        readOnly
                        className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(apiKey)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                 <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                    <AlertTitle>Nenhuma Chave de API Encontrada</AlertTitle>
                    <AlertDescription>
                        Você ainda não gerou uma chave de API. Clique no botão abaixo para criar sua primeira chave.
                    </AlertDescription>
                </Alert>
            )}
             <Button onClick={handleGenerateKey} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {apiKey ? "Gerar Nova Chave" : "Gerar Chave de API"}
            </Button>
             {apiKey && <p className="text-xs text-destructive">Gerar uma nova chave invalidará a chave atual permanentemente.</p>}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Como Usar a API</CardTitle>
            <CardDescription>Siga os passos abaixo para consultar os dados de relatórios de forma programática.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="domain-input" className="flex items-center gap-2 mb-1"><Globe className="h-4 w-4"/>Domínio da Aplicação</Label>
                <Input 
                    id="domain-input"
                    type="text"
                    value={apiDomain}
                    readOnly
                    className="text-muted-foreground"
                />
            </div>
             <div>
                <Label className="mb-1">Parâmetros de Query</Label>
                <p className="text-sm text-muted-foreground mb-2">
                   Monte a URL de requisição usando os seletores abaixo.
                </p>
                <div className="p-4 border rounded-md space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div className="space-y-1.5">
                            <Label htmlFor="filterType-select">Tipo de Filtro</Label>
                             <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                                <SelectTrigger id="filterType-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="month">Geral (Mês Inteiro)</SelectItem>
                                    <SelectItem value="date">Por Data Específica</SelectItem>
                                    <SelectItem value="range">Por Intervalo de Datas</SelectItem>
                                    <SelectItem value="period">Por Período (no Mês)</SelectItem>
                                    <SelectItem value="client-extract">Por Pessoa (Extrato)</SelectItem>
                                    <SelectItem value="client-summary">Por Pessoa (Resumo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {(filterType === 'month' || filterType === 'period') && (
                             <div className="space-y-1.5">
                                <Label>Mês/Ano</Label>
                                <Input type="month" value={format(selectedMonth, 'yyyy-MM')} onChange={(e) => setSelectedMonth(new Date(e.target.value + '-02'))} />
                            </div>
                        )}
                        
                        {filterType === 'date' && (
                            <div className="space-y-1.5">
                                <Label>Data</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Escolha uma data</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        )}

                         {(filterType === 'range' || filterType.startsWith('client')) && (
                             <div className="space-y-1.5">
                                <Label>Intervalo</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedRange && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedRange?.from ? (selectedRange.to ? `${format(selectedRange.from, "dd/MM/yy")} - ${format(selectedRange.to, "dd/MM/yy")}` : format(selectedRange.from, "dd/MM/yyyy")) : <span>Escolha um intervalo</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={selectedRange?.from} selected={selectedRange} onSelect={setSelectedRange} numberOfMonths={2} locale={ptBR}/></PopoverContent>
                                </Popover>
                            </div>
                        )}

                        {filterType === 'period' && (
                             <div className="space-y-1.5">
                                <Label>Período</Label>
                                <Select value={selectedPeriod} onValueChange={(value: PeriodId | 'all') => setSelectedPeriod(value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Períodos</SelectItem>
                                        {PERIOD_DEFINITIONS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {(filterType === 'client-extract' || filterType === 'client-summary') && (
                            <div className="space-y-1.5">
                                <Label>Tipo de Consumo</Label>
                                <Select value={consumptionType} onValueChange={setConsumptionType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    </div>
                </div>
            </div>
            <div>
                <Label className="flex items-center gap-2 mb-1"><Server className="h-4 w-4"/>Endpoint da API</Label>
                <div className="flex items-center gap-2">
                    <Input readOnly value={`GET ${exampleUrl}`} className="font-mono text-xs"/>
                    <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(exampleUrl)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
             <div>
                <Label className="mb-1">Autenticação</Label>
                <p className="text-sm text-muted-foreground mb-2">
                    Inclua sua chave no cabeçalho (header) `Authorization` como um Bearer token.
                </p>
                <CodeBlock code={`Authorization: Bearer ${apiKey || 'SUA_CHAVE_API'}`} />
            </div>
             <div>
                <Label className="mb-1">Exemplo de Requisição (cURL)</Label>
                <div className="flex items-center gap-2">
                    <Input readOnly value={curlExample} className="font-mono text-xs"/>
                     <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(curlExample)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div>
                <Label className="mb-1">Exemplo de Saída (JSON)</Label>
                 <p className="text-sm text-muted-foreground mb-2">
                    {exampleApiResponseByFilter[filterType]?.description || "Selecione um filtro para ver um exemplo."}
                </p>
                <CodeBlock code={exampleApiResponseByFilter[filterType]?.json || "{}"} />
            </div>
        </CardContent>
      </Card>
      
    </div>
  );
}

    