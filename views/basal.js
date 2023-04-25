// import { getData } from "../localDatabase.js";
// import { options } from "../index.js";
import { getBGs } from "../nightscout_data/getBgData.js";
import { getData } from "../localDatabase.js";  

export function loadBasal() {
    console.log("Loading basal tuner");

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
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div id="chartContainer">
                                        <canvas id="myChart"></canvas>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div id="calendarContainer">
                                        <div id="datepicker" class="form-control"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    document.getElementById("main").innerHTML = htmlCode;

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
            // Check if date is in selectedDates array
            var selectedDates = $("#datepicker").datepicker("getDates");
            for (var i = 0; i < selectedDates.length; i++) {
            if (date.getTime() === selectedDates[i].getTime()) {
                return { classes: "selected-date" }; // add selected-date class to selected dates
            }
            }
            return; // otherwise, do not modify appearance
        },
        });

        // Initialize selectedDates array
        var selectedDates = [];

        // Add selected date to array and display it on the page
        $("#datepicker").on("changeDate", function () {
            var selectedDate = $("#datepicker").datepicker("getDate");
            (async () => {
                if (selectedDates.includes(selectedDate)) {
                    // Remove date from array if already selected
                    selectedDates.splice(selectedDates.indexOf(selectedDate), 1);
                } else {
                    // Add date to array if not already selected
                    selectedDates.push(selectedDate);
                }
                await updateChart(selectedDate);
            })();
        });
        const selectDatesButton = document.getElementById("selectDatesButton");
        const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));

        selectDatesButton.addEventListener("click", () => {
            dateSelectionModal.show();
        });

    });

    async function updateChart(date) {
        // Format date as a string YYYY-MM-DD
        let key = date.toISOString().slice(0, 10);
        let objectStoreName = 'BGs';
    
        // First try to get the data from the local database
        let bgData = await getData(objectStoreName, key);
        console.log('local bgData: ', bgData);
    
        // If the data is not in the local database, fetch it from the remote location
        if (bgData === null) {
            bgData = await getBGs(date);
            console.log('remote bgData: ', bgData);
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
                            label: "BG values",
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
       
}

async function getBgDataForSelectedDate(selectedDate) {
    const databaseName = 'Autotune';
    const objectStoreName = 'BGs'
    const key = selectedDate;
    const request = indexedDB.open(databaseName);
  
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([objectStoreName], 'readonly');
        const objectStore = transaction.objectStore(objectStoreName);
        const getRequest = objectStore.get(key);
  
        getRequest.onerror = () => {
          reject(new Error('Failed to get data from object store'));
        };
  
        getRequest.onsuccess = () => {
          let bgData = getRequest.result?.value;
          console.log(typeof(bgData))
          if (typeof bgData === 'string') {
            bgData = JSON.parse(bgData).map(({ bg }) => parseFloat(bg));
          }
          resolve(bgData);
        };
      };
  
      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };
    });
  }
  
