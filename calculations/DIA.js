import { options } from '../index.js';
import * as GIR from './GIR.js';

//This getDIA function returns DIACurves where each position contains an array that can vary in length based on the amount of insulin delivered. Each item in the array is the percentage of insulin used/infused over a 5 minute period.
export function getDIA(netBasals, insulinAdjustment) {
    // let netBasals = averageCombinedData.map((data) => data.actualBasal / 12);

    let insulinDeliveredArr = new Array(288); // Create an array with 288 positions
    for (let i = 0; i < 288; i++) {
        insulinDeliveredArr[i] = netBasals[i];
    }
    let maxIndexArray = new Array(288).fill([]);
    let DIACurves = new Array(288).fill([]);
    for (let i = 0; i < 288; i++) {
        let insulin = 0;
        for (let j = i - options.poolingTime / 5; j < i; j++) {
            let index = j;
            if (j < 0) {
                index = insulinDeliveredArr.length + j;
            }
            insulin += insulinDeliveredArr[index];
        }
        let GIRCurve = GIR.GIRCurve((insulin + insulinAdjustment) / options.weight);
        // This calculates where the peak of the curve, but / by 20 for the 5 minute intervals
        maxIndexArray[i] = (GIRCurve.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0)) / 20;
        let GIRCurvePercents = [];
        let GIRCurveTotal = 0;
        for (let i = 0; i < GIRCurve.length; i++) {
            GIRCurveTotal += GIRCurve[i];
        }
        let currentTotal = 0;
        for (let i = 0; i < GIRCurve.length; i++) {
            currentTotal += GIRCurve[i];
            if (i === 0) {
                GIRCurvePercents.push(0); // Make first value 0
            } else {
                GIRCurvePercents.push(currentTotal / GIRCurveTotal);
            }
        }
        DIACurves[i] = GIRCurvePercents; // This turns the curve into the percent of insulin used at each 5-minute period.
    }
    // This returns the first position, then every 20th position of DIACurves.
    let shortenedDIACurves = [];
    for (let i = 0; i < 288; i++) {
        shortenedDIACurves[i] = shortenCurve(i, DIACurves)
    }

    // When adding insulin, the insulin doesn't actually affect the whole day, but rather only impacts BG for the duration of insulin action. Accordingly, at the end of the DIA period, the calculations indicate the 100% of the insulin has been used, so the last BG of that period ends up being much lower (typically) than the next BG. To make it easier to fine tunue insulin adjustments. We add a short period onto the end of the DIACurves. Although this lengthens the DIACurves, thereby making the predictions less aggressive, it still allows for more accurate insulin adjustments.
    for (let i =0; i < 288; i++) {
        for(let j = 0; j < maxIndexArray[i].length; j++) {
            100 - shortenedDIACurves[i].push(shortenedDIACurves[i][j])
            j += 100 / maxIndexArray[i]
        }
    }
    return shortenedDIACurves;
}
function shortenCurve(i, DIACurves) {
    let shortenedCurve = [];
    for (let k = 0; k < DIACurves[i].length; k += 20) {
        shortenedCurve.push(DIACurves[i][k]);
    }
    return shortenedCurve;          
}