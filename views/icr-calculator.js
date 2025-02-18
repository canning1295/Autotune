import { updateChart } from "../utils/updateChart.js";
import { combineData } from "../calculations/createCombinedData.js";
import { getAverageCombinedData } from "../calculations/createAvgCombinedData.js";
import { showLoadingAnimation, hideLoadingAnimation } from "../utils/loadingAnimation.js";
import { icrCalculator } from "../calculations/icr.js";
import { options } from "../index.js";

export function loadICR() {
    let htmlCode =
        /*html*/
        `
        <div>
            <h2>Adjust Insulin to Carb Ratio</h2>
            <button type="button" class="btn btn-primary" id="selectDatesButton">Select dates</button>
            <table id="dataTable"></table>
            <div id="reference"></div> <!-- Add this line -->
        </div>
        <div class="modal fade" id="dateSelectionModal" tabindex="-1" role="dialog" aria-labelledby="dateSelectionModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="dateSelectionModalLabel">Select Dates</h5>
                    </div>
                    <div class="modal-body">
                        <p id="instruct1">Please select dates below that you would like to include in the averages used to calculate Insulin to Carb ratio recommendations..</p>
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
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" id="calculate-icr" class="btn btn-primary" data-dismiss="modal">Run</button>
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
            keepOpen: true,
            container: "#datepicker",
            keyboardNavigation: false,
            gotoCurrent: true,
            beforeShowDay: function (date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const compareDate = new Date(date);
                compareDate.setHours(0, 0, 0, 0);
                
                // Disable today and all future dates
                if (compareDate >= today) {
                    return {
                        enabled: false,
                        classes: 'disabled-date',
                        tooltip: 'Unavailable'
                    };
                }
                // Highlight selected dates
                for (var i = 0; i < selectedDates.length; i++) {
                    if (date.getTime() === selectedDates[i].getTime()) {
                        return {
                            enabled: true,
                            classes: 'selected-date',
                            tooltip: 'Selected date'
                        };
                    }
                }
                return {
                    enabled: true,
                    classes: '',
                    tooltip: ''
                };
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
        document.getElementById("calculate-icr").addEventListener("click", async () => {
            // if(selectedDates.length < 2) {
            //     alert('Please select at least 2 dates to run the insulin to carbohydrate calculations.'); 
            //     return;
            // }
            showLoadingAnimation();
            let AverageCombinedData = await getAverageCombinedData(selectedDates);
            
            const sumBolusInsulin = AverageCombinedData.reduce((accumulator, currentValue) => {
                return accumulator + currentValue.bolusInsulin;
            }, 0);
            const sumBasalInsulin = AverageCombinedData.reduce((accumulator, currentValue) => {
                return accumulator + (currentValue.actualBasal / 12);
            }, 0)
            const dailyInsulinTotal = sumBolusInsulin + sumBasalInsulin;

            let icrRecommendations = icrCalculator(options.weight, sumBasalInsulin, dailyInsulinTotal)
            console.log(icrRecommendations);
            loadICRTable(icrRecommendations);
            
            hideModal('dateSelectionModal')
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

    // Initialize the datatable
    initDataTable();

    // Call the loadICRTable function with an empty object as argument
    loadICRTable({});

    selectDatesButton.addEventListener("click", () => {
        dateSelectionModal.show();
    });     
}



function initDataTable() {
    $('#dataTable').DataTable({
        data: [],
        columns: [
            { title: 'Time' },
            { title: 'Ratio' },
        ],
        paging: false,
        searching: false,
        ordering: false,
        info: false,
        lengthChange: false,
    });
}

function loadICRTable(icrRecommendations) {
    const dataTable = $('#dataTable').DataTable();

    // Clear the datatable
    dataTable.clear();

    // Add new data to the datatable with default values for missing or undefined properties
    dataTable.row.add(['Morning', icrRecommendations['Morning'] || '-']);
    dataTable.row.add(['Mid-day', icrRecommendations['Mid-day'] || '-']);
    dataTable.row.add(['Night', icrRecommendations['Night'] || '-']);
    dataTable.row.add(['ICR 500 Rule', icrRecommendations['ICR 500 Rule'] || '-']);

    // Redraw the table
    dataTable.draw();

    // Display the reference link after the table
    const referenceUrl = "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012/";
    const referenceElement = document.createElement("a");
    referenceElement.href = referenceUrl;
    referenceElement.target = "_blank";
    referenceElement.title = "Open in a new window";
    referenceElement.textContent = "Reference";

    document.getElementById("reference").innerHTML = "";
    document.getElementById("reference").appendChild(referenceElement);
}





