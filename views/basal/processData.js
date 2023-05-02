import { getBGs } from "../../../nightscout_data/getBgData.js";
import { getData, saveData } from "../../../localDatabase.js";  
import { options } from "../../../index.js";
import { getTempBasalData } from "../../../nightscout_data/getTempBasalData.js";
import { getInsulinDelivered } from "../../../calculations/checks.js";

export async function processData(selectedDate) {
    let date = new Date(selectedDate);
    selectedDate.toISOString().slice(0, 10);
    console.log('selectedDate: ', selectedDate)
    let bgData = await getBGs(selectedDate);
    date.setHours(0, 0, 0, 0);
    console.log('date: ', date, 'bgData: ', bgData)

    let combinedData = [];
    let deliveredBasals = await getTempBasalData(selectedDate);
    console.log('deliveredBasals: ', deliveredBasals)
    
    for (let i = 0; i < 288; i++) {
        let existingData = await getData("Combined_Data", selectedDate);
        if (existingData) {
            combinedData = existingData;
            break;
        }
        
        let bg = null;
        let startFiveMinWindow;
        let endFiveMinWindow;

        // if (new Date(bgData[i].time) > date) {
        //     let prevDate = new Date(selectedDate);
        //     prevDate.setDate(prevDate.getDate() - 1);
        //     prevDate.toISOString()
        //     let prevBGs = await getBGs(prevDate);
        //     console.log('Could this be triggering the error?', prevBGs)
        //     bg = prevBGs[prevBGs.length - 1].bg;
        // }
        date.setMinutes(date.getMinutes() + i * 5);
        const matchingData = bgData.find(data => data.time.getTime() === date.getTime());
        if (matchingData) {
            bg = matchingData.bg;
          }
        if(!matchingData) {console.log('No matching data for: ', date)}
        startFiveMinWindow = date
        endFiveMinWindow = new Date(startFiveMinWindow.getTime() + 5 * 60000);
        
        let profile = options.profiles.find(
            (profile) =>
                new Date(profile.startDate) <= startFiveMinWindow &&
                new Date(profile.endDate) >= startFiveMinWindow
        );
        // TODO: Handle case where profile is null
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
    
}