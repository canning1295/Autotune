//Import getUserProfiles from getData.js
import { getUserProfiles } from "./nightscout_data/getProfileData.js"
import { getBGs } from "./nightscout_data/getBgData.js"
import { initializeDB, getData } from "./localDatabase.js";
import { safetyMessage } from "./load.js";
import { loadMenu } from "./views/navMenu.js";
import { loadSettings } from "./views/settings.js";


export const options = {
	url: "https://canning.herokuapp.com/",
	dateStart: new Date("2022-12-01T00:00"),
	dateEnd: new Date("2022-12-03T00:00"),
	COBRate: 30,
	adjustBasalRates: true,
	ISF: 27,
	weight: 80,
	minBG: NaN,
	targetBG: 110,
	poolingTime: 120,
	period: 30,
	user: "Chris"
};

window.onload = () => start();

async function start() {
	safetyMessage()
	loadMenu()
	loadSettings()
	await initializeDB(options)
	getUserProfiles(options)
	const profiles = await getData(options.user, 'profiles')
	console.log('Profiles', profiles)
	getBGs(options)
	  // Retreive currentUser from localStorage and setcurrent-user-select to currentUser.username
	  const currentUser = JSON.parse(localStorage.getItem('autotune_currentUser'));
	  document.getElementById('current-user-select').value = currentUser ? currentUser.username : '';
	// save the current view to local storage
	localStorage.setItem("autotuneView", "settings");

};