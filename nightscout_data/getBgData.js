import { saveData, initializeDB, getData } from "../localDatabase.js"
import { options } from "../index.js"

let bgArray = []
export async function getBGs(currentDate) {
	console.log("current Date: ", currentDate)
	currentDate = new Date(currentDate)
	let nextDate = new Date(currentDate)
	nextDate.setDate(currentDate.getDate() + 1)
	currentDate = currentDate.toISOString().split("T")[0]
	nextDate = new Date(nextDate).toISOString().split("T")[0]
		if (await checkDataExists(currentDate) === false) {
			console.log("Line 13 was false")
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
			const key = `bg_${currentDate}`;
			saveData(options.user, key, bgArray, currentDate);
			adjustFirstEntry(bgArray, options.user)
		} else {
			console.log("BGs already exist for " + currentDate)
			const databaseName = 'Autotune';
			const objectStoreName = options.user;
			const key = `bg_${currentDate}`;
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
// 			const key = `bg_${currentDate}`;
// 			saveData(options.user, key, bgArray, currentDate);
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
  
	  const dataExists = await checkDataExists(previousDayStr);
  
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


function checkDataExists(key) {
	key = 'bg_' + key
	const databaseName = 'Autotune';
    const request = indexedDB.open(databaseName);
    const objectStoreName = options.user;
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
// 	const key = `bg_${currentDate}`;
// 	const data = await getData(options.user, key);
  
// 	if (data) {
// 	  return true;
// 	} else {
// 	  return false;
// 	}
//   }

//  