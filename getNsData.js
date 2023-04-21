import { saveData, initializeDB, getData } from "./localDatabase.js";

let profileData = undefined

export async function getUserProfiles(options) {
	await initializeDB(); // Wait for the database to initialize
  
	// Check if the profiles are already in IndexedDB
	const profiles = await getData(options.user, 'profiles');
  
	// if profiles exist, check the timestamp, if the timestamp is older than yesterday at 12:00am, get the profiles from Nightscout
	if (profiles && profiles.timestamp < new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]) {
	  const response = await fetch(
		options.url + "api/v1/profile.json?count=10000000"
	  );
	  console.log("Profile: ", `${options.url}api/v1/profile.json?count=10000000`);
	  const profileData = (await response.json()).reverse();
	  setProfiles(profileData, options);
	}
  }

// This returns default profile settings for the period selected
export async function setProfiles(profileData, options) {
	const profiles = [];
	let start = false;
	for (let i = 0; i < profileData.length; i++) {
	  let obj = profileData[i];
	  let startDate = new Date(obj.startDate);
	  let endDate = new Date(
		i + 1 < profileData.length ? profileData[i + 1].startDate : new Date()
	  );
	  let basalProfile = {
		startDate: startDate,
		endDate: endDate,
		basal: obj.store.Default.basal,
		carbRatio: obj.store.Default.carbratio,
		isf: obj.store.Default.sens,
		lowTarget: obj.store.Default.target_low,
		highTarget: obj.store.Default.target_high,
	  };
	  if (options.dateStart > startDate && options.dateStart < endDate) {
		profiles.push(basalProfile);
		start = true;
	  } else if (options.dateEnd > startDate && options.dateEnd < endDate) {
		profiles.push(basalProfile);
		break;
	  } else if (start) {
		profiles.push(basalProfile);
	  }
	}

	const key = 'profiles'; // Replace with the actual key

	// create a variable named timestamp and set it to yesterday's date in YYYY-MM-DD format
	const timestamp = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]
	await saveData(options.user, key, profiles, timestamp) // Save the profiles to IndexedDB
  }
  
let bgsArray = []
export async function getBGs(options) {
	const bgUrl = options.url.concat(
		"api/v1/entries/sgv.json?find[dateString][$gte]=",
		options.dateStart.toISOString(),
		"&find[dateString][$lte]=",
		options.dateEnd.toISOString(),
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
	console.log("bgArray:", bgArray)
	// Split the BGs array into multiple arrays that each contain only a single day's worth of BGs
	function processBgArray(bgArray) {
		let bgsArray = bgArray
			.reverse()
			.map((obj) => obj.time.getDate())
			.reduce((acc, val) => {
				if (!acc[val]) {
					acc[val] = [];
				}
				return acc;
			}, {});
		for (let obj of bgArray) {
			let date = obj.time.getDate();
			bgsArray[date].push(obj);
		}
	
		let fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
	
		// Get the last object in the bgArray
		let lastObj = bgArray[bgArray.length - 1];
		let elevenFiftyFivePM = new Date(lastObj.time);
		elevenFiftyFivePM.setHours(23, 55, 0, 0); // 11:55 PM
	
		for (let i = 0; i < bgArray.length - 1; i++) {
			let currentObj = bgArray[i];
			let nextObj = bgArray[i + 1];
	
			let currentTime = currentObj.time.getTime();
			let nextTime = nextObj.time.getTime();
	
			// Round down the current and next timestamps to the nearest five-minute interval
			let roundedCurrentTime = Math.floor(currentTime / fiveMinutes) * fiveMinutes;
			let roundedNextTime = Math.floor(nextTime / fiveMinutes) * fiveMinutes;
	
			if (roundedNextTime - roundedCurrentTime > 6 * fiveMinutes && roundedNextTime < elevenFiftyFivePM.getTime()) {
				let newTime = new Date(roundedCurrentTime + fiveMinutes);
				let newObj = { bg: null, time: newTime };
	
				// Insert the new object into the correct array in bgsArray
				let currentDate = currentObj.time.getDate();
				bgsArray[currentDate].splice(i + 1, 0, newObj);
			}
		}
	
		bgsArray = Object.values(bgsArray).sort((a, b) => a.length - b.length);
		console.log("bgsArray:", bgsArray);
		// return bgsArray;
	}
	processBgArray(bgArray);
}

export async function getTempBasal(url, dateStart, dateEnd) {
	const tempBasalUrl = url.concat(
		"api/v1/treatments.json?find[created_at][$gte]=",
		dateStart.toISOString(),
		"&find[created_at][$lte]=",
		dateEnd.toISOString(),
		"&find[eventType]=Temp+Basal",
		"&count=1000000"
	)
	console.log("Grabbing Temp Basals from Nightscout...", [
		{
			tempBasalUrl,
		},
	])
	const response = await fetch(tempBasalUrl)
	const tempBasalJSON = await response.json()

	console.log("Success(" + getSize(tempBasalJSON) + " KB)")

	let tempBasals = []
	tempBasalJSON.map((i) => {
		tempBasals.push({
			rate: i.rate,
			duration: i.duration,
			created_at: new Date(i.created_at),
		})
	})

	tempBasals = tempBasals.reverse()

	// Fixup temp basal durations to account for rounding discrepancies and errors in the logging
	for (let i = 1; i < tempBasals.length; i++) {
		let previousEnd = new Date(
			tempBasals[i - 1].created_at.getTime() +
				tempBasals[i - 1].duration * 60 * 1000
		)
		const currentStart = tempBasals[i].created_at
		if (previousEnd > currentStart) {
			const diff =
				(currentStart.getTime() -
					tempBasals[i - 1].created_at.getTime()) /
				(60 * 1000)
			tempBasals[i - 1].duration = diff
		}
	}

	return tempBasals
}

export async function getAllBoluses(options) {
	const carbCorrectionUrl = options.url.concat(
		"api/v1/treatments.json?find[created_at][$gte]=",
		options.dateStart.toISOString(),
		"&find[created_at][$lte]=",
		options.dateEnd.toISOString(),
		"&find[eventType]=Carb+Correction",
		"&count=1000000"
	)
	console.log(
		"Grabbing Bolus Data from Nightscout...",
		[
			{
				carbCorrectionUrl,
			},
		],
		carbCorrectionUrl
	)
	const response1 = await fetch(carbCorrectionUrl)
	const carbCorrectionJSON = (await response1.json()).reverse()

	console.log("Success(" + getSize(carbCorrectionJSON) + " KB)")
	const bolusUrl = options.url.concat(
		"api/v1/treatments.json?find[$or][0][created_at][$gte]=",
		options.dateStart.toISOString(),
		"&find[created_at][$lte]=",
		options.dateEnd.toISOString(),
		"&find[eventType]=Correction+Bolus"
	)
	console.log(
		"Grabbing Bolus Data from Nightscout...",
		[
			{
				bolusUrl,
			},
		],
		bolusUrl
	)
	const response2 = await fetch(bolusUrl)
	const bolusJSON = (await response2.json()).reverse()

	console.log("Success(" + getSize(bolusJSON) + " KB)")
	// prepend carbCorrectionJSON to bolusJSON
	bolusJSON.unshift(...carbCorrectionJSON)

	return bolusJSON
}

function getSize(obj) {
	return (
		Math.round(
			(new TextEncoder().encode(JSON.stringify(obj)).length / 1024) * 10
		) / 10
	)
}
