// File: src/pages/BasalPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Updated DayPicker imports for v8
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

import { combineData } from '../calculations/createCombinedData';
import { getAverageCombinedData } from '../calculations/createAvgCombinedData';
import {
  adjustBasalRatesUsingTemps,
  adjustBasalRatesUsingProfileBasals,
} from '../calculations/adjustBasal';
import { CombinedData, UserOptions } from '../types/AutotuneTypes';
import { showLoadingAnimation, hideLoadingAnimation } from '../utils/loadingAnimation';

// Register Chart.js components so react-chartjs-2 works properly:
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface BasalPageProps {
  userOptions: UserOptions;
}

export const BasalPage: React.FC<BasalPageProps> = ({ userOptions }) => {
  // Array of selected Dates
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Toggle between including actual temp basal vs. using profile
  const [includeTempBasal, setIncludeTempBasal] = useState<boolean>(true);

  // Table results (per-hour data for old vs. new)
  const [tempBasal, setTempBasal] = useState<string[]>([]);
  const [adjustedBasal, setAdjustedBasal] = useState<string[]>([]);

  // Chart data for the "last" selected date
  const [chartData, setChartData] = useState<{
    labels: string[];
    values: number[];
  }>({ labels: [], values: [] });

  /**
   * Pulls or creates Combined_Data for a given date, then builds BG chart data.
   */
  async function updateChartForDate(latestDate: Date) {
    try {
      // Ensure Combined_Data is created
      await combineData(latestDate, userOptions);

      // Load that day’s Combined_Data
      const dateKey = latestDate.toISOString().slice(0, 10);
      const { getData } = await import('../utils/localDatabase');
      const store = await getData<CombinedData[]>('Combined_Data', dateKey);

      if (!store) {
        setChartData({ labels: [], values: [] });
        return;
      }

      // Convert each 5-min block to [label, BG]
      const labels = store.map(entry => {
        const t = new Date(entry.time);
        return `${t.getHours().toString().padStart(2, '0')}:${t
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
      });
      const values = store.map(entry => entry.bg);

      setChartData({ labels, values });
    } catch (error) {
      console.error('Error updating chart:', error);
      // Display an error message to the user
      alert('Failed to update chart. Please check your Nightscout URL and network connection.');
      setChartData({ labels: [], values: [] });
    }
  }

  /**
   * Switches between "Include Temp" or "Profile Only"
   */
  function handleCheckboxChange(newValue: boolean) {
    setIncludeTempBasal(newValue);
  }

  /**
   * Run calculations for average Combined_Data => adjust basals => display results in table
   */
  async function handleRunCalculations() {
    if (selectedDates.length === 0) {
      alert('Please select at least 1 date.');
      return;
    }
    
    showLoadingAnimation();
    
    try {
      // Ensure Combined_Data for each chosen date
      for (const dt of selectedDates) {
        await combineData(dt, userOptions);
      }
      
      // Build average
      const averagedData = await getAverageCombinedData(selectedDates);

      // Decide which approach
      let results: { tempBasal: string[]; adjustedBasal: string[] };
      if (includeTempBasal) {
        results = await adjustBasalRatesUsingTemps(averagedData, userOptions);
      } else {
        results = await adjustBasalRatesUsingProfileBasals(averagedData, userOptions);
      }

      setTempBasal(results.tempBasal);
      setAdjustedBasal(results.adjustedBasal);
    } finally {
      hideLoadingAnimation();
    }
  }

  /**
   * Called whenever DayPicker selection changes (v8 uses onSelect with mode="multiple").
   */
  function handleSelect(days: Date[] | undefined) {
    if (!days) {
      setSelectedDates([]);
      setChartData({ labels: [], values: [] });
      return;
    }
    
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const filtered = days.filter(d => d < cutoff);

    setSelectedDates(filtered);

    // Comment out the chart update so calculations don't run on date click:
    /*
    if (filtered.length > 0) {
      updateChartForDate(filtered[filtered.length - 1]);
    } else {
      setChartData({ labels: [], values: [] });
    }
    */
  }

  // Dynamic status for the DayPicker
  const footer = selectedDates.length
    ? `Selected: ${selectedDates.map(d => d.toLocaleDateString()).join(', ')}`
    : 'Please pick date(s).';

  // Example useEffect that might be triggering calculations immediately
  useEffect(() => {
    if (selectedDates.length > 0) {
      // Remove or comment out this calculation call
      // getAverageCombinedData(selectedDates);
    }
  }, [selectedDates]);

  return (
    <div style={{ padding: '1rem', textAlign: 'center' }}>
      <h2>Adjust Basal Rates</h2>

      {/* Toggling approach */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1rem' }}>
        <div>
          <label>
            <input
              type="checkbox"
              checked={includeTempBasal}
              onChange={() => handleCheckboxChange(true)}
            />
            &nbsp;Include Temp Basal
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={!includeTempBasal}
              onChange={() => handleCheckboxChange(false)}
            />
            &nbsp;Use Profile Basals Only
          </label>
        </div>
      </div>

      {/* DayPicker with multiple selection and onSelect callback */}
      <div style={{ marginBottom: '1rem' }}>
        <DayPicker
          mode="multiple"
          selected={selectedDates}
          onSelect={handleSelect}
          // This disables picking "today" or any future date
          disabled={{ from: new Date() }}
        />
        <p>{footer}</p>
      </div>

      {/* ChartJS line chart for the last selected date */}
      {chartData.labels.length > 0 && (
        <div style={{ maxWidth: 600, margin: '0 auto 2rem' }}>
          <Line
            data={{
              labels: chartData.labels,
              datasets: [
                {
                  label: 'BG (mg/dL)',
                  data: chartData.values,
                  borderColor: 'rgb(255,99,132)',
                  backgroundColor: 'rgba(255,99,132, 0.2)',
                },
              ],
            }}
            options={{
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleRunCalculations}
        style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}
      >
        Run
      </button>

      {/* Table of old vs. new hourly basals */}
      {tempBasal.length > 0 && adjustedBasal.length > 0 && (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <table className="table table-striped table-bordered" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Hour</th>
                <th>Previous Basal (U/hr)</th>
                <th>Adjusted Basal (U/hr)</th>
              </tr>
            </thead>
            <tbody>
              {tempBasal.map((prevVal, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center' }}>
                    {i.toString().padStart(2, '0') + ':00'}
                  </td>
                  <td style={{ textAlign: 'center' }}>{prevVal}</td>
                  <td style={{ textAlign: 'center' }}>{adjustedBasal[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
