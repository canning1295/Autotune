import { saveData, getData, getTimestamp } from "../localDatabase.js"
import { options } from "../index.js"

let profileData = undefined

export async function getUserProfiles() {
	// Check if the profiles are already in IndexedDB
	const profiles = await getData("Profiles", "profiles")

	// if profiles exist, check the timestamp, if the timestamp is older than yesterday at 12:00am, get the profiles from Nightscout
	if (
		!profiles || await getTimestamp('Profiles', 'profiles') < new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0]
	) {
		console.log("Getting profiles from Nightscout...")
		const response = await fetch(options.url + "/api/v1/profile.json?count=10000000")
		console.log("Profiles: ", `${options.url}/api/v1/profile.json?count=10000000`)
		const profileData = (await response.json()).reverse()
		// console.log('profileData',profileData)
		let updatedProfiles = await setProfiles(profileData)
		return updatedProfiles
	}
	return profiles
}

// This returns default profile settings for the period selected
export async function setProfiles(profileData) {
	const profiles = []
	let start = false
	for (let i = 0; i < profileData.length; i++) {
		let obj = profileData[i]
		let startDate = new Date(obj.startDate)
		let endDate = new Date(
			i + 1 < profileData.length
				? profileData[i + 1].startDate
				: new Date()
		)
		let basalProfile = {
			startDate: startDate,
			endDate: endDate,
			basal: obj.store.Default.basal,
			carbRatio: obj.store.Default.carbratio,
			isf: obj.store.Default.sens,
			lowTarget: obj.store.Default.target_low,
			highTarget: obj.store.Default.target_high,
		}
		profiles.push(basalProfile)
	}

	const key = "profiles" 

	// create a variable named timestamp and set it to yesterday's date in YYYY-MM-DD format
	const timestamp = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0]
	// console.log('profiles presave', profiles)
	await saveData('Profiles', key, profiles, timestamp) // Save the profiles to IndexedDB
	return profiles
}

function getSize(obj) {
	return (
		Math.round(
			(new TextEncoder().encode(JSON.stringify(obj)).length / 1024) * 10
		) / 10
	)
}

// Summary for getProfileData.js:

// Imports saveData, getData, and getTimestamp functions from "../localDatabase.js" and options object from "../index.js".
// Initializes profileData as undefined.
// Defines and exports getUserProfiles function, which retrieves user profiles from the local database. If the profiles don't exist or are older than yesterday at 12:00 am, it fetches the profiles from Nightscout API and saves them to the database. The function returns the profiles.
// Defines and exports setProfiles function, which takes profileData as input and constructs an array of profiles containing information such as startDate, endDate, basal, carbRatio, isf, lowTarget, and highTarget. The function then saves the profiles to the local database with a timestamp of yesterday's date.
// Defines getSize function, which calculates the size of a JSON object in kilobytes. 