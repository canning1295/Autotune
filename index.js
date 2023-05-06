import { safetyMessage, setCurrentUser } from "./load.js";
import { loadSettings } from "./views/settings.js";

let adjustmentSetting = 2 // TODO: Make this a setting
let adjustmentFactor
if (adjustmentSetting === 0) adjustmentFactor = .3
if (adjustmentSetting === 1) adjustmentFactor = .4
if (adjustmentSetting === 2) adjustmentFactor = .5
if (adjustmentSetting === 3) adjustmentFactor = .6
if (adjustmentSetting === 4) adjustmentFactor = .7

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
	adjustmentFactor: adjustmentFactor,
	// bolusTimeWindow adds up how much bolus insulin was delivered every X hours (accept 1,2,3,4,6,8)
};

window.onload = () => start();

async function start() {
	localStorage.removeItem('autotune_currentUser')
	localStorage.setItem("autotuneView", "settings")
	safetyMessage()
	loadSettings()
};