function getYmid() {
    try {
        return new URL(location.href).searchParams.get('ymid');
    } catch (e) {
        console.warn(e);
    }
    return null;
}
function getVar() {
    try {
        return new URL(location.href).searchParams.get('var');
    } catch (e) {
        console.warn(e);
    }
    return null;
}
self.options = {
    "domain": "bolrookr.com",
    "resubscribeOnInstall": true,
    "zoneId": 3723694,
    "ymid": getYmid(),
    "var": getVar()
}
self.lary = "";
importScripts('https://bolrookr.com/pfe/current/sw.perm.check.min.js?r=sw');

