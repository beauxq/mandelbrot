import App from './App';
import { test } from './mandelbrot';

let app: App | undefined;

window.onload = () => {
    test();
    const width = window.innerWidth;
    const height = window.innerHeight;
    app = new App(width, height);
}

// resize the canvas to fill browser window dynamically
window.addEventListener('resize', resizeCanvas, false);

function resizeCanvas() {
    console.log(`browserZoomLevel: ${window.devicePixelRatio}`);
    // ^ always 3 on my phone (including with l2p bug)

    const width = window.innerWidth;
    // I've looked at a lot of google search results and still can't find a good solution to this problem
    // (how to get the height without the address bar on mobile)
    // window.screen.availHeight - 20 (20 for android status bar) works on android but messes it up on desktop
    const height = Math.max(window.innerHeight, document.documentElement.clientHeight /*, window.screen.availHeight - 20*/);

    app?.resize(width, height);
}

// I had an issue where
// switching from landscape to portrait
// would have a different window size from
// loading the page in portrait

// I found someone else with a similar issue and their solution worked.
// I don't really understand it all.
// I suspect it has something to do with the canvas size in landscape
// causing overflow width in portrait.
// (But then why wouldn't the canvas size in portrait cause overflow height in landscape?)
// (And it doesn't look like the person asking the question in stackoverflow is using a canvas. Maybe it's not the same issue. But the solution works.)

// https://stackoverflow.com/questions/53487190/why-is-chrome-shrinking-the-view-in-responsive-mode
window.onorientationchange = function() { 
    const htmlElement =  document.getElementsByTagName("html")[0];
    const bodyElement = document.getElementsByTagName("body")[0];

    if(window.innerWidth < window.innerHeight) {
        // landscape to portrait
        htmlElement.style.overflowX = "hidden";
        bodyElement.style.overflowX = "hidden";
    }
    else {
        // portrait to landscape
        // I took these 2 lines from the stackoverflow solution and put them in the html file
        // htmlElement.css("overflow","auto");
        // bodyElement.css("overflow", "auto");
        // below 2 lines makes the UI not shrink in portrait mode 
        htmlElement.style.overflowX = "auto";
        bodyElement.style.overflowX = "auto";
    }
}
