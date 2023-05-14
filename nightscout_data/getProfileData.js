import { saveData, getData, getTimestamp } from "../utils/localDatabase.js"
import { options } from "../index.js"

let profileData = undefined

export async function getUserProfiles() {
	let profiles = await getData("Profiles", options.user)
	if (
		!profiles || await getTimestamp('Profiles', options.user) < new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0]
	) {
		console.log("Getting profiles from Nightscout...")
		console.log('url', options.url + "/api/v1/profile.json?count=10000000")
		const response = await fetch(options.url + "/api/v1/profile.json?count=10000000")
		
		const profileData = (await response.json()).reverse()
		profiles = await setProfiles(profileData)
	}
	console.log('profiles', profiles)
	return profiles
}

export async function setProfiles(profileData) {
	const profiles = []
	let start = false
	const now = new Date();
	const midnightTonight = new Date();
	midnightTonight.setHours(0, 0, 0, 0);
	midnightTonight.setDate(midnightTonight.getDate() + 1);

	for (let i = 0; i < profileData.length; i++) {
		let obj = profileData[i]
		let startDate = new Date(obj.startDate)
		let endDate = new Date(
			i + 1 < profileData.length
				? profileData[i + 1].startDate
				: midnightTonight
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

	const timestamp = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0]
	await saveData('Profiles', options.user, profiles, timestamp) 
	return profiles
}