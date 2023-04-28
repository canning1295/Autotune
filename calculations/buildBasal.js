import { getData } from "../localDatabase"; 
import { getUserProfiles } from "../nightscout_data/getProfiles.js";

export async function buildBasalRates(averages) {
    let profiles = await getUserProfiles()
    console.log('Profiles', profiles)
}
