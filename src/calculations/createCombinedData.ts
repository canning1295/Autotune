// File: src/calculations/createCombinedData.ts

import { getBGs } from '../api/nightscout/getBgData';
import { getTempBasalData } from '../api/nightscout/getTempBasalData';
import { getAllBoluses } from '../api/nightscout/getBolusData';
import { getData, saveData } from '../utils/localDatabase';
import { getInsulinDataByTimeWindow, getAverageInsulinForTime, getValueForTime } from './boluses';
import { CombinedData, UserOptions } from '../types/AutotuneTypes';
import { showLoadingAnimation, hideLoadingAnimation } from '../utils/loadingAnimation';

/**
 * combineData():
 * Generates a 5-min data array for a single date, storing the results in 'Combined_Data'.
 * We replicate old logic:
 *   1) get BG data for each 5-min slot
 *   2) figure out how much basal was delivered in each slot (temp or default)
 *   3) incorporate bolus insulin
 *   4) store resulting array in IDB
 *   5) also store daily totals for bolus, basal, and combined
 */
export async function combineData(
  selectedDate: Date,
  userOptions: UserOptions,
): Promise<void> {
  const dateKey = selectedDate.toISOString().split('T')[0];

  showLoadingAnimation();

  // Check if we already have Combined_Data for this date
  const existing = await getData<CombinedData[]>('Combined_Data', dateKey);
  if (existing && existing.length === 288) {
    // Already combined, skip
    return;
  }

  // Otherwise, build from scratch
  const bgData = await getBGs(selectedDate, userOptions);
  const deliveredBasals = await getTempBasalData(selectedDate, userOptions);
  const bolusData = await getAllBoluses(selectedDate, userOptions);

  // Bolus "time window" distribution (old: getInsulinDataByTimeWindow)
  const bolusWindows = getInsulinDataByTimeWindow(
    bolusData,
    selectedDate,
    userOptions.bolusTimeWindow,
  );

  const combinedData: CombinedData[] = [];

  for (let i = 0; i < 288; i++) {
    // Each 5-minute block
    const dateBlock = new Date(selectedDate);
    dateBlock.setHours(0, 0, 0, 0);
    dateBlock.setMinutes(dateBlock.getMinutes() + i * 5);

    // BG for this block, if any
    let blockBG: number | null = null;
    const match = bgData.find(
      (b) => {
        let bgTime: Date;
        if (typeof b.time === 'string') {
          bgTime = new Date(b.time);
        } else if (b.time instanceof Date) {
          bgTime = b.time;
        } else {
          console.warn("Invalid time object found:", b.time);
          return false;
        }

        if (bgTime instanceof Date && !isNaN(bgTime.getTime())) {
          return bgTime.getTime() === dateBlock.getTime();
        } else {
          console.warn("Invalid date object found:", b.time);
          return false;
        }
      }
    );
    if (match) {
      blockBG = match.bg;
    }

    // Overlap logic for basal
    let insulinDelivered = 0; // in units (absolute), over this 5-min period
    let totalOverlapDuration = 0; // how many minutes were covered by a temp basal

    deliveredBasals.forEach((tmp) => {
      let tempStart = tmp.created_at;
      
      if (typeof tempStart === 'string') {
        tempStart = new Date(tempStart);
      }

      if (!(tempStart instanceof Date) || isNaN(tempStart.getTime())) {
        console.warn("Invalid tempStart object found:", tempStart);
        return;
      }

      const tempEnd = new Date(
        tempStart.getTime() + tmp.duration * 60_000,
      );
      const blockEnd = new Date(dateBlock.getTime() + 5 * 60_000);

      // If there's overlap
      if (tempStart <= blockEnd && tempEnd >= dateBlock) {
        const overlapStart = tempStart < dateBlock ? dateBlock : tempStart;
        const overlapEnd = tempEnd > blockEnd ? blockEnd : tempEnd;
        const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60_000;
        if (overlapMinutes > 0) {
          totalOverlapDuration += overlapMinutes;
          const deliveredRate = tmp.rate; // U/hour
          const deliveredInsulin = (deliveredRate / 60) * overlapMinutes;
          insulinDelivered += deliveredInsulin;
        }
      }
    });

    // For any leftover minutes in the 5-min block, we use the user’s profileBasal
    // But we need to know which profile basal is active for this time-of-day:
    // We'll rely on userOptions.profiles or we do the same logic as old code:
    // For simplicity, let's do it similarly to old code’s:
    const profile = userOptions.profiles ? userOptions.profiles.find(
      (p) => p.startDate <= dateBlock && p.endDate > dateBlock,
    ) : undefined;
    let profileBasal = 0;
    let carbRatio = 0;
    let highTarget = 0;
    let isf = 0;
    let lowTarget = 0;
    if (profile) {
      const timeAsSec =
        dateBlock.getHours() * 3600 +
        dateBlock.getMinutes() * 60 +
        dateBlock.getSeconds();
      profileBasal = getValueForTime(profile.basal.map(item => ({ timeAsSeconds: item.time, value: item.value })), timeAsSec);
      carbRatio = getValueForTime(profile.carbRatio.map(item => ({ timeAsSeconds: item.time, value: item.value })), timeAsSec);
      highTarget = getValueForTime(profile.highTarget.map(item => ({ timeAsSeconds: item.time, value: item.value })), timeAsSec);
      isf = getValueForTime(profile.isf.map(item => ({ timeAsSeconds: item.time, value: item.value })), timeAsSec);
      lowTarget = getValueForTime(profile.lowTarget.map(item => ({ timeAsSeconds: item.time, value: item.value })), timeAsSec);
    }

    // If totalOverlapDuration < 5, the remainder is the default profileBasal
    const leftover = 5 - totalOverlapDuration; // in minutes
    if (leftover > 0) {
      const deliveredInsulin = (profileBasal / 60) * leftover;
      insulinDelivered += deliveredInsulin;
    }

    // actualBasal in U/hour => scale up the 5-min absolute insulin
    const actualBasal = (insulinDelivered / 5) * 60;

    // Bolus insulin for this block:
    const bolusInsulin = getAverageInsulinForTime(bolusWindows, dateBlock);

    combinedData.push({
      time: new Date(dateBlock),
      bg: blockBG ?? 0,
      profileBasal,
      actualBasal,
      bolusInsulin,
      carbRatio,
      highTarget,
      isf,
      lowTarget,
    });
  }

  // Save "Combined_Data" to DB
  await saveData('Combined_Data', dateKey, combinedData, new Date().toISOString());

  // Also store daily sums
  const sumBolusInsulin = combinedData.reduce((acc, c) => acc + c.bolusInsulin, 0);
  const sumBasalInsulin = combinedData.reduce((acc, c) => acc + c.actualBasal / 12, 0);
  const dailyInsulinTotal = sumBolusInsulin + sumBasalInsulin;

  await saveData('Daily_Bolus_Total', dateKey, sumBolusInsulin, new Date().toISOString());
  await saveData('Daily_Basal_Total', dateKey, sumBasalInsulin, new Date().toISOString());
  await saveData('Daily_Insulin_Total', dateKey, dailyInsulinTotal, new Date().toISOString());

  hideLoadingAnimation();
}