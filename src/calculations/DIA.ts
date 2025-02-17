// File: src/calculations/DIA.ts
import { UserOptions } from '../types/AutotuneTypes';
import { GIRCurve } from './GIR';

/**
 * getDIA:
 * Returns an array of 288 positions, each containing
 * an array of 'shortened' GIR curve percents. 
 */
export function getDIA(
  netBasals: number[],
  insulinAdjustment: number,
  userOptions: UserOptions,
): number[][] {
  // netBasals is an array of length 288, each representing
  // units per hour / 12 (units per 5 minutes) or similar.

  const insulinDeliveredArr = [...netBasals]; // basically the same array, length 288

  // This array will store the GIR curve in percentages for each of the 288 intervals.
  const DIACurves: number[][] = new Array(288).fill([]).map(() => []);

  for (let i = 0; i < 288; i++) {
    // Sum the insulin for the preceding poolingTime
    let insulin = 0;
    const blocksToLookBack = Math.floor(userOptions.poolingTime / 5) || 0;
    for (let j = i - blocksToLookBack; j < i; j++) {
      let index = j;
      if (index < 0) {
        index = insulinDeliveredArr.length + j;
      }
      insulin += insulinDeliveredArr[index];
    }

    // The GIR curve for (insulin + insulinAdjustment) / user weight...
    const curve = GIRCurve(
      (insulin + insulinAdjustment) / userOptions.weight,
      userOptions.diaAdjustment,
    );

    // Convert that curve into an array of partial sums => percentages
    const GIRCurvePercents: number[] = [];
    let GIRCurveTotal = 0;

    for (let k = 0; k < curve.length; k++) {
      GIRCurveTotal += curve[k];
    }

    let currentTotal = 0;
    for (let k = 0; k < curve.length; k++) {
      currentTotal += curve[k];
      if (k === 0) {
        // The original code forced the first value to 0.
        GIRCurvePercents.push(0);
      } else {
        GIRCurvePercents.push(currentTotal / GIRCurveTotal);
      }
    }

    DIACurves[i] = GIRCurvePercents;
  }

  // Now shorten the curves from 1920 points down to steps of 20, or so
  // The original code does this with "shortenCurve"
  const shortenedDIACurves: number[][] = DIACurves.map((curve) =>
    shortenCurve(curve),
  );

  return shortenedDIACurves;
}

function shortenCurve(curve: number[]): number[] {
  // Step by 20
  const shortened: number[] = [];
  for (let k = 0; k < curve.length; k += 20) {
    shortened.push(curve[k]);
  }
  return shortened;
}