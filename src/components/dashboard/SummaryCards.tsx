"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ReceiptText } from "lucide-react";

interface SummaryCardsProps {
  totalComCI_Qtd: number;
  totalComCI_Valor: number;
  totalSemCI_Qtd: number;
  totalSemCI_Valor: number;
  totalRSValor: number;
  totalRSQtd: number;
  totalAlmocoValor: number;
  totalAlmocoQtd: number;
  totalJantarValor: number;
  totalJantarQtd: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalComCI_Qtd,
  totalComCI_Valor,
  totalSemCI_Qtd,
  totalSemCI_Valor,
  totalRSValor,
  totalRSQtd,
  totalAlmocoValor,
  totalAlmocoQtd,
  totalJantarValor,
  totalJantarQtd,
}) => {
  const ticketMedioRS = totalRSQtd > 0 ? totalRSValor / totalRSQtd : 0;
  const ticketMedioAlmoco = totalAlmocoQtd > 0 ? totalAlmocoValor / totalAlmocoQtd : 0;
  const ticketMedioJantar = totalJantarQtd > 0 ? totalJantarValor / totalJantarQtd : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total com CI</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            {totalComCI_Qtd.toLocaleString('pt-BR')} Itens
          </div>
          <div className="text-2xl font-bold">
            R$ {totalComCI_Valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total sem CI</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            {totalSemCI_Qtd.toLocaleString('pt-BR')} Itens
          </div>
          <div className="text-2xl font-bold">
            R$ {totalSemCI_Valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryCards;

    
