import { saveData, initializeDB, getData } from "../localDatabase.js"

export async function getAllBoluses(options) {
	const carbCorrectionUrl = options.url.concat(
		"api/v1/treatments.json?find[created_at][$gte]=",
		options.dateStart.toISOString(),
		"&find[created_at][$lte]=",
		options.dateEnd.toISOString(),
		"&find[eventType]=Carb+Correction",
		"&count=1000000"
	)
	console.log("Grabbing Bolus Data from Nightscout...", carbCorrectionUrl)
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
		"Grabbing Bolus Data from Nightscout...", bolusUrl)
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

  