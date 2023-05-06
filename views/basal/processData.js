import { getBGs } from "../../../nightscout_data/getBgData.js";
import { getData, saveData } from "../../../localDatabase.js";  
import { options } from "../../../index.js";
import { getTempBasalData } from "../../../nightscout_data/getTempBasalData.js";
import { getInsulinDelivered } from "../../../calculations/checks.js";
import { getAllBoluses } from "../../nightscout_data/getBolusData.js";

export async function processData(selectedDate) {

    selectedDate.toISOString().slice(0, 10);
    let bgData = await getBGs(selectedDate);
    let combinedData = [];
    let deliveredBasals = await getTempBasalData(selectedDate);
    let bolusData = await getAllBoluses(selectedDate);
    console.log('boluses: ', boluses)
    bolusWindows = getInsulinDataByTimeWindow(bolusData, selectedDate, options. bolusTimeWindow)

    for (let i = 0; i < 288; i++) {
        let existingData = await getData("Combined_Data", selectedDate);
        if (existingData) {
            combinedData = existingData;
            break;
        }
        
        let bg = null;
        let startFiveMinWindow;
        let endFiveMinWindow;
        let date = new Date(selectedDate);
        date.setHours(0, 0, 0, 0);
        date.setMinutes(date.getMinutes() + i * 5);
        const matchingData = bgData.find(data => (new Date(data.time)).getTime() === date.getTime());
        if (matchingData) {
            bg = matchingData.bg;
          }
        // if(!matchingData) {console.log('No matching data for: ', date)}
        startFiveMinWindow = date
        endFiveMinWindow = new Date(startFiveMinWindow.getTime() + 5 * 60000);
        
        let profile = options.profiles.find(
            (profile) =>
                new Date(profile.startDate) <= startFiveMinWindow &&
                new Date(profile.endDate) >= startFiveMinWindow
        );

        const timeAsSeconds = startFiveMinWindow.getHours() * 3600 + startFiveMinWindow.getMinutes() * 60 + startFiveMinWindow.getSeconds();
        const profileBasal = getValueForTime(profile.basal, timeAsSeconds);
        const carbRatio = getValueForTime(profile.carbRatio, timeAsSeconds);
        const highTarget = getValueForTime(profile.highTarget, timeAsSeconds);
        const isf = getValueForTime(profile.isf, timeAsSeconds);
        const lowTarget = getValueForTime(profile.lowTarget, timeAsSeconds);

        let insulinDelivered = 0;
        let totalOverlapDuration = 0;
        // console.log('deliveredBasals: ', deliveredBasals)
        deliveredBasals.forEach((deliveredBasal) => {
            let tempStart = new Date(deliveredBasal.created_at);
            let tempEnd = new Date(tempStart.getTime() + deliveredBasal.duration * 60 * 1000);

            if (tempStart <= endFiveMinWindow && tempEnd >= startFiveMinWindow) {
                let overlapStart = tempStart < startFiveMinWindow ? startFiveMinWindow : tempStart;
                let overlapEnd = tempEnd > endFiveMinWindow ? endFiveMinWindow : tempEnd; 
                let overlapDuration = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60); // in minutes
                totalOverlapDuration += overlapDuration;

                // Calculate the insulin delivered during the overlapping time
                let deliveredRate = deliveredBasal.rate; // in units per hour
                let deliveredInsulin = (deliveredRate / 60) * overlapDuration; // in units
                insulinDelivered += deliveredInsulin;
            }
        });

        // Calculate insulin delivered by default profileBasal if it was active during the remaining time
        if (totalOverlapDuration < 5) {
            let remainingDuration = 5 - totalOverlapDuration; // in minutes
            let deliveredInsulin = (profileBasal / 60) * remainingDuration; // in units
            insulinDelivered += deliveredInsulin;
        }

        // Calculate the actualBasal in units per hour
        let actualBasal = (insulinDelivered / 5) * 60; // Convert back to units per hour

        // Save the combined data for each time slot
        combinedData.push({
            time: startFiveMinWindow,
            bg,
            profileBasal,
            actualBasal,
            carbRatio,
            highTarget,
            isf,
            lowTarget,
        });

        // Add 5 minutes to date
        date = new Date(date.getTime() + 5 * 60000);
    }

    // Save the combined data for the current date
    let key = selectedDate.toISOString().slice(0, 10);
    let timestamp = new Date();
    await saveData("Combined_Data", key, combinedData, timestamp);
    let totalBasalInsulinDelivered = await getInsulinDelivered(key);

    function getValueForTime(array, timeAsSeconds) {
        let value = array[0].value;
        for (let i = 0; i < array.length; i++) {
            if (array[i].timeAsSeconds <= timeAsSeconds) {
                value = array[i].value;
            } else {
                break;
            }
        }
        return value;
    }
    
    function getInsulinDataByTimeWindow(bolusData, selectedDate, timeWindow) {
        if (![1, 2, 3, 4, 6, 8].includes(timeWindow)) {
          throw new Error('Invalid time window');
        }
      
        const result = [];
        const date = new Date(selectedDate);
      
        for (let i = 0; i < 24; i += timeWindow) {
          const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i);
          const endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i + timeWindow);
          let insulin = 0;
      
          for (let j = 0; j < bolusData.length; j++) {
            const bolus = bolusData[j];
            const bolusTime = new Date(bolus.timestamp);
      
            if (bolusTime >= startTime && bolusTime < endTime) {
              insulin += bolus.insulin;
            }
          }
      
          result.push(insulin);
        }
      
        return result;
      }
      
      
}