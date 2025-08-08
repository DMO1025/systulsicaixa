
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Save, Database, Wifi, TableProperties, Loader2, ArrowLeft } from 'lucide-react'; 
import type { MysqlConnectionConfig } from '@/lib/types';
import { getSetting, saveSetting } from '@/services/settingsService';

export default function DatabaseSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [mysqlConfig, setMysqlConfig] = useState<MysqlConnectionConfig>({
    host: '', port: 3306, user: '', password: '', database: ''
  });
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isEnsuringTable, setIsEnsuringTable] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (userRole !== 'administrator') {
        toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
        router.push('/');
        return;
      }
      
      const loadSettings = async () => {
        setIsLoadingPage(true);
        try {
          const storedMysqlConfig = await getSetting('mysqlConnectionConfig');
          if (storedMysqlConfig) {
            setMysqlConfig(prev => ({...prev, ...storedMysqlConfig}));
          }
        } catch (error) {
          console.error("Failed to load MySQL config:", error);
          toast({ title: "Erro ao carregar configuração", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleMysqlConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMysqlConfig(prev => ({
      ...prev,
      [name]: name === 'port' ? (value === '' ? undefined : parseInt(value, 10)) : value
    }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await saveSetting('mysqlConnectionConfig', mysqlConfig);
      toast({ title: "Configuração Salva", description: "A configuração do banco de dados MySQL foi salva." });
    } catch (error) {
      console.error("Failed to save MySQL config:", error);
      toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/db-admin?action=test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mysqlConfig) 
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Falha ao testar conexão.');
      toast({ title: "Teste de Conexão", description: result.message });
    } catch (error: any) {
      toast({ title: "Erro no Teste de Conexão", description: error.message, variant: "destructive" });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleEnsureTable = async () => {
    setIsEnsuringTable(true);
    try {
      const response = await fetch('/api/db-admin?action=ensure-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mysqlConfig)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Falha ao criar/verificar tabela.');
      toast({ title: "Tabela de Lançamentos", description: result.message });
    } catch (error: any) {
      toast({ title: "Erro na Tabela", description: error.message, variant: "destructive" });
    } finally {
      setIsEnsuringTable(false);
    }
  };

  if (authLoading || isLoadingPage) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null; 
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configuração do Banco de Dados MySQL</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Conexão MySQL</CardTitle>
          <CardDescription>Insira os detalhes para conectar ao seu servidor MySQL. Os lançamentos serão salvos no banco se a conexão for bem-sucedida; caso contrário, localmente (JSON).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="mysql-host">Host</Label>
              <Input id="mysql-host" name="host" value={mysqlConfig.host || ''} onChange={handleMysqlConfigChange} placeholder="localhost" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mysql-port">Porta</Label>
              <Input id="mysql-port" name="port" type="text" value={mysqlConfig.port || ''} onChange={handleMysqlConfigChange} placeholder="3306" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mysql-user">Usuário</Label>
              <Input id="mysql-user" name="user" value={mysqlConfig.user || ''} onChange={handleMysqlConfigChange} placeholder="root" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mysql-password">Senha</Label>
              <Input id="mysql-password" name="password" type="password" value={mysqlConfig.password || ''} onChange={handleMysqlConfigChange} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="mysql-database">Nome do Banco</Label>
              <Input id="mysql-database" name="database" value={mysqlConfig.database || ''} onChange={handleMysqlConfigChange} placeholder="entryflow_db" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={handleTestConnection} variant="outline" disabled={isTestingConnection || isSaving}>
              {isTestingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
              Testar Conexão
            </Button>
            <Button onClick={handleEnsureTable} variant="outline" disabled={isEnsuringTable || isSaving}>
              {isEnsuringTable ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TableProperties className="mr-2 h-4 w-4" />}
              Criar/Verificar Tabela
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Button onClick={handleSaveChanges} className="mt-4" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Configuração do Banco
      </Button>
    </div>
  );
}
