
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Building, Trash2, PlusCircle } from 'lucide-react';
import { getSetting, saveSetting } from '@/services/settingsService';
import { v4 as uuidv4 } from 'uuid';
import type { Company } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';

export default function CompaniesSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
          const storedCompanies = await getSetting('companies');
          setCompanies(Array.isArray(storedCompanies) ? storedCompanies : []);
        } catch (error) {
          toast({ title: "Erro ao carregar empresas", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleAddCompany = () => {
    const newCompany: Company = {
      id: uuidv4(),
      name: `Nova Empresa ${companies.length + 1}`,
      cnpj: '',
      bankName: '',
      agency: '',
      account: '',
    };
    setCompanies(prev => [...prev, newCompany]);
  };

  const handleRemoveCompany = (companyId: string) => {
    setCompanies(prev => prev.filter(c => c.id !== companyId));
  };
  
  const handleCompanyChange = (companyId: string, field: keyof Omit<Company, 'id'>, value: string) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, [field]: value } : c));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const validCompanies = companies.filter(c => c && c.id && c.name.trim() !== '');
      await saveSetting('companies', validCompanies);
      toast({ title: "Empresas Salvas", description: "A lista de empresas foi salva com sucesso." });
    } catch (error) {
      toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
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
        <Building className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Cadastro de Empresas</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Empresas</CardTitle>
          <CardDescription>Adicione, edite ou remova as empresas que podem ser selecionadas nos relatórios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button onClick={handleAddCompany} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Empresa
            </Button>
            
            <Accordion type="multiple" className="w-full space-y-3">
              {companies.map((company, index) => (
                <AccordionItem value={company.id} key={company.id} className="border rounded-lg bg-background">
                    <div className="flex items-center justify-between w-full px-4 py-1">
                      <AccordionTrigger className="text-base font-semibold hover:no-underline py-3 flex-1">
                          <span>{company.name || `Empresa ${index + 1}`}</span>
                      </AccordionTrigger>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveCompany(company.id)}>
                          <Trash2 className="h-4 w-4 text-destructive"/>
                      </Button>
                    </div>
                  <AccordionContent className="px-4 pt-0 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-1.5">
                        <Label>Nome da Empresa</Label>
                        <Input value={company.name} onChange={(e) => handleCompanyChange(company.id, 'name', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>CNPJ</Label>
                        <Input value={company.cnpj || ''} onChange={(e) => handleCompanyChange(company.id, 'cnpj', e.target.value)} />
                      </div>
                       <div className="space-y-1.5">
                        <Label>Banco</Label>
                        <Input value={company.bankName || ''} onChange={(e) => handleCompanyChange(company.id, 'bankName', e.target.value)} />
                      </div>
                       <div className="space-y-1.5">
                        <Label>Agência</Label>
                        <Input value={company.agency || ''} onChange={(e) => handleCompanyChange(company.id, 'agency', e.target.value)} />
                      </div>
                       <div className="space-y-1.5 md:col-span-2">
                        <Label>Conta Corrente</Label>
                        <Input value={company.account || ''} onChange={(e) => handleCompanyChange(company.id, 'account', e.target.value)} />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
        </CardContent>
      </Card>
      
      <Button onClick={handleSaveChanges} className="mt-4" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Alterações
      </Button>
    </div>
  );
}
