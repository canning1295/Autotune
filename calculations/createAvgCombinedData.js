import { getData } from "../utils/localDatabase.js";

export async function getAverageCombinedData(selectedDates) {
    let allCombinedData = [];
  
    // Retrieve the combined data for each date
    for (let i = 0; i < selectedDates.length; i++) {
		let selectedDate = selectedDates[i].toISOString().slice(0, 10);
		let combinedData = await getData("Combined_Data", selectedDate);
		allCombinedData.push(combinedData);
    }
    
    let averageCombinedData = [];
    // console.log('allCombinedData: ', allCombinedData)
  
    // Calculate the average values for each time slot
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
  
		for (let j = 0; j < allCombinedData.length; j++) {

			if (allCombinedData[j][i]) {
			sumBg += allCombinedData[j][i].bg;
			sumProfileBasal += allCombinedData[j][i].profileBasal;
			sumActualBasal += allCombinedData[j][i].actualBasal;
			sumBolusInsulin += allCombinedData[j][i].bolusInsulin;
			sumCarbRatio += allCombinedData[j][i].carbRatio;
			sumHighTarget += allCombinedData[j][i].highTarget;
			sumIsf += allCombinedData[j][i].isf;
			sumLowTarget += allCombinedData[j][i].lowTarget;
			count++;
			}
		}
  
		// Calculate the average for each value
		let avgBg = sumBg / count;
		let avgProfileBasal = sumProfileBasal / count;
		let avgActualBasal = sumActualBasal / count;
		let avgBolusInsulin = sumBolusInsulin / count;
		let avgCarbRatio = sumCarbRatio / count;
		let avgHighTarget = sumHighTarget / count;
		let avgIsf = sumIsf / count;
		let avgLowTarget = sumLowTarget / count;
	
		// Set the time to 2000-01-01 with the same hours and minutes as the current time slot
		let time = new Date("2000-01-01T00:00:00");
		time.setMinutes(time.getMinutes() + i * 5);
	
		// Save the average values for the current time slot
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
		// console.log('averageCombinedData: ', averageCombinedData)
		return averageCombinedData;
}