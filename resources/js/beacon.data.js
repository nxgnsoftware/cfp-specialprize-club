
$(document).ready(async function () {
    // VALIDATE IP ADDRESS OF THE VISITOR
    if (window.XMLHttpRequest) xmlhttp = new XMLHttpRequest();
    else xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    xmlhttp.open("GET", " https://wimi.securus.io ", false);
    xmlhttp.send();

    hostipInfo = xmlhttp.responseText;

    // SET OR UPDATE A COOKIE 
    // Check if cookie named "v" exists
    if (document.cookie.includes("v=")) {
        // Update the expiration of the cookie to 6 months from now
        var expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 6);
        var cookieValue = document.cookie.replace(/(?:(?:^|.*;\s*)v\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        document.cookie = "v=" + cookieValue + "; expires=" + expirationDate.toUTCString() + "; path=/";
    } else {
        // Create a new cookie named "v" with a value of a unique guide and expiration of 6 months from now
        var uniqueId = generateUniqueId();
        console.log("v : " + uniqueId);
        var expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 6);
        document.cookie = "v=" + uniqueId + "; expires=" + expirationDate.toUTCString() + "; path=/";
    }
    // Function to generate a unique ID
    function generateUniqueId() {
        // Implement your own logic to generate a unique ID here
        // For example, you can use a combination of timestamp and random number
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // REQUEST GEOLOCATION
    // if (navigator.geolocation) {
    //     navigator.geolocation.getCurrentPosition(function (position) {
    //         console.log("Latitude: " + position.coords.latitude);
    //         console.log("Longitude: " + position.coords.longitude);
    //         console.log("Speed: " + position.coords.speed);
    //         console.log("Altitude: " + position.coords.altitude);
    //         console.log("Accuracy: " + position.coords.accuracy);
    //     });
    // } else {
    //     console.log("Geolocation is not supported by this browser.");
    // }

    // CREATE PAYLOAD FOR DELIVERY TO BEACON.JS
    const data = JSON.stringify({
        'visitor_ip': (hostipInfo),
        'timestamp': (new Date(Date.now()).toISOString()),
        'epoch_timestamp': (Date.now()),
        'referrer': (document.referrer),
        'url': ($(location).attr("origin")),
        'uri': ($(location).attr("href")),
        'path': ($(location).attr("pathname")),
        'port': ($(location).attr("port")),
        'query': ($(location).attr("search")),
        'user_agent': (navigator.userAgent),
        'hardware_concurrency': (navigator.hardwareConcurrency),
        'cookies_enabled': (navigator.cookieEnabled),
        'do_not_track': (navigator.doNotTrack),
        'memory': (navigator.deviceMemory),
        'cookie': (document.cookie.replace(/(?:(?:^|.*;\s*)v\s*\=\s*([^;]*).*$)|^.*$/, "$1")),
        'protocol': (window.location.protocol),
        'port': (window.location.port),
        'hash': (window.location.hash),
        'connection_type': (navigator.connection.effectiveType),
        'language': (navigator.language),
        'http_version': (performance.getEntries()[0].nextHopProtocol)
    })
//    console.log(data)

    return fetch('https://api.securus.io/beacon', {
        //return fetch('https://falling-forest-5377.tines.com/webhook/4a2efac7572323cf942eb58bd75dca58/860f467b4b9f822961042bd5708846aa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: (data)
    })
        .then(response => {
            if (!response.ok) return false;
            response = response.json()

        });

});