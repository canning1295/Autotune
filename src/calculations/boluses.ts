// src/calculations/boluses.ts

/**
 * getInsulinDataByTimeWindow:
 * Returns an array representing how much insulin was delivered 
 * within each time window.
 */
export function getInsulinDataByTimeWindow(
    bolusData: { timestamp: string; insulin: number }[],
    selectedDate: Date,
    timeWindow: number,
  ): number[] {
    if (![1, 2, 3, 4, 6, 8].includes(timeWindow)) {
      throw new Error('Invalid time window');
    }
  
    const result: number[] = [];
    const date = new Date(selectedDate);
    const numWindows = 24 / timeWindow;
  
    for (let i = 0; i < numWindows; i++) {
      const startTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        i * timeWindow,
      );
      const endTime = new Date(startTime.getTime() + timeWindow * 60 * 60 * 1000);
  
      let insulin = 0;
      for (const bolus of bolusData) {
        const bolusTime = new Date(bolus.timestamp);
        if (bolusTime >= startTime && bolusTime < endTime) {
          insulin += bolus.insulin;
        }
      }
      result.push(insulin);
    }
    return result;
  }
  
  /**
   * getAverageInsulinForTime:
   * Given a windows array & a specific time, 
   * figure out which window the time belongs to 
   * and return average for that slice of time.
   */
  export function getAverageInsulinForTime(
    bolusWindows: number[],
    time: Date,
  ): number {
    const minutesPerWindow = (24 * 60) / bolusWindows.length;
    const timeInMinutes = time.getHours() * 60 + time.getMinutes();
    const windowIndex = Math.floor(timeInMinutes / minutesPerWindow);
    const totalInsulin = bolusWindows[windowIndex];
    const intervalFraction = 5 / minutesPerWindow;
    return totalInsulin * intervalFraction;
  }
  
  /**
   * getValueForTime:
   * Utility to pick a value from an array that is sorted by "timeAsSeconds"
   */
  export function getValueForTime(
    array: { timeAsSeconds: number; value: number }[],
    timeAsSeconds: number,
  ): number {
    let value = array.length > 0 ? array[0].value : 0;
    for (const item of array) {
      if (item.timeAsSeconds <= timeAsSeconds) {
        value = item.value;
      } else {
        break;
      }
    }
    return value;
  }