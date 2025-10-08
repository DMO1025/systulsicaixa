
"use client";

// This file is the CLIENT-SIDE entry point for calculations.
// It re-exports the server-safe calculation logic.
// This allows client components to import from a file marked "use client"
// while the core logic itself remains on the server, callable by APIs.

import { processEntryForTotals } from '../api/v1/calculations';
export { processEntryForTotals };
