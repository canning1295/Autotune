// File: src/calculations/GIR.ts

/**
 * GIRCurve:
 * Based on the old 'GIR.js' logic. 
 * Returns an array of ~1920 points describing the shape
 * of a glucose infusion response curve, then cuts it down 
 * (the old code had some big polynomials).
 *
 * @param insulinKG  => The insulin amount in U/kg 
 * @param diaAdjustment => The user’s chosen duration of insulin activity factor
 */
export function GIRCurve(
    insulinKG: number,
    diaAdjustment: number,
  ): number[] {
    // The old code divides insulinKG by diaAdjustment:
    insulinKG = insulinKG / diaAdjustment;
  
    const xData: number[] = new Array(1920);
    for (let i = 0; i < 1920; i++) {
      // 15 / 3600 = 0.004166...
      const x = i * (15.0 / 3600.0);
      xData[i] = x;
    }
  
    const smallYData = getSmallYData(xData);
    const mediumYData = getMediumYData(xData);
    const largeYData = getLargeYData(xData);
  
    // Then the code picks or interpolates among these depending on insulinKG
    let newCurve: number[] = [];
  
    if (insulinKG < 0.1) {
      // ...some custom logic
      newCurve = getVerySmallCurve(xData, insulinKG);
    } else if (insulinKG === 0.1) {
      newCurve = getTrimmed(smallYData);
    } else if (insulinKG > 0.1 && insulinKG < 0.2) {
      newCurve = getIntermediateYData(xData, insulinKG);
    } else if (insulinKG === 0.2) {
      newCurve = getTrimmed(mediumYData);
    } else if (insulinKG > 0.2 && insulinKG < 0.4) {
      newCurve = getIntermediateYData(xData, insulinKG);
    } else {
      // i.e. insulinKG >= 0.4
      newCurve = getTrimmed(largeYData);
    }
  
    return newCurve;
  }
  
  /**
   * Implementation details from old code
   * for the various polynomial fits:
   */
  function getSmallYData(xData: number[]): number[] {
    const arr: number[] = [];
    for (let i = 0; i < xData.length; i++) {
      const x = xData[i];
      const y =
        0.0033820425120803 * x ** 5 -
        0.0962642502970792 * x ** 4 +
        1.01612334948604 * x ** 3 -
        4.7280409167367 * x ** 2 +
        8.2811624637053 * x -
        0.46588320732383;
      arr.push(y);
    }
    return arr;
  }
  function getMediumYData(xData: number[]): number[] {
    const arr: number[] = [];
    for (let i = 0; i < xData.length; i++) {
      const x = xData[i];
      const y =
        0.0004449113905105 * x ** 6 -
        0.0097881251143144 * x ** 5 +
        0.0487062677027909 * x ** 4 +
        0.339550928503582 * x ** 3 -
        3.86353726574935 * x ** 2 +
        9.82153060477826 * x -
        0.501667502965592;
      arr.push(y);
    }
    return arr;
  }
  function getLargeYData(xData: number[]): number[] {
    const arr: number[] = [];
    for (let i = 0; i < xData.length; i++) {
      const x = xData[i];
      const y =
        -0.0224550824431891 * x ** 4 +
        0.532481986817537 * x ** 3 -
        4.27409774902092 * x ** 2 +
        11.6354217632198 * x -
        0.0653457810255797;
      arr.push(y);
    }
    return arr;
  }
  
  /**
   * getTrimmed:
   * The old code tries to find the “peak” and cut off the tail 
   * at ~1.75% of that. 
   * Below is a simpler version that you can refine as needed.
   */
  function getTrimmed(yData: number[]): number[] {
    let peakValue = 0;
    for (const val of yData) {
      if (val > peakValue) {
        peakValue = val;
      }
    }
    const stop = peakValue * 0.0175;
    const newCurve: number[] = [];
    for (let i = 0; i < yData.length; i++) {
      if (i < 60 && yData[i] > 0) {
        newCurve.push(yData[i]);
      } else if (yData[i] > stop) {
        newCurve.push(yData[i]);
      }
    }
    return newCurve;
  }
  
  /**
   * getIntermediateYData:
   * Interpolates between small/medium or medium/large curves
   * if insulinKG is between 0.1 and 0.2 or 0.2 and 0.4
   */
  function getIntermediateYData(xData: number[], insulinKG: number): number[] {
    const smallY = getSmallYData(xData);
    const mediumY = getMediumYData(xData);
    const largeY = getLargeYData(xData);
  
    const newArr: number[] = [];
    for (let i = 0; i < xData.length; i++) {
      let intermediateY = 0;
      if (insulinKG < 0.2) {
        // interpolate between small & medium
        const ratio = (insulinKG - 0.1) / (0.2 - 0.1);
        intermediateY = smallY[i] + ratio * (mediumY[i] - smallY[i]);
      } else {
        // 0.2 < insulinKG < 0.4 => between medium & large
        const ratio = (insulinKG - 0.2) / (0.4 - 0.2);
        intermediateY = mediumY[i] + ratio * (largeY[i] - mediumY[i]);
      }
      newArr.push(intermediateY);
    }
    return getTrimmed(newArr);
  }
  
  /**
   * getVerySmallCurve:
   * If insulinKG < 0.1, old code had a special polynomial approach.
   * For brevity, we mimic that logic or just reuse smallY with scaling.
   */
  function getVerySmallCurve(xData: number[], insulinKG: number): number[] {
    // We can do something simpler, or replicate the old code’s method
    const base = getSmallYData(xData);
    // scale it
    const newArr = base.map((val) => val * insulinKG * 10.0);
    return getTrimmed(newArr);
  }