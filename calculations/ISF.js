  //This is the ISF Calculator Based on https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012
export function isfCalculator(dailyTotalInsulin, netBasalDailyTotals) {
    let aggressiveISF = 1800 / dailyTotalInsulin;
    let conservativeISF = 1800 / netBasalDailyTotals;
    let ISF = (conservativeISF + aggressiveISF) / 2
    aggressiveISF = Math.round(aggressiveISF * 10) / 10
    conservativeISF = Math.round(conservativeISF * 10) / 10
    ISF = Math.round(ISF * 10) / 10

    // Return ISF Recommendations
    return {
        'Conservative ISF': conservativeISF,
        'Less aggressive':ISF,
        'ISF 1800 Rule': aggressiveISF,
        'Reference': "<a href='https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012' target='_blank' title='Open in a new window'>Link</a>"
    };
}