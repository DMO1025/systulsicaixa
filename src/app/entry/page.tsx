
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadcnCardDescription } from "@/components/ui/card"; // Renamed CardDescription
import { PERIOD_DEFINITIONS, getPeriodIcon } from '@/lib/constants';
import type { PeriodId } from '@/lib/constants';
import { useAuth, UserRole, OperatorShift } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { getSetting } from '@/services/settingsService'; // For loading visibility config
import type { CardVisibilityConfig } from '@/lib/types';


interface UICardConfig { // Renamed from CardConfig to avoid conflict
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  type: 'period'; 
}

const operatorShiftCardsConfig: Record<OperatorShift, string[]> = {
  first: ["madrugada", "cafeDaManha", "almocoPrimeiroTurno", "eventos"], 
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
      const allPossiblePeriodCards: UICardConfig[] = PERIOD_DEFINITIONS.map(period => ({
        id: period.id,
        label: period.label,
        href: `/entry/${period.id}`,
        icon: getPeriodIcon(period.id),
        type: 'period',
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
          <CardTitle>Selecione o Período</CardTitle>
          <ShadcnCardDescription>Clique em um card para lançar os dados do período.</ShadcnCardDescription>
        </CardHeader>
        <CardContent>
          {visibleCards.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {visibleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    href={card.href}
                    key={card.id}
                    className={cn(
                      "group block rounded-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    )}
                    aria-label={card.label}
                  >
                    <Card 
                      className={cn(
                        "ring-1 ring-border bg-card text-card-foreground shadow-sm h-full", 
                        "flex flex-col items-center justify-center space-y-2 aspect-square p-3 sm:p-4"
                      )}
                    >
                      <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground group-hover:text-primary" />
                      <p className="text-xs sm:text-sm text-center font-medium text-foreground group-hover:text-primary">
                        {card.label}
                      </p>
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
