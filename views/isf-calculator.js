import { getAverageCombinedData } from "../../calculations/createAvgCombinedData.js";
import { showLoadingAnimation, hideLoadingAnimation } from "../utils/loadingAnimation.js";
import { isfCalculator } from "../../calculations/isf.js";
import { updateChart } from "../utils/updateChart.js";
import { combineData } from "../calculations/createCombinedData.js";
import { getData } from "../utils/localDatabase.js";

export function loadISF() {
    let htmlCode =
	/*html*/
	`
        <div>
            <h2>Adjust Insulin Sensitivity Factor</h2>
            <button type="button" class="btn btn-primary" id="selectDatesButton">Select dates</button>
            <table id="dataTable"></table>
			<div id="reference"></div>
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
					Please select dates below that you would like to include in the averages used to calculate Insulin Sensitivity Factor recommendations.
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
				</div>

				<div class="modal-footer">
				<button type="button" id="calculate-isf" class="btn btn-primary" data-dismiss="modal">Run</button>
				</div>
            </div>
			</div>
        </div>
		<!-- End Modal -->
	`;
    document.getElementById("main").innerHTML = htmlCode;

    var selectedDates = [];
	var preventChangeEvent = false;
	initDataTable();
	loadISFTable({});

	const dateSelectionModal = new bootstrap.Modal(document.getElementById("dateSelectionModal"));
	const selectDatesButton = document.getElementById("selectDatesButton");
	selectDatesButton.addEventListener("click", () => {
		dateSelectionModal.show();
	});

    $(document).ready(async function () {
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
				// Highlight if selected
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

		// On date click
        $("#datepicker").on("changeDate", function (e) {
			if (preventChangeEvent) return;
			var pickedDate = e.date;
			// Do not allow selection of today or future
			if (pickedDate >= new Date(Date.now() - 86400000)) {
                return;
			}
			// Toggle selection
			if (selectedDates.some(date => date.getTime() === pickedDate.getTime())) {
				selectedDates = selectedDates.filter(date => date.getTime() !== pickedDate.getTime());
                if (selectedDates.length > 0) {
                    updateChart(selectedDates[selectedDates.length-1]);
					updateBasalChart(selectedDates[selectedDates.length-1]);
					updateTotals(selectedDates[selectedDates.length-1]);
                }
            } else {
				selectedDates.push(pickedDate);
				updateChart(pickedDate);
				combineData(pickedDate);
				updateBasalChart(pickedDate);
				updateTotals(pickedDate);
            }

			// Refresh datepicker display
            if (selectedDates.length > 0) {
                var currentMonth = $(this).datepicker('getDate').getMonth();
				preventChangeEvent = true;
				$(this).datepicker('setDate', new Date(pickedDate.getFullYear(), currentMonth, 1));
                $(this).datepicker('drawMonth');
				preventChangeEvent = false;
            }
        });

		// Run button
		document.getElementById("calculate-isf").addEventListener("click", async () => {
			showLoadingAnimation();
			try {
				let AverageCombinedData = await getAverageCombinedData(selectedDates);

				const sumBolusInsulin = AverageCombinedData.reduce((acc, cur) => acc + cur.bolusInsulin, 0);
				const sumBasalInsulin = AverageCombinedData.reduce((acc, cur) => acc + (cur.actualBasal / 12), 0);
				const dailyInsulinTotal = sumBolusInsulin + sumBasalInsulin;
				
				let isfRecommendations = isfCalculator(dailyInsulinTotal, sumBasalInsulin);
				loadISFTable(isfRecommendations);
			} catch (err) {
				console.error(err);
			} finally {
				hideModal("dateSelectionModal");
				hideLoadingAnimation();
			}
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
			document.body.classList.remove("modal-open");
		} else {
			console.error(`Element with ID '${modalElementId}' not found.`);
		}
	}

	function initDataTable() {
		$('#dataTable').DataTable({
			data: [],
			columns: [
				{ title: 'Recommendation' },
				{ title: 'ISF' },
			],
			paging: false,
			searching: false,
			ordering: false,
			info: false,
			lengthChange: false,
		});
	}

	function loadISFTable(isfRecommendations) {
		const dataTable = $('#dataTable').DataTable();
		dataTable.clear();
		dataTable.row.add(['Conservative ISF', isfRecommendations['Conservative ISF'] || '-']);
		dataTable.row.add(['Less aggressive', isfRecommendations['Less aggressive'] || '-']);
		dataTable.row.add(['ISF 1800 Rule', isfRecommendations['ISF 1800 Rule'] || '-']);
		dataTable.draw();

		const referenceUrl = "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5478012/";
		const referenceElement = document.createElement("a");
		referenceElement.href = referenceUrl;
		referenceElement.target = "_blank";
		referenceElement.title = "Open in a new window";
		referenceElement.textContent = "Reference";
		document.getElementById("reference").innerHTML = "";
		document.getElementById("reference").appendChild(referenceElement);
	}

	// Replicate basal chart from the Basal page
	async function updateBasalChart(date) {
		let key = date.toISOString().slice(0,10);
		let combinedData = await getData("Combined_Data", key);
		if (!combinedData) return;

		let chartLabels = combinedData.map(entry => {
			return new Date(entry.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
		});
		let basalData = combinedData.map(entry => entry.actualBasal);

		var canvas = document.getElementById("myBasalChart");
		if (!canvas) return;

		// Destroy old chart if needed
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
					y: { beginAtZero: true }
				},
				responsive: true,
				maintainAspectRatio: false,
			},
		});
	}

	// Replicate daily totals from the Basal page
	async function updateTotals(date) {
		let key = date.toISOString().slice(0, 10);
		let totalInsulin = await getData("Daily_Insulin_Total", key);
		let totalBasal = await getData("Daily_Basal_Total", key);
		let totalBolus = await getData("Daily_Bolus_Total", key);

		document.getElementById("totalDailyInsulinCell").innerText =
			totalInsulin !== null ? totalInsulin.toFixed(1) : "-";
		document.getElementById("totalBasalInsulinCell").innerText =
			totalBasal !== null ? totalBasal.toFixed(1) : "-";
		document.getElementById("totalMealBolusInsulinCell").innerText =
			totalBolus !== null ? totalBolus.toFixed(1) : "-";
	}
}