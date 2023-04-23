import { saveData, initializeDB, getData, getTimestamp } from "../localDatabase.js"

let profileData = undefined

export async function getUserProfiles(options) {
	await initializeDB() // Wait for the database to initialize

	// Check if the profiles are already in IndexedDB
	const profiles = await getData(options.user, "profiles")
	// console.log("Profiles", !profiles)
	// console.log('Yesterday',new Date(new Date().setDate(new Date().getDate() - 1))
	// .toISOString()
	// .split("T")[0])
	getTimestamp(options.user, 'profiles')
	console.log('profiles timestamp',await getTimestamp(options.user, 'profiles'))

	// if profiles exist, check the timestamp, if the timestamp is older than yesterday at 12:00am, get the profiles from Nightscout
	if (
		!profiles || await getTimestamp(options.user, 'profiles') < new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0]
	) {
		console.log("Getting profiles from Nightscout...")
		const response = await fetch(
			options.url + "api/v1/profile.json?count=10000000"
		)
		console.log(
			"Profile: ",
			`${options.url}api/v1/profile.json?count=10000000`
		)
		const profileData = (await response.json()).reverse()
		// console.log('profileData',profileData)
		setProfiles(profileData, options)
	}
}

// This returns default profile settings for the period selected
export async function setProfiles(profileData, options) {
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
	console.log('profiles presave', profiles)
	await saveData(options.user, key, profiles, timestamp) // Save the profiles to IndexedDB
}

function getSize(obj) {
	return (
		Math.round(
			(new TextEncoder().encode(JSON.stringify(obj)).length / 1024) * 10
		) / 10
	)
}

  