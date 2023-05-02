import { updateChart } from "./updateChart.js";
import { processData } from "./processData.js";
import { getAverageCombinedData } from "./createAvgCombinedData.js";
import { showLoadingAnimation, hideLoadingAnimation } from '../../loadingAnimation.js';
import { adjustBasalRates } from "../../calculations/adjustBasal.js";

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
    $(document).ready(async function () {
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
            showLoadingAnimation();
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
            processData(selectedDate)
            hideLoadingAnimation();
        });
        
        const selectDatesButton = document.getElementById("selectDatesButton");
        const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));

        selectDatesButton.addEventListener("click", () => {
            dateSelectionModal.show();
        });

        // Add event listener to the "Run" button
        document.getElementById("calculate-basals").addEventListener("click", async () => {
            console.log('selectedDates passed in run function: ', selectedDates)
            // let selectedDate = selectedDates[0];
            let AverageCombinedData = await getAverageCombinedData(selectedDates)
            adjustBasalRates(AverageCombinedData)
        });         
    });

    
    const selectDatesButton = document.getElementById("selectDatesButton");
    const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));
    
    // Show the modal automatically when the page loads
    dateSelectionModal.show();
    
    selectDatesButton.addEventListener("click", () => {
        dateSelectionModal.show();
    });     
}