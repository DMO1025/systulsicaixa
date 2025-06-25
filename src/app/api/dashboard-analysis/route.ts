
import { type NextRequest, NextResponse } from 'next/server';
import { generateDashboardAnalysis, DashboardAnalysisInputSchema, type DashboardAnalysisOutput } from '@/ai/flows/dashboard-analysis-flow';

export const maxDuration = 60; // Extend timeout to 60s for Vercel

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input against the Zod schema
    const validationResult = DashboardAnalysisInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ message: "Invalid input data.", errors: validationResult.error.format() }, { status: 400 });
    }

    const input = validationResult.data;
    const result: DashboardAnalysisOutput = await generateDashboardAnalysis(input);
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in dashboard analysis API route:", error);
    const errorMessage = error.message || "An unexpected error occurred during analysis.";
    
    let status = 500;
    if (errorMessage.includes('timeout')) {
        status = 504; // Gateway Timeout
    }

    return NextResponse.json({ message: errorMessage }, { status });
  }
}
