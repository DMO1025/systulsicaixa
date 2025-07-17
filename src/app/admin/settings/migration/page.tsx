
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Loader2, CheckCircle, AlertCircle, DatabaseZap } from 'lucide-react'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ActionResult {
    message: string;
    log?: string[];
    success: boolean;
}

export default function MigrationPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isMigratingData, setIsMigratingData] = useState(false);
  const [migrationResult, setMigrationResult] = useState<ActionResult | null>(null);
  
  const [isUpdatingStructure, setIsUpdatingStructure] = useState(false);
  const [updateResult, setUpdateResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    if (!authLoading && userRole !== 'administrator') {
      toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      router.push('/');
    }
  }, [userRole, authLoading, router, toast]);

  const handleUpdateStructure = async () => {
    setIsUpdatingStructure(true);
    setUpdateResult(null);
    try {
      const response = await fetch('/api/db-admin?action=update-mysql-structure', { method: 'POST' });
      const result = await response.json();
      setUpdateResult({ ...result, success: response.ok });
      if (!response.ok) {
        toast({ title: "Erro na Atualização", description: result.message, variant: "destructive", duration: 10000 });
      } else {
        toast({ title: "Estrutura Atualizada", description: result.message, duration: 7000 });
      }
    } catch (error: any) {
       const message = error.message || "Ocorreu um erro inesperado.";
      setUpdateResult({ message, log: [ "Erro de conexão com o servidor:", message], success: false });
      toast({ title: "Erro na Atualização", description: message, variant: "destructive", duration: 10000 });
    } finally {
        setIsUpdatingStructure(false);
    }
  };
  
  const handleMigrateData = async () => {
    setIsMigratingData(true);
    setMigrationResult(null);
    try {
      const response = await fetch('/api/db-admin?action=migrate-json-to-mysql', { method: 'POST' });
      const result = await response.json();
      setMigrationResult({ ...result, success: response.ok });
      if (!response.ok) {
        toast({ title: "Erro na Migração", description: result.message, variant: "destructive", duration: 10000 });
      } else {
        toast({ title: "Migração de Dados", description: result.message, duration: 7000 });
      }
    } catch (error: any) {
      const message = error.message || "Ocorreu um erro inesperado.";
      setMigrationResult({ message: message, log: [ "Erro de conexão com o servidor:", message], success: false });
      toast({ title: "Erro na Migração", description: message, variant: "destructive", duration: 10000 });
    } finally {
      setIsMigratingData(false);
    }
  };

  const renderResult = (result: ActionResult | null) => {
    if (!result) return null;
    return (
        <div className="mt-4">
            <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""}>
                {result.success ? <CheckCircle className="h-4 w-4"/> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{result.success ? "Sucesso" : "Falha"}</AlertTitle>
                <AlertDescription>
                    <p>{result.message}</p>
                </AlertDescription>
            </Alert>
            
            {result.log && result.log.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Log de Execução:</h4>
                <div className="bg-muted p-3 rounded-md text-xs font-mono h-64 overflow-y-auto">
                  {result.log.map((line, index) => (
                    <p key={index} className="whitespace-pre-wrap">{line}</p>
                  ))}
                </div>
              </div>
            )}
        </div>
    );
  };


  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null; 
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Ferramentas de Banco de Dados</h1>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Atualizar Estrutura de Lançamentos no MySQL</CardTitle>
          <CardDescription>
            Use esta função para corrigir a estrutura de dados de lançamentos já existentes no MySQL. Isso irá separar a antiga aba "C.I. & Faturados" em "Faturado" e "Consumo Interno" e mover os dados do "Frigobar" para seus respectivos turnos. Execute esta função se o dashboard ou relatórios estiverem exibindo valores incorretos para dados antigos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleUpdateStructure} disabled={isUpdatingStructure} className="w-full sm:w-auto">
            {isUpdatingStructure ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
            Atualizar Estrutura no MySQL
          </Button>
          {renderResult(updateResult)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Migrar Lançamentos do Arquivo Local (JSON) para MySQL</CardTitle>
          <CardDescription>
            Use esta função para transferir todos os lançamentos que foram salvos localmente para o banco de dados MySQL. 
            Certifique-se de que a conexão com o MySQL está ativa. Registros com a mesma data no banco serão atualizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleMigrateData} disabled={isMigratingData} className="w-full sm:w-auto">
            {isMigratingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
            Iniciar Migração Completa
          </Button>
           {renderResult(migrationResult)}
        </CardContent>
      </Card>

    </div>
  );
}

