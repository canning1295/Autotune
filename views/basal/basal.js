import { updateChart } from "./updateChart.js";
import { processData } from "./processData.js";
import { getAverageCombinedData } from "./createAvgCombinedData.js";
import { adjustBasalRates } from "../../calculations/adjustBasal.js";

export function loadBasal() {
    const htmlLoader = 
    /*html*/
    `
        <div class="loader">
            <div class="loader-inner">
                <div class="loader-line-wrap">
                    <div class="loader-line"></div>
                </div>
                <div class="loader-line-wrap">
                    <div class="loader-line"></div>
                </div>
                <div class="loader-line-wrap">
                    <div class="loader-line"></div>
                </div>
                <div class="loader-line-wrap">
                    <div class="loader-line"></div>
                </div>
                <div class="loader-line-wrap">
                    <div class="loader-line"></div>
                </div>
            </div>
        </div>
        <style>
            .loader {
            background: #000;
            background: radial-gradient(#222, #000);
            bottom: 0;
            left: 0;
            overflow: hidden;
            position: fixed;
            right: 0;
            top: 0;
            z-index: 99999;
        }

        .loader-inner {
            bottom: 0;
            height: 60px;
            left: 0;
            margin: auto;
            position: absolute;
            right: 0;
            top: 0;
            width: 100px;
        }

        .loader-line-wrap {
            animation: 
                spin 2000ms cubic-bezier(.175, .885, .32, 1.275) infinite
            ;
            box-sizing: border-box;
            height: 50px;
            left: 0;
            overflow: hidden;
            position: absolute;
            top: 0;
            transform-origin: 50% 100%;
            width: 100px;
        }
        .loader-line {
            border: 4px solid transparent;
            border-radius: 100%;
            box-sizing: border-box;
            height: 100px;
            left: 0;
            margin: 0 auto;
            position: absolute;
            right: 0;
            top: 0;
            width: 100px;
        }
        .loader-line-wrap:nth-child(1) { animation-delay: -50ms; }
        .loader-line-wrap:nth-child(2) { animation-delay: -100ms; }
        .loader-line-wrap:nth-child(3) { animation-delay: -150ms; }
        .loader-line-wrap:nth-child(4) { animation-delay: -200ms; }
        .loader-line-wrap:nth-child(5) { animation-delay: -250ms; }

        .loader-line-wrap:nth-child(1) .loader-line {
            border-color: hsl(0, 80%, 60%);
            height: 90px;
            width: 90px;
            top: 7px;
        }
        .loader-line-wrap:nth-child(2) .loader-line {
            border-color: hsl(60, 80%, 60%);
            height: 76px;
            width: 76px;
            top: 14px;
        }
        .loader-line-wrap:nth-child(3) .loader-line {
            border-color: hsl(120, 80%, 60%);
            height: 62px;
            width: 62px;
            top: 21px;
        }
        .loader-line-wrap:nth-child(4) .loader-line {
            border-color: hsl(180, 80%, 60%);
            height: 48px;
            width: 48px;
            top: 28px;
        }
        .loader-line-wrap:nth-child(5) .loader-line {
            border-color: hsl(240, 80%, 60%);
            height: 34px;
            width: 34px;
            top: 35px;
        }

        @keyframes spin {
            0%, 15% {
                transform: rotate(0);
            }
            100% {
                transform: rotate(360deg);
            }
        }
        </style>
    `;
    var htmlCode =
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
    <p id="instruct1">Please select dates below that you would like to include in the BG average used to calculate your basal rate adjustment calculations.</p>
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
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" value="" id="includeTempBasal" checked />
                <label class="form-check-label" for="includeTempBasal">Include temp basal delivery in calculations</label>
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
        
            // Hide the loading animation and display the basal table
            hideLoadingAnimation();
            hideModal('dateSelectionModal')
            loadBasalsTable(tempBasal, adjustedBasal);
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
      

    function showLoadingAnimation() {
        // Create a new div to show the loading animation
        const loaderDiv = document.createElement('div');
        loaderDiv.innerHTML = htmlLoader;
        document.body.appendChild(loaderDiv);
    
        // Disable the background
        const mainDiv = document.getElementById('main');
        mainDiv.classList.add('disabled');
    }
    
    function hideLoadingAnimation() {
        // Remove the loader div
        const loaderDiv = document.querySelector('.loader');
        if (loaderDiv) {
            loaderDiv.parentNode.removeChild(loaderDiv);
        }
    
        // Enable the background
        const mainDiv = document.getElementById('main');
        mainDiv.classList.remove('disabled');
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
      <!-- modal content omitted for brevity -->
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

  