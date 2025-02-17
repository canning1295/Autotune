// File: src/types/AutotuneTypes.ts

/**
 * Common interfaces and types used by the Autotune calculations
 */

export interface UserOptions {
    // Mapped from your old "options" usage:
    url: string;               // Nightscout URL
    user: string;              // Current user name
    weight: number;            // User weight (kg)
    targetBG: number;          // The usual target BG
    lowTargetBG: number;       // The "low" end of target BG
    poolingTime: number;       // Some number used in DIA for pooling
    bolusTimeWindow: number;   // e.g. 1,2,3 hours
    adjustmentFactor: number;  // 0.4, 0.5, etc.
    diaAdjustment: number;     // 0.6, 0.7, 0.8, ...
    profiles?: Profile[];
  }
  
  export interface CombinedData {
    // Data structure for each 5-min block in "Combined_Data"
    time: Date;          // e.g. 2000-01-01T00:00:00 (or actual date/time)
    bg: number;
    profileBasal: number;
    actualBasal: number;
    bolusInsulin: number;
    carbRatio: number;
    highTarget: number;
    isf: number;
    lowTarget: number;
  }

  export interface Profile {
    startDate: Date;
    endDate: Date;
    basal: { time: number; value: number }[];
    carbRatio: { time: number; value: number }[];
    highTarget: { time: number; value: number }[];
    isf: { time: number; value: number }[];
    lowTarget: { time: number; value: number }[];
  }
  
  /**
   * Sometimes we have "averageCombinedData," which is basically
   * the same shape as CombinedData. So we can re-use CombinedData
   * or define an alias. It's your choice; e.g.:
   */
  export type AverageCombinedData = CombinedData;