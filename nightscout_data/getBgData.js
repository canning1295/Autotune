import { saveData, getData } from "../localDatabase.js"

let bgsArray = []
export async function getBGs(options) {
	let currentDate = new Date(options.dateStart)
	let nextDate = new Date(currentDate)
	nextDate.setDate(currentDate.getDate() + 1)
	currentDate = currentDate.toISOString().split("T")[0]
	nextDate = new Date(nextDate).toISOString().split("T")[0]
	let daysDiff = Math.floor(
		(new Date(options.dateEnd) - new Date(options.dateStart)) /
			(1000 * 60 * 60 * 24)
	) + 1

	for (let i = 0; i < daysDiff; i++) {
		if (checkBGDataExists(options.user, currentDate) === false) {
			const bgUrl = options.url.concat(
				"api/v1/entries/sgv.json?find[dateString][$gte]=",
				currentDate,
				"&find[dateString][$lte]=",
				nextDate,
				"&count=1000000"
			)

			console.log("Grabbing BGs JSON from Nightscout...", [{bgUrl}])
			const response = await fetch(bgUrl)
			const bgJSON = await response.json()
			console.log("Success(" + getSize(bgJSON) + " KB)")

			let bgArray = []
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
			const key = `bg_${currentDate}`;
			saveData(options.user, key, bgArray, currentDate);
			adjustFirstEntry(bgArray, options.user)
		} else {console.log("BGs already exist for " + currentDate)}
		// add 1 day to currentDate and nextDate
		currentDate = new Date(currentDate)
		currentDate.setDate(currentDate.getDate() + 1)
		currentDate = currentDate.toISOString().split("T")[0]
		nextDate = new Date(nextDate)
		nextDate.setDate(nextDate.getDate() + 1)
		nextDate = nextDate.toISOString().split("T")[0]
	}
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

async function adjustFirstEntry(bgArray, user) {
	if (!bgArray || bgArray.length === 0) {
	  return bgArray;
	}
  
	const firstEntry = bgArray[0];
	const firstEntryTime = firstEntry.time;
	const midnight = new Date(firstEntryTime);
	midnight.setUTCHours(0, 0, 0, 0);
  
	if (firstEntryTime.getTime() !== midnight.getTime()) {
	  const previousDay = new Date(midnight);
	  previousDay.setDate(previousDay.getDate() - 1);
	  const previousDayStr = previousDay.toISOString().substring(0, 10)
  
	  const dataExists = await checkBGDataExists(user, previousDayStr);
  
	  if (dataExists) {
		const previousDayData = await getData(user, `bg_${previousDayStr}`);
		const lastEntry = previousDayData[previousDayData.length - 1];
		// If lastEntry.time is within 5 minutes of midnight, then we can use it.
		const fiveMinutesBeforeMidnight = new Date(midnight);
		fiveMinutesBeforeMidnight.setMinutes(-5);
  
		if (lastEntry) {
		  const entry = {
			bg: lastEntry.bg,
			time: midnight,
		  };
		  bgArray.unshift(entry);
		}
	  } else {
		const fiveMinutesAfterMidnight = new Date(midnight);
		fiveMinutesAfterMidnight.setMinutes(5);
  
		if (firstEntryTime.getTime() === fiveMinutesAfterMidnight.getTime()) {
		  const entry = {
			bg: firstEntry.bg,
			time: midnight,
		  };
		  bgArray.unshift(entry);
		}
	  }
	}
  
	return bgArray;
  }
  
async function checkBGDataExists(user, currentDate) {
const key = `bg_${currentDate}`;
const data = await getData(user, key);

if (data) {
	return true;
} else {
	return false;
}
}
  