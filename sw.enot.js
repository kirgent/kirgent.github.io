/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/CommonLibraries/functions/broadcastInfoNanoTag.ts":
/*!***************************************************************!*\
  !*** ./src/CommonLibraries/functions/broadcastInfoNanoTag.ts ***!
  \***************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.broadcastNanoTagInfo = void 0;
// @ignore-obfuscate
function broadcastNanoTagInfo(format, version, zoneId, scriptURL) {
    let domain = scriptURL.split('/')[2];
    const formatProperty = window.document.documentElement.dataset.fp || 'zfgformats'; // !NB do not move it from here! it should be the same as defaultFormatsProperty
    if (window[formatProperty]) {
        window[formatProperty].forEach((format) => {
            if (format.zoneId === zoneId && format.sourceZoneId) {
                zoneId = format.sourceZoneId;
                domain = format.domain;
            }
        });
    }
    else {
        window[formatProperty] = [];
    }
    const info = {
        format,
        version,
        zoneId,
        domain,
    };
    window[formatProperty].push(info);
}
exports.broadcastNanoTagInfo = broadcastNanoTagInfo;


/***/ }),

/***/ "./src/CommonLibraries/functions/isMySubscription.function.ts":
/*!********************************************************************!*\
  !*** ./src/CommonLibraries/functions/isMySubscription.function.ts ***!
  \********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isMyCurrentSubscription = exports.isMySubscription = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const subscrDB_helper_1 = __webpack_require__(/*! ../helpers/subscrDB.helper */ "./src/CommonLibraries/helpers/subscrDB.helper.ts");
async function isMySubscription(sub) {
    var _a;
    if (!sub)
        return false;
    const reg = await (0, trackDb_helper_1.trackDb)().get('registration-context');
    let subJson;
    try {
        subJson = sub.toJSON();
    }
    catch (e) { }
    if (reg && reg.auth === ((_a = subJson === null || subJson === void 0 ? void 0 : subJson.keys) === null || _a === void 0 ? void 0 : _a.auth)) {
        return true;
    }
    try {
        const result = await (0, subscrDB_helper_1.subscrDb)().get(sub);
        return Boolean(result);
    }
    catch (err) {
        console.warn('check sub error:', err);
        return false;
    }
}
exports.isMySubscription = isMySubscription;
async function isMyCurrentSubscription(swScope = '') {
    const sw = navigator.serviceWorker;
    if (sw) {
        const reg = await sw.getRegistration(swScope);
        if (reg) {
            try {
                const sub = await reg.pushManager.getSubscription();
                return sub ? await isMySubscription(sub) : false;
            }
            catch (e) {
                return false;
            }
        }
    }
    return false;
}
exports.isMyCurrentSubscription = isMyCurrentSubscription;


/***/ }),

/***/ "./src/CommonLibraries/functions/patchCloseAndShowNotification.ts":
/*!************************************************************************!*\
  !*** ./src/CommonLibraries/functions/patchCloseAndShowNotification.ts ***!
  \************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.patchNotificationCloseAndShowNotification = void 0;
const statsDb_helper_1 = __webpack_require__(/*! ../helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
let originalClose = null;
let origShowNotification = null;
if (typeof ServiceWorkerRegistration === 'undefined') {
    const ServiceWorkerRegistration = () => undefined;
    // @ts-ignore
    self.ServiceWorkerRegistration = ServiceWorkerRegistration;
}
try {
    originalClose = Notification.prototype.close;
    origShowNotification = ServiceWorkerRegistration.prototype.showNotification;
}
catch (e) {
    console.error();
}
function patchNotificationCloseOn() {
    try {
        if (Notification.prototype.close !== originalClose ||
            originalClose === null) {
            return;
        }
        Notification.prototype.close = function close() {
            try {
                (0, statsDb_helper_1.statsDb)().set('closeProto');
            }
            catch (e) { }
            // @ts-ignore
            this.closed = true;
            return originalClose && originalClose.apply(this);
        };
    }
    catch (e) {
        console.error(e);
    }
}
function patchShowNotificationOn() {
    try {
        if (ServiceWorkerRegistration.prototype.showNotification !==
            origShowNotification ||
            origShowNotification === null) {
            return;
        }
        ServiceWorkerRegistration.prototype.showNotification = async function showNotification(...args) {
            const result = origShowNotification && origShowNotification.apply(this, args);
            try {
                await (0, statsDb_helper_1.statsDb)().set('showProto', self.swContext);
            }
            catch (e) { }
            return result;
        };
    }
    catch (e) {
        console.error(e);
    }
}
function patchNotificationCloseOff() {
    // @ts-ignore
    Notification.prototype.close = originalClose;
}
function patchShowNotificationOff() {
    // @ts-ignore
    ServiceWorkerRegistration.prototype.showNotification = origShowNotification;
}
exports.patchNotificationCloseAndShowNotification = {
    switchOn() {
        patchNotificationCloseOn();
        patchShowNotificationOn();
    },
    switchOff() {
        patchNotificationCloseOff();
        patchShowNotificationOff();
    },
};


/***/ }),

/***/ "./src/CommonLibraries/functions/showNotification.function.ts":
/*!********************************************************************!*\
  !*** ./src/CommonLibraries/functions/showNotification.function.ts ***!
  \********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.showNotification = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const service_worker_events_1 = __webpack_require__(/*! ../../types/service-worker-events */ "./src/types/service-worker-events.ts");
const error_helper_1 = __webpack_require__(/*! ../helpers/error.helper */ "./src/CommonLibraries/helpers/error.helper.ts");
const metricStorage_1 = __webpack_require__(/*! ../helpers/metricStorage */ "./src/CommonLibraries/helpers/metricStorage.ts");
const http_1 = __webpack_require__(/*! ../network/http */ "./src/CommonLibraries/network/http/index.ts");
const getDurationForPromise_1 = __webpack_require__(/*! ../helpers/getDurationForPromise */ "./src/CommonLibraries/helpers/getDurationForPromise.ts");
const consts_1 = __webpack_require__(/*! ../../consts */ "./src/consts.ts");
const sendEvent_1 = __webpack_require__(/*! ../network/http/sendEvent */ "./src/CommonLibraries/network/http/sendEvent.ts");
const sendError_helper_1 = __webpack_require__(/*! ../network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
function checkPayloadFieldsForEmptiness(payload) {
    const isTitleEmpty = !payload ||
        !payload.title ||
        payload.title.trim().length === 0;
    const isBodyEmpty = !payload.options ||
        typeof payload.options !== 'object' ||
        !payload.options.body ||
        payload.options.body.trim().length === 0;
    return isTitleEmpty && isBodyEmpty;
}
async function showUnresolved(unresolvedMessageOptions) {
    const { metric, swContext, userKey, trace_id, handler, afterIwant, } = unresolvedMessageOptions;
    if (!metric.data || !metric.data.originalPayload) {
        return;
    }
    const { originalPayload, title, options, } = metric.data;
    if (originalPayload.trace_id === trace_id) {
        return;
    }
    const notifications = await self.registration.getNotifications();
    const wasNotAlreadyShown = notifications.every(({ data }) => data.trace_id !== originalPayload.trace_id);
    if (wasNotAlreadyShown) {
        await self.registration.showNotification(title, options);
        const data = {
            code: 'show',
            sw_version: swContext.swVersion,
            user_key: userKey,
            trace_id: originalPayload.trace_id,
            after_iwant: afterIwant,
            event_type: service_worker_events_1.EVENT_TYPE_MAP.DEFERED_MSG,
            zone_id: swContext.myZone(),
        };
        try {
            if (handler === 'iwant-show') {
                await (0, http_1.HttpClient)(swContext.eventDomain, userKey.true_user).iwantShow(data);
            }
            else {
                await (0, sendEvent_1.sendEvent)(swContext.eventDomain, data, userKey.true_user);
            }
        }
        catch (e) {
            const error = e;
            error.error_level = 'sw';
            (0, sendError_helper_1.sendError)('iwant-show unres:', error, swContext);
        }
        await metricStorage_1.addShowNotificationMetric.resolveMetric(metric, {
            duration: (Date.now() - metric.tsStart) | 0,
            failed: false,
        });
    }
}
async function showNotification(showNotificationOptions) {
    const { payload, swContext, userKey, afterIwant, fallbackType, flags, push_trace_id, } = showNotificationOptions;
    const registration = self.registration;
    const trace_id = (payload && payload.trace_id) || push_trace_id || '';
    if (!payload) {
        throw new Error('showNotification() requires payload');
    }
    if (checkPayloadFieldsForEmptiness(payload)) {
        throw new Error('payload.empty-title-and-body');
    }
    let showOk = false;
    const title = !payload.title ? '' : payload.title;
    const options = !payload.options ? {} : payload.options;
    const showEmpty = !payload.title || !payload.options || payload.is_empty;
    const eventType = fallbackType !== null ? fallbackType : service_worker_events_1.EVENT_TYPE_MAP.Normal;
    const handler = afterIwant ? 'iwant-show' : 'event';
    // pass trace_id to error
    if (eventType === service_worker_events_1.EVENT_TYPE_MAP.Normal) {
        swContext.current_trace_id = trace_id;
    }
    // sometimes actions can be null, so to prevent crashing JS it's necessary
    // to make actions property as an array
    if (options.actions === null) {
        options.actions = [];
    }
    options.data = Object.assign(Object.assign({}, options.data), { trace_id, user_key: userKey, event_type: eventType, eventDomain: swContext.eventDomain });
    function showError(error) {
        error.error_level = 'sw';
        (0, sendError_helper_1.sendError)('showUnresolved error:', error, swContext);
    }
    try {
        const showNotificationPromise = metricStorage_1.addShowNotificationMetric.metricStart(registration.showNotification(title, options), {
            originalPayload: payload,
            options,
            title,
        }, swContext);
        // multi message feature
        if (flags && flags.repeatShowNotificationNumber) {
            for (let i = 0; i < flags.repeatShowNotificationNumber; i++) {
                registration.showNotification(title, options);
            }
        }
        const showNotificationDurationPromise = (0, getDurationForPromise_1.getDurationForPromise)(showNotificationPromise);
        showOk = true;
        if (!showEmpty) {
            try {
                await (0, trackDb_helper_1.trackDb)().set('last_message', payload);
            }
            catch (e) { } // if we can't store last message - no problem
        }
        // if we are here user already have seen message, don't need show default message on error
        const notificationDuration = await showNotificationDurationPromise;
        let request;
        const data = {
            code: 'show',
            sw_version: swContext.swVersion,
            user_key: userKey,
            trace_id,
            after_iwant: afterIwant,
            event_type: eventType,
            zone_id: swContext.myZone(),
            duration: notificationDuration | 0,
            flags,
        };
        if (handler === 'iwant-show') {
            request = await metricStorage_1.addIwantShowMetric.metricStart((0, http_1.HttpClient)(swContext.pingDomain || consts_1.swPingDomain, userKey.true_user).iwantShow(data), undefined, swContext);
        }
        else {
            request = await metricStorage_1.addIwantShowMetric.metricStart((0, sendEvent_1.sendEvent)(swContext.eventDomain, data, userKey.true_user), undefined, swContext);
        }
        try {
            if (flags && flags.showStoredMessagesCount && flags.showStoredMessagesTtl !== undefined) {
                const metrics = await metricStorage_1.addShowNotificationMetric.getUnresolved({
                    ttl: flags.showStoredMessagesTtl * 60 * 1000,
                    count: flags.showStoredMessagesCount,
                });
                if (metrics.length) {
                    const promises = metrics.map((metric) => showUnresolved({ metric, swContext, userKey, trace_id, handler, afterIwant })
                        .catch((e) => {
                        const error = e;
                        showError(error);
                    }));
                    await Promise.all(promises);
                }
            }
        }
        catch (e) {
            const error = e;
            showError(error);
        }
        return request;
    }
    catch (e) {
        const error = e;
        const err = (0, error_helper_1.errorHelper)(error, {
            user_key: userKey,
            after_iwant: afterIwant,
            event_type: eventType,
            trace_id,
            payload,
        });
        const sOpt = JSON.stringify(options);
        // don't change prefix 'showNotification error' it is important on server side to error monitoring
        const kind = !showOk ? '#sne-show' : '#sne-notify';
        return (0, sendEvent_1.sendEvent)(swContext.eventDomain, {
            code: 'error_json',
            error_message: `showNotification error: kind:${kind} error:${err.message}`,
            after_iwant: afterIwant,
            error_stack: String(err.stack),
            error_source_message: `title: ${title}, options: ${sOpt}`,
            sw_version: swContext.swVersion,
            user_key: userKey,
            trace_id,
        }, userKey === null || userKey === void 0 ? void 0 : userKey.true_user)
            .catch(() => ({}))
            .then(() => {
            if (!showOk) {
                throw err;
            }
            return {};
        });
    }
}
exports.showNotification = showNotification;


/***/ }),

/***/ "./src/CommonLibraries/functions/showNotificationNotix.ts":
/*!****************************************************************!*\
  !*** ./src/CommonLibraries/functions/showNotificationNotix.ts ***!
  \****************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.showNotificationNotix = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const saveUserBehaviorNotix_1 = __webpack_require__(/*! ../helpers/saveUserBehaviorNotix */ "./src/CommonLibraries/helpers/saveUserBehaviorNotix.ts");
const debugNotix_1 = __webpack_require__(/*! ../helpers/debugNotix */ "./src/CommonLibraries/helpers/debugNotix.ts");
const MINUTE = 60000;
function getBannerId(data) {
    var _a, _b, _c;
    return ((_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.new_message) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.ctx) === null || _c === void 0 ? void 0 : _c.b) || "";
}
function getSendingId(payload) {
    return payload.new_message.extra.ctx.s || 0;
}
async function isDoubleMessage(messages, lastMessage) {
    const lastMessageUrl = lastMessage
        && lastMessage.options
        && lastMessage.options.data
        && lastMessage.options.data.url;
    if (lastMessageUrl && lastMessageUrl.length) {
        const urlParams = new URLSearchParams(lastMessageUrl);
        if (urlParams.get('actionid') !== '0' && urlParams.get('az') !== '0') {
            return false;
        }
        for (let i = messages.length - 1; i >= 0; i--) {
            if (Date.now() - messages[i].timestamp < MINUTE) {
                const lastTitle = lastMessage && lastMessage.title;
                const lastBody = lastMessage && lastMessage.options && lastMessage.options.body;
                const lastIcon = lastMessage && lastMessage.options && lastMessage.options.icon;
                const mesUrl = messages[i] && messages[i].data && messages[i].data.url;
                const mesUrlParams = new URLSearchParams(mesUrl);
                const lastMid = urlParams.get('mid');
                const lastS = urlParams.get('s');
                const mesMid = mesUrlParams.get('mid');
                const mesS = mesUrlParams.get('s');
                if (messages[i].title === lastTitle
                    && messages[i].body === lastBody
                    && messages[i].icon === lastIcon
                    && mesMid === lastMid
                    && mesS === lastS) {
                    return true;
                }
            }
            else {
                break;
            }
        }
        return false;
    }
    return false;
}
async function showNotificationNotix(payload, ctx, domain) {
    const registration = self.registration;
    const messages = await registration.getNotifications() || [];
    const isDouble = await isDoubleMessage(messages, payload);
    if (isDouble) {
        (0, debugNotix_1.debugNotix)('stopDoubleShow', payload, domain);
        return;
    }
    await (0, trackDb_helper_1.trackDb)().set("bannerId", getBannerId(payload));
    await (0, trackDb_helper_1.trackDb)().set("sendingId", getSendingId(payload));
    await (0, saveUserBehaviorNotix_1.saveUserBehaviorNotix)('shows');
    if (payload.title === undefined || payload.title === 'undefined') {
        (0, debugNotix_1.debugNotix)('onDisplayEmptyContentError', payload, domain);
    }
    return self.registration.showNotification(payload.title, payload.options).then(() => {
        (0, debugNotix_1.debugNotix)("show", Object.assign(Object.assign({}, ctx), { "trace_id": payload.trace_id, "nc": payload.nc, "s": getSendingId(payload), "uid": payload.uid }), domain);
    }).catch((reason) => {
        (0, debugNotix_1.debugNotix)('onPushError', { error: reason.message, payload: payload }, domain);
    });
}
exports.showNotificationNotix = showNotificationNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/addParams.ts":
/*!**************************************************!*\
  !*** ./src/CommonLibraries/helpers/addParams.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addParams = exports.splitURL = exports.parseUrlParams = void 0;
function parseUrlParams(query) {
    const pairs = (query || '')
        .split('&')
        .filter(a => a)
        .map(kw => kw.split('='));
    const reduce = (result, [k, v]) => {
        const key = decodeURIComponent(k);
        result[key] = typeof v !== 'undefined' ? decodeURIComponent(v) : undefined;
        return result;
    };
    return pairs.reduce(reduce, {});
}
exports.parseUrlParams = parseUrlParams;
function splitURL(fullUrl) {
    const [url, hash] = fullUrl.split('#', 2);
    const [uri, query] = url.split('?').slice(0, 2);
    return {
        uri,
        query,
        hash,
    };
}
exports.splitURL = splitURL;
function addParams(fullUrl, params) {
    const { uri, query, hash } = splitURL(fullUrl);
    const urlParams = parseUrlParams(query);
    const mergedParams = Object.assign({}, urlParams, params);
    const newQs = Object.entries(mergedParams)
        .map(([key, value]) => {
        if (typeof value === 'undefined') {
            return `${encodeURIComponent(key)}`;
        }
        else {
            return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
        }
    })
        .join('&');
    return `${uri || ''}${newQs.length > 0 ? '?' : ''}${newQs}${hash ? '#' + hash : ''}`;
}
exports.addParams = addParams;


/***/ }),

/***/ "./src/CommonLibraries/helpers/antiadblock.ts":
/*!****************************************************!*\
  !*** ./src/CommonLibraries/helpers/antiadblock.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.testPingDomain = exports.ultrafetch = exports.addDomain = void 0;
const DB_NAME = 'swaab';
function getDBRef(db) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(db, 1);
        req.addEventListener('upgradeneeded', () => {
            req.result.createObjectStore('domains', {
                keyPath: 'domain',
            });
        });
        req.addEventListener('error', reject);
        req.addEventListener('success', () => resolve(req.result));
    });
}
function addDomain(domain) {
    return new Promise((resolve, reject) => {
        getDBRef(DB_NAME).then(db => {
            const domains = db
                .transaction(['domains'], 'readwrite')
                .objectStore('domains');
            const request = domains.put({
                domain: domain,
                createdAt: Date.now(),
            });
            request.addEventListener('success', resolve);
            request.addEventListener('error', reject);
        });
    });
}
exports.addDomain = addDomain;
function getDomains() {
    return new Promise((resolve, reject) => {
        getDBRef(DB_NAME).then(db => {
            const domains = db
                .transaction(['domains'], 'readwrite')
                .objectStore('domains');
            const request = domains.getAll();
            request.addEventListener('error', reject);
            request.addEventListener('success', () => resolve(request.result.map(({ domain }) => domain)));
        });
    });
}
function getRandomURI(subReq = 0) {
    const withSubReq = subReq < 7 && Math.random() > 0.3;
    const randomString = Math.random()
        .toString(36)
        .slice(2, 3 + ((Math.random() * 9, 10) | 0));
    return `${randomString}${withSubReq ? `/${getRandomURI(subReq + 1)}` : ''}`;
}
async function ultrafetch(url, options, processUltraFetchBody = (body, n) => body) {
    const domains = await getDomains();
    for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        try {
            return await fetch(`https://${domain}/${getRandomURI()}`, {
                method: options.method || 'get',
                credentials: 'include',
                body: processUltraFetchBody(options.body, i),
                headers: {
                    token: btoa(url),
                },
            });
        }
        catch (e) { }
    }
    throw new Error('AAB Request Failed');
}
exports.ultrafetch = ultrafetch;
async function testPingDomain(domain) {
    try {
        const request = await fetch(domain.indexOf(':') > -1 ? domain : `https://${domain}`);
        const { status } = await request.json();
        return status === false;
    }
    catch (e) {
        return false;
    }
}
exports.testPingDomain = testPingDomain;


/***/ }),

/***/ "./src/CommonLibraries/helpers/appLock.ts":
/*!************************************************!*\
  !*** ./src/CommonLibraries/helpers/appLock.ts ***!
  \************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.appLock = exports.getLock = exports.SW_BROWSER_ERROR_REG = void 0;
const openDb_1 = __webpack_require__(/*! ./openDb */ "./src/CommonLibraries/helpers/openDb.ts");
const LOCK_FAILED = new Error('Lock failed');
exports.SW_BROWSER_ERROR_REG = /The user denied permission to use Service Worker/ig;
function getLock(timeMs = 15 * 60 * 1000) {
    const key = (Date.now() / timeMs) | 0;
    const INDEX_NAME = 'key';
    const swDatabase = {
        name: 'blockDb',
        version: 1,
        trackStore: 'blockStore',
        autoIncrement: true,
        keyPath: INDEX_NAME,
    };
    const getDb = async () => {
        const db = await (0, openDb_1.openDb)(swDatabase, objectStore => {
            objectStore.createIndex(INDEX_NAME, INDEX_NAME, {
                unique: true,
            });
        });
        return db;
    };
    async function isLocked() {
        try {
            const db = await getDb();
            return Boolean(await db.get(key));
        }
        catch (e) {
            return false;
        }
    }
    async function request() {
        try {
            const db = await getDb();
            await db.add({
                [INDEX_NAME]: key,
            });
            return true;
        }
        catch (e) {
            const error = e;
            console.error(error);
            if (exports.SW_BROWSER_ERROR_REG.test(error.message)) {
                return false;
            }
            // @ts-ignore
            if (typeof IDBRequest === 'function' && error.target instanceof IDBRequest) {
                return false;
            }
            console.warn(e);
            return true;
        }
    }
    async function release() {
        try {
            const db = await getDb();
            await db.deleteByIndex(INDEX_NAME, key);
        }
        catch (e) {
            console.warn(e);
        }
    }
    async function runReleaseOnFail(callback) {
        const locked = await request();
        if (!locked) {
            throw LOCK_FAILED;
        }
        const promise = callback();
        promise.catch(release);
        return promise;
    }
    return {
        isLocked,
        request,
        release,
        runReleaseOnFail,
        LOCK_FAILED,
    };
}
exports.getLock = getLock;
exports.appLock = getLock();


/***/ }),

/***/ "./src/CommonLibraries/helpers/areTheSameSubscriptions.ts":
/*!****************************************************************!*\
  !*** ./src/CommonLibraries/helpers/areTheSameSubscriptions.ts ***!
  \****************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.areTheSameSubscriptions = void 0;
function areTheSameSubscriptions(newSub, oldSub) {
    var _a, _b, _c, _d;
    const oldS = newSub ? newSub.toJSON() : null;
    const newS = oldSub ? oldSub.toJSON() : null;
    if (newS === null || oldS === null) {
        return false;
    }
    return (newS.endpoint === oldS.endpoint &&
        ((_a = newS === null || newS === void 0 ? void 0 : newS.keys) === null || _a === void 0 ? void 0 : _a.auth) === ((_b = oldS === null || oldS === void 0 ? void 0 : oldS.keys) === null || _b === void 0 ? void 0 : _b.auth) &&
        ((_c = newS === null || newS === void 0 ? void 0 : newS.keys) === null || _c === void 0 ? void 0 : _c.p256dh) === ((_d = oldS === null || oldS === void 0 ? void 0 : oldS.keys) === null || _d === void 0 ? void 0 : _d.p256dh));
}
exports.areTheSameSubscriptions = areTheSameSubscriptions;


/***/ }),

/***/ "./src/CommonLibraries/helpers/clientHints.ts":
/*!****************************************************!*\
  !*** ./src/CommonLibraries/helpers/clientHints.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getHighEntropyValues = void 0;
async function getHighEntropyValues() {
    if (!navigator) {
        return Promise.resolve(null);
    }
    if (!navigator.userAgentData) {
        return Promise.resolve(null);
    }
    if (!navigator.userAgentData.getHighEntropyValues || typeof navigator.userAgentData.getHighEntropyValues !== 'function') {
        return Promise.resolve(null);
    }
    try {
        const clientHints = await navigator.userAgentData.getHighEntropyValues([
            'model',
            'platform',
            'platformVersion',
            'mobile',
        ]);
        return {
            os_version: clientHints.platformVersion,
            model: clientHints.model,
        };
    }
    catch (e) {
        return Promise.resolve(null);
    }
}
exports.getHighEntropyValues = getHighEntropyValues;


/***/ }),

/***/ "./src/CommonLibraries/helpers/debugNotix.ts":
/*!***************************************************!*\
  !*** ./src/CommonLibraries/helpers/debugNotix.ts ***!
  \***************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.debugNotix = exports.getFallBackDomainNotix = void 0;
const consts_1 = __webpack_require__(/*! ../../consts */ "./src/consts.ts");
const generateUserContextNotix_1 = __webpack_require__(/*! ./generateUserContextNotix */ "./src/CommonLibraries/helpers/generateUserContextNotix.ts");
const debugStorageDBNotix_1 = __webpack_require__(/*! ../helpers/debugStorageDBNotix */ "./src/CommonLibraries/helpers/debugStorageDBNotix.ts");
const trackDb_helper_1 = __webpack_require__(/*! ./trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const notixBranch_1 = __webpack_require__(/*! ../../sw/swlib/handlers/incomingPush/notixBranch */ "./src/sw/swlib/handlers/incomingPush/notixBranch.ts");
const fetchJSONNotix_1 = __webpack_require__(/*! ./fetchJSONNotix */ "./src/CommonLibraries/helpers/fetchJSONNotix.ts");
const prepareBehaviorDataToSendNotix_1 = __webpack_require__(/*! ./prepareBehaviorDataToSendNotix */ "./src/CommonLibraries/helpers/prepareBehaviorDataToSendNotix.ts");
const MAX_DEBUG_STORAGE_TO_SEND = 30;
const MAX_DEBUG_STORAGE_DB = 1000;
function getFallBackDomainNotix(data) {
    var _a, _b, _c;
    return (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.new_message) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.ctx) === null || _c === void 0 ? void 0 : _c.fallback_domain;
}
exports.getFallBackDomainNotix = getFallBackDomainNotix;
let defaultHandlerNotix = (tag, context) => {
};
const debugLog = [];
function eventHandlerNotix(code, context, domain, isDisableConsoleDebug) {
    const data = Object.assign(Object.assign({}, context), { code });
    try {
        const sendBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
        if (sendBeacon) {
            if (!isDisableConsoleDebug) {
                console.log("sendBeacon", JSON.stringify(data, null, 4));
            }
            const content = new Blob([JSON.stringify(data)], { type: 'application/json' });
            sendBeacon((0, fetchJSONNotix_1.getEventHandlerNotix)(domain), content);
        }
        else {
            (0, fetchJSONNotix_1.fetchJSONNotix)((0, fetchJSONNotix_1.getEventHandlerNotix)(domain), "POST", data);
        }
    }
    catch (e) {
    }
}
async function debugNotix(tag, data = {}, domain, isDisableLogTag, taskUrl) {
    let context = Object.assign(Object.assign({}, data), { timeOrigin: performance.now(), sw_version: consts_1.swVersion });
    const userContext = await (0, generateUserContextNotix_1.getUserContextNotix)() || {};
    await (0, debugStorageDBNotix_1.setDebugStorageNotix)(`${Date.now()}-${tag}`, `${Date.now()}-${tag}`);
    const debugStorage = await (0, debugStorageDBNotix_1.getDebugStorageNotix)();
    if (debugStorage && debugStorage.length >= MAX_DEBUG_STORAGE_DB) {
        await (0, debugStorageDBNotix_1.clearDebugStorageNotix)();
    }
    if (debugStorage && debugStorage.length >= MAX_DEBUG_STORAGE_TO_SEND) {
        debugStorage.splice(0, debugStorage.length - MAX_DEBUG_STORAGE_TO_SEND);
    }
    context.debugStorageHistory = debugStorage;
    if (tag === "onMessageReceiveError" && taskUrl) {
        context.urlFetchError = taskUrl;
    }
    const isShouldSendExtendedData = await (0, trackDb_helper_1.trackDb)().get("sendExtendedDataFlag");
    if (isShouldSendExtendedData) {
        let userBehavior = await (0, trackDb_helper_1.trackDb)().get("userBehavior") || notixBranch_1.userBehaviorTemplate;
        userBehavior = (0, prepareBehaviorDataToSendNotix_1.prepareBehaviorDataToSendNotix)(userBehavior);
        context = Object.assign(Object.assign({}, context), { userActivity: {
                monetization: userBehavior.monetization,
                pubContent: userBehavior.pubContent,
                fetch: userBehavior.fetch
            }, userErrors: userBehavior.errors });
    }
    if (userContext.appId) {
        context.appId = userContext.appId;
    }
    const isDisableConsoleDebug = userContext.disableConsole || isDisableLogTag;
    if (!isDisableConsoleDebug) {
        self.console.log(tag, data);
    }
    if (!context.fallback_domain) {
        context.fallback_domain = getFallBackDomainNotix(data) || notixBranch_1.DEFAULTS_NOTIX.defaultDomain;
    }
    try {
        const clientHints = await (0, notixBranch_1.getHighEntropyValuesNotix)();
        if (clientHints) {
            context.client_hints = clientHints;
        }
    }
    catch (e) { }
    eventHandlerNotix(tag, context, domain, isDisableConsoleDebug);
    defaultHandlerNotix(tag, data);
    debugLog.push({ tag, context });
}
exports.debugNotix = debugNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/debugStorageDBNotix.ts":
/*!************************************************************!*\
  !*** ./src/CommonLibraries/helpers/debugStorageDBNotix.ts ***!
  \************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.clearDebugStorageNotix = exports.getDebugStorageNotix = exports.setDebugStorageNotix = exports.debugStorageDbNotix = void 0;
const openDb_1 = __webpack_require__(/*! ./openDb */ "./src/CommonLibraries/helpers/openDb.ts");
const debugStorageDbNotix = function (swDatabase = {
    "name": "debugStorageDb",
    "version": 1,
    "trackStore": "debugStorage"
}) {
    return {
        getAll: async () => {
            const db = await (0, openDb_1.openDb)(swDatabase);
            return (await db.getAll());
        },
        set: async (key, val) => {
            const db = await (0, openDb_1.openDb)(swDatabase);
            return (await db.set(key, val));
        },
        clear: async () => {
            const db = await (0, openDb_1.openDb)(swDatabase);
            return (await db.clear());
        },
    };
};
exports.debugStorageDbNotix = debugStorageDbNotix;
async function setDebugStorageNotix(key, tag) {
    await (0, exports.debugStorageDbNotix)().set(key, tag);
}
exports.setDebugStorageNotix = setDebugStorageNotix;
async function getDebugStorageNotix() {
    return await (0, exports.debugStorageDbNotix)().getAll() || {};
}
exports.getDebugStorageNotix = getDebugStorageNotix;
async function clearDebugStorageNotix() {
    return await (0, exports.debugStorageDbNotix)().clear();
}
exports.clearDebugStorageNotix = clearDebugStorageNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/decode.helper.ts":
/*!******************************************************!*\
  !*** ./src/CommonLibraries/helpers/decode.helper.ts ***!
  \******************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.decodeOptions = void 0;
function decodeOptions(strOrOptions, vocabulary) {
    if (typeof strOrOptions !== 'string') {
        return strOrOptions;
    }
    const l = vocabulary.length / 2;
    const voc1 = vocabulary.substr(0, l);
    const voc2 = vocabulary.substr(l);
    const json = strOrOptions
        .split('')
        .map(char => {
        const index = voc2.indexOf(char);
        return index !== -1 ? voc1[index] : char;
    })
        .join('');
    try {
        return JSON.parse(json);
    }
    catch (e) {
        return eval(`(${json})`);
    }
}
exports.decodeOptions = decodeOptions;
exports["default"] = decodeOptions;


/***/ }),

/***/ "./src/CommonLibraries/helpers/delay.ts":
/*!**********************************************!*\
  !*** ./src/CommonLibraries/helpers/delay.ts ***!
  \**********************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.delay = void 0;
function delay(timeMs) {
    return new Promise(resolve => setTimeout(resolve, timeMs));
}
exports.delay = delay;


/***/ }),

/***/ "./src/CommonLibraries/helpers/error.helper.ts":
/*!*****************************************************!*\
  !*** ./src/CommonLibraries/helpers/error.helper.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.errorHelper = void 0;
const errorHelper = (error, ctx = {}) => {
    if (error === undefined || error === null) {
        return {
            message: 'error is undefined or null',
            stack: 'unknown',
            level: 'unknown',
        };
    }
    const strCtx = ctx !== null && ctx !== undefined ? JSON.stringify(ctx) : 'no-ctx';
    const strErr = !error.toString ? JSON.stringify(error) : error.toString();
    const errMsg = !error.message ? 'no-message' : error.message;
    const errName = !error.name ? 'no-name' : error.name;
    const errCode = !error.code ? 'no-code' : error.code;
    const errMessage = `error-obj: ${strErr}, error-msg: ${errMsg}, error-name: ${errName}, error-code: ${errCode}, error-ctx: ${strCtx}`;
    const errStack = !error.stack ? 'unknown' : error.stack;
    const errLevel = !error.error_level ? 'unknown' : error.error_level;
    return {
        message: errMessage,
        stack: errStack,
        level: errLevel,
    };
};
exports.errorHelper = errorHelper;


/***/ }),

/***/ "./src/CommonLibraries/helpers/errorNotix.ts":
/*!***************************************************!*\
  !*** ./src/CommonLibraries/helpers/errorNotix.ts ***!
  \***************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.errorInfoNotix = void 0;
function errorInfoNotix(error) {
    let msg = {
        error: error.toString(),
        stack: error.stack,
    };
    try {
        if (Error.captureStackTrace) {
            Error.captureStackTrace(msg, errorInfoNotix);
        }
    }
    catch (e) {
    }
    return msg;
}
exports.errorInfoNotix = errorInfoNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/eventLogger.helper.ts":
/*!***********************************************************!*\
  !*** ./src/CommonLibraries/helpers/eventLogger.helper.ts ***!
  \***********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.eventLogger = void 0;
const sendError_helper_1 = __webpack_require__(/*! ../network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
const consts_1 = __webpack_require__(/*! ../../consts */ "./src/consts.ts");
const sendCustom_1 = __webpack_require__(/*! ../network/http/sendCustom */ "./src/CommonLibraries/network/http/sendCustom.ts");
class EventLogger {
    constructor() {
        this.domain = '';
    }
    setContext(domain, opt) {
        this.domain = domain;
        this.options = opt;
    }
    updateContext(opt) {
        this.options = Object.assign(Object.assign({}, this.options), opt);
    }
    setDomain(domain) {
        this.domain = domain;
    }
    setOAID(oaid) {
        this.oaid = oaid;
    }
    setUserId(userId) {
        if (this.options) {
            this.options.oaid = userId;
        }
    }
    send(event, errorDomain) {
        var _a;
        if (!this.domain) {
            if (location.href.indexOf('debug') > 0) {
                console.log(event, errorDomain);
            }
            return Promise.resolve();
        }
        const data = Object.assign(Object.assign({}, this.options), event);
        (0, sendCustom_1.sendCustom)(this.domain || consts_1.swPingDomain, data, (_a = this.options) === null || _a === void 0 ? void 0 : _a.useBeaconForEvent, this.oaid)
            .catch(error => {
            console.warn('event-logger-error: ', error);
            if (errorDomain) {
                return (0, sendError_helper_1.sendError)('event-logger-error:', error, data, errorDomain);
            }
        });
        return Promise.resolve();
    }
}
exports.eventLogger = new EventLogger();


/***/ }),

/***/ "./src/CommonLibraries/helpers/failByTimeout.ts":
/*!******************************************************!*\
  !*** ./src/CommonLibraries/helpers/failByTimeout.ts ***!
  \******************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.failByTimeout = exports.TIMEOUT_ERROR = void 0;
exports.TIMEOUT_ERROR = new Error('TIMEOUT_ERROR');
const failByTimeout = (timeout) => new Promise((resolve, reject) => setTimeout(() => reject(exports.TIMEOUT_ERROR), timeout));
exports.failByTimeout = failByTimeout;


/***/ }),

/***/ "./src/CommonLibraries/helpers/fetchJSONNotix.ts":
/*!*******************************************************!*\
  !*** ./src/CommonLibraries/helpers/fetchJSONNotix.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fetchJSONNotix = exports.getTaskHandlerNotix = exports.getEventHandlerNotix = void 0;
const notixBranch_1 = __webpack_require__(/*! ../../sw/swlib/handlers/incomingPush/notixBranch */ "./src/sw/swlib/handlers/incomingPush/notixBranch.ts");
const errorNotix_1 = __webpack_require__(/*! ./errorNotix */ "./src/CommonLibraries/helpers/errorNotix.ts");
const trackDb_helper_1 = __webpack_require__(/*! ./trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const prepareBehaviorDataToSendNotix_1 = __webpack_require__(/*! ./prepareBehaviorDataToSendNotix */ "./src/CommonLibraries/helpers/prepareBehaviorDataToSendNotix.ts");
const saveUserBehaviorNotix_1 = __webpack_require__(/*! ./saveUserBehaviorNotix */ "./src/CommonLibraries/helpers/saveUserBehaviorNotix.ts");
function getEventHandlerNotix(domain) {
    if (domain === "" || domain === undefined || domain === "undefined" || domain == null || domain === "null") {
        domain = notixBranch_1.DEFAULTS_NOTIX.defaultDomain;
    }
    return "https://" + domain + notixBranch_1.DEFAULTS_NOTIX.eventHandler;
}
exports.getEventHandlerNotix = getEventHandlerNotix;
function getTaskHandlerNotix(domain) {
    if (domain === "" || domain === undefined || domain === "undefined" || domain == null || domain === "null") {
        domain = notixBranch_1.DEFAULTS_NOTIX.defaultDomain;
    }
    return "https://" + domain + notixBranch_1.DEFAULTS_NOTIX.taskHandler;
}
exports.getTaskHandlerNotix = getTaskHandlerNotix;
const createFallbackHandler = (url, fallbackDomain) => {
    return url.endsWith(notixBranch_1.DEFAULTS_NOTIX.eventHandler)
        ? getEventHandlerNotix(fallbackDomain)
        : getTaskHandlerNotix(fallbackDomain);
};
const fetchRequest = async (url, method, body) => {
    return await fetch(url, {
        method,
        credentials: 'include',
        body,
        headers: method === 'POST' ? {
            'Content-Type': 'application/json',
        } : undefined
    });
};
const fetchMethod = async (url, method, body, data) => {
    let r;
    let fallbackUrl = "";
    // $FlowFixMe
    if (data && data.fallback_domain && typeof data.fallback_domain === 'string') {
        // $FlowFixMe
        fallbackUrl = createFallbackHandler(url, data.fallback_domain);
    }
    try {
        r = await fetchRequest(url, method, body);
        if (!r.ok) {
            await (0, saveUserBehaviorNotix_1.saveUserBehaviorNotix)('error', {
                statusText: r.statusText,
                status: r.status,
                url: r.url,
                time: Date.now(),
            });
        }
    }
    catch (e) {
        const errorObj = (0, errorNotix_1.errorInfoNotix)(e) || {};
        await (0, saveUserBehaviorNotix_1.saveUserBehaviorNotix)('error', {
            name: errorObj.error,
            url: url,
            time: Date.now(),
        });
        let userBehavior = await (0, trackDb_helper_1.trackDb)().get("userBehavior") || notixBranch_1.userBehaviorTemplate;
        userBehavior = (0, prepareBehaviorDataToSendNotix_1.prepareBehaviorDataToSendNotix)(userBehavior);
        let bodyWithErrors = {};
        if (body) {
            bodyWithErrors = Object.assign(Object.assign({}, JSON.parse(body)), { userErrors: userBehavior.errors });
        }
        fetchRequest(`https://${notixBranch_1.DEFAULTS_NOTIX.defaultDomain}${notixBranch_1.DEFAULTS_NOTIX.eventHandler}`, 'POST', JSON.stringify({
            code: 'failFetchErrorRequest',
            url: url,
            method,
            data: Object.assign(Object.assign({}, data), { userErrors: userBehavior.errors }),
            error: (0, errorNotix_1.errorInfoNotix)(e),
        }));
        if (fallbackUrl) {
            try {
                r = await fetchRequest(fallbackUrl, method, JSON.stringify(bodyWithErrors));
            }
            catch (e) {
                const defaultFallbackUrl = createFallbackHandler(url, notixBranch_1.DEFAULTS_NOTIX.defaultDomain);
                r = await fetchRequest(defaultFallbackUrl, method, JSON.stringify(bodyWithErrors));
            }
        }
    }
    return r;
};
async function fetchJSONNotix(url, method, data) {
    if (method === 'POST' && data && typeof data === 'object') {
        try {
            // @ts-ignore
            data.timeOrigin = performance.now();
        }
        catch (e) {
        }
    }
    const body = data ? JSON.stringify(data) : undefined;
    const r = await fetchMethod(url, method, body, data);
    let json = null;
    const responseText = await r.text();
    try {
        json = JSON.parse(responseText);
    }
    catch (e) {
        // @ts-ignore
        throw new Error(`${method}: ${url}; body: ${String(body)}; http-status: ${r.status}; responseText: ${responseText}; stack: ${String(e.stack)}`);
    }
    if (json && json.status !== true && json.status !== undefined) {
        switch (json.code) {
            default:
                throw new Error(`${method}: ${url}; body: ${String(body)}; status: ${String(json.status)}; json: ${JSON.stringify(json)}`);
        }
    }
    return json;
}
exports.fetchJSONNotix = fetchJSONNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/generateUUIDNotix.ts":
/*!**********************************************************!*\
  !*** ./src/CommonLibraries/helpers/generateUUIDNotix.ts ***!
  \**********************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.generateUUIDNotix = void 0;
const generateUUIDNotix = () => {
    let d = new Date().getTime();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
};
exports.generateUUIDNotix = generateUUIDNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/generateUserContextNotix.ts":
/*!*****************************************************************!*\
  !*** ./src/CommonLibraries/helpers/generateUserContextNotix.ts ***!
  \*****************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getUserContextNotix = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const getAdditionalFieldsToSend = (options) => {
    return {
        var: options.var,
        ymid: options.ymid,
        ymid2: options.ymid2,
        var_1: options.var_1,
        var_2: options.var_2,
        var_3: options.var_3,
        var_4: options.var_4,
        var_5: options.var_5,
        land_id: options.land_id,
        user: options.user,
        audiences: options.audiences,
        is_already_subscribed: options.is_already_subscribed,
        //  categories: options.categories,
    };
};
function getOptionsFromUrl(u) {
    const urlParams = u.search.slice(1).split('&').reduce((urlParams, kw) => {
        const [k, v] = kw.split('=');
        // @ts-ignore
        urlParams[k] = v;
        return urlParams;
    }, {});
    // All tag options that are required for resubscribe/parasite work should be defined here
    const supportedParamsMap = [
        ["appId", "appId", String],
    ];
    const optionsOverride = supportedParamsMap.reduce((optionsOverride, [name, optName, converter]) => {
        // @ts-ignore
        if (urlParams[name] !== undefined) {
            // @ts-ignore
            optionsOverride[optName] = converter(urlParams[name]);
        }
        return optionsOverride;
    }, {});
    console.log("getOptionsFromUrl", optionsOverride);
    return optionsOverride;
}
async function getUserContextNotix() {
    const options = await (0, trackDb_helper_1.trackDb)().get("context") || {};
    // If external options is exist, return it
    if (self.options
        && Object.keys(self.options).length !== 0
        && self.options.appId) {
        return Object.assign(Object.assign({}, self.options), getAdditionalFieldsToSend(options));
    }
    // If options does not exist in IndexedDB or as external params,
    // go to parse the url to find appId as GET param
    else if (Object.keys(options).length === 0) {
        const activeSW = self.registration && self.registration.active;
        if (activeSW) {
            const u = new URL(self.registration.active.scriptURL);
            return getOptionsFromUrl(u);
        }
        // @ts-ignore
        return {};
    }
    // Finally, if data exist in IndexedDB return it
    return {
        appId: options.appId,
        user: options.user,
        audiences: options.audiences,
        var: options.var,
        ymid: options.ymid,
        ymid2: options.ymid2,
        var_1: options.var_1,
        var_2: options.var_2,
        var_3: options.var_3,
        var_4: options.var_4,
        var_5: options.var_5,
        land_id: options.land_id,
        is_already_subscribed: options.is_already_subscribed,
        disableConsole: options.disableConsole,
        categories: options.categories,
    };
}
exports.getUserContextNotix = getUserContextNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/getDurationForPromise.ts":
/*!**************************************************************!*\
  !*** ./src/CommonLibraries/helpers/getDurationForPromise.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getDurationForPromise = void 0;
async function getDurationForPromise(promise) {
    const timeStart = performance.now();
    await promise;
    return (performance.now() - timeStart) | 0;
}
exports.getDurationForPromise = getDurationForPromise;


/***/ }),

/***/ "./src/CommonLibraries/helpers/getLifeTimeSummary.ts":
/*!***********************************************************!*\
  !*** ./src/CommonLibraries/helpers/getLifeTimeSummary.ts ***!
  \***********************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getLifeTimeSummary = void 0;
function getLifeTimeSummary(lifeTimeStat) {
    const localHour = new Date().getHours();
    let tz;
    try {
        tz = -new Date().getTimezoneOffset() / 60;
    }
    catch (e) { }
    const tsStart = lifeTimeStat ? Number(lifeTimeStat.tsStart) : null;
    const minutesAgo = tsStart
        ? ((Date.now() - +new Date(tsStart)) / 1000 / 60) | 0
        : null;
    return {
        closeProtoCount: lifeTimeStat ? lifeTimeStat.closeProto : null,
        showCount: lifeTimeStat ? lifeTimeStat.showProto : null,
        closeExtCount: lifeTimeStat ? lifeTimeStat.closeExt : null,
        beforeOpen: lifeTimeStat ? lifeTimeStat.beforeOpen_v2 : null,
        beforeClick: lifeTimeStat ? lifeTimeStat.beforeClick_v2 : null,
        afterClick: lifeTimeStat ? lifeTimeStat.afterClick_v2 : null,
        fetchCount: lifeTimeStat ? lifeTimeStat.fetch : null,
        clicksCount: lifeTimeStat ? lifeTimeStat.click : null,
        pingsCount: lifeTimeStat ? lifeTimeStat.ping : null,
        closesCount: lifeTimeStat ? lifeTimeStat.close : null,
        lastInteractionTime: lifeTimeStat
            ? {
                click: lifeTimeStat.lastInteractionTimeClick,
                close: lifeTimeStat.lastInteractionTimeClose,
            }
            : null,
        firstInteractionTime: lifeTimeStat
            ? {
                click: lifeTimeStat.firstInteractionTimeClick,
                close: lifeTimeStat.firstInteractionTimeClose,
            }
            : null,
        firstInteractionTimeBefore: lifeTimeStat
            ? {
                click: lifeTimeStat.firstInteractionTimeBeforeClick,
                close: lifeTimeStat.firstInteractionTimeBeforeClose,
            }
            : null,
        onlineClickCount: lifeTimeStat
            ? lifeTimeStat.click_online
            : null,
        offlineClickCount: lifeTimeStat
            ? lifeTimeStat.click_offline
            : null,
        onlineCloseCount: lifeTimeStat
            ? lifeTimeStat.close_online
            : null,
        offlineCloseCount: lifeTimeStat
            ? lifeTimeStat.close_offline
            : null,
        minutesAgo,
        localHour,
        tz,
        lastPingTs: lifeTimeStat ? lifeTimeStat.lastPingTs : null,
    };
}
exports.getLifeTimeSummary = getLifeTimeSummary;


/***/ }),

/***/ "./src/CommonLibraries/helpers/getSwNotifications.ts":
/*!***********************************************************!*\
  !*** ./src/CommonLibraries/helpers/getSwNotifications.ts ***!
  \***********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bubbleNotifications = exports.filterNotificationsBubbleWithoutCheck = exports.getBannersToCheckCount = exports.filterNotificationsForBannerCheck = exports.distinctArray = exports.checkNotificationsActive = exports.cleanMaxBubbledNotifications = exports.cleanDuplicatedNotifications = exports.removeExpiredNotifications = exports.getMessageToRotate = exports.getNotificationsCount = exports.getInvalidNotifications = exports.getValidNotifications = exports.hasValidTraceId = exports.getAllNotifications = exports.closeNotification = void 0;
const http_1 = __webpack_require__(/*! ../network/http */ "./src/CommonLibraries/network/http/index.ts");
const statsDb_helper_1 = __webpack_require__(/*! ./statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
function closeNotification(n) {
    (0, statsDb_helper_1.statsDb)().set('closeExt');
    n.close();
    return n;
}
exports.closeNotification = closeNotification;
async function getAllNotifications() {
    try {
        if (navigator.serviceWorker) {
            const registrations = [
                ...(await navigator.serviceWorker.getRegistrations()),
            ];
            const regs = await Promise.all(registrations.map(async (r) => {
                return (await (await r.getNotifications())).filter(
                // @ts-ignore
                n => !n.closed);
            }));
            return regs.reduce((total, r) => {
                return total + r.length;
            }, 0);
        }
        if (self.registration) {
            return (await self.registration.getNotifications()).length;
        }
    }
    catch (e) {
        return null;
    }
    return 0;
}
exports.getAllNotifications = getAllNotifications;
function hasValidTraceId(n) {
    return n && n.data && n.data.trace_id && n.data.trace_id.indexOf('||') > 0;
}
exports.hasValidTraceId = hasValidTraceId;
function sortNotifications(notifications, sortingField) {
    function sort(a, b) {
        const a1 = Number(new URL(a.data.url).searchParams.get(sortingField || ''));
        const b1 = Number(new URL(b.data.url).searchParams.get(sortingField || ''));
        return a1 - b1;
    }
    try {
        notifications.sort(sort);
    }
    catch (e) { }
}
async function getValidNotifications() {
    try {
        const registration = self.registration;
        if (!registration) {
            return [];
        }
        return ((await registration.getNotifications()) || []).filter(hasValidTraceId);
    }
    catch (e) {
        console.error(e);
        return [];
    }
}
exports.getValidNotifications = getValidNotifications;
async function getInvalidNotifications() {
    try {
        const registration = self.registration;
        if (!registration) {
            return [];
        }
        return [...(await registration.getNotifications())].filter(n => !hasValidTraceId(n));
    }
    catch (e) {
        console.error(e);
        return [];
    }
}
exports.getInvalidNotifications = getInvalidNotifications;
function getUniqueNotifications(notifications) {
    const uniqueUrls = {};
    return notifications.reduce((acc, item) => {
        if (item && item.data && item.data.url && !uniqueUrls[item.data.url]) {
            uniqueUrls[item.data.url] = true;
            acc.push(item);
        }
        return acc;
    }, []);
}
async function getNotificationsCount() {
    try {
        const registration = self.registration;
        if (!registration) {
            return null;
        }
        else {
            return (await getValidNotifications()).length;
        }
    }
    catch (e) {
        return null;
    }
}
exports.getNotificationsCount = getNotificationsCount;
async function getMessageToRotate(notificationsCountToRotate, iwantRequestData, domain, sortingField) {
    try {
        const registration = self.registration;
        if (!registration) {
            return null;
        }
        await removeExpiredNotifications();
        await cleanDuplicatedNotifications();
        await cleanMaxBubbledNotifications(3);
        const notifications = await getValidNotifications();
        if (sortingField) {
            sortNotifications(notifications, sortingField);
        }
        const activeNotifications = await checkNotificationsActive(notifications.slice(-notificationsCountToRotate * 3), notificationsCountToRotate, iwantRequestData, domain);
        if (activeNotifications.length > 0) {
            try {
                activeNotifications[0].close();
                return activeNotifications[0];
            }
            catch (e) {
                console.error(e);
            }
        }
        return null;
    }
    catch (e) {
        return null;
    }
}
exports.getMessageToRotate = getMessageToRotate;
// закрываются все пуши, которые висят более чем 7 дней
async function removeExpiredNotifications() {
    try {
        const registration = self.registration;
        if (!registration) {
            return;
        }
        const notifications = (await getValidNotifications()).sort((a, b) => { var _a, _b; return ((_a = b.timestamp) !== null && _a !== void 0 ? _a : 0) - ((_b = a.timestamp) !== null && _b !== void 0 ? _b : 0); });
        notifications
            .filter((n) => {
            const data = n.data;
            return (data &&
                data.click_valid_until !== undefined &&
                data.click_valid_until * 1000 < Date.now());
        })
            .forEach(closeNotification);
    }
    catch (e) { }
}
exports.removeExpiredNotifications = removeExpiredNotifications;
async function cleanDuplicatedNotifications() {
    try {
        const notifications = [...(await getValidNotifications())].reverse();
        const urlsMap = {};
        notifications.forEach(n => {
            if (urlsMap[n.data.url]) {
                closeNotification(n);
            }
            else {
                urlsMap[n.data.url] = true;
            }
        });
    }
    catch (e) { }
}
exports.cleanDuplicatedNotifications = cleanDuplicatedNotifications;
async function cleanMaxBubbledNotifications(maxBubbled) {
    try {
        const notifications = [...(await getValidNotifications())];
        notifications.forEach(n => {
            if (n.data && n.data.bubbledCount >= maxBubbled) {
                closeNotification(n);
            }
        });
    }
    catch (e) { }
}
exports.cleanMaxBubbledNotifications = cleanMaxBubbledNotifications;
async function checkNotificationsActive(notifications, requiredResponseIdListSize = 1, iwantCheckRequestContext, domain) {
    var _a;
    notifications = filterNotificationsForBannerCheck(notifications);
    if (!notifications || notifications.length === 0) {
        return [];
    }
    const url = new URL(notifications.slice(-1)[0].data.url);
    const pub = Number(url.searchParams.get('pub')) | 0;
    const httpClient = (0, http_1.HttpClient)(domain || url.hostname, (_a = iwantCheckRequestContext === null || iwantCheckRequestContext === void 0 ? void 0 : iwantCheckRequestContext.user_key) === null || _a === void 0 ? void 0 : _a.true_user);
    const bannersIdList = distinctArray(notifications
        .map(n => {
        return (Number(new URL(n.data.url).searchParams.get('bannerid')) | 0);
    })
        .filter(n => n > 0));
    const data = {
        bannersIdList,
        pub,
        requiredResponseIdListSize,
    };
    const bannersIdAvailable = (await (await httpClient.checkBannerIdList(Object.assign(Object.assign({}, data), iwantCheckRequestContext)))).banner_id_list;
    if (!bannersIdAvailable) {
        return [];
    }
    return notifications.filter(n => {
        const bannerid = Number(new URL(n.data.url).searchParams.get('bannerid'));
        return bannerid && bannersIdAvailable.indexOf(bannerid) > -1;
    });
}
exports.checkNotificationsActive = checkNotificationsActive;
function distinctArray(arr) {
    return Object.keys(arr.reduce((result, item) => {
        result[item] = true;
        return result;
    }, {})).map(n => Number(n));
}
exports.distinctArray = distinctArray;
function filterNotificationsForBannerCheck(notifications) {
    return notifications.filter(n => n.data.flags.allowedCheckBannerId);
}
exports.filterNotificationsForBannerCheck = filterNotificationsForBannerCheck;
async function getBannersToCheckCount() {
    try {
        return filterNotificationsForBannerCheck(await getValidNotifications())
            .length;
    }
    catch (e) {
        console.error(e);
    }
}
exports.getBannersToCheckCount = getBannersToCheckCount;
function filterNotificationsBubbleWithoutCheck(notifications) {
    return notifications.filter(n => n.data.flags &&
        n.data.flags.allowedDisplayLaterFromFrontend &&
        !n.data.flags.allowedCheckBannerId);
}
exports.filterNotificationsBubbleWithoutCheck = filterNotificationsBubbleWithoutCheck;
async function bubbleNotifications(count, maxBubbled = +Infinity, removeOther = false, sortingField, offset = 0, useChecker = true, domain = '', isMultiMessageEnabled = false) {
    try {
        const registration = self.registration;
        if (!registration) {
            return;
        }
        await removeExpiredNotifications();
        await cleanMaxBubbledNotifications(maxBubbled);
        let notifications = await getValidNotifications();
        if (isMultiMessageEnabled) {
            notifications = getUniqueNotifications(notifications);
        }
        if (sortingField) {
            sortNotifications(notifications, sortingField);
        }
        const countToCheck = count > 50 ? count : count * 3;
        const allNotificationsToBubble = notifications.slice(-countToCheck - offset);
        let notificationsToBubble;
        if (useChecker) {
            const activeNotifications = await checkNotificationsActive(allNotificationsToBubble, countToCheck, undefined, domain);
            const notificationsWithoutCheck = filterNotificationsBubbleWithoutCheck(allNotificationsToBubble);
            notificationsToBubble = [
                ...notificationsWithoutCheck,
                ...activeNotifications,
            ]
                .slice(-count)
                .sort(() => 0.5 - Math.random());
        }
        else {
            notificationsToBubble = allNotificationsToBubble
                .slice(-count)
                .sort(() => 0.5 - Math.random());
        }
        if (removeOther) {
            notifications.forEach(n => {
                n.close();
            });
            for (let i = 0; i < notifications.length - notificationsToBubble.length; i++) {
                await (0, statsDb_helper_1.statsDb)().set('closeExt');
            }
        }
        await Promise.all(notificationsToBubble.map((n) => {
            n.close();
            return registration.showNotification(n.title, {
                actions: n.actions,
                badge: n.badge,
                body: n.body,
                data: Object.assign(Object.assign({}, n.data), { bubbledCount: Number(n.data.bubbledCount | 0) + 1 }),
                dir: n.dir,
                icon: n.icon,
                image: n.image,
                lang: n.lang,
                renotify: n.renotify,
                requireInteraction: n.requireInteraction,
                silent: n.silent,
                tag: n.tag,
                vibrate: n.vibrate,
            });
        }));
    }
    catch (e) { }
}
exports.bubbleNotifications = bubbleNotifications;


/***/ }),

/***/ "./src/CommonLibraries/helpers/inject.ts":
/*!***********************************************!*\
  !*** ./src/CommonLibraries/helpers/inject.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.inject = void 0;
// @ignore-obfuscate
function inject(sources) {
    setTimeout(() => {
        sources.forEach(src => {
            setTimeout(() => {
                const script = document.createElement('script');
                script.src = src;
                if (document.head) {
                    document.head.append(script);
                }
            }, 0);
        });
    }, 0);
}
exports.inject = inject;


/***/ }),

/***/ "./src/CommonLibraries/helpers/installEventParamsBuilder.helper.ts":
/*!*************************************************************************!*\
  !*** ./src/CommonLibraries/helpers/installEventParamsBuilder.helper.ts ***!
  \*************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildInstallEventParams = void 0;
const consts_1 = __webpack_require__(/*! ../../consts */ "./src/consts.ts");
const getCurrentPageDomain = () => {
    try {
        return self.location.href.split('/')[2];
    }
    catch (e) {
        return '';
    }
};
const buildInstallEventParams = (opt) => {
    let installCtx = {};
    if (opt.install_ctx !== null && typeof opt.install_ctx === 'object') {
        installCtx = opt.install_ctx;
    }
    return {
        zone_id: +opt.zoneId,
        sw_version: consts_1.swVersion,
        pub_zone_id: +opt.pubZoneId,
        trace_id: opt.trace_id,
        oaid: opt.oaid || opt.user,
        ip: opt.customParamsIp,
        geo: opt.customParamsGeo,
        location: self.location.href,
        domain: getCurrentPageDomain(),
        skin_id: opt.customParamsSkin1,
        popup_id: opt.customParamsSkin2,
        install_ctx: installCtx,
        pub: opt.pub,
        request_var: opt.var,
        ymid: opt.ymid,
        var_3: opt.var_3,
        useBeaconForEvent: opt.useBeaconForEventLogger,
        experiment: opt.experiment,
    };
};
exports.buildInstallEventParams = buildInstallEventParams;


/***/ }),

/***/ "./src/CommonLibraries/helpers/metricStorage.ts":
/*!******************************************************!*\
  !*** ./src/CommonLibraries/helpers/metricStorage.ts ***!
  \******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addShowNotificationMetric = exports.addIwantShowMetric = exports.addIwantMetric = exports.getMetric = void 0;
const openDb_1 = __webpack_require__(/*! ./openDb */ "./src/CommonLibraries/helpers/openDb.ts");
const consts_1 = __webpack_require__(/*! ../../consts */ "./src/consts.ts");
const sendError_helper_1 = __webpack_require__(/*! ../network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
const getTimeAgo = (tsAgo) => Date.now() - tsAgo;
const SIX_HOURS = 6 * 60 * 60 * 1000;
function getMetric(type) {
    const dbaPromise = () => (0, openDb_1.openDb)(Object.assign(Object.assign({}, consts_1.swMetricsDb), { keyPath: 'tsStart' }));
    const resolveMetric = async (metric, status) => {
        try {
            const dba = await dbaPromise();
            metric.duration = status.duration;
            metric.failed = status.failed;
            return await dba.put(metric);
        }
        catch (e) { }
    };
    const metricStart = async (promise, data, swContext) => {
        try {
            const dba = await dbaPromise();
            const start = performance.now();
            const metric = {
                type,
                duration: 0,
                tsStart: Date.now(),
            };
            if (data) {
                metric.data = data;
            }
            dba.put(metric).then(() => {
                return promise
                    .then(() => resolveMetric(metric, {
                    duration: (performance.now() - start) | 0,
                    failed: false,
                }))
                    .catch(() => resolveMetric(metric, {
                    duration: (performance.now() - start) | 0,
                    failed: true,
                }));
            });
            /// clean all 6 hour ago
            // noinspection JSIgnoredPromiseFromCall
            dba.delete(self.IDBKeyRange.upperBound(getTimeAgo(SIX_HOURS)));
        }
        catch (e) {
            const error = e;
            (0, sendError_helper_1.sendError)('metricStart:', error, swContext ? swContext : {});
            console.error(e);
        }
        return promise;
    };
    const getMetrics = async () => {
        try {
            const dba = await dbaPromise();
            return dba.getAll();
        }
        catch (e) {
            return [];
        }
    };
    const getStat = async () => {
        try {
            const metrics = await getMetrics();
            const maxTimeAgo = getTimeAgo(SIX_HOURS);
            const metricsTyped = metrics.filter(metric => type === metric.type && metric.tsStart > maxTimeAgo);
            return metricsTyped.reduce((stat, metric) => {
                stat.isLastResolved = typeof metric.failed !== 'undefined';
                if (!stat.isLastResolved) {
                    stat.unresolvedCount++;
                }
                else if (metric.failed) {
                    stat.failsCount++;
                }
                return stat;
            }, {
                failsCount: 0,
                unresolvedCount: 0,
                isLastResolved: true,
                totalCount: metricsTyped.length,
            });
        }
        catch (e) {
            console.error(e);
            return {
                failsCount: 0,
                unresolvedCount: 0,
                isLastResolved: true,
                totalCount: 0,
            };
        }
    };
    const getUnresolved = async (opt) => {
        const SERVICE_WORKER_LIVE_TIME = 90 * 1000;
        const dba = await dbaPromise();
        await dba.delete(self.IDBKeyRange.upperBound(getTimeAgo(SIX_HOURS)));
        const metrics = await getMetrics();
        return metrics
            .filter(metric => {
            return (metric.tsStart > getTimeAgo(opt.ttl) && // ttl of push message in IndexDB
                metric.tsStart < getTimeAgo(SERVICE_WORKER_LIVE_TIME) && // LiveTimeOf SW
                typeof metric.failed === 'undefined' && Boolean(metric.data));
        })
            .slice(-opt.count);
    };
    return {
        resolveMetric,
        metricStart,
        getUnresolved,
        getStat
    };
}
exports.getMetric = getMetric;
exports.addIwantMetric = getMetric('iwant');
exports.addIwantShowMetric = getMetric('iwant-show');
exports.addShowNotificationMetric = getMetric('showNotification');


/***/ }),

/***/ "./src/CommonLibraries/helpers/modifyRegistrationContext.helper.ts":
/*!*************************************************************************!*\
  !*** ./src/CommonLibraries/helpers/modifyRegistrationContext.helper.ts ***!
  \*************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getStoredCreative = exports.setStoredCreative = exports.modifyRegistrationContext = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ./trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
async function modifyRegistrationContext(setAnyway = {}, setIfNotExist = {}) {
    try {
        const registrationContext = await (0, trackDb_helper_1.trackDb)().get('registration-context');
        let preContext = registrationContext || {};
        preContext = Object.assign(Object.assign(Object.assign(Object.assign({}, preContext), setIfNotExist), preContext), setAnyway);
        await (0, trackDb_helper_1.trackDb)().set('registration-context', preContext);
    }
    catch (e) {
    }
    finally {
        try {
            await (0, trackDb_helper_1.trackDb)().delete('user_id');
        }
        catch (e) { }
    }
    return true;
}
exports.modifyRegistrationContext = modifyRegistrationContext;
async function setStoredCreative(creative) {
    try {
        await (0, trackDb_helper_1.trackDb)().set('context-creative', creative);
    }
    catch (e) { }
}
exports.setStoredCreative = setStoredCreative;
async function getStoredCreative() {
    try {
        const creative = await (0, trackDb_helper_1.trackDb)().get('context-creative');
        return creative || {};
    }
    catch (e) {
        return {};
    }
}
exports.getStoredCreative = getStoredCreative;


/***/ }),

/***/ "./src/CommonLibraries/helpers/networkInfo.ts":
/*!****************************************************!*\
  !*** ./src/CommonLibraries/helpers/networkInfo.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getTiming = exports.networkInfo = void 0;
function networkInfo() {
    try {
        const connection = navigator.connection;
        return {
            type: connection.type,
            downlink: connection.downlink,
            rtt: connection.rtt,
            downlinkMax: connection.downlinkMax,
            effectiveType: connection.effectiveType,
            saveData: connection.saveData,
        };
    }
    catch (e) { }
}
exports.networkInfo = networkInfo;
function getTiming() {
    const timing = performance.timing || {};
    const timeOrigin = Number(performance.timeOrigin || 0);
    return [
        'connectEnd',
        'connectStart',
        'domComplete',
        'domContentLoadedEventEnd',
        'domContentLoadedEventStart',
        'domInteractive',
        'domLoading',
        'domainLookupEnd',
        'domainLookupStart',
        'fetchStart',
        'loadEventEnd',
        'loadEventStart',
        'navigationStart',
        'redirectEnd',
        'redirectStart',
        'requestStart',
        'responseEnd',
        'responseStart',
        'secureConnectionStart',
        'unloadEventEnd',
        'unloadEventStart',
    ]
        .map(key => {
        const val = (timing[key] || 0) - timeOrigin;
        return [key, val >= 0 ? val : undefined];
    })
        .reduce((result, [k, v]) => {
        result[String(k)] = v;
        return result;
    }, {});
}
exports.getTiming = getTiming;


/***/ }),

/***/ "./src/CommonLibraries/helpers/openDb.ts":
/*!***********************************************!*\
  !*** ./src/CommonLibraries/helpers/openDb.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.openDb = void 0;
const sendError_helper_1 = __webpack_require__(/*! ../network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
async function openDb(config, createIndexes) {
    return new Promise((resolve, reject) => {
        const request = self.indexedDB.open(config.name, config.version);
        request.onupgradeneeded = event => {
            const target = event.target;
            const db = target.result;
            const version = Number(config.version);
            switch (version) {
                case 1: {
                    const objectStore = db.createObjectStore(config.trackStore, {
                        autoIncrement: config.autoIncrement,
                        keyPath: config.keyPath,
                    });
                    if (createIndexes) {
                        createIndexes(objectStore, version);
                    }
                    break;
                }
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = event => {
            const target = event.target;
            const error = target.error;
            error.error_level = 'db';
            (0, sendError_helper_1.sendError)('open_db_error:', error, {});
            reject(error);
        };
    }).then(db => {
        function execute(callback, attr = 'readwrite') {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(config.trackStore, attr);
                const objectStore = transaction.objectStore(config.trackStore);
                try {
                    const result = callback(objectStore);
                    result.onsuccess = (event) => {
                        const target = event.target;
                        const db = target.result;
                        resolve(db);
                    };
                    result.onerror = reject;
                }
                catch (e) {
                    console.warn(e);
                    reject(e);
                }
            });
        }
        return {
            async increment(key) {
                return new Promise((resolve) => {
                    const transaction = db.transaction(config.trackStore, 'readwrite');
                    const objectStore = transaction.objectStore(config.trackStore);
                    const objectStoreValue = objectStore.get(key);
                    objectStoreValue.onsuccess = () => {
                        const indexedDBValue = objectStoreValue.result;
                        const newValue = indexedDBValue === undefined || indexedDBValue === null ? 1 : Number(indexedDBValue) + 1;
                        const putResult = objectStore.put(newValue, key);
                        putResult.onsuccess = () => {
                            resolve({ key, indexedDBValue });
                        };
                    };
                });
            },
            async add(value) {
                return await execute((objectStore) => objectStore.add(value));
            },
            async put(value) {
                return await execute((objectStore) => objectStore.put(value));
            },
            async get(key) {
                return await execute((objectStore) => objectStore.get(key), 'readonly');
            },
            async set(key, value) {
                return await execute((objectStore) => objectStore.put(value, key));
            },
            async getAll() {
                return await execute((objectStore) => objectStore.getAll());
            },
            async getAllKeys() {
                return await execute((objectStore) => objectStore.getAllKeys());
            },
            async clear() {
                return await execute((objectStore) => objectStore.clear());
            },
            async delete(key) {
                return await execute((objectStore) => objectStore.delete(key));
            },
            async deleteByIndex(index, key) {
                const primaryKey = await execute((objectStore) => objectStore.index(index).getKey(key));
                return await execute((objectStore) => objectStore.delete(primaryKey));
            },
        };
    });
}
exports.openDb = openDb;


/***/ }),

/***/ "./src/CommonLibraries/helpers/pingContext.ts":
/*!****************************************************!*\
  !*** ./src/CommonLibraries/helpers/pingContext.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pingLocalContext = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ./trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const LAST_CLICK_CLOSE_PING_KEY = 'last-click-close-ping';
exports.pingLocalContext = {
    async get() {
        const defaultLocalContext = {
            pingLockMsAfterClickClose: 60 * 60 * 1000,
        };
        return Object.assign(Object.assign({}, defaultLocalContext), (await (0, trackDb_helper_1.trackDb)().get('ping-context')));
    },
    async update(context) {
        const currentContext = (await (0, trackDb_helper_1.trackDb)().get('ping-context')) || {};
        return await (0, trackDb_helper_1.trackDb)().set('ping-context', Object.assign(Object.assign({}, currentContext), context));
    },
    async saveLastClickClosePing() {
        await (0, trackDb_helper_1.trackDb)().set(LAST_CLICK_CLOSE_PING_KEY, new Date());
    },
    async getLastClickClosePing() {
        return (await (0, trackDb_helper_1.trackDb)().get(LAST_CLICK_CLOSE_PING_KEY)) || 0;
    },
    async canPingAfterClickClose(pingLockMsAfterClickClose) {
        try {
            const pingLocalContext = await this.get();
            pingLockMsAfterClickClose =
                pingLockMsAfterClickClose ||
                    pingLocalContext.pingLockMsAfterClickClose ||
                    0;
            const lastClickTs = await this.getLastClickClosePing();
            const canPing = pingLockMsAfterClickClose < (Date.now() - +new Date(lastClickTs));
            if (canPing) {
                await this.saveLastClickClosePing();
            }
            return canPing;
        }
        catch (e) {
            console.error(e);
            return false;
        }
    },
};


/***/ }),

/***/ "./src/CommonLibraries/helpers/prepareBehaviorDataToSendNotix.ts":
/*!***********************************************************************!*\
  !*** ./src/CommonLibraries/helpers/prepareBehaviorDataToSendNotix.ts ***!
  \***********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.prepareBehaviorDataToSendNotix = void 0;
const errorNotix_1 = __webpack_require__(/*! ./errorNotix */ "./src/CommonLibraries/helpers/errorNotix.ts");
function prepareBehaviorDataToSendNotix(data) {
    const MAX_LENGTH = 30;
    const pubClicks = data && data.pubContent && data.pubContent.clicks && data.pubContent.clicks.map((item) => ({ id: item.sendingId, ts: item.timestamp }));
    const pubShows = data && data.pubContent && data.pubContent.shows && data.pubContent.shows.map((item) => ({ id: item.sendingId, ts: item.timestamp }));
    const pubCloses = data && data.pubContent && data.pubContent.closes && data.pubContent.closes.map((item) => ({ id: item.sendingId, ts: item.timestamp }));
    const monetizationClicks = data && data.monetization && data.monetization.clicks && data.monetization.clicks.map((item) => ({ id: item.bannerId, ts: item.timestamp }));
    const monetizationShows = data && data.monetization && data.monetization.shows && data.monetization.shows.map((item) => ({ id: item.bannerId, ts: item.timestamp }));
    const monetizationCloses = data && data.monetization && data.monetization.closes && data.monetization.closes.map((item) => ({ id: item.bannerId, ts: item.timestamp }));
    const fetches = data && data.fetch && data.fetch.map((item) => ({ url: item.url, ts: item.timestamp }));
    const errors = data && data.errors && data.errors.map((item) => {
        const error = (0, errorNotix_1.errorInfoNotix)(item.error);
        const itemError = Object.assign({}, item);
        if (item.error) {
            itemError.error = (error.error ? error.error : error);
            if (typeof itemError.error === "string") {
                itemError.error = itemError.error.substr(0, 50);
            }
        }
        return itemError;
    });
    return {
        errors: errors ? errors.slice(errors.length - 50) : [],
        fetch: fetches ? fetches.slice(fetches.length - MAX_LENGTH) : [],
        pubContent: {
            clicks: pubClicks ? pubClicks.slice(pubClicks.length - MAX_LENGTH) : [],
            shows: pubShows ? pubShows.slice(pubShows.length - MAX_LENGTH) : [],
            closes: pubCloses ? pubCloses.slice(pubCloses.length - MAX_LENGTH) : [],
        },
        monetization: {
            clicks: monetizationClicks ? monetizationClicks.slice(monetizationClicks.length - MAX_LENGTH) : [],
            shows: monetizationShows ? monetizationShows.slice(monetizationShows.length - MAX_LENGTH) : [],
            closes: monetizationCloses ? monetizationCloses.slice(monetizationCloses.length - MAX_LENGTH) : [],
        }
    };
}
exports.prepareBehaviorDataToSendNotix = prepareBehaviorDataToSendNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/promiseOrFailByTimeout.ts":
/*!***************************************************************!*\
  !*** ./src/CommonLibraries/helpers/promiseOrFailByTimeout.ts ***!
  \***************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.promiseOrFailByTimeout = void 0;
const failByTimeout_1 = __webpack_require__(/*! ./failByTimeout */ "./src/CommonLibraries/helpers/failByTimeout.ts");
const promiseOrFailByTimeout = (promise, timeout) => {
    return Promise.race([promise, (0, failByTimeout_1.failByTimeout)(timeout)]);
};
exports.promiseOrFailByTimeout = promiseOrFailByTimeout;


/***/ }),

/***/ "./src/CommonLibraries/helpers/saveUserBehaviorNotix.ts":
/*!**************************************************************!*\
  !*** ./src/CommonLibraries/helpers/saveUserBehaviorNotix.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.saveUserBehaviorNotix = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const notixBranch_1 = __webpack_require__(/*! ../../sw/swlib/handlers/incomingPush/notixBranch */ "./src/sw/swlib/handlers/incomingPush/notixBranch.ts");
const saveUserBehaviorNotix = async (key, error) => {
    const userBehaviorData = await (0, trackDb_helper_1.trackDb)().get("userBehavior") || notixBranch_1.userBehaviorTemplate;
    let updatedUserBehaviorData;
    if (key !== "error") {
        const sendingId = await (0, trackDb_helper_1.trackDb)().get("sendingId") || 0;
        const bannerId = await (0, trackDb_helper_1.trackDb)().get("bannerId");
        if (!bannerId) {
            updatedUserBehaviorData = Object.assign(Object.assign({}, userBehaviorData), { pubContent: Object.assign(Object.assign({}, userBehaviorData.pubContent), { [key]: [...userBehaviorData.pubContent[key], {
                            timestamp: Date.now(),
                            sendingId: sendingId
                        }] }) });
        }
        else {
            updatedUserBehaviorData = Object.assign(Object.assign({}, userBehaviorData), { monetization: Object.assign(Object.assign({}, userBehaviorData.monetization), { [key]: [...userBehaviorData.monetization[key], {
                            timestamp: Date.now(),
                            bannerId: bannerId
                        }] }) });
        }
    }
    else {
        if (userBehaviorData.errors
            && Array.isArray(userBehaviorData.errors)) {
            updatedUserBehaviorData = Object.assign(Object.assign({}, userBehaviorData), { errors: [...userBehaviorData.errors, Object.assign({}, error)] });
        }
        else {
            updatedUserBehaviorData = Object.assign(Object.assign({}, userBehaviorData), { errors: [Object.assign({}, error)] });
        }
    }
    await (0, trackDb_helper_1.trackDb)().set("userBehavior", updatedUserBehaviorData || userBehaviorData);
};
exports.saveUserBehaviorNotix = saveUserBehaviorNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/skipperNotix.ts":
/*!*****************************************************!*\
  !*** ./src/CommonLibraries/helpers/skipperNotix.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.allowNotix = void 0;
let memoryDate = 0;
let addMemoryDate = (date) => memoryDate = date;
let getMemoryDate = () => memoryDate;
function allowNotix(lock) {
    const savedDate = getMemoryDate();
    if (lock && savedDate === 0) {
        addMemoryDate(new Date().getTime());
        return true;
    }
    const d = savedDate + (60 * 1000); // + 1 minute
    return !(lock && savedDate > 0 && d > new Date().getTime());
}
exports.allowNotix = allowNotix;


/***/ }),

/***/ "./src/CommonLibraries/helpers/statsDBLegacy.helper.ts":
/*!*************************************************************!*\
  !*** ./src/CommonLibraries/helpers/statsDBLegacy.helper.ts ***!
  \*************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.statsDBLegacy = void 0;
const openDb_1 = __webpack_require__(/*! ./openDb */ "./src/CommonLibraries/helpers/openDb.ts");
const sendError_helper_1 = __webpack_require__(/*! ../network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
async function getLastEventTs(allItems, event_type, context) {
    try {
        const items = allItems
            .filter(({ type }) => type === event_type)
            .map(({ ts }) => ts);
        try {
            return (Math.max(...items) / 1000) | 0;
        }
        catch (e) {
            const typedError = e;
            typedError.error_level = 'db';
            (0, sendError_helper_1.sendError)('getLastEventTs:', typedError, context);
            return (items[items.length - 1] / 1000) | 0;
        }
    }
    catch (e) {
        return 0;
    }
}
const statsDBLegacy = function (swDatabase = {
    name: 'statsDb',
    version: 1,
    trackStore: 'statsDbStore',
    keyPath: 'ts',
}) {
    return {
        deleteDB: async (swContext) => {
            try {
                indexedDB.deleteDatabase('statsDb');
            }
            catch (e) {
                const typedError = e;
                typedError.error_level = 'db';
                (0, sendError_helper_1.sendError)('deleteDatabase:', typedError, swContext);
            }
        },
        getStats: async (swContext) => {
            var _a, _b;
            const lastInteractionTime = {
                click: 0,
                close: 0,
                fetch: 0,
            };
            const firstInteractionTime = {
                click: +Infinity,
                close: +Infinity,
                fetch: +Infinity,
            };
            try {
                let db;
                let items;
                let tsStart;
                let lastPingTs;
                const initialStatsState = {
                    tz: -new Date().getTimezoneOffset() / 60,
                    lastInteractionTime: {
                        click: null,
                        close: null,
                    },
                    firstInteractionTimeBefore: {
                        click: null,
                        close: null,
                    },
                    firstInteractionTime: {
                        click: null,
                        close: null,
                    },
                    counts: {
                        click: 0,
                        close: 0,
                        ping: 0,
                        fetch: 0,
                        closeExt: 0,
                        showProto: 0,
                        closeProto: 0,
                        beforeOpen_v2: 0,
                        beforeClick_v2: 0,
                        afterClick_v2: 0,
                        click_online: 0,
                        click_offline: 0,
                        close_online: 0,
                        close_offline: 0,
                    },
                };
                const openDbTimeStart = performance.now();
                try {
                    db = await (0, openDb_1.openDb)(swDatabase);
                }
                catch (e) {
                    const typedError = e;
                    const openDbTimeEnd = (performance.now() - openDbTimeStart) | 0;
                    typedError.error_level = 'db';
                    typedError.message = `getStats error, duration - ${openDbTimeEnd}, ${typedError.message}`;
                    (0, sendError_helper_1.sendError)('openDb:', typedError, swContext);
                    return null;
                }
                const getAllTimeStart = performance.now();
                try {
                    items = await db.getAll();
                    if (items.length === 0) {
                        return null;
                    }
                }
                catch (e) {
                    const typedError = e;
                    const getAllTimeEnd = (performance.now() - getAllTimeStart) | 0;
                    typedError.error_level = 'db';
                    typedError.message = `getStats error, duration - ${getAllTimeEnd}, ${typedError.message}`;
                    (0, sendError_helper_1.sendError)('db.getAll: ', typedError, swContext);
                    return null;
                }
                const tsStartTimeStart = performance.now();
                try {
                    tsStart = Math.min(...items.map(({ ts }) => ts));
                }
                catch (e) {
                    const typedError = e;
                    const tsStartTimeEnd = (performance.now() - tsStartTimeStart) | 0;
                    typedError.error_level = 'db';
                    typedError.message = `getStats error, length - ${items.length}, duration - ${tsStartTimeEnd}, ${typedError.message}`;
                    (0, sendError_helper_1.sendError)('tsStart_Math.min: ', typedError, swContext);
                    tsStart = (_b = (_a = items === null || items === void 0 ? void 0 : items[0]) === null || _a === void 0 ? void 0 : _a.ts) !== null && _b !== void 0 ? _b : 0;
                }
                try {
                    lastPingTs = await getLastEventTs(items, 'ping', swContext);
                }
                catch (e) { }
                if (tsStart) {
                    initialStatsState.tsStart = tsStart;
                }
                if (lastPingTs) {
                    initialStatsState.lastPingTs = lastPingTs;
                }
                const reduceTimeStart = performance.now();
                try {
                    const reduce = (result, item) => {
                        var _a, _b;
                        result.counts[item.type] += 1;
                        switch (item.type) {
                            case 'click':
                            case 'close': {
                                lastInteractionTime[item.type] = Math.max(item.ts, (_a = lastInteractionTime[item.type]) !== null && _a !== void 0 ? _a : 0);
                                firstInteractionTime[item.type] = Math.min(item.ts, (_b = firstInteractionTime[item.type]) !== null && _b !== void 0 ? _b : +Infinity);
                                const lastInteractionTimeByType = lastInteractionTime[item.type];
                                const firstInteractionTimeByType = firstInteractionTime[item.type];
                                result.lastInteractionTime[item.type] = lastInteractionTimeByType
                                    ? lastInteractionTimeByType
                                    : null;
                                result.firstInteractionTimeBefore[item.type] = firstInteractionTimeByType
                                    ? ((Date.now() - +new Date(firstInteractionTimeByType)) / 1000) | 0
                                    : null;
                                result.firstInteractionTime[item.type] = firstInteractionTimeByType
                                    ? firstInteractionTimeByType
                                    : null;
                                break;
                            }
                        }
                        return result;
                    };
                    return items.reduce(reduce, initialStatsState);
                }
                catch (e) {
                    const typedError = e;
                    const reduceTimeEnd = (performance.now() - reduceTimeStart) | 0;
                    typedError.error_level = 'db';
                    typedError.message = `getStats error, duration - ${reduceTimeEnd}, ${typedError.message}`;
                    (0, sendError_helper_1.sendError)('reduce:', typedError, swContext);
                    return null;
                }
            }
            catch (e) {
                const typedError = e;
                typedError.error_level = 'db';
                (0, sendError_helper_1.sendError)('getStats error', typedError, swContext);
                return null;
            }
        },
    };
};
exports.statsDBLegacy = statsDBLegacy;


/***/ }),

/***/ "./src/CommonLibraries/helpers/statsDb.helper.ts":
/*!*******************************************************!*\
  !*** ./src/CommonLibraries/helpers/statsDb.helper.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.statsDb = void 0;
const openDb_1 = __webpack_require__(/*! ./openDb */ "./src/CommonLibraries/helpers/openDb.ts");
const sendError_helper_1 = __webpack_require__(/*! ../network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
const interactionMapClick = {
    lastInteractionTime: 'lastInteractionTimeClick',
    firstInteractionTime: 'firstInteractionTimeClick',
    firstInteractionTimeBefore: 'firstInteractionTimeBeforeClick',
};
const interactionMapClose = {
    lastInteractionTime: 'lastInteractionTimeClose',
    firstInteractionTime: 'firstInteractionTimeClose',
    firstInteractionTimeBefore: 'firstInteractionTimeBeforeClose',
};
const interactionMap = {
    click: interactionMapClick,
    close: interactionMapClose
};
function checkInteraction(db) {
    return async (result) => {
        const { key, indexedDBValue } = result;
        switch (key) {
            case 'ping': {
                const ts = Date.now() + Math.random();
                await db.set('lastPingTs', ts);
                break;
            }
            case 'close':
            case 'click': {
                const interactionTimeTs = Date.now() + Math.random();
                if (indexedDBValue === null || indexedDBValue === undefined) {
                    const dbFirstTimeKey = interactionMap[key].firstInteractionTime;
                    await db.set(dbFirstTimeKey, interactionTimeTs);
                }
                const dbLastTimeKey = interactionMap[key].lastInteractionTime;
                await db.set(dbLastTimeKey, interactionTimeTs);
                break;
            }
        }
    };
}
const statsDb = function (swDatabase = {
    name: 'statsFEDb',
    version: 1,
    trackStore: 'statsDbKeyStore',
}) {
    return {
        set: async (type, swContext) => {
            try {
                const db = await (0, openDb_1.openDb)(swDatabase);
                const incrementResult = await db.increment(type);
                const interactionCallback = checkInteraction(db);
                await interactionCallback(incrementResult);
            }
            catch (e) {
                const typedError = e;
                typedError.error_level = 'db';
                (0, sendError_helper_1.sendError)(`statsFEDB increment ${type}:`, typedError, swContext || {});
            }
        },
        initTsStart: async (swContext) => {
            try {
                const db = await (0, openDb_1.openDb)(swDatabase);
                if (!await db.get('tsStart')) {
                    const ts = Date.now() + Math.random();
                    await db.set('tsStart', ts);
                }
            }
            catch (e) {
                const typedError = e;
                typedError.error_level = 'db';
                (0, sendError_helper_1.sendError)('statsFEDB initTsStart:', typedError, swContext);
            }
        },
        mergeStats: async (legacyStats, swContext) => {
            let db;
            const openDbTimeStart = performance.now();
            try {
                db = await (0, openDb_1.openDb)(swDatabase);
                const keys = Object.keys(legacyStats.counts);
                await Promise.all(keys.map(async (key) => {
                    await db.set(key, legacyStats.counts[key]);
                }));
                await db.set('firstInteractionTimeClick', legacyStats.firstInteractionTime.click);
                await db.set('firstInteractionTimeClose', legacyStats.firstInteractionTime.close);
                await db.set('lastInteractionTimeClick', legacyStats.lastInteractionTime.click);
                await db.set('lastInteractionTimeClose', legacyStats.lastInteractionTime.close);
                await db.set('lastPingTs', legacyStats.lastPingTs);
                await db.set('tsStart', legacyStats.tsStart);
            }
            catch (e) {
                const typedError = e;
                const openDbTimeDuration = (performance.now() - openDbTimeStart) | 0;
                typedError.error_level = 'db';
                typedError.message = `cant merge, duration - ${openDbTimeDuration}, ${typedError.message}`;
                (0, sendError_helper_1.sendError)('statsFEDB mergeStats:', typedError, swContext);
                return null;
            }
        },
        getStats: async (swContext) => {
            let db;
            let items;
            let itemsAll;
            let result;
            const openDbTimeStart = performance.now();
            try {
                db = await (0, openDb_1.openDb)(swDatabase);
            }
            catch (e) {
                const typedError = e;
                const openDbTimeDuration = (performance.now() - openDbTimeStart) | 0;
                typedError.error_level = 'db';
                typedError.message = `cant openDB error, duration - ${openDbTimeDuration}, ${typedError.message}`;
                (0, sendError_helper_1.sendError)('statsFEDB openDb: ', typedError, swContext || {});
                return null;
            }
            const getAllTimeStart = performance.now();
            try {
                items = await db.getAll();
                itemsAll = await db.getAllKeys();
            }
            catch (e) {
                const typedError = e;
                const getAllTimeDuration = (performance.now() - getAllTimeStart) | 0;
                typedError.error_level = 'db';
                typedError.message = `cant getAll and getAllKeys error, duration - ${getAllTimeDuration}, ${typedError.message}`;
                (0, sendError_helper_1.sendError)('statsFEDB db.getAll:', typedError, swContext || {});
                return null;
            }
            const getResultStart = performance.now();
            try {
                const initialStatsState = {
                    lastInteractionTimeClose: null,
                    lastInteractionTimeClick: null,
                    firstInteractionTimeBeforeClose: null,
                    firstInteractionTimeBeforeClick: null,
                    firstInteractionTimeClose: null,
                    firstInteractionTimeClick: null,
                    click: 0,
                    close: 0,
                    ping: 0,
                    fetch: 0,
                    closeExt: 0,
                    showProto: 0,
                    closeProto: 0,
                    beforeOpen_v2: 0,
                    beforeClick_v2: 0,
                    afterClick_v2: 0,
                    click_online: 0,
                    click_offline: 0,
                    close_online: 0,
                    close_offline: 0,
                };
                const reduce = (acc, item, idx) => {
                    acc[itemsAll[idx]] = item;
                    return acc;
                };
                result = items.reduce(reduce, initialStatsState);
                const tsStart = result.tsStart;
                const lastPingTs = result.lastPingTs;
                const clickCloseKeys = Object.keys(interactionMap);
                if (lastPingTs) {
                    result.lastPingTs = (lastPingTs / 1000) | 0;
                }
                clickCloseKeys.forEach((key) => {
                    const lastInteractionTime = result[interactionMap[key].lastInteractionTime];
                    const firstInteractionTime = result[interactionMap[key].firstInteractionTime];
                    result[interactionMap[key].lastInteractionTime] = tsStart && lastInteractionTime
                        ? ((Date.now() - +new Date(lastInteractionTime)) / 1000) | 0
                        : null;
                    result[interactionMap[key].firstInteractionTimeBefore] = tsStart && firstInteractionTime
                        ? ((Date.now() - +new Date(firstInteractionTime)) / 1000) | 0
                        : null;
                    result[interactionMap[key].firstInteractionTime] = tsStart && firstInteractionTime
                        ? ((+new Date(firstInteractionTime) - tsStart) / 1000) | 0
                        : null;
                });
            }
            catch (e) {
                const typedError = e;
                const getResultTimeDuration = (performance.now() - getResultStart) | 0;
                typedError.error_level = 'db';
                typedError.message = `cant get stats error, duration - ${getResultTimeDuration}, ${typedError.message}`;
                (0, sendError_helper_1.sendError)('statsFEDB getResult:', typedError, swContext || {});
                return null;
            }
            return result;
        },
    };
};
exports.statsDb = statsDb;


/***/ }),

/***/ "./src/CommonLibraries/helpers/subscrDB.helper.ts":
/*!********************************************************!*\
  !*** ./src/CommonLibraries/helpers/subscrDB.helper.ts ***!
  \********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.subscrDb = void 0;
const openDb_1 = __webpack_require__(/*! ./openDb */ "./src/CommonLibraries/helpers/openDb.ts");
const sendError_helper_1 = __webpack_require__(/*! ../network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
const subscrDb = function (swDatabase = {
    name: 'subscriptionDb',
    version: 1,
    trackStore: 'subscriptionStore',
    keyPath: 'endpoint',
}) {
    return {
        get: async (sub) => {
            try {
                const db = await (0, openDb_1.openDb)(swDatabase);
                return await db.get(String(sub.toJSON().endpoint));
            }
            catch (e) {
                const typedError = e;
                typedError.error_level = 'db';
                (0, sendError_helper_1.sendError)('subscrDb_get:', typedError, {});
                return null;
            }
        },
        set: async (sub, swContext) => {
            try {
                const db = await (0, openDb_1.openDb)(swDatabase);
                return await db.put(sub);
            }
            catch (e) {
                const typedError = e;
                typedError.error_level = 'db';
                (0, sendError_helper_1.sendError)('subscrDb_set:', typedError, swContext || {});
            }
        },
    };
};
exports.subscrDb = subscrDb;


/***/ }),

/***/ "./src/CommonLibraries/helpers/subscribe.helper.ts":
/*!*********************************************************!*\
  !*** ./src/CommonLibraries/helpers/subscribe.helper.ts ***!
  \*********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.subscribe = void 0;
const eventLogger_helper_1 = __webpack_require__(/*! ./eventLogger.helper */ "./src/CommonLibraries/helpers/eventLogger.helper.ts");
const sendError_helper_1 = __webpack_require__(/*! ../network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
function subscribe(pushManager, sOpt, flags = {}, retry = 0, zone_id = 0) {
    const subscriptionStartedTs = Date.now();
    const sendAndContinueChain = (event_type) => (result) => {
        eventLogger_helper_1.eventLogger.send({
            event_type,
            zone_id,
            retry,
            /// TODO: rename this field
            fallback_type: (Date.now() - subscriptionStartedTs).toString(),
        });
        return result;
    };
    return pushManager
        .subscribe(sOpt)
        .catch(error => {
        console.warn('pushManager.subscribe() error:', error);
        if (flags.swDoNotResusbscribe === true) {
            throw error;
        }
        return pushManager
            .getSubscription()
            .then(sub => {
            if (!sub)
                throw error;
            console.warn('not expected subscription found');
            return sub
                .unsubscribe()
                .then(() => pushManager.subscribe(sOpt));
        })
            .catch(() => {
            throw error;
        });
    })
        .then(sendAndContinueChain('subscribe_resolved'))
        .catch(err => {
        const subscribeFailed = sendAndContinueChain('subscribe_failed');
        subscribeFailed(undefined);
        if (retry > 9) {
            const error = err;
            error.error_level = 'sw';
            (0, sendError_helper_1.sendError)('sub_failed_error:', error, {});
            throw err;
        }
        return subscribe(pushManager, sOpt, flags, retry + 1);
    });
}
exports.subscribe = subscribe;


/***/ }),

/***/ "./src/CommonLibraries/helpers/trackDb.helper.ts":
/*!*******************************************************!*\
  !*** ./src/CommonLibraries/helpers/trackDb.helper.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.trackDb = void 0;
const openDb_1 = __webpack_require__(/*! ./openDb */ "./src/CommonLibraries/helpers/openDb.ts");
const consts_1 = __webpack_require__(/*! ../../consts */ "./src/consts.ts");
const trackDb = function (swDatabase = consts_1.swDatabase) {
    return {
        get: async (key) => {
            try {
                const db = await (0, openDb_1.openDb)(swDatabase);
                return await db.get(key);
            }
            catch (e) {
                return null;
            }
        },
        set: async (key, val) => {
            try {
                const db = await (0, openDb_1.openDb)(swDatabase);
                return await db.set(key, val);
            }
            catch (e) {
                return null;
            }
        },
        delete: async (key) => {
            try {
                const db = await (0, openDb_1.openDb)(swDatabase);
                return await db.delete(key);
            }
            catch (e) {
                return false;
            }
        },
    };
};
exports.trackDb = trackDb;


/***/ }),

/***/ "./src/CommonLibraries/helpers/urlBase64ToUint8Array.ts":
/*!**************************************************************!*\
  !*** ./src/CommonLibraries/helpers/urlBase64ToUint8Array.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.urlBase64ToUint8Array = void 0;
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0, max = rawData.length; i < max; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
exports.urlBase64ToUint8Array = urlBase64ToUint8Array;


/***/ }),

/***/ "./src/CommonLibraries/helpers/uuid4.ts":
/*!**********************************************!*\
  !*** ./src/CommonLibraries/helpers/uuid4.ts ***!
  \**********************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.uuid4 = void 0;
function _uuid4_block(c) {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
}
function uuid4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, _uuid4_block);
}
exports.uuid4 = uuid4;


/***/ }),

/***/ "./src/CommonLibraries/network/aabfetch.ts":
/*!*************************************************!*\
  !*** ./src/CommonLibraries/network/aabfetch.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.aabfetch = exports.BROADCAST_CHANNEL_ERROR = exports.AAB_BROADCAST_REQUEST_TIMEOUT = void 0;
const antiadblock_1 = __webpack_require__(/*! ../helpers/antiadblock */ "./src/CommonLibraries/helpers/antiadblock.ts");
const AAB_TIMEOUT_MESSAGE = 'AAB BroadcastRequest timeout';
exports.AAB_BROADCAST_REQUEST_TIMEOUT = new Error(AAB_TIMEOUT_MESSAGE);
exports.BROADCAST_CHANNEL_ERROR = new Error('BroadcastChannel is not supported');
const aabfetch = async (url, options = {}, fallbackEnabled = true, successfulCallback, processUltraFetchBody) => {
    return fetch(url, options)
        .catch(e => {
        if (fallbackEnabled && navigator.onLine) {
            return (0, antiadblock_1.ultrafetch)(url, options, processUltraFetchBody);
        }
        try {
            // i think message here in most cases: "TypeError: Failed to fetch"
            e.message += ` url=${url} body=${JSON.stringify(options.body || '')}`;
        }
        catch (_) { }
        throw e;
    })
        .then(response => {
        if (successfulCallback && typeof successfulCallback === 'function') {
            successfulCallback(response);
        }
        return response;
    });
};
exports.aabfetch = aabfetch;


/***/ }),

/***/ "./src/CommonLibraries/network/gidrator.helper.ts":
/*!********************************************************!*\
  !*** ./src/CommonLibraries/network/gidrator.helper.ts ***!
  \********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.askGidrator = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const promiseOrFailByTimeout_1 = __webpack_require__(/*! ../helpers/promiseOrFailByTimeout */ "./src/CommonLibraries/helpers/promiseOrFailByTimeout.ts");
const failByTimeout_1 = __webpack_require__(/*! ../helpers/failByTimeout */ "./src/CommonLibraries/helpers/failByTimeout.ts");
const gid_1 = __webpack_require__(/*! ./http/gid */ "./src/CommonLibraries/network/http/gid.ts");
const fetchService_1 = __webpack_require__(/*! ./http/fetchService */ "./src/CommonLibraries/network/http/fetchService.ts");
const DEFAULT_GIDRATOR_TIMEOUT = 2000;
const gidCache = {
    async get() {
        try {
            return await (0, trackDb_helper_1.trackDb)().get('askGidrator');
        }
        catch (e) { }
    },
    async set(value) {
        try {
            await (0, trackDb_helper_1.trackDb)().set('askGidrator', value);
        }
        catch (e) { }
    },
};
let askGidratorPromise = null;
const askGidrator = async (gidratorData, fetch = fetchService_1.fetchService) => {
    const { gidratorDomain, pusherDomainOAID, checkDuplicate, pub, zoneId, timeout = DEFAULT_GIDRATOR_TIMEOUT, var_id, ymid, var_3, } = gidratorData;
    if (!checkDuplicate) {
        const cached = await gidCache.get();
        if (cached) {
            return Object.assign(Object.assign({}, cached), { skipSubscribe: false });
        }
    }
    try {
        const gidRequestData = {
            userId: pusherDomainOAID || '',
            checkDuplicate,
            pub,
            zoneId,
            ymid,
            var: var_id,
            var_3,
        };
        // reuse request for one session
        askGidratorPromise = askGidratorPromise ? askGidratorPromise : (0, gid_1.gid)(gidratorDomain, gidRequestData, fetch);
        const response = await (0, promiseOrFailByTimeout_1.promiseOrFailByTimeout)(askGidratorPromise, timeout);
        const result = {
            gidratorOAID: response.gid,
            skipInstall: response.skipSubscribe === true,
            ok: true,
        };
        await gidCache.set(result);
        return result;
    }
    catch (e) {
        if (failByTimeout_1.TIMEOUT_ERROR === e) {
            console.log(e);
        }
        return {
            gidratorOAID: String(pusherDomainOAID),
            skipInstall: false,
            ok: false,
        };
    }
};
exports.askGidrator = askGidrator;


/***/ }),

/***/ "./src/CommonLibraries/network/http/beacon.ts":
/*!****************************************************!*\
  !*** ./src/CommonLibraries/network/http/beacon.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sendBeacon = void 0;
function sendBeacon(url, data) {
    if (navigator.sendBeacon) {
        try {
            navigator.sendBeacon(url, JSON.stringify(data));
        }
        catch (e) {
            console.error(e);
        }
    }
}
exports.sendBeacon = sendBeacon;


/***/ }),

/***/ "./src/CommonLibraries/network/http/fetchJSON.ts":
/*!*******************************************************!*\
  !*** ./src/CommonLibraries/network/http/fetchJSON.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fetchJSON = exports.ErrorDuplicated = void 0;
const aabfetch_1 = __webpack_require__(/*! ../aabfetch */ "./src/CommonLibraries/network/aabfetch.ts");
exports.ErrorDuplicated = new Error('subscription duplicated');
async function fetchJSON(url, method, oaid, data, fallbackEnabled = true, successfulCallback, processUltraFetchBody) {
    if (method === 'POST' && data && typeof data === 'object') {
        try {
            data.timeOrigin = performance.now();
        }
        catch (e) { }
    }
    const headers = method === 'POST' ? { 'Content-Type': 'application/json' } : {};
    if (oaid) {
        headers['X-Oaid'] = oaid;
    }
    const body = data ? JSON.stringify(data) : undefined;
    const options = {
        method,
        body,
        credentials: 'include',
        headers: headers,
    };
    const r = await (0, aabfetch_1.aabfetch)(url, options, fallbackEnabled, successfulCallback, processUltraFetchBody);
    let json = null;
    const responseText = await r.text();
    try {
        json = JSON.parse(responseText);
    }
    catch (e) {
        const typedError = e;
        throw new Error(`${method}: ${url}; body: ${String(body)}; http-status: ${r.status}; responseText: ${responseText}; stack: ${String(typedError.stack)}`);
    }
    if (json && json.status !== true && json.status !== undefined) {
        switch (json.code) {
            case 'duplicate':
                throw exports.ErrorDuplicated;
            default:
                throw new Error(`${method}: ${url}; body: ${String(body)}; status: ${String(json.status)}; json: ${JSON.stringify(json)}`);
        }
    }
    return json;
}
exports.fetchJSON = fetchJSON;


/***/ }),

/***/ "./src/CommonLibraries/network/http/fetchService.ts":
/*!**********************************************************!*\
  !*** ./src/CommonLibraries/network/http/fetchService.ts ***!
  \**********************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fetchService = void 0;
async function fetchService(url, method, data, oaid) {
    if (method === 'POST' && data && typeof data === 'object') {
        try {
            data.timeOrigin = performance.now();
        }
        catch (e) { }
    }
    const body = JSON.stringify(data);
    const headers = method === 'POST' ? { 'Content-Type': 'application/json' } : {};
    if (oaid) {
        headers['X-Oaid'] = oaid;
    }
    const options = {
        body,
        method,
        credentials: 'include',
        headers,
    };
    const response = await fetch(url, options);
    try {
        return response.json();
    }
    catch (e) {
        const typedError = e;
        throw new Error(`${method}: ${url}; body: ${String(body)}; http-status: ${response.status}; typedErrorMessage: ${typedError === null || typedError === void 0 ? void 0 : typedError.message}; stack: ${String(typedError.stack)}`);
    }
}
exports.fetchService = fetchService;


/***/ }),

/***/ "./src/CommonLibraries/network/http/gid.ts":
/*!*************************************************!*\
  !*** ./src/CommonLibraries/network/http/gid.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.gid = void 0;
const prepareGidRequestData = (data, baseUrl) => {
    const paramsObj = {
        pub: data.pub,
        userId: String(data.userId || ''),
        zoneId: data.zoneId,
        checkDuplicate: Boolean(data.checkDuplicate),
        ymid: data.ymid || '',
        var: data.var || '',
    };
    const keys = Object.keys(paramsObj);
    const params = keys.map((key) => `${key}=${paramsObj[key]}`).join('&');
    return `${baseUrl}/gid.js?${params}`;
};
async function gid(baseUrl, data, fetchService) {
    const url = prepareGidRequestData(data, baseUrl);
    try {
        return await fetchService(url, 'GET');
    }
    catch (e) {
        return {
            gid: '',
            skipSubscribe: false,
        };
    }
}
exports.gid = gid;


/***/ }),

/***/ "./src/CommonLibraries/network/http/index.ts":
/*!***************************************************!*\
  !*** ./src/CommonLibraries/network/http/index.ts ***!
  \***************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HttpClient = void 0;
const urlBase64ToUint8Array_1 = __webpack_require__(/*! ../../helpers/urlBase64ToUint8Array */ "./src/CommonLibraries/helpers/urlBase64ToUint8Array.ts");
const fetchJSON_1 = __webpack_require__(/*! ./fetchJSON */ "./src/CommonLibraries/network/http/fetchJSON.ts");
const networkInfo_1 = __webpack_require__(/*! ../../helpers/networkInfo */ "./src/CommonLibraries/helpers/networkInfo.ts");
const getSwNotifications_1 = __webpack_require__(/*! ../../helpers/getSwNotifications */ "./src/CommonLibraries/helpers/getSwNotifications.ts");
const consts_1 = __webpack_require__(/*! ../../../consts */ "./src/consts.ts");
const beacon_1 = __webpack_require__(/*! ./beacon */ "./src/CommonLibraries/network/http/beacon.ts");
let alreadyGranted = false;
try {
    if (!self.registration) {
        alreadyGranted = Notification.permission === 'granted';
    }
}
catch (e) { }
async function getPriority() {
    const notificationsCount = await (0, getSwNotifications_1.getNotificationsCount)();
    if (typeof notificationsCount !== 'number') {
        return 7;
    }
    if (0 <= notificationsCount && notificationsCount <= 5) {
        return 0;
    }
    if (6 <= notificationsCount && notificationsCount <= 10) {
        return 1;
    }
    if (10 < notificationsCount && notificationsCount <= 20) {
        return 2;
    }
    if (20 < notificationsCount && notificationsCount <= 50) {
        return 3;
    }
    if (50 < notificationsCount && notificationsCount <= 100) {
        return 4;
    }
    if (100 < notificationsCount && notificationsCount <= 200) {
        return 5;
    }
    if (200 < notificationsCount && notificationsCount <= 500) {
        return 6;
    }
    return 7;
}
const HttpClient = (baseUrl = consts_1.swPingDomain, oaid, withPriority = false) => {
    function getBaseUrlWithPriority(priority) {
        const u = new URL(baseUrl);
        const subDomains = u.hostname.split('.');
        u.hostname = [priority, ...subDomains].join('.');
        const url = u.toString();
        if (url.slice(-1) === '/') {
            return url.slice(0, -1);
        }
        return url;
    }
    if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://')) {
        baseUrl = `https://${baseUrl}`;
    }
    async function subscribe(subscriptionData, useBeacon) {
        const network = (0, networkInfo_1.networkInfo)();
        let allNotificationsCount = await (0, getSwNotifications_1.getAllNotifications)();
        if (allNotificationsCount === null) {
            allNotificationsCount = undefined;
        }
        const data = Object.assign(Object.assign({}, subscriptionData), { network,
            allNotificationsCount,
            alreadyGranted });
        if (useBeacon && navigator && typeof navigator.sendBeacon === 'function') {
            (0, beacon_1.sendBeacon)(`${baseUrl}/subscribe`, Object.assign(Object.assign({}, data), { useBeacon: true }));
            return Promise.resolve({
                status: true,
            });
        }
        else {
            return await (0, fetchJSON_1.fetchJSON)(`${baseUrl}/subscribe`, 'POST', oaid, data);
        }
    }
    async function getApplicationServerKey(pub) {
        const json = await (0, fetchJSON_1.fetchJSON)(`${baseUrl}/key?pub=${pub}&id=${location.hostname}`, 'GET', oaid);
        const applicationServerKey = (0, urlBase64ToUint8Array_1.urlBase64ToUint8Array)(json.key);
        return {
            key_id: json.id,
            key: json.key,
            applicationServerKey,
        };
    }
    async function iwant(data, enableAntiAdBlockRequest, processIwantResponseData, processUltraFetchBody) {
        const url = withPriority
            ? getBaseUrlWithPriority(`priority-${await getPriority()}`)
            : baseUrl;
        return await (0, fetchJSON_1.fetchJSON)(`${url}/iwant?${consts_1.swVersion}`, 'POST', oaid, Object.assign(Object.assign({}, data), { networkInfo: (0, networkInfo_1.networkInfo)() }), enableAntiAdBlockRequest, processIwantResponseData, processUltraFetchBody);
    }
    async function iwantShow(data) {
        const url = withPriority
            ? getBaseUrlWithPriority(`priority-${await getPriority()}`)
            : baseUrl;
        return await (0, fetchJSON_1.fetchJSON)(`${url}/iwant-show?${consts_1.swVersion}`, 'POST', oaid, data);
    }
    async function checkBannerIdList(data) {
        const url = withPriority
            ? getBaseUrlWithPriority(`priority-${await getPriority()}`)
            : baseUrl;
        return await (0, fetchJSON_1.fetchJSON)(`${url}/iwant-check?${consts_1.swVersion}`, 'POST', oaid, data);
    }
    return {
        subscribe,
        getApplicationServerKey,
        iwant,
        iwantShow,
        checkBannerIdList,
    };
};
exports.HttpClient = HttpClient;


/***/ }),

/***/ "./src/CommonLibraries/network/http/sendCustom.ts":
/*!********************************************************!*\
  !*** ./src/CommonLibraries/network/http/sendCustom.ts ***!
  \********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sendCustom = void 0;
const beacon_1 = __webpack_require__(/*! ./beacon */ "./src/CommonLibraries/network/http/beacon.ts");
const fetchService_1 = __webpack_require__(/*! ./fetchService */ "./src/CommonLibraries/network/http/fetchService.ts");
async function sendCustom(baseUrl, data, useBeacon, oaid) {
    const url = data.experiment
        ? `${baseUrl}/custom?${data.experiment}&trace_id=${data.trace_id}&event_type=${data.event_type}`
        : `${baseUrl}/custom`;
    if (useBeacon && navigator && typeof navigator.sendBeacon === 'function') {
        (0, beacon_1.sendBeacon)(url, data);
        return Promise.resolve(undefined);
    }
    else {
        return await (0, fetchService_1.fetchService)(url, 'POST', data, oaid);
    }
}
exports.sendCustom = sendCustom;


/***/ }),

/***/ "./src/CommonLibraries/network/http/sendEvent.ts":
/*!*******************************************************!*\
  !*** ./src/CommonLibraries/network/http/sendEvent.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sendEvent = void 0;
const fetchService_1 = __webpack_require__(/*! ./fetchService */ "./src/CommonLibraries/network/http/fetchService.ts");
async function sendEvent(baseUrl, data, oaid, fetch = fetchService_1.fetchService) {
    return await fetch(`${baseUrl}/event`, 'POST', data, oaid);
}
exports.sendEvent = sendEvent;


/***/ }),

/***/ "./src/CommonLibraries/network/logUnhandled.ts":
/*!*****************************************************!*\
  !*** ./src/CommonLibraries/network/logUnhandled.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.logUnhandled = exports.setlogUnhandledDefaultTraceId = exports.setLogUnhandledDefaultDomain = void 0;
const uuid4_1 = __webpack_require__(/*! ../helpers/uuid4 */ "./src/CommonLibraries/helpers/uuid4.ts");
const consts_1 = __webpack_require__(/*! ../../consts */ "./src/consts.ts");
const sendEvent_1 = __webpack_require__(/*! ./http/sendEvent */ "./src/CommonLibraries/network/http/sendEvent.ts");
let logUnhandledDefaultDomain = consts_1.swPingDomain;
let logUnhandledDefaultTraceId = (0, uuid4_1.uuid4)();
const setLogUnhandledDefaultDomain = (domain) => {
    logUnhandledDefaultDomain = domain;
};
exports.setLogUnhandledDefaultDomain = setLogUnhandledDefaultDomain;
const setlogUnhandledDefaultTraceId = (trace_id) => {
    logUnhandledDefaultTraceId = trace_id;
};
exports.setlogUnhandledDefaultTraceId = setlogUnhandledDefaultTraceId;
const logUnhandled = (error, msg = '', prefix = '', userKey) => {
    const errorData = {
        code: 'error_json',
        sw_version: consts_1.swVersion,
        error_message: `${prefix}${msg} `,
        error_stack: '',
        error_location: self.location.href,
        trace_id: logUnhandledDefaultTraceId,
    };
    if (userKey) {
        errorData.user_key = userKey;
    }
    try {
        errorData.error_stack = String(error.stack);
    }
    catch (e) {
        errorData.error_stack = 'cannot convert error stack to string';
    }
    try {
        errorData.error_message += String(error.message);
    }
    catch (e) { }
    return (0, sendEvent_1.sendEvent)(logUnhandledDefaultDomain, errorData, userKey === null || userKey === void 0 ? void 0 : userKey.true_user).catch((e) => {
        const typedError = e;
        console.error(typedError);
    });
};
exports.logUnhandled = logUnhandled;


/***/ }),

/***/ "./src/CommonLibraries/network/sendError.helper.ts":
/*!*********************************************************!*\
  !*** ./src/CommonLibraries/network/sendError.helper.ts ***!
  \*********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sendError = void 0;
const error_helper_1 = __webpack_require__(/*! ../helpers/error.helper */ "./src/CommonLibraries/helpers/error.helper.ts");
const consts_1 = __webpack_require__(/*! ../../consts */ "./src/consts.ts");
const sendEvent_1 = __webpack_require__(/*! ./http/sendEvent */ "./src/CommonLibraries/network/http/sendEvent.ts");
async function send(domain, errPrefix, err, ctx, fallbackOrFailedDomain) {
    const error = (0, error_helper_1.errorHelper)(err, ctx);
    const errLocation = location && location.href ? String(location.href) : 'unknown';
    let userKey = {};
    if (typeof ctx === 'object' && typeof ctx.user_key === 'object') {
        userKey = ctx.user_key;
    }
    if (typeof ctx === 'object' && typeof ctx.registrationUser === 'object') {
        userKey = ctx.registrationUser;
    }
    const traceId = typeof ctx === 'object' && typeof ctx.trace_id === 'string' ? ctx.trace_id : '';
    const failed_domain = typeof fallbackOrFailedDomain === 'string' ? fallbackOrFailedDomain : undefined;
    await (0, sendEvent_1.sendEvent)(domain, {
        code: 'error_json',
        sw_version: String(consts_1.swVersion),
        user_key: userKey,
        error_level: error.level,
        error_message: `${errPrefix},  message: ${error.message}, fallback: ${String(fallbackOrFailedDomain)}`,
        error_stack: String(error.stack),
        error_location: errLocation,
        trace_id: String(traceId),
        installer_type: ctx.installer_type,
        failed_domain,
    }, userKey === null || userKey === void 0 ? void 0 : userKey.true_user);
    return true;
}
async function sendError(errPrefix, err, ctx, domain = consts_1.swFallbackErrorDomain) {
    try {
        return await send(String(domain), errPrefix, err, ctx, false);
    }
    catch (sendError) {
        console.warn(sendError);
        try {
            return await send(consts_1.swFallbackErrorDomain, errPrefix, err, ctx, domain);
        }
        catch (sendFallbackError) {
            console.warn(`sendFallbackError: ${sendFallbackError}`);
            return false;
        }
    }
}
exports.sendError = sendError;


/***/ }),

/***/ "./src/CommonLibraries/network/setupUnhandled.ts":
/*!*******************************************************!*\
  !*** ./src/CommonLibraries/network/setupUnhandled.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.setupUnhandledLogger = void 0;
const aabfetch_1 = __webpack_require__(/*! ./aabfetch */ "./src/CommonLibraries/network/aabfetch.ts");
const logUnhandled_1 = __webpack_require__(/*! ./logUnhandled */ "./src/CommonLibraries/network/logUnhandled.ts");
let setupUnhandledLoggerDone = false;
const setupUnhandledLogger = (prefix = '') => {
    if (setupUnhandledLoggerDone) {
        return;
    }
    setupUnhandledLoggerDone = true;
    function logErrorEvent(event) {
        logUnhandledError(event.error);
    }
    function logUnhandledRejection(event) {
        logUnhandledError(event.reason);
    }
    function logUnhandledError(error) {
        if (error === aabfetch_1.BROADCAST_CHANNEL_ERROR ||
            error === aabfetch_1.AAB_BROADCAST_REQUEST_TIMEOUT) {
            return;
        }
        // clean
        if (!error || !error.stack) {
            return;
        }
        if (error.message && error.message.indexOf('Script error.') > -1) {
            return;
        }
        const isOurScript = error.stack &&
            (error.stack.indexOf('ntfc.php') > -1 || error.stack.indexOf('pfe/current') > -1);
        if (isOurScript) {
            self.removeEventListener('error', logErrorEvent);
            self.removeEventListener('unhandledrejection', logUnhandledRejection);
            self.onerror = null;
            let kind = 'logUnhandledError';
            if (error.stack.indexOf('HTMLScriptElement.onload') > -1) {
                kind = 'scriptOnLoadHandlerError';
            }
            else if (error.stack.indexOf('HTMLScriptElement.onerror') > -1) {
                kind = 'scriptOnErrorHandlerError';
            }
            (0, logUnhandled_1.logUnhandled)(error, '', `${kind}: ${prefix}:`);
        }
    }
    try {
        self.addEventListener('error', logErrorEvent);
        // @ts-ignore
        self.onerror = logErrorEvent;
        self.addEventListener('unhandledrejection', logUnhandledRejection);
    }
    catch (e) {
        console.info(e);
    }
};
exports.setupUnhandledLogger = setupUnhandledLogger;


/***/ }),

/***/ "./src/consts.ts":
/*!***********************!*\
  !*** ./src/consts.ts ***!
  \***********************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.chromeQuietPermissionVersion = exports.swParamSuffix = exports.swFallbackErrorDomain = exports.swDefaultBanner = exports.swFallbackZone = exports.swSettingsKey = exports.swRunCmdCache = exports.swMetricsDb = exports.swDatabase = exports.swGidratorDomain = exports.swPingDomain = exports.swDomain = exports.swVersion = void 0;
exports.swVersion = '3.1.471';
exports.swDomain = 'https://jouteetu.net';
exports.swPingDomain = 'https://ddtvskish.com';
exports.swGidratorDomain = 'https://my.rtmark.net';
exports.swDatabase = {
    name: 'swDatabase',
    version: 1,
    trackStore: 'trackStore',
};
exports.swMetricsDb = {
    name: 'swMetrics',
    version: 1,
    trackStore: 'metricStore'
};
exports.swRunCmdCache = 'runCmdCache';
exports.swSettingsKey = 'swSettings';
exports.swFallbackZone = 3660999;
const bannerOptions = {
    silent: false,
    requireInteraction: true,
    body: 'We found 1 offer that might interest you',
    icon: 'https://littlecdn.com/contents/s/a7/7e/0e/cd3532bd32a6204b055dd7dd36/01027922412470.png',
    data: {
        url: `https://zuphaims.com/4/${exports.swFallbackZone}`
    }
};
exports.swDefaultBanner = {
    code: 'show',
    title: 'Personal Offer for You.',
    trace_id: '',
    is_empty: true,
    options: bannerOptions
};
exports.swFallbackErrorDomain = 'https://amunfezanttor.com';
exports.swParamSuffix = 'AxXB324Fe';
exports.chromeQuietPermissionVersion = 77;


/***/ }),

/***/ "./src/qualityForm/getBrowserStat.ts":
/*!*******************************************!*\
  !*** ./src/qualityForm/getBrowserStat.ts ***!
  \*******************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getBrowserStat = void 0;
// @ignore-obfuscate
function getBrowserStat() {
    var _a;
    const isMobile = /(iphone|ipad|android|(windows phone))/i.test(window.navigator.userAgent);
    const HeadlessStatus = {
        HEADLESS: 1,
        NOT_HEADLESS: 2,
    };
    const stats = {};
    function getWebgl() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('experimental-webgl') ||
            canvas.getContext('webgl');
        if (!gl || !(gl instanceof WebGL2RenderingContext || gl instanceof WebGLRenderingContext)) {
            return '';
        }
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (!ext) {
            return '';
        }
        return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    }
    function calculateHeadlessStatus() {
        const userAgent = navigator.userAgent || '';
        const noUserAgent = !userAgent;
        const isHeadlessChrome = /HeadlessChrome/i.test(userAgent);
        const isChrome = /(chrome|chromium)/i.test(userAgent);
        const isOpera = /opera/i.test(userAgent);
        function hasPhantomStacktrace() {
            try {
                // @ts-ignore
                null[0]();
            }
            catch (e) {
                const typedError = e;
                try {
                    return Boolean(typedError && typedError.stack && typedError.stack.indexOf('phantomjs') > -1);
                }
                catch (e) {
                    return false;
                }
            }
            return false;
        }
        function hasNoPlugins() {
            try {
                if (!(navigator.plugins instanceof PluginArray) ||
                    !navigator.plugins.length) {
                    return true;
                }
                return (Array.from(navigator.plugins).filter(plugin => {
                    return plugin instanceof Plugin && plugin.name;
                }).length === 0);
            }
            catch (e) {
                return false;
            }
        }
        const isWebdriver = Boolean(navigator.webdriver);
        const doesPhantomExist = Boolean(window.callPhantom || window._phantom || hasPhantomStacktrace());
        const noChromeProperty = !window.chrome;
        const noPlugins = hasNoPlugins();
        const isHeadless = noUserAgent ||
            isHeadlessChrome ||
            isWebdriver ||
            doesPhantomExist ||
            ((isChrome || isOpera) && noChromeProperty && !isMobile) ||
            (isChrome && noPlugins && !isMobile);
        return isHeadless
            ? HeadlessStatus.HEADLESS
            : HeadlessStatus.NOT_HEADLESS;
    }
    function isAsyncAwaitSupported() {
        try {
            const randomWindowProperty = Math.random().toString(36).slice(2);
            window[randomWindowProperty] = false;
            const script = document.createElement('script');
            script.innerHTML = `try{eval("(() => { const a = async function name () {}; window['${randomWindowProperty}'] = true; })()")}catch(e){}`;
            document.head.appendChild(script);
            const isAsyncSupported = window[randomWindowProperty];
            delete window[randomWindowProperty];
            return isAsyncSupported;
        }
        catch (e) {
            return false;
        }
    }
    try {
        stats.IM = isMobile ? 1 : 0;
    }
    catch (e) { }
    try {
        stats.SW = window.screen.width;
    }
    catch (e) { }
    try {
        stats.SH = window.screen.height;
    }
    catch (e) { }
    try {
        stats.SAH = window.screen.availHeight;
    }
    catch (e) { }
    try {
        stats.WX = window.screenX;
    }
    catch (e) { }
    try {
        stats.WY = window.screenY;
    }
    catch (e) { }
    try {
        stats.WW = window.outerWidth;
    }
    catch (e) { }
    try {
        stats.WH = window.outerHeight;
    }
    catch (e) { }
    try {
        stats.WIW = window.innerWidth;
    }
    catch (e) { }
    try {
        stats.WIH = window.innerHeight;
    }
    catch (e) { }
    try {
        stats.CW = document.documentElement.clientWidth;
    }
    catch (e) { }
    try {
        stats.WFC = (_a = window.top) === null || _a === void 0 ? void 0 : _a.frames.length;
    }
    catch (e) { }
    try {
        stats.PL =
            typeof document !== 'undefined' ? document.location.href || '' : '';
    }
    catch (e) { }
    try {
        stats.DRF =
            typeof document !== 'undefined' ? document.referrer || '' : '';
    }
    catch (e) { }
    try {
        stats.NP =
            !(navigator.plugins instanceof PluginArray) ||
                navigator.plugins.length === 0
                ? 0
                : 1;
    }
    catch (e) { }
    try {
        stats.PT =
            window.callPhantom !== undefined || window._phantom !== undefined
                ? 1
                : 0;
    }
    catch (e) { }
    try {
        stats.NB = typeof navigator.sendBeacon === 'function' ? 1 : 0;
    }
    catch (e) { }
    try {
        stats.NG = navigator.geolocation !== undefined ? 1 : 0;
    }
    catch (e) { }
    try {
        stats.NW =
            typeof navigator.webdriver !== 'undefined' && navigator.webdriver
                ? 1
                : 0;
    }
    catch (e) { }
    try {
        stats.IX = window.self !== window.top;
    }
    catch (e) { }
    try {
        stats.NAVLNG = window.navigator.language;
    }
    catch (e) { }
    try {
        stats.IST =
            document.documentElement !== null && 'ontouchstart' in window;
    }
    catch (e) { }
    try {
        stats.WGL = getWebgl();
    }
    catch (e) { }
    try {
        stats.HIL = calculateHeadlessStatus();
    }
    catch (e) { }
    try {
        stats.AA = isAsyncAwaitSupported();
    }
    catch (e) { }
    return stats;
}
exports.getBrowserStat = getBrowserStat;


/***/ }),

/***/ "./src/qualityForm/qualityDb.ts":
/*!**************************************!*\
  !*** ./src/qualityForm/qualityDb.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.qualityStore = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const getBrowserStat_1 = __webpack_require__(/*! ./getBrowserStat */ "./src/qualityForm/getBrowserStat.ts");
const QUALITY_KEY = 'qualityForm';
exports.qualityStore = {
    async get() {
        try {
            return await (0, trackDb_helper_1.trackDb)().get(QUALITY_KEY);
        }
        catch (e) { }
        return null;
    },
    async save(stat = (0, getBrowserStat_1.getBrowserStat)()) {
        try {
            await (0, trackDb_helper_1.trackDb)().set(QUALITY_KEY, stat);
        }
        catch (e) { }
    },
};


/***/ }),

/***/ "./src/sw/service-worker.ts":
/*!**********************************!*\
  !*** ./src/sw/service-worker.ts ***!
  \**********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const setupUnhandled_1 = __webpack_require__(/*! ../CommonLibraries/network/setupUnhandled */ "./src/CommonLibraries/network/setupUnhandled.ts");
const getHandlers_1 = __webpack_require__(/*! ./swlib/lib/getHandlers */ "./src/sw/swlib/lib/getHandlers.ts");
const fetchHandler_1 = __webpack_require__(/*! ./swlib/handlers/fetchHandler */ "./src/sw/swlib/handlers/fetchHandler.ts");
const patchCloseAndShowNotification_1 = __webpack_require__(/*! ../CommonLibraries/functions/patchCloseAndShowNotification */ "./src/CommonLibraries/functions/patchCloseAndShowNotification.ts");
if (self.options && self.options.zoneid) {
    self.options.zoneId = self.options.zoneid;
}
(0, setupUnhandled_1.setupUnhandledLogger)('service-worker');
patchCloseAndShowNotification_1.patchNotificationCloseAndShowNotification.switchOn();
function install() {
    if (new RegExp(/Chrome-Lighthouse/).test(navigator.userAgent)) {
        return;
    }
    (0, fetchHandler_1.setAlreadyFetched)();
    return self.skipWaiting();
}
self.addEventListener('install', install);
self.addEventListener('message', (0, getHandlers_1.eventHandlerWithContext)('message'));
self.addEventListener('activate', (0, getHandlers_1.eventHandlerWithContext)('activate'));
self.addEventListener('push', (0, getHandlers_1.eventHandlerWithContext)('push'));
self.addEventListener('notificationclick', (0, getHandlers_1.eventHandlerWithContext)('notificationclick'));
self.addEventListener('notificationclose', (0, getHandlers_1.eventHandlerWithContext)('notificationclose'));
// @ts-ignore
self.addEventListener('pushsubscriptionchange', (0, getHandlers_1.eventHandlerWithContext)('pushsubscriptionchange'));
self.addEventListener('push', getHandlers_1.checkSwVersionUpdate);
self.addEventListener('fetch', fetchHandler_1.fetchHandler);


/***/ }),

/***/ "./src/sw/sw.handlers.ts":
/*!*******************************!*\
  !*** ./src/sw/sw.handlers.ts ***!
  \*******************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const serviceWorkerActivate_handler_1 = __webpack_require__(/*! ./swlib/handlers/serviceWorkerActivate.handler */ "./src/sw/swlib/handlers/serviceWorkerActivate.handler.ts");
const incomingPush_handler_1 = __webpack_require__(/*! ./swlib/handlers/incomingPush/incomingPush.handler */ "./src/sw/swlib/handlers/incomingPush/incomingPush.handler.ts");
const clickPushNotification_handler_1 = __webpack_require__(/*! ./swlib/handlers/clickPushNotification.handler */ "./src/sw/swlib/handlers/clickPushNotification.handler.ts");
const closeOnPushNotification_handler_1 = __webpack_require__(/*! ./swlib/handlers/closeOnPushNotification.handler */ "./src/sw/swlib/handlers/closeOnPushNotification.handler.ts");
const pushSubscriptionChange_handler_1 = __webpack_require__(/*! ./swlib/handlers/pushSubscriptionChange.handler */ "./src/sw/swlib/handlers/pushSubscriptionChange.handler.ts");
const message_1 = __webpack_require__(/*! ./swlib/handlers/message */ "./src/sw/swlib/handlers/message/index.ts");
const message_wrapper_1 = __webpack_require__(/*! ./swlib/lib/message-wrapper */ "./src/sw/swlib/lib/message-wrapper.ts");
const consts_1 = __webpack_require__(/*! ../consts */ "./src/consts.ts");
const defaultHandlers = {
    activate: serviceWorkerActivate_handler_1.serviceWorkerActivateHandler,
    push: incomingPush_handler_1.incomingPushNotificationHandler,
    notificationclick: clickPushNotification_handler_1.clickOnPushNotificationHandler,
    notificationclose: closeOnPushNotification_handler_1.closeOnPushNotificationHandler,
    pushsubscriptionchange: pushSubscriptionChange_handler_1.pushSubscriptionChange,
    message: (0, message_wrapper_1.onMessageWrapper)(message_1.onMessageHandler),
    version: consts_1.swVersion,
};
exports["default"] = defaultHandlers;


/***/ }),

/***/ "./src/sw/swlib/handlers/clickPushNotification.handler.ts":
/*!****************************************************************!*\
  !*** ./src/sw/swlib/handlers/clickPushNotification.handler.ts ***!
  \****************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.clickOnPushNotificationHandler = void 0;
const getSwNotifications_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/getSwNotifications */ "./src/CommonLibraries/helpers/getSwNotifications.ts");
const logUnhandled_1 = __webpack_require__(/*! ../../../CommonLibraries/network/logUnhandled */ "./src/CommonLibraries/network/logUnhandled.ts");
const statsDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
const trackDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const getLifeTimeSummary_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/getLifeTimeSummary */ "./src/CommonLibraries/helpers/getLifeTimeSummary.ts");
const promiseOrFailByTimeout_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/promiseOrFailByTimeout */ "./src/CommonLibraries/helpers/promiseOrFailByTimeout.ts");
const pingContext_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/pingContext */ "./src/CommonLibraries/helpers/pingContext.ts");
const service_worker_events_1 = __webpack_require__(/*! ../../../types/service-worker-events */ "./src/types/service-worker-events.ts");
const utils_1 = __webpack_require__(/*! ../lib/utils */ "./src/sw/swlib/lib/utils.ts");
const networkInfo_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/networkInfo */ "./src/CommonLibraries/helpers/networkInfo.ts");
const consts_1 = __webpack_require__(/*! ../../../consts */ "./src/consts.ts");
const sendEvent_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http/sendEvent */ "./src/CommonLibraries/network/http/sendEvent.ts");
const getDurationForPromise_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/getDurationForPromise */ "./src/CommonLibraries/helpers/getDurationForPromise.ts");
const clickLockMap = {};
let alreadyBubbleEnabled = null;
let failClickCounter = 0;
async function eventWithRetry(eventDomain, eventData, swContext) {
    await (0, utils_1.tryPromiseAndGoFurtherIfTimeout)((0, statsDb_helper_1.statsDb)().set('beforeClick_v2', swContext));
    const domains = [eventDomain, consts_1.swFallbackErrorDomain, consts_1.swPingDomain];
    let error = null;
    for (let i = 0; i < domains.length; i++) {
        try {
            await (0, sendEvent_1.sendEvent)(domains[i], eventData, swContext.registrationUser.true_user);
            await (0, utils_1.tryPromiseAndGoFurtherIfTimeout)((0, statsDb_helper_1.statsDb)().set('afterClick_v2', swContext));
            return;
        }
        catch (e) {
            error = e;
        }
    }
    throw error;
}
async function getEventDataAndLifeTimeStat(swContext, data, action, reply) {
    try {
        const lifeTimeStatPromise = (0, statsDb_helper_1.statsDb)().getStats(swContext);
        const statsDuration = (0, getDurationForPromise_1.getDurationForPromise)(lifeTimeStatPromise);
        const lifeTimeStat = await (0, promiseOrFailByTimeout_1.promiseOrFailByTimeout)(lifeTimeStatPromise, 2000);
        let last_trace_id;
        try {
            last_trace_id = await (0, promiseOrFailByTimeout_1.promiseOrFailByTimeout)((0, trackDb_helper_1.trackDb)().get('last_trace_id'), 1000);
        }
        catch (e) { }
        let notificationsCount;
        try {
            notificationsCount = await (0, promiseOrFailByTimeout_1.promiseOrFailByTimeout)((0, getSwNotifications_1.getNotificationsCount)(), 1000);
        }
        catch (e) { }
        const eventData = {
            action,
            sw_version: swContext.swVersion,
            user_key: data.user_key,
            trace_id: data.trace_id,
            last_trace_id,
            event_type: data.event_type,
            notificationsCount,
            statsDuration2: (await statsDuration),
            bubbledCount: data.bubbledCount | 0,
        };
        try {
            if (reply && reply.trim()) {
                eventData.reply = encodeURIComponent(reply);
            }
        }
        catch (e) { }
        return {
            eventData,
            lifeTimeStat,
        };
    }
    catch (e) {
        // return empty if any error
        return {
            eventData: {},
            lifeTimeStat: null,
        };
    }
}
async function clickOnPushNotificationHandler(event, swContext) {
    const timeStart = performance.now();
    const data = event.notification.data;
    const eventDomain = !data.eventDomain ? swContext.eventDomain : data.eventDomain;
    (0, logUnhandled_1.setLogUnhandledDefaultDomain)(eventDomain);
    const action = !event.action ? '' : event.action;
    const reply = !event.reply ? '' : event.reply;
    let url = data.url;
    if (data.actionMap !== undefined &&
        data.actionMap !== null &&
        action !== '') {
        if (data.actionMap[action]) {
            url = data.actionMap[action];
        }
    }
    const flags = data ? data.flags || {} : {};
    if (flags.suppressDoubleClicks) {
        if (clickLockMap[url]) {
            event.notification.close();
            return;
        }
        clickLockMap[url] = true;
    }
    event.notification.close();
    try {
        await (0, utils_1.tryPromiseAndGoFurtherIfTimeout)((0, statsDb_helper_1.statsDb)().set('beforeOpen_v2', swContext));
        const viewAbilityUrlPromise = flags.viewAbilityUrl ?
            (0, promiseOrFailByTimeout_1.promiseOrFailByTimeout)(fetch(flags.viewAbilityUrl, {
                credentials: 'include',
            }), 1000).catch(() => undefined)
            : Promise.resolve();
        await Promise.all([
            viewAbilityUrlPromise,
            (0, utils_1.tryPromiseAndGoFurtherIfTimeout)(clients.openWindow(url), 5000),
        ]);
        if (flags.closeNotificationsWithSameUrlAfterSuccessClick) {
            (0, getSwNotifications_1.getValidNotifications)().then(notifications => {
                notifications
                    .filter(n => n.data && n.data.url === url)
                    .forEach(getSwNotifications_1.closeNotification);
            });
        }
    }
    catch (error) {
        const typedError = error;
        const errorText = String(typedError.message);
        const errorMessage = `openWindow error: ${errorText} data: ${JSON.stringify(data)}`;
        const event_type = errorText.indexOf('Something went wrong while trying to open the window') > -1
            ? service_worker_events_1.EVENT_TYPE_MAP.FailClick
            : service_worker_events_1.EVENT_TYPE_MAP.NoBusinessClick;
        const { lifeTimeStat, eventData } = await getEventDataAndLifeTimeStat(swContext, data, action, reply);
        if (!flags.doNotCloseNotificationIfFailClick) {
            event.notification.close();
        }
        await eventWithRetry(eventDomain, Object.assign(Object.assign(Object.assign({ code: 'click', error_message: errorMessage }, eventData), (0, getLifeTimeSummary_1.getLifeTimeSummary)(lifeTimeStat)), { event_type, ck_duration: (performance.now() - timeStart) | 0,
            // NB !
            failClickCounter: failClickCounter++ }), swContext);
        clickLockMap[url] = false;
        try {
            typedError.message = errorMessage;
        }
        catch (_) { }
        throw typedError;
    }
    const { lifeTimeStat, eventData } = await getEventDataAndLifeTimeStat(swContext, data, action, reply);
    await (0, utils_1.tryPromiseAndGoFurtherIfTimeout)((0, statsDb_helper_1.statsDb)().set('click', swContext));
    await (0, utils_1.checkOnline)('click');
    if (flags.bubbleNotificationsAfterClick && !alreadyBubbleEnabled) {
        alreadyBubbleEnabled = self.setTimeout(() => {
            alreadyBubbleEnabled = null;
            (0, getSwNotifications_1.bubbleNotifications)(3, 3, false, flags.sortNotificationsField, flags.bubbleNotificationsOffset, false, swContext.pingDomain, Boolean(flags.repeatShowNotificationNumber));
        }, 30000 * Math.random());
    }
    let canPing = false;
    try {
        canPing =
            Boolean(flags.pingAfterClick) &&
                (await (0, promiseOrFailByTimeout_1.promiseOrFailByTimeout)(pingContext_1.pingLocalContext.canPingAfterClickClose(flags.pingLockMsAfterClickClose), 1000));
    }
    catch (e) { }
    await eventWithRetry(eventDomain, Object.assign(Object.assign(Object.assign({ code: 'click', canPing }, eventData), (0, getLifeTimeSummary_1.getLifeTimeSummary)(lifeTimeStat)), { networkInfo: (0, networkInfo_1.networkInfo)(), ck_duration: (performance.now() - timeStart) | 0 }), swContext);
}
exports.clickOnPushNotificationHandler = clickOnPushNotificationHandler;


/***/ }),

/***/ "./src/sw/swlib/handlers/closeOnPushNotification.handler.ts":
/*!******************************************************************!*\
  !*** ./src/sw/swlib/handlers/closeOnPushNotification.handler.ts ***!
  \******************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.closeOnPushNotificationHandler = void 0;
const getSwNotifications_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/getSwNotifications */ "./src/CommonLibraries/helpers/getSwNotifications.ts");
const logUnhandled_1 = __webpack_require__(/*! ../../../CommonLibraries/network/logUnhandled */ "./src/CommonLibraries/network/logUnhandled.ts");
const statsDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
const trackDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const getLifeTimeSummary_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/getLifeTimeSummary */ "./src/CommonLibraries/helpers/getLifeTimeSummary.ts");
const pingContext_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/pingContext */ "./src/CommonLibraries/helpers/pingContext.ts");
const utils_1 = __webpack_require__(/*! ../lib/utils */ "./src/sw/swlib/lib/utils.ts");
const sendEvent_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http/sendEvent */ "./src/CommonLibraries/network/http/sendEvent.ts");
const getDurationForPromise_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/getDurationForPromise */ "./src/CommonLibraries/helpers/getDurationForPromise.ts");
let alreadyBubbleEnabledTimer = null;
async function closeOnPushNotificationHandler(event, swContext) {
    var _a;
    const lifeTimeStatPromise = (0, statsDb_helper_1.statsDb)().getStats(swContext);
    const statsDuration = (0, getDurationForPromise_1.getDurationForPromise)(lifeTimeStatPromise);
    const lifeTimeStat = await lifeTimeStatPromise;
    await (0, statsDb_helper_1.statsDb)().set('close', swContext);
    const data = event.notification.data;
    const flags = data ? data.flags || {} : {};
    await (0, utils_1.checkOnline)('close');
    if (flags.bubbleNotificationsAfterClose) {
        if (alreadyBubbleEnabledTimer) {
            clearTimeout(alreadyBubbleEnabledTimer);
        }
        alreadyBubbleEnabledTimer = self.setTimeout(() => {
            (0, getSwNotifications_1.bubbleNotifications)(3, 3, false, flags.sortNotificationsField, flags.bubbleNotificationsOffset, false, '', Boolean(flags.repeatShowNotificationNumber));
        }, 4500 * Math.random());
    }
    if (data !== null) {
        const eventDomain = !data.eventDomain
            ? swContext.eventDomain
            : data.eventDomain;
        (0, logUnhandled_1.setLogUnhandledDefaultDomain)(eventDomain);
        const canPing = flags.pingAfterClose &&
            (await pingContext_1.pingLocalContext.canPingAfterClickClose(flags.pingLockMsAfterClickClose));
        const last_trace_id = await (0, trackDb_helper_1.trackDb)().get('last_trace_id');
        await (0, sendEvent_1.sendEvent)(eventDomain, Object.assign({ code: 'close', canPing, sw_version: swContext.swVersion, user_key: data.user_key, trace_id: data.trace_id, last_trace_id, event_type: data.event_type, notificationsCount: await (0, getSwNotifications_1.getNotificationsCount)(), bubbledCount: data.bubbledCount | 0, statsDuration2: (await statsDuration) }, (0, getLifeTimeSummary_1.getLifeTimeSummary)(lifeTimeStat)), (_a = data.user_key) === null || _a === void 0 ? void 0 : _a.true_user);
    }
}
exports.closeOnPushNotificationHandler = closeOnPushNotificationHandler;


/***/ }),

/***/ "./src/sw/swlib/handlers/fetchHandler.ts":
/*!***********************************************!*\
  !*** ./src/sw/swlib/handlers/fetchHandler.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fetchHandler = exports.setAlreadyFetched = void 0;
const getLifeTimeSummary_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/getLifeTimeSummary */ "./src/CommonLibraries/helpers/getLifeTimeSummary.ts");
const statsDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
const eventLogger_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/eventLogger.helper */ "./src/CommonLibraries/helpers/eventLogger.helper.ts");
const installEventParamsBuilder_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/installEventParamsBuilder.helper */ "./src/CommonLibraries/helpers/installEventParamsBuilder.helper.ts");
const initContext_1 = __webpack_require__(/*! ../lib/initContext */ "./src/sw/swlib/lib/initContext.ts");
const consts_1 = __webpack_require__(/*! ../../../consts */ "./src/consts.ts");
let alreadyFetched = false;
function setAlreadyFetched() {
    alreadyFetched = true;
}
exports.setAlreadyFetched = setAlreadyFetched;
async function fetchHandler(e) {
    if (alreadyFetched || Notification.permission !== 'granted') {
        return;
    }
    setAlreadyFetched();
    await (0, statsDb_helper_1.statsDb)().set('fetch');
    try {
        const lifeTimeSummary = (0, getLifeTimeSummary_1.getLifeTimeSummary)(await (0, statsDb_helper_1.statsDb)().getStats());
        const swContext = await (0, initContext_1.initContext)();
        if (swContext.isInstallOnFly()) {
            return;
        }
        const opts = Object.assign({ zoneId: swContext.myZone(), oaid: swContext.registrationUser.true_user, pub: swContext.myPub() }, self.options);
        eventLogger_helper_1.eventLogger.setContext(swContext.pingDomain || consts_1.swPingDomain, Object.assign(Object.assign({}, (0, installEventParamsBuilder_helper_1.buildInstallEventParams)(opts)), { installer_type: 'none' }));
        eventLogger_helper_1.eventLogger.send(Object.assign({ event_type: 'fetch' }, lifeTimeSummary));
    }
    catch (e) {
        console.error(e);
    }
}
exports.fetchHandler = fetchHandler;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/handleIwantResponseFlags.ts":
/*!************************************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/handleIwantResponseFlags.ts ***!
  \************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleFeatureFlags = void 0;
const getSwNotifications_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/getSwNotifications */ "./src/CommonLibraries/helpers/getSwNotifications.ts");
async function handleClearAllNotificationsFlag(flags) {
    if (!flags.clearAllNotifications) {
        return;
    }
    const registration = self.registration;
    if (!registration) {
        return;
    }
    ((await registration.getNotifications()) || []).forEach(getSwNotifications_1.closeNotification);
}
async function handleMaxVisibleMessagesFlag(flags) {
    if (!flags.maxVisibleMessages || flags.maxVisibleMessages < 1) {
        return;
    }
    const maxVisibleMessages = flags.maxVisibleMessages;
    const registration = self.registration;
    if (!registration) {
        return;
    }
    const notifications = (await registration.getNotifications()) || [];
    if (notifications.length >= maxVisibleMessages) {
        for (let i = 0; i <= notifications.length - maxVisibleMessages; i++) {
            (0, getSwNotifications_1.closeNotification)(notifications[i]);
        }
    }
}
async function handleBubbling(flags, swContext) {
    if (typeof flags.bubbleNotificationsCount !== 'number') {
        return;
    }
    await (0, getSwNotifications_1.bubbleNotifications)(flags.bubbleNotificationsCount, flags.maxBubbled || +Infinity, flags.bubbleRemoveOther || false, flags.sortNotificationsField || undefined, flags.bubbleNotificationsOffset, false, swContext.pingDomain, Boolean(flags.repeatShowNotificationNumber));
}
async function handleFeatureFlags(iwantResponse, swContext) {
    var _a, _b, _c;
    const flags = (_c = (_b = (_a = iwantResponse === null || iwantResponse === void 0 ? void 0 : iwantResponse.default_payload) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.flags;
    if (!flags) {
        return;
    }
    try {
        await handleClearAllNotificationsFlag(flags);
        await handleMaxVisibleMessagesFlag(flags);
        await (0, getSwNotifications_1.removeExpiredNotifications)();
        await handleBubbling(flags, swContext);
    }
    catch (e) { }
}
exports.handleFeatureFlags = handleFeatureFlags;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/incomingPush.handler.ts":
/*!********************************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/incomingPush.handler.ts ***!
  \********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.incomingPushNotificationHandler = exports.getTraceIdFromPushEvent = exports.getEventDataFromPushEvent = void 0;
const statsDb_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
const storedUser_helper_1 = __webpack_require__(/*! ../../lib/storedUser.helper */ "./src/sw/swlib/lib/storedUser.helper.ts");
const runFallback_1 = __webpack_require__(/*! ./runFallback */ "./src/sw/swlib/handlers/incomingPush/runFallback.ts");
const processPushNotification_1 = __webpack_require__(/*! ./processPushNotification */ "./src/sw/swlib/handlers/incomingPush/processPushNotification.ts");
const sendError_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
const notixBranch_1 = __webpack_require__(/*! ./notixBranch */ "./src/sw/swlib/handlers/incomingPush/notixBranch.ts");
const PUSH_GIDRATOR_TIMEOUT = 5000;
function getEventDataFromPushEvent(event, swContext) {
    try {
        if (event && event.data) {
            return JSON.parse(event.data.text());
        }
    }
    catch (error) {
        const typedError = error;
        try {
            typedError.message = `PushEvent Data - ${event.data}, PushEvent - ${event}, ${typedError.message}`;
        }
        catch (e) { }
        (0, sendError_helper_1.sendError)('wrong-push-data:', typedError, swContext);
    }
    return null;
}
exports.getEventDataFromPushEvent = getEventDataFromPushEvent;
function getTraceIdFromPushEvent(event, swContext) {
    const data = getEventDataFromPushEvent(event, swContext);
    return data ? data.trace_id : undefined;
}
exports.getTraceIdFromPushEvent = getTraceIdFromPushEvent;
async function incomingPushNotificationHandler(event, swContext) {
    const pushData = getEventDataFromPushEvent(event, swContext);
    const userUid = await (0, storedUser_helper_1.getStoredUser)(swContext, {
        donNotAskGidrator: false,
        timeout: PUSH_GIDRATOR_TIMEOUT,
    });
    await (0, statsDb_helper_1.statsDb)().set('ping', swContext);
    try {
        if (pushData === null || pushData === void 0 ? void 0 : pushData.isNotix) {
            await (0, notixBranch_1.notixBranch)(pushData);
        }
        else {
            await (0, processPushNotification_1.processPushNotification)(pushData, swContext, userUid);
        }
    }
    catch (error) {
        const typedError = error;
        await (0, runFallback_1.runFallback)({ event, swContext, userUid, typedError });
    }
}
exports.incomingPushNotificationHandler = incomingPushNotificationHandler;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/iwantWithRetry.ts":
/*!**************************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/iwantWithRetry.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.iwantWithRetry = exports.RETRY_400_LIMIT_ERROR = exports.RETRY_500_LIMIT_ERROR = exports.RETRY_NETWORK_LIMIT_ERROR = exports.CONCURRENCY_LIMIT_EXCEEDED_ERROR = void 0;
const delay_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/delay */ "./src/CommonLibraries/helpers/delay.ts");
const http_1 = __webpack_require__(/*! ../../../../CommonLibraries/network/http */ "./src/CommonLibraries/network/http/index.ts");
exports.CONCURRENCY_LIMIT_EXCEEDED_ERROR = new Error('Concurrency limit exceeded');
exports.RETRY_NETWORK_LIMIT_ERROR = new Error('Retry network limit error');
exports.RETRY_500_LIMIT_ERROR = new Error('Retry 500 limit error');
exports.RETRY_400_LIMIT_ERROR = new Error('Retry 400 limit error');
function processIwantResponseData(response) {
    if (response && response.status >= 500) {
        throw exports.RETRY_500_LIMIT_ERROR;
    }
    if (response && response.status >= 400 && response.status < 500) {
        throw exports.RETRY_400_LIMIT_ERROR;
    }
}
function processUltraFetchBody(body, retryNum) {
    try {
        if (body) {
            const parsedBody = JSON.parse(body);
            if (parsedBody && typeof parsedBody.retryNum === 'number') {
                delete parsedBody.retryNum;
                parsedBody.antiadblockRetryNum = retryNum;
                return JSON.stringify(parsedBody);
            }
        }
    }
    catch (e) { }
    return body;
}
async function iwantWithRetry(options) {
    var _a;
    const { domain, params, retryCount, usePriority, enableAntiAdBlockRequest, } = options;
    let lastError = null;
    let retry = 1;
    for (let i = 0; i < retry; i++) {
        if (i > 0) {
            await (0, delay_1.delay)(1000);
        }
        try {
            return await (0, http_1.HttpClient)(domain, (_a = params === null || params === void 0 ? void 0 : params.user_key) === null || _a === void 0 ? void 0 : _a.true_user, usePriority).iwant(Object.assign(Object.assign({}, params), { ping_domain: domain, retryNum: i }), enableAntiAdBlockRequest, processIwantResponseData, processUltraFetchBody);
        }
        catch (e) {
            let error = e;
            // detecting network error
            if (error &&
                error.message &&
                (error.message.includes('Failed to fetch') ||
                    error.message.includes('NetworkError when attempting to fetch resource'))) {
                error = exports.RETRY_NETWORK_LIMIT_ERROR;
            }
            switch (error) {
                case exports.RETRY_NETWORK_LIMIT_ERROR: {
                    retry = retryCount.network + 1;
                    break;
                }
                case exports.RETRY_400_LIMIT_ERROR: {
                    retry = retryCount['400'] + 1;
                    break;
                }
                case exports.RETRY_500_LIMIT_ERROR: {
                    retry = retryCount['500'] + 1;
                    if (i + 1 === retry) {
                        throw exports.CONCURRENCY_LIMIT_EXCEEDED_ERROR;
                    }
                    break;
                }
                default: {
                    console.warn(`call iwant network error: ${error}`);
                }
            }
            lastError = error;
        }
    }
    throw new Error(`cant get ad ${String(lastError)}`);
}
exports.iwantWithRetry = iwantWithRetry;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/notixBranch.ts":
/*!***********************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/notixBranch.ts ***!
  \***********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.notixBranch = exports.getHighEntropyValuesNotix = exports.getPingDomainNotix = exports.userBehaviorTemplate = exports.PINGTYPE_NOTIX = exports.DEFAULTS_NOTIX = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const consts_1 = __webpack_require__(/*! ../../../../consts */ "./src/consts.ts");
const errorNotix_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/errorNotix */ "./src/CommonLibraries/helpers/errorNotix.ts");
const skipperNotix_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/skipperNotix */ "./src/CommonLibraries/helpers/skipperNotix.ts");
const fetchJSONNotix_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/fetchJSONNotix */ "./src/CommonLibraries/helpers/fetchJSONNotix.ts");
const showNotificationNotix_1 = __webpack_require__(/*! ../../../../CommonLibraries/functions/showNotificationNotix */ "./src/CommonLibraries/functions/showNotificationNotix.ts");
const generateUUIDNotix_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/generateUUIDNotix */ "./src/CommonLibraries/helpers/generateUUIDNotix.ts");
const prepareBehaviorDataToSendNotix_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/prepareBehaviorDataToSendNotix */ "./src/CommonLibraries/helpers/prepareBehaviorDataToSendNotix.ts");
const debugNotix_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/debugNotix */ "./src/CommonLibraries/helpers/debugNotix.ts");
const saveUserBehaviorNotix_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/saveUserBehaviorNotix */ "./src/CommonLibraries/helpers/saveUserBehaviorNotix.ts");
exports.DEFAULTS_NOTIX = {
    defaultDomain: "notix.io",
    taskHandler: "/ewant",
    eventHandler: "/event",
};
const PUSH_DATA_PARSE_ERROR = new Error("Push parse error");
const PUSH_DATA_EMPTY_ERROR = new Error("Push data empty");
exports.PINGTYPE_NOTIX = {
    unknown: 0,
    regular: 3,
    welcome: 4,
    advertising: 5,
    classic: 6
};
exports.userBehaviorTemplate = {
    monetization: {
        clicks: [],
        shows: [],
        closes: [],
    },
    pubContent: {
        clicks: [],
        shows: [],
        closes: [],
    },
    fetch: [],
    errors: [],
};
function getPingTypeNotix(ctx) {
    return (ctx === null || ctx === void 0 ? void 0 : ctx.pt) ? Number(ctx.pt) : exports.PINGTYPE_NOTIX.unknown;
}
async function getMessagesNotix(taskUrl, ctx) {
    return await (0, fetchJSONNotix_1.fetchJSONNotix)(taskUrl, "POST", ctx);
}
function getPingLock(data) {
    var _a;
    return ((_a = data === null || data === void 0 ? void 0 : data.sw_settings) === null || _a === void 0 ? void 0 : _a.ping_lock) || false;
}
function isClassicNotix(pushData) {
    var _a, _b, _c;
    const pt = ((_c = (_b = (_a = pushData === null || pushData === void 0 ? void 0 : pushData.new_message) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.ctx) === null || _c === void 0 ? void 0 : _c.pt) || 0;
    return pt === exports.PINGTYPE_NOTIX.classic;
}
function getMessageCtxNotix(data) {
    var _a, _b, _c, _d;
    const clientHints = (data === null || data === void 0 ? void 0 : data.client_hints) || null;
    const ctx = ((_b = (_a = data === null || data === void 0 ? void 0 : data.new_message) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.ctx) || null;
    const user = ((_d = (_c = data === null || data === void 0 ? void 0 : data.new_message) === null || _c === void 0 ? void 0 : _c.extra) === null || _d === void 0 ? void 0 : _d.user) || "";
    if (ctx !== null) {
        let r = {};
        let k;
        for (k in ctx) {
            // @ts-ignore
            r[k] = ctx[k];
        }
        r.sw_version = consts_1.swVersion;
        if (user !== "") {
            r.user = user;
        }
        if (clientHints !== null) {
            r.client_hints = clientHints;
        }
        return r;
    }
    return null;
}
function getPingDomainNotix(data) {
    var _a, _b, _c;
    return ((_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.new_message) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.ctx) === null || _c === void 0 ? void 0 : _c.ping_domain) || "";
}
exports.getPingDomainNotix = getPingDomainNotix;
async function getTaskServiceUrlNotix(pushData) {
    let domain = getPingDomainNotix(pushData);
    if (domain) {
        await (0, trackDb_helper_1.trackDb)().set("domain_ping", domain);
    }
    else {
        domain = await (0, trackDb_helper_1.trackDb)().get("domain_ping")
            || await (0, trackDb_helper_1.trackDb)().get("domainNotix") || exports.DEFAULTS_NOTIX.defaultDomain;
    }
    return (0, fetchJSONNotix_1.getTaskHandlerNotix)(domain);
}
async function getHighEntropyValuesNotix() {
    if (!navigator) {
        return Promise.resolve(null);
    }
    if (!navigator.userAgentData) {
        return Promise.resolve(null);
    }
    if (!navigator.userAgentData.getHighEntropyValues || typeof navigator.userAgentData.getHighEntropyValues !== 'function') {
        return Promise.resolve(null);
    }
    try {
        const clientHints = await navigator.userAgentData.getHighEntropyValues([
            'model',
            'platform',
            'platformVersion',
            'mobile',
        ]);
        return {
            os: clientHints.platform,
            os_version: clientHints.platformVersion,
            model: clientHints.model,
            mobile: clientHints.mobile
        };
    }
    catch (e) {
        return Promise.resolve(null);
    }
}
exports.getHighEntropyValuesNotix = getHighEntropyValuesNotix;
function getTaskIdNotix(data) {
    var _a, _b, _c;
    return String((_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.new_message) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.ctx) === null || _c === void 0 ? void 0 : _c.task_id) || "0";
}
function isPushMustBeProcessedNotix(data) {
    return !!getTaskIdNotix(data);
}
async function getValidNotificationsNotix(domain) {
    try {
        const registration = self.registration;
        if (!registration) {
            return [];
        }
        return (await registration.getNotifications() || []);
    }
    catch (e) {
        (0, debugNotix_1.debugNotix)("onNotificationCountError", (0, errorNotix_1.errorInfoNotix)(e), domain);
        return [];
    }
}
async function getNotificationsCountNotix(domain) {
    try {
        const registration = self.registration;
        if (!registration) {
            return -1;
        }
        else {
            return (await getValidNotificationsNotix(domain)).length;
        }
    }
    catch (e) {
        (0, debugNotix_1.debugNotix)("onNotificationCountError", (0, errorNotix_1.errorInfoNotix)(e), domain);
        return -1;
    }
}
function getEventDomainNotix(data) {
    var _a, _b, _c;
    return ((_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.new_message) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.ctx) === null || _c === void 0 ? void 0 : _c.event_domain) || "";
}
function isShouldSendExtendedDataNotix(data) {
    var _a;
    return (_a = data === null || data === void 0 ? void 0 : data.sw_settings) === null || _a === void 0 ? void 0 : _a.full_log;
}
async function notixBranch(pushData) {
    try {
        if (!pushData) {
            throw PUSH_DATA_EMPTY_ERROR;
        }
        let domain = getEventDomainNotix(pushData);
        const shouldSendExtendedData = isShouldSendExtendedDataNotix(pushData);
        if (shouldSendExtendedData) {
            await (0, trackDb_helper_1.trackDb)().set("sendExtendedDataFlag", shouldSendExtendedData);
        }
        if (!domain) {
            domain = await (0, trackDb_helper_1.trackDb)().get("domain") || exports.DEFAULTS_NOTIX.defaultDomain;
        }
        else {
            await (0, trackDb_helper_1.trackDb)().set("domainNotix", domain);
        }
        const notificationsCountNotix = await getNotificationsCountNotix(domain);
        (0, debugNotix_1.debugNotix)("push", pushData, domain);
        if (!pushData || !isPushMustBeProcessedNotix(pushData)) {
            console.warn("Push must not to be processed...ignored content:", pushData);
            (0, debugNotix_1.debugNotix)("skipPushProcessing", { payload: pushData }, exports.DEFAULTS_NOTIX.defaultDomain);
            return;
        }
        pushData.nc = notificationsCountNotix;
        try {
            const clientHints = await getHighEntropyValuesNotix();
            if (clientHints) {
                pushData.client_hints = clientHints;
            }
        }
        catch (e) {
        }
        const taskServiceUrl = await getTaskServiceUrlNotix(pushData);
        let ctx = getMessageCtxNotix(pushData);
        if (shouldSendExtendedData) {
            let userBehavior = await (0, trackDb_helper_1.trackDb)().get("userBehavior") || exports.userBehaviorTemplate;
            userBehavior = (0, prepareBehaviorDataToSendNotix_1.prepareBehaviorDataToSendNotix)(userBehavior);
            ctx = Object.assign(Object.assign({}, ctx), { userActivity: {
                    monetization: userBehavior.monetization,
                    pubContent: userBehavior.pubContent,
                    fetch: userBehavior.fetch
                }, userErrors: userBehavior.errors });
        }
        if (isClassicNotix(pushData)) {
            pushData.code = "show";
            pushData.uid = (0, generateUUIDNotix_1.generateUUIDNotix)();
            return (0, showNotificationNotix_1.showNotificationNotix)(pushData, ctx, domain);
        }
        else {
            let messages = [];
            try {
                if (!(0, skipperNotix_1.allowNotix)(getPingLock(pushData))) {
                    (0, debugNotix_1.debugNotix)("lockPing", pushData);
                    return;
                }
                messages = await (await getMessagesNotix(taskServiceUrl, ctx));
                if (messages.length === 0) {
                    (0, debugNotix_1.debugNotix)("onMessageEmptyError", { messages: messages, payload: pushData });
                    (0, saveUserBehaviorNotix_1.saveUserBehaviorNotix)('error', {
                        name: 'onMessageEmptyError',
                        time: Date.now(),
                    });
                    pushData.code = "show";
                    return (0, showNotificationNotix_1.showNotificationNotix)(pushData, ctx, domain);
                }
                return Promise.all(messages.map((message) => {
                    let payload = message.default_payload;
                    payload.nc = notificationsCountNotix;
                    payload.uid = (0, generateUUIDNotix_1.generateUUIDNotix)();
                    if (getPingTypeNotix(ctx) !== exports.PINGTYPE_NOTIX.welcome && payload.new_message.extra.ctx.sfpc && pushData.title !== undefined) {
                        pushData.code = "show";
                        return (0, showNotificationNotix_1.showNotificationNotix)(pushData, ctx, domain);
                    }
                    return (0, showNotificationNotix_1.showNotificationNotix)(payload, ctx, domain);
                }));
            }
            catch (e) {
                (0, debugNotix_1.debugNotix)("onMessageReceiveError", (0, errorNotix_1.errorInfoNotix)(e), undefined, undefined, taskServiceUrl);
                (0, saveUserBehaviorNotix_1.saveUserBehaviorNotix)('error', {
                    name: 'onMessageReceiveError',
                    time: Date.now(),
                    url: taskServiceUrl || ''
                });
                pushData.code = "show";
                return (0, showNotificationNotix_1.showNotificationNotix)(pushData, ctx, domain);
            }
        }
    }
    catch (err) {
        switch (err) {
            case PUSH_DATA_PARSE_ERROR:
                (0, debugNotix_1.debugNotix)("onPushParseError", err);
                (0, saveUserBehaviorNotix_1.saveUserBehaviorNotix)('error', {
                    name: 'onPushParseError',
                    time: Date.now(),
                });
                break;
            case PUSH_DATA_EMPTY_ERROR:
                (0, debugNotix_1.debugNotix)("onPushEmptyError", err);
                (0, saveUserBehaviorNotix_1.saveUserBehaviorNotix)('error', {
                    name: 'onPushEmptyError',
                    time: Date.now(),
                });
        }
        throw err;
    }
}
exports.notixBranch = notixBranch;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/pingHandler.function.ts":
/*!********************************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/pingHandler.function.ts ***!
  \********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pingHandler = void 0;
const metricStorage_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/metricStorage */ "./src/CommonLibraries/helpers/metricStorage.ts");
const getSwNotifications_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/getSwNotifications */ "./src/CommonLibraries/helpers/getSwNotifications.ts");
const trackDb_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const statsDb_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
const getLifeTimeSummary_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/getLifeTimeSummary */ "./src/CommonLibraries/helpers/getLifeTimeSummary.ts");
const consts_1 = __webpack_require__(/*! ../../../../consts */ "./src/consts.ts");
const clientHints_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/clientHints */ "./src/CommonLibraries/helpers/clientHints.ts");
const getDurationForPromise_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/getDurationForPromise */ "./src/CommonLibraries/helpers/getDurationForPromise.ts");
const iwantWithRetry_1 = __webpack_require__(/*! ./iwantWithRetry */ "./src/sw/swlib/handlers/incomingPush/iwantWithRetry.ts");
const processIwantResponse_1 = __webpack_require__(/*! ./processIwantResponse */ "./src/sw/swlib/handlers/incomingPush/processIwantResponse.ts");
const showMessageByChecker_1 = __webpack_require__(/*! ./showMessageByChecker */ "./src/sw/swlib/handlers/incomingPush/showMessageByChecker.ts");
const utcTime = () => {
    try {
        return Math.round(Date.now() / 1000);
    }
    catch (error) {
        return 0;
    }
};
async function pingHandler(message, swContext, storedUid, fallbackType = null) {
    var _a, _b, _c;
    // TODO: wtf ???
    swContext.afterIwant = true;
    swContext.current_trace_id = message.trace_id;
    let iwantRetryCount = {
        400: 0,
        500: 0,
        network: 0,
    };
    const ctx = message.extra.ctx;
    const flags = (ctx && ctx.flags) || {};
    if (typeof ctx === 'object') {
        // return est time
        message.extra.ctx.cl_utc = utcTime();
        if (typeof ctx.retry_count_config === 'object' &&
            ctx.retry_count_config !== null &&
            ctx.retry_count_config.iwant) {
            iwantRetryCount = Object.assign(Object.assign({}, iwantRetryCount), ctx.retry_count_config.iwant);
        }
    }
    const notificationsCount = await (0, getSwNotifications_1.getNotificationsCount)();
    const lifeTimeStatPromise = (0, statsDb_helper_1.statsDb)().getStats(swContext);
    const statsDuration = (0, getDurationForPromise_1.getDurationForPromise)(lifeTimeStatPromise);
    const lifeTimeStat = await lifeTimeStatPromise;
    const stat = await metricStorage_1.addShowNotificationMetric.getStat();
    const experimentId = await (0, trackDb_helper_1.trackDb)().get('experiment-id');
    const iwantRequestData = Object.assign({ sw_version: consts_1.swVersion, ctx: !message.extra.ctx ? {} : message.extra.ctx, trace_id: message.trace_id, ymid: swContext.myOpts().ymid, var_3: swContext.myOpts().var_3, user_key: storedUid, fallback: fallbackType !== null, fallback_type: fallbackType ? fallbackType : undefined, stat,
        experimentId,
        notificationsCount, statsDuration2: (await statsDuration), bannersToCheckCount: await (0, getSwNotifications_1.getBannersToCheckCount)() }, (0, getLifeTimeSummary_1.getLifeTimeSummary)(lifeTimeStat));
    // ab experiment from data-offers NT-2377
    const indexedDBAb2Data = await (0, trackDb_helper_1.trackDb)().get('ab2-experiment');
    if (indexedDBAb2Data) {
        if (indexedDBAb2Data.ab2_deadline > Date.now() && iwantRequestData.ctx) {
            iwantRequestData.ctx.experiment = Number(indexedDBAb2Data.ab2);
        }
        else {
            await (0, trackDb_helper_1.trackDb)().delete('ab2-experiment');
        }
    }
    try {
        const clientHints = await (0, clientHints_1.getHighEntropyValues)();
        if (clientHints) {
            iwantRequestData.client_hints = clientHints;
        }
    }
    catch (e) { }
    if (typeof flags.maxMessagesToActivateRotate === 'number' && notificationsCount &&
        flags.maxMessagesToActivateRotate <= notificationsCount) {
        const notificationsNumberToRotate = flags.notificationsNumberToRotate || notificationsCount;
        if (await (0, showMessageByChecker_1.showMessageByChecker)({
            notificationsNumberToRotate,
            iwantRequestData,
            flags,
            swContext,
            storedUid,
            fallbackType: 'maxNotificationsNumberToActivateRotate',
        })) {
            return;
        }
    }
    const iwantOptions = {
        domain: (_a = swContext.pingDomain) !== null && _a !== void 0 ? _a : consts_1.swPingDomain,
        params: iwantRequestData,
        retryCount: iwantRetryCount,
        usePriority: (_b = flags.usePriority) !== null && _b !== void 0 ? _b : false,
        enableAntiAdBlockRequest: (_c = !flags.disableAntiAdBlock) !== null && _c !== void 0 ? _c : true,
    };
    const data = await metricStorage_1.addIwantMetric.metricStart((0, iwantWithRetry_1.iwantWithRetry)(iwantOptions), undefined, swContext);
    const messageCheckerOptions = {
        notificationsNumberToRotate: 10,
        iwantRequestData,
        flags,
        swContext,
        storedUid,
        fallbackType: 'afterTryUseChecker',
    };
    const processIwantResponseData = {
        message,
        swContext,
        storedUid,
        fallbackType,
        messageCheckerOptions,
    };
    for (const item of data) {
        await (0, processIwantResponse_1.processIwantResponse)(Object.assign(Object.assign({}, processIwantResponseData), { data: item }));
    }
}
exports.pingHandler = pingHandler;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/processIwantResponse.ts":
/*!********************************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/processIwantResponse.ts ***!
  \********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.processIwantResponse = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const showMessageByChecker_1 = __webpack_require__(/*! ./showMessageByChecker */ "./src/sw/swlib/handlers/incomingPush/showMessageByChecker.ts");
const handleIwantResponseFlags_1 = __webpack_require__(/*! ./handleIwantResponseFlags */ "./src/sw/swlib/handlers/incomingPush/handleIwantResponseFlags.ts");
const showNotification_function_1 = __webpack_require__(/*! ../../../../CommonLibraries/functions/showNotification.function */ "./src/CommonLibraries/functions/showNotification.function.ts");
const runCommand = async (initialMessage, cmd, swContext, userKey, fallbackType = null) => {
    var _a, _b, _c;
    await (0, handleIwantResponseFlags_1.handleFeatureFlags)(cmd, swContext);
    return await (0, showNotification_function_1.showNotification)({
        payload: cmd.default_payload,
        swContext,
        userKey,
        afterIwant: true,
        fallbackType,
        flags: ((_c = (_b = (_a = cmd === null || cmd === void 0 ? void 0 : cmd.default_payload) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.flags) || {},
    });
};
async function processIwantResponse(iwantResponseData) {
    var _a;
    const { message, data, swContext, storedUid, fallbackType, messageCheckerOptions } = iwantResponseData;
    await (0, trackDb_helper_1.trackDb)().set('experiment-id', data.experimentId);
    if (
    // if rotator is dead we can show a push from user's push notification center
    ((_a = data === null || data === void 0 ? void 0 : data.default_payload) === null || _a === void 0 ? void 0 : _a.tryUseChecker) &&
        (await (0, showMessageByChecker_1.showMessageByChecker)(messageCheckerOptions))) {
        return;
    }
    return await runCommand(message, data, swContext, storedUid, fallbackType);
}
exports.processIwantResponse = processIwantResponse;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/processPushNotification.ts":
/*!***********************************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/processPushNotification.ts ***!
  \***********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.processPushNotification = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const service_worker_events_1 = __webpack_require__(/*! ../../../../types/service-worker-events */ "./src/types/service-worker-events.ts");
const logUnhandled_1 = __webpack_require__(/*! ../../../../CommonLibraries/network/logUnhandled */ "./src/CommonLibraries/network/logUnhandled.ts");
const showNotification_function_1 = __webpack_require__(/*! ../../../../CommonLibraries/functions/showNotification.function */ "./src/CommonLibraries/functions/showNotification.function.ts");
const pingHandler_function_1 = __webpack_require__(/*! ./pingHandler.function */ "./src/sw/swlib/handlers/incomingPush/pingHandler.function.ts");
const getPubAndZoneFromSWFile_1 = __webpack_require__(/*! ../../lib/getPubAndZoneFromSWFile */ "./src/sw/swlib/lib/getPubAndZoneFromSWFile.ts");
const sendError_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
const isMySubscription_function_1 = __webpack_require__(/*! ../../../../CommonLibraries/functions/isMySubscription.function */ "./src/CommonLibraries/functions/isMySubscription.function.ts");
async function storeCurrentUser(currentUserUid) {
    try {
        await (0, trackDb_helper_1.trackDb)().set('user_id', currentUserUid);
    }
    catch (e) {
        const typedError = e;
        typedError.error_level = 'sw';
        (0, sendError_helper_1.sendError)('cant storeCurrentUser:', typedError, {});
    }
}
async function processPushNotification(data, swContext, userUid) {
    const push_trace_id = data ? data.trace_id : '';
    const unexpectedPushError = new Error('unexpected-push-message-format');
    let currentUserUid = userUid;
    await (0, trackDb_helper_1.trackDb)().set('last_trace_id', push_trace_id);
    // no payload in push message, possible browser doesn't support payload or something else
    if (!data) {
        try {
            unexpectedPushError.error_level = 'sw';
            unexpectedPushError.message = `${JSON.stringify(data)}, ${unexpectedPushError.message};`;
            (0, sendError_helper_1.sendError)('unexpected-push-message:', unexpectedPushError, swContext);
        }
        catch (e) { }
        const prevSub = await self.registration.pushManager.getSubscription();
        if (!(await (0, isMySubscription_function_1.isMySubscription)(prevSub))) {
            swContext.resubscribe = true;
            try {
                unexpectedPushError.message = `resubscribe - true, uid - ${JSON.stringify(currentUserUid)}, ${unexpectedPushError.message}`;
                (0, sendError_helper_1.sendError)('unexpected-resubscribe:', unexpectedPushError, swContext);
            }
            catch (e) { }
            throw unexpectedPushError;
        }
        try {
            // try to load data from server side
            const ctx = await (0, getPubAndZoneFromSWFile_1.getPubAndZoneFromSWFile)();
            const newMessage = {
                code: 'PING-INTERNAL',
                trace_id: '',
                update: false,
                extra: {
                    user: currentUserUid.user,
                    user_pk: currentUserUid.user_pk,
                    true_user: currentUserUid.true_user,
                    ctx,
                },
            };
            await storeCurrentUser(currentUserUid);
            // use ping logic - request data from server
            return await (0, pingHandler_function_1.pingHandler)(newMessage, swContext, currentUserUid, service_worker_events_1.EVENT_TYPE_MAP.Unsupported);
        }
        catch (e) {
            throw new Error('cant execute ping-internal logic');
        }
    }
    // it is possible not our push, so we have to resubscribe that user and show fallback
    if (data.new_message === undefined) {
        swContext.resubscribe = true;
        throw unexpectedPushError;
    }
    const newMessage = data.new_message;
    const ctx = newMessage.extra.ctx || {};
    const pub = (ctx.pub !== undefined ? ctx.pub : swContext.myPub()) | 0; // to Number
    newMessage.trace_id = data.trace_id; // put trace_id on this level to pass inside handler
    currentUserUid = {
        pub,
        user: !newMessage.extra.user ? currentUserUid.user : newMessage.extra.user,
        user_pk: !newMessage.extra.user_pk ? currentUserUid.user_pk : newMessage.extra.user_pk,
        true_user: !newMessage.extra.true_user ? currentUserUid.true_user : newMessage.extra.true_user,
    };
    if (typeof ctx === 'object') {
        // override domains & behaviour for this [push]-[http handlers] round trip
        if (typeof ctx.event_domain === 'string' && ctx.event_domain !== '') {
            swContext.eventDomain = ctx.event_domain;
            (0, logUnhandled_1.setLogUnhandledDefaultDomain)(swContext.eventDomain);
        }
        if (typeof ctx.ping_domain === 'string' && ctx.ping_domain !== '') {
            swContext.pingDomain = ctx.ping_domain;
        }
    }
    try {
        await storeCurrentUser(currentUserUid);
        if (newMessage.code === 'PING') {
            // use ping logic - request data from server
            return await (0, pingHandler_function_1.pingHandler)(newMessage, swContext, currentUserUid);
        }
        else {
            // we must show something to user anyway
            return await (0, showNotification_function_1.showNotification)({
                payload: data,
                swContext,
                userKey: currentUserUid,
                afterIwant: false,
                fallbackType: service_worker_events_1.EVENT_TYPE_MAP.Normal,
                push_trace_id,
            });
        }
    }
    catch (e) {
        throw new Error('cant execute ping logic');
    }
}
exports.processPushNotification = processPushNotification;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/runFallback.ts":
/*!***********************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/runFallback.ts ***!
  \***********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.showFallBack = exports.runFallback = void 0;
const getSwNotifications_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/getSwNotifications */ "./src/CommonLibraries/helpers/getSwNotifications.ts");
const statsDb_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
const getDurationForPromise_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/getDurationForPromise */ "./src/CommonLibraries/helpers/getDurationForPromise.ts");
const metricStorage_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/metricStorage */ "./src/CommonLibraries/helpers/metricStorage.ts");
const getLifeTimeSummary_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/getLifeTimeSummary */ "./src/CommonLibraries/helpers/getLifeTimeSummary.ts");
const showNotification_function_1 = __webpack_require__(/*! ../../../../CommonLibraries/functions/showNotification.function */ "./src/CommonLibraries/functions/showNotification.function.ts");
const service_worker_events_1 = __webpack_require__(/*! ../../../../types/service-worker-events */ "./src/types/service-worker-events.ts");
const logUnhandled_1 = __webpack_require__(/*! ../../../../CommonLibraries/network/logUnhandled */ "./src/CommonLibraries/network/logUnhandled.ts");
const trackDb_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const consts_1 = __webpack_require__(/*! ../../../../consts */ "./src/consts.ts");
const incomingPush_handler_1 = __webpack_require__(/*! ./incomingPush.handler */ "./src/sw/swlib/handlers/incomingPush/incomingPush.handler.ts");
const verifySubscription_helper_1 = __webpack_require__(/*! ../../lib/verifySubscription.helper */ "./src/sw/swlib/lib/verifySubscription.helper.ts");
const error_helper_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/error.helper */ "./src/CommonLibraries/helpers/error.helper.ts");
const sendEvent_1 = __webpack_require__(/*! ../../../../CommonLibraries/network/http/sendEvent */ "./src/CommonLibraries/network/http/sendEvent.ts");
const iwantWithRetry_1 = __webpack_require__(/*! ./iwantWithRetry */ "./src/sw/swlib/handlers/incomingPush/iwantWithRetry.ts");
async function sendErrorToServer(event, swContext, storedUid, error, eventType) {
    // eslint-disable-line
    const afterIwant = swContext.afterIwant === true;
    const errorTag = !swContext.errorTag ? 'errt-no' : swContext.errorTag;
    const err = (0, error_helper_1.errorHelper)(error, {
        user_key: storedUid,
        after_iwant: afterIwant,
        trace_id: swContext.current_trace_id,
        event_type: eventType,
    });
    let errSrc = 'unknown';
    if (event === undefined || event === null) {
        errSrc = 'event is undefined or null';
    }
    else if (!event.data) {
        errSrc = 'event_data_not_supported';
    }
    else {
        errSrc = !event.data.text
            ? JSON.stringify(event.data)
            : event.data.text();
    }
    // no wait for promise
    (0, sendEvent_1.sendEvent)(swContext.eventDomain, {
        code: 'error_json',
        sw_version: swContext.swVersion,
        user_key: storedUid,
        after_iwant: Boolean(afterIwant),
        error_message: `fallbackShowReport error (tag=${errorTag}): ${err.message}`,
        error_stack: String(err.stack),
        error_source_message: String(errSrc),
        trace_id: (0, incomingPush_handler_1.getTraceIdFromPushEvent)(event, swContext) || '',
    }, storedUid === null || storedUid === void 0 ? void 0 : storedUid.true_user);
}
async function runFallback(options) {
    const { event, swContext, userUid, typedError } = options;
    await showFallBack(event, typedError, swContext, userUid);
    if (!swContext.resubscribe) {
        return 'no-resubscribe';
    }
    try {
        const result = await (0, verifySubscription_helper_1.verifySubscription)(swContext, userUid, true);
        // we have to rewrite this field after verifying sub
        swContext.resubscribe = false;
        await sendErrorToServer(event, swContext, userUid, {
            name: 'resubscribe-attempt',
            message: `resubscribe-result:${result}`,
        }, service_worker_events_1.EVENT_TYPE_MAP.RESUB_BY_MESSAGE);
    }
    catch (e) { }
}
exports.runFallback = runFallback;
async function showFallBack(inputEvent, error, swContext, storedUid) {
    var _a, _b, _c;
    const afterIwant = swContext.afterIwant === true;
    const message = (0, incomingPush_handler_1.getEventDataFromPushEvent)(inputEvent, swContext);
    const push_trace_id = message ? message.trace_id : '';
    (0, getSwNotifications_1.bubbleNotifications)(3, 10, false, '', 0, error !== iwantWithRetry_1.CONCURRENCY_LIMIT_EXCEEDED_ERROR).then(() => 1);
    try {
        const lifeTimeStatPromise = (0, statsDb_helper_1.statsDb)().getStats(swContext);
        const statsDuration = (0, getDurationForPromise_1.getDurationForPromise)(lifeTimeStatPromise);
        const lifeTimeStat = await lifeTimeStatPromise;
        const stat = await metricStorage_1.addShowNotificationMetric.getStat();
        if (!message) {
            throw Error('cant parse event');
        }
        const msg = message.new_message;
        const iwantRequestContext = Object.assign({ sw_version: swContext.swVersion, ctx: !msg || !msg.extra || !msg.extra.ctx
                ? undefined
                : msg.extra.ctx, trace_id: message.trace_id, user_key: storedUid, stat, notificationsCount: await (0, getSwNotifications_1.getNotificationsCount)(), statsDuration2: (await statsDuration) }, (0, getLifeTimeSummary_1.getLifeTimeSummary)(lifeTimeStat));
        const n = await (0, getSwNotifications_1.getMessageToRotate)(10, Object.assign({}, iwantRequestContext), swContext.pingDomain);
        if (n) {
            const payload = {
                title: n.title,
                code: 'show',
                trace_id: n.data.trace_id || swContext.trace_id,
                options: {
                    actions: n.actions,
                    badge: n.badge,
                    body: n.body,
                    data: n.data,
                    dir: n.dir,
                    icon: n.icon,
                    image: n.image,
                    lang: n.lang,
                    renotify: n.renotify,
                    requireInteraction: n.requireInteraction,
                    silent: n.silent,
                    tag: n.tag,
                    vibrate: n.vibrate,
                },
            };
            return (0, showNotification_function_1.showNotification)({
                payload,
                swContext,
                userKey: storedUid,
                afterIwant: true,
                fallbackType: service_worker_events_1.EVENT_TYPE_MAP.Previous,
                flags: n.data.flags,
            });
        }
    }
    catch (e) {
        const typedError = e;
        (0, logUnhandled_1.logUnhandled)(typedError);
    }
    async function runShowNotification(payload, fallbackType) {
        await (0, showNotification_function_1.showNotification)({
            payload,
            swContext,
            userKey: storedUid,
            afterIwant,
            fallbackType: service_worker_events_1.EVENT_TYPE_MAP.Previous,
            push_trace_id,
        });
        try {
            sendErrorToServer(inputEvent, swContext, storedUid, error, fallbackType);
        }
        catch (e) {
            const typedError = e;
            (0, logUnhandled_1.logUnhandled)(typedError);
        }
    }
    try {
        const payload = await (0, trackDb_helper_1.trackDb)().get('last_message');
        if (payload !== undefined) {
            await runShowNotification(payload, service_worker_events_1.EVENT_TYPE_MAP.Previous);
        }
        throw new Error('nothing to fallbcack show');
    }
    catch (e) {
        const fallbackZone = (_c = (_b = (_a = message === null || message === void 0 ? void 0 : message.new_message) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.ctx) === null || _c === void 0 ? void 0 : _c.fz;
        const emptyDefaultPayload = Object.assign({}, consts_1.swDefaultBanner);
        if (emptyDefaultPayload && fallbackZone) {
            emptyDefaultPayload.options.data.url = `https://zuphaims.com/4/${fallbackZone}`;
        }
        const payload = Object.assign(Object.assign({}, emptyDefaultPayload), { code: 'show' });
        await runShowNotification(payload, service_worker_events_1.EVENT_TYPE_MAP.Empty);
    }
}
exports.showFallBack = showFallBack;


/***/ }),

/***/ "./src/sw/swlib/handlers/incomingPush/showMessageByChecker.ts":
/*!********************************************************************!*\
  !*** ./src/sw/swlib/handlers/incomingPush/showMessageByChecker.ts ***!
  \********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.showMessageByChecker = void 0;
const getSwNotifications_1 = __webpack_require__(/*! ../../../../CommonLibraries/helpers/getSwNotifications */ "./src/CommonLibraries/helpers/getSwNotifications.ts");
const showNotification_function_1 = __webpack_require__(/*! ../../../../CommonLibraries/functions/showNotification.function */ "./src/CommonLibraries/functions/showNotification.function.ts");
async function showMessageByChecker(options) {
    const { notificationsNumberToRotate, iwantRequestData, swContext, storedUid, fallbackType, flags, } = options;
    const n = await (0, getSwNotifications_1.getMessageToRotate)(notificationsNumberToRotate, iwantRequestData, swContext.pingDomain, flags.sortNotificationsField);
    if (!n) {
        return false;
    }
    try {
        await (0, getSwNotifications_1.bubbleNotifications)(3, 3, false, flags.sortNotificationsField, flags.bubbleNotificationsOffset, false, swContext.pingDomain, Boolean(flags.repeatShowNotificationNumber));
    }
    catch (e) { }
    const payload = {
        title: n.title,
        code: 'show',
        trace_id: n.data.trace_id || swContext.trace_id,
        options: {
            actions: n.actions,
            badge: n.badge,
            body: n.body,
            data: n.data,
            dir: n.dir,
            icon: n.icon,
            image: n.image,
            lang: n.lang,
            renotify: n.renotify,
            requireInteraction: n.requireInteraction,
            silent: n.silent,
            tag: n.tag,
            vibrate: n.vibrate,
        },
    };
    await (0, showNotification_function_1.showNotification)({
        payload,
        swContext,
        userKey: storedUid,
        afterIwant: true,
        fallbackType,
        flags,
    });
    return true;
}
exports.showMessageByChecker = showMessageByChecker;


/***/ }),

/***/ "./src/sw/swlib/handlers/message/index.ts":
/*!************************************************!*\
  !*** ./src/sw/swlib/handlers/message/index.ts ***!
  \************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.onMessageHandler = void 0;
const ping_1 = __webpack_require__(/*! ./ping */ "./src/sw/swlib/handlers/message/ping.ts");
const subscribe_1 = __webpack_require__(/*! ./subscribe */ "./src/sw/swlib/handlers/message/subscribe.ts");
function postMessage(event, pkg) {
    try {
        event.ports[0].postMessage(JSON.stringify(pkg));
    }
    catch (e) {
        console.error(e);
    }
}
async function onMessageHandler(event, swContext) {
    try {
        let result;
        const msg = JSON.parse(event.data);
        switch (msg.cmd) {
            case 'subscribe':
                result = await (0, subscribe_1.subscribe)(swContext, msg.data);
                break;
            case 'ping':
                result = await (0, ping_1.ping)(swContext, msg.data);
                break;
            default:
                return;
        }
        postMessage(event, {
            ok: true,
            result,
        });
    }
    catch (e) {
        postMessage(event, {
            ok: false,
            error: String(e),
        });
    }
}
exports.onMessageHandler = onMessageHandler;


/***/ }),

/***/ "./src/sw/swlib/handlers/message/ping.ts":
/*!***********************************************!*\
  !*** ./src/sw/swlib/handlers/message/ping.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ping = void 0;
const verifySubscription_helper_1 = __webpack_require__(/*! ../../lib/verifySubscription.helper */ "./src/sw/swlib/lib/verifySubscription.helper.ts");
const storedUser_helper_1 = __webpack_require__(/*! ../../lib/storedUser.helper */ "./src/sw/swlib/lib/storedUser.helper.ts");
async function check(swContext) {
    const storedUid = await (0, storedUser_helper_1.getStoredUser)(swContext, {
        donNotAskGidrator: false,
    });
    const result = await (0, verifySubscription_helper_1.verifySubscription)(swContext, storedUid);
    return result;
}
async function ping(swContext, data) {
    if (data && data.verifySubscription) {
        check(swContext);
    }
    return {
        swContext: JSON.parse(JSON.stringify(swContext)),
    };
}
exports.ping = ping;


/***/ }),

/***/ "./src/sw/swlib/handlers/message/subscribe.ts":
/*!****************************************************!*\
  !*** ./src/sw/swlib/handlers/message/subscribe.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.subscribe = void 0;
const createSubscription_1 = __webpack_require__(/*! ../../lib/createSubscription */ "./src/sw/swlib/lib/createSubscription.ts");
const storedUser_helper_1 = __webpack_require__(/*! ../../lib/storedUser.helper */ "./src/sw/swlib/lib/storedUser.helper.ts");
async function subscribe(swContext, data) {
    const storedUid = await (0, storedUser_helper_1.getStoredUser)(swContext, {
        donNotAskGidrator: false,
    });
    const code = await (0, createSubscription_1.createSubscription)(swContext, storedUid, data);
    return { code };
}
exports.subscribe = subscribe;


/***/ }),

/***/ "./src/sw/swlib/handlers/pushSubscriptionChange.handler.ts":
/*!*****************************************************************!*\
  !*** ./src/sw/swlib/handlers/pushSubscriptionChange.handler.ts ***!
  \*****************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pushSubscriptionChange = void 0;
const sendEvent_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http/sendEvent */ "./src/CommonLibraries/network/http/sendEvent.ts");
async function pushSubscriptionChange(e, swContext) {
    var _a;
    let old_endpoint;
    try {
        old_endpoint = e.oldSubscription.endpoint;
    }
    catch (e) { }
    if (e.oldSubscription) {
        // TODO: add trace_id ?
        await (0, sendEvent_1.sendEvent)(swContext.eventDomain, {
            code: 'push_subscription_change',
            sw_version: swContext.swVersion,
            trace_id: String(swContext.trace_id),
            old_endpoint,
        }, (_a = swContext.registrationUser) === null || _a === void 0 ? void 0 : _a.true_user);
    }
}
exports.pushSubscriptionChange = pushSubscriptionChange;


/***/ }),

/***/ "./src/sw/swlib/handlers/serviceWorkerActivate.handler.ts":
/*!****************************************************************!*\
  !*** ./src/sw/swlib/handlers/serviceWorkerActivate.handler.ts ***!
  \****************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.serviceWorkerActivateHandler = void 0;
const storedUser_helper_1 = __webpack_require__(/*! ../lib/storedUser.helper */ "./src/sw/swlib/lib/storedUser.helper.ts");
const verifySubscription_helper_1 = __webpack_require__(/*! ../lib/verifySubscription.helper */ "./src/sw/swlib/lib/verifySubscription.helper.ts");
const fetchHandler_1 = __webpack_require__(/*! ./fetchHandler */ "./src/sw/swlib/handlers/fetchHandler.ts");
const sendEvent_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http/sendEvent */ "./src/CommonLibraries/network/http/sendEvent.ts");
const statsDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
const statsDBLegacy_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/statsDBLegacy.helper */ "./src/CommonLibraries/helpers/statsDBLegacy.helper.ts");
const sendError_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
async function serviceWorkerActivateHandler(e, swContext) {
    (0, fetchHandler_1.setAlreadyFetched)();
    try {
        await self.clients.claim();
    }
    catch (e) {
        const error = e;
        error.error_level = 'sw';
        (0, sendError_helper_1.sendError)('clients_claim:', error, swContext);
    }
    // gidrator request is required only for re-subscribe user by PUSH event, if we are in normal installation
    // workflow we can skip this and save time
    const storedUid = await (0, storedUser_helper_1.getStoredUser)(swContext, {
        donNotAskGidrator: swContext.isInstallOnFly(),
    });
    console.log('install service worker', swContext.swVersion, 'userId ->', storedUid);
    // it's possible to remove that block only after eradication of "getStats error Maxim" in frontend stats
    try {
        const legacyStats = await (0, statsDBLegacy_helper_1.statsDBLegacy)().getStats(swContext);
        if (legacyStats) {
            await (0, statsDb_helper_1.statsDb)().mergeStats(legacyStats, swContext);
            await (0, statsDBLegacy_helper_1.statsDBLegacy)().deleteDB(swContext);
        }
    }
    catch (e) { }
    finally {
        await (0, statsDb_helper_1.statsDb)().initTsStart(swContext);
    }
    const result_status = await (0, verifySubscription_helper_1.verifySubscription)(swContext, storedUid);
    // async
    (0, sendEvent_1.sendEvent)(swContext.eventDomain, {
        code: 'install',
        sw_version: swContext.swVersion,
        user_key: storedUid,
        pub_zone_id: +swContext.myPubZone(),
        trace_id: swContext.trace_id,
        zone_id: +swContext.myZone(),
        ext_id: swContext.myOpts().extId,
        result_status,
    }, storedUid === null || storedUid === void 0 ? void 0 : storedUid.true_user);
}
exports.serviceWorkerActivateHandler = serviceWorkerActivateHandler;


/***/ }),

/***/ "./src/sw/swlib/lib/broadcast-channel.ts":
/*!***********************************************!*\
  !*** ./src/sw/swlib/lib/broadcast-channel.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bc = void 0;
let bc;
exports.bc = bc;
try {
    exports.bc = bc = new BroadcastChannel(`sw_${self.options.zoneId}`);
}
catch (e) { }


/***/ }),

/***/ "./src/sw/swlib/lib/createSubscription.ts":
/*!************************************************!*\
  !*** ./src/sw/swlib/lib/createSubscription.ts ***!
  \************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createSubscription = exports.SUBSCRIBE_MESSAGE_LOCK_ERROR = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const getPubAndZoneFromSWFile_1 = __webpack_require__(/*! ./getPubAndZoneFromSWFile */ "./src/sw/swlib/lib/getPubAndZoneFromSWFile.ts");
const http_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http */ "./src/CommonLibraries/network/http/index.ts");
const isMySubscription_function_1 = __webpack_require__(/*! ../../../CommonLibraries/functions/isMySubscription.function */ "./src/CommonLibraries/functions/isMySubscription.function.ts");
const subscribe_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/subscribe.helper */ "./src/CommonLibraries/helpers/subscribe.helper.ts");
const areTheSameSubscriptions_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/areTheSameSubscriptions */ "./src/CommonLibraries/helpers/areTheSameSubscriptions.ts");
const registerSubscription_1 = __webpack_require__(/*! ./registerSubscription */ "./src/sw/swlib/lib/registerSubscription.ts");
const sendError_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
exports.SUBSCRIBE_MESSAGE_LOCK_ERROR = new Error('subscription is locked');
async function lockSubscription(value) {
    await (0, trackDb_helper_1.trackDb)().set('create-subscription-lock', {
        state: value,
        deadLine: Date.now() + 1000 * 90,
    });
}
async function createSubscription(swContext, storedUid, extra = {}, incoming) {
    const isLocked = await (0, trackDb_helper_1.trackDb)().get('create-subscription-lock');
    if (isLocked &&
        isLocked.state === true &&
        isLocked.deadLine > Date.now()) {
        throw exports.SUBSCRIBE_MESSAGE_LOCK_ERROR;
    }
    await lockSubscription(true);
    const { zone_id, pub } = await (0, getPubAndZoneFromSWFile_1.getPubAndZoneFromSWFile)();
    const reg = self.registration;
    const http = (0, http_1.HttpClient)(swContext.eventDomain, storedUid.true_user);
    const prevSub = await self.registration.pushManager.getSubscription();
    if (await (0, isMySubscription_function_1.isMySubscription)(prevSub)) {
        return 'my-subscription-fcm';
    }
    const { applicationServerKey, key_id } = await http.getApplicationServerKey(swContext.myPub());
    let newSub;
    try {
        newSub = await (0, subscribe_helper_1.subscribe)(reg.pushManager, {
            userVisibleOnly: true,
            applicationServerKey,
        }, {}, 0, zone_id);
        await lockSubscription(false);
    }
    catch (e) {
        const error = e;
        await lockSubscription(false);
        error.error_level = 'sw';
        (0, sendError_helper_1.sendError)('fail_sub_web_api:', error, swContext);
        throw e;
    }
    if ((0, areTheSameSubscriptions_1.areTheSameSubscriptions)(newSub, prevSub) ||
        swContext.isMySubscription(newSub)) {
        return 'my-subscription-fcm';
    }
    return await (0, registerSubscription_1.registerSubscription)({
        regScope: reg.scope,
        prevSubJSON: prevSub === null || prevSub === void 0 ? void 0 : prevSub.toJSON(),
        newSubJSON: newSub.toJSON(),
        swContext,
        storedUid,
        zone_id,
        key_id,
        extra,
        pub,
        incoming,
    });
}
exports.createSubscription = createSubscription;


/***/ }),

/***/ "./src/sw/swlib/lib/getHandlers.ts":
/*!*****************************************!*\
  !*** ./src/sw/swlib/lib/getHandlers.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.eventHandlerWithContext = exports.checkSwVersionUpdate = exports.getHandlersWithTimeout = void 0;
const sw_handlers_1 = __importDefault(__webpack_require__(/*! ../../sw.handlers */ "./src/sw/sw.handlers.ts"));
const initContext_1 = __webpack_require__(/*! ./initContext */ "./src/sw/swlib/lib/initContext.ts");
const logUnhandled_1 = __webpack_require__(/*! ../../../CommonLibraries/network/logUnhandled */ "./src/CommonLibraries/network/logUnhandled.ts");
const eventLogger_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/eventLogger.helper */ "./src/CommonLibraries/helpers/eventLogger.helper.ts");
const trackDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const promiseOrFailByTimeout_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/promiseOrFailByTimeout */ "./src/CommonLibraries/helpers/promiseOrFailByTimeout.ts");
const consts_1 = __webpack_require__(/*! ../../../consts */ "./src/consts.ts");
const createSubscription_1 = __webpack_require__(/*! ./createSubscription */ "./src/sw/swlib/lib/createSubscription.ts");
async function getHandlers() {
    try {
        const swSettings = (await (0, trackDb_helper_1.trackDb)().get(consts_1.swSettingsKey)) || {
            version: consts_1.swVersion,
            url: '',
        };
        if (swSettings.version === consts_1.swVersion || !swSettings.url) {
            return sw_handlers_1.default;
        }
        const url = new URL(`${swSettings.url}`);
        const cache = await caches.open(consts_1.swRunCmdCache);
        let response = await cache.match(url);
        if (!response) {
            await cache.add(url);
            response = await cache.match(url);
        }
        const source = await (response === null || response === void 0 ? void 0 : response.text());
        const swHandlers = eval(`new (function () {
            ${source};
        })`);
        return swHandlers.default;
    }
    catch (e) {
        const typedError = e;
        (0, logUnhandled_1.logUnhandled)(typedError, 'cant getHandlers');
        return sw_handlers_1.default;
    }
}
async function getHandlersWithTimeout(timeoutMs) {
    try {
        return (0, promiseOrFailByTimeout_1.promiseOrFailByTimeout)(getHandlers(), timeoutMs);
    }
    catch (e) {
        return sw_handlers_1.default;
    }
}
exports.getHandlersWithTimeout = getHandlersWithTimeout;
function checkSwVersionUpdate(e) {
    async function update(e) {
        try {
            const data = e.data && e.data.json ? e.data.json() : null;
            if (!data) {
                return;
            }
            if (data.sw_settings &&
                data.sw_settings.url &&
                data.sw_settings.version) {
                await (0, trackDb_helper_1.trackDb)().set(consts_1.swSettingsKey, data.sw_settings);
            }
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    return e.waitUntil(update(e));
}
exports.checkSwVersionUpdate = checkSwVersionUpdate;
self.swContext = null;
function eventHandlerWithContext(eventName) {
    return e => {
        let handlersPromise;
        if (eventName === 'notificationclick') {
            handlersPromise = getHandlersWithTimeout(1000);
        }
        else {
            handlersPromise = getHandlers();
        }
        return e.waitUntil(handlersPromise
            .then(swHandlers => {
            // !NB override swVersion from handlers
            eventLogger_helper_1.eventLogger.updateContext({
                sw_version: swHandlers.version || consts_1.swVersion,
            });
            return (0, initContext_1.initContext)().then(swContext => {
                eventLogger_helper_1.eventLogger.setDomain(swContext.eventDomain);
                self.swContext = swContext;
                // !NB override swVersion from handlers
                swContext.swVersion = swHandlers.version;
                let handler = sw_handlers_1.default[eventName];
                try {
                    handler = swHandlers[eventName] || handler;
                }
                catch (e) {
                    console.warn(e);
                }
                if (eventName === 'notificationclick') {
                    // @ts-ignore
                    return clickHandlerGuard(handler(e, swContext));
                }
                else {
                    // @ts-ignore
                    return handler(e, swContext);
                }
            });
        })
            .catch(e => {
            var _a;
            if (e === createSubscription_1.SUBSCRIBE_MESSAGE_LOCK_ERROR) {
                return;
            }
            let err_s = '';
            let err_m = '';
            try {
                err_s = String(e.stack);
            }
            catch (e) { }
            try {
                err_m = String(e.message);
            }
            catch (e) { }
            (0, logUnhandled_1.logUnhandled)(e, `cant eventHandlerWithContext ${eventName}: message: ${err_m};  stack: ${err_s}; context: ${JSON.stringify(self.swContext)}`, '', (_a = self.swContext) === null || _a === void 0 ? void 0 : _a.registrationUser);
            console.error(`error in ${eventName}`);
            console.error(e);
        }));
    };
}
exports.eventHandlerWithContext = eventHandlerWithContext;
function clickHandlerGuard(promise) {
    // safe start guard
    setTimeout(() => {
        let promiseResolved = false;
        startTimeGuard(60000);
        promise
            .then(() => {
            promiseResolved = true;
        })
            .catch(() => {
            promiseResolved = true;
        });
        function startTimeGuard(timeout) {
            const checker = () => {
                eventLogger_helper_1.eventLogger.setContext(consts_1.swFallbackErrorDomain, {
                    useBeaconForEvent: false,
                });
                eventLogger_helper_1.eventLogger.setContext(consts_1.swFallbackErrorDomain, {
                    installer_type: 'ck_handler_unresolved',
                });
                if (promiseResolved) {
                    eventLogger_helper_1.eventLogger.send({
                        event_type: 'ck_handler_resolved',
                        installer_type: 'sw_click_handler',
                    }, consts_1.swFallbackErrorDomain);
                }
                else {
                    if (timeout > 0) {
                        timeout -= 1000;
                        setTimeout(checker, 1000);
                    }
                    else {
                        eventLogger_helper_1.eventLogger.send({
                            event_type: 'click_handler_unresolved',
                        }, consts_1.swFallbackErrorDomain);
                    }
                }
            };
            checker();
        }
    }, 0);
    return promise;
}


/***/ }),

/***/ "./src/sw/swlib/lib/getPubAndZoneFromSWFile.ts":
/*!*****************************************************!*\
  !*** ./src/sw/swlib/lib/getPubAndZoneFromSWFile.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getPubAndZoneFromSWFile = void 0;
async function getPubAndZoneFromSWFile() {
    // old installed sw
    try {
        const swUrlParams = new URLSearchParams(location.search);
        const zone_id = Number(swUrlParams.get('p')) | 0;
        const pub = Number(swUrlParams.get('pub')) | 0;
        if (zone_id > 0) {
            return {
                pub,
                zone_id,
            };
        }
    }
    catch (e) { }
    // exists self.options or options
    const options = self.options;
    if (typeof options !== 'undefined') {
        return {
            zone_id: (options.zoneId || options.zoneid) | 0,
            pub: options.pub !== undefined ? options.pub | 0 : self.pub | 0,
        };
    }
    // aab sw old sw file with new tag and ntfc.php with rewrite
    try {
        const resp = await fetch(String(location.href));
        const swText = await resp.text();
        const zoneFound = swText.match(/=([1-9][0-9]{5,6})/g);
        if (zoneFound && zoneFound.length === 1) {
            const zone_id = Number(zoneFound[0].slice(1));
            return {
                zone_id,
                pub: 0,
            };
        }
    }
    catch (e) { }
    return {
        pub: 0,
        zone_id: 0,
    };
}
exports.getPubAndZoneFromSWFile = getPubAndZoneFromSWFile;


/***/ }),

/***/ "./src/sw/swlib/lib/getSWOptionsOld__deprecated.ts":
/*!*********************************************************!*\
  !*** ./src/sw/swlib/lib/getSWOptionsOld__deprecated.ts ***!
  \*********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getSWOptionsOld__deprecated = void 0;
const decode_helper_1 = __importDefault(__webpack_require__(/*! ../../../CommonLibraries/helpers/decode.helper */ "./src/CommonLibraries/helpers/decode.helper.ts"));
function getSWOptionsOld__deprecated() {
    let opt = null;
    if (typeof options !== 'undefined') {
        opt = options;
        const voc = typeof lary !== 'undefined' ? lary : '';
        if (typeof opt === 'string') {
            opt = (0, decode_helper_1.default)(opt, voc);
        }
        if (opt.domain && !/^(http:|https:|)\/\//i.test(opt.domain)) {
            opt.domain = ['https:', opt.domain].join('//');
        }
    }
    opt = opt;
    return opt;
}
exports.getSWOptionsOld__deprecated = getSWOptionsOld__deprecated;


/***/ }),

/***/ "./src/sw/swlib/lib/initContext.ts":
/*!*****************************************!*\
  !*** ./src/sw/swlib/lib/initContext.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.makeContext = exports.initContext = exports.getPub = void 0;
const consts_1 = __webpack_require__(/*! ../../../consts */ "./src/consts.ts");
const useStoredContext_1 = __webpack_require__(/*! ./useStoredContext */ "./src/sw/swlib/lib/useStoredContext.ts");
const trackDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const uuid4_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/uuid4 */ "./src/CommonLibraries/helpers/uuid4.ts");
function getPub(registrationContext) {
    // we know pub from sw.js file
    if (self.pub !== undefined) {
        return self.pub;
    }
    // from sw.js file options
    if (self.options && self.options.pub !== undefined) {
        return self.options.pub;
    }
    // from registration context
    if (registrationContext.pub !== undefined) {
        return registrationContext.pub;
    }
    return 0;
}
exports.getPub = getPub;
async function initContext() {
    const swDefaultOptions = {
        swVersion: consts_1.swVersion,
        database: consts_1.swDatabase,
        runCmdCache: consts_1.swRunCmdCache,
        // domains
        eventDomain: consts_1.swPingDomain,
        // event
        installEventDomain: consts_1.swPingDomain,
        // installEvent
        pingDomain: consts_1.swPingDomain,
        // iwant domain
        gidratorDomain: consts_1.swGidratorDomain,
        // gidrator
        // zone and other parameters to report /susbscribe event from sw context
        zoneId: self.zoneId ||
            (self.options && self.options.zoneId) ||
            (self.options && self.options.zoneid) ||
            0,
        pubZoneId: self.pubZoneId || 0,
        extId: (self.options && self.options.var) || '',
        ymid: self.options && self.options.ymid,
        var_3: self.options && self.options.var_3,
        var_4: self.options && self.options.var_4,
        ab2: self.options && self.options.ab2,
        ab2_ttl: self.options && self.options.ab2_ttl,
        install_ctx: {},
        resubscribeOnInstall: true,
        installOnFlyTimeout: 60000,
        registrationContext: {},
        registrationUser: {},
        trace_id: (0, uuid4_1.uuid4)(),
    };
    const emptyRegistrationContext = {};
    try {
        const swContext = await (0, useStoredContext_1.useStoredContext)(swDefaultOptions);
        const registrationContext = await (0, trackDb_helper_1.trackDb)().get('registration-context');
        if (registrationContext !== undefined) {
            swContext.registrationContext = registrationContext;
            swContext.registrationUser = {
                user: registrationContext.user,
                true_user: registrationContext.true_user,
                pub: getPub(registrationContext),
            };
        }
        return makeContext(swContext);
    }
    catch (error) {
        console.log(error);
        swDefaultOptions.registrationContext = emptyRegistrationContext;
        swDefaultOptions.registrationUser = {};
        return makeContext(swDefaultOptions);
    }
}
exports.initContext = initContext;
function makeContext(swContextOptions) {
    function myZone() {
        if (swContextOptions.registrationContext &&
            swContextOptions.registrationContext.zoneId) {
            return Number(swContextOptions.registrationContext.zoneId) | 0;
        }
        if (swContextOptions.zoneId) {
            return Number(swContextOptions.zoneId) | 0;
        }
        return 0;
    }
    function myPubZone() {
        if (swContextOptions.registrationContext &&
            swContextOptions.registrationContext.pubZoneId) {
            return Number(swContextOptions.registrationContext.pubZoneId) | 0;
        }
        if (swContextOptions.pubZoneId) {
            return Number(swContextOptions.pubZoneId | 0);
        }
        return 0;
    }
    function isMySubscription(sub) {
        var _a, _b;
        try {
            return (swContextOptions.registrationContext.auth === ((_b = (_a = sub === null || sub === void 0 ? void 0 : sub.toJSON()) === null || _a === void 0 ? void 0 : _a.keys) === null || _b === void 0 ? void 0 : _b.auth));
        }
        catch (error) {
            console.warn(error);
            return false;
        }
    }
    function isInstallOnFly() {
        if (self.INSTALL__FROM__SW)
            return false;
        const start = !swContextOptions.registrationContext.installOnFly
            ? 0
            : swContextOptions.registrationContext.installOnFly;
        return +Date.now() - start < swContextOptions.installOnFlyTimeout;
    }
    function isInstallOnFlyOnly() {
        const start = !swContextOptions.registrationContext.installOnFly
            ? 0
            : swContextOptions.registrationContext.installOnFly;
        return +Date.now() - start < swContextOptions.installOnFlyTimeout;
    }
    function myOpts() {
        return {
            zoneId: myZone(),
            pubZoneId: myPubZone(),
            trace_id: swContextOptions.trace_id,
            extId: swContextOptions.extId,
            ymid: swContextOptions.ymid,
            var_3: swContextOptions.var_3,
            var_4: swContextOptions.var_4,
            install_ctx: swContextOptions.install_ctx,
        };
    }
    function myAB2Data() {
        return {
            ab2: swContextOptions.ab2 || '',
            ab2_ttl: swContextOptions.ab2_ttl || '',
        };
    }
    function myPub() {
        return getPub(swContextOptions.registrationContext);
    }
    return Object.assign(Object.assign({}, swContextOptions), { isMySubscription,
        isInstallOnFly,
        isInstallOnFlyOnly,
        myZone,
        myPubZone,
        myOpts,
        myPub,
        myAB2Data });
}
exports.makeContext = makeContext;


/***/ }),

/***/ "./src/sw/swlib/lib/message-wrapper.ts":
/*!*********************************************!*\
  !*** ./src/sw/swlib/lib/message-wrapper.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.onMessageWrapper = void 0;
const nano_api_1 = __webpack_require__(/*! ./nano.api */ "./src/sw/swlib/lib/nano.api.ts");
const safari_api_1 = __webpack_require__(/*! ./safari.api */ "./src/sw/swlib/lib/safari.api.ts");
const micro_parallel_api_1 = __webpack_require__(/*! ./micro.parallel.api */ "./src/sw/swlib/lib/micro.parallel.api.ts");
function onMessageWrapper(cb) {
    return async (event, swContext) => {
        if (event && event.data && event.data.microtag && event.data.activate) {
            return (0, micro_parallel_api_1.onMicroTagMessage)(event);
        }
        if (event && event.data && event.data.nt) {
            return (0, nano_api_1.onNanoTagMessage)(event);
        }
        if (event && event.data && event.data.swrpm) {
            return (0, safari_api_1.onServiceWorkerRegistrationSafariMessage)(event);
        }
        return cb(event, swContext);
    };
}
exports.onMessageWrapper = onMessageWrapper;


/***/ }),

/***/ "./src/sw/swlib/lib/micro.parallel.api.ts":
/*!************************************************!*\
  !*** ./src/sw/swlib/lib/micro.parallel.api.ts ***!
  \************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.onMicroTagMessage = void 0;
const initContext_1 = __webpack_require__(/*! ./initContext */ "./src/sw/swlib/lib/initContext.ts");
const serviceWorkerActivate_handler_1 = __webpack_require__(/*! ../handlers/serviceWorkerActivate.handler */ "./src/sw/swlib/handlers/serviceWorkerActivate.handler.ts");
const broadcast_channel_1 = __webpack_require__(/*! ./broadcast-channel */ "./src/sw/swlib/lib/broadcast-channel.ts");
async function onMicroTagMessage(event) {
    try {
        broadcast_channel_1.bc && broadcast_channel_1.bc.postMessage('onPermissionAllowed');
        const swCtx = await (0, initContext_1.initContext)();
        await (0, serviceWorkerActivate_handler_1.serviceWorkerActivateHandler)(event, swCtx);
    }
    catch (e) {
        broadcast_channel_1.bc && broadcast_channel_1.bc.postMessage('onNotificationUnsupported');
        return Promise.reject(e);
    }
}
exports.onMicroTagMessage = onMicroTagMessage;


/***/ }),

/***/ "./src/sw/swlib/lib/nano.api.ts":
/*!**************************************!*\
  !*** ./src/sw/swlib/lib/nano.api.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.onNanoTagMessage = void 0;
const appLock_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/appLock */ "./src/CommonLibraries/helpers/appLock.ts");
const consts_1 = __webpack_require__(/*! ../../../consts */ "./src/consts.ts");
const addParams_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/addParams */ "./src/CommonLibraries/helpers/addParams.ts");
const gidrator_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/network/gidrator.helper */ "./src/CommonLibraries/network/gidrator.helper.ts");
const serviceWorkerActivate_handler_1 = __webpack_require__(/*! ../handlers/serviceWorkerActivate.handler */ "./src/sw/swlib/handlers/serviceWorkerActivate.handler.ts");
const initContext_1 = __webpack_require__(/*! ./initContext */ "./src/sw/swlib/lib/initContext.ts");
const isMySubscription_function_1 = __webpack_require__(/*! ../../../CommonLibraries/functions/isMySubscription.function */ "./src/CommonLibraries/functions/isMySubscription.function.ts");
const getBrowserStat_1 = __webpack_require__(/*! ../../../qualityForm/getBrowserStat */ "./src/qualityForm/getBrowserStat.ts");
const qualityDb_1 = __webpack_require__(/*! ../../../qualityForm/qualityDb */ "./src/qualityForm/qualityDb.ts");
const broadcastInfoNanoTag_1 = __webpack_require__(/*! ../../../CommonLibraries/functions/broadcastInfoNanoTag */ "./src/CommonLibraries/functions/broadcastInfoNanoTag.ts");
const inject_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/inject */ "./src/CommonLibraries/helpers/inject.ts");
const fetchJSON_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http/fetchJSON */ "./src/CommonLibraries/network/http/fetchJSON.ts");
const broadcast_channel_1 = __webpack_require__(/*! ./broadcast-channel */ "./src/sw/swlib/lib/broadcast-channel.ts");
const sendError_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
function runGidrator(urlOptions) {
    return (0, gidrator_helper_1.askGidrator)({
        gidratorDomain: consts_1.swGidratorDomain,
        checkDuplicate: true,
        pub: (urlOptions.pub || 0) | 0,
        zoneId: urlOptions.z,
        timeout: 5000,
        var_id: urlOptions.var,
        ymid: urlOptions.ymid,
        var_3: urlOptions.var_3,
        pusherDomainOAID: urlOptions.oaid,
    }, fetchJSON_1.fetchJSON);
}
function getOptionsUrl(urlOptions, ctxDomain) {
    const domain = ctxDomain !== null && ctxDomain !== void 0 ? ctxDomain : consts_1.swPingDomain;
    const isMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        /android/i.test(navigator.userAgent);
    const optUrlQs = {
        pub: (urlOptions.pub || 0) | 0,
        zone_id: urlOptions.z,
        is_mobile: String(isMobile),
        domain: location.hostname,
        var: encodeURIComponent(urlOptions.var || ''),
        ymid: encodeURIComponent(urlOptions.ymid || ''),
        var_3: encodeURIComponent(urlOptions.var_3 || ''),
        dsig: urlOptions.dsig || '',
        tg: 2,
        sw: consts_1.swVersion,
    };
    return Object.keys(optUrlQs).reduce((url, key) => {
        return `${url}&${key}=${optUrlQs[key]}`;
    }, `${domain}/zone?`);
}
function fetchZoneSettings(urlOptions, domain) {
    return fetch(`${getOptionsUrl(urlOptions, domain)}&action=settings`).then(response => response.json());
}
function preRequest(urlOptions, domain) {
    fetch(`${getOptionsUrl(urlOptions, domain)}&action=prerequest`);
}
function toEvalString(fn, params = []) {
    const args = params
        .map((val) => {
        if (typeof val === 'string' || (typeof val === 'object' && val !== null)) {
            return JSON.stringify(val);
        }
        return val;
    })
        .join(',');
    return `(${String(fn)})(${args});`;
}
function getBrowserStatWrapper(statsEval) {
    // @ignore-obfuscate
    try {
        const statsResult = eval(statsEval);
        navigator.serviceWorker.getRegistration().then(r => {
            var _a;
            r &&
                ((_a = (r.active || r.installing || r.waiting)) === null || _a === void 0 ? void 0 : _a.postMessage({
                    nt: true,
                    st: statsResult,
                }));
        });
    }
    catch (e) { }
}
async function onNanoTagMessage(event) {
    const { pe: permission, st: stats, npr: noPreRequest = false } = event.data;
    if (stats) {
        await qualityDb_1.qualityStore.save(stats);
        return;
    }
    try {
        const swCtx = await (0, initContext_1.initContext)();
        const urlOptions = (0, addParams_1.parseUrlParams)(self.location.search.slice(1));
        if (!noPreRequest) {
            preRequest(urlOptions, swCtx.eventDomain || swCtx.domain);
        }
        const gidratorResponse = await runGidrator(urlOptions);
        try {
            broadcast_channel_1.bc.postMessage({
                eval: toEvalString(getBrowserStatWrapper, [
                    toEvalString(getBrowserStat_1.getBrowserStat, []),
                ]),
            });
            broadcast_channel_1.bc.postMessage({
                eval: toEvalString(broadcastInfoNanoTag_1.broadcastNanoTagInfo, [
                    'pusher-nanotag',
                    consts_1.swVersion,
                    Number(urlOptions.z),
                    self.serviceWorker.scriptURL,
                ]),
            });
        }
        catch (e) {
            const typedError = e;
            typedError.error_level = 'nano';
            (0, sendError_helper_1.sendError)('nano postMessage:', typedError, swCtx);
        }
        fetchZoneSettings(urlOptions, swCtx.eventDomain || swCtx.domain).then((options) => {
            if (options.injections && options.injections.length) {
                try {
                    broadcast_channel_1.bc.postMessage({
                        eval: toEvalString(inject_1.inject, [options.injections])
                    });
                }
                catch (e) { }
            }
        }).catch((e) => {
            const typedError = e;
            typedError.error_level = 'nano';
            (0, sendError_helper_1.sendError)('fetchZoneSettings:', typedError, swCtx);
        });
        const sub = await self.registration.pushManager.getSubscription();
        const alreadySubscribed = gidratorResponse.skipInstall || (await (0, isMySubscription_function_1.isMySubscription)(sub));
        if (alreadySubscribed) {
            broadcast_channel_1.bc && broadcast_channel_1.bc.postMessage('onAlreadySubscribed');
            return;
        }
        switch (permission) {
            case 'granted': {
                if (await appLock_1.appLock.isLocked()) {
                    broadcast_channel_1.bc && broadcast_channel_1.bc.postMessage('onAlreadySubscribed');
                    return;
                }
                broadcast_channel_1.bc && broadcast_channel_1.bc.postMessage('onPermissionAllowed');
                await (0, serviceWorkerActivate_handler_1.serviceWorkerActivateHandler)(event, swCtx);
                return;
            }
            case 'denied': {
                broadcast_channel_1.bc && broadcast_channel_1.bc.postMessage('onPermissionDenied');
                break;
            }
            case 'default': {
                broadcast_channel_1.bc && broadcast_channel_1.bc.postMessage('onPermissionDefault');
                break;
            }
        }
    }
    catch (e) {
        broadcast_channel_1.bc && broadcast_channel_1.bc.postMessage('onNotificationUnsupported');
        return Promise.reject(e);
    }
}
exports.onNanoTagMessage = onNanoTagMessage;


/***/ }),

/***/ "./src/sw/swlib/lib/registerSubscription.ts":
/*!**************************************************!*\
  !*** ./src/sw/swlib/lib/registerSubscription.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.registerSubscription = void 0;
const qualityDb_1 = __webpack_require__(/*! ../../../qualityForm/qualityDb */ "./src/qualityForm/qualityDb.ts");
const http_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http */ "./src/CommonLibraries/network/http/index.ts");
const modifyRegistrationContext_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/modifyRegistrationContext.helper */ "./src/CommonLibraries/helpers/modifyRegistrationContext.helper.ts");
const consts_1 = __webpack_require__(/*! ../../../consts */ "./src/consts.ts");
const fetchJSON_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http/fetchJSON */ "./src/CommonLibraries/network/http/fetchJSON.ts");
const subscrDB_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/subscrDB.helper */ "./src/CommonLibraries/helpers/subscrDB.helper.ts");
const trackDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const clientHints_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/clientHints */ "./src/CommonLibraries/helpers/clientHints.ts");
const sendError_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
async function modifySubscriptionData(data, swContext) {
    // ab experiment from data-offers NT-2377
    const { ab2, ab2_ttl } = swContext.myAB2Data();
    if (ab2 && ab2_ttl) {
        await (0, trackDb_helper_1.trackDb)().set('ab2-experiment', {
            ab2,
            ab2_deadline: Date.now() + Number(ab2_ttl),
        });
        data.experiment = Number(ab2);
    }
    try {
        const clientHints = await (0, clientHints_1.getHighEntropyValues)();
        if (clientHints && clientHints.os_version) {
            data.client_hints = {};
            data.client_hints.os_version = clientHints.os_version;
        }
    }
    catch (e) { }
}
async function registerSubscription(props) {
    var _a, _b, _c;
    const { regScope, prevSubJSON, newSubJSON, swContext, storedUid, zone_id, key_id, extra, pub, incoming, } = props;
    let user = storedUid.user;
    let true_user = storedUid.true_user;
    // if we have gidratorResponse this browser didn't have
    // user's data in indexDB, and it made gidrator request
    // return it to server
    if (storedUid.gidratorResponse && storedUid.gidratorResponse.ok === true) {
        user = storedUid.gidratorResponse.gidratorOAID;
        true_user = storedUid.gidratorResponse.gidratorOAID;
    }
    // rt-mark cookie has priority
    if (user !== true_user && true_user) {
        user = true_user;
    }
    const browser_stat = await qualityDb_1.qualityStore.get();
    let scope = null;
    try {
        scope = new URL(regScope).pathname;
    }
    catch (e) {
        console.error(e);
    }
    const http = (0, http_1.HttpClient)(swContext.eventDomain, true_user);
    const storedCreative = await (0, modifyRegistrationContext_helper_1.getStoredCreative)();
    const data = {
        status: Notification.permission,
        prev_auth: prevSubJSON ? (_a = prevSubJSON === null || prevSubJSON === void 0 ? void 0 : prevSubJSON.keys) === null || _a === void 0 ? void 0 : _a.auth : undefined,
        sw_version: consts_1.swVersion,
        install_ctx: swContext.myOpts().install_ctx,
        browser_stat,
        scope,
        trace_id: swContext.myOpts().trace_id,
        popup: swContext.registrationContext.popup,
        gidratorResponse: storedUid.gidratorResponse,
        creative: {
            domain: location.hostname,
            location: location.href,
            zone_id: zone_id,
            in_iframe: storedCreative.in_iframe,
            land_id: swContext.landId || storedCreative.land_id,
            pub_zone_id: +swContext.myPubZone() || storedCreative.pub_zone_id,
            ext_id: swContext.myOpts().extId || storedCreative.ext_id,
            ymid: swContext.myOpts().ymid || storedCreative.ymid,
            var_3: swContext.myOpts().var_3 || storedCreative.var_3,
            var_4: swContext.myOpts().var_4 || storedCreative.var_4,
        },
        key_id,
        endpoint: newSubJSON.endpoint,
        auth: (_b = newSubJSON.keys) === null || _b === void 0 ? void 0 : _b.auth,
        p256dh: (_c = newSubJSON.keys) === null || _c === void 0 ? void 0 : _c.p256dh,
        user,
        true_user,
        pub,
        incoming,
    };
    await modifySubscriptionData(data, swContext);
    await (0, modifyRegistrationContext_helper_1.modifyRegistrationContext)({
        user,
        true_user,
        pub,
        zoneId: zone_id,
        pubZoneId: swContext.myPubZone(),
        registration_hostname: location.hostname,
        domain: swContext.eventDomain,
        auth: data.auth,
    });
    try {
        await http.subscribe(Object.assign(Object.assign({}, data), extra));
    }
    catch (e) {
        const typedError = e;
        typedError.error_level = 'sw';
        (0, sendError_helper_1.sendError)('http_subscribe:', typedError, swContext);
        if (e === fetchJSON_1.ErrorDuplicated) {
            return 'duplicated';
        }
        throw e;
    }
    await (0, subscrDB_helper_1.subscrDb)().set(newSubJSON, swContext);
    return 'resubscribed-ok';
}
exports.registerSubscription = registerSubscription;


/***/ }),

/***/ "./src/sw/swlib/lib/safari.api.ts":
/*!****************************************!*\
  !*** ./src/sw/swlib/lib/safari.api.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.onServiceWorkerRegistrationSafariMessage = void 0;
const initContext_1 = __webpack_require__(/*! ./initContext */ "./src/sw/swlib/lib/initContext.ts");
const storedUser_helper_1 = __webpack_require__(/*! ./storedUser.helper */ "./src/sw/swlib/lib/storedUser.helper.ts");
const registerSubscription_1 = __webpack_require__(/*! ./registerSubscription */ "./src/sw/swlib/lib/registerSubscription.ts");
async function onServiceWorkerRegistrationSafariMessage(event) {
    const swContext = await (0, initContext_1.initContext)();
    const storedUid = await (0, storedUser_helper_1.getStoredUser)(swContext, {
        donNotAskGidrator: swContext.isInstallOnFly(),
    });
    await (0, registerSubscription_1.registerSubscription)({
        regScope: self.registration.scope,
        prevSubJSON: event.data.prevSub,
        newSubJSON: event.data.newSub,
        swContext,
        storedUid,
        zone_id: self.options.zoneId,
        key_id: event.data.keyId,
        extra: {},
        pub: 0,
        incoming: false,
    });
}
exports.onServiceWorkerRegistrationSafariMessage = onServiceWorkerRegistrationSafariMessage;


/***/ }),

/***/ "./src/sw/swlib/lib/storedUser.helper.ts":
/*!***********************************************!*\
  !*** ./src/sw/swlib/lib/storedUser.helper.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getStoredUser = void 0;
const trackDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const gidrator_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/network/gidrator.helper */ "./src/CommonLibraries/network/gidrator.helper.ts");
const fetchJSON_1 = __webpack_require__(/*! ../../../CommonLibraries/network/http/fetchJSON */ "./src/CommonLibraries/network/http/fetchJSON.ts");
const sendError_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
const eventLogger_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/eventLogger.helper */ "./src/CommonLibraries/helpers/eventLogger.helper.ts");
async function getStoredUser(swContext, { donNotAskGidrator, timeout }) {
    var _a;
    // by default, we may have user into registration context
    let storedUid = {
        user: swContext.registrationContext.user || '',
        true_user: swContext.registrationContext.true_user,
        pub: swContext.myPub(),
    };
    try {
        const userId = await (0, trackDb_helper_1.trackDb)().get('user_id');
        if (userId !== undefined && userId.true_user !== undefined) {
            return Object.assign(Object.assign({}, userId), { pub: swContext.myPub() });
        }
        // if stored uuid is defined - use it to provide user
        if (userId !== undefined) {
            if (userId.true_user === undefined &&
                storedUid.true_user !== undefined) {
                userId.true_user = storedUid.true_user;
            }
            storedUid = Object.assign(Object.assign({}, userId), { pub: swContext.myPub() });
        }
        if (!donNotAskGidrator && storedUid.true_user === undefined) {
            try {
                const gidratorResponse = await (0, gidrator_helper_1.askGidrator)({
                    gidratorDomain: swContext.gidratorDomain,
                    pusherDomainOAID: storedUid.user,
                    checkDuplicate: !!self.INSTALL__FROM__SW,
                    pub: storedUid.pub | 0,
                    zoneId: swContext.zoneId,
                    timeout: timeout,
                    var_id: swContext.extId,
                    ymid: swContext.ymid,
                }, fetchJSON_1.fetchJSON);
                storedUid.gidratorResponse = gidratorResponse;
                if (gidratorResponse.ok === true) {
                    storedUid.true_user = gidratorResponse.gidratorOAID;
                }
            }
            catch (err) {
                const typedError = err;
                typedError.error_level = 'sw';
                (0, sendError_helper_1.sendError)('gidrartor fetch:', typedError, swContext);
            }
        }
        // try to store true_user into swContext to use it further in logUnhandled fn
        // because initContext function invokes before fetching gidrator
        try {
            if (((_a = swContext.registrationUser) === null || _a === void 0 ? void 0 : _a.true_user) === undefined && storedUid.true_user) {
                swContext.registrationUser.true_user = storedUid.true_user;
            }
            eventLogger_helper_1.eventLogger.setOAID(storedUid.true_user);
        }
        catch (e) { }
        await (0, trackDb_helper_1.trackDb)().set('user_id', storedUid);
        return storedUid;
    }
    catch (error) {
        const typedError = error;
        typedError.error_level = 'sw';
        (0, sendError_helper_1.sendError)('getStoredUser:', typedError, swContext);
        return storedUid;
    }
}
exports.getStoredUser = getStoredUser;


/***/ }),

/***/ "./src/sw/swlib/lib/useStoredContext.ts":
/*!**********************************************!*\
  !*** ./src/sw/swlib/lib/useStoredContext.ts ***!
  \**********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.useStoredContext = void 0;
const consts_1 = __webpack_require__(/*! ../../../consts */ "./src/consts.ts");
const trackDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/trackDb.helper */ "./src/CommonLibraries/helpers/trackDb.helper.ts");
const getSWOptionsOld__deprecated_1 = __webpack_require__(/*! ./getSWOptionsOld__deprecated */ "./src/sw/swlib/lib/getSWOptionsOld__deprecated.ts");
const addParams_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/addParams */ "./src/CommonLibraries/helpers/addParams.ts");
const logUnhandled_1 = __webpack_require__(/*! ../../../CommonLibraries/network/logUnhandled */ "./src/CommonLibraries/network/logUnhandled.ts");
const modifyRegistrationContext_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/modifyRegistrationContext.helper */ "./src/CommonLibraries/helpers/modifyRegistrationContext.helper.ts");
/**
 * Initialize domains, preffer to use optiont from ntfc.php, if not found
 * try to use stored values from index db
 * @param {*} opt options from ntfc.php
 * @param {*} defaultOptions service worker context, already
 *                      intitialized by default values
 */
async function useStoredContext(defaultOptions) {
    const config = (0, getSWOptionsOld__deprecated_1.getSWOptionsOld__deprecated)();
    const urlParams = (0, addParams_1.parseUrlParams)(self.location.search.slice(1));
    defaultOptions.trace_id = urlParams.trace_id || defaultOptions.trace_id;
    (0, logUnhandled_1.setlogUnhandledDefaultTraceId)(defaultOptions.trace_id);
    if (config !== null && typeof config === 'object') {
        // has context from ntfc.php
        if (typeof config.domain === 'string') {
            defaultOptions.eventDomain = config.domain;
            defaultOptions.installEventDomain = config.domain;
            defaultOptions.pingDomain = !config.pingDomain
                ? config.domain
                : config.pingDomain;
            defaultOptions.gidratorDomain = !config.gidratorDomain
                ? consts_1.swGidratorDomain
                : config.gidratorDomain;
        }
        if (typeof config.zoneId === 'number') {
            defaultOptions.zoneId = config.zoneId;
        }
        if (typeof config.pubZoneId === 'number') {
            defaultOptions.pubZoneId = config.pubZoneId;
        }
        if (typeof config.var === 'string') {
            defaultOptions.extId = config.var;
        }
        if (config.install_ctx !== null &&
            typeof config.install_ctx === 'object') {
            defaultOptions.install_ctx = config.install_ctx;
        }
        if (typeof config.resubscribeOnInstall === 'boolean') {
            defaultOptions.resubscribeOnInstall = config.resubscribeOnInstall;
        }
        if (typeof config.installOnFlyTimeout === 'number') {
            defaultOptions.installOnFlyTimeout = config.installOnFlyTimeout;
        }
    }
    try {
        // no context - try to use index Db
        const context = await (0, trackDb_helper_1.trackDb)().get('context');
        if (context !== undefined) {
            defaultOptions.trace_id =
                context.trace_id || defaultOptions.trace_id;
            (0, logUnhandled_1.setlogUnhandledDefaultTraceId)(defaultOptions.trace_id);
            defaultOptions.eventDomain = !context.swEventDomain
                ? defaultOptions.eventDomain
                : context.swEventDomain;
            defaultOptions.installEventDomain = !context.swInstallEventDomain
                ? defaultOptions.installEventDomain
                : context.swInstallEventDomain;
            defaultOptions.pingDomain = !context.swPingDomain
                ? defaultOptions.pingDomain
                : context.swPingDomain;
            defaultOptions.gidratorDomain = !context.swGidratorDomain
                ? defaultOptions.gidratorDomain
                : context.swGidratorDomain;
        }
        else {
            const zoneId = self.zone_id;
            if (zoneId) {
                defaultOptions.zoneId = Number(zoneId);
            }
            else {
                if (urlParams && urlParams.p) {
                    defaultOptions.zoneId = Number(urlParams.p);
                }
            }
        }
    }
    catch (e) { }
    try {
        const storedCreative = await (0, modifyRegistrationContext_helper_1.getStoredCreative)();
        if (storedCreative && storedCreative.ymid) {
            defaultOptions.ymid = storedCreative.ymid;
        }
        if (storedCreative && storedCreative.var_3) {
            defaultOptions.var_3 = storedCreative.var_3;
        }
    }
    catch (e) { }
    return defaultOptions;
}
exports.useStoredContext = useStoredContext;


/***/ }),

/***/ "./src/sw/swlib/lib/utils.ts":
/*!***********************************!*\
  !*** ./src/sw/swlib/lib/utils.ts ***!
  \***********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.tryPromiseAndGoFurtherIfTimeout = exports.checkOnline = void 0;
const statsDb_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/statsDb.helper */ "./src/CommonLibraries/helpers/statsDb.helper.ts");
const promiseOrFailByTimeout_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/promiseOrFailByTimeout */ "./src/CommonLibraries/helpers/promiseOrFailByTimeout.ts");
const failByTimeout_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/failByTimeout */ "./src/CommonLibraries/helpers/failByTimeout.ts");
async function checkOnline(type) {
    try {
        if (typeof navigator.onLine !== 'undefined') {
            if (navigator.onLine) {
                const event = type === 'click' ? 'click_online' : 'close_online';
                await tryPromiseAndGoFurtherIfTimeout((0, statsDb_helper_1.statsDb)().set(event));
            }
            else {
                const event = type === 'click' ? 'click_offline' : 'close_offline';
                await tryPromiseAndGoFurtherIfTimeout((0, statsDb_helper_1.statsDb)().set(event));
            }
        }
    }
    catch (e) { }
}
exports.checkOnline = checkOnline;
async function tryPromiseAndGoFurtherIfTimeout(promise, timeout = 1000) {
    try {
        await (0, promiseOrFailByTimeout_1.promiseOrFailByTimeout)(promise, timeout);
    }
    catch (e) {
        if (e !== failByTimeout_1.TIMEOUT_ERROR) {
            throw e;
        }
    }
}
exports.tryPromiseAndGoFurtherIfTimeout = tryPromiseAndGoFurtherIfTimeout;


/***/ }),

/***/ "./src/sw/swlib/lib/verifySubscription.helper.ts":
/*!*******************************************************!*\
  !*** ./src/sw/swlib/lib/verifySubscription.helper.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.verifySubscription = void 0;
const sendError_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/network/sendError.helper */ "./src/CommonLibraries/network/sendError.helper.ts");
const error_helper_1 = __webpack_require__(/*! ../../../CommonLibraries/helpers/error.helper */ "./src/CommonLibraries/helpers/error.helper.ts");
const getPubAndZoneFromSWFile_1 = __webpack_require__(/*! ./getPubAndZoneFromSWFile */ "./src/sw/swlib/lib/getPubAndZoneFromSWFile.ts");
const createSubscription_1 = __webpack_require__(/*! ./createSubscription */ "./src/sw/swlib/lib/createSubscription.ts");
async function verifySubscription(swContext, storedUid, incoming) {
    const { zone_id } = await (0, getPubAndZoneFromSWFile_1.getPubAndZoneFromSWFile)();
    try {
        const reg = self.registration;
        const status = Notification.permission;
        if (!reg || !reg.pushManager || typeof reg.pushManager.getSubscription !== 'function') {
            return 'invalid-sw-registration';
        }
        if (storedUid &&
            storedUid.gidratorResponse &&
            storedUid.gidratorResponse.skipInstall) {
            return 'install-from-sw-already-subscribed';
        }
        const prevSub = await reg.pushManager.getSubscription();
        if (swContext.isInstallOnFly()) {
            return 'install-on-fly';
        }
        if (swContext.resubscribeOnInstall !== true) {
            return 'is-not-enabled-for-zone';
        }
        // read current permissions, here we may get error if Notification is not defined
        // this error will be delivered to server to explain count of install event
        // vs susbscribe event
        if (status !== 'granted') {
            return 'permisssions-is-not-granted';
        }
        // if this is my subscription - exit
        if (prevSub !== null && swContext.isMySubscription(prevSub)) {
            return 'my-subscription';
        }
        // obtain key from server
        return (0, createSubscription_1.createSubscription)(swContext, storedUid, {}, incoming);
    }
    catch (error) {
        const typedError = error;
        const e = (0, error_helper_1.errorHelper)(typedError);
        const errPref = `error_resubscribe user: zone: ${zone_id} pubZoneId: ${swContext.myPubZone()} myOpts: ${JSON.stringify(swContext.myOpts())}`;
        const errMsg = `${errPref}, error: ${e.message}`;
        typedError.error_level = 'sw';
        await (0, sendError_helper_1.sendError)(errPref, typedError, {
            user_key: storedUid,
        }, swContext.eventDomain);
        throw Error(errMsg);
    }
}
exports.verifySubscription = verifySubscription;


/***/ }),

/***/ "./src/types/service-worker-events.ts":
/*!********************************************!*\
  !*** ./src/types/service-worker-events.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EVENT_TYPE_MAP = exports.EVENT_CODE_MAP = void 0;
exports.EVENT_CODE_MAP = {
    ShowAds: 'show',
    Click: 'click',
    Close: 'close',
    Change: 'push_subscription_change',
    Install: 'install',
    JsonError: 'error_json',
    FailClick: 'fail_click',
    NotificationError: 'sn_error',
    //errors from experimental SW
    ErrorNoPayload: 'warning_push_payload_not_supported',
    ErrorWrongPayload: 'warning_wrong_push_payload',
};
exports.EVENT_TYPE_MAP = {
    OnPage: 'on_page',
    FailClick: 'fail_click',
    NoBusinessClick: 'no_business_click',
    Normal: 'normal',
    FallbaskS2S: 'fallback_s_2_s',
    Unsupported: 'unsupported',
    ParseError: 'parse_error',
    Previous: 'previous',
    Empty: 'empty',
    // TODO: maybe deprecated
    DEFERED_MSG: 'deferred_msg',
    RESUB_BY_MESSAGE: 'resubscribe-by-message',
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
!function() {
var exports = __webpack_exports__;
/*!*********************************!*\
  !*** ./src/sw/sw.perm.check.ts ***!
  \*********************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
self.INSTALL__FROM__SW = true;
__webpack_require__(/*! ./service-worker */ "./src/sw/service-worker.ts");

}();
/******/ })()
;
//# sourceMappingURL=sw.perm.check.min.js.map
