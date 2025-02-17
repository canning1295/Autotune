// File: src/api/nightscout/getBolusData.ts
import { getData, saveData } from '../../utils/localDatabase';
import { UserOptions } from '../../types/AutotuneTypes';

export interface BolusEntry {
  insulin: number;
  timestamp: string; 
  // or we can convert to Date if you prefer
}

/**
 * Fetch all boluses for a given date from local DB or from Nightscout.
 */
export async function getAllBoluses(
  currentDate: Date,
  userOptions: UserOptions,
): Promise<BolusEntry[]> {
  const dateKey = currentDate.toISOString().split('T')[0];

  // Check local DB
  let storedData = await getData<BolusEntry[]>('Boluses', dateKey);
  if (storedData) {
    return storedData;
  }

  // If not found, build the request
  function padNumber(num: number): string {
    return num.toString().padStart(2, '0');
  }

  const dateStart = new Date(currentDate);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + 1);

  // toISOString() can be used directly, or replicate old logic:
  const startString = dateStart.toISOString();
  const endString = dateEnd.toISOString();

  // Query for eventType=Carb Correction
  const carbCorrectionUrl = `${userOptions.url}/api/v1/treatments.json?find[created_at][$gte]=${startString}&find[created_at][$lte]=${endString}&find[eventType]=Carb+Correction&count=1000000`;

  const response1 = await fetch(carbCorrectionUrl);
  const carbCorrections = await response1.json();

  // Query for eventType=Correction Bolus
  const bolusUrl = `${userOptions.url}/api/v1/treatments.json?find[$or][0][created_at][$gte]=${startString}&find[created_at][$lte]=${endString}&find[eventType]=Correction+Bolus`;
  const response2 = await fetch(bolusUrl);
  const correctionBolus = await response2.json();

  // Combine them
  const combined = [...carbCorrections.reverse(), ...correctionBolus.reverse()].map(
    (item: any) => {
      return {
        insulin: item.insulin || item.insulinDelivered || 0,
        timestamp: item.created_at,
      } as BolusEntry;
    },
  );

  // Save to local DB
  await saveData('Boluses', dateKey, combined, new Date().toISOString());
  return combined;
}