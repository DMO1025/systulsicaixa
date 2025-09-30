
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Utensils, Refrigerator, BedDouble } from 'lucide-react';
import { PATHS } from '@/lib/config/navigation';

const ESTORNO_CATEGORIES = [
    {
        id: 'restaurante',
        label: 'Estorno de Restaurante',
        description: 'Registre estornos de vendas do restaurante (almoço, jantar, etc).',
        icon: Utensils,
        href: `${PATHS.ESTORNOS_BASE}/restaurante`
    },
    {
        id: 'frigobar',
        label: 'Estorno de Frigobar',
        description: 'Registre estornos relacionados a consumo de frigobar.',
        icon: Refrigerator,
        href: `${PATHS.ESTORNOS_BASE}/frigobar`
    },
    {
        id: 'room-service',
        label: 'Estorno de Room Service',
        description: 'Registre estornos de pedidos de serviço de quarto.',
        icon: BedDouble,
        href: `${PATHS.ESTORNOS_BASE}/room-service`
    },
];

export default function EstornosSelectorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Controle de Estornos</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Selecione a Categoria do Estorno</CardTitle>
          <CardDescription>Clique em um card para registrar o estorno na categoria correspondente.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ESTORNO_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Link href={category.href} key={category.id}>
                <Card className="hover:bg-muted/50 hover:shadow-lg transition-all h-full">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{category.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
