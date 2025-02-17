// File: src/calculations/icrCalculator.ts

/**
 * Based on https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012
 * 
 * This replicates the old logic:
 *   morning = (6.2 * weight) / dailyTotalInsulin
 *   night   = (6.2 * weight) / netBasalDailyTotals
 *   midDay  = (morning + night) / 2
 *   500 rule = 500 / dailyTotalInsulin
 *
 * Return them in an object so the UI can display a table.
 */

export interface IcrRecommendations {
    morning: number;
    midDay: number;
    night: number;
    icr500Rule: number;
    reference: string; // e.g. link or text
  }
  
  /**
   * 
   * @param weight                user’s weight (kg)
   * @param netBasalDailyTotals   total *basal* insulin for 24 hr
   * @param dailyTotalInsulin     total insulin (basal + bolus) for 24 hr
   * @returns IcrRecommendations
   */
  export function icrCalculator(
    weight: number,
    netBasalDailyTotals: number,
    dailyTotalInsulin: number,
  ): IcrRecommendations {
    // Protect against zero or negative dailyTotal
    if (dailyTotalInsulin <= 0) {
      return {
        morning: 0,
        midDay: 0,
        night: 0,
        icr500Rule: 0,
        reference: 'Invalid dailyTotalInsulin, cannot compute ICR.',
      };
    }
  
    // Basic formula from old code
    let morning = (6.2 * weight) / dailyTotalInsulin;
    let night   = (6.2 * weight) / netBasalDailyTotals;
    let midDay  = (morning + night) / 2;
    let icr500Rule = 500 / dailyTotalInsulin;
  
    // Round to 1 decimal place
    morning    = Math.round(morning * 10) / 10;
    night      = Math.round(night   * 10) / 10;
    midDay     = Math.round(midDay  * 10) / 10;
    icr500Rule = Math.round(icr500Rule * 10) / 10;
  
    return {
      morning,
      midDay,
      night,
      icr500Rule,
      reference: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012',
    };
  }
  