
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadcnCardDescription } from "@/components/ui/card"; // Renamed CardDescription
import { PERIOD_DEFINITIONS, getPeriodIcon } from '@/lib/config/periods';
import type { PeriodId } from '@/lib/types';
import { useAuth, UserRole, OperatorShift } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { getSetting } from '@/services/settingsService'; // For loading visibility config
import type { CardVisibilityConfig } from '@/lib/types';
import { PATHS } from '@/lib/config/navigation';


interface UICardConfig { // Renamed from CardConfig to avoid conflict
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  type: 'period';
  description?: string;
}

const operatorShiftCardsConfig: Record<OperatorShift, string[]> = {
  first: ["madrugada", "cafeDaManha", "almocoPrimeiroTurno", "eventos", "cafeManhaNoShow"], 
  second: ["almocoSegundoTurno", "jantar", "eventos"], 
};

export default function DailyEntrySelectorPage() {
  const { userRole, operatorShift, isLoading: authLoading } = useAuth();
  const [visibleCards, setVisibleCards] = useState<UICardConfig[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function loadConfigAndSetCards() {
      setPageLoading(true); // Ensure loading is true at the start
      let cardsToDisplay: UICardConfig[] = [];
      const allPossiblePeriodCards: UICardConfig[] = PERIOD_DEFINITIONS
        .filter(p => p.type === 'entry') // Only show entry types here
        .map(period => ({
          id: period.id,
          label: period.label,
          href: `${PATHS.ENTRIES_BASE}/${period.id}`,
          icon: getPeriodIcon(period.id),
          type: 'period',
          description: period.description,
        }));

      try {
        if (userRole === 'administrator') {
          try {
            const settings = await getSetting<CardVisibilityConfig>('cardVisibilityConfig');
            const adminVisibilityConfig = settings || {}; // Default to empty object if settings are null
            
            allPossiblePeriodCards.forEach(card => {
              if (adminVisibilityConfig[card.id] !== false) { // Default to true if not explicitly set to false
                cardsToDisplay.push(card);
              }
            });
          } catch (error) {
            console.error("Failed to load card visibility settings for admin, defaulting to all period cards:", error);
            cardsToDisplay = [...allPossiblePeriodCards]; // Fallback strategy
          }
        } else if (userRole === 'operator' && operatorShift) {
          const allowedCardIds = operatorShiftCardsConfig[operatorShift];
          allPossiblePeriodCards.forEach(card => {
            if (allowedCardIds.includes(card.id)) {
              cardsToDisplay.push(card);
            }
          });
        } else {
          cardsToDisplay = []; // No role or shift, or other unhandled case
        }
      } catch (e) {
        // Catch unexpected errors in the logic above (not API related specifically)
        console.error("Error determining visible cards:", e);
        // As a last resort, for admins, show all cards. For operators, it might be safer to show none or a specific error message.
        if (userRole === 'administrator') {
            cardsToDisplay = [...allPossiblePeriodCards];
        } else {
            cardsToDisplay = [];
        }
      } finally {
        setVisibleCards(cardsToDisplay);
        setPageLoading(false); // Ensure pageLoading is set to false in all scenarios
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
      <h1 className="text-3xl font-bold tracking-tight">Lançamento Diário</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Selecione o Período de Lançamento</CardTitle>
          <ShadcnCardDescription>Clique em um card para lançar os dados financeiros do período.</ShadcnCardDescription>
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
                          <CardTitle className="text-base">{card.label}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{card.description || `Acessar o lançamento de ${card.label}.`}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhum card disponível para sua função ou configuração atual.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
