import { getBGs } from "../../../nightscout_data/getBgData.js";
import { getData, saveData } from "../utils/localDatabase.js";  
import { options } from "../../../index.js";
import { getTempBasalData } from "../../../nightscout_data/getTempBasalData.js";
import { getAllBoluses } from "../nightscout_data/getBolusData.js";
import { getValueForTime, getInsulinDataByTimeWindow, getAverageInsulinForTime } from "../../../calculations/boluses.js";

export async function combineData(selectedDate) {

    selectedDate.toISOString().slice(0, 10);
    let bgData = await getBGs(selectedDate);
    let deliveredBasals = await getTempBasalData(selectedDate);
    let bolusData = await getAllBoluses(selectedDate);
    let bolusWindows = getInsulinDataByTimeWindow(bolusData, selectedDate, options.bolusTimeWindow)
    let combinedData = [];

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
        startFiveMinWindow = date;
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
        deliveredBasals.forEach((deliveredBasal) => {
            let tempStart = new Date(deliveredBasal.created_at);
            let tempEnd = new Date(tempStart.getTime() + deliveredBasal.duration * 60 * 1000);

            if (tempStart <= endFiveMinWindow && tempEnd >= startFiveMinWindow) {
                let overlapStart = tempStart < startFiveMinWindow ? startFiveMinWindow : tempStart;
                let overlapEnd = tempEnd > endFiveMinWindow ? endFiveMinWindow : tempEnd; 
                let overlapDuration = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
                totalOverlapDuration += overlapDuration;

                let deliveredRate = deliveredBasal.rate; // units/hr
                let deliveredInsulin = (deliveredRate / 60) * overlapDuration;
                insulinDelivered += deliveredInsulin;
            }
        });

        // Calculate insulin delivered by default profileBasal if it was active for any leftover minutes
        if (totalOverlapDuration < 5) {
            let remainingDuration = 5 - totalOverlapDuration;
            let deliveredInsulin = (profileBasal / 60) * remainingDuration;
            insulinDelivered += deliveredInsulin;
        }

        // Base bolus insulin for this 5-min block
        let bolusInsulin = getAverageInsulinForTime(bolusWindows, startFiveMinWindow);

        // Identify microbolus and treat it as part of actualBasal
        function getMicroBolusForTime(bolusData, startTime) {
            let microBolusAmount = 0;
            for (let bolus of bolusData) {
                if (
                    bolus.insulin <= 1.0 &&
                    bolus.timestamp >= startTime &&
                    bolus.timestamp < new Date(startTime.getTime() + 5 * 60000) &&
                    bolus.carbs < 5
                ) {
                    microBolusAmount += bolus.insulin;
                }
            }
            return microBolusAmount;
        }

        let microBolusDelivered = getMicroBolusForTime(bolusData, startFiveMinWindow) || 0;
        insulinDelivered += microBolusDelivered;

        // Subtract microbolus from bolusInsulin to avoid double counting
        if (bolusInsulin > microBolusDelivered) {
            bolusInsulin -= microBolusDelivered;
        } else {
            bolusInsulin = 0;
        }

        // Actual basal includes microbolus
        let actualBasal = (insulinDelivered / 5) * 60; 

        combinedData.push({
            time: startFiveMinWindow,
            bolusInsulin,
            bg,
            profileBasal,
            actualBasal,
            carbRatio,
            highTarget,
            isf,
            lowTarget,
        });

        date = new Date(date.getTime() + 5 * 60000);
    }

    // Save the combined data for the current date
    let key = selectedDate.toISOString().slice(0, 10);
    let timestamp = new Date();
    await saveData("Combined_Data", key, combinedData, timestamp);
    const sumBolusInsulin = combinedData.reduce((accumulator, currentValue) => {
        return accumulator + currentValue.bolusInsulin;
    }, 0);
    const sumBasalInsulin = combinedData.reduce((accumulator, currentValue) => {
        return accumulator + (currentValue.actualBasal / 12);
    }, 0);
    const dailyInsulinTotal = sumBolusInsulin + sumBasalInsulin;

    saveData("Daily_Bolus_Total", key, sumBolusInsulin, timestamp);
    saveData("Daily_Basal_Total", key, sumBasalInsulin, timestamp);
    saveData("Daily_Insulin_Total", key, dailyInsulinTotal, timestamp);
}