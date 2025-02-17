// src/calculations/checks.ts
import { getData } from '../utils/localDatabase';

export async function getInsulinDelivered(date: string): Promise<{
  totalInsulinDelivered: number;
  programmedTotalInsulinDelivered: number;
}> {
  // objectStoreName is 'Combined_Data'
  const combinedDataArray = await getData<any[]>('Combined_Data', date);
  if (!combinedDataArray) {
    return { totalInsulinDelivered: 0, programmedTotalInsulinDelivered: 0 };
  }

  let totalInsulinDelivered = 0;
  let programmedTotalInsulinDelivered = 0;

  for (const combinedData of combinedDataArray) {
    const actualBasal = combinedData.actualBasal ?? 0;
    const profileBasal = combinedData.profileBasal ?? 0;

    // 5-minute chunk => actualBasal is U/hour, so we do (U/hour / 60) * 5
    totalInsulinDelivered += (actualBasal / 60) * 5;
    programmedTotalInsulinDelivered += (profileBasal / 60) * 5;
  }

  totalInsulinDelivered = parseFloat(totalInsulinDelivered.toFixed(1));
  programmedTotalInsulinDelivered = parseFloat(
    programmedTotalInsulinDelivered.toFixed(1),
  );

  return {
    totalInsulinDelivered,
    programmedTotalInsulinDelivered,
  };
}