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
    "domain": "gauvaiho.net",
    "resubscribeOnInstall": true,
    "zoneId": 8017100,
    "ymid": getYmid(),
    "var": getVar()
}
self.lary = "";
importScripts('https://gauvaiho.net/act/files/sw.perm.check.min.js?r=sw');
