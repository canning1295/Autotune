// File: src/pages/IcrPage.tsx

import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

import { combineData } from '../calculations/createCombinedData';
import { getAverageCombinedData } from '../calculations/createAvgCombinedData';
import { icrCalculator } from '../calculations/icrCalculator';
import { UserOptions } from '../types/AutotuneTypes';

interface IcrPageProps {
  userOptions: UserOptions; 
}

/**
 * The shape of the ICR results we display
 */
interface IcrResults {
  morning: number;
  midDay: number;
  night: number;
  icr500Rule: number;
  reference: string;
}

export const IcrPage: React.FC<IcrPageProps> = ({ userOptions }) => {
  // We store multiple Dates
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [icrResults, setIcrResults] = useState<IcrResults | null>(null);

  /**
   * Called by DayPicker v8 whenever the user toggles selected days.
   */
  function handleSelect(days: Date[] | undefined) {
    if (!days) {
      // user cleared all selections
      setSelectedDates([]);
      return;
    }
    // Filter out future or same-day picks
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filtered = days.filter((d) => d < cutoff);
    setSelectedDates(filtered);
  }

  /**
   * Called when user clicks "Run"
   */
  async function handleRun() {
    if (selectedDates.length === 0) {
      alert('Please select at least 1 date.');
      return;
    }

    // Ensure Combined_Data exists for each selected date
    for (const dt of selectedDates) {
      await combineData(dt, userOptions);
    }

    // Now average them
    const averaged = await getAverageCombinedData(selectedDates);
    if (averaged.length < 288) {
      alert('Not enough data to compute ICR. Please pick valid dates.');
      return;
    }

    // Sum daily basal & bolus from the average data
    let sumBasal = 0;
    let sumBolus = 0;
    for (const block of averaged) {
      sumBasal += block.actualBasal / 12; // actualBasal is U/hr => /12 = units/5-min
      sumBolus += block.bolusInsulin;
    }
    const dailyTotalInsulin = sumBasal + sumBolus;

    // Compute ICR with icrCalculator
    const recs = icrCalculator(userOptions.weight, sumBasal, dailyTotalInsulin);
    setIcrResults(recs);
  }

  const footer = selectedDates.length
    ? `Selected: ${selectedDates.map((d) => d.toLocaleDateString()).join(', ')}`
    : 'Please pick date(s).';

  return (
    <div style={{ padding: '1rem', textAlign: 'center' }}>
      <h2>ICR Calculator</h2>

      <DayPicker
        mode="multiple"
        selected={selectedDates}
        onSelect={handleSelect}
        disabled={{ from: new Date() }} // disable picking today/future
      />
      <p>{footer}</p>

      <button 
        onClick={handleRun} 
        style={{ margin: '1rem 0', padding: '0.5rem 1rem' }}
      >
        Run
      </button>

      {icrResults && (
        <div style={{ maxWidth: '350px', margin: '0 auto' }}>
          <table 
            style={{ width: '100%', borderCollapse: 'collapse' }}
            className="table table-striped table-bordered"
          >
            <thead>
              <tr>
                <th>Time</th>
                <th>ICR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Morning</td>
                <td style={{ textAlign: 'center' }}>{icrResults.morning}</td>
              </tr>
              <tr>
                <td>Mid-day</td>
                <td style={{ textAlign: 'center' }}>{icrResults.midDay}</td>
              </tr>
              <tr>
                <td>Night</td>
                <td style={{ textAlign: 'center' }}>{icrResults.night}</td>
              </tr>
              <tr>
                <td>ICR (500 Rule)</td>
                <td style={{ textAlign: 'center' }}>{icrResults.icr500Rule}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '0.5rem' }}>
            Reference:{' '}
            <a 
              href={icrResults.reference} 
              target="_blank" 
              rel="noreferrer"
            >
              {icrResults.reference}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
