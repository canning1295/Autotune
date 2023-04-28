import { getData } from "../localDatabase.js";

export async function averageBGs(selectedDates) {
    let averages = new Array(289).fill(0);

    for (let date of selectedDates) {
        let bgData = await getData('BGs', date.toISOString().slice(0, 10));

        // Fill in missing values
        let filledValues = [];
        for (let i = 0, t = new Date(date); i < 289; i++, t.setMinutes(t.getMinutes() + 5)) {
            if (i === 0) console.log('t: ', t)
            let entry = bgData.find(e => e.time === t.toISOString());
            if (entry) {
                // console.log('If entry: ', entry.bg)
                filledValues.push(entry.bg);
            } else {
                let prev = filledValues[i - 1] || null;
                let next = bgData.find(e => new Date(e.time) > t);
                let avg = prev && next ? (prev + next.bg) / 2 : (prev || next.bg);
                filledValues.push(avg);
                console.log('Else entry. Prev: ', prev, ' Next: ', next, ' Avg: ', avg)
            }
            console.log('filledValues: ', filledValues)
        }

        // Add filledValues to averages
        for (let i = 0; i < 289; i++) {
            averages[i] += filledValues[i];
        }
    }

    // Calculate the average BGs for each 5-minute period
    for (let i = 0; i < 289; i++) {
        averages[i] /= selectedDates.length;
    }

    return averages;
}
