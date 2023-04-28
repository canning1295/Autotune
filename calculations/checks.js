import { getData } from "../localDatabase.js";

// Function to retrieve Combined_Data for a given day and calculate the total insulin delivered
export async function getInsulinDelivered(date) {
  const combinedDataKey = `Combined_Data_${date}`;
  const objectStoreName = 'Combined_Data';
  const combinedDataArray = await getData(objectStoreName, combinedDataKey);

  if (!combinedDataArray || combinedDataArray.length === 0) {
    throw new Error(`No Combined_Data found for the date: ${date}`);
  }

  // Calculate the total insulin delivered for the day
  let totalInsulinDelivered = 0;
  const minutesInDay = 1440;

  for (const combinedData of combinedDataArray) {
    const actualBasal = combinedData.actualBasal;

    if (actualBasal === undefined || actualBasal === null || isNaN(actualBasal)) {
      throw new Error('Invalid actualBasal data');
    }

    const insulinPerEntry = actualBasal * (minutesInDay / combinedDataArray.length) / 60;
    totalInsulinDelivered += insulinPerEntry;
  }

  // Round the result to a precision of 6 decimal places
  totalInsulinDelivered = parseFloat(totalInsulinDelivered.toFixed(6));

  return totalInsulinDelivered;
}


