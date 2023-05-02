import { options } from "../index.js";
import { getDIA } from "./DIA.js";

export async function adjustBasalRates(averageCombinedData) {
    let isf = averageCombinedData[0].isf
    let lowTargetBG = options.lowTargetBG
    let targetBG = options.targetBG
    let startingBGs = averageCombinedData.map((data) => data.bg);
    let predictedBGs = [...startingBGs]
    let continueRunning = true
    let DIACurves = getDIA(averageCombinedData, 0)
    let averageDIALength = DIACurves.map((curve) => curve.length).reduce((a, b) => a + b) / DIACurves.length / 12
    let averageBGs = averageCombinedData.map((data) => data.bg).reduce((a, b) => a + b) / averageCombinedData.length
    let insulinLikelyNeeded = (averageBGs - targetBG) / isf * 24 / averageDIALength
    let insulinNeededPerHour = insulinLikelyNeeded / 24
    let minAdjustment = getMin(averageCombinedData) / averageDIALength
    let maxAdjustment = getMax(averageCombinedData) / averageDIALength
    let counter = 0
    let currentAdjustment = maxAdjustment / 12 / 2
    const maxReached = new Array(288).fill(false);
    let estimatedBasalRates = new Array(288).fill(0);
    logs()
    adjustBasalRates()

    function adjustBasalRates() {
        let initialAdjustment = currentAdjustment;
        let decrementFactor = 1;
    
        do {
            let currentCurves = getDIA(averageCombinedData, currentAdjustment);
            estimateBGs(currentCurves);
    
            decrementFactor -= 0.1;
            currentAdjustment = initialAdjustment * decrementFactor;
            console.log('currentAdjustment: ', currentAdjustment)
            counter += 1;
    
            // Check if continueRunning should be set to false
            if (decrementFactor <= 0 || currentAdjustment < .004166) {
                continueRunning = false;
            }
        } while (continueRunning);
        console.log('predictedBGs: ', predictedBGs)
        return predictedBGs;
    }
    
    function estimateBGs(currentCurves) {
        let counter1 = 0
        let counter2 = 0
        for (let i = 0; i < predictedBGs.length; i++) {
            if (counter1 >= 288 || counter2 >= 50) {
                break;
            }
            if (maxReached[i] === false) {
                let canAdjust = true;

                for(let j = 0; j < currentCurves[i].length; j++) {
                    let index = (i + j) % predictedBGs.length;
                    let estimatedBG = predictedBGs[index] - currentCurves[i][j] * currentAdjustment * isf
                    console.log(index, 'estimatedBG',estimatedBG,'lowTargetBG',lowTargetBG,'predictedBGs[index]: ', predictedBGs[index], currentCurves[i][j], '* currentAdjustment: ', currentAdjustment, '* isf: ', isf, 'canAdjust: ', canAdjust)   
                    if (estimatedBG < lowTargetBG) {
                        maxReached[i] = true
                        counter1 += 1
                        canAdjust = false;
                        break;
                    }
                }
                if (canAdjust) {
                    for (let j = 0; j < currentCurves[i].length; j++) {
                        let index = (i + j) % predictedBGs.length;
                        predictedBGs[index] -= currentCurves[i][j] * currentAdjustment * isf;
                        
                    }
                    estimatedBasalRates[i] += currentAdjustment;
                }
            }
            counter2 += 1;
        }
        return predictedBGs;
    }

    function logs() {
        console.log('averageDIALength: ', averageDIALength)
        console.log('averageBG: ', averageBGs)
        console.log('insulinLikelyNeeded: ', insulinLikelyNeeded)
        console.log('insulinNeededPerHour: ', insulinNeededPerHour)
        console.log('minAdjustment: ', minAdjustment)
        console.log('maxAdjustment: ', maxAdjustment)
    }
    
    function getMin(averageCombinedData) {
        let min = 1000
        for (let i = 0; i < averageCombinedData.length; i += 12) {
            let averageBG = averageCombinedData.slice(i, i + 12).map((data) => data.bg).reduce((a, b) => a + b) / 12
            let insulinNeed = (averageBG - targetBG - 30) / isf
            if (insulinNeed < min) {
                min = insulinNeed
            }
        }
        return min
    }
    
    function getMax(averageCombinedData) {
        let max = 0
        for (let i = 0; i < averageCombinedData.length; i += 12) {
            let averageBG = averageCombinedData.slice(i, i + 12).map((data) => data.bg).reduce((a, b) => a + b) / 12
            let insulinNeed = (averageBG - targetBG) / isf
            if (insulinNeed > max) {
                max = insulinNeed
            }
        }
        return max
    }
}

