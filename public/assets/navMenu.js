import { loadSettings } from "./settings.js"
import { loadBasal } from "./basal.js"
import { loadICR } from "./icr-calculator.js"
import { loadISF } from "./isf-calculator.js"

export function loadNavMenu() {
    
    function settings() {
        let autotuneView = localStorage.getItem("autotuneView");
        if (localStorage.getItem("autotune_currentUser").length > 0) {
            if (autotuneView !== "settings" && autotuneView !== "settings") {
                // console.log('Loading settings')
                loadSettings();
                localStorage.removeItem("autotuneView")
                localStorage.setItem("autotuneView", "settings");
            }
        }
    }
    function basal() {

        let autotuneView = localStorage.getItem("autotuneView");
        if (localStorage.getItem("autotune_currentUser").length > 0 && autotuneView !== "basal") {
            if (autotuneView !== "basal") {
                console.log('Loading basal')
                loadBasal();
                localStorage.removeItem("autotuneView")
                localStorage.setItem("autotuneView", "basal");
            }
        }
    }
    function icr() {
        let autotuneView = localStorage.getItem("autotuneView");
        if (localStorage.getItem("autotune_currentUser").length > 0 && autotuneView !== "icr") {
            if (autotuneView !== "icr") {
                loadICR();
                localStorage.removeItem("autotuneView")
                localStorage.setItem("autotuneView", "icr");
            }
        }
    }
    function isf() {
        let autotuneView = localStorage.getItem("autotuneView");
        if (localStorage.getItem("autotune_currentUser").length > 0 && autotuneView !== "isf") {
            if (autotuneView !== "isf") {
                loadISF();
                localStorage.removeItem("autotuneView")
                localStorage.setItem("autotuneView", "isf");
            }
        }
    }

    var htmlCode = /*html*/
        `
            <button type="button" id="basal-button" class="menu-button">💉</button>

            <button type="button" id="isf-button" class="menu-button">💧</button>

            <button type="button" id="icr-button" class="menu-button">🍽️</button>

            <button type="button" id="settings" class="menu-button">⚙️</button>
        `
    document.getElementById('footer').innerHTML = htmlCode;
    document.getElementById('settings').addEventListener('click', settings);
    document.getElementById('basal-button').addEventListener('click', basal);
    document.getElementById('icr-button').addEventListener('click', icr);
    document.getElementById('isf-button').addEventListener('click', isf);
}


