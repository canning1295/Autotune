import { updateChart } from "./updateChart.js";
import { processData } from "./processData.js";
import { getAverageCombinedData } from "./createAvgCombinedData.js";
import { showLoadingAnimation, hideLoadingAnimation } from '../../loadingAnimation.js';
import { adjustBasalRates } from "../../calculations/adjustBasal.js";

export function loadBasal() {
    var htmlCode =
    /*html*/
    `
        <h2>Adjust Basal Rates</h2>
        <button type="button" class="btn btn-primary" id="selectDatesButton">Select dates</button>
        <table id="dataTable"></table>

        <div class="modal fade" id="dateSelectionModal" tabindex="-1" role="dialog" aria-labelledby="dateSelectionModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="dateSelectionModalLabel">Select Dates</h5>
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
    var preventChangeEvent = false; // Add a flag to prevent changeDate event from re-triggering
    $(document).ready(async function () {
        // Initialize datepicker
        $("#datepicker").datepicker({
            format: "yyyy-mm-dd",
            autoclose: false,
            todayHighlight: true,
            keepOpen: true, // keep calendar open after date selection
            container: "#datepicker",
            keyboardNavigation: false,
            gotoCurrent: true,
            beforeShowDay: function (date) {
                for (var i = 0; i < selectedDates.length; i++) {
                    // Check if date is in the selectedDates array
                    if (date.getTime() === selectedDates[i].getTime()) {
                        return { classes: "selected-date" }; // add selected-date class to selected dates
                    }
                }
                return; 
            },
        });

        // Add selected date to array and display it on the page
        $("#datepicker").on("changeDate", function (e) {
            if (preventChangeEvent) return; // Return early if the flag is set
            var selectedDate = e.date;
            if (selectedDate >= new Date(Date.now() - 86400000)) {
                return;
              }// do not allow selection of today or future dates
            if (selectedDates.some(date => date.getTime() === selectedDate.getTime())) {
                // Remove date from array if already selected
                selectedDates = selectedDates.filter(date => date.getTime() !== selectedDate.getTime());
                // Call updateChart() function only if there are any selected dates left
                if (selectedDates.length > 0) {
                    updateChart(selectedDates[selectedDates.length-1]);
                }
            } else {
                // Add date to array if not already selected
                selectedDates.push(selectedDate);
                updateChart(selectedDate);
                processData(selectedDate)
            }
            
            // Check if there are any selected dates
            if (selectedDates.length > 0) {
                // Refresh the datepicker without changing the month
                var currentMonth = $(this).datepicker('getDate').getMonth();
                preventChangeEvent = true; // Set the flag before calling setDate
                $(this).datepicker('setDate', new Date(selectedDate.getFullYear(), currentMonth, 1));
                $(this).datepicker('drawMonth');
                preventChangeEvent = false; // Reset the flag after refreshing the datepicker
            }
        });

        const selectDatesButton = document.getElementById("selectDatesButton");
        const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));

        selectDatesButton.addEventListener("click", () => {
            dateSelectionModal.show();
        });

        // Add event listener to the "Run" button
        document.getElementById("calculate-basals").addEventListener("click", async () => {
            if(selectedDates.length < 2) {alert('Please select at least 2 dates to run the basal rate adjustment calculations.'); return;}
            // console.log('selectedDates passed in run function: ', selectedDates)
            // let selectedDate = selectedDates[0];
            let AverageCombinedData = await getAverageCombinedData(selectedDates)
            let Basal = await adjustBasalRates(AverageCombinedData)
            console.log('Basal: ', Basal)
            const tempBasal = Basal.tempBasal
            const adjustedBasal = Basal.adjustedBasal
            console.log('tempBasal: ', tempBasal)
            console.log('adjustedBasal: ', adjustedBasal)
            dateSelectionModal.hide();
            loadBasalsTable(tempBasal, adjustedBasal)
        });         
    });

    
    const selectDatesButton = document.getElementById("selectDatesButton");
    const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));
    
    // Show the modal automatically when the page loads
    dateSelectionModal.show();
    
    selectDatesButton.addEventListener("click", () => {
        dateSelectionModal.show();
    });     
      // Initialize the datatable
      initDataTable();

      // Call the loadBasalsTable function with empty arrays as arguments
      loadBasalsTable([], []);
}
function initDataTable() {
    // Define the columns for the datatable
    const columns = [
      { title: "Time" },
      { title: "Temp Basal" },
      { title: "Adjusted Basal" },
    ];
  
    // Load the datatable
    $('#dataTable').DataTable({
      data: [],
      columns: columns,
      paging: false,
      searching: false,
      ordering: false,
    });
  }
function loadBasalsTable(tempBasal, adjustedBasal) {
var htmlCode =
  /*html*/
  `
    <h2>Adjust Basal Rates</h2>
    <button type="button" class="btn btn-primary" id="selectDatesButton">Select dates</button>

    <div class="modal fade" id="dateSelectionModal" tabindex="-1" role="dialog" aria-labelledby="dateSelectionModalLabel" aria-hidden="true">
      <!-- modal content omitted for brevity -->
    </div>

    <table id="dataTable" class="table table-striped table-bordered">
      <thead>
        <tr>
          <th>Time</th>
          <th>Temp Basal</th>
          <th>Adjusted Basal</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  // Define the columns for the datatable
const columns = [
    { title: "Time" },
    { title: "Temp Basal" },
    { title: "Adjusted Basal" },
  ];
  
  // Define the data for the datatable
  const data = [];
  for (let i = 0; i < 24; i++) {
    data.push([
      `${i.toString().padStart(2, '0')}:00`,
      tempBasal[i] || "",
      adjustedBasal[i] || "",
    ]);
  }

  // Update the datatable with new data
  const dataTable = $('#dataTable').DataTable();
  dataTable.clear();
  dataTable.rows.add(data);
  dataTable.draw();

}

  