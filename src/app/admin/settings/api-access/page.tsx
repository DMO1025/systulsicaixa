
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, RefreshCw, Copy, Server, Globe, Calendar as CalendarIcon, Wand2, CheckCircle, BarChartHorizontal, Calendar, Users, FileText, FileClock, ChevronRight, Refrigerator, Coffee, Undo2, UserX, ListFilter } from 'lucide-react';
import { getSetting } from '@/services/settingsService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import type { PeriodId, FilterType, DateRange } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

const CodeBlock = ({ code, className, wrap = false }: { code: string, className?: string, wrap?: boolean }) => {
    const { toast } = useToast();
    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado!", description: "O código foi copiado para a área de transferência." });
    };
    return (
        <div className={cn("relative", className)}>
            <pre className={cn(
                "p-4 rounded-md bg-muted text-muted-foreground text-xs max-h-[400px]",
                wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto"
            )}>
                <code>{code}</code>
            </pre>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => handleCopyToClipboard(code)}>
                <Copy className="h-4 w-4" />
            </Button>
        </div>
    );
};

const filterOptions = [
    { value: 'range', label: 'Geral (por Intervalo)', icon: BarChartHorizontal, description: 'Retorna um resumo geral para um intervalo de datas personalizado.' },
    { value: 'period', label: 'Por Período (no Mês)', icon: ListFilter, description: 'Retorna os dados detalhados para um período específico dentro de um mês.' },
    { value: 'client-extract', label: 'Por Pessoa (Extrato)', icon: Users, description: 'Retorna uma lista detalhada de transações (faturado/C.I.) por pessoa.' },
    { value: 'client-summary', label: 'Por Pessoa (Resumo)', icon: FileText, description: 'Retorna um resumo consolidado do total consumido por pessoa.' },
    { value: 'controle-cafe', label: 'Controle Café (Presença)', icon: Coffee, description: 'Retorna os registros de contagem de pessoas no café da manhã.' },
    { value: 'controle-cafe-no-show', label: 'Controle Café (No-Show)', icon: UserX, description: 'Retorna os registros de no-show do café da manhã.' },
    { value: 'controle-frigobar', label: 'Controle Frigobar', icon: Refrigerator, description: 'Retorna todos os logs de consumo de frigobar no período.' },
    { value: 'estornos', label: 'Relatório de Estornos', icon: Undo2, description: 'Retorna todos os estornos registrados no período.' },
];

const PARAMETERS_CONFIG: Record<string, { key: string, type: string, description: string, example: string }[]> = {
    range: [
        { key: 'filterType', type: 'string', description: 'Tipo de filtro.', example: 'range' },
        { key: 'startDate', type: 'string', description: 'Data de início do intervalo.', example: format(startOfMonth(new Date()), 'yyyy-MM-dd') },
        { key: 'endDate', type: 'string', description: 'Data final do intervalo (opcional).', example: format(new Date(), 'yyyy-MM-dd') },
    ],
     period: [
        { key: 'filterType', type: 'string', description: 'Tipo de filtro.', example: 'period' },
        { key: 'month', type: 'string', description: 'Mês do relatório no formato AAAA-MM.', example: format(new Date(), 'yyyy-MM') },
        { key: 'periodId', type: 'string', description: 'ID do período a ser filtrado (veja lista abaixo).', example: 'almocoPrimeiroTurno' },
    ],
    'client-extract': [
        { key: 'filterType', type: 'string', description: 'Tipo de filtro.', example: 'client-extract' },
        { key: 'startDate', type: 'string', description: 'Data de início.', example: format(startOfMonth(new Date()), 'yyyy-MM-dd') },
        { key: 'endDate', type: 'string', description: 'Data final (opcional).', example: format(new Date(), 'yyyy-MM-dd') },
        { key: 'consumptionType', type: 'string', description: 'Tipo de consumo (all, ci, faturado-all, etc.).', example: 'all' },
        { key: 'personName', type: 'string', description: 'Nome específico da pessoa (opcional).', example: 'Demetrios' },
    ],
    'client-summary': [
        { key: 'filterType', type: 'string', description: 'Tipo de filtro.', example: 'client-summary' },
        { key: 'startDate', type: 'string', description: 'Data de início.', example: format(startOfMonth(new Date()), 'yyyy-MM-dd') },
        { key: 'endDate', type: 'string', description: 'Data final (opcional).', example: format(new Date(), 'yyyy-MM-dd') },
        { key: 'consumptionType', type: 'string', description: 'Tipo de consumo (all, ci, faturado-all, etc.).', example: 'all' },
    ],
    'controle-cafe': [
        { key: 'filterType', type: 'string', description: 'Tipo de filtro.', example: 'controle-cafe' },
        { key: 'startDate', type: 'string', description: 'Data de início do intervalo.', example: format(startOfMonth(new Date()), 'yyyy-MM-dd') },
        { key: 'endDate', type: 'string', description: 'Data final do intervalo (opcional).', example: format(new Date(), 'yyyy-MM-dd') },
    ],
    'controle-cafe-no-show': [
        { key: 'filterType', type: 'string', description: 'Tipo de filtro.', example: 'controle-cafe-no-show' },
        { key: 'startDate', type: 'string', description: 'Data de início do intervalo.', example: format(startOfMonth(new Date()), 'yyyy-MM-dd') },
        { key: 'endDate', type: 'string', description: 'Data final do intervalo (opcional).', example: format(new Date(), 'yyyy-MM-dd') },
    ],
    'estornos': [
        { key: 'filterType', type: 'string', description: 'Tipo de filtro.', example: 'estornos' },
        { key: 'startDate', type: 'string', description: 'Data de início do intervalo.', example: format(startOfMonth(new Date()), 'yyyy-MM-dd') },
        { key: 'endDate', type: 'string', description: 'Data final do intervalo (opcional).', example: format(new Date(), 'yyyy-MM-dd') },
        { key: 'category', type: 'string', description: 'Categoria do estorno (restaurante, frigobar, etc.).', example: 'all' },
    ],
    'controle-frigobar': [
        { key: 'filterType', type: 'string', description: 'Tipo de filtro.', example: 'controle-frigobar' },
        { key: 'startDate', type: 'string', description: 'Data de início do intervalo.', example: format(startOfMonth(new Date()), 'yyyy-MM-dd') },
        { key: 'endDate', type: 'string', description: 'Data final do intervalo (opcional).', example: format(new Date(), 'yyyy-MM-dd') },
    ],
    'history': { key: '', type: '', description: '', example: '' } as any,
};

const exampleApiResponseByFilter: Record<string, string> = {
    range: `{
  "type": "general",
  "data": { "dailyBreakdowns": [...], "summary": {...} }
}`,
    period: `{
  "type": "period",
  "data": { "dailyBreakdowns": {...}, "summary": {...} }
}`,
    'client-extract': `{
  "type": "client-extract",
  "data": {
    "availablePeople": ["Demetrios", "Outra Pessoa"],
    "dailyBreakdowns": [
      {
        "personName": "Demetrios",
        "date": "05/07/2024",
        "origin": "Faturado - Hotel",
        "value": 75.50,
        "...": "outros campos"
      }
    ]
  }
}`,
    'client-summary': `{
  "type": "client-summary",
  "data": {
    "dailyBreakdowns": [
      { "personName": "Demetrios", "qtd": 5, "valor": 395.50 }
    ]
  }
}`,
    'controle-cafe': `{
  "type": "controle-cafe",
  "data": {
    "dailyBreakdowns": [
      { "id": "2024-07-01", "controleCafeDaManha": { "adultoQtd": 50 } }
    ]
  }
}`,
    'controle-cafe-no-show': `{
  "type": "controle-cafe-no-show",
  "data": {
    "dailyBreakdowns": [
      { "id": "2024-07-01", "cafeManhaNoShow": { "items": [...] } }
    ]
  }
}`,
    'estornos': `{
  "type": "estornos",
  "data": {
    "dailyBreakdowns": [
      { "id": "uuid-...", "date": "2024-07-01", "reason": "duplicidade", "valorEstorno": -50.00 }
    ]
  }
}`,
    'controle-frigobar': `{
  "type": "controle-frigobar",
  "data": {
    "dailyBreakdowns": [
      { "id": "uuid-...", "uh": "101", "items": { "Agua sem Gas": 2 }, "totalValue": 25.50 }
    ]
  }
}`,
    'history': `{ "message": "Endpoint não disponível." }`,
};

const periodIdsForApi = PERIOD_DEFINITIONS
    .filter(p => p.type === 'entry')
    .map(p => ({ id: p.id, label: p.label }));


export default function ApiAccessSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiDomain, setApiDomain] = useState<string>('');

  const [activeFilterType, setActiveFilterType] = useState<string>('range');
  
  const activeFilterInfo = filterOptions.find(f => f.value === activeFilterType);
  const activeParams = PARAMETERS_CONFIG[activeFilterType] || [];

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

  const { curlExample, fullUrl } = useMemo(() => {
    const baseUrl = `${apiDomain}/api/v2/reports`;
    const params = new URLSearchParams();
    
    (PARAMETERS_CONFIG[activeFilterType] || []).forEach(param => {
        params.set(param.key, param.example);
    });
    
    const url = `${baseUrl}?${params.toString()}`;
    const curl = `curl -X GET "${url}" \\\
\n-H "Authorization: Bearer ${apiKey || 'SUA_CHAVE_API'}"`;
    
    return { curlExample: curl, fullUrl: url };
  }, [apiDomain, activeFilterType, apiKey]);
  
  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null; 
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
             <KeyRound className="h-6 w-6 text-primary" />
            <CardTitle>Sua Chave de API (v2)</CardTitle>
          </div>
          <CardDescription>Use esta chave para autenticar suas requisições à API de relatórios. Mantenha-a segura.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {apiKey ? (
                <div className="flex items-center gap-2 max-w-lg">
                    <Input type="text" value={apiKey} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(apiKey)}><Copy className="h-4 w-4" /></Button>
                </div>
            ) : (
                 <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                    <AlertTitle>Nenhuma Chave de API Encontrada</AlertTitle>
                    <AlertDescription>Você ainda não gerou uma chave de API. Clique no botão abaixo para criar sua primeira chave.</AlertDescription>
                </Alert>
            )}
             <Button onClick={handleGenerateKey} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {apiKey ? "Gerar Nova Chave" : "Gerar Chave de API"}
            </Button>
             {apiKey && <p className="text-xs text-destructive">Gerar uma nova chave invalidará a chave atual permanentemente.</p>}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Endpoints</h3>
            <div className="space-y-1">
                {filterOptions.map(option => (
                    <button 
                        key={option.value}
                        onClick={() => setActiveFilterType(option.value)}
                        className={cn(
                            "w-full text-left flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            activeFilterType === option.value 
                                ? "bg-primary/10 text-primary" 
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <option.icon className="h-5 w-5" />
                        <span>{option.label}</span>
                         <ChevronRight className={cn(
                            "ml-auto h-4 w-4 transition-opacity",
                            activeFilterType === option.value ? "opacity-100" : "opacity-0"
                         )} />
                    </button>
                ))}
            </div>
        </aside>

        <main className="lg:col-span-9">
            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-bold">{activeFilterInfo?.label}</h2>
                    <p className="text-muted-foreground mt-1">{activeFilterInfo?.description}</p>
                    
                    <div className="mt-4 space-y-4">
                       <div>
                            <Label>Exemplo (cURL)</Label>
                            <CodeBlock code={curlExample} className="mt-1"/>
                        </div>
                        <div>
                            <Label>Endpoint</Label>
                            <div className="flex items-start gap-2 mt-1">
                               <div className="flex-grow">
                                 <CodeBlock code={fullUrl} wrap={true} />
                               </div>
                               <Button asChild variant="outline" size="icon">
                                 <Link href={fullUrl} target="_blank" rel="noopener noreferrer">
                                   <Globe className="h-4 w-4" />
                                 </Link>
                               </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">Parâmetros da Requisição</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Parâmetro</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Descrição</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeParams.map(param => (
                                    <TableRow key={param.key}>
                                        <TableCell className="font-mono text-xs">{param.key}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{param.type}</TableCell>
                                        <TableCell className="text-xs">{param.description}</TableCell>
                                    </TableRow>
                                ))}
                                 {activeParams.length === 0 && (
                                     <TableRow>
                                        <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">Nenhum parâmetro necessário para este endpoint.</TableCell>
                                    </TableRow>
                                 )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                 {activeFilterType === 'period' && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">IDs de Período Disponíveis (`periodId`)</h3>
                         <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID do Período</TableHead>
                                        <TableHead>Nome</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {periodIdsForApi.map(period => (
                                        <TableRow key={period.id}>
                                            <TableCell className="font-mono text-xs">{period.id}</TableCell>
                                            <TableCell className="text-xs">{period.label}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-semibold mb-2">Exemplo de Resposta (JSON)</h3>
                    <CodeBlock code={exampleApiResponseByFilter[activeFilterType] || "{}"} wrap={true} />
                </div>
            </div>
        </main>
      </div>

    </div>
  );
}
