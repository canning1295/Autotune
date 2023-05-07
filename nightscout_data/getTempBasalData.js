import { saveData, getData } from "../localDatabase.js";
import { options } from "../index.js";

export async function getTempBasalData(currentDate) {
    const storedData = await getData("Basal_Rates", currentDate);

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
    const tempBasalUrl = options.url.concat(
      "/api/v1/treatments.json?find[created_at][$gte]=",
      currentDateUTC,
      "&find[created_at][$lte]=",
      nextDateUTC,
      "&find[eventType]=Temp+Basal",
      "&count=1000000"
    );
    // console.log("Grabbing Temp Basals from Nightscout...", tempBasalUrl);
    const response = await fetch(tempBasalUrl);
    const tempBasalJSON = await response.json();

    // console.log("Success(" + getSize(tempBasalJSON) + " KB)");

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