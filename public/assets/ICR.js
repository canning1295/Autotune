  import { options } from "../index.js";
  
  //Based on https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012
  export function icrCalculator(weight, netBasalDailyTotals, dailyTotalInsulin) {
    // // Calculate the average dailyTotalInsulin amount
    // let totalInsulin = 0;
    // for (const entry of dailyTotalInsulin) {
    //   totalInsulin += entry.amount;
    // }
    // const dailyTotalInsulin = totalInsulin / dailyTotalInsulin.length;
    // // console.log("avgDailyTotalInsulin",dailyTotalInsulin)

    // // Calculate the average dailyTotalBasalInsulin amount
    // let totalBasalInsulin = 0;
    // for (const entry of netBasalDailyTotals) {
    //   totalBasalInsulin += entry.amount;
    // }
    // const netBasalDailyTotals = totalBasalInsulin / netBasalDailyTotals.length;
    // console.log("avgDailyBasalInsulin",netBasalDailyTotals)

    let morning = (6.2 * options.weight) / dailyTotalInsulin; 
    let night = (6.2 * options.weight) / netBasalDailyTotals;
    let midDay = (morning + night) / 2;
    let icr500Rule = 500 / dailyTotalInsulin
    morning = Math.round(morning * 10) / 10;
    night = Math.round(night * 10) / 10;
    midDay = Math.round(midDay * 10) / 10;
    icr500Rule = Math.round(icr500Rule * 10) / 10;

    const icrRecommendations = {
      'Morning': morning,
      'Mid-day': midDay,
      'Night': night,
      'ICR 500 Rule': icr500Rule,
      'Reference': "<a href='https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012' target='_blank' title='Open in a new window'>Link</a>"
    };

    return icrRecommendations;
  }