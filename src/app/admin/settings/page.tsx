
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SettingsIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminSettingsHubPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading && userRole !== 'administrator') {
      router.push('/');
    }
  }, [userRole, authLoading, router]);

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null; 
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
             <SettingsIcon className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo às Configurações</CardTitle>
          <CardDescription>
            Selecione uma categoria no menu à esquerda para começar a gerenciar as configurações do aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aqui você pode controlar a visibilidade dos itens, definir preços, configurar o banco de dados e muito mais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
