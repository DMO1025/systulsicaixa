
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PERIOD_DEFINITIONS, getPeriodIcon } from '@/lib/config/periods';
import type { PeriodId } from '@/lib/types';
import { useAuth, UserRole, OperatorShift } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { getSetting } from '@/services/settingsService';
import type { CardVisibilityConfig } from '@/lib/types';
import { PATHS } from '@/lib/config/navigation';

interface UICardConfig {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const operatorShiftCardsConfig: Record<OperatorShift, string[]> = {
  first: ["cafeManhaNoShow", "controleCafeDaManha", "controleFrigobar"],
  second: ["controleFrigobar"],
};

export default function DailyControlsSelectorPage() {
  const { userRole, operatorShift, isLoading: authLoading } = useAuth();
  const [visibleCards, setVisibleCards] = useState<UICardConfig[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function loadConfigAndSetCards() {
      setPageLoading(true);
      let cardsToDisplay: UICardConfig[] = [];
      const allPossibleControlCards: UICardConfig[] = PERIOD_DEFINITIONS
        .filter(p => p.type === 'control') // Only show control types here
        .map(period => ({
          id: period.id,
          label: period.label,
          href: `${PATHS.CONTROLS_BASE}/${period.id}`,
          icon: getPeriodIcon(period.id),
          description: period.description || `Acessar o controle de ${period.label}.`
        }));

      try {
        if (userRole === 'administrator') {
          const settings = await getSetting<CardVisibilityConfig>('cardVisibilityConfig');
          const adminVisibilityConfig = settings || {};
          allPossibleControlCards.forEach(card => {
            if (adminVisibilityConfig[card.id] !== false) {
              cardsToDisplay.push(card);
            }
          });
        } else if (userRole === 'operator' && operatorShift) {
          const allowedCardIds = operatorShiftCardsConfig[operatorShift];
          allPossibleControlCards.forEach(card => {
            if (allowedCardIds.includes(card.id)) {
              cardsToDisplay.push(card);
            }
          });
        }
      } catch (e) {
        console.error("Error determining visible control cards:", e);
        if (userRole === 'administrator') {
          cardsToDisplay = [...allPossibleControlCards];
        }
      } finally {
        setVisibleCards(cardsToDisplay);
        setPageLoading(false);
      }
    }

    loadConfigAndSetCards();

  }, [userRole, operatorShift, authLoading]);

  if (authLoading || pageLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Controles Diários</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Selecione o Período de Controle</CardTitle>
          <CardDescription>Clique em um card para acessar os formulários de controle que não afetam o faturamento.</CardDescription>
        </CardHeader>
        <CardContent>
          {visibleCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCards.map((card) => {
                const Icon = card.icon;
                return (
                   <Link href={card.href} key={card.id}>
                    <Card className="hover:bg-muted/50 hover:shadow-lg transition-all h-full">
                      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle>{card.label}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhum formulário de controle disponível para sua função ou configuração atual.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
