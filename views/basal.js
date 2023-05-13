import { updateChart } from "../utils/updateChart.js";
import { combineData } from "../calculations/createCombinedData.js";
import { getAverageCombinedData } from "../calculations/createAvgCombinedData.js";
import { adjustBasalRates } from "../calculations/adjustBasal.js";
import { showLoadingAnimation, hideLoadingAnimation } from "../utils/loadingAnimation.js";

export function loadBasal() {
    let htmlCode =
    /*html*/
    `
        <div>
            <h2>Adjust Basal Rates</h2>
            <button type="button" class="btn btn-primary" id="selectDatesButton">Select dates</button>
            <table id="dataTable"></table>
        </div>
        <div class="modal fade" id="dateSelectionModal" tabindex="-1" role="dialog" aria-labelledby="dateSelectionModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="dateSelectionModalLabel">Select Dates</h5>
                    </div>
                    <div class="modal-body">
                        <p id="instruct1">Please select dates below that you would like to include in the BG average used to calculate your basal rate adjustment recommendations.</p>
                        <div class="row">
                            <div class="col-12">
                                <div id="chartContainer" class="mb-4">
                                    <canvas id="myChart"></canvas>
                                </div>
                            </div>
                            <div class="col-12">
                                <div id="datepicker-container" class="mx-auto mb-3">
                                    <div id="datepicker" class="form-control"></div>
                                </div>
                                <!-- <div class="form-check form-check-inline">
                                   <input class="form-check-input" type="checkbox" value="" id="includeTempBasal" checked />
                                    <label class="form-check-label" for="includeTempBasal">Calculate basal adjustments based the temp basal insulin delivery averages.</label>
                                </div>-->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" id="calculate-basals" class="btn btn-primary" data-dismiss="modal">Run</button>
                        </div>
                </div>
            </div>
        </div>
    `;
// TODO: Allow user to only use profile data for basal adjustment
    document.getElementById("main").innerHTML = htmlCode;
    const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));
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
            // if (selectedDate >= new Date(Date.now() - 86400000)) {
            //     return;
            //   }// do not allow selection of today or future dates
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
                combineData(selectedDate)
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

        // Add event listener to the "Run" button
        document.getElementById("calculate-basals").addEventListener("click", async () => {
            if(selectedDates.length < 2) {
                alert('Please select at least 2 dates to run the basal rate adjustment calculations.'); 
                return;
            }
            // Show the loading animation
            showLoadingAnimation();
        
            // Execute the code for adjusting basal rates
            let AverageCombinedData = await getAverageCombinedData(selectedDates);
            let Basal = await adjustBasalRates(AverageCombinedData);
            const tempBasal = Basal.tempBasal;
            const adjustedBasal = Basal.adjustedBasal;
            
            hideModal('dateSelectionModal')
            loadBasalsTable(tempBasal, adjustedBasal);
            hideLoadingAnimation();
        }); 
              
    });

    function hideModal(modalElementId) {
		const modalElement = document.getElementById(modalElementId);
		const backdrop = document.querySelector(".modal-backdrop");
	
		if (modalElement) {
			modalElement.classList.remove("show");
			modalElement.style.display = "none";
			modalElement.setAttribute("aria-hidden", "true");
		
			if (backdrop) {
				backdrop.parentNode.removeChild(backdrop);
			}
		
			// Remove 'modal-open' class from the body
			document.body.classList.remove("modal-open");
		} else {
			console.error(`Element with ID '${modalElementId}' not found.`);
		}
	}
      


    
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
      { title: "Time", className: "text-center"  },
      { title: "Temp Basal", className: "text-center" },
      { title: "Adjusted Basal", className: "text-center" },
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
    </div>

    <table id="dataTable" class="table table-striped table-bordered">
      <thead>
        <tr>
          <th>Time</th>
          <th>Temp Basal&shy;(U/hr)</th>
          <th>Adjusted Basal&shy;(U/hr)</th>
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

  