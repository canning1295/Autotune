// File: src/calculations/adjustBasal.ts

import { getDIA } from './DIA';
import { CombinedData, UserOptions } from '../types/AutotuneTypes';

/**
 * adjustBasalRatesUsingTemps:
 * Adapts the old "adjustBasal.js" logic to TypeScript, using actualBasal.
 */
export async function adjustBasalRatesUsingTemps(
  averageCombinedData: CombinedData[],
  userOptions: UserOptions,
): Promise<{ tempBasal: string[]; adjustedBasal: string[] }> {
  const isf = averageCombinedData[0].isf;
  const lowTargetBG = userOptions.lowTargetBG;
  const targetBG = userOptions.targetBG;

  const startingBGs = averageCombinedData.map((d) => d.bg);
  // Initialize predicted and outcome BG arrays
  const predictedBGs = averageCombinedData.map((d) => d.bg);
  const outcomeBGs = averageCombinedData.map((d) => d.bg);

  // Convert U/day to U per 5-minute block
  let startingBasals = averageCombinedData.map((d) => d.actualBasal / 12);
  let startingBasalsPlusBolus = averageCombinedData.map(
    (d) => d.actualBasal / 12 + d.bolusInsulin / 12,
  );
  let estimatedBasal = averageCombinedData.map((d) => d.actualBasal / 12);

  const DIACurves = getDIA(startingBasalsPlusBolus, 0, userOptions);
  const averageDIALength =
    DIACurves.map((curve) => curve.length).reduce((a, b) => a + b, 0) /
    DIACurves.length /
    12;

  const averageBG =
    startingBGs.reduce((a, b) => a + b, 0) / startingBGs.length;
  const insulinLikelyNeeded = ((averageBG - targetBG) / isf * 24) / averageDIALength * 2;
  const insulinNeededPerHour = insulinLikelyNeeded / 24;
  const adjustmentFactor = userOptions.adjustmentFactor;

  await runCalcs();

  async function runCalcs() {
    const continueLoop1 = new Array(288).fill(true);
    const continueLoop6 = new Array(288).fill(true);
    const continueLoop7 = new Array(288).fill(true);
    const continueLoop8 = new Array(288).fill(true);
    const continueLoop9 = new Array(288).fill(true);

    let currentAdjustment = 0;

    // --- RAISE BG PASSES (reduce insulin i.e. negative adjustment to raise BG) ---
    for (let i = 0; i < 20; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / -10; // negative adjustment
      const currentCurves = getDIA(startingBasalsPlusBolus, currentAdjustment, userOptions);
      raiseBGValues(
        currentCurves,
        currentAdjustment,
        1,
        continueLoop1,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }

    // --- LOWER BG PASSES (add insulin i.e. positive adjustment to lower BG) ---
    for (let i = 0; i < 2; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / 2;
      const currentCurves = getDIA(estimatedBasal, currentAdjustment, userOptions);
      lowerBGValues(
        currentCurves,
        currentAdjustment,
        1,
        continueLoop6,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }
    for (let i = 0; i < 4; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / 4;
      const currentCurves = getDIA(estimatedBasal, currentAdjustment, userOptions);
      lowerBGValues(
        currentCurves,
        currentAdjustment,
        2,
        continueLoop7,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }
    for (let i = 0; i < 16; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / 8;
      const currentCurves = getDIA(estimatedBasal, currentAdjustment, userOptions);
      lowerBGValues(
        currentCurves,
        currentAdjustment,
        3,
        continueLoop8,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }
    for (let i = 0; i < 16; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / 10;
      const currentCurves = getDIA(estimatedBasal, currentAdjustment, userOptions);
      lowerBGValues(
        currentCurves,
        currentAdjustment,
        4,
        continueLoop9,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }

    logs();
  }

  /**
   * raiseBGValues:
   * For each 5-min block, if any predicted BG is below lowTargetBG and there is
   * enough basal to reduce, subtract currentAdjustment * isf from the predicted BG(s).
   * (A negative currentAdjustment subtracts a negative value, effectively raising BG.)
   */
  function raiseBGValues(
    currentCurves: number[][],
    currentAdjustment: number,
    count: number,
    continueArr: boolean[],
    predictedBGs: number[],
    outcomeBGs: number[],
    estimatedBasal: number[],
    isf: number,
    lowBG: number,
    adjFactor: number,
  ) {
    for (let i = 0; i < 288; i++) {
      if (!continueArr[i]) continue;

      // Check if any point in the curve is below target AND we have room to reduce
      let shouldAdjust = false;
      for (let j = 0; j < currentCurves[i].length; j++) {
        const idx = (i + j) % 288;
        if (predictedBGs[idx] < lowBG && estimatedBasal[i] >= Math.abs(currentAdjustment)) {
          shouldAdjust = true;
          break;
        }
      }
      if (shouldAdjust) {
        for (let m = 0; m < currentCurves[i].length; m++) {
          const idx = (i + m) % 288;
          // Do not use Math.abs so that negative adjustments add to BG correctly  
          const BGChange = currentCurves[i][m] * currentAdjustment * isf;
          const outcomeBGChange = BGChange * adjFactor;
          predictedBGs[idx] -= BGChange;
          outcomeBGs[idx] -= outcomeBGChange;
        }
        estimatedBasal[i] += currentAdjustment;
      } else {
        continueArr[i] = false;
      }
    }
  }

  /**
   * lowerBGValues:
   * If adding insulin (positive currentAdjustment) would not push predicted BG
   * below the lowBG, then add insulin to lower BG.
   */
  function lowerBGValues(
    currentCurves: number[][],
    currentAdjustment: number,
    count: number,
    continueArr: boolean[],
    predictedBGs: number[],
    outcomeBGs: number[],
    estimatedBasal: number[],
    isf: number,
    lowBG: number,
    adjFactor: number,
  ) {
    for (let i = 0; i < 288; i++) {
      if (!continueArr[i]) continue;
      let safeToAddInsulin = true;
      for (let j = 0; j < currentCurves[i].length; j++) {
        const idx = (i + j) % 288;
        const BGChangeIfAdded = currentCurves[i][j] * currentAdjustment * isf;
        if (predictedBGs[idx] - BGChangeIfAdded < lowBG) {
          safeToAddInsulin = false;
          continueArr[i] = false;
          break;
        }
      }
      if (safeToAddInsulin) {
        for (let m = 0; m < currentCurves[i].length; m++) {
          const idx = (i + m) % 288;
          const BGChange = currentCurves[i][m] * currentAdjustment * isf;
          const outcomeBGChange = BGChange * adjFactor;
          predictedBGs[idx] -= BGChange;
          outcomeBGs[idx] -= outcomeBGChange;
        }
        estimatedBasal[i] += currentAdjustment * adjFactor;
      }
    }
  }

  function logs() {
    console.log('startingBGs', startingBGs);
    console.log('predictedBGs', outcomeBGs);
    console.log('estimatedBasals', estimatedBasal);

    const predictedBGAverage = outcomeBGs.reduce((a, b) => a + b, 0) / outcomeBGs.length;
    console.log('predictedBGAverage', predictedBGAverage);

    const StartingTotalBasal = startingBasals.reduce((sum, val) => sum + val, 0);
    const EstimatedTotalBasal = estimatedBasal.reduce((sum, val) => sum + val, 0);
    const TotalBasalChange = EstimatedTotalBasal - StartingTotalBasal;
    console.log('StartingTotalBasal', StartingTotalBasal);
    console.log('EstimatedTotalBasal', EstimatedTotalBasal);
    console.log('TotalBasalChange', TotalBasalChange);
  }

  // Final rounding and hourly sums
  function roundToNearest(num: number, nearest: number): number {
    return Math.round(num / nearest) * nearest;
  }
  const tempBasal: string[] = [];
  const adjustedBasal: string[] = [];
  for (let i = 0; i < 24; i++) {
    let sumOld = 0;
    let sumNew = 0;
    for (let j = i * 12; j < (i + 1) * 12; j++) {
      sumOld += roundToNearest(startingBasals[j], 0.05);
      sumNew += roundToNearest(estimatedBasal[j], 0.05);
    }
    tempBasal.push(sumOld.toFixed(2));
    adjustedBasal.push(sumNew.toFixed(2));
  }
  return { tempBasal, adjustedBasal };
}

/**
 * adjustBasalRatesUsingProfileBasals:
 * Same approach as above but uses profileBasal instead of actualBasal.
 */
export async function adjustBasalRatesUsingProfileBasals(
  averageCombinedData: CombinedData[],
  userOptions: UserOptions,
): Promise<{ tempBasal: string[]; adjustedBasal: string[] }> {
  const isf = averageCombinedData[0].isf;
  const lowTargetBG = userOptions.lowTargetBG;
  const targetBG = userOptions.targetBG;

  const startingBGs = averageCombinedData.map((d) => d.bg);
  const predictedBGs = averageCombinedData.map((d) => d.bg);
  const outcomeBGs = averageCombinedData.map((d) => d.bg);

  let startingBasals = averageCombinedData.map((d) => d.profileBasal / 12);
  let startingBasalsPlusBolus = averageCombinedData.map(
    (d) => d.profileBasal / 12 + d.bolusInsulin / 12,
  );
  let estimatedBasal = averageCombinedData.map((d) => d.profileBasal / 12);

  const DIACurves = getDIA(startingBasalsPlusBolus, 0, userOptions);
  const averageDIALength =
    DIACurves.reduce((acc, curve) => acc + curve.length, 0) / DIACurves.length / 12;
  const averageBG =
    averageCombinedData.reduce((acc, d) => acc + d.bg, 0) / averageCombinedData.length;

  const insulinLikelyNeeded = ((averageBG - targetBG) / isf) * (24 / averageDIALength) * 2;
  const insulinNeededPerHour = insulinLikelyNeeded / 24;
  const adjustmentFactor = userOptions.adjustmentFactor;

  await runCalcs();

  async function runCalcs() {
    const continueLoop1 = new Array(288).fill(true);
    const continueLoop6 = new Array(288).fill(true);
    const continueLoop7 = new Array(288).fill(true);
    const continueLoop8 = new Array(288).fill(true);
    const continueLoop9 = new Array(288).fill(true);

    let currentAdjustment = 0;

    // RAISE passes
    for (let i = 0; i < 20; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / -10;
      const currentCurves = getDIA(startingBasalsPlusBolus, currentAdjustment, userOptions);
      raiseBGValues(
        currentCurves,
        currentAdjustment,
        1,
        continueLoop1,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }

    // LOWER passes
    for (let i = 0; i < 2; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / 2;
      const currentCurves = getDIA(estimatedBasal, currentAdjustment, userOptions);
      lowerBGValues(
        currentCurves,
        currentAdjustment,
        1,
        continueLoop6,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }
    for (let i = 0; i < 4; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / 4;
      const currentCurves = getDIA(estimatedBasal, currentAdjustment, userOptions);
      lowerBGValues(
        currentCurves,
        currentAdjustment,
        2,
        continueLoop7,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }
    for (let i = 0; i < 16; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / 8;
      const currentCurves = getDIA(estimatedBasal, currentAdjustment, userOptions);
      lowerBGValues(
        currentCurves,
        currentAdjustment,
        3,
        continueLoop8,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }
    for (let i = 0; i < 16; i++) {
      currentAdjustment = (insulinNeededPerHour / 12) / 10;
      const currentCurves = getDIA(estimatedBasal, currentAdjustment, userOptions);
      lowerBGValues(
        currentCurves,
        currentAdjustment,
        4,
        continueLoop9,
        predictedBGs,
        outcomeBGs,
        estimatedBasal,
        isf,
        lowTargetBG,
        adjustmentFactor,
      );
    }
    logs();
  }

  function raiseBGValues(
    currentCurves: number[][],
    currentAdjustment: number,
    count: number,
    continueArr: boolean[],
    predictedBGs: number[],
    outcomeBGs: number[],
    estimatedBasal: number[],
    isf: number,
    lowBG: number,
    adjFactor: number,
  ) {
    for (let i = 0; i < 288; i++) {
      if (!continueArr[i]) continue;
      let shouldAdjust = false;
      for (let j = 0; j < currentCurves[i].length; j++) {
        const idx = (i + j) % 288;
        if (predictedBGs[idx] < lowBG && estimatedBasal[i] >= Math.abs(currentAdjustment)) {
          shouldAdjust = true;
          break;
        }
      }
      if (shouldAdjust) {
        for (let m = 0; m < currentCurves[i].length; m++) {
          const idx = (i + m) % 288;
          const BGChange = currentCurves[i][m] * currentAdjustment * isf;
          const outcomeBGChange = BGChange * adjFactor;
          predictedBGs[idx] -= BGChange;
          outcomeBGs[idx] -= outcomeBGChange;
        }
        estimatedBasal[i] += currentAdjustment;
      } else {
        continueArr[i] = false;
      }
    }
  }

  function lowerBGValues(
    currentCurves: number[][],
    currentAdjustment: number,
    count: number,
    continueArr: boolean[],
    predictedBGs: number[],
    outcomeBGs: number[],
    estimatedBasal: number[],
    isf: number,
    lowBG: number,
    adjFactor: number,
  ) {
    for (let i = 0; i < 288; i++) {
      if (!continueArr[i]) continue;
      let safeToAddInsulin = true;
      for (let j = 0; j < currentCurves[i].length; j++) {
        const idx = (i + j) % 288;
        const BGChangeIfAdded = currentCurves[i][j] * currentAdjustment * isf;
        if (predictedBGs[idx] - BGChangeIfAdded < lowBG) {
          safeToAddInsulin = false;
          continueArr[i] = false;
          break;
        }
      }
      if (safeToAddInsulin) {
        for (let m = 0; m < currentCurves[i].length; m++) {
          const idx = (i + m) % 288;
          const BGChange = currentCurves[i][m] * currentAdjustment * isf;
          const outcomeBGChange = BGChange * adjFactor;
          predictedBGs[idx] -= BGChange;
          outcomeBGs[idx] -= outcomeBGChange;
        }
        estimatedBasal[i] += currentAdjustment * adjFactor;
      }
    }
  }

  function logs() {
    console.log('startingBGs', startingBGs);
    console.log('predictedBGs', outcomeBGs);
    console.log('estimatedBasals', estimatedBasal);
    const predictedBGAverage = outcomeBGs.reduce((a, b) => a + b, 0) / outcomeBGs.length;
    console.log('predictedBGAverage', predictedBGAverage);
    const StartingTotalBasal = sumArray(startingBasals);
    const EstimatedTotalBasal = sumArray(estimatedBasal);
    const TotalBasalChange = EstimatedTotalBasal - StartingTotalBasal;
    console.log('StartingTotalBasal', StartingTotalBasal);
    console.log('EstimatedTotalBasal', EstimatedTotalBasal);
    console.log('TotalBasalChange', TotalBasalChange);
  }

  function sumArray(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0);
  }

  function roundToNearest(num: number, nearest: number): number {
    return Math.round(num / nearest) * nearest;
  }
  const tempBasal: string[] = [];
  const adjustedBasal: string[] = [];
  for (let i = 0; i < 24; i++) {
    let sumOld = 0;
    let sumNew = 0;
    for (let j = i * 12; j < (i + 1) * 12; j++) {
      sumOld += roundToNearest(startingBasals[j], 0.05);
      sumNew += roundToNearest(estimatedBasal[j], 0.05);
    }
    tempBasal.push(sumOld.toFixed(2));
    adjustedBasal.push(sumNew.toFixed(2));
  }
  return { tempBasal, adjustedBasal };
}
