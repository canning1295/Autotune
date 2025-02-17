// File: src/api/nightscout/getTempBasalData.ts
import { getData, saveData } from '../../utils/localDatabase';
import { UserOptions } from '../../types/AutotuneTypes';

export interface TempBasalEntry {
  rate: number;       // units per hour
  duration: number;   // in minutes
  created_at: Date;   // the start time
}

/**
 * getTempBasalData:
 * Fetch all "Temp Basal" treatments for the given date from local DB or Nightscout.
 */
export async function getTempBasalData(
  currentDate: Date,
  userOptions: UserOptions,
): Promise<TempBasalEntry[]> {
  const dateKey = currentDate.toISOString().split('T')[0];

  // Check local DB first
  let storedData = await getData<TempBasalEntry[]>('Basal_Rates', dateKey);
  if (storedData) {
    return storedData;
  }

  // Otherwise, fetch from Nightscout
  // We'll mimic old logic: start 00:00 of currentDate => 00:00 next day
  const dateStart = new Date(currentDate);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + 1);

  const startString = dateStart.toISOString();
  const endString = dateEnd.toISOString();

  // Build URL
  const tempBasalUrl = `${userOptions.url}/api/v1/treatments.json?find[created_at][$gte]=${startString}&find[created_at][$lte]=${endString}&find[eventType]=Temp+Basal&count=1000000`;

  const response = await fetch(tempBasalUrl);
  const tempBasalJSON = await response.json();

  let tempBasals: TempBasalEntry[] = (tempBasalJSON || []).map((item: any) => {
    return {
      rate: item.rate ?? 0,
      duration: item.duration ?? 0,
      created_at: new Date(item.created_at),
    };
  });

  // Reverse, in case we want earliest first
  tempBasals = tempBasals.reverse();

  // Adjust overlapping durations
  for (let i = 1; i < tempBasals.length; i++) {
    const prev = tempBasals[i - 1];
    const prevEnd = new Date(prev.created_at.getTime() + prev.duration * 60_000);
    const currStart = tempBasals[i].created_at;

    if (prevEnd > currStart) {
      // Overlap => shorten previous
      const diffMinutes = (currStart.getTime() - prev.created_at.getTime()) / 60_000;
      prev.duration = diffMinutes;
    }
  }

  // Save to DB
  await saveData('Basal_Rates', dateKey, tempBasals, new Date().toISOString());
  return tempBasals;
}