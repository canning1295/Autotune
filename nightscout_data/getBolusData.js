import { saveData, initializeDB, getData } from "../localDatabase.js"
import { options } from "../index.js"

export async function getAllBoluses(currentDate) {
	const storedData = await getData("Boluses", currentDate);

    if (storedData) {
      // console.log("Using stored temp basal data");
      return storedData;
    }
    currentDate = new Date(currentDate);
    let nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);

    function padNumber(number) {
      return number.toString().padStart(2, '0');
    }

    currentDate.setHours(0, 0, 0, 0);
    const currentDateUTC = `${currentDate.getUTCFullYear()}-${padNumber(currentDate.getUTCMonth() + 1)}-${padNumber(currentDate.getUTCDate())}T${padNumber(currentDate.getUTCHours())}:00:00Z`;

    nextDate.setHours(0, 0, 0, 0);
    const nextDateUTC = `${nextDate.getUTCFullYear()}-${padNumber(nextDate.getUTCMonth() + 1)}-${padNumber(nextDate.getUTCDate())}T${padNumber(nextDate.getUTCHours())}:00:00Z`;
	const carbCorrectionUrl = options.url.concat(
		"/api/v1/treatments.json?find[created_at][$gte]=",
		currentDate.toISOString(),
		"&find[created_at][$lte]=",
		nextDate.toISOString(),
		"&find[eventType]=Carb+Correction",
		"&count=1000000"
	)
	console.log("Grabbing Bolus Data from Nightscout...", carbCorrectionUrl)
	const response1 = await fetch(carbCorrectionUrl)
	const carbCorrectionJSON = (await response1.json()).reverse()

	console.log("Success(" + getSize(carbCorrectionJSON) + " KB)")
	const bolusUrl = options.url.concat(
		"/api/v1/treatments.json?find[$or][0][created_at][$gte]=",
		currentDate.toISOString(),
		"&find[created_at][$lte]=",
		nextDate.toISOString(),
		"&find[eventType]=Correction+Bolus"
	)
	console.log(
		"Grabbing Bolus Data from Nightscout...", bolusUrl)
	const response2 = await fetch(bolusUrl)
	const bolusJSON = (await response2.json()).reverse()

	console.log("Success(" + getSize(bolusJSON) + " KB)")
	// prepend carbCorrectionJSON to bolusJSON
	bolusJSON.unshift(...carbCorrectionJSON)
	await saveData("Boluses", currentDate, bolusJSON, new Date());
	return bolusJSON
}

function getSize(obj) {
	return (
		Math.round(
			(new TextEncoder().encode(JSON.stringify(obj)).length / 1024) * 10
		) / 10
	)
}

  