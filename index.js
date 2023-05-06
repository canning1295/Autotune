import { safetyMessage, setCurrentUser } from "./load.js";
import { loadSettings } from "./views/settings.js";

export const options = {
	url: "",
	weight: NaN,
	user: "",
	profiles: [],
	targetBG: NaN,
	poolingTime: 120,
	lowTargetBG: 80,
	targetBG: 100,
	bolusTimeWindow: 1,
	// bolusTimeWindow adds up how much bolus insulin was delivered every X hours (accept 1,2,3,4,6,8)
};

window.onload = () => start();

async function start() {
	localStorage.removeItem('autotune_currentUser')
	localStorage.setItem("autotuneView", "settings")
	safetyMessage()
	loadSettings()
};