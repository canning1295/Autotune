// File: src/pages/IsfPage.tsx
import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

import { combineData } from '../calculations/createCombinedData';
import { getAverageCombinedData } from '../calculations/createAvgCombinedData';
import { isfCalculator } from '../calculations/isfCalculator';
import { CombinedData, UserOptions } from '../types/AutotuneTypes';

interface IsfPageProps {
  userOptions: UserOptions;
}

export const IsfPage: React.FC<IsfPageProps> = ({ userOptions }) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [results, setResults] = useState<{
    conservativeISF: number;
    lessAggressiveISF: number;
    isf1800Rule: number;
    reference: string;
  } | null>(null);

  // Handler for multi-date selection
  function onDayClick(day: Date) {
    const now = new Date();
    // No future or same-day
    if (day >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return;
    }

    const exists = selectedDates.some(d => d.toDateString() === day.toDateString());
    let newDates: Date[];
    if (exists) {
      newDates = selectedDates.filter(d => d.toDateString() !== day.toDateString());
    } else {
      newDates = [...selectedDates, day];
    }
    setSelectedDates(newDates);
  }

  async function handleRun() {
    if (selectedDates.length === 0) {
      alert('Please select at least 1 date.');
      return;
    }

    // Ensure Combined_Data for each date
    for (const dt of selectedDates) {
      await combineData(dt, userOptions);
    }

    // Get average
    const averaged = await getAverageCombinedData(selectedDates);
    if (averaged.length < 288) {
      alert('Not enough data for the selected dates.');
      return;
    }

    // Sum basal & bolus
    let sumBasal = 0;
    let sumBolus = 0;
    for (const block of averaged) {
      sumBasal += block.actualBasal / 12;
      sumBolus += block.bolusInsulin;
    }
    const dailyTotalInsulin = sumBasal + sumBolus;

    // Calculate
    const recs = isfCalculator(dailyTotalInsulin, sumBasal);
    setResults(recs);
  }

  const footer = selectedDates.length
    ? `Selected: ${selectedDates.map(d=> d.toLocaleDateString()).join(', ')}`
    : 'Please pick date(s).';

  return (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <h2>ISF Calculator</h2>
      <DayPicker
        mode="multiple"
        selected={selectedDates}
        onDayClick={onDayClick}
      />
      <p>{footer}</p>

      <button
        onClick={handleRun}
        style={{ margin: '1rem 0', padding: '0.5rem 1rem' }}
      >
        Run
      </button>

      {results && (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse' }}
            className="table table-striped table-bordered"
          >
            <thead>
              <tr>
                <th>Recommendation</th>
                <th>ISF</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Conservative ISF</td>
                <td style={{ textAlign: 'center' }}>{results.conservativeISF}</td>
              </tr>
              <tr>
                <td>Less aggressive</td>
                <td style={{ textAlign: 'center' }}>{results.lessAggressiveISF}</td>
              </tr>
              <tr>
                <td>ISF 1800 Rule</td>
                <td style={{ textAlign: 'center' }}>{results.isf1800Rule}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '0.5rem' }}>
            Reference:{' '}
            <a href={results.reference} target="_blank" rel="noreferrer">
              {results.reference}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
