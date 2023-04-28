import { safetyMessage, setCurrentUser } from "./load.js";
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
};

// Summary for index.js:

// The file imports safetyMessage and setCurrentUser functions from "./load.js" module.
// The file imports loadSettings function from "./views/settings.js" module.
// It exports an options object containing:
// url: an empty string
// ISF: NaN
// weight: NaN
// user: an empty string
// It defines an async function start which:
// Removes "autotune_currentUser" from localStorage.
// Sets "autotuneView" in localStorage to "settings".
// Calls safetyMessage().
// Calls loadSettings().
// When the window loads, the start function is called.