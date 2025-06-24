
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, PlusCircle, Trash2, Edit, BarChart3, BookOpen, Globe } from 'lucide-react';
import type { User, PageId, OperatorShift, UserRole } from '@/lib/types';
import { getOperators, createOperator, updateOperator, deleteOperator } from '@/services/userService';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'entry', label: 'Lançamento Diário', icon: BookOpen },
  { id: 'reports', label: 'Relatórios', icon: Globe },
] as const;

const formSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3, { message: "O nome de usuário deve ter pelo menos 3 caracteres." }),
  password: z.string().optional(),
  role: z.enum(['administrator', 'operator'], { required_error: "A função é obrigatória." }),
  shifts: z.array(z.string()).optional(),
  allowedPages: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
    if (!data.id && (!data.password || data.password.length < 4)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A senha é obrigatória para novos usuários e deve ter pelo menos 4 caracteres.",
            path: ["password"],
        });
    }
    if (data.id && data.password && data.password.length > 0 && data.password.length < 4) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A nova senha deve ter pelo menos 4 caracteres.",
            path: ["password"],
        });
    }
    if (data.role === 'operator') {
        if (!data.shifts || data.shifts.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Ao menos um turno deve ser selecionado para operadores.",
                path: ["shifts"],
            });
        }
        if (!data.allowedPages || data.allowedPages.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Ao menos uma página deve ser permitida para operadores.",
                path: ["allowedPages"],
            });
        }
    }
});

export default function UsersSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "operator",
      shifts: [],
      allowedPages: [],
    },
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await getOperators(); // This function now gets all users, not just operators
      setUsers(allUsers);
    } catch (error) {
      toast({ title: "Erro ao carregar usuários", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userRole !== 'administrator') {
      toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      router.push('/');
    } else if (userRole === 'administrator') {
      fetchUsers();
    }
  }, [userRole, authLoading, router, toast]);

  const handleOpenDialog = (user: User | null = null) => {
    setEditingUser(user);
    if (user) {
      form.reset({
        id: user.id,
        username: user.username,
        password: "",
        role: user.role,
        shifts: user.shifts || [],
        allowedPages: user.allowedPages || [],
      });
    } else {
      form.reset({
        username: "",
        password: "",
        role: "operator",
        shifts: [],
        allowedPages: [],
      });
    }
    setIsDialogOpen(true);
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    try {
      const isAdmin = values.role === 'administrator';
      const userDataPayload: Partial<User> = {
          username: values.username,
          role: values.role as UserRole,
          shifts: isAdmin ? [] : (values.shifts as OperatorShift[] || []),
          allowedPages: isAdmin ? ['dashboard', 'entry', 'reports'] : (values.allowedPages as PageId[] || []),
      };

      if (values.password) {
        userDataPayload.password = values.password;
      }
      
      if (editingUser) {
        await updateOperator(editingUser.id, userDataPayload);
        toast({ title: "Sucesso", description: "Usuário atualizado com sucesso." });
      } else {
        await createOperator(userDataPayload as User);
        toast({ title: "Sucesso", description: "Usuário criado com sucesso." });
      }
      await fetchUsers();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao salvar", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteOperator = async (userId: string) => {
    try {
      await deleteOperator(userId);
      toast({ title: "Sucesso", description: "Usuário removido com sucesso." });
      await fetchUsers();
    } catch (error) {
      toast({ title: "Erro ao remover", description: (error as Error).message, variant: "destructive" });
    }
  };

  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (userRole !== 'administrator') {
    return null;
  }
  
  const watchedRole = form.watch('role');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Perfil & Gerenciamento de Usuários</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Usuários</CardTitle>
          <CardDescription>Adicione, edite ou remova contas de administradores e operadores.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mb-4" onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Altere os dados e permissões do usuário.' : 'Preencha os dados para criar uma nova conta.'}
                </DialogDescription>
              </DialogHeader>
               <Form {...form}>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuário</FormLabel>
                          <FormControl>
                            <Input placeholder="nome_de_usuario" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder={editingUser ? "Deixe em branco para não alterar" : "Mínimo 4 caracteres"} {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Função</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a função" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="operator">Operador</SelectItem>
                              <SelectItem value="administrator">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchedRole === 'operator' && (
                      <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <FormField
                          control={form.control}
                          name="shifts"
                          render={() => (
                            <FormItem>
                              <div className="mb-2"><FormLabel>Turnos</FormLabel></div>
                                {(['first', 'second'] as const).map((shiftId) => (
                                  <FormField
                                    key={shiftId}
                                    control={form.control}
                                    name="shifts"
                                    render={({ field }) => (
                                      <FormItem key={shiftId} className="flex items-center space-x-2"><FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(shiftId)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), shiftId])
                                              : field.onChange((field.value || []).filter((value) => value !== shiftId))
                                          }}
                                        />
                                        </FormControl><Label className="font-normal text-sm">{shiftId === 'first' ? '1º Turno' : '2º Turno'}</Label>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="allowedPages"
                          render={() => (
                            <FormItem>
                              <div className="mb-2"><FormLabel>Páginas Permitidas</FormLabel></div>
                              {AVAILABLE_PAGES.map((page) => (
                                <FormField
                                  key={page.id}
                                  control={form.control}
                                  name="allowedPages"
                                  render={({ field }) => (
                                    <FormItem key={page.id} className="flex items-center space-x-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(page.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), page.id])
                                              : field.onChange((field.value || []).filter((value) => value !== page.id))
                                          }}
                                        />
                                      </FormControl>
                                      <Label className="font-normal text-sm">{page.label}</Label>
                                    </FormItem>
                                  )}
                                />
                              ))}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <DialogFooter>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
                      </Button>
                    </DialogFooter>
                 </form>
               </Form>
            </DialogContent>
          </Dialog>
          
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.role === 'operator' ? (
                        <>
                          <p>Turnos: {user.shifts.map(s => s === 'first' ? '1º' : '2º').join(', ') || 'Nenhum'}</p>
                          <p>Páginas: {user.allowedPages?.join(', ') || 'Nenhuma'}</p>
                        </>
                      ) : (
                        <p>Acesso total</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive" disabled={user.id === '1'}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso irá remover permanentemente o usuário
                                <span className="font-bold"> {user.username}</span>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteOperator(user.id)}>Continuar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
