
'use server';
/**
 * @fileOverview An AI flow to analyze monthly dashboard data and provide business insights.
 *
 * - generateDashboardAnalysis - A function that takes summarized dashboard data and returns an AI-generated analysis.
 * - DashboardAnalysisInput - The input type for the analysis function.
 * - DashboardAnalysisOutput - The return type for the analysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AccumulatedItemSchema = z.object({
  name: z.string().describe('The name of the revenue category or period.'),
  quantity: z.string().describe('The quantity of items or transactions for this category. Can be a string like "10 / 5".'),
  totalValue: z.number().describe('The total revenue value for this category.'),
});

const DashboardAnalysisInputSchema = z.object({
  month: z.string().describe('The month and year the data refers to (e.g., "Julho 2024").'),
  totalRevenue: z.number().describe('The total revenue for the month from all sources.'),
  totalTransactions: z.number().describe('The total quantity of items/transactions for the month.'),
  totalCIRecords: z.object({
    almoco: z.object({
        qtd: z.number(),
        valor: z.number(),
    }).describe('Internal consumption records for lunch.'),
    jantar: z.object({
        qtd: z.number(),
        valor: z.number(),
    }).describe('Internal consumption records for dinner.'),
    total: z.object({
        qtd: z.number(),
        valor: z.number(),
    }).describe('Total internal consumption for the month.'),
  }).describe('Summary of all internal consumption (C.I.) records.'),
  accumulatedItems: z.array(AccumulatedItemSchema).describe('A list of all accumulated revenue items for the month.'),
  generalTotals: z.object({
      withCI: z.object({
        quantity: z.number(),
        value: z.number(),
      }).describe('Grand total including internal consumption.'),
      withoutCI: z.object({
        quantity: z.number(),
        value: z.number(),
      }).describe('Grand total excluding internal consumption.'),
      ciAdjustment: z.number().describe('Value of C.I. adjustments for the month.'),
  }).describe('The final grand totals for the month.'),
});
export type DashboardAnalysisInput = z.infer<typeof DashboardAnalysisInputSchema>;

const DashboardAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A concise, insightful analysis of the provided data, written in markdown format. It should highlight trends, opportunities, and points of attention.'),
});
export type DashboardAnalysisOutput = z.infer<typeof DashboardAnalysisOutputSchema>;

const prompt = ai.definePrompt({
    name: 'dashboardAnalysisPrompt',
    input: { schema: DashboardAnalysisInputSchema },
    output: { schema: DashboardAnalysisOutputSchema },
    prompt: `
      Você é um analista de negócios especialista na indústria de restaurantes e hotelaria. Sua tarefa é analisar os dados de faturamento de um mês e fornecer insights acionáveis, claros e concisos.

      Analise os seguintes dados para o mês de {{{month}}}:

      **Visão Geral:**
      - **Receita Total (com C.I.):** R$ {{generalTotals.withCI.value}}
      - **Receita Total (sem C.I.):** R$ {{generalTotals.withoutCI.value}}
      - **Quantidade Total de Itens/Transações (com C.I.):** {{generalTotals.withCI.quantity}}
      - **Consumo Interno Total (C.I.):** R$ {{totalCIRecords.total.valor}} ({{totalCIRecords.total.qtd}} itens)
      - **Ajuste de C.I.:** R$ {{generalTotals.ciAdjustment}}

      **Detalhamento por Categoria:**
      {{#each accumulatedItems}}
      - **{{name}}:**
        - Quantidade: {{quantity}}
        - Valor Total: R$ {{totalValue}}
      {{/each}}

      Com base nesses dados, gere uma análise em **português do Brasil** usando markdown. A análise deve ser dividida em três seções:

      1.  **### Destaques do Mês**
          - Identifique de 2 a 3 pontos positivos mais importantes. Quais categorias se destacaram? Onde o desempenho foi mais forte?

      2.  **### Oportunidades e Sugestões**
          - Com base nos dados, sugira de 2 a 3 ações que poderiam ser tomadas. Por exemplo, se o Jantar tem um faturamento muito maior que o Almoço, sugira uma promoção para o Almoço. Se o Room Service está forte, sugira um novo combo.

      3.  **### Pontos de Atenção**
          - Aponte 1 ou 2 áreas que podem precisar de atenção. O Consumo Interno está muito alto? Alguma categoria com faturamento inesperadamente baixo?

      Seja direto, profissional e foque em fornecer valor prático para o gerente do negócio. A resposta deve ser apenas a análise em markdown.
    `,
});


const dashboardAnalysisFlow = ai.defineFlow(
  {
    name: 'dashboardAnalysisFlow',
    inputSchema: DashboardAnalysisInputSchema,
    outputSchema: DashboardAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function generateDashboardAnalysis(input: DashboardAnalysisInput): Promise<DashboardAnalysisOutput> {
  return await dashboardAnalysisFlow(input);
}
