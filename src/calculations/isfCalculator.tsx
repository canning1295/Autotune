// File: src/calculations/isfCalculator.tsx

/**
 * isfCalculator.tsx
 *
 * A TypeScript version of the ISF calculation logic from main.txt:
 *   - Based on https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012
 *   - Uses the 1800 Rule for "aggressive" ISF
 *   - Takes the average of "aggressive" and "conservative" to produce "lessAggressive" ISF
 */

export interface IsfRecommendations {
  conservativeISF: number;
  lessAggressiveISF: number;
  isf1800Rule: number;
  reference: string;
}

/**
 * isfCalculator:
 * 
 * @param dailyTotalInsulin total daily insulin (basal + bolus)
 * @param netBasalDailyTotals total daily basal insulin
 * @returns an object with three recommended ISFs + reference link
 *
 * Example usage:
 *   const recs = isfCalculator(dailyTotalInsulin, netBasalDailyTotals);
 *   console.log(recs.conservativeISF, recs.lessAggressiveISF, recs.isf1800Rule);
 */
export function isfCalculator(
  dailyTotalInsulin: number,
  netBasalDailyTotals: number,
): IsfRecommendations {
  // "aggressiveISF" => 1800 / totalDailyInsulin
  let aggressiveISF = 1800 / dailyTotalInsulin;

  // "conservativeISF" => 1800 / netBasalDailyTotals
  let conservativeISF = 1800 / netBasalDailyTotals;

  // The old code calls the average of these "Less aggressive" ISF
  let averageISF = (conservativeISF + aggressiveISF) / 2;

  // Round each to 1 decimal place
  aggressiveISF = Math.round(aggressiveISF * 10) / 10;
  conservativeISF = Math.round(conservativeISF * 10) / 10;
  averageISF = Math.round(averageISF * 10) / 10;

  return {
    conservativeISF: conservativeISF,
    lessAggressiveISF: averageISF,
    isf1800Rule: aggressiveISF,
    // Provide the link in plain text or any desired format:
    reference: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012',
  };
}
