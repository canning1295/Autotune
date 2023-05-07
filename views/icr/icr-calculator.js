import { updateChart } from "../updateChart.js";
import { combineData } from "../../calculations/createCombinedData.js";
import { getAverageCombinedData } from "../../calculations/createAvgCombinedData.js";
import { showLoadingAnimation, hideLoadingAnimation } from "../../loadingAnimation.js";
import { icrCalculator } from "../../calculations/icr.js";
import { options } from "../../index.js";

export function loadICR() {
    let htmlCode =
        /*html*/
        `
            <div>
                <h2>Adjust Insulin to Carb Ratios</h2>
                <button type="button" class="btn btn-primary" id="selectDatesButton">Select dates</button>

                <table id="dataTable" class="table table-striped table-bordered">
                <thead>
                    <tr>
                    <th>Time</th>
                    <th>Ratio</th>
                    </tr>
                </thead>
                <tbody></tbody>
                </table>
            </div>
            <div class="modal fade" id="dateSelectionModal" tabindex="-1" role="dialog" aria-labelledby="dateSelectionModalLabel" aria-hidden="true">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="dateSelectionModalLabel">Select Dates</h5>
                        </div>
                        <div class="modal-body">
                            <p id="instruct1">Please select dates below that you would like to include in the averages used to calculate Insulin to Carb ratio recommendations.</p>
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

    // The rest of the code for handling events and calculations remains the same

    // Initialize the datatable
    initDataTable();

    // Call the loadICRTable function with an empty object as argument
    loadICRTable({});
}

function initDataTable() {
  $('#dataTable').DataTable({
        data: [],
        columns: [
        { title: 'Time' },
        { title: 'Ratio' },
        ],
    });
}

function loadICRTable(icrRecommendations) {
    const dataTable = $('#dataTable').DataTable();
  
    // Clear the datatable
    dataTable.clear();
  
    // Add new data to the datatable with default values for missing or undefined properties
    dataTable.row.add(['Morning', icrRecommendations['Morning'] || 'N/A']);
    dataTable.row.add(['Mid-day', icrRecommendations['Mid-day'] || 'N/A']);
    dataTable.row.add(['Night', icrRecommendations['Night'] || 'N/A']);
    dataTable.row.add(['ICR 500 Rule', icrRecommendations['ICR 500 Rule'] || 'N/A']);
  
    // Redraw the table
    dataTable.draw();
  }
  

