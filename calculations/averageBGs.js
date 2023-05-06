import { getData } from "../localDatabase.js";

export async function averageBGs(selectedDates) {
    let averages = new Array(289).fill(0);

    for (let date of selectedDates) {
        let bgData = await getData('BGs', date.toISOString().slice(0, 10));

        // Fill in missing values
        let filledValues = [];
        for (let i = 0, t = new Date(date); i < 289; i++, t.setMinutes(t.getMinutes() + 5)) {
            let entry = bgData.find(e => e.time === t.toISOString());
            if (entry) {
                // console.log('If entry: ', entry.bg)
                filledValues.push(entry.bg);
            } else {
                let prev = filledValues[i - 1] || null;
                let next = bgData.find(e => new Date(e.time) > t);
                let avg = prev && next ? (prev + next.bg) / 2 : (prev || next.bg);
                filledValues.push(avg);
            }
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

// The `averageBGs.js` file exports an asynchronous function named `averageBGs` that takes a parameter `selectedDates`. The function calculates the average of the blood glucose levels for each 5-minute period of time for the selected dates. The function retrieves data from a local database using the `getData` function from `localDatabase.js`. The retrieved data is used to fill in missing values and calculate the averages. The function returns an array of length 289, with each element containing the average blood glucose level for the corresponding 5-minute period.
