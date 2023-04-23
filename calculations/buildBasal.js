import { getData } from "../localDatabase"; 

export async function buildBasalRates(options) {
    getData(options.user, 'profiles').then((profiles) => {
        console.log('Profiles', profiles)
        
    })
}
