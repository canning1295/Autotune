// File: src/api/nightscout/getBgData.ts
import { getData, saveData } from '../../utils/localDatabase';
import { UserOptions } from '../../types/AutotuneTypes';

export interface BGEntry {
  bg: number;
  time: Date; // or string, but Date is often more convenient
}

/**
 * Fetch BG data for a given date from either local DB or Nightscout if not found.
 */
export async function getBGs(
  currentDate: Date,
  userOptions: UserOptions,
): Promise<BGEntry[]> {
  const dateKey = currentDate.toISOString().split('T')[0];
  // Try local DB first
  let bgArray = await getData<BGEntry[]>('BGs', dateKey);
  if (bgArray) {
    return bgArray!;
  }

  // If not found locally, fetch from Nightscout
  // We replicate the old logic to figure out the start/end times
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  // Pad function
  function padNumber(num: number): string {
    return num.toString().padStart(2, '0');
  }

  // We want midnight of currentDate, minus ~2.5 minutes
  const dateStart = new Date(currentDate);
  dateStart.setHours(0, 0, 0, 0);
  const adjustedStart = new Date(dateStart.getTime() - (2 * 60 * 1000 + 30 * 1000));
  const dateStringUTC = `${adjustedStart.getUTCFullYear()}-${padNumber(
    adjustedStart.getUTCMonth() + 1,
  )}-${padNumber(adjustedStart.getUTCDate())}T${padNumber(
    adjustedStart.getUTCHours(),
  )}:${padNumber(adjustedStart.getUTCMinutes())}:${padNumber(
    adjustedStart.getUTCSeconds(),
  )}Z`;

  const nextDateMidnight = new Date(nextDate);
  nextDateMidnight.setHours(0, 0, 0, 0);
  const nextDateStringUTC = `${nextDateMidnight.getUTCFullYear()}-${padNumber(
    nextDateMidnight.getUTCMonth() + 1,
  )}-${padNumber(nextDateMidnight.getUTCDate())}T${padNumber(
    nextDateMidnight.getUTCHours(),
  )}:00:00Z`;

  const bgUrl = `${userOptions.url}/api/v1/entries/sgv.json?find[dateString][$gte]=${dateStringUTC}&find[dateString][$lte]=${nextDateStringUTC}&count=1000000`;

  const response = await fetch(bgUrl);
  const bgJSON = await response.json();

  // Convert response
  bgArray = (bgJSON || []).map((i: any) => {
    return {
      bg: i.sgv,
      time: new Date(i.dateString), // Convert to Date object here
    } as BGEntry;
  });
  // Reverse if needed
  bgArray!.reverse();

  // Round each time to nearest 5-min
  bgArray!.forEach((entry) => {
    entry.time = roundToNearestFiveMinutes(entry.time);
  });

  // Save to local DB
  await saveData('BGs', dateKey, bgArray, new Date().toISOString());

  return bgArray!;
}

// Helper to round a date to the nearest 5 minutes
function roundToNearestFiveMinutes(date: Date): Date {
  const coeff = 1000 * 60 * 5;
  return new Date(Math.round(date.getTime() / coeff) * coeff);
}