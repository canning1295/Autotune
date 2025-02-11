export function getInsulinDataByTimeWindow(bolusData, selectedDate, timeWindow) {
    if (![1, 2, 3, 4, 6, 8].includes(timeWindow)) {
      throw new Error('Invalid time window');
    }
  
    const result = [];
    const date = new Date(selectedDate);
  
    const numWindows = 24 / timeWindow;
  
    for (let i = 0; i < numWindows; i++) {
      const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i * timeWindow);
      const endTime = new Date(startTime.getTime() + timeWindow * 60 * 60 * 1000);
      let insulin = 0;
  
      for (let j = 0; j < bolusData.length; j++) {
        const bolus = bolusData[j];
        const bolusTime = new Date(bolus.timestamp);
  
        if (bolusTime >= startTime && bolusTime < endTime) {
          insulin += bolus.insulin;
        }
      }
  
      result.push(insulin);
    }
  
    return result;
  }
  
  
  export function getAverageInsulinForTime(bolusWindows, time) {
    const minutesPerWindow = (24 * 60) / bolusWindows.length;
    const timeInMinutes = time.getHours() * 60 + time.getMinutes();
    const windowIndex = Math.floor(timeInMinutes / minutesPerWindow);
    const totalInsulin = bolusWindows[windowIndex];
    const intervalFraction = 5 / minutesPerWindow;
  
    return totalInsulin * intervalFraction;
  }
  
  
  
  export function getValueForTime(array, timeAsSeconds) {
    let value = array[0].value;
    for (let i = 0; i < array.length; i++) {
        if (array[i].timeAsSeconds <= timeAsSeconds) {
            value = array[i].value;
        } else {
            break;
        }
    }
    return value;
}   