import { getBGs } from "../nightscout_data/getBgData.js";
import { getData, saveData } from "../localDatabase.js";  
import { getUserProfiles } from "../nightscout_data/getProfileData.js";
import { getTempBasalData } from "../nightscout_data/getTempBasalData.js";
import { getInsulinDelivered } from "../calculations/checks.js";

export function loadBasal() {
    // JavaScript code to insert HTML into the "main" div
    var htmlCode =
    /*html*/
    `
        <h2>Adjust Basal Rates</h2>
        <button type="button" class="btn btn-primary" id="selectDatesButton">Select dates</button>

        <div class="modal fade" id="dateSelectionModal" tabindex="-1" role="dialog" aria-labelledby="dateSelectionModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="dateSelectionModalLabel">Select Dates</h5>
                        <!--<button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>-->
                    </div>
                    <div class="modal-body"><p id="instruct1">Please select dates below that you would like to include in the BG average used to calculate your basal rate adjustment calculations.<p>
                        <div class="row">
                            <div class="col-md-6">
                                <div id="chartContainer">
                                    <canvas id="myChart"></canvas>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div id="calendarContainer">
                                    <div id="datepicker" class="form-control"></div>
                                    <!-- Insert the toggle code here -->
                                    <div class="form-check mt-3">
                                        <input class="form-check-input" type="checkbox" value="" id="includeTempBasal" checked />
                                        <label class="form-check-label" for="includeTempBasal">Include temp basal delivery in calculations</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="calculate-basals" class="btn btn-primary" data-dismiss="modal">Run</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById("main").innerHTML = htmlCode;

    var selectedDates = [];
    $(document).ready(function () {
        // Initialize datepicker
        $("#datepicker").datepicker({
        format: "yyyy-mm-dd",
        autoclose: false,
        todayHighlight: true,
        keepOpen: true, // keep calendar open after date selection
        container: "#datepicker",
        keyboardNavigation: false,
        beforeShowDay: function (date) {
            for (var i = 0; i < selectedDates.length; i++) {
                // Check if date is in the selectedDates array
                if (date.getTime() === selectedDates[i].getTime()) {
                    return { classes: "selected-date" }; // add selected-date class to selected dates
                }
            }
            return; // otherwise, do not modify appearance
        },
        
        });

        // Add selected date to array and display it on the page
        $("#datepicker").on("changeDate", function (e) {
            var selectedDate = e.date;
        
            if (selectedDates.some(date => date.getTime() === selectedDate.getTime())) {
                // Remove date from array if already selected
                selectedDates = selectedDates.filter(date => date.getTime() !== selectedDate.getTime());
            } else {
                // Add date to array if not already selected
                selectedDates.push(selectedDate);
            }
        
            // Refresh the date picker to update the appearance of the selected dates
            $("#datepicker").datepicker('update');
        
            // Call updateChart() function without awaiting its completion
            updateChart(selectedDate);
        });
        
        const selectDatesButton = document.getElementById("selectDatesButton");
        const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));

        selectDatesButton.addEventListener("click", () => {
            dateSelectionModal.show();
        });

        // Add event listener to the "Run" button
        document.getElementById("calculate-basals").addEventListener("click", () => {
            console.log('selectedDates passed in run function: ', selectedDates)
            let selectedDate = selectedDates[0];
            run(selectedDates, selectedDate);
        });

        async function run(selectedDates, selectedDate) {

            let date = new Date(selectedDate);
          
            function getValueForTime(array, timeAsSeconds) {
              let value = array[0].value;
              for (let i = 0; i < array.length; i++) {
                if (array[i].timeAsSeconds <= timeAsSeconds) {
                  value = array[i].value;
                } else {
                  break;
                }
              }
              return value;
            }
          
            for (let i = 0; i < selectedDates.length; i++) {
              let selectedDate = selectedDates[i].toISOString().slice(0, 10);
              let bgData = await getData("BGs", selectedDate);
              console.log('bgData: ', bgData)
              date.setHours(0, 0, 0, 0);
              let deliveredBasals = await getTempBasalData(selectedDate);
          
              let combinedData = [];
              let profiles = await getUserProfiles();
              for (let i = 0; i < 288; i++) {
                    // Check if the combined data for the current date already exists in the "Combined_Data" store
                let existingData = await getData("Combined_Data", selectedDate);
                if (existingData) {
                    console.log(`Combined data for ${selectedDate} already exists.`);
                    continue;
                }
                let bg;
                let time;
                if (new Date(bgData[i].time) > date) {
                  let prevDate = new Date(selectedDate);
                  prevDate.setDate(prevDate.getDate() - 1);
                  let prevBGs = await getBGs(prevDate);
                  bg = prevBGs[prevBGs.length - 1].bg;
                }

                bg = bgData[i].bg;
                time = new Date(bgData[i].time);
                let profile = profiles.find(
                    (profile) =>
                        new Date(profile.startDate) <= time &&
                        new Date(profile.endDate) >= time
                );
                if (!profile)
                  alert(
                    "No profile found for " + selectedDate,
                    "Cannot calculate basal rates using this date"
                  );
          
                const timeAsSeconds =
                  time.getHours() * 3600 + time.getMinutes() * 60 + time.getSeconds();
                const profileBasal = getValueForTime(profile.basal, timeAsSeconds);
                const carbRatio = getValueForTime(profile.carbRatio, timeAsSeconds);
                const highTarget = getValueForTime(profile.highTarget, timeAsSeconds);
                const isf = getValueForTime(profile.isf, timeAsSeconds);
                const lowTarget = getValueForTime(profile.lowTarget, timeAsSeconds);
          
                // Find the matching deliveredBasal entry
                let actualBasal = deliveredBasals.find((deliveredBasal) => {
                  let start = new Date(deliveredBasal.created_at);
                  let end = new Date(
                    start.getTime() + deliveredBasal.duration * 60 * 1000
                  );
                  return start <= time && end > time;
                });
          
                // If there is no matching deliveredBasal entry, actualBasal should equal profileBasal
                actualBasal = actualBasal ? actualBasal.rate : profileBasal;
          
                // Save the combined data for each time slot
                combinedData.push({
                  time,
                  bg,
                  profileBasal,
                  actualBasal,
                  carbRatio,
                  highTarget,
                  isf,
                  lowTarget,
                });
          
                // Add 5 minutes to date
                date = new Date(date.getTime() + 5 * 60000);
                console.log('combinedData: ', combinedData)
              }
          
              // Save the combined data for the current date
              let key = selectedDates[i].toISOString().slice(0, 10);
              let timestamp = new Date().toISOString();
              saveData("Combined_Data", key, combinedData, timestamp)
            }
            let averageCombinedData = await getAverageCombinedData(selectedDates);
        }          

        async function getAverageCombinedData(selectedDates) {
            let allCombinedData = [];
          
            // Retrieve the combined data for each date
            for (let i = 0; i < selectedDates.length; i++) {
              let selectedDate = selectedDates[i].toISOString().slice(0, 10);
              let combinedData = await getData("Combined_Data", selectedDate);
              allCombinedData.push(combinedData);
            }
          
            let averageCombinedData = [];
          
            // Calculate the average values for each time slot
            for (let i = 0; i < 288; i++) {
              let sumBg = 0;
              let sumProfileBasal = 0;
              let sumActualBasal = 0;
              let sumCarbRatio = 0;
              let sumHighTarget = 0;
              let sumIsf = 0;
              let sumLowTarget = 0;
              let count = 0;
          
              for (let j = 0; j < allCombinedData.length; j++) {
                if (allCombinedData[j][i]) {
                  sumBg += allCombinedData[j][i].bg;
                  sumProfileBasal += allCombinedData[j][i].profileBasal;
                  sumActualBasal += allCombinedData[j][i].actualBasal;
                  sumCarbRatio += allCombinedData[j][i].carbRatio;
                  sumHighTarget += allCombinedData[j][i].highTarget;
                  sumIsf += allCombinedData[j][i].isf;
                  sumLowTarget += allCombinedData[j][i].lowTarget;
                  count++;
                }
              }
          
              // Calculate the average for each value
              let avgBg = sumBg / count;
              let avgProfileBasal = sumProfileBasal / count;
              let avgActualBasal = sumActualBasal / count;
              let avgCarbRatio = sumCarbRatio / count;
              let avgHighTarget = sumHighTarget / count;
              let avgIsf = sumIsf / count;
              let avgLowTarget = sumLowTarget / count;
          
              // Set the time to 2000-01-01 with the same hours and minutes as the current time slot
              let time = new Date("2000-01-01T00:00:00");
              time.setMinutes(time.getMinutes() + i * 5);
          
              // Save the average values for the current time slot
              averageCombinedData.push({
                time,
                bg: avgBg,
                profileBasal: avgProfileBasal,
                actualBasal: avgActualBasal,
                carbRatio: avgCarbRatio,
                highTarget: avgHighTarget,
                isf: avgIsf,
                lowTarget: avgLowTarget,
              });
            }
            return averageCombinedData;
          }
          
    });

    async function updateChart(date) {
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
    const selectDatesButton = document.getElementById("selectDatesButton");
    const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));
    
    // Show the modal automatically when the page loads
    dateSelectionModal.show();
    
    selectDatesButton.addEventListener("click", () => {
        dateSelectionModal.show();
    });     
}

// This JavaScript code is part of a web application that helps users adjust their basal rates (continuous infusion of insulin) based on their blood glucose data. The code provides the following functionalities:

// 1. It imports required functions from other modules.
// 2. It defines a `loadBasal()` function that inserts HTML code into the main div to display various elements like a button to select dates, a modal with a datepicker to select dates for basal rate adjustment, and a line chart to visualize blood glucose data for the selected date.
// 3. The `loadBasal()` function sets up event listeners for the datepicker, the "Select Dates" button, and the "Run" button in the modal. The event listeners handle the selection of dates, display of the modal, and fetching of blood glucose data and user profiles to calculate basal rate adjustments based on the selected dates, respectively.
// 4. The `loadBasal()` function also includes the `getAverageCombinedData()` function that calculates average combined data (including blood glucose levels, basal rates, and other insulin therapy parameters) for the selected dates.
// 5. The `updateChart()` function is defined outside the `loadBasal()` function, and it is responsible for fetching blood glucose data for the selected date, either from the local database or remotely, and then updating the line chart with this data.

// When the web application is loaded, the date selection modal is automatically displayed, and users can select dates for which they want to adjust their basal rates. The line chart is updated with blood glucose data for the selected date, and the average combined data is calculated when the "Run" button is clicked.