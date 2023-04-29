import { getData } from '../../localDatabase.js';

export async function updateChart(date) {
    // set <p id="instruct1"> to display: none
    document.getElementById("instruct1").style.display = "none";
    // Format date as a string YYYY-MM-DD
    let key = date.toISOString().slice(0, 10);
    let objectStoreName = 'BGs';

    // First try to get the data from the local database
    let bgData = await getData(objectStoreName, key);
    // console.log('local bgData: ', bgData);

    // If the data is not in the local database, fetch it from the remote location
    if (bgData === null) {
        bgData = await getBGs(date);
        // console.log('remote bgData: ', bgData);
    }

    // Make sure we have the data before proceeding
    if (bgData) {
        // Extract the 'bg' values and corresponding times from the bgData array
        let chartData = bgData.map(entry => entry.bg);
        let chartLabels = bgData.map(entry => new Date(entry.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

        // Get the canvas element and destroy the existing chart if it exists
        var canvas = document.getElementById("myChart");
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        // Create a new chart with the extracted data and labels
        var ctx = canvas.getContext("2d");
        var myChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: `BGs for ${key}`,
                        data: chartData,
                        borderColor: "rgba(255, 99, 132, 1)",
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                    },
                ],
            },
            options: {
                scales: {
                    yAxes: [
                        {
                            ticks: {
                                beginAtZero: true,
                            },
                        },
                    ],
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 0,
                    },
                },
            },
        });
        canvas.chart = myChart;
    } else {
        console.error('No data found for the specified date');
    }
}