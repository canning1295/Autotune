// src/calculations/createAvgCombinedData.ts
import { getData } from '../utils/localDatabase';
import { CombinedData } from '../types/AutotuneTypes';

/**
 * getAverageCombinedData:
 * For each selected date, fetches the Combined_Data array (288 entries),
 * then sums up the relevant properties (bg, profileBasal, etc.).
 * Finally, divides to produce an "average" for each 5-min slot across all dates.
 */
export async function getAverageCombinedData(
  selectedDates: Date[],
): Promise<CombinedData[]> {
  // We'll accumulate arrays from each date. Then average them.
  const allCombinedData: CombinedData[][] = [];

  // 1) Gather each day's Combined_Data
  for (const dt of selectedDates) {
    const key = dt.toISOString().slice(0, 10);
    const dailyData = await getData<CombinedData[]>('Combined_Data', key);
    if (dailyData && dailyData.length === 288) {
      allCombinedData.push(dailyData);
    }
  }

  // If no data found, return empty
  if (allCombinedData.length === 0) {
    return [];
  }

  // 2) Build an array of 288 "averages"
  const averageCombinedData: CombinedData[] = [];

  for (let i = 0; i < 288; i++) {
    let sumBg = 0;
    let sumProfileBasal = 0;
    let sumActualBasal = 0;
    let sumBolusInsulin = 0;
    let sumCarbRatio = 0;
    let sumHighTarget = 0;
    let sumIsf = 0;
    let sumLowTarget = 0;
    let count = 0;

    // sum across all days
    for (const dayArray of allCombinedData) {
      const slot = dayArray[i]; // the i-th 5-min block for that day
      sumBg += slot.bg;
      sumProfileBasal += slot.profileBasal;
      sumActualBasal += slot.actualBasal;
      sumBolusInsulin += slot.bolusInsulin;
      sumCarbRatio += slot.carbRatio;
      sumHighTarget += slot.highTarget;
      sumIsf += slot.isf;
      sumLowTarget += slot.lowTarget;
      count++;
    }

    // Make sure we have at least 1
    if (count === 0) {
      continue;
    }

    // 3) Average them
    const avgBg = sumBg / count;
    const avgProfileBasal = sumProfileBasal / count;
    const avgActualBasal = sumActualBasal / count;
    const avgBolusInsulin = sumBolusInsulin / count;
    const avgCarbRatio = sumCarbRatio / count;
    const avgHighTarget = sumHighTarget / count;
    const avgIsf = sumIsf / count;
    const avgLowTarget = sumLowTarget / count;

    // For the 'time' field, we can pick a dummy date (like 2000‑01‑01) offset by i * 5 minutes
    // or just reuse the first day’s time as a reference. Here, we do a generic 2000-01-01:
    const time = new Date('2000-01-01T00:00:00');
    time.setMinutes(time.getMinutes() + i * 5);

    averageCombinedData.push({
      time,
      bg: avgBg,
      profileBasal: avgProfileBasal,
      actualBasal: avgActualBasal,
      bolusInsulin: avgBolusInsulin,
      carbRatio: avgCarbRatio,
      highTarget: avgHighTarget,
      isf: avgIsf,
      lowTarget: avgLowTarget,
    });
  }

  return averageCombinedData;
}
