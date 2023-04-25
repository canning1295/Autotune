//Import getUserProfiles from getData.js
import { initializeDB, getData } from "./localDatabase.js";
import { safetyMessage } from "./load.js";
import { loadMenu } from "./views/navMenu.js";
import { loadSettings } from "./views/settings.js";
import { setUser } from "./load.js";


export const options = {
	url: "https://canning.herokuapp.com/",
	ISF: 27,
	weight: 80,
	user: "Chris"
};

window.onload = () => start();

async function start() {
	setUser()
	await initializeDB(options)
	safetyMessage()
	loadMenu()
	loadSettings()

	// getUserProfiles(options)
	// const profiles = await getData(options.user, 'profiles')
	// console.log('Profiles', profiles)


	// save the current view to local storage
	localStorage.setItem("autotuneView", "settings");

};