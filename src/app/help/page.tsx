
import React from 'react';
import { promises as fs } from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';

async function getManualContent(): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'MANUAL_DE_USO.md');
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error("Failed to read manual file:", error);
    return "## Erro ao Carregar o Manual\n\nNão foi possível encontrar o arquivo do manual de uso. Por favor, contate o suporte.";
  }
}

export default async function HelpPage() {
  const markdownContent = await getManualContent();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Manual de Uso</h1>
        <Button asChild variant="outline">
          <Link href="/">Voltar para o Dashboard</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <HelpCircle className="h-10 w-10 text-primary" />
          <div>
            <CardTitle className="text-2xl">Guia de Primeiros Passos</CardTitle>
            <CardDescription>Tudo o que você precisa saber para começar a usar o SysTulsi Caixa.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-primary prose-a:text-primary prose-strong:text-foreground">
                 <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Re-import Button as it's used in the page but might not be in scope
import { Button } from '@/components/ui/button';
