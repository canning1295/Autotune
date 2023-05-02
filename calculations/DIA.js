 import { options } from '../index.js';
import * as GIR from './GIR.js';

//This getDIA function returns DIACurves where each position contains an array that can vary in length based on the amount of insulin delivered. Each item in the array is the percentage of insulin used/infused over a 5 minute period.
export function getDIA(netBasals, insulinAdjustment) {
    // let netBasals = averageCombinedData.map((data) => data.actualBasal / 12);

    let insulinDeliveredArr = new Array(288); // Create an array with 288 positions
    for (let i = 0; i < 288; i++) {
        insulinDeliveredArr[i] = netBasals[i];
    }

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
      
    return shortenedDIACurves;
}
function shortenCurve(i, DIACurves) {
    let shortenedCurve = [];
    for (let j = 0; j < DIACurves[i].length; j += 20) {
        shortenedCurve.push(DIACurves[i][j]);
    }
    return shortenedCurve;          
}


//This getDIA function returns DIACurves where each position contains an array that can vary in length based on the amount of insulin delivered. Each item in the array is the percentage of insulin used/infused over a 15 second period.
// 

//This is getDIA, but using 576 positions to assist with some calculations. It is not currently used as I wrote a new getDIA function that uses 288 positions and loops back on itself.
// export function getDIA(averageCombinedData, insulinAdjustment) {
//     console.log('averageCombinedData', averageCombinedData)
//     let netBasals = averageCombinedData.map((data) => data.actualBasal);

//     let insulinDeliveredArr = new Array(576) // Although there are only 288 5 minute periods in a day, we add 144 positions on the front and back to assist with some caluculations.
//     for (let i = 0; i < 144; i++) {
//             insulinDeliveredArr[i] = netBasals[i + 144];
//             insulinDeliveredArr[i + 144] = netBasals[i];
//             insulinDeliveredArr[i + 288] = netBasals[i + 144];
//             insulinDeliveredArr[i + 432] = netBasals[i];
//     }
    
//     // console.log('insulinDeliveredArr', insulinDeliveredArr)
//     let DIACurves = new Array(576).fill([])
//     // let GIRCurve = []
//         for (let i = 144; i < 432; i++) {
//                 let insulin = 0;
//                 for (let j = i - options.poolingTime / 5; j < i; j++) {
//                 insulin += insulinDeliveredArr[j];
//                 }
//                 let GIRCurve = GIR.GIRCurve((insulin + insulinAdjustment) / options.weight) // This is the curve for how insulin delivered during this 5 minute period will affect BG over time.
//                 let GIRCurvePercents = []
//                 let GIRCurveTotal = 0
//                 for(let i = 0; i < GIRCurve.length; i++) {
//                 GIRCurveTotal += GIRCurve[i]
//                 }
//                 let currentTotal = 0
//                 for(let i = 0; i < GIRCurve.length; i++) {
//                 currentTotal += GIRCurve[i]
//                 if(i == 0) {GIRCurvePercents.push(0)} // Make first value 0
//                 else {GIRCurvePercents.push(currentTotal / GIRCurveTotal)}

//                 }
//                 DIACurves[i] = GIRCurvePercents // This turns the curve into the percent of insulin used at each 5 minute period.
//         }
//         for (let i = 0; i < 144; i++) {
//             DIACurves[i] = DIACurves[i + 288];
//             DIACurves[i + 432] = DIACurves[i + 144];
//         }
//     return DIACurves
// }


