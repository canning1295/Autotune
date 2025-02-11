import { options } from "../index.js";

export function GIRCurve(insulinKG) {
	const diaAdjustment = options.diaAdjustment;
	insulinKG = insulinKG / diaAdjustment;
     let xData = new Array(1920);
     for (let i = 0; i < 1920; i++) {
       let x = i * (15.0/3600);
       xData[i] = x;
     }
     let smallYData = getSmallYData(xData);
     let mediumYData = getMediumYData(xData);
     let largeYData = getLargeYData(xData);
     let smallCurve = [];
     let mediumCurve = [];
     let largeCurve = [];
     let peakValueSmall = 0;
     let peakValueMedium = 0;
     let peakValueLarge = 0;
       for(let i of smallYData) {
         if(i > peakValueSmall) {
             peakValueSmall = i;
         }
       }
       for(let i of mediumYData) {
         if(i > peakValueMedium) {
             peakValueMedium = i;
         }
       }
       for(let i of largeYData) {
         if(i > peakValueLarge) {
             peakValueLarge = i;
         }
       }
     
     let stopSmall = peakValueSmall *.0175;
     let stopMedium = peakValueMedium *.0175;
     let stopLarge = peakValueLarge *.0175;
    
     for (let i = 0; i < smallYData.length; i++) {
       if(i < 60 && smallYData[i] > 0){smallCurve.push(smallYData[i]);}
       else if(smallYData[i] > stopSmall){smallCurve.push(smallYData[i]);}
     }

     for (let i = 0; i < mediumYData.length; i++) {
       if(i < 60 && mediumYData[i] > 0){mediumCurve.push(mediumYData[i]);}
       else if(mediumYData[i] > stopMedium){mediumCurve.push(mediumYData[i]);}
     }
    
     for (let i = 0; i < largeYData.length; i++) {
       if(i < 60 && largeYData[i] > 0){largeCurve.push(largeYData[i]);}
       else if(largeYData[i] > stopLarge){largeCurve.push(largeYData[i]);}
     }
    
     let newCurveFull = []
     let newCurve = []
     if(insulinKG < .1) {
       let smallYData = getSmallYData(xData);
       let mediumYData = getMediumYData(xData);
       let smallMedium = new Array(smallYData.length);
         for(let i = 0; i < smallMedium.length; i++) {
           smallMedium[i] = smallYData[i] / mediumYData[i];
         }
       for(let i = 0; i < 1920; i++) {
         let pow = -1.44269504088897 * Math.log(insulinKG) - 3.32192809488739;
          let yRate = -0.0455826595478078 * xData[i] + 0.9205489113464720;
          let yDiff = Math.pow(yRate, pow) * smallMedium[i];
          let yMultiplier = Math.pow(yDiff, pow);
          let value = smallYData[i] * yMultiplier;
          if(i != 0 && Math.abs(newCurveFull[i-1] - value) > .05)
              {newCurveFull[i] = newCurveFull[i-1];}
          else
              {newCurveFull[i] = value;}
       }
       let peakValue = 0;
    
         for(let i of newCurveFull) {
           if(i > peakValue) {
               peakValue = i;
           }
         }
       
       let stop = peakValue *.0175;
    
       for (let i = 0; i < newCurveFull.length; i++) {
         if(i < 60 && newCurveFull[i] > 0){newCurve.push(newCurveFull[i]);}
         else if(newCurveFull[i] > stopSmall){newCurve.push(newCurveFull[i]);}
       }
     }
    //  console.log('newCurve', newCurve)
     if(insulinKG == .1) {newCurve = smallCurve;}
    
     else if(insulinKG > .1 && insulinKG < .2) {
       newCurve = getIntermediateYData(xData, insulinKG)
     }
    
     else if(insulinKG == .2) {newCurve = mediumCurve;}
    
     else if(insulinKG > .2 && insulinKG < .4) {
       newCurve = getIntermediateYData(xData, insulinKG)
     }
    
     else if(insulinKG >= .4) {newCurve = largeCurve;}
    
     // plotLineGraph(newCurve, insulinKG)
     return newCurve;
    }
    
function getIntermediateYData(intermediateXData, insulinKG) {
    let intermediateYData = new Array(intermediateXData.length);
    for (let i = 0; i < intermediateXData.length; i++) {
        let x = intermediateXData[i];
        let smallY = 0.0033820425120803 * Math.pow(x, 5) - 0.0962642502970792 * Math.pow(x, 4) + 1.0161233494860400 * Math.pow(x, 3) -
            4.7280409167367000 * Math.pow(x, 2) + 8.2811624637053000 * x - 0.4658832073238300;
        let mediumY = 0.0004449113905105 * Math.pow(x, 6) - 0.0097881251143144 * Math.pow(x, 5) + 0.0487062677027909 * Math.pow(x, 4) +
            0.3395509285035820 * Math.pow(x, 3) - 3.8635372657493500 * Math.pow(x, 2) + 9.8215306047782600 * x - 0.5016675029655920;
        let largeY = -0.0224550824431891 * Math.pow(x, 4) + 0.5324819868175370 * Math.pow(x, 3) - 4.2740977490209200 * Math.pow(x, 2) +
        11.6354217632198000 * x - 0.0653457810255797;
        let intermediateY;
        if(insulinKG < .1 ){
            intermediateY = (insulinKG - 0.1) * (mediumY - smallY) / (0.2 - 0.1) + smallY;
        }
        else if(insulinKG > .1 && insulinKG < .2){
            intermediateY = (insulinKG - 0.1) * (mediumY - smallY) / (0.2 - 0.1) + smallY;
        }
        else if(insulinKG > .2 && insulinKG < .4){
            intermediateY = (insulinKG - 0.2) * (largeY - mediumY) / (0.4 - 0.2) + mediumY;
        }
        intermediateYData[i] = intermediateY;
    }
    return intermediateYData
}
    
function getSmallYData(smallXData) {
    //using the .1 U/kg curve
    let smallYData = new Array(1920);
    for (let i = 0; i < smallYData.length; i++) {
    let x = smallXData[i];
    let y = 0.0033820425120803 * Math.pow(x, 5) - 0.0962642502970792 * Math.pow(x, 4) + 1.0161233494860400 * Math.pow(x, 3) -
        4.7280409167367000 * Math.pow(x, 2) + 8.2811624637053000 * x - 0.4658832073238300;
    smallYData[i] = y;
    }
    return smallYData;
}

function getMediumYData(mediumXData) {
    //Using the .2 U/kg curve
    let mediumYData = new Array(1920);
    for (let i = 0; i < mediumXData.length; i++) {
    let x = mediumXData[i];
    let y = 0.0004449113905105 * Math.pow(x, 6) - 0.0097881251143144 * Math.pow(x, 5) + 0.0487062677027909 * Math.pow(x, 4) +
        0.3395509285035820 * Math.pow(x, 3) - 3.8635372657493500 * Math.pow(x, 2) + 9.8215306047782600 * x - 0.5016675029655920;
    mediumYData[i] = y;
    }
    return mediumYData;
}

function getLargeYData(largeXData) {
    //Using the .4 U/kg curve
    let largeYData = new Array(1920);
    for (let i = 0; i < largeXData.length; i++) {
    let x = largeXData[i];
    let y = -0.0224550824431891 * Math.pow(x, 4) + 0.5324819868175370 * Math.pow(x, 3) - 4.2740977490209200 * Math.pow(x, 2) +
        11.6354217632198000 * x - 0.0653457810255797;
    largeYData[i] = y;
    }
    return largeYData;
}

export function getGIRCurvePercentage(curveY, currentTime)
{
    // curveY is the yData for the GIR curve for whatever insulin/kg we are using.
    //The currentTime is the number of hours that have passed since the insulin was delivered on the GIR curve. The currentTime is in the format of hours.

    //get the x position that the currentTime would fall on the GIR curve. We divide the currentTime(which is in hours) by how many
    // hours 15 seconds is. (15 seconds / 60 seconds in a minute / 60 minutes in an hour)
    const position = Math.round(currentTime / (15.0 / 3600));

    // Get the total area under the GIR curve
    let totalArea = 0;
    for (const i of curveY) {
        totalArea += i;
    }

    // Get our partial area under the GIR curve for the currentTime plus the next 5 minutes
    let partialArea = 0;
    for (let i = 0; i < 20 && i + position < curveY.length; i++) {
        partialArea += curveY[position + i] * (15.0 / 3600);
    }

    // Return what percentage of the GIR curve our currentTime plus the next 5 minutes would be.
    return partialArea / totalArea;
}