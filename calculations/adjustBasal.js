import { options } from "../index.js";
import { getDIA } from "./DIA.js";

export async function adjustBasalRates(averageCombinedData) {
    // console.log('averageCombinedData', averageCombinedData)
    const isf = averageCombinedData[0].isf;
    const lowTargetBG = options.lowTargetBG;
    const targetBG = options.targetBG;
    const startingBGs = averageCombinedData.map((data) => data.bg);
    const predictedBGs = averageCombinedData.map((data) => data.bg);
    let startingBasals = averageCombinedData.map((data) => data.actualBasal / 12);
    let startingBasalsPlusBolus = averageCombinedData.map((data) => ((data.actualBasal / 12) + (data.bolusInsulin / 12)));
    let estimatedBasal = averageCombinedData.map((data) => data.actualBasal / 12);

    const DIACurves = getDIA(startingBasalsPlusBolus, 0);
    const averageDIALength = DIACurves.map((curve) => curve.length).reduce((a, b) => a + b) / DIACurves.length / 12;
    const averageBG = averageCombinedData.map((data) => data.bg).reduce((a, b) => a + b) / averageCombinedData.length;
    const insulinLikelyNeeded = (averageBG - targetBG) / isf * 24 / averageDIALength * 2;
    const insulinNeededPerHour = insulinLikelyNeeded / 24;
    const adjustmentFactor = options.adjustmentFactor;
    console.log('adjustmentFactor', adjustmentFactor)
    console.log('insulinLikelyNeeded', insulinLikelyNeeded, 'averageDIALength',averageDIALength,'AverageBG',averageBG , 'TargetBG', targetBG)
    // const minAdjustment = getMin(averageCombinedData) / averageDIALength;
    // const maxAdjustment = getMax(averageCombinedData) / averageDIALength;
    
    
    const averageBGEnd = predictedBGs.reduce((a, b) => a + b) / predictedBGs.length;

    return runCalcs();

    async function runCalcs() {

        let continueLoop1 = new Array(288).fill(true);
        let continueLoop2 = new Array(288).fill(true);
        let continueLoop3 = new Array(288).fill(true);
        let continueLoop4 = new Array(288).fill(true);
        let continueLoop5 = new Array(288).fill(true);
        let continueLoop6 = new Array(288).fill(true);
        let continueLoop7 = new Array(288).fill(true);
        let continueLoop8 = new Array(288).fill(true);
        let continueLoop9 = new Array(288).fill(true);
        let continueLoop10 = new Array(288).fill(true);

        let currentAdjustment = NaN
        
        for (let i = 0; i < 20; i++) {
            const continueLoop1Filter = continueLoop1.filter(value => !value).length
            // if(continueLoop1Filter >= 220){console.log('false count', continueLoop1Filter, i); break}
            currentAdjustment = insulinNeededPerHour / 12 / -10
            const currentCurves = getDIA(startingBasalsPlusBolus, currentAdjustment);
            const count = 1;
            await raiseBGValues(currentCurves, currentAdjustment, count);
            // console.log(i, 'of 20')
        }
        // for (let i = 0; i < 4; i++) {
        //     const continueLoop2Filter = continueLoop1.filter(value => !value).length
        //     if(continueLoop2Filter >= 220){console.log('false count', continueLoop2Filter); break}
        //     currentAdjustment = insulinNeededPerHour / 12 / 4
        //     const currentCurves = getDIA(estimatedBasal, currentAdjustment);
        //     const count = 2
        //     await raiseBGValues(currentCurves, currentAdjustment, count);
        // }
        // for (let i = 0; i < 8; i++) {
        //     const continueLoop3Filter = continueLoop1.filter(value => !value).length
        //     if(continueLoop3Filter >= 220){console.log('false count', continueLoop3Filter); break}
        //     currentAdjustment = insulinNeededPerHour / 12 / 8
        //     const currentCurves = getDIA(estimatedBasal, currentAdjustment);
        //     const count = 3
        //     await raiseBGValues(currentCurves, currentAdjustment, count);
        // }
        // for (let i = 0; i < 16; i++) {
        //     const continueLoop4Filter = continueLoop1.filter(value => !value).length
        //     if(continueLoop4Filter >= 220){console.log('false count', continueLoop4Filter); break}
        //     currentAdjustment = insulinNeededPerHour / 12 / 10
        //     const currentCurves = getDIA(estimatedBasal, currentAdjustment);
        //     const count = 4
        //     await raiseBGValues(currentCurves, currentAdjustment, count);
        // }

        for (let i = 0; i < 2; i++) {
            const continueLoop1Filter = continueLoop6.filter(value => !value).length
            if(continueLoop1Filter >= 220){console.log('false count', continueLoop1Filter); break}
            currentAdjustment = insulinNeededPerHour / 12 / 2
            const currentCurves = getDIA(estimatedBasal, currentAdjustment);
            const count = 1;
            await lowerBGValues(currentCurves, currentAdjustment, count);
        }
        for (let i = 0; i < 4; i++) {
            const continueLoop2Filter = continueLoop6.filter(value => !value).length
            if(continueLoop2Filter >= 220){console.log('false count', continueLoop2Filter); break}
            currentAdjustment = insulinNeededPerHour / 12 / 4
            const currentCurves = getDIA(estimatedBasal, currentAdjustment);
            const count = 2
            await lowerBGValues(currentCurves, currentAdjustment, count);
        }
        for (let i = 0; i < 16; i++) {
            const continueLoop3Filter = continueLoop6.filter(value => !value).length
            if(continueLoop3Filter >= 220){console.log('false count', continueLoop3Filter); break}
            currentAdjustment = insulinNeededPerHour / 12 / 8
            const currentCurves = getDIA(estimatedBasal, currentAdjustment);
            const count = 3
            await lowerBGValues(currentCurves, currentAdjustment, count);
        }
        for (let i = 0; i < 16; i++) {
            const continueLoop4Filter = continueLoop6.filter(value => !value).length
            if(continueLoop4Filter >= 220){console.log('false count', continueLoop4Filter); break}
            currentAdjustment = insulinNeededPerHour / 12 / 10
            const currentCurves = getDIA(estimatedBasal, currentAdjustment);
            const count = 4
            await lowerBGValues(currentCurves, currentAdjustment, count);
        }
        // for (let i = 0; i < 2; i++) {
        //     // if(continueLoop5.filter(value => !value).length >= 220) break;
        //     console.log('continueLoop5 false count', continueLoop5.filter(value => !value).length)
        //     currentAdjustment = 0.05;
        //     const currentCurves = getDIA(estimatedBasals, currentAdjustment);
        //     const count = 5
        //     await estimateBGs(currentCurves, currentAdjustment, count);
        // }
        
        logs()
        const totalAdditionalInsulin = estimatedBasal.reduce((sum, rate, index) => sum + rate - averageCombinedData[index].actualBasal, 0);

        function roundToNearest(num, nearest) {
            return Math.round(num / nearest) * nearest;
        }
        
        let tempBasal = [];
        for (let i = 0; i < 24; i++) { 
            let sum = 0;
            for (let j = i * 12; j < (i + 1) * 12; j++) { 
                sum += roundToNearest(startingBasals[j], 0.05);
            }
            tempBasal.push(sum.toFixed(2))
        }

        let adjustedBasal = [];
        for (let i = 0; i < 24; i++) { 
            let sum = 0;
            for (let j = i * 12; j < (i + 1) * 12; j++) { 
                sum += roundToNearest(estimatedBasal[j], 0.05);
            }
            adjustedBasal.push(sum.toFixed(2))
        }
    
        return { tempBasal, adjustedBasal }
    
        async function raiseBGValues(currentCurves, currentAdjustment, count) {
            return new Promise((resolve, reject) => {
                for (let i = 0; i < 288; i++) {
                    if 
                    (
                        count === 1 && continueLoop1[i]
                        || count === 2 && continueLoop2[i]
                        || count === 3 && continueLoop3[i]
                        || count === 4 && continueLoop4[i]
                        || count === 5 && continueLoop5[i]
                    ) 
                    {
                        let shouldAdjust = false;
                        for (let j = 0; j < currentCurves[i].length; j++) {
                            const index = (i + j) % 288;
                            const currentBG = predictedBGs[index];
                            const BGChange = currentCurves[i][j] * currentAdjustment * isf;
                            const predictedBG = currentBG - BGChange;
                            if (currentBG < lowTargetBG) {
                              shouldAdjust = true;
                            }
                            if (j === currentCurves[i].length - 1 && shouldAdjust === false) {
                              if (count === 1) {continueLoop1[i] = false;}
                              if (count === 2) {continueLoop2[i] = false;}
                              if (count === 3) {continueLoop3[i] = false;}
                              if (count === 4) {continueLoop4[i] = false;}
                              if (count === 5) {continueLoop5[i] = false;}
                          
                              continue;
                            }
                          }          
                        if (shouldAdjust === true) 
                        {
                            for (let m = 0; m < currentCurves[i].length; m++) {
                                const index = (i + m) % 288;
                                let previousBG = predictedBGs[index]
                                const BGChange = Math.abs(currentCurves[i][m]) * (Math.abs(currentAdjustment)) * -1 * isf;
                                predictedBGs[index] -= BGChange;
                                if (predictedBGs[index] === NaN) {
                                    console.log('previousBG', previousBG, 'BGChange', BGChange)
                                }
                            }
                            estimatedBasal[i] += currentAdjustment;
                        } 
                        else 
                        {
                                if (count === 1) {continueLoop1[i] = false;}
                                if (count === 2) {continueLoop2[i] = false;}
                                if (count === 3) {continueLoop3[i] = false;}
                                if (count === 4) {continueLoop4[i] = false;}
                                if (count === 5) {continueLoop5[i] = false;}
                        }
                    }
                } resolve()
            });
        }
        async function lowerBGValues(currentCurves, currentAdjustment, count) {
            return new Promise((resolve, reject) => {
                for (let i = 0; i < 288; i++) {
                    if 
                    (
                        count === 1 && continueLoop6[i]
                        || count === 2 && continueLoop7[i]
                        || count === 3 && continueLoop8[i]
                        || count === 4 && continueLoop9[i]
                        || count === 5 && continueLoop10[i]
                    ) 
                    {
                        let shouldAdjust = true;
                        for (let j = 0; j < currentCurves[i].length; j++) {
                            const index = (i + j) % 288;
                            const currentBG = predictedBGs[index];
                            const BGChange = currentCurves[i][j] * currentAdjustment * isf;
                            const predictedBG = currentBG - BGChange;
                            if (predictedBG < lowTargetBG) {
                              shouldAdjust = false;
                              if (count === 1) {continueLoop6[i] = false;}
                              if (count === 2) {continueLoop7[i] = false;}
                              if (count === 3) {continueLoop8[i] = false;}
                              if (count === 4) {continueLoop9[i] = false;}
                              if (count === 5) {continueLoop10[i] = false;}
                          
                              continue;
                            }
                          }          
                        if (shouldAdjust === true) 
                        {
                            for (let m = 0; m < currentCurves[i].length; m++) {
                                const index = (i + m) % 288;
                                let previousBG = predictedBGs[index]
                                const BGChange = Math.abs(currentCurves[i][m]) * currentAdjustment * isf;
                                predictedBGs[index] -= BGChange;
                            }
                            
                            estimatedBasal[i] += currentAdjustment  * adjustmentFactor;
                        } 
                        else 
                        {
                                if (count === 1) {continueLoop6[i] = false;}
                                if (count === 2) {continueLoop7[i] = false;}
                                if (count === 3) {continueLoop8[i] = false;}
                                if (count === 4) {continueLoop9[i] = false;}
                                if (count === 5) {continueLoop10[i] = false;}
                        }
                    }
                } resolve()
            });
        }
    }

    function getMin(averageCombinedData) {
        let min = 1000;
        for (let i = 0; i < averageCombinedData.length; i += 12) {
            const averageBG = averageCombinedData.slice(i, i + 12).map((data) => data.bg).reduce((a, b) => a + b) / 12;
            const insulinNeed = (averageBG - targetBG - 30) / isf;
            if (insulinNeed < min) {
                min = insulinNeed;
            }
        }
        return min;
    }

    function getMax(averageCombinedData) {
        let max = 0;
        for (let i = 0; i < averageCombinedData.length; i += 12) {
            const averageBG = averageCombinedData.slice(i, i + 12).map((data) => data.bg).reduce((a, b) => a + b) / 12;
            const insulinNeed = (averageBG - targetBG) / isf;
            if (insulinNeed > max) {
                max = insulinNeed;
            }
        }
        return max;
    }

    function logs() {
        // const startingBGs = averageCombinedData.map((data) => data.bg);
        console.log('startingBGs', startingBGs)
        // console.log('averageCombinedData', averageCombinedData)
        console.log('predictedBGs', predictedBGs)
        // console.log('DIACurves', DIACurves)
        console.log('averageDIALength', averageDIALength)
        // console.log('startingBasalRates', startingBasals)
        console.log('estimatedBasals', estimatedBasal)
        console.log('averageBG start', averageBG)
        const predictedBGAverage = predictedBGs.reduce((a, b) => a + b) / predictedBGs.length;
        console.log('predictedBGAverage', predictedBGAverage)
        const StartingTotalBasal = sumArray(startingBasals);
        const EstimatedTotalBasal = sumArray(estimatedBasal);
        const TotalBasalChange = EstimatedTotalBasal - StartingTotalBasal;
        console.log('StartingTotalBasal', StartingTotalBasal)
        console.log('EstimatedTotalBasal', EstimatedTotalBasal)
        console.log('TotalBasalChange', TotalBasalChange)
    }

    function sumArray(arr) {
        let sum = 0;
        for (let i = 0; i < arr.length; i++) {
          sum += arr[i];
        }
        return sum;
    }
}