import { saveData, getData } from "../localDatabase.js"
import { options } from "../index.js"

let bgArray = []
export async function getBGs(currentDate) {
	console.log("current Date: ", currentDate)
	// currentDate = new Date(currentDate)
	let nextDate = new Date(currentDate)
	nextDate.setDate(currentDate.getDate() + 1)
	currentDate = currentDate.toISOString().split("T")[0]
	nextDate = new Date(nextDate).toISOString().split("T")[0]

// Parse the date string and create a Date object.
const dateObj = new Date(currentDate);
const nextDateObj = new Date(nextDate);

// Set the local time to midnight.
dateObj.setHours(0, 0, 0, 0);
nextDateObj.setHours(0, 0, 0, 0);

// Create a function to pad single-digit numbers with a leading zero.
function padNumber(number) {
  return number.toString().padStart(2, '0');
}

// Convert the date object to the desired string format.
const dateStringUTC = `${dateObj.getUTCFullYear()}-${padNumber(dateObj.getUTCMonth() + 1)}-${padNumber(dateObj.getUTCDate())}T${padNumber(dateObj.getUTCHours())}:00:00Z`;
const nextDateStringUTC = `${nextDateObj.getUTCFullYear()}-${padNumber(nextDateObj.getUTCMonth() + 1)}-${padNumber(nextDateObj.getUTCDate())}T${padNumber(nextDateObj.getUTCHours())}:00:00Z`;

console.log('dateStringUTC',dateStringUTC); // Outputs "2023-04-25T06:00:00Z" (or another appropriate UTC offset depending on the local timezone)
console.log('nextDateStringUTC',nextDateStringUTC); // Outputs "2023-04-26T06:00:00Z" (or another appropriate UTC offset depending on the local timezone)

		if (await checkDataExists('BGs', currentDate) === false) {
			console.log("Line 13 was false")
			const bgUrl = options.url.concat(
				"/api/v1/entries/sgv.json?find[dateString][$gte]=",
				dateStringUTC,
				"&find[dateString][$lte]=",
				nextDateStringUTC,
				"&count=1000000"
			)
			console.log("Grabbing BGs JSON from Nightscout...", [{bgUrl}])
			const response = await fetch(bgUrl)
			const bgJSON = await response.json()
			console.log("Success(" + getSize(bgJSON) + " KB)")

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
			adjustFirstEntry(bgArray, options.user)
			saveData('BGs', key, bgArray, currentDate);
			
		} else {
			console.log("BGs already exist for " + currentDate)
			const databaseName = 'Autotune';
			const objectStoreName = options.user;
			const key = currentDate
			const request = indexedDB.open(databaseName);
			console.log('options', options)
			console.log('objectStoreName: ', objectStoreName, 'key: ', key, 'request: ', request)
			  
			return new Promise((resolve, reject) => {
				request.onsuccess = () => {
				const db = request.result;
				const transaction = db.transaction([objectStoreName], 'readonly');
				const objectStore = transaction.objectStore(objectStoreName);
				const getRequest = objectStore.get(key);
			
				getRequest.onerror = () => {
					reject(new Error('Failed to get data from object store'));
				};
			
				getRequest.onsuccess = () => {
					let bgData = getRequest.result?.value;
					if (typeof bgData === 'string') {
					bgData = JSON.parse(bgData).map(({ bg }) => parseFloat(bg));
					}
					resolve(bgData);
				};
				};
			
				request.onerror = () => {
				reject(new Error('Failed to open database'));
				};
			});
		}
		console.log("bgArray: ", bgArray)
	return bgArray
}
  
  

// export async function getBGsOnLoad(options) {
// 	let currentDate = new Date(options.dateStart)
// 	let nextDate = new Date(currentDate)
// 	nextDate.setDate(currentDate.getDate() + 1)
// 	currentDate = currentDate.toISOString().split("T")[0]
// 	nextDate = new Date(nextDate).toISOString().split("T")[0]
// 	let daysDiff = Math.floor(
// 		(new Date(options.dateEnd) - new Date(options.dateStart)) /
// 			(1000 * 60 * 60 * 24)
// 	) + 1

// 	for (let i = 0; i < daysDiff; i++) {
// 		if (checkBGDataExists(currentDate === false)) {
// 			const bgUrl = options.url.concat(
// 				"api/v1/entries/sgv.json?find[dateString][$gte]=",
// 				currentDate,
// 				"&find[dateString][$lte]=",
// 				nextDate,
// 				"&count=1000000"
// 			)

// 			console.log("Grabbing BGs JSON from Nightscout...", [{bgUrl}])
// 			const response = await fetch(bgUrl)
// 			const bgJSON = await response.json()
// 			console.log("Success(" + getSize(bgJSON) + " KB)")

// 			let bgArray = []
// 			bgJSON.map((i) => {
// 				bgArray.push({
// 					bg: i.sgv,
// 					time: new Date(i.dateString),
// 				})
// 			})
// 			bgArray.reverse()
// 			bgArray.forEach((bgObject) => {
// 				bgObject.time = roundToNearestFiveMinutes(bgObject.time);
// 			});
// 			const key = currentDate
// 			saveData('BGs', key, bgArray, currentDate);
// 			adjustFirstEntry(bgArray, options.user)
// 			// add 1 day to currentDate and nextDate
// 			currentDate = new Date(currentDate)
// 			currentDate.setDate(currentDate.getDate() + 1)
// 			currentDate = currentDate.toISOString().split("T")[0]
// 			nextDate = new Date(nextDate)
// 			nextDate.setDate(nextDate.getDate() + 1)
// 			nextDate = nextDate.toISOString().split("T")[0]
// 		}
// 	}
// }

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
  
	  const dataExists = await checkDataExists('BGs', previousDayStr);
  
	  if (dataExists) {
		const previousDayData = await getData(user, previousDayStr)
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


  function checkDataExists(objectStoreName, key) {
	key = key;
	console.log('key: ', key);
	const databaseName = 'Autotune';
	const request = indexedDB.open(databaseName);
	console.log('objectStoreName: ', objectStoreName);
	return new Promise((resolve, reject) => {
	  request.onsuccess = () => {
		const db = request.result;
  
		// Check if the objectStore exists in the database
		if (!db.objectStoreNames.contains(objectStoreName)) {
		  resolve(false);
		  return;
		}
  
		const transaction = db.transaction([objectStoreName], 'readonly');
		const objectStore = transaction.objectStore(objectStoreName);
		const getRequest = objectStore.get(key);
  
		getRequest.onerror = () => {
		  reject(new Error('Failed to get data from object store'));
		};
  
		getRequest.onsuccess = () => {
		  const dataExists = getRequest.result != null;
		  resolve(dataExists);
		};
	  };
  
	  request.onerror = () => {
		reject(new Error('Failed to open database'));
	  };
	});
  }
  
  
  function openDatabase(databaseName) {
	return new Promise((resolve, reject) => {
	  const request = window.indexedDB.open(databaseName);
  
	  request.onerror = function(event) {
		reject(event.target.error);
	  };
  
	  request.onsuccess = function(event) {
		const db = event.target.result;
		resolve(db);
	  };
	});
  }

//   export async function checkBGDataExists(currentDate) {
// 	const key = currentDate
// 	const data = await getData(options.user, key);
  
// 	if (data) {
// 	  return true;
// 	} else {
// 	  return false;
// 	}
//   }

//  