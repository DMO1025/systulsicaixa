
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Loader2, ArrowLeft } from 'lucide-react'; 

export default function MigrationPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isMigratingData, setIsMigratingData] = useState(false);

  useEffect(() => {
    if (!authLoading && userRole !== 'administrator') {
      toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      router.push('/');
    }
  }, [userRole, authLoading, router, toast]);
  
  const handleMigrateData = async () => {
    setIsMigratingData(true);
    try {
      const response = await fetch('/api/db-admin?action=migrate-json-to-mysql', {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        const defaultMessage = 'Falha ao migrar dados. Verifique a conexão com o banco e se a tabela existe.';
        let description = result.message || defaultMessage;
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
            description += ` Detalhes: ${result.errors.join('; ')}`;
        }
        toast({ title: "Erro na Migração", description: description, variant: "destructive", duration: 10000 });
      } else {
        toast({ title: "Migração de Dados", description: result.message, duration: 7000 });
      }
    } catch (error: any) {
      toast({ title: "Erro na Migração", description: error.message || "Ocorreu um erro inesperado.", variant: "destructive", duration: 10000 });
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
          <CardTitle>Migrar Dados do JSON para MySQL</CardTitle>
          <CardDescription>
            Use esta função para transferir todos os dados (lançamentos, usuários, configurações) salvos localmente (em formato JSON) para o banco de dados MySQL configurado. 
            Certifique-se de que a conexão com o MySQL está ativa e as tabelas foram criadas antes de iniciar a migração. 
            Registros existentes no banco de dados serão atualizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleMigrateData} disabled={isMigratingData} className="w-full sm:w-auto">
            {isMigratingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
            Iniciar Migração Completa
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
