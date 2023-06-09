import { saveData, getData } from "../utils/localDatabase.js"
import { options } from "../index.js"

let bgArray = []
export async function getBGs(currentDate) {
	currentDate = currentDate.toISOString().split("T")[0]
	bgArray = await getData('BGs', currentDate)
	if (!bgArray) {
		let NSDate1 = new Date(currentDate)
		let NSDate2 = new Date(currentDate)
		NSDate1.setDate(NSDate1.getDate() + 1)
		NSDate2.setDate(NSDate2.getDate() + 2)
		NSDate1 = NSDate1.toISOString().split("T")[0]
		NSDate2 = new Date(NSDate2).toISOString().split("T")[0]
		
		// Parse the date string and create a Date object.
		const dateObj = new Date(NSDate1);
		const nextDateObj = new Date(NSDate2);
		
		// Set the local time to midnight.
		dateObj.setHours(0, 0, 0, 0);
		nextDateObj.setHours(0, 0, 0, 0);
		
		// Subtract 2 minutes and 30 seconds from dateObj
		const adjustedDateObj = new Date(dateObj.getTime() - (2 * 60 * 1000 + 30 * 1000));
		
		// Create a function to pad single-digit numbers with a leading zero.
		function padNumber(number) {
			return number.toString().padStart(2, '0');
		}
		
		// Convert the date object to the desired string format.
		const dateStringUTC = `${adjustedDateObj.getUTCFullYear()}-${padNumber(adjustedDateObj.getUTCMonth() + 1)}-${padNumber(adjustedDateObj.getUTCDate())}T${padNumber(adjustedDateObj.getUTCHours())}:${padNumber(adjustedDateObj.getUTCMinutes())}:${padNumber(adjustedDateObj.getUTCSeconds())}Z`;
	
		const nextDateStringUTC = `${nextDateObj.getUTCFullYear()}-${padNumber(nextDateObj.getUTCMonth() + 1)}-${padNumber(nextDateObj.getUTCDate())}T${padNumber(nextDateObj.getUTCHours())}:00:00Z`;
		const bgUrl = options.url.concat(
			"/api/v1/entries/sgv.json?find[dateString][$gte]=",
			dateStringUTC,
			"&find[dateString][$lte]=",
			nextDateStringUTC,
			"&count=1000000"
		)
		// console.log("Grabbing BGs JSON from Nightscout...", bgUrl)
		const response = await fetch(bgUrl)
		const bgJSON = await response.json()
		// console.log("Success(" + getSize(bgJSON) + " KB)")

		bgArray = []
		bgJSON.map((i) => {
			bgArray.push({
				bg: i.sgv,
				time: new Date(i.dateString),
			})
		})
		bgArray.reverse()
		bgArray.forEach((bgObject) => {
			bgObject.time = roundToNearestFiveMinutes(bgObject.time);
		});
		const key = currentDate
		saveData('BGs', key, bgArray, currentDate);
		
	} else {
		//
	}

	return bgArray
}

function getSize(obj) {
	return (
		Math.round(
			(new TextEncoder().encode(JSON.stringify(obj)).length / 1024) * 10
		) / 10
	)
}

function roundToNearestFiveMinutes(date) {
	const coeff = 1000 * 60 * 5; // 5 minutes in milliseconds
	const roundedTime = new Date(Math.round(date.getTime() / coeff) * coeff);
	return roundedTime;
  }