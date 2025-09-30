

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Refrigerator, Trash2, PlusCircle, DollarSign } from 'lucide-react'; 
import { getSetting, saveSetting } from '@/services/settingsService';
import { v4 as uuidv4 } from 'uuid';
import type { FrigobarItem, FrigobarItemCategory } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';


export default function FrigobarItemsSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [items, setItems] = useState<FrigobarItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number | undefined>(undefined);
  const [newItemCategory, setNewItemCategory] = useState<FrigobarItemCategory>('bebida');
  
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
          const storedItems = await getSetting('frigobarItems');
          if (Array.isArray(storedItems)) {
            // Ensure all items have a default category if they don't have one
            const itemsWithCategory = storedItems.map(item => ({
              ...item,
              category: item.category || 'bebida' 
            }));
            setItems(itemsWithCategory);
          } else {
            setItems([]);
          }
        } catch (error) {
          console.error("Failed to load frigobar items:", error);
          toast({ title: "Erro ao carregar itens", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleAddItem = () => {
    if (!newItemName.trim()) {
        toast({ title: "Nome Inválido", description: "O nome do item não pode estar em branco.", variant: "destructive"});
        return;
    }
    const price = newItemPrice;
    if (price === undefined || isNaN(price)) {
         toast({ title: "Preço Inválido", description: "Por favor, insira um preço válido.", variant: "destructive"});
        return;
    }
    setItems(prev => [...(Array.isArray(prev) ? prev : []), { id: uuidv4(), name: newItemName.trim(), price, category: newItemCategory }]);
    setNewItemName('');
    setNewItemPrice(undefined);
    setNewItemCategory('bebida');
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(c => c.id !== itemId));
  };
  
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const validItems = items.filter(c => c && c.id && c.name && c.name.trim() !== '' && typeof c.price === 'number' && c.category);
      await saveSetting('frigobarItems', validItems);
      toast({ title: "Itens Salvos", description: "A lista de itens do frigobar foi salva com sucesso." });
    } catch (error) {
      console.error("Failed to save frigobar items:", error);
      toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePriceChange = (id: string, newPrice: number | undefined) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, price: newPrice === undefined ? 0 : newPrice } : item
      )
    );
  };
  
  const handleCategoryChange = (id: string, newCategory: FrigobarItemCategory) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, category: newCategory } : item
      )
    );
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
        <Refrigerator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Itens de Frigobar</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Item</CardTitle>
          <CardDescription>Adicione produtos e seus respectivos preços e categorias à lista do frigobar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1">
                <label className="text-sm font-medium">Nome do Item</label>
                <Input 
                    type="text"
                    placeholder="Ex: Coca-Cola"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                />
            </div>
            <div className="w-full sm:w-32">
                <label className="text-sm font-medium">Preço</label>
                <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <CurrencyInput 
                        placeholder="Preço"
                        value={newItemPrice}
                        onValueChange={setNewItemPrice}
                        className="pl-8"
                    />
                </div>
            </div>
             <div className="w-full sm:w-40">
                <label className="text-sm font-medium">Categoria</label>
                 <Select value={newItemCategory} onValueChange={(value: FrigobarItemCategory) => setNewItemCategory(value)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="bebida">Bebida</SelectItem>
                        <SelectItem value="comida">Comida</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleAddItem} className="w-full sm:w-auto mt-4 sm:mt-0">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar
            </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Lista de Itens Cadastrados</CardTitle>
            <CardDescription>Gerencie os itens, preços e categorias do frigobar. Lembre-se de salvar as alterações.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome do Item</TableHead>
                            <TableHead className="w-[180px]">Categoria</TableHead>
                            <TableHead className="w-[150px]">Preço (R$)</TableHead>
                            <TableHead className="w-[100px] text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items && items.length > 0 ? (
                            items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                     <TableCell>
                                        <Select value={item.category} onValueChange={(value: FrigobarItemCategory) => handleCategoryChange(item.id, value)}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bebida">Bebida</SelectItem>
                                                <SelectItem value="comida">Comida</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <CurrencyInput
                                                value={item.price}
                                                onValueChange={(value) => handlePriceChange(item.id, value)}
                                                className="pl-8 h-8"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum item cadastrado.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Button onClick={handleSaveChanges} className="mt-4" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Alterações
      </Button>
    </div>
  );
}
