import { saveData, getData } from "../localDatabase.js";
import { options } from "../index.js";

export async function getTempBasalData(currentDate) {
  currentDate = new Date(currentDate);
  let nextDate = new Date(currentDate);
  nextDate.setDate(currentDate.getDate() + 1);
  currentDate = currentDate.toISOString().split("T")[0];
  nextDate = nextDate.toISOString().split("T")[0];

  const storedData = await getData("Basal_Rates", currentDate);

  if (storedData) {
    console.log("Using stored temp basal data");
    return storedData;
  }

  const tempBasalUrl = options.url.concat(
    "/api/v1/treatments.json?find[created_at][$gte]=",
    currentDate,
    "&find[created_at][$lte]=",
    nextDate,
    "&find[eventType]=Temp+Basal",
    "&count=1000000"
  );
  console.log("Grabbing Temp Basals from Nightscout...", tempBasalUrl);
  const response = await fetch(tempBasalUrl);
  const tempBasalJSON = await response.json();

  console.log("Success(" + getSize(tempBasalJSON) + " KB)");

  let tempBasals = [];
  tempBasalJSON.map((i) => {
    tempBasals.push({
      rate: i.rate,
      duration: i.duration,
      created_at: new Date(i.created_at),
    });
  });

  tempBasals = tempBasals.reverse();

  // Fixup temp basal durations to account for rounding discrepancies and errors in the logging
  for (let i = 1; i < tempBasals.length; i++) {
    let previousEnd = new Date(
      tempBasals[i - 1].created_at.getTime() +
        tempBasals[i - 1].duration * 60 * 1000
    );
    const currentStart = tempBasals[i].created_at;
    if (previousEnd > currentStart) {
      const diff =
        (currentStart.getTime() -
          tempBasals[i - 1].created_at.getTime()) /
        (60 * 1000);
      tempBasals[i - 1].duration = diff;
    }
  }

  await saveData("Basal_Rates", currentDate, tempBasals, new Date());
  return tempBasals;
}


function getSize(obj) {
	return (
		Math.round(
			(new TextEncoder().encode(JSON.stringify(obj)).length / 1024) * 10
		) / 10
	)
}

// Summary for getTempBasalData.js:

// - Imports `saveData` and `getData` functions from "../localDatabase.js" and `options` object from "../index.js".
// - Defines and exports `getTempBasalData` function, which retrieves temporary basal data for a given date. It first checks if the data exists in the local database. If it does, the function uses the stored data; otherwise, it fetches the temporary basal data from the Nightscout API. The function then processes the fetched data, corrects any discrepancies in the duration, and saves the data to the local database.
// - Defines `getSize` function, which calculates the size of a JSON object in kilobytes.

// In summary, getTempBasalData.js is responsible for retrieving temporary basal data for a specific date, either from the local database or by fetching it from the Nightscout API. It also ensures that any discrepancies in the duration of temporary basal data are corrected before saving it to the local database.