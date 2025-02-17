// src/calculations/averageBGs.ts
import { getData } from '../utils/localDatabase';
/**
 * You might define an interface for BG record:
 */
interface BGRecord {
  bg: number;
  time: string; // or Date
}

/**
 * averageBGs:
 * For each date in selectedDates, it pulls BG data from the DB,
 * fills in missing intervals, sums, then divides for an overall average.
 */
export async function averageBGs(
  selectedDates: Date[],
): Promise<number[]> {
  // We'll store partial sums in an array of length 289
  const averages: number[] = new Array(289).fill(0);

  for (const date of selectedDates) {
    const key = date.toISOString().slice(0, 10);
    const bgData = await getData<BGRecord[]>('BGs', key);
    if (!bgData) continue; // no data found

    const filledValues: number[] = [];
    const t = new Date(date);

    for (let i = 0; i < 289; i++) {
      const matchingEntry = bgData.find((entry) => entry.time === t.toISOString());
      if (matchingEntry) {
        filledValues.push(matchingEntry.bg);
      } else {
        // attempt interpolation from previous or next
        const prev = filledValues[i - 1] ?? null;
        const next = bgData.find((entry) => new Date(entry.time) > t);
        let avgVal = prev;
        if (prev && next) {
          avgVal = (prev + next.bg) / 2;
        } else if (!prev && next) {
          avgVal = next.bg;
        }
        filledValues.push(avgVal ?? 0);
      }
      t.setMinutes(t.getMinutes() + 5);
    }

    for (let i = 0; i < 289; i++) {
      averages[i] += filledValues[i];
    }
  }

  // divide each element by the number of selected dates
  if (selectedDates.length > 0) {
    for (let i = 0; i < 289; i++) {
      averages[i] /= selectedDates.length;
    }
  }
  return averages;
}