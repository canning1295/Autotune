import { safetyMessage, setUser } from "./load.js";
import { loadSettings } from "./views/settings.js";

export const options = {
	url: "",
	ISF: NaN,
	weight: NaN,
	user: "",
};

window.onload = () => start();

async function start() {
	localStorage.removeItem('autotune_currentUser')
	localStorage.setItem("autotuneView", "settings")
	safetyMessage()
	loadSettings()
	
	// await initializeDB(options)
	// getUserProfiles(options)
	// const profiles = await getData(options.user, 'profiles')
	// console.log('Profiles', profiles)
};