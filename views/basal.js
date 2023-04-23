import { getData } from '../localDatabase.js';

export function loadBasal() {
    console.log('Loading settings')
    // JavaScript code to insert HTML into the "main" div
    var htmlCode =
		/*html*/
		`
        <h2>Adjust Basal Rates</h2>
        <div class="row">
            <div class="col-md-12">
                <canvas id="myChart"></canvas>
            </div>
        </div>
        <div class="container">
            <h4>Select Dates:</h4>
            <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                <label for="datepicker">Pick a Date:</label>
                <input type="text" id="datepicker" class="form-control">
                </div>
            </div>
            <div class="col-md-6">
                <label>Selected Dates:</label>
                <ul id="selected-dates"></ul>
            </div>
            </div>
        </div>
    `
    document.getElementById('main').innerHTML = htmlCode;

    $(document).ready(function() {
        // Initialize datepicker
        $('#datepicker').datepicker({
          format: 'yyyy-mm-dd',
          autoclose: false,
          todayHighlight: true,
          keepOpen: true, // keep calendar open after date selection
          beforeShowDay: function(date) {
            // Check if date is in selectedDates array
            var selectedDates = $('#datepicker').datepicker('getDates');
            for (var i = 0; i < selectedDates.length; i++) {
              if (date.getTime() === selectedDates[i].getTime()) {
                return {classes: 'selected-date'}; // add selected-date class to selected dates
              }
            }
            return; // otherwise, do not modify appearance
          }
        });
  
        // Initialize selectedDates array
        var selectedDates = [];
  
        // Add selected date to array and display it on the page
        $('#datepicker').on('changeDate', function() {
          var selectedDate = $('#datepicker').datepicker('getDate');
          if (selectedDates.includes(selectedDate)) {
            // Remove date from array if already selected
            selectedDates.splice(selectedDates.indexOf(selectedDate), 1);
          } else {
            // Add date to array if not already selected
            selectedDates.push(selectedDate);
          }
          $('#selected-dates').empty(); // clear previous selections
          for (var i = 0; i < selectedDates.length; i++) {
            $('#selected-dates').append('<li>' + selectedDates[i].toDateString() + '</li>');
          }
        });
      });

      function updateChart(date) {
        // Retrieve bg data for selected date from indexedDB
        getData('bgData', date.toISOString())
          .then(function(bgData) {
            // Parse the bg data from string to number
            bgData = bgData.map(function(bgValue) {
              return parseFloat(bgValue);
            });
      
            // Get the canvas element and destroy existing chart if it exists
            var canvas = document.getElementById('myChart');
            if (canvas.chart) {
              canvas.chart.destroy();
            }
      
            // Create a new chart with the retrieved bg data
            var ctx = canvas.getContext('2d');
            var myChart = new Chart(ctx, {
              type: 'line',
              data: {
                labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'],
                datasets: [{
                  label: 'BG values',
                  data: bgData,
                  borderColor: 'rgba(255, 99, 132, 1)',
                  backgroundColor: 'rgba(255, 99, 132, 0.2)',
                }]
              },
              options: {
                scales: {
                  yAxes: [{
                    ticks: {
                      beginAtZero: true
                    }
                  }]
                }
              }
            });
            canvas.chart = myChart;
          })
          .catch(function(error) {
            console.log(error);
          });
      }
      // Update chart when date is selected
      $('#datepicker').on('changeDate', function() {
        var selectedDate = $('#datepicker').datepicker('getDate');
        updateChart(selectedDate);
      });
      

}