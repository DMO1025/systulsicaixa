
"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from '@/hooks/use-toast';
import { Upload, FileUp, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { PERIOD_DEFINITIONS } from '@/lib/constants';
import type { PeriodId } from '@/lib/constants';

interface ErrorDetail {
    sheetName: string;
    rowIndex: number;
    rowData: any[];
    headers: string[];
    message: string;
}

interface ImportResult {
    success: boolean;
    message: string;
    processed?: number;
    errors?: ErrorDetail[];
}

export default function DataImportPage() {
    const { toast } = useToast();
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodId | ''>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
            setImportResult(null); // Clear previous results
        }
    };
    
    const handleUpload = async () => {
        if (!selectedPeriod) {
            toast({ title: "Período não selecionado", description: "Por favor, selecione o período para qual o arquivo se refere.", variant: "destructive" });
            return;
        }
        if (!selectedFile) {
            toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um arquivo Excel (.xlsx) para importar.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('periodId', selectedPeriod);

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData,
            });
            
            const resultData: ImportResult = await response.json();
            setImportResult(resultData);

            if (!response.ok) {
                 toast({ title: "Erro na Importação", description: resultData.message, variant: "destructive", duration: 7000 });
            } else {
                 toast({ title: "Importação Concluída", description: resultData.message, duration: 7000 });
            }
        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message : "Um erro inesperado ocorreu.";
            setImportResult({ success: false, message: errorMessage });
            toast({ title: "Erro Inesperado", description: errorMessage, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadErrorFile = () => {
        if (!importResult || !importResult.errors || importResult.errors.length === 0) return;

        const wb = XLSX.utils.book_new();
        const errorsBySheet: { [sheetName: string]: ErrorDetail[] } = {};

        // Group errors by sheet name
        importResult.errors.forEach(err => {
            if (!errorsBySheet[err.sheetName]) {
                errorsBySheet[err.sheetName] = [];
            }
            errorsBySheet[err.sheetName].push(err);
        });

        // Create a sheet for each group
        for (const sheetName in errorsBySheet) {
            const sheetErrors = errorsBySheet[sheetName];
            if (sheetErrors.length === 0) continue;

            const headers = [...sheetErrors[0].headers, "Erro"]; // Get headers from first error of the sheet
            const rows = sheetErrors.map(err => [...(Array.isArray(err.rowData) ? err.rowData : []), err.message]);
            
            const dataForSheet = [headers, ...rows];
            
            const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
        
        const fileName = selectedFile ? `Erros_${selectedFile.name}` : 'Planilha_de_Erros.xlsx';
        XLSX.writeFile(wb, fileName);
    };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Upload className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Importação de Dados</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Enviar Arquivo de Lançamentos</CardTitle>
          <CardDescription>
            Selecione o período, escolha o arquivo Excel (.xlsx) preenchido e clique em 'Enviar Arquivo'.
            Os dados serão mesclados com os lançamentos existentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="period-select">1. Selecione o Período</Label>
                    <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodId)}>
                        <SelectTrigger id="period-select">
                            <SelectValue placeholder="Escolha um período..." />
                        </SelectTrigger>
                        <SelectContent>
                            {PERIOD_DEFINITIONS.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="file-upload">2. Escolha o Arquivo</Label>
                    <Input id="file-upload" type="file" accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} />
                </div>
            </div>
            <Button onClick={handleUpload} disabled={isLoading || !selectedFile || !selectedPeriod} className="mt-4 w-full sm:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Enviar Arquivo
            </Button>
        </CardContent>
      </Card>
      
      {importResult && (
        <Card>
            <CardHeader>
                <CardTitle>Resultado da Importação</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant={importResult.success ? "default" : "destructive"} className={importResult.success ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""}>
                    {importResult.success ? <CheckCircle2 className="h-4 w-4"/> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>{importResult.success ? "Sucesso" : "Falha"}</AlertTitle>
                    <AlertDescription>
                        <p>{importResult.message}</p>
                        {typeof importResult.processed === 'number' && <p>Linhas processadas: {importResult.processed}</p>}
                         {importResult.errors && importResult.errors.length > 0 && (
                            <div className="mt-2">
                                <h4 className="font-semibold">Detalhes dos Erros:</h4>
                                <ul className="list-disc list-inside text-xs max-h-40 overflow-y-auto">
                                    {importResult.errors.map((err, i) => <li key={i}>{`Aba '${err.sheetName}', Linha ${err.rowIndex}: ${err.message}`}</li>)}
                                </ul>
                                <Button variant="outline" size="sm" onClick={handleDownloadErrorFile} className="mt-4">
                                    <Download className="mr-2 h-4 w-4" />
                                    Baixar Planilha com Erros
                                </Button>
                            </div>
                        )}
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
      )}

    </div>
  );
}
