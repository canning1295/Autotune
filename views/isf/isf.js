  //This is the ISF Calculator Based on https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012
export function isfCalculator(dailyTotalInsulin, netBasalDailyTotals) {
    let totalInsulin = 0;
    let totalNetBasal = 0;

    // Calculate the average dailyTotalInsulin amount
    for (const entry of dailyTotalInsulin) {
        totalInsulin += entry.amount;
    }
    const avgInsulin = totalInsulin / dailyTotalInsulin.length;
    let aggressiveISF = 1800 / avgInsulin;

    // Calculate the average netBasalDailyTotals amount
    for (const entry of netBasalDailyTotals) {
        totalNetBasal += entry.amount;
    }
    const avgNetBasal = totalNetBasal / netBasalDailyTotals.length;
    let conservativeISF = 1800 / avgNetBasal;
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