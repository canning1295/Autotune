import { getData } from "../localDatabase.js";
import { options } from "../index.js";
import { getBGs } from "../nightscout_data/getBgData.js";

export function loadBasal() {
    console.log("Loading settings");

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
        date = date.toISOString().slice(0, 10);
        let key = `bg_${date}`;
        let bgData = await getBGs(date);
        if (!Array.isArray(bgData)) {
          //run the code to retrieve the data from NS
          
        }
      
        // Get the canvas element and destroy existing chart if it exists
        var canvas = document.getElementById("myChart");
        if (canvas.chart) {
          canvas.chart.destroy();
        }
      
        // Create an array of labels representing the hours and minutes of each interval
        var labels = [];
        for (var i = 0; i < 24; i++) {
          for (var j = 0; j < 60; j += 5) {
            var hour = i.toString().padStart(2, '0');
            var minute = j.toString().padStart(2, '0');
            labels.push(`${hour}:${minute}`);
          }
        }
      
        // Create a new chart with the retrieved bg data and labels
        var ctx = canvas.getContext("2d");
        var myChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "BG values",
                data: bgData,
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
      }
      
      
}

async function getBgDataForSelectedDate(selectedDate) {
    const databaseName = 'Autotune';
    const objectStoreName = options.user;
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
  
