// File: src/api/nightscout/getProfileData.ts
import { getData, getTimestamp, saveData } from '../../utils/localDatabase';
import { UserOptions } from '../../types/AutotuneTypes';

export interface ProfileRecord {
  startDate: Date;
  endDate: Date;
  basal: { timeAsSeconds: number; value: number }[];
  carbRatio: { timeAsSeconds: number; value: number }[];
  isf: { timeAsSeconds: number; value: number }[];
  lowTarget: { timeAsSeconds: number; value: number }[];
  highTarget: { timeAsSeconds: number; value: number }[];
}

/**
 * Retrieve user profiles from DB or from Nightscout if DB is outdated
 */
export async function getUserProfiles(
  userOptions: UserOptions,
): Promise<ProfileRecord[]> {
  const storedProfiles = await getData<ProfileRecord[]>('Profiles', userOptions.user);
  const storedTimestamp = await getTimestamp('Profiles', userOptions.user);

  // If none stored or older than 1 day, fetch fresh
  const oneDayAgoKey = new Date();
  oneDayAgoKey.setDate(oneDayAgoKey.getDate() - 1);
  const oneDayAgoString = oneDayAgoKey.toISOString().split('T')[0];

  if (!storedProfiles || !storedTimestamp || storedTimestamp < oneDayAgoString) {
    // fetch from Nightscout
    const url = `${userOptions.url}/api/v1/profile.json?count=10000000`;
    const response = await fetch(url);
    const profileData = await response.json();
    const finalProfiles = setProfiles(profileData);

    // Save them
    await saveData('Profiles', userOptions.user, finalProfiles, oneDayAgoString);
    return finalProfiles;
  }

  return storedProfiles;
}

/**
 * Convert the raw array from Nightscout into an array of ProfileRecords.
 */
function setProfiles(rawProfileData: any[]): ProfileRecord[] {
  const profiles: ProfileRecord[] = [];

  // Make midnight tonight as a fallback end date
  const midnightTonight = new Date();
  midnightTonight.setHours(0, 0, 0, 0);
  midnightTonight.setDate(midnightTonight.getDate() + 1);

  for (let i = 0; i < rawProfileData.length; i++) {
    const obj = rawProfileData[i];
    const startDate = new Date(obj.startDate);
    const nextObj = rawProfileData[i + 1];
    const endDate = nextObj ? new Date(nextObj.startDate) : midnightTonight;

    // shape the "store.Default" data into the arrays for basal, etc.
    const store = obj.store?.Default || {};
    const basal = store.basal || [];
    const carbRatio = store.carbratio || [];
    const isf = store.sens || [];
    const lowTarget = store.target_low || [];
    const highTarget = store.target_high || [];

    profiles.push({
      startDate,
      endDate,
      basal,
      carbRatio,
      isf,
      lowTarget,
      highTarget,
    });
  }
  return profiles;
}