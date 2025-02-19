import { updateChart } from "../utils/updateChart.js";
import { combineData } from "../calculations/createCombinedData.js";
import { getBGs } from "../nightscout_data/getBgData.js";
import { getAverageCombinedData } from "../calculations/createAvgCombinedData.js";
import { adjustBasalRatesUsingTemps, adjustBasalRatesUsingProfileBasals } from "../calculations/adjustBasal.js";
import { showLoadingAnimation, hideLoadingAnimation } from "../utils/loadingAnimation.js";
import { getData } from "../utils/localDatabase.js";

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
        <!-- Begin Modal for Date Selection -->
        <div class="modal fade" id="dateSelectionModal" tabindex="-1" role="dialog" aria-labelledby="dateSelectionModalLabel" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              
              <div class="modal-header">
                <h5 class="modal-title" id="dateSelectionModalLabel">Select Dates</h5>
              </div>
              
              <div class="modal-body">
                <!-- Instructions -->
                <p id="instruct1">
                  Please select dates below that you would like to include in the BG average used to calculate your basal rate adjustment recommendations.
                </p>
                
                <!-- Datepicker -->
                <div class="row">
                  <div class="col-12">
                    <div id="datepicker-container" class="mx-auto mb-3">
                      <div id="datepicker" class="form-control"></div>
                    </div>
                  </div>
                </div>

                <!-- BG Chart -->
                <div class="row">
                  <div class="col-12">
                    <div id="chartContainer" class="mb-4">
                      <canvas id="myChart"></canvas>
                    </div>
                  </div>
                </div>

                <!-- Basal Chart -->
                <div class="row">
                  <div class="col-12">
                    <div id="basalChartContainer" class="mb-4">
                      <canvas id="myBasalChart"></canvas>
                    </div>
                  </div>
                </div>

                <!-- Insulin Totals Table -->
                <h5>Insulin Totals</h5>
                <table id="insulinTotalsTable" class="table table-bordered">
                  <tbody>
                    <tr>
                      <th>Total Daily Insulin</th>
                      <td id="totalDailyInsulinCell">-</td>
                    </tr>
                    <tr>
                      <th>Total Basal Insulin</th>
                      <td id="totalBasalInsulinCell">-</td>
                    </tr>
                    <tr>
                      <th>Total Meal Bolus Insulin</th>
                      <td id="totalMealBolusInsulinCell">-</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Checkboxes for actual basal vs. profile basal -->
                <div class="form-check form-check-inline">
                  <input class="form-check-input" type="checkbox" value="true" id="includeTempBasal" />
                  <label class="form-check-label" for="includeTempBasal">
                    Calculate basal adjustments based on actual basal delivery (Include temp basal + microbolus).
                  </label>
                </div>
                <div class="form-check form-check-inline">
                  <input class="form-check-input" type="checkbox" value="" id="useProfileBasal" checked />
                  <label class="form-check-label" for="useProfileBasal">
                    Calculate basal adjustments based on the published basal rate schedule (Do not adjust for temp basal).
                  </label>
                </div>
                
              </div>

              <div class="modal-footer">
                <!-- The "Run" button on the right -->
                <button type="button" id="calculate-basals" class="btn btn-primary" data-dismiss="modal">Run</button>
              </div>
            </div>
          </div>
        </div>
        <!-- End Modal -->
    `;

    document.getElementById("main").innerHTML = htmlCode;

    // Keep track of valid selected dates and disabled dates
    var selectedDates = [];
    var disabledDates = [];
    var preventChangeEvent = false;  // to avoid repeated triggering

    const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));

    $(document).ready(async function () {
        // Initialize the data table that shows final 24-hour rates
        initDataTable();
        loadBasalsTable([], []);

        // Setup datepicker
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

                // Disable today/future
                if (compareDate >= today) {
                    return {
                        enabled: false,
                        classes: 'disabled-date',
                        tooltip: 'Unavailable'
                    };
                }
                // Mark disabled if in disabledDates
                if (disabledDates.some(d => d.getTime() === compareDate.getTime())) {
                    return {
                        enabled: false,
                        classes: 'disabled-date',
                        tooltip: 'Insufficient CGM or Basal Data'
                    };
                }
                // Mark selected
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

        // When user selects/unselects a date
        $("#datepicker").on("changeDate", async function (e) {
            if (preventChangeEvent) return;
            let selectedDate = e.date;
            if (selectedDate >= new Date(Date.now() - 86400000)) {
                return;
            }

            // If user re-clicked a selected date, remove it
            let indexInSelected = selectedDates.findIndex(d => d.getTime() === selectedDate.getTime());
            if (indexInSelected >= 0) {
                selectedDates.splice(indexInSelected, 1);
                // update the BG chart if we still have something
                if (selectedDates.length > 0) {
                    updateChart(selectedDates[selectedDates.length - 1]);
                    updateBasalChart(selectedDates[selectedDates.length - 1]);
                    updateTotals(selectedDates[selectedDates.length - 1]);
                }
            } else {
                // Attempt to fetch BG data
                let bgData = await getBGs(selectedDate);
                if (!bgData) {
                    showMissingDataAlert();
                    addDateToDisabled(selectedDate);
                    return;
                }
                // Check BG coverage: if <264 unique 5-min intervals => missing > 2 hours
                let uniqueTimestamps = new Set(bgData.map(item => new Date(item.time).getTime()));
                if (uniqueTimestamps.size < 264) {
                    showMissingDataAlert();
                    addDateToDisabled(selectedDate);
                    return;
                }

                // It's valid for BG, so let's combine the basal data:
                selectedDates.push(selectedDate);
                await combineData(selectedDate);

                // Now check for missing actual or profile basal coverage
                let key = selectedDate.toISOString().slice(0,10);
                let combinedData = await getData("Combined_Data", key);
                if (!combinedData || combinedData.length < 288) {
                    // Missing data
                    showMissingDataAlert();
                    addDateToDisabled(selectedDate);
                    // remove from selectedDates
                    selectedDates = selectedDates.filter(d => d.getTime() !== selectedDate.getTime());
                    return;
                }
                // Count how many 5-min windows have neither actual nor profile basal
                let missingBasalCount = 0;
                combinedData.forEach(d => {
                    const a = d.actualBasal;
                    const p = d.profileBasal;
                    // if both are missing or NaN, mark as missing
                    if (
                        ((a === null || a === undefined || isNaN(a)) &&
                         (p === null || p === undefined || isNaN(p)))
                    ) {
                        missingBasalCount++;
                    }
                });
                // If >24 (2 hours) windows missing coverage
                if (missingBasalCount > 24) {
                    showMissingDataAlert();
                    addDateToDisabled(selectedDate);
                    selectedDates = selectedDates.filter(d => d.getTime() !== selectedDate.getTime());
                    return;
                }

                // If we get here, it's fully valid
                updateChart(selectedDate);
                updateBasalChart(selectedDate);
                updateTotals(selectedDate);
            }

            // refresh datepicker display
            var currentMonth = $(this).datepicker("getDate").getMonth();
            preventChangeEvent = true;
            $(this).datepicker("setDate", new Date(selectedDate.getFullYear(), currentMonth, 1));
            $(this).datepicker("drawMonth");
            preventChangeEvent = false;
        });

        // For toggling checkboxes so only one is active
        onlyOneCheck();

        // "Select Dates" button shows modal
        const selectDatesButton = document.getElementById("selectDatesButton");
        selectDatesButton.addEventListener("click", () => {
            document.getElementById("alertMissingData").style.display = "none";
            dateSelectionModal.show();
        });

        // "Run" button
        document.getElementById("calculate-basals").addEventListener("click", async () => {
            showLoadingAnimation();
            setTimeout(async () => {
                try {
                    let AverageCombinedData = await getAverageCombinedData(selectedDates);
                    let Basal;
                    const includeTempBasal = document.getElementById("includeTempBasal");
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
    });

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

    function addDateToDisabled(date) {
        if (!disabledDates.some(d => d.getTime() === date.getTime())) {
            disabledDates.push(new Date(date.getTime()));
        }
        // refresh
        var currentMonth = $("#datepicker").datepicker("getDate").getMonth();
        preventChangeEvent = true;
        $("#datepicker").datepicker("setDate", new Date(date.getFullYear(), currentMonth, 1));
        $("#datepicker").datepicker("drawMonth");
        preventChangeEvent = false;
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

    function initDataTable() {
        const columns = [
            { title: "Time", className: "text-center" },
            { title: "Previous Basal (U/hr)", className: "text-center" },
            { title: "Adjusted Basal (U/hr)", className: "text-center" },
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
        const dataTable = $("#dataTable").DataTable();
        const data = [];
        for (let i = 0; i < 24; i++) {
            data.push([
                `${i.toString().padStart(2, "0")}:00`,
                tempBasal[i] || "",
                adjustedBasal[i] || "",
            ]);
        }
        dataTable.clear();
        dataTable.rows.add(data);
        dataTable.draw();
    }

    // New chart for actual basal
    async function updateBasalChart(date) {
        let key = date.toISOString().slice(0,10);
        let combinedData = await getData("Combined_Data", key);
        if (!combinedData) return;

        // gather times and actualBasal rates
        let chartLabels = combinedData.map(entry => {
            let localTime = new Date(entry.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            return localTime;
        });
        let basalData = combinedData.map(entry => entry.actualBasal);

        // get canvas
        var canvas = document.getElementById("myBasalChart");
        if (!canvas) return;

        // destroy old if exists
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        var ctx = canvas.getContext("2d");
        canvas.chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: "Actual Basal (U/hr)",
                        data: basalData,
                        borderColor: "rgba(54, 162, 235, 1)",
                        backgroundColor: "rgba(54, 162, 235, 0.2)",
                        pointRadius: 0,
                        spanGaps: true,
                    },
                ],
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
            },
        });
    }

    // Insulin Totals for the last selected date
    async function updateTotals(date) {
        let key = date.toISOString().slice(0,10);
        let totalInsulin = await getData("Daily_Insulin_Total", key);
        let totalBasal = await getData("Daily_Basal_Total", key);
        let totalBolus = await getData("Daily_Bolus_Total", key);

        // Fill them if available
        document.getElementById("totalDailyInsulinCell").innerText = totalInsulin !== null ? totalInsulin.toFixed(1) : "-";
        document.getElementById("totalBasalInsulinCell").innerText = totalBasal !== null ? totalBasal.toFixed(1) : "-";
        document.getElementById("totalMealBolusInsulinCell").innerText = totalBolus !== null ? totalBolus.toFixed(1) : "-";
    }
}