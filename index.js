//Import getUserProfiles from getData.js
import {getUserProfiles, getBGs} from "./getNsData.js"
import * as db from "./localDatabase.js";


export const options = {
	url: "https://canning.herokuapp.com/",
	dateStart: new Date("2022-12-01T00:00"),
	dateEnd: new Date("2022-12-02T00:00"),
	COBRate: 30,
	adjustBasalRates: true,
	ISF: 27,
	weight: 80,
	minBG: NaN,
	targetBG: 110,
	poolingTime: 120,
	period: 30,
	user: "Chris"
}
// (async () => {
	db.initializeDB(options)
	await getUserProfiles(options)
	console.log(await db.getData(options.user, 'profiles'))
// })()
// let userProfiles = await db.getData(options.user, 'profiles')
// console.log(userProfiles)

// getBGs(options)

