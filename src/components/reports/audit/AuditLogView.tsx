"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { AuditLog } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface AuditLogViewProps {
  logs: AuditLog[];
}

const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  
  const formatTimestamp = (timestamp: string | Date) => {
    try {
      const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
      if (isValid(date)) {
        return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
      }
      return "Data inválida";
    } catch (e) {
      return "Data inválida";
    }
  };

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Data e Hora</TableHead>
              <TableHead className="w-[120px]">Usuário</TableHead>
              <TableHead className="w-[150px]">Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm font-medium">
                  {formatTimestamp(log.timestamp)}
                </TableCell>
                <TableCell className="text-sm">{log.username}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.action}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.details}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Nenhum registro de auditoria encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AuditLogView;
