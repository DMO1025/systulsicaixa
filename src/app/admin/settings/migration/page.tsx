
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MigrationPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isMigratingData, setIsMigratingData] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ message: string; log?: string[]; success: boolean } | null>(null);

  useEffect(() => {
    if (!authLoading && userRole !== 'administrator') {
      toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      router.push('/');
    }
  }, [userRole, authLoading, router, toast]);
  
  const handleMigrateData = async () => {
    setIsMigratingData(true);
    setMigrationResult(null);
    try {
      const response = await fetch('/api/db-admin?action=migrate-json-to-mysql', {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        setMigrationResult({ message: result.message || 'Falha na migração.', log: result.log, success: false });
        toast({ title: "Erro na Migração", description: result.message, variant: "destructive", duration: 10000 });
      } else {
        setMigrationResult({ message: result.message, log: result.log, success: true });
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
        <h1 className="text-2xl font-bold">Migração de Dados</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Migrar Lançamentos do JSON para MySQL</CardTitle>
          <CardDescription>
            Use esta função para transferir todos os lançamentos diários que foram salvos localmente (em formato JSON) para o banco de dados MySQL configurado. 
            Certifique-se de que a conexão com o MySQL está ativa e a tabela 'daily_entries' foi criada antes de iniciar a migração. 
            Registros com o mesmo ID (data) no banco de dados serão atualizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleMigrateData} disabled={isMigratingData} className="w-full sm:w-auto">
            {isMigratingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
            Iniciar Migração de Lançamentos
          </Button>
        </CardContent>
      </Card>

      {migrationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Migração</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant={migrationResult.success ? "default" : "destructive"} className={migrationResult.success ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""}>
                {migrationResult.success ? <CheckCircle className="h-4 w-4"/> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{migrationResult.success ? "Sucesso" : "Falha"}</AlertTitle>
                <AlertDescription>
                    <p>{migrationResult.message}</p>
                </AlertDescription>
            </Alert>
            
            {migrationResult.log && migrationResult.log.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Log de Execução:</h4>
                <div className="bg-muted p-3 rounded-md text-xs font-mono h-64 overflow-y-auto">
                  {migrationResult.log.map((line, index) => (
                    <p key={index} className="whitespace-pre-wrap">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
