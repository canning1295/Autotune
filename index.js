import { safetyMessage, setCurrentUser } from "./load.js";
import { loadNavMenu } from "./views/navMenu.js";
import { loadSettings } from "./views/settings.js";
import { initializeDB } from "./utils/localDatabase.js";
import { getUserProfiles } from "./nightscout_data/getProfileData.js";

export const options = {
	url: "",
	weight: NaN,
	user: "",
	profiles: [],
	targetBG: NaN,
	poolingTime: 120,
	lowTargetBG: NaN,
	targetBG: NaN,
	bolusTimeWindow: 1,
	adjustmentFactor: NaN,
	diaAdjustment: NaN,
};

window.onload = () => {
	start();

	// check if service workers are supported
	if ('serviceWorker' in navigator) {
		// register the service worker
		navigator.serviceWorker.register('/sw.js')
			.then((registration) => {
				// successful registration
				// console.log('Service Worker Registration Successful: ', registration);
			})
			.catch((error) => {
				// failed registration
				// console.log('Service Worker Registration Failed: ', error);
			});
	}
};

async function start() {
	localStorage.setItem("autotuneView", "settings")
	loadSettings()
	let userArray = JSON.parse(localStorage.getItem('autotune_currentUser'))
	if (!userArray) safetyMessage()
	if(userArray) {
		document.getElementById('current-user-select').innerText = userArray.username
		setCurrentUser(userArray)
		await initializeDB()
		loadNavMenu()
		options.profiles = (await getUserProfiles()).reverse();
	}
};
