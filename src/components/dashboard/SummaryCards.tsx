"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptText } from "lucide-react";

interface SummaryCardsProps {
  totalRSValor: number;
  totalRSQtd: number;
  totalAlmocoValor: number;
  totalAlmocoQtd: number;
  totalJantarValor: number;
  totalJantarQtd: number;
  totalFrigobarValor: number;
  totalFrigobarQtd: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalRSValor,
  totalRSQtd,
  totalAlmocoValor,
  totalAlmocoQtd,
  totalJantarValor,
  totalJantarQtd,
  totalFrigobarValor,
  totalFrigobarQtd,
}) => {
  const ticketMedioRS = totalRSQtd > 0 ? totalRSValor / totalRSQtd : 0;
  const ticketMedioAlmoco = totalAlmocoQtd > 0 ? totalAlmocoValor / totalAlmocoQtd : 0;
  const ticketMedioJantar = totalJantarQtd > 0 ? totalJantarValor / totalJantarQtd : 0;
  const ticketMedioFrigobar = totalFrigobarQtd > 0 ? totalFrigobarValor / totalFrigobarQtd : 0;

  return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio Serviços Restaurante</CardTitle>
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-1 pt-2">
            <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Room Service</span>
                <span className="text-lg font-semibold">
                    R$ {ticketMedioRS.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
             <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Almoço</span>
                <span className="text-lg font-semibold">
                    R$ {ticketMedioAlmoco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
             <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Jantar</span>
                <span className="text-lg font-semibold">
                    R$ {ticketMedioJantar.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
             <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Frigobar</span>
                <span className="text-lg font-semibold">
                    R$ {ticketMedioFrigobar.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        </CardContent>
      </Card>
  );
};

export default SummaryCards;
