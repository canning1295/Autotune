import { updateChart } from "../utils/updateChart.js";
import { combineData } from "../calculations/createCombinedData.js";
import { getBGs } from "../nightscout_data/getBgData.js";
import { getAverageCombinedData } from "../calculations/createAvgCombinedData.js";
import { adjustBasalRatesUsingTemps, adjustBasalRatesUsingProfileBasals } from "../calculations/adjustBasal.js";
import { showLoadingAnimation, hideLoadingAnimation } from "../utils/loadingAnimation.js";

export function loadBasal() {
    let htmlCode =
    /*html*/
    `
        <div>
            <h2>Adjust Basal Rates</h2>
            <button type="button" class="btn btn-primary" id="selectDatesButton">Select Dates</button>
            <div id="alertMissingData" class="alert alert-danger" style="display:none;" role="alert">
                This date cannot be used due to more than 2 hours of missing data.
            </div>
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
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" value="true" id="includeTempBasal" />
                                    <label class="form-check-label" for="includeTempBasal">Calculate basal adjustments based on actual basal delivery (Include temp basal).</label>
                                </div>

                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" value="" id="useProfileBasal" checked/>
                                    <label class="form-check-label" for="useProfileBasal">Calculate basal adjustments based on the published basal rate schedule (Do not adjust for temp basal).</label>
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

    // Keep track of valid selected dates and disabled dates
    var selectedDates = [];
    var disabledDates = [];

    // Flag to prevent repeated "changeDate" triggers
    var preventChangeEvent = false;

    const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));

    $(document).ready(async function () {
        // Initialize datepicker with custom beforeShowDay
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
                
                // Disable today and future dates
                if (compareDate >= today) {
                    return {
                        enabled: false,
                        classes: 'disabled-date',
                        tooltip: 'Unavailable'
                    };
                }
                // Disable if date is in the disabledDates list
                if (disabledDates.some(d => d.getTime() === compareDate.getTime())) {
                    return {
                        enabled: false,
                        classes: 'disabled-date',
                        tooltip: 'Insufficient CGM Data'
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

        // Add or remove selected dates when user picks them
        $("#datepicker").on("changeDate", async function (e) {
            if (preventChangeEvent) return;
            let selectedDate = e.date;
            // If user tries to pick a new date that is in the future or disabled, skip
            if (selectedDate >= new Date(Date.now() - 86400000)) {
                return;
            }
            // Check if it is already in selectedDates
            let indexInSelected = selectedDates.findIndex(d => d.getTime() === selectedDate.getTime());
            if (indexInSelected >= 0) {
                // The user re-clicked a selected date, so remove it
                selectedDates.splice(indexInSelected, 1);
                if (selectedDates.length > 0) {
                    updateChart(selectedDates[selectedDates.length - 1]);
                }
            } else {
                // Attempt to fetch BG data for this date
                let bgData = await getBGs(selectedDate);
                if (!bgData) {
                    // No data found, skip
                    showMissingDataAlert();
                    addDateToDisabled(selectedDate);
                    return;
                } else {
                    // Check if there is more than 2 hours missing
                    // We expect 288 total 5-min intervals in a day. If we have <264 unique ones, it's missing >2 hours
                    let uniqueTimestamps = new Set(bgData.map(item => new Date(item.time).getTime()));
                    if (uniqueTimestamps.size < 264) {
                        // Not enough coverage
                        showMissingDataAlert();
                        addDateToDisabled(selectedDate);
                        return;
                    }
                }
                // If we get here, date is valid
                selectedDates.push(selectedDate);
                updateChart(selectedDate);
                combineData(selectedDate);
            }
            // Refresh the datepicker rendering
            var currentMonth = $(this).datepicker("getDate").getMonth();
            preventChangeEvent = true;
            $(this).datepicker("setDate", new Date(selectedDate.getFullYear(), currentMonth, 1));
            $(this).datepicker("drawMonth");
            preventChangeEvent = false;
        });

        // Handle "Select Dates" button
        const selectDatesButton = document.getElementById("selectDatesButton");
        selectDatesButton.addEventListener("click", () => {
            document.getElementById("alertMissingData").style.display = "none";
            dateSelectionModal.show();
            onlyOneCheck();
        });

        // Add event listener to the "Run" button
        document.getElementById("calculate-basals").addEventListener("click", () => {
            showLoadingAnimation();
            setTimeout(async () => {
                try {
                    let AverageCombinedData = await getAverageCombinedData(selectedDates);
                    let Basal;
                    const includeTempBasal = document.getElementById("includeTempBasal");
                    // decide which basal calc to run
                    if (includeTempBasal.checked) {
                        Basal = await adjustBasalRatesUsingTemps(AverageCombinedData);
                    } else {
                        Basal = await adjustBasalRatesUsingProfileBasals(AverageCombinedData);
                    }
                    const { tempBasal, adjustedBasal } = Basal;
                    loadBasalsTable(tempBasal, adjustedBasal);
                    hideModal("dateSelectionModal");
                } catch (error) {
                    console.error(error);
                } finally {
                    hideLoadingAnimation();
                }
            }, 50);
        });

        // Initialize the datatable
        initDataTable();
        // Call the loadBasalsTable function with empty arrays as arguments
        loadBasalsTable([], []);

        // Support function to show the missing data alert
        function showMissingDataAlert() {
            document.getElementById("alertMissingData").style.display = "block";
            showTemporaryMessage();
        }

        function showTemporaryMessage() {
            const popup = document.createElement('div');
            popup.textContent = "Unable to add date due to missing data.";
            popup.style.position = 'fixed';
            popup.style.bottom = '20px';
            popup.style.left = '50%';
            popup.style.transform = 'translateX(-50%)';
            popup.style.backgroundColor = 'blue';
            popup.style.color = 'white';
            popup.style.padding = '10px 20px';
            popup.style.borderRadius = '5px';
            popup.style.zIndex = '9999';
            popup.style.textAlign = 'center';
            document.body.appendChild(popup);
        
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 2000);
        }

        // Mark the date as disabled, refresh
        function addDateToDisabled(date) {
            if (!disabledDates.some(d => d.getTime() === date.getTime())) {
                disabledDates.push(new Date(date.getTime()));
            }
            // Force a UI redraw
            var currentMonth = $("#datepicker").datepicker("getDate").getMonth();
            preventChangeEvent = true;
            $("#datepicker").datepicker("setDate", new Date(date.getFullYear(), currentMonth, 1));
            $("#datepicker").datepicker("drawMonth");
            preventChangeEvent = false;
        }

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
            document.body.classList.remove("modal-open");
          } else {
            console.error(`Element with ID '${modalElementId}' not found.`);
          }
        }

        function onlyOneCheck() {
            const includeTempBasal = document.getElementById("includeTempBasal");
            const useProfileBasal = document.getElementById("useProfileBasal");
            includeTempBasal.addEventListener("change", function () {
                if (this.checked) {
                  useProfileBasal.checked = false;
                }
            });
            useProfileBasal.addEventListener("change", function () {
                if (this.checked) {
                  includeTempBasal.checked = false;
                }
            });
        }

        function initDataTable() {
          const columns = [
            { title: "Time", className: "text-center" },
            { title: "Previous Basal", className: "text-center" },
            { title: "Adjusted Basal", className: "text-center" },
          ];
          $("#dataTable").DataTable({
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
                  <th>Previous Basal&shy;(U/hr)</th>
                  <th>Adjusted Basal&shy;(U/hr)</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          `;
      
          const columns = [
            { title: "Time" },
            { title: "Previous Basal" },
            { title: "Adjusted Basal" },
          ];
      
          const data = [];
          for (let i = 0; i < 24; i++) {
            data.push([
              `${i.toString().padStart(2, "0")}:00`,
              tempBasal[i] || "",
              adjustedBasal[i] || "",
            ]);
          }
      
          const dataTable = $("#dataTable").DataTable();
          dataTable.clear();
          dataTable.rows.add(data);
          dataTable.draw();
        }
    });
}