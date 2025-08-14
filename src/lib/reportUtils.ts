// This file is deprecated and will be removed in a future update.
// The logic has been moved to individual files under lib/reports/[report-type]/
// For now, it re-exports the new generators to maintain compatibility with existing code.

export { generateGeneralReport as generateReportData } from './reports/general/generator';
export { extractPersonTransactions } from './reports/person/generator';
export { processEntryForTotals } from './utils/calculations';
