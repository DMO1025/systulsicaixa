
"use client";

import { useState, useEffect } from 'react';
import { useAuth, type OperatorShift } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { login as loginUser } from '@/services/authService';
import { getOperators } from '@/services/userService';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedShift, setSelectedShift] = useState<OperatorShift | ''>('');
  const [isOperator, setIsOperator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [operators, setOperators] = useState<User[]>([]);

  // Fetch all operators when the component mounts
  useEffect(() => {
    async function fetchOperators() {
        try {
            const fetchedOperators = await getOperators();
            setOperators(fetchedOperators);
        } catch (error) {
            console.error("Failed to fetch operators:", error);
            // Non-critical, login can still be attempted.
        }
    }
    fetchOperators();
  }, []);


  // This effect checks if the username is an operator to show the shift selector.
  // If the operator has only one shift, it pre-selects it.
  useEffect(() => {
    const user = operators.find(op => op.username.toLowerCase() === username.toLowerCase());
    if (user && user.role === 'operator') {
      setIsOperator(true);
      if (user.shifts && user.shifts.length === 1) {
        setSelectedShift(user.shifts[0]);
      } else {
        setSelectedShift('');
      }
    } else {
      setIsOperator(false);
      setSelectedShift('');
    }
  }, [username, operators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { role, shift, allowedPages } = await loginUser(username, password, selectedShift || undefined);
      login(role, shift, allowedPages);
    } catch (error) {
      toast({
        title: 'Login Falhou',
        description: (error as Error).message || 'Usuário, senha ou turno inválido.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold">SysTulsi Caixa Login</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar sua conta</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Seu nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                aria-label="Username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-label="Password"
              />
            </div>
            {isOperator && (
              <div className="space-y-2">
                <Label htmlFor="shift">Turno</Label>
                <Select value={selectedShift} onValueChange={(value) => setSelectedShift(value as OperatorShift)}>
                  <SelectTrigger id="shift">
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">Primeiro Turno</SelectItem>
                    <SelectItem value="second">Segundo Turno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
