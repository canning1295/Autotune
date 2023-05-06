import { getData } from "../localDatabase.js";

// Function to retrieve Combined_Data for a given day and calculate the total insulin delivered
export async function getInsulinDelivered(date) {
    const key = date;
    const objectStoreName = 'Combined_Data';
    const combinedDataArray = await getData(objectStoreName, key);
    let totalInsulinDelivered = 0;
    let programmedTotalInsulinDelivered = 0;
    let i = 0;
  
    for (const combinedData of combinedDataArray) {
        const actualBasal = combinedData.actualBasal
        const profileBasal = combinedData.profileBasal

        if (actualBasal === undefined || actualBasal === null || isNaN(actualBasal)) {
        throw new Error('Invalid actualBasal data');
        }

        const insulinPerEntry = actualBasal / 60 * 5; // insulin delivered in the 5 minute period
        const insulinPerEntryProgrammed = profileBasal / 60 * 5; // *Programmed (default profile) insulin delivered in the 5 minute period
        totalInsulinDelivered += insulinPerEntry;
        programmedTotalInsulinDelivered += insulinPerEntryProgrammed;

        i++
    }

    // Round the result to a precision of 1 decimal places
    totalInsulinDelivered = parseFloat(totalInsulinDelivered.toFixed(1));
    programmedTotalInsulinDelivered = parseFloat(programmedTotalInsulinDelivered.toFixed(1));
}