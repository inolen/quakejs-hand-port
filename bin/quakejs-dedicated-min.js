
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.setImmediate = setImmediate;
            async.nextTick = setImmediate;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        async.setImmediate = setImmediate;
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define('vendor/async',[], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());
/**
 * @fileoverview gl-matrix - High performance matrix and vector operations for WebGL
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 1.3.7
 */

/*
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

// Updated to use a modification of the "returnExportsGlobal" pattern from https://github.com/umdjs/umd

(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(global);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('vendor/gl-matrix',[], function () {
            return factory(root);
        });
    } else {
        // Browser globals
        factory(root);
    }
}(this, function (root) {
    

    // Tweak to your liking
    var FLOAT_EPSILON = 0.000001;

    var glMath = {};
    (function() {
        if (typeof(Float32Array) != 'undefined') {
            var y = new Float32Array(1);
            var i = new Int32Array(y.buffer);

            /**
             * Fast way to calculate the inverse square root,
             * see http://jsperf.com/inverse-square-root/5
             *
             * If typed arrays are not available, a slower
             * implementation will be used.
             *
             * @param {Number} number the number
             * @returns {Number} Inverse square root
             */
            glMath.invsqrt = function(number) {
              var x2 = number * 0.5;
              y[0] = number;
              var threehalfs = 1.5;

              i[0] = 0x5f3759df - (i[0] >> 1);

              var number2 = y[0];

              return number2 * (threehalfs - (x2 * number2 * number2));
            };
        } else {
            glMath.invsqrt = function(number) { return 1.0 / Math.sqrt(number); };
        }
    })();

    /**
     * @class System-specific optimal array type
     * @name MatrixArray
     */
    var MatrixArray = null;
    
    // explicitly sets and returns the type of array to use within glMatrix
    function setMatrixArrayType(type) {
        MatrixArray = type;
        return MatrixArray;
    }

    // auto-detects and returns the best type of array to use within glMatrix, falling
    // back to Array if typed arrays are unsupported
    function determineMatrixArrayType() {
        MatrixArray = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
        return MatrixArray;
    }
    
    determineMatrixArrayType();

    /**
     * @class 3 Dimensional Vector
     * @name vec3
     */
    var vec3 = {};
     
    /**
     * Creates a new instance of a vec3 using the default array type
     * Any javascript array-like objects containing at least 3 numeric elements can serve as a vec3
     *
     * @param {vec3} [vec] vec3 containing values to initialize with
     *
     * @returns {vec3} New vec3
     */
    vec3.create = function (vec) {
        var dest = new MatrixArray(3);

        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
        } else {
            dest[0] = dest[1] = dest[2] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a vec3, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value

     * @returns {vec3} New vec3
     */
    vec3.createFrom = function (x, y, z) {
        var dest = new MatrixArray(3);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;

        return dest;
    };

    /**
     * Copies the values of one vec3 to another
     *
     * @param {vec3} vec vec3 containing values to copy
     * @param {vec3} dest vec3 receiving copied values
     *
     * @returns {vec3} dest
     */
    vec3.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        dest[2] = vec[2];

        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec3} a First vector
     * @param {vec3} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec3.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON
        );
    };

    /**
     * Performs a vector addition
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.add = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] += vec2[0];
            vec[1] += vec2[1];
            vec[2] += vec2[2];
            return vec;
        }

        dest[0] = vec[0] + vec2[0];
        dest[1] = vec[1] + vec2[1];
        dest[2] = vec[2] + vec2[2];
        return dest;
    };

    /**
     * Performs a vector subtraction
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.subtract = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] -= vec2[0];
            vec[1] -= vec2[1];
            vec[2] -= vec2[2];
            return vec;
        }

        dest[0] = vec[0] - vec2[0];
        dest[1] = vec[1] - vec2[1];
        dest[2] = vec[2] - vec2[2];
        return dest;
    };

    /**
     * Performs a vector multiplication
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.multiply = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] *= vec2[0];
            vec[1] *= vec2[1];
            vec[2] *= vec2[2];
            return vec;
        }

        dest[0] = vec[0] * vec2[0];
        dest[1] = vec[1] * vec2[1];
        dest[2] = vec[2] * vec2[2];
        return dest;
    };

    /**
     * Negates the components of a vec3
     *
     * @param {vec3} vec vec3 to negate
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.negate = function (vec, dest) {
        if (!dest) { dest = vec; }

        dest[0] = -vec[0];
        dest[1] = -vec[1];
        dest[2] = -vec[2];
        return dest;
    };

    /**
     * Multiplies the components of a vec3 by a scalar value
     *
     * @param {vec3} vec vec3 to scale
     * @param {number} val Value to scale by
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.scale = function (vec, val, dest) {
        if (!dest || vec === dest) {
            vec[0] *= val;
            vec[1] *= val;
            vec[2] *= val;
            return vec;
        }

        dest[0] = vec[0] * val;
        dest[1] = vec[1] * val;
        dest[2] = vec[2] * val;
        return dest;
    };

    /**
     * Generates a unit vector of the same direction as the provided vec3
     * If vector length is 0, returns [0, 0, 0]
     *
     * @param {vec3} vec vec3 to normalize
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.normalize = function (vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            len = Math.sqrt(x * x + y * y + z * z);

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        } else if (len === 1) {
            dest[0] = x;
            dest[1] = y;
            dest[2] = z;
            return dest;
        }

        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        return dest;
    };

    /**
     * Generates the cross product of two vec3s
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.cross = function (vec, vec2, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];

        dest[0] = y * z2 - z * y2;
        dest[1] = z * x2 - x * z2;
        dest[2] = x * y2 - y * x2;
        return dest;
    };

    /**
     * Caclulates the length of a vec3
     *
     * @param {vec3} vec vec3 to calculate length of
     *
     * @returns {number} Length of vec
     */
    vec3.length = function (vec) {
        var x = vec[0], y = vec[1], z = vec[2];
        return Math.sqrt(x * x + y * y + z * z);
    };

    /**
     * Caclulates the squared length of a vec3
     *
     * @param {vec3} vec vec3 to calculate squared length of
     *
     * @returns {number} Squared Length of vec
     */
    vec3.squaredLength = function (vec) {
        var x = vec[0], y = vec[1], z = vec[2];
        return x * x + y * y + z * z;
    };

    /**
     * Caclulates the dot product of two vec3s
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     *
     * @returns {number} Dot product of vec and vec2
     */
    vec3.dot = function (vec, vec2) {
        return vec[0] * vec2[0] + vec[1] * vec2[1] + vec[2] * vec2[2];
    };

    /**
     * Generates a unit vector pointing from one vector to another
     *
     * @param {vec3} vec Origin vec3
     * @param {vec3} vec2 vec3 to point to
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.direction = function (vec, vec2, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0] - vec2[0],
            y = vec[1] - vec2[1],
            z = vec[2] - vec2[2],
            len = Math.sqrt(x * x + y * y + z * z);

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }

        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        return dest;
    };

    /**
     * Performs a linear interpolation between two vec3
     *
     * @param {vec3} vec First vector
     * @param {vec3} vec2 Second vector
     * @param {number} lerp Interpolation amount between the two inputs
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.lerp = function (vec, vec2, lerp, dest) {
        if (!dest) { dest = vec; }

        dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
        dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
        dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);

        return dest;
    };

    /**
     * Calculates the euclidian distance between two vec3
     *
     * Params:
     * @param {vec3} vec First vector
     * @param {vec3} vec2 Second vector
     *
     * @returns {number} Distance between vec and vec2
     */
    vec3.dist = function (vec, vec2) {
        var x = vec2[0] - vec[0],
            y = vec2[1] - vec[1],
            z = vec2[2] - vec[2];
            
        return Math.sqrt(x*x + y*y + z*z);
    };

    // Pre-allocated to prevent unecessary garbage collection
    var unprojectMat = null;
    var unprojectVec = new MatrixArray(4);
    /**
     * Projects the specified vec3 from screen space into object space
     * Based on the <a href="http://webcvs.freedesktop.org/mesa/Mesa/src/glu/mesa/project.c?revision=1.4&view=markup">Mesa gluUnProject implementation</a>
     *
     * @param {vec3} vec Screen-space vector to project
     * @param {mat4} view View matrix
     * @param {mat4} proj Projection matrix
     * @param {vec4} viewport Viewport as given to gl.viewport [x, y, width, height]
     * @param {vec3} [dest] vec3 receiving unprojected result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.unproject = function (vec, view, proj, viewport, dest) {
        if (!dest) { dest = vec; }

        if(!unprojectMat) {
            unprojectMat = mat4.create();
        }

        var m = unprojectMat;
        var v = unprojectVec;
        
        v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
        v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
        v[2] = 2.0 * vec[2] - 1.0;
        v[3] = 1.0;
        
        mat4.multiply(proj, view, m);
        if(!mat4.inverse(m)) { return null; }
        
        mat4.multiplyVec4(m, v);
        if(v[3] === 0.0) { return null; }

        dest[0] = v[0] / v[3];
        dest[1] = v[1] / v[3];
        dest[2] = v[2] / v[3];
        
        return dest;
    };

    var xUnitVec3 = vec3.createFrom(1,0,0);
    var yUnitVec3 = vec3.createFrom(0,1,0);
    var zUnitVec3 = vec3.createFrom(0,0,1);

    var tmpvec3 = vec3.create();
    /**
     * Generates a quaternion of rotation between two given normalized vectors
     *
     * @param {vec3} a Normalized source vector
     * @param {vec3} b Normalized target vector
     * @param {quat4} [dest] quat4 receiving operation result.
     *
     * @returns {quat4} dest if specified, a new quat4 otherwise
     */
    vec3.rotationTo = function (a, b, dest) {
        if (!dest) { dest = quat4.create(); }
        
        var d = vec3.dot(a, b);
        var axis = tmpvec3;
        if (d >= 1.0) {
            quat4.set(identityQuat4, dest);
        } else if (d < (0.000001 - 1.0)) {
            vec3.cross(xUnitVec3, a, axis);
            if (vec3.length(axis) < 0.000001)
                vec3.cross(yUnitVec3, a, axis);
            if (vec3.length(axis) < 0.000001)
                vec3.cross(zUnitVec3, a, axis);
            vec3.normalize(axis);
            quat4.fromAngleAxis(Math.PI, axis, dest);
        } else {
            var s = Math.sqrt((1.0 + d) * 2.0);
            var sInv = 1.0 / s;
            vec3.cross(a, b, axis);
            dest[0] = axis[0] * sInv;
            dest[1] = axis[1] * sInv;
            dest[2] = axis[2] * sInv;
            dest[3] = s * 0.5;
            quat4.normalize(dest);
        }
        if (dest[3] > 1.0) dest[3] = 1.0;
        else if (dest[3] < -1.0) dest[3] = -1.0;
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec3} vec Vector to represent as a string
     *
     * @returns {string} String representation of vec
     */
    vec3.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']';
    };

    /**
     * @class 3x3 Matrix
     * @name mat3
     */
    var mat3 = {};

    /**
     * Creates a new instance of a mat3 using the default array type
     * Any javascript array-like object containing at least 9 numeric elements can serve as a mat3
     *
     * @param {mat3} [mat] mat3 containing values to initialize with
     *
     * @returns {mat3} New mat3
     */
    mat3.create = function (mat) {
        var dest = new MatrixArray(9);

        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
        } else {
            dest[0] = dest[1] =
            dest[2] = dest[3] =
            dest[4] = dest[5] =
            dest[6] = dest[7] =
            dest[8] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a mat3, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22

     * @returns {mat3} New mat3
     */
    mat3.createFrom = function (m00, m01, m02, m10, m11, m12, m20, m21, m22) {
        var dest = new MatrixArray(9);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m02;
        dest[3] = m10;
        dest[4] = m11;
        dest[5] = m12;
        dest[6] = m20;
        dest[7] = m21;
        dest[8] = m22;

        return dest;
    };

    /**
     * Calculates the determinant of a mat3
     *
     * @param {mat3} mat mat3 to calculate determinant of
     *
     * @returns {Number} determinant of mat
     */
    mat3.determinant = function (mat) {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8];

        return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
    };

    /**
     * Calculates the inverse matrix of a mat3
     *
     * @param {mat3} mat mat3 to calculate inverse of
     * @param {mat3} [dest] mat3 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat3} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat3.inverse = function (mat, dest) {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],

            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,

            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;

        if (!d) { return null; }
        id = 1 / d;

        if (!dest) { dest = mat3.create(); }

        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;
        return dest;
    };
    
    /**
     * Performs a matrix multiplication
     *
     * @param {mat3} mat First operand
     * @param {mat3} mat2 Second operand
     * @param {mat3} [dest] mat3 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat3} dest if specified, mat otherwise
     */
    mat3.multiply = function (mat, mat2, dest) {
        if (!dest) { dest = mat; }
        

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],

            b00 = mat2[0], b01 = mat2[1], b02 = mat2[2],
            b10 = mat2[3], b11 = mat2[4], b12 = mat2[5],
            b20 = mat2[6], b21 = mat2[7], b22 = mat2[8];

        dest[0] = b00 * a00 + b01 * a10 + b02 * a20;
        dest[1] = b00 * a01 + b01 * a11 + b02 * a21;
        dest[2] = b00 * a02 + b01 * a12 + b02 * a22;

        dest[3] = b10 * a00 + b11 * a10 + b12 * a20;
        dest[4] = b10 * a01 + b11 * a11 + b12 * a21;
        dest[5] = b10 * a02 + b11 * a12 + b12 * a22;

        dest[6] = b20 * a00 + b21 * a10 + b22 * a20;
        dest[7] = b20 * a01 + b21 * a11 + b22 * a21;
        dest[8] = b20 * a02 + b21 * a12 + b22 * a22;

        return dest;
    };

    /**
     * Transforms the vec2 according to the given mat3.
     *
     * @param {mat3} matrix mat3 to multiply against
     * @param {vec2} vec    the vector to multiply
     * @param {vec2} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec2} The multiplication result
     **/
    mat3.multiplyVec2 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1];
      dest[0] = x * matrix[0] + y * matrix[3] + matrix[6];
      dest[1] = x * matrix[1] + y * matrix[4] + matrix[7];
      return dest;
    };

    /**
     * Transforms the vec3 according to the given mat3
     *
     * @param {mat3} matrix mat3 to multiply against
     * @param {vec3} vec    the vector to multiply
     * @param {vec3} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec3} The multiplication result
     **/
    mat3.multiplyVec3 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1], z = vec[2];
      dest[0] = x * matrix[0] + y * matrix[3] + z * matrix[6];
      dest[1] = x * matrix[1] + y * matrix[4] + z * matrix[7];
      dest[2] = x * matrix[2] + y * matrix[5] + z * matrix[8];
      
      return dest;
    };

    /**
     * Copies the values of one mat3 to another
     *
     * @param {mat3} mat mat3 containing values to copy
     * @param {mat3} dest mat3 receiving copied values
     *
     * @returns {mat3} dest
     */
    mat3.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat3} a First matrix
     * @param {mat3} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat3.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat3 to an identity matrix
     *
     * @param {mat3} dest mat3 to set
     *
     * @returns dest if specified, otherwise a new mat3
     */
    mat3.identity = function (dest) {
        if (!dest) { dest = mat3.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 1;
        dest[5] = 0;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    };

    /**
     * Transposes a mat3 (flips the values over the diagonal)
     *
     * Params:
     * @param {mat3} mat mat3 to transpose
     * @param {mat3} [dest] mat3 receiving transposed values. If not specified result is written to mat
     *
     * @returns {mat3} dest is specified, mat otherwise
     */
    mat3.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a01 = mat[1], a02 = mat[2],
                a12 = mat[5];

            mat[1] = mat[3];
            mat[2] = mat[6];
            mat[3] = a01;
            mat[5] = mat[7];
            mat[6] = a02;
            mat[7] = a12;
            return mat;
        }

        dest[0] = mat[0];
        dest[1] = mat[3];
        dest[2] = mat[6];
        dest[3] = mat[1];
        dest[4] = mat[4];
        dest[5] = mat[7];
        dest[6] = mat[2];
        dest[7] = mat[5];
        dest[8] = mat[8];
        return dest;
    };

    /**
     * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
     *
     * @param {mat3} mat mat3 containing values to copy
     * @param {mat4} [dest] mat4 receiving copied values
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat3.toMat4 = function (mat, dest) {
        if (!dest) { dest = mat4.create(); }

        dest[15] = 1;
        dest[14] = 0;
        dest[13] = 0;
        dest[12] = 0;

        dest[11] = 0;
        dest[10] = mat[8];
        dest[9] = mat[7];
        dest[8] = mat[6];

        dest[7] = 0;
        dest[6] = mat[5];
        dest[5] = mat[4];
        dest[4] = mat[3];

        dest[3] = 0;
        dest[2] = mat[2];
        dest[1] = mat[1];
        dest[0] = mat[0];

        return dest;
    };

    /**
     * Returns a string representation of a mat3
     *
     * @param {mat3} mat mat3 to represent as a string
     *
     * @param {string} String representation of mat
     */
    mat3.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] +
            ', ' + mat[3] + ', ' + mat[4] + ', ' + mat[5] +
            ', ' + mat[6] + ', ' + mat[7] + ', ' + mat[8] + ']';
    };

    /**
     * @class 4x4 Matrix
     * @name mat4
     */
    var mat4 = {};

    /**
     * Creates a new instance of a mat4 using the default array type
     * Any javascript array-like object containing at least 16 numeric elements can serve as a mat4
     *
     * @param {mat4} [mat] mat4 containing values to initialize with
     *
     * @returns {mat4} New mat4
     */
    mat4.create = function (mat) {
        var dest = new MatrixArray(16);

        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        return dest;
    };

    /**
     * Creates a new instance of a mat4, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m03
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m13
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22
     * @param {number} m23
     * @param {number} m30
     * @param {number} m31
     * @param {number} m32
     * @param {number} m33

     * @returns {mat4} New mat4
     */
    mat4.createFrom = function (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
        var dest = new MatrixArray(16);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m02;
        dest[3] = m03;
        dest[4] = m10;
        dest[5] = m11;
        dest[6] = m12;
        dest[7] = m13;
        dest[8] = m20;
        dest[9] = m21;
        dest[10] = m22;
        dest[11] = m23;
        dest[12] = m30;
        dest[13] = m31;
        dest[14] = m32;
        dest[15] = m33;

        return dest;
    };

    /**
     * Copies the values of one mat4 to another
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat4} dest mat4 receiving copied values
     *
     * @returns {mat4} dest
     */
    mat4.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat4} a First matrix
     * @param {mat4} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON &&
            Math.abs(a[9] - b[9]) < FLOAT_EPSILON &&
            Math.abs(a[10] - b[10]) < FLOAT_EPSILON &&
            Math.abs(a[11] - b[11]) < FLOAT_EPSILON &&
            Math.abs(a[12] - b[12]) < FLOAT_EPSILON &&
            Math.abs(a[13] - b[13]) < FLOAT_EPSILON &&
            Math.abs(a[14] - b[14]) < FLOAT_EPSILON &&
            Math.abs(a[15] - b[15]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat4 to an identity matrix
     *
     * @param {mat4} dest mat4 to set
     *
     * @returns {mat4} dest
     */
    mat4.identity = function (dest) {
        if (!dest) { dest = mat4.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 1;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = 1;
        dest[11] = 0;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;
        return dest;
    };

    /**
     * Transposes a mat4 (flips the values over the diagonal)
     *
     * @param {mat4} mat mat4 to transpose
     * @param {mat4} [dest] mat4 receiving transposed values. If not specified result is written to mat
     *
     * @param {mat4} dest is specified, mat otherwise
     */
    mat4.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a01 = mat[1], a02 = mat[2], a03 = mat[3],
                a12 = mat[6], a13 = mat[7],
                a23 = mat[11];

            mat[1] = mat[4];
            mat[2] = mat[8];
            mat[3] = mat[12];
            mat[4] = a01;
            mat[6] = mat[9];
            mat[7] = mat[13];
            mat[8] = a02;
            mat[9] = a12;
            mat[11] = mat[14];
            mat[12] = a03;
            mat[13] = a13;
            mat[14] = a23;
            return mat;
        }

        dest[0] = mat[0];
        dest[1] = mat[4];
        dest[2] = mat[8];
        dest[3] = mat[12];
        dest[4] = mat[1];
        dest[5] = mat[5];
        dest[6] = mat[9];
        dest[7] = mat[13];
        dest[8] = mat[2];
        dest[9] = mat[6];
        dest[10] = mat[10];
        dest[11] = mat[14];
        dest[12] = mat[3];
        dest[13] = mat[7];
        dest[14] = mat[11];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Calculates the determinant of a mat4
     *
     * @param {mat4} mat mat4 to calculate determinant of
     *
     * @returns {number} determinant of mat
     */
    mat4.determinant = function (mat) {
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

        return (a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
                a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
                a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
                a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
                a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
                a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33);
    };

    /**
     * Calculates the inverse matrix of a mat4
     *
     * @param {mat4} mat mat4 to calculate inverse of
     * @param {mat4} [dest] mat4 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat4} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat4.inverse = function (mat, dest) {
        if (!dest) { dest = mat; }

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,

            d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
            invDet;

            // Calculate the determinant
            if (!d) { return null; }
            invDet = 1 / d;

        dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
        dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
        dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
        dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
        dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
        dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
        dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
        dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
        dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
        dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
        dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
        dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
        dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
        dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
        dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
        dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

        return dest;
    };

    /**
     * Copies the upper 3x3 elements of a mat4 into another mat4
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat4} [dest] mat4 receiving copied values
     *
     * @returns {mat4} dest is specified, a new mat4 otherwise
     */
    mat4.toRotationMat = function (mat, dest) {
        if (!dest) { dest = mat4.create(); }

        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    };

    /**
     * Copies the upper 3x3 elements of a mat4 into a mat3
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat3} [dest] mat3 receiving copied values
     *
     * @returns {mat3} dest is specified, a new mat3 otherwise
     */
    mat4.toMat3 = function (mat, dest) {
        if (!dest) { dest = mat3.create(); }

        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[4];
        dest[4] = mat[5];
        dest[5] = mat[6];
        dest[6] = mat[8];
        dest[7] = mat[9];
        dest[8] = mat[10];

        return dest;
    };

    /**
     * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
     * The resulting matrix is useful for calculating transformed normals
     *
     * Params:
     * @param {mat4} mat mat4 containing values to invert and copy
     * @param {mat3} [dest] mat3 receiving values
     *
     * @returns {mat3} dest is specified, a new mat3 otherwise, null if the matrix cannot be inverted
     */
    mat4.toInverseMat3 = function (mat, dest) {
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[4], a11 = mat[5], a12 = mat[6],
            a20 = mat[8], a21 = mat[9], a22 = mat[10],

            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,

            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;

        if (!d) { return null; }
        id = 1 / d;

        if (!dest) { dest = mat3.create(); }

        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;

        return dest;
    };

    /**
     * Performs a matrix multiplication
     *
     * @param {mat4} mat First operand
     * @param {mat4} mat2 Second operand
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.multiply = function (mat, mat2, dest) {
        if (!dest) { dest = mat; }

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[ 0], a01 = mat[ 1], a02 = mat[ 2], a03 = mat[3];
        var a10 = mat[ 4], a11 = mat[ 5], a12 = mat[ 6], a13 = mat[7];
        var a20 = mat[ 8], a21 = mat[ 9], a22 = mat[10], a23 = mat[11];
        var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

        // Cache only the current line of the second matrix
        var b0  = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];  
        dest[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[4];
        b1 = mat2[5];
        b2 = mat2[6];
        b3 = mat2[7];
        dest[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[8];
        b1 = mat2[9];
        b2 = mat2[10];
        b3 = mat2[11];
        dest[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[12];
        b1 = mat2[13];
        b2 = mat2[14];
        b3 = mat2[15];
        dest[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        return dest;
    };

    /**
     * Transforms a vec3 with the given matrix
     * 4th vector component is implicitly '1'
     *
     * @param {mat4} mat mat4 to transform the vector with
     * @param {vec3} vec vec3 to transform
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    mat4.multiplyVec3 = function (mat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2];

        dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
        dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
        dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];

        return dest;
    };

    /**
     * Transforms a vec4 with the given matrix
     *
     * @param {mat4} mat mat4 to transform the vector with
     * @param {vec4} vec vec4 to transform
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec4} dest if specified, vec otherwise
     */
    mat4.multiplyVec4 = function (mat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2], w = vec[3];

        dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w;
        dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w;
        dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w;
        dest[3] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w;

        return dest;
    };

    /**
     * Translates a matrix by the given vector
     *
     * @param {mat4} mat mat4 to translate
     * @param {vec3} vec vec3 specifying the translation
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.translate = function (mat, vec, dest) {
        var x = vec[0], y = vec[1], z = vec[2],
            a00, a01, a02, a03,
            a10, a11, a12, a13,
            a20, a21, a22, a23;

        if (!dest || mat === dest) {
            mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
            mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
            mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
            mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
            return mat;
        }

        a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
        a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
        a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

        dest[0] = a00; dest[1] = a01; dest[2] = a02; dest[3] = a03;
        dest[4] = a10; dest[5] = a11; dest[6] = a12; dest[7] = a13;
        dest[8] = a20; dest[9] = a21; dest[10] = a22; dest[11] = a23;

        dest[12] = a00 * x + a10 * y + a20 * z + mat[12];
        dest[13] = a01 * x + a11 * y + a21 * z + mat[13];
        dest[14] = a02 * x + a12 * y + a22 * z + mat[14];
        dest[15] = a03 * x + a13 * y + a23 * z + mat[15];
        return dest;
    };

    /**
     * Scales a matrix by the given vector
     *
     * @param {mat4} mat mat4 to scale
     * @param {vec3} vec vec3 specifying the scale for each axis
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @param {mat4} dest if specified, mat otherwise
     */
    mat4.scale = function (mat, vec, dest) {
        var x = vec[0], y = vec[1], z = vec[2];

        if (!dest || mat === dest) {
            mat[0] *= x;
            mat[1] *= x;
            mat[2] *= x;
            mat[3] *= x;
            mat[4] *= y;
            mat[5] *= y;
            mat[6] *= y;
            mat[7] *= y;
            mat[8] *= z;
            mat[9] *= z;
            mat[10] *= z;
            mat[11] *= z;
            return mat;
        }

        dest[0] = mat[0] * x;
        dest[1] = mat[1] * x;
        dest[2] = mat[2] * x;
        dest[3] = mat[3] * x;
        dest[4] = mat[4] * y;
        dest[5] = mat[5] * y;
        dest[6] = mat[6] * y;
        dest[7] = mat[7] * y;
        dest[8] = mat[8] * z;
        dest[9] = mat[9] * z;
        dest[10] = mat[10] * z;
        dest[11] = mat[11] * z;
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the specified axis
     * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {vec3} axis vec3 representing the axis to rotate around
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotate = function (mat, angle, axis, dest) {
        var x = axis[0], y = axis[1], z = axis[2],
            len = Math.sqrt(x * x + y * y + z * z),
            s, c, t,
            a00, a01, a02, a03,
            a10, a11, a12, a13,
            a20, a21, a22, a23,
            b00, b01, b02,
            b10, b11, b12,
            b20, b21, b22;

        if (!len) { return null; }
        if (len !== 1) {
            len = 1 / len;
            x *= len;
            y *= len;
            z *= len;
        }

        s = Math.sin(angle);
        c = Math.cos(angle);
        t = 1 - c;

        a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
        a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
        a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

        // Construct the elements of the rotation matrix
        b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
        b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
        b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform rotation-specific matrix multiplication
        dest[0] = a00 * b00 + a10 * b01 + a20 * b02;
        dest[1] = a01 * b00 + a11 * b01 + a21 * b02;
        dest[2] = a02 * b00 + a12 * b01 + a22 * b02;
        dest[3] = a03 * b00 + a13 * b01 + a23 * b02;

        dest[4] = a00 * b10 + a10 * b11 + a20 * b12;
        dest[5] = a01 * b10 + a11 * b11 + a21 * b12;
        dest[6] = a02 * b10 + a12 * b11 + a22 * b12;
        dest[7] = a03 * b10 + a13 * b11 + a23 * b12;

        dest[8] = a00 * b20 + a10 * b21 + a20 * b22;
        dest[9] = a01 * b20 + a11 * b21 + a21 * b22;
        dest[10] = a02 * b20 + a12 * b21 + a22 * b22;
        dest[11] = a03 * b20 + a13 * b21 + a23 * b22;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the X axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateX = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7],
            a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[4] = a10 * c + a20 * s;
        dest[5] = a11 * c + a21 * s;
        dest[6] = a12 * c + a22 * s;
        dest[7] = a13 * c + a23 * s;

        dest[8] = a10 * -s + a20 * c;
        dest[9] = a11 * -s + a21 * c;
        dest[10] = a12 * -s + a22 * c;
        dest[11] = a13 * -s + a23 * c;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the Y axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateY = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3],
            a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[0] = a00 * c + a20 * -s;
        dest[1] = a01 * c + a21 * -s;
        dest[2] = a02 * c + a22 * -s;
        dest[3] = a03 * c + a23 * -s;

        dest[8] = a00 * s + a20 * c;
        dest[9] = a01 * s + a21 * c;
        dest[10] = a02 * s + a22 * c;
        dest[11] = a03 * s + a23 * c;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the Z axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateZ = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3],
            a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[0] = a00 * c + a10 * s;
        dest[1] = a01 * c + a11 * s;
        dest[2] = a02 * c + a12 * s;
        dest[3] = a03 * c + a13 * s;

        dest[4] = a00 * -s + a10 * c;
        dest[5] = a01 * -s + a11 * c;
        dest[6] = a02 * -s + a12 * c;
        dest[7] = a03 * -s + a13 * c;

        return dest;
    };

    /**
     * Generates a frustum matrix with the given bounds
     *
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.frustum = function (left, right, bottom, top, near, far, dest) {
        if (!dest) { dest = mat4.create(); }
        var rl = (right - left),
            tb = (top - bottom),
            fn = (far - near);
        dest[0] = (near * 2) / rl;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = (near * 2) / tb;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = (right + left) / rl;
        dest[9] = (top + bottom) / tb;
        dest[10] = -(far + near) / fn;
        dest[11] = -1;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = -(far * near * 2) / fn;
        dest[15] = 0;
        return dest;
    };

    /**
     * Generates a perspective projection matrix with the given bounds
     *
     * @param {number} fovy Vertical field of view
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.perspective = function (fovy, aspect, near, far, dest) {
        var top = near * Math.tan(fovy * Math.PI / 360.0),
            right = top * aspect;
        return mat4.frustum(-right, right, -top, top, near, far, dest);
    };

    /**
     * Generates a orthogonal projection matrix with the given bounds
     *
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.ortho = function (left, right, bottom, top, near, far, dest) {
        if (!dest) { dest = mat4.create(); }
        var rl = (right - left),
            tb = (top - bottom),
            fn = (far - near);
        dest[0] = 2 / rl;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 2 / tb;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = -2 / fn;
        dest[11] = 0;
        dest[12] = -(left + right) / rl;
        dest[13] = -(top + bottom) / tb;
        dest[14] = -(far + near) / fn;
        dest[15] = 1;
        return dest;
    };

    /**
     * Generates a look-at matrix with the given eye position, focal point, and up axis
     *
     * @param {vec3} eye Position of the viewer
     * @param {vec3} center Point the viewer is looking at
     * @param {vec3} up vec3 pointing "up"
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.lookAt = function (eye, center, up, dest) {
        if (!dest) { dest = mat4.create(); }

        var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
            eyex = eye[0],
            eyey = eye[1],
            eyez = eye[2],
            upx = up[0],
            upy = up[1],
            upz = up[2],
            centerx = center[0],
            centery = center[1],
            centerz = center[2];

        if (eyex === centerx && eyey === centery && eyez === centerz) {
            return mat4.identity(dest);
        }

        //vec3.direction(eye, center, z);
        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;

        // normalize (no check needed for 0 because of early return)
        len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;

        //vec3.normalize(vec3.cross(up, z, x));
        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
        if (!len) {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        } else {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }

        //vec3.normalize(vec3.cross(z, x, y));
        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;

        len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
        if (!len) {
            y0 = 0;
            y1 = 0;
            y2 = 0;
        } else {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }

        dest[0] = x0;
        dest[1] = y0;
        dest[2] = z0;
        dest[3] = 0;
        dest[4] = x1;
        dest[5] = y1;
        dest[6] = z1;
        dest[7] = 0;
        dest[8] = x2;
        dest[9] = y2;
        dest[10] = z2;
        dest[11] = 0;
        dest[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        dest[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        dest[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        dest[15] = 1;

        return dest;
    };

    /**
     * Creates a matrix from a quaternion rotation and vector translation
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, vec);
     *     var quatMat = mat4.create();
     *     quat4.toMat4(quat, quatMat);
     *     mat4.multiply(dest, quatMat);
     *
     * @param {quat4} quat Rotation quaternion
     * @param {vec3} vec Translation vector
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to a new mat4
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.fromRotationTranslation = function (quat, vec, dest) {
        if (!dest) { dest = mat4.create(); }

        // Quaternion math
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;
        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;
        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;
        dest[12] = vec[0];
        dest[13] = vec[1];
        dest[14] = vec[2];
        dest[15] = 1;
        
        return dest;
    };

    /**
     * Returns a string representation of a mat4
     *
     * @param {mat4} mat mat4 to represent as a string
     *
     * @returns {string} String representation of mat
     */
    mat4.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] +
            ', ' + mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] +
            ', ' + mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] +
            ', ' + mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
    };

    /**
     * @class Quaternion
     * @name quat4
     */
    var quat4 = {};

    /**
     * Creates a new instance of a quat4 using the default array type
     * Any javascript array containing at least 4 numeric elements can serve as a quat4
     *
     * @param {quat4} [quat] quat4 containing values to initialize with
     *
     * @returns {quat4} New quat4
     */
    quat4.create = function (quat) {
        var dest = new MatrixArray(4);

        if (quat) {
            dest[0] = quat[0];
            dest[1] = quat[1];
            dest[2] = quat[2];
            dest[3] = quat[3];
        } else {
            dest[0] = dest[1] = dest[2] = dest[3] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a quat4, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value
     * @param {number} w W value

     * @returns {quat4} New quat4
     */
    quat4.createFrom = function (x, y, z, w) {
        var dest = new MatrixArray(4);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;

        return dest;
    };

    /**
     * Copies the values of one quat4 to another
     *
     * @param {quat4} quat quat4 containing values to copy
     * @param {quat4} dest quat4 receiving copied values
     *
     * @returns {quat4} dest
     */
    quat4.set = function (quat, dest) {
        dest[0] = quat[0];
        dest[1] = quat[1];
        dest[2] = quat[2];
        dest[3] = quat[3];

        return dest;
    };

    /**
     * Compares two quaternions for equality within a certain margin of error
     *
     * @param {quat4} a First vector
     * @param {quat4} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    quat4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Creates a new identity Quat4
     *
     * @param {quat4} [dest] quat4 receiving copied values
     *
     * @returns {quat4} dest is specified, new quat4 otherwise
     */
    quat4.identity = function (dest) {
        if (!dest) { dest = quat4.create(); }
        dest[0] = 0;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    var identityQuat4 = quat4.identity();

    /**
     * Calculates the W component of a quat4 from the X, Y, and Z components.
     * Assumes that quaternion is 1 unit in length.
     * Any existing W component will be ignored.
     *
     * @param {quat4} quat quat4 to calculate W component of
     * @param {quat4} [dest] quat4 receiving calculated values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.calculateW = function (quat, dest) {
        var x = quat[0], y = quat[1], z = quat[2];

        if (!dest || quat === dest) {
            quat[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
            return quat;
        }
        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
        return dest;
    };

    /**
     * Calculates the dot product of two quaternions
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     *
     * @return {number} Dot product of quat and quat2
     */
    quat4.dot = function(quat, quat2){
        return quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
    };

    /**
     * Calculates the inverse of a quat4
     *
     * @param {quat4} quat quat4 to calculate inverse of
     * @param {quat4} [dest] quat4 receiving inverse values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.inverse = function(quat, dest) {
        var q0 = quat[0], q1 = quat[1], q2 = quat[2], q3 = quat[3],
            dot = q0*q0 + q1*q1 + q2*q2 + q3*q3,
            invDot = dot ? 1.0/dot : 0;
        
        // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0
        
        if(!dest || quat === dest) {
            quat[0] *= -invDot;
            quat[1] *= -invDot;
            quat[2] *= -invDot;
            quat[3] *= invDot;
            return quat;
        }
        dest[0] = -quat[0]*invDot;
        dest[1] = -quat[1]*invDot;
        dest[2] = -quat[2]*invDot;
        dest[3] = quat[3]*invDot;
        return dest;
    };


    /**
     * Calculates the conjugate of a quat4
     * If the quaternion is normalized, this function is faster than quat4.inverse and produces the same result.
     *
     * @param {quat4} quat quat4 to calculate conjugate of
     * @param {quat4} [dest] quat4 receiving conjugate values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.conjugate = function (quat, dest) {
        if (!dest || quat === dest) {
            quat[0] *= -1;
            quat[1] *= -1;
            quat[2] *= -1;
            return quat;
        }
        dest[0] = -quat[0];
        dest[1] = -quat[1];
        dest[2] = -quat[2];
        dest[3] = quat[3];
        return dest;
    };

    /**
     * Calculates the length of a quat4
     *
     * Params:
     * @param {quat4} quat quat4 to calculate length of
     *
     * @returns Length of quat
     */
    quat4.length = function (quat) {
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
        return Math.sqrt(x * x + y * y + z * z + w * w);
    };

    /**
     * Generates a unit quaternion of the same direction as the provided quat4
     * If quaternion length is 0, returns [0, 0, 0, 0]
     *
     * @param {quat4} quat quat4 to normalize
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.normalize = function (quat, dest) {
        if (!dest) { dest = quat; }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            len = Math.sqrt(x * x + y * y + z * z + w * w);
        if (len === 0) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
            return dest;
        }
        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        dest[3] = w * len;

        return dest;
    };

    /**
     * Performs quaternion addition
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.add = function (quat, quat2, dest) {
        if(!dest || quat === dest) {
            quat[0] += quat2[0];
            quat[1] += quat2[1];
            quat[2] += quat2[2];
            quat[3] += quat2[3];
            return quat;
        }
        dest[0] = quat[0]+quat2[0];
        dest[1] = quat[1]+quat2[1];
        dest[2] = quat[2]+quat2[2];
        dest[3] = quat[3]+quat2[3];
        return dest;
    };

    /**
     * Performs a quaternion multiplication
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.multiply = function (quat, quat2, dest) {
        if (!dest) { dest = quat; }

        var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3],
            qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];

        dest[0] = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        dest[1] = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        dest[2] = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        dest[3] = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

        return dest;
    };

    /**
     * Transforms a vec3 with the given quaternion
     *
     * @param {quat4} quat quat4 to transform the vector with
     * @param {vec3} vec vec3 to transform
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns dest if specified, vec otherwise
     */
    quat4.multiplyVec3 = function (quat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3],

            // calculate quat * vec
            ix = qw * x + qy * z - qz * y,
            iy = qw * y + qz * x - qx * z,
            iz = qw * z + qx * y - qy * x,
            iw = -qx * x - qy * y - qz * z;

        // calculate result * inverse quat
        dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

        return dest;
    };

    /**
     * Multiplies the components of a quaternion by a scalar value
     *
     * @param {quat4} quat to scale
     * @param {number} val Value to scale by
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.scale = function (quat, val, dest) {
        if(!dest || quat === dest) {
            quat[0] *= val;
            quat[1] *= val;
            quat[2] *= val;
            quat[3] *= val;
            return quat;
        }
        dest[0] = quat[0]*val;
        dest[1] = quat[1]*val;
        dest[2] = quat[2]*val;
        dest[3] = quat[3]*val;
        return dest;
    };

    /**
     * Calculates a 3x3 matrix from the given quat4
     *
     * @param {quat4} quat quat4 to create matrix from
     * @param {mat3} [dest] mat3 receiving operation result
     *
     * @returns {mat3} dest if specified, a new mat3 otherwise
     */
    quat4.toMat3 = function (quat, dest) {
        if (!dest) { dest = mat3.create(); }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;

        dest[3] = xy - wz;
        dest[4] = 1 - (xx + zz);
        dest[5] = yz + wx;

        dest[6] = xz + wy;
        dest[7] = yz - wx;
        dest[8] = 1 - (xx + yy);

        return dest;
    };

    /**
     * Calculates a 4x4 matrix from the given quat4
     *
     * @param {quat4} quat quat4 to create matrix from
     * @param {mat4} [dest] mat4 receiving operation result
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    quat4.toMat4 = function (quat, dest) {
        if (!dest) { dest = mat4.create(); }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;

        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;

        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;

        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    };

    /**
     * Performs a spherical linear interpolation between two quat4
     *
     * @param {quat4} quat First quaternion
     * @param {quat4} quat2 Second quaternion
     * @param {number} slerp Interpolation amount between the two inputs
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.slerp = function (quat, quat2, slerp, dest) {
        if (!dest) { dest = quat; }

        var cosHalfTheta = quat[0] * quat2[0] + quat[1] * quat2[1] + quat[2] * quat2[2] + quat[3] * quat2[3],
            halfTheta,
            sinHalfTheta,
            ratioA,
            ratioB;

        if (Math.abs(cosHalfTheta) >= 1.0) {
            if (dest !== quat) {
                dest[0] = quat[0];
                dest[1] = quat[1];
                dest[2] = quat[2];
                dest[3] = quat[3];
            }
            return dest;
        }

        halfTheta = Math.acos(cosHalfTheta);
        sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (Math.abs(sinHalfTheta) < 0.001) {
            dest[0] = (quat[0] * 0.5 + quat2[0] * 0.5);
            dest[1] = (quat[1] * 0.5 + quat2[1] * 0.5);
            dest[2] = (quat[2] * 0.5 + quat2[2] * 0.5);
            dest[3] = (quat[3] * 0.5 + quat2[3] * 0.5);
            return dest;
        }

        ratioA = Math.sin((1 - slerp) * halfTheta) / sinHalfTheta;
        ratioB = Math.sin(slerp * halfTheta) / sinHalfTheta;

        dest[0] = (quat[0] * ratioA + quat2[0] * ratioB);
        dest[1] = (quat[1] * ratioA + quat2[1] * ratioB);
        dest[2] = (quat[2] * ratioA + quat2[2] * ratioB);
        dest[3] = (quat[3] * ratioA + quat2[3] * ratioB);

        return dest;
    };

    /**
     * Creates a quaternion from the given 3x3 rotation matrix.
     * If dest is omitted, a new quaternion will be created.
     *
     * @param {mat3}  mat    the rotation matrix
     * @param {quat4} [dest] an optional receiving quaternion
     *
     * @returns {quat4} the quaternion constructed from the rotation matrix
     *
     */
    quat4.fromRotationMatrix = function(mat, dest) {
        if (!dest) dest = quat4.create();
        
        // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
        // article "Quaternion Calculus and Fast Animation".

        var fTrace = mat[0] + mat[4] + mat[8];
        var fRoot;

        if ( fTrace > 0.0 ) {
            // |w| > 1/2, may as well choose w > 1/2
            fRoot = Math.sqrt(fTrace + 1.0);  // 2w
            dest[3] = 0.5 * fRoot;
            fRoot = 0.5/fRoot;  // 1/(4w)
            dest[0] = (mat[7]-mat[5])*fRoot;
            dest[1] = (mat[2]-mat[6])*fRoot;
            dest[2] = (mat[3]-mat[1])*fRoot;
        } else {
            // |w| <= 1/2
            var s_iNext = quat4.fromRotationMatrix.s_iNext = quat4.fromRotationMatrix.s_iNext || [1,2,0];
            var i = 0;
            if ( mat[4] > mat[0] )
              i = 1;
            if ( mat[8] > mat[i*3+i] )
              i = 2;
            var j = s_iNext[i];
            var k = s_iNext[j];
            
            fRoot = Math.sqrt(mat[i*3+i]-mat[j*3+j]-mat[k*3+k] + 1.0);
            dest[i] = 0.5 * fRoot;
            fRoot = 0.5 / fRoot;
            dest[3] = (mat[k*3+j] - mat[j*3+k]) * fRoot;
            dest[j] = (mat[j*3+i] + mat[i*3+j]) * fRoot;
            dest[k] = (mat[k*3+i] + mat[i*3+k]) * fRoot;
        }
        
        return dest;
    };

    /**
     * Alias. See the description for quat4.fromRotationMatrix().
     */
    mat3.toQuat4 = quat4.fromRotationMatrix;

    (function() {
        var mat = mat3.create();
        
        /**
         * Creates a quaternion from the 3 given vectors. They must be perpendicular
         * to one another and represent the X, Y and Z axes.
         *
         * If dest is omitted, a new quat4 will be created.
         *
         * Example: The default OpenGL orientation has a view vector [0, 0, -1],
         * right vector [1, 0, 0], and up vector [0, 1, 0]. A quaternion representing
         * this orientation could be constructed with:
         *
         *   quat = quat4.fromAxes([0, 0, -1], [1, 0, 0], [0, 1, 0], quat4.create());
         *
         * @param {vec3}  view   the view vector, or direction the object is pointing in
         * @param {vec3}  right  the right vector, or direction to the "right" of the object
         * @param {vec3}  up     the up vector, or direction towards the object's "up"
         * @param {quat4} [dest] an optional receiving quat4
         *
         * @returns {quat4} dest
         **/
        quat4.fromAxes = function(view, right, up, dest) {
            mat[0] = right[0];
            mat[3] = right[1];
            mat[6] = right[2];

            mat[1] = up[0];
            mat[4] = up[1];
            mat[7] = up[2];

            mat[2] = view[0];
            mat[5] = view[1];
            mat[8] = view[2];

            return quat4.fromRotationMatrix(mat, dest);
        };
    })();

    /**
     * Sets a quat4 to the Identity and returns it.
     *
     * @param {quat4} [dest] quat4 to set. If omitted, a
     * new quat4 will be created.
     *
     * @returns {quat4} dest
     */
    quat4.identity = function(dest) {
        if (!dest) dest = quat4.create();
        dest[0] = 0;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    /**
     * Sets a quat4 from the given angle and rotation axis,
     * then returns it. If dest is not given, a new quat4 is created.
     *
     * @param {Number} angle  the angle in radians
     * @param {vec3}   axis   the axis around which to rotate
     * @param {quat4}  [dest] the optional quat4 to store the result
     *
     * @returns {quat4} dest
     **/
    quat4.fromAngleAxis = function(angle, axis, dest) {
        // The quaternion representing the rotation is
        //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)
        if (!dest) dest = quat4.create();
        
        var half = angle * 0.5;
        var s = Math.sin(half);
        dest[3] = Math.cos(half);
        dest[0] = s * axis[0];
        dest[1] = s * axis[1];
        dest[2] = s * axis[2];
        
        return dest;
    };

    /**
     * Stores the angle and axis in a vec4, where the XYZ components represent
     * the axis and the W (4th) component is the angle in radians.
     *
     * If dest is not given, src will be modified in place and returned, after
     * which it should not be considered not a quaternion (just an axis and angle).
     *
     * @param {quat4} quat   the quaternion whose angle and axis to store
     * @param {vec4}  [dest] the optional vec4 to receive the data
     *
     * @returns {vec4} dest
     */
    quat4.toAngleAxis = function(src, dest) {
        if (!dest) dest = src;
        // The quaternion representing the rotation is
        //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)

        var sqrlen = src[0]*src[0]+src[1]*src[1]+src[2]*src[2];
        if (sqrlen > 0)
        {
            dest[3] = 2 * Math.acos(src[3]);
            var invlen = glMath.invsqrt(sqrlen);
            dest[0] = src[0]*invlen;
            dest[1] = src[1]*invlen;
            dest[2] = src[2]*invlen;
        } else {
            // angle is 0 (mod 2*pi), so any axis will do
            dest[3] = 0;
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;
        }
        
        return dest;
    };

    /**
     * Returns a string representation of a quaternion
     *
     * @param {quat4} quat quat4 to represent as a string
     *
     * @returns {string} String representation of quat
     */
    quat4.str = function (quat) {
        return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']';
    };
    
    /**
     * @class 2 Dimensional Vector
     * @name vec2
     */
    var vec2 = {};
     
    /**
     * Creates a new vec2, initializing it from vec if vec
     * is given.
     *
     * @param {vec2} [vec] the vector's initial contents
     * @returns {vec2} a new 2D vector
     */
    vec2.create = function(vec) {
        var dest = new MatrixArray(2);

        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
        } else {
            dest[0] = 0;
            dest[1] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a vec2, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value

     * @returns {vec2} New vec2
     */
    vec2.createFrom = function (x, y) {
        var dest = new MatrixArray(2);

        dest[0] = x;
        dest[1] = y;

        return dest;
    };
    
    /**
     * Adds the vec2's together. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.add = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] + vecB[0];
        dest[1] = vecA[1] + vecB[1];
        return dest;
    };
    
    /**
     * Subtracts vecB from vecA. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.subtract = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] - vecB[0];
        dest[1] = vecA[1] - vecB[1];
        return dest;
    };
    
    /**
     * Multiplies vecA with vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.multiply = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] * vecB[0];
        dest[1] = vecA[1] * vecB[1];
        return dest;
    };
    
    /**
     * Divides vecA by vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.divide = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] / vecB[0];
        dest[1] = vecA[1] / vecB[1];
        return dest;
    };
    
    /**
     * Scales vecA by some scalar number. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecA.
     *
     * This is the same as multiplying each component of vecA
     * by the given scalar.
     *
     * @param {vec2}   vecA the vector to be scaled
     * @param {Number} scalar the amount to scale the vector by
     * @param {vec2}   [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.scale = function(vecA, scalar, dest) {
        if (!dest) dest = vecA;
        dest[0] = vecA[0] * scalar;
        dest[1] = vecA[1] * scalar;
        return dest;
    };

    /**
     * Calculates the euclidian distance between two vec2
     *
     * Params:
     * @param {vec2} vecA First vector
     * @param {vec2} vecB Second vector
     *
     * @returns {number} Distance between vecA and vecB
     */
    vec2.dist = function (vecA, vecB) {
        var x = vecB[0] - vecA[0],
            y = vecB[1] - vecA[1];
        return Math.sqrt(x*x + y*y);
    };

    /**
     * Copies the values of one vec2 to another
     *
     * @param {vec2} vec vec2 containing values to copy
     * @param {vec2} dest vec2 receiving copied values
     *
     * @returns {vec2} dest
     */
    vec2.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec2} a First vector
     * @param {vec2} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec2.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON
        );
    };

    /**
     * Negates the components of a vec2
     *
     * @param {vec2} vec vec2 to negate
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec2} dest if specified, vec otherwise
     */
    vec2.negate = function (vec, dest) {
        if (!dest) { dest = vec; }
        dest[0] = -vec[0];
        dest[1] = -vec[1];
        return dest;
    };

    /**
     * Normlize a vec2
     *
     * @param {vec2} vec vec2 to normalize
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec2} dest if specified, vec otherwise
     */
    vec2.normalize = function (vec, dest) {
        if (!dest) { dest = vec; }
        var mag = vec[0] * vec[0] + vec[1] * vec[1];
        if (mag > 0) {
            mag = Math.sqrt(mag);
            dest[0] = vec[0] / mag;
            dest[1] = vec[1] / mag;
        } else {
            dest[0] = dest[1] = 0;
        }
        return dest;
    };

    /**
     * Computes the cross product of two vec2's. Note that the cross product must by definition
     * produce a 3D vector. If a dest vector is given, it will contain the resultant 3D vector.
     * Otherwise, a scalar number will be returned, representing the vector's Z coordinate, since
     * its X and Y must always equal 0.
     *
     * Examples:
     *    var crossResult = vec3.create();
     *    vec2.cross([1, 2], [3, 4], crossResult);
     *    //=> [0, 0, -2]
     *
     *    vec2.cross([1, 2], [3, 4]);
     *    //=> -2
     *
     * See http://stackoverflow.com/questions/243945/calculating-a-2d-vectors-cross-product
     * for some interesting facts.
     *
     * @param {vec2} vecA left operand
     * @param {vec2} vecB right operand
     * @param {vec2} [dest] optional vec2 receiving result. If not specified a scalar is returned
     *
     */
    vec2.cross = function (vecA, vecB, dest) {
        var z = vecA[0] * vecB[1] - vecA[1] * vecB[0];
        if (!dest) return z;
        dest[0] = dest[1] = 0;
        dest[2] = z;
        return dest;
    };
    
    /**
     * Caclulates the length of a vec2
     *
     * @param {vec2} vec vec2 to calculate length of
     *
     * @returns {Number} Length of vec
     */
    vec2.length = function (vec) {
      var x = vec[0], y = vec[1];
      return Math.sqrt(x * x + y * y);
    };

    /**
     * Caclulates the squared length of a vec2
     *
     * @param {vec2} vec vec2 to calculate squared length of
     *
     * @returns {Number} Squared Length of vec
     */
    vec2.squaredLength = function (vec) {
      var x = vec[0], y = vec[1];
      return x * x + y * y;
    };

    /**
     * Caclulates the dot product of two vec2s
     *
     * @param {vec2} vecA First operand
     * @param {vec2} vecB Second operand
     *
     * @returns {Number} Dot product of vecA and vecB
     */
    vec2.dot = function (vecA, vecB) {
        return vecA[0] * vecB[0] + vecA[1] * vecB[1];
    };
    
    /**
     * Generates a 2D unit vector pointing from one vector to another
     *
     * @param {vec2} vecA Origin vec2
     * @param {vec2} vecB vec2 to point to
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec2} dest if specified, vecA otherwise
     */
    vec2.direction = function (vecA, vecB, dest) {
        if (!dest) { dest = vecA; }

        var x = vecA[0] - vecB[0],
            y = vecA[1] - vecB[1],
            len = x * x + y * y;

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }

        len = 1 / Math.sqrt(len);
        dest[0] = x * len;
        dest[1] = y * len;
        return dest;
    };

    /**
     * Performs a linear interpolation between two vec2
     *
     * @param {vec2} vecA First vector
     * @param {vec2} vecB Second vector
     * @param {Number} lerp Interpolation amount between the two inputs
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec2} dest if specified, vecA otherwise
     */
    vec2.lerp = function (vecA, vecB, lerp, dest) {
        if (!dest) { dest = vecA; }
        dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec2} vec Vector to represent as a string
     *
     * @returns {String} String representation of vec
     */
    vec2.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ']';
    };
    
    /**
     * @class 2x2 Matrix
     * @name mat2
     */
    var mat2 = {};
    
    /**
     * Creates a new 2x2 matrix. If src is given, the new matrix
     * is initialized to those values.
     *
     * @param {mat2} [src] the seed values for the new matrix, if any
     * @returns {mat2} a new matrix
     */
    mat2.create = function(src) {
        var dest = new MatrixArray(4);
        
        if (src) {
            dest[0] = src[0];
            dest[1] = src[1];
            dest[2] = src[2];
            dest[3] = src[3];
        } else {
            dest[0] = dest[1] = dest[2] = dest[3] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a mat2, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m10
     * @param {number} m11

     * @returns {mat2} New mat2
     */
    mat2.createFrom = function (m00, m01, m10, m11) {
        var dest = new MatrixArray(4);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m10;
        dest[3] = m11;

        return dest;
    };
    
    /**
     * Copies the values of one mat2 to another
     *
     * @param {mat2} mat mat2 containing values to copy
     * @param {mat2} dest mat2 receiving copied values
     *
     * @returns {mat2} dest
     */
    mat2.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat2} a First matrix
     * @param {mat2} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat2.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat2 to an identity matrix
     *
     * @param {mat2} [dest] mat2 to set. If omitted a new one will be created.
     *
     * @returns {mat2} dest
     */
    mat2.identity = function (dest) {
        if (!dest) { dest = mat2.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    /**
     * Transposes a mat2 (flips the values over the diagonal)
     *
     * @param {mat2} mat mat2 to transpose
     * @param {mat2} [dest] mat2 receiving transposed values. If not specified result is written to mat
     *
     * @param {mat2} dest if specified, mat otherwise
     */
    mat2.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a00 = mat[1];
            mat[1] = mat[2];
            mat[2] = a00;
            return mat;
        }
        
        dest[0] = mat[0];
        dest[1] = mat[2];
        dest[2] = mat[1];
        dest[3] = mat[3];
        return dest;
    };

    /**
     * Calculates the determinant of a mat2
     *
     * @param {mat2} mat mat2 to calculate determinant of
     *
     * @returns {Number} determinant of mat
     */
    mat2.determinant = function (mat) {
      return mat[0] * mat[3] - mat[2] * mat[1];
    };
    
    /**
     * Calculates the inverse matrix of a mat2
     *
     * @param {mat2} mat mat2 to calculate inverse of
     * @param {mat2} [dest] mat2 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat2} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat2.inverse = function (mat, dest) {
        if (!dest) { dest = mat; }
        var a0 = mat[0], a1 = mat[1], a2 = mat[2], a3 = mat[3];
        var det = a0 * a3 - a2 * a1;
        if (!det) return null;
        
        det = 1.0 / det;
        dest[0] =  a3 * det;
        dest[1] = -a1 * det;
        dest[2] = -a2 * det;
        dest[3] =  a0 * det;
        return dest;
    };
    
    /**
     * Performs a matrix multiplication
     *
     * @param {mat2} matA First operand
     * @param {mat2} matB Second operand
     * @param {mat2} [dest] mat2 receiving operation result. If not specified result is written to matA
     *
     * @returns {mat2} dest if specified, matA otherwise
     */
    mat2.multiply = function (matA, matB, dest) {
        if (!dest) { dest = matA; }
        var a11 = matA[0],
            a12 = matA[1],
            a21 = matA[2],
            a22 = matA[3];
        dest[0] = a11 * matB[0] + a12 * matB[2];
        dest[1] = a11 * matB[1] + a12 * matB[3];
        dest[2] = a21 * matB[0] + a22 * matB[2];
        dest[3] = a21 * matB[1] + a22 * matB[3];
        return dest;
    };

    /**
     * Rotates a 2x2 matrix by an angle
     *
     * @param {mat2}   mat   The matrix to rotate
     * @param {Number} angle The angle in radians
     * @param {mat2} [dest]  Optional mat2 receiving the result. If omitted mat will be used.
     *
     * @returns {mat2} dest if specified, mat otherwise
     */
    mat2.rotate = function (mat, angle, dest) {
        if (!dest) { dest = mat; }
        var a11 = mat[0],
            a12 = mat[1],
            a21 = mat[2],
            a22 = mat[3],
            s = Math.sin(angle),
            c = Math.cos(angle);
        dest[0] = a11 *  c + a12 * s;
        dest[1] = a11 * -s + a12 * c;
        dest[2] = a21 *  c + a22 * s;
        dest[3] = a21 * -s + a22 * c;
        return dest;
    };

    /**
     * Multiplies the vec2 by the given 2x2 matrix
     *
     * @param {mat2} matrix the 2x2 matrix to multiply against
     * @param {vec2} vec    the vector to multiply
     * @param {vec2} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec2} The multiplication result
     **/
    mat2.multiplyVec2 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1];
      dest[0] = x * matrix[0] + y * matrix[1];
      dest[1] = x * matrix[2] + y * matrix[3];
      return dest;
    };
    
    /**
     * Scales the mat2 by the dimensions in the given vec2
     *
     * @param {mat2} matrix the 2x2 matrix to scale
     * @param {vec2} vec    the vector containing the dimensions to scale by
     * @param {vec2} [dest] an optional receiving mat2. If not given, matrix is used.
     *
     * @returns {mat2} dest if specified, matrix otherwise
     **/
    mat2.scale = function(matrix, vec, dest) {
      if (!dest) { dest = matrix; }
      var a11 = matrix[0],
          a12 = matrix[1],
          a21 = matrix[2],
          a22 = matrix[3],
          b11 = vec[0],
          b22 = vec[1];
      dest[0] = a11 * b11;
      dest[1] = a12 * b22;
      dest[2] = a21 * b11;
      dest[3] = a22 * b22;
      return dest;
    };

    /**
     * Returns a string representation of a mat2
     *
     * @param {mat2} mat mat2 to represent as a string
     *
     * @param {String} String representation of mat
     */
    mat2.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + ']';
    };
    
    /**
     * @class 4 Dimensional Vector
     * @name vec4
     */
    var vec4 = {};
     
    /**
     * Creates a new vec4, initializing it from vec if vec
     * is given.
     *
     * @param {vec4} [vec] the vector's initial contents
     * @returns {vec4} a new 2D vector
     */
    vec4.create = function(vec) {
        var dest = new MatrixArray(4);
        
        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
            dest[3] = vec[3];
        } else {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a vec4, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value
     * @param {number} w W value

     * @returns {vec4} New vec4
     */
    vec4.createFrom = function (x, y, z, w) {
        var dest = new MatrixArray(4);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;

        return dest;
    };
    
    /**
     * Adds the vec4's together. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.add = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] + vecB[0];
      dest[1] = vecA[1] + vecB[1];
      dest[2] = vecA[2] + vecB[2];
      dest[3] = vecA[3] + vecB[3];
      return dest;
    };
    
    /**
     * Subtracts vecB from vecA. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.subtract = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] - vecB[0];
      dest[1] = vecA[1] - vecB[1];
      dest[2] = vecA[2] - vecB[2];
      dest[3] = vecA[3] - vecB[3];
      return dest;
    };
    
    /**
     * Multiplies vecA with vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.multiply = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] * vecB[0];
      dest[1] = vecA[1] * vecB[1];
      dest[2] = vecA[2] * vecB[2];
      dest[3] = vecA[3] * vecB[3];
      return dest;
    };
    
    /**
     * Divides vecA by vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.divide = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] / vecB[0];
      dest[1] = vecA[1] / vecB[1];
      dest[2] = vecA[2] / vecB[2];
      dest[3] = vecA[3] / vecB[3];
      return dest;
    };
    
    /**
     * Scales vecA by some scalar number. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecA.
     *
     * This is the same as multiplying each component of vecA
     * by the given scalar.
     *
     * @param {vec4}   vecA the vector to be scaled
     * @param {Number} scalar the amount to scale the vector by
     * @param {vec4}   [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.scale = function(vecA, scalar, dest) {
      if (!dest) dest = vecA;
      dest[0] = vecA[0] * scalar;
      dest[1] = vecA[1] * scalar;
      dest[2] = vecA[2] * scalar;
      dest[3] = vecA[3] * scalar;
      return dest;
    };

    /**
     * Copies the values of one vec4 to another
     *
     * @param {vec4} vec vec4 containing values to copy
     * @param {vec4} dest vec4 receiving copied values
     *
     * @returns {vec4} dest
     */
    vec4.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        dest[2] = vec[2];
        dest[3] = vec[3];
        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec4} a First vector
     * @param {vec4} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Negates the components of a vec4
     *
     * @param {vec4} vec vec4 to negate
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec4} dest if specified, vec otherwise
     */
    vec4.negate = function (vec, dest) {
        if (!dest) { dest = vec; }
        dest[0] = -vec[0];
        dest[1] = -vec[1];
        dest[2] = -vec[2];
        dest[3] = -vec[3];
        return dest;
    };

    /**
     * Caclulates the length of a vec2
     *
     * @param {vec2} vec vec2 to calculate length of
     *
     * @returns {Number} Length of vec
     */
    vec4.length = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
      return Math.sqrt(x * x + y * y + z * z + w * w);
    };

    /**
     * Caclulates the squared length of a vec4
     *
     * @param {vec4} vec vec4 to calculate squared length of
     *
     * @returns {Number} Squared Length of vec
     */
    vec4.squaredLength = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
      return x * x + y * y + z * z + w * w;
    };

    /**
     * Performs a linear interpolation between two vec4
     *
     * @param {vec4} vecA First vector
     * @param {vec4} vecB Second vector
     * @param {Number} lerp Interpolation amount between the two inputs
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec4} dest if specified, vecA otherwise
     */
    vec4.lerp = function (vecA, vecB, lerp, dest) {
        if (!dest) { dest = vecA; }
        dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
        dest[2] = vecA[2] + lerp * (vecB[2] - vecA[2]);
        dest[3] = vecA[3] + lerp * (vecB[3] - vecA[3]);
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec4} vec Vector to represent as a string
     *
     * @returns {String} String representation of vec
     */
    vec4.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ', ' + vec[3] + ']';
    };

    /*
     * Exports
     */

    if(root) {
        root.glMatrixArrayType = MatrixArray;
        root.MatrixArray = MatrixArray;
        root.setMatrixArrayType = setMatrixArrayType;
        root.determineMatrixArrayType = determineMatrixArrayType;
        root.glMath = glMath;
        root.vec2 = vec2;
        root.vec3 = vec3;
        root.vec4 = vec4;
        root.mat2 = mat2;
        root.mat3 = mat3;
        root.mat4 = mat4;
        root.quat4 = quat4;
    }

    return {
        glMatrixArrayType: MatrixArray,
        MatrixArray: MatrixArray,
        setMatrixArrayType: setMatrixArrayType,
        determineMatrixArrayType: determineMatrixArrayType,
        glMath: glMath,
        vec2: vec2,
        vec3: vec3,
        vec4: vec4,
        mat2: mat2,
        mat3: mat3,
        mat4: mat4,
        quat4: quat4
    };
}));

/*global vec3: true, mat4: true */

define('common/qmath',['require','vendor/gl-matrix'],function (require) {

var glmatrix = require('vendor/gl-matrix');

var vec3origin  = vec3.create();
var axisDefault = [
	vec3.createFrom(1, 0, 0),
	vec3.createFrom(0, 1, 0 ),
	vec3.createFrom(0, 0, 1)
];

var bytedirs = [
	[-0.525731, 0.000000, 0.850651], [-0.442863, 0.238856, 0.864188],
	[-0.295242, 0.000000, 0.955423], [-0.309017, 0.500000, 0.809017],
	[-0.162460, 0.262866, 0.951056], [0.000000, 0.000000, 1.000000],
	[0.000000, 0.850651, 0.525731], [-0.147621, 0.716567, 0.681718],
	[0.147621, 0.716567, 0.681718], [0.000000, 0.525731, 0.850651],
	[0.309017, 0.500000, 0.809017], [0.525731, 0.000000, 0.850651],
	[0.295242, 0.000000, 0.955423], [0.442863, 0.238856, 0.864188],
	[0.162460, 0.262866, 0.951056], [-0.681718, 0.147621, 0.716567],
	[-0.809017, 0.309017, 0.500000],[-0.587785, 0.425325, 0.688191],
	[-0.850651, 0.525731, 0.000000],[-0.864188, 0.442863, 0.238856],
	[-0.716567, 0.681718, 0.147621],[-0.688191, 0.587785, 0.425325],
	[-0.500000, 0.809017, 0.309017], [-0.238856, 0.864188, 0.442863],
	[-0.425325, 0.688191, 0.587785], [-0.716567, 0.681718, -0.147621],
	[-0.500000, 0.809017, -0.309017], [-0.525731, 0.850651, 0.000000],
	[0.000000, 0.850651, -0.525731], [-0.238856, 0.864188, -0.442863],
	[0.000000, 0.955423, -0.295242], [-0.262866, 0.951056, -0.162460],
	[0.000000, 1.000000, 0.000000], [0.000000, 0.955423, 0.295242],
	[-0.262866, 0.951056, 0.162460], [0.238856, 0.864188, 0.442863],
	[0.262866, 0.951056, 0.162460], [0.500000, 0.809017, 0.309017],
	[0.238856, 0.864188, -0.442863],[0.262866, 0.951056, -0.162460],
	[0.500000, 0.809017, -0.309017],[0.850651, 0.525731, 0.000000],
	[0.716567, 0.681718, 0.147621], [0.716567, 0.681718, -0.147621],
	[0.525731, 0.850651, 0.000000], [0.425325, 0.688191, 0.587785],
	[0.864188, 0.442863, 0.238856], [0.688191, 0.587785, 0.425325],
	[0.809017, 0.309017, 0.500000], [0.681718, 0.147621, 0.716567],
	[0.587785, 0.425325, 0.688191], [0.955423, 0.295242, 0.000000],
	[1.000000, 0.000000, 0.000000], [0.951056, 0.162460, 0.262866],
	[0.850651, -0.525731, 0.000000],[0.955423, -0.295242, 0.000000],
	[0.864188, -0.442863, 0.238856], [0.951056, -0.162460, 0.262866],
	[0.809017, -0.309017, 0.500000], [0.681718, -0.147621, 0.716567],
	[0.850651, 0.000000, 0.525731], [0.864188, 0.442863, -0.238856],
	[0.809017, 0.309017, -0.500000], [0.951056, 0.162460, -0.262866],
	[0.525731, 0.000000, -0.850651], [0.681718, 0.147621, -0.716567],
	[0.681718, -0.147621, -0.716567],[0.850651, 0.000000, -0.525731],
	[0.809017, -0.309017, -0.500000], [0.864188, -0.442863, -0.238856],
	[0.951056, -0.162460, -0.262866], [0.147621, 0.716567, -0.681718],
	[0.309017, 0.500000, -0.809017], [0.425325, 0.688191, -0.587785],
	[0.442863, 0.238856, -0.864188], [0.587785, 0.425325, -0.688191],
	[0.688191, 0.587785, -0.425325], [-0.147621, 0.716567, -0.681718],
	[-0.309017, 0.500000, -0.809017], [0.000000, 0.525731, -0.850651],
	[-0.525731, 0.000000, -0.850651], [-0.442863, 0.238856, -0.864188],
	[-0.295242, 0.000000, -0.955423], [-0.162460, 0.262866, -0.951056],
	[0.000000, 0.000000, -1.000000], [0.295242, 0.000000, -0.955423],
	[0.162460, 0.262866, -0.951056], [-0.442863, -0.238856, -0.864188],
	[-0.309017, -0.500000, -0.809017], [-0.162460, -0.262866, -0.951056],
	[0.000000, -0.850651, -0.525731], [-0.147621, -0.716567, -0.681718],
	[0.147621, -0.716567, -0.681718], [0.000000, -0.525731, -0.850651],
	[0.309017, -0.500000, -0.809017], [0.442863, -0.238856, -0.864188],
	[0.162460, -0.262866, -0.951056], [0.238856, -0.864188, -0.442863],
	[0.500000, -0.809017, -0.309017], [0.425325, -0.688191, -0.587785],
	[0.716567, -0.681718, -0.147621], [0.688191, -0.587785, -0.425325],
	[0.587785, -0.425325, -0.688191], [0.000000, -0.955423, -0.295242],
	[0.000000, -1.000000, 0.000000], [0.262866, -0.951056, -0.162460],
	[0.000000, -0.850651, 0.525731], [0.000000, -0.955423, 0.295242],
	[0.238856, -0.864188, 0.442863], [0.262866, -0.951056, 0.162460],
	[0.500000, -0.809017, 0.309017], [0.716567, -0.681718, 0.147621],
	[0.525731, -0.850651, 0.000000], [-0.238856, -0.864188, -0.442863],
	[-0.500000, -0.809017, -0.309017], [-0.262866, -0.951056, -0.162460],
	[-0.850651, -0.525731, 0.000000], [-0.716567, -0.681718, -0.147621],
	[-0.716567, -0.681718, 0.147621], [-0.525731, -0.850651, 0.000000],
	[-0.500000, -0.809017, 0.309017], [-0.238856, -0.864188, 0.442863],
	[-0.262866, -0.951056, 0.162460], [-0.864188, -0.442863, 0.238856],
	[-0.809017, -0.309017, 0.500000], [-0.688191, -0.587785, 0.425325],
	[-0.681718, -0.147621, 0.716567], [-0.442863, -0.238856, 0.864188],
	[-0.587785, -0.425325, 0.688191], [-0.309017, -0.500000, 0.809017],
	[-0.147621, -0.716567, 0.681718], [-0.425325, -0.688191, 0.587785],
	[-0.162460, -0.262866, 0.951056], [0.442863, -0.238856, 0.864188],
	[0.162460, -0.262866, 0.951056], [0.309017, -0.500000, 0.809017],
	[0.147621, -0.716567, 0.681718], [0.000000, -0.525731, 0.850651],
	[0.425325, -0.688191, 0.587785], [0.587785, -0.425325, 0.688191],
	[0.688191, -0.587785, 0.425325], [-0.955423, 0.295242, 0.000000],
	[-0.951056, 0.162460, 0.262866], [-1.000000, 0.000000, 0.000000],
	[-0.850651, 0.000000, 0.525731], [-0.955423, -0.295242, 0.000000],
	[-0.951056, -0.162460, 0.262866], [-0.864188, 0.442863, -0.238856],
	[-0.951056, 0.162460, -0.262866], [-0.809017, 0.309017, -0.500000],
	[-0.864188, -0.442863, -0.238856], [-0.951056, -0.162460, -0.262866],
	[-0.809017, -0.309017, -0.500000], [-0.681718, 0.147621, -0.716567],
	[-0.681718, -0.147621, -0.716567], [-0.850651, 0.000000, -0.525731],
	[-0.688191, 0.587785, -0.425325], [-0.587785, 0.425325, -0.688191],
	[-0.425325, 0.688191, -0.587785], [-0.425325, -0.688191, -0.587785],
	[-0.587785, -0.425325, -0.688191], [-0.688191, -0.587785, -0.425325]
];

/**
 * DirToByte
 */
function DirToByte(dir) {
	if (!dir) {
		return 0;
	}

	var best = 0;
	var bestd = 0;
	var d;
	for (var i = 0, length = bytedirs.length; i < length; i++) {
		d = vec3.dot(dir, bytedirs[i]);
		if (d > bestd) {
			bestd = d;
			best = i;
		}
	}

	return best;
}

/**
 * ByteToDir
 */
function ByteToDir(b, dir) {
	if (b < 0 || b >= bytedirs.length) {
		vec3.create(dir);
		return;
	}
	vec3.set(bytedirs[b], dir);
}

/**
 * rrandom
 */
function rrandom(min, max) {
	return Math.random() * (max - min) + min;
}

/**
 * irrandom
 */
function irrandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * crandom
 */
function crandom() {
	return 2.0 * (Math.random() - 0.5);
}

/**
 * SnapVector
 */
function SnapVector(normal) {
	normal[0] = Math.round(normal[0]);
	normal[1] = Math.round(normal[1]);
	normal[2] = Math.round(normal[2]);
}

/**
 * PerpendicularVector
 */
function PerpendicularVector(src, dst) {
	// Find the smallest magnitude axially aligned vector.
	var i, pos;
	var minelem = 1;
	for(var i = 0, pos = 0; i < 3; i++) {
		if (Math.abs(src[i]) < minelem) {
			pos = i;
			minelem = Math.abs(src[i]);
		}
	}
	var tempvec = vec3.create();
	tempvec[pos] = 1;

	// Project the point onto the plane defined by src.
	ProjectPointOnPlane(tempvec, src, dst);

	// Normalize the result.
	vec3.normalize(dst);
}

/**
 * Angle consts
 */
var PITCH = 0; // up / down
var YAW   = 1; // left / right
var ROLL  = 2; // fall over

/**
 * DEG2RAD
 */
function DEG2RAD(a) {
	return (a * Math.PI) / 180.0;
}

/**
 * RAD2DEG
 */
function RAD2DEG(a) {
	return (a * 180.0) / Math.PI;
}

/**
 * AngleSubtract
 *
 * Always returns a value from -180 to 180
 */
function AngleSubtract(a1, a2) {
	var a = a1 - a2;
	while (a > 180) {
		a -= 360;
	}
	while (a < -180) {
		a += 360;
	}
	return a;
}

/**
 * AnglesSubtract
 */
function AnglesSubtract(v1, v2, v3) {
	v3[0] = AngleSubtract(v1[0], v2[0]);
	v3[1] = AngleSubtract(v1[1], v2[1]);
	v3[2] = AngleSubtract(v1[2], v2[2]);
}

/**
 * LerpAngle
 */
function LerpAngle(from, to, frac) {
	if (to - from > 180) {
		to -= 360;
	}
	if (to - from < -180) {
		to += 360;
	}

	return from + frac * (to - from);
}

/**
 * AngleNormalize360
 *
 * Returns angle normalized to the range [0 <= angle < 360].
 */
function AngleNormalize360(a) {
	a = (360.0/65536) * (parseInt((a*(65536/360.0)), 10) & 65535);
	return a;
}

/**
 * AngleNormalize180
 *
 * Returns angle normalized to the range [-180 < angle <= 180].
 */
function AngleNormalize180(a) {
	a = AngleNormalize360(a);
	if (a > 180.0) {
		a -= 360.0;
	}
	return a;
}


/**
 * AnglesToVectors
 */
function AnglesToVectors(angles, forward, right, up) {
	var angle;
	var sr, sp, sy, cr, cp, cy;

	angle = angles[YAW] * (Math.PI*2 / 360);
	sy = Math.sin(angle);
	cy = Math.cos(angle);
	angle = angles[PITCH] * (Math.PI*2 / 360);
	sp = Math.sin(angle);
	cp = Math.cos(angle);
	angle = angles[ROLL] * (Math.PI*2 / 360);
	sr = Math.sin(angle);
	cr = Math.cos(angle);

	if (forward) {
		forward[0] = cp*cy;
		forward[1] = cp*sy;
		forward[2] = -sp;
	}

	if (right) {
		right[0] = (-1*sr*sp*cy+-1*cr*-sy);
		right[1] = (-1*sr*sp*sy+-1*cr*cy);
		right[2] = -1*sr*cp;
	}

	if (up) {
		up[0] = (cr*sp*cy+-sr*-sy);
		up[1] = (cr*sp*sy+-sr*cy);
		up[2] = cr*cp;
	}
}

/**
 * VectorToAngles
 */
function VectorToAngles(value1, angles) {
	var forward, yaw, pitch;

	if (value1[1] === 0 && value1[0] === 0) {
		yaw = 0;
		pitch = value1[2] > 0 ? 90 : 270;
	} else {
		if (value1[0]) {
			yaw = (Math.atan2(value1[1], value1[0]) * 180 / Math.PI);
		} else if (value1[1] > 0) {
			yaw = 90;
		} else {
			yaw = 270;
		}

		if (yaw < 0) {
			yaw += 360;
		}

		forward = Math.sqrt(value1[0]*value1[0] + value1[1]*value1[1]);
		pitch = (Math.atan2(value1[2], forward) * 180 / Math.PI);
		if (pitch < 0) {
			pitch += 360;
		}
	}

	angles[PITCH] = -pitch;
	angles[YAW] = yaw;
	angles[ROLL] = 0;
}

/**
 * AngleToShort
 */
function AngleToShort(x) {
	return (((x)*65536/360) & 65535);
}

/**
 * ShortToAngle
 */
function ShortToAngle(x) {
	return ((x)*(360.0/65536));
}

/**
 * AxisClear
 */
function AxisClear(axis) {
	axis[0][0] = 1;
	axis[0][1] = 0;
	axis[0][2] = 0;
	axis[1][0] = 0;
	axis[1][1] = 1;
	axis[1][2] = 0;
	axis[2][0] = 0;
	axis[2][1] = 0;
	axis[2][2] = 1;
}

/**
 * AxisCopy
 */
function AxisCopy(src, dest) {
	vec3.set(src[0], dest[0]);
	vec3.set(src[1], dest[1]);
	vec3.set(src[2], dest[2]);
}

/**
 * AnglesToAxis
 */
function AnglesToAxis(angles, axis) {
	AnglesToVectors(angles, axis[0], axis[1], axis[2]);
	// angle vectors returns "right" instead of "y axis"
	vec3.negate(axis[1]);
}

/**
 * AxisMultiply
 *
 * TODO Perhaps the functions using this should change the way they store
 * there axis, so we can re-use the mat3 lib calls.
 */
function AxisMultiply(in1, in2, out) {
	out[0][0] = in1[0][0] * in2[0][0] + in1[0][1] * in2[1][0] + in1[0][2] * in2[2][0];
	out[0][1] = in1[0][0] * in2[0][1] + in1[0][1] * in2[1][1] + in1[0][2] * in2[2][1];
	out[0][2] = in1[0][0] * in2[0][2] + in1[0][1] * in2[1][2] + in1[0][2] * in2[2][2];

	out[1][0] = in1[1][0] * in2[0][0] + in1[1][1] * in2[1][0] + in1[1][2] * in2[2][0];
	out[1][1] = in1[1][0] * in2[0][1] + in1[1][1] * in2[1][1] + in1[1][2] * in2[2][1];
	out[1][2] = in1[1][0] * in2[0][2] + in1[1][1] * in2[1][2] + in1[1][2] * in2[2][2];

	out[2][0] = in1[2][0] * in2[0][0] + in1[2][1] * in2[1][0] + in1[2][2] * in2[2][0];
	out[2][1] = in1[2][0] * in2[0][1] + in1[2][1] * in2[1][1] + in1[2][2] * in2[2][1];
	out[2][2] = in1[2][0] * in2[0][2] + in1[2][1] * in2[1][2] + in1[2][2] * in2[2][2];
}

/**
 * TransposeMatrix
 */
function TransposeMatrix(matrix, transpose) {
	for (var i = 0; i < 3; i++) {
		for (var j = 0; j < 3; j++) {
			transpose[i][j] = matrix[j][i];
		}
	}
}

/**
 * RotatePoint
 */
function RotatePoint(point, axis) {
	var tvec = vec3.create(point);
	point[0] = vec3.dot(axis[0], tvec);
	point[1] = vec3.dot(axis[1], tvec);
	point[2] = vec3.dot(axis[2], tvec);
}

/**
 * RotatePointAroundVector
 */
function RotatePointAroundVector(point, dir, degrees, dst) {
	var m = mat4.identity();
	mat4.rotate(m, DEG2RAD(degrees), dir);
	mat4.multiplyVec3(m, point, dst);
}

/**
 * RotateAroundDirection
 */
function RotateAroundDirection(axis, yaw) {
	// Create an arbitrary axis[1].
	PerpendicularVector(axis[0], axis[1]);

	// Rotate it around axis[0] by yaw.
	if (yaw) {
		var temp = vec3.create(axis[1]);
		RotatePointAroundVector(temp, axis[0], yaw, axis[1]);
	}

	// Cross to get axis[2].
	vec3.cross(axis[0], axis[1], axis[2]);
}

/**
 * Plane
 */

var PLANE_X           = 0;
var PLANE_Y           = 1;
var PLANE_Z           = 2;
var PLANE_NON_AXIAL   = 3;

var SIDE_FRONT        = 1;
var SIDE_BACK         = 2;
var SIDE_ON           = 3;
var PLANE_TRI_EPSILON = 0.1;

var Plane = function () {
	this.normal   = vec3.create();
	this.dist     = 0;
	this.type     = 0;
	this.signbits = 0;
};

Plane.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Plane();
	}

	vec3.set(this.normal, to.normal);
	to.dist = this.dist;
	to.type = this.type;
	to.signbits = this.signbits;

	return to;
};

/**
 * PlaneTypeForNormal
 */
function PlaneTypeForNormal(x) {
	return x[0] == 1.0 ? PLANE_X : (x[1] == 1.0 ? PLANE_Y : (x[2] == 1.0 ? PLANE_Z : PLANE_NON_AXIAL));
}

/**
 * GetPlaneSignbits
 */
function GetPlaneSignbits(normal) {
	var bits = 0;

	for (var i = 0; i < 3; i++) {
		if (normal[i] < 0) {
			bits |= 1 << i;
		}
	}

	return bits;
}

/**
 * PointOnPlaneSide
 */
function PointOnPlaneSide(pt, p) {
	var d = vec3.dot(pt, p.normal) - p.dist;

	if (d > PLANE_TRI_EPSILON) {
		return SIDE_FRONT;
	}

	if (d < -PLANE_TRI_EPSILON) {
		return SIDE_BACK;
	}

	return SIDE_ON;
}

/**
 * BoxOnPlaneSide
 *
 * Returns 1, 2, or 1 + 2.
 */
function BoxOnPlaneSide(mins, maxs, p) {
	// Fast axial cases.
	if (p.type < PLANE_NON_AXIAL) {
		if (p.dist <= mins[p.type]) {
			return SIDE_FRONT;
		} else if (p.dist >= maxs[p.type]) {
			return SIDE_BACK;
		}
		return SIDE_ON;
	}

	// General case.
	var dist = [0, 0];

	if (p.signbits < 8) {  // >= 8: default case is original code (dist[0]=dist[1]=0)
		for (var i = 0; i < 3; i++) {
			var b = (p.signbits >> i) & 1;
			dist[b] += p.normal[i] * maxs[i];
			dist[b^1] += p.normal[i] * mins[i];
		}
	}

	var sides = 0;
	if (dist[0] >= p.dist) {
		sides = SIDE_FRONT;
	}
	if (dist[1] < p.dist) {
		sides |= SIDE_BACK;
	}

	return sides;
}

/**
 * ProjectPointOnPlane
 */
function ProjectPointOnPlane(p, normal, dest) {
	var n = vec3.scale(normal, vec3.dot(normal, p), vec3.create());
	vec3.subtract(p, n, dest);
}

/**
 * PlaneFromPoints
 *
 * Returns null if the triangle is degenrate.
 * The normal will point out of the clock for clockwise ordered points.
 */
function PlaneFromPoints(a, b, c) {
	var plane = new Plane();
	var d1 = vec3.subtract(b, a, vec3.create());
	var d2 = vec3.subtract(c, a, vec3.create());

	vec3.cross(d2, d1, plane.normal);
	vec3.normalize(plane.normal);

	if (vec3.length(plane.normal) === 0) {
		return null;
	}

	plane.dist = vec3.dot(a, plane.normal);
	plane.signbits = GetPlaneSignbits(plane.normal);

	return plane;
}

/**
 * PlaneEqual
 */
var NORMAL_EPSILON = 0.0001;
var DIST_EPSILON   = 0.02;

function PlaneEqual(p1, p2) {
	if (Math.abs(p1.normal[0] - p2.normal[0]) < NORMAL_EPSILON &&
		Math.abs(p1.normal[1] - p2.normal[1]) < NORMAL_EPSILON &&
		Math.abs(p1.normal[2] - p2.normal[2]) < NORMAL_EPSILON &&
		Math.abs(p1.dist - p2.dist) < DIST_EPSILON) {
		return true;
	}

	return false;
}

/**
 * Ordered list of colplanar vectors.
 */
var MAX_MAP_BOUNDS        = 65535;
var MAX_POINTS_ON_WINDING = 64;

var Winding = function () {
	this.p = [];
};

Winding.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Winding();
	}

	to.p = new Array(this.p.length);
	for (var i = 0; i < this.p.length; i++) {
		to.p[i] = vec3.create(this.p[i]);
	}

	return to;
};

/**
 * BaseWindingForPlane
 *
 * Take a plane and generate a giant quad using the
 * MAP_MAP_BOUNDS constant of coplanar points.
 */
function BaseWindingForPlane(normal, dist) {
	// Find the major axis.
	var max = -MAX_MAP_BOUNDS;
	var v;
	var x = -1;
	for (var i = 0; i < 3; i++) {
		v = Math.abs(normal[i]);
		if (v > max) {
			x = i;
			max = v;
		}
	}

	if (x === -1) {
		throw new Exception('BaseWindingForPlane: no axis found');
	}

	var vup = vec3.create();
	var org = vec3.create();
	var vright = vec3.create();
	switch (x) {
		case 0:
		case 1:
			vup[2] = 1;
			break;
		case 2:
			vup[0] = 1;
			break;
	}

	var v = vec3.dot(vup, normal);
	vec3.add(vup, vec3.scale(normal, -v, vec3.create()));
	vec3.normalize(vup);

	vec3.scale(normal, dist, org);

	vec3.cross(vup, normal, vright);

	vec3.scale(vup, MAX_MAP_BOUNDS);
	vec3.scale(vright, MAX_MAP_BOUNDS);

	// Project a really big	axis aligned box onto the plane.
	var w = new Winding();

	w.p[0] = vec3.subtract(org, vright, vec3.create());
	vec3.add(w.p[0], vup, w.p[0]);

	w.p[1] = vec3.add(org, vright, vec3.create());
	vec3.add(w.p[1], vup, w.p[1]);

	w.p[2] = vec3.add(org, vright, vec3.create());
	vec3.subtract(w.p[2], vup, w.p[2]);

	w.p[3] = vec3.subtract(org, vright, vec3.create());
	vec3.subtract(w.p[3], vup, w.p[3]);

	return w;
}

/**
 * WindingBounds
 *
 * Get the bounds of a giving winding, helpful
 * for sanity testing a chop.
 */
function WindingBounds(w, mins, maxs) {
	var v;

	mins[0] = mins[1] = mins[2] = MAX_MAP_BOUNDS;
	maxs[0] = maxs[1] = maxs[2] = -MAX_MAP_BOUNDS;

	for (var i = 0; i < w.p.length; i++) {
		for (var j = 0; j < 3; j++) {
			v = w.p[i][j];

			if (v < mins[j]) {
				mins[j] = v;
			}

			if (v > maxs[j]) {
				maxs[j] = v;
			}
		}
	}
}

/**
 * ChopWindingInPlace
 *
 * Chop a winding by a single plane.
 */
function ChopWindingInPlace(inout, normal, dist, epsilon) {
	var i, j;
	var dot;
	var p1, p2;
	var dists = new Array(MAX_POINTS_ON_WINDING+4);
	var sides = new Array(MAX_POINTS_ON_WINDING+4);
	var counts = vec3.create();
	var mid = vec3.create();
	var orig = inout.clone();

	// Determine sides for each point.
	for (i = 0; i < orig.p.length; i++) {
		dot = dists[i] = vec3.dot(orig.p[i], normal) - dist;

		if (dot > epsilon) {
			sides[i] = SIDE_FRONT;
		} else if (dot < -epsilon) {
			sides[i] = SIDE_BACK;
		} else {
			sides[i] = SIDE_ON;
		}

		counts[sides[i]]++;
	}
	sides[i] = sides[0];
	dists[i] = dists[0];

	if (!counts[SIDE_FRONT]) {
		return false;
	}
	if (!counts[SIDE_BACK]) {
		return true;  // inout stays the same
	}

	// Reset inout points.
	var f = new Winding();
	var maxpts = orig.p.length + 4;  // cant use counts[0]+2 because
	                                 // of fp grouping errors

	for (i = 0; i < orig.p.length; i++) {
		p1 = orig.p[i];

		if (sides[i] === SIDE_ON) {
			f.p.push(vec3.set(p1, vec3.create()));
			continue;
		}

		if (sides[i] === SIDE_FRONT) {
			f.p.push(vec3.set(p1, vec3.create()));
		}

		if (sides[i+1] === SIDE_ON || sides[i+1] === sides[i]) {
			continue;
		}

		// Generate a split point.
		p2 = orig.p[(i+1) % orig.p.length];
		dot = dists[i] / (dists[i]-dists[i+1]);

		for (var j = 0; j < 3; j++) {
			// Avoid round off error when possible.
			if (normal[j] === 1) {
				mid[j] = dist;
			} else if (normal[j] === -1) {
				mid[j] = -dist;
			} else {
				mid[j] = p1[j] + dot*(p2[j]-p1[j]);
			}
		}

		f.p.push(vec3.set(mid, vec3.create()));
	}

	if (f.p.length > maxpts) {
		throw new Exception('ClipWinding: points exceeded estimate');
	}

	if (f.p.length > MAX_POINTS_ON_WINDING) {
		throw new Exception('ClipWinding: MAX_POINTS_ON_WINDING');
	}

	f.clone(inout);

	return true;
}

/**
 * RadiusFromBounds
 */
function RadiusFromBounds(mins, maxs) {
	var a, b;
	var corner = vec3.create();

	for (var i = 0; i < 3; i++) {
		a = Math.abs(mins[i]);
		b = Math.abs(maxs[i]);
		corner[i] = a > b ? a : b;
	}

	return vec3.length(corner);
}

/**
 * ClearBounds
 */
function ClearBounds(mins, maxs) {
	mins[0] = mins[1] = mins[2] = 99999;
	maxs[0] = maxs[1] = maxs[2] = -99999;
}

/**
 * AddPointToBounds
 */
function AddPointToBounds(v, mins, maxs) {
	if (v[0] < mins[0]) {
		mins[0] = v[0];
	}
	if (v[0] > maxs[0]) {
		maxs[0] = v[0];
	}

	if (v[1] < mins[1]) {
		mins[1] = v[1];
	}
	if (v[1] > maxs[1]) {
		maxs[1] = v[1];
	}

	if (v[2] < mins[2]) {
		mins[2] = v[2];
	}
	if (v[2] > maxs[2]) {
		maxs[2] = v[2];
	}
}

/**
 * BoundsIntersect
 */
function BoundsIntersect(mins, maxs, mins2, maxs2, epsilon) {
	epsilon = epsilon || 0;

	if (maxs[0] < mins2[0] - epsilon ||
		maxs[1] < mins2[1] - epsilon ||
		maxs[2] < mins2[2] - epsilon ||
		mins[0] > maxs2[0] + epsilon ||
		mins[1] > maxs2[1] + epsilon ||
		mins[2] > maxs2[2] + epsilon) {
		return false;
	}

	return true;
}

/**
 * BoundsIntersectPoint
 */
function BoundsIntersectPoint(mins, maxs, origin) {
	if (origin[0] > maxs[0] ||
		origin[0] < mins[0] ||
		origin[1] > maxs[1] ||
		origin[1] < mins[1] ||
		origin[2] > maxs[2] ||
		origin[2] < mins[2]) {
		return false;
	}

	return true;
}

/**
 * RadixSort
 *
 * Sort 32 bit ints into 8 bit buckets.
 * http://stackoverflow.com/questions/8082425/fastest-way-to-sort-32bit-signed-integer-arrays-in-javascript
 */
var _radixSort_0 = [
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
];

function RadixSort(arr, prop, start, end) {
	var len = end - start;
	var cpy = new Array(len);
	var c4 = [].concat(_radixSort_0);
	var c3 = [].concat(_radixSort_0);
	var c2 = [].concat(_radixSort_0);
	var c1 = [].concat(_radixSort_0);
	var o4 = 0; var k4;
	var o3 = 0; var k3;
	var o2 = 0; var k2;
	var o1 = 0; var k1;
	var x;
	for (x = start; x < end; x++) {
		k4 = arr[x][prop] & 0xFF;
		k3 = (arr[x][prop] >> 8) & 0xFF;
		k2 = (arr[x][prop] >> 16) & 0xFF;
		k1 = (arr[x][prop] >> 24) & 0xFF ^ 0x80;
		c4[k4]++;
		c3[k3]++;
		c2[k2]++;
		c1[k1]++;
	}
	for (x = 0; x < 256; x++) {
		k4 = o4 + c4[x];
		k3 = o3 + c3[x];
		k2 = o2 + c2[x];
		k1 = o1 + c1[x];
		c4[x] = o4;
		c3[x] = o3;
		c2[x] = o2;
		c1[x] = o1;
		o4 = k4;
		o3 = k3;
		o2 = k2;
		o1 = k1;
	}
	for (x = start; x < end; x++) {
		k4 = arr[x][prop] & 0xFF;
		cpy[c4[k4]] = arr[x];
		c4[k4]++;
	}
	for (x = 0; x < len; x++) {
		k3 = (cpy[x][prop] >> 8) & 0xFF;
		arr[start+c3[k3]] = cpy[x];
		c3[k3]++;
	}
	for (x = start; x < end; x++) {
		k2 = (arr[x][prop] >> 16) & 0xFF;
		cpy[c2[k2]] = arr[x];
		c2[k2]++;
	}
	for (x = 0; x < len; x++) {
		k1 = (cpy[x][prop] >> 24) & 0xFF ^ 0x80;
		arr[start+c1[k1]] = cpy[x];
		c1[k1]++;
	}

	return arr;
}

return {
	vec3origin:              vec3origin,
	axisDefault:             axisDefault,

	DirToByte:               DirToByte,
	ByteToDir:               ByteToDir,
	rrandom:                 rrandom,
	irrandom:                irrandom,
	crandom:                 crandom,

	SnapVector:              SnapVector,
	PerpendicularVector:     PerpendicularVector,

	PITCH:                   PITCH,
	YAW:                     YAW,
	ROLL:                    ROLL,
	DEG2RAD:                 DEG2RAD,
	RAD2DEG:                 RAD2DEG,
	AngleSubtract:           AngleSubtract,
	AnglesSubtract:          AnglesSubtract,
	LerpAngle:               LerpAngle,
	AngleNormalize360:       AngleNormalize360,
	AngleNormalize180:       AngleNormalize180,
	AnglesToVectors:         AnglesToVectors,
	VectorToAngles:          VectorToAngles,
	AngleToShort:            AngleToShort,
	ShortToAngle:            ShortToAngle,

	AxisClear:               AxisClear,
	AxisCopy:                AxisCopy,
	AnglesToAxis:            AnglesToAxis,
	AxisMultiply:            AxisMultiply,
	TransposeMatrix:         TransposeMatrix,
	RotatePoint:             RotatePoint,
	RotatePointAroundVector: RotatePointAroundVector,
	RotateAroundDirection:   RotateAroundDirection,

	PLANE_X:                 PLANE_X,
	PLANE_Y:                 PLANE_Y,
	PLANE_Z:                 PLANE_Z,
	PLANE_NON_AXIAL:         PLANE_NON_AXIAL,
	SIDE_FRONT:              SIDE_FRONT,
	SIDE_BACK:               SIDE_BACK,
	SIDE_ON:                 SIDE_ON,
	Plane:                   Plane,
	PlaneTypeForNormal:      PlaneTypeForNormal,
	GetPlaneSignbits:        GetPlaneSignbits,
	PointOnPlaneSide:        PointOnPlaneSide,
	BoxOnPlaneSide:          BoxOnPlaneSide,
	ProjectPointOnPlane:     ProjectPointOnPlane,
	PlaneFromPoints:         PlaneFromPoints,
	PlaneEqual:              PlaneEqual,

	MAX_MAP_BOUNDS:          MAX_MAP_BOUNDS,
	BaseWindingForPlane:     BaseWindingForPlane,
	WindingBounds:           WindingBounds,
	ChopWindingInPlace:      ChopWindingInPlace,

	RadiusFromBounds:        RadiusFromBounds,
	ClearBounds:             ClearBounds,
	AddPointToBounds:        AddPointToBounds,
	BoundsIntersect:         BoundsIntersect,
	BoundsIntersectPoint:    BoundsIntersectPoint,

	RadixSort:               RadixSort
};

});
/*global vec3: true, mat4: true */

define('common/qshared', ['common/qmath'], function (QMath) {

// FIXME Remove this and add a more advanced checksum-based cachebuster to game.
var GAME_VERSION = 0.1126;
var PROTOCOL_VERSION = 1;

var CMD_BACKUP   = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Text colors
 */
var COLOR = {
	BLACK:   0,
	RED:     1,
	GREEN:   2,
	YELLOW:  3,
	BLUE:    4,
	CYAN:    5,
	MAGENTA: 6,
	WHITE:   7
};

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << GENTITYNUM_BITS);      // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

var ARENANUM_NONE           = ENTITYNUM_NONE;

/**
 * Communicated across the network
 */
var NA = {
	BAD:      0,
	LOOPBACK: 1,
	IP:       2
};

var NetAdr = function () {
	this.type = NA.BAD;
	this.ip   = null;
	this.port = 0;
};

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var UserCmd = function () {
	this.serverTime  = 0;
	this.angles      = vec3.create();
	this.forwardmove = 0;
	this.rightmove   = 0;
	this.upmove      = 0;
	this.buttons     = 0;
	this.weapon      = 0;
};

UserCmd.prototype.clone = function (cmd) {
	if (typeof(cmd) === 'undefined') {
		cmd = new UserCmd();
	}

	cmd.serverTime = this.serverTime;
	vec3.set(this.angles, cmd.angles);
	cmd.forwardmove = this.forwardmove;
	cmd.rightmove = this.rightmove;
	cmd.upmove = this.upmove;
	cmd.buttons = this.buttons;
	cmd.weapon = this.weapon;

	return cmd;
};

/**
 * Shared entity state
 */
var SharedEntity = function () {
	this.linked        = false;
	// SVF_NOCLIENT, SVF_BROADCAST, etc.
	this.svFlags       = 0;
	// Only send to this client when SVF_SINGLECLIENT is set.
	this.singleClient  = 0;
	// If false, assume an explicit mins / maxs bounding box only set by trap_SetBrushModel.
	this.bmodel        = false;
	this.mins          = vec3.create();
	this.maxs          = vec3.create();
	// SURF.CONTENTS.TRIGGER, SURF.CONTENTS.SOLID, SURF.CONTENTS.BODY (non-solid ent should be 0)
	this.contents      = 0;
	// Derived from mins/maxs and origin + rotation.
	this.absmin        = vec3.create();
	this.absmax        = vec3.create();
	// currentOrigin will be used for all collision detection and world linking.
	// it will not necessarily be the same as the trajectory evaluation for the current
	// time, because each entity must be moved one at a time after time is advanced
	// to avoid simultanious collision issues.
	this.currentOrigin = vec3.create();
	this.currentAngles = vec3.create();
	this.client        = null;
	// When a trace call is made and passEntityNum != ENTITYNUM_NONE,
	// an ent will be excluded from testing if:
	// ent.s.number == passEntityNum                   (don't interact with self)
	// ent.ownerNum == passEntityNum                   (don't interact with your own missiles)
	// entity[ent.ownerNum].ownerNum == passEntityNum  (don't interact with other missiles from owner)
	this.ownerNum      = ENTITYNUM_NONE;
};

/**
 * Player state
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var PlayerState = function () {
	this.reset();
};

PlayerState.prototype.reset = function () {
	this.clientNum           = 0;                          // ranges from 0 to MAX_CLIENTS-1
	this.arenaNum            = ARENANUM_NONE;
	this.commandTime         = 0;                          // cmd->serverTime of last executed command
	this.pm_type             = 0;
	this.pm_flags            = 0;                          // ducked, jump_held, etc
	this.origin              = vec3.create();
	this.velocity            = vec3.create();
	this.viewangles          = vec3.create();
	this.viewheight          = 0;
	this.delta_angles        = vec3.create();              // add to command angles to get view direction
	                                                       // changed by spawns, rotating objects, and teleporters
	this.speed               = 0;
	this.gravity             = 0;
	this.groundEntityNum     = ENTITYNUM_NONE;             // ENTITYNUM_NONE = in air
	this.bobCycle            = 0;                          // for view bobbing and footstep generation

	this.weapon              = 0;                          // copied to entityState_t->weapon
	this.weaponState         = 0;
	this.weaponTime          = 0;
	this.legsTimer           = 0;                          // don't change low priority animations until this runs out
	this.legsAnim            = 0;                          // mask off ANIM_TOGGLEBIT

	this.torsoTimer          = 0;                          // don't change low priority animations until this runs out
	this.torsoAnim           = 0;                          // mask off ANIM_TOGGLEBIT

	this.movementDir         = 0;                          // a number 0 to 7 that represents the relative angle
	                                                       // of movement to the view angle (axial and diagonals)
	                                                       // when at rest, the value will remain unchanged
	                                                       // used to twist the legs during strafing
	// Damage feedback.
	this.damageEvent         = 0;                          // when it changes, latch the other parms
	this.damageYaw           = 0;
	this.damagePitch         = 0;
	this.damageCount         = 0;

	this.stats               = new Array(MAX_STATS);
	this.persistant          = new Array(MAX_PERSISTANT);  // stats that aren't cleared on death
	this.powerups            = new Array(MAX_POWERUPS);    // level.time that the powerup runs out
	this.ammo                = new Array(MAX_WEAPONS);

	this.eFlags              = 0;                          // copied to entityState_t->eFlags
	this.eventSequence       = 0;                          // pmove generated events
	this.events              = new Array(MAX_PS_EVENTS);
	this.eventParms          = new Array(MAX_PS_EVENTS);

	this.externalEvent       = 0;                          // events set on player from another source
	this.externalEventParm   = 0;

	// Not communicated over the net.
	this.ping                = 0;                          // server to game info for scoreboard
	this.jumppad_ent         = 0;                          // jumppad entity hit this frame
	this.jumppad_frame       = 0;
	this.pmove_framecount    = 0;
	this.entityEventSequence = 0;

	for (var i = 0; i < MAX_STATS; i++) {
		this.stats[i] = 0;
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		this.persistant[i] = 0;
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		this.powerups[i] = 0;
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		this.ammo[i] = 0;
	}
};

// deep copy
PlayerState.prototype.clone = function (ps) {
	if (typeof(ps) === 'undefined') {
		ps = new PlayerState();
	}

	ps.clientNum            = this.clientNum;
	ps.arenaNum             = this.arenaNum;
	ps.commandTime          = this.commandTime;
	ps.pm_type              = this.pm_type;
	ps.pm_flags             = this.pm_flags;
	vec3.set(this.origin, ps.origin);
	vec3.set(this.velocity, ps.velocity);
	vec3.set(this.viewangles, ps.viewangles);
	ps.viewheight           = this.viewheight;
	vec3.set(this.delta_angles, ps.delta_angles);
	ps.speed                = this.speed;
	ps.gravity              = this.gravity;
	ps.groundEntityNum      = this.groundEntityNum;
	ps.bobCycle             = this.bobCycle;
	ps.weapon               = this.weapon;
	ps.weaponState          = this.weaponState;
	ps.weaponTime           = this.weaponTime;
	ps.legsTimer            = this.legsTimer;
	ps.legsAnim             = this.legsAnim;
	ps.torsoTimer           = this.torsoTimer;
	ps.torsoAnim            = this.torsoAnim;
	ps.movementDir          = this.movementDir;
	ps.damageEvent          = this.damageEvent;
	ps.damageYaw            = this.damageYaw;
	ps.damagePitch          = this.damagePitch;
	ps.damageCount          = this.damageCount;
	for (var i = 0; i < MAX_STATS; i++) {
		ps.stats[i] = this.stats[i];
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		ps.persistant[i] = this.persistant[i];
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		ps.powerups[i] = this.powerups[i];
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		ps.ammo[i] = this.ammo[i];
	}
	ps.eFlags               = this.eFlags;
	ps.eventSequence        = this.eventSequence;
	for (var i = 0; i < MAX_PS_EVENTS; i++) {
		ps.events[i] = this.events[i];
		ps.eventParms[i] = this.eventParms[i];
	}
	ps.externalEvent        = this.externalEvent;
	ps.externalEventParm    = this.externalEventParm;
	ps.jumppad_ent          = this.jumppad_ent;
	ps.jumppad_frame        = this.jumppad_frame;
	ps.pmove_framecount     = this.pmove_framecount;
	ps.entityEventSequence  = this.entityEventSequence;

	return ps;
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                                        // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                                        // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var Trajectory = function () {
	this.trType     = 0;
	this.trTime     = 0;
	this.trDuration = 0;
	this.trBase     = vec3.create();
	this.trDelta    = vec3.create();
};

Trajectory.prototype.clone = function (tr) {
	if (typeof(tr) === 'undefined') {
		tr = new Trajectory();
	}

	tr.trType = this.trType;
	tr.trTime = this.trTime;
	tr.trDuration = this.trDuration;
	vec3.set(this.trBase, tr.trBase);
	vec3.set(this.trDelta, tr.trDelta);

	return tr;
};

var Orientation = function () {
	this.origin      = vec3.create();                          // in world coordinates
	this.axis        = [                                   // orientation in world
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	// Used by renderer.
	this.viewOrigin  = vec3.create();                          // viewParms->or.origin in local coordinates
	this.modelMatrix = mat4.create();
};

Orientation.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Orientation();
	}

	vec3.set(this.origin, to.origin);
	vec3.set(this.axis[0], to.axis[0]);
	vec3.set(this.axis[1], to.axis[1]);
	vec3.set(this.axis[2], to.axis[2]);
	vec3.set(this.viewOrigin, to.viewOrigin);
	mat4.set(this.modelMatrix, to.modelMatrix);

	return to;
};

/**********************************************************
 * EntityState is the information conveyed from the server
 * in an update message about entities that the client will
 * need to render in some way. Different eTypes may use the
 * information in different ways. The messages are delta
 * compressed, so it doesn't really matter if the structure
 * size is fairly large
 **********************************************************/
var EntityState = function () {
	this.reset();
};

EntityState.prototype.reset = function () {
	this.number          = 0;                              // entity index
	this.arenaNum        = ARENANUM_NONE;
	this.eType           = 0;                              // entityType_t
	this.eFlags          = 0;
	this.pos             = new Trajectory();               // for calculating position
	this.apos            = new Trajectory();               // for calculating angles
	this.time            = 0;
	this.time2           = 0;
	this.origin          = vec3.create();
	this.origin2         = vec3.create();
	this.angles          = vec3.create();
	this.angles2         = vec3.create();
	this.otherEntityNum  = 0;                              // shotgun sources, etc
	this.otherEntityNum2 = 0;                              // shotgun sources, etc
	this.groundEntityNum = ENTITYNUM_NONE;                 // ENTITYNUM_NONE = in air
	this.constantLight   = 0;                              // r + (g<<8) + (b<<16) + (intensity<<24)
	this.loopSound       = 0;                              // constantly loop this sound
	this.modelIndex      = 0;
	this.modelIndex2     = 0;
	this.clientNum       = 0;                              // 0 to (MAX_CLIENTS - 1), for players and corpses
	this.frame           = 0;
	this.solid           = 0;                              // for client side prediction, trap_linkentity sets this properly
	this.event           = 0;                              // impulse events -- muzzle flashes, footsteps, etc
	this.eventParm       = 0;
	// For players.
	this.powerups        = 0;                              // bit flags
	this.weapon          = 0;                              // determines weapon and flash model, etc
	this.legsAnim        = 0;                              // mask off ANIM_TOGGLEBIT
	this.torsoAnim       = 0;                              // mask off ANIM_TOGGLEBIT
	this.generic1        = 0;
};

// deep copy
EntityState.prototype.clone = function (es) {
	if (typeof(es) === 'undefined') {
		es = new EntityState();
	}

	es.number            = this.number;
	es.arenaNum          = this.arenaNum;
	es.eType             = this.eType;
	es.eFlags            = this.eFlags;
	this.pos.clone(es.pos);
	this.apos.clone(es.apos);
	es.time              = this.time;
	es.time2             = this.time2;
	vec3.set(this.origin,  es.origin);
	vec3.set(this.origin2, es.origin2);
	vec3.set(this.angles,  es.angles);
	vec3.set(this.angles2, es.angles2);
	es.otherEntityNum    = this.otherEntityNum;
	es.otherEntityNum2   = this.otherEntityNum2;
	es.groundEntityNum   = this.groundEntityNum;
	es.constantLight     = this.constantLight;
	es.loopSound         = this.loopSound;
	es.modelIndex        = this.modelIndex;
	es.modelIndex2       = this.modelIndex2;
	es.clientNum         = this.clientNum;
	es.frame             = this.frame;
	es.solid             = this.solid;
	es.event             = this.event;
	es.eventParm         = this.eventParm;
	es.powerups          = this.powerups;
	es.weapon            = this.weapon;
	es.legsAnim          = this.legsAnim;
	es.torsoAnim         = this.torsoAnim;
	es.generic1          = this.generic1;

	return es;
};

/**
 * Trace results
 */
var TraceResults = function () {
	this.allSolid     = false;                             // if true, plane is not valid
	this.startSolid   = false;                             // if true, the initial point was in a solid area
	this.fraction     = 1.0;                               // time completed, 1.0 = didn't hit anything
	this.endPos       = vec3.create();                     // final position
	this.plane        = new QMath.Plane();                 // surface normal at impact, transformed to world space
	this.surfaceFlags = 0;
	this.contents     = 0;
	this.entityNum    = 0;
	this.shaderName   = null;                              // debugging
};

TraceResults.prototype.reset = function () {
	this.allSolid = false;
	this.startSolid = false;
	this.fraction = 1.0;
	this.endPos[0] = this.endPos[1] = this.endPos[2] = 0.0;
	// Plane reset
	this.plane = new QMath.Plane();
	this.surfaceFlags = 0;
	this.contents = 0;
	this.entityNum = 0;
	this.shaderName = null;
};

TraceResults.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new TraceResults();
	}

	to.allSolid = this.allSolid;
	to.startSolid = this.startSolid;
	to.fraction = this.fraction;
	vec3.set(this.endPos, to.endPos);
	this.plane.clone(to.plane);
	to.surfaceFlags = this.surfaceFlags;
	to.contents = this.contents;
	to.entityNum = this.entityNum;
	to.shaderName = this.shaderName;

	return to;
};

var FLAG = {
	ATBASE:      0,
	TAKEN:       1,     // CTF
	TAKEN_RED:   2,     // One Flag CTF
	TAKEN_BLUE:  3,     // One Flag CTF
	DROPPED:     4
};

/**
 * Helper functions for getting and setting object
 * properties from a string
 */
function FTA(fieldname) {
	var m = fieldname.match(/([^\.\[\]]+)/g);
	return m;
}

function AGET(obj, path) {
	var i, len;

	for (i = 0, len = path.length; i < len - 1; i++) {
		obj = obj[path[i]];
	}

	return obj[path[len - 1]];
}

function ASET(obj, path, val) {
	var i, len;

	for (i = 0, len = path.length; i < len - 1; i++) {
		obj = obj[path[i]];
	}

	obj[path[len - 1]] = val;
}

/**
 * atob64
 *
 * Convert array to base64 string
 */
function atob64(arr) {
	var limit = 1 << 16;
	var length = arr.length;
	var slice = arr.slice || arr.subarray;
	var str;

	if (length < limit) {
		str = String.fromCharCode.apply(String, arr);
	} else {
		var chunks = [];
		var i = 0;
		while (i < length) {
			chunks.push(String.fromCharCode.apply(String, slice.call(arr, i, i + limit)));
			i += limit;
		}
		str = chunks.join('');
	}

	return btoa(str);
}

/**
 * StripColors
 */
function StripColors(text) {
	return text.replace(/\^(\d)(.*?)(?=\^|$)/g, '$2');
}

return {
	GAME_VERSION:          GAME_VERSION,
	PROTOCOL_VERSION:      PROTOCOL_VERSION,

	CMD_BACKUP:            CMD_BACKUP,
	SOLID_BMODEL:          SOLID_BMODEL,

	COLOR:                 COLOR,

	SNAPFLAG_RATE_DELAYED: SNAPFLAG_RATE_DELAYED,
	SNAPFLAG_NOT_ACTIVE:   SNAPFLAG_NOT_ACTIVE,
	SNAPFLAG_SERVERCOUNT:  SNAPFLAG_SERVERCOUNT,

	GENTITYNUM_BITS:       GENTITYNUM_BITS,
	MAX_CLIENTS:           MAX_CLIENTS,
	MAX_GENTITIES:         MAX_GENTITIES,
	MAX_MODELS:            MAX_MODELS,
	MAX_SOUNDS:            MAX_SOUNDS,

	ARENANUM_NONE:         ARENANUM_NONE,
	ENTITYNUM_NONE:        ENTITYNUM_NONE,
	ENTITYNUM_WORLD:       ENTITYNUM_WORLD,
	ENTITYNUM_MAX_NORMAL:  ENTITYNUM_MAX_NORMAL,

	MAX_STATS:             MAX_STATS,
	MAX_PERSISTANT:        MAX_PERSISTANT,
	MAX_POWERUPS:          MAX_POWERUPS,
	MAX_WEAPONS:           MAX_WEAPONS,
	MAX_PS_EVENTS:         MAX_PS_EVENTS,
	PMOVEFRAMECOUNTBITS:   PMOVEFRAMECOUNTBITS,

	BUTTON:                BUTTON,
	TR:                    TR,
	FLAG:                  FLAG,
	NA:                    NA,

	SharedEntity:          SharedEntity,
	PlayerState:           PlayerState,
	Trajectory:            Trajectory,
	Orientation:           Orientation,
	EntityState:           EntityState,
	TraceResults:          TraceResults,

	NetAdr:                NetAdr,
	UserCmd:               UserCmd,

	FTA:                   FTA,
	AGET:                  AGET,
	ASET:                  ASET,

	atob64:                atob64,
	StripColors:           StripColors
};

});

(function (root) {

/**********************************************************
 *
 * BitView
 *
 * BitView provides a similar interface to the standard
 * DataView, but with support for bit-level reads / writes.
 *
 **********************************************************/
var BitView = function (source, byteOffset, byteLength) {
	var isBuffer = source instanceof ArrayBuffer ||
		(typeof(Buffer) !== 'undefined' && source instanceof Buffer);

	if (!isBuffer) {
		throw new Error('Must specify a valid ArrayBuffer or Buffer.');
	}

	byteOffset = byteOffset || 0;
	byteLength = byteLength || source.byteLength /* ArrayBuffer */ || source.length /* Buffer */;

	this._buffer = source;
	this._view = new Uint8Array(this._buffer, byteOffset, byteLength);
};

// Used to massage fp values so we can operate on them
// at the bit level.
BitView._scratch = new DataView(new ArrayBuffer(8));

Object.defineProperty(BitView.prototype, 'buffer', {
	get: function () { return this._buffer; },
	enumerable: true,
	configurable: false
});

Object.defineProperty(BitView.prototype, 'byteLength', {
	get: function () { return this._view.length; },
	enumerable: true,
	configurable: false
});

BitView.prototype._getBit = function (offset) {
	return this._view[offset >> 3] >> (offset & 7) & 0x1;
};

BitView.prototype._setBit = function (offset, on) {
	if (on) {
		this._view[offset >> 3] |= 1 << (offset & 7);
	} else {
		this._view[offset >> 3] &= ~(1 << (offset & 7));
	}
};

BitView.prototype.getBits = function (offset, bits, signed) {
	var available = (this._view.length * 8 - offset);

	if (bits > available) {
		throw new Error('Cannot get ' + bits + ' bit(s) from offset ' + offset + ', ' + available + ' available');
	}

	// FIXME We could compare bits to offset's alignment
	// and OR on entire byte if appropriate.

	var value = 0;
	for (var i = 0; i < bits; i++) {
		value |= (this._getBit(offset++) << i);
	}

	if (signed) {
		// If we're not working with a full 32 bits, check the
		// imaginary MSB for this bit count and convert to a
		// valid 32-bit signed value if set.
		if (bits !== 32 && value & (1 << (bits - 1))) {
			value |= -1 ^ ((1 << bits) - 1);
		}

		return value;
	}

	return value >>> 0;
};

BitView.prototype.setBits = function (offset, value, bits) {
	var available = (this._view.length * 8 - offset);

	if (bits > available) {
		throw new Error('Cannot set ' + bits + ' bit(s) from offset ' + offset + ', ' + available + ' available');
	}

	for (var i = 0; i < bits; i++) {
		this._setBit(offset++, value & 0x1);
		value = (value >> 1);
	}
};

BitView.prototype.getInt8 = function (offset) {
	return this.getBits(offset, 8, true);
};
BitView.prototype.getUint8 = function (offset) {
	return this.getBits(offset, 8, false);
};
BitView.prototype.getInt16 = function (offset) {
	return this.getBits(offset, 16, true);
};
BitView.prototype.getUint16 = function (offset) {
	return this.getBits(offset, 16, false);
};
BitView.prototype.getInt32 = function (offset) {
	return this.getBits(offset, 32, true);
};
BitView.prototype.getUint32 = function (offset) {
	return this.getBits(offset, 32, false);
};
BitView.prototype.getFloat32 = function (offset) {
	BitView._scratch.setUint32(0, this.getUint32(offset));
	return BitView._scratch.getFloat32(0);
};
BitView.prototype.getFloat64 = function (offset) {
	BitView._scratch.setUint32(0, this.getUint32(offset));
	// DataView offset is in bytes.
	BitView._scratch.setUint32(4, this.getUint32(offset+32));
	return BitView._scratch.getFloat64(0);
};

BitView.prototype.setInt8  =
BitView.prototype.setUint8 = function (offset, value) {
	this.setBits(offset, value, 8);
};
BitView.prototype.setInt16  =
BitView.prototype.setUint16 = function (offset, value) {
	this.setBits(offset, value, 16);
};
BitView.prototype.setInt32  =
BitView.prototype.setUint32 = function (offset, value) {
	this.setBits(offset, value, 32);
};
BitView.prototype.setFloat32 = function (offset, value) {
	BitView._scratch.setFloat32(0, value);
	this.setBits(offset, BitView._scratch.getUint32(0), 32);
};
BitView.prototype.setFloat64 = function (offset, value) {
	BitView._scratch.setFloat64(0, value);
	this.setBits(offset, BitView._scratch.getUint32(0), 32);
	this.setBits(offset+32, BitView._scratch.getUint32(4), 32);
};

/**********************************************************
 *
 * BitStream
 *
 * Small wrapper for a BitView to maintain your position,
 * as well as to handle reading / writing of string data
 * to the underlying buffer.
 *
 **********************************************************/
var BitStream = function (source, byteOffset, byteLength) {
	var isBuffer = source instanceof ArrayBuffer ||
		(typeof(Buffer) !== 'undefined' && source instanceof Buffer);

	if (!(source instanceof BitView) && !isBuffer) {
		throw new Error('Must specify a valid BitView, ArrayBuffer or Buffer');
	}

	if (isBuffer) {
		this._view = new BitView(source, byteOffset, byteLength);
	} else {
		this._view = source;
	}
	this._index = 0;
};

Object.defineProperty(BitStream.prototype, 'byteIndex', {
	// Ceil the returned value, over compensating for the amount of
	// bits written to the stream.
	get: function () { return Math.ceil(this._index / 8); },
	set: function (val) { this._index = val * 8; },
	enumerable: true,
	configurable: true
});

Object.defineProperty(BitStream.prototype, 'buffer', {
	get: function () { return this.view.buffer; },
	enumerable: true,
	configurable: false
});

Object.defineProperty(BitStream.prototype, 'view', {
	get: function () { return this._view; },
	enumerable: true,
	configurable: false
});

var reader = function (name, bits) {
	return function () {
		var val = this._view[name](this._index);
		this._index += bits;
		return val;
	};
};

var writer = function (name, bits) {
	return function (value) {
		this._view[name](this._index, value);
		this._index += bits;
	};
};

BitStream.prototype.readBits = function (bits, signed) {
	var val = this._view.getBits(this._index, bits, signed);
	this._index += bits;
	return val;
};

BitStream.prototype.writeBits = function (value, bits) {
	this._view.setBits(this._index, value, bits);
	this._index += bits;
};

BitStream.prototype.readInt8 = reader('getInt8', 8);
BitStream.prototype.readUint8 = reader('getUint8', 8);
BitStream.prototype.readInt16 = reader('getInt16', 16);
BitStream.prototype.readUint16 = reader('getUint16', 16);
BitStream.prototype.readInt32 = reader('getInt32', 32);
BitStream.prototype.readUint32 = reader('getUint32', 32);
BitStream.prototype.readFloat32 = reader('getFloat32', 32);
BitStream.prototype.readFloat64 = reader('getFloat64', 64);

BitStream.prototype.writeInt8 = writer('setInt8', 8);
BitStream.prototype.writeUint8 = writer('setUint8', 8);
BitStream.prototype.writeInt16 = writer('setInt16', 16);
BitStream.prototype.writeUint16 = writer('setUint16', 16);
BitStream.prototype.writeInt32 = writer('setInt32', 32);
BitStream.prototype.writeUint32 = writer('setUint32', 32);
BitStream.prototype.writeFloat32 = writer('setFloat32', 32);
BitStream.prototype.writeFloat64 = writer('setFloat64', 64);

BitStream.prototype.readASCIIString = function (bytes) {
	var i = 0;
	var chars = [];
	var append = true;

	// Read while we still have space available, or until we've
	// hit the fixed byte length passed in.
	while (!bytes || (bytes && i < bytes)) {
		var c = this.readUint8();

		// Stop appending chars once we hit 0x00
		if (c === 0x00) {
			append = false;

			// If we don't have a fixed length to read, break out now.
			if (!bytes) {
				break;
			}
		}

		if (append) {
			chars.push(c);
		}

		i++;
	}

	// Convert char code array back to string.
	return chars.map(function (x) {
		return String.fromCharCode(x);
	}).join('');
};

BitStream.prototype.writeASCIIString = function(string, bytes) {
	var length = bytes || string.length + 1;  // + 1 for NULL

	for (var i = 0; i < length; i++) {
		this.writeUint8(i < string.length ? string.charCodeAt(i) : 0x00);
	}
}

// AMD / RequireJS
if (typeof define !== 'undefined' && define.amd) {
	define('vendor/bit-buffer',[],function () {
		return {
			BitView: BitView,
			BitStream: BitStream
		};
	});
}
// Node.js
else if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		BitView: BitView,
		BitStream: BitStream
	};
}
// included directly via <script> tag
else {
	root.BitView = BitView;
	root.BitStream = BitStream;
}

}(this));
/*global vec3: true */

define('common/bsp-serializer',['require','vendor/bit-buffer','common/qmath'],function (require) {

var BitStream = require('vendor/bit-buffer').BitStream;
var QMath = require('common/qmath');

var MAX_QPATH = 64;

var LUMP = {
	ENTITIES:     0,
	SHADERS:      1,
	PLANES:       2,
	NODES:        3,
	LEAFS:        4,
	LEAFSURFACES: 5,
	LEAFBRUSHES:  6,
	MODELS:       7,
	BRUSHES:      8,
	BRUSHSIDES:   9,
	DRAWVERTS:    10,
	DRAWINDEXES:  11,
	FOGS:         12,
	SURFACES:     13,
	LIGHTMAPS:    14,
	LIGHTGRID:    15,
	VISIBILITY:   16,
	NUM_LUMPS:    17
};

var MST = {
	BAD:           0,
	PLANAR:        1,
	PATCH:         2,
	TRIANGLE_SOUP: 3,
	FLARE:         4
};

var Bsp = function () {
	this.entities             = {};
	this.shaders              = null;
	this.planes               = null;
	this.nodes                = null;
	this.leafs                = null;
	this.leafSurfaces         = null;
	this.leafBrushes          = null;
	this.bmodels              = null;
	this.brushes              = null;
	this.brushSides           = null;
	this.verts                = null;
	this.indexes              = null;
	this.fogs                 = null;
	this.surfaces             = null;
	this.lightmaps            = null;
	this.lightGridOrigin      = vec3.create();
	this.lightGridSize        = vec3.createFrom(64, 64, 128);
	this.lightGridInverseSize = vec3.create();
	this.lightGridBounds      = vec3.create();
	this.lightGridData        = null;
	this.numClusters          = 0;
	this.clusterBytes         = 0;
	this.vis                  = null;
};

var dheader_t = function () {
	this.ident    = null;                                  // byte * 4 (string)
	this.version  = 0;                                     // int32
	this.lumps    = new Array(LUMP.NUM_LUMPS);             // lumps_t * LUMP.NUM_LUMPS

	for (var i = 0; i < LUMP.NUM_LUMPS; i++) {
		this.lumps[i] = new lumps_t();
	}
};

var lumps_t = function () {
	this.fileofs  = 0;                                     // int32
	this.filelen = 0;                                      // int32
};

var dmodel_t = function () {
	this.bounds = [                                        // float32 * 6
		vec3.create(),
		vec3.create()
	];
	this.firstSurface = 0;                                 // int32
	this.numSurfaces  = 0;                                 // int32
	this.firstBrush   = 0;                                 // int32
	this.numBrushes   = 0;                                 // int32
};
dmodel_t.size = 40;

var dshader_t = function () {
	this.shaderName   = null;                              // byte * MAX_QPATH (string)
	this.surfaceFlags = 0;                                 // int32
	this.contents     = 0;                                 // int32
};
dshader_t.size = 72;

var dplane_t = function () {
	this.normal = vec3.create();                           // float32 * 3
	this.dist   = 0;                                       // float32
};
dplane_t.size = 16;

var dnode_t = function () {
	this.planeNum    = 0;                                  // int32
	this.childrenNum = [0, 0];                             // int32 * 2
	this.mins        = vec3.create();                      // int32 * 3
	this.maxs        = vec3.create();                      // int32 * 3
};
dnode_t.size = 36;

var dleaf_t = function () {
	this.cluster          = 0;                             // int32
	this.area             = 0;                             // int32
	this.mins             = vec3.create();                 // int32 * 3
	this.maxs             = vec3.create();                 // int32 * 3
	this.firstLeafSurface = 0;                             // int32
	this.numLeafSurfaces  = 0;                             // int32
	this.firstLeafBrush   = 0;                             // int32
	this.numLeafBrushes   = 0;                             // int32
};
dleaf_t.size = 48;

var dbrushside_t = function () {
	this.planeNum  = 0;                                    // int32
	this.shaderNum = 0;                                    // int32
};
dbrushside_t.size = 8;

var dbrush_t = function () {
	this.side      = 0;                                    // int32
	this.numSides  = 0;                                    // int32
	this.shaderNum = 0;                                    // int32
};
dbrush_t.size = 12;

var dfog_t = function () {
	this.shaderName  = null;                               // byte * MAX_QPATH (string)
	this.brushNum    = 0;                                  // int32
	this.visibleSide = 0;                                  // int32
};
dfog_t.size = 72;

var drawVert_t = function () {
	this.pos      = vec3.create();                         // float32 * 3
	this.texCoord = [0, 0];                                // float32 * 2
	this.lmCoord  = [0, 0];                                // float32 * 2
	this.normal   = vec3.create();                         // float32 * 3
	this.color    = [0, 0, 0, 0];                          // uint8 * 4
};
drawVert_t.size = 44;

var dsurface_t = function () {
	this.shaderNum      = 0;                               // int32
	this.fogNum         = 0;                               // int32
	this.surfaceType    = 0;                               // int32
	this.vertex         = 0;                               // int32
	this.vertCount      = 0;                               // int32
	this.meshVert       = 0;                               // int32
	this.meshVertCount  = 0;                               // int32
	this.lightmapNum    = 0;                               // int32
	this.lightmapX      = 0;
	this.lightmapY      = 0;
	this.lightmapWidth  = 0;
	this.lightmapHeight = 0;
	this.lightmapOrigin = vec3.create();
	this.lightmapVecs   = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.patchWidth     = 0;                               // int32
	this.patchHeight    = 0;                               // int32
};
dsurface_t.size = 104;

/**
 * LoadBsp
 */
function LoadBsp(data) {
	var bb = new BitStream(data);

	// Parse the header.
	var header = new dheader_t();
	header.ident = bb.readASCIIString(4);
	header.version = bb.readInt32();
	for (var i = 0; i < LUMP.NUM_LUMPS; i++) {
		header.lumps[i].fileofs = bb.readInt32();
		header.lumps[i].filelen = bb.readInt32();
	}

	if (header.ident !== 'IBSP' && header.version !== 46) {
		throw new Error('Invalid BSP version: ' + header.version);
	}

	var bsp = new Bsp();

	LoadEntities(bsp, data, header.lumps[LUMP.ENTITIES]);
	LoadShaders(bsp, data, header.lumps[LUMP.SHADERS]);
	LoadPlanes(bsp, data, header.lumps[LUMP.PLANES]);
	LoadNodes(bsp, data, header.lumps[LUMP.NODES]);
	LoadLeafs(bsp, data, header.lumps[LUMP.LEAFS]);
	LoadLeafSurfaces(bsp, data, header.lumps[LUMP.LEAFSURFACES]);
	LoadLeafBrushes(bsp, data, header.lumps[LUMP.LEAFBRUSHES]);
	LoadBrushModels(bsp, data, header.lumps[LUMP.MODELS]);
	LoadBrushes(bsp, data, header.lumps[LUMP.BRUSHES]);
	LoadBrushSides(bsp, data, header.lumps[LUMP.BRUSHSIDES]);
	LoadVerts(bsp, data, header.lumps[LUMP.DRAWVERTS]);
	LoadIndexes(bsp, data, header.lumps[LUMP.DRAWINDEXES]);
	LoadFogs(bsp, data, header.lumps[LUMP.FOGS]);
	LoadSurfaces(bsp, data, header.lumps[LUMP.SURFACES]);
	LoadLightmaps(bsp, data, header.lumps[LUMP.LIGHTMAPS]);
	LoadLightGrid(bsp, data, header.lumps[LUMP.LIGHTGRID]);
	LoadVisibility(bsp, data, header.lumps[LUMP.VISIBILITY]);

	return bsp;
}

/**
 * LoadEntities
 */
function LoadEntities(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var entityStr = bb.readASCIIString(lump.filelen);

	var entities = bsp.entities = [];

	entityStr.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
		var entity = {
			classname: 'unknown'
		};

		entitySrc.replace(/"(.+)" "(.+)"$/mg, function($0, key, value) {
			entity[key] = value;
		});

		entities.push(entity);
	});

	// Parse worldspawn.
	var worldspawn = entities[0];
	if (worldspawn.classname !== 'worldspawn') {
		throw new Error('worldspawn isn\'t the first entity');
	}

	// Check for a different grid size
	if (worldspawn.gridsize) {
		var split = worldspawn.gridsize.split(' ');
		bsp.lightGridSize[0] = parseFloat(split[0]);
		bsp.lightGridSize[1] = parseFloat(split[1]);
		bsp.lightGridSize[2] = parseFloat(split[2]);
	}
}

/**
 * LoadShaders
 */
function LoadShaders(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var shaders = bsp.shaders = new Array(lump.filelen / dshader_t.size);

	for (var i = 0; i < shaders.length; i++) {
		var shader = shaders[i] = new dshader_t();

		shader.shaderName = bb.readASCIIString(MAX_QPATH);
		shader.surfaceFlags = bb.readInt32();
		shader.contents = bb.readInt32();
	}
}

/**
 * LoadPlanes
 */
function LoadPlanes(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var planes = bsp.planes = new Array(lump.filelen / dplane_t.size);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i] = new QMath.Plane();

		plane.normal[0] = bb.readFloat32();
		plane.normal[1] = bb.readFloat32();
		plane.normal[2] = bb.readFloat32();
		plane.dist = bb.readFloat32();
		plane.signbits = QMath.GetPlaneSignbits(plane.normal);
		plane.type = QMath.PlaneTypeForNormal(plane.normal);
	}
}

/**
 * LoadNodes
 */
function LoadNodes(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var nodes = bsp.nodes = new Array(lump.filelen / dnode_t.size);

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i] = new dnode_t();

		node.planeNum = bb.readInt32();
		node.childrenNum[0] = bb.readInt32();
		node.childrenNum[1] = bb.readInt32();
		node.mins[0] = bb.readInt32();
		node.mins[1] = bb.readInt32();
		node.mins[2] = bb.readInt32();
		node.maxs[0] = bb.readInt32();
		node.maxs[1] = bb.readInt32();
		node.maxs[2] = bb.readInt32();
	}
}

/**
 * LoadLeafs
 */
function LoadLeafs(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var leafs = bsp.leafs = new Array(lump.filelen / dleaf_t.size);

	for (var i = 0; i < leafs.length; i++) {
		var leaf = leafs[i] = new dleaf_t();

		leaf.cluster = bb.readInt32();
		leaf.area = bb.readInt32();
		leaf.mins[0] = bb.readInt32();
		leaf.mins[1] = bb.readInt32();
		leaf.mins[2] = bb.readInt32();
		leaf.maxs[0] = bb.readInt32();
		leaf.maxs[1] = bb.readInt32();
		leaf.maxs[2] = bb.readInt32();
		leaf.firstLeafSurface = bb.readInt32();
		leaf.numLeafSurfaces = bb.readInt32();
		leaf.firstLeafBrush = bb.readInt32();
		leaf.numLeafBrushes = bb.readInt32();
	}
}

/**
 * LoadLeafSurfaces
 */
function LoadLeafSurfaces(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var leafSurfaces = bsp.leafSurfaces = new Array(lump.filelen / 4);

	for (var i = 0; i < leafSurfaces.length; i++) {
		leafSurfaces[i] = bb.readInt32();
	}
}

/**
 * LoadLeafBrushes
 */
function LoadLeafBrushes(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var leafBrushes = bsp.leafBrushes = new Array(lump.filelen / 4);

	for (var i = 0; i < leafBrushes.length; i++) {
		leafBrushes[i] = bb.readInt32();
	}
}

/**
 * LoadBrushModels
 */
function LoadBrushModels(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var models = bsp.bmodels = new Array(lump.filelen / dmodel_t.size);

	for (var i = 0; i < models.length; i++) {
		var model = models[i] = new dmodel_t();

		model.bounds[0][0] = bb.readFloat32();
		model.bounds[0][1] = bb.readFloat32();
		model.bounds[0][2] = bb.readFloat32();

		model.bounds[1][0] = bb.readFloat32();
		model.bounds[1][1] = bb.readFloat32();
		model.bounds[1][2] = bb.readFloat32();

		model.firstSurface = bb.readInt32();
		model.numSurfaces = bb.readInt32();
		model.firstBrush = bb.readInt32();
		model.numBrushes = bb.readInt32();
	}
}

/**
 * LoadBrushes
 */
function LoadBrushes(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var brushes = bsp.brushes = new Array(lump.filelen / dbrush_t.size);

	for (var i = 0; i < brushes.length; i++) {
		var brush = brushes[i] = new dbrush_t();

		brush.side = bb.readInt32();
		brush.numSides = bb.readInt32();
		brush.shaderNum = bb.readInt32();
	}
}

/**
 * LoadBrushSides
 */
function LoadBrushSides(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var brushSides = bsp.brushSides = new Array(lump.filelen / dbrushside_t.size);

	for (var i = 0; i < brushSides.length; i++) {
		var side = brushSides[i] = new dbrushside_t();

		side.planeNum = bb.readInt32();
		side.shaderNum = bb.readInt32();
	}
}

/**
 * LoadVerts
 */
function LoadVerts(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var verts = bsp.verts = new Array(lump.filelen / drawVert_t.size);

	for (var i = 0; i < verts.length; i++) {
		var vert = verts[i] = new drawVert_t();

		vert.pos[0] = bb.readFloat32();
		vert.pos[1] = bb.readFloat32();
		vert.pos[2] = bb.readFloat32();
		vert.texCoord[0] = bb.readFloat32();
		vert.texCoord[1] = bb.readFloat32();
		vert.lmCoord[0] = bb.readFloat32();
		vert.lmCoord[1] = bb.readFloat32();
		vert.normal[0] = bb.readFloat32();
		vert.normal[1] = bb.readFloat32();
		vert.normal[2] = bb.readFloat32();
		vert.color[0] = bb.readUint8();
		vert.color[1] = bb.readUint8();
		vert.color[2] = bb.readUint8();
		vert.color[3] = bb.readUint8();
	}
}

/**
 * LoadIndexes
 */
function LoadIndexes(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var indexes = bsp.indexes = new Array(lump.filelen / 4);

	for (var i = 0; i < indexes.length; i++) {
		indexes[i] = bb.readInt32();
	}
}

/**
 * LoadFogs
 */
function LoadFogs(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var fogs = bsp.fogs = new Array(lump.filelen / dfog_t.size);

	for (var i = 0; i < fogs.length; i++) {
		var fog = fogs[i] = new dfog_t();

		fog.shaderName = bb.readASCIIString(MAX_QPATH);
		fog.brushNum = bb.readInt32();
		fog.visibleSide = bb.readInt32();
	}
}

/**
 * LoadSurfaces
 */
function LoadSurfaces(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	var surfaces = bsp.surfaces = new Array(lump.filelen / dsurface_t.size);

	for (var i = 0; i < surfaces.length; i++) {
		var surface = surfaces[i] = new dsurface_t();

		surface.shaderNum = bb.readInt32();
		surface.fogNum = bb.readInt32();
		surface.surfaceType = bb.readInt32();
		surface.vertex = bb.readInt32();
		surface.vertCount = bb.readInt32();
		surface.meshVert = bb.readInt32();
		surface.meshVertCount = bb.readInt32();
		surface.lightmapNum = bb.readInt32();
		surface.lightmapX = bb.readInt32();
		surface.lightmapY = bb.readInt32();
		surface.lightmapWidth = bb.readInt32();
		surface.lightmapHeight = bb.readInt32();
		surface.lightmapOrigin[0] = bb.readFloat32();
		surface.lightmapOrigin[1] = bb.readFloat32();
		surface.lightmapOrigin[2] = bb.readFloat32();
		surface.lightmapVecs[0][0] = bb.readFloat32();
		surface.lightmapVecs[0][1] = bb.readFloat32();
		surface.lightmapVecs[0][2] = bb.readFloat32();
		surface.lightmapVecs[1][0] = bb.readFloat32();
		surface.lightmapVecs[1][1] = bb.readFloat32();
		surface.lightmapVecs[1][2] = bb.readFloat32();
		surface.lightmapVecs[2][0] = bb.readFloat32();
		surface.lightmapVecs[2][1] = bb.readFloat32();
		surface.lightmapVecs[2][2] = bb.readFloat32();
		surface.patchWidth = bb.readInt32();
		surface.patchHeight = bb.readInt32();
	}
}

/**
 * LoadLightmaps
 */
function LoadLightmaps(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	bsp.lightmaps = new Uint8Array(lump.filelen);

	for (var i = 0; i < lump.filelen; i++) {
		bsp.lightmaps[i] = bb.readUint8();
	}
}

/**
 * LoadLightGrid
 */
function LoadLightGrid(bsp, buffer, lump) {
	bsp.lightGridInverseSize[0] = 1 / bsp.lightGridSize[0];
	bsp.lightGridInverseSize[1] = 1 / bsp.lightGridSize[1];
	bsp.lightGridInverseSize[2] = 1 / bsp.lightGridSize[2];

	var wMins = bsp.bmodels[0].bounds[0];
	var wMaxs = bsp.bmodels[0].bounds[1];

	for (var i = 0; i < 3; i++) {
		bsp.lightGridOrigin[i] = bsp.lightGridSize[i] * Math.ceil(wMins[i] / bsp.lightGridSize[i]);
		var t = bsp.lightGridSize[i] * Math.floor(wMaxs[i] / bsp.lightGridSize[i]);
		bsp.lightGridBounds[i] = (t - bsp.lightGridOrigin[i])/bsp.lightGridSize[i] + 1;
	}

	var numGridPoints = bsp.lightGridBounds[0] * bsp.lightGridBounds[1] * bsp.lightGridBounds[2];

	if (lump.filelen !== numGridPoints * 8) {
		// log('WARNING: light grid mismatch', lump.filelen, numGridPoints * 8);
		bsp.lightGridData = null;
		return;
	}

	// Read the actual light grid data.
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	bsp.lightGridData = new Uint8Array(lump.filelen);
	for (var i = 0; i < lump.filelen; i++) {
		bsp.lightGridData[i] = bb.readUint8();
	}
}

/**
 * LoadVisibility
 */
function LoadVisibility(bsp, buffer, lump) {
	var bb = new BitStream(buffer);
	bb.byteIndex = lump.fileofs;

	bsp.numClusters = bb.readInt32();
	bsp.clusterBytes = bb.readInt32();

	var size = bsp.numClusters * bsp.clusterBytes;
	bsp.vis = new Uint8Array(size);

	for (var i = 0; i < size; i++) {
		bsp.vis[i] = bb.readUint8();
	}
}

return {
	MST:          MST,

	Bsp:          Bsp,
	dmodel_t:     dmodel_t,
	dshader_t:    dshader_t,
	dplane_t:     dplane_t,
	dnode_t:      dnode_t,
	dleaf_t:      dleaf_t,
	dbrushside_t: dbrushside_t,
	dbrush_t:     dbrush_t,
	dfog_t:       dfog_t,
	drawVert_t:   drawVert_t,
	dsurface_t:   dsurface_t,

	deserialize:  LoadBsp
};

});
define('common/cvar', [], function () {

var cvars = {};
var modifiedFlags = 0;

var FLAGS = {
	ROM:          1,                                         // display only, cannot be set by user at all
	ARCHIVE:      2,                                         // save to config file
	CHEAT:        4,                                         // save to config file
	USERINFO:     8,                                         // sent to server on connect or change
	SYSTEMINFO:   16,                                        // these cvars will be duplicated on all clients
	SERVERINFO:   32,                                        // sent in response to front end requests
	ARENAINFO:    64,
	USER_CREATED: 128
};

/******************************************************
 *
 * Core CVAR class
 *
 ******************************************************/
function asNumber(val, defaultValue) {
	val = typeof(val) === 'number' ? val : parseFloat(val);
	if (isNaN(val)) {
		return defaultValue;
	}
	return val;
}

function asString(val, defaultValue) {
	val = val.toString();
	if (val === undefined || val  === null) {
		return defaultValue;
	}
	return val;
}

function asDefaultType(val, defaultValue) {
	// Treat as string if no default type (e.g. user-created cvars).
	if (defaultValue === undefined) {
		return val ? val.toString() : val;
	}

	if (typeof(defaultValue) === 'number') {
		return asNumber(val, defaultValue);
	}

	return asString(val, defaultValue);
}

var Cvar = function (defaultValue, flags, latched) {
	this._defaultValue = defaultValue;
	this._currentValue = this._defaultValue;
	this._latchedValue = this._defaultValue;
	this._flags = flags === undefined ? 0 : flags;

	// Latched cvars will only update their values on subsequent adds.
	this._latched = latched;
};

Cvar.prototype.at = function (index) {
	return new CvarCursor(this, index);
};

Cvar.prototype.defaultValue = function () {
	return this._defaultValue;
};

Cvar.prototype.flags = function () {
	return this._flags;
};

Cvar.prototype.modified = function () {
	if (this._latched && this._modified) {
		return true;
	} else if (this._modified) {
		this._modified = false;
		return true;
	}

	return false;
};

Cvar.prototype.get = function (raw) {
	var val = this._latched ? this._latchedValue : this._currentValue;

	if (raw) {
		return val;
	}

	return asDefaultType(val, this._defaultValue);
};

Cvar.prototype.set = function (val) {
	this._currentValue = val;

	this._modified = true;

	modifiedFlags |= this._flags;
};

// Helper to support getting multi-value cvars.
var CvarCursor = function (cvar, index) {
	this._cvar = cvar;
	this._index = index;
};

CvarCursor.prototype.get = function () {
	var str = this._cvar.get(true).toString();
	var split = str.split(',');

	for (var i = 0; i < split.length; i++) {
		split[i] = split[i].replace(/^\s*/, '').replace(/\s*$/, '');
	}

	// Use the last value if one doesn't exist for the specified index.
	var val = split[this._index];
	if (val === undefined) {
		val = split[split.length - 1];
	}

	return asDefaultType(val, this._cvar.defaultValue());
};

/******************************************************
 *
 *
 *
 ******************************************************/
function AddCvar(name, defaultValue, flags, latched) {
	var cvar = GetCvar(name);

	if (cvar) {
		// If the user already created a cvar, update its info.
		if (defaultValue !== undefined) {
			cvar._defaultValue = defaultValue;
		}
		if (flags !== undefined) {
			cvar._flags = flags;
		}
		if (latched !== undefined) {
			cvar._latched = latched;
		}

		// This code path is possibly being hit because a module (e.g. cgame or game)
		// is being reinitialized, so go ahead and relatch.
		cvar._latchedValue = cvar._currentValue;
		cvar._modified = false;

		return cvar;
	}

	// Register the new cvar.
	cvar = cvars[name] = new Cvar(defaultValue, flags, latched);

	return cvar;
}

function GetCvar(name) {
	return cvars[name];
}

function GetCvarJSON(flag) {
	var data = {};

	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		var cvar = cvars[name];

		if (!(cvar._flags & flag)) {
			continue;
		}

		data[name] = cvar.get();
	}

	return data;
}

function Modified(flag) {
	return (modifiedFlags & flag);
}

function ClearModified(flag) {
	modifiedFlags &= ~flag;
}

var exports = {
	FLAGS:         FLAGS,

	AddCvar:       AddCvar,
	GetCvar:       GetCvar,

	GetCvarJSON:   GetCvarJSON,

	Modified:      Modified,
	ClearModified: ClearModified
};

return exports;

});

define('common/surfaceflags',['require'],function (require) {
	var FLAGS = {
		NODAMAGE:    0x1,                                      // never give falling damage
		SLICK:       0x2,                                      // effects game physics
		SKY:         0x4,                                      // lighting from environment map
		LADDER:      0x8,
		NOIMPACT:    0x10,                                     // don't make missile explosions
		NOMARKS:     0x20,                                     // don't leave missile marks
		FLESH:       0x40,                                     // make flesh sounds and effects
		NODRAW:      0x80,                                     // don't generate a drawsurface at all
		HINT:        0x100,                                    // make a primary bsp splitter
		SKIP:        0x200,                                    // completely ignore, allowing non-closed brushes
		NOLIGHTMAP:  0x400,                                    // surface doesn't need a lightmap
		POINTLIGHT:  0x800,                                    // generate lighting info at vertexes
		METALSTEPS:  0x1000,                                   // clanking footsteps
		NOSTEPS:     0x2000,                                   // no footstep sounds
		NONSOLID:    0x4000,                                   // don't collide against curves with this set
		LIGHTFILTER: 0x8000,                                   // act as a light filter during q3map -light
		ALPHASHADOW: 0x10000,                                  // do per-pixel light shadow casting in q3map
		NODLIGHT:    0x20000,                                  // don't dlight even if solid (solid lava, skies)
		DUST:        0x40000                                   // leave a dust trail when walking on this surface
	};

	var CONTENTS = {
		SOLID:         1,                                      // an eye is never valid in a solid
		LAVA:          8,
		SLIME:         16,
		WATER:         32,
		FOG:           64,

		NOTTEAM1:      0x0080,
		NOTTEAM2:      0x0100,
		NOBOTCLIP:     0x0200,

		AREAPORTAL:    0x8000,

		PLAYERCLIP:    0x10000,
		MONSTERCLIP:   0x20000,
		TELEPORTER:    0x40000,
		JUMPPAD:       0x80000,
		CLUSTERPORTAL: 0x100000,
		DONOTENTER:    0x200000,
		BOTCLIP:       0x400000,
		MOVER:         0x800000,

		ORIGIN:        0x1000000,                              // removed before bsping an entity

		BODY:          0x2000000,                              // should never be on a brush, only in game
		CORPSE:        0x4000000,
		DETAIL:        0x8000000,                              // brushes not used for the bsp
		STRUCTURAL:    0x10000000,                             // brushes used for the bsp
		TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
		TRIGGER:       0x40000000,
		NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
	};

	return {
		FLAGS:    FLAGS,
		CONTENTS: CONTENTS
	};
});
/*global vec3: true, vec4: true, mat4: true */

define('clipmap/cm',['require','vendor/gl-matrix','common/bsp-serializer','common/qmath','common/qshared','common/surfaceflags'],function (require) {
	var glmatrix      = require('vendor/gl-matrix');
	var BspSerializer = require('common/bsp-serializer');
	var QMath         = require('common/qmath');
	var QS            = require('common/qshared');
	var SURF          = require('common/surfaceflags');

	function ClipMap(imp) {
		var log = imp.log;
		var error = imp.error;

		var MAX_SUBMODELS        = 256;
var BOX_MODEL_HANDLE     = 255;

// Keep 1/8 unit away to keep the position valid before network snapping
// and to avoid various numeric issues.
var SURFACE_CLIP_EPSILON = 0.125;

var ClipWorld = function () {
	this.shaders      = null;
	this.brushes      = null;
	this.brushSides   = null;
	this.models       = null;
	this.leafs        = null;
	this.leafBrushes  = null;
	this.leafSurfaces = null;
	this.nodes        = null;
	this.planes       = null;
	this.shaders      = null;
	this.surfaces     = null;                              // only patches

	this.visibility   = null;
	this.numClusters  = 0;
	this.clusterBytes = 0;

	this.areas        = null;
	this.areaPortals  = null;                              // [ numAreas*numAreas ] reference counts

	this.floodValid   = 0;
};

/**********************************************************
 *
 * Clipmap specific BSP structs
 *
 **********************************************************/
var ClipModel = function () {
	this.mins = vec3.create();
	this.maxs = vec3.create();
	this.leaf = new BspSerializer.dleaf_t();               // submodels don't reference the main tree
};

var ClipBrushSide = function () {
	this.plane        = null;
	this.surfaceFlags = 0;
};

var ClipBrush = function () {
	this.shader     = 0;                                    // the shader that determined the contents
	this.contents   = 0;
	this.bounds     = [vec3.create(), vec3.create()];
	this.firstSide  = 0;
	this.numSides   = 0;
	this.checkcount = 0;                                   // to avoid repeated testings
};

var ClipArea = function () {
	this.floodnum   = 0;
	this.floodValid = 0;
};

/**********************************************************
 *
 * Tracing
 *
 **********************************************************/
var MAX_POSITION_LEAFS = 1024;

var LeafList = function () {
	this.list     = null;
	this.count    = 0;
	this.maxCount = 0;
	this.lastLeaf = 0;                                     // for overflows where each leaf can't be stored individually
};

var TraceWork = function () {
	this.trace     = new QS.TraceResults();
	this.start     = vec3.create();
	this.end       = vec3.create();
	this.size      = [                                     // size of the box being swept through the model
		vec3.create(),
		vec3.create()
	];
	this.offsets   = [                                     // [signbits][x] = either size[0][x] or size[1][x]
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.extents   = vec3.create();                        // greatest of abs(size[0]) and abs(size[1])
	this.bounds    = [                                     // enclosing box of start and end surrounding by size
		vec3.create(),
		vec3.create()
	];
	this.contents  = 0;                                    // ored contents of the model tracing through
	this.isPoint   = false;                                // optimized case
};

TraceWork.prototype.reset = function () {
	this.trace.reset();

	this.start[0] = this.start[1] = this.start[2] = 0.0;
	this.end[0] = this.end[1] = this.end[2] = 0.0;

	for (var i = 0; i < this.size.length; i++) {
		this.size[i][0] = this.size[i][1] = this.size[i][2] = 0.0;
	}

	for (var i = 0; i < this.offsets.length; i++) {
		this.offsets[i][0] = this.offsets[i][1] = this.offsets[i][2] = 0.0;
	}

	this.extents[0] = this.extents[1] = this.extents[2] = 0.0;

	for (var i = 0; i < this.bounds.length; i++) {
		this.bounds[i][0] = this.bounds[i][1] = this.bounds[i][2] = 0.0;
	}

	this.contents = 0;
	this.isPoint = false;
};


/**********************************************************
 *
 * Patch clipping
 *
 **********************************************************/
var MAX_FACETS         = 1024;
var MAX_PATCH_VERTS    = 1024;
var MAX_PATCH_PLANES   = 2048;
var MAX_GRID_SIZE      = 129;
var SUBDIVIDE_DISTANCE = 16;                               // never more than this units away from curve
var WRAP_POINT_EPSILON = 0.1;

var pplane_t = function () {
	this.plane    = vec4.create();
	this.signbits = 0;                                     // signx + (signy<<1) + (signz<<2), used as lookup during collision
};

var pfacet_t = function () {
	this.surfacePlane = 0;
	this.numBorders   = 0;                                 // 3 or four + 6 axial bevels + 4 or 3 * 4 edge bevels
	this.borderPlanes = [
		0, 0, 0, 0,
		0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
	];
	this.borderInward = [
		0, 0, 0, 0,
		0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
	];
	this.borderNoAdjust = [
		false, false, false, false,
		false, false, false, false, false, false,
		false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false
	];
};

var pcollide_t = function () {
	this.bounds = [
		vec3.create(),
		vec3.create()
	];
	this.planes = [];                                      // surface planes plus edge planes
	this.facets = [];
};

var cgrid_t = function () {
	this.width      = 0;
	this.height     = 0;
	this.wrapWidth  = 0;
	this.wrapHeight = 0;
	this.points     = new Array(MAX_GRID_SIZE);

	for (var i = 0; i < MAX_GRID_SIZE; i++) {
		this.points[i] = new Array(MAX_GRID_SIZE);

		for (var j = 0; j < MAX_GRID_SIZE; j++) {
			this.points[i][j] = vec3.create();
		}
	}
};

var cpatch_t = function () {
	this.checkcount   = 0;                                 // to avoid repeated testings
	this.surfaceFlags = 0;
	this.contents     = 0;
	this.pc           = null;
};
		// int	c_totalPatchBlocks;
// int	c_totalPatchSurfaces;
// int	c_totalPatchEdges;

// static const patchCollide_t	*debugPatchCollide;
// static const facet_t		*debugFacet;
// static qboolean		debugBlock;
// static vec3_t		debugBlockPoints[4];

var EN_TOP = 0;
var EN_RIGHT = 1;
var EN_BOTTOM = 2;
var EN_LEFT = 3;

var debugPatchCollides = [];

// /*
// =================
// CM_ClearLevelPatches
// =================
// */
// void CM_ClearLevelPatches( void ) {
// 	debugPatchCollide = NULL;
// 	debugFacet = NULL;
// }

/**********************************************************
 *
 * Grid subdivision
 *
 **********************************************************/

/**
 * GeneratePatchCollide
 *
 * Creates an internal structure that will be used to perform
 * collision detection with a patch mesh.
 *
 * Points is packed as concatenated rows.
 */
function GeneratePatchCollide(width, height, points) {
	if (width <= 2 || height <= 2 || !points) {
		error('GeneratePatchFacets: bad parameters');
	}

	if (!(width & 1) || !(height & 1)) {
		error('GeneratePatchFacets: even sizes are invalid for quadratic meshes');
	}

	if (width > MAX_GRID_SIZE || height > MAX_GRID_SIZE) {
		error('GeneratePatchFacets: source is > MAX_GRID_SIZE');
	}

	// Build a grid.
	var grid = new cgrid_t();
	grid.width = width;
	grid.height = height;
	grid.wrapWidth = false;
	grid.wrapHeight = false;
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			vec3.set(points[j*width+i], grid.points[i][j]);
		}
	}

	// Subdivide the grid.
	SetGridWrapWidth(grid);
	SubdivideGridColumns(grid);
	RemoveDegenerateColumns(grid);

	TransposeGrid(grid);

	SetGridWrapWidth(grid);
	SubdivideGridColumns(grid);
	RemoveDegenerateColumns(grid);

	// We now have a grid of points exactly on the curve.
	// The aproximate surface defined by these points will be
	// collided against.
	var pc = new pcollide_t();

	QMath.ClearBounds(pc.bounds[0], pc.bounds[1]);

	for (var i = 0; i < grid.width; i++) {
		for (var j = 0; j < grid.height; j++) {
			QMath.AddPointToBounds(grid.points[i][j], pc.bounds[0], pc.bounds[1]);
		}
	}

	//c_totalPatchBlocks += (grid.width - 1) * (grid.height - 1);

	// Generate a bsp tree for the surface.
	PatchCollideFromGrid(grid, pc);

	// Expand by one unit for epsilon purposes.
	pc.bounds[0][0] -= 1;
	pc.bounds[0][1] -= 1;
	pc.bounds[0][2] -= 1;

	pc.bounds[1][0] += 1;
	pc.bounds[1][1] += 1;
	pc.bounds[1][2] += 1;

	debugPatchCollides.push(pc);

	return pc;
}

/**
 * SetGridWrapWidth
 *
 * If the left and right columns are exactly equal, set wrapWidth true
 */
function SetGridWrapWidth(grid) {
	var i, j;

	for (i = 0; i < grid.height; i++) {
		for (j = 0; j < 3; j++) {
			var d = grid.points[0][i][j] - grid.points[grid.width-1][i][j];

			if (d < -WRAP_POINT_EPSILON || d > WRAP_POINT_EPSILON) {
				break;
			}
		}

		if (j != 3) {
			break;
		}
	}

	if (i === grid.height) {
		grid.wrapWidth = true;
	} else {
		grid.wrapWidth = false;
	}
}

/**
 * SubdivideGridColumns
 *
 * Adds columns as necessary to the grid until
 * all the aproximating points are within SUBDIVIDE_DISTANCE
 * from the true curve
 */
function SubdivideGridColumns(grid) {
	var i, j, k;
	var prev = vec3.create();
	var mid = vec3.create();
	var next = vec3.create();

	for (i = 0; i < grid.width - 2;) {
		// grid.points[i][x] is an interpolating control point
		// grid.points[i+1][x] is an aproximating control point
		// grid.points[i+2][x] is an interpolating control point

		//
		// First see if we can collapse the aproximating column away.
		//
		for (j = 0; j < grid.height; j++) {
			if (NeedsSubdivision(grid.points[i][j], grid.points[i+1][j], grid.points[i+2][j])) {
				break;
			}
		}

		if (j === grid.height) {
			// All of the points were close enough to the linear midpoints
			// that we can collapse the entire column away.
			for (j = 0; j < grid.height; j++) {
				// Remove the column.
				for (k = i + 2; k < grid.width; k++) {
					vec3.set(grid.points[k][j], grid.points[k-1][j]);
				}
			}

			grid.width--;

			// Go to the next curve segment.
			i++;
			continue;
		}

		//
		// We need to subdivide the curve.
		//
		for (j = 0; j < grid.height; j++) {
			// Save the control points now.
			vec3.set(grid.points[i][j], prev);
			vec3.set(grid.points[i+1][j], mid);
			vec3.set(grid.points[i+2][j], next);

			// Make room for two additional columns in the grid.
			// Columns i+1 will be replaced, column i+2 will become i+4.
			// i+1, i+2, and i+3 will be generated.
			for (k = grid.width - 1; k > i + 1; k--) {
				vec3.set(grid.points[k][j], grid.points[k+2][j]);
			}

			// Generate the subdivided points.
			Subdivide(prev, mid, next, grid.points[i+1][j], grid.points[i+2][j], grid.points[i+3][j]);
		}

		grid.width += 2;

		// The new aproximating point at i+1 may need to be removed
		// or subdivided farther, so don't advance i.
	}
}

/**
 * NeedsSubdivision
 *
 * Returns true if the given quadratic curve is not flat enough for our
 * collision detection purposes
 */
function NeedsSubdivision(a, b, c) {
	var cmid = vec3.create();
	var lmid = vec3.create();
	var delta = vec3.create();

	// Calculate the linear midpoint.
	for (var i = 0; i < 3; i++) {
		lmid[i] = 0.5 * (a[i] + c[i]);
	}

	// Calculate the exact curve midpoint.
	for (var i = 0; i < 3; i++) {
		cmid[i] = 0.5 * (0.5 * (a[i] + b[i]) + 0.5 * (b[i] + c[i]));
	}

	// See if the curve is far enough away from the linear mid.
	vec3.subtract(cmid, lmid, delta);
	var dist = vec3.length(delta);

	return dist >= SUBDIVIDE_DISTANCE;
}

/**
 * Subdivide
 *
 * a, b, and c are control points.
 * The subdivided sequence will be: a, out1, out2, out3, c
 */
function Subdivide(a, b, c, out1, out2, out3) {
	for (var i = 0; i < 3; i++) {
		out1[i] = 0.5 * (a[i] + b[i]);
		out3[i] = 0.5 * (b[i] + c[i]);
		out2[i] = 0.5 * (out1[i] + out3[i]);
	}
}

/**
 * RemoveDegenerateColumns
 *
 * If there are any identical columns, remove them.
 */
function RemoveDegenerateColumns(grid) {
	var i, j, k;

	for (i = 0; i < grid.width - 1; i++) {
		for (j = 0; j < grid.height; j++) {
			if (!ComparePoints(grid.points[i][j], grid.points[i+1][j])) {
				break;
			}
		}

		if (j !== grid.height) {
			continue;  // not degenerate
		}

		for (j = 0; j < grid.height; j++) {
			// Remove the column.
			for (k = i + 2; k < grid.width; k++) {
				vec3.set(grid.points[k][j], grid.points[k-1][j]);
			}
		}

		grid.width--;

		// Check against the next column.
		i--;
	}
}

/**
 * ComparePoints
 */
var POINT_EPSILON = 0.1;

function ComparePoints(a, b) {
	var d = a[0] - b[0];
	if (d < -POINT_EPSILON || d > POINT_EPSILON) {
		return false;
	}
	d = a[1] - b[1];
	if (d < -POINT_EPSILON || d > POINT_EPSILON) {
		return false;
	}
	d = a[2] - b[2];
	if (d < -POINT_EPSILON || d > POINT_EPSILON) {
		return false;
	}
	return true;
}

/**
 * TransposeGrid
 *
 * Swaps the rows and columns in place.
 */
function TransposeGrid(grid) {
	var i, j, l;
	var temp = vec3.create();
	var tempWrap = false;

	if (grid.width > grid.height) {
		for (i = 0; i < grid.height; i++) {
			for (j = i + 1; j < grid.width; j++) {
				if (j < grid.height) {
					// swap the value
					vec3.set(grid.points[i][j], temp);
					vec3.set(grid.points[j][i], grid.points[i][j]);
					vec3.set(temp, grid.points[j][i]);
				} else {
					// just copy
					vec3.set(grid.points[j][i], grid.points[i][j]);
				}
			}
		}
	} else {
		for (i = 0; i < grid.width; i++) {
			for (j = i + 1; j < grid.height; j++) {
				if (j < grid.width) {
					// swap the value
					vec3.set(grid.points[j][i], temp);
					vec3.set(grid.points[i][j], grid.points[j][i]);
					vec3.set(temp, grid.points[i][j]);
				} else {
					// just copy
					vec3.set(grid.points[i][j], grid.points[j][i]);
				}
			}
		}
	}

	l = grid.width;
	grid.width = grid.height;
	grid.height = l;

	tempWrap = grid.wrapWidth;
	grid.wrapWidth = grid.wrapHeight;
	grid.wrapHeight = tempWrap;
}

/**********************************************************
 *
 * Patch collide generation
 *
 **********************************************************/

/**
 * PatchCollideFromGrid
 */
function PatchCollideFromGrid(grid, pc) {
	var i, j;
	var p1, p2, p3;
	var borders = [0, 0, 0, 0];
	var noAdjust = [0, 0, 0, 0];

	var gridPlanes = new Array(MAX_GRID_SIZE);
	for (i = 0; i < MAX_GRID_SIZE; i++) {
		gridPlanes[i] = new Array(MAX_GRID_SIZE);
		for (j = 0; j < MAX_GRID_SIZE; j++) {
			gridPlanes[i][j] = new Array(2);
		}
	}

	// Find the planes for each triangle of the grid.
	for (i = 0; i < grid.width - 1; i++) {
		for (j = 0; j < grid.height - 1; j++) {
			p1 = grid.points[i][j];
			p2 = grid.points[i+1][j];
			p3 = grid.points[i+1][j+1];
			gridPlanes[i][j][0] = FindPlane(pc, p1, p2, p3);

			p1 = grid.points[i+1][j+1];
			p2 = grid.points[i][j+1];
			p3 = grid.points[i][j];
			gridPlanes[i][j][1] = FindPlane(pc, p1, p2, p3);
		}
	}

	// Create the borders for each facet.
	for (i = 0; i < grid.width - 1; i++) {
		for (j = 0; j < grid.height - 1; j++) {
			borders[EN_TOP] = -1;
			if (j > 0) {
				borders[EN_TOP] = gridPlanes[i][j-1][1];
			} else if (grid.wrapHeight) {
				borders[EN_TOP] = gridPlanes[i][grid.height-2][1];
			}
			noAdjust[EN_TOP] = (borders[EN_TOP] == gridPlanes[i][j][0]);
			if (borders[EN_TOP] == -1 || noAdjust[EN_TOP]) {
				borders[EN_TOP] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 0);
			}

			borders[EN_BOTTOM] = -1;
			if (j < grid.height - 2) {
				borders[EN_BOTTOM] = gridPlanes[i][j+1][0];
			} else if (grid.wrapHeight) {
				borders[EN_BOTTOM] = gridPlanes[i][0][0];
			}
			noAdjust[EN_BOTTOM] = (borders[EN_BOTTOM] == gridPlanes[i][j][1]);
			if (borders[EN_BOTTOM] == -1 || noAdjust[EN_BOTTOM]) {
				borders[EN_BOTTOM] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 2);
			}

			borders[EN_LEFT] = -1;
			if (i > 0) {
				borders[EN_LEFT] = gridPlanes[i-1][j][0];
			} else if (grid.wrapWidth) {
				borders[EN_LEFT] = gridPlanes[grid.width-2][j][0];
			}
			noAdjust[EN_LEFT] = (borders[EN_LEFT] == gridPlanes[i][j][1]);
			if (borders[EN_LEFT] == -1 || noAdjust[EN_LEFT]) {
				borders[EN_LEFT] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 3);
			}

			borders[EN_RIGHT] = -1;
			if (i < grid.width - 2) {
				borders[EN_RIGHT] = gridPlanes[i+1][j][1];
			} else if (grid.wrapWidth) {
				borders[EN_RIGHT] = gridPlanes[0][j][1];
			}
			noAdjust[EN_RIGHT] = (borders[EN_RIGHT] == gridPlanes[i][j][0]);
			if (borders[EN_RIGHT] == -1 || noAdjust[EN_RIGHT]) {
				borders[EN_RIGHT] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 1);
			}

			if (pc.facets.length >= MAX_FACETS) {
				error('MAX_FACETS');
			}

			var facet = new pfacet_t();

			if (gridPlanes[i][j][0] === gridPlanes[i][j][1]) {
				if (gridPlanes[i][j][0] === -1) {
					continue;  // degenrate
				}
				facet.surfacePlane = gridPlanes[i][j][0];
				facet.numBorders = 4;
				facet.borderPlanes[0] = borders[EN_TOP];
				facet.borderNoAdjust[0] = noAdjust[EN_TOP];
				facet.borderPlanes[1] = borders[EN_RIGHT];
				facet.borderNoAdjust[1] = noAdjust[EN_RIGHT];
				facet.borderPlanes[2] = borders[EN_BOTTOM];
				facet.borderNoAdjust[2] = noAdjust[EN_BOTTOM];
				facet.borderPlanes[3] = borders[EN_LEFT];
				facet.borderNoAdjust[3] = noAdjust[EN_LEFT];
				SetBorderInward(pc, facet, grid, gridPlanes, i, j, -1);
				if (ValidateFacet(pc, facet)) {
					AddFacetBevels(pc, facet);
					pc.facets.push(facet);
				}
			} else {
				// two seperate triangles
				facet.surfacePlane = gridPlanes[i][j][0];
				facet.numBorders = 3;
				facet.borderPlanes[0] = borders[EN_TOP];
				facet.borderNoAdjust[0] = noAdjust[EN_TOP];
				facet.borderPlanes[1] = borders[EN_RIGHT];
				facet.borderNoAdjust[1] = noAdjust[EN_RIGHT];
				facet.borderPlanes[2] = gridPlanes[i][j][1];
				if (facet.borderPlanes[2] === -1) {
					facet.borderPlanes[2] = borders[EN_BOTTOM];
					if (facet.borderPlanes[2] === -1) {
						facet.borderPlanes[2] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 4);
					}
				}
				SetBorderInward(pc, facet, grid, gridPlanes, i, j, 0);
				if (ValidateFacet(pc, facet)) {
					AddFacetBevels(pc, facet);
					pc.facets.push(facet);
				}

				if (pc.facets.length >= MAX_FACETS) {
					error('MAX_FACETS');
				}

				facet = facet = new pfacet_t();
				facet.surfacePlane = gridPlanes[i][j][1];
				facet.numBorders = 3;
				facet.borderPlanes[0] = borders[EN_BOTTOM];
				facet.borderNoAdjust[0] = noAdjust[EN_BOTTOM];
				facet.borderPlanes[1] = borders[EN_LEFT];
				facet.borderNoAdjust[1] = noAdjust[EN_LEFT];
				facet.borderPlanes[2] = gridPlanes[i][j][0];
				if (facet.borderPlanes[2] === -1) {
					facet.borderPlanes[2] = borders[EN_TOP];
					if ( facet.borderPlanes[2] === -1) {
						facet.borderPlanes[2] = EdgePlaneNum(pc, grid, gridPlanes, i, j, 5);
					}
				}
				SetBorderInward(pc, facet, grid, gridPlanes, i, j, 1);
				if (ValidateFacet(pc, facet)) {
					AddFacetBevels(pc, facet);
					pc.facets.push(facet);
				}
			}
		}
	}
}

/**
 * FindPlane
 */
function FindPlane(pc, p1, p2, p3) {
	var plane = QMath.PlaneFromPoints(p1, p2, p3);

	if (!plane) {
		return -1;
	}

	// See if the points are close enough to an existing plane.
	for (var i = 0; i < pc.planes.length; i++) {
		var pp = pc.planes[i];

		if (vec3.dot(plane.normal, pp.normal) < 0) {
			continue;  // allow backwards planes?
		}

		if (QMath.PointOnPlaneSide(p1, pp) !== QMath.SIDE_ON) {
			continue;
		}

		if (QMath.PointOnPlaneSide(p2, pp) !== QMath.SIDE_ON) {
			continue;
		}

		if (QMath.PointOnPlaneSide(p3, pp) !== QMath.SIDE_ON) {
			continue;
		}

		// Found it.
		return i;
	}

	// Add a new plane.
	if (pc.planes.length >= MAX_PATCH_PLANES) {
		error('MAX_PATCH_PLANES');
	}

	var index = pc.planes.length;
	pc.planes.push(plane);

	return index;
}

/**
 * EdgePlaneNum
 */
function EdgePlaneNum(pc, grid, gridPlanes, i, j, k) {
	var p1, p2;
	var planeNum;
	var pp;
	var up = vec3.create();

	switch (k) {
		case 0:  // top border
			p1 = grid.points[i][j];
			p2 = grid.points[i+1][j];
			planeNum = GridPlane(gridPlanes, i, j, 0);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.normal, 4, vec3.create()), up);
			return FindPlane(pc, p1, p2, up);

		case 2:  // bottom border
			p1 = grid.points[i][j+1];
			p2 = grid.points[i+1][j+1];
			planeNum = GridPlane(gridPlanes, i, j, 1);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.normal, 4, vec3.create()), up);
			return FindPlane(pc, p2, p1, up);

		case 3:  // left border
			p1 = grid.points[i][j];
			p2 = grid.points[i][j+1];
			planeNum = GridPlane(gridPlanes, i, j, 1);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.normal, 4, vec3.create()), up);
			return FindPlane(pc, p2, p1, up);

		case 1:  // right border
			p1 = grid.points[i+1][j];
			p2 = grid.points[i+1][j+1];
			planeNum = GridPlane(gridPlanes, i, j, 0);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.normal, 4, vec3.create()), up);
			return FindPlane(pc, p1, p2, up);

		case 4:  // diagonal out of triangle 0
			p1 = grid.points[i+1][j+1];
			p2 = grid.points[i][j];
			planeNum = GridPlane(gridPlanes, i, j, 0);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.normal, 4, vec3.create()), up);
			return FindPlane(pc, p1, p2, up);

		case 5:  // diagonal out of triangle 1
			p1 = grid.points[i][j];
			p2 = grid.points[i+1][j+1];
			planeNum = GridPlane(gridPlanes, i, j, 1);
			pp = pc.planes[planeNum];
			vec3.add(p1, vec3.scale(pp.normal, 4, vec3.create()), up);
			return FindPlane(pc, p1, p2, up);
	}

	error('EdgePlaneNum: bad k');
	return -1;
}

/**
 * GridPlane
 */
function GridPlane(gridPlanes, i, j, tri) {
	var p = gridPlanes[i][j][tri];
	if (p !== -1) {
		return p;
	}

	p = gridPlanes[i][j][tri^1];
	if (p !== -1) {
		return p;
	}

	// Should never happen.
	log('WARNING: GridPlane unresolvable');
	return -1;
}

/**
 * SetBorderInward
 */
function SetBorderInward(pc, facet, grid, gridPlanes, i, j, which) {
	var points = [null, null, null, null];
	var numPoints;

	switch (which) {
		case -1:
			points[0] = grid.points[i][j];
			points[1] = grid.points[i+1][j];
			points[2] = grid.points[i+1][j+1];
			points[3] = grid.points[i][j+1];
			numPoints = 4;
			break;
		case 0:
			points[0] = grid.points[i][j];
			points[1] = grid.points[i+1][j];
			points[2] = grid.points[i+1][j+1];
			numPoints = 3;
			break;
		case 1:
			points[0] = grid.points[i+1][j+1];
			points[1] = grid.points[i][j+1];
			points[2] = grid.points[i][j];
			numPoints = 3;
			break;
		default:
			error('SetBorderInward: bad parameter');
			numPoints = 0;
			break;
	}

	for (var k = 0; k < facet.numBorders; k++) {
		var front = 0;
		var back = 0;

		for (var l = 0; l < numPoints; l++) {
			var planeNum = facet.borderPlanes[k];
			if (planeNum === -1) {
				continue;
			}

			var side = QMath.PointOnPlaneSide(points[l], pc.planes[planeNum]);

			if (side === QMath.SIDE_FRONT) {
				front++;
			} else if (side === QMath.SIDE_BACK) {
				back++;
			}
		}

		if (front && !back) {
			facet.borderInward[k] = true;
		} else if (back && !front) {
			facet.borderInward[k] = false;
		} else if (!front && !back) {
			// Flat side border.
			facet.borderPlanes[k] = -1;
		} else {
			// Bisecting side border.
			log('WARNING: SetBorderInward: mixed plane sides');
			facet.borderInward[k] = false;
		}
	}
}

/**
 * ValidateFacet
 *
 * If the facet isn't bounded by its borders, we screwed up.
 */
function ValidateFacet(pc, facet) {
	if (facet.surfacePlane === -1) {
		return false;
	}

	var bounds = [vec3.create(), vec3.create()];
	var plane = pc.planes[facet.surfacePlane].clone();
	var w = QMath.BaseWindingForPlane(plane.normal, plane.dist);

	for (var i = 0; i < facet.numBorders; i++) {
		if (facet.borderPlanes[i] === -1) {
			return false;
		}

		pc.planes[facet.borderPlanes[i]].clone(plane);

		if (!facet.borderInward[i]) {
			vec3.negate(plane.normal);
			plane.dist = -plane.dist;
		}

		if (!QMath.ChopWindingInPlace(w, plane.normal, plane.dist, 0.1)) {
			return false;  // winding was completely chopped away
		}
	}

	// See if the facet is unreasonably large.
	QMath.WindingBounds(w, bounds[0], bounds[1]);

	// TODO Move to qpoly.
	for (var i = 0; i < 3; i++) {
		if (bounds[1][i] - bounds[0][i] > QMath.MAX_MAP_BOUNDS) {
			return false;  // we must be missing a plane
		}
		if (bounds[0][i] >= QMath.MAX_MAP_BOUNDS) {
			return false;
		}
		if (bounds[1][i] <= -QMath.MAX_MAP_BOUNDS) {
			return false;
		}
	}

	return true;  // winding is fine
}

/**
 * AddFacetBevels
 */
function AddFacetBevels(pc, facet) {
	var i, j, k, l;
	var axis, dir, order;
	var flipped = [false];  // Lame, but we can't pass primitive by reference
	var mins = vec3.create();
	var maxs = vec3.create();
	var vec = vec3.create();
	var vec2 = vec3.create();
	var plane = pc.planes[facet.surfacePlane].clone();
	var newplane = new QMath.Plane();

	var w = QMath.BaseWindingForPlane(plane.normal, plane.dist);
	for (j = 0; j < facet.numBorders; j++) {
		if (facet.borderPlanes[j] === facet.surfacePlane) {
			continue;
		}

		pc.planes[facet.borderPlanes[j]].clone(plane);
		if (!facet.borderInward[j]) {
			vec3.negate(plane.normal);
			plane.dist = -plane.dist;
		}

		if (!QMath.ChopWindingInPlace(w, plane.normal, plane.dist, 0.1)) {
			return;
		}
	}

	QMath.WindingBounds(w, mins, maxs);

	//
	// Add the axial planes.
	//
	order = 0;
	for (axis = 0; axis < 3; axis++) {
		for (dir = -1; dir <= 1; dir += 2, order++) {
			plane.normal[0] = plane.normal[1] = plane.normal[2] = 0;
			plane.normal[axis] = dir;

			if (dir === 1) {
				plane.dist = maxs[axis];
			} else {
				plane.dist = -mins[axis];
			}

			// If it's the surface plane.
			if (PlaneEqual(pc.planes[facet.surfacePlane], plane, flipped)) {
				continue;
			}

			// See if the plane is already present.
			for (i = 0; i < facet.numBorders; i++) {
				if (PlaneEqual(pc.planes[facet.borderPlanes[i]], plane, flipped)) {
					break;
				}
			}

			if (i === facet.numBorders) {
				if (facet.numBorders > 4 + 6 + 16) {
					log('ERROR: too many bevels');
				}

				facet.borderPlanes[facet.numBorders] = FindPlane2(pc, plane, flipped);
				facet.borderNoAdjust[facet.numBorders] = 0;
				facet.borderInward[facet.numBorders] = flipped[0];
				facet.numBorders++;
			}
		}
	}

	//
	// Add the edge bevels.
	//

	// Test the non-axial plane edges.
	for (j = 0; j < w.p.length; j++) {
		k = (j+1)%w.p.length;
		vec3.subtract(w.p[j], w.p[k], vec);

		// If it's a degenerate edge.
		vec3.normalize(vec);
		if (vec3.length(vec) < 0.5) {
			continue;
		}
		SnapVector(vec);

		for (k = 0; k < 3; k++) {
			if (vec[k] == -1 || vec[k] == 1) {
				break;  // axial
			}
		}
		if (k < 3) {
			continue;  // only test non-axial edges
		}

		// Try the six possible slanted axials from this edge.
		for (axis = 0; axis < 3; axis++) {
			for (dir = -1; dir <= 1; dir += 2) {
				// Construct a plane.
				vec2[0] = vec2[1] = vec2[2] = 0;
				vec2[axis] = dir;

				vec3.cross(vec, vec2, plane.normal);
				vec3.normalize(plane.normal);

				if (vec3.length(plane.normal) < 0.5) {
					continue;
				}

				plane.dist = vec3.dot(w.p[j], plane.normal);

				// If all the points of the facet winding are
				// behind this plane, it is a proper edge bevel
				for (l = 0; l < w.p.length; l++) {
					var d = vec3.dot(w.p[l], plane.normal) - plane.dist;
					if (d > 0.1) {
						break;  // point in front
					}
				}
				if (l < w.p.length) {
					continue;
				}

				// If it's the surface plane.
				if (PlaneEqual(pc.planes[facet.surfacePlane], plane, flipped)) {
					continue;
				}

				// See if the plane is already present.
				for (i = 0; i < facet.numBorders; i++) {
					if (PlaneEqual(pc.planes[facet.borderPlanes[i]], plane, flipped)) {
						break;
					}
				}
				if (i === facet.numBorders) {
					if (facet.numBorders > 4 + 6 + 16) {
						log('ERROR: too many bevels');
					}
					facet.borderPlanes[facet.numBorders] = FindPlane2(pc, plane, flipped);

					for (k = 0; k < facet.numBorders; k++) {
						if (facet.borderPlanes[facet.numBorders] == facet.borderPlanes[k]) {
							log('WARNING: bevel plane already used');
						}
					}

					facet.borderNoAdjust[facet.numBorders] = 0;
					facet.borderInward[facet.numBorders] = flipped[0];

					//
					var w2 = w.clone();

					pc.planes[facet.borderPlanes[facet.numBorders]].clone(newplane);
					if (!facet.borderInward[facet.numBorders]) {
						vec3.negate(newplane.normal);
						newplane.dist = -newplane.dist;
					}

					if (!QMath.ChopWindingInPlace(w2, newplane.normal, newplane.dist, 0.1)) {
						log('WARNING: AddFacetBevels... invalid bevel');
						continue;
					}

					facet.numBorders++;
				}
			}
		}
	}

	//
	// Add opposite plane.
	//
	facet.borderPlanes[facet.numBorders] = facet.surfacePlane;
	facet.borderNoAdjust[facet.numBorders] = 0;
	facet.borderInward[facet.numBorders] = true;
	facet.numBorders++;
}

/**
 * PlaneEqual
 *
 * TODO Use QMath.PlaneEqual
 */
var NORMAL_EPSILON = 0.0001;
var DIST_EPSILON   = 0.02;

function PlaneEqual(pp, plane, flipped) {
	if (Math.abs(pp.normal[0] - plane.normal[0]) < NORMAL_EPSILON &&
		Math.abs(pp.normal[1] - plane.normal[1]) < NORMAL_EPSILON &&
		Math.abs(pp.normal[2] - plane.normal[2]) < NORMAL_EPSILON &&
		Math.abs(pp.dist - plane.dist) < DIST_EPSILON) {
		flipped[0] = false;
		return true;
	}

	var invplane = new QMath.Plane();
	vec3.negate(plane.normal, invplane.normal);
	invplane.dist = -plane.dist;

	if (Math.abs(pp.normal[0] - invplane.normal[0]) < NORMAL_EPSILON &&
		Math.abs(pp.normal[1] - invplane.normal[1]) < NORMAL_EPSILON &&
		Math.abs(pp.normal[2] - invplane.normal[2]) < NORMAL_EPSILON &&
		Math.abs(pp.dist - invplane.dist) < DIST_EPSILON) {
		flipped[0] = true;
		return true;
	}

	return false;
}

/**
 * SnapVector
 */
function SnapVector(normal) {
	for (var i = 0; i < 3; i++) {
		if (Math.abs(normal[i] - 1) < NORMAL_EPSILON) {
			normal[0] = normal[1] = normal[2] = 0;
			normal[i] = 1;
			break;
		}
		if (Math.abs(normal[i] + 1) < NORMAL_EPSILON) {
			normal[0] = normal[1] = normal[2] = 0;
			normal[i] = -1;
			break;
		}
	}
}

/**
 * FindPlane2
 */
function FindPlane2(pc, plane, flipped) {
	// See if the points are close enough to an existing plane.
	for (var i = 0; i < pc.planes.length; i++) {
		if (PlaneEqual(pc.planes[i], plane, flipped)) {
			return i;
		}
	}

	// Add a new plane.
	if (pc.planes.length === MAX_PATCH_PLANES) {
		error('MAX_PATCH_PLANES');
	}

	var index = pc.planes.length;

	var pp = plane.clone();
	pc.planes.push(pp);

	flipped[0] = false;

	return index;
}

/**********************************************************
 *
 * Trace testing
 *
 **********************************************************/

var FacetCheckWork = function() {
	this.enterFrac = 0;
	this.leaveFrac = 0;
	this.hit = false;
};

// This is all safe to allocate once statically, and provides a huge
// performance boost on FF.
//
// FIXME Implement reset functions for all data types.
var cw = new FacetCheckWork();
var plane = new QMath.Plane();
var bestplane = new QMath.Plane();
var startp = vec3.create();
var endp = vec3.create();

/**
 * TraceThroughPatchCollide
 */
function TraceThroughPatchCollide(tw, pc) {
	if (!QMath.BoundsIntersect(tw.bounds[0], tw.bounds[1], pc.bounds[0], pc.bounds[1], SURFACE_CLIP_EPSILON)) {
		return;
	}

	if (tw.isPoint) {
		TracePointThroughPatchCollide(tw, pc);
		return;
	}

	for (var i = 0; i < pc.facets.length; i++) {
		var facet = pc.facets[i];
		var hitnum = -1;

		cw.enterFrac = -1.0;
		cw.leaveFrac = 1.0;
		cw.hit = false;

		//
		var pp = pc.planes[facet.surfacePlane];
		vec3.set(pp.normal, plane.normal);
		plane.dist = pp.dist;

		var offset = vec3.dot(tw.offsets[pp.signbits], plane.normal);
		plane.dist -= offset;
		vec3.set(tw.start, startp);
		vec3.set(tw.end, endp);

		if (!CheckFacetPlane(plane, startp, endp, cw)) {
			continue;
		}
		if (cw.hit) {
			plane.clone(bestplane);
		}

		var j = 0;
		for (j = 0; j < facet.numBorders; j++) {
			pp = pc.planes[facet.borderPlanes[j]];
			if (facet.borderInward[j]) {
				vec3.negate(pp.normal, plane.normal);
				plane.dist = -pp.dist;
			} else {
				vec3.set(pp.normal, plane.normal);
				plane.dist = pp.dist;
			}

			// NOTE: this works even though the plane might be flipped because the bbox is centered
			offset = vec3.dot(tw.offsets[pp.signbits], plane.normal);
			plane.dist += Math.abs(offset);
			vec3.set(tw.start, startp);
			vec3.set(tw.end, endp);

			if (!CheckFacetPlane(plane, startp, endp, cw)) {
				break;
			}
			if (cw.hit) {
				hitnum = j;
				plane.clone(bestplane);
			}
		}
		if (j < facet.numBorders) {
			continue;
		}

		// Never clip against the back side.
		if (hitnum === facet.numBorders - 1) {
			continue;
		}

		if (cw.enterFrac < cw.leaveFrac && cw.enterFrac >= 0) {
			if (cw.enterFrac < tw.trace.fraction) {
				if (cw.enterFrac < 0) {
					cw.enterFrac = 0;
				}

				tw.trace.fraction = cw.enterFrac;
				bestplane.clone(tw.trace.plane);
			}
		}
	}
}

/**
 * TracePointThroughPatchCollide
 *
 * Special case for point traces because the patch collide "brushes" have no volume
 */
var frontFacing = new Array(MAX_PATCH_PLANES);
var intersection = new Array(MAX_PATCH_PLANES);

function TracePointThroughPatchCollide(tw, pc) {
	if (!tw.isPoint ) {
		return;
	}

	// Determine the trace's relationship to all planes.
	for (var i = 0; i < pc.planes.length; i++) {
		var pp = pc.planes[i];

		var offset = vec3.dot(tw.offsets[pp.signbits], pp.normal);
		var d1 = vec3.dot(tw.start, pp.normal) - pp.dist + offset;
		var d2 = vec3.dot(tw.end, pp.normal) - pp.dist + offset;

		if (d1 <= 0) {
			frontFacing[i] = false;
		} else {
			frontFacing[i] = true;
		}
		if (d1 === d2) {
			intersection[i] = 99999;
		} else {
			intersection[i] = d1 / (d1 - d2);
			if (intersection[i] <= 0) {
				intersection[i] = 99999;
			}
		}
	}

	// See if any of the surface planes are intersected.
	for (var i = 0; i < pc.facets.length; i++) {
		var facet = pc.facets[i];
		if (!frontFacing[facet.surfacePlane]) {
			continue;
		}

		var intersect = intersection[facet.surfacePlane];
		if (intersect < 0) {
			continue;  // surface is behind the starting point
		}
		if (intersect > tw.trace.fraction) {
			continue;  // already hit something closer
		}

		var j = 0;
		for (j = 0; j < facet.numBorders; j++) {
			var k = facet.borderPlanes[j];
			if (frontFacing[k] ^ facet.borderInward[j]) {
				if (intersection[k] > intersect) {
					break;
				}
			} else {
				if (intersection[k] < intersect) {
					break;
				}
			}
		}
		if (j === facet.numBorders) {
			// We hit this facet
			var pp = pc.planes[facet.surfacePlane];

			// Calculate intersection with a slight pushoff.
			var offset = vec3.dot(tw.offsets[pp.signbits], pp.normal);
			var d1 = vec3.dot(tw.start, pp.normal) - pp.dist + offset;
			var d2 = vec3.dot(tw.end, pp.normal) - pp.dist + offset;

			tw.trace.fraction = (d1 - SURFACE_CLIP_EPSILON) / (d1 - d2);

			if (tw.trace.fraction < 0) {
				tw.trace.fraction = 0;
			}

			pp.clone(tw.trace.plane);
		}
	}
}

/**
 * CheckFacetPlane
 */
function CheckFacetPlane(plane, start, end, cw) {
	var f;
	var d1 = vec3.dot(start, plane.normal) - plane.dist;
	var d2 = vec3.dot(end, plane.normal) - plane.dist;

	cw.hit = false;

	// If completely in front of face, no intersection with the entire facet.
	if (d1 > 0 && (d2 >= SURFACE_CLIP_EPSILON || d2 >= d1)) {
		return false;
	}

	// If it doesn't cross the plane, the plane isn't relevent.
	if (d1 <= 0 && d2 <= 0) {
		return true;
	}

	// Crosses face.
	if (d1 > d2) {  // enter
		f = (d1 - SURFACE_CLIP_EPSILON) / (d1 - d2);
		if (f < 0) {
			f = 0;
		}
		// Always favor previous plane hits and thus also the surface plane hit.
		if (f > cw.enterFrac) {
			cw.enterFrac = f;
			cw.hit = true;
		}
	} else {  // leave
		f = (d1 + SURFACE_CLIP_EPSILON) / (d1 - d2);
		if (f > 1) {
			f = 1;
		}
		if (f < cw.leaveFrac) {
			cw.leaveFrac = f;
		}
	}

	return true;
}


// /*
// =======================================================================

// POSITION TEST

// =======================================================================
// */

// /*
// ====================
// CM_PositionTestInPatchCollide
// ====================
// */
// qboolean CM_PositionTestInPatchCollide( traceWork_t *tw, const struct patchCollide_s *pc ) {
// 	int i, j;
// 	float offset, t;
// 	patchPlane_t *planes;
// 	facet_t	*facet;
// 	float plane[4];
// 	vec3_t startp;

// 	if (tw.isPoint) {
// 		return false;
// 	}
// 	//
// 	facet = pc.facets;
// 	for ( i = 0 ; i < pc.numFacets ; i++, facet++ ) {
// 		planes = &pc.planes[ facet.surfacePlane ];
// 		VectorCopy(planes.plane, plane);
// 		plane[3] = planes.plane[3];
// 		if ( tw.sphere.use ) {
// 			// adjust the plane distance apropriately for radius
// 			plane[3] += tw.sphere.radius;

// 			// find the closest point on the capsule to the plane
// 			t = DotProduct( plane, tw.sphere.offset );
// 			if ( t > 0 ) {
// 				VectorSubtract( tw.start, tw.sphere.offset, startp );
// 			}
// 			else {
// 				VectorAdd( tw.start, tw.sphere.offset, startp );
// 			}
// 		}
// 		else {
// 			offset = DotProduct( tw.offsets[ planes.signbits ], plane);
// 			plane[3] -= offset;
// 			VectorCopy( tw.start, startp );
// 		}

// 		if ( DotProduct( plane, startp ) - plane[3] > 0.0f ) {
// 			continue;
// 		}

// 		for ( j = 0; j < facet.numBorders; j++ ) {
// 			planes = &pc.planes[ facet.borderPlanes[j] ];
// 			if (facet.borderInward[j]) {
// 				VectorNegate(planes.plane, plane);
// 				plane[3] = -planes.plane[3];
// 			}
// 			else {
// 				VectorCopy(planes.plane, plane);
// 				plane[3] = planes.plane[3];
// 			}
// 			if ( tw.sphere.use ) {
// 				// adjust the plane distance apropriately for radius
// 				plane[3] += tw.sphere.radius;

// 				// find the closest point on the capsule to the plane
// 				t = DotProduct( plane, tw.sphere.offset );
// 				if ( t > 0.0f ) {
// 					VectorSubtract( tw.start, tw.sphere.offset, startp );
// 				}
// 				else {
// 					VectorAdd( tw.start, tw.sphere.offset, startp );
// 				}
// 			}
// 			else {
// 				// NOTE: this works even though the plane might be flipped because the bbox is centered
// 				offset = DotProduct( tw.offsets[ planes.signbits ], plane);
// 				plane[3] += fabs(offset);
// 				VectorCopy( tw.start, startp );
// 			}

// 			if ( DotProduct( plane, startp ) - plane[3] > 0.0f ) {
// 				break;
// 			}
// 		}
// 		if (j < facet.numBorders) {
// 			continue;
// 		}
// 		// inside this patch facet
// 		return true;
// 	}
// 	return false;
// }

function EmitCollisionSurfaces(tessFn) {
	var plane = new QMath.Plane();
	var mins = vec3.createFrom(-1, -1, -1);
	var maxs = vec3.createFrom(1, 1, 1);
	var v1 = vec3.create();
	var v2 = vec3.create();

	for (var pcnum = 0; pcnum < debugPatchCollides.length; pcnum++) {
		var pc = debugPatchCollides[pcnum];

		for (var i = 0; i < pc.facets.length; i++) {
			var facet = pc.facets[i];

			for (var k = 0; k < facet.numBorders + 1; k++) {
				var planenum, inward;
				if (k < facet.numBorders) {
					planenum = facet.borderPlanes[k];
					inward = facet.borderInward[k];
				} else {
					planenum = facet.surfacePlane;
					inward = false;
				}

				pc.planes[planenum].clone(plane);
				if (inward) {
					vec3.negate(plane);
					plane.dist = -plane.dist;
				}

				for (n = 0; n < 3; n++) {
					if (plane[n] > 0) {
						v1[n] = maxs[n];
					} else {
						v1[n] = mins[n];
					}
				}
				vec3.negate(plane.normal, v2);
				plane.dist += Math.abs(vec3.dot(v1, v2));

				var w = QMath.BaseWindingForPlane(plane.normal, plane.dist);

				for (var j = 0; j < facet.numBorders + 1; j++) {
					var curplanenum, curinward;
					if (j < facet.numBorders) {
						curplanenum = facet.borderPlanes[j];
						curinward = facet.borderInward[j];
					} else {
						curplanenum = facet.surfacePlane;
						curinward = false;
					}

					if (curplanenum === planenum) {
						continue;
					}

					pc.planes[curplanenum].clone(plane);
					if (!curinward) {
						vec3.negate(plane.normal);
						plane.dist = -plane.dist;
					}

					for (var n = 0; n < 3; n++) {
						if (plane[n] > 0) {
							v1[n] = maxs[n];
						} else {
							v1[n] = mins[n];
						}
					}
					vec3.negate(plane.normal, v2);
					plane.dist -= Math.abs(vec3.dot(v1, v2));

					if (!QMath.ChopWindingInPlace(w, plane.normal, plane.dist, 0.1)) {
						//log('winding chopped away by border planes', j, facet.numBorders + 1);
						break;
					}
				}

				if (j === facet.numBorders + 1) {
					tessFn(w.p);
				}
			}
		}
	}
}

		/**
 * ClusterVisible
 */
function ClusterVisible(current, test) {
	if (!cm.vis || current === test || current == -1) {
		return true;
	}

	var offset = current * cm.clusterBytes;
	return (cm.vis[offset + (test >> 3)] & (1 << (test & 7))) !== 0;
}

/**
 * BoxLeafnums
 *
 * Fills in a list of all the leafs touched
 */
function BoxLeafnums_r(ll, mins, maxs, nodenum) {
	while (1) {
		if (nodenum < 0) {
			var leafNum = -1 - nodenum;

			// Store the lastLeaf even if the list is overflowed
			if (cm.leafs[leafNum].cluster !== -1) {
				ll.lastLeaf = leafNum;
			}

			if (ll.count >= ll.maxCount) {
				// ll->overflowed = true;
				return;
			}

			ll.list[ll.count++] = leafNum;
			return;
		}

		var node = cm.nodes[nodenum];
		var s = QMath.BoxOnPlaneSide(mins, maxs, cm.planes[node.planeNum]);

		if (s === QMath.SIDE_FRONT) {
			nodenum = node.childrenNum[0];
		} else if (s === QMath.SIDE_BACK) {
			nodenum = node.childrenNum[1];
		} else {
			// Go down both.
			BoxLeafnums_r(ll, mins, maxs, node.childrenNum[0]);
			nodenum = node.childrenNum[1];
		}
	}
}

/**
 * BoxLeafnums
 */
function BoxLeafnums(mins, maxs, list, maxCount) {
	var ll = new LeafList();

	ll.list = list;
	ll.maxCount = maxCount;

	cm.checkcount++;
	BoxLeafnums_r(ll, mins, maxs, 0);

	return ll;
}

/*
 * PointLeafnum_r
 */
function PointLeafnum_r(p, num) {
	var d;

	while (num >= 0) {
		var node = cm.nodes[num];
		var plane = cm.planes[node.planeNum];

		if (plane.type < 3) {
			d = p[plane.type] - plane.dist;
		} else {
			d = vec3.dot(plane.normal, p) - plane.dist;
		}

		if (d < 0) {
			num = node.childrenNum[1];
		} else {
			num = node.childrenNum[0];
		}
	}

// 	c_pointcontents++;		// optimize counter

	return (-1) - num;
}

/**
 * PointLeafnum
 */
function PointLeafnum(p) {
	return PointLeafnum_r(p, 0);
}

/**
 * PointContents
 */
function PointContents(p, model) {
	var leafBrushes = cm.leafBrushes;
	var brushes = cm.brushes;
	var brushSides = cm.brushSides;

	var leaf;
	if (model) {
		var clipModel = ClipHandleToModel(model);
		leaf = clipModel.leaf;
	} else {
		var leafNum = PointLeafnum(p);
		leaf = cm.leafs[leafNum];
	}

	var contents = 0;
	for (var i = 0; i < leaf.numLeafBrushes; i++) {
		var brushNum = leafBrushes[leaf.firstLeafBrush + i];
		var brush = brushes[brushNum];

		if (!QMath.BoundsIntersectPoint(brush.bounds[0], brush.bounds[1], p)) {
			continue;
		}

		// See if the point is in the brush.
		var j;
		for (var j = 0; j < brush.numSides; j++) {
			var side = brushSides[brush.firstSide + j];
			var d = vec3.dot(p, side.plane.normal);
			if (d > side.plane.dist) {
				break;
			}
		}

		if (j === brush.numSides) {
			contents |= brush.contents;
		}
	}

	return contents;
}

/**
 * TransformedPointContents
 */
function TransformedPointContents(p, model, origin, angles) {
	// Subtract origin offset.
	var local = vec3.subtract(p, origin, vec3.create());

	// Rotate start and end into the models frame of reference.
	if (model !== BOX_MODEL_HANDLE && (angles[0] || angles[1] || angles[2])) {
		var forward = vec3.create();
		var right = vec3.create();
		var up = vec3.create();

		QMath.AnglesToVectors(angles, forward, right, up);

		var temp = vec3.create(local);

		local[0] = vec3.dot(temp, forward);
		local[1] = -vec3.dot(temp, right);
		local[2] = vec3.dot(temp, up);
	}

	return PointContents(local, model);
}

/**********************************************************
 *
 * Area portals
 *
 **********************************************************/

/**
 * FloodArea_r
 */
function FloodArea_r(areaNum, floodnum) {
	var area = cm.areas[areaNum];

	if (area.floodValid === cm.floodValid) {
		if (area.floodnum === floodnum) {
			return;
		}
		error('FloodArea_r: reflooded');
	}

	area.floodnum = floodnum;
	area.floodValid = cm.floodValid;

	var offset = areaNum * cm.areas.length;
	for (var i = 0; i < cm.areas.length; i++) {
		if (cm.areaPortals[offset+i] > 0) {
			FloodArea_r(i, floodnum);
		}
	}
}

/**
 * FloodAreaConnections
 */
function FloodAreaConnections() {
	// All current floods are now invalid.
	cm.floodValid++;

	var floodnum = 0;

	for (var i = 0; i < cm.areas.length; i++) {
		var area = cm.areas[i];
		if (area.floodValid === cm.floodValid) {
			continue;  // already flooded into
		}
		floodnum++;
		FloodArea_r(i, floodnum);
	}

}

/**
 * AdjustAreaPortalState
 */
function AdjustAreaPortalState(area1, area2, open) {
	if (area1 < 0 || area2 < 0) {
		return;
	}

	if (area1 >= cm.areas.length || area2 >= cm.areas.length) {
		error('ChangeAreaPortalState: bad area number');
	}

	if (open) {
		cm.areaPortals[area1 * cm.numAreas + area2]++;
		cm.areaPortals[area2 * cm.numAreas + area1]++;
	} else {
		cm.areaPortals[area1 * cm.numAreas + area2]--;
		cm.areaPortals[area2 * cm.numAreas + area1]--;
		if (cm.areaPortals[area2 * cm.numAreas + area1] < 0) {
			error('AdjustAreaPortalState: negative reference count');
		}
	}

	FloodAreaConnections();
}

/**
 * AreasConnected
 */
function AreasConnected(area1, area2) {
	// if ( cm_noAreas->integer ) {
	// 	return true;
	// }

	if (area1 < 0 || area2 < 0) {
		return false;
	}

	if (area1 >= cm.areas.length || area2 >= cm.areas.length) {
		error('area >= cm.numAreas');
	}

	if (cm.areas[area1].floodnum === cm.areas[area2].floodnum) {
		return true;
	}
	return false;
}

		/*********************************************************************
 *
 * Position testing
 *
 ********************************************************************/

/**
 * TestBoxInBrush
 */
function TestBoxInBrush(tw, brush) {
	var brushSides = cm.brushSides;

	if (!brush.numSides) {
		return;
	}

	// Special test for axial.
	if (tw.bounds[0][0] > brush.bounds[1][0] ||
		tw.bounds[0][1] > brush.bounds[1][1] ||
		tw.bounds[0][2] > brush.bounds[1][2] ||
		tw.bounds[1][0] < brush.bounds[0][0] ||
		tw.bounds[1][1] < brush.bounds[0][1] ||
		tw.bounds[1][2] < brush.bounds[0][2]) {
		return;
	}

	// The first six planes are the axial planes, so we only
	// need to test the remainder.
	for (var i = 6; i < brush.numSides; i++) {
		var side = brushSides[brush.firstSide + i];
		var plane = side.plane;

		// adjust the plane distance apropriately for mins/maxs
		var dist = plane.dist - vec3.dot(tw.offsets[plane.signbits], plane.normal);
		var d1 = vec3.dot(tw.start, plane.normal) - dist;

		// if completely in front of face, no intersection
		if (d1 > 0) {
			return;
		}
	}

	// Inside this brush.
	tw.trace.startSolid = tw.trace.allSolid = true;
	tw.trace.fraction = 0;
	tw.trace.contents = brush.contents;
}

/**
 * TestInLeaf
 */
function TestInLeaf(tw, leaf) {
	var brushes = cm.brushes;
	var leafBrushes = cm.leafBrushes;

	// Test box position against all brushes in the leaf.
	for (var k = 0; k < leaf.numLeafBrushes; k++) {
		var brushnum = leafBrushes[leaf.firstLeafBrush+k];
		var b = brushes[brushnum];

		if (b.checkcount === cm.checkcount) {
			continue;  // already checked this brush in another leaf
		}
		b.checkcount = cm.checkcount;

		if (!(b.contents & tw.contents)) {
			continue;
		}

		TestBoxInBrush(tw, b);
		if (tw.trace.allSolid) {
			return;
		}
	}

	/*// test against all patches
	if ( !cm_noCurves->integer ) {
		for ( k = 0 ; k < leaf->numLeafSurfaces ; k++ ) {
			patch = cm.surfaces[ cm.leafsurfaces[ leaf->firstLeafSurface + k ] ];
			if ( !patch ) {
				continue;
			}
			if ( patch->checkcount == cm.checkcount ) {
				continue;	// already checked this brush in another leaf
			}
			patch->checkcount = cm.checkcount;

			if ( !(patch->contents & tw->contents)) {
				continue;
			}

			if ( CM_PositionTestInPatchCollide( tw, patch->pc ) ) {
				tw->trace.startsolid = tw->trace.allsolid = true;
				tw->trace.fraction = 0;
				tw->trace.contents = patch->contents;
				return;
			}
		}
	}*/
}

/**
 * PositionTest
 */

// Don't allocate this each time.
var ptleafs = new Uint32Array(MAX_POSITION_LEAFS);

function PositionTest(tw) {
	var leafs = cm.leafs;
	var mins = vec3.add(tw.start, tw.size[0], vec3.create());
	var maxs = vec3.add(tw.start, tw.size[1], vec3.create());

	vec3.add(mins, [-1, -1, -1]);
	vec3.add(maxs, [1, 1, 1]);

	var ll = new LeafList();
	ll.list = ptleafs;
	ll.maxCount = MAX_POSITION_LEAFS;

	cm.checkcount++;
	BoxLeafnums_r(ll, mins, maxs, 0);
	cm.checkcount++;

	// Test the contents of the leafs.
	for (var i = 0; i < ll.count; i++) {
		TestInLeaf(tw, leafs[ll.list[i]]);

		if (tw.trace.allSolid) {
			break;
		}
	}
}

/*********************************************************************
 *
 * Tracing
 *
 ********************************************************************/

/**
 * TraceThroughTree
 */
function TraceThroughTree(tw, num, p1f, p2f, p1, p2) {
	var brushes = cm.brushes;
	var leafs = cm.leafs;
	var leafBrushes = cm.leafBrushes;
	var nodes = cm.nodes;
	var planes = cm.planes;

	if (tw.trace.fraction <= p1f) {
		return; // already hit something nearer
	}

	if (num < 0) { // Leaf node?
		TraceThroughLeaf(tw, leafs[-(num + 1)]);
		return;
	}

	//
	// Find the point distances to the seperating plane
	// and the offset for the size of the box.
	//
	var node = nodes[num];
	var plane = planes[node.planeNum];

	// Adjust the plane distance apropriately for mins/maxs.
	var t1, t2, offset;

	if (plane.type < 3) {
		t1 = p1[plane.type] - plane.dist;
		t2 = p2[plane.type] - plane.dist;
		offset = tw.extents[plane.type];
	} else {
		t1 = vec3.dot(plane.normal, p1) - plane.dist;
		t2 = vec3.dot(plane.normal, p2) - plane.dist;
		if (tw.isPoint) {
			offset = 0;
		} else {
			// This is silly.
			offset = 2048;
		}
	}

	// See which sides we need to consider.
	if (t1 >= offset + 1 && t2 >= offset + 1) {
		TraceThroughTree(tw, node.childrenNum[0], p1f, p2f, p1, p2);
		return;
	}
	if (t1 < -offset - 1 && t2 < -offset - 1) {
		TraceThroughTree(tw, node.childrenNum[1], p1f, p2f, p1, p2);
		return;
	}

	// Put the crosspoint SURFACE_CLIP_EPSILON pixels on the near side.
	var idist, side, frac, frac2;

	if (t1 < t2) {
		idist = 1.0/(t1-t2);
		side = 1;
		frac2 = (t1 + offset + SURFACE_CLIP_EPSILON) * idist;
		frac = (t1 - offset + SURFACE_CLIP_EPSILON) * idist;
	} else if (t1 > t2) {
		idist = 1.0/(t1-t2);
		side = 0;
		frac2 = (t1 - offset - SURFACE_CLIP_EPSILON) * idist;
		frac = (t1 + offset + SURFACE_CLIP_EPSILON) * idist;
	} else {
		side = 0;
		frac = 1;
		frac2 = 0;
	}

	// Move up to the node.
	var mid = vec3.create(), midf;

	if (frac < 0) {
		frac = 0;
	} else if (frac > 1) {
		frac = 1;
	}

	midf = p1f + (p2f - p1f)*frac;
	mid[0] = p1[0] + frac*(p2[0] - p1[0]);
	mid[1] = p1[1] + frac*(p2[1] - p1[1]);
	mid[2] = p1[2] + frac*(p2[2] - p1[2]);

	TraceThroughTree(tw, node.childrenNum[side], p1f, midf, p1, mid);

	// Go past the node.
	if (frac2 < 0) {
		frac2 = 0;
	}
	if (frac2 > 1) {
		frac2 = 1;
	}

	midf = p1f + (p2f - p1f)*frac2;
	mid[0] = p1[0] + frac2*(p2[0] - p1[0]);
	mid[1] = p1[1] + frac2*(p2[1] - p1[1]);
	mid[2] = p1[2] + frac2*(p2[2] - p1[2]);

	TraceThroughTree(tw, node.childrenNum[side^1], midf, p2f, mid, p2);
}

/**
 * TraceThroughLeaf
 */
function TraceThroughLeaf(tw, leaf) {
	var brushes = cm.brushes;
	var leafBrushes = cm.leafBrushes;

	// Trace line against all brushes in the leaf.
	for (var i = 0; i < leaf.numLeafBrushes; i++) {
		var brushNum = leafBrushes[leaf.firstLeafBrush + i];
		var brush = brushes[brushNum];

		if (brush.checkcount === cm.checkcount) {
			continue;  // already checked this brush in another leaf
		}

		brush.checkcount = cm.checkcount;

		if (!(brush.contents & tw.contents)) {
			continue;
		}

		if (!QMath.BoundsIntersect(tw.bounds[0], tw.bounds[1], brush.bounds[0], brush.bounds[1], SURFACE_CLIP_EPSILON)) {
			continue;
		}

		TraceThroughBrush(tw, brush);

		if (!tw.trace.fraction) {
			return;
		}
	}

	// Trace line against all patches in the leaf.
	for (var i = 0; i < leaf.numLeafSurfaces; i++) {
		var patch = cm.surfaces[cm.leafSurfaces[leaf.firstLeafSurface + i]];

		if (!patch) {
			continue;
		}

		if (patch.checkcount === cm.checkcount) {
			continue;  // already checked this patch in another leaf
		}
		patch.checkcount = cm.checkcount;

		if (!(patch.contents & tw.contents)) {
			continue;
		}

		TraceThroughPatch(tw, patch);

		if (!tw.trace.fraction) {
			return;
		}
	}
}

/**
 * TraceThroughBrush
 */
function TraceThroughBrush(tw, brush) {
	var brushSides = cm.brushSides;
	var shaders = cm.shaders;
	var trace = tw.trace;
	var leadside;
	var clipplane;
	var getout = false;
	var startout = false;
	var enterFrac = -1.0;
	var leaveFrac = 1.0;

	if (!brush.numSides) {
		return;
	}

	// Compare the trace against all planes of the brush.
	// Find the latest time the trace crosses a plane towards the interior
	// and the earliest time the trace crosses a plane towards the exterior.
	for (var i = 0; i < brush.numSides; i++) {
		var side = cm.brushSides[brush.firstSide + i];
		var plane = side.plane;

		// Adjust the plane distance apropriately for mins/maxs.
		var dist = plane.dist - vec3.dot(tw.offsets[plane.signbits], plane.normal);
		var d1 = vec3.dot(tw.start, plane.normal) - dist;
		var d2 = vec3.dot(tw.end, plane.normal) - dist;

		if (d2 > 0) {
			getout = true;  // endpoint is not in solid
		}
		if (d1 > 0) {
			startout = true;
		}

		// If completely in front of face, no intersection with the entire brush.
		if (d1 > 0 && (d2 >= SURFACE_CLIP_EPSILON || d2 >= d1)) {
			return;
		}

		// If it doesn't cross the plane, the plane isn't relevent.
		if (d1 <= 0 && d2 <= 0) {
			continue;
		}

		// Crosses face.
		if (d1 > d2) {  // enter
			var f = (d1 - SURFACE_CLIP_EPSILON) / (d1 - d2);
			if (f < 0) {
				f = 0;
			}
			if (f > enterFrac) {
				enterFrac = f;
				clipplane = plane;
				leadside = side;
			}
		} else {  // leave
			var f = (d1 + SURFACE_CLIP_EPSILON) / (d1 - d2);
			if (f > 1) {
				f = 1;
			}
			if (f < leaveFrac) {
				leaveFrac = f;
			}
		}
	}

	//
	// All planes have been checked, and the trace was not
	// completely outside the brush.
	//
	if (!startout) {  // original point was inside brush
		tw.trace.startSolid = true;
		if (!getout) {
			tw.trace.allSolid = true;
			tw.trace.fraction = 0;
			tw.trace.contents = brush.contents;
			tw.trace.shaderName = brush.shader.shaderName;
		}
		return;
	}

	if (enterFrac < leaveFrac) {
		if (enterFrac > -1 && enterFrac < tw.trace.fraction) {
			if (enterFrac < 0) {
				enterFrac = 0;
			}
			tw.trace.fraction = enterFrac;
			clipplane.clone(tw.trace.plane);
			tw.trace.surfaceFlags = leadside.surfaceFlags;
			tw.trace.contents = brush.contents;
			tw.trace.shaderName = brush.shader.shaderName;
		}
	}
}

/**
 * TraceThroughPatch
 */
function TraceThroughPatch(tw, patch) {
	var oldFrac = tw.trace.fraction;

	TraceThroughPatchCollide(tw, patch.pc);

	if (tw.trace.fraction < oldFrac) {
		tw.trace.surfaceFlags = patch.surfaceFlags;
		tw.trace.contents = patch.contents;
	}
}

/**
 * Trace
 */
var staticTraceWork = new TraceWork();

function Trace(results, start, end, mins, maxs, model, origin, brushmask) {
	var tw = staticTraceWork;

	tw.reset();

	if (!cm.checkcount) {
		cm.checkcount = 0;
	}
	cm.checkcount++;  // for multi-check avoidance

	// Allow NULL to be passed in for 0,0,0.
	if (!mins) {
		mins = vec3.create();
	}
	if (!maxs) {
		maxs = vec3.create();
	}

	// Set basic parms.
	tw.contents = brushmask;

	// Adjust so that mins and maxs are always symetric, which
	// avoids some complications with plane expanding of rotated
	// bmodels.
	var offset = vec3.create();
	for (var i = 0 ; i < 3 ; i++) {
		offset[i] = (mins[i] + maxs[i]) * 0.5;
		tw.size[0][i] = mins[i] - offset[i];
		tw.size[1][i] = maxs[i] - offset[i];
		tw.start[i] = start[i] + offset[i];
		tw.end[i] = end[i] + offset[i];
	}

	// tw.offsets[signbits] = vector to apropriate corner from origin
	tw.offsets[0][0] = tw.size[0][0];
	tw.offsets[0][1] = tw.size[0][1];
	tw.offsets[0][2] = tw.size[0][2];

	tw.offsets[1][0] = tw.size[1][0];
	tw.offsets[1][1] = tw.size[0][1];
	tw.offsets[1][2] = tw.size[0][2];

	tw.offsets[2][0] = tw.size[0][0];
	tw.offsets[2][1] = tw.size[1][1];
	tw.offsets[2][2] = tw.size[0][2];

	tw.offsets[3][0] = tw.size[1][0];
	tw.offsets[3][1] = tw.size[1][1];
	tw.offsets[3][2] = tw.size[0][2];

	tw.offsets[4][0] = tw.size[0][0];
	tw.offsets[4][1] = tw.size[0][1];
	tw.offsets[4][2] = tw.size[1][2];

	tw.offsets[5][0] = tw.size[1][0];
	tw.offsets[5][1] = tw.size[0][1];
	tw.offsets[5][2] = tw.size[1][2];

	tw.offsets[6][0] = tw.size[0][0];
	tw.offsets[6][1] = tw.size[1][1];
	tw.offsets[6][2] = tw.size[1][2];

	tw.offsets[7][0] = tw.size[1][0];
	tw.offsets[7][1] = tw.size[1][1];
	tw.offsets[7][2] = tw.size[1][2];

	//
	// Calculate bounds.
	//
	for (var i = 0 ; i < 3 ; i++) {
		if (tw.start[i] < tw.end[i]) {
			tw.bounds[0][i] = tw.start[i] + tw.size[0][i];
			tw.bounds[1][i] = tw.end[i] + tw.size[1][i];
		} else {
			tw.bounds[0][i] = tw.end[i] + tw.size[0][i];
			tw.bounds[1][i] = tw.start[i] + tw.size[1][i];
		}
	}

	//
	// Check for position test special case.
	//
	var cmod = model ? ClipHandleToModel(model) : null;

	if (start[0] == end[0] && start[1] == end[1] && start[2] == end[2]) {
		if (model) {
			TestInLeaf(tw, cmod.leaf);
		} else {
			PositionTest(tw);
		}
	} else {
		//
		// Check for point special case.
		//
		if (tw.size[0][0] === 0 && tw.size[0][1] === 0 && tw.size[0][2] === 0) {
			tw.isPoint = true;
			tw.extents = vec3.create();
		} else {
			tw.isPoint = false;
			tw.extents[0] = tw.size[1][0];
			tw.extents[1] = tw.size[1][1];
			tw.extents[2] = tw.size[1][2];
		}

		if (model) {
			TraceThroughLeaf(tw, cmod.leaf);
		} else {
			TraceThroughTree(tw, 0, 0, 1, tw.start, tw.end);
		}
	}

	// Generate endpos from the original, unmodified start/end.
	for (var i = 0; i < 3; i++) {
		tw.trace.endPos[i] = start[i] + tw.trace.fraction * (end[i] - start[i]);
	}

	// If allsolid is set (was entirely inside something solid), the plane is not valid.
	// If fraction == 1.0, we never hit anything, and thus the plane is not valid.
	// Otherwise, the normal on the plane should have unit length.
	if (!tw.trace.allSolid && tw.trace.fraction !== 1.0 && vec3.squaredLength(tw.trace.plane.normal) <= 0.9999 && !vec3.length(tw.trace.endPos)) {
		error('Invalid trace result');
	}

	tw.trace.clone(results);
}

/**
 * BoxTrace
 */
function BoxTrace(results, start, end, mins, maxs, model, brushmask) {
	return Trace(results, start, end, mins, maxs, model, vec3.create(), brushmask);
}

/**
 * TransformedBoxTrace
 *
 * Handles offseting and rotation of the end points for moving and
 * rotating entities.
 */
function TransformedBoxTrace(results, start, end, mins, maxs, model, brushmask, origin, angles) {
	if (!mins) {
		mins = vec3.create();
	}
	if (!maxs) {
		maxs = vec3.create();
	}

	var start_l = vec3.create();
	var end_l = vec3.create();
	var offset = vec3.create();
	var symetricSize = [
		vec3.create(),
		vec3.create()
	];
	var matrix = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	var transpose = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];

	// Adjust so that mins and maxs are always symetric, which
	// avoids some complications with plane expanding of rotated
	// bmodels.
	for (var i = 0; i < 3; i++) {
		offset[i] = (mins[i] + maxs[i]) * 0.5;
		symetricSize[0][i] = mins[i] - offset[i];
		symetricSize[1][i] = maxs[i] - offset[i];
		start_l[i] = start[i] + offset[i];
		end_l[i] = end[i] + offset[i];
	}

	// Subtract origin offset.
	vec3.subtract(start_l, origin);
	vec3.subtract(end_l, origin);

	// Rotate start and end into the models frame of reference
	var rotated = false;
	if (model !== BOX_MODEL_HANDLE && (angles[0] || angles[1] || angles[2])) {
		rotated = true;
	}

	if (rotated) {
		// Rotation on trace line (start-end) instead of rotating the bmodel
		// NOTE: This is still incorrect for bounding boxes because the actual bounding
		//		 box that is swept through the model is not rotated. We cannot rotate
		//		 the bounding box or the bmodel because that would make all the brush
		//		 bevels invalid.
		QMath.AnglesToAxis(angles, matrix);
		QMath.RotatePoint(start_l, matrix);
		QMath.RotatePoint(end_l, matrix);
	}

	// Sweep the box through the model
	Trace(results, start_l, end_l, symetricSize[0], symetricSize[1], model, origin, brushmask);

	// If the bmodel was rotated and there was a collision.
	if (rotated && results.fraction !== 1.0) {
		// Rotation of bmodel collision plane.
		QMath.TransposeMatrix(matrix, transpose);
		QMath.RotatePoint(results.plane.normal, transpose);
	}

	// Re-calculate the end position of the trace because the results.endPos
	// calculated by Trace could be rotated and have an offset.
	results.endPos[0] = start[0] + results.fraction * (end[0] - start[0]);
	results.endPos[1] = start[1] + results.fraction * (end[1] - start[1]);
	results.endPos[2] = start[2] + results.fraction * (end[2] - start[2]);
}

		var cm;

/**
 * LoadWorld
 */
function LoadWorld(bsp) {
	log('Initializing CM');

	cm = new ClipWorld();

	cm.shaders = bsp.shaders;
	cm.planes = bsp.planes;
	cm.nodes = bsp.nodes;
	cm.numClusters = bsp.numClusters;
	cm.clusterBytes = bsp.clusterBytes;
	cm.vis = bsp.vis;

	LoadLeafs(bsp.leafs, bsp.leafBrushes, bsp.leafSurfaces);
	LoadBrushes(bsp.brushes, bsp.brushSides);
	LoadBrushModels(bsp.bmodels);
	LoadPatches(bsp.surfaces, bsp.verts);

	InitBoxHull();
	FloodAreaConnections();
}

/**
 * LoadLeafs
 */
function LoadLeafs(leafs, leafBrushes, leafSurfaces) {
	cm.leafs = leafs;
	cm.leafBrushes = leafBrushes;
	cm.leafSurfaces = leafSurfaces;

	var numAreas = 0;
	for (var i = 0; i < leafs.length; i++) {
		var leaf = leafs[i];

		if (leaf.area >= numAreas) {
			numAreas = leaf.area + 1;
		}
	}

	cm.areas = new Array(numAreas);
	cm.areaPortals = new Array(numAreas * numAreas);

	for (var i = 0; i < numAreas; i++) {
		cm.areas[i] = new ClipArea();
	}
	for (var i = 0; i < numAreas * numAreas; i++) {
		cm.areaPortals[i] = 0;
	}
}

/**
 * LoadBrushes
 */
function LoadBrushes(brushes, brushSides) {
	var shaders = cm.shaders;
	var planes = cm.planes;

	//
	// Load brush sides.
	//
	var cbrushSides = cm.brushSides = new Array(brushSides.length);

	for (var i = 0; i < brushSides.length; i++) {
		var side = brushSides[i];
		var cside = cbrushSides[i] = new ClipBrushSide();

		cside.plane = planes[side.planeNum];
		cside.surfaceFlags = shaders[side.shaderNum].surfaceFlags;
	}

	//
	// Load brushes.
	//
	var cbrushes = cm.brushes = new Array(brushes.length);

	for (var i = 0; i < brushes.length; i++) {
		var brush = brushes[i];
		var cbrush = cbrushes[i] = new ClipBrush();

		cbrush.shader = shaders[brush.shaderNum];
		cbrush.contents = cbrush.shader.contents;

		cbrush.bounds[0][0] = -cbrushSides[brush.side + 0].plane.dist;
		cbrush.bounds[0][1] = -cbrushSides[brush.side + 2].plane.dist;
		cbrush.bounds[0][2] = -cbrushSides[brush.side + 4].plane.dist;

		cbrush.bounds[1][0] = cbrushSides[brush.side + 1].plane.dist;
		cbrush.bounds[1][1] = cbrushSides[brush.side + 3].plane.dist;
		cbrush.bounds[1][2] = cbrushSides[brush.side + 5].plane.dist;

		cbrush.firstSide = brush.side;
		cbrush.numSides = brush.numSides;
	}
}

/**
 * LoadBrushModels
 */
function LoadBrushModels(models) {
	cm.models = new Array(models.length);

	for (var i = 0; i < models.length; i++) {
		var model = models[i];
		var cmodel = cm.models[i] = new ClipModel();

		// Spread the mins / maxs by a unit.
		var spread = vec3.createFrom(1, 1, 1);
		vec3.subtract(model.bounds[0], spread, cmodel.mins);
		vec3.add(model.bounds[1], spread, cmodel.maxs);

		if (i === 0) {
			continue;  // world model doesn't need other info
		}

		// Make a "leaf" just to hold the model's brushes and surfaces.
		var leaf = cmodel.leaf;
		leaf.numLeafBrushes = model.numBrushes;
		leaf.firstLeafBrush = cm.leafBrushes.length;
		for (var j = 0; j < model.numBrushes; j++) {
			cm.leafBrushes.push(model.firstBrush + j);
		}

		leaf.numLeafSurfaces = model.numSurfaces;
		leaf.firstLeafSurface = cm.leafSurfaces.length;
		for (var j = 0; j < model.numSurfaces; j++) {
			cm.leafSurfaces.push(model.firstSurface + j);
		}
	}
}

/**
 * LoadPatches
 */
function LoadPatches(surfaces, verts) {
	cm.surfaces = new Array(surfaces.length);

	// Scan through all the surfaces, but only load patches,
	// not planar faces.
	var points = new Array(MAX_PATCH_VERTS);
	for (var i = 0; i < MAX_PATCH_VERTS; i++) {
		points[i] = vec3.create();
	}

	for (var i = 0; i < surfaces.length; i++) {
		var surface = surfaces[i];
		if (surface.surfaceType !== BspSerializer.MST.PATCH) {
			continue;  // ignore other surfaces
		}

		var patch = cm.surfaces[i] = new cpatch_t();

		// Load the full drawverts onto the stack.
		var width = surface.patchWidth;
		var height = surface.patchHeight;
		var c = width * height;
		if (c > MAX_PATCH_VERTS) {
			error('ParseMesh: MAX_PATCH_VERTS');
		}
		for (var j = 0; j < c ; j++) {
			vec3.set(verts[surface.vertex + j].pos, points[j]);
		}

		patch.contents = cm.shaders[surface.shaderNum].contents;
		patch.surfaceFlags = cm.shaders[surface.shaderNum].surfaceFlags;

		// Create the internal facet structure
		patch.pc = GeneratePatchCollide(width, height, points);
	}
}

/**
 * InitBoxHull
 *
 * Set up the planes and nodes so that the six floats of a bounding box
 * can just be stored out and get a proper clipping hull structure.
 */
var BOX_BRUSHES = 1;
var BOX_SIDES   = 6;
var BOX_LEAFS   = 2;
var BOX_PLANES  = 12;

var box_model = null;
var box_brush = null;
var box_planes = null;

function InitBoxHull() {
	box_model = new ClipModel();
	box_model.leaf.numLeafBrushes = 1;
	box_model.leaf.firstLeafBrush = cm.leafBrushes.length;
	cm.leafBrushes.push(cm.brushes.length);

	box_brush = new ClipBrush();
	box_brush.firstSide = cm.brushSides.length;
	box_brush.numSides = BOX_SIDES;
	box_brush.contents = SURF.CONTENTS.BODY;
	cm.brushes.push(box_brush);

	box_planes = new Array(BOX_PLANES);
	for (var i = 0; i < BOX_PLANES; i++) {
		var plane = box_planes[i] = new QMath.Plane();
		cm.planes.push(plane);
	}

	for (var i = 0; i < 6; i++) {
		var side = i & 1;

		// Brush sides.
		var s = new BspSerializer.dbrushside_t();
		s.plane = box_planes[i * 2 + side];
		s.surfaceFlags = 0;

		// Planes.
		var p = box_planes[i * 2];
		p.type = i >> 1;
		p.normal[0] = p.normal[1] = p.normal[2] = 0;
		p.normal[i >> 1] = 1;
		p.signbits = 0;

		p = box_planes[i * 2 + 1];
		p.type = 3 + (i >> 1);
		p.normal[0] = p.normal[1] = p.normal[2] = 0;
		p.normal[i >> 1] = -1;
		p.signbits = QMath.GetPlaneSignbits(p.normal);

		cm.brushSides.push(s);
	}
}

/**
 * InlineModel
 */
function InlineModel(num) {
	if (num < 0 || num >= cm.models.length) {
		error('GetInlineModel: bad number');
	}

	return num;
}

/**
 * TempBoxModel
 *
 * To keep everything totally uniform, bounding boxes are turned into small
 * BSP trees instead of being compared directly.
 */
function TempBoxModel(mins, maxs) {
	vec3.set(mins, box_model.mins);
	vec3.set(maxs, box_model.maxs);

	box_planes[0].dist = maxs[0];
	box_planes[1].dist = -maxs[0];
	box_planes[2].dist = mins[0];
	box_planes[3].dist = -mins[0];
	box_planes[4].dist = maxs[1];
	box_planes[5].dist = -maxs[1];
	box_planes[6].dist = mins[1];
	box_planes[7].dist = -mins[1];
	box_planes[8].dist = maxs[2];
	box_planes[9].dist = -maxs[2];
	box_planes[10].dist = mins[2];
	box_planes[11].dist = -mins[2];

	vec3.set(mins, box_brush.bounds[0]);
	vec3.set(maxs, box_brush.bounds[1]);

	return BOX_MODEL_HANDLE;
}

/**
 * ModelBounds
 */
function ModelBounds(model, mins, maxs) {
	var cmod = ClipHandleToModel(model);
	vec3.set(cmod.mins, mins);
	vec3.set(cmod.maxs, maxs);
}

/**
 * ClipHandleToModel
 */
function ClipHandleToModel(handle) {
	if (handle < 0) {
		error('ClipHandleToModel: bad handle ' + handle);
	}
	if (handle < cm.models.length) {
		return cm.models[handle];
	}
	if (handle === BOX_MODEL_HANDLE) {
		return box_model;
	}

	error('ClipHandleToModel: bad handle ' + cm.models.length + ' < ' + handle);
}

/**
 * LeafCluster
 */
function LeafCluster(leafNum) {
	if (leafNum < 0 || leafNum >= cm.leafs.length) {
		error('LeafCluster: bad number');
	}
	return cm.leafs[leafNum].cluster;
}

/**
 * LeafArea
 */
function LeafArea(leafNum) {
	if (leafNum < 0 || leafNum >= cm.leafs.length) {
		error('LeafArea: bad number');
	}
	return cm.leafs[leafNum].area;
}

		return {
			LoadWorld:                LoadWorld,
			InlineModel:              InlineModel,
			TempBoxModel:             TempBoxModel,
			ModelBounds:              ModelBounds,
			LeafArea:                 LeafArea,
			LeafCluster:              LeafCluster,
			ClusterVisible:           ClusterVisible,
			BoxLeafnums:              BoxLeafnums,
			PointLeafnum:             PointLeafnum,
			PointContents:            PointContents,
			TransformedPointContents: TransformedPointContents,
			AdjustAreaPortalState:    AdjustAreaPortalState,
			AreasConnected:           AreasConnected,
			BoxTrace:                 BoxTrace,
			TransformedBoxTrace:      TransformedBoxTrace,
			EmitCollisionSurfaces:    EmitCollisionSurfaces
		};
	}

	return ClipMap;
});


/*

  Javascript State Machine Library - https://github.com/jakesgordon/javascript-state-machine

  Copyright (c) 2012, 2013 Jake Gordon and contributors
  Released under the MIT license - https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE

*/

(function (window) {

  var StateMachine = {

    //---------------------------------------------------------------------------

    VERSION: "2.2.0",

    //---------------------------------------------------------------------------

    Result: {
      SUCCEEDED:    1, // the event transitioned successfully from one state to another
      NOTRANSITION: 2, // the event was successfull but no state transition was necessary
      CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback
      PENDING:      4  // the event is asynchronous and the caller is in control of when the transition occurs
    },

    Error: {
      INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state
      PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending
      INVALID_CALLBACK:   300 // caller provided callback function threw an exception
    },

    WILDCARD: '*',
    ASYNC: 'async',

    //---------------------------------------------------------------------------

    create: function(cfg, target) {

      var initial   = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
      var terminal  = cfg.terminal || cfg['final'];
      var fsm       = target || cfg.target  || {};
      var events    = cfg.events || [];
      var callbacks = cfg.callbacks || {};
      var map       = {};

      var add = function(e) {
        var from = (e.from instanceof Array) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
        map[e.name] = map[e.name] || {};
        for (var n = 0 ; n < from.length ; n++)
          map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified
      };

      if (initial) {
        initial.event = initial.event || 'startup';
        add({ name: initial.event, from: 'none', to: initial.state });
      }

      for(var n = 0 ; n < events.length ; n++)
        add(events[n]);

      for(var name in map) {
        if (map.hasOwnProperty(name))
          fsm[name] = StateMachine.buildEvent(name, map[name]);
      }

      for(var name in callbacks) {
        if (callbacks.hasOwnProperty(name))
          fsm[name] = callbacks[name]
      }

      fsm.current = 'none';
      fsm.is      = function(state) { return (state instanceof Array) ? (state.indexOf(this.current) >= 0) : (this.current === state); };
      fsm.can     = function(event) { return !this.transition && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); }
      fsm.cannot  = function(event) { return !this.can(event); };
      fsm.error   = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)

      fsm.isFinished = function() { return this.is(terminal); };

      if (initial && !initial.defer)
        fsm[initial.event]();

      return fsm;

    },

    //===========================================================================

    doCallback: function(fsm, func, name, from, to, args) {
      if (func) {
        try {
          return func.apply(fsm, [name, from, to].concat(args));
        }
        catch(e) {
          return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
        }
      }
    },

    beforeAnyEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbeforeevent'],                       name, from, to, args); },
    afterAnyEvent:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafterevent'] || fsm['onevent'],      name, from, to, args); },
    leaveAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleavestate'],                        name, from, to, args); },
    enterAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenterstate'] || fsm['onstate'],      name, from, to, args); },
    changeState:     function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onchangestate'],                       name, from, to, args); },

    beforeThisEvent: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbefore' + name],                     name, from, to, args); },
    afterThisEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafter'  + name] || fsm['on' + name], name, from, to, args); },
    leaveThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleave'  + from],                     name, from, to, args); },
    enterThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenter'  + to]   || fsm['on' + to],   name, from, to, args); },

    beforeEvent: function(fsm, name, from, to, args) {
      if ((false === StateMachine.beforeThisEvent(fsm, name, from, to, args)) ||
          (false === StateMachine.beforeAnyEvent( fsm, name, from, to, args)))
        return false;
    },

    afterEvent: function(fsm, name, from, to, args) {
      StateMachine.afterThisEvent(fsm, name, from, to, args);
      StateMachine.afterAnyEvent( fsm, name, from, to, args);
    },

    leaveState: function(fsm, name, from, to, args) {
      var specific = StateMachine.leaveThisState(fsm, name, from, to, args),
          general  = StateMachine.leaveAnyState( fsm, name, from, to, args);
      if ((false === specific) || (false === general))
        return false;
      else if ((StateMachine.ASYNC === specific) || (StateMachine.ASYNC === general))
        return StateMachine.ASYNC;
    },

    enterState: function(fsm, name, from, to, args) {
      StateMachine.enterThisState(fsm, name, from, to, args);
      StateMachine.enterAnyState( fsm, name, from, to, args);
    },

    //===========================================================================

    buildEvent: function(name, map) {
      return function() {

        var from  = this.current;
        var to    = map[from] || map[StateMachine.WILDCARD] || from;
        var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array

        if (this.transition)
          return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");

        if (this.cannot(name))
          return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);

        if (false === StateMachine.beforeEvent(this, name, from, to, args))
          return StateMachine.Result.CANCELLED;

        if (from === to) {
          StateMachine.afterEvent(this, name, from, to, args);
          return StateMachine.Result.NOTRANSITION;
        }

        // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
        var fsm = this;
        this.transition = function() {
          fsm.transition = null; // this method should only ever be called once
          fsm.current = to;
          StateMachine.enterState( fsm, name, from, to, args);
          StateMachine.changeState(fsm, name, from, to, args);
          StateMachine.afterEvent( fsm, name, from, to, args);
          return StateMachine.Result.SUCCEEDED;
        };
        this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
          fsm.transition = null;
          StateMachine.afterEvent(fsm, name, from, to, args);
        }

        var leave = StateMachine.leaveState(this, name, from, to, args);
        if (false === leave) {
          this.transition = null;
          return StateMachine.Result.CANCELLED;
        }
        else if (StateMachine.ASYNC === leave) {
          return StateMachine.Result.PENDING;
        }
        else {
          if (this.transition) // need to check in case user manually called transition() but forgot to return StateMachine.ASYNC
            return this.transition();
        }

      };
    }

  }; // StateMachine

  //===========================================================================

  if ("function" === typeof define) {
    define('vendor/state-machine',['require'],function(require) { return StateMachine; });
  }
  else {
    window.StateMachine = StateMachine;
  }

}(this));


/*global vec3: true, mat4: true */

define('game/bg',['require','vendor/gl-matrix','common/qmath','common/qshared','common/surfaceflags'],function (require) {
	var glmatrix = require('vendor/gl-matrix');
	var QMath    = require('common/qmath');
	var QS       = require('common/qshared');
	var SURF     = require('common/surfaceflags');

	function BothGame(imp) {
		var error = imp.error;

		var DEFAULT_GRAVITY        = 800;
var GIB_HEALTH             = -40;

var ARMOR_PROTECTION       = 0.66;

var RANK_TIED_FLAG         = 0x4000;

var DEFAULT_SHOTGUN_SPREAD = 700;
var DEFAULT_SHOTGUN_COUNT  = 11;

var LIGHTNING_RANGE        = 768;

var MINS_Z                 = -24;
var DEFAULT_VIEWHEIGHT     = 26;
var CROUCH_VIEWHEIGHT      = 12;
var DEAD_VIEWHEIGHT        = -16;

var MAX_TOUCH_ENTS         = 32;

var PmoveLocals = function () {
	this.forward             = vec3.create();
	this.right               = vec3.create();
	this.up                  = vec3.create();

	this.frameTime           = 0;
	this.msec                = 0;

	this.walking             = false;
	this.groundPlane         = false;
	this.groundTrace         = null; // TODO pre-alloc

	this.impactSpeed         = 0;

	this.previous_origin     = vec3.create();
	this.previous_velocity   = vec3.create();
	this.previous_waterlevel = 0;
};

PmoveLocals.prototype.reset = function () {
	this.forward[0] = this.forward[1] = this.forward[2] = 0.0;
	this.right[0] = this.right[1] = this.right[2] = 0.0;
	this.up[0] = this.up[1] = this.up[2] = 0.0;

	this.frameTime = 0;
	this.msec = 0;

	this.walking = false;
	this.groundPlane = false;
	this.groundTrace = null;

	this.impactSpeed = 0;

	this.previous_origin[0] = this.previous_origin[1] = this.previous_origin[2] =  0.0;
	this.previous_velocity[0] = this.previous_velocity[1] = this.previous_velocity[2] =  0.0;
	this.previous_waterlevel = 0;
};

var PmoveInfo = function () {
	this.ps            = null;
	this.cmd           = new QS.UserCmd();
	this.mins          = vec3.create();
	this.maxs          = vec3.create();
	this.tracemask     = 0;                                // collide against these surfaces
	this.gauntletHit   = false;                            // true if a gauntlet attack would actually hit something

	// results (out)
	this.touchEnts     = new Array(MAX_TOUCH_ENTS);
	this.numTouch      = 0;
	this.xyspeed       = 0;
	this.watertype     = 0;
	this.waterlevel    = 0;

	// For fixed msec Pmove.
	this.pmove_fixed   = 0;
	this.pmove_msec    = 0;

	// Callbacks to test the world. These will be
	// different functions during cgame and game.
	this.trace         = null;
	this.pointContents = null;
};

var Animation = function () {
	this.firstFrame  = 0;
	this.numFrames   = 0;
	this.loopFrames  = 0;                                  // 0 to numFrames
	this.frameLerp   = 0;                                  // msec between frames
	this.initialLerp = 0;                                  // msec to get to first frame
	this.reversed    = false;                              // true if animation is reversed
	this.flipflop    = false;                              // true if animation should flipflop back to base
};

var PM = {
	NORMAL:         0,                                       // can accelerate and turn
	NOCLIP:         1,                                       // noclip movement
	SPECTATOR:      2,                                       // still run into walls
	DEAD:           3,                                       // no acceleration or turning, but free falling
	FREEZE:         4,                                       // stuck in place with no control
	INTERMISSION:   5,                                       // no movement or status bar
	SPINTERMISSION: 6
};

var PMF = {
	DUCKED:         1,
	JUMP_HELD:      2,
	NO_ATTACK:      4,
	BACKWARDS_JUMP: 8,                                     // go into backwards land
	BACKWARDS_RUN:  16,                                    // coast down to backwards run
	TIME_LAND:      32,                                    // pm_time is time before rejump
	TIME_KNOCKBACK: 64,                                    // pm_time is an air-accelerate only time
	TIME_WATERJUMP: 256,                                   // pm_time is waterjump
	RESPAWNED:      512,                                   // clear after attack and jump buttons come up
	USE_ITEM_HELD:  1024,
	GRAPPLE_PULL:   2048,                                  // pull towards grapple location
	FOLLOW:         4096,                                  // spectate following another player
	SCOREBOARD:     8192,                                  // spectate as a scoreboard
	INVULEXPAND:    16384,                                 // invulnerability sphere set to full size
	ALL_TIMES:      (32|64|256)
};

var GT = {
	FFA:           0,                                      // free for all
	TOURNAMENT:    1,                                      // one on one tournament
	TEAM:          2,                                      // team deathmatch
	CTF:           3,                                      // capture the flag
	NFCTF:         4,
	CLANARENA:     5,
	ROCKETARENA:   6,
	PRACTICEARENA: 7,
	MAX_GAME_TYPE: 8
};

var GS = {
	// Starting at 1 due to type coercion in state machine lib.
	WAITING:      1,
	COUNTDOWN:    2,
	ACTIVE:       3,
	OVER:         4,
	INTERMISSION: 5
};

// Weapon state.
var WS = {
	READY:    0,
	RAISING:  1,
	DROPPING: 2,
	FIRING:   3
};

// Item types.
var IT = {
	BAD:                0,
	WEAPON:             1,                                 // EFX: rotate + upscale + minlight
	AMMO:               2,                                 // EFX: rotate
	ARMOR:              3,                                 // EFX: rotate + minlight
	HEALTH:             4,                                 // EFX: static external sphere + rotating internal
	POWERUP:            5,                                 // instant on, timer based
	                                                       // EFX: rotate + external ring that rotates
	HOLDABLE:           6,                                 // single use, holdable item
	                                                       // EFX: rotate + bob
	PERSISTANT_POWERUP: 7,
	TEAM:               8
};

var MASK = {
	ALL:         -1,
	SOLID:       SURF.CONTENTS.SOLID,
	PLAYERSOLID: SURF.CONTENTS.SOLID | SURF.CONTENTS.PLAYERCLIP | SURF.CONTENTS.BODY,
	DEADSOLID:   SURF.CONTENTS.SOLID | SURF.CONTENTS.PLAYERCLIP,
	WATER:       SURF.CONTENTS.WATER | SURF.CONTENTS.LAVA | SURF.CONTENTS.SLIME,
	OPAQUE:      SURF.CONTENTS.SOLID | SURF.CONTENTS.SLIME | SURF.CONTENTS.LAVA,
	SHOT:        SURF.CONTENTS.SOLID | SURF.CONTENTS.BODY | SURF.CONTENTS.CORPSE
};

/**
 * Playerstate flags
 */
var STAT = {
	HEALTH:        0,
	HOLDABLE_ITEM: 1,
	WEAPONS:       2,
	ARMOR:         3,
	DEAD_YAW:      4,                                      // look this direction when dead (FIXME: get rid of?)
	CLIENTS_READY: 5,                                      // bit mask of clients wishing to exit the intermission (FIXME: configstring?)
	MAX_HEALTH:    6,                                      // health / armor limit, changable by handicap
	JUMP_TIME:     7
};

var WP = {
	NONE:             0,
	GAUNTLET:         1,
	MACHINEGUN:       2,
	SHOTGUN:          3,
	GRENADE_LAUNCHER: 4,
	ROCKET_LAUNCHER:  5,
	LIGHTNING:        6,
	RAILGUN:          7,
	PLASMAGUN:        8,
	BFG:              9,
	GRAPPLING_HOOK:   10,
	NUM_WEAPONS:      11
};

// NOTE: may not have more than 16
var PW = {
	NONE:         0,
	QUAD:         1,
	BATTLESUIT:   2,
	HASTE:        3,
	INVIS:        4,
	REGEN:        5,
	FLIGHT:       6,
	REDFLAG:      7,
	BLUEFLAG:     8,
	NEUTRALFLAG:  9,
	NUM_POWERUPS: 10
};

var TEAM = {
	FREE:      0,
	RED:       1,
	BLUE:      2,
	SPECTATOR: 3,
	NUM_TEAMS: 4
};

var SPECTATOR = {
	NOT:        0,
	FREE:       1,
	FOLLOW:     2,
	SCOREBOARD: 3
};

// PlayerState.persistant[] indexes
// These fields are the only part of player_state that aren't
// cleared on respawn.
// NOTE: may not have more than 16
var PERS = {
	SCORE:                0,                               // !!! MUST NOT CHANGE, SERVER AND GAME BOTH REFERENCE !!!
	FRAGS:                1,
	DEATHS:               2,                               // count of the number of times you died
	HITS:                 3,                               // total points damage inflicted so damage beeps can sound on change
	RANK:                 4,                               // player rank or team rank
	TEAM:                 5,                               // player team
	SPAWN_COUNT:          6,                               // incremented every respawn
	PLAYEREVENTS:         7,                               // 16 bits that can be flipped for events
	// player awards tracking
	IMPRESSIVE_COUNT:     8,                               // two railgun hits in a row
	EXCELLENT_COUNT:      9,                               // two successive kills in a short amount of time
	DEFEND_COUNT:         10,                              // defend awards
	ASSIST_COUNT:         11,                              // assist awards
	GAUNTLET_FRAG_COUNT:  12,                              // kills with the guantlet
	CAPTURES:             13                               // captures
};

// Reward sounds (stored in ps->persistant[PERS_PLAYEREVENTS]).
var PLAYEREVENTS = {
	DENIEDREWARD:   0x0001,
	GAUNTLETREWARD: 0x0002,
	HOLYSHIT:       0x0004
};

/**
 * Entitystate flags
 */
// entityState_t->eType
var ET = {
	GENERAL:          0,
	PLAYER:           1,
	ITEM:             2,
	MISSILE:          3,
	MOVER:            4,
	BEAM:             5,
	PORTAL:           6,
	SPEAKER:          7,
	PUSH_TRIGGER:     8,
	TELEPORT_TRIGGER: 9,
	INVISIBLE:        10,
	GRAPPLE:          11,                                  // grapple hooked on wall
	TEAM:             12,
	EVENTS:           13                                   // any of the EV_* events can be added freestanding
	                                                       // by setting eType to ET_EVENTS + eventNum
	                                                       // this avoids having to set eFlags and eventNum
};

// entityState_t->eFlags
var EF = {
	DEAD:             0x00000001,                          // don't draw a foe marker over players with EF_DEAD
	TELEPORT_BIT:     0x00000004,                          // toggled every time the origin abruptly changes
	AWARD_EXCELLENT:  0x00000008,                          // draw an excellent sprite
	PLAYER_EVENT:     0x00000010,
	BOUNCE:           0x00000010,                          // for missiles
	BOUNCE_HALF:      0x00000020,                          // for missiles
	AWARD_GAUNTLET:   0x00000040,                          // draw a gauntlet sprite
	NODRAW:           0x00000080,                          // may have an event, but no model (unspawned items)
	FIRING:           0x00000100,                          // for lightning gun
	KAMIKAZE:         0x00000200,
	MOVER_STOP:       0x00000400,                          // will push otherwise
	AWARD_CAP:        0x00000800,                          // draw the capture sprite
	TALK:             0x00001000,                          // draw a talk balloon
	CONNECTION:       0x00002000,                          // draw a connection trouble sprite
	VOTED:            0x00004000,                          // already cast a vote
	AWARD_IMPRESSIVE: 0x00008000,                          // draw an impressive sprite
	AWARD_DEFEND:     0x00010000,                          // draw a defend sprite
	AWARD_ASSIST:     0x00020000,                          // draw an assist sprite
	AWARD_DENIED:     0x00040000,                          // denied
	TEAMVOTED:        0x00080000                           // already cast a team vote
};

/**********************************************************
 *
 * Entitystate events
 *
 * Entity events are for effects that take place relative
 * to an existing entities origin. Very network efficient.
 *
 * Two bits at the top of the entityState->event field
 * will be incremented with each change in the event so
 * that an identical event started twice in a row can
 * be distinguished. And off the value with ~EV_EVENT_BITS
 * to retrieve the actual event number.
 *
 **********************************************************/
var EV_EVENT_BIT1    = 0x00000100;
var EV_EVENT_BIT2    = 0x00000200;
var EV_EVENT_BITS    = (EV_EVENT_BIT1|EV_EVENT_BIT2);
var EVENT_VALID_MSEC = 300;

var EV = {
	NONE:                0,

	FOOTSTEP:            1,
	FOOTSTEP_METAL:      2,
	FOOTSPLASH:          3,
	FOOTWADE:            4,
	SWIM:                5,

	STEP_4:              6,
	STEP_8:              7,
	STEP_12:             8,
	STEP_16:             9,

	FALL_SHORT:          10,
	FALL_MEDIUM:         11,
	FALL_FAR:            12,

	JUMP_PAD:            13,                               // boing sound at origin, jump sound on player

	JUMP:                14,
	WATER_TOUCH:         15,                               // foot touches
	WATER_LEAVE:         16,                               // foot leaves
	WATER_UNDER:         17,                               // head touches
	WATER_CLEAR:         18,                               // head leaves

	ITEM_PICKUP:         19,                               // normal item pickups are predictable
	GLOBAL_ITEM_PICKUP:  20,                               // powerup / team sounds are broadcast to everyone

	NOAMMO:              21,
	CHANGE_WEAPON:       22,
	FIRE_WEAPON:         23,

	USE_ITEM0:           24,
	USE_ITEM1:           25,
	USE_ITEM2:           26,
	USE_ITEM3:           27,
	USE_ITEM4:           28,
	USE_ITEM5:           29,
	USE_ITEM6:           30,
	USE_ITEM7:           31,
	USE_ITEM8:           32,
	USE_ITEM9:           33,
	USE_ITEM10:          34,
	USE_ITEM11:          35,
	USE_ITEM12:          36,
	USE_ITEM13:          37,
	USE_ITEM14:          38,
	USE_ITEM15:          39,

	ITEM_RESPAWN:        40,
	ITEM_POP:            41,
	PLAYER_TELEPORT_IN:  42,
	PLAYER_TELEPORT_OUT: 43,

	GRENADE_BOUNCE:      44,                               // eventParm will be the soundindex

	GENERAL_SOUND:       45,
	GLOBAL_SOUND:        46,                               // no attenuation
	GLOBAL_TEAM_SOUND:   47,

	BULLET_HIT_FLESH:    48,
	BULLET_HIT_WALL:     49,

	MISSILE_HIT:         50,
	MISSILE_MISS:        51,
	MISSILE_MISS_METAL:  52,
	RAILTRAIL:           53,
	SHOTGUN:             54,
	BULLET:              55,                               // otherEntity is the shooter

	PAIN:                56,
	DEATH1:              57,
	DEATH2:              58,
	DEATH3:              59,
	OBITUARY:            60,

	POWERUP_QUAD:        61,
	POWERUP_BATTLESUIT:  62,
	POWERUP_REGEN:       63,

	GIB_PLAYER:          64,                               // gib a previously living player
	SCOREPLUM:           65,                               // score plum

	DEBUG_LINE:          66,
	STOPLOOPINGSOUND:    67,
	TAUNT:               68,
	TAUNT_YES:           69,
	TAUNT_NO:            70,
	TAUNT_FOLLOWME:      71,
	TAUNT_GETFLAG:       72,
	TAUNT_GUARDBASE:     73,
	TAUNT_PATROL:        74
};

/**
 *  global_team_sound_t
 */
var GTS = {
	RED_CAPTURE:          0,
	BLUE_CAPTURE:         1,
	RED_RETURN:           2,
	BLUE_RETURN:          3,
	RED_TAKEN:            4,
	BLUE_TAKEN:           5,
	REDOBELISK_ATTACKED:  6,
	BLUEOBELISK_ATTACKED: 7,
	REDTEAM_SCORED:       8,
	BLUETEAM_SCORED:      9,
	REDTEAM_TOOK_LEAD:    10,
	BLUETEAM_TOOK_LEAD:   11,
	TEAMS_ARE_TIED:       12,
	KAMIKAZE:             13
};

/**
 * Animations
 */
// Flip the togglebit every time an animation
// changes so a restart of the same anim can be detected.
var ANIM_TOGGLEBIT = 128;

var ANIM = {
	BOTH_DEATH1:         0,
	BOTH_DEAD1:          1,
	BOTH_DEATH2:         2,
	BOTH_DEAD2:          3,
	BOTH_DEATH3:         4,
	BOTH_DEAD3:          5,

	TORSO_GESTURE:       6,

	TORSO_ATTACK:        7,
	TORSO_ATTACK2:       8,

	TORSO_DROP:          9,
	TORSO_RAISE:         10,

	TORSO_STAND:         11,
	TORSO_STAND2:        12,

	LEGS_WALKCR:         13,
	LEGS_WALK:           14,
	LEGS_RUN:            15,
	LEGS_BACK:           16,
	LEGS_SWIM:           17,

	LEGS_JUMP:           18,
	LEGS_LAND:           19,

	LEGS_JUMPB:          20,
	LEGS_LANDB:          21,

	LEGS_IDLE:           22,
	LEGS_IDLECR:         23,

	LEGS_TURN:           24,

	TORSO_GETFLAG:       25,
	TORSO_GUARDBASE:     26,
	TORSO_PATROL:        27,
	TORSO_FOLLOWME:      28,
	TORSO_AFFIRMATIVE:   29,
	TORSO_NEGATIVE:      30,

	MAX:                 31,

	LEGS_BACKCR:         32,
	LEGS_BACKWALK:       33,
	FLAG_RUN:            34,
	FLAG_STAND:          35,
	FLAG_STAND2RUN:      36,

	MAX_TOTALANIMATIONS: 37
};

// Means of death
var MOD = {
	UNKNOWN:        0,
	SHOTGUN:        1,
	GAUNTLET:       2,
	MACHINEGUN:     3,
	GRENADE:        4,
	GRENADE_SPLASH: 5,
	ROCKET:         6,
	ROCKET_SPLASH:  7,
	PLASMA:         8,
	PLASMA_SPLASH:  9,
	RAILGUN:        10,
	LIGHTNING:      11,
	BFG:            12,
	BFG_SPLASH:     13,
	WATER:          14,
	SLIME:          15,
	LAVA:           16,
	CRUSH:          17,
	TELEFRAG:       18,
	FALLING:        19,
	SUICIDE:        20,
	TARGET_LASER:   21,
	TRIGGER_HURT:   22,
	GRAPPLE:        23
};


var GametypeNames               = [];
GametypeNames[GT.FFA]           = 'ffa';
GametypeNames[GT.TOURNAMENT]    = 'tournament';
GametypeNames[GT.TEAM]          = 'team';
GametypeNames[GT.CTF]           = 'ctf';
GametypeNames[GT.NFCTF]         = 'nfctf';
GametypeNames[GT.CLANARENA]     = 'clanarena';
GametypeNames[GT.ROCKETARENA]   = 'rocketarena';
GametypeNames[GT.PRACTICEARENA] = 'practicearena';

var TeamNames = [];
TeamNames[TEAM.FREE] = 'free';
TeamNames[TEAM.RED] = 'red';
TeamNames[TEAM.BLUE] = 'blue';
TeamNames[TEAM.SPECTATOR] = 'spec';
		/**
 * AddPredictableEventToPlayerstate
 *
 * Handles the sequence numbers.
 */
function AddPredictableEventToPlayerstate(ps, newEvent, eventParm) {
	ps.events[ps.eventSequence % QS.MAX_PS_EVENTS] = newEvent;
	ps.eventParms[ps.eventSequence % QS.MAX_PS_EVENTS] = eventParm;
	ps.eventSequence++;
}

/**
 * PlayerStateToEntityState
 *
 * This is done after each set of usercmd_t on the server,
 * and after local prediction on the client
 */
function PlayerStateToEntityState(ps, es) {
	if (ps.pm_type === PM.INTERMISSION || ps.pm_type === PM.SPECTATOR) {
		es.eType = ET.INVISIBLE;
	} else if (ps.stats[STAT.HEALTH] <= GIB_HEALTH) {
		es.eType = ET.INVISIBLE;
	} else {
		es.eType = ET.PLAYER;
	}

	es.number = ps.clientNum;
	es.arenaNum = ps.arenaNum;

	es.pos.trType = QS.TR.INTERPOLATE;
	vec3.set(ps.origin, es.pos.trBase);
	vec3.set(ps.velocity, es.pos.trDelta);

	es.apos.trType = QS.TR.INTERPOLATE;
	vec3.set(ps.viewangles, es.apos.trBase);

	es.angles2[QMath.YAW] = ps.movementDir;
	es.legsAnim = ps.legsAnim;
	es.torsoAnim = ps.torsoAnim;
	es.clientNum = ps.clientNum;                  // ET_PLAYER looks here instead of at number
	                                              // so corpses can also reference the proper config
	es.eFlags = ps.eFlags;
	if (ps.stats[STAT.HEALTH] <= 0) {
		es.eFlags |= EF.DEAD;
	} else {
		es.eFlags &= ~EF.DEAD;
	}

	if (ps.externalEvent) {
		es.event = ps.externalEvent;
		es.eventParm = ps.externalEventParm;
	} else if (ps.entityEventSequence < ps.eventSequence) {
		if (ps.entityEventSequence < ps.eventSequence - QS.MAX_PS_EVENTS) {
			ps.entityEventSequence = ps.eventSequence - QS.MAX_PS_EVENTS;
		}
		var seq = ps.entityEventSequence % QS.MAX_PS_EVENTS;
		es.event = ps.events[seq] | ((ps.entityEventSequence & 3) << 8);
		es.eventParm = ps.eventParms[seq];
		ps.entityEventSequence++;
	}

	es.weapon = ps.weapon;
	es.groundEntityNum = ps.groundEntityNum;

	es.powerups = 0;
	for (var i = 0; i < QS.MAX_POWERUPS; i++) {
		if (ps.powerups[i]) {
			es.powerups |= 1 << i;
		}
	}

	es.loopSound = ps.loopSound;
	es.generic1 = ps.generic1;
}

/**
 * EvaluateTrajectory
 */
function EvaluateTrajectory(tr, atTime, result) {
	var deltaTime;
	var phase;

	switch (tr.trType) {
		case QS.TR.STATIONARY:
		case QS.TR.INTERPOLATE:
			vec3.set(tr.trBase, result);
			break;

		case QS.TR.LINEAR:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, vec3.create()), result);
			break;

		case QS.TR.SINE:
			deltaTime = (atTime - tr.trTime) / tr.trDuration;
			phase = Math.sin(deltaTime * Math.PI * 2);
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, phase, vec3.create()), result);
			break;

		case QS.TR.LINEAR_STOP:
			if (atTime > tr.trTime + tr.trDuration) {
				atTime = tr.trTime + tr.trDuration;
			}
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			if (deltaTime < 0) {
				deltaTime = 0;
			}
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, vec3.create()), result);
			break;

		case QS.TR.GRAVITY:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, vec3.create()), result);
			result[2] -= 0.5 * DEFAULT_GRAVITY * deltaTime * deltaTime;  // FIXME: local gravity...
			break;

		default:
			error('EvaluateTrajectory: unknown trType: ' + tr.trType);
			break;
	}
}

/**
 * EvaluateTrajectoryDelta
 *
 * For determining velocity at a given time
 */
function EvaluateTrajectoryDelta(tr, atTime, result) {
	var deltaTime;
	var phase;

	switch (tr.trType) {
		case QS.TR.STATIONARY:
		case QS.TR.INTERPOLATE:
			result[0] = result[1] = result[2] = 0;
			break;
		case QS.TR.LINEAR:
			vec3.set(tr.trDelta, result);
			break;
		case QS.TR.SINE:
			deltaTime = (atTime - tr.trTime) / tr.trDuration;
			phase = Math.cos(deltaTime * Math.PI * 2);  // derivative of sin = cos
			phase *= 0.5;
			vec3.scale(tr.trDelta, phase, result);
			break;
		case QS.TR.LINEAR_STOP:
			if (atTime > tr.trTime + tr.trDuration) {
				result[0] = result[1] = result[2] = 0;
				return;
			}
			vec3.set(tr.trDelta, result);
			break;
		case QS.TR.GRAVITY:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.set(tr.trDelta, result);
			result[2] -= DEFAULT_GRAVITY * deltaTime;  // FIXME: local gravity...
			break;
		default:
			error('EvaluateTrajectoryDelta: unknown trType: ' + tr.trType);
			break;
	}
}

/**
 * TouchJumpPad
 */
function TouchJumpPad(ps, jumppad) {
	// Spectators don't use jump pads.
	if (ps.pm_type !== PM.NORMAL) {
		return;
	}

	// Flying characters don't hit bounce pads.
	if (ps.powerups[PW.FLIGHT]) {
		return;
	}

	// If we didn't hit this same jumppad the previous frame
	// then don't play the event sound again if we are in a fat trigger
	if (ps.jumppad_ent !== jumppad.number) {
		var angles = vec3.create();
		QMath.VectorToAngles(jumppad.origin2, angles);

		var p = Math.abs(QMath.AngleNormalize180(angles[QMath.PITCH]));
		var effectNum = p < 45 ? 0 : 1;

		AddPredictableEventToPlayerstate(ps, EV.JUMP_PAD, effectNum);
	}

	// remember hitting this jumppad this frame
	ps.jumppad_ent = jumppad.number;
	ps.jumppad_frame = ps.pmove_framecount;

	// give the player the velocity from the jumppad
	vec3.set(jumppad.origin2, ps.velocity);
}

/**
 * CanItemBeGrabbed
 *
 * Returns false if the item should not be picked up.
 * This needs to be the same for client side prediction and server use.
 */
function CanItemBeGrabbed(gametype, ent, ps) {
	if (ent.modelIndex < 1 || ent.modelIndex >= itemList.length) {
		error('CanItemBeGrabbed: index out of range');
	}

	var item = itemList[ent.modelIndex];

	switch (item.giType) {
		case IT.WEAPON:
			return true;  // weapons are always picked up

		case IT.AMMO:
			if (ps.ammo[ item.giTag ] >= 200) {
				return false;  // can't hold any more
			}
			return true;

		case IT.ARMOR:
			if (ps.stats[STAT.ARMOR] >= ps.stats[STAT.MAX_HEALTH] * 2) {
				return false;
			}

			return true;

		case IT.HEALTH:
			// Small and mega healths will go over the max, otherwise
			// don't pick up if already at max.
			if (item.quantity == 5 || item.quantity == 100) {
				if (ps.stats[STAT.HEALTH] >= ps.stats[STAT.MAX_HEALTH] * 2) {
					return false;
				}

				return true;
			}
			if (ps.stats[STAT.HEALTH] >= ps.stats[STAT.MAX_HEALTH]) {
				return false;
			}
			return true;

		case IT.POWERUP:
			return true;	// powerups are always picked up

		case IT.TEAM: // team items, such as flags
			if(gametype == GT.CTF) {
				// ent.modelIndex2 is non-zero on items if they are dropped
				// we need to know this because we can pick up our dropped flag (and return it)
				// but we can't pick up our flag at base
				if (ps.persistant[PERS.TEAM] == TEAM.RED) {
					if (item.giTag == PW.BLUEFLAG || (item.giTag == PW.REDFLAG && ent.modelIndex2) || (item.giTag == PW.REDFLAG && ps.powerups[PW.BLUEFLAG])) {
						return true;
					}
				} else if (ps.persistant[PERS.TEAM] == TEAM.BLUE) {
					if (item.giTag == PW.REDFLAG || (item.giTag == PW.BLUEFLAG && ent.modelIndex2) || (item.giTag == PW.BLUEFLAG && ps.powerups[PW.REDFLAG])) {
						return true;
					}
				}
			}

			return false;

		case IT.HOLDABLE:
			// Can only hold one item at a time
			if (ps.stats[STAT.HOLDABLE_ITEM]) {
				return false;
			}
			return true;

		case IT.BAD:
			error('CanItemBeGrabbed: IT.BAD');
			return false;

		default:
			break;
	}

	return false;
}

/**
 * PlayerTouchesItem
 *
 * Items can be picked up without actually touching their physical bounds to make
 * grabbing them easier.
 */
function PlayerTouchesItem(ps, item, atTime) {
	var origin = vec3.create();

	EvaluateTrajectory(item.pos, atTime, origin);

	// We are ignoring ducked differences here.
	if (ps.origin[0] - origin[0] > 44 ||
		ps.origin[0] - origin[0] < -50 ||
		ps.origin[1] - origin[1] > 36 ||
		ps.origin[1] - origin[1] < -36 ||
		ps.origin[2] - origin[2] > 36 ||
		ps.origin[2] - origin[2] < -36) {
		return false;
	}

	return true;
}

/**
 * GetWaterLevel
 *
 * Get the waterlevel, accounting for ducking.
 */
function GetWaterLevel(origin, viewheight, passEntityNum, pointContents) {
	var waterlevel = 0;

	var point = vec3.create(origin);
	point[2] += MINS_Z + 1;

	var contents = pointContents(point, passEntityNum);

	if (contents & MASK.WATER) {
		var sample2 = viewheight - MINS_Z;
		var sample1 = sample2 / 2;

		waterlevel = 1;

		point[2] = origin[2] + MINS_Z + sample1;
		contents = pointContents(point, passEntityNum);

		if (contents & MASK.WATER) {
			waterlevel = 2;

			point[2] = origin[2] + MINS_Z + sample2;
			contents = pointContents(point, passEntityNum);

			if (contents & MASK.WATER) {
				waterlevel = 3;
			}
		}
	}

	return waterlevel;
}
		var pml = new PmoveLocals();
var pm = null;  // current pmove

var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var TIMER_LAND = 130;
var OVERCLIP = 1.001;

// Movement parameters.
var pm_stopspeed = 100;
var pm_duckScale = 0.25;
var pm_swimScale = 0.50;

var pm_accelerate = 10.0;
var pm_airaccelerate = 1.0;
var pm_wateraccelerate = 4.0;
var pm_flyaccelerate = 8.0;

var pm_friction = 6.0;
var pm_waterfriction = 1.0;
var pm_flightfriction = 3.0;
var pm_spectatorfriction = 5.0;

var pm_jumpvelocity = 270;
var pm_doublejumpvelocity = 100;

/**
 * Pmove
 */
function Pmove(pmove) {
	var ps = pmove.ps;
	var cmd = pmove.cmd;

	var finalTime = cmd.serverTime;

	if (finalTime < ps.commandTime) {
		// error('Pmove: cmd.serverTime < ps.commandTime', cmd.serverTime, ps.commandTime);
		return;  // should not happen
	}

	if (finalTime > ps.commandTime + 1000) {
		ps.commandTime = finalTime - 1000;
	}

	ps.pmove_framecount = (ps.pmove_framecount+1) & ((1<<QS.PMOVEFRAMECOUNTBITS)-1);

	// Chop the move up if it is too long, to prevent framerate
	// dependent behavior.
	while (ps.commandTime !== finalTime) {
		var msec = finalTime - ps.commandTime;

		if (pmove.pmove_fixed) {
			if (msec > pmove.pmove_msec) {
				msec = pmove.pmove_msec;
			}
		} else {
			if (msec > 66) {
				msec = 66;
			}
		}
		cmd.serverTime = ps.commandTime + msec;

		PmoveSingle(pmove);

		if (pmove.ps.pm_flags & PMF.JUMP_HELD) {
			pmove.cmd.upmove = 20;
		}
	}
}

/**
 * PmoveSingle
 */
function PmoveSingle(pmove) {
	pm = pmove;

	var ps = pm.ps;
	var cmd = pm.cmd;

	// Clear all pmove local vars.
	pml.reset();

	// Determine the time.
	pml.msec = cmd.serverTime - ps.commandTime;
	if (pml.msec < 1) {
		pml.msec = 1;
	} else if (pml.msec > 200) {
		pml.msec = 200;
	}
	ps.commandTime = cmd.serverTime;
	pml.frameTime = pml.msec * 0.001;

	// Make sure walking button is clear if they are running, to avoid
	// proxy no-footsteps cheats.
	if (Math.abs(cmd.forwardmove) > 64 || Math.abs(cmd.rightmove) > 64) {
		cmd.buttons &= ~QS.BUTTON.WALKING;
	}

	// Set the firing flag for continuous beam weapons.
	if (!(ps.pm_flags & PMF.RESPAWNED) && !(ps.pm_flags & PMF.NO_ATTACK) &&
	    ps.pm_type !== PM.INTERMISSION && ps.pm_type !== PM.NOCLIP &&
	    (cmd.buttons & QS.BUTTON.ATTACK) && ps.ammo[ps.weapon]) {
		ps.eFlags |= EF.FIRING;
	} else {
		ps.eFlags &= ~EF.FIRING;
	}

	// Clear the respawned flag if attack and use are cleared.
	if (ps.stats[STAT.HEALTH] > 0 && !(cmd.buttons & (QS.BUTTON.ATTACK | QS.BUTTON.USE_HOLDABLE))) {
		ps.pm_flags &= ~PMF.RESPAWNED;
	}

	// Save old velocity for crashlanding.
	vec3.set(ps.origin, pml.previous_origin);
	vec3.set(ps.velocity, pml.previous_velocity);

	// Update our view angles.
	UpdateViewAngles(ps, cmd);
	QMath.AnglesToVectors(ps.viewangles, pml.forward, pml.right, pml.up);

	// Make sure walking button is clear if they are running, to avoid
	// proxy no-footsteps cheats.
	if (Math.abs(cmd.forwardmove) > 64 || Math.abs(cmd.rightmove) > 64) {
		cmd.buttons &= ~QS.BUTTON.WALKING;
	}

	if (pm.cmd.upmove < 10) {
		// Not holding jump.
		ps.pm_flags &= ~PMF.JUMP_HELD;
	}

	// Decide if backpedaling animations should be used
	if (cmd.forwardmove < 0) {
		ps.pm_flags |= PMF.BACKWARDS_RUN;
	} else if (pm.cmd.forwardmove > 0 || (cmd.forwardmove === 0 && cmd.rightmove)) {
		ps.pm_flags &= ~PMF.BACKWARDS_RUN;
	}

	if (ps.pm_type >= PM.DEAD) {
		cmd.forwardmove = 0;
		cmd.rightmove = 0;
		cmd.upmove = 0;
	}

	if (pm.ps.pm_type === PM.SPECTATOR) {
		CheckDuck();
		FlyMove();
		DropTimers();
		return;
	}

	if (pm.ps.pm_type === PM.NOCLIP) {
		NoclipMove();
		DropTimers();
		return;
	}

	// if (pm.ps.pm_type == PM_FREEZE) {
	// 	return;		// no movement at all
	// }

	if (pm.ps.pm_type === PM.INTERMISSION || pm.ps.pm_type === PM.SPINTERMISSION) {
		return;  // no movement at all
	}

	// Set watertype, and waterlevel.
	SetWaterLevel();
	pml.previous_waterlevel = pm.waterlevel;

	// Set mins, maxs and viewheight.
	CheckDuck();

	// Set ground entity.
	GroundTrace();

	if (ps.pm_type === PM.DEAD) {
		DeadMove();
	}

	// Kill animation timers.
	DropTimers();

	if (ps.pm_flags & PMF.TIME_WATERJUMP) {
		WaterJumpMove();
	} else if (pm.waterlevel > 1) {
		// Swimming.
		WaterMove();
	} else if (pml.walking) {
		WalkMove();
	} else {
		AirMove();
	}

	// Set groundtype and waterlevel post-move.
	GroundTrace();
	SetWaterLevel();

	// Weapons.
	UpdateWeapon();

	// Torso animations.
	TorsoAnimation();

	// Footstep events / legs animations.
	FootstepEvents();

	// Entering / leaving water splashes.
	WaterEvents();

	// Snap some parts of playerstate to save network bandwidth.
	// NOTE This is necessary to enable jumps such as the mega jump in dm13.
	QMath.SnapVector(ps.velocity);

	pm = null;
}

/**
 * CmdScale
 *
 * Returns the scale factor to apply to cmd movements
 * This allows the clients to use axial -127 to 127 values for all directions
 * without getting a sqrt(2) distortion in speed.
 */
function CmdScale(cmd, speed) {
	var max = Math.abs(cmd.forwardmove);
	if (Math.abs(cmd.rightmove) > max) {
		max = Math.abs(cmd.rightmove);
	}
	if (Math.abs(cmd.upmove) > max) {
		max = Math.abs(cmd.upmove);
	}
	if (!max) {
		return 0;
	}

	var total = Math.sqrt(cmd.forwardmove * cmd.forwardmove + cmd.rightmove * cmd.rightmove + cmd.upmove * cmd.upmove);
	var scale = speed * max / (127.0 * total);

	return scale;
}

/**
 * SetWaterLevel
 *
 * Get waterlevel, accounting for ducking.
 * FIXME: avoid this twice?  certainly if not moving
 */
function SetWaterLevel() {
	var ps = pm.ps;

	pm.waterlevel = GetWaterLevel(ps.origin, ps.viewheight, ps.clientNum, pm.pointContents);

	var point = vec3.createFrom(ps.origin[0], ps.origin[1], ps.origin[2] + MINS_Z + 1);
	var contents = pm.pointContents(point, -1);
	if (contents & MASK.WATER) {
		pm.watertype = contents;
	} else {
		pm.watertype = 0;
	}
}

/**
 * CheckDuck
 */
function CheckDuck() {
	var ps = pm.ps;
	var trace = new QS.TraceResults();

	pm.mins[0] = -15;
	pm.mins[1] = -15;

	pm.maxs[0] = 15;
	pm.maxs[1] = 15;

	pm.mins[2] = MINS_Z;

	if (pm.pm_type === PM.DEAD) {
		pm.maxs[2] = -8;
		ps.viewheight = DEAD_VIEWHEIGHT;
		return;
	}

	if (pm.cmd.upmove < 0) {
		// Duck.
		ps.pm_flags |= PMF.DUCKED;
	} else {
		// Stand up if possible.
		if (ps.pm_flags & PMF.DUCKED) {
			// Try to stand up.
			pm.maxs[2] = 32;
			pm.trace(trace, ps.origin, ps.origin, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
			if (!trace.allSolid) {
				ps.pm_flags &= ~PMF.DUCKED;
			}
		}
	}

	if (ps.pm_flags & PMF.DUCKED) {
		pm.maxs[2] = 16;
		ps.viewheight = CROUCH_VIEWHEIGHT;
	} else {
		pm.maxs[2] = 32;
		ps.viewheight = DEFAULT_VIEWHEIGHT;
	}
}

/**
 * CheckJump
 */
function CheckJump() {
	var ps = pm.ps;

	if (pm.cmd.upmove < 10) {
		// Not holding jump.
		return false;
	}

	// Must wait for jump to be released.
	if (ps.pm_flags & PMF.JUMP_HELD) {
		// Clear upmove so cmdscale doesn't lower running speed.
		pm.cmd.upmove = 0;
		return false;
	}

	pml.groundPlane = false;  // jumping away
	pml.walking = false;
	ps.pm_flags |= PMF.JUMP_HELD;

	ps.groundEntityNum = QS.ENTITYNUM_NONE;
	ps.velocity[2] = pm_jumpvelocity;
	if (false) {
		if (ps.stats[STAT.JUMPTIME] > 0) {
			ps.velocity[2] += pm_doublejumpvelocity;
		}

		ps.stats[STAT.JUMPTIME] = 400;
	}
	AddEvent(EV.JUMP);

	if (pm.cmd.forwardmove >= 0) {
		ForceLegsAnim(ANIM.LEGS_JUMP);
		ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
	} else {
		ForceLegsAnim(ANIM.LEGS_JUMPB);
		ps.pm_flags |= PMF.BACKWARDS_JUMP;
	}

	return true;
}

/**
 * GroundTrace
 */
function GroundTrace() {
	var ps = pm.ps;
	var trace = new QS.TraceResults();

	var point = vec3.createFrom(ps.origin[0], ps.origin[1], ps.origin[2] - 0.25);
	pm.trace(trace, ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

	pml.groundTrace = trace;

	// Do something corrective if the trace starts in a solid.
	if (trace.allSolid) {
		// This will nudge us around and, if successful, copy its
		// new successful trace results into ours.
		if (!CorrectAllSolid(trace)) {
			return;
		}
	}

	// If the trace didn't hit anything, we are in free fall.
	if (trace.fraction === 1.0) {
		GroundTraceMissed();
		return;
	}

	// Check if getting thrown off the ground.
	if (ps.velocity[2] > 0 && vec3.dot(ps.velocity, trace.plane.normal) > 10 ) {
		// Go into jump animation.
		if (pm.cmd.forwardmove >= 0) {
			ForceLegsAnim(ANIM.LEGS_JUMP);
			ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
		} else {
			ForceLegsAnim(ANIM.LEGS_JUMPB);
			ps.pm_flags |= PMF.BACKWARDS_JUMP;
		}

		ps.groundEntityNum = QS.ENTITYNUM_NONE;
		pml.groundPlane = false;
		pml.walking = false;

		return;
	}

	if (trace.plane.normal[2] < MIN_WALK_NORMAL) {
		ps.groundEntityNum = QS.ENTITYNUM_NONE;
		pml.groundPlane = true;
		pml.walking = false;

		return;
	}

	pml.groundPlane = true;
	pml.walking = true;

	// Hitting solid ground will end a waterjump.
	if (ps.pm_flags & PMF.TIME_WATERJUMP) {
		ps.pm_flags &= ~(PMF.TIME_WATERJUMP | PMF.TIME_LAND);
		ps.pm_time = 0;
	}

	if (ps.groundEntityNum === QS.ENTITYNUM_NONE) {
		CrashLand();

		// Don't do landing time if we were just going down a slope.
		if (pml.previous_velocity[2] < -200) {
			// Don't allow another jump for a little while.
			ps.pm_flags |= PMF.TIME_LAND;
			ps.pm_time = 250;
		}
	}

	// Set new groundEntityNum after crashland check.
	ps.groundEntityNum = trace.entityNum;

	AddTouchEnt(trace.entityNum);
}

/**
 * CheckWaterJump
 */
function CheckWaterJump() {
	var ps = pm.ps;

	if (ps.pm_time) {
		return false;
	}

	// Check for water jump.
	if (pm.waterlevel !== 2) {
		return false;
	}

	var flatforward = vec3.createFrom(pml.forward[0], pml.forward[1], 0);
	vec3.normalize(flatforward);

	var spot = vec3.add(vec3.scale(flatforward, 30, vec3.create()), ps.origin);
	spot[2] += 4;

	var contents = pm.pointContents(spot, ps.clientNum);
	if (!(contents & SURF.CONTENTS.SOLID)) {
		return false;
	}

	spot[2] += 16;
	contents = pm.pointContents(spot, ps.clientNum);
	if (contents & (SURF.CONTENTS.SOLID | SURF.CONTENTS.PLAYERCLIP | SURF.CONTENTS.BODY)) {
		return false;
	}

	// Jump out of water.
	vec3.scale(pml.forward, 200, ps.velocity);
	ps.velocity[2] = 350;

	ps.pm_flags |= PMF.TIME_WATERJUMP;
	ps.pm_time = 2000;

	return true;
}

/**
 * CorrectAllSolid
 */
function CorrectAllSolid(results) {
	var ps = pm.ps;
	var point = vec3.create();
	var trace = new QS.TraceResults();

	// Jitter around.
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			for (var k = -1; k <= 1; k++) {
				vec3.set(ps.origin, point);
				point[0] += i;
				point[1] += j;
				point[2] += k;

				pm.trace(trace, point, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

				if (!trace.allSolid) {
					// Copy the results back into the original so GroundTrace can carry on.
					trace.clone(results);

					return true;
				}
			}
		}
	}

	ps.groundEntityNum = QS.ENTITYNUM_NONE;
	pml.groundPlane = false;
	pml.walking = false;

	return false;
}

/**
 * GroundTraceMissed
 */
function GroundTraceMissed() {
	var ps = pm.ps;
	var trace = new QS.TraceResults();

	if (ps.groundEntityNum !== QS.ENTITYNUM_NONE) {
		// If they aren't in a jumping animation and the ground is a ways away, force into it.
		// If we didn't do the trace, the player would be backflipping down staircases.
		var point = vec3.create(ps.origin);
		point[2] -= 64;

		pm.trace(trace, ps.origin, point, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
		if (trace.fraction === 1.0) {
			if (pm.cmd.forwardmove >= 0) {
				ForceLegsAnim(ANIM.LEGS_JUMP);
				ps.pm_flags &= ~PMF.BACKWARDS_JUMP;
			} else {
				ForceLegsAnim(ANIM.LEGS_JUMPB);
				ps.pm_flags |= PMF.BACKWARDS_JUMP;
			}
		}
	}

	ps.groundEntityNum = QS.ENTITYNUM_NONE;
	pml.groundPlane = false;
	pml.walking = false;
}

/**
 * DeadMove
 */
function DeadMove() {
	if (!pml.walking) {
		return;
	}

	var ps = pm.ps;

	// Extra friction.
	var speed = vec3.length(ps.velocity);
	speed -= 20;
	if (speed <= 0) {
		ps.velocity[0] = ps.velocity[1] = ps.velocity[2] = 0;
	} else {
		vec3.normalize(ps.velocity);
		vec3.scale(ps.velocity, speed);
	}
}

/**
 * FlyMove
 */
function FlyMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	// normal slowdown
	Friction(true);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	for (var i = 0; i < 3; i++) {
		wishvel[i] = scale * pml.forward[i]*cmd.forwardmove + scale * pml.right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, vec3.create());

	Accelerate(wishdir, wishspeed, pm_flyaccelerate);
	StepSlideMove(false);
}

/**
 * NoclipMove
 */
function NoclipMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	ps.viewheight = DEFAULT_VIEWHEIGHT;

	// Friction.
	var speed = vec3.length(ps.velocity);

	if (speed < 1) {
		vec3.set(QMath.vec3origin, ps.velocity);
	} else {
		var friction = pm_friction * 1.5;  // extra friction
		var control = speed < pm_stopspeed ? pm_stopspeed : speed;
		var drop = control * friction * pml.frameTime;

		// Scale the velocity.
		var newspeed = speed - drop;
		if (newspeed < 0) {
			newspeed = 0;
		}
		newspeed /= speed;

		vec3.scale(ps.velocity, newspeed);
	}

	// Accelerate.
	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	for (var i = 0 ; i < 3 ; i++) {
		wishvel[i] = pml.forward[i]*cmd.forwardmove + pml.right[i]*cmd.rightmove;
	}
	wishvel[2] += cmd.upmove;
	var wishspeed = vec3.length(wishvel) * scale;
	var wishdir = vec3.normalize(wishvel, vec3.create());

	Accelerate(wishdir, wishspeed, pm_accelerate);

	// Move.
	vec3.add(ps.origin, vec3.scale(ps.velocity, pml.frameTime, vec3.create()));
}

/**
 * AirMove
 */
function AirMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	Friction();

	// Set the movementDir so clients can rotate the legs for strafing.
	SetMovementDir();

	// project moves down to flat plane
	pml.forward[2] = 0;
	pml.right[2] = 0;
	vec3.normalize(pml.forward);
	vec3.normalize(pml.right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	for (var i = 0; i < 2 ; i++) {
		wishvel[i] = pml.forward[i]*cmd.forwardmove + pml.right[i]*cmd.rightmove;
	}
	wishvel[2] = 0;
	var wishdir = vec3.normalize(wishvel, vec3.create());
	var wishspeed = vec3.length(wishvel) * scale;

	// Not on ground, so little effect on velocity.
	Accelerate(wishdir, wishspeed, pm_airaccelerate);

	// We may have a ground plane that is very steep, even though
	// we don't have a groundentity. Slide along the steep plane.
	if (pml.groundPlane) {
		ps.velocity = ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, OVERCLIP);
	}

	StepSlideMove(true);
}

/**
 * WaterMove
 */
function WaterMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	if (CheckWaterJump()) {
		WaterJumpMove();
		return;
	}

	Friction();

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	if (!scale) {
		wishvel[0] = 0;
		wishvel[1] = 0;
		wishvel[2] = -60;  // sink towards bottom
	} else {
		for (var i = 0; i < 3 ; i++) {
			wishvel[i] = pml.forward[i] * cmd.forwardmove + pml.right[i] * cmd.rightmove;
		}
		wishvel[2] += scale * pm.cmd.upmove;
	}

	var wishdir = vec3.normalize(wishvel, vec3.create());
	var wishspeed = vec3.length(wishvel);

	if (wishspeed > ps.speed * pm_swimScale) {
		wishspeed = ps.speed * pm_swimScale;
	}

	Accelerate(wishdir, wishspeed, pm_wateraccelerate);

	// Make sure we can go up slopes easily under water.
	if (pml.groundPlane && vec3.dot(ps.velocity, pml.groundTrace.plane.normal) < 0) {
		var vel = vec3.length(ps.velocity);

		// Slide along the ground plane.
		ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, ps.velocity, OVERCLIP);

		vec3.normalize(ps.velocity);
		vec3.scale(ps.velocity, vel);
	}

	SlideMove(false);
}

/**
 * WaterJumpMove
 */
function WaterJumpMove() {
	var ps = pm.ps;

	// Waterjump has no control, but falls.
	StepSlideMove(true);

	ps.velocity[2] -= ps.gravity * pml.frameTime;
	if (ps.velocity[2] < 0) {
		// Cancel as soon as we are falling down again.
		ps.pm_flags &= ~PMF.ALL_TIMES;
		ps.pm_time = 0;
	}
}

/**
 * WalkMove
 */
function WalkMove() {
	var ps = pm.ps;
	var cmd = pm.cmd;

	if (CheckJump()) {
		AirMove();
		return;
	}

	Friction();

	// Set the movementDir so clients can rotate the legs for strafing.
	SetMovementDir();

	// Project moves down to flat plane.
	pml.forward[2] = 0;
	pml.right[2] = 0;

	// Project the forward and right directions onto the ground plane.
	pml.forward = ClipVelocity(pml.forward, pml.groundTrace.plane.normal, OVERCLIP);
	pml.right = ClipVelocity(pml.right, pml.groundTrace.plane.normal, OVERCLIP);
	vec3.normalize(pml.forward);
	vec3.normalize(pml.right);

	var scale = CmdScale(cmd, ps.speed);
	var wishvel = vec3.create();
	for (var i = 0 ; i < 3 ; i++ ) {
		wishvel[i] = pml.forward[i]*cmd.forwardmove + pml.right[i]*cmd.rightmove;
	}
	var wishspeed = vec3.length(wishvel);
	var wishdir = vec3.normalize(wishvel, vec3.create());
	wishspeed *= scale;

	// Clamp the speed lower if ducking.
	if (ps.pm_flags & PMF.DUCKED) {
		if (wishspeed > ps.speed * pm_duckScale ) {
			wishspeed = ps.speed * pm_duckScale;
		}
	}

	// Clamp the speed lower if wading or walking on the bottom.
	if (pm.waterlevel) {
		var waterScale = pm.waterlevel / 3.0;
		waterScale = 1.0 - (1.0 - pm_swimScale) * waterScale;
		if (wishspeed > ps.speed * waterScale) {
			wishspeed = ps.speed * waterScale;
		}
	}

	// When a player gets hit, they temporarily lose
	// full control, which allows them to be moved a bit.
	var accelerate = pm_accelerate;

	if ((pml.groundTrace.surfaceFlags & SURF.FLAGS.SLICK) || (ps.pm_flags & PMF.TIME_KNOCKBACK)) {
		accelerate = pm_airaccelerate;
	}

	Accelerate(wishdir, wishspeed, accelerate);

	if ((pml.groundTrace.surfaceFlags & SURF.FLAGS.SLICK) || (ps.pm_flags & PMF.TIME_KNOCKBACK)) {
		ps.velocity[2] -= ps.gravity * pml.frameTime;
	}

	var vel = vec3.length(ps.velocity);

	// Slide along the ground plane.
	ps.velocity = ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, OVERCLIP);

	// Don't decrease velocity when going up or down a slope.
	vec3.normalize(ps.velocity);
	vec3.scale(ps.velocity, vel);

	// Don't do anything if standing still.
	if (!ps.velocity[0] && !ps.velocity[1]) {
		return;
	}

	StepSlideMove(false);
}

/**
 * SetMovementDir
 *
 * Determine the rotation of the legs relative
 * to the facing dir
 */
function SetMovementDir() {
	var ps = pm.ps;

	if (pm.cmd.forwardmove || pm.cmd.rightmove) {
		if (pm.cmd.rightmove === 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 0;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 1;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove === 0) {
			ps.movementDir = 2;
		} else if (pm.cmd.rightmove < 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 3;
		} else if (pm.cmd.rightmove === 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 4;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove < 0) {
			ps.movementDir = 5;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove === 0) {
			ps.movementDir = 6;
		} else if (pm.cmd.rightmove > 0 && pm.cmd.forwardmove > 0) {
			ps.movementDir = 7;
		}
	} else {
		// If they aren't actively going directly sideways,
		// change the animation to the diagonal so they
		// don't stop too crooked.
		if (ps.movementDir === 2) {
			ps.movementDir = 1;
		} else if (ps.movementDir === 6) {
			ps.movementDir = 7;
		}
	}
}

/**
 * Friction
 */
function Friction(flying) {
	var ps = pm.ps;

	var vec = vec3.create(ps.velocity);
	if (pml.walking) {
		vec[2] = 0;	// ignore slope movement
	}

	var speed = vec3.length(vec);
	if (speed < 1) {
		ps.velocity[0] = 0;
		ps.velocity[1] = 0; // allow sinking underwater
		// FIXME: still have z friction underwater?
		return;
	}

	var drop = 0;

	// Apply ground friction.
	if (pm.waterlevel <= 1) {
		if (pml.walking && !(pml.groundTrace.surfaceFlags & SURF.FLAGS.SLICK)) {
			// If getting knocked back, no friction.
			if (!(ps.pm_flags & PMF.TIME_KNOCKBACK)) {
				var control = speed < pm_stopspeed ? pm_stopspeed : speed;
				drop += control * pm_friction * pml.frameTime;
			}
		}
	}

	// Apply water friction even if just wading.
	if (pm.waterlevel) {
		drop += speed * pm_waterfriction * pm.waterlevel * pml.frameTime;
	}

	if (flying) {
		drop += speed * pm_flightfriction * pml.frameTime;
	}

	var newspeed = speed - drop;
	if (newspeed < 0) {
		newspeed = 0;
	}
	newspeed /= speed;

	vec3.scale(ps.velocity, newspeed);
}

/**
 * Accelerate
 */
function Accelerate(wishdir, wishspeed, accel) {
	var ps = pm.ps;
	var currentspeed = vec3.dot(ps.velocity, wishdir);
	var addspeed = wishspeed - currentspeed;

	if (addspeed <= 0) {
		return;
	}

	var accelspeed = accel * pml.frameTime * wishspeed;

	if (accelspeed > addspeed) {
		accelspeed = addspeed;
	}

	vec3.add(ps.velocity, vec3.scale(wishdir, accelspeed, vec3.create()));
}

/**
 * ClipVelocity
 */
function ClipVelocity(vel, normal, overbounce) {
	var backoff = vec3.dot(vel, normal);

	if (backoff < 0) {
		backoff *= overbounce;
	} else {
		backoff /= overbounce;
	}

	var change = vec3.scale(normal, backoff, vec3.create());
	return vec3.subtract(vel, change, vec3.create());
}

/**
 * SlideMove
 */
function SlideMove(gravity) {
	var ps = pm.ps;
	var endVelocity = vec3.create();
	var time_left = pml.frameTime;
	var planes = [];
	var numbumps = 4;
	var end = vec3.create();
	var trace = new QS.TraceResults();

	if (gravity) {
		vec3.set(ps.velocity, endVelocity);
		endVelocity[2] -= ps.gravity * time_left;
		ps.velocity[2] = (ps.velocity[2] + endVelocity[2]) * 0.5;

		if (pml.groundPlane) {
			// Slide along the ground plane.
			ps.velocity = ClipVelocity(ps.velocity, pml.groundTrace.plane.normal, OVERCLIP);
		}
	}

	// Never turn against the ground plane.
	if (pml.groundPlane) {
		planes.push(vec3.set(pml.groundTrace.plane.normal, vec3.create()));
	}

	// Never turn against original velocity.
	planes.push(vec3.normalize(ps.velocity, vec3.create()));

	for (var bumpcount = 0; bumpcount < numbumps; bumpcount++) {
		// Calculate position we are trying to move to.
		vec3.add(ps.origin, vec3.scale(ps.velocity, time_left, vec3.create()), end);

		// See if we can make it there.
		pm.trace(trace, ps.origin, end, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);

		if (trace.allSolid) {
			// Entity is completely trapped in another solid.
			ps.velocity[2] = 0; // don't build up falling damage, but allow sideways acceleration
			return false;
		}

		if (trace.fraction > 0) {
			// Actually covered some distance.
			vec3.set(trace.endPos, ps.origin);
		}

		if (trace.fraction === 1) {
			 break;  // moved the entire distance
		}

		// Save entity for contact.
		AddTouchEnt(trace.entityNum);

		time_left -= time_left * trace.fraction;

		if (planes.length >= MAX_CLIP_PLANES) {
			// this shouldn't really happen
			ps.velocity = vec3.create();
			return false;
		}

		//
		// If this is the same plane we hit before, nudge velocity
		// out along it, which fixes some epsilon issues with
		// non-axial planes.
		//
		for (var i = 0; i < planes.length; i++) {
			if (vec3.dot(trace.plane.normal, planes[i]) > 0.99) {
				vec3.add(ps.velocity, trace.plane.normal);
				break;
			}
		}
		if (i < planes.length) {
			continue;
		}
		planes.push(vec3.set(trace.plane.normal, vec3.create()));

		//
		// Modify velocity so it parallels all of the clip planes.
		//

		// Find a plane that it enters.
		for (var i = 0; i < planes.length; ++i) {
			var into = vec3.dot(ps.velocity, planes[i]);
			if (into >= 0.1) {
				continue;  // move doesn't interact with the plane
			}

			// Slide along the plane.
			var clipVelocity = ClipVelocity(ps.velocity, planes[i], OVERCLIP);
			var endClipVelocity = ClipVelocity(endVelocity, planes[i], OVERCLIP);

			// See if there is a second plane that the new move enters.
			for (var j = 0; j < planes.length; j++) {
				if (j === i) {
					continue;
				}
				if (vec3.dot(clipVelocity, planes[j]) >= 0.1) {
					continue;  // move doesn't interact with the plane
				}

				// Try clipping the move to the plane.
				clipVelocity = ClipVelocity(clipVelocity, planes[j], OVERCLIP);
				endClipVelocity = ClipVelocity(endClipVelocity, planes[j], OVERCLIP);

				// See if it goes back into the first clip plane.
				if (vec3.dot(clipVelocity, planes[i]) >= 0) {
					continue;
				}

				// Slide the original velocity along the crease.
				var dir = vec3.cross(planes[i], planes[j], vec3.create());
				vec3.normalize(dir);
				var d = vec3.dot(dir, ps.velocity);
				vec3.scale(dir, d, clipVelocity);

				vec3.cross(planes[i], planes[j], dir);
				vec3.normalize(dir);
				d = vec3.dot(dir, endVelocity);
				vec3.scale(dir, d, endClipVelocity);

				// See if there is a third plane the the new move enters.
				for (var k = 0; k < planes.length; k++) {
					if ( k == i || k == j ) {
						continue;
					}
					if (vec3.dot(clipVelocity, planes[k]) >= 0.1) {
						continue;  // move doesn't interact with the plane
					}
					// Stop dead at a tripple plane interaction.
					ps.velocity = vec3.create();
					return false;
				}
			}

			// If we have fixed all interactions, try another move.
			vec3.set(clipVelocity, ps.velocity);
			vec3.set(endClipVelocity, endVelocity);
			break;
		}
	}

	if (gravity) {
		vec3.set(endVelocity, ps.velocity);
	}

	return bumpcount === 0;
}

/**
 * StepSlideMove
 */
function StepSlideMove(gravity) {
	var ps = pm.ps;
	var trace = new QS.TraceResults();

	// Make sure these are stored BEFORE the initial SlideMove.
	var start_o = vec3.create(ps.origin);
	var start_v = vec3.create(ps.velocity);

	// We got exactly where we wanted to go first try.
	if (SlideMove(gravity)) {
		return;
	}

	// Never step up when you still have up velocity.
	var up = vec3.createFrom(0, 0, 1);
	var down = vec3.create(start_o);
	down[2] -= STEPSIZE;

	pm.trace(trace, start_o, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (ps.velocity[2] > 0 && (trace.fraction === 1.0 || vec3.dot(trace.plane.normal, up) < 0.7)) {
		return;
	}

	// Test the player position if they were a stepheight higher.
	vec3.set(start_o, up);
	up[2] += STEPSIZE;

	pm.trace(trace, start_o, up, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (trace.allSolid) {
		return;  // can't step up
	}

	// Try slidemove from this position.
	vec3.set(trace.endPos, ps.origin);
	vec3.set(start_v, ps.velocity);
	SlideMove(gravity);

	// Push down the final amount.
	var stepSize = trace.endPos[2] - start_o[2];
	vec3.set(ps.origin, down);
	down[2] -= stepSize;
	pm.trace(trace, ps.origin, down, pm.mins, pm.maxs, ps.clientNum, pm.tracemask);
	if (!trace.allSolid) {
		vec3.set(trace.endPos, ps.origin);
	}
	if (trace.fraction < 1.0) {
		ps.velocity = ClipVelocity(ps.velocity, trace.plane.normal, OVERCLIP);
	}

	// Use the step move.
	var delta = ps.origin[2] - start_o[2];
	if (delta > 2) {
		if (delta < 7) {
			AddEvent(EV.STEP_4);
		} else if (delta < 11) {
			AddEvent(EV.STEP_8);
		} else if (delta < 15 ) {
			AddEvent(EV.STEP_12);
		} else {
			AddEvent(EV.STEP_16);
		}
	}
}

/**
 * UpdateViewAngles
 */
function UpdateViewAngles(ps, cmd) {
	if (ps.pm_type === PM.INTERMISSION || ps.pm_type === PM.SPINTERMISSION) {
		return;  // no view changes at all
	}

	if (ps.pm_type !== PM.SPECTATOR && ps.stats[STAT.HEALTH] <= 0) {
		return;  // no view changes at all
	}

	for (var i = 0; i < 3; i++) {
		// Circularly clamp uint16 to in16.
		var temp = (cmd.angles[i] + ps.delta_angles[i]) & 0xFFFF;
		if (temp > 0x7FFF) {
			temp = temp - 0xFFFF;
		}

		if (i === QMath.PITCH) {
			// Don't let the player look up or down more than 90 degrees.
			if (temp > 16000) {
				ps.delta_angles[i] = 16000 - cmd.angles[i];
				temp = 16000;
			} else if (temp < -16000) {
				ps.delta_angles[i] = -16000 - cmd.angles[i];
				temp = -16000;
			}
		}

		ps.viewangles[i] = QMath.ShortToAngle(temp);
	}
}

/**
 * DropTimers
 */
function DropTimers() {
	var ps = pm.ps;

	// Drop misc timing counter.
	if (ps.pm_time) {
		if (pml.msec >= ps.pm_time) {
			ps.pm_flags &= ~PMF.ALL_TIMES;
			ps.pm_time = 0;
		} else {
			ps.pm_time -= pml.msec;
		}
	}

	// Drop animation counter.
	if (ps.legsTimer > 0) {
		ps.legsTimer -= pml.msec;
		if (ps.legsTimer < 0) {
			ps.legsTimer = 0;
		}
	}

	if (ps.torsoTimer > 0) {
		ps.torsoTimer -= pml.msec;
		if (ps.torsoTimer < 0) {
			ps.torsoTimer = 0;
		}
	}

	// Drop double jump timer.
	if (ps.stats[STAT.JUMPTIME] > 0) {
		ps.stats[STAT.JUMPTIME] -= pml.msec;
	}
}

/**
 * UpdateWeapon
 */
function UpdateWeapon() {
	var ps = pm.ps;

	// Don't allow attack until all buttons are up.
	if (ps.pm_flags & PMF.RESPAWNED) {
		return;
	}

	// Ignore if spectator.
	if (ps.pm_type === PM.SPECTATOR) {
		return;
	}

	// Check for dead player.
	if (ps.pm_type === PM.DEAD) {
		ps.weapon = WP.NONE;
		return;
	}

	// // Check for item using.
	// if ( pm.cmd.buttons & BUTTON_USE_HOLDABLE ) {
	// 	if ( ! ( pm.ps.pm_flags & PMF.USE_ITEM_HELD ) ) {
	// 		if ( bg_itemlist[pm.ps.stats[STAT.HOLDABLE_ITEM]].giTag == HI_MEDKIT
	// 			&& pm.ps.stats[STAT.HEALTH] >= (pm.ps.stats[STAT.MAX_HEALTH] + 25) ) {
	// 			// don't use medkit if at max health
	// 		} else {
	// 			pm.ps.pm_flags |= PMF.USE_ITEM_HELD;
	// 			PM_AddEvent( EV_USE_ITEM0 + bg_itemlist[pm.ps.stats[STAT.HOLDABLE_ITEM]].giTag );
	// 			pm.ps.stats[STAT.HOLDABLE_ITEM] = 0;
	// 		}
	// 		return;
	// 	}
	// } else {
	// 	pm.ps.pm_flags &= ~PMF.USE_ITEM_HELD;
	// }

	// Make weapon function.
	if (ps.weaponTime > 0) {
		ps.weaponTime -= pml.msec;
	}

	// Check for weapon change.
	// Can't change if weapon is firing, but can change
	// again if lowering or raising.
	if (ps.weaponTime <= 0 || ps.weaponState !== WS.FIRING) {
		if (ps.weapon !== pm.cmd.weapon) {
			BeginWeaponChange(pm.cmd.weapon);
		}
	}

	if (ps.weaponTime > 0) {
		return;
	}

	// Change weapon if time.
	if (ps.weaponState === WS.DROPPING) {
		FinishWeaponChange();
		return;
	}

	if (ps.weaponState === WS.RAISING) {
		ps.weaponState = WS.READY;
		if (ps.weapon === WP.GAUNTLET) {
			StartTorsoAnim(ANIM.TORSO_STAND2);
		} else {
			StartTorsoAnim(ANIM.TORSO_STAND);
		}
		return;
	}

	// CA warmups don't allow attacking.
	if (ps.pm_flags & PMF.NO_ATTACK) {
		return;
	}

	// Check for fire.
	if (!(pm.cmd.buttons & QS.BUTTON.ATTACK)) {
		ps.weaponTime = 0;
		ps.weaponState = WS.READY;
		return;
	}

	// Start the animation even if out of ammo.
	if (ps.weapon === WP.GAUNTLET) {
		// The guantlet only "fires" when it actually hits something.
		if (!pm.gauntletHit) {
			ps.weaponTime = 0;
			ps.weaponState = WS.READY;
			return;
		}
		StartTorsoAnim(ANIM.TORSO_ATTACK2);
	} else {
		StartTorsoAnim(ANIM.TORSO_ATTACK);
	}

	ps.weaponState = WS.FIRING;

	// Check for out of ammo.
	if (!ps.ammo[ps.weapon]) {
		AddEvent(EV.NOAMMO);
		ps.weaponTime += 500;
		return;
	}

	// Take an ammo away if not infinite.
	if (ps.ammo[ps.weapon] !== -1) {
		ps.ammo[ps.weapon]--;
	}

	// Fire weapon.
	AddEvent(EV.FIRE_WEAPON);

	var addTime = 0;

	switch (ps.weapon) {
		case WP.GAUNTLET:
			addTime = 400;
			break;
		case WP.LIGHTNING:
			addTime = 50;
			break;
		case WP.SHOTGUN:
			addTime = 1000;
			break;
		case WP.MACHINEGUN:
			addTime = 100;
			break;
		case WP.GRENADE_LAUNCHER:
			addTime = 800;
			break;
		case WP.ROCKET_LAUNCHER:
			addTime = 800;
			break;
		case WP.PLASMAGUN:
			addTime = 100;
			break;
		case WP.RAILGUN:
			addTime = 1500;
			break;
		case WP.BFG:
			addTime = 200;
			break;
		case WP.GRAPPLING_HOOK:
			addTime = 400;
			break;
		default:
			addTime = 400;
			break;
	}

	if (ps.powerups[PW.HASTE]) {
		addTime /= 1.3;
	}

	ps.weaponTime += addTime;
}

/**
 * BeginWeaponChange
 */
function BeginWeaponChange(weapon) {
	var ps = pm.ps;

	if (weapon <= WP.NONE || weapon >= WP.NUM_WEAPONS) {
		return;
	}

	if (!(ps.stats[STAT.WEAPONS] & (1 << weapon))) {
		return;
	}

	if (ps.weaponState == WS.DROPPING) {
		return;
	}

	AddEvent(EV.CHANGE_WEAPON);
	ps.weaponState = WS.DROPPING;
	ps.weaponTime += 200;
	StartTorsoAnim(ANIM.TORSO_DROP);
}

/**
 * FinishWeaponChange
 */
function FinishWeaponChange() {
	var ps = pm.ps;
	var weapon = pm.cmd.weapon;

	if (weapon < WP.NONE || weapon >= WP.NUM_WEAPONS) {
		weapon = WP.NONE;
	}
	if (!(ps.stats[STAT.WEAPONS] & (1 << weapon))) {
		weapon = WP.NONE;
	}

	ps.weapon = weapon;
	ps.weaponState = WS.RAISING;
	ps.weaponTime += 250;
	StartTorsoAnim(ANIM.TORSO_RAISE);
}

/**
 * TorsoAnimation
 */
function TorsoAnimation() {
	var ps = pm.ps;

	if (ps.weaponState === WS.READY) {
		if (ps.weapon == WP.GAUNTLET) {
			ContinueTorsoAnim(ANIM.TORSO_STAND2);
		} else {
			ContinueTorsoAnim(ANIM.TORSO_STAND);
		}
	}
}

/**
 * CrashLand
 *
 * Check for hard landings that generate sound events.
 */
function CrashLand() {
	var ps = pm.ps;

	// Decide which landing animation to use.
	if (ps.pm_flags & PMF.BACKWARDS_JUMP) {
		ForceLegsAnim(ANIM.LEGS_LANDB);
	} else {
		ForceLegsAnim(ANIM.LEGS_LAND);
	}

	ps.legsTimer = TIMER_LAND;

	// Calculate the exact velocity on landing.
	var dist = ps.origin[2] - pml.previous_origin[2];
	var vel = pml.previous_velocity[2];
	var acc = -ps.gravity;

	var a = acc / 2.0;
	var b = vel;
	var c = -dist;

	var den =  b * b - 4 * a * c;
	if (den < 0) {
		return;
	}

	var t = (-b - Math.sqrt(den)) / (2 * a);

	var delta = vel + t * acc;
	delta = delta*delta * 0.0001;

	// Ducking while falling doubles damage.
	if (ps.pm_flags & PMF.DUCKED) {
		delta *= 2;
	}

	// Never take falling damage if completely underwater.
	if (pm.waterlevel === 3) {
		return;
	}

	// Reduce falling damage if there is standing water.
	if (pm.waterlevel === 2) {
		delta *= 0.25;
	}
	if (pm.waterlevel === 1) {
		delta *= 0.5;
	}

	if (delta < 1) {
		return;
	}

	// Create a local entity event to play the sound.

	// SURF_NODAMAGE is used for bounce pads where you don't ever
	// want to take damage or play a crunch sound.
	if (!(pml.groundTrace.surfaceFlags & SURF.FLAGS.NODAMAGE))  {
		if (delta > 60) {
			AddEvent(EV.FALL_FAR);
		} else if (delta > 40) {
			// This is a pain grunt, so don't play it if dead.
			if (ps.pm_type === PM.DEAD) {
				AddEvent(EV.FALL_MEDIUM);
			}
		} else if (delta > 7) {
			AddEvent(EV.FALL_SHORT);
		} else {
			AddEvent(FootstepForSurface());
		}
	}

	// Start footstep cycle over.
	ps.bobCycle = 0;
}

/**
 * FootstepEvents
 */
function FootstepEvents() {
	var ps = pm.ps;

	// Calculate speed and cycle to be used for
	// all cyclic walking effects.
	pm.xyspeed = Math.sqrt( ps.velocity[0] * ps.velocity[0] + ps.velocity[1] * ps.velocity[1]);

	if (ps.groundEntityNum === QS.ENTITYNUM_NONE) {
		// if (ps.powerups[PW_INVULNERABILITY]) {
		// 	ContinueLegsAnim(ANIM.LEGS_IDLECR);
		// }
		// Airborne leaves position in cycle intact, but doesn't advance.
		if (pm.waterlevel > 1) {
			ContinueLegsAnim(ANIM.LEGS_SWIM);
		}
		return;
	}

	// If not trying to move.
	if (!pm.cmd.forwardmove && !pm.cmd.rightmove) {
		if (pm.xyspeed < 5) {
			ps.bobCycle = 0;  // start at beginning of cycle again
			if (ps.pm_flags & PMF.DUCKED) {
				ContinueLegsAnim(ANIM.LEGS_IDLECR);
			} else {
				ContinueLegsAnim(ANIM.LEGS_IDLE);
			}
		}
		return;
	}

	var footstep = false;
	var bobmove = 0.0;

	if (ps.pm_flags & PMF.DUCKED) {
		bobmove = 0.5;  // ducked characters bob much faster
		if (ps.pm_flags & PMF.BACKWARDS_RUN) {
			ContinueLegsAnim(ANIM.LEGS_BACKCR);
		} else {
			ContinueLegsAnim(ANIM.LEGS_WALKCR);
		}
		// Ducked characters never play footsteps.
	} else {
		if (!(pm.cmd.buttons & QS.BUTTON.WALKING)) {
			bobmove = 0.4; // faster speeds bob faster
			if (ps.pm_flags & PMF.BACKWARDS_RUN) {
				ContinueLegsAnim(ANIM.LEGS_BACK);
			} else {
				ContinueLegsAnim(ANIM.LEGS_RUN);
			}
			footstep = true;
		} else {
			bobmove = 0.3;  // walking bobs slow
			if (ps.pm_flags & PMF.BACKWARDS_RUN) {
				ContinueLegsAnim(ANIM.LEGS_BACKWALK);
			} else {
				ContinueLegsAnim(ANIM.LEGS_WALK);
			}
		}
	}

	// Check for footstep / splash sounds.
	var old = ps.bobCycle;
	ps.bobCycle = parseInt(old + bobmove * pml.msec, 10) % 256;

	// // If we just crossed a cycle boundary, play an apropriate footstep event.
	if (((old + 64) ^ (ps.bobCycle + 64)) & 128) {
		if (pm.waterlevel === 0) {
			// On ground will only play sounds if running
			if (footstep/* && !pm.noFootsteps*/) {
				AddEvent(FootstepForSurface());
			}
		} else if (pm.waterlevel === 1) {
			// Splashing.
			AddEvent(EV.FOOTSPLASH);
		} else if (pm.waterlevel === 2) {
			// Wading / swimming at surface
			AddEvent(EV.SWIM);
		} else if (pm.waterlevel === 3) {
			// No sound when completely underwater.
		}
	}
}

/**
 * WaterEvents
 *
 * Generate sound events for entering and leaving water.
 */
function WaterEvents() {
	//
	// If just entered a water volume, play a sound.
	//
	if (!pml.previous_waterlevel && pm.waterlevel) {
		AddEvent(EV.WATER_TOUCH);
	}

	//
	// If just completely exited a water volume, play a sound.
	//
	if (pml.previous_waterlevel && !pm.waterlevel) {
		AddEvent(EV.WATER_LEAVE);
	}

	//
	// Check for head just going under water.
	//
	if (pml.previous_waterlevel !== 3 && pm.waterlevel === 3) {
		AddEvent(EV.WATER_UNDER);
	}

	//
	// Check for head just coming out of water.
	//
	if (pml.previous_waterlevel === 3 && pm.waterlevel !== 3) {
		AddEvent(EV.WATER_CLEAR);
	}
}

/**
 * FootstepForSurface
 */
function FootstepForSurface() {
	if (pml.groundTrace.surfaceFlags & SURF.FLAGS.NOSTEPS) {
		return 0;
	}
	if (pml.groundTrace.surfaceFlags & SURF.FLAGS.METALSTEPS) {
		return EV.FOOTSTEP_METAL;
	}
	return EV.FOOTSTEP;
}

/**
 * AddEvent
 */
function AddEvent(newEvent) {
	AddPredictableEventToPlayerstate(pm.ps, newEvent, 0);
}

/**
 * AddTouchEnt
 */
function AddTouchEnt(entityNum) {
	if (entityNum === QS.ENTITYNUM_WORLD) {
		return;
	}
	if (pm.numTouch === MAX_TOUCH_ENTS) {
		return;
	}

	// See if it is already added.
	if (pm.touchEnts.indexOf(entityNum) !== -1) {
		return;
	}

	// Add it.
	pm.touchEnts[pm.numTouch] = entityNum;
	pm.numTouch++;
}

/**
 * StartTorsoAnim
 */
function StartTorsoAnim(anim) {
	var ps = pm.ps;

	if (ps.pm_type >= PM.DEAD) {
		return;
	}

	ps.torsoAnim = ((ps.torsoAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT ) | anim;
}

/**
 * StartLegsAnim
 */
function StartLegsAnim(anim) {
	var ps = pm.ps;

	if (ps.pm_type >= PM.DEAD) {
		return;
	}

	if (ps.legsTimer > 0) {
		return;  // a high priority animation is running
	}

	ps.legsAnim = ((ps.legsAnim & ANIM_TOGGLEBIT ) ^ ANIM_TOGGLEBIT ) | anim;
}

/**
 * ContinueLegsAnim
 */
function ContinueLegsAnim(anim) {
	var ps = pm.ps;

	if ((ps.legsAnim & ~ANIM_TOGGLEBIT) === anim) {
		return;
	}

	if (ps.legsTimer > 0) {
		return;  // a high priority animation is running
	}

	StartLegsAnim(anim);
}

/**
 * ContinueTorsoAnim
 */
function ContinueTorsoAnim(anim) {
	var ps = pm.ps;

	if ((ps.torsoAnim & ~ANIM_TOGGLEBIT) === anim) {
		return;
	}

	if (ps.torsoTimer > 0) {
		return;  // a high priority animation is running
	}

	StartTorsoAnim(anim);
}

/**
 * ForceLegsAnim
 */
function ForceLegsAnim(anim) {
	var ps = pm.ps;

	ps.legsTimer = 0;
	StartLegsAnim(anim);
}

		var itemList = [
	{
	},
	/**
	 * ARMOR
	 */
	{
		classname: 'item_armor_shard',
		name: 'Armor Shard',
		models: {
			primary: 'models/powerups/armor/shard.md3'
		},
		gfx: {
			icon: 'icons/iconr_shard'
		},
		sounds: {
			pickup: 'sound/misc/ar1_pkup'
		},
		quantity: 5,
		giType: IT.ARMOR,
		giTag: 0
	},
	{
		classname: 'item_armor_combat',
		name: 'Armor',
		models: {
			primary: 'models/powerups/armor/armor_yel.md3'
		},
		gfx: {
			icon: 'icons/iconr_yellow'
		},
		sounds: {
			pickup: 'sound/misc/ar2_pkup'
		},
		quantity: 50,
		giType: IT.ARMOR,
		giTag: 0
	},
	{
		classname: 'item_armor_body',
		name: 'Heavy Armor',
		models: {
			primary: 'models/powerups/armor/armor_red.md3'
		},
		gfx: {
			icon: 'icons/iconr_red'
		},
		sounds: {
			pickup: 'sound/misc/ar2_pkup'
		},
		quantity: 100,
		giType: IT.ARMOR,
		giTag: 0
	},
	/**
	 * HEALTH
	 */
	{
		classname: 'item_health_small',
		name: '5 Health',
		models: {
			primary: 'models/powerups/health/small_cross.md3',
			secondary: 'models/powerups/health/small_sphere.md3'
		},
		gfx: {
			icon: 'icons/iconh_green'
		},
		sounds: {
			pickup: 'sound/items/s_health'
		},
		quantity: 5,
		giType: IT.HEALTH,
		giTag: 0
	},
	{
		classname: 'item_health',
		name: '25 Health',
		models: {
			primary: 'models/powerups/health/medium_cross.md3',
			secondary: 'models/powerups/health/medium_sphere.md3'
		},
		gfx: {
			icon: 'icons/iconh_yellow'
		},
		sounds: {
			pickup: 'sound/items/n_health'
		},
		quantity: 25,
		giType: IT.HEALTH,
		giTag: 0
	},
	{
		classname: 'item_health_large',
		name: '50 Health',
		models: {
			primary: 'models/powerups/health/large_cross.md3',
			secondary: 'models/powerups/health/large_sphere.md3'
		},
		gfx: {
			icon: 'icons/iconh_red'
		},
		sounds: {
			pickup: 'sound/items/l_health'
		},
		quantity: 50,
		giType: IT.HEALTH,
		giTag: 0
	},
	{
		classname: 'item_health_mega',
		name: 'Mega Health',
		models: {
			primary: 'models/powerups/health/mega_cross.md3',
			secondary: 'models/powerups/health/mega_sphere.md3'
		},
		gfx: {
			icon: 'icons/iconh_mega'
		},
		sounds: {
			pickup: 'sound/items/m_health'
		},
		quantity: 100,
		giType: IT.HEALTH,
		giTag: 0
	},
	/**
	 * WEAPONS
	 */
	{
		classname: 'weapon_gauntlet',
		name: 'Gauntlet',
		models: {
			primary: 'models/weapons2/gauntlet/gauntlet.md3',
			barrel: 'models/weapons2/gauntlet/gauntlet_barrel.md3',
			flash: 'models/weapons2/gauntlet/gauntlet_flash.md3',
			hand: 'models/weapons2/gauntlet/gauntlet_hand.md3'
		},
		gfx: {
			icon: 'icons/iconw_gauntlet'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			firing: 'sound/weapons/melee/fstrun',
			flash0: 'sound/weapons/melee/fstatck'
		},
		quantity: 0,
		giType: IT.WEAPON,
		giTag: WP.GAUNTLET,
		flashDlightColor: [0.6, 0.6, 1.0]
	},
	{
		classname: 'weapon_machinegun',
		name: 'Machinegun',
		models: {
			primary: 'models/weapons2/machinegun/machinegun.md3',
			barrel: 'models/weapons2/machinegun/machinegun_barrel.md3',
			flash: 'models/weapons2/machinegun/machinegun_flash.md3',
			hand: 'models/weapons2/machinegun/machinegun_hand.md3'
		},
		shaders: {
			bulletExplosion: 'bulletExplosion'
		},
		gfx: {
			icon: 'icons/iconw_machinegun'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			flash0: 'sound/weapons/machinegun/machgf1b',
			flash1: 'sound/weapons/machinegun/machgf2b',
			flash2: 'sound/weapons/machinegun/machgf3b',
			flash3: 'sound/weapons/machinegun/machgf4b',
			ric0: 'sound/weapons/machinegun/ric1',
			ric1: 'sound/weapons/machinegun/ric2',
			ric2: 'sound/weapons/machinegun/ric3'
		},
		quantity: 40,
		giType: IT.WEAPON,
		giTag: WP.MACHINEGUN,
		flashDlightColor: [1.0, 1.0, 0.0]
	},
	{
		classname: 'weapon_shotgun',
		name: 'Shotgun',
		models: {
			primary: 'models/weapons2/shotgun/shotgun.md3',
			flash: 'models/weapons2/shotgun/shotgun_flash.md3',
			hand: 'models/weapons2/shotgun/shotgun_hand.md3'
		},
		shaders: {
			bulletExplosion: 'bulletExplosion'
		},
		gfx: {
			icon: 'icons/iconw_shotgun'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			flash0: 'sound/weapons/shotgun/sshotf1b'
		},
		quantity: 10,
		giType: IT.WEAPON,
		giTag: WP.SHOTGUN,
		flashDlightColor: [1.0, 1.0, 0.0]
	},
	{
		classname: 'weapon_grenadelauncher',
		name: 'Grenade Launcher',
		models: {
			primary: 'models/weapons2/grenadel/grenadel.md3',
			flash: 'models/weapons2/grenadel/grenadel_flash.md3',
			hand: 'models/weapons2/grenadel/grenadel_hand.md3',
			missile: 'models/ammo/grenade1.md3'
		},
		shaders: {
			explosion: 'grenadeExplosion'
		},
		gfx: {
			icon: 'icons/iconw_grenade'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			flash0: 'sound/weapons/grenade/grenlf1a',
			bounce0: 'sound/weapons/grenade/hgrenb1a',
			bounce1: 'sound/weapons/grenade/hgrenb2a'
		},
		quantity: 10,
		trailTime: 700,
		trailRadius: 32,
		giType: IT.WEAPON,
		giTag: WP.GRENADE_LAUNCHER,
		flashDlightColor: [1.0, 0.7, 0.0]
	},
	{
		classname: 'weapon_rocketlauncher',
		name: 'Rocket Launcher',
		models: {
			primary: 'models/weapons2/rocketl/rocketl.md3',
			flash: 'models/weapons2/rocketl/rocketl_flash.md3',
			hand: 'models/weapons2/rocketl/rocketl_hand.md3',
			missile: 'models/ammo/rocket/rocket.md3'
		},
		shaders: {
			explosion: 'rocketExplosion'
		},
		gfx: {
			icon: 'icons/iconw_rocket'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			missile: 'sound/weapons/rocket/rockfly',
			flash0: 'sound/weapons/rocket/rocklf1a',
			explosion: 'sound/weapons/rocket/rocklx1a'
		},
		quantity: 10,
		trailTime: 2000,
		trailRadius: 64,
		giType: IT.WEAPON,
		giTag: WP.ROCKET_LAUNCHER,
		flashDlightColor: [1.0, 0.75, 0.0],
		missileDlightIntensity: 200,
		missileDlightColor: [1.0, 0.75, 0.0]
	},
	{
		classname: 'weapon_lightning',
		name: 'Lightning Gun',
		models: {
			primary: 'models/weapons2/lightning/lightning.md3',
			flash: 'models/weapons2/lightning/lightning_flash.md3',
			hand: 'models/weapons2/lightning/lightning_hand.md3',
			explosion: 'models/weaphits/crackle.md3'
		},
		shaders: {
			lightning: 'lightningBoltNew'
		},
		gfx: {
			icon: 'icons/iconw_lightning'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			ready: 'sound/weapons/melee/fsthum',
			firing: 'sound/weapons/lightning/lg_hum',
			flash0: 'sound/weapons/lightning/lg_fire',
			hit0: 'sound/weapons/lightning/lg_hit',
			hit1: 'sound/weapons/lightning/lg_hit2',
			hit2: 'sound/weapons/lightning/lg_hit3'
		},

		quantity: 100,
		giType: IT.WEAPON,
		giTag: WP.LIGHTNING,
		flashDlightColor: [0.6, 0.6, 1.0]
	},
	{
		classname: 'weapon_railgun',
		name: 'Railgun',
		models: {
			primary: 'models/weapons2/railgun/railgun.md3',
			flash: 'models/weapons2/railgun/railgun_flash.md3',
			hand: 'models/weapons2/railgun/railgun_hand.md3'
		},
		shaders: {
			core: 'railCore',
			explosion: 'railExplosion'
		},
		gfx: {
			icon: 'icons/iconw_railgun'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			ready: 'sound/weapons/railgun/rg_hum',
			explosion: 'sound/weapons/plasma/plasmx1a',
			flash0: 'sound/weapons/railgun/railgf1a'
		},
		quantity: 10,
		giType: IT.WEAPON,
		giTag: WP.RAILGUN,
		flashDlightColor: [1.0, 0.5, 0.0]
	},
	{
		classname: 'weapon_plasmagun',
		name: 'Plasma Gun',
		models: {
			primary: 'models/weapons2/plasma/plasma.md3',
			flash: 'models/weapons2/plasma/plasma_flash.md3',
			hand: 'models/weapons2/plasma/plasma_hand.md3'
		},
		shaders: {
			missile: 'railDisc',
			explosion: 'plasmaExplosion'
		},
		gfx: {
			icon: 'icons/iconw_plasma'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			missile: 'sound/weapons/plasma/lasfly',
			explosion: 'sound/weapons/plasma/plasmx1a',
			flash0: 'sound/weapons/plasma/hyprbf1a'
		},
		quantity: 50,
		giType: IT.WEAPON,
		giTag: WP.PLASMAGUN,
		flashDlightColor: [0.6, 0.6, 1.0]
	},
	// {
	// 	classname: 'weapon_bfg',
	// 	name: 'BFG10K',
	// 	models: {
	// 		primary: 'models/weapons2/bfg/bfg.md3',
	// 		barrel: 'models/weapons2/bfg/bfg_barrel.md3',
	// 		flash: 'models/weapons2/bfg/bfg_flash.md3',
	// 		hand: 'models/weapons2/bfg/bfg_hand.md3',
	// 		missile: 'models/weaphits/bfg.md3'
	// 	},
	// 	shaders: {
	// 		explosion: 'bfgExplosion'
	// 	},
	// 	gfx: {
	// 		icon: 'icons/iconw_bfg'
	// 	},
	// 	sounds: {
	// 		pickup: 'sound/misc/w_pkup',
	// 		ready: 'sound/weapons/bfg/bfg_hum',
	// 		missile: 'sound/weapons/rocket/rockfly',
	// 		flash0: 'sound/weapons/bfg/bfg_fire'
	// 	},
	// 	quantity: 20,
	// 	giType: IT.WEAPON,
	// 	giTag: WP.BFG,
	// 	flashDlightColor: [1.0, 0.7, 1.0]
	// },
	// {
	// 	classname: 'weapon_grapplinghook',
	// 	name: 'Grappling Hook',
	// 	models: {
	// 		primary: 'models/weapons2/grapple/grapple.md3',
	// 		flash: 'models/weapons2/grapple/grapple_flash.md3',
	// 		hand: 'models/weapons2/grapple/grapple_hand.md3'
	// 	},
	// 	gfx: {
	// 		icon: 'icons/iconw_grapple'
	// 	},
	// 	sounds: {
	// 		pickup: 'sound/misc/w_pkup',
	// 		ready: 'sound/weapons/melee/fsthum',
	// 		firing: 'sound/weapons/melee/fstrun'
	// 	},
	// 	quantity: 0,
	// 	giType: IT.WEAPON,
	// 	giTag: WP.GRAPPLING_HOOK
	// },
	/**
	 * AMMO ITEMS
	 */
	{
		classname: 'ammo_bullets',
		name: 'Bullets',
		models: {
			primary: 'models/powerups/ammo/machinegunam.md3'
		},
		gfx: {
			icon: 'icons/icona_machinegun'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 50,
		giType: IT.AMMO,
		giTag: WP.MACHINEGUN
	},
	{
		classname: 'ammo_shells',
		name: 'Shells',
		models: {
			primary: 'models/powerups/ammo/shotgunam.md3'
		},
		gfx: {
			icon: 'icons/icona_shotgun'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 10,
		giType: IT.AMMO,
		giTag: WP.SHOTGUN
	},
	{
		classname: 'ammo_grenades',
		name: 'Grenades',
		models: {
			primary: 'models/powerups/ammo/grenadeam.md3'
		},
		gfx: {
			icon: 'icons/icona_grenade'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 5,
		giType: IT.AMMO,
		giTag: WP.GRENADE_LAUNCHER
	},
	{
		classname: 'ammo_rockets',
		name: 'Rockets',
		models: {
			primary: 'models/powerups/ammo/rocketam.md3'
		},
		gfx: {
			icon: 'icons/icona_rocket'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 5,
		giType: IT.AMMO,
		giTag: WP.ROCKET_LAUNCHER
	},
	{
		classname: 'ammo_lightning',
		name: 'Lightning',
		models: {
			primary: 'models/powerups/ammo/lightningam.md3'
		},
		gfx: {
			icon: 'icons/icona_lightning'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 60,
		giType: IT.AMMO,
		giTag: WP.LIGHTNING
	},
	{
		classname: 'ammo_slugs',
		name: 'Slugs',
		models: {
			primary: 'models/powerups/ammo/railgunam.md3'
		},
		gfx: {
			icon: 'icons/icona_railgun'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 10,
		giType: IT.AMMO,
		giTag: WP.RAILGUN
	},
	{
		classname: 'ammo_cells',
		name: 'Cells',
		models: {
			primary: 'models/powerups/ammo/plasmaam.md3'
		},
		gfx: {
			icon: 'icons/icona_plasma'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 30,
		giType: IT.AMMO,
		giTag: WP.PLASMAGUN
	},
	{
		classname: 'ammo_bfg',
		name: 'Bfg Ammo',
		models: {
			primary: 'models/powerups/ammo/bfgam.md3'
		},
		gfx: {
			icon: 'icons/icona_bfg'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 15,
		giType: IT.AMMO,
		giTag: WP.BFG
	},
	/**
	 * POWERUPS
	 */
	{
		classname: 'item_quad',
		name: 'Quad Damage',
		models: {
			primary: 'models/powerups/instant/quad.md3',
			secondary: 'models/powerups/instant/quad_ring.md3'
		},
		gfx: {
			icon: 'icons/quad'
		},
		sounds: {
			pickup: 'sound/items/quaddamage',
			use: 'sound/items/damage3'
		},
		quantity: 30,
		giType: IT.POWERUP,
		giTag: PW.QUAD
	},
	{
		classname: 'item_enviro',
		name: 'Battle Suit',
		models: {
			primary: 'models/powerups/instant/enviro.md3',
			secondary: 'models/powerups/instant/enviro_ring.md3'
		},
		gfx: {
			icon: 'icons/envirosuit'
		},
		sounds: {
			pickup: 'sound/items/protect'
		},
		quantity: 30,
		giType: IT.POWERUP,
		giTag: PW.BATTLESUIT
	},
	{
		classname: 'item_haste',
		name: 'Speed',
		models: {
			primary: 'models/powerups/instant/haste.md3',
			secondary: 'models/powerups/instant/haste_ring.md3'
		},
		gfx: {
			icon: 'icons/haste'
		},
		sounds: {
			pickup: 'sound/items/haste'
		},
		quantity: 30,
		giType: IT.POWERUP,
		giTag: PW.HASTE
	},
	{
		classname: 'item_invis',
		name: 'Invisibility',
		models: {
			primary: 'models/powerups/instant/invis.md3',
			secondary: 'models/powerups/instant/invis_ring.md3'
		},
		gfx: {
			icon: 'icons/invis'
		},
		sounds: {
			pickup: 'sound/items/invisibility'
		},
		quantity: 30,
		giType: IT.POWERUP,
		giTag: PW.INVIS
	},
	{
		classname: 'item_regen',
		name: 'Regeneration',
		models: {
			primary: 'models/powerups/instant/regen.md3',
			secondary: 'models/powerups/instant/regen_ring.md3'
		},
		gfx: {
			icon: 'icons/regen'
		},
		sounds: {
			pickup: 'sound/items/regeneration',
			use: 'sound/items/regen'
		},
		quantity: 30,
		giType: IT.POWERUP,
		giTag: PW.REGEN
	},
	{
		classname: 'item_flight',
		name: 'Flight',
		models: {
			primary: 'models/powerups/instant/flight.md3',
			secondary: 'models/powerups/instant/flight_ring.md3'
		},
		gfx: {
			icon: 'icons/flight'
		},
		sounds: {
			pickup: 'sound/items/flight'
		},
		quantity: 60,
		giType: IT.POWERUP,
		giTag: PW.FLIGHT
	},
	/**
	 * CTF
	 */
	{
		classname: 'team_CTF_redflag',
		name: 'Red Flag',
		models: {
			primary: 'models/flags/r_flag.md3'
		},
		gfx: {
			icon: 'icons/iconf_red1'
		},
		quantity: 0,
		giType: IT.TEAM,
		giTag: PW.REDFLAG
	},
	{
		classname: 'team_CTF_blueflag',
		name: 'Blue Flag',
		models: {
			primary: 'models/flags/b_flag.md3'
		},
		gfx: {
			icon: 'icons/iconf_blu1'
		},
		quantity: 0,
		giType: IT.TEAM,
		giTag: PW.BLUEFLAG
	},
	// /**
	//  * 1FCTF
	//  */
	// {
	// 	classname: 'team_CTF_neutralflag',
	// 	name: 'Neutral Flag',
	// 	models: {
	// 		primary: 'models/flags/n_flag.md3'
	// 	},
	// 	gfx: {
	// 		icon: 'icons/iconf_neutral1'
	// 	},
	// 	quantity: 0,
	// 	giType: IT.TEAM,
	// 	giTag: PW.NEUTRALFLAG
	// }
];

/**
 * FindItem
 */
function FindItem(pickupName) {
	for (var i = 1; i < itemList.length; i++) {
		var it = itemList[i];

		if (it.name === pickupName) {
			return it;
		}
	}

	return null;
}

/**
 * FindItemForWeapon
 */
function FindItemForWeapon(weapon) {
	for (var i = 1; i < itemList.length; i++) {
		var it = itemList[i];

		if (it.giType === IT.WEAPON && it.giTag === weapon) {
			return it;
		}
	}

	// Com_Error( ERR_DROP, "Couldn't find item for weapon %i", weapon);
	return null;
}

/**
 * FindItemForPowerup
 */
function FindItemForPowerup(pw) {
	for (var i = 1; i < itemList.length; i++) {
		var it = itemList[i];

		if ((it.giType === IT.POWERUP || it.giType === IT.TEAM) && it.giTag === pw) {
			return it;
		}
	}

	// Com_Error( ERR_DROP, "Couldn't find item for powerup %i", pw);
	return null;
}

/**
 * FindItemForHoldable
 */
function FindItemForHoldable(pw) {
	for (var i = 1; i < itemList.length; i++) {
		var it = itemList[i];

		if (it.giType === IT.HOLDABLE && it.giTag === pw) {
			return it;
		}
	}

	// Com_Error( ERR_DROP, "Couldn't find holdable for powerup %i", pw);
	return null;
}

		return {
			DEFAULT_GRAVITY:        DEFAULT_GRAVITY,
			GIB_HEALTH:             GIB_HEALTH,
			ARMOR_PROTECTION:       ARMOR_PROTECTION,
			RANK_TIED_FLAG:         RANK_TIED_FLAG,
			DEFAULT_SHOTGUN_SPREAD: DEFAULT_SHOTGUN_SPREAD,
			DEFAULT_SHOTGUN_COUNT:  DEFAULT_SHOTGUN_COUNT,
			LIGHTNING_RANGE:        LIGHTNING_RANGE,
			DEFAULT_VIEWHEIGHT:     DEFAULT_VIEWHEIGHT,
			CROUCH_VIEWHEIGHT:      CROUCH_VIEWHEIGHT,

			ANIM_TOGGLEBIT:         ANIM_TOGGLEBIT,

			EV_EVENT_BIT1:          EV_EVENT_BIT1,
			EV_EVENT_BIT2:          EV_EVENT_BIT2,
			EV_EVENT_BITS:          EV_EVENT_BITS,
			EVENT_VALID_MSEC:       EVENT_VALID_MSEC,

			PM:                     PM,
			PMF:                    PMF,
			GT:                     GT,
			GS:                     GS,
			WS:                     WS,
			IT:                     IT,
			MASK:                   MASK,
			STAT:                   STAT,
			WP:                     WP,
			PW:                     PW,
			TEAM:                   TEAM,
			SPECTATOR:              SPECTATOR,
			PERS:                   PERS,
			PLAYEREVENTS:           PLAYEREVENTS,
			ET:                     ET,
			EF:                     EF,
			EV:                     EV,
			GTS:                    GTS,
			ANIM:                   ANIM,
			MOD:                    MOD,

			// types
			GametypeNames:                    GametypeNames,
			TeamNames:                        TeamNames,
			PmoveInfo:                        PmoveInfo,
			Animation:                        Animation,

			// funcs
			ItemList:                         itemList,
			FindItem:                         FindItem,
			FindItemForWeapon:                FindItemForWeapon,
			FindItemForPowerup:               FindItemForPowerup,
			FindItemForHoldable:              FindItemForHoldable,
			Pmove:                            Pmove,
			UpdateViewAngles:                 UpdateViewAngles,
			AddPredictableEventToPlayerstate: AddPredictableEventToPlayerstate,
			PlayerStateToEntityState:         PlayerStateToEntityState,
			EvaluateTrajectory:               EvaluateTrajectory,
			EvaluateTrajectoryDelta:          EvaluateTrajectoryDelta,
			TouchJumpPad:                     TouchJumpPad,
			CanItemBeGrabbed:                 CanItemBeGrabbed,
			PlayerTouchesItem:                PlayerTouchesItem,
			GetWaterLevel:                    GetWaterLevel
		};
	}

	return BothGame;
});


/*global mat4: true, vec3: true */

define('game/gm',['require','vendor/gl-matrix','vendor/state-machine','common/qmath','common/qshared','common/surfaceflags','common/cvar','game/bg'],function (require) {
	var glmatrix     = require('vendor/gl-matrix');
	var StateMachine = require('vendor/state-machine');
	var QMath        = require('common/qmath');
	var QS           = require('common/qshared');
	var SURF         = require('common/surfaceflags');
	var Cvar         = require('common/cvar');
	var BothGame     = require('game/bg');

	function Game(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;
		var SV  = imp.SV;
		var BG  = new BothGame(BGExports());

		var MAX_CLIENTS            = QS.MAX_CLIENTS;
		var MAX_GENTITIES          = QS.MAX_GENTITIES;
		var MAX_PERSISTANT         = QS.MAX_PERSISTANT;
		var MAX_POWERUPS           = QS.MAX_POWERUPS;
		var MAX_PS_EVENTS          = QS.MAX_PS_EVENTS;
		var ARENANUM_NONE          = QS.ARENANUM_NONE;
		var ENTITYNUM_NONE         = QS.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD        = QS.ENTITYNUM_WORLD;
		var ENTITYNUM_MAX_NORMAL   = QS.ENTITYNUM_MAX_NORMAL;
		var GIB_HEALTH             = BG.GIB_HEALTH;
		var ARMOR_PROTECTION       = BG.ARMOR_PROTECTION;
		var RANK_TIED_FLAG         = BG.RANK_TIED_FLAG;
		var DEFAULT_SHOTGUN_SPREAD = BG.DEFAULT_SHOTGUN_SPREAD;
		var DEFAULT_SHOTGUN_COUNT  = BG.DEFAULT_SHOTGUN_COUNT;
		var LIGHTNING_RANGE        = BG.LIGHTNING_RANGE;
		var ANIM_TOGGLEBIT         = BG.ANIM_TOGGLEBIT;
		var EV_EVENT_BIT1          = BG.EV_EVENT_BIT1;
		var EV_EVENT_BIT2          = BG.EV_EVENT_BIT2;
		var EV_EVENT_BITS          = BG.EV_EVENT_BITS;
		var EVENT_VALID_MSEC       = BG.EVENT_VALID_MSEC;

		var BUTTON                 = QS.BUTTON;
		var TR                     = QS.TR;
		var CONTENTS               = QS.CONTENTS;
		var FLAG                   = QS.FLAG;
		var PM                     = BG.PM;
		var PMF                    = BG.PMF;
		var GT                     = BG.GT;
		var GS                     = BG.GS;
		var WS                     = BG.WS;
		var IT                     = BG.IT;
		var MASK                   = BG.MASK;
		var STAT                   = BG.STAT;
		var WP                     = BG.WP;
		var PW                     = BG.PW;
		var TEAM                   = BG.TEAM;
		var SPECTATOR              = BG.SPECTATOR;
		var PERS                   = BG.PERS;
		var PLAYEREVENTS           = BG.PLAYEREVENTS;
		var ET                     = BG.ET;
		var EF                     = BG.EF;
		var EV                     = BG.EV;
		var GTS                    = BG.GTS;
		var ANIM                   = BG.ANIM;
		var MOD                    = BG.MOD;

		var BODY_QUEUE_SIZE = 8;

var FRAMETIME = 100;  // msec

var ITEM_RADIUS = 15;
var CARNAGE_REWARD_TIME = 3000;
var REWARD_SPRITE_TIME  = 2000;

var INTERMISSION_DELAY_TIME = 1000;

var DAMAGE = {
	RADIUS:        0x00000001,                             // damage was indirect
	NO_ARMOR:      0x00000002,                             // armour does not protect from this damage
	NO_KNOCKBACK:  0x00000004,                             // do not affect velocity, just view angles
	NO_PROTECTION: 0x00000008                              // armor, shields, invulnerability, and godmode have no effect
};

// GameEntity flags
var GFL = {
	GODMODE:       0x00000010,
	NOTARGET:      0x00000020,
	TEAMSLAVE:     0x00000400,                             // not the first on the team
	NO_KNOCKBACK:  0x00000800,
	DROPPED_ITEM:  0x00001000,
	NO_BOTS:       0x00002000,                             // spawn point not for bot use
	NO_HUMANS:     0x00004000,                             // spawn point just for bots
	FORCE_GESTURE: 0x00008000                              // force gesture on client
};

// The server does not know how to interpret most of the values
// in entityStates (level eType), so the game must explicitly flag
// special server behaviors.
var SVF = {
	NOCLIENT:           0x00000001,                        // don't send entity to clients, even if it has effects
	BOT:                0x00000002,                        // set if the entity is a bot
	BROADCAST:          0x00000008,                        // send to all connected clients
	PORTAL:             0x00000020,                        // merge a second pvs at origin2 into snapshots
	USE_CURRENT_ORIGIN: 0x00000040,                        // entity->r.r.currentOrigin instead of entity->s.origin
	                                                       // for link position (missiles and movers)
	SINGLECLIENT:       0x00000080,                        // only send to a single client (entityShared_t->singleClient)
	NOTSINGLECLIENT:    0x00000100                         // send entity to everyone but one client
};

var MOVER = {
	POS1: 0,
	POS2: 1,
	ONETOTWO: 2,
	TWOTOONE: 3
};

var CON = {
	DISCONNECTED: 0,
	CONNECTING:   1,
	CONNECTED:    2
};

var TEAM_STATE = {
	BEGIN:      0,                                         // Beginning a team game, spawn at base
	ACTIVE:     1,                                         // Now actively playing
	ELIMINATED: 2
};

var GameLocals = function () {
	this.clients                = new Array(MAX_CLIENTS);
	this.gentities              = new Array(MAX_GENTITIES);

	this.gentitySize            = 0;
	this.num_entities           = 0;                       // MAX_CLIENTS <= num_entities <= ENTITYNUM_MAX_NORMAL

	this.maxclients             = 0;

	this.framenum               = 0;
	this.previousTime           = 0;
	this.time                   = 0;

	this.startTime              = 0;

	this.lastTeamLocationTime   = 0;                       // last time of client team location update

	this.newSession             = false;                   // don't use any old session data, because
	                                                       // we changed gametype

	this.restarted              = false;                   // waiting for a map_restart to fire

// 	// voting state
// //	this.voteString             = null;
// //	this.voteDisplayString      = null;
// //	this.voteTime               = 0;                       // level.time vote was called
// //	this.voteExecuteTime        = 0;                       // time the vote is executed
// //	this.voteYes                = 0;
// //	this.voteNo                 = 0;

// 	// team voting state
// //	this.teamVoteString         = new Array(2);
// //	this.teamVoteTime           = new Array(2);            // level.time vote was called
// //	this.teamVoteYes            = new Array(2);
// //	this.teamVoteNo             = new Array(2);

	// spawn variables
	this.spawnVars              = null;

//	qboolean	locationLinked;                            // target_locations get linked
//	gentity_t	*locationHead;                             // head of the location list

	this.bodyQueue              = new Array(BODY_QUEUE_SIZE);
	this.bodyQueueIndex         = 0;

	this.arenas                 = [];
	this.arena                  = null;                    // current arena, set in Frame()
	                                                       // and by the various Client* funcs
	                                                       // invoked directly by the server.
	this.rocketarena            = false;

	for (var i = 0; i < MAX_CLIENTS; i++) {
		this.clients[i] = new GameClient();
	}

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.gentities[i] = new GameEntity();
	}
};

var ArenaInfo = function () {
	this.arenaNum               = ARENANUM_NONE;

	this.name                   = null;

	this.gametype               = 0;
	this.state                  = null;
	this.teamScores             = new Array(TEAM.NUM_TEAMS);
	this.warmupTime             = 0;
	this.restartTime            = 0;
	this.lastWinningTeam        = TEAM.FREE;
	this.group1                 = null;  // rocketarena
	this.group2                 = null;

//	this.follow1                = 0;  // clientNums for auto-follow spectators
//	this.follow2;               = 0;
	this.numConnectedClients    = 0;
	this.numNonSpectatorClients = 0;  // includes connecting clients
	this.numPlayingClients      = 0;  // connected, non-spectators
	this.sortedClients          = new Array(MAX_CLIENTS);  // sorted by score

	this.intermissionTime       = 0;  // time the intermission was started
	this.readyToExit            = false;  // at least one client wants to exit
	this.exitTime               = 0;

	for (var i = 0; i < TEAM.NUM_TEAMS; i++) {
		this.teamScores[i] = 0;
	}
};

var GameEntity = function () {
	this.reset();
};

GameEntity.prototype.reset = function () {
	this.s                   = new QS.EntityState();
	this.r                   = new QS.SharedEntity();

	this.client              = null;                       // NULL if not a client

	this.parent              = null;
	this.inuse               = false;
	this.classname           = 'noclass';
	this.spawnflags          = 0;
	this.arena               = ARENANUM_NONE;              // arena flag from editor

	this.freeTime            = 0;                          // level.time when the object was freed
	this.eventTime           = 0;                          // events will be cleared EVENT_VALID_MSEC after set
	this.freeAfterEvent      = false;
	this.unlinkAfterEvent    = false;

	this.neverFree           = false;                      // if true, FreeEntity will only unlink
	                                                       // bodyqueue uses this

	this.model               = null;
	this.model2              = null;
	this.message             = null;
	this.physicsObject       = false;                      // if true, it can be pushed by movers and fall off edges
	                                                       // all game items are physicsObjects
	this.physicsBounce       = 0;                          // 1.0 = continuous bounce, 0.0 = no bounce
	this.clipmask            = 0;                          // brushes with this content value will be collided against
	                                                       // when moving. items and corpses do not collide against
	                                                       // players, for instance
	// Movers.
	this.moverState          = 0;
	this.soundPos1           = 0;
	this.sound1to2           = 0;
	this.sound2to1           = 0;
	this.soundPos2           = 0;
	this.soundLoop           = 0;
	this.nextTrain           = null;
	this.prevTrain           = null;
	this.pos1                = vec3.create();
	this.pos2                = vec3.create();

	this.target              = null;
	this.targetName          = null;
	this.team                = null;
	this.targetShaderName    = null;
	this.targetShaderNewName = null;
	this.targetEnt           = null;

	this.speed               = 0;
	this.wait                = 0;
	this.movedir             = vec3.create();

	this.nextthink           = 0;
	this.think               = null;

	this.timestamp           = 0;                          // body queue sinking, etc

	this.painDebounceTime    = 0;
	this.flyDebounceTime     = 0;                          // wind tunnel

	this.health              = 0;
	this.takeDamage          = false;

	this.damage              = 0;
	this.splashDamage        = 0;                          // quad will increase this without increasing radius
	this.splashRadius        = 0;
	this.methodOfDeath       = 0;
	this.splashMethodOfDeath = 0;

	this.count               = 0;                          // items

	this.chain               = null;
	this.enemy               = null;
	this.activator           = null;
	this.teamchain           = null;                       // next entity in team
	this.teammaster          = null;                       // master of the team

	this.watertype           = 0;
	this.waterlevel          = 0;

	this.noise_index         = 0;

	// timing variables
	this.wait                = 0;
	this.random              = 0;
};

// This structure is cleared on each ClientSpawn(),
// except for 'client->pers' and 'client->sess'.
var GameClient = function () {
	this.reset();
};

GameClient.prototype.reset = function () {
	this.ps                = new QS.PlayerState();
	this.pers              = new ClientPersistant();
	this.sess              = new ClientSession();

	this.readyToExit       = false;                        // wishes to leave the intermission

	this.noclip            = false;

	this.lastCmdTime       = 0;                            // level.time of last usercmd_t, for EF_CONNECTION
	                                                       // we can't just use pers.lastCommand.time, because
	                                                       // of the g_sycronousclients case
	this.buttons           = 0;
	this.oldbuttons        = 0;

	this.oldOrigin         = vec3.create();

	// Sum up damage over an entire frame, so
	// shotgun blasts give a single big kick.
	this.damage_armor      = 0;                            // damage absorbed by armor
	this.damage_blood      = 0;                            // damage taken out of health
	this.damage_knockback  = 0;                            // impact damage
	this.damage_from       = vec3.create();                    // origin for vector calculation
	this.damage_fromWorld  = false;                        // if true, don't use the damage_from vector

	// Awards
	this.accurate_count    = 0;                            // for "impressive" reward sound
	this.accuracy_shots    = 0;                            // total number of shots
	this.accuracy_hits     = 0;                            // total number of hits

	// Taunts
	this.lastkilled_client = 0;                            // last client that this client killed
	this.lasthurt_mod      = 0;                            // type of damage the client did

	// Timers
	this.respawnTime       = 0;                            // can respawn when time > this, force after g_forcerespwan
	this.inactivityTime    = 0;                            // kick players when time > this
	this.inactivityWarning = 0;                            // true if the five second warning has been given
	this.rewardTime        = 0;                            // clear the EF.AWARD_IMPRESSIVE, etc when time > this
	this.lastKillTime      = 0;
	this.airOutTime        = 0;
	this.switchTeamTime    = 0;                            // time the player switched teams
	this.switchArenaTime   = 0;                            // time the player switched arenas

	// timeResidual is used to handle events that happen every second
	// like health / armor countdowns and regeneration
	this.timeResidual      = 0;
};

var PlayerTeamState = function () {
	this.state              = TEAM_STATE.BEGIN;

	// this.location           = 0;

	this.captures           = 0;
	this.basedefense        = 0;
	this.carrierdefense     = 0;
	this.flagrecovery       = 0;
	this.fragcarrier        = 0;
	this.assists            = 0;

	this.lasthurtcarrier    = 0;
	this.lastreturnedflag   = 0;
	this.flagsince          = 0;
	this.lastfraggedcarrier = 0;
};


// Client data that stays across multiple respawns, but is cleared
// on each level change or team change at ClientBegin()
var ClientPersistant = function () {
	this.connected         = 0;
	this.name              = null;
	this.cmd               = new QS.UserCmd();
	this.localClient       = false;                        // true if "ip" info key is "localhost"
	this.predictItemPickup = false;                        // based on cg_predictItems userinfo
	this.maxHealth         = 0;                            // for handicapping
	this.enterTime         = 0;                            // level.time the client entered the game
	this.teamState         = new PlayerTeamState();        // status in teamplay games
	this.voteCount         = 0;                            // to prevent people from constantly calling votes
	this.teamVoteCount     = 0;                            // to prevent people from constantly calling votes
	// this.teamInfo          = false;                        // send team overlay updates?
};

ClientPersistant.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new ClientPersistant();
	}

	to.connected = this.connected;
	to.name = this.name;
	to.cmd = this.cmd;
	to.localClient = this.localClient;
	to.predictItemPickup = this.predictItemPickup;
	to.maxHealth = this.maxHealth;
	to.enterTime = this.enterTime;
	to.teamState = this.teamState;
	to.voteCount = this.voteCount;
	to.teamVoteCount = this.teamVoteCount;
	// to.teamInfo = this.teamInfo;

	return to;
};

// Client data that stays across multiple levels or tournament restarts.
// This is achieved by writing all the data to cvar strings at game shutdown
// time and reading them back at connection time.  Anything added here
// MUST be dealt with in InitSessionData() / ReadSessionData() / WriteSessionData().
var ClientSession = function () {
	this.team             = TEAM.FREE;
	this.group            = null;
	this.spectatorState   = SPECTATOR.NOT;
	this.spectatorClient  = 0;  // for chasecam and follow mode
	this.spectatorNum     = 0;  // for determining next-in-line to play
	this.wins             = 0;  // tournament stats
	this.losses           = 0;
};

ClientSession.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new ClientSession();
	}

	to.team = this.team;
	to.group = this.group;
	to.spectatorState = this.spectatorState;
	to.spectatorClient = this.spectatorClient;
	to.spectatorNum = this.spectatorNum;
	to.wins = this.wins;
	to.losses = this.losses;

	return to;
};

		var level;

var g_fraglimit,
	g_timelimit,
	g_capturelimit,
	g_gametype,
	g_playersPerTeam,
	g_roundlimit,
	g_synchronousClients,
	pmove_fixed,
	pmove_msec,
	g_teamForceBalance,
	g_friendlyFire,
	g_teamForceBalance,
	g_warmup,
	g_speed,
	g_gravity,
	g_knockback,
	g_quadfactor,
	g_weaponRespawn,
	g_weaponTeamRespawn,
	g_forceRespawn,
	g_inactivity;

/**
 * log
 */
function log() {
	SV.Log.apply(this, arguments);
}

/**
 * error
 */
function error(str) {
	SV.Error(str);
}

/**
 * Init
 */
function Init(levelTime) {
	log('Initializing GM');

	level = new GameLocals();
	level.time = levelTime;
	level.startTime = levelTime;

	RegisterCvars();

	// Load session info.
	InitWorldSession();

	// Initialize all clients for this game.
	var sv_maxClients = Cvar.GetCvar('sv_maxClients');
	level.maxclients = sv_maxClients.get();

	// Let the server system know where the entites are.
	SV.LocateGameData(level.gentities, level.clients);

	// Reserve some spots for dead player bodies.
	InitBodyQueue();

	// Initialize sub-arenas and spawn their entities.
	InitArenas();
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	g_timelimit          = Cvar.AddCvar('g_timelimit',          0,     Cvar.FLAGS.SERVERINFO | Cvar.FLAGS.ARCHIVE);
	g_fraglimit          = Cvar.AddCvar('g_fraglimit',          20,    Cvar.FLAGS.SERVERINFO | Cvar.FLAGS.ARCHIVE);
	g_capturelimit       = Cvar.AddCvar('g_capturelimit',       8,     Cvar.FLAGS.SERVERINFO | Cvar.FLAGS.ARCHIVE);

	g_gametype           = Cvar.AddCvar('g_gametype',           0,     Cvar.FLAGS.ARENAINFO | Cvar.FLAGS.ARCHIVE, true);
	g_playersPerTeam     = Cvar.AddCvar('g_playersPerTeam',     0,     Cvar.FLAGS.ARENAINFO | Cvar.FLAGS.ARCHIVE);
	g_roundlimit         = Cvar.AddCvar('g_roundlimit',         20,    Cvar.FLAGS.ARENAINFO | Cvar.FLAGS.ARCHIVE);

	g_synchronousClients = Cvar.AddCvar('g_synchronousClients', 0,     Cvar.FLAGS.SYSTEMINFO);
	pmove_fixed          = Cvar.AddCvar('pmove_fixed',          1,     Cvar.FLAGS.SYSTEMINFO);
	pmove_msec           = Cvar.AddCvar('pmove_msec',           8,     Cvar.FLAGS.SYSTEMINFO);

	g_teamForceBalance   = Cvar.AddCvar('g_teamForceBalance',   0,     Cvar.FLAGS.ARCHIVE);
	g_friendlyFire       = Cvar.AddCvar('g_friendlyFire',       0,     Cvar.FLAGS.ARCHIVE);
	g_teamForceBalance   = Cvar.AddCvar('g_teamForceBalance',   0,     Cvar.FLAGS.ARCHIVE);
	g_warmup             = Cvar.AddCvar('g_warmup',             10,    Cvar.FLAGS.ARCHIVE);

	g_speed              = Cvar.AddCvar('g_speed',              320);
	g_gravity            = Cvar.AddCvar('g_gravity',            800);
	g_knockback          = Cvar.AddCvar('g_knockback',          1000);
	g_quadfactor         = Cvar.AddCvar('g_quadfactor',         3);
	g_weaponRespawn      = Cvar.AddCvar('g_weaponrespawn',      5);
	g_weaponTeamRespawn  = Cvar.AddCvar('g_weaponTeamRespawn',  30);
	g_forceRespawn       = Cvar.AddCvar('g_forceRespawn',       20);
	g_inactivity         = Cvar.AddCvar('g_inactivity',         0);
}

/**
 * Shutdown
 */
function Shutdown() {
	log('Shutdown GM');

	// Write all the client session data so we can get it back.
	WriteWorldSession();
}

/**
 * Frame
 */
function Frame(levelTime) {
	// If we are waiting for the level to restart, do nothing.
	if (level.restarted) {
		console.log('level restarted ignoring');
		return;
	}

	level.framenum++;
	level.previousTime = level.time;
	level.time = levelTime;

	for (var i = 0; i < MAX_GENTITIES; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}

		// Set the global arena.
		SetCurrentArena(ent.s.arenaNum);

		// Clear events that are too old.
		if (level.time - ent.eventTime > EVENT_VALID_MSEC) {
			if (ent.s.event) {
				ent.s.event = 0;

				if (ent.client) {
					ent.client.ps.externalEvent = 0;
				}
			}

			if (ent.freeAfterEvent) {
				// tempEntities or dropped items completely go away after their event.
				FreeEntity(ent);
				continue;
			}
			else if (ent.unlinkAfterEvent) {
				// items that will respawn will hide themselves after their pickup event
				ent.unlinkAfterEvent = false;
				SV.UnlinkEntity(ent);
			}
		}

		// Temporary entities don't think.
		if (ent.freeAfterEvent) {
			continue;
		}

		if (!ent.r.linked && ent.neverFree) {
			continue;
		}

		if (ent.s.eType === ET.MISSILE) {
			RunMissile(ent);
			continue;
		}

		if (ent.s.eType === ET.ITEM || ent.physicsObject) {
			RunItem(ent);
			continue;
		}

		if (ent.s.eType === ET.MOVER) {
			RunMover(ent);
			continue;
		}

		if (i < level.maxclients) {
			RunClient(ent);
			continue;
		}

		RunEntity(ent);
	}

	// Perform final fixups on the players.
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		if (ent.inuse) {
			ClientEndFrame(ent);
		}
	}

	RunArenas();
}

/**
 * SendScoreboardMessageToAllClients
 *
 * Do this at BeginIntermission time and whenever ranks are recalculated
 * due to enters/exits/forced team changes
 */
function SendScoreboardMessageToAllClients () {
	for (var i = 0; i < level.maxclients; i++) {
		if (level.clients[i].pers.connected === CON.CONNECTED) {
			SendScoreboardMessage(level.gentities[i]);
		}
	}
}

/**
 * FindEntitiesInBox
 */
function FindEntitiesInBox(mins, maxs) {
	return SV.FindEntitiesInBox(mins, maxs, level.arena.arenaNum);
}

/**
 * Trace
 */
function Trace(results, start, end, mins, maxs, passEntityNum, contentmask) {
	return SV.Trace(results, start, end, mins, maxs, level.arena.arenaNum, passEntityNum, contentmask);
}

/**
 * PointContents
 */
function PointContents(point, passEntityNum) {
	return SV.PointContents(point, level.arena.arenaNum, passEntityNum);
}


/**
 * FindConfigstringIndex
 */
function FindConfigstringIndex(name, namespace, max) {
	if (!name || !name.charCodeAt(0)) {
		return 0;
	}

	for (var i = 1; i < max; i++) {
		var s = SV.GetConfigstring(namespace + ':' + i);
		if (!s) {
			break;
		}
		if (s === name) {
			return i;
		}
	}

	if (i === max) {
		error('FindConfigstringIndex: overflow');
		return;
	}

	SV.SetConfigstring(namespace + ':' + i, name);

	return i;
}

/**
 * ModelIndex
 */
function ModelIndex(name) {
	return FindConfigstringIndex(name, 'models', QS.MAX_MODELS);
}

/**
 * SoundIndex
 */
function SoundIndex(name) {
	return FindConfigstringIndex(name, 'sounds', QS.MAX_SOUNDS);
}

/**
 * BGExports
 */
function BGExports() {
	return {
		error: error
	};
}
		/**
 * InitArenas
 */
function InitArenas() {
	var arenas = [
		'default'
	];

	// Load up arenas from intermission points.
	var entityDefs = SV.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];

		if (def.classname === 'info_player_intermission') {
			var num = parseInt(def.arena, 10);

			if (isNaN(num)) {
				continue;
			}

			if (arenas[num] !== undefined) {
				continue;
			}

			// Store off the name.
			arenas[num] = def.message;
		}
	}

	for (var i = 0; i < arenas.length; i++) {
		var arena = new ArenaInfo();

		arena.arenaNum = i;
		arena.name = arenas[i];
		arena.gametype = g_gametype.at(arena.arenaNum).get();

		// Set global arena for entity spawning purposes.
		level.arenas[i] = arena;
		SetCurrentArena(i);

		// Do initial update.
		ArenaInfoChanged();

		// FIXME We don't really need to spawn all map entities for each arena,
		// especially static, stateless ones such as triggers and what not.
		SpawnAllEntitiesFromDefs(i);

		if (arena.gametype >= GT.CLANARENA) {
			CreateRoundMachine();
		} else {
			CreateTournamentMachine();
		}
	}

	// Make sure we have flags for CTF, etc.
	if (level.arena.gametype === GT.CTF) {
		Team_CheckItems();
	}
}

/**
 * SetCurrentArena
 *
 * This isn't exactly the prettiest solution to multiarena, but
 * it's a lot better than subclassing half of the game code for now.
 */
function SetCurrentArena(arenaNum) {
	// FIXME Stop spawning body queue ents with AREANNUM_NONE so we
	// can enable this.
	// if (!level.arenas[arenaNum]) {
	// 	error('SetCurrentArena: Bad arena number \'' + arenaNum + '\'');
	// }

	level.arena = level.arenas[arenaNum];
}

/**
 * RunArenas
 */
function RunArenas() {
	// Update infostrings if anything has been changed.
	if (Cvar.Modified(Cvar.FLAGS.ARENAINFO)) {
		ArenaInfoChanged();
		Cvar.ClearModified(Cvar.FLAGS.ARENAINFO);
	}

	// Run the gameplay logic for each arena.
	for (var i = 0; i < level.arenas.length; i++) {
		level.arena = level.arenas[i];

		// Run the frame callback for the state machine.
		if (level.arena.state) {
			level.arena.state.frame();
		}
	}
}

/**
 * ArenaInfoChanged
 */
function ArenaInfoChanged() {
	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':name', level.arena.name);
	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':gametype', g_gametype.at(level.arena.arenaNum).get());
	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':playersPerTeam', g_playersPerTeam.at(level.arena.arenaNum).get());
	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':roundlimit', g_roundlimit.at(level.arena.arenaNum).get());
}

/**
 * SendArenaCommand
 */
function SendArenaCommand(type, data) {
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum === level.arena.arenaNum) {
			SV.SendServerCommand(i, type, data);
		}
	}
}

/**
 * ArenaRestart
 */
function ArenaRestart() {
	// Respawn everybody.
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.team === TEAM.SPECTATOR) {
			continue;
		}

		// Reset individual client scores.
		ent.client.ps.persistant[PERS.SCORE] = 0;

		ClientSpawn(ent);
	}

	// FIXME clear out gentities.
}

/**********************************************************
 *
 * Tournament
 *
 **********************************************************/

/**
 * CreateTournamentMachine
 */
function CreateTournamentMachine() {
	level.arena.state = StateMachine.create({
		initial: {
			event: 'wait',
			state: GS.WAITING,
			defer: true
		},
		events: [
			{ name: 'wait',         from: ['none', GS.COUNTDOWN, GS.ACTIVE],     to: GS.WAITING      },
			{ name: 'ready',        from: GS.WAITING,                            to: GS.COUNTDOWN    },
			{ name: 'start',        from: GS.COUNTDOWN,                          to: GS.ACTIVE       },
			{ name: 'end',          from: [GS.WAITING, GS.COUNTDOWN, GS.ACTIVE], to: GS.OVER         },
			{ name: 'intermission', from: GS.OVER,                               to: GS.INTERMISSION },
			{ name: 'restart',      from: GS.INTERMISSION,                       to: GS.WAITING      }
		],
		callbacks: {
			onwait: function (event, from, to, msg) {
			},
			onready: function (event, from, to, msg) {
				TournamentReady();
			},
			onstart: function (event, from, to, msg) {
				TournamentStart();
			},
			onend: function (event, from, to, msg) {
				TournamentEnd(msg);
			},
			onintermission: function (event, from, to, msg) {
				TournamentIntermission();
			},
			onrestart: function (event, from, to, msg) {
				TournamentRestart();
			},
			// Called after all events.
			onafterevent: function () {
				SV.SetConfigstring('arena:' + level.arena.arenaNum + ':gamestate', level.arena.state.current);
			}
		}
	});

	// Callback for the game to run each frame.
	level.arena.state.frame = CheckTournamentRules;

	// Fire initial state change.
	level.arena.state.wait();
}

/**
 * CheckTournamentRules
 *
 * Used by GT.FFA, GT.TOURNAMENT, GT.TEAM, GT.CTF.
 */
function CheckTournamentRules() {
	var state = level.arena.state;

	// Are there enough players for the match?
	var enough = function () {
		if (level.arena.gametype >= GT.TEAM) {
			var counts = new Array(TEAM.NUM_TEAMS);
			counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, ENTITYNUM_NONE);
			counts[TEAM.RED] = TeamCount(TEAM.RED, ENTITYNUM_NONE);

			if (counts[TEAM.RED] < 1 || counts[TEAM.BLUE] < 1) {
				return false;
			}
		} else {
			if (level.arena.numPlayingClients < 2) {
				return false;
			}
		}

		return true;
	};

	//
	if (state.current === GS.WAITING) {
		if (!ScoreIsTied() && TimelimitHit()) {
			state.end('Timelimit hit.');
			return;
		}

		// Cycle spectators in tournament mode.
		if (level.arena.gametype === GT.TOURNAMENT) {
			while (true) {
				if (enough()) {
					break;
				}

				// Try to pull a client from the queue if we don't have enough.
				var next = PopClientFromQueue();
				if (!next) {
					break;
				}

				SetTeam(next, 'f');
			}
		}

		if (enough()) {
			// Start countdown.
			state.ready();
		}
	} else if (state.current === GS.COUNTDOWN) {
		if (!ScoreIsTied() && TimelimitHit()) {
			state.end('Timelimit hit.');
			return;
		}

		// If we don't have two players, go back to "waiting for players".
		if (!enough()) {
			state.wait();
			return;
		}

		if (level.time > level.arena.warmupTime) {
			// Start the match!
			state.start();
		}
	} else if (state.current === GS.ACTIVE) {
		if (!ScoreIsTied() && TimelimitHit()) {
			state.end('Timelimit hit.');
			return;
		}

		if (!enough()) {
			// Go back to waiting.
			state.wait();
			return;
		}

		// Check for sudden death.
		if (ScoreIsTied()) {
			// Always wait for sudden death.
			return;
		}

		// Check exit conditions.
		if (level.arena.gametype < GT.CTF && g_fraglimit.get()) {
			if (level.arena.teamScores[TEAM.RED] >= g_fraglimit.get()) {
				state.end('Red hit the fraglimit.');
				return;
			}

			if (level.arena.teamScores[TEAM.BLUE] >= g_fraglimit.get()) {
				state.end('Blue hit the fraglimit.');
				return;
			}

			// See if a client has hit the frag limit (GT.FFA, GT.TOURNAMENT).
			for (var i = 0; i < level.maxclients; i++) {
				var client = level.clients[i];

				if (client.pers.connected !== CON.CONNECTED) {
					continue;
				}
				if (client.sess.team !== TEAM.FREE) {
					continue;
				}

				if (client.ps.persistant[PERS.SCORE] >= g_fraglimit.get()) {
					state.end(client.pers.name + '^' + QS.COLOR.WHITE + 'hit the fraglimit.');
					return;
				}
			}
		} else if (level.arena.gametype >= GT.CTF && g_capturelimit.get()) {
			if (level.arena.teamScores[TEAM.RED] >= g_capturelimit.get()) {
				state.end('Red hit the capturelimit.');
				return;
			}

			if (level.arena.teamScores[TEAM.BLUE] >= g_capturelimit.get()) {
				state.end('Blue hit the capturelimit.');
				return;
			}
		}
	} else if (state.current === GS.OVER) {
		if (IntermissionStarted()) {
			state.intermission();
		}
	} else if (state.current === GS.INTERMISSION) {
		if (CheckIntermissionExit()) {
			state.restart();
		}
	}
}

/**
 * ScoreIsTied
 */
function ScoreIsTied() {
	if (level.arena.numPlayingClients < 2) {
		return false;
	}

	if (level.arena.gametype >= GT.TEAM) {
		return (level.arena.teamScores[TEAM.RED] === level.arena.teamScores[TEAM.BLUE]);
	}

	var a = level.clients[level.arena.sortedClients[0]].ps.persistant[PERS.SCORE];
	var b = level.clients[level.arena.sortedClients[1]].ps.persistant[PERS.SCORE];

	return (a === b);
}

/**
 * TournamentReady
 */
function TournamentReady() {
	log('TournamentReady');

	// Fudge by -1 to account for extra delays.
	level.arena.warmupTime = 0;

	if (g_warmup.get() > 1) {
		level.arena.warmupTime = level.time + (g_warmup.get() - 1) * 1000;
	}

	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':warmupTime', level.arena.warmupTime);
}

/**
 * TournamentStart
 *
 * Called after warmup is over.
 */
function TournamentStart() {
	log('TournamentStart');

	ArenaRestart();
}

/**
 * TournamentEnd
 */
function TournamentEnd(msg) {
	log('TournamentEnd');

	QueueIntermission(msg);
}

/**
 * TournamentIntermission
 */
function TournamentIntermission() {
	log('TournamentIntermission');
	BeginIntermission();
}

/**
 * TournamentRestart
 */
function TournamentRestart() {
	log('TournamentRestart');

	// If we are running a tournement map, kick the loser to spectator status,
	// which will automatically grab the next spectator and restart.
	if (level.arena.gametype === GT.TOURNAMENT) {
		level.arena.intermissionTime = 0;

		QueueTournamentLoser();
		ArenaRestart();

		return;
	}

	ExitIntermission();
}

/**
 * QueueTournamentLoser
 */
function QueueTournamentLoser() {
	if (level.arena.numPlayingClients !== 2) {
		return;
	}

	var clientNum = level.arena.sortedClients[1];
	var ent = level.gentities[clientNum];

	if (ent.client.pers.connected !== CON.CONNECTED) {
		return;
	}

	// Make them a spectator.
	SetTeam(ent, 's');

	PushClientToQueue(ent);
}

/**********************************************************
 *
 * Clan Arena
 *
 **********************************************************/

/**
 * CreateRoundMachine
 */
function CreateRoundMachine() {
	var initialEvent = 'wait';
	var initialState = GS.WAITING;

	if (level.arena.gametype === GT.PRACTICEARENA) {
		initialEvent = 'start';
		initialState = GS.ACTIVE;
	}

	level.arena.state = StateMachine.create({
		initial: {
			event: initialEvent,
			state: initialState,
			defer: true
		},
		events: [
			{ name: 'wait',         from: ['none', GS.COUNTDOWN],     to: GS.WAITING      },
			{ name: 'ready',        from: GS.WAITING,                 to: GS.COUNTDOWN },
			{ name: 'start',        from: GS.COUNTDOWN,               to: GS.ACTIVE    },
			{ name: 'end',          from: GS.ACTIVE,                  to: GS.OVER      },
			{ name: 'intermission', from: GS.OVER,                    to: GS.INTERMISSION },
			{ name: 'restart',      from: [GS.OVER, GS.INTERMISSION], to: GS.WAITING   }
		],
		callbacks: {
			onwait: function (event, from, to, msg) {
			},
			onready: function (event, from, to, msg) {
				RoundReady();
			},
			onstart: function (event, from, to, msg) {
				RoundStart();
			},
			onend: function (event, from, to, msg) {
				RoundEnd(msg);
			},
			onintermission: function (event, from, to, msg) {
				RoundIntermission();
			},
			onrestart: function (event, from, to, msg) {
				RoundRestart();
			},
			// Called after all events.
			onafterevent: function () {
				SV.SetConfigstring('arena:' + level.arena.arenaNum + ':gamestate', level.arena.state.current);
			}
		}
	});

	// Callback for the game to run each frame.
	level.arena.state.frame = CheckRoundRules;

	// Fire initial state change.
	level.arena.state[initialEvent]();
}

/**
 * CheckRoundRules
 */
function CheckRoundRules() {
	switch (level.arena.state.current) {
		case GS.WAITING:
			RoundRunWaiting();
			break;

		case GS.COUNTDOWN:
			RoundRunCountdown();
			break;

		case GS.ACTIVE:
			RoundRunActive();
			break;

		case GS.OVER:
			RoundRunOver();
			break;

		case GS.INTERMISSION:
			RoundRunIntermission();
			break;
	}
}

/**
 * RoundRunWaiting
 */
function RoundRunWaiting() {
	var count1 = function () {
		return TeamCount(TEAM.RED, ENTITYNUM_NONE);
	};
	var count2 = function () {
		return TeamCount(TEAM.BLUE, ENTITYNUM_NONE);
	};

	if (level.arena.gametype === GT.CLANARENA) {
		if (count1() >= 1 && count2() >= 1) {
			level.arena.state.ready();
		}
	} else if (level.arena.gametype === GT.ROCKETARENA) {
		// Spawn in the next team.
		while (true) {
			// Free up the team if they all left.
			if (!count1()) {
				level.arena.group1 = null;
				CalculateRanks();
			}
			if (!count2()) {
				level.arena.group2 = null;
				CalculateRanks();
			}

			// If we have everyone, lets rock and roll.
			if (count1() && count2()) {
				break;
			}

			// Pull the next team from the queue.
			var nextInLine = PopClientFromQueue();
			if (!nextInLine) {
				break;
			}

			var group = nextInLine.client.sess.group;

			level.arena[!count1() ? 'group1' : 'group2'] = group;

			DequeueGroup(group);
		}

		if (count1() >= 1 && count2() >= 1) {
			level.arena.state.ready();
		}
	} else {
		error('Unsupported gametype.');
	}
}

/**
 * RoundReady
 */
function RoundReady() {
	log('RoundWarmup');

	// Fudge by -1 to account for extra delays.
	level.arena.warmupTime = 0;

	if (g_warmup.get() > 1) {
		level.arena.warmupTime = level.time + (g_warmup.get() - 1) * 1000;
	}

	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':warmupTime', level.arena.warmupTime);
}

/**
 * RoundRunCountdown
 */
function RoundRunCountdown() {
	var count1 = function () {
		return TeamCount(TEAM.RED, ENTITYNUM_NONE);
	};
	var count2 = function () {
		return TeamCount(TEAM.BLUE, ENTITYNUM_NONE);
	};

	if (!count1() || !count2()) {
		level.arena.state.wait();
	}

	if (level.time > level.arena.warmupTime) {
		level.arena.state.start();
	}
}

/**
 * RoundStart
 *
 * Called after warmup is over.
 */
function RoundStart() {
	log('RoundStart');

	// TODO Make sure everyone is alive.
}

/**
 * RoundRunActive
 */
function RoundRunActive() {
	// Practice arena is always actice.
	if (level.arena.gametype === GT.PRACTICEARENA) {
		return;
	}

	var alive1 = TeamAliveCount(TEAM.RED);
	var alive2 = TeamAliveCount(TEAM.BLUE);

	if (!alive1 && !alive2) {
		level.arena.state.end(null);
	} else if (!alive1) {
		level.arena.state.end(TEAM.BLUE);
	} else if (!alive2) {
		level.arena.state.end(TEAM.RED);
	}
}

/**
 * RoundEnd
 */
function RoundEnd(winningTeam) {
	log('RoundEnd', winningTeam);

	if (level.arena.gametype === GT.CLANARENA && winningTeam !== null) {
		level.arena.teamScores[winningTeam] += 1;
	}
	level.arena.lastWinningTeam = winningTeam;

	// Let everyone know who won.
	var str;

	if (winningTeam === null) {
		str = 'The round was a draw.'
	} else {
		var teamName;

		if (winningTeam === TEAM.RED) {
			teamName = level.arena.gametype === GT.ROCKETARENA ?
				level.arena.group1 :
				'Red team';
		} else if (winningTeam === TEAM.BLUE) {
			teamName = level.arena.gametype === GT.ROCKETARENA ?
				level.arena.group2 :
				'Blue team';
		}

		str = teamName + ' won the round.'
	}

	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':winningTeam', str);

	// Go to intermission if the roundlimit was hit.
	var roundlimit = g_roundlimit.at(level.arena.arenaNum).get();

	// Roundlimit is the number of rounds to be played at maximum,
	// end the match once a team has passed the halfway mark.
	if (level.arena.teamScores[TEAM.RED] >= Math.ceil(roundlimit / 2)) {
		QueueIntermission('Red team won the match.');
	} else if (level.arena.teamScores[TEAM.BLUE] >= Math.ceil(roundlimit / 2)) {
		QueueIntermission('Blue team won the match.');
	} else {
		level.arena.restartTime = level.time + 4000;
	}

	// We're calling this purely to update score1 / score2,
	// maybe that should be split out.
	CalculateRanks();
}

/**
 * RoundRunOver
 */
function RoundRunOver() {
	if (IntermissionStarted()) {
		level.arena.state.intermission();
	}

	if (level.arena.restartTime && level.time > level.arena.restartTime) {
		level.arena.state.restart();
	}
}

/**
 * RoundIntermission
 */
function RoundIntermission() {
	log('RoundIntermission');
	BeginIntermission();
}

/**
 * RoundRunIntermission
 */
function RoundRunIntermission() {
	if (CheckIntermissionExit()) {
		// Reset scores.
		for (var i = 0; i < TEAM.NUM_TEAMS; i++) {
			level.arena.teamScores[i] = 0;
		}

		// We're calling this purely to update score1 / score2,
		// maybe that should be split out.
		CalculateRanks();

		level.arena.state.restart();
	}
}

/**
 * RoundRestart
 *
 * Called a few seconds after a round has ended.
 */
function RoundRestart() {
	log('RoundRestart');

	level.arena.intermissionTime = 0;
	level.arena.restartTime = 0;

	if (level.arena.gametype === GT.ROCKETARENA) {
		// Queue losing team in RA.
		if (level.arena.lastWinningTeam === TEAM.RED) {
			QueueGroup(level.arena.group2);
			level.arena.group2 = null;

			// Respawn winners.
			RespawnTeam(TEAM.RED);
		} else if (level.arena.lastWinningTeam === TEAM.BLUE) {
			QueueGroup(level.arena.group1);
			level.arena.group1 = null;

			// Move winners to red team.
			for (var i = 0; i < level.maxclients; i++) {
				var ent = level.gentities[i];

				if (!ent.inuse) {
					continue;
				}
				if (ent.s.arenaNum !== level.arena.arenaNum) {
					continue;
				}

				if (ent.client.sess.group === level.arena.group2) {
					ForceTeam(ent, TEAM.RED);
				}
			}

			level.arena.group1 = level.arena.group2;
			level.arena.group2 = null;
		}
		// Noone won, respawn both teams.
		else {
			RespawnTeam(TEAM.RED);
			RespawnTeam(TEAM.BLUE);
		}
	}
	// Always respawn both teams in CA.
	else if (level.arena.gametype === GT.CLANARENA) {
		RespawnTeam(TEAM.RED);
		RespawnTeam(TEAM.BLUE);
	}
}

/**
 * QueueGroup
 */
function QueueGroup(group) {
	log('Queuing group', group);

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.group === group) {
			ForceTeam(ent, TEAM.SPECTATOR);
			continue;
		}
	}
}

/**
 * DequeueGroup
 */
function DequeueGroup(group) {
	log('Dequeuing group', group);

	var team;
	if (level.arena.group1 === group) {
		team = TEAM.RED;
	} else if (level.arena.group2 === group) {
		team = TEAM.BLUE;
	} else {
		error('No active group to match', group);
	}

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.group === group) {
			ForceTeam(ent, team);
		}
	}
}

/**
 * RespawnTeam
 */
function RespawnTeam(team) {
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.team === team) {
			// No longer eliminated.
			ent.client.pers.teamState.state = TEAM_STATE.BEGIN;
			ClientSpawn(ent);
		}
	}
}

/**
 * ForceTeam
 */
function ForceTeam(ent, team) {
	ent.client.sess.team = team;
	ent.client.sess.spectatorState = team === TEAM.SPECTATOR ? SPECTATOR.FREE : SPECTATOR.NOT;
	ent.client.pers.teamState.state = TEAM_STATE.BEGIN;

	// Go to the end of the line as spec.
	if (team === TEAM.SPECTATOR) {
		PushClientToQueue(ent);
	}

	TossClientItems(ent);

	ClientUserinfoChanged(ent.s.number);
	ClientSpawn(ent);

	CalculateRanks();
}

/**********************************************************
 *
 * Spectator queuing
 *
 * Used by 1v1 and CA rounds.
 *
 **********************************************************/

/**
 * PopClientFromQueue
 */
function PopClientFromQueue() {
	var nextInLine = null;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.team !== TEAM.SPECTATOR) {
			continue;
		}

		// Don't pop if not in a group.
		if (level.arena.gametype === GT.ROCKETARENA && ent.client.sess.group === null) {
			continue;
		}

		// Never select the dedicated follow or scoreboard clients.
		if (ent.client.sess.spectatorState === SPECTATOR.SCOREBOARD ||
			ent.client.sess.spectatorClient < 0) {
			continue;
		}

		if (!nextInLine || ent.client.sess.spectatorNum > nextInLine.client.sess.spectatorNum) {
			nextInLine = ent;
		}
	}

	if (!nextInLine) {
		return null;
	}

	log('Popping client', nextInLine.s.number, 'from end of queue');

	return nextInLine;
}

/**
 * PushClientToQueue
 *
 * Add client to end of the queue.
 */
function PushClientToQueue(ent) {
	var client = ent.client;

	log('Pushing client', ent.s.number, 'to beginning of queue');

	for (var i = 0; i < level.maxclients; i++) {
		var cur = level.gentities[i];

		if (!cur.inuse) {
			continue;
		}

		if (cur.s.arenaNum !== ent.s.arenaNum) {
			continue;
		}

		if (cur === ent) {
			cur.client.sess.spectatorNum = 0;
		} else if (cur.client.sess.team === TEAM.SPECTATOR) {
			cur.client.sess.spectatorNum++;
		}
	}
}

/**********************************************************
 *
 * Intermission
 *
 **********************************************************/

/**
 * TimelimitHit
 */
function TimelimitHit() {
	if (!g_timelimit.get()) {
		return false;
	}

	return level.time - level.startTime >= g_timelimit.get() * 60000;
}

/**
 * IntermissionStarted
 */
function IntermissionStarted() {
	if (!level.arena.intermissionTime) {
		return false;
	}

	return (level.time - level.arena.intermissionTime) >= 0;
}

/**
 * QueueIntermission
 */
function QueueIntermission(msg) {
	level.arena.intermissionTime = level.time + INTERMISSION_DELAY_TIME;

	SV.SendServerCommand(null, 'print', msg);

	// FIXME make part of arena info
	// // This will keep the clients from playing any voice sounds
	// // that will get cut off when the queued intermission starts.
	// SV.SetConfigstring('intermission', 1);
}

/**
 * BeginIntermission
 */
function BeginIntermission() {
	// If in tournement mode, change the wins / losses.
	if (level.arena.gametype === GT.TOURNAMENT) {
		AdjustTournamentScores();
	}

	// Move all clients to the intermission point.
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}

		// Respawn if dead.
		if (ent.health <= 0) {
			ClientRespawn(ent);
		}

		MoveClientToIntermission(ent);
	}

	// Send the current scoring to all clients.
	SendScoreboardMessageToAllClients();
}

/**
 * MoveClientToIntermission
 *
 * When the intermission starts, this will be called for all players.
 * If a new client connects, this will be called after the spawn function.
 */
function MoveClientToIntermission(ent) {
	// Take out of follow mode if needed.
	if (ent.client.sess.spectatorState === SPECTATOR.FOLLOW) {
		StopFollowing(ent);
	}

	var origin = vec3.create();
	var angles = vec3.create();

	SelectIntermissionSpawnPoint(origin, angles);

	// Move to the spot.
	vec3.set(origin, ent.s.origin);
	vec3.set(origin, ent.client.ps.origin);
	vec3.set(angles, ent.client.ps.viewangles);
	ent.client.ps.pm_type = PM.INTERMISSION;

	// Clean up powerup info.
// 	memset(ent.client.ps.powerups, 0, ent.client.ps.powerups.length);

	ent.client.ps.eFlags = 0;
	ent.s.eFlags = 0;
	ent.s.eType = ET.GENERAL;
	ent.s.modelIndex = 0;
	ent.s.loopSound = 0;
	ent.s.event = 0;
	ent.r.contents = 0;
}

/**
 * CheckIntermissionExit
 *
 * The level will stay at the intermission for a minimum of 5 seconds
 * If all players wish to continue, the level will then exit.
 * If one or more players have not acknowledged the continue, the game will
 * wait 10 seconds before going on.
 */
function CheckIntermissionExit() {
	// See which players are ready.
	var ready = 0;
	var notReady = 0;
	var readyMask = 0;
	var playerCount = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];

		if (client.pers.connected !== CON.CONNECTED) {
			continue;
		}

		playerCount++;

		if (client.readyToExit) {
			ready++;

			if (i < 16) {
				readyMask |= 1 << i;
			}
		} else {
			notReady++;
		}
	}

	// Copy the readyMask to each player's stats so
	// it can be displayed on the scoreboard
	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];
		if (client.pers.connected !== CON.CONNECTED) {
			continue;
		}

		client.ps.stats[STAT.CLIENTS_READY] = readyMask;
	}

	// Never exit in less than five seconds.
	if (level.time < level.arena.intermissionTime + 5000) {
		return;
	}

	// Only test ready status when there are real players present.
	if (playerCount > 0) {
		// If nobody wants to go, clear timer.
		if (!ready) {
			level.readyToExit = false;
			return false;
		}

		// If everyone wants to go, go now.
		if (!notReady) {
			return true;
		}
	}

	// The first person to ready starts the ten second timeout.
	if (!level.readyToExit) {
		level.readyToExit = true;
		level.exitTime = level.time;
	}

	// If we have waited ten seconds since at least one player
	// wanted to exit, go ahead.
	if (level.time < level.exitTime + 10000) {
		return false;
	}

	return true;
}

/*
 * ExitIntermission
 *
 * When the intermission has been exited, the server is either killed
 * or moved to a new level based on the "nextmap" cvar.
 */
function ExitIntermission() {
	var nextmap = Cvar.AddCvar('nextmap');

	level.arena.intermissionTime = 0;

	// If no nextmap is specified, let the default map restart occur.
	if (!nextmap.get()) {
		return;
	}

	// We need to do this here before changing to CON_CONNECTING.
	WriteWorldSession();

	// Change all client states to connecting, so the early players into the
	// next level will know the others aren't done reconnecting.
	for (var i = 0; i < level.maxclients; i++) {
		if (level.clients[i].pers.connected === CON.CONNECTED) {
			level.clients[i].pers.connected = CON.CONNECTING;
		}
	}

	SV.ExecuteBuffer('vstr nextmap');
}

/**********************************************************
 *
 * Player Counting / Score Sorting
 *
 **********************************************************/

/**
 * CalculateRanks
 */
function CalculateRanks() {
	var rank;
	var score;
	var newScore;

	// level.arena.follow1 = -1;
	// level.arena.follow2 = -1;
	level.arena.numConnectedClients = 0;
	level.arena.numNonSpectatorClients = 0;
	level.arena.numPlayingClients = 0;

	// for (var i = 0; i < level.numteamVotingClients.length; i++) {
	// 	level.numteamVotingClients[i] = 0;
	// }

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.pers.connected === CON.DISCONNECTED) {
			continue;
		}

		level.arena.sortedClients[level.arena.numConnectedClients] = i;
		level.arena.numConnectedClients++;

		if (ent.client.sess.team !== TEAM.SPECTATOR) {
			level.arena.numNonSpectatorClients++;

			// Decide if this should be auto-followed.
			if (ent.client.pers.connected === CON.CONNECTED) {
				level.arena.numPlayingClients++;

				// if (level.clients[i].sess.team == TEAM.RED) {
				// 	level.numteamVotingClients[0] += 1;
				// } else if (level.clients[i].sess.team == TEAM.BLUE) {
				// 	level.numteamVotingClients[1] += 1;
				// }

				// if (level.follow1 === -1) {
				// 	level.follow1 = i;
				// } else if (level.follow2 === -1) {
				// 	level.follow2 = i;
				// }
			}
		}
	}

	level.arena.sortedClients.sort(SortRanks);

	// Set the rank value for all clients that are connected and not spectators.
	if (level.arena.gametype >= GT.TEAM) {
		// In team games, rank is just the order of the teams, 0=red, 1=blue, 2=tied.
		for (var i = 0; i < level.arena.numPlayingClients; i++) {
			var client = level.clients[level.arena.sortedClients[i]];

			if (level.arena.teamScores[TEAM.RED] === level.arena.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 2;
			} else if (level.arena.teamScores[TEAM.RED] > level.arena.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 0;
			} else {
				client.ps.persistant[PERS.RANK] = 1;
			}
		}
	} else {
		rank = -1;
		score = 0;
		for (var i = 0; i < level.arena.numPlayingClients; i++) {
			var client = level.clients[level.arena.sortedClients[i]];

			newScore = client.ps.persistant[PERS.SCORE];

			if (i === 0 || newScore !== score) {
				rank = i;
				// Assume we aren't tied until the next client is checked.
				level.clients[level.arena.sortedClients[i]].ps.persistant[PERS.RANK] = rank;
			} else {
				// We are tied with the previous client.
				level.clients[level.arena.sortedClients[i - 1]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
				level.clients[level.arena.sortedClients[i    ]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
			}

			score = newScore;
		}
	}

	// Set the CS_SCORES1/2 configstrings, which will be visible to everyone.
	var score1 = null;
	var score2 = null;

	if (level.arena.gametype === GT.ROCKETARENA) {
		score1 = !level.arena.group1 ? null : {
			group: level.arena.group1,
			score: TeamGroupScore(level.arena.group1),
			count: TeamCount(TEAM.RED, ENTITYNUM_NONE),
			alive: TeamAliveCount(TEAM.RED)
		};

		score2 = !level.arena.group2 ? null : {
			group: level.arena.group2,
			score: TeamGroupScore(level.arena.group2),
			count: TeamCount(TEAM.BLUE, ENTITYNUM_NONE),
			alive: TeamAliveCount(TEAM.BLUE)
		};
	}
	else if (level.arena.gametype >= GT.TEAM) {
		score1 = {
			score: level.arena.teamScores[TEAM.RED],
			count: TeamCount(TEAM.RED, ENTITYNUM_NONE),
			alive: TeamAliveCount(TEAM.RED)
		};

		score2 = {
			score: level.arena.teamScores[TEAM.BLUE],
			count: TeamCount(TEAM.BLUE, ENTITYNUM_NONE),
			alive: TeamAliveCount(TEAM.BLUE)
		};
	} else {
		var n1 = level.arena.sortedClients[0];
		var n2 = level.arena.sortedClients[1];

		if (level.arena.numConnectedClients === 0) {
			score1 = null;
			score2 = null;
		} else if (level.arena.numConnectedClients === 1) {
			score1 = {
				clientNum: n1,
				score: level.clients[n1].ps.persistant[PERS.SCORE]
			};

			score2 = null;
		} else {
			score1 = {
				clientNum: n1,
				score: level.clients[n1].ps.persistant[PERS.SCORE]
			};

			score2 = {
				clientNum: n2,
				score: level.clients[n2].ps.persistant[PERS.SCORE]
			};
		}
	}
	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':score1', score1);
	SV.SetConfigstring('arena:' + level.arena.arenaNum + ':score2', score2);

	// If we are at the intermission, send the new info to everyone.
	if (IntermissionStarted()) {
		SendScoreboardMessageToAllClients();
	}
}

/**
 * AdjustTournamentScores
 */
function AdjustTournamentScores() {
	var clientNum = level.arena.sortedClients[0];
	if (level.clients[clientNum].pers.connected === CON.CONNECTED) {
		level.clients[clientNum].sess.wins++;
		ClientUserinfoChanged(clientNum);
	}

	clientNum = level.arena.sortedClients[1];
	if (level.clients[clientNum].pers.connected === CON.CONNECTED) {
		level.clients[clientNum].sess.losses++;
		ClientUserinfoChanged(clientNum);
	}
}

/**
 * SortRanks
 */
function SortRanks(a, b) {
	var ca = level.clients[a];
	var cb = level.clients[b];

	// Sort special clients last.
	if (ca.sess.spectatorState === SPECTATOR.SCOREBOARD || ca.sess.spectatorClient < 0) {
		return 1;
	}
	if (cb.sess.spectatorState === SPECTATOR.SCOREBOARD || cb.sess.spectatorClient < 0) {
		return -1;
	}

	// Then connecting clients.
	if (ca.pers.connected === CON.CONNECTING) {
		return 1;
	}
	if (cb.pers.connected === CON.CONNECTING) {
		return -1;
	}

	// Then spectators.
	if (ca.sess.team === TEAM.SPECTATOR && cb.sess.team === TEAM.SPECTATOR) {
		if (ca.sess.spectatorNum > cb.sess.spectatorNum) {
			return -1;
		}
		if (ca.sess.spectatorNum < cb.sess.spectatorNum) {
			return 1;
		}
		return 0;
	}
	if (ca.sess.team === TEAM.SPECTATOR) {
		return 1;
	}
	if (cb.sess.team === TEAM.SPECTATOR) {
		return -1;
	}

	// Then sort by score.
	if (ca.ps.persistant[PERS.SCORE] > cb.ps.persistant[PERS.SCORE]) {
		return -1;
	}
	if (ca.ps.persistant[PERS.SCORE] < cb.ps.persistant[PERS.SCORE]) {
		return 1;
	}
	return 0;
}
		var playerMins = vec3.createFrom(-15, -15, -24);
var playerMaxs = vec3.createFrom(15, 15, 32);

/**
 * ClientConnect
 *
 * Called when a player begins connecting to the server.
 * Called again for every map change or tournement restart.
 *
 * The session information will be valid after exit.
 *
 * Return NULL if the client should be allowed, otherwise return
 * a string with the reason for denial.
 *
 * Otherwise, the client will be sent the current gamestate
 * and will eventually get to ClientBegin.
 *
 * firstTime will be true the very first time a client connects
 * to the server machine, but false on map changes and tournement
 * restarts.
 */
function ClientConnect(clientNum, firstTime) {
	var ent = level.gentities[clientNum];
	var client = level.clients[clientNum];
	var userinfo = SV.GetUserinfo(clientNum);

	ent.reset();
	client.reset();

	ent.inuse = true;
	ent.s.number = client.ps.clientNum = clientNum;
	ent.s.arenaNum = client.ps.arenaNum = 0;  // by default, use arena 0
	ent.client = client;
	ent.client.pers.connected = CON.CONNECTING;

	// Set the global arena.
	SetCurrentArena(ent.s.arenaNum);

	// Read or initialize the session data.
	if (firstTime || level.newSession) {
		InitSessionData(client, userinfo);
	}
	ReadSessionData(client);

	// Get and distribute relevent parameters.
	ClientUserinfoChanged(clientNum);

	// Don't do the "xxx connected" messages if they were caried over from previous level
	if (firstTime) {
		SV.SendServerCommand(null, 'print', client.pers.name + ' connected');
	}

	if (level.arena.gametype >= GT.TEAM && client.sess.team !== TEAM.SPECTATOR) {
		BroadcastTeamChange(client, null);
	}

	// Count current clients and rank for scoreboard.
	CalculateRanks();
}

/**
 *
 * ClientUserinfoChanged
 *
 * Called from ClientConnect when the player first connects and
 * directly by the server system when the player updates a userinfo variable.
 *
 * The game can override any of the settings and call trap_SetUserinfo
 * if desired.
 */
function ClientUserinfoChanged(clientNum) {
	var userinfo = SV.GetUserinfo(clientNum);
	var ent = level.gentities[clientNum];
	var client = ent.client;

	client.pers.name = userinfo['name'];

	var cs = {
		'arena': client.ps.arenaNum,
		'name': client.pers.name,
		'team': client.sess.team,
		'group': client.sess.group
	};

	SV.SetConfigstring('player:' + clientNum, cs);
}

/**
 * ClientBegin
 *
 * Called when a client has connected and has the ACTIVE state.
 */
function ClientBegin(clientNum) {
	var ent = level.gentities[clientNum];
	var client = level.clients[clientNum];

	// Set the global arena.
	SetCurrentArena(ent.s.arenaNum);

	if (ent.r.linked) {
		SV.UnlinkEntity(ent);
	}

	ent.touch = 0;
	ent.pain = 0;

	client.pers.connected = CON.CONNECTED;
	client.pers.enterTime = level.time;
	client.pers.teamState.state = TEAM_STATE.BEGIN;

	// Save eflags around this, because changing teams will
	// cause this to happen with a valid entity, and we
	// want to make sure the teleport bit is set right
	// so the viewpoint doesn't interpolate through the
	// world to the new position.
	var flags = client.ps.eFlags;
	client.ps.reset();
	client.ps.eFlags = flags;

	ClientSpawn(ent);

	if (client.sess.team !== TEAM.SPECTATOR) {
		SendArenaCommand('print', client.pers.name + ' entered the game');
	}

	// Count current clients and rank for scoreboard.
	CalculateRanks();
}

/**
 * ClientDisconnect
 *
 * Called when a player drops from the server, will not be
 * called between levels.
 *
 * This should NOT be called directly by any game logic,
 * call SV.DropClient(), which will call this and do
 * server system housekeeping.
 */
function ClientDisconnect(clientNum) {
	var ent = level.gentities[clientNum];

	if (!ent.client || ent.client.pers.connected == CON.DISCONNECTED) {
		return;
	}

	// Set the global arena.
	SetCurrentArena(ent.s.arenaNum);

	// Stop any following clients.
	for (var i = 0; i < level.maxclients; i++) {
		if ( level.clients[i].sess.sessionTeam === TEAM.SPECTATOR &&
			level.clients[i].sess.spectatorState === SPECTATOR.FOLLOW &&
			level.clients[i].sess.spectatorClient === clientNum) {
			StopFollowing(level.gentities[i]);
		}
	}

	// Send effect if they were completely connected.
	if (ent.client.pers.connected === CON.CONNECTED &&
		ent.client.sess.sessionTeam !== TEAM.SPECTATOR) {
		var tent = TempEntity(ent.client.ps.origin, EV.PLAYER_TELEPORT_OUT);
		tent.s.clientNum = ent.s.clientNum;

		// They don't get to take powerups with them!
		// Especially important for stuff like CTF flags
		TossClientItems(ent);
	}

	log('ClientDisconnect: ' + clientNum);

	// FIXME - add to gm-arena logic
	// // If we are playing in tourney mode and losing, give a win to the other player.
	// if (level.arena.gametype === GT.TOURNAMENT &&
	// 	level.arena.gamestate === GS.ACTIVE &&
	// 	level.sortedClients[1] === clientNum) {
	// 	level.clients[level.sortedClients[0]].sess.wins++;
	// 	ClientUserinfoChanged(level.sortedClients[0]);
	// }

	// if( g_gametype.integer == GT_TOURNAMENT &&
	// 	ent->client->sess.sessionTeam == TEAM_FREE &&
	// 	level.intermissiontime ) {

	// 	trap_SendConsoleCommand( EXEC_APPEND, "map_restart 0\n" );
	// 	level.restarted = qtrue;
	// 	level.changemap = NULL;
	// 	level.intermissiontime = 0;
	// }

	SV.UnlinkEntity(ent);
	ent.inuse = false;
	ent.s.modelIndex = 0;
	ent.classname = 'disconnected';
	ent.client.pers.connected = CON.DISCONNECTED;
	ent.client.ps.persistant[PERS.TEAM] = TEAM.FREE;
	ent.client.sess.team = TEAM.FREE;

	SV.SetConfigstring('player:' + clientNum, null);

	CalculateRanks();
}

/**
 * ClientSpawn
 */
function ClientSpawn(ent) {
	var client = ent.client;
	var spawnOrigin = vec3.create();
	var spawnAngles = vec3.create();

	// Auto-eliminate if joining post warmup.
	if ((level.arena.gametype === GT.CLANARENA || level.arena.gametype === GT.ROCKETARENA) &&
	    level.arena.state.current > GS.COUNTDOWN) {
		client.sess.spectatorState = SPECTATOR.FREE;
		client.pers.teamState.state = TEAM_STATE.ELIMINATED;
	}

	// Find a spawn point.
	var spawnPoint;

	if (client.sess.team === TEAM.SPECTATOR ||
		// In CA mode, eliminated players become pseudo spectators.
		(level.arena.gametype >= GT.CLANARENA && client.pers.teamState.state === TEAM_STATE.ELIMINATED)) {
		spawnPoint = SelectSpectatorSpawnPoint(spawnOrigin, spawnAngles);
	} else {
		if (level.arena.gametype >= GT.CTF) {
			// All base oriented team games use the CTF spawn points.
			spawnPoint = SelectCTFSpawnPoint(client.sess.team, client.pers.teamState.state,
			                                 spawnOrigin, spawnAngles);
		} else {
			// Don't spawn near existing origin if possible.
			spawnPoint = SelectSpawnPoint(client.ps.origin, spawnOrigin, spawnAngles);
		}

		client.pers.teamState.state = TEAM_STATE.ACTIVE;
	}

	// Toggle the teleport bit so the client knows to not lerp
	// and never clear the voted flag.
	var flags = client.ps.eFlags & (EF.TELEPORT_BIT | EF.VOTED | EF.TEAMVOTED);
	flags ^= EF.TELEPORT_BIT;

	// Clear all the non-persistant data.
	var savedPers = client.pers.clone();
	var savedSess = client.sess.clone();
	var savedPsPers = new Array(MAX_PERSISTANT);
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		savedPsPers[i] = client.ps.persistant[i];
	}
	var savedAccuracyHits = client.accuracy_hits;
	var savedAccuracyShots = client.accuracy_shots;
	var savedEventSequence = client.ps.eventSequence;
	var savedPing = client.ps.ping;

	client.reset();

	// Restore persistant data.
	savedPers.clone(client.pers);
	savedSess.clone(client.sess);
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		client.ps.persistant[i] = savedPsPers[i];
	}
	client.accuracy_hits = savedAccuracyHits;
	client.accuracy_shots = savedAccuracyShots;
	client.ps.ping = savedPing;
	client.ps.clientNum = ent.s.number;
	client.ps.arenaNum = ent.s.arenaNum;
	client.ps.eventSequence = savedEventSequence;
	client.lastkilled_client = -1;

	// Increment the spawncount so the client will detect the respawn.
	client.ps.persistant[PERS.SPAWN_COUNT]++;
	client.ps.persistant[PERS.TEAM] = client.sess.team;

	client.airOutTime = level.time + 12000;

	// var userinfo = SV.GetUserinfo(ent.s.number);
	// // Set max health.
	// client.pers.maxHealth = userinfo.handicap;
	// if ( client.pers.maxHealth < 1 || client.pers.maxHealth > 100 ) {
		client.pers.maxHealth = 100;
	// }

	// Clear entity values.
	client.ps.stats[STAT.MAX_HEALTH] = client.pers.maxHealth;
	client.ps.eFlags = flags;

	ent.s.groundEntityNum = ENTITYNUM_NONE;
	ent.client = level.clients[ent.s.number];
	ent.takeDamage = true;
	ent.inuse = true;
	ent.classname = 'player';
	ent.r.contents = SURF.CONTENTS.BODY;
	ent.clipmask = MASK.PLAYERSOLID;
	ent.die = PlayerDie;
	ent.waterlevel = 0;
	ent.watertype = 0;
	ent.flags = 0;

	vec3.set(playerMins, ent.r.mins);
	vec3.set(playerMaxs, ent.r.maxs);

	// Set starting resources based on gametype.
	if (level.arena.gametype >= GT.CLANARENA) {
		client.ps.stats[STAT.WEAPONS] = (1 << WP.GAUNTLET);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.MACHINEGUN);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.SHOTGUN);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.GRENADE_LAUNCHER);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.ROCKET_LAUNCHER);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.LIGHTNING);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.RAILGUN);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.PLASMAGUN);

		client.ps.ammo[WP.GAUNTLET] = -1;
		client.ps.ammo[WP.MACHINEGUN] = -1;
		client.ps.ammo[WP.SHOTGUN] = -1;
		client.ps.ammo[WP.GRENADE_LAUNCHER] = -1;
		client.ps.ammo[WP.ROCKET_LAUNCHER] = -1;
		client.ps.ammo[WP.LIGHTNING] = -1;
		client.ps.ammo[WP.RAILGUN] = -1;
		client.ps.ammo[WP.PLASMAGUN] = -1;

		// Select the RL by default.
		client.ps.weapon = WP.ROCKET_LAUNCHER;

		// Start with 100/100.
		ent.health = client.ps.stats[STAT.HEALTH] = client.ps.stats[STAT.MAX_HEALTH];
		client.ps.stats[STAT.ARMOR] = client.ps.stats[STAT.MAX_HEALTH];
	} else {
		client.ps.stats[STAT.WEAPONS] = (1 << WP.GAUNTLET);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.MACHINEGUN);

		client.ps.ammo[WP.GAUNTLET] = -1;
		if (level.arena.gametype === GT.TEAM) {
			client.ps.ammo[WP.MACHINEGUN] = 50;
		} else {
			client.ps.ammo[WP.MACHINEGUN] = 100;
		}

		client.ps.weapon = WP.MACHINEGUN;

		// Health will count down towards max_health.
		ent.health = client.ps.stats[STAT.HEALTH] = client.ps.stats[STAT.MAX_HEALTH] + 25;
	}
	client.ps.weaponState = WS.READY;

	SetOrigin(ent, spawnOrigin);
	vec3.set(spawnOrigin, client.ps.origin);
	SetClientViewAngle(ent, spawnAngles);

	SV.GetUserCmd(ent.s.number, ent.client.pers.cmd);

	// The respawned flag will be cleared after the attack and jump keys come up.
	client.ps.pm_flags |= PMF.RESPAWNED;

	// Don't allow full run speed for a bit.
	client.ps.pm_flags |= PMF.TIME_KNOCKBACK;
	client.ps.pm_time = 100;

	client.respawnTime = level.time;
	client.inactivityTime = level.time + g_inactivity.get() * 1000;
	// client.latched_buttons = 0;

	// Set default animations.
	client.ps.torsoAnim = ANIM.TORSO_STAND;
	client.ps.legsAnim = ANIM.LEGS_IDLE;

	if (!IntermissionStarted()) {
		if (client.sess.team !== TEAM.SPECTATOR &&
			client.pers.teamState.state !== TEAM_STATE.ELIMINATED) {
			KillBox(ent);

			// Fire the targets of the spawn point.
			UseTargets(spawnPoint, ent);

			// Select the highest weapon number available, after any spawn given items have fired.
			if (level.arena.gametype < GT.CLANARENA) {
				for (var i = WP.NUM_WEAPONS - 1; i > 0; i--) {
					if (client.ps.stats[STAT.WEAPONS] & (1 << i)) {
						client.ps.weapon = i;
						break;
					}
				}
			}

			// Positively link the client, even if the command times are weird.
			vec3.set(ent.client.ps.origin, ent.r.currentOrigin);

			var tent = TempEntity(ent.client.ps.origin, EV.PLAYER_TELEPORT_IN);
			tent.s.clientNum = ent.s.clientNum;
			SV.LinkEntity(ent);
		}
	} else {
		// Move players to intermission.
		MoveClientToIntermission(ent);
	}

	// Clear entity state values.
	BG.PlayerStateToEntityState(client.ps, ent.s);

	// Run a client frame to drop exactly to the floor,
	// initialize weapon, animations and other things.
	client.ps.commandTime = level.time - 100;
	client.pers.cmd.serverTime = level.time;
	ClientThink(ent.s.number);

	// Run the presend to set anything else.
	ClientEndFrame(ent);
}

/**
 * ClientRespawn
 */
function ClientRespawn(ent) {
	CopyToBodyQueue(ent);
	ClientSpawn(ent);
}

/**
 * RunClient
 */
function RunClient(ent) {
	if (!g_synchronousClients.get()) {
		return;
	}

	ent.client.pers.cmd.serverTime = level.time;
	ClientThink_real(ent);
}

/**
 * ClientThink
 *
 * A new command has arrived from the client.
 */
function ClientThink(clientNum) {
	var ent = level.gentities[clientNum];

	// Set the global arena.
	SetCurrentArena(ent.s.arenaNum);

	// Grab the latest command.
	SV.GetUserCmd(clientNum, ent.client.pers.cmd);

	// Mark the time we got info, so we can display the
	// phone jack if they don't get any for a while.
	ent.client.lastCmdTime = level.time;

	// If we're running the synchronous ClientThink,
	// early out after we have stored off the latest
	// user cmd.
	if (g_synchronousClients.get()) {
		return;
	}

	ClientThink_real(ent);
}

/**
 * ClientThink_real
 *
 * This will be called once for each client frame, which will
 * usually be a couple times for each server frame on fast clients.
 *
 * If "g_synchronousClients 1" is set, this will be called exactly
 * once for each server frame, which makes for smooth demo recording.
 */
function ClientThink_real(ent) {
	var client = ent.client;
	var ucmd = client.pers.cmd;

	// Sanity check the command time to prevent speedup cheating.
	if (ucmd.serverTime > level.time + 200) {
		ucmd.serverTime = level.time + 200;
	}
	if (ucmd.serverTime < level.time - 1000) {
		ucmd.serverTime = level.time - 1000;
	}

	// Following others may result in bad times, but we still want
	// to check for follow toggles.
	var msec = ucmd.serverTime - client.ps.commandTime;
	if (msec < 1 && client.sess.spectatorState !== SPECTATOR.FOLLOW) {
		return;
	} else if (msec > 200) {
		msec = 200;
	}

	if (pmove_msec.get() < 8) {
		pmove_msec.set(8);
	} else if (pmove_msec.get() > 33) {
		pmove_msec.set(33);
	}

	if (pmove_fixed.get()) {
		ucmd.serverTime = Math.floor((ucmd.serverTime + pmove_msec.get() - 1) / pmove_msec.get()) * pmove_msec.get();
	}

	// // Check for exiting intermission.
	if (IntermissionStarted()) {
		ClientIntermissionThink(client);
		return;
	}

	// Spectators don't do much.
	if (client.sess.team === TEAM.SPECTATOR ||
		// Ignore eliminated players if they're still in the death state.
		(client.pers.teamState.state === TEAM_STATE.ELIMINATED && client.sess.spectatorState !== SPECTATOR.NOT)) {
		if (client.sess.spectatorState === SPECTATOR.SCOREBOARD) {
			return;
		}
		ClientSpectatorThink(ent, ucmd);
		return;
	}

	// // Check for inactivity timer, but never drop the local client of a non-dedicated server.
	// if (!ClientInactivityTimer(client)) {
	// 	return;
	// }

	// Clear the rewards if time.
	if (level.time > client.rewardTime) {
		client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP);
	}

	// Set pmove type.
	if (client.noclip) {
		client.ps.pm_type = PM.NOCLIP;
	} else if (client.ps.stats[STAT.HEALTH] <= 0) {
		client.ps.pm_type = PM.DEAD;
	} else {
		client.ps.pm_type = PM.NORMAL;
	}

	client.ps.gravity = g_gravity.get();
	client.ps.speed = g_speed.get();
	if (client.ps.powerups[PW.HASTE]) {
		client.ps.speed *= 1.3;
	}

	// Disable attacks during CA warmup.
	if (level.arena.gametype >= GT.CLANARENA) {
		if (level.arena.state.current === GS.COUNTDOWN) {
			client.ps.pm_flags |= PMF.NO_ATTACK;
		} else {
			client.ps.pm_flags &= ~PMF.NO_ATTACK;
		}
	}

	// Setup for pmove.
	var oldEventSequence = client.ps.eventSequence;
	var pm = new BG.PmoveInfo();
	pm.ps = client.ps;
	ucmd.clone(pm.cmd);
	pm.trace = Trace;
	pm.pointContents = PointContents;
	pm.pmove_fixed = pmove_fixed.get();
	pm.pmove_msec = pmove_msec.get();

	if (pm.ps.pm_type === PM.DEAD) {
		pm.tracemask = MASK.PLAYERSOLID & ~SURF.CONTENTS.BODY;
	} else {
		pm.tracemask = MASK.PLAYERSOLID;
	}

	// Check for the hit-scan gauntlet, don't let the action
	// go through as an attack unless it actually hits something.
	if (client.ps.weapon === WP.GAUNTLET && !(client.ps.pm_flags & PMF.NO_ATTACK) &&
		!(ucmd.buttons & BUTTON.TALK) && (ucmd.buttons & BUTTON.ATTACK) &&
		client.ps.weaponTime <= 0) {
		pm.gauntletHit = CheckGauntletAttack(ent);
	}
	if (ent.flags & GFL.FORCE_GESTURE) {
		ent.flags &= ~GFL.FORCE_GESTURE;
		client.pers.cmd.buttons |= BUTTON.GESTURE;
	}

	// Copy off position before pmove.
	vec3.set(client.ps.origin, client.oldOrigin);

	BG.Pmove(pm);

	BG.PlayerStateToEntityState(client.ps, ent.s);

	// We need to set the eventTime for predicted events added through BG.
	// However, if there is an externalEvent, the predicted event is going
	// to be sent out by SendPendingPredictableEvents and we shouldn't muck
	// with the externalEvent's time.
	if (!client.ps.externalEvent && client.ps.eventSequence !== oldEventSequence) {
		ent.eventTime = level.time;
	}

	SendPendingPredictableEvents(client.ps);

	// Update game entity info.
	// Use the snapped origin for linking so it matches client predicted versions
	vec3.set(ent.s.pos.trBase, ent.r.currentOrigin);
	vec3.set(pm.mins, ent.r.mins);
	vec3.set(pm.maxs, ent.r.maxs);
	ent.waterlevel = pm.waterlevel;
	ent.watertype = pm.watertype;

	// Execute client events.
	ClientEvents(ent, oldEventSequence);

	// Link entity now, after any personal teleporters have been used.
	SV.LinkEntity(ent);

	if (!client.noclip) {
		TouchTriggers(ent);
	}

	// NOTE: Now copy the exact origin over otherwise clients can be snapped into solid.
	vec3.set(client.ps.origin, ent.r.currentOrigin);

	// Touch other objects.
	ClientImpacts(ent, pm);
	if (!client.ps.externalEvent && client.ps.eventSequence !== oldEventSequence) {
		ent.eventTime = level.time;
	}

	// Swap and latch button actions.
	client.oldbuttons = client.buttons;
	client.buttons = ucmd.buttons;

	// Check for respawning.
	if (client.ps.pm_type === PM.DEAD) {
		// Wait for the attack button to be pressed.
		if (level.time > client.respawnTime) {
			// Forcerespawn is to prevent users from waiting out powerups.
			if (g_forceRespawn.get() > 0 &&
				(level.time - client.respawnTime) > g_forceRespawn.get() * 1000) {
				ClientRespawn(ent);
				return;
			}

			// Pressing attack or use is the normal respawn method
			if (ucmd.buttons & (BUTTON.ATTACK | BUTTON.USE_HOLDABLE)) {
				ClientRespawn(ent);
			}
		}
		return;
	}

	// Perform once-a-second actions, in all modes excepting CA and RA.
	if (level.arena.gametype < GT.CLANARENA) {
		ClientTimerActions(ent, msec);
	}
}

// /**
//  * ClientInactivityTimer
//  *
//  * Returns false if the client is dropped.
//  */
// function ClientInactivityTimer(client) {
// 	if ( ! g_inactivity.integer ) {
// 		// give everyone some time, so if the operator sets g_inactivity during
// 		// gameplay, everyone isn't kicked
// 		client->inactivityTime = level.time + 60 * 1000;
// 		client->inactivityWarning = qfalse;
// 	} else if ( client->pers.cmd.forwardmove ||
// 		client->pers.cmd.rightmove ||
// 		client->pers.cmd.upmove ||
// 		(client->pers.cmd.buttons & BUTTON_ATTACK) ) {
// 		client->inactivityTime = level.time + g_inactivity.integer * 1000;
// 		client->inactivityWarning = qfalse;
// 	} else if ( !client->pers.localClient ) {
// 		if ( level.time > client->inactivityTime ) {
// 			trap_DropClient( client - level.clients, "Dropped due to inactivity" );
// 			return qfalse;
// 		}
// 		if ( level.time > client->inactivityTime - 10000 && !client->inactivityWarning ) {
// 			client->inactivityWarning = qtrue;
// 			trap_SendServerCommand( client - level.clients, "cp \"Ten seconds until inactivity drop!\n\"" );
// 		}
// 	}
// 	return qtrue;
// }

/**
 * ClientTimerActions
 *
 * Actions that happen once a second.
 */
function ClientTimerActions(ent, msec) {
	var client = ent.client;

	client.timeResidual += msec;

	while (client.timeResidual >= 1000) {
		client.timeResidual -= 1000;
		// Regenerate.
		if (client.ps.powerups[PW.REGEN]) {
			if (ent.health < client.ps.stats[STAT.MAX_HEALTH]) {
				ent.health += 15;
				if (ent.health > client.ps.stats[STAT.MAX_HEALTH] * 1.1) {
					ent.health = client.ps.stats[STAT.MAX_HEALTH] * 1.1;
				}
				AddEvent( ent, EV.POWERUP_REGEN, 0 );
			} else if (ent.health < client.ps.stats[STAT.MAX_HEALTH] * 2) {
				ent.health += 5;
				if (ent.health > client.ps.stats[STAT.MAX_HEALTH] * 2) {
					ent.health = client.ps.stats[STAT.MAX_HEALTH] * 2;
				}
				AddEvent(ent, EV.POWERUP_REGEN, 0);
			}
		} else {
			// Count down health when over max.
			if (ent.health > client.ps.stats[STAT.MAX_HEALTH]) {
				ent.health--;
			}
		}
		// Count down armor when over max.
		if (client.ps.stats[STAT.ARMOR] > client.ps.stats[STAT.MAX_HEALTH]) {
			client.ps.stats[STAT.ARMOR]--;
		}
	}
}

/**
 * SendPendingPredictableEvents
 */
function SendPendingPredictableEvents(ps) {
	// If there are still events pending.
	if (ps.entityEventSequence < ps.eventSequence) {
		// Create a temporary entity for this event which is sent to everyone
		// except the client who generated the event.
		var seq = ps.entityEventSequence % MAX_PS_EVENTS;
		var event = ps.events[seq] | ((ps.entityEventSequence & 3) << 8);

		// Set external event to zero before calling BG_PlayerStateToEntityState.
		var extEvent = ps.externalEvent;
		ps.externalEvent = 0;
		// Create temporary entity for event.
		var t = TempEntity(ps.origin, event);
		var number = t.s.number;
		BG.PlayerStateToEntityState(ps, t.s/*, true*/);
		t.s.number = number;
		t.s.eType = ET.EVENTS + event;
		t.s.eFlags |= EF.PLAYER_EVENT;
		t.s.otherEntityNum = ps.clientNum;
		// Send to everyone except the client who generated the event.
		t.r.svFlags |= SVF.NOTSINGLECLIENT;
		t.r.singleClient = ps.clientNum;
		// Set back external event.
		ps.externalEvent = extEvent;
	}
}

/**
 * ClientIntermissionThink
 */
function ClientIntermissionThink(client) {
	client.ps.eFlags &= ~EF.TALK;
	client.ps.eFlags &= ~EF.FIRING;

	// The level will exit when everyone wants to or after timeouts.

	// Swap and latch button actions.
	client.oldbuttons = client.buttons;
	client.buttons = client.pers.cmd.buttons;

	if (client.buttons & (BUTTON.ATTACK | BUTTON.USE_HOLDABLE) & (client.oldbuttons ^ client.buttons)) {
		// This used to be an ^1 but once a player says ready, it should stick.
		client.readyToExit = 1;
	}
}

/**
 * ClientSpectatorThink
 */
function ClientSpectatorThink(ent, ucmd) {
	var client = ent.client;

	if (client.sess.spectatorState !== SPECTATOR.FOLLOW) {
		client.ps.pm_type = PM.SPECTATOR;
		client.ps.speed = 400;  // faster than normal

		// Set up for pmove.
		var pm = new BG.PmoveInfo();
		pm.ps = client.ps;
		ucmd.clone(pm.cmd);
		pm.tracemask = MASK.PLAYERSOLID & ~SURF.CONTENTS.BODY;  // spectators can fly through bodies
		pm.trace = Trace;
		pm.pointContents = PointContents;

		// Perform a pmove.
		BG.Pmove(pm);

		// Save results of pmove.
		vec3.set(client.ps.origin, ent.s.origin);

		TouchTriggers(ent);
		SV.UnlinkEntity(ent);
	}

	client.oldbuttons = client.buttons;
	client.buttons = ucmd.buttons;

	// Attack button cycles through spectators.
	if ((client.buttons & BUTTON.ATTACK) && !(client.oldbuttons & BUTTON.ATTACK)) {
		ClientCmdFollowCycle(ent, 1);
	}
}

/**
 * ClientEvents
 *
 * Events will be passed on to the clients for presentation,
 * but any server game effects are handled here.
 */
function ClientEvents(ent, oldEventSequence) {
	var client = ent.client;

	if (oldEventSequence < client.ps.eventSequence - MAX_PS_EVENTS) {
		oldEventSequence = client.ps.eventSequence - MAX_PS_EVENTS;
	}

	for (var i = oldEventSequence; i < client.ps.eventSequence; i++) {
		var event = client.ps.events[i & (MAX_PS_EVENTS - 1)];

		switch (event) {
			case EV.FALL_MEDIUM:
			case EV.FALL_FAR:
				if (ent.s.eType !== ET.PLAYER) {
					break;  // not in the player model
				}
				// if (g_dmflags.integer & DF_NO_FALLING) {
				// 	break;
				// }
				var damage = 5;
				if (event == EV.FALL_FAR) {
					damage = 10;
				}
				ent.painDebounceTime = level.time + 200;  // no normal pain sound
				Damage(ent, null, null, null, null, damage, 0, MOD.FALLING);
				break;

			case EV.FIRE_WEAPON:
				FireWeapon(ent);
				break;

			// case EV_USE_ITEM1:  // teleporter
			// 	// Drop flags in CTF.
			// 	item = NULL;
			// 	j = 0;

			// 	if ( client.ps.powerups[ PW_REDFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_REDFLAG );
			// 		j = PW_REDFLAG;
			// 	} else if ( client.ps.powerups[ PW_BLUEFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_BLUEFLAG );
			// 		j = PW_BLUEFLAG;
			// 	} else if ( client.ps.powerups[ PW_NEUTRALFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_NEUTRALFLAG );
			// 		j = PW_NEUTRALFLAG;
			// 	}

			// 	if ( item ) {
			// 		drop = Drop_Item( ent, item, 0 );
			// 		// Decide how many seconds it has left.
			// 		drop.count = ( client.ps.powerups[ j ] - level.time ) / 1000;
			// 		if ( drop.count < 1 ) {
			// 			drop.count = 1;
			// 		}

			// 		client.ps.powerups[ j ] = 0;
			// 	}

			// 	SelectSpawnPoint( client.ps.origin, origin, angles, false );
			// 	TeleportPlayer( ent, origin, angles );
			// 	break;

			// case EV_USE_ITEM2:  // medkit
			// 	ent.health = client.ps.stats[STAT.MAX_HEALTH] + 25;
			// 	break;

			default:
				break;
		}
	}
}

/**
 * ClientEndFrame
 *
 * Called at the end of each server frame for each connected client
 * A fast client will have multiple ClientThink for each ClientEndFrame,
 * while a slow client may have multiple ClientEndFrame between ClientThink.
 */
function ClientEndFrame(ent) {
	var client = ent.client;

	if (client.sess.team === TEAM.SPECTATOR ||
		// Ignore eliminated players if they're still in the death state.
		(client.pers.teamState.state === TEAM_STATE.ELIMINATED && client.sess.spectatorState !== SPECTATOR.NOT)) {
		SpectatorClientEndFrame(ent);
		return;
	}

	// Turn off any expired powerups
	for (var i = 0; i < MAX_POWERUPS; i++) {
		if (client.ps.powerups[i] < level.time) {
			client.ps.powerups[i] = 0;
		}
	}

	if (IntermissionStarted()) {
		return;
	}

	// Burn from lava, etc.
	WorldEffects(ent);

	// Apply all the damage taken this frame.
	DamageFeedback(ent);

	// Add the EF.CONNECTION flag if we haven't gotten commands recently.
	if (level.time - client.lastCmdTime > 1000) {
		client.ps.eFlags |= EF.CONNECTION;
	} else {
		client.ps.eFlags &= ~EF.CONNECTION;
	}

	client.ps.stats[STAT.HEALTH] = ent.health;  // FIXME: get rid of ent.health...

	SetClientSound(ent);

	BG.PlayerStateToEntityState(client.ps, ent.s);

	SendPendingPredictableEvents(client.ps);
}

/**
 * SpectatorClientEndFrame
 */
function SpectatorClientEndFrame(ent) {
	var client = ent.client;

	// If we are doing a chase cam or a remote view, grab the latest info.
	if (client.sess.spectatorState === SPECTATOR.FOLLOW) {
		var clientNum = client.sess.spectatorClient;

		// Team follow1 and team follow2 go to whatever clients are playing.
		if (clientNum === -1) {
			clientNum = level.follow1;
		} else if (clientNum === -2) {
			clientNum = level.follow2;
		}

		if (clientNum >= 0) {
			var cl = level.clients[clientNum];
			if (cl.pers.connected === CON.CONNECTED && cl.ps.pm_type !== PM.SPECTATOR) {
				var flags = (cl.ps.eFlags & ~(EF.VOTED | EF.TEAMVOTED)) | (client.ps.eFlags & (EF.VOTED | EF.TEAMVOTED));
				cl.ps.clone(client.ps);
				client.ps.pm_flags |= PMF.FOLLOW;
				client.ps.eFlags = flags;
				return;
			} else {
				// Drop them to free spectators unless they are dedicated camera followers.
				if (client.sess.spectatorClient >= 0) {
					client.sess.spectatorState = SPECTATOR.FREE;
					ClientBegin(ent.s.number);
				}
			}
		}
	}

	if (client.sess.spectatorState === SPECTATOR.SCOREBOARD) {
		client.ps.pm_flags |= PMF.SCOREBOARD;
	} else {
		client.ps.pm_flags &= ~PMF.SCOREBOARD;
	}
}

/**
 * SetClientSound
 */
function SetClientSound(ent) {
	// if (ent.waterlevel && (ent.watertype & (SURF.CONTENTS.LAVA|SURF.CONTENTS.SLIME))) {
	// 	client.ps.loopSound = level.snd_fry;
	// } else {
	// 	client.ps.loopSound = 0;
	// }
}

/**
 * TouchTriggers
 *
 * Find all trigger entities that ent's current position touches.
 * Spectators will only interact with teleporters.
 */
function TouchTriggers(ent) {
	if (!ent.client) {
		return;
	}

	// Dead clients don't activate triggers!
	if (ent.client.pm_type === PM.DEAD) {
		return;
	}

	var ps = ent.client.ps;
	var range = vec3.createFrom(40, 40, 52);
	var mins = vec3.create();
	var maxs = vec3.create();

	vec3.subtract(ps.origin, range, mins);
	vec3.add(ps.origin, range, maxs);

	var entityNums = FindEntitiesInBox(mins, maxs);

	// Can't use ent.r.absmin, because that has a one unit pad.
	vec3.add(ps.origin, ent.r.mins, mins);
	vec3.add(ps.origin, ent.r.maxs, maxs);

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];

		// If they don't have callbacks.
		if (!hit.touch) {
			continue;
		}

		if (!(hit.r.contents & SURF.CONTENTS.TRIGGER)) {
			continue;
		}

		// Ignore most entities if a spectator.
		if (ent.client.sess.team === TEAM.SPECTATOR) {
			if (hit.s.eType !== ET.TELEPORT_TRIGGER &&
				// This is ugly but adding a new ET_? type will
				// most likely cause network incompatibilities.
				hit.touch !== DoorTriggerTouch) {
				continue;
			}
		}

		// Use seperate code for determining if an item is picked up
		// so you don't have to actually contact its bounding box.
		if (hit.s.eType === ET.ITEM) {
			if (!BG.PlayerTouchesItem(ps, hit.s, level.time)) {
				continue;
			}
		} else {
			if (!SV.EntityContact(mins, maxs, hit)) {
				continue;
			}
		}

		hit.touch.call(this, hit, ent);
	}

	// if we didn't touch a jump pad this pmove frame
	if (ps.jumppad_frame != ps.pmove_framecount) {
		ps.jumppad_frame = 0;
		ps.jumppad_ent = 0;
	}
}

/**
 * ClientImpacts
 */
function ClientImpacts(ent, pm) {
	for (var i = 0; i < pm.numTouch; i++) {
		for (var j = 0; j < i; j++) {
			if (pm.touchEnts[j] === pm.touchEnts[i]) {
				break;
			}
		}
		if (j !== i) {
			continue;  // duplicated
		}

		var other = level.gentities[pm.touchEnts[i]];

		if (!other.touch) {
			continue;
		}

		other.touch(other, ent, null);
	}
}

/**
 * SetClientViewAngle
 *
 * Set's the actual entitystate angles, as well as the
 * delta_angles of the playerstate, which the client uses
 * to offset it's own predicted angles when rendering.
 */
function SetClientViewAngle(ent, angles) {
	var client = ent.client;

	// Set the delta angle.
	for (var i = 0; i < 3; i++) {
		var cmdAngle = QMath.AngleToShort(angles[i]);
		client.ps.delta_angles[i] = cmdAngle - client.pers.cmd.angles[i];
	}
	vec3.set(angles, ent.s.angles);
	vec3.set(ent.s.angles, client.ps.viewangles);
}

/**
 * BroadCastTeamChange
 *
 * Let everyone know about a team change.
 */
function BroadcastTeamChange(client, oldTeam) {
	if (client.sess.team === TEAM.RED) {
		SendArenaCommand('cp', client.pers.name + ' joined the red team.');
	} else if (client.sess.team === TEAM.BLUE) {
		SendArenaCommand('cp', client.pers.name + ' joined the blue team.');
	} else if (client.sess.team === TEAM.SPECTATOR && oldTeam !== TEAM.SPECTATOR) {
		SendArenaCommand('cp', client.pers.name + ' joined the spectators.');
	} else if (client.sess.team === TEAM.FREE) {
		SendArenaCommand('cp', client.pers.name + ' joined the battle.');
	}
}

/**
 * GetClientPlayerstate
 *
 * Called by the server.
 */
function GetClientPlayerstate(clientNum) {
	var client = level.clients[clientNum];
	return client.ps;
}

/**********************************************************
 *
 * Spawnpoints
 *
 **********************************************************/

/**
 * SelectSpawnPoint
 *
 * Chooses a player start, deathmatch start, etc.
 */
function SelectSpawnPoint_compare(a, b) {
	if (a.dist > b.dist) {
		return -1;
	}
	if (a.dist < b.dist) {
		return 1;
	}
	return 0;
}

function SelectSpawnPoint(avoidPoint, origin, angles) {
	var spawnpoints = FindEntity({ classname: 'info_player_deathmatch' });
	var spots = [];
	var spot;

	for (var i = 0; i < spawnpoints.length; i++) {
		spot = spawnpoints[i];

		if (SpotWouldTelefrag(spot)) {
			continue;
		}

		if (spot.flags & GFL.NO_HUMANS) {
			continue;
		}

		if (spot.arena !== ARENANUM_NONE && spot.arena !== level.arena.arenaNum) {
			continue;
		}

		var delta = vec3.subtract(spot.s.origin, avoidPoint, vec3.create());
		var dist = vec3.length(delta);

		// Add
		spots.push({ dist: dist, spot: spot });
	}

	if (!spots.length) {
		spot = spawnpoints[0];
		if (!spot) {
			error('Couldn\'t find a spawn point');
		}
	} else {
		// Sort the spawn points by their distance.
		spots.sort(SelectSpawnPoint_compare);

		// Select a random spot from the spawn points furthest away.
		var selection = QMath.irrandom(0, Math.floor(spots.length / 2));
		spot = spots[selection].spot;
	}

	vec3.set(spot.s.origin, origin);
	origin[2] += 9;
	vec3.set(spot.s.angles, angles);

	return spot;
}

/**
 * SpotWouldTelefrag
 */
function SpotWouldTelefrag(spot) {
	var mins = vec3.add(spot.s.origin, playerMins, vec3.create());
	var maxs = vec3.add(spot.s.origin, playerMaxs, vec3.create());

	var entityNums = FindEntitiesInBox(mins, maxs);

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];

		if (hit.client) {
			return true;
		}
	}

	return false;
}

/**
 * SelectSpectatorSpawnPoint
 */
function SelectSpectatorSpawnPoint(origin, angles) {
	return SelectIntermissionSpawnPoint(origin, angles);
}

/**
 * SelectIntermissionSpawnPoint
 *
 * This is also used for spectator spawns
 */
function SelectIntermissionSpawnPoint(origin, angles) {
	// We don't filter by arena here as non-CA intermission points don't have an arena.
	var points = FindEntity({ classname: 'info_player_intermission' });

	var point;

	if (!points.length) {
		point = SelectSpawnPoint(QMath.vec3origin, origin, angles);
	} else {
		// Try to find an intermission point for this specific arena.
		var i;
		for (i = 0; i < points.length; i++) {
			point = points[i];
			if (point.arena === level.arena.arenaNum) {
				log('SelectIntermissionSpawnPoint found for', point.arena);
				break;
			}
		}

		// If we didn't find one matching out specifc arena, use the first one.
		if (i === points.length) {
			point = points[0];
		}

		vec3.set(point.s.origin, origin);
		vec3.set(point.s.angles, angles);

		// If it has a target, look towards it.
		if (point.target) {
			var target = PickTarget(point.target);

			if (target) {
				var dir = vec3.subtract(target.s.origin, origin, vec3.create());
				QMath.VectorToAngles(dir, angles);
			}
		}
	}

	return point;
}

/**********************************************************
 *
 * Body queue
 *
 **********************************************************/

/**
 * InitBodyQueue
 */
function InitBodyQueue() {
	level.bodyQueueIndex = 0;

	for (var i = 0; i < BODY_QUEUE_SIZE; i++) {
		var ent = SpawnEntity();

		ent.classname = 'bodyqueue';
		ent.neverFree = true;

		level.bodyQueue[i] = ent;
	}
}

/**
 * CopyToBodyQue
 *
 * A player is respawning, so make an entity that looks
 * just like the existing corpse to leave behind.
 */
function CopyToBodyQueue(ent) {
	SV.UnlinkEntity(ent);

	// If client is in a nodrop area, don't leave the body.
	var contents = PointContents(ent.s.origin, -1);
	if (contents & SURF.CONTENTS.NODROP) {
		return;
	}

	// Grab a body que and cycle to the next one.
	var body = level.bodyQueue[level.bodyQueueIndex];
	level.bodyQueueIndex = (level.bodyQueueIndex + 1) % BODY_QUEUE_SIZE;

	var entityNum = body.s.number;

	// Clone off current entity state.
	ent.s.clone(body.s);

	body.s.eFlags = EF.DEAD;  // clear EF_TALK, etc
	body.s.powerups = 0;  // clear powerups
	body.s.loopSound = 0;  // clear lava burning
	body.s.number = entityNum;
	body.timestamp = level.time;
	body.physicsObject = true;
	body.physicsBounce = 0;  // don't bounce
	if (body.s.groundEntityNum === ENTITYNUM_NONE) {
		body.s.pos.trType = TR.GRAVITY;
		body.s.pos.trTime = level.time;
		vec3.set(ent.client.ps.velocity, body.s.pos.trDelta);
	} else {
		body.s.pos.trType = TR.STATIONARY;
	}
	body.s.event = 0;

	// Change the animation to the last-frame only, so the sequence
	// doesn't repeat again for the body.
	switch (body.s.legsAnim & ~ANIM_TOGGLEBIT) {
		case ANIM.BOTH_DEATH1:
		case ANIM.BOTH_DEAD1:
			body.s.torsoAnim = body.s.legsAnim = ANIM.BOTH_DEAD1;
			break;
		case ANIM.BOTH_DEATH2:
		case ANIM.BOTH_DEAD2:
			body.s.torsoAnim = body.s.legsAnim = ANIM.BOTH_DEAD2;
			break;
		case ANIM.BOTH_DEATH3:
		case ANIM.BOTH_DEAD3:
		default:
			body.s.torsoAnim = body.s.legsAnim = ANIM.BOTH_DEAD3;
			break;
	}

	body.r.svFlags = ent.r.svFlags;
	vec3.set(ent.r.mins, body.r.mins);
	vec3.set(ent.r.maxs, body.r.maxs);
	vec3.set(ent.r.absmin, body.r.absmin);
	vec3.set(ent.r.absmax, body.r.absmax);

	body.clipmask = SURF.CONTENTS.SOLID | SURF.CONTENTS.PLAYERCLIP;
	body.r.contents = SURF.CONTENTS.CORPSE;
	body.r.ownerNum = ent.s.number;

	body.nextthink = level.time + 5000;
	body.think = BodySink;
	body.die = BodyDie;

	// Don't take more damage if already gibbed.
	if (ent.health <= GIB_HEALTH) {
		body.takeDamage = false;
	} else {
		body.takeDamage = true;
	}

	vec3.set(body.s.pos.trBase, body.r.currentOrigin);
	SV.LinkEntity(body);
}

/**
 * BodySink
 *
 * After sitting around for five seconds, fall into the ground and dissapear
 */
function BodySink(ent) {
	if (level.time - ent.timestamp > 6500) {
		// The body ques are never actually freed, they are just unlinked.
		SV.UnlinkEntity(ent);
		ent.physicsObject = false;
		return;
	}
	ent.nextthink = level.time + 100;
	ent.s.pos.trBase[2] -= 1;
}

/**
 * BodyDie
 */
function BodyDie(self, inflictor, attacker, damage, meansOfDeath) {
	if (self.health > GIB_HEALTH) {
		return;
	}

	// if (!g_blood.integer) {
	// 	self.health = GIB_HEALTH+1;
	// 	return;
	// }

	GibEntity(self, 0);
}

/**
 * TeleportPlayer
 */
function TeleportPlayer(player, origin, angles) {
	var noAngles = (angles[0] > 999999.0);

	// Use temp events at source and destination to prevent the effect
	// from getting dropped by a second player event.
	if (player.client.ps.pm_type !== PM.SPECTATOR) {
		var tent = TempEntity(player.client.ps.origin, EV.PLAYER_TELEPORT_OUT);
		tent.s.clientNum = player.s.clientNum;

		tent = TempEntity(origin, EV.PLAYER_TELEPORT_IN);
		tent.s.clientNum = player.s.clientNum;
	}

	// Unlink to make sure it can't possibly interfere with KillBox.
	SV.UnlinkEntity(player);

	vec3.set(origin, player.client.ps.origin);
	player.client.ps.origin[2] += 1;

	if (!noAngles) {
		// Spit the player out.
		QMath.AnglesToVectors(angles, player.client.ps.velocity, null, null);
		vec3.scale(player.client.ps.velocity, 400);
		player.client.ps.pm_time = 160;  // hold time
		player.client.ps.pm_flags |= PMF.TIME_KNOCKBACK;

		// Set angles.
		SetClientViewAngle(player, angles);
	}

	// Toggle the teleport bit so the client knows to not lerp.
	player.client.ps.eFlags ^= EF.TELEPORT_BIT;

	// Kill anything at the destination.
	if (player.client.ps.pm_type !== PM.SPECTATOR) {
		KillBox(player);
	}

	// Save results of pmove.
	BG.PlayerStateToEntityState(player.client.ps, player.s);

	// Use the precise origin for linking.
	vec3.set(player.client.ps.origin, player.r.currentOrigin);

	if (player.client.ps.pm_type !== PM.SPECTATOR) {
		SV.LinkEntity(player);
	}
}

/**
 * DamageFeedback
 *
 * Called just before a snapshot is sent to the given player.
 * Totals up all damage and generates both the player_state_t
 * damage values to that client for pain blends and kicks, and
 * global pain sound events for all clients.
 */
function DamageFeedback(player) {
	var client = player.client;
	if (client.ps.pm_type === PM.DEAD) {
		return;
	}

	// Total points of damage shot at the player this frame
	var count = client.damage_blood + client.damage_armor;
	if (count === 0) {
		return;   // didn't take any damage
	}
	if (count > 255) {
		count = 255;
	}

	// Send the information to the client.

	// World damage (falling, slime, etc) uses a special code
	// to make the blend blob centered instead of positional.
	if (client.damage_fromWorld) {
		client.ps.damagePitch = 255;
		client.ps.damageYaw = 255;
		client.damage_fromWorld = false;
	} else {
		var angles = vec3.create();
		QMath.VectorToAngles(client.damage_from, angles);
		client.ps.damagePitch = angles[QMath.PITCH]/360.0 * 256;
		client.ps.damageYaw = angles[QMath.YAW]/360.0 * 256;
	}

	// Play an apropriate pain sound.
	if ((level.time > player.painDebounceTime) && !(player.flags & GFL.GODMODE)) {
		player.painDebounceTime = level.time + 700;
		AddEvent(player, EV.PAIN, player.health);
		client.ps.damageEvent++;
	}

	client.ps.damageCount = count;

	// Clear totals.
	client.damage_blood = 0;
	client.damage_armor = 0;
	client.damage_knockback = 0;
}

/**
 * WorldEffects
 *
 * Check for lava / slime contents and drowning.
 */
function WorldEffects(ent) {
	var client = ent.client;

	if (client.noclip) {
		client.airOutTime = level.time + 12000;	// don't need air
		return;
	}

	var waterlevel = ent.waterlevel;
	var envirosuit = client.ps.powerups[PW.BATTLESUIT] > level.time;

	//
	// Check for drowning.
	//
	if (waterlevel === 3) {
		// Envirosuit gives air.
		if (envirosuit) {
			client.airOutTime = level.time + 10000;
		}

		// If out of air, start drowning.
		if (client.airOutTime < level.time) {
			// drown!
			client.airOutTime += 1000;
			if (ent.health > 0) {
				// Take more damage the longer underwater.
				ent.damage += 2;
				if (ent.damage > 15) {
					ent.damage = 15;
				}

				// Don't play a normal pain sound.
				ent.painDebounceTime = level.time + 200;

				Damage(ent, null, null, null, null, ent.damage, DAMAGE.NO_ARMOR, MOD.WATER);
			}
		}
	} else {
		client.airOutTime = level.time + 12000;
		ent.damage = 2;
	}

	//
	// Check for sizzle damage (move to pmove?).
	//
	if (waterlevel &&
		(ent.watertype & (SURF.CONTENTS.LAVA|SURF.CONTENTS.SLIME))) {
		if (ent.health > 0 && ent.painDebounceTime <= level.time) {
			if (envirosuit) {
				AddEvent( ent, EV.POWERUP_BATTLESUIT, 0);
			} else {
				if (ent.watertype & SURF.CONTENTS.LAVA) {
					Damage(ent, null, null, null, null, 30*waterlevel, 0, MOD.LAVA);
				}

				if (ent.watertype & SURF.CONTENTS.SLIME) {
					Damage(ent, null, null, null, null, 10*waterlevel, 0, MOD.SLIME);
				}
			}
		}
	}
}

/**
 * KillBox
 *
 * Kills all entities that would touch the proposed new positioning
 * of ent. Ent should be unlinked before calling this!
 */
function KillBox(ent) {
	var mins = vec3.add(ent.client.ps.origin, ent.r.mins, vec3.create());
	var maxs = vec3.add(ent.client.ps.origin, ent.r.maxs, vec3.create());
	var entityNums = FindEntitiesInBox(mins, maxs);

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];
		if (!hit.client) {
			continue;
		}

		// Nail it.
		Damage(hit, ent, ent, null, null, 100000, DAMAGE.NO_PROTECTION, MOD.TELEFRAG);
	}
}

		/**
 * ClientCommand
 */
function ClientCommand(clientNum, cmd) {
	var ent = level.gentities[clientNum];
	if (!ent.client || ent.client.pers.connected !== CON.CONNECTED) {
		return;  // not fully in game yet
	}

	// Set the global arena.
	SetCurrentArena(ent.s.arenaNum);

	var name = cmd.type;
	var args = cmd.data;

	if (name === 'queue') {
		var arenaNum = parseInt(args[0], 10);
		console.log('---------- ARENA ' + arenaNum + ' ----------');
		console.log(level.arenas[arenaNum]);
		console.log('---------- CLIENTS ----------');
		for (var i = 0; i < level.maxclients; i++) {
			if (!level.gentities[i].inuse) return;
			if (level.gentities[i].s.arenaNum === arenaNum) {
				console.log('Client', i, level.gentities[i].client.sess);
			}
		}
	}
	else if (name === 'say') {
		ClientCmdSay(ent, SAY.ALL, args[0]);
		return;
	}
	// if (Q_stricmp (cmd, "say_team") == 0) {
	// 	Cmd_Say_f (ent, SAY_TEAM, qfalse);
	// 	return;
	// }
	// if (Q_stricmp (cmd, "tell") == 0) {
	// 	Cmd_Tell_f ( ent );
	// 	return;
	// }
	else if (name === 'score') {
		ClientCmdScore(ent);
		return;
	}

	// Ignore all other commands when at intermission.
	if (IntermissionStarted()) {
		// Cmd_Say_f (ent, qfalse, qtrue);
		return;
	}

	// if (Q_stricmp (cmd, "give") == 0)
	// 	Cmd_Give_f (ent);
	// else if (Q_stricmp (cmd, "god") == 0)
	// 	Cmd_God_f (ent);
	// else if (Q_stricmp (cmd, "notarget") == 0)
	// 	Cmd_Notarget_f (ent);
	if (name === 'noclip') {
		ClientCmdNoclip(ent);
	}
	// else if (Q_stricmp (cmd, "kill") == 0)
	// 	Cmd_Kill_f (ent);
	// else if (Q_stricmp (cmd, "teamtask") == 0)
	// 	Cmd_TeamTask_f (ent);
	// else if (Q_stricmp (cmd, "levelshot") == 0)
	// 	Cmd_LevelShot_f (ent);
	else if (name === 'follow') {
		ClientCmdFollow(ent, args[0]);
	} else if (name === 'follownext') {
		ClientCmdFollowCycle(ent, 1);
	} else if (name === 'followprev') {
		ClientCmdFollowCycle(ent, -1);
	} else if (name === 'team') {
		ClientCmdTeam(ent, args[0]);
	} else if (name === 'arena') {
		ClientCmdArena(ent, args[0]);
	// else if (Q_stricmp (cmd, "where") == 0)
	// 	Cmd_Where_f (ent);
	// else if (Q_stricmp (cmd, "callvote") == 0)
	// 	Cmd_CallVote_f (ent);
	// else if (Q_stricmp (cmd, "vote") == 0)
	// 	Cmd_Vote_f (ent);
	// else if (Q_stricmp (cmd, "callteamvote") == 0)
	// 	Cmd_CallTeamVote_f (ent);
	// else if (Q_stricmp (cmd, "teamvote") == 0)
	// 	Cmd_TeamVote_f (ent);
	// else if (Q_stricmp (cmd, "gc") == 0)
	// 	Cmd_GameCommand_f( ent );
	// else if (Q_stricmp (cmd, "setviewpos") == 0)
	// 	Cmd_SetViewpos_f( ent );
	// else if (Q_stricmp (cmd, "stats") == 0)
	// 	Cmd_Stats_f( ent );
	} else {
		SV.SendServerCommand(clientNum, 'print', 'Unknown client command \'' + name + '\'');
	}
}

/**
 * ClientCmdSay
 */
function ClientCmdSay(ent, mode, text) {
	if (!text) {
		return;
	}

	Say(ent, null, mode, text);
}

/**
 * ClientCmdFollow
 */
function ClientCmdFollow(ent, follow) {
	if (typeof(follow) === 'undefined') {
		if (ent.client.sess.spectatorState === SPECTATOR.FOLLOW) {
			StopFollowing(ent);
		}
		return;
	}

	var i = ClientNumberFromString(ent, follow);
	if (i === -1) {
		return;
	}

	// Can't follow self.
	if (level.clients[i] === ent.client) {
		return;
	}

	// Can't follow people in other arenas.
	if (level.gentities[i].s.arenaNum !== ent.s.arenaNum) {
		return;
	}

	// Can't follow another spectator.
	if (level.clients[i].sess.team === TEAM.SPECTATOR ||
		level.clients[i].pers.teamState.state === TEAM_STATE.ELIMINATED) {
		return;
	}

	// If they are playing a tournement game, count as a loss
	if (level.arena.gametype === GT.TOURNAMENT &&
		ent.client.sess.team === TEAM.FREE) {
		ent.client.sess.losses++;
	}

	// First set them to spectator.
	if (ent.client.sess.team !== TEAM.SPECTATOR &&
		ent.client.pers.teamState.state !== TEAM_STATE.ELIMINATED) {
		SetTeam(ent, 'spectator');
	}

	ent.client.sess.spectatorState = SPECTATOR.FOLLOW;
	ent.client.sess.spectatorClient = i;
}

/**
 * ClientNumberFromString
 *
 * Returns a player number for either a number or name string
 * Returns -1 if invalid
 */
function ClientNumberFromString(to, s) {
	var id;

	// Numeric values are just slot numbers.
	id = parseInt(s, 10);
	if (!isNaN(id)) {
		if (id < 0 || id >= level.maxclients) {
			SV.SendServerCommand(to.s.number, 'print', 'Bad client slot: ' + id);
			return -1;
		}

		var cl = level.clients[id];
		if (cl.pers.connected !== CON.CONNECTED ) {
			SV.SendServerCommand(to.s.number, 'print', 'Client ' + id + ' is not active');
			return -1;
		}

		return id;
	}

	// Check for a name match
	for (id = 0; id < level.maxclients; id++) {
		var cl = level.clients[id];
		if (cl.pers.connected !== CON.CONNECTED) {
			continue;
		}

		var cleanName = QS.StripColors(cl.pers.name);

		if (cleanName === s) {
			return id;
		}
	}

	SV.SendServerCommand(to.s.number, 'print', 'User ' + s + ' is not on the server');
	return -1;
}

/**
 * StopFollowing
 *
 * If the client being followed leaves the game, or you just want to drop
 * to free floating spectator mode.
 */
function StopFollowing(ent) {
	ent.client.ps.persistant[PERS.TEAM] = TEAM.SPECTATOR;
	ent.client.sess.team = TEAM.SPECTATOR;
	ent.client.sess.spectatorState = SPECTATOR.FREE;
	ent.client.ps.pm_flags &= ~PMF.FOLLOW;
	// ent.r.svFlags &= ~SVF_BOT;
	ent.client.ps.clientNum = ent.s.number;
}

/**
 * ClientCmdFollowCycle
 */
function ClientCmdFollowCycle(ent, dir) {
	// If they are playing a tournement game, count as a loss.
	if (level.arena.gametype === GT.TOURNAMENT &&
		ent.client.sess.team === TEAM.FREE) {
		ent.client.sess.losses++;
	}

	// First set them to spectator.
	if (ent.client.sess.team !== TEAM.SPECTATOR &&
		// Ignore eliminated players if they're still in the death state.
		!(ent.client.pers.teamState.state === TEAM_STATE.ELIMINATED && ent.client.sess.spectatorState !== SPECTATOR.NOT)) {
		return;
		// SetTeam(ent, 'spectator');
	}

	if (dir !== 1 && dir !== -1) {
		error('followcycle: bad dir ' + dir);
	}

	// If dedicated follow client, just switch between the two auto clients.
	if (ent.client.sess.spectatorClient < 0) {
		if (ent.client.sess.spectatorClient === -1) {
			ent.client.sess.spectatorClient = -2;
		} else if (ent.client.sess.spectatorClient === -2) {
			ent.client.sess.spectatorClient = -1;
		}
		return;
	}

	var clientNum = ent.client.sess.spectatorClient;
	var original = clientNum;

	do {
		clientNum += dir;
		if (clientNum >= level.maxclients) {
			clientNum = 0;
		}
		if (clientNum < 0) {
			clientNum = level.maxclients - 1;
		}

		// Can only follow connected clients.
		if (level.clients[clientNum].pers.connected !== CON.CONNECTED) {
			continue;
		}

		// Can't follow people in other arenas.
		if (level.gentities[clientNum].s.arenaNum !== ent.s.arenaNum) {
			continue;
		}

		// Can't follow another spectator.
		if (level.clients[clientNum].sess.team === TEAM.SPECTATOR ||
			level.clients[clientNum].pers.teamState.state === TEAM_STATE.ELIMINATED) {
			continue;
		}

		// This is good, we can use it.
		ent.client.sess.spectatorClient = clientNum;
		ent.client.sess.spectatorState = SPECTATOR.FOLLOW;

		log('CmdFollowCycle (' + ent.s.number + '): now following ' + clientNum);

		return;
	} while (clientNum !== original);

	// Leave it where it was.
}

/**
 * Say
 */
var MAX_SAY_TEXT = 150;

var SAY = {
	ALL:  0,
	TEAM: 1,
	TELL: 2
};

function Say(ent, target, mode, text) {
	if (!text) {
		return;
	}

	if (level.arena.gametype < GT.TEAM && mode === SAY.TEAM) {
		mode = SAY.ALL;
	}

	var name;
	var color;

	switch (mode) {
		case SAY.ALL:
			// G_LogPrintf( "say: %s: %s\n", ent->client->pers.name, chatText );
			name = ent.client.pers.name;
			color = QS.COLOR.GREEN;
			break;
		// case SAY.TEAM:
		// 	G_LogPrintf( "sayteam: %s: %s\n", ent->client->pers.name, chatText );
		// 	if (Team_GetLocationMsg(ent, location, sizeof(location)))
		// 		Com_sprintf (name, sizeof(name), EC"(%s%c%c"EC") (%s)"EC": ",
		// 			ent->client->pers.name, Q_COLOR_ESCAPE, COLOR_WHITE, location);
		// 	else
		// 		Com_sprintf (name, sizeof(name), EC"(%s%c%c"EC")"EC": ",
		// 			ent->client->pers.name, Q_COLOR_ESCAPE, COLOR_WHITE );
		// 	color = COLOR_CYAN;
		// 	break;
		// case SAY.TELL:
		// 	if (target && level.arena.gametype >= GT.TEAM &&
		// 		target.client.sess.team === ent.client.sess.team &&
		// 		Team_GetLocationMsg(ent, location, sizeof(location))) {
		// 		Com_sprintf (name, sizeof(name), EC"[%s%c%c"EC"] (%s)"EC": ", ent->client->pers.name, Q_COLOR_ESCAPE, COLOR_WHITE, location );
		// 	} else {
		// 		Com_sprintf (name, sizeof(name), EC"[%s%c%c"EC"]"EC": ", ent->client->pers.name, Q_COLOR_ESCAPE, COLOR_WHITE );
		// 	}
		// 	color = COLOR_MAGENTA;
		// 	break;
	}

	// Trim text.
	text = text.substr(0, MAX_SAY_TEXT);

	// if (target) {
	// 	SayTo( ent, target, mode, color, name, text );
	// 	return;
	// }

	// // Echo the text to the console.
	// if (g_dedicated.integer) {
	// 	G_Printf( "%s%s\n", name, text);
	// }

	// Send it to all the apropriate clients.
	for (var i = 0; i < level.maxclients; i++) {
		var other = level.gentities[i];
		SayTo(ent, other, mode, color, name, text);
	}
}

/**
 * SayTo
 */
function SayTo(ent, other, mode, color, name, text) {
	if (!other) {
		return;
	}

	if (!other.inuse) {
		return;
	}

	if (!other.client) {
		return;
	}

	if (other.client.pers.connected !== CON.CONNECTED) {
		return;
	}

	if (mode === SAY.TEAM  && !OnSameTeam(ent, other)) {
		return;
	}

	// No chatting to players in tournements.
	if (level.arena.gametype === GT.TOURNAMENT &&
		other.client.sess.team === TEAM.FREE &&
		ent.client.sess.team !== TEAM.FREE) {
		return;
	}

	SV.SendServerCommand(other.s.number, mode === SAY.TEAM ? 'tchat' : 'chat', name + ' ^' + color + text);
}

/**
 * ClientCmdScore
 */
function ClientCmdScore(ent) {
	SendScoreboardMessage(ent);
}

/**
 * SendScoreboardMessage
 */
function SendScoreboardMessage(to) {
	var arena = level.arenas[to.s.arenaNum];

	var val = {
		scoreRed: arena.teamScores[TEAM.RED],
		scoreBlue: arena.teamScores[TEAM.BLUE],
		scores: []
	};

	for (var i = 0; i < arena.numConnectedClients; i++) {
		var clientNum = arena.sortedClients[i];
		var ent = level.gentities[clientNum];
		var client = ent.client;

		if (ent.s.arenaNum !== to.s.arenaNum) {
			continue;
		}

		var ping = -1;
		if (client.pers.connected !== CON.CONNECTING) {
			ping = client.ps.ping < 999 ? client.ps.ping : 999;
		}

		var accuracy = 0;
		if (client.accuracy_shots) {
			accuracy = client.accuracy_hits * 100 / client.accuracy_shots;
		}

		var perfect = (client.ps.persistant[PERS.RANK] === 0 && client.ps.persistant[PERS.DEATHS] === 0) ? 1 : 0;

		val.scores.push({
			clientNum: clientNum,
			score: client.ps.persistant[PERS.SCORE],
			frags: client.ps.persistant[PERS.FRAGS],
			deaths: client.ps.persistant[PERS.DEATHS],
			time: (level.time - client.pers.enterTime)/60000,
			ping: ping,
			spectatorNum: client.sess.spectatorNum,
			powerups: level.gentities[arena.sortedClients[i]].s.powerups,
			accuracy: accuracy,
			impressive: client.ps.persistant[PERS.IMPRESSIVE_COUNT],
			excellent: client.ps.persistant[PERS.EXCELLENT_COUNT],
			gauntlet: client.ps.persistant[PERS.GAUNTLET_FRAG_COUNT],
			defend: client.ps.persistant[PERS.DEFEND_COUNT],
			assist: client.ps.persistant[PERS.ASSIST_COUNT],
			perfect: perfect,
			captures: client.ps.persistant[PERS.CAPTURES],
			eliminated: client.pers.teamState.state === TEAM_STATE.ELIMINATED
		});
	}

	SV.SendServerCommand(to.s.number, 'scores', val);
}

/**
 * ClientCmdNoclip
 */
function ClientCmdNoclip(ent) {
	// if (!CheatsOk(ent)) {
	// 	return;
	// }

	ent.client.noclip = !ent.client.noclip;

	var msg = 'noclip ON';
	if (!ent.client.noclip) {
		msg = 'noclip OFF';
	}

	SV.SendServerCommand(ent.s.number, 'print', msg);
}

/**
 * ClientCmdTeam
 */
function ClientCmdTeam(ent, teamName) {
	if (teamName === undefined) {
		SV.SendServerCommand(ent.s.number, 'print', 'Invalid team');
		return;
	}

	if (ent.client.switchTeamTime > level.time) {
		SV.SendServerCommand(ent.s.number, 'print', 'May not switch teams more than once per 5 seconds.');
		return;
	}

	// If they are playing a tournement game, count as a loss.
	if (level.arena.gametype === GT.TOURNAMENT && ent.client.sess.team === TEAM.FREE) {
		ent.client.sess.losses++;
	}

	SetTeam(ent, teamName, false);

	ent.client.switchTeamTime = level.time + 5000;
}

/**
 * SetTeam
 */
function SetTeam(ent, teamName) {
	var client = ent.client;
	var clientNum = ent.s.number;

	//
	// See what change is requested
	//
	var team = TEAM.SPECTATOR;
	var groupName = null;
	var specState = SPECTATOR.NOT;
	var specClient = 0;
	var oldTeam = client.sess.team;

	if (teamName === 'scoreboard' || teamName === 'score') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.SCOREBOARD;
	} else if (teamName === 'follow1') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FOLLOW;
		specClient = -1;
	} else if (teamName === 'follow2') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FOLLOW;
		specClient = -2;
	} else if (teamName === 'spectator' || teamName === 's') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FREE;
	} else if (level.arena.gametype === GT.ROCKETARENA) {
		if (teamName === '<default>') {
			groupName = ent.client.pers.name + '\'s team';
		} else {
			groupName = teamName;
		}

		// Auto-join if the group is active.
		if (level.arena.group1 === groupName) {
			team = TEAM.RED;
		} else if (level.arena.group2 === groupName) {
			team = TEAM.BLUE;
		} else {
			team = TEAM.SPECTATOR;
			specState = SPECTATOR.FREE;
		}

		// Make sure we can actually join this group.
		var playersPerTeam = g_playersPerTeam.at(level.arena.arenaNum).get();
		if (TeamGroupCount(groupName, clientNum) >= playersPerTeam) {
			SV.SendServerCommand(ent.s.number, 'print', 'Team is full.');
			return;
		}
	} else if (level.arena.gametype >= GT.TEAM) {
		// If running a team game, assign player to one of the teams.
		if (teamName === 'red' || teamName === 'r') {
			team = TEAM.RED;
		} else if (teamName === 'blue' || teamName === 'b') {
			team = TEAM.BLUE;
		} else {
			team = PickTeam(clientNum);
		}
	} else {
		// Force to free in non-team games.
		team = TEAM.FREE;
	}

	//
	// Decide if we will allow the change.
	//
	if (team === oldTeam && team !== TEAM.SPECTATOR) {
		return;
	}

	//
	// Execute the team change
	//
	client.sess.team = team;
	client.sess.group = groupName;
	client.sess.spectatorState = specState;
	client.sess.spectatorClient = specClient;

	// They go to the end of the line for tournements.
	if (team === TEAM.SPECTATOR) {
		PushClientToQueue(ent);
	}

	// If the player was dead leave the body.
	if (client.ps.pm_type === PM.DEAD) {
		CopyToBodyQueue(ent);
	}

	if (oldTeam !== TEAM.SPECTATOR) {
		// Kill him (makes sure he loses flags, etc).
		ent.flags &= ~GFL.GODMODE;
		client.ps.stats[STAT.HEALTH] = ent.health = 0;
		PlayerDie(ent, ent, ent, 100000, MOD.SUICIDE);
	}

	BroadcastTeamChange(client, oldTeam);
	ClientUserinfoChanged(clientNum);
	ClientBegin(clientNum);
}

/**
 * ClientCmdArenas
 */
function ClientCmdArena(ent, arenaNum) {
	arenaNum = parseInt(arenaNum, 10);

	if (isNaN(arenaNum) || arenaNum < 0 || arenaNum >= level.arenas.length) {
		SV.SendServerCommand(ent.s.number, 'print', 'Invalid arena');
		return;
	}

	if (ent.client.switchArenaTime > level.time) {
		SV.SendServerCommand(ent.s.number, 'print', 'May not switch arenas more than once per 3 seconds.');
		return;
	}

	SetArena(ent, arenaNum);

	ent.client.switchArenaTime = level.time + 3000;
}

/**
 * SetArena
 */
function SetArena(ent, arenaNum) {
	if (arenaNum < 0 || arenaNum >= level.arenas.length) {
		error('Invalid arena number.');
		return;
	}

	// Push off old arena.
	var oldArena = level.arena;

	// Temporarily update while spawning the client.
	level.arena = level.arenas[arenaNum];

	// Change arena and kick to spec.
	ent.s.arenaNum = ent.client.ps.arenaNum = arenaNum;
	SetTeam(ent, 's');

	// Update scores.
	SendScoreboardMessage(ent);

	// Pop back.
	level.arena = oldArena;

	// Recalculate ranks for the old arena now.
	CalculateRanks();
}
		/**
 * Damage
 *
 * Apply damage to an entity.
 * inflictor, attacker, dir, and point can be NULL for environmental damage.
 *
 * @param {GameEntity} targ      Entity that is being damaged
 * @param {GameEntity} inflictor Entity that is causing the damage
 * @param {GameEntity} attacker  Entity that caused the inflictor to damage targ
 * @param {vec3}       dir       Direction of the attack for knockback
 * @param {vec3}       point     Point at which the damage is being inflicted, used for headshots
 * @param {int}        damage    Amount of damage being inflicted
 * @param {int}        dflags    Flags used to control how Damage works
 *                               DAMAGE.RADIUS:        damage was indirect (from a nearby explosion)
 *                               DAMAGE.NO_ARMOR:      armor does not protect from this damage
 *                               DAMAGE.NO_KNOCKBACK:  do not affect velocity, just view angles
 *                               DAMAGE.NO_PROTECTION: kills godmode, armor, everything
 * @param {MOD}         mod      Method of death.
 */
function Damage(targ, inflictor, attacker, dir, point, damage, dflags, mod) {
	if (!targ.takeDamage) {
		return;
	}

	// The intermission has already been qualified for, so don't
	// allow any extra scoring.
	if (level.intermissionQueued) {
		return;
	}

	if (!inflictor) {
		inflictor = level.gentities[ENTITYNUM_WORLD];
	}

	if (!attacker) {
		attacker = level.gentities[ENTITYNUM_WORLD];
	}

	// Shootable doors / buttons don't actually have any health.
	if (targ.s.eType === ET.MOVER) {
		if (targ.use && targ.moverState == MOVER.POS1) {
			targ.use(targ, inflictor, attacker);
		}
		return;
	}

	// // Reduce damage by the attacker's handicap value
	// // unless they are rocket jumping.
	// if (attacker.client && attacker !== targ) {
	// 	max = attacker.client.ps.stats[STAT.MAX_HEALTH];
	// 	damage = damage * max / 100;
	// }

	var client = targ.client;
	if (client && client.noclip) {
		return;
	}

	if (!dir) {
		dflags |= DAMAGE.NO_KNOCKBACK;
	} else {
		vec3.normalize(dir);
	}

	var knockback = damage;
	if (knockback > 200) {
		knockback = 200;
	}
	if (targ.flags & GFL.NO_KNOCKBACK) {
		knockback = 0;
	}
	if (dflags & DAMAGE.NO_KNOCKBACK) {
		knockback = 0;
	}

	// Figure momentum add, even if the damage won't be taken.
	if (knockback && targ.client) {
		var mass = 200;
		var kvel = vec3.scale(dir, g_knockback.get() * knockback / mass, vec3.create());
		vec3.add(targ.client.ps.velocity, kvel);

		// Set the timer so that the other client can't cancel
		// out the movement immediately.
		if (!targ.client.ps.pm_time) {
			var t = knockback * 2;
			if (t < 50) {
				t = 50;
			} else if (t > 200) {
				t = 200;
			}

			targ.client.ps.pm_time = t;
			targ.client.ps.pm_flags |= PMF.TIME_KNOCKBACK;
		}
	}

	// Free rocket jumps in CA.
	if (level.arena.gametype >= GT.CLANARENA &&
		targ === attacker &&
		(inflictor.classname === 'rocket' || inflictor.classname === 'grenade')) {
		return;
	}

	// Check for completely getting out of the damage.
	if (!(dflags & DAMAGE.NO_PROTECTION)) {
		// If TF_NO_FRIENDLY_FIRE is set, don't do damage to the target.
		// If the attacker was on the same team.
		if (targ !== attacker && OnSameTeam(targ, attacker)) {
			if (!g_friendlyFire.get()) {
				return;
			}
		}

		// Check for godmode.
		if (targ.flags & GFL.GODMODE) {
			return;
		}

		// No damage in during CA warmup or practice arena.
		if ((level.arena.gametype >= GT.CLANARENA && level.arena.state.current <= GS.COUNTDOWN) ||
		    level.arena.gametype === GT.PRACTICEARENA) {
			return;
		}
	}

	// Battlesuit protects from all radius damage (but takes knockback)
	// and protects 50% against all damage.
	if (client && client.ps.powerups[PW.BATTLESUIT]) {
		AddEvent(targ, EV.POWERUP_BATTLESUIT, 0);
		if ((dflags & DAMAGE.RADIUS) || (mod === MOD.FALLING)) {
			return;
		}
		damage *= 0.5;
	}

	// Add to the attacker's hit counter (if the target isn't a general entity like a prox mine).
	if (attacker.client && client &&
		targ !== attacker && targ.health > 0 &&
		targ.s.eType !== ET.MISSILE &&
		targ.s.eType !== ET.GENERAL) {
		if (OnSameTeam(targ, attacker)) {
			attacker.client.ps.persistant[PERS.HITS]--;
		} else {
			attacker.client.ps.persistant[PERS.HITS]++;
		}
	}

	// Always give half damage if hurting self.
	// Calculated after knockback, so rocket jumping works.
	if (targ === attacker) {
		damage *= 0.5;
	}

	// Round damage up (always do at least 1 damage).
	damage = Math.ceil(damage);

	// Calculate damage taken after armor is accounted for.
	var take = damage;
	var asave = CheckArmor(targ, take, dflags);
	take -= asave;

	// if (g_debugDamage.integer) {
	// 	log(level.time, ', client', targ.s.number, ', health', targ.health, ', damage', take, ', armor', asave);
	// }

	// Add to the damage inflicted on a player this frame.
	// The total will be turned into screen blends and view angle kicks
	// at the end of the frame.
	if (client) {
		if (attacker) {
			client.ps.persistant[PERS.ATTACKER] = attacker.s.number;
		} else {
			client.ps.persistant[PERS.ATTACKER] = ENTITYNUM_WORLD;
		}
		client.damage_armor += asave;
		client.damage_blood += take;
		client.damage_knockback += knockback;
		if (dir) {
			vec3.set(dir, client.damage_from);
			client.damage_fromWorld = false;
		} else {
			vec3.set(targ.r.currentOrigin, client.damage_from);
			client.damage_fromWorld = true;
		}
	}

	// See if it's the player hurting the emeny flag carrier.
	// if (g_gametype.integer === GT.CTF) {
	// 	Team_CheckHurtCarrier(targ, attacker);
	// }

	if (targ.client) {
		// Set the last client who damaged the target.
		targ.client.lasthurt_client = attacker.s.number;
		targ.client.lasthurt_mod = mod;
	}

	// Do the damage.
	if (take) {
		targ.health = targ.health - take;

		// FIXME Is this necessary? We do this in EndClientFrame
		if (targ.client) {
			targ.client.ps.stats[STAT.HEALTH] = targ.health;
		}

		if (targ.health <= 0) {
			if (client) {
				targ.flags |= GFL.NO_KNOCKBACK;
			}

			if (targ.health < -999) {
				targ.health = -999;
			}

			targ.enemy = attacker;
			targ.die(targ, inflictor, attacker, take, mod);
			return;
		} else if (targ.pain) {
			targ.pain(targ, attacker, take);
		}
	}

}

/**
 * RadiusDamage
 */
function RadiusDamage(origin, inflictor, attacker, damage, radius, ignore, mod) {
	var v = vec3.create();
	var mins = vec3.create();
	var maxs = vec3.create();
	var hitClient = false;

	if (radius < 1) {
		radius = 1;
	}

	for (var i = 0; i < 3; i++) {
		mins[i] = origin[i] - radius;
		maxs[i] = origin[i] + radius;
	}

	var entityNums = FindEntitiesInBox(mins, maxs);

	for (var e = 0; e < entityNums.length; e++) {
		var ent = level.gentities[entityNums[e]];

		if (ent === ignore) {
			continue;
		}

		if (!ent.takeDamage) {
			continue;
		}

		// Find the distance from the edge of the bounding box.
		for (var i = 0; i < 3; i++) {
			if (origin[i] < ent.r.absmin[i]) {
				v[i] = ent.r.absmin[i] - origin[i];
			} else if (origin[i] > ent.r.absmax[i]) {
				v[i] = origin[i] - ent.r.absmax[i];
			} else {
				v[i] = 0;
			}
		}

		var dist = vec3.length(v);
		if (dist >= radius) {
			continue;
		}

		var points = damage * (1.0 - dist / radius);

		if (CanDamage(ent, origin)) {
			if (LogAccuracyHit(ent, attacker)) {
				hitClient = true;
			}

			var dir = vec3.subtract(ent.r.currentOrigin, origin, vec3.create());
			// Push the center of mass higher than the origin so players
			// get knocked into the air more.
			dir[2] += 24;

			Damage(ent, inflictor, attacker, dir, origin, points, DAMAGE.RADIUS, mod);
		}
	}

	return hitClient;
}


/**
 * CanDamage
 *
 * Returns true if the inflictor can directly damage the target. Used for
 * explosions and melee attacks.
 */
function CanDamage(targ, origin) {
	var trace = new QS.TraceResults();

	// Use the midpoint of the bounds instead of the origin, because
	// bmodels may have their origin is 0,0,0
	var midpoint = vec3.add(targ.r.absmin, targ.r.absmax, vec3.create());
	vec3.scale(midpoint, 0.5);

	var dest = vec3.create(midpoint);

	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);

	if (trace.fraction === 1.0 || trace.entityNum === targ.s.number) {
		return true;
	}

	// This should probably check in the plane of projection,
	// rather than in world coordinate, and also include Z.
	vec3.set(midpoint, dest);
	dest[0] += 15.0;
	dest[1] += 15.0;
	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);
	if (trace.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] += 15.0;
	dest[1] -= 15.0;
	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);
	if (trace.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] -= 15.0;
	dest[1] += 15.0;
	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);
	if (trace.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] -= 15.0;
	dest[1] -= 15.0;
	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);
	if (trace.fraction === 1.0) {
		return true;
	}

	return false;
}

/**
 * PlayerDie
 */
var deathAnim = 0;
function PlayerDie(self, inflictor, attacker, damage, meansOfDeath) {
	if (self.client.ps.pm_type === PM.DEAD) {
		return;
	}

	if (IntermissionStarted()) {
		return;
	}

	// // Check for an almost capture.
	// CheckAlmostCapture(self, attacker);

	// // Check for a player that almost brought in cubes.
	// CheckAlmostScored(self, attacker);

	// if (self.client && self.client.hook) {
	// 	Weapon_HookFree(self.client.hook);
	// }

	self.client.ps.pm_type = PM.DEAD;

	if (level.arena.gametype >= GT.CLANARENA &&
		// If the player was killed due to the environment during
		// warmup, don't eliminate them.
		level.arena.state.current >= GS.ACTIVE) {
		self.client.pers.teamState.state = TEAM_STATE.ELIMINATED;
	}

	var killer;
	var killerName;
	if (attacker) {
		killer = attacker.s.number;
		if (attacker.client) {
			killerName = attacker.client.pers.name;
		} else {
			killerName = '<non-client>';
		}
	}
	if (killer === undefined || killer < 0 || killer >= MAX_CLIENTS) {
		killer = ENTITYNUM_WORLD;
		killerName = '<world>';
	}

	log('Kill:', killer, self.s.number, meansOfDeath, ',', killerName, 'killed', self.client.pers.name);

	// Broadcast the death event to everyone.
	var ent = TempEntity(self.r.currentOrigin, EV.OBITUARY);
	ent.s.eventParm = meansOfDeath;
	ent.s.otherEntityNum = self.s.number;
	ent.s.otherEntityNum2 = killer;
	ent.r.svFlags = SVF.BROADCAST;  // send to everyone

	self.enemy = attacker;

	self.client.ps.persistant[PERS.DEATHS]++;

	if (attacker && attacker.client) {
		attacker.client.lastkilled_client = self.s.number;

		if (attacker === self || OnSameTeam(self, attacker)) {
			AddScore(attacker, self.r.currentOrigin, -1);

			attacker.client.ps.persistant[PERS.FRAGS]--;
		} else {
			AddScore(attacker, self.r.currentOrigin, 1);

			attacker.client.ps.persistant[PERS.FRAGS]++;

			if (meansOfDeath === MOD.GAUNTLET) {
				// Play humiliation on player.
				attacker.client.ps.persistant[PERS.GAUNTLET_FRAG_COUNT]++;

				// Add the sprite over the player's head
				attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				attacker.client.ps.eFlags |= EF.AWARD_GAUNTLET;
				attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;

				// Also play humiliation on target.
				self.client.ps.persistant[PERS.PLAYEREVENTS] ^= PLAYEREVENTS.GAUNTLETREWARD;
			}

			// Check for two kills in a short amount of time
			// if this is close enough to the last kill, give a reward sound.
			if (level.time - attacker.client.lastKillTime < CARNAGE_REWARD_TIME ) {
				// play excellent on player
				attacker.client.ps.persistant[PERS.EXCELLENT_COUNT]++;

				// add the sprite over the player's head
				attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				attacker.client.ps.eFlags |= EF.AWARD_EXCELLENT;
				attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;
			}
			attacker.client.lastKillTime = level.time;
		}
	} else {
		AddScore(self, self.r.currentOrigin, -1);
	}

	// // Add team bonuses.
	// Team_FragBonuses(self, inflictor, attacker);

	// If I committed suicide, the flag does not fall, it returns.
	if (meansOfDeath === MOD.SUICIDE) {
		if (self.client.ps.powerups[PW.NEUTRALFLAG]) {  // only happens in One Flag CTF
			Team_ReturnFlag(TEAM.FREE);
			self.client.ps.powerups[PW.NEUTRALFLAG] = 0;

		} else if (self.client.ps.powerups[PW.REDFLAG]) {  // only happens in standard CTF
			Team_ReturnFlag(TEAM.RED);
			self.client.ps.powerups[PW.REDFLAG] = 0;

		} else if (self.client.ps.powerups[PW.BLUEFLAG]) {  // only happens in standard CTF
			Team_ReturnFlag(TEAM.BLUE);
			self.client.ps.powerups[PW.BLUEFLAG] = 0;
		}
	}

	TossClientItems(self);

	SendScoreboardMessage(self);  // show scores

	// Send updated scores to any clients that are following this one,
	// or they would get stale scoreboards.
	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];
		if (client.pers.connected !== CON.CONNECTED) {
			continue;
		}
		if (client.sess.team !== TEAM.SPECTATOR) {
			continue;
		}
		if (client.sess.spectatorClient === self.s.number) {
			SendScoreboardMessage(level.gentities[i]);
		}
	}

	self.takeDamage = true;  // can still be gibbed

	self.s.weapon = WP.NONE;
	self.s.powerups = 0;
	self.r.contents = SURF.CONTENTS.CORPSE;

	self.s.angles[0] = 0;
	self.s.angles[2] = 0;
	LookAtKiller(self, inflictor, attacker);
	vec3.set(self.s.angles, self.client.ps.viewangles);

	self.s.loopSound = 0;
	self.r.maxs[2] = -8;

	// Don't allow respawn until the death anim is done
	// g_forceRespawn may force spawning at some later time.
	self.client.respawnTime = level.time + 1700;

	// Remove powerups.
	for (var i = 0; i < MAX_POWERUPS; i++) {
		self.client.ps.powerups[i] = 0;
	}

	// Never gib in a nodrop.
	var contents = PointContents(self.r.currentOrigin, -1);

	if ((self.health <= GIB_HEALTH && !(contents & SURF.CONTENTS.NODROP)/* && g_blood.integer*/) || meansOfDeath === MOD.SUICIDE) {
		// Gib death.
		GibEntity(self, killer);
	} else {
		// Normal death
		var anim;

		switch (deathAnim) {
			case 0:
				anim = ANIM.BOTH_DEATH1;
				break;
			case 1:
				anim = ANIM.BOTH_DEATH2;
				break;
			case 2:
			default:
				anim = ANIM.BOTH_DEATH3;
				break;
		}

		// For the no-blood option, we need to prevent the health
		// from going to gib level.
		if (self.health <= GIB_HEALTH) {
			self.health = GIB_HEALTH+1;
		}

		self.client.ps.legsAnim = ((self.client.ps.legsAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT) | anim;
		self.client.ps.torsoAnim =  ((self.client.ps.torsoAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT ) | anim;

		AddEvent(self, EV.DEATH1 + deathAnim, killer);

		// The body can still be gibbed.
		self.die = BodyDie;

		// Globally cycle through the different death animations.
		deathAnim = (deathAnim + 1) % 3;
	}

	SV.LinkEntity(self);
}

/**
 * LookAtKiller
 */
function LookAtKiller(self, inflictor, attacker) {
	var dir = vec3.create();

	if (attacker && attacker !== self) {
		vec3.subtract(attacker.s.pos.trBase, self.s.pos.trBase, dir);
	} else if (inflictor && inflictor !== self) {
		vec3.subtract(inflictor.s.pos.trBase, self.s.pos.trBase, dir);
	} else {
		self.client.ps.stats[STAT.DEAD_YAW] = self.s.angles[QMath.YAW];
		return;
	}

	self.client.ps.stats[STAT.DEAD_YAW] = VecToYaw(dir);
}

/**
 * GibEntity
 */
function GibEntity(self, killer) {
	AddEvent(self, EV.GIB_PLAYER, killer);
	self.takeDamage = false;
	self.s.eType = ET.INVISIBLE;
	self.r.contents = 0;
}

/**
 * VecToYaw
 */
function VecToYaw(vec) {
	var yaw;

	if (vec[QMath.YAW] === 0 && vec[QMath.PITCH] === 0) {
		yaw = 0;
	} else {
		if (vec[QMath.PITCH]) {
			yaw = (Math.atan2(vec[QMath.YAW], vec[QMath.PITCH]) * 180 / Math.PI);
		} else if (vec[QMath.YAW] > 0) {
			yaw = 90;
		} else {
			yaw = 270;
		}
		if (yaw < 0) {
			yaw += 360;
		}
	}

	return yaw;
}

/**
 * LogAccuracyHit
 */
function LogAccuracyHit(target, attacker) {
	if (!target.takeDamage) {
		return false;
	}

	if (target === attacker) {
		return false;
	}

	if (!target.client) {
		return false;
	}

	if (!attacker.client) {
		return false;
	}

	if (target.client.ps.stats[STAT.HEALTH] <= 0) {
		return false;
	}

	if (OnSameTeam(target, attacker)) {
		return false;
	}

	return true;
}

/**
 * CheckArmor
 */
function CheckArmor(ent, damage, dflags) {
	if (!damage) {
		return 0;
	}

	if (dflags & DAMAGE.NO_ARMOR) {
		return 0;
	}

	var client = ent.client;
	if (!client) {
		return 0;
	}

	var count = client.ps.stats[STAT.ARMOR];
	var save = Math.ceil(damage * ARMOR_PROTECTION);
	if (save >= count) {
		save = count;
	}

	if (!save) {
		return 0;
	}

	client.ps.stats[STAT.ARMOR] -= save;

	return save;
}

/**
 * AddScore
 *
 * Adds score to both the client and his team
 */
function AddScore(ent, origin, score) {
	var client = ent.client;

	if (!client) {
		return;
	}

	// No scoring during pre-match warmup.
	if (level.arena.state.current <= GS.COUNTDOWN) {
		return;
	}

	// Show score plum.
	ScorePlum(ent, origin, score);

	client.ps.persistant[PERS.SCORE] += score;

	if (level.arena.gametype === GT.TEAM) {
		level.arena.teamScores[client.ps.persistant[PERS.TEAM]] += score;
	}

	CalculateRanks();
}

/**
 * ScorePlum
 */
function ScorePlum(ent, origin, score) {
	var plum = TempEntity(origin, EV.SCOREPLUM);

	// Only send this temp entity to a single client.
	plum.r.svFlags |= SVF.SINGLECLIENT;
	plum.r.singleClient = ent.s.number;
	plum.s.otherEntityNum = ent.s.number;
	plum.s.time = score;
}

/**
 * TossClientItems
 *
 * Toss the weapon and powerups for the killed player
 */
function TossClientItems(self) {
	// Don't drop items in CA.
	if (level.arena.gametype >= GT.CLANARENA) {
		return;
	}

	// Drop the weapon if not a gauntlet or machinegun.
	var weapon = self.s.weapon;

	// Make a special check to see if they are changing to a new
	// weapon that isn't the mg or gauntlet.  Without this, a client
	// can pick up a weapon, be killed, and not drop the weapon because
	// their weapon change hasn't completed yet and they are still holding the MG.
	if (weapon === WP.MACHINEGUN || weapon === WP.GRAPPLING_HOOK) {
		if (self.client.ps.weaponstate === WS.DROPPING) {
			weapon = self.client.pers.cmd.weapon;
		}
		if (!(self.client.ps.stats[STAT.WEAPONS] & (1 << weapon))) {
			weapon = WP.NONE;
		}
	}

	if (weapon > WP.MACHINEGUN && weapon !== WP.GRAPPLING_HOOK && self.client.ps.ammo[weapon]) {
		// Find the item type for this weapon.
		var item = BG.FindItemForWeapon(weapon);

		// Spawn the item.
		ItemDrop(self, item, 0);
	}

	// Drop all the powerups if not in teamplay.
	if (level.arena.gametype !== GT.TEAM) {
		var angle = 45;
		for (var i = 1; i < PW.NUM_POWERUPS; i++) {
			if (self.client.ps.powerups[i] > level.time) {
				var item = BG.FindItemForPowerup(i);
				if (!item) {
					continue;
				}
				var drop = ItemDrop(self, item, angle);
				// Decide how many seconds it has left.
				drop.count = (self.client.ps.powerups[i] - level.time) / 1000;
				if (drop.count < 1) {
					drop.count = 1;
				}
				angle += 45;
			}
		}
	}
}

		var spawnFuncs = {};

// These fields are mapped from the entity definition
// to the spawned entity before the entity's spawn()
// function is invoked. Fields not in this list are
// optional and are only available through the Spawn*
// functions.
var fields = {
	'angle':      { type: 'anglehack', aliases: [QS.FTA('s.angles')] },
	'angles':     { type: 'vector', aliases: [QS.FTA('s.angles')] },
	'arena':      { type: 'int' },
	'classname':  { },  // just copy to ent
	'count':      { type: 'int' },
	'dmg':        { type: 'int', aliases: [QS.FTA('damage')] },
	'health':     { type: 'int' },
	'message':    { },
	'model':      { },
	'model2':     { },
	'origin':     { type: 'vector', aliases: [QS.FTA('r.currentOrigin'), QS.FTA('s.origin'), QS.FTA('s.pos.trBase')] },
	'random':     { type: 'float' },
	'spawnflags': { type: 'int' },
	'speed':      { type: 'float' },
	'target':     { },
	'targetname': { aliases: [QS.FTA('targetName')] },
	// TODO
	// 'targetShaderName':    { },
	// 'targetShaderNewName': { },
	'team':       { },
	'wait':       { type: 'float' }
};

/**
 * SpawnEntity
 */
function SpawnEntity() {
	for (var i = MAX_CLIENTS; i < MAX_GENTITIES; i++) {
		var ent = level.gentities[i];

		if (ent.inuse) {
			continue;
		}

		// We don't immediately re-use freed entities, it can cause confusion
		// in the client snapshots. However, the first couple seconds of
		// server time can involve a lot of freeing and allocating, so relax
		// the replacement policy
		if (ent.freeTime > level.startTime + 2000 && level.time - ent.freeTime < 1000) {
			continue;
		}

		ent.reset();

		ent.inuse = true;
		ent.s.number = i;
		// ARENANUM_NONE used by body queue during init.
		ent.s.arenaNum = level.arena ? level.arena.arenaNum : ARENANUM_NONE;

		return ent;
	}

	error('Game entities is full');
}

/**
 * FreeEntity
 */
function FreeEntity(ent) {
	SV.UnlinkEntity(ent); // unlink from world

	if (ent.neverFree) {
		return;
	}

	ent.inuse = false;
	ent.classname = 'freed';
	ent.freeTime = level.time;
}

/**
 * GetEntityNum
 */
function GetEntityNum(ent) {
	return level.gentities.indexOf(ent);
}

/**
 * SpawnAllEntitiesFromDefs
 *
 * Spawns all the map entities into the game.
 */
function SpawnAllEntitiesFromDefs() {
	var entityDefs = SV.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];
		SpawnEntityFromDef(def);
	}

	// Chain together entities by team.
	ChainTeams();
}

/**
 * SpawnEntityFromDef
 */
function SpawnEntityFromDef(def) {
	var ent = SpawnEntity();

	// Store the key/value pairs in the static spawnVars
	// for use in the entity's spawn function.
	level.spawnVars = def;

	// Parse any known fields.
	for (var key in def) {
		if (!def.hasOwnProperty(key)) {
			continue;
		}

		ParseField(ent, key, def[key]);
	}

	// Check for "notteam" flag (GT.FFA, GT.TOURNAMENT).
	if (level.arena.gametype >= GT.TEAM) {
		var notteam = SpawnInt('notteam', 0);
		if (notteam) {
			SV.LinkEntity(ent);
			SV.AdjustAreaPortalState(ent, true);
			FreeEntity(ent);
			return;
		}
	} else {
		var notfree = SpawnInt('notfree', 0);
		if (notfree) {
			SV.LinkEntity(ent);
			SV.AdjustAreaPortalState(ent, true);
			FreeEntity(ent);
			return;
		}
	}

	// If a gametype attribute exists, don't spawn if it doesn't match
	// the current gametype.
	var gametype = SpawnString('gametype', null);
	if (gametype !== null) {
		if (level.arena.gametype >= GT.FFA && level.arena.gametype < GT.MAX_GAME_TYPE) {
			var gametypeName = BG.GametypeNames[level.arena.gametype];

			if (gametype.indexOf(gametypeName) === -1) {
				SV.LinkEntity(ent);
				SV.AdjustAreaPortalState(ent, true);
				FreeEntity(ent);
				return;
			}
		}
	}

	// Don't spawn items in CA modes.
	if (level.arena.gametype < GT.CLANARENA) {
		// See if we should spawn this as an item.
		for (var i = 1; i < BG.ItemList.length; i++) {
			var item = BG.ItemList[i];

			if (item.classname === ent.classname) {
				SpawnItem(ent, item);
				return;
			}
		}
	}

	// Grab the spawn function from the global object.
	ent.spawn = spawnFuncs[ent.classname];

	if (!ent.spawn) {
		log(ent.classname + ' doesn\'t have a spawn function');
		FreeEntity(ent);
		return;
	}

	ent.spawn.call(this, ent);
}

/**
 * ParseField
 */
function ParseField(ent, key, value) {
	var fi = fields[key];
	if (!fi) {
		return;
	}

	// Convert the value.
	var out;

	switch (fi.type) {
		case 'vector':
			// z seems to sometimes be optional...
			value.replace(/([^\s]+)\s+([^\s]+)\s*([^\s]*)/, function($0, x, y, z) {
				out = vec3.createFrom(
					parseFloat(x),
					parseFloat(y),
					z ? parseFloat(z) : 0
				);
			});
			break;
		case 'int':
			out = parseInt(value, 10);
			break;
		case 'float':
			out = parseFloat(value);
			break;
		case 'anglehack':
			out = vec3.createFrom(0, parseFloat(value), 0);
			break;
		default:
			out = value;
			break;
	}

	// Assign the value to the entity.
	if (!fi.aliases) {
		ent[key] = out;
	} else {
		for (var i = 0; i < fi.aliases.length; i++) {
			var alias = fi.aliases[i];
			QS.ASET(ent, alias, out);
		}
	}
}

/**
 * SpawnString
 */
function SpawnString(key, defaultString) {
	if (typeof(level.spawnVars[key]) !== 'undefined') {
		return level.spawnVars[key];
	}

	return defaultString;
}

/**
 * SpawnFloat
 */
function SpawnFloat(key, defaultString) {
	var str = SpawnString(key, defaultString);
	return parseFloat(str);
}

/**
 * SpawnInt
 */
function SpawnInt(key, defaultString) {
	var str = SpawnString(key, defaultString);
	return parseInt(str, 10);
}

/**
 * SpawnVector
 */
function SpawnVector(key, defaultString) {
	var out = vec3.create();
	var str = SpawnString(key, defaultString);
	str.replace(/(.+) (.+) (.+)/, function($0, x, y, z) {
		out[0] = parseFloat(x);
		out[1] = parseFloat(x);
		out[2] = parseFloat(x);
	});
	return out;
}

/**
 * ChainTeams
 *
 * Chain together all entities with a matching team field.
 * Entity teams are used for item groups and multi-entity mover groups.
 *
 * All but the first will have the FL_TEAMSLAVE flag set and teammaster field set.
 * All but the last will have the teamchain field set to the next one.
 */
function ChainTeams() {
	var c = 0;
	var c2 = 0;

	for (var i = 1; i < MAX_GENTITIES; i++) {
		var e = level.gentities[i];

		if (!e.inuse) {
			continue;
		}

		if (e.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (!e.team) {
			continue;
		}

		if (e.flags & GFL.TEAMSLAVE) {
			continue;
		}

		e.teammaster = e;
		c++;
		c2++;

		for (var j = i+1; j < MAX_GENTITIES; j++) {
			var e2 = level.gentities[j];
			if (!e2.inuse) {
				continue;
			}

			if (e2.s.arenaNum !== level.arena.arenaNum) {
				continue;
			}

			if (!e2.team) {
				continue;
			}

			if (e2.flags & GFL.TEAMSLAVE) {
				continue;
			}

			if (e.team === e2.team) {
				c2++;
				e2.teamchain = e.teamchain;
				e.teamchain = e2;
				e2.teammaster = e;
				e2.flags |= GFL.TEAMSLAVE;

				// Make sure that targets only point at the master.
				if (e2.targetName) {
					e.targetName = e2.targetName;
					e2.targetName = null;
				}
			}
		}
	}

	log(c, 'teams with', c2, 'entities');
}

/**
 * TempEntity
 *
 * Spawns an event entity that will be auto-removed.
 * The origin will be snapped to save net bandwidth, so care
 * must be taken if the origin is right on a surface (snap towards start vector first).
 */
function TempEntity(origin, event) {
	var e = SpawnEntity();

	e.s.eType = ET.EVENTS + event;
	e.classname = 'tempEntity';
	e.eventTime = level.time;
	e.freeAfterEvent = true;

	// vec3.set(origin, snapped);
	// SnapVector(snapped);  // save network bandwidth
	SetOrigin(e, origin);

	SV.LinkEntity(e);

	return e;
}

/**
 * FindEntity
 */
function FindEntity(criteria) {
	var results = [];

	for (var i = 0; i < level.gentities.length; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		var valid = true;
		for (var key in criteria) {
			var value = criteria[key];

			if (ent[key] !== value) {
				valid = false;
				break;
			}
		}

		if (valid) {
			results.push(ent);
		}
	}

	return results;
}

/**
 * RunEntity
 */
function RunEntity(ent) {
	var thinktime = ent.nextthink;

	if (thinktime <= 0) {
		return;
	} else if (thinktime > level.time) {
		return;
	}

	ent.nextthink = 0;

	if (!ent.think) {
		error('null ent.think');
	}

	ent.think.call(this, ent);
}

/**
 * PickTarget
 */
function PickTarget(targetName) {
	if (!targetName) {
		log('PickTarget called with NULL targetname');
		return null;
	}

	var choices = FindEntity({ targetName: targetName });

	if (!choices.length) {
		log('PickTarget: target ' + targetName + ' not found');
		return null;
	}

	return choices[QMath.irrandom(0, choices.length - 1)];
}

/**
 * UseTargets
 *
 * "activator" should be set to the entity that initiated the firing.
 *
 * Search for (string)targetname in all entities that
 * match (string)self.target and call their .use function
 */
function UseTargets(ent, activator) {
	if (!ent) {
		return;
	}

	// if (ent.targetShaderName && ent.targetShaderNewName) {
	// 	float f = level.time * 0.001;
	// 	AddRemap(ent->targetShaderName, ent->targetShaderNewName, f);
	// 	trap_SetConfigstring(CS_SHADERSTATE, BuildShaderStateConfig());
	// }

	if (!ent.target) {
		return;
	}

	var targets = FindEntity({ targetName: ent.target });

	for (var i = 0; i < targets.length; i++) {
		var t = targets[i];

		if (t == ent) {
			log('WARNING: Entity used itself.');
		} else {
			if (t.use) {
				t.use(t, ent, activator);
			}
		}
		if (!ent.inuse) {
			log('Entity was removed while using targets.');
			return;
		}
	}
}

/**
 * SetOrigin
 *
 * Set the entities current origin as well as the entity's
 * associated trajectory information to make it stationary.
 */
function SetOrigin(ent, origin) {
	vec3.set(origin, ent.s.pos.trBase);
	ent.s.pos.trType = TR.STATIONARY;
	ent.s.pos.trTime = 0;
	ent.s.pos.trDuration = 0;
	ent.s.pos.trDelta[0] = ent.s.pos.trDelta[1] = ent.s.pos.trDelta[2] = 0;

	vec3.set(origin, ent.r.currentOrigin);
}

/**
 * SetMovedir
 *
 * The editor only specifies a single value for angles (yaw),
 * but we have special constants to generate an up or down direction.
 * Angles will be cleared, because it is being used to represent a direction
 * instead of an orientation.
 */
var VEC_UP       = vec3.createFrom(0, -1,  0);
var MOVEDIR_UP   = vec3.createFrom(0,  0,  1);
var VEC_DOWN     = vec3.createFrom(0, -2,  0);
var MOVEDIR_DOWN = vec3.createFrom(0,  0, -1);

function SetMovedir(angles, movedir) {
	if (vec3.equal(angles, VEC_UP)) {
		vec3.set(MOVEDIR_UP, movedir);
	} else if (vec3.equal(angles, VEC_DOWN)) {
		vec3.set(MOVEDIR_DOWN, movedir);
	} else {
		QMath.AnglesToVectors(angles, movedir, null, null);
	}
	angles[0] = angles[1] = angles[2] = 0;
}

/**
 * AddEvent
 *
 * Adds an event+parm and twiddles the event counter
 */
function AddEvent(ent, event, eventParm) {
	var bits;

	if (!event) {
		log('AddEvent: zero event added for entity', ent.s.number);
		return;
	}

	// Clients need to add the event in PlayerState instead of EntityState.
	if (ent.client) {
		bits = ent.client.ps.externalEvent & EV_EVENT_BITS;
		bits = (bits + EV_EVENT_BIT1) & EV_EVENT_BITS;
		ent.client.ps.externalEvent = event | bits;
		ent.client.ps.externalEventParm = eventParm;
	} else {
		bits = ent.s.event & EV_EVENT_BITS;
		bits = (bits + EV_EVENT_BIT1) & EV_EVENT_BITS;
		ent.s.event = event | bits;
		ent.s.eventParm = eventParm;
	}

	ent.eventTime = level.time;
}

/**
 * AddPredictableEvent
 *
 * Use for non-pmove events that would also be predicted on the
 * client side: jumppads and item pickups
 * Adds an event + parm and twiddles the event counter
 */
function AddPredictableEvent(ent, event, eventParm) {
	if (!ent.client) {
		return;
	}

	BG.AddPredictableEventToPlayerstate(ent.client.ps, event, eventParm);
}

/**
 * AddSound
 */
function AddSound(ent, /*channel,*/ soundIndex) {
	var te = TempEntity(ent.r.currentOrigin, EV.GENERAL_SOUND);
	te.s.eventParm = soundIndex;
}

		/**
 * SpawnItem
 *
 * Sets the clipping size and plants the object on the floor.
 * Items can't be immediately dropped to floor, because they might
 * be on an entity that hasn't spawned yet.
 */
function SpawnItem(ent, item) {
	ent.item = item;
	// Some movers spawn on the second frame, so delay item
	// spawns until the third frame so they can ride trains.
	ent.nextthink = level.time + FRAMETIME * 2;
	ent.think = FinishSpawningItem;

	ent.physicsBounce = 0.5;  // items are bouncy

	if (item.giType === IT.POWERUP) {
		SoundIndex('sound/items/poweruprespawn');  // precache
		ent.speed = SpawnFloat('noglobalsound', '0');
	}
}

/**
 * RunItem
 */
function RunItem(ent) {
	var trace = new QS.TraceResults();

	// If its groundentity has been set to none, it may have been pushed off an edge.
	if (!(ent.spawnflags & 1) && ent.s.groundEntityNum === ENTITYNUM_NONE) {
		if (ent.s.pos.trType !== TR.GRAVITY) {
			ent.s.pos.trType = TR.GRAVITY;
			ent.s.pos.trTime = level.time;
		}
	}

	if (ent.s.pos.trType === TR.STATIONARY) {
		// Check think function.
		RunEntity(ent);
		return;
	}

	// Get current position.
	var origin = vec3.create();
	BG.EvaluateTrajectory(ent.s.pos, level.time, origin);

	// Trace a line from the previous position to the current position.
	var mask;
	if (ent.clipmask) {
		mask = ent.clipmask;
	} else {
		mask = MASK.PLAYERSOLID & ~SURF.CONTENTS.BODY;//MASK_SOLID;
	}

	Trace(trace, ent.r.currentOrigin, origin, ent.r.mins, ent.r.maxs, ent.r.ownerNum, mask);

	if (trace.startSolid) {
		trace.fraction = 0;
	}

	vec3.set(trace.endPos, ent.r.currentOrigin);

	SV.LinkEntity(ent);

	// Check think function.
	RunEntity(ent);

	if (trace.fraction === 1) {
		return;
	}

	// If it is in a nodrop volume, remove it.
	var contents = PointContents(ent.r.currentOrigin, -1);
	if (contents & SURF.CONTENTS.NODROP) {
		if (ent.item && ent.item.giType === IT.TEAM) {
			Team_FreeEntity(ent);
		} else {
			FreeEntity(ent);
		}
		return;
	}

	BounceItem(ent, trace);
}

/**
 * BounceItem
 */
function BounceItem(ent, trace) {
	// Reflect the velocity on the trace plane.
	var hitTime = level.previousTime + (level.time - level.previousTime) * trace.fraction;
	var velocity = vec3.create();
	BG.EvaluateTrajectoryDelta(ent.s.pos, hitTime, velocity);
	var dot = vec3.dot(velocity, trace.plane.normal);
	vec3.add(vec3.scale(trace.plane.normal, -2 * dot, ent.s.pos.trDelta), velocity);

	// Cut the velocity to keep from bouncing forever.
	vec3.scale(ent.s.pos.trDelta, ent.physicsBounce, ent.s.pos.trDelta);

	// Check for stop.
	if (trace.plane.normal[2] > 0 && ent.s.pos.trDelta[2] < 40) {
		trace.endPos[2] += 1.0;  // make sure it is off ground
		// SnapVector( trace.endPos );
		SetOrigin(ent, trace.endPos);
		ent.s.groundEntityNum = trace.entityNum;
		return;
	}

	vec3.add(ent.r.currentOrigin, trace.plane.normal);
	vec3.set(ent.r.currentOrigin, ent.s.pos.trBase);
	ent.s.pos.trTime = level.time;
}

/**
 * FinishSpawningItem
 *
 * Traces down to find where an item should rest, instead of letting them
 * free fall from their spawn points
 */
function FinishSpawningItem(ent) {
	var itemIndex = BG.ItemList.indexOf(ent.item);
	var trace = new QS.TraceResults();

	vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], ent.r.mins);
	vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], ent.r.maxs);

	ent.s.eType = ET.ITEM;
	ent.s.modelIndex = itemIndex;
	ent.s.modelIndex2 = 0; // zero indicates this isn't a dropped item

	ent.r.contents = SURF.CONTENTS.TRIGGER;
	ent.touch = ItemTouch;
	//ent.use = ItemUse;

	if (ent.spawnflags & 1) {
		// Suspended.
		SetOrigin(ent, ent.s.origin);
	} else {
		// Drop to floor.
		var dest = vec3.createFrom(
			ent.s.origin[0],
			ent.s.origin[1],
			ent.s.origin[2] - 4096
		);

		Trace(trace, ent.s.origin, dest, ent.r.mins, ent.r.maxs, ent.s.number, MASK.SOLID);
		if (trace.startSolid) {
			log('FinishSpawningItem:', ent.classname, 'startsolid at', ent.s.origin[0], ent.s.origin[1], ent.s.origin[2]);
			FreeEntity(ent);
			return;
		}

		// Allow to ride movers.
		ent.s.groundEntityNum = trace.entityNum;

		SetOrigin(ent, trace.endPos);
	}

	// Team slaves and targeted items aren't present at start.
	if ((ent.flags & GFL.TEAMSLAVE) || ent.targetName) {
		ent.s.eFlags |= EF.NODRAW;
		ent.r.contents = 0;
		return;
	}

	// Powerups don't spawn in for a while.
	if (ent.item.giType === IT.POWERUP) {
		var respawn = 45 + QMath.crandom() * 15;
		ent.s.eFlags |= EF.NODRAW;
		ent.r.contents = 0;
		ent.nextthink = level.time + respawn * 1000;
		ent.think = RespawnItem;
		return;
	}

	SV.LinkEntity(ent);
}

/**
 * RespawnItem
 */
function RespawnItem(ent) {
	// Randomly select from teamed entities.
	if (ent.team) {
		if (!ent.teammaster) {
			error('RespawnItem: bad teammaster');
		}
		var count;
		var choice;
		var master = ent.teammaster;

		for (count = 0, ent = master; ent; ent = ent.teamchain, count++) { }

		choice = QMath.irrandom(0, count - 1);

		for (count = 0, ent = master; count < choice; ent = ent.teamchain, count++) { }
	}

	ent.r.contents = SURF.CONTENTS.TRIGGER;
	ent.s.eFlags &= ~EF.NODRAW;
	ent.r.svFlags &= ~SVF.NOCLIENT;
	SV.LinkEntity(ent);

	if (ent.item.giType === IT.POWERUP) {
		// Play powerup spawn sound to all clients.
		var tent;

		// If the powerup respawn sound should not be global.
		if (ent.speed) {
			tent = TempEntity(ent.s.pos.trBase, EV.GENERAL_SOUND);
		}
		else {
			tent = TempEntity(ent.s.pos.trBase, EV.GLOBAL_SOUND);
		}
		tent.s.eventParm = SoundIndex('sound/items/poweruprespawn');
		tent.r.svFlags |= SVF.BROADCAST;
	}

	if (ent.item.giType === IT.HOLDABLE) {
		// Play powerup spawn sound to all clients.
		var tent;

		// If the powerup respawn sound should Not be global.
		if (ent.speed) {
			tent = TempEntity(ent.s.pos.trBase, EV.GENERAL_SOUND);
		}
		else {
			tent = TempEntity(ent.s.pos.trBase, EV.GLOBAL_SOUND);
		}
		tent.s.eventParm = SoundIndex('sound/items/kamikazerespawn');
		tent.r.svFlags |= SVF.BROADCAST;
	}

	// Play the normal respawn sound only to nearby clients.
	AddEvent(ent, EV.ITEM_RESPAWN, 0);

	ent.nextthink = 0;
}

/**
 * ItemTouch
 */
function ItemTouch(ent, other) {
	if (!other.client) {
		return;
	}

	if (other.client.ps.pm_type === PM.DEAD) {
		return;  // dead people can't pickup
	}

	// The same pickup rules are used for client side and server side.
	if (!BG.CanItemBeGrabbed(level.arena.gametype, ent.s, other.client.ps)) {
		return;
	}

// 	G_LogPrintf( "Item: %i %s\n", other.s.number, ent.item.classname );
//
	var predict = true;// other.client.pers.predictItemPickup;

	// Call the item-specific pickup function.
	var respawn;
	switch (ent.item.giType) {
		case IT.WEAPON:
			respawn = PickupWeapon(ent, other);
			break;
		case IT.AMMO:
			respawn = PickupAmmo(ent, other);
			break;
		case IT.ARMOR:
			respawn = PickupArmor(ent, other);
			break;
		case IT.HEALTH:
			respawn = PickupHealth(ent, other);
			break;
		case IT.POWERUP:
			respawn = PickupPowerup(ent, other);
			predict = false;
			break;
		case IT.TEAM:
			respawn = Team_PickupItem(ent, other);
			break;
		case IT.HOLDABLE:
			respawn = PickupHoldable(ent, other);
			break;
		default:
			return;
	}

	if (!respawn) { return; }

	// Play the normal pickup sound.
	if (predict) {
		AddPredictableEvent(other, EV.ITEM_PICKUP, ent.s.modelIndex);
	} else {
		AddEvent(other, EV.ITEM_PICKUP, ent.s.modelIndex);
	}

	// Powerup pickups are global broadcasts.
	if (ent.item.giType === IT.POWERUP || ent.item.giType === IT.TEAM) {
		var tent;
		// If we want the global sound to play.
		if (!ent.speed) {
			tent = TempEntity(ent.s.pos.trBase, EV.GLOBAL_ITEM_PICKUP);
			tent.s.eventParm = ent.s.modelIndex;
			tent.r.svFlags |= SVF.BROADCAST;
		} else {
			tent = TempEntity(ent.s.pos.trBase, EV.GLOBAL_ITEM_PICKUP);
			tent.s.eventParm = ent.s.modelIndex;
			// Only send this temp entity to a single client.
			tent.r.svFlags |= SVF.r.singleClient;
			tent.r.singleClient = other.s.number;
		}
	}

	// Fire item targets.
	UseTargets(ent, other);

	// Wait of -1 will not respawn.
	if (ent.wait === -1) {
		ent.r.svFlags |= SVF.NOCLIENT;
		ent.s.eFlags |= EF.NODRAW;
		ent.r.contents = 0;
		ent.unlinkAfterEvent = true;
		return;
	}

	// Non-zero wait overrides respawn time.
	if (ent.wait) {
		respawn = ent.wait;
	}

	// Random can be used to vary the respawn time.
	if (ent.random) {
		respawn += Math.random() * ent.random;
		if (respawn < 1) {
			respawn = 1;
		}
	}

	// Dropped items will not respawn.
	if (ent.flags & GFL.DROPPED_ITEM) {
		ent.freeAfterEvent = true;
	}

	// Picked up items still stay around, they just don't
	// draw anything.  This allows respawnable items
	// to be placed on movers.
	ent.r.svFlags |= SVF.NOCLIENT;
	ent.s.eFlags |= EF.NODRAW;
	ent.r.contents = 0;

	// A negative respawn times means to never respawn this item (but don't
	// delete it).  This is used by items that are respawned by third party
	// events such as ctf flags
	if (respawn <= 0) {
		ent.nextthink = 0;
		ent.think = 0;
	} else {
		ent.nextthink = level.time + (respawn * 1000);
		ent.think = RespawnItem;
	}

	SV.LinkEntity(ent);
}

/**
 * Items are any object that a player can touch to gain some effect.
 *
 * Pickup will return the number of seconds until they should respawn.
 *
 * All items should pop when dropped in lava or slime.
 *
 * Respawnable items don't actually go away when picked up, they are
 * just made invisible and untouchable. This allows them to ride
 * movers and respawn apropriately.
 */

var RESPAWN = {
	ARMOR      : 25,
	HEALTH     : 35,
	AMMO       : 40,
	HOLDABLE   : 60,
	MEGAHEALTH : 35,
	POWERUP    : 120
};

/**
 * PickupWeapon
 */
function PickupWeapon(ent, other) {
	var quantity;

	if (ent.count < 0) {
		quantity = 0; // None for you, sir!
	} else {
		if (ent.count) {
			quantity = ent.count;
		} else {
			quantity = ent.item.quantity;
		}

		// Dropped items and teamplay weapons always have full ammo.
		if (!(ent.flags & GFL.DROPPED_ITEM) && level.arena.gametype !== GT.TEAM ) {
			// Respawning rules.
			// Drop the quantity if they already have over the minimum.
			if (other.client.ps.ammo[ent.item.giTag] < quantity) {
				quantity = quantity - other.client.ps.ammo[ent.item.giTag];
			} else {
				quantity = 1;  // only add a single shot
			}
		}
	}

	// Add the weapon.
	other.client.ps.stats[STAT.WEAPONS] |= (1 << ent.item.giTag);

	AddAmmo(other, ent.item.giTag, quantity);

	// Team deathmatch has slow weapon respawns.
	if (level.arena.gametype === GT.TEAM) {
		return g_weaponTeamRespawn.get();
	}

	return g_weaponRespawn.get();
}

/**
 * PickupAmmo
 */
function PickupAmmo(ent, other) {
	var quantity;

	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}

	AddAmmo(other, ent.item.giTag, quantity);

	return RESPAWN.AMMO;
}

/**
 * AddAmmo
 */
function AddAmmo(ent, weapon, count) {
	ent.client.ps.ammo[weapon] += count;

	if (ent.client.ps.ammo[weapon] > 200) {
		ent.client.ps.ammo[weapon] = 200;
	}
}

/**
 * PickupArmor
 */
function PickupArmor(ent, other) {
	other.client.ps.stats[STAT.ARMOR] += ent.item.quantity;

	if (other.client.ps.stats[STAT.ARMOR] > other.client.ps.stats[STAT.MAX_HEALTH] * 2) {
		other.client.ps.stats[STAT.ARMOR] = other.client.ps.stats[STAT.MAX_HEALTH] * 2;
	}

	return RESPAWN.ARMOR;
}

/**
 * PickupHealth
 */
function PickupHealth(ent, other) {
	var max,
		quantity;

	// Small and mega healths will go over the max.
	if (ent.item.quantity != 5 && ent.item.quantity != 100) {
		max = other.client.ps.stats[STAT.MAX_HEALTH];
	} else {
		max = other.client.ps.stats[STAT.MAX_HEALTH] * 2;
	}

	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}

	other.health += quantity;

	if (other.health > max) {
		other.health = max;
	}

	other.client.ps.stats[STAT.HEALTH] = other.health;

	if (ent.item.quantity == 100) {  // mega health respawns slow
		return RESPAWN.MEGAHEALTH;
	}

	return RESPAWN.HEALTH;
}

/**
 * PickupPowerup
 */
function PickupPowerup(ent, other) {
	var trace = new QS.TraceResults();

	if (!other.client.ps.powerups[ent.item.giTag]) {
		// round timing to seconds to make multiple powerup timers
		// count in sync
		other.client.ps.powerups[ent.item.giTag] = level.time - ( level.time % 1000 );
	}

	var quantity;
	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}

	other.client.ps.powerups[ent.item.giTag] += quantity * 1000;

	// Give any nearby players a "denied" anti-reward.
	for (var i = 0; i < MAX_CLIENTS; i++) {
		var client = level.clients[i];
		if (client === other.client) {
			continue;
		}
		if (client.pers.connected === CON.DISCONNECTED) {
			continue;
		}
		if (client.ps.pm_type === PM.DEAD) {
			continue;
		}

		// If same team in team game, no sound.
		// Cannot use OnSameTeam as it expects to g_entities, not clients.
		if (level.arena.gametype >= GT.TEAM && other.client.sess.team === client.sess.team) {
			continue;
		}

		// If too far away, no sound.
		var delta = vec3.subtract(ent.s.pos.trBase, client.ps.origin, vec3.create());
		var len = vec3.normalize(delta);
		if (len > 192) {
			continue;
		}

		// If not facing, no sound.
		var forward = vec3.create();
		QMath.AnglesToVectors(client.ps.viewangles, forward, null, null);
		if (vec3.dot(delta, forward) < 0.4) {
			continue;
		}

		// If not line of sight, no sound.
		Trace(trace, client.ps.origin, ent.s.pos.trBase, null, null, ENTITYNUM_NONE, SURF.CONTENTS.SOLID);
		if (trace.fraction !== 1.0) {
			continue;
		}

		// Anti-reward.
		client.ps.persistant[PERS.PLAYEREVENTS] ^= PLAYEREVENTS.DENIEDREWARD;
	}

	return RESPAWN.POWERUP;
}

/**
 * TODO : Stub functions for now
 */
// function PickupTeam(ent, other) { return 0; } // function is in gm-team.js
function PickupHoldable(ent, other) { return RESPAWN.HOLDABLE; }


//======================================================================

/**
 * ItemDrop
 *
 * Spawns an item and tosses it forward
 */
function ItemDrop(ent, item, angle) {
	var velocity = vec3.create();
	var angles   = vec3.create();

	vec3.set(ent.s.apos.trBase, angles);
	angles[QMath.YAW] += angle;
	angles[QMath.PITCH] = 0;  // always forward

	QMath.AnglesToVectors(angles, velocity, null, null);
	vec3.scale(velocity, 150, velocity);
	velocity[2] += 200 + QMath.crandom() * 50;

	// Create dropped item.
	var dropped = SpawnEntity();

	dropped.s.eType = ET.ITEM;
	dropped.s.modelIndex = BG.ItemList.indexOf(item);  // store item number in modelindex
	dropped.s.modelIndex2 = 1;  // This is non-zero is it's a dropped item

	dropped.classname = item.classname;
	dropped.item = item;
	vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], dropped.r.mins);
	vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], dropped.r.maxs);
	dropped.r.contents = SURF.CONTENTS.TRIGGER;

	dropped.touch = ItemTouch;

	SetOrigin(dropped, ent.s.pos.trBase);
	dropped.s.pos.trType = TR.GRAVITY;
	dropped.s.pos.trTime = level.time;
	vec3.set(velocity, dropped.s.pos.trDelta);

	dropped.s.eFlags |= EF.BOUNCE_HALF;

	if ((level.arena.gametype == GT.CTF || level.arena.gametype == GT.NFCTF) && item.giType == IT.TEAM) { // Special case for CTF flags
		dropped.think = Team_DroppedFlagThink;
		dropped.nextthink = level.time + 30000;
		Team_CheckDroppedItem(dropped);
	} else {  // auto-remove after 30 seconds
		dropped.think = FreeEntity;
		dropped.nextthink = level.time + 30000;
	}

	dropped.flags = GFL.DROPPED_ITEM;

	SV.LinkEntity(dropped);

	return dropped;
}

/**
 * ItemUse
 *
 * Respawn the item.
 */
function ItemUse(ent, other, activator) {
	RespawnItem(ent);
}

		var MISSILE_PRESTEP_TIME = 50;

/**
 * RunMissile
 */
function RunMissile(ent) {
	var trace = new QS.TraceResults();

	// Get current position.
	var origin = vec3.create();
	BG.EvaluateTrajectory(ent.s.pos, level.time, origin);

	// Trace a line from the previous position to the current position.
	Trace(trace, ent.r.currentOrigin, origin, ent.r.mins, ent.r.maxs, ent.r.ownerNum, ent.clipmask);
	if (trace.startSolid || trace.allSolid) {
		// Make sure the trace.entityNum is set to the entity we're stuck in.
		Trace(trace, ent.r.currentOrigin, ent.r.currentOrigin, ent.r.mins, ent.r.maxs, ent.r.ownerNum, ent.clipmask);
		trace.fraction = 0.0;
	} else {
		vec3.set(trace.endPos, ent.r.currentOrigin);
	}

	SV.LinkEntity(ent);

	if (trace.fraction !== 1.0) {
		// Never explode or bounce on sky.
		if (trace.surfaceFlags & SURF.FLAGS.NOIMPACT) {
			// // If grapple, reset owner.
			// if (ent.parent && ent.parent.client && ent.parent.client.hook == ent) {
			// 	ent.parent.client.hook = NULL;
			// }
			FreeEntity(ent);
			return;
		}

		MissileImpact(ent, trace);

		if (ent.s.eType !== ET.MISSILE) {
			return;  // exploded
		}
	}

	// Check think function after bouncing.
	RunEntity(ent);
}

/**
 * MissileImpact
 */
function MissileImpact(ent, trace) {
	var other = level.gentities[trace.entityNum];
	var hitClient = false;

	// Check for bounce.
	if (!other.takeDamage && (ent.s.eFlags & (EF.BOUNCE | EF.BOUNCE_HALF))) {
		BounceMissile(ent, trace);
		AddEvent(ent, EV.GRENADE_BOUNCE, 0);
		return;
	}

	// Impact damage.
	if (other.takeDamage) {
		// FIXME: wrong damage direction?
		if (ent.damage) {
			var velocity = vec3.create();

			if (LogAccuracyHit(other, level.gentities[ent.r.ownerNum])) {
				level.gentities[ent.r.ownerNum].client.accuracy_hits++;
				hitClient = true;
			}

			BG.EvaluateTrajectoryDelta(ent.s.pos, level.time, velocity);
			if (vec3.length(velocity) === 0) {
				velocity[2] = 1;  // stepped on a grenade
			}

			Damage(other, ent, level.gentities[ent.r.ownerNum], velocity,
				ent.s.origin, ent.damage, 0, ent.methodOfDeath);
		}
	}

	// if (!strcmp(ent.classname, "hook")) {
	// 	gentity_t *nent;
	// 	vec3_t v;

	// 	nent = G_Spawn();
	// 	if ( other.takeDamage && other.client ) {

	// 		G_AddEvent( nent, EV_MISSILE_HIT, DirToByte( trace.plane.normal ) );
	// 		nent.s.otherEntityNum = other.s.number;

	// 		ent.enemy = other;

	// 		v[0] = other.r.currentOrigin[0] + (other.r.mins[0] + other.r.maxs[0]) * 0.5;
	// 		v[1] = other.r.currentOrigin[1] + (other.r.mins[1] + other.r.maxs[1]) * 0.5;
	// 		v[2] = other.r.currentOrigin[2] + (other.r.mins[2] + other.r.maxs[2]) * 0.5;

	// 		SnapVectorTowards( v, ent.s.pos.trBase );	// save net bandwidth
	// 	} else {
	// 		VectorCopy(trace.endPos, v);
	// 		G_AddEvent( nent, EV_MISSILE_MISS, DirToByte( trace.plane.normal ) );
	// 		ent.enemy = NULL;
	// 	}

	// 	SnapVectorTowards( v, ent.s.pos.trBase );	// save net bandwidth

	// 	nent.freeAfterEvent = true;
	// 	// change over to a normal entity right at the point of impact
	// 	nent.s.eType = ET_GENERAL;
	// 	ent.s.eType = ET_GRAPPLE;

	// 	G_SetOrigin( ent, v );
	// 	G_SetOrigin( nent, v );

	// 	ent.think = Weapon_HookThink;
	// 	ent.nextthink = level.time + FRAMETIME;

	// 	ent.parent.client.ps.pm_flags |= PMF_GRAPPLE_PULL;
	// 	VectorCopy( ent.r.currentOrigin, ent.parent.client.ps.grapplePoint);

	// 	trap_LinkEntity( ent );
	// 	trap_LinkEntity( nent );

	// 	return;
	// }

	// Is it cheaper in bandwidth to just remove this ent and create a new
	// one, rather than changing the missile into the explosion?
	if (other.takeDamage && other.client) {
		AddEvent(ent, EV.MISSILE_HIT, QMath.DirToByte(trace.plane.normal));
		ent.s.otherEntityNum = other.s.number;
	} else if (trace.surfaceFlags & SURF.FLAGS.METALSTEPS) {
		AddEvent(ent, EV.MISSILE_MISS_METAL, QMath.DirToByte(trace.plane.normal));
	} else {
		AddEvent(ent, EV.MISSILE_MISS, QMath.DirToByte(trace.plane.normal));
	}

	ent.freeAfterEvent = true;

	// Change over to a normal entity right at the point of impact.
	ent.s.eType = ET.GENERAL;

	// SnapVectorTowards(trace.endPos, ent.s.pos.trBase );  // save net bandwidth

	SetOrigin(ent, trace.endPos);

	// Splash damage (doesn't apply to person directly hit).
	if (ent.splashDamage) {
		if (RadiusDamage(trace.endPos, ent, ent.parent, ent.splashDamage, ent.splashRadius, other, ent.splashMethodOfDeath)) {
			if (!hitClient) {
				level.gentities[ent.r.ownerNum].client.accuracy_hits++;
			}
		}
	}

	SV.LinkEntity(ent);
}

/**
 * BounceMissile
 */
function BounceMissile(ent, trace) {
	var velocity = vec3.create();
	var dot;
	var hitTime;

	// reflect the velocity on the trace plane
	hitTime = level.previousTime + (level.time - level.previousTime) * trace.fraction;
	BG.EvaluateTrajectoryDelta(ent.s.pos, hitTime, velocity);
	dot = vec3.dot(velocity, trace.plane.normal);
	vec3.add(velocity, vec3.scale(trace.plane.normal, (-2 * dot), vec3.create()), ent.s.pos.trDelta);

	if (ent.s.eFlags & EF.BOUNCE_HALF) {
		vec3.scale(ent.s.pos.trDelta, 0.65, ent.s.pos.trDelta);
		// check for stop
		if (trace.plane.normal[2] > 0.2 && vec3.length(ent.s.pos.trDelta) < 40) {
			SetOrigin(ent, trace.endPos);
			ent.s.time = level.time / 4;
			return;
		}
	}

	vec3.add(ent.r.currentOrigin, trace.plane.normal, ent.r.currentOrigin);
	vec3.set(ent.r.currentOrigin, ent.s.pos.trBase);
	ent.s.pos.trTime = level.time;
}

/**
 * ExplodeMissile
 *
 * Explode a missile without an impact
 */
function ExplodeMissile(ent) {
	var origin = vec3.create();
	// We don't have a valid direction, so just point straight up.
	var dir = vec3.createFrom(0, 0, 1);

	BG.EvaluateTrajectory(ent.s.pos, level.time, origin);
	// SnapVector(origin);
	SetOrigin(ent, origin);

	ent.s.eType = ET.GENERAL;
	ent.freeAfterEvent = true;
	AddEvent(ent, EV.MISSILE_MISS, QMath.DirToByte(dir));

	// Splash damage
	if (ent.splashDamage) {
		if (RadiusDamage(ent.r.currentOrigin, ent, ent.parent, ent.splashDamage, ent.splashRadius, ent, ent.splashMethodOfDeath)) {
			level.gentities[ent.r.ownerNum].client.accuracy_hits++;
		}
	}

	SV.LinkEntity(ent);
}

/**
 * FireRocket
 */
function FireRocket(self, start, dir) {
	var rocket = SpawnEntity();
	rocket.classname = 'rocket';
	rocket.nextthink = level.time + 15000;
	rocket.think = ExplodeMissile;
	rocket.s.eType = ET.MISSILE;
	rocket.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	rocket.s.weapon = WP.ROCKET_LAUNCHER;
	rocket.r.ownerNum = self.s.number;
	rocket.parent = self;
	rocket.damage = 100;
	rocket.splashDamage = 100;
	rocket.splashRadius = 120;
	rocket.methodOfDeath = MOD.ROCKET;
	rocket.splashMethodOfDeath = MOD.ROCKET_SPLASH;
	rocket.clipmask = MASK.SHOT;

	rocket.s.pos.trType = TR.LINEAR;
	rocket.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;  // move a bit on the very first frame
	vec3.set(start, rocket.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 900, rocket.s.pos.trDelta);
	// SnapVector( rocket.s.pos.trDelta );  // save net bandwidth
	vec3.set(start, rocket.r.currentOrigin);

	return rocket;
}

/**
 * FireGrenade
 */
function FireGrenade (self, start, dir) {
	var grenade = SpawnEntity();

	grenade.classname = 'grenade';
	grenade.nextthink = level.time + 2500;
	grenade.think = ExplodeMissile;
	grenade.s.eType = ET.MISSILE;
	grenade.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	grenade.s.weapon = WP.GRENADE_LAUNCHER;
	grenade.s.eFlags = EF.BOUNCE_HALF;
	grenade.r.ownerNum = self.s.number;
	grenade.parent = self;
	grenade.damage = 100;
	grenade.splashDamage = 100;
	grenade.splashRadius = 150;
	grenade.methodOfDeath = MOD.GRENADE;
	grenade.splashMethodOfDeath = MOD.GRENADE_SPLASH;
	grenade.clipmask = MASK.SHOT;
// 	grenade.target_ent = null;

	grenade.s.pos.trType = TR.GRAVITY;
	grenade.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;  // move a bit on the very first frame
	vec3.set(start, grenade.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 700, grenade.s.pos.trDelta);
// 	SnapVector(grenade.s.pos.trDelta);  // save net bandwidth

	vec3.set(start, grenade.r.currentOrigin);

	return grenade;
}

/**
 * FirePlasma
 */
function FirePlasma (self, start, dir) {
	var bolt = SpawnEntity();

	bolt.classname = 'plasma';
	bolt.nextthink = level.time + 10000;
	bolt.think = ExplodeMissile;
	bolt.s.eType = ET.MISSILE;
	bolt.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	bolt.s.weapon = WP.PLASMAGUN;
	bolt.r.ownerNum = self.s.number;
	bolt.parent = self;
	bolt.damage = 20;
	bolt.splashDamage = 15;
	bolt.splashRadius = 20;
	bolt.methodOfDeath = MOD.PLASMA;
	bolt.splashMethodOfDeath = MOD.PLASMA_SPLASH;
	bolt.clipmask = MASK.SHOT;
// 	bolt.target_ent = null;

	bolt.s.pos.trType = TR.LINEAR;
	bolt.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;		// move a bit on the very first frame
	vec3.set(start, bolt.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 2000, bolt.s.pos.trDelta);
// 	SnapVector(bolt.s.pos.trDelta);			// save net bandwidth

	vec3.set(start, bolt.r.currentOrigin);

	return bolt;
}

/**
 * FireBFG
 */
function FireBFG (self, start, dir) {
	var bolt = SpawnEntity();

	bolt.classname = 'bfg';
	bolt.nextthink = level.time + 10000;
	bolt.think = ExplodeMissile;
	bolt.s.eType = ET.MISSILE;
	bolt.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	bolt.s.weapon = WP.BFG;
	bolt.r.ownerNum = self.s.number;
	bolt.parent = self;
	bolt.damage = 100;
	bolt.splashDamage = 100;
	bolt.splashRadius = 120;
	bolt.methodOfDeath = MOD.BFG;
	bolt.splashMethodOfDeath = MOD.BFG_SPLASH;
	bolt.clipmask = MASK.SHOT;
// 	bolt.target_ent = null;

	bolt.s.pos.trType = TR.LINEAR;
	bolt.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;		// move a bit on the very first frame
	vec3.set(start, bolt.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 2000, bolt.s.pos.trDelta);
// 	SnapVector(bolt.s.pos.trDelta);			// save net bandwidth

	vec3.set(start, bolt.r.currentOrigin);

	return bolt;
}

		/**********************************************************
 *
 * General movers
 *
 * Doors, plats, and buttons are all binary (two position) movers.
 * Pos1 is "at rest", pos2 is "activated".
 *
 **********************************************************/

var Pushed = function () {
	this.ent = null;
	this.origin = vec3.create();
	this.angles = vec3.create();
	this.deltayaw = 0;
};
var pushed = new Array(MAX_GENTITIES);
for (var i = 0; i < MAX_GENTITIES; i++) {
	pushed[i] = new Pushed();
}
var pidx = 0;

/**
 * InitMover
 *
 * "pos1", "pos2", and "speed" should be set before calling,
 * so the movement delta can be calculated
 */
function InitMover(ent) {
	// If the "model2" key is set, use a seperate model
	// for drawing, but clip against the brushes.
	if (ent.model2) {
		ent.s.modelIndex2 = ModelIndex(ent.model2);
	}

	// // If the "loopsound" key is set, use a constant looping sound when moving.
	// if ( G_SpawnString( "noise", "100", &sound ) ) {
	// 	ent.s.loopSound = G_SoundIndex( sound );
	// }

	// // if the "color" or "light" keys are set, setup constantLight
	// lightSet = G_SpawnFloat( "light", "100", &light );
	// colorSet = G_SpawnVector( "color", "1 1 1", color );
	// if ( lightSet || colorSet ) {
	// 	int		r, g, b, i;

	// 	r = color[0] * 255;
	// 	if ( r > 255 ) {
	// 		r = 255;
	// 	}
	// 	g = color[1] * 255;
	// 	if ( g > 255 ) {
	// 		g = 255;
	// 	}
	// 	b = color[2] * 255;
	// 	if ( b > 255 ) {
	// 		b = 255;
	// 	}
	// 	i = light / 4;
	// 	if ( i > 255 ) {
	// 		i = 255;
	// 	}
	// 	ent.s.constantLight = r | ( g << 8 ) | ( b << 16 ) | ( i << 24 );
	// }

	ent.use = UseBinaryMover;
	ent.reached = ReachedBinaryMover;

	ent.moverState = MOVER.POS1;
	ent.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	ent.s.eType = ET.MOVER;
	vec3.set(ent.pos1, ent.r.currentOrigin);
	SV.LinkEntity(ent);

	ent.s.pos.trType = TR.STATIONARY;
	vec3.set(ent.pos1, ent.s.pos.trBase);

	// Calculate time to reach second position from speed.
	var move = vec3.subtract(ent.pos2, ent.pos1, vec3.create());
	var distance = vec3.length(move);
	if (!ent.speed) {
		ent.speed = 100;
	}
	vec3.scale(move, ent.speed, ent.s.pos.trDelta);
	ent.s.pos.trDuration = distance * 1000 / ent.speed;
	if (ent.s.pos.trDuration <= 0) {
		ent.s.pos.trDuration = 1;
	}
}

/**
 * RunMover
 *
 */
function RunMover(ent) {
	// If not a team captain, don't do anything, because
	// the captain will handle everything.
	if (ent.flags & GFL.TEAMSLAVE) {
		return;
	}

	// If stationary at one of the positions, don't move anything.
	if (ent.s.pos.trType !== TR.STATIONARY || ent.s.apos.trType !== TR.STATIONARY) {
		RunMoverTeam(ent);
	}

	// Check think function.
	RunEntity(ent);
}

/**
 * RunMoverTeam
 */
function RunMoverTeam(ent) {
	var part;
	var obstacle;

	var move = vec3.create();
	var amove = vec3.create();
	var origin = vec3.create();
	var angles = vec3.create();

	// Make sure all team slaves can move before commiting
	// any moves or calling any think functions.
	// If the move is blocked, all moved objects will be backed out.
	pidx = 0;
	for (part = ent; part; part = part.teamchain) {
		// Get current position.
		BG.EvaluateTrajectory(part.s.pos, level.time, origin);
		BG.EvaluateTrajectory(part.s.apos, level.time, angles);
		vec3.subtract(origin, part.r.currentOrigin, move);
		vec3.subtract(angles, part.r.currentAngles, amove);

		obstacle = MoverPush(part, move, amove);
		if (obstacle) {
			break;  // move was blocked
		}
	}

	if (part) {
		// Go back to the previous position.
		for (part = ent; part; part = part.teamchain) {
			part.s.pos.trTime += level.time - level.previousTime;
			part.s.apos.trTime += level.time - level.previousTime;
			BG.EvaluateTrajectory(part.s.pos, level.time, part.r.currentOrigin);
			BG.EvaluateTrajectory(part.s.apos, level.time, part.r.currentAngles);
			SV.LinkEntity(part);
		}

		// If the pusher has a "blocked" function, call it.
		if (ent.blocked) {
			ent.blocked(ent, obstacle);
		}
		return;
	}

	// The move succeeded
	for (part = ent; part; part = part.teamchain) {
		// Call the reached function if time is at or past end point.
		if (part.s.pos.trType === TR.LINEAR_STOP) {
			if (level.time >= part.s.pos.trTime + part.s.pos.trDuration) {
				if (part.reached) {
					part.reached(part);
				}
			}
		}
	}
}

/**
 * MoverPush
 *
 * Objects need to be moved back on a failed push,
 * otherwise riders would continue to slide.
 * If false is returned, obstacle will be the blocking entity.
 */
function MoverPush(pusher, move, amove) {
	var mins = vec3.create();
	var maxs = vec3.create();
	var totalMins = vec3.create();
	var totalMaxs = vec3.create();

	// mins/maxs are the bounds at the destination
	// totalMins / totalMaxs are the bounds for the entire move.
	if (pusher.r.currentAngles[0] || pusher.r.currentAngles[1] || pusher.r.currentAngles[2] ||
		amove[0] || amove[1] || amove[2] ) {
		var radius = QMath.RadiusFromBounds(pusher.r.mins, pusher.r.maxs);
		for (var i = 0; i < 3; i++) {
			mins[i] = pusher.r.currentOrigin[i] + move[i] - radius;
			maxs[i] = pusher.r.currentOrigin[i] + move[i] + radius;
			totalMins[i] = mins[i] - move[i];
			totalMaxs[i] = maxs[i] - move[i];
		}
	} else {
		for (var i = 0; i < 3; i++) {
			mins[i] = pusher.r.absmin[i] + move[i];
			maxs[i] = pusher.r.absmax[i] + move[i];
		}

		vec3.set(pusher.r.absmin, totalMins);
		vec3.set(pusher.r.absmax, totalMaxs);

		for (i = 0; i < 3; i++) {
			if (move[i] > 0) {
				totalMaxs[i] += move[i];
			} else {
				totalMins[i] += move[i];
			}
		}
	}

	// Unlink the pusher so we don't get it in the entityList
	SV.UnlinkEntity(pusher);

	var entityNums = FindEntitiesInBox(totalMins, totalMaxs);

	// Move the pusher to its final position.
	vec3.add(pusher.r.currentOrigin, move);
	vec3.add(pusher.r.currentAngles, amove);
	SV.LinkEntity(pusher);

	// See if any solid entities are inside the final position.
	for (var i = 0; i < entityNums.length; i++) {
		var check = level.gentities[entityNums[i]];

		// Only push items and players.
		if (check.s.eType !== ET.ITEM && check.s.eType !== ET.PLAYER && !check.physicsObject) {
			continue;
		}

		// If the entity is standing on the pusher, it will definitely be moved
		if (check.s.groundEntityNum !== pusher.s.number) {
			// See if the ent needs to be tested.
			if (check.r.absmin[0] >= maxs[0] ||
				check.r.absmin[1] >= maxs[1] ||
				check.r.absmin[2] >= maxs[2] ||
				check.r.absmax[0] <= mins[0] ||
				check.r.absmax[1] <= mins[1] ||
				check.r.absmax[2] <= mins[2]) {
				continue;
			}

			// See if the ent's bbox is inside the pusher's final position
			// this does allow a fast moving object to pass through a thin entity...
			if (!TestEntityPosition(check)) {
				continue;
			}
		}

		// The entity needs to be pushed.
		if (TryPushingEntity(check, pusher, move, amove)) {
			continue;
		}

		// The move was blocked an entity.

		// Bobbing entities are instant-kill and never get blocked.
		if (pusher.s.pos.trType === TR.SINE || pusher.s.apos.trType === TR.SINE) {
			Damage(check, pusher, pusher, null, null, 99999, 0, MOD.CRUSH);
			continue;
		}

		// Save off the obstacle so we can call the block function (crush, etc).
		var obstacle = check;

		// Move back any entities we already moved.
		// Go backwards, so if the same entity was pushed
		// twice, it goes back to the original position.
		for (var idx = pidx-1; idx >= 0; idx--) {
			var p = pushed[idx];

			vec3.set(p.origin, p.ent.s.pos.trBase);
			vec3.set(p.angles, p.ent.s.apos.trBase);

			if (p.ent.client) {
				p.ent.client.ps.delta_angles[QMath.YAW] = p.deltayaw;
				vec3.set(p.origin, p.ent.client.ps.origin);
			}

			SV.LinkEntity(p.ent);
		}

		return obstacle;
	}

	return null;
}

/**
 * TestEntityPosition
 */
function TestEntityPosition(ent) {
	var mask;
	if (ent.clipmask) {
		mask = ent.clipmask;
	} else {
		mask = MASK.SOLID;
	}

	var trace = new QS.TraceResults();
	if (ent.client) {
		Trace(trace, ent.client.ps.origin, ent.client.ps.origin, ent.r.mins, ent.r.maxs, ent.s.number, mask);
	} else {
		Trace(trace, ent.s.pos.trBase, ent.s.pos.trBase, ent.r.mins, ent.r.maxs, ent.s.number, mask);
	}

	if (trace.startSolid) {
		return level.gentities[trace.entityNum];
	}

	return null;
}

/**
 * TryPushingEntity
 *
 * Returns false if the move is blocked.
 */
function TryPushingEntity(check, pusher, move, amove) {
	var org = vec3.create();
	var org2 = vec3.create();
	var move2 = vec3.create();

	// EF.MOVER_STOP will just stop when contacting another entity
	// instead of pushing it, but entities can still ride on top of it.
	if ((pusher.s.eFlags & EF.MOVER_STOP) &&
		check.s.groundEntityNum !== pusher.s.number) {
		return false;
	}

	if (pidx > MAX_GENTITIES) {
		error('pidx > MAX_GENTITIES');
		return;
	}

	//
	// Save off the old position.
	//
	var pushed_p = pushed[pidx];
	pushed_p.ent = check;
	vec3.set(check.s.pos.trBase, pushed_p.origin);
	vec3.set(check.s.apos.trBase, pushed_p.angles);
	if (check.client) {
		pushed_p.deltayaw = check.client.ps.delta_angles[QMath.YAW];
		vec3.set(check.client.ps.origin, pushed_p.origin);
	}
	pushed_p = pushed[++pidx];

	//
	// Try moving the contacted entity figure movement due to the pusher's amove.
	//
	var matrix = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	var transpose = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	QMath.AnglesToAxis(amove, matrix);
	QMath.TransposeMatrix(matrix, transpose);
	if (check.client) {
		vec3.subtract(check.client.ps.origin, pusher.r.currentOrigin, org);
	}
	else {
		vec3.subtract(check.s.pos.trBase, pusher.r.currentOrigin, org);
	}
	vec3.set(org, org2);
	QMath.RotatePoint(org2, transpose);
	vec3.subtract(org2, org, move2);

	//
	// Add movement.
	//
	vec3.add(check.s.pos.trBase, move, check.s.pos.trBase);
	vec3.add(check.s.pos.trBase, move2, check.s.pos.trBase);
	if (check.client) {
		vec3.add(check.client.ps.origin, move, check.client.ps.origin);
		vec3.add(check.client.ps.origin, move2, check.client.ps.origin);

		// Make sure the client's view rotates when on a rotating mover.
		check.client.ps.delta_angles[QMath.YAW] += QMath.AngleToShort(amove[QMath.YAW]);
	}

	// May have pushed them off an edge.
	if (check.s.groundEntityNum !== pusher.s.number) {
		check.s.groundEntityNum = ENTITYNUM_NONE;
	}

	var block = TestEntityPosition(check);
	if (!block) {
		// Pushed ok.
		if (check.client) {
			vec3.set(check.client.ps.origin, check.r.currentOrigin);
		} else {
			vec3.set(check.s.pos.trBase, check.r.currentOrigin);
		}
		SV.LinkEntity(check);
		return true;
	}

	// If it is ok to leave in the old position, do it.
	// This is only relevent for riding entities, not pushed.
	// Sliding trapdoors can cause this..
	var old_pushed_p = pushed[pidx-1];

	vec3.set(old_pushed_p.origin, check.s.pos.trBase);
	if (check.client) {
		vec3.set(old_pushed_p.origin, check.client.ps.origin);
	}
	vec3.set(old_pushed_p.angles, check.s.apos.trBase);
	block = TestEntityPosition(check);
	if (!block) {
		check.s.groundEntityNum = ENTITYNUM_NONE;
		pidx--;
		return true;
	}

	// Blocked.
	return false;
}

/**
 * SetMoverState
 */
function SetMoverState(ent, moverState, time) {
	var delta = vec3.create();
	var f;

	ent.moverState = moverState;
	ent.s.pos.trTime = time;

	switch (moverState) {
		case MOVER.POS1:
			vec3.set(ent.pos1, ent.s.pos.trBase);
			ent.s.pos.trType = TR.STATIONARY;
			break;
		case MOVER.POS2:
			vec3.set(ent.pos2, ent.s.pos.trBase);
			ent.s.pos.trType = TR.STATIONARY;
			break;
		case MOVER.ONETOTWO:
			vec3.set(ent.pos1, ent.s.pos.trBase);
			vec3.subtract(ent.pos2, ent.pos1, delta);
			f = 1000.0 / ent.s.pos.trDuration;
			vec3.scale(delta, f, ent.s.pos.trDelta);
			ent.s.pos.trType = TR.LINEAR_STOP;
			break;
		case MOVER.TWOTOONE:
			vec3.set(ent.pos2, ent.s.pos.trBase);
			vec3.subtract(ent.pos1, ent.pos2, delta);
			f = 1000.0 / ent.s.pos.trDuration;
			vec3.scale(delta, f, ent.s.pos.trDelta);
			ent.s.pos.trType = TR.LINEAR_STOP;
			break;
	}

	BG.EvaluateTrajectory(ent.s.pos, level.time, ent.r.currentOrigin);
	SV.LinkEntity(ent);
}

/**
 * UseBinaryMover
 */
function UseBinaryMover(ent, other, activator) {
	var total;
	var partial;

	// Only the master should be used.
	if (ent.flags & GFL.TEAMSLAVE) {
		UseBinaryMover(ent.teammaster, other, activator);
		return;
	}

	ent.activator = activator;

	if (ent.moverState === MOVER.POS1) {
		// Start moving 50 msec later, becase if this was player
		// triggered, level.time hasn't been advanced yet.
		MatchTeam(ent, MOVER.ONETOTWO, level.time + 50);

		// Starting sound.
		if (ent.sound1to2) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.sound1to2);
		}

		// Looping sound.
		ent.s.loopSound = ent.soundLoop;

		// Open areaportal.
		if (ent.teammaster === ent || !ent.teammaster) {
			SV.AdjustAreaPortalState(ent, true);
		}

		return;
	}

	// If all the way up, just delay before coming down.
	if (ent.moverState === MOVER.POS2) {
		ent.nextthink = level.time + ent.wait;
		return;
	}

	// Only partway down before reversing.
	if (ent.moverState === MOVER.TWOTOONE) {
		total = ent.s.pos.trDuration;
		partial = level.time - ent.s.pos.trTime;
		if (partial > total) {
			partial = total;
		}

		MatchTeam(ent, MOVER.ONETOTWO, level.time - (total - partial));

		if (ent.sound1to2) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.sound1to2);
		}
		return;
	}

	// Only partway up before reversing.
	if (ent.moverState === MOVER.ONETOTWO) {
		total = ent.s.pos.trDuration;
		partial = level.time - ent.s.pos.trTime;
		if (partial > total) {
			partial = total;
		}

		MatchTeam(ent, MOVER.TWOTOONE, level.time - (total - partial));

		if (ent.sound2to1) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.sound2to1);
		}
		return;
	}
}

/**
 * ReachedBinaryMover
 */
function ReachedBinaryMover(ent) {
	// Stop the looping sound.
	ent.s.loopSound = ent.soundLoop;

	if (ent.moverState === MOVER.ONETOTWO) {
		// Reached pos2.
		SetMoverState(ent, MOVER.POS2, level.time);

		// Play sound.
		if (ent.soundPos2) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.soundPos2);
		}

		// Return to pos1 after a delay.
		ent.think = ReturnToPos1;
		ent.nextthink = level.time + ent.wait;

		// Fire targets.
		if (!ent.activator) {
			ent.activator = ent;
		}
		UseTargets(ent, ent.activator);
	} else if (ent.moverState === MOVER.TWOTOONE) {
		// Reached pos1.
		SetMoverState(ent, MOVER.POS1, level.time);

		// Play sound.
		if (ent.soundPos1) {
			AddEvent(ent, EV.GENERAL_SOUND, ent.soundPos1);
		}

		// Close areaportals.
		if (ent.teammaster === ent || !ent.teammaster) {
			SV.AdjustAreaPortalState(ent, false);
		}
	} else {
		error('ReachedBinaryMover: bad moverState');
	}
}

/**
 * MatchTeam
 *
 * All entities in a mover team will move from pos1 to pos2
 * in the same amount of time
 */
function MatchTeam(teamLeader, moverState, time) {
	for (var slave = teamLeader; slave; slave = slave.teamchain) {
		SetMoverState(slave, moverState, time);
	}
}

/**
 * ReturnToPos1
 */
function ReturnToPos1(ent) {
	MatchTeam(ent, MOVER.TWOTOONE, level.time);

	// Looping sound.
	ent.s.loopSound = ent.soundLoop;

	// Starting sound.
	if (ent.sound2to1) {
		AddEvent(ent, EV.GENERAL_SOUND, ent.sound2to1);
	}
}
		/**
 * InitWorldSession
 */
function InitWorldSession() {
	var session = Cvar.AddCvar('session');
	var gt = session.get();

	// If the gametype changed since the last session, don't use any
	// client sessions
	if (g_gametype.get() !== gt) {
		level.newSession = true;
		log('Gametype changed, clearing session data.');
	}
}

/**
 * WriteWorldSession
 */
function WriteWorldSession() {
	var session = Cvar.AddCvar('session');
	session.set('session', g_gametype.get());

	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (level.clients[i].pers.connected === CON.CONNECTED) {
			WriteSessionData(level.clients[i]);
		}
	}
}

/**
 * InitSessionData
 *
 * Called on a first-time connect.
 */
function InitSessionData(client, userinfo) {
	var clientNum = level.clients.indexOf(client);
	var sess = client.sess;

	var value = userinfo['team'];

	if (value === 's') {
		// A willing spectator, not a waiting-in-line.
		sess.team = TEAM.SPECTATOR;
	} else {
		if (level.arena.gametype === GT.TOURNAMENT) {
			sess.team = PickTeam(clientNum);
		} else if (level.arena.gametype >= GT.TEAM) {
			// Always auto-join for practice arena.
			if (level.arena.gametype === GT.PRACTICEARENA) {
				sess.team = PickTeam(clientNum);
			} else {
				// Always spawn as spectator in team games.
				sess.team = TEAM.SPECTATOR;
			}
		} else {
			sess.team = TEAM.SPECTATOR;
		}
	}

	sess.spectatorState = sess.team === TEAM.SPECTATOR ? SPECTATOR.FREE : SPECTATOR.NOT;

	PushClientToQueue(level.gentities[clientNum]);

	WriteSessionData(client);
}

/**
 * ReadSessionData
 *
 * Called on a reconnect.
 */
function ReadSessionData(client) {
	var name = 'session' + level.clients.indexOf(client);
	var cvar = Cvar.GetCvar(name);

	if (!cvar) {
		return;
	}

	// Parse string.
	var val = JSON.parse(cvar.get());

	client.sess.team = val.team;
	client.sess.spectatorNum = val.spectatorNum;
	client.sess.spectatorState = val.spectatorState;
	client.sess.spectatorClient = val.spectatorClient;
	client.sess.wins = val.wins;
	client.sess.losses = val.losses;
}

/**
 * WriteSessionData
 *
 * Called on game shutdown
 */
function WriteSessionData(client) {
	var name = 'session' + level.clients.indexOf(client);
	var val = JSON.stringify(client.sess);

	var cvar = Cvar.AddCvar(name);
	cvar.set(val);
}
		var CTF_CAPTURE_BONUS                  = 5;                // what you get for capture
var CTF_TEAM_BONUS                     = 0;                // what your team gets for capture
var CTF_RECOVERY_BONUS                 = 1;                // what you get for recovery
var CTF_FLAG_BONUS                     = 0;                // what you get for picking up enemy flag
var CTF_FRAG_CARRIER_BONUS             = 2;                // what you get for fragging enemy flag carrier
var CTF_FLAG_RETURN_TIME               = 40000;            // seconds until auto return

var CTF_CARRIER_DANGER_PROTECT_BONUS   = 2;                // bonus for fraggin someone who has recently hurt your flag carrier
var CTF_CARRIER_PROTECT_BONUS          = 1;                // bonus for fraggin someone while either you or your target are near your flag carrier
var CTF_FLAG_DEFENSE_BONUS             = 1;                // bonus for fraggin someone while either you or your target are near your flag
var CTF_RETURN_FLAG_ASSIST_BONUS       = 1;                // awarded for returning a flag that causes a capture to happen almost immediately
var CTF_FRAG_CARRIER_ASSIST_BONUS      = 2;                // award for fragging a flag carrier if a capture happens almost immediately

var CTF_TARGET_PROTECT_RADIUS          = 1000;             // the radius around an object being defended where a target will be worth extra frags
var CTF_ATTACKER_PROTECT_RADIUS        = 1000;             // the radius around an object being defended where an attacker will get extra frags when making kills

var CTF_CARRIER_DANGER_PROTECT_TIMEOUT = 8000;
var CTF_FRAG_CARRIER_ASSIST_TIMEOUT    = 10000;
var CTF_RETURN_FLAG_ASSIST_TIMEOUT     = 10000;

var CTF_GRAPPLE_SPEED                  = 750;              // speed of grapple in flight
var CTF_GRAPPLE_PULL_SPEED             = 750;              // speed player is pulled at

var OVERLOAD_ATTACK_BASE_SOUND_TIME    = 20000;

var TeamGame = function () {
	this.reset();
};

TeamGame.prototype.reset = function () {
	this.last_flag_capture       = 0;
	this.last_capture_team       = 0;
	this.redStatus               = 0;  // CTF
	this.blueStatus              = 0;  // CTF
	this.flagStatus              = 0;  // One Flag CTF
	this.redTakenTime            = 0;
	this.blueTakenTime           = 0;
};

var teamgame = new TeamGame();

/**
 * TeamName
 */
function TeamName(team) {
	if (team === TEAM.RED) {
		return 'RED';
	} else if (team === TEAM.BLUE) {
		return 'BLUE';
	} else if (team === TEAM.SPECTATOR) {
		return 'SPECTATOR';
	}
	return 'FREE';
}

/**
 * OtherTeam
 */
function OtherTeam(team) {
	if (team === TEAM.RED) {
		return TEAM.BLUE;
	} else if (team === TEAM.BLUE) {
		return TEAM.RED;
	}
	return team;
}

/**
 * OnSameTeam
 */
function OnSameTeam(ent1, ent2) {
	if (!ent1.client || !ent2.client) {
		return false;
	}

	if (level.arena.gametype < GT.TEAM) {
		return false;
	}

	if (ent1.client.sess.team === ent2.client.sess.team) {
		return true;
	}

	return false;
}

/**
 * PickTeam
 */
function PickTeam(ignoreClientNum) {
	var team = TEAM.FREE;

	if (level.arena.gametype >= GT.TEAM) {
		// Find the team with the least amount of players.
		var counts = new Array(TEAM.NUM_TEAMS);

		counts[TEAM.RED] = TeamCount(TEAM.RED, ignoreClientNum);
		counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, ignoreClientNum);

		if (counts[TEAM.RED] > counts[TEAM.BLUE]) {
			team = TEAM.BLUE;
		} else if (counts[TEAM.BLUE] > counts[TEAM.RED]) {
			team = TEAM.RED;
		}
		// Equal team count, so join the team with the lowest score.
		else if (level.arena.teamScores[TEAM.RED] > level.arena.teamScores[TEAM.BLUE]) {
			team = TEAM.BLUE;
		} else {
			team = TEAM.RED;
		}
	}

	// If we've exceeded the amount of allowed players, kick to spec.
	if ((level.arena.gametype === GT.TOURNAMENT && level.arena.numNonSpectatorClients >= 2)) {
		team = TEAM.SPECTATOR;
	}

	return team;
}

/**
 * TeamCount
 *
 * Returns number of players on a team.
 */
function TeamCount(team, ignoreClientNum) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		if (i === ignoreClientNum) {
			continue;
		}

		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.team === team) {
			count++;
		}
	}

	return count;
}

/**
 * TeamAliveCount
 */
function TeamAliveCount(team) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.team !== team) {
			continue;
		}

		if (ent.client.pers.teamState.state !== TEAM_STATE.ELIMINATED) {
			count++;
		}
	}

	return count;
}

/**
 * TeamGroupCount
 */
function TeamGroupCount(group, ignoreClientNum) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		if (i === ignoreClientNum) {
			continue;
		}

		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.group === group) {
			count++;
		}
	}

	return count;
}

/**
 * TeamGroupScore
 */
function TeamGroupScore(group) {
	var score = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.group !== group) {
			continue;
		}

		score += ent.client.ps.persistant[PERS.SCORE];
	}

	return score;
}

/**
 * Team_CheckItems
 */
function Team_CheckItems() {
	// Set up team stuff
	Team_InitGame();

	if (level.arena.gametype === GT.CTF) {
		// Check for the two flags.
		var item = BG.FindItemForPowerup(PW.REDFLAG);
		if (!item) {
			error('No team_CTF_redflag in map');
		}

		item = BG.FindItemForPowerup(PW.BLUEFLAG);
		if (!item) {
			error('No team_CTF_blueflag in map');
		}
	}
}

/**
 * Team_InitGame
 */
function Team_InitGame() {
	teamgame.reset();

	switch (level.arena.gametype) {
		case GT.CTF:
			teamgame.redStatus = -1; // Invalid to force update
			teamgame.blueStatus = -1; // Invalid to force update
			Team_SetFlagStatus(TEAM.RED, FLAG.ATBASE);
			Team_SetFlagStatus(TEAM.BLUE, FLAG.ATBASE);
			break;

		default:
			break;
	}
}

/**
 * Team_SetFlagStatus
 */
var ctfFlagStatusRemap = [0, 1, '*', '*', 2];
var oneFlagStatusRemap = [0, 1, 2, 3, 4];

function Team_SetFlagStatus(team, status) {
	var modified = false;

	switch(team) {
	case TEAM.RED:	// CTF
		if (teamgame.redStatus != status) {
			teamgame.redStatus = status;
			modified = true;
		}
		break;

	case TEAM.BLUE:	// CTF
		if (teamgame.blueStatus != status) {
			teamgame.blueStatus = status;
			modified = true;
		}
		break;

	case TEAM.FREE:	// One Flag CTF
		if (teamgame.flagStatus != status) {
			teamgame.flagStatus = status;
			modified = true;
		}
		break;
	}

	if (modified) {
		var st = new Array(4);

		if(level.arena.gametype == GT.CTF) {
			st[0] = ctfFlagStatusRemap[teamgame.redStatus];
			st[1] = ctfFlagStatusRemap[teamgame.blueStatus];
			st[2] = 0;
		}
		else {		// GT_1FCTF
			st[0] = oneFlagStatusRemap[teamgame.flagStatus];
			st[1] = 0;
		}

		SV.SetConfigstring('flagstatus', st);
	}
}

/**
 * Team_CheckDroppedItem
 */
function Team_CheckDroppedItem(dropped) {
	if (dropped.item.giTag === PW.REDFLAG) {
		Team_SetFlagStatus(TEAM.RED, FLAG.DROPPED);
	} else if (dropped.item.giTag === PW.BLUEFLAG) {
		Team_SetFlagStatus(TEAM.BLUE, FLAG.DROPPED);
	} else if (dropped.item.giTag == PW.NEUTRALFLAG) {
		Team_SetFlagStatus(TEAM.FREE, FLAG.DROPPED);
	}
}

/**
 * Team_PickupItem
 */
function Team_PickupItem(ent, other) {
	var cl = other.client;

	// Figure out what team this flag is.
	var team;
	if (ent.classname === 'team_CTF_redflag') {
		team = TEAM.RED;
	} else if (ent.classname === 'team_CTF_blueflag') {
		team = TEAM.BLUE;
	} else {
		SV.SendServerCommand(other.s.number, 'print', 'Don\'t know what team the flag is on.');
		return 0;
	}

	// GT.CTF
	if (team === cl.sess.team) {
		return Team_TouchOurFlag(ent, other, team);
	}

	return Team_TouchEnemyFlag(ent, other, team);
}

/**
 * Team_TouchOurFlag
 */
function Team_TouchOurFlag(ent, other, team) {
	var cl = other.client;

	var enemy_flag;
	if (cl.sess.team == TEAM.RED) {
		enemy_flag = PW.BLUEFLAG;
	} else {
		enemy_flag = PW.REDFLAG;
	}

	if (ent.flags & GFL.DROPPED_ITEM) {
		// Hey, it's not home.  return it by teleporting it back.
		SV.SendServerCommand(null, 'print', cl.pers.name + ' returned the ' + TeamName(team) + ' flag!');
		AddScore(other, ent.r.currentOrigin, CTF_RECOVERY_BONUS);
		other.client.pers.teamState.flagrecovery++;
		other.client.pers.teamState.lastreturnedflag = level.time;
		// ResetFlag will remove this entity! We must return zero.
		Team_ReturnFlagSound(Team_ResetFlag(team), team);
		return 0;
	}

	// The flag is at home base. If the player has the enemy
	// flag, he's just won!
	if (!cl.ps.powerups[enemy_flag]) {
		return 0;  // We don't have the flag
	}

	SV.SendServerCommand(null, 'print', cl.pers.name + ' captured the ' + TeamName(OtherTeam(team)) + ' flag!');

	cl.ps.powerups[enemy_flag] = 0;

	teamgame.last_flag_capture = level.time;
	teamgame.last_capture_team = team;

	// Increase the team's score
	Team_AddScore(other.client.sess.team, ent.s.pos.trBase, 1);
	Team_ForceGesture(other.client.sess.team);

	other.client.pers.teamState.captures++;
	// Add the sprite over the player's head.
	other.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
	other.client.ps.eFlags |= EF.AWARD_CAP;
	other.client.rewardTime = level.time + REWARD_SPRITE_TIME;
	other.client.ps.persistant[PERS.CAPTURES]++;

	// Other gets another 10 frag bonus.
	AddScore(other, ent.r.currentOrigin, CTF_CAPTURE_BONUS);

	Team_CaptureFlagSound(ent, team);

	// Ok, let's do the player loop, hand out the bonuses
	for (var i = 0; i < level.maxclients; i++) {
		var player = level.gentities[i];

		// Also make sure we don't award assist bonuses to the flag carrier himself.
		if (!player.inuse || player == other) {
			continue;
		}

		if (player.client.sess.team != cl.sess.team) {
			player.client.pers.teamState.lasthurtcarrier = -5;

		} else if (player.client.sess.team == cl.sess.team) {

			// Award extra points for capture assists.
			if (player.client.pers.teamState.lastreturnedflag + CTF_RETURN_FLAG_ASSIST_TIMEOUT > level.time) {
				AddScore (player, ent.r.currentOrigin, CTF_RETURN_FLAG_ASSIST_BONUS);
				other.client.pers.teamState.assists++;

				player.client.ps.persistant[PERS.ASSIST_COUNT]++;
				// Add the sprite over the player's head.
				player.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				player.client.ps.eFlags |= EF.AWARD_ASSIST;
				player.client.rewardTime = level.time + REWARD_SPRITE_TIME;

			}

			if (player.client.pers.teamState.lastfraggedcarrier + CTF_FRAG_CARRIER_ASSIST_TIMEOUT > level.time) {
				AddScore(player, ent.r.currentOrigin, CTF_FRAG_CARRIER_ASSIST_BONUS);
				other.client.pers.teamState.assists++;
				player.client.ps.persistant[PERS.ASSIST_COUNT]++;
				// Add the sprite over the player's head.
				player.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				player.client.ps.eFlags |= EF.AWARD_ASSIST;
				player.client.rewardTime = level.time + REWARD_SPRITE_TIME;
			}
		}
	}

	Team_ResetFlags();

	CalculateRanks();

	return 0; // Do not respawn this automatically
}

/**
 * Team_TouchEnemyFlag
 */
function Team_TouchEnemyFlag(ent, other, team) {
	var cl = other.client;

	SV.SendServerCommand(null, 'print', other.client.pers.name + ' got the ' + TeamName(team) + ' flag!');

	if (team == TEAM.RED) {
		cl.ps.powerups[PW.REDFLAG] = 0x1fffffff /*INT_MAX*/; // flags never expire
	} else {
		cl.ps.powerups[PW.BLUEFLAG] = 0x1fffffff /*INT_MAX*/; // flags never expire
	}

	Team_SetFlagStatus(team, FLAG.TAKEN);

	cl.pers.teamState.flagsince = level.time;
	Team_TakeFlagSound(ent, team);

	return -1; // Do not respawn this automatically, but do delete it if it was FL_DROPPED
}

/**
 * Team_ForceGesture
 */
function Team_ForceGesture(team) {
	for (var i = 0; i < MAX_CLIENTS; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}
		if (!ent.client) {
			continue;
		}
		if (ent.client.sess.team != team) {
			continue;
		}

		ent.flags |= GFL.FORCE_GESTURE;
	}
}

/**
 * Team_ResetFlags
 */
function Team_ResetFlags() {
	if (level.arena.gametype == GT.CTF) {
		Team_ResetFlag(TEAM.RED);
		Team_ResetFlag(TEAM.BLUE);

	} else if (level.arena.gametype == GT.NFCTF) {
		Team_ResetFlag(TEAM.FREE);
	}
}

/**
 * Team_ResetFlag
 */
function Team_ResetFlag(team) {
	var str;
	var ents;
	var rent;

	switch (team) {
	case TEAM.RED:
		str = "team_CTF_redflag";
		break;
	case TEAM.BLUE:
		str = "team_CTF_blueflag";
		break;
	case TEAM.FREE:
		str = "team_CTF_neutralflag";
		break;
	default:
		return null;
	}

	ents = FindEntity({ classname: str });

	for (var i = 0; i < ents.length; i++) {

		if (ents[i].flags & GFL.DROPPED_ITEM) {
			FreeEntity(ents[i]);

		} else {
			rent = ents[i];
			RespawnItem(ents[i]);
		}
	}

	Team_SetFlagStatus(team, FLAG.ATBASE);

	return rent;
}

/**
 * Team_ReturnFlagSound
 */
function Team_ReturnFlagSound(ent, team) {
	if (!ent) {
// 		G_Printf ("Warning:  NULL passed to Team_ReturnFlagSound\n");
		return;
	}

	var temp = TempEntity(ent.s.pos.trBase, EV.GLOBAL_TEAM_SOUND);
	if (team == TEAM.BLUE ) {
		temp.s.eventParm = GTS.RED_RETURN;
	} else {
		temp.s.eventParm = GTS.BLUE_RETURN;
	}
	temp.r.svFlags |= SVF.BROADCAST;
}

/**
 * Team_TakeFlagSound
 */
function Team_TakeFlagSound(ent, team) {
	if (!ent) {
// 		G_Printf ("Warning:  NULL passed to Team_TakeFlagSound\n");
		return;
	}

	// only play sound when the flag was at the base
	// or not picked up the last 10 seconds
	switch(team) {
		case TEAM.RED:
			if (teamgame.blueStatus != FLAG.ATBASE ) {
				if (teamgame.blueTakenTime > level.time - 10000) {
					return;
				}
			}
			teamgame.blueTakenTime = level.time;
			break;

		case TEAM.BLUE:	// CTF
			if (teamgame.redStatus != FLAG.ATBASE ) {
				if (teamgame.redTakenTime > level.time - 10000) {
					return;
				}
			}
			teamgame.redTakenTime = level.time;
			break;
	}

	var temp = TempEntity(ent.s.pos.trBase, EV.GLOBAL_TEAM_SOUND);
	if (team == TEAM.BLUE) {
		temp.s.eventParm = GTS.RED_TAKEN;
	} else {
		temp.s.eventParm = GTS.BLUE_TAKEN;
	}

	temp.r.svFlags |= SVF.BROADCAST;
}

/**
 * Team_CaptureFlagSound
 */
function Team_CaptureFlagSound(ent, team) {
	if (!ent) {
// 		G_Printf ("Warning:  NULL passed to Team_CaptureFlagSound\n");
		return;
	}

	var temp = TempEntity(ent.s.pos.trBase, EV.GLOBAL_TEAM_SOUND);
	if (team === TEAM.BLUE) {
		temp.s.eventParm = GTS.BLUE_CAPTURE;
	} else {
		temp.s.eventParm = GTS.RED_CAPTURE;
	}
	temp.r.svFlags |= SVF.BROADCAST;
}

/**
 * Team_ReturnFlag
 */
function Team_ReturnFlag(team) {
	Team_ReturnFlagSound(Team_ResetFlag(team), team);
	if (team === TEAM.FREE) {
		SV.SendServerCommand(null, 'print', 'The flag has returned!');
	} else {
		SV.SendServerCommand(null, 'print', 'The ' + TeamName(team) + ' flag has returned!');
	}
}

/**
 * Team_FreeEntity
 */
function Team_FreeEntity(ent) {
	if (ent.item.giTag === PW.REDFLAG) {
		Team_ReturnFlag(TEAM.RED);
	} else if (ent.item.giTag === PW.BLUEFLAG) {
		Team_ReturnFlag(TEAM.BLUE);
	} else if (ent.item.giTag === PW.NEUTRALFLAG) {
		Team_ReturnFlag(TEAM.FREE);
	}
}

/**
 * Team_DroppedFlagThink
 *
 * Automatically set in Launch_Item if the item is one of the flags.
 *
 * Flags are unique in that if they are dropped, the base flag must be respawned when they time out.
 */
function Team_DroppedFlagThink(ent) {
	var team = TEAM.FREE;

	if (ent.item.giTag === PW.REDFLAG) {
		team = TEAM.RED;
	} else if (ent.item.giTag === PW.BLUEFLAG) {
		team = TEAM.BLUE;
	} else if (ent.item.giTag === PW.NEUTRALFLAG) {
		team = TEAM.FREE;
	}

	Team_ReturnFlagSound(Team_ResetFlag(team), team);
	// Reset Flag will delete this entity.
}
/**
 * Team_AddScore
 *
 * Used for gametype > GT_TEAM.
 * For gametype GT_TEAM the teamScores is updated in AddScore in g_combat.c
 */
function Team_AddScore(team, origin, score) {
	var tent = TempEntity(origin, EV.GLOBAL_TEAM_SOUND);
	tent.r.svFlags |= SVF.BROADCAST;

	if (team === TEAM.RED) {
		if (level.arena.teamScores[TEAM.RED] + score === level.arena.teamScores[TEAM.BLUE]) {
			// Teams are tied sound.
			tent.s.eventParm = GTS.TEAMS_ARE_TIED;
		} else if (level.arena.teamScores[TEAM.RED] <= level.arena.teamScores[TEAM.BLUE] && level.arena.teamScores[TEAM.RED] + score > level.arena.teamScores[TEAM.BLUE]) {
			// Red took the lead sound.
			tent.s.eventParm = GTS.REDTEAM_TOOK_LEAD;
		} else {
			// Red scored sound.
			tent.s.eventParm = GTS.REDTEAM_SCORED;
		}
	} else {
		if (level.arena.teamScores[TEAM.BLUE] + score === level.arena.teamScores[TEAM.RED]) {
			// Teams are tied sound.
			tent.s.eventParm = GTS.TEAMS_ARE_TIED;
		} else if (level.arena.teamScores[TEAM.BLUE] <= level.arena.teamScores[TEAM.RED] && level.arena.teamScores[TEAM.BLUE] + score > level.arena.teamScores[TEAM.RED]) {
			// Blue took the lead sound.
			tent.s.eventParm = GTS.BLUETEAM_TOOK_LEAD;

		} else {
			// Blue scored sound.
			tent.s.eventParm = GTS.BLUETEAM_SCORED;
		}
	}

	level.teamScores[team] += score;
}

/**
 * SelectCTFSpawnPoint
 */
function SelectCTFSpawnPoint(team, teamstate, origin, angles) {
	var classname;
	if (teamstate == TEAM_STATE.BEGIN) {
		if (team == TEAM.RED) {
			classname = 'team_CTF_redplayer';
		} else if (team == TEAM.BLUE) {
			classname = 'team_CTF_blueplayer';
		}
	} else {
		if (team == TEAM.RED) {
			classname = 'team_CTF_redspawn';
		} else if (team == TEAM.BLUE) {
			classname = 'team_CTF_bluespawn';
		}
	}
	if (!classname) {
		return SelectSpawnPoint(QMath.vec3origin, origin, angles);
	}

	var spawnpoints = FindEntity({ classname: classname });
	var spots = [];
	var spot;

	for (var i = 0; i < spawnpoints.length; i++) {
		spot = spawnpoints[i];

		if (SpotWouldTelefrag(spot)) {
			continue;
		}

		if (spot.arena !== ARENANUM_NONE && spot.arena !== level.arena.arenaNum) {
			continue;
		}

		spots.push(spot);
	}

	if (!spots.length) {
		spot = spawnpoints[0];
		if (!spot) {
			return SelectSpawnPoint(QMath.vec3origin, origin, angles);
		}
	} else {
		var selection = QMath.irrandom(0, spots.length - 1);
		spot = spots[selection];
	}

	vec3.set(spot.s.origin, origin);
	origin[2] += 9;
	vec3.set(spot.s.angles, angles);

	return spot;
}
		/**
 * InitTrigger
 */
function InitTrigger(self) {
	if (!vec3.equal(self.s.angles, QMath.vec3origin)) {
		SetMovedir(self.s.angles, self.movedir);
	}

	SV.SetBrushModel(self, self.model);
	self.r.contents = SURF.CONTENTS.TRIGGER;  // replaces the -1 from trap_SetBrushModel
	self.r.svFlags = SVF.NOCLIENT;
}

/**
 * AimAtTarget
 */
function AimAtTarget(self) {
	var origin = vec3.add(self.r.absmin, self.r.absmax, vec3.create());
	vec3.scale(origin, 0.5);

	var ent = PickTarget(self.target);
	if (!ent) {
		FreeEntity(self);
		return;
	}

	var height = ent.s.origin[2] - origin[2];
	var gravity = g_gravity.get();
	var time = Math.sqrt(height / (0.5 * gravity));
	if (!time) {
		FreeEntity(self);
		return;
	}

	// set s.origin2 to the push velocity
	vec3.subtract(ent.s.origin, origin, self.s.origin2 );
	self.s.origin2[2] = 0;

	var dist = vec3.length(self.s.origin2);
	vec3.normalize(self.s.origin2);

	var forward = dist / time;
	vec3.scale(self.s.origin2, forward);

	self.s.origin2[2] = time * gravity;
}
		var MACHINEGUN_SPREAD      = 200;
var MACHINEGUN_DAMAGE      = 7;
var MACHINEGUN_TEAM_DAMAGE = 5;  // wimpier MG in teamplay

/**
 * FireWeapon
 */
function FireWeapon(ent) {
	var client = ent.client;

	// Track shots taken for accuracy tracking. Grapple is not a weapon and gauntet is just not tracked.
	if (ent.s.weapon !== WP.GRAPPLING_HOOK && ent.s.weapon !== WP.GAUNTLET) {
		client.accuracy_shots++;
	}

	// Fire the specific weapon.
	switch (ent.s.weapon) {
		case WP.GAUNTLET:
			// This is predicted.
			break;
		case WP.LIGHTNING:
			LightningFire(ent);
			break;
		case WP.SHOTGUN:
			ShotgunFire(ent);
			break;
		case WP.MACHINEGUN:
			if (level.arena.gametype !== GT.TEAM) {
				BulletFire(ent, MACHINEGUN_SPREAD, MACHINEGUN_DAMAGE, MOD.MACHINEGUN);
			} else {
				BulletFire(ent, MACHINEGUN_SPREAD, MACHINEGUN_TEAM_DAMAGE, MOD.MACHINEGUN);
			}
			break;
		case WP.GRENADE_LAUNCHER:
			GrenadeLauncherFire(ent);
			break;
		case WP.ROCKET_LAUNCHER:
			RocketLauncherFire(ent);
			break;
		case WP.PLASMAGUN:
			PlasmagunFire(ent);
			break;
		case WP.RAILGUN:
			RailgunFire(ent);
			break;
		case WP.BFG:
			BFGFire(ent);
			break;
		case WP.GRAPPLING_HOOK:
		//	GrapplingHookFire(ent);
			break;
		default:
			break;
	}
}

/**
 * CalcMuzzlePoint
 *
 * Set muzzle location relative to pivoting eye.
 */
function CalcMuzzlePoint(ent, forward, muzzlePoint) {
	vec3.set(ent.s.pos.trBase, muzzlePoint);
	muzzlePoint[2] += ent.client.ps.viewheight;
	vec3.add(muzzlePoint, vec3.scale(forward, 14, vec3.create()));
	// Snap to integer coordinates for more efficient network bandwidth usage.
	// SnapVector(muzzlePoint);
}

/**
 * QuadFactor
 */
function QuadFactor(ent) {
	var client = ent.client;

	if (client.ps.powerups[PW.QUAD]) {
		return g_quadfactor.get();
	}

	return 1;
}

/**********************************************************
 *
 * Gauntlet
 *
 **********************************************************/

/**
 * GauntletAttack
 */
function CheckGauntletAttack(ent) {
	if (ent.client.noclip) {
		return false;
	}

	var trace = new QS.TraceResults();

	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();
	var end = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);
	vec3.add(vec3.scale(forward, 32, end), muzzle);

	// See if we impact with an entity.
	Trace(trace, muzzle, end, null, null, ent.s.number, MASK.SHOT);

	if (trace.surfaceFlags & SURF.FLAGS.NOIMPACT) {
		return false;
	}

	var traceEnt = level.gentities[trace.entityNum];

	// Send blood impact.
	if (traceEnt.takeDamage && traceEnt.client) {
		var tent = TempEntity(trace.endPos, EV.MISSILE_HIT);
		tent.s.otherEntityNum = traceEnt.s.number;
		tent.s.eventParm = QMath.DirToByte(trace.plane.normal);
		tent.s.weapon = ent.s.weapon;
	}

	if (!traceEnt.takeDamage) {
		return false;
	}

	if (ent.client.ps.powerups[PW.QUAD]) {
		AddEvent(ent, EV.POWERUP_QUAD, 0);
	}

	var damage = 50 * QuadFactor(ent);

	Damage(traceEnt, ent, ent, forward, trace.endPos, damage, 0, MOD.GAUNTLET);

	return true;
}

/**********************************************************
 *
 * Machinegun
 *
 **********************************************************/

/**
 * BulletFire
 */
function BulletFire(ent, spread, damage, mod) {
	var trace = new QS.TraceResults();

	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();
	var right = vec3.create();
	var up = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, right, up);
	CalcMuzzlePoint(ent, forward, muzzle);

	damage *= QuadFactor(ent);

	var r = Math.random() * Math.PI * 2;
	var u = Math.sin(r) * QMath.crandom() * spread * 16;
	r = Math.cos(r) * QMath.crandom() * spread * 16;

	var end = vec3.add(muzzle, vec3.scale(forward, 8192*16, vec3.create()), vec3.create());
	vec3.add(end, vec3.scale(right, r, vec3.create()));
	vec3.add(end, vec3.scale(up, u, vec3.create()));

	var passent = ent.s.number;

	for (var i = 0; i < 10; i++) {
		Trace(trace, muzzle, end, null, null, passent, MASK.SHOT);

		if (trace.surfaceFlags & SURF.FLAGS.NOIMPACT) {
			return;
		}

		var traceEnt = level.gentities[trace.entityNum];

		// Snap the endpos to integers, but nudged towards the line.
		// SnapVectorTowards(trace.endPos, muzzle);

		// Send bullet impact.
		var tent;
		if (traceEnt.takeDamage && traceEnt.client) {
			tent = TempEntity(trace.endPos, EV.BULLET_HIT_FLESH);
			tent.s.eventParm = traceEnt.s.number;
			if (LogAccuracyHit(traceEnt, ent)) {
				ent.client.accuracy_hits++;
			}
		} else {
			tent = TempEntity(trace.endPos, EV.BULLET_HIT_WALL);
			tent.s.eventParm = QMath.DirToByte(trace.plane.normal);
		}
		tent.s.otherEntityNum = ent.s.number;

		if (traceEnt.takeDamage) {
			Damage(traceEnt, ent, ent, forward, trace.endPos, damage, 0, mod);
		}

		break;
	}
}

/**********************************************************
 *
 * Shotgun
 *
 **********************************************************/

// DEFAULT_SHOTGUN_SPREAD and DEFAULT_SHOTGUN_COUNT	are in bg_public.h, because
// client predicts same spreads
var DEFAULT_SHOTGUN_DAMAGE = 10;

/**
 * ShotgunFire
 */
function ShotgunFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	// Send shotgun blast.
	var tent = TempEntity(muzzle, EV.SHOTGUN);
	vec3.scale(forward, 4096, tent.s.origin2);
// 	SV.SnapVector(tent.s.origin2);
	tent.s.eventParm = QMath.irrandom(0, 255);  // seed for spread pattern
	tent.s.otherEntityNum = ent.s.number;

	ShotgunPattern(tent.s.pos.trBase, tent.s.origin2, tent.s.eventParm, ent);
}

/**
 * ShotgunPattern
 *
 * This should match CG_ShotgunPattern.
 */
function ShotgunPattern(origin, origin2, seed, ent) {
	var r, u;
	var end     = vec3.create();
	var forward = vec3.create(),
		right   = vec3.create(),
		up      = vec3.create();
	var hitClient = false;

	// Derive the right and up vectors from the forward vector, because
	// the client won't have any other information.
	vec3.normalize(origin2, forward);
	QMath.PerpendicularVector(forward, right);
	vec3.cross(forward, right, up);

	// Generate the "random" spread pattern.
	for (var i = 0; i < DEFAULT_SHOTGUN_COUNT; i++) {
		r = QMath.crandom() * DEFAULT_SHOTGUN_SPREAD * 16;
		u = QMath.crandom() * DEFAULT_SHOTGUN_SPREAD * 16;
		vec3.add(origin, vec3.scale(forward, 8192 * 16, vec3.create()), end);
		vec3.add(end, vec3.scale(right, r, vec3.create()));
		vec3.add(end, vec3.scale(up, u, vec3.create()));

		if (ShotgunPellet(origin, end, ent) && !hitClient) {
			hitClient = true;
			ent.client.accuracy_hits += 1;
		}
	}
}

/**
 * ShotgunPellet
 */
function ShotgunPellet(start, end, ent) {
	var trace = new QS.TraceResults();

	var forward = vec3.subtract(end, start, vec3.create());
	vec3.normalize(forward);

	for (var i = 0; i < 10; i++) {
		Trace(trace, start, end, null, null, ent.s.number, MASK.SHOT);

		var traceEnt = level.gentities[trace.entityNum];

		// Send bullet impact.
		if (trace.surfaceFlags & SURF.FLAGS.NOIMPACT) {
			return false;
		}

		if (traceEnt.takeDamage) {
			var damage = DEFAULT_SHOTGUN_DAMAGE * QuadFactor(ent);
			Damage(traceEnt, ent, ent, forward, trace.endPos, damage, 0, MOD.SHOTGUN);

			if (LogAccuracyHit(traceEnt, ent)) {
				return true;
			}
		}

		return false;
	}
	return false;
}

/**********************************************************
 *
 * Grenade Launcher
 *
 **********************************************************/

/**
 * GrenadeLauncherFire
 */
function GrenadeLauncherFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	// Extra vertical velocity.
	forward[2] += 0.2;
	vec3.normalize(forward);

	var m = FireGrenade(ent, muzzle, forward);
	m.damage *= QuadFactor(ent);
	m.splashDamage *= QuadFactor(ent);
}

/**********************************************************
 *
 * Rocket
 *
 **********************************************************/

/**
 * RocketLauncherFire
 */
function RocketLauncherFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	var m = FireRocket(ent, muzzle, forward);
	m.damage *= QuadFactor(ent);
	m.splashDamage *= QuadFactor(ent);
}

/**********************************************************
 *
 * Lightning Gun
 *
 **********************************************************/

function LightningFire(ent) {
	var trace = new QS.TraceResults();

	var damage = 8 * QuadFactor(ent);
	var end = vec3.create();

	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	for (var i = 0; i < 10; i++) {
		vec3.add(muzzle, vec3.scale(forward, LIGHTNING_RANGE, vec3.create()), end);

		Trace(trace, muzzle, end, null, null, ent.s.number, MASK.SHOT);
		if (trace.entityNum === ENTITYNUM_NONE) {
			return;
		}

		var traceEnt = level.gentities[trace.entityNum];
		if (traceEnt.takeDamage) {
			Damage(traceEnt, ent, ent, forward, trace.endPos, damage, 0, MOD.LIGHTNING);
		}

		var tent;
		if (traceEnt.takeDamage && traceEnt.client) {
			tent = TempEntity(trace.endPos, EV.MISSILE_HIT);
			tent.s.otherEntityNum = traceEnt.s.number;
			tent.s.eventParm = QMath.DirToByte(trace.plane.normal);
			tent.s.weapon = ent.s.weapon;
			if (LogAccuracyHit(traceEnt, ent)) {
				ent.client.accuracy_hits++;
			}
		} else if (!(trace.surfaceFlags & SURF.FLAGS.NOIMPACT)) {
			tent = TempEntity(trace.endPos, EV.MISSILE_MISS);
			tent.s.eventParm = QMath.DirToByte(trace.plane.normal);
			tent.s.weapon = ent.s.weapon;
		}

		break;
	}
}

/**********************************************************
 *
 * Plasma Gun
 *
 **********************************************************/

/**
 * PlasmagunFire
 */
function PlasmagunFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	var m = FirePlasma(ent, muzzle, forward);
	m.damage *= QuadFactor(ent);
	m.splashDamage *= QuadFactor(ent);
}

/**********************************************************
 *
 * Railgun
 *
 **********************************************************/

/**
 * RailgunFire
 */
var MAX_RAIL_HITS = 4;
function RailgunFire(ent) {
	var damage = 100 * QuadFactor(ent);
	var passent = ent.s.number;
	var unlinkedEntities = [];
	var end = vec3.create();
	var hits = 0;
	var trace = new QS.TraceResults();

	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();
	var right = vec3.create();
	var up = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, right, up);
	CalcMuzzlePoint(ent, forward, muzzle);

	vec3.add(muzzle, vec3.scale(forward, 8192, vec3.create()), end);

	while (unlinkedEntities.length < MAX_RAIL_HITS) {
		// Trace only against the solids, so the railgun will go through people.
		Trace(trace, muzzle, end, null, null, passent, MASK.SHOT);
		if (trace.entityNum >= ENTITYNUM_MAX_NORMAL) {
			break;
		}

		var traceEnt = level.gentities[trace.entityNum];
		if (traceEnt.takeDamage) {
			if (LogAccuracyHit(traceEnt, ent)) {
				hits++;
			}
			Damage(traceEnt, ent, ent, forward, trace.endPos, damage, 0, MOD.RAILGUN);
		}

		if (trace.contents & SURF.CONTENTS.SOLID) {
			break;  // we hit something solid enough to stop the beam
		}

		// Unlink this entity, so the next trace will go past it.
		SV.UnlinkEntity(traceEnt);
		unlinkedEntities.push(traceEnt);
	}

	// Link back in any entities we unlinked.
	for (var i = 0; i < unlinkedEntities.length; i++) {
		SV.LinkEntity(unlinkedEntities[i]);
	}

	// The final trace endpos will be the terminal point of the rail trail.

	// Snap the endpos to integers to save net bandwidth, but nudged towards the line.
	// SnapVectorTowards( trace.endpos, muzzle );

	// Send railgun beam effect.
	var tent = TempEntity(trace.endPos, EV.RAILTRAIL);

	// Set player number for custom colors on the railtrail.
	tent.s.clientNum = ent.s.clientNum;
	vec3.set(muzzle, tent.s.origin2);

	// Move origin a bit to come closer to the drawn gun muzzle.
	vec3.add(tent.s.origin2, vec3.scale(right, 4, vec3.create()));
	vec3.add(tent.s.origin2, vec3.scale(up, -1, vec3.create()));

	// No explosion at end if SURF.FLAGS.NOIMPACT, but still make the trail
	if (trace.surfaceFlags & SURF.FLAGS.NOIMPACT) {
		tent.s.eventParm = 255; // Don't make the explosion at the end.
	} else {
		tent.s.eventParm = QMath.DirToByte(trace.plane.normal);
	}
	tent.s.clientNum = ent.s.clientNum;

	// Give the shooter a reward sound if they have made two railgun hits in a row.
	if (hits === 0) {
		// Complete miss.
		ent.client.accurate_count = 0;
	} else {
		// Check for "impressive" reward sound.
		ent.client.accurate_count += hits;
		if (ent.client.accurate_count >= 2) {
			ent.client.accurate_count -= 2;
			ent.client.ps.persistant[PERS.IMPRESSIVE_COUNT]++;
			// Add the sprite over the player's head.
			ent.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
			ent.client.ps.eFlags |= EF.AWARD_IMPRESSIVE;
			ent.client.rewardTime = level.time + REWARD_SPRITE_TIME;
		}
		ent.client.accuracy_hits++;
	}
}

/**********************************************************
 *
 * BFG
 *
 **********************************************************/

/**
 * BFGFire
 */
function BFGFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	var m = FireBFG(ent, muzzle, forward);
	m.damage *= QuadFactor(ent);
	m.splashDamage *= QuadFactor(ent);
}

		/**
 * QUAKED func_bobbing (0 .5 .8) ? X_AXIS Y_AXIS
 * Normally bobs on the Z axis
 * "model2"	.md3 model to also draw
 * "height"	amplitude of bob (32 default)
 * "speed"		seconds to complete a bob cycle (4 default)
 * "phase"		the 0.0 to 1.0 offset in the cycle to start at
 * "dmg"		damage to inflict when blocked (2 default)
 * "color"		constantLight color
 * "light"		constantLight radius
 */
spawnFuncs['func_bobbing'] = function (self) {
	var height = SpawnFloat('height', 32);
	var phase = SpawnFloat('phase', 0);

	self.speed = SpawnFloat('speed', 4);
	self.damage = SpawnInt('dmg', 2);

	SV.SetBrushModel(self, self.model);
	InitMover(self);

	vec3.set(self.s.origin, self.s.pos.trBase);
	vec3.set(self.s.origin, self.r.currentOrigin);

	self.s.pos.trDuration = self.speed * 1000;
	self.s.pos.trTime = self.s.pos.trDuration * phase;
	self.s.pos.trType = TR.SINE;

	// Set the axis of bobbing.
	if (self.spawnflags & 1) {
		self.s.pos.trDelta[0] = height;
	} else if (self.spawnflags & 2) {
		self.s.pos.trDelta[1] = height;
	} else {
		self.s.pos.trDelta[2] = height;
	}
};
		/**
 * QUAKED func_button (0 .5 .8) ?
 * When a button is touched, it moves some distance in the direction of its angle, triggers all of its targets, waits some time, then returns to its original position where it can be triggered again.
 *
 * "model2"  .md3 model to also draw
 * "angle"   determines the opening direction
 * "target"  all entities with a matching targetname will be used
 * "speed"   override the default 40 speed
 * "wait"    override the default 1 second wait (-1 = never return)
 * "lip"     override the default 4 pixel lip remaining at end of move
 * "health"  if set, the button must be killed instead of touched
 * "color"   constantLight color
 * "light"   constantLight radius
 */
spawnFuncs['func_button'] = function (self) {
	self.sound1to2 = SoundIndex('sound/movers/switches/butn2');

	if (!self.speed) {
		self.speed = 40;
	}

	if (!self.wait) {
		self.wait = 1;
	}
	self.wait *= 1000;

	// First position
	vec3.set(self.s.origin, self.pos1);

	// Calculate second position.
	SV.SetBrushModel(self, self.model);

	var lip = SpawnFloat('lip', 4);

	SetMovedir(self.s.angles, self.movedir);

	var abs_movedir = vec3.createFrom(
		Math.abs(self.movedir[0]),
		Math.abs(self.movedir[1]),
		Math.abs(self.movedir[2])
	);
	var size = vec3.subtract(self.r.maxs, self.r.mins, vec3.create());
	var distance = abs_movedir[0] * size[0] + abs_movedir[1] * size[1] + abs_movedir[2] * size[2] - lip;
	vec3.add(self.pos1, vec3.scale(self.movedir, distance, vec3.create()), self.pos2);

	if (self.health) {
		// Shootable button.
		self.takeDamage = true;
	} else {
		// Touchable button
		self.touch = ButtonTouch;
	}

	InitMover(self);
};

/**
 * ButtonTouch
 */
function ButtonTouch(ent, other, trace) {
	if (!other.client) {
		return;
	}

	if (ent.moverState === MOVER.POS1) {
		UseBinaryMover(ent, other, other);
	}
}
		/*
 * QUAKED func_door (0 .5 .8) ? START_OPEN x CRUSHER
 * TOGGLE        wait in both the start and end states for a trigger event.
 * START_OPEN    the door to moves to its destination when spawned, and operate in reverse.  It is used to temporarily or permanently close off an area when triggered (not useful for touch or takeDamage doors).
 * NOMONSTER     monsters will not trigger this door
 *
 * "model2"      .md3 model to also draw
 * "angle"       determines the opening direction
 * "targetname"  if set, no touch field will be spawned and a remote button or trigger field activates the door.
 * "speed"       movement speed (100 default)
 * "wait"        wait before returning (3 default, -1 = never return)
 * "lip"         lip remaining at end of move (8 default)
 * "dmg"         damage to inflict when blocked (2 default)
 * "color"       constantLight color
 * "light"       constantLight radius
 * "health"      if set, the door must be shot open
 */
spawnFuncs['func_door'] = function (self) {
	self.sound1to2 = self.sound2to1 = SoundIndex('sound/movers/doors/dr1_strt');
	self.soundPos1 = self.soundPos2 = SoundIndex('sound/movers/doors/dr1_end');

	self.blocked = DoorBlocked;

	// Default speed of 400.
	if (!self.speed) {
		self.speed = 400;
	}

	// Default wait of 2 seconds.
	if (!self.wait) {
		self.wait = 2;
	}
	self.wait *= 1000;

	// Default lip of 8 units.
	var lip = SpawnFloat('lip', 8);

	// Default damage of 2 points.
	self.damage = SpawnInt('dmg', 2);

	// First position at start.
	vec3.set(self.s.origin, self.pos1);

	// Calculate second position.
	SV.SetBrushModel(self, self.model);
	SetMovedir(self.s.angles, self.movedir);

	var absMovedir = vec3.createFrom(
		Math.abs(self.movedir[0]),
		Math.abs(self.movedir[1]),
		Math.abs(self.movedir[2])
	);
	var size = vec3.subtract(self.r.maxs, self.r.mins, vec3.create());
	var distance = vec3.dot(absMovedir, size) - lip;
	vec3.add(self.pos1, vec3.scale(self.movedir, distance, vec3.create()), self.pos2);

	// If "start_open", reverse position 1 and 2.
	if (self.spawnflags & 1) {
		var temp = vec3.create(self.pos2);
		vec3.set(self.s.origin, self.pos2);
		vec3.set(temp, self.pos1);
	}

	InitMover(self);

	self.nextthink = level.time + FRAMETIME;

	if (!(self.flags & GFL.TEAMSLAVE)) {
		var health = SpawnInt('health', 0);

		if (health) {
			self.takeDamage = true;
		}

		if (self.targetName || health) {
			// Non touch/shoot doors.
			self.think = DoorMatchTeam;
		} else {
			self.think = DoorSpawnNewTrigger;
		}
	}
};

/**
 * DoorBlocked
 */
function DoorBlocked(ent, other) {
	// Remove anything other than a client.
	if (!other.client) {
		// // Except CTF flags!!!!
		// if (other.s.eType === ET.ITEM && other.item.giType === IT.TEAM ) {
		// 	Team_DroppedFlagThink( other );
		// 	return;
		// }
		TempEntity(other.s.origin, EV.ITEM_POP);
		FreeEntity(other);
		return;
	}

	if (ent.damage) {
		Damage(other, ent, ent, null, null, ent.damage, 0, MOD.CRUSH);
	}

	if (ent.spawnflags & 4) {
		return;  // crushers don't reverse
	}

	// Reverse direction.
	UseBinaryMover(ent, ent, other);
}

/**
 * DoorSpawnNewTrigger
 *
 * All of the parts of a door have been spawned, so create
 * a trigger that encloses all of them.
 */
function DoorSpawnNewTrigger(ent) {
	// Set all of the slaves as shootable.
	for (var other = ent; other; other = other.teamchain) {
		other.takeDamage = true;
	}

	// Find the bounds of everything on the team.
	var mins = vec3.create(ent.r.absmin);
	var maxs = vec3.create(ent.r.absmax);

	for (var other = ent.teamchain; other; other = other.teamchain) {
		QMath.AddPointToBounds(other.r.absmin, mins, maxs);
		QMath.AddPointToBounds(other.r.absmax, mins, maxs);
	}

	// Find the thinnest axis, which will be the one we expand.
	var best = 0;
	for (var i = 1; i < 3; i++) {
		if (maxs[i] - mins[i] < maxs[best] - mins[best]) {
			best = i;
		}
	}
	maxs[best] += 120;
	mins[best] -= 120;

	// Create a trigger with this size.
	var other = SpawnEntity();
	other.classname = 'door_trigger';
	vec3.set(mins, other.r.mins);
	vec3.set(maxs, other.r.maxs);
	other.parent = ent;
	other.r.contents = SURF.CONTENTS.TRIGGER;
	other.touch = DoorTriggerTouch;
	// Remember the thinnest axis.
	other.count = best;
	SV.LinkEntity(other);

	MatchTeam(ent, ent.moverState, level.time);
}

/**
 * DoorMatchTeam
 */
function DoorMatchTeam(ent) {
	MatchTeam(ent, ent.moverState, level.time);
}

/**
 * DoorTriggerTouch
 */
function DoorTriggerTouch(ent, other, trace) {
	if (other.client && other.client.ps.pm_type === PM.SPECTATOR) {
		// If the door is not open and not opening.
		if (ent.parent.moverState !== MOVER.ONETOTWO &&
			ent.parent.moverState !== MOVER.POS2) {
			DoorTriggerTouchSpectator(ent, other, trace);
		}
	} else if (ent.parent.moverState !== MOVER.ONETOTWO) {
		UseBinaryMover(ent.parent, ent, other);
	}
}

/**
 * DoorTriggerTouchSpectator
 */
function DoorTriggerTouchSpectator(ent, other, trace) {
	var axis = ent.count;
	// The constants below relate to constants in DoorSpawnNewTrigger().
	var doorMin = ent.r.absmin[axis] + 100;
	var doorMax = ent.r.absmax[axis] - 100;

	var origin = vec3.create(other.client.ps.origin);

	if (origin[axis] < doorMin || origin[axis] > doorMax) {
		return;
	}

	if (Math.abs(origin[axis] - doorMax) < Math.abs(origin[axis] - doorMin)) {
		origin[axis] = doorMin - 10;
	} else {
		origin[axis] = doorMax + 10;
	}

	TeleportPlayer(other, origin, vec3.createFrom(10000000, 0, 0));
}
		/**
 * QUAKED func_plat (0 .5 .8) ?
 * Plats are always drawn in the extended position so they will light correctly.
 *
 * "lip"    default 8, protrusion above rest position
 * "height" total height of movement, defaults to model height
 * "speed"  overrides default 200.
 * "dmg"    overrides default 2
 * "model2" .md3 model to also draw
 * "color"  constantLight color
 * "light"  constantLight radius
 */
spawnFuncs['func_plat'] = function (ent) {
	ent.sound1to2 = ent.sound2to1 = SoundIndex('sound/movers/plats/pt1_strt');
	ent.soundPos1 = ent.soundPos2 = SoundIndex('sound/movers/plats/pt1_end');

	ent.s.angles[0] = ent.s.angles[1] = ent.s.angles[2] = 0.0;
	ent.speed = SpawnFloat('speed', 200);
	ent.damage = SpawnFloat('dmg', 2);
	ent.wait = SpawnFloat('wait', 1);

	var phase = SpawnFloat('phase', 0);

	ent.wait = 1000;

	// Create second position.
	SV.SetBrushModel(ent, ent.model);

	var lip = SpawnFloat('lip', 8);
	var height = SpawnFloat('height', 0);

	if (!height) {
		height = (ent.r.maxs[2] - ent.r.mins[2]) - lip;
	}

	// pos1 is the rest (bottom) position, pos2 is the top
	vec3.set(ent.s.origin, ent.pos2);
	vec3.set(ent.pos2, ent.pos1);
	ent.pos1[2] -= height;

	InitMover(ent);

	// Touch function keeps the plat from returning while
	// a live player is standing on it.
	ent.touch = TouchPlat;
	ent.blocked = DoorBlocked;

	ent.parent = ent;  // so it can be treated as a door

	// Spawn the trigger if one hasn't been custom made.
	if (!ent.targetName) {
		SpawnPlatTrigger(ent);
	}
};

/**
 * SpawnPlatTrigger
 *
 * Spawn a trigger in the middle of the plat's low position
 * Elevator cars require that the trigger extend through the entire low position,
 * not just sit on top of it.
 */
function SpawnPlatTrigger(ent) {
	// The middle trigger will be a thin trigger just
	// above the starting position.
	var trigger = SpawnEntity();
	trigger.classname = 'plat_trigger';
	trigger.touch = TouchPlatCenterTrigger;
	trigger.r.contents = SURF.CONTENTS.TRIGGER;
	trigger.parent = ent;

	var tmin = vec3.createFrom(
		ent.pos1[0] + ent.r.mins[0] + 33,
		ent.pos1[1] + ent.r.mins[1] + 33,
		ent.pos1[2] + ent.r.mins[2]
	);

	var tmax = vec3.createFrom(
		ent.pos1[0] + ent.r.maxs[0] - 33,
		ent.pos1[1] + ent.r.maxs[1] - 33,
		ent.pos1[2] + ent.r.maxs[2] + 8
	);

	if (tmax[0] <= tmin[0]) {
		tmin[0] = ent.pos1[0] + (ent.r.mins[0] + ent.r.maxs[0]) *0.5;
		tmax[0] = tmin[0] + 1;
	}
	if (tmax[1] <= tmin[1]) {
		tmin[1] = ent.pos1[1] + (ent.r.mins[1] + ent.r.maxs[1]) *0.5;
		tmax[1] = tmin[1] + 1;
	}

	vec3.set(tmin, trigger.r.mins);
	vec3.set(tmax, trigger.r.maxs);

	SV.LinkEntity(trigger);
}

/**
 * TouchPlat
 *
 * Don't allow decent if a living player is on it.
 */
function TouchPlat(ent, other) {
	if (!other.client || other.client.ps.pm_type === PM.DEAD) {
		return;
	}

	// Delay return-to-pos1 by one second.
	if (ent.moverState === MOVER.POS2) {
		ent.nextthink = level.time + 1000;
	}
}

/**
 * TouchPlatCenterTrigger
 *
 * If the plat is at the bottom position, start it going up.
 */
function TouchPlatCenterTrigger(ent, other) {
	if (!other.client) {
		return;
	}

	if (ent.parent.moverState === MOVER.POS1) {
		UseBinaryMover(ent.parent, ent, other);
	}
}
		spawnFuncs['func_static'] = function (self) {
	SV.SetBrushModel(self, self.model);
	InitMover(self);
	vec3.set(self.s.origin, self.s.pos.trBase);
	vec3.set(self.s.origin, self.r.currentOrigin);
};
		/*
 * QUAKED func_train (0 .5 .8) ? START_ON TOGGLE BLOCK_STOPS
 * A train is a mover that moves between path_corner target points.
 * Trains MUST HAVE AN ORIGIN BRUSH.
 * The train spawns at the first target it is pointing at.
 * "model2"  .md3 model to also draw
 * "speed"   default 100
 * "dmg"     default 2
 * "noise"   looping sound to play when the train is in motion
 * "target"  next path corner
 * "color"   constantLight color
 * "light"   constantLight radius
 */

var TRAIN_START_ON    = 1;
var TRAIN_TOGGLE      = 2;
var TRAIN_BLOCK_STOPS = 4;

spawnFuncs['func_train'] = function (self) {
	console.log('SPAWANING func_train');
	self.s.angles[0] = self.s.angles[1] = self.s.angles[2] = 0;

	if (self.spawnflags & TRAIN_BLOCK_STOPS) {
		self.damage = 0;
	} else if (!self.damage) {
		self.damage = 2;
	}

	if (!self.speed) {
		self.speed = 100;
	}

	if (!self.target) {
		log('func_train without a target at', self.r.absmin);
		FreeEntity(self);
		return;
	}

	SV.SetBrushModel(self, self.model);
	InitMover(self);

	self.reached = TrainReached;

	// Start trains on the second frame, to make sure their targets have had
	// a chance to spawn.
	self.nextthink = level.time + FRAMETIME;
	self.think = TrainSetupTargets;
};

/**
 * TrainSetupTargets
 *
 * Link all the corners together.
 */
function TrainSetupTargets(ent) {
	var entities = FindEntity({ targetName: ent.target });
	if (!entities.length) {
		log('func_train at', ent.r.absmin, 'with an unfound target');
		return;
	}
	ent.nextTrain = entities[0];

	var start;
	for (var path = ent.nextTrain; path !== start; path = next) {
		if (!start) {
			start = path;
		}

		if (!path.target) {
			log('Train corner at', path.s.origin, 'without a target');
			return;
		}

		// Find a path_corner among the targets.
		// There may also be other targets that get fired when the corner
		// is reached.
		entities = FindEntity({ targetName: path.target });
		var next;

		for (var i = 0; i < entities.length; i++) {
			next = entities[i++];
			if (next.classname === 'path_corner') {
				break;
			}
		}

		path.nextTrain = next;
	}

	// Start the train moving from the first corner.
	TrainReached(ent);
}

/**
 * TrainReached
 */
function TrainReached(ent) {
	// Copy the apropriate values.
	var next = ent.nextTrain;
	if (!next || !next.nextTrain) {
		return;  // just stop
	}

	// Fire all other targets.
	UseTargets(next, null);

	// Set the new trajectory.
	ent.nextTrain = next.nextTrain;
	vec3.set(next.s.origin, ent.pos1);
	vec3.set(next.nextTrain.s.origin, ent.pos2);

	// If the path_corner has a speed, use that
	var speed = next.speed ? next.speed : ent.speed;
	if (speed < 1) {
		speed = 1;
	}

	// Calculate duration.
	var move = vec3.subtract(ent.pos2, ent.pos1, vec3.create());
	var length = vec3.length(move);

	ent.s.pos.trDuration = length * 1000 / speed;

	// Tequila comment: Be sure to send to clients after any fast move case.
	ent.r.svFlags &= ~SVF.NOCLIENT;

	// Tequila comment: Fast move case
	if (ent.s.pos.trDuration < 1) {
		// Tequila comment: As trDuration is used later in a division, we need to avoid that case now.
		// With null trDuration,
		// the calculated rocks bounding box becomes infinite and the engine think for a short time
		// any entity is riding that mover but not the world entity... In rare case, I found it
		// can also stuck every map entities after func_door are used.
		// The desired effect with very very big speed is to have instant move, so any not null duration
		// lower than a frame duration should be sufficient.
		// Afaik, the negative case don't have to be supported.
		ent.s.pos.trDuration = 1;

		// Tequila comment: Don't send entity to clients so it becomes really invisible
		ent.r.svFlags |= SVF.NOCLIENT;
	}

	// Looping sound.
	ent.s.loopSound = next.soundLoop;

	// Start it going
	SetMoverState(ent, MOVER.ONETOTWO, level.time);

	// If there is a "wait" value on the target, don't start moving yet.
	if (next.wait) {
		ent.nextthink = level.time + next.wait * 1000;
		ent.think = TrainBeginMoving;
		ent.s.pos.trType = TR.STATIONARY;
	}
}

/**
 * TrainBeginMoving
 *
 * The wait time at a corner has completed, so start moving again.
*/
function TrainBeginMoving(ent) {
	ent.s.pos.trTime = level.time;
	ent.s.pos.trType = TR.LINEAR_STOP;
}
		spawnFuncs['info_notnull'] = function (self) {
	SetOrigin(self, self.s.origin);
};
		spawnFuncs['info_null'] = function (self) {
	FreeEntity(self);
};
		spawnFuncs['info_player_deathmatch'] = function (self) {
};
		spawnFuncs['info_player_intermission'] = function (self) {
};
		spawnFuncs['info_player_start'] = function (self) {
	self.classname = 'info_player_deathmatch';
};
		/**
 * QUAKED light (0 1 0) (-8 -8 -8) (8 8 8) linear
 * Non-displayed light.
 * "light"  overrides the default 300 intensity.
 * Linear   checkbox gives linear falloff instead of inverse square
 * Lights   pointed at a target will be spotlights.
 * "radius" overrides the default 64 unit radius of a spotlight at the target point.
 */
spawnFuncs['light'] = function (self) {
	FreeEntity(self);
};

		/**
 * QUAKED misc_model (1 0 0) (-16 -16 -16) (16 16 16)
 * "model"  arbitrary .md3 file to display
 */
spawnFuncs['misc_model'] = function (ent) {
	FreeEntity(ent);
};

		/*
 * QUAKED misc_portal_camera (0 0 1) (-8 -8 -8) (8 8 8) slowrotate fastrotate noswing
 * The target for a misc_portal_director.  You can set either angles or target another entity to determine the direction of view.
 * "roll" an angle modifier to orient the camera around the target vector;
 */
spawnFuncs['misc_portal_camera'] = function (self) {
	self.r.mins[0] = self.r.mins[1] = self.r.mins[2] = 0;
	self.r.maxs[0] = self.r.maxs[1] = self.r.maxs[2] = 0;
	SV.LinkEntity(self);

	var roll = SpawnFloat('roll', 0);
	self.s.clientNum = roll / 360.0 * 256;
};
		/*
 * QUAKED misc_portal_surface (0 0 1) (-8 -8 -8) (8 8 8)
 *
 * The portal surface nearest this entity will show a view from the targeted misc_portal_camera, or a mirror view if untargeted.
 * This must be within 64 world units of the surface!
 */
spawnFuncs['misc_portal_surface'] = function (self) {
	self.r.mins[0] = self.r.mins[1] = self.r.mins[2] = 0;
	self.r.maxs[0] = self.r.maxs[1] = self.r.maxs[2] = 0;
	SV.LinkEntity(self);

	self.r.svFlags = SVF.PORTAL;
	self.s.eType = ET.PORTAL;

	if (!self.target) {
		vec3.set(self.s.origin, self.s.origin2);
	} else {
		self.think = PortalLocateCamera;
		self.nextthink = level.time + 100;
	}
};

function PortalLocateCamera(ent) {
	var owner = PickTarget(ent.target);
	if (!owner) {
		log('Couldn\'t find target for misc_partal_surface');
		FreeEntity(ent);
		return;
	}
	ent.r.ownerNum = owner.s.number;

	// Frame holds the rotate speed.
	if (owner.spawnflags & 1) {
		ent.s.frame = 25;
	} else if (owner.spawnflags & 2) {
		ent.s.frame = 75;
	}

	// Swing camera.
	if (owner.spawnflags & 4) {
		// set to 0 for no rotation at all
		ent.s.powerups = 0;
	} else {
		ent.s.powerups = 1;
	}

	// clientNum holds the rotate offset.
	ent.s.clientNum = owner.s.clientNum;

	vec3.set(owner.s.origin, ent.s.origin2);

	// See if the portal_camera has a target.
	var dir = vec3.create();

	var target = PickTarget(owner.target);
	if (target) {
		vec3.subtract(target.s.origin, owner.s.origin, dir);
		vec3.normalize(dir);
	} else {
		SetMovedir(owner.s.angles, dir);
	}

	ent.s.eventParm = QMath.DirToByte(dir);
}
		spawnFuncs['misc_teleporter_dest'] = function (self) {
	SetOrigin(self, self.s.origin);
};
		/**
 * QUAKED path_corner (.5 .3 0) (-8 -8 -8) (8 8 8)
 * Train path corners.
 * Target: next path corner and other targets to fire
 * "speed" speed to move to the next corner
 * "wait" seconds to wait before behining move to next corner
 */
spawnFuncs['path_corner'] = function (self) {
	if (!self.targetName) {
		log('path_corner with no targetname at', self.s.origin);
		FreeEntity(self);
		return;
	}
	// path corners don't need to be linked in
};

		/**
 * QUAKED target_location (0 0.5 0) (-8 -8 -8) (8 8 8)
 * Set "message" to the name of this location.
 * Set "count" to 0-7 for color.
 * 0:white 1:red 2:green 3:yellow 4:blue 5:cyan 6:magenta 7:white
 *
 * Closest target_location in sight used for the location, if none
 * in site, closest in distance.
 */
spawnFuncs['target_location'] = function (self) {
	FreeEntity(self);

	// self.think = TargetLocationLinkup;
	// self.nextthink = level.time + 200;  // Let them all spawn first

	// SetOrigin(self, self.s.origin);
};

/**
 * TargetLocationLinkup
 */
function TargetLocationLinkup(ent) {
	// if (level.locationLinked) {
	// 	return;
	// }

	// level.locationLinked = true;
	// level.locationHead = null;

	// // SV.SetConfigstring('locations', 'unknown');

	// for (i = 0, ent = g_entities, n = 1;
	// 		i < level.num_entities;
	// 		i++, ent++) {
	// 	if (ent.classname && ent.classname === 'target_location')) {
	// 		// Lets overload some variables!.
	// 		ent.health = n; // use for location marking
	// 		SV.SetConfigstring('locations:' + n, ent.message);
	// 		n++;
	// 		ent.nextTrain = level.locationHead;
	// 		level.locationHead = ent;
	// 	}
	// }

	// All linked together now
}
		spawnFuncs['target_position'] = function (self) {
	SetOrigin(self, self.s.origin);
};
		spawnFuncs['target_push'] = function (self) {
	if (!self.speed) {
		self.speed = 1000;
	}

	SetMovedir(self.s.angles, self.s.origin2);
	vec3.scale(self.s.origin2, self.speed);

	if (self.spawnflags & 1) {
		self.noise_index = SoundIndex('sound/world/jumppad');
	} else {
		self.noise_index = SoundIndex('sound/misc/windfly');
	}

	if (self.target) {
		vec3.set(self.s.origin, self.r.absmin);
		vec3.set(self.s.origin, self.r.absmax );
		self.think = AimAtTarget;
		self.nextthink = level.time + FRAMETIME;
	}

	self.use = PushUse;
};


function PushUse(self, other, activator) {
	if (!activator.client) {
		return;
	}

	if (activator.client.ps.pm_type !== PM.NORMAL) {
		return;
	}

	if (activator.client.ps.powerups[PW.FLIGHT]) {
		return;
	}

	vec3.set(self.s.origin2, activator.client.ps.velocity);

	// Play fly sound every 1.5 seconds.
	if (activator.flyDebounceTime < level.time) {
		activator.flyDebounceTime = level.time + 1500;
		AddSound(activator, /*CHAN_AUTO,*/ self.noise_index);
	}
}
		/**
 * QUAKED target_teleporter (1 0 0) (-8 -8 -8) (8 8 8)
 * The activator will be teleported away.
 */
spawnFuncs['target_teleporter'] = function (self) {
	if (!self.targetName) {
		log('Untargeted', self.classname, 'at', self.s.origin);
	}

	self.use = TeleporterUse;
};

/**
 * TeleporterUse
 */
function TeleporterUse(self, other, activator) {
	if (!activator.client) {
		return;
	}

	var dest = PickTarget(self.target);
	if (!dest) {
		log('Couldn\'t find teleporter destination');
		return;
	}

	TeleportPlayer(activator, dest.s.origin, dest.s.angles);
}
		spawnFuncs['team_CTF_blueplayer'] = function (self) {
};
		spawnFuncs['team_CTF_bluespawn'] = function (self) {
};
		spawnFuncs['team_CTF_redplayer'] = function (self) {
};
		spawnFuncs['team_CTF_redspawn'] = function (self) {
};
		/**
 * QUAKED trigger_hurt (.5 .5 .5) ? START_OFF - SILENT NO_PROTECTION SLOW
 * Any entity that touches this will be hurt.
 * It does dmg points of damage each server frame
 * Targeting the trigger will toggle its on / off state.
 *
 * SILENT         supresses playing the sound
 * SLOW	          changes the damage rate to once per second
 * NO_PROTECTION  *nothing* stops the damage
 *
 * "dmg"          default 5 (whole numbers only)
 */
spawnFuncs['trigger_hurt'] = function (self) {
	InitTrigger(self);

	self.touch = HurtTouch;
	self.use = HurtUse;

	self.noise_index = SoundIndex('sound/world/electro');

	if (!self.damage) {
		self.damage = 5;
	}

	// Link in to the world if starting active.
	if (self.spawnflags & 1) {
		SV.UnlinkEntity(self);
	}
	else {
		SV.LinkEntity(self);
	}
};

function HurtTouch(self, other) {
	if (!other.takeDamage) {
		return;
	}

	if (self.timestamp > level.time) {
		return;
	}

	if (self.spawnflags & 16) {
		self.timestamp = level.time + 1000;
	} else {
		self.timestamp = level.time + FRAMETIME;
	}

	// Play sound.
	if (!(self.spawnflags & 4) ) {
		AddSound(other, /*CHAN_AUTO,*/ self.noise_index);
	}

	var dflags = 0;
	if (self.spawnflags & 8) {
		dflags = DAMAGE.NO_PROTECTION;
	}

	Damage(other, self, self, null, null, self.damage, dflags, MOD.TRIGGER_HURT);
}

function HurtUse(self, other, activator) {
	if (self.r.linked ) {
		SV.UnlinkEntity(self);
	} else {
		SV.LinkEntity(self);
	}
}

		spawnFuncs['trigger_multiple'] = function (self) {
	self.wait =  SpawnFloat('wait', 0.5);
	self.random = SpawnFloat('random', 0);

	if (self.random >= self.wait && self.wait >= 0) {
		self.random = self.wait - FRAMETIME;
		log('trigger_multiple has random >= wait');
	}

	self.touch = MultiTouch;
	self.use = MultiUse;

	InitTrigger(self);
	SV.LinkEntity(self);
};

/**
 * MultiTouch
 */
function MultiTouch(self, other, trace) {
	if(!other.client) {
		return;
	}

	MultiTrigger(self, other);
}

/**
 * MultiUse
 */
function MultiUse(self, other, activator) {
	MultiTrigger(self, activator);
}

/**
 * MultiTrigger
 *
 * The trigger was just activated.
 * ent.activator should be set to the activator so it can be held through a delay
 * so wait for the delay time before firing.
 */
function MultiTrigger(ent, activator) {
	ent.activator = activator;

	if (ent.nextthink) {
		return;  // can't retrigger until the wait is over
	}

	if (activator.client) {
		if ((ent.spawnflags & 1) &&
			activator.client.sess.team !== TEAM.RED) {
			return;
		}
		if ((ent.spawnflags & 2) &&
			activator.client.sess.team !== TEAM.BLUE) {
			return;
		}
	}

	UseTargets(ent, ent.activator);

	if (ent.wait > 0) {
		ent.think = MultiWait;
		ent.nextthink = level.time + (ent.wait + ent.random * QMath.crandom()) * 1000;
	} else {
		// We can't just remove (self) here, because this is a touch function
		// called while looping through area links...
		ent.touch = 0;
		ent.nextthink = level.time + FRAMETIME;
		ent.think = FreeEntity;
	}
}

/**
 * MultiWait
 *
 * The wait time has passed, so set back up for another activation.
 */
function MultiWait(ent) {
	ent.nextthink = 0;
}
		/**
 * QUAKED trigger_push (.5 .5 .5) ?
 * Must point at a target_position, which will be the apex of the leap.
 * This will be client side predicted, unlike target_push
 */
spawnFuncs['trigger_push'] = function (self) {
	InitTrigger(self);

	// Unlike other triggers, we need to send this one to the client.
	self.r.svFlags &= ~SVF.NOCLIENT;

	// Make sure the client precaches this sound.
	SoundIndex('sound/world/jumppad');

	self.s.eType = ET.PUSH_TRIGGER;
	self.touch = PushTouch;
	self.think = AimAtTarget;
	self.nextthink = level.time + FRAMETIME;
	SV.LinkEntity(self);
};

function PushTouch(self, other) {
	if (!other.client) {
		return;
	}

	BG.TouchJumpPad(other.client.ps, self.s);
}
		/**
 * QUAKED trigger_teleport (.5 .5 .5) ? SPECTATOR
 * Allows client side prediction of teleportation events.
 * Must point at a target_position, which will be the teleport destination.
 *
 * If spectator is set, only spectators can use this teleport
 * Spectator teleporters are not normally placed in the editor, but are created
 * automatically near doors to allow spectators to move through them
 */
spawnFuncs['trigger_teleport'] = function (self) {
	InitTrigger(self);

	// Unlike other triggers, we need to send this one to the client
	// unless is a spectator trigger.
	if (self.spawnflags & 1) {
		self.r.svFlags |= SVF.NOCLIENT;
	} else {
		self.r.svFlags &= ~SVF.NOCLIENT;
	}

	// Make sure the client precaches this sound.
	SoundIndex('sound/world/jumppad');

	self.s.eType = ET.TELEPORT_TRIGGER;
	self.touch = TeleportTouch;

	SV.LinkEntity(self);
};

function TeleportTouch(self, other) {
	if (!other.client) {
		return;
	}

	if (other.client.ps.pm_type === PM.DEAD) {
		return;
	}

	// If the tele has a valid arena number, change arenas.
	// NOTE: Some maps have an arena num set and a target in error.
	// We let the target take precedence.
	if (!self.target && self.arena !== ARENANUM_NONE) {
		SetArena(other, self.arena);
		return;
	}

	var dest = PickTarget(self.target);
	if (!dest) {
		log('Couldn\'t find teleporter destination');
		FreeEntity(self);
		return;
	}

	TeleportPlayer(other, dest.s.origin, dest.s.angles);
}
		/**
 * QUAKED worldspawn (0 0 0) ?
 *
 * Every map should have exactly one worldspawn.
 * "music"    music wav file
 * "gravity"  800 is default gravity
 * "message"  Text to print during connection process
 */
spawnFuncs['worldspawn'] = function (self) {
	// TODO Manually spawn the first entity so this check is valid.
	// if (self.classname !== 'worldspawn') {
	// 	error('worldspawn: The first entity isn\'t \'worldspawn\'');
	// }

	// Make some data visible to connecting client.
	// SV.SetConfigstring( CS_GAME_VERSION, GAME_VERSION );
	// SV.SetConfigstring( CS_MOTD, g_motd.string );  // message of the day

	SV.SetConfigstring('levelStartTime', level.startTime);

	var music = SpawnString('music', '');
	// Convert slashes and strip extension.
	music = music.replace('\\', '/').replace(/\.[^\/.]+$/, '');
	SV.SetConfigstring('music', music);

	var message = SpawnString('message', '');
	SV.SetConfigstring('message', message);  // map specific message

	// G_SpawnString( "gravity", "800", &s );
	// trap_Cvar_Set( "g_gravity", s );

	// G_SpawnString( "enableDust", "0", &s );
	// trap_Cvar_Set( "g_enableDust", s );

	// G_SpawnString( "enableBreath", "0", &s );
	// trap_Cvar_Set( "g_enableBreath", s );

	level.gentities[ENTITYNUM_WORLD].s.number = ENTITYNUM_WORLD;
	level.gentities[ENTITYNUM_WORLD].r.ownerNum = ENTITYNUM_NONE;
	level.gentities[ENTITYNUM_WORLD].classname = 'worldspawn';

	level.gentities[ENTITYNUM_NONE].s.number = ENTITYNUM_NONE;
	level.gentities[ENTITYNUM_NONE].r.ownerNum = ENTITYNUM_NONE;
	level.gentities[ENTITYNUM_NONE].classname = 'nothing';
};

		return {
			SVF:                   SVF,

			Init:                  Init,
			Shutdown:              Shutdown,
			Frame:                 Frame,
			ClientConnect:         ClientConnect,
			ClientUserinfoChanged: ClientUserinfoChanged,
			ClientBegin:           ClientBegin,
			ClientThink:           ClientThink,
			ClientDisconnect:      ClientDisconnect,
			ClientCommand:         ClientCommand,
			GetClientPlayerstate:  GetClientPlayerstate
		};
	}

	return Game;
});


/*global mat4: true, vec3: true */

define('server/sv',['require','vendor/bit-buffer','common/qmath','common/qshared','common/surfaceflags','common/cvar','clipmap/cm','game/gm'],function (require) {
	var BitStream  = require('vendor/bit-buffer').BitStream;
	var QMath      = require('common/qmath');
	var QS         = require('common/qshared');
	var SURF       = require('common/surfaceflags');
	var Cvar       = require('common/cvar');
	var Clipmap    = require('clipmap/cm');
	var Game       = require('game/gm');

	function Server(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;
		var CM  = new Clipmap(ClipmapExports());
		var GM  = new Game(GameExports());
		var CL  = null;

		var MAX_SNAPSHOT_ENTITIES = QS.MAX_CLIENTS * COM.PACKET_BACKUP * 64;
var MAX_ENT_CLUSTERS = 16;

// Persistent across all maps.
var ServerStatic = function () {
	this.initialized          = false;
	this.gameInitialized      = false;
	this.time                 = 0;                         // will be strictly increasing across level changes
	this.nextHeartbeatTim     = 0;
	this.snapFlagServerBit    = 0;                         // ^= QS.SNAPFLAG_SERVERCOUNT every SV_SpawnServer()
	this.clients              = new Array(QS.MAX_CLIENTS);
	this.nextSnapshotEntities = 0;                         // next snapshotEntities to use
	this.snapshotEntities     = new Array(MAX_SNAPSHOT_ENTITIES);
	this.msgBuffer            = new ArrayBuffer(COM.MAX_MSGLEN);

	for (var i = 0; i < QS.MAX_CLIENTS; i++) {
		this.clients[i] = new ServerClient();
	}

	for (var i = 0; i < MAX_SNAPSHOT_ENTITIES; i++) {
		this.snapshotEntities[i] = new QS.EntityState();
	}
};

// Reset for each map.
var SS = {
	DEAD:    0,                                            // no map loaded
	LOADING: 1,                                            // spawning level entities
	GAME:    2                                             // actively running
};

var ServerLocals = function () {
	this.state             = SS.DEAD;
	this.restarting        = false;                        // if true, send configstring changes during SS_LOADING
	this.serverId          = 0;                            // changes each server start
	this.restartedServerId = 0;                            // serverId before a map_restart
	this.snapshotCounter   = 0;                            // incremented for each snapshot built
	this.time              = 0;
	this.restartTime       = 0;
	this.timeResidual      = 0;                            // <= 1000 / sv_frame->value
	this.configstrings     = {};
	this.world             = null;
	this.svEntities        = new Array(QS.MAX_GENTITIES);
	this.gameEntities      = null;
	this.gameClients       = null;

	for (var i = 0; i < QS.MAX_GENTITIES; i++) {
		this.svEntities[i] = new ServerEntity();
		this.svEntities[i].number = i;
	}
};

var ServerEntity = function () {
	this.number          = 0;
	this.worldSector     = null;
	this.baseline        = new QS.EntityState();
	this.numClusters     = 0;                              // if -1, use headnode instead
	this.clusternums     = new Array(MAX_ENT_CLUSTERS);
	this.lastCluster     = 0;                              // if all the clusters don't fit in clusternums
	this.areanum         = 0;
	this.areanum2        = 0;
	this.snapshotCounter = 0;
};

var CS = {
	FREE:      0,                                          // can be reused for a new connection
	ZOMBIE:    1,                                          // client has been disconnected, but don't reuse
	                                                       // connection for a couple seconds
	CONNECTED: 2,                                          // has been assigned to a client_t, but no gamestate yet
	PRIMED:    3,                                          // gamestate has been sent, but client hasn't sent a usercmd
	ACTIVE:    4                                           // client is fully in game
};

var ServerClient = function () {
	this.reset();
};

ServerClient.prototype.reset = function () {
	this.state                   = CS.FREE;
	this.userinfo                = {};

	this.messageAcknowledge      = 0;
	this.reliableCommands        = new Array(COM.MAX_RELIABLE_COMMANDS);
	this.reliableSequence        = 0;                      // last added reliable message, not necesarily sent or acknowledged yet
	this.reliableAcknowledge     = 0;                      // last acknowledged reliable message

	this.gamestateMessageNum     = -1;

	this.lastUserCmd             = new QS.UserCmd();
	this.lastMessageNum          = 0;                      // for delta compression
	this.lastClientCommand       = 0;                      // reliable client message sequence
	this.name                    = null;                   // extracted from userinfo, high bits masked

	this.deltaMessage            = -1;                     // frame last client usercmd message
	this.nextReliableTime        = 0;                      // svs.time when another reliable command will be allowed
	this.lastSnapshotTime        = 0;
	this.snapshotMsec            = 0;                      // requests a snapshot every snapshotMsec unless rate choked
	this.frames                  = new Array(COM.PACKET_BACKUP);

	this.netchan                 = null;
	this.oldServerTime           = 0;
	this.csUpdated               = {};

	for (var i = 0; i < COM.PACKET_BACKUP; i++) {
		this.frames[i] = new ClientSnapshot();
	}
};

var ClientSnapshot = function () {
	this.ps          = new QS.PlayerState();
	this.numEntities = 0;
	this.firstEntity = 0;                                  // index into the circular sv_packet_entities[]
	                                                       // the entities MUST be in increasing state number
	                                                       // order, otherwise the delta compression will fail
};
		var sv,
	svs,
	dedicated;

var sv_ip,
	sv_port,
	sv_hostname,
	sv_externalPort,
	sv_master,
	sv_serverid,
	sv_name,
	sv_mapname,
	sv_maxClients,
	sv_fps,
	sv_rconPassword,
	sv_timeout,
	sv_zombietime;

/**
 * log
 */
function log() {
	COM.Log.apply(this, arguments);
}

/**
 * error
 */
function error(str) {
	COM.Error(str);
}

/**
 * Init
 *
 * Called only once on startup.
 */
function Init(inCL, callback) {
	log('Initializing SV');

	CL = inCL;

	sv = new ServerLocals();
	if (!svs) {
		svs = new ServerStatic();
	}

	dedicated = !CL;

	RegisterCvars();
	RegisterCommands();

	CreateListenServer();

	callback(null);
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	sv_ip           = Cvar.AddCvar('sv_ip',           '0.0.0.0',            Cvar.FLAGS.ARCHIVE, true);
	sv_port         = Cvar.AddCvar('sv_port',         9001,                 Cvar.FLAGS.ARCHIVE, true);
	// Used by servers who require a proper DNS name to be routed to properly.
	sv_hostname     = Cvar.AddCvar('sv_hostname',     '',                   Cvar.FLAGS.ARCHIVE, true);
	// Many hosts supporting WebSockets require you to access the app through
	// a different external port than what you bind to internally.
	sv_externalPort = Cvar.AddCvar('sv_externalPort', 0,                    Cvar.FLAGS.ARCHIVE, true);
	sv_master       = Cvar.AddCvar('sv_master',       '',                   Cvar.FLAGS.ARCHIVE);
	sv_name         = Cvar.AddCvar('sv_name',         'Anonymous',          Cvar.FLAGS.ARCHIVE);
	sv_serverid     = Cvar.AddCvar('sv_serverid',     0,                    Cvar.FLAGS.SYSTEMINFO | Cvar.FLAGS.ROM);
	sv_mapname      = Cvar.AddCvar('sv_mapname',      'nomap',              Cvar.FLAGS.SERVERINFO);
	sv_maxClients   = Cvar.AddCvar('sv_maxClients',   16,                   Cvar.FLAGS.SERVERINFO | Cvar.FLAGS.LATCH | Cvar.FLAGS.ARCHIVE);
	sv_fps          = Cvar.AddCvar('sv_fps',          20);   // time rate for running non-clients
	sv_rconPassword = Cvar.AddCvar('sv_rconPassword', '');
	sv_timeout      = Cvar.AddCvar('sv_timeout',      200);  // seconds without any message
	sv_zombietime   = Cvar.AddCvar('sv_zombietime',   2);    // seconds to sink messages after disconnect
}

/**
 * CreateListenServer
 */
function CreateListenServer() {
	var addr = new QS.NetAdr();
	addr.type = dedicated ? QS.NA.IP : QS.NA.LOOPBACK;
	addr.ip = sv_ip.get();
	addr.port = sv_port.get();

	COM.NetListen(addr, {
		onrequest: ClientRequest,
		onaccept: ClientAccept
	});
}

/**
 * FrameMsec
 *
 * Calculate the # of milliseconds for a single frame.
 */
function FrameMsec() {
	var fps = sv_fps.get();
	var frameMsec = 1000 / fps;

	if (frameMsec < 1) {
		frameMsec = 1;
	}

	return frameMsec;
}

/**
 * Frame
 */
function Frame(msec) {
	if (!Running()) {
		return;
	}

	var frameMsec = FrameMsec();
	sv.timeResidual += msec;

	// Restart if the delay is up.
	if (sv.restartTime && sv.time >= sv.restartTime) {
		sv.restartTime = 0;
		COM.ExecuteBuffer('map_restart 0');
		return;
	}

	// Update infostrings if anything has been changed.
	if (Cvar.Modified(Cvar.FLAGS.SERVERINFO)) {
		SetConfigstring('serverInfo', Cvar.GetCvarJSON(Cvar.FLAGS.SERVERINFO));
		Cvar.ClearModified(Cvar.FLAGS.SERVERINFO);
	}
	if (Cvar.Modified(Cvar.FLAGS.SYSTEMINFO)) {
		SetConfigstring('systemInfo', Cvar.GetCvarJSON(Cvar.FLAGS.SYSTEMINFO));
		Cvar.ClearModified(Cvar.FLAGS.SYSTEMINFO);
	}

	// Update ping based on the all received frames.
	CalcPings();

	// Run the game simulation in chunks.
	while (sv.timeResidual >= frameMsec) {
		sv.timeResidual -= frameMsec;
		svs.time += frameMsec;
		sv.time += frameMsec;

		// Let everything in the world think and move.
		GM.Frame(sv.time);

		// If the server started to shutdown during this frame, early out.
		if (!Running()) {
			return;
		}
	}

	// Check for timeouts.
	CheckTimeouts();

	SendClientMessages();

	// Send a heartbeat to the master if needed.
	SendMasterHeartbeat();
}

/**
 * Running
 */
function Running() {
	return svs.initialized;
}

/**
 * CalcPings
 *
 * Updates the cl->ping variables
 */
function CalcPings() {
	for (var i = 0; i < sv_maxClients.get(); i++) {
		var client = svs.clients[i];

		if (client.state !== CS.ACTIVE) {
			client.ping = 999;
			continue;
		}

		if (!client.gentity) {
			client.ping = 999;
			continue;
		}

		var total = 0;
		var count = 0;
		for (var j = 0; j < COM.PACKET_BACKUP; j++) {
			if (client.frames[j].messageAcked <= 0) {
				continue;
			}
			var delta = client.frames[j].messageAcked - client.frames[j].messageSent;
			total += delta;
			count++;
		}
		if (!count) {
			client.ping = 999;
		} else {
			client.ping = Math.floor(total / count);
			if (client.ping > 999) {
				client.ping = 999;
			}
		}

		// Let the game dll know about the ping.
		var ps = GM.GetClientPlayerstate(i);
		ps.ping = client.ping;
	}
}

/**
 * CheckTimeouts
 *
 * If a packet has not been received from a client for sv_timeout
 * seconds, drop the connection. Server time is used instead of
 * realtime to avoid dropping the local client while debugging.
 *
 * When a client is normally dropped, the client_t goes into a zombie state
 * for a few seconds to make sure any final reliable message gets resent
 * if necessary.
 */
function CheckTimeouts() {
	var droppoint = svs.time - 1000 * sv_timeout.get();
	var zombiepoint = svs.time - 1000 * sv_zombietime.get();

	for (var i = 0; i < sv_maxClients.get(); i++) {
		var client = svs.clients[i];
		if (client.state === CS.FREE) {
			continue;
		}

		// Message times may be wrong across a changelevel.
		if (client.lastPacketTime > svs.time) {
			client.lastPacketTime = svs.time;
		}

		if (client.state === CS.ZOMBIE && client.lastPacketTime < zombiepoint) {
			log('Going from CS_ZOMBIE to CS_FREE for client', i);
			client.state = CS.FREE;  // can now be reused
			continue;
		}

		if (client.state >= CS.CONNECTED && client.lastPacketTime < droppoint) {
			DropClient(client, 'timed out');
			client.state = CS.FREE;  // don't bother with zombie state
		}
	}
}

/**
 * SendMasterHeartbeat
 *
 * Send a message to the masters every few minutes to
 * let it know we are alive, and log information.
 * We will also have a heartbeat sent when a server
 * changes from empty to non-empty, and full to non-full,
 * but not on every player enter or exit.
 */
var HEARTBEAT_MSEC = 30 * 1000;

function SendMasterHeartbeat() {
	var master = sv_master.get();

	// Only dedicated servers send heart beats.
	if (!dedicated || !master) {
		return;
	}

	// If not time yet, don't send anything.
	if (svs.time < svs.nextHeartbeatTime) {
		return;
	}

	svs.nextHeartbeatTime = svs.time + HEARTBEAT_MSEC;

	var addr = COM.StringToAddr(master);
	if (!addr) {
		error('Failed to parse server address', master);
		return;
	}

	log('SendMasterHeartbeat', master);

	var socket = COM.NetConnect(addr, {
		onopen: function () {
			COM.NetOutOfBandPrint(socket, 'heartbeat', {
				hostname: sv_hostname.get(),
				port: sv_externalPort.get() || sv_port.get()
			});
			COM.NetClose(socket);
		}
	});
}

/**
 * PacketEvent
 */
function PacketEvent(socket, source) {
	if (!Running()) {
		return;
	}

	// source may be either an ArrayBuffer, or an ArrayBufferView
	// in the case of loopback packets.
	var buffer, length;

	if (source.buffer) {
		buffer = source.buffer;
		length = source.length;
	} else {
		buffer = source;
		length = source.byteLength;
	}

	// Copy the supplied buffer over to our internal fixed size buffer.
	var view = new Uint8Array(svs.msgBuffer, 0, COM.MAX_MSGLEN);
	var view2 = new Uint8Array(buffer, 0, length);
	for (var i = 0; i < length; i++) {
		view[i] = view2[i];
	}

	var msg = new BitStream(svs.msgBuffer);

	// Peek in and see if this is a string message.
	if (msg.view.byteLength >= 4 && msg.view.getInt32(0) === -1) {
		OutOfBandPacket(socket, msg);
		return;
	}

	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === CS.FREE) {
			continue;
		}

		if (client.netchan.socket !== socket) {
			continue;
		}

		if (COM.NetchanProcess(client, msg)) {
			client.lastPacketTime = svs.time;  // don't timeout
			ExecuteClientMessage(client, msg);
		}
		return;
	}
}

/**
 * OutOfBandPacket
 *
 * A connectionless packet has four leading 0xff
 * characters to distinguish it from a game channel.
 * Clients that are in the game can still send
 * connectionless packets.
 */
function OutOfBandPacket(socket, msg) {
	msg.readInt32();  // Skip the -1.

	var packet;
	try {
		var str;
		str = msg.readASCIIString();
		packet = JSON.parse(str);
	} catch (e) {
		log('Failed to parse oob packet from ' + SYS.SockToString(socket));
		COM.NetClose(socket);
		return;
	}

	if (packet.type === 'rcon') {
		RemoteCommand(socket, packet.data[0], packet.data[1]);
	} else if (packet.type === 'getinfo') {
		ServerInfo(socket);
	} else if (packet.type === 'connect') {
		ClientEnterServer(socket, packet.data);
	} else {
		log('Bad packet type from ' + SYS.SockToString(socket) + ': ' + packet.type);
		COM.NetClose(socket);
	}
}

/**
 * RemoteCommand
 *
 * An rcon packet arrived from the network.
 */
function RemoteCommand(socket, password, cmd) {
	// Prevent using rcon as an amplifier and make dictionary attacks impractical.
	// if ( SVC_RateLimitAddress( from, 10, 1000 ) ) {
	// 	Com_DPrintf( "SVC_RemoteCommand: rate limit from %s exceeded, dropping request\n",
	// 		NET_AdrToString( from ) );
	// 	return;
	// }

	var valid = false;

	if (!sv_rconPassword.get() || sv_rconPassword.get() !== password) {
		// // Make DoS via rcon impractical
		// if ( SVC_RateLimit( &bucket, 10, 1000 ) ) {
		// 	Com_DPrintf( "SVC_RemoteCommand: rate limit exceeded, dropping request\n" );
		// 	return;
		// }

		log('Bad rcon request from ' + COM.SockToString(socket) + ' (' + password + ')');
	} else {
		valid = true;
		log('Valid rcon request from ' + COM.SockToString(socket) + ' (' + password + ')');
	}

	// Start redirecting all print outputs to the packet.
	COM.BeginRedirect(function () {
		var args = Array.prototype.slice.call(arguments);
		COM.NetOutOfBandPrint(socket, 'print', args.join(' '));
	});

	if (!sv_rconPassword.get()) {
		log('No rconpassword set on the server.');
	} else if (!valid) {
		log('Bad rconpassword.');
	} else {
		log('Executing \"' + cmd + '\"');
		COM.ExecuteBuffer(cmd);
	}

	COM.EndRedirect();

	// If this command didn't come from a connected client,
	// go ahead and close the socket.
	var found = false;
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.netchan.socket === socket) {
			found = true;
			break;
		}
	}

	if (!found) {
		COM.NetClose(socket);
	}
}

/**
 * ServerInfo
 */
function ServerInfo(socket) {
	var info = {};

	log('Received getinfo request from ' + SYS.SockToString(socket));

	var g_gametype = Cvar.AddCvar('g_gametype');

	// Info_SetValueForKey( infostring, "gamename", com_gamename->string );
	// Info_SetValueForKey(infostring, "protocol", va("%i", com_protocol->integer));

	info.sv_name = sv_name.get();
	info.sv_mapname = sv_mapname.get();
	info.sv_maxClients = sv_maxClients.get();
	info.g_gametype = g_gametype.get();

	var count = 0;
	for (var i = 0; i < sv_maxClients.get(); i++) {
		if (svs.clients[i].state >= CS.CONNECTED) {
			count++;
		}
	}

	info.clients = count;

	COM.NetOutOfBandPrint(socket, 'infoResponse', info);

	// Forcefully kill the connection.
	COM.NetClose(socket);
}

/**
 * Spawn
 */
function Spawn(mapname) {
	log('Spawning new server for', mapname, 'at', sv.time);

	svs.initialized = false;

	// Shutdown the game.
	ShutdownGame();

	// If there is a local client, inform it we're changing
	// maps so it can connect.
	if (!dedicated) {
		CL.MapLoading();
	}

	// Toggle the server bit so clients can detect that a server has changed.
	svs.snapFlagServerBit ^= QS.SNAPFLAG_SERVERCOUNT;

	// Keep sending client snapshots with the old server time until
	// the client has acknowledged the new gamestate. Otherwise, we'll
	// violate the check in cl-cgame ensuring that time doesn't flow backwards.
	for (var i = 0; i < sv_maxClients.get(); i++) {
		if (svs.clients[i].state >= CS.CONNECTED) {
			svs.clients[i].oldServerTime = sv.time;
		}
	}

	// Wipe the entire per-level structure.
	var oldServerTime = sv.time;
	sv = new ServerLocals();

	// Load the map data.
	COM.LoadBsp(mapname, function (err, world) {
		if (err) {
			return error(err);
		}

		// Save off to pass game entity info.
		sv.world = world;

		// Load the collision info.
		CM.LoadWorld(world);

		sv_mapname.set(mapname);

		// Server id should be different each time.
		sv.serverId = sv.restartedServerId = COM.frameTime;
		sv_serverid.set(sv.serverId);

		// Clear physics interaction links.
		ClearWorld();

		// Media configstring setting should be done during
		// the loading stage, so connected clients don't have
		// to load during actual gameplay.
		sv.state = SS.LOADING;

		// Initialize the game.
		InitGame();

		// Run a few frames to allow everything to settle.
		for (var i = 0; i < 3; i++) {
			GM.Frame(sv.time);
			sv.time += 100;
			svs.time += 100;
		}

		CreateBaselines();

		// Send the new gamestate to all connected clients.
		for (var i = 0; i < sv_maxClients.get(); i++) {
			var client = svs.clients[i];

			if (!client || client.state < CS.CONNECTED) {
				continue;
			}

			// Clear gentity pointer to prevent bad snapshots from building.
			client.gentity = null;

			// Reconnect.
			var denied = GM.ClientConnect(i, false);

			if (denied) {
				DropClient(client, denied);
			}

			// When we get the next packet from a connected client,
			// the new gamestate will be sent.
			log('Going to CS_CONNECTED for', i);
			client.state = CS.CONNECTED;
		}

		// Run another frame to allow things to look at all the players.
		GM.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;

		SetConfigstring('systemInfo', Cvar.GetCvarJSON(Cvar.FLAGS.SYSTEMINFO));
		SetConfigstring('serverInfo', Cvar.GetCvarJSON(Cvar.FLAGS.SERVERINFO));

		// Any media configstring setting now should issue a warning
		// and any configstring changes should be reliably transmitted
		// to all clients.
		sv.state = SS.GAME;

		svs.initialized = true;

		// Send a heartbeat now so the master will get up to date info.
		svs.nextHeartbeatTime = -9999999;
	});
}

/**
 * Kill
 *
 * Called by the client when it wants to kill the local server.
 */
function Kill() {
	log('KillServer');

	// Shutdown the game.
	ShutdownGame();

	// Free the current level.
	sv = new ServerLocals();
	svs = new ServerStatic();

	// Disconnect any local clients.
	// if( sv_killserver->integer != 2)
	// 	CL_Disconnect( qfalse );
}

/**
 * CreateBaselines
 *
 * Entity baselines are used to compress non-delta messages
 * to the clients -- only the fields that differ from the
 * baseline will be transmitted.
 */
function CreateBaselines() {
	for (var i = 0; i < QS.MAX_GENTITIES; i++) {
		var svent = sv.svEntities[i];
		var gent = GentityForSvEntity(svent);
		if (!gent.r.linked) {
			continue;
		}

		// Take current state as baseline.
		gent.s.clone(sv.svEntities[i].baseline);
	}
}

/**
 * GetConfigstring
 */
function GetConfigstring(key) {
	var json = sv.configstrings[key];
	var ret = json ? JSON.parse(json) : null;
	return ret;
}

/**
 * SetConfigstring
 */
function SetConfigstring(key, val) {
	var json = JSON.stringify(val);

	// Don't bother broadcasting an update if no change.
	if (json === sv.configstrings[key]) {
		return;
	}

	log('SetConfigstring', key, json);

	// Change the string.
	sv.configstrings[key] = json;

	// Send it to all the clients if we aren't spawning a new server.
	if (sv.state === SS.GAME || sv.restarting) {
		// Send the data to all relevent clients.
		for (var i = 0; i < sv_maxClients.get(); i++) {
			var client = svs.clients[i];

			if (client.state < CS.ACTIVE) {
				if (client.state === CS.PRIMED) {
					client.csUpdated[key] = true;
				}
				continue;
			}

			SendConfigstring(client, key);
		}
	}
}

/**
 * SendConfigString
 *
 * Creates and sends the server command necessary to update the CS index for the
 * given client.
 */
function SendConfigstring(client, key) {
	var json = sv.configstrings[key];
	SendServerCommand(client, 'cs', { k: key, v: JSON.parse(json) });
}

/**
 * UpdateConfigstrings
 *
 * Called when a client goes from CS.PRIMED to CS.ACTIVE. Updates all
 * Configstring indexes that have changed while the client was in CS.PRIMED.
 */
function UpdateConfigstrings(client) {
	for (var key in sv.configstrings) {
		if (!sv.configstrings.hasOwnProperty(key)) {
			continue;
		}

		// If the CS hasn't changed since we went to CS.PRIMED, ignore.
		if (!client.csUpdated[key]) {
			continue;
		}

		SendConfigstring(client, key);
		client.csUpdated[key] = false;
	}
}

/**
 * GetUserinfo
 */
function GetUserinfo(clientNum) {
	if (clientNum < 0 || clientNum >= QS.MAX_CLIENTS) {
		error('GetUserinfo: bad index ' + clientNum);
	}

	return svs.clients[clientNum].userinfo;
}

/**********************************************************
 *
 * Event messages
 *
 **********************************************************/

/**
 * SendServerCommand
 *
 * Sends a reliable command string to be interpreted by
 * the client game module: "cp", "print", "chat", etc
 * A NULL client will broadcast to all clients
 */
function SendServerCommand(client, type, data) {
	if (client !== null) {
		AddServerCommand(client, type, data);
		return;
	}

	// // Hack to echo broadcast prints to console.
	// if ( com_dedicated->integer && !strncmp( (char *)message, "print", 5) ) {
	// 	Com_Printf ("broadcast: %s\n", SV_ExpandNewlines((char *)message) );
	// }

	// Send the data to all relevent clients.
	for (var i = 0; i < sv_maxClients.get(); i++) {
		AddServerCommand(svs.clients[i], type, data);
	}
}

/**
 * AddServerCommand
 *
 * The given command will be transmitted to the client, and is guaranteed to
 * not have future snapshot_t executed before it is executed.
 */
function AddServerCommand(client, type, data) {
	// Do not send commands until the gamestate has been sent.
	if (client.state < CS.PRIMED) {
		return;
	}

	client.reliableSequence++;

	var cmd = { type: type, data: data };

	// If we would be losing an old command that hasn't been acknowledged,
	// we must drop the connection.
	// We check == instead of >= so a broadcast print added by SV_DropClient()
	// doesn't cause a recursive drop client.
	if (client.reliableSequence - client.reliableAcknowledge === COM.MAX_RELIABLE_COMMANDS + 1 ) {
		log('----- pending server commands -----');
		for (var i = client.reliableAcknowledge + 1; i <= client.reliableSequence; i++) {
			log('cmd', i, client.reliableCommands[i % COM.MAX_RELIABLE_COMMANDS]);
		}
		log('cmd', i, cmd);
		DropClient(client, 'Server command overflow');
		return;
	}

	// Copy the command off.
	client.reliableCommands[client.reliableSequence % COM.MAX_RELIABLE_COMMANDS] = cmd;
}

/**
 * ClipmapExports
 */
function ClipmapExports() {
	return {
		log:   log,
		error: error
	};
}

/**
 * GameExports
 */
function GameExports() {
	return {
		SYS: SYS,
		SV: {
			Log:                   log,
			Error:                 error,
			ExecuteBuffer:         COM.ExecuteBuffer,
			AddCmd:                COM.AddCmd,
			LocateGameData:        LocateGameData,
			GetUserCmd:            GetUserCmd,
			AdjustAreaPortalState: AdjustAreaPortalState,
			EntityContact:         EntityContact,
			GetConfigstring:       GetConfigstring,
			SetConfigstring:       SetConfigstring,
			GetUserinfo:           GetUserinfo,
			SendServerCommand:     SendGameServerCommand,
			SetBrushModel:         SetBrushModel,
			GetEntityDefs:         GetEntityDefs,
			LinkEntity:            LinkEntity,
			UnlinkEntity:          UnlinkEntity,
			FindEntitiesInBox:     FindEntitiesInBox,
			Trace:                 Trace,
			PointContents:         PointContents
		}
	};
}

		/**
 * ClientRequest
 *
 * Called when a client is attempting to connect to the server,
 * we should check the banlist here.
 */
function ClientRequest(addr) {
	// if (denied) {
	// 	NET_OutOfBandPrint( QS.NS_SERVER, from, "print\n%s\n", str );
	// 	Com_DPrintf ("Game rejected a connection: %s.\n", str);
	// 	return false;
	// }

	return true;
}

/**
 * ClientAccept
 *
 * Called when a client acception has been accepted, but before
 * its game-level connection string has been received.
 */
function ClientAccept(socket) {
	socket.onmessage = function (buffer) {
		PacketEvent(socket, buffer);
	};

	socket.onclose = function () {
		ClientDisconnected(socket);
	};
}

/**
 * ClientEnterServer
 *
 * Called after a client has been accepted and its game-level
 * connect request has been processed.
 */
function ClientEnterServer(socket, data) {
	if (!Running()) {
		return;
	}

	// Find a slot for the client.
	var clientNum;
	for (var i = 0; i < sv_maxClients.get(); i++) {
		if (svs.clients[i].state === CS.FREE) {
			clientNum = i;
			break;
		}
	}
	if (clientNum === undefined) {
		COM.NetOutOfBandPrint(socket, 'print', 'Server is full.');
		log('Rejected a connection.');
		return;
	}

	var com_protocol = Cvar.AddCvar('com_protocol');
	var version = data.protocol;
	if(version !== com_protocol.get()) {
		COM.NetOutOfBandPrint(socket, 'print', 'Server uses protocol version ' + com_protocol.get() + ' (yours is ' + version + ').');
		log('Rejected connect from version', version);
		return;
	}

	// Create the client.
	var newcl = svs.clients[clientNum];
	newcl.reset();

	newcl.netchan = COM.NetchanSetup(socket);
	newcl.userinfo = data.userinfo;

	// Give the game a chance to modify the userinfo.
	GM.ClientConnect(clientNum, true);
	UserinfoChanged(newcl);

	log('Going from CS_FREE to CS_CONNECTED for ', clientNum);

	newcl.state = CS.CONNECTED;
	newcl.lastSnapshotTime = svs.time;
	newcl.lastPacketTime = svs.time;

	// Let the client know we've accepted them.
	COM.NetOutOfBandPrint(newcl.netchan.socket, 'connectResponse', null);

	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	newcl.gamestateMessageNum = -1;
}

/**
 * ClientEnterWorld
 */
function ClientEnterWorld(client, cmd) {
	var clientNum = svs.clients.indexOf(client);

	client.state = CS.ACTIVE;

	log('Going from CS_CONNECTED to CS_ACTIVE for ', clientNum);

	// Resend all configstrings using the cs commands since these are
	// no longer sent when the client is CS_PRIMED.
	UpdateConfigstrings(client);

	client.deltaMessage = -1;
	client.lastSnapshotTime = 0;  // generate a snapshot immediately
	client.gentity = GentityForNum(clientNum);

	if (cmd) {
		cmd.clone(client.lastUserCmd);
	} else {
		client.lastUserCmd = new QS.UserCmd();
	}

	GM.ClientBegin(clientNum);
}

/**
 * DropClient
 *
 * Called when the player is totally leaving the server, either willingly
 * or unwillingly.
 */
function DropClient(client, reason) {
	if (client.state === CS.ZOMBIE) {
		return;  // already dropped
	}

	/*// see if we already have a challenge for this ip
	challenge = &svs.challenges[0];

	for (var i = 0 ; i < MAX_CHALLENGES ; i++, challenge++)
	{
		if(NET_CompareAdr(drop->netchan.remoteAddress, challenge->adr))
		{
			Com_Memset(challenge, 0, sizeof(*challenge));
			break;
		}
	}*/

	// Tell everyone why they got dropped.
	SendServerCommand(null, 'print', client.name + '^' + QS.COLOR.WHITE + ' ' + reason);

	// Call the game function for removing a client
	// this will remove the body, among other things.
	var clientNum = GetClientNum(client);
	GM.ClientDisconnect(clientNum);

	// Add the disconnect command.
	SendServerCommand(client, 'disconnect', reason);

	// Kill the connection.
	COM.NetClose(client.netchan.socket);

	log('Going to CS_ZOMBIE for', client.name);
	client.state = CS.ZOMBIE;  // become free in a few seconds
}

/**
 * ClientDisconnected
 *
 * Called when the socket is closed for a client.
 */
function ClientDisconnected(socket) {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === CS.FREE) {
			continue;
		}

		if (client.netchan.socket === socket) {
			DropClient(client, 'disconnected');
			return;
		}
	}
}

/**
 * UserMove
 */
function UserMove(client, msg, delta) {
	if (delta) {
		client.deltaMessage = client.messageAcknowledge;
	} else {
		client.deltaMessage = -1;
	}

	var count = msg.readInt8(msg);
	if (count < 1) {
		log('UserMove cmd count < 1');
		return;
	}
	if (count > QS.MAX_PACKET_USERCMDS) {
		log('cmdCount > MAX_PACKET_USERCMDS');
		return;
	}

	// NOTE: Only delta the user cmd from another user cmd
	// in this message. If we delta across old commands (e.g.
	// client.lastUserCmd) we'll run into cmd.serverTime
	// never resetting on game restart.
	var cmds = [];
	var oldcmd;

	for (var i = 0; i < count; i++) {
		var cmd = new QS.UserCmd();
		COM.ReadDeltaUsercmd(msg, oldcmd, cmd);
		oldcmd = cmd;
		cmds.push(cmd);
	}

	// Save time for ping calculation.
	client.frames[client.messageAcknowledge % COM.PACKET_BACKUP].messageAcked = svs.time;

	// If this is the first usercmd we have received
	// this gamestate, put the client into the world.
	if (client.state === CS.PRIMED) {
		ClientEnterWorld(client, cmds[0]);
		// now moves can be processed normaly
	}

	if (client.state !== CS.ACTIVE) {
		client.deltaMessage = -1;
		return; // shouldn't happen
	}

	// Usually, the first couple commands will be duplicates
	// of ones we have previously received, but the servertimes
	// in the commands will cause them to be immediately discarded.
	for (var i = 0; i < cmds.length; i++) {
		var cmd = cmds[i];

		// If this is a cmd from before a map_restart ignore it.
		if (cmd.serverTime > cmds[cmds.length - 1].serverTime) {
			continue;
		}

		// Don't execute if this is an old cmd which is already executed
		// these old cmds are included when cl_packetdup > 0
		if (cmd.serverTime <= client.lastUserCmd.serverTime) {
			return;  // continue;
		}

		ClientThink(client, cmd);
	}
}

/**
 * ClientThink
 */
function ClientThink(client, cmd) {
	var clientNum = GetClientNum(client);

	cmd.clone(client.lastUserCmd);

	GM.ClientThink(clientNum);
}

/**
 * SendClientGameState
 */
function SendClientGameState(client) {
	client.state = CS.PRIMED;
	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	client.gamestateMessageNum = client.netchan.outgoingSequence;

	var msg = new BitStream(svs.msgBuffer);

	msg.writeInt32(client.lastClientCommand);

	msg.writeInt8(COM.SVM.gamestate);
	msg.writeInt32(client.reliableSequence);

	// Write the configstrings.
	for (var key in sv.configstrings) {
		if (!sv.configstrings.hasOwnProperty(key)) {
			continue;
		}

		msg.writeInt8(COM.SVM.configstring);
		msg.writeASCIIString(JSON.stringify({ k: key, v: GetConfigstring(key) }));
	}

	// Write the baselines.
	var nullstate = new QS.EntityState();
	for (var i = 0; i < QS.MAX_GENTITIES; i++) {
		var base = sv.svEntities[i].baseline;
		if (!base.number) {
			continue;
		}
		msg.writeInt8(COM.SVM.baseline);
		COM.WriteDeltaEntityState(msg, nullstate, base, true);
	}

	msg.writeInt8(COM.SVM.EOF);

	msg.writeInt32(GetClientNum(client));

	msg.writeInt8(COM.SVM.EOF);

	COM.NetchanTransmit(client.netchan, msg.buffer, msg.byteIndex);
}

/**
 * UserinfoChanged
 *
 * Pull specific info from a newly changed userinfo string
 * into a more C friendly form.
 */
function UserinfoChanged(client) {
	client.name = client.userinfo['name'];

	// Snaps command.
	var snaps = 20;

	if (snaps < 1) {
		snaps = 1;
	} else if(snaps > sv_fps.get()) {
		snaps = sv_fps.get();
	}

	snaps = 1000 / snaps;

	if (snaps != client.snapshotMsec) {
		// Reset last sent snapshot so we avoid desync between server frame time and snapshot send time.
		client.lastSnapshotTime = 0;
		client.snapshotMsec = snaps;
	}
}

/**
 * GetClientNum
 */
function GetClientNum(client) {
	return svs.clients.indexOf(client);
}

/**
 * UpdateUserinfo
 */
function UpdateUserinfo(client, info) {
	client.userinfo = info;
	UserinfoChanged(client);

	// Call game so it can update it's client info.
	var clientNum = GetClientNum(client);
	GM.ClientUserinfoChanged(clientNum);
}

/**
 * Disconnect
 */
function Disconnect(client) {
	DropClient(client, 'disconnected');
}

/**********************************************************
 *
 * User message/command processing
 *
 **********************************************************/

/**
 * ExecuteClientMessage
 */
function ExecuteClientMessage(client, msg) {
	var serverid = msg.readInt32();

	client.messageAcknowledge = msg.readInt32();
	if (client.messageAcknowledge < 0) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		return;
	}

	client.reliableAcknowledge = msg.readInt32();

	// NOTE: when the client message is fux0red the acknowledgement numbers
	// can be out of range, this could cause the server to send thousands of server
	// commands which the server thinks are not yet acknowledged in SV_UpdateServerCommandsToClient
	if (client.reliableAcknowledge < client.reliableSequence - COM.MAX_RELIABLE_COMMANDS) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		client.reliableAcknowledge = client.reliableSequence;
		return;
	}

	// If we can tell that the client has dropped the last
	// gamestate we sent them, resend it.
	if (serverid !== sv.serverId) {
		// TTimo - use a comparison here to catch multiple map_restart.
		if (serverid >= sv.restartedServerId && serverid < sv.serverId) {
			// They just haven't caught the map_restart yet
			log(client.name, 'ignoring pre map_restart / outdated client message');
			return;
		}

		if (client.messageAcknowledge > client.gamestateMessageNum) {
			SendClientGameState(client);
		}
		return;
	}

	// This client has acknowledged the new gamestate so it's
	// safe to start sending it the real time again.
	if (client.oldServerTime && serverid === sv_serverid.get()) {
		client.oldServerTime = 0;
	}

	// Read optional clientCommand strings.
	var type;

	while (true) {
		type = msg.readUint8();

		if (type === COM.CLM.EOF) {
			break;
		}

		if (type !== COM.CLM.clientCommand) {
			break;
		}

		if (!ParseClientCommand(client, msg)) {
			return;  // we couldn't execute it because of the flood protection
		}

		if (client.state === CS.ZOMBIE) {
			return;  // disconnect command
		}
	}

	// Read the usercmd_t.
	switch (type) {
		case COM.CLM.move:
			UserMove(client, msg, true);
			break;
		case COM.CLM.moveNoDelta:
			UserMove(client, msg, false);
			break;
	}
}

/**
 * ParseClientCommand
 */
function ParseClientCommand(client, msg) {
	var sequence = msg.readInt32();

	var cmd;
	try {
		var str = msg.readASCIIString();
		cmd = JSON.parse(str);
	} catch (e) {
		DropClient(client, 'Failed to parse command');
		return;
	}

	// See if we have already executed it.
	if (client.lastClientCommand >= sequence) {
		return true;
	}

	// Drop the connection if we have somehow lost commands
	if (sequence > client.lastClientCommand + 1 ) {
		log('Client', client.name, 'lost', sequence - client.lastClientCommand, 'clientCommands');
		DropClient(client, 'Lost reliable commands');
		return false;
	}

	// // Malicious users may try using too many string commands
	// // to lag other players. If we decide that we want to stall
	// // the command, we will stop processing the rest of the packet,
	// // including the usercmd. This causes flooders to lag themselves
	// // but not other people.
	// // We don't do this when the client hasn't been active yet since it's
	// // normal to spam a lot of commands when downloading.
	// if ( !com_cl_running->integer &&
	// 	cl->state >= CS_ACTIVE &&
	// 	sv_floodProtect->integer &&
	// 	svs.time < cl->nextReliableTime ) {
	// 	// ignore any other text messages from this client but let them keep playing
	// 	// TTimo - moved the ignored verbose to the actual processing in SV_ExecuteClientCommand, only printing if the core doesn't intercept
	// 	clientOk = qfalse;
	// }

	// Don't allow another command for one second.
	client.nextReliableTime = svs.time + 1000;

	ExecuteClientCommand(client, cmd);

	client.lastClientCommand = sequence;

	return true;  // Continue procesing.
}

/**
 * ExecuteClientCommand
 */
function ExecuteClientCommand(client, cmd) {
	if (cmd.type === 'userinfo') {
		UpdateUserinfo(client, cmd.data);
		return;
	}
	// Since we're on TCP the disconnect is handled as a result
	// of a socket close event.
	// else if (cmd.type === 'disconnect') {
	// 	Disconnect(client);
	// }

	// Pass unknown strings to the game.
	if (sv.state === SS.GAME && (client.state === CS.ACTIVE || client.state === CS.PRIMED)) {
		var clientNum = GetClientNum(client);
		GM.ClientCommand(clientNum, cmd);
	}
}
		
/**
 * RegisterCommands
 */
function RegisterCommands() {
	COM.AddCmd('map', CmdLoadMap);
	COM.AddCmd('map_restart', CmdRestartMap);
	COM.AddCmd('sectorlist', CmdSectorList);
}

/**
 * CmdLoadMap
 */
function CmdLoadMap(mapname) {
	Spawn(mapname);
}

/**
 * CmdRestartMap
 *
 * Completely restarts a level, but doesn't send a new gamestate to the clients.
 * This allows fair starts with variable load times.
 */
function CmdRestartMap(delayString) {
	// Make sure we aren't restarting twice in the same frame.
	if (COM.frameTime === sv_serverid.get()) {
		return;
	}

	// Make sure server is running.
	if (!Running()) {
		log('Server is not running.');
		return;
	}

	if (sv.restartTime) {
		return;
	}

	// Check for changes in latched variables that would
	// require a full restart.
	if (sv_maxClients.modified()) {
		log('Restart map is doing a hard restart - sv_maxClients changed.');

		// Restart the map the slow way.
		Spawn(sv_mapname.get());
		return;
	}

	// Toggle the server bit so clients can detect that a
	// map_restart has happened.
	svs.snapFlagServerBit ^= QS.SNAPFLAG_SERVERCOUNT;

	// Generate a new serverid.
	// TTimo - don't update restartedserverId there, otherwise we won't deal correctly with multiple map_restart.
	sv.serverId = COM.frameTime;
	sv_serverid.set(sv.serverId);

	// If a map_restart occurs while a client is changing maps, we need
	// to give them the correct time so that when they finish loading
	// they don't violate the backwards time check in cl_cgame.c
	for (var i = 0; i < sv_maxClients.get(); i++) {
		if (svs.clients[i].state === CS.PRIMED) {
			svs.clients[i].oldServerTime = sv.restartTime;
		}
	}

	// Note that we do NOT set sv.state = SS_LOADING, so configstrings that
	// had been changed from their default values will generate broadcast updates.
	sv.state = SS.LOADING;
	sv.restarting = true;

	ShutdownGame();
	InitGame();

	// Run a few frames to allow everything to settle.
	for (var i = 0; i < 3; i++) {
		GM.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;
	}

	sv.state = SS.GAME;
	sv.restarting = false;

	// Connect and begin all the clients.
	for (var i = 0; i < sv_maxClients.get(); i++) {
		var client = svs.clients[i];

		// Send the new gamestate to all connected clients.
		if (client.state < CS.CONNECTED) {
			continue;
		}

		// Add the map_restart command.
		AddServerCommand(client, 'map_restart');

		// Connect the client again, without the firstTime flag.
		var denied = GM.ClientConnect(i, false);
		if (denied) {
			// This generally shouldn't happen, because the client
			// was connected before the level change
			DropClient(client, denied);
			log('MapRestart: dropped client', i, '- denied!');
			continue;
		}

		if (client.state === CS.ACTIVE) {
			ClientEnterWorld(client, client.lastUserCmd);
		} else {
			// If we don't reset client.lastUserCmd and are restarting during map load,
			// the client will hang because we'll use the last Usercmd from the previous map,
			// which is wrong obviously.
			ClientEnterWorld(client, null);
		}
	}

	// Run another frame to allow things to look at all the players.
	GM.Frame(sv.time);
	sv.time += 100;
	svs.time += 100;
}

		/**
 * InitGame
 */
function InitGame() {
	svs.gameInitialized = true;
	GM.Init(sv.time);
}

/**
 * ShutdownGame
 */
function ShutdownGame() {
	if (!svs.gameInitialized) {
		return;
	}

	svs.gameInitialized = false;
	GM.Shutdown();
}

/**
 * GentityForNum
 */
function GentityForNum(num) {
	return sv.gameEntities[num];
}

/**
 * SvEntityForGentity
 */
function SvEntityForGentity(gent) {
	var num = gent.s.number;

	if (!gent || num < 0 || num >= QS.MAX_GENTITIES) {
		error('SvEntityForSharedEntity: bad game entity');
	}

	return sv.svEntities[num];
}

/**
 * GentityForSvEntity
 */
function GentityForSvEntity(ent) {
	var num = ent.number;

	if (!ent || num < 0 || num >= QS.MAX_GENTITIES) {
		error('SharedEntityForSvEntity: bad sv entity');
	}

	return GentityForNum(num);
}

/**
 * LocateGameData
 */
function LocateGameData(gameEntities, gameClients) {
	sv.gameEntities = gameEntities;
	sv.gameClients = gameClients;
}

/**
 * GetUserCmd
 */
function GetUserCmd(clientNum, cmd) {
	if (clientNum < 0 || clientNum >= QS.MAX_CLIENTS) {
		error('GetUsercmd: bad clientNum: ' + clientNum);
	}

	svs.clients[clientNum].lastUserCmd.clone(cmd);
}

/**
 * SendGameServerCommand
 */
function SendGameServerCommand(clientNum, type, val) {
	if (clientNum === null) {
		SendServerCommand(null, type, val);
	} else {
		if (clientNum < 0 || clientNum >= QS.MAX_CLIENTS) {
			error('GetUsercmd: bad clientNum: ' + clientNum);
		}

		SendServerCommand(svs.clients[clientNum], type, val);
	}
}

/**
 * SetBrushModel
 */
function SetBrushModel(gent, name) {
	if (!name) {
		error('SV: SetBrushModel: null');
	}

	if (name.charAt(0) !== '*') {
		error('SV: SetBrushModel: ' + name + 'isn\'t a brush model');
	}

	gent.s.modelIndex = parseInt(name.substr(1), 10);

	var h = CM.InlineModel(gent.s.modelIndex);
	CM.ModelBounds(h, gent.r.mins, gent.r.maxs);
	gent.r.bmodel = true;

	// we don't know exactly what is in the brushes
	gent.r.contents = -1;
}

/**
 * AdjustAreaPortalState
 */
function AdjustAreaPortalState(gent, open) {
	var svEnt = SvEntityForGentity(gent);
	if (svEnt.areanum2 === -1) {
		return;
	}
	CM.AdjustAreaPortalState(svEnt.areanum, svEnt.areanum2, open);
}

/**
 * EntityContact
 */
function EntityContact(mins, maxs, gent) {
	// Check for exact collision.
	var origin = gent.r.currentOrigin;
	var angles = gent.r.currentAngles;

	var ch = ClipHandleForEntity(gent);
	var trace = new QS.TraceResults();

	CM.TransformedBoxTrace(trace, QMath.vec3origin, QMath.vec3origin, mins, maxs, ch, -1, origin, angles);

	return trace.startSolid;
}
		/**
 * BuildClientSnapshot
 *
 * Decides which entities are going to be visible to the client, and
 * copies off the playerstate and areabits.
 */
function BuildClientSnapshot(client, msg) {
	var clent = client.gentity;
	if (!clent || client.state === CS.ZOMBIE) {
		return; // Client hasn't entered world yet.
	}

	// Bump the counter used to prevent double adding.
	sv.snapshotCounter++;

	var frame = client.frames[client.netchan.outgoingSequence % COM.PACKET_BACKUP];
	var clientNum = GetClientNum(client);
	var ps = GM.GetClientPlayerstate(clientNum);

	// Copy the current PlayerState off.
	ps.clone(frame.ps);

	// Never send client's own entity, because it can
	// be regenerated from the playerstate.
	var svEnt = sv.svEntities[clientNum];
	svEnt.snapshotCounter = sv.snapshotCounter;

	var entityNumbers = [];
	AddEntitiesVisibleFromPoint(clent.s.arenaNum, frame.ps.origin, frame, entityNumbers, false);

	frame.numEntities = 0;
	frame.firstEntity = svs.nextSnapshotEntities;

	// Copy the entity states out.
	for (var i = 0; i < entityNumbers.length; i++) {
		var ent = GentityForNum(entityNumbers[i]);
		var state = svs.snapshotEntities[svs.nextSnapshotEntities % MAX_SNAPSHOT_ENTITIES];

		ent.s.clone(state);
		svs.nextSnapshotEntities++;
		frame.numEntities++;
	}
}

/**
 * AddEntitiesVisibleFromPoint
 */
function AddEntitiesVisibleFromPoint(arenaNum, origin, frame, eNums) {
	var leafnum = CM.PointLeafnum(origin);
	var clientarea = CM.LeafArea(leafnum);
	var clientcluster = CM.LeafCluster(leafnum);

	// Calculate the visible areas.
	// frame->areabytes = CM.WriteAreaBits( frame->areabits, clientarea );

	for (var i = 0; i < QS.MAX_GENTITIES; i++) {
		var ent = GentityForNum(i);

		// Never send entities that aren't linked in.
		if (!ent || !ent.r.linked) {
			continue;
		}

		// FIXME Send ents from other arenas when looking through portals.
		if (ent.s.arenaNum !== arenaNum) {
			continue;
		}

		if (ent.s.number !== i) {
			error('Entity number does not match: ent.s.number: ' + ent.s.number + ', i: ' + i);
		}

		// Entities can be flagged to explicitly not be sent to the client.
		if (ent.r.svFlags & GM.SVF.NOCLIENT) {
			continue;
		}

		// Entities can be flagged to be sent to only one client.
		if (ent.r.svFlags & GM.SVF.SINGLECLIENT) {
			if (ent.r.singleClient !== frame.ps.clientNum) {
				continue;
			}
		}

		// Entities can be flagged to be sent to everyone but one client.
		if (ent.r.svFlags & GM.SVF.NOTSINGLECLIENT) {
			if (ent.r.singleClient === frame.ps.clientNum) {
				continue;
			}
		}

		var svEnt = SvEntityForGentity(ent);

		// Don't double add an entity through portals.
		if (svEnt.snapshotCounter === sv.snapshotCounter) {
			continue;
		}

		// Broadcast entities are always sent.
		if (ent.r.svFlags & GM.SVF.BROADCAST) {
			AddEntToSnapshot(svEnt, ent, eNums);
			continue;
		}

		// Ignore if not touching a PVS leaf.
		// Check area.
		if (!CM.AreasConnected(clientarea, svEnt.areanum)) {
			// Doors can legally straddle two areas, so
			// we may need to check another one
			if (!CM.AreasConnected(clientarea, svEnt.areanum2)) {
				continue;  // blocked by a door
			}
		}

		// Check individual leafs.
		if (!svEnt.numClusters ) {
			continue;
		}
		var j = 0;
		var k = 0;
		// bitvector = clientpvs;
		for (j = 0; j < svEnt.numClusters; j++) {
			k = svEnt.clusternums[j];

			if (CM.ClusterVisible(clientcluster, k)) {
				break;
			}
		}

		// If we haven't found it to be visible,
		// check overflow clusters that coudln't be stored.
		if (j === svEnt.numClusters) {
			if (svEnt.lastCluster) {
				for (; k <= svEnt.lastCluster; k++) {
					if (CM.ClusterVisible(clientcluster, k)) {
						break;
					}
				}
				if (k === svEnt.lastCluster ) {
					continue;  // not visible
				}
			} else {
				continue;
			}
		}

		// Add it.
		AddEntToSnapshot(svEnt, ent, eNums);

		// If it's a portal entity, add everything visible from its camera position.
		if (ent.r.svFlags & GM.SVF.PORTAL) {
			if (ent.s.generic1) {
				var dir = vec3.subtract(ent.s.origin, origin, vec3.create());

				if (vec3.squaredLength(dir) > ent.s.generic1 * ent.s.generic1) {
					continue;
				}
			}

			AddEntitiesVisibleFromPoint(arenaNum, ent.s.origin2, frame, eNums);
		}
	}
}

/**
 * AddEntToSnapshot
 */
function AddEntToSnapshot(svEnt, gEnt, eNums) {
	// If we have already added this entity to this snapshot, don't add again.
	if (svEnt.snapshotCounter === sv.snapshotCounter) {
		return;
	}

	svEnt.snapshotCounter = sv.snapshotCounter;

	eNums.push(gEnt.s.number);
}

/**
 * SendClientSnapshot
 */
function SendClientSnapshot(client) {
	// Build the snapshot.
	BuildClientSnapshot(client);

	var msg = new BitStream(svs.msgBuffer);

	msg.writeInt32(client.lastClientCommand);

	// Send any reliable server commands.
	UpdateServerCommandsToClient(client, msg);

	// Send over all the relevant player and entity states.
	WriteSnapshotToClient(client, msg);

	msg.writeInt8(COM.SVM.EOF);

	// Record information about the message
	client.frames[client.netchan.outgoingSequence % COM.PACKET_BACKUP].messageSent = svs.time;
	client.frames[client.netchan.outgoingSequence % COM.PACKET_BACKUP].messageAcked = -1;

	COM.NetchanTransmit(client.netchan, msg.buffer, msg.byteIndex);
}

/**
 * UpdateServerCommandsToClient
 *
 * (re)send all server commands the client hasn't acknowledged yet.
 */
function UpdateServerCommandsToClient(client, msg) {
	// Write any unacknowledged serverCommands.
	for (var i = client.reliableAcknowledge + 1; i <= client.reliableSequence; i++) {
		var cmd = client.reliableCommands[i % COM.MAX_RELIABLE_COMMANDS];

		msg.writeInt8(COM.SVM.serverCommand);
		msg.writeInt32(i);
		msg.writeASCIIString(JSON.stringify(cmd));
	}
}

/**
 * WriteSnapshotToClient
 */
function WriteSnapshotToClient(client, msg) {
	// This is the snapshot we are creating.
	var frame = client.frames[client.netchan.outgoingSequence % COM.PACKET_BACKUP];
	var oldframe = null;
	var lastframe = 0;

	// Try to use a previous frame as the source for delta compressing the snapshot.
	if (client.deltaMessage <= 0 || client.state !== CS.ACTIVE) {
		// Client is asking for a retransmit.
		oldframe = null;
		lastframe = 0;
	} else if (client.netchan.outgoingSequence - client.deltaMessage >= (COM.PACKET_BACKUP - 3)) {
		// Client hasn't gotten a good message through in a long time.
		// log(client.name, ': Delta request from out of date packet.');
		oldframe = null;
		lastframe = 0;
	} else {
		// We have a valid snapshot to delta from
		oldframe = client.frames[client.deltaMessage % COM.PACKET_BACKUP];
		lastframe = client.netchan.outgoingSequence - client.deltaMessage;

		// The snapshot's entities may still have rolled off the buffer, though.
		if (oldframe.firstEntity <= svs.nextSnapshotEntities - svs.numSnapshotEntities) {
			log(client.name, ': Delta request from out of date entities.');
			oldframe = null;
			lastframe = 0;
		}
	}

	msg.writeUint8(COM.SVM.snapshot);

	// Send over the current server time so the client can drift
	// its view of time to try to match.
	var serverTime = sv.time;
	if (client.oldServerTime) {
		// The server has not yet got an acknowledgement of the
		// new gamestate from this client, so continue to send it
		// a time as if the server has not restarted. Note from
		// the client's perspective this time is strictly speaking
		// incorrect, but since it'll be busy loading a map at
		// the time it doesn't really matter.
		serverTime = sv.time + client.oldServerTime;
	}
	msg.writeInt32(serverTime);

	// What we're delta'ing from.
	msg.writeInt8(lastframe);

	var snapFlags = svs.snapFlagServerBit;
	if (client.state !== CS.ACTIVE) {
		snapFlags |= QS.SNAPFLAG_NOT_ACTIVE;
	}
	msg.writeInt32(snapFlags);

	// Delta encode the playerstate.
	COM.WriteDeltaPlayerState(msg, oldframe ? oldframe.ps : null, frame.ps);

	// Delta encode the entities.
	WriteSnapshotEntities(msg, oldframe, frame);
}

/**
 * WriteSnapshotEntities
 */
function WriteSnapshotEntities(msg, from, to) {
	var oldent, newent;
	var oldindex, newindex;
	var oldnum, newnum;
	var fromNumEntities;

	// Generate the delta update.
	fromNumEntities = !from ? 0 : from.numEntities;

	oldent = null;
	newent = null;
	oldindex = 0;
	newindex = 0;

	while (newindex < to.numEntities || oldindex < fromNumEntities) {
		if (newindex >= to.numEntities) {
			newnum = 9999;
		} else {
			newent = svs.snapshotEntities[(to.firstEntity + newindex) % MAX_SNAPSHOT_ENTITIES];
			newnum = newent.number;
		}

		if (oldindex >= fromNumEntities) {
			oldnum = 9999;
		} else {
			oldent = svs.snapshotEntities[(from.firstEntity + oldindex) % MAX_SNAPSHOT_ENTITIES];
			oldnum = oldent.number;
		}

		if (newnum === oldnum) {
			// Delta update from old position.
			// Because the force parm is false, this will not result
			// in any bytes being emited if the entity has not changed at all.
			COM.WriteDeltaEntityState(msg, oldent, newent, false);
			oldindex++;
			newindex++;
			continue;
		}

		if (newnum < oldnum) {
			// This is a new entity, send it from the baseline.
			COM.WriteDeltaEntityState(msg, sv.svEntities[newnum].baseline, newent, true);
			newindex++;
			continue;
		}

		if (newnum > oldnum) {
			// The old entity isn't present in the new message.
			COM.WriteDeltaEntityState(msg, oldent, null, true);
			oldindex++;
			continue;
		}
	}

	msg.writeInt16(QS.MAX_GENTITIES-1);
}

/**
 * SendClientMessages
 */
function SendClientMessages() {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (!client) {
			continue;
		}

		if (!client.state) {
			continue;  // not connected
		}

		if (svs.time - client.lastSnapshotTime < client.snapshotMsec) {
			continue;  // it's not time yet
		}

		SendClientSnapshot(client);
		client.lastSnapshotTime = svs.time;
	}
}
		/**
 * ENTITY CHECKING
 *
 * To avoid linearly searching through lists of entities during environment testing,
 * the world is carved up with an evenly spaced, axially aligned bsp tree.  Entities
 * are kept in chains either at the final leafs, or at the first node that splits
 * them, which prevents having to deal with multiple fragments of a single entity.
 */

var AREA_DEPTH = 4;
var worldSectors;

var WorldSector = function () {
	this.axis = 0; // -1 = leaf node
	this.dist = 0;
	this.children = [null, null];
	this.entities = {};
};

/**
 * CmdSectorList
 */
function CmdSectorList() {
	for (var i = 0; i < worldSectors.length; i++) {
		var node = worldSectors[i];
		log('sector ' + i + ': ' + Object.keys(node.entities).length + ' entities');
	}
}

/**
 * ClearWorld
 */
function ClearWorld() {
	worldSectors = [];

	// get world map bounds
	var worldModel = CM.InlineModel(0);
	var mins = vec3.create();
	var maxs = vec3.create();
	CM.ModelBounds(worldModel, mins, maxs);

	CreateWorldSector(0, mins, maxs);
}

/**
 * CreateWorldSector
 *
 * Builds a uniformly subdivided tree for the given world size
 */
function CreateWorldSector(depth, mins, maxs) {
	var node = worldSectors[worldSectors.length] = new WorldSector();

	if (depth === AREA_DEPTH) {
		node.axis = -1;
		node.children[0] = node.children[1] = null;
		return node;
	}

	var size = vec3.subtract(maxs, mins, vec3.create());
	if (size[0] > size[1]) {
		node.axis = 0;
	} else {
		node.axis = 1;
	}

	var mins1 = vec3.create(mins);
	var mins2 = vec3.create(mins);
	var maxs1 = vec3.create(maxs);
	var maxs2 = vec3.create(maxs);

	node.dist = 0.5 * (maxs[node.axis] + mins[node.axis]);
	maxs1[node.axis] = mins2[node.axis] = node.dist;

	node.children[0] = CreateWorldSector(depth+1, mins2, maxs2);
	node.children[1] = CreateWorldSector(depth+1, mins1, maxs1);

	return node;
}

/**
 * GetEntityDefs
 */
function GetEntityDefs() {
	return sv.world.entities;
}

/**
 * LinkEntity
 */
var MAX_TOTAL_ENT_LEAFS = 128;
var leleafs = new Uint32Array(MAX_TOTAL_ENT_LEAFS);

function LinkEntity(gent) {
	var i, j, k;
	var svEnt = SvEntityForGentity(gent);

	if (svEnt.worldSector) {
		UnlinkEntity(gent);  // unlink from old position
	}

	// Encode the size into the entityState for client prediction.
	if (gent.r.bmodel) {
		gent.s.solid = QS.SOLID_BMODEL; // a solid_box will never create this value
	} else if (gent.r.contents & (SURF.CONTENTS.SOLID | SURF.CONTENTS.BODY)) {
		// Assume that x/y are equal and symetric.
		i = gent.r.maxs[0];
		if (i < 1) {
			i = 1;
		} else if (i > 255) {
			i = 255;
		}

		// z is not symetric.
		j = (-gent.r.mins[2]);
		if (j < 1) {
			j = 1;
		} else if (j > 255) {
			j = 255;
		}

		// And z maxs can be negative...
		k = (gent.r.maxs[2] + 32);
		if (k < 1) {
			k = 1;
		} else if (k > 255) {
			k = 255;
		}

		gent.s.solid = (k << 16) | (j << 8) | i;
	} else {
		gent.s.solid = 0;
	}

	// Get the position.
	var origin = gent.r.currentOrigin;
	var angles = gent.r.currentAngles;

	// Set the abs box.
	if (gent.r.bmodel && (angles[0] || angles[1] || angles[2])) {
		var max = QMath.RadiusFromBounds(gent.r.mins, gent.r.maxs);
		for (i = 0; i < 3; i++) {
			gent.r.absmin[i] = origin[i] - max;
			gent.r.absmax[i] = origin[i] + max;
		}
	} else {
		// Normal
		vec3.add(origin, gent.r.mins, gent.r.absmin);
		vec3.add(origin, gent.r.maxs, gent.r.absmax);
	}

	// Because movement is clipped an epsilon away from an actual edge,
	// we must fully check even when bounding boxes don't quite touch.
	gent.r.absmin[0] -= 1;
	gent.r.absmin[1] -= 1;
	gent.r.absmin[2] -= 1;
	gent.r.absmax[0] += 1;
	gent.r.absmax[1] += 1;
	gent.r.absmax[2] += 1;

	// Link to PVS leafs.
	svEnt.numClusters = 0;
	svEnt.lastCluster = 0;
	svEnt.areanum = -1;
	svEnt.areanum2 = -1;

	// Get all leafs, including solids
	var ll = CM.BoxLeafnums(gent.r.absmin, gent.r.absmax, leleafs, MAX_TOTAL_ENT_LEAFS);

	// If none of the leafs were inside the map, the
	// entity is outside the world and can be considered unlinked
	if (!ll.count) {
		return;
	}

	// Set areas, even from clusters that don't fit in the entity array.
	for (i = 0; i < ll.count; i++) {
		var area = CM.LeafArea(leleafs[i]);

		if (area === -1) {
			continue;
		}

		// Doors may legally straggle two areas,
		// but nothing should ever need more than that/
		if (svEnt.areanum !== -1 && svEnt.areanum !== area) {
			svEnt.areanum2 = area;
		} else {
			svEnt.areanum = area;
		}
	}

	// Store as many explicit clusters as we can.
	svEnt.numClusters = 0;

	for (i = 0; i < ll.count; i++) {
		var cluster = CM.LeafCluster(leleafs[i]);

		if (cluster === -1) {
			continue;
		}

		svEnt.clusternums[svEnt.numClusters++] = cluster;

		if (svEnt.numClusters === MAX_ENT_CLUSTERS) {
			break;
		}
	}

	// Store off a last cluster if we need to.
	if (i !== ll.count) {
		svEnt.lastCluster = CM.LeafCluster(ll.lastLeaf);
	}

	// Find the first world sector node that the ent's box crosses.
	var node = worldSectors[0];

	while (1) {
		if (node.axis == -1) {
			break;
		}

		if (gent.r.absmin[node.axis] > node.dist) {
			node = node.children[0];
		}
		else if (gent.r.absmax[node.axis] < node.dist) {
			node = node.children[1];
		}
		else {
			break; // crosses the node
		}
	}

	// Link it in.
	gent.r.linked = true;
	svEnt.worldSector = node;
	node.entities[gent.s.number] = svEnt;
}

/**
 * UnlinkEntity
 */
function UnlinkEntity(gent) {
	var ent = SvEntityForGentity(gent);
	var node = ent.worldSector;

	if (!node) {
		return;  // not linked in anywhere
	}

	// Unlink.
	gent.r.linked = false;
	delete node.entities[gent.s.number];
	ent.worldSector = null;
}

/**********************************************************
 *
 * Area query
 *
 * Fills in a list of all entities who's absmin / absmax
 * intersects the given bounds. This does NOT mean that
 * they actually touch in the case of bmodels.
 *
 **********************************************************/

/**
 * FindEntitiesInBox
 */
function FindEntitiesInBox(mins, maxs, arenaNum) {
	var entityNums = [];

	var FindEntitiesInBox_r = function (node) {
		for (var num in node.entities) {
			// FIXME Replace node.entities with a better data
			// structure where this slow func isn't necessary.
			// if (!node.entities.hasOwnProperty(num)) {
			// 	continue;
			// }

			var ent = node.entities[num];
			var gent = GentityForSvEntity(ent);

			if (arenaNum !== QS.ARENANUM_NONE && gent.s.arenaNum !== arenaNum) {
				continue;
			}

			if (gent.r.absmin[0] > maxs[0] ||
				gent.r.absmin[1] > maxs[1] ||
				gent.r.absmin[2] > maxs[2] ||
				gent.r.absmax[0] < mins[0] ||
				gent.r.absmax[1] < mins[1] ||
				gent.r.absmax[2] < mins[2]) {
				continue;
			}

			entityNums.push(gent.s.number);
		}

		if (node.axis == -1) {
			return;  // terminal node
		}

		// Recurse down both sides.
		if (maxs[node.axis] > node.dist) {
			FindEntitiesInBox_r(node.children[0]);
		}
		if (mins[node.axis] < node.dist ) {
			FindEntitiesInBox_r(node.children[1]);
		}
	};

	FindEntitiesInBox_r(worldSectors[0]);

	return entityNums;
}

/**********************************************************
 *
 * Trace through the world and entities
 *
 **********************************************************/
var moveclip = function () {
	this.boxmins       = vec3.create();                        // enclose the test object along entire move
	this.boxmaxs       = vec3.create();
	this.mins          = vec3.create();
	this.maxs          = vec3.create();
	this.start         = vec3.create();
	this.end           = vec3.create();
	this.trace         = new QS.TraceResults();
	this.arenaNum      = 0;
	this.passEntityNum = 0;
	this.contentmask   = 0;
};
var clip = new moveclip();

/**
 * Trace
 *
 * Moves the given mins/maxs volume through the world from start to end.
 * passEntityNum and entities owned by passEntityNum are explicitly not checked.
 */
function Trace(results, start, end, mins, maxs, arenaNum, passEntityNum, contentmask) {
	if (!mins) {
		mins = vec3.create();
	}
	if (!maxs) {
		maxs = vec3.create();
	}

	// Clip to world.
	CM.BoxTrace(clip.trace, start, end, mins, maxs, 0, contentmask);

	clip.trace.entityNum = clip.trace.fraction !== 1.0 ? QS.ENTITYNUM_WORLD : QS.ENTITYNUM_NONE;

	if (clip.trace.fraction === 0) {
		clip.trace.clone(results);
		return;  // blocked immediately by the world
	}

	clip.contentmask = contentmask;
	vec3.set(start, clip.start);
	vec3.set(end, clip.end);
	vec3.set(mins, clip.mins);
	vec3.set(maxs, clip.maxs);
	clip.arenaNum = arenaNum;
	clip.passEntityNum = passEntityNum;

	// Create the bounding box of the entire move.
	// We can limit it to the part of the move not
	// already clipped off by the world, which can be
	// a significant savings for line of sight and shot traces.
	for (var i = 0; i < 3; i++) {
		if (end[i] > start[i]) {
			clip.boxmins[i] = clip.start[i] + clip.mins[i] - 1;
			clip.boxmaxs[i] = clip.end[i] + clip.maxs[i] + 1;
		} else {
			clip.boxmins[i] = clip.end[i] + clip.mins[i] - 1;
			clip.boxmaxs[i] = clip.start[i] + clip.maxs[i] + 1;
		}
	}

	// Clip to other solid entities.
	ClipMoveToEntities(clip);

	clip.trace.clone(results);
}

/**
 * ClipMoveToEntities
 */
function ClipMoveToEntities(clip) {
	var origin = vec3.create();
	var angles = vec3.create();
	var passOwnerNum = -1;
	var trace = new QS.TraceResults();

	var touchlist = FindEntitiesInBox(clip.boxmins, clip.boxmaxs, clip.arenaNum);

	if (clip.passEntityNum !== QS.ENTITYNUM_NONE) {
		passOwnerNum = (GentityForNum(clip.passEntityNum)).r.ownerNum;
		if (passOwnerNum === QS.ENTITYNUM_NONE) {
			passOwnerNum = -1;
		}
	}

	for (var i = 0; i < touchlist.length; i++) {
		if (clip.trace.allSolid) {
			return;
		}

		var touch = GentityForNum(touchlist[i]);

		// See if we should ignore this entity.
		if (clip.passEntityNum !== QS.ENTITYNUM_NONE) {
			if (touchlist[i] === clip.passEntityNum) {
				continue;  // don't clip against the pass entity
			}
			if (touch.r.ownerNum === clip.passEntityNum) {
				continue;  // don't clip against own missiles
			}
			if (touch.r.ownerNum === passOwnerNum) {
				continue;  // don't clip against other missiles from our owner
			}
		}

		// If it doesn't have any brushes of a type we
		// are looking for, ignore it.
		if (!(clip.contentmask & touch.r.contents)) {
			continue;
		}

		// Might intersect, so do an exact clip.
		var clipHandle = ClipHandleForEntity(touch);

		vec3.set(touch.r.currentOrigin, origin);
		vec3.set(touch.r.currentAngles, angles);
		if (!touch.r.bmodel) {
			angles[0] = angles[1] = angles[2] = 0;  // boxes don't rotate
		}

		CM.TransformedBoxTrace(trace, clip.start, clip.end, clip.mins, clip.maxs,
			clipHandle, clip.contentmask, origin, angles);

		if (trace.allSolid) {
			clip.trace.allSolid = true;
			trace.entityNum = touch.s.number;
		} else if (trace.startSolid) {
			clip.trace.startSolid = true;
			trace.entityNum = touch.s.number;
		}

		if (trace.fraction < clip.trace.fraction) {
			// Make sure we keep a startSolid from a previous trace.
			var oldStart = clip.trace.startSolid;

			trace.entityNum = touch.s.number;
			trace.clone(clip.trace);
			clip.trace.startSolid |= oldStart;
		}
	}
}

/**
 * ClipHandleForEntity
 *
 * Returns a headnode that can be used for testing or clipping to a
 * given entity. If the entity is a bsp model, the headnode will
 * be returned, otherwise a custom box tree will be constructed.
 */
function ClipHandleForEntity(ent) {
	if (ent.r.bmodel) {
		// Explicit hulls in the BSP model.
		return CM.InlineModel(ent.s.modelIndex);
	}

	// Create a temp tree from bounding box sizes.
	return CM.TempBoxModel(ent.r.mins, ent.r.maxs);
}

/**
 * PointContents
 */
function PointContents(p, arenaNum, passEntityNum) {
	// Get base contents from world.
	var c = CM.PointContents(p, 0);

	// Or in contents from all the other entities.
	var touchlist = FindEntitiesInBox(p, p, arenaNum);

	for (var i = 0; i < touchlist.length; i++) {
		if (touchlist[i] === passEntityNum) {
			continue;
		}

		var hit = GentityForNum(touchlist[i]);

		// Might intersect, so do an exact clip.
		var clipHandle = ClipHandleForEntity(hit);
		var angles = QMath.vec3origin;
		if (hit.r.bmodel) {
			angles = hit.r.currentAngles;
		}

		var c2 = CM.TransformedPointContents(p, clipHandle, hit.r.currentOrigin, angles);

		c |= c2;
	}

	return c;
}

		return {
			Init:               Init,
			Running:            Running,
			Frame:              Frame,
			PacketEvent:        PacketEvent,
			ClientDisconnected: ClientDisconnected,
			Kill:               Kill
		};
	}

	return Server;
});

/**
 * This module is used by the dedicated server to stub
 * the client, sound and ui modules.
 */
define('client/cl',[],function () {
	return function () {};
});
/*global vec3: true, mat4: true */

define('common/com',['require','vendor/async','vendor/bit-buffer','common/qmath','common/qshared','common/bsp-serializer','common/cvar','server/sv','client/cl'],function (require) {
	var async         = require('vendor/async');
	var BitStream     = require('vendor/bit-buffer').BitStream;
	var QMath         = require('common/qmath');
	var QS            = require('common/qshared');
	var BspSerializer = require('common/bsp-serializer');
	var Cvar          = require('common/cvar');
	var Server        = require('server/sv');
	var Client        = require('client/cl');

	var MAX_MAP_AREA_BYTES = 32;  // bit vector of area visibility

/**********************************************************
 *
 * System events
 *
 **********************************************************/
var SE = {
	KEYDOWN: 0,
	KEYUP:   1,
	CHAR:    2,
	MOUSE:   3
};

/**********************************************************
 *
 * Networking
 *
 **********************************************************/
var PACKET_BACKUP         = 32;     // number of old messages that must be kept on client and
                                    // server for delta comrpession and ping estimation
var MAX_PACKET_USERCMDS   = 32;     // max number of usercmd_t in a packet
var MAX_RELIABLE_COMMANDS = 64;     // max string commands buffered for restransmit
var MAX_MSGLEN            = 16384;

var CLM = {
	bad:           0,
	move:          1,  // [[UserCmd]
	moveNoDelta:   2,  // [[UserCmd]
	clientCommand: 3,  // [string] message
	EOF:           4
};

var SVM = {
	bad:            0,
	gamestate:      1,
	configstring:   2,  // [short] [string] only in gamestate messages
	baseline:       3,  // only in gamestate messages
	serverCommand:  4,  // [string] to be executed by client game module
	snapshot:       5,
	EOF:            6
};

var NetChan = function () {
	this.incomingSequence = 0;
	this.outgoingSequence = 1;      // start at 1 for delta checks
	this.ready            = false;
	this.socket           = null;   // meta socket
};
	var commands = {};

/**
 * RegisterCommands
 */
function RegisterCommands() {
	AddCmd('set',   CmdSet);
	AddCmd('unset', CmdUnset);
	AddCmd('echo',  CmdEcho);
	AddCmd('vstr',  CmdVstr);
}

/**
 * AddCmd
 */
function AddCmd(cmd, callback) {
	commands[cmd] = callback;
}

/**
 * GetCmd
 */
function GetCmd(cmd) {
	return commands[cmd];
}

/**
 * CmdSet
 */
function CmdSet(name) {
	var cvar = Cvar.GetCvar(name);

	if (!cvar) {
		// If there is no cvar for this name, create one.
		cvar = Cvar.AddCvar(name, undefined, Cvar.FLAGS.ARCHIVE | Cvar.FLAGS.USER_CREATED);
	}

	if (cvar.flags() & Cvar.FLAGS.ROM) {
		log('Can\'t modify internal cvars');
		return;
	}

	// Pull and concat value from args.
	var values = Array.prototype.slice.call(arguments, 1);
	var value = values.join(' ');

	cvar.set(value);
}

/**
 * CmdUnset
 */
function CmdUnset(name, value) {
	var cvar = Cvar.AddCvar(name);

	if (!cvar) {
		// Nothing to unset.
		return;
	}

	cvar(cvar.defaultValue());
}

/**
 * CmdEcho
 */
function CmdEcho(name) {
	var cvar = Cvar.GetCvar(name);

	if (!cvar) {
		return;
	}

	log(name, 'is:', cvar.get(), ', default:', cvar.defaultValue());
}

/**
 * CmdVstr
 *
 * Inserts the current value of a variable as command text.
 */
function CmdVstr(name) {
	var cvar = Cvar.GetCvar(name);
	if (!cvar) {
		log('vstr <variablename> : execute a variable command');
		return;
	}

	ExecuteBuffer(cvar.get());
}
	var SYS,
	CL,
	SV;

var com_filecdn,
	com_protocol,
	com_speeds;

var dedicated,
	events,
	frameTime,
	lastFrameTime,
	frameNumber,
	logCallback,
	initialized;

/**
 * log
 */
function log() {
	if (logCallback) {
		logCallback.apply(this, arguments);
		return;
	}

	if (CL) {
		var str = Array.prototype.join.call(arguments, ' ');
		CL.PrintConsole(str);
	}

	Function.apply.call(console.log, console, arguments);
}

/**
 * error
 */
function error(str) {
	log(str);

	if (CL) {
		CL.Disconnect();
	}

	SV.Kill();

	SYS.Error(str);
}

/**
 * BeginRedirect
 */
function BeginRedirect(callback) {
	logCallback = callback;
}

/**
 * EndRedirect
 */
function EndRedirect() {
	logCallback = null;
}

/**
 * Init
 */
function Init(inSYS, inDedicated, callback) {
	SYS = inSYS;
	if (!inDedicated) {
		CL = new Client(GetExports());
	}
	SV = new Server(GetExports());

	dedicated = inDedicated;
	events = [];
	frameTime = lastFrameTime = SYS.GetMilliseconds();
	frameNumber = 0;
	initialized = false;

	RegisterCvars();
	RegisterCommands();

	// Register bind commands early to support LoadConfig.
	if (CL) {
		CL.RegisterKeyCommands();
	}

	// Load config and then client / server modules.
	async.waterfall([
		function (cb) {
			LoadConfig(cb);
		},
		function (cb) {
			// Go ahead and execute any cvars from the startup commands.
			ExecuteStartupCommands(true, cb);
		},
		function (cb) {
			if (!CL) {
				return cb();
			}

			CL.Init(SV, cb);
		},
		function (cb) {
			SV.Init(CL, cb);
		},
		function (cb) {
			// Wait until after CL / SV have initialized to run commands.
			ExecuteStartupCommands(false, cb);
		}
	], function (err) {
		if (err) {
			error(err.message);
			return;
		}

		initialized = true;
		callback(null);
	});
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	// TODO Enable servers to override, or append a fallback to this,
	// to provide custom maps / mods to clients.
	com_filecdn  = Cvar.AddCvar('com_filecdn', 'http://content.quakejs.com',  Cvar.FLAGS.ARCHIVE);
	com_protocol = Cvar.AddCvar('com_protocol', QS.PROTOCOL_VERSION,          Cvar.FLAGS.ROM);
	com_speeds   = Cvar.AddCvar('com_speeds',   0);
}

/**
 * Frame
 */
function Frame() {
	lastFrameTime = frameTime;
	frameTime = SYS.GetMilliseconds();

	if (!initialized) {
		return;
	}

	var msec = frameTime - lastFrameTime;
	var timeBeforeEvents, timeBeforeServer, timeBeforeClient, timeAfter;

	CheckSaveConfig();

	timeBeforeEvents = SYS.GetMilliseconds();

	EventLoop();

	timeBeforeServer = SYS.GetMilliseconds();

	SV.Frame(msec);

	timeBeforeClient = SYS.GetMilliseconds();

	if (CL) {
		CL.Frame(msec);
	}

	timeAfter = SYS.GetMilliseconds();

	// Report timing information.
	if (com_speeds.get()) {
		var all, ev, sv, cl;

		all = timeAfter - timeBeforeEvents;
		sv = timeBeforeClient- timeBeforeServer;
		ev = timeBeforeServer - timeBeforeEvents;
		cl = timeAfter - timeBeforeClient;

		log('frame:', frameNumber++, 'all:', all, 'ev:', ev, 'sv:', sv, 'cl:', cl);
	}
}

/**
 * EventLoop
 */
function EventLoop() {
	var ev = events.shift();

	while (ev) {
		switch (ev.type) {
			case SE.KEYDOWN:
				CL.KeyDownEvent(ev.data);
				break;

			case SE.KEYUP:
				CL.KeyUpEvent(ev.data);
				break;

			case SE.CHAR:
				CL.KeyPressEvent(ev.data);
				break;

			case SE.MOUSE:
				CL.MouseMoveEvent(ev.data);
				break;
		}

		ev = events.shift();
	}
}

/**
 * QueueEvent
 */
function QueueEvent(type, data) {
	data = data || {};
	data.time = SYS.GetMilliseconds();

	events.push({ type: type, data: data });
}

/**
 * SplitBuffer
 */

// Splits by non-quoted semicolons.
var splitRegex = /(?:\"[^\"]*\"|[^;])+/g;

function SplitBuffer(buffer) {
	var matches = buffer.match(splitRegex);

	if (!matches) {
		return null;
	}

	for (var i = 0; i < matches.length; i++) {
		matches[i] = matches[i].replace(/^\s+|\s+$/g, '');
	}

	return matches;
}

/**
 * SplitArguments
 */

// This regex will split space delimited strings,
// honoring quotation mark groups.
var argsRegex = /([^"\s]+)|"((?:\\"|[^"])+)"/g;

function SplitArguments(buffer) {
	var args = [];

	var m;
	while ((m = argsRegex.exec(buffer))) {
		var val = m[1] || m[2];

		// Unescape quotes.
		val = val.replace(/\\"/g, '"');

		args.push(val);
	}

	return args;
}

/**
 * ExecuteStartupCommands
 */
function ExecuteStartupCommands(cvarsOnly, callback) {
	var startup = SYS.GetStartupCommands();

	var tasks = [];

	// Split and merge all commands into a flat list.
	var cmds = [];

	startup.forEach(function (cmd) {
		var split = SplitBuffer(cmd);

		if (split) {
			cmds.push.apply(cmds, split);
		}
	});

	cmds.forEach(function (cmd) {
		var args = SplitArguments(cmd);

		if (cvarsOnly && args[0] !== 'set') {
			return;
		} else if (!cvarsOnly && args[0] === 'set') {
			return;
		}

		tasks.push(function (cb) {
			ExecuteBuffer(cmd, cb);
		});
	});

	// Execute tasks.
	async.series(tasks, function (err) {
		callback(err);
	});
}

/**
 * ExecuteBuffer
 */
function ExecuteBuffer(buffer, callback) {
	var matches = SplitBuffer(buffer);

	if (!matches) {
		if (callback) {
			callback(new Error('Failed to parse buffer.'));
		}
		return;
	}

	// Queue up all of the tasks.
	var tasks = [];

	matches.forEach(function (buffer) {
		var args = SplitArguments(buffer);
		var cmd = args[0];

		var cmdcb = GetCmd(cmd);

		// Special casing for now since it's the only async
		// command.
		// FIXME: Add COM.AddCmdAsync?
		if (cmd === 'exec') {
			tasks.push(function (cb) {
				ExecuteFile(args[1], cb);
			});
		}
		// Try to look up the cmd in the registered cmds.
		else if (cmdcb) {
			tasks.push(function (cb) {
				cmdcb.apply(this, args.slice(1));
				cb(null);
			});
		}
		// If cb is explicitly null, forward this command to
		// the server.
		else if (cmdcb === null) {
			tasks.push(function (cb) {
				CL.ForwardCommandToServer(args);
				cb(null);
			});
		}
		else {
			log('Unknown command for \'' + buffer + '\'');
		}
	});

	// Execute tasks.
	async.series(tasks, function (err) {
		if (callback) {
			callback(err);
		}
	});
}

/**
 * ExecuteFile
 */
function ExecuteFile(filename, callback) {
	if (!filename) {
		log('Enter a filename to execeute.');

		if (callback) {
			callback(new Error('Enter a filename to execeute.'));
		}
		return;
	}

	SYS.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			log('Failed to execute \'' + filename + '\'');

			if (callback) {
				callback(err);
			}
			return;
		}

		// Split by newline.
		var lines = data.split(/[\r\n]+|\r+|\n+/);

		var tasks = [];
		lines.forEach(function (line) {
			// Trim and ignore blank lines.
			line = line.replace(/^\s+|\s+$/g, '');
			if (!line) {
				return;
			}

			tasks.push(function (cb) {
				ExecuteBuffer(line, cb);
			});
		});

		// Execute all of the commands.
		async.series(tasks, function (err) {
			callback(err);
		});
	});
}

/**
 * CheckSaveConfig
 */
function CheckSaveConfig() {
	// Only save if we've modified an archive cvar.
	if (!Cvar.Modified(Cvar.FLAGS.ARCHIVE) && !(CL && CL.BindsModified())) {
		return;
	}

	Cvar.ClearModified(Cvar.FLAGS.ARCHIVE);

	if (CL) {
		CL.ClearBindsModified();
	}

	SaveConfig();
}

/**
 * LoadConfig
 */
function LoadConfig(callback) {
	ExecuteFile('user.cfg', function (err) {
		// If any archived cvars are modified after this, we will trigger a
		// writing of the config file.
		Cvar.ClearModified(Cvar.FLAGS.ARCHIVE);

		callback(null);
	});
}

/**
 * SaveConfig
 */
function SaveConfig() {
	var filename = 'user.cfg';

	log('Saving config to', filename);

	var cfg = '';
	cfg = WriteCvars(cfg);
	if (CL) {
		cfg = CL.WriteBindings(cfg);
	}

	SYS.WriteFile(filename, cfg, 'utf8', function () {});
}

/**
 * WriteCvars
 */
function WriteCvars(str) {
	var cvars = Cvar.GetCvarJSON(Cvar.FLAGS.ARCHIVE);

	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		str += 'set ' + name + ' \"' + cvars[name] + '\"\n';
	}

	return str;
}

/**
 * GetExports
 */
function GetExports() {
	var exports = {
		SYS: SYS,
		COM: {
			MAX_MAP_AREA_BYTES:    MAX_MAP_AREA_BYTES,
			PACKET_BACKUP:         PACKET_BACKUP,
			MAX_PACKET_USERCMDS:   MAX_PACKET_USERCMDS,
			MAX_RELIABLE_COMMANDS: MAX_RELIABLE_COMMANDS,
			MAX_MSGLEN:            MAX_MSGLEN,
			CLM:                   CLM,
			SVM:                   SVM,
			Log:                   log,
			Error:                 error,
			BeginRedirect:         BeginRedirect,
			EndRedirect:           EndRedirect,
			ExecuteBuffer:         ExecuteBuffer,
			LoadConfig:            LoadConfig,
			SaveConfig:            SaveConfig,
			AddCmd:                AddCmd,
			GetCmd:                GetCmd,
			WriteDeltaUsercmd:     WriteDeltaUsercmd,
			ReadDeltaUsercmd:      ReadDeltaUsercmd,
			WriteDeltaPlayerState: WriteDeltaPlayerState,
			ReadDeltaPlayerState:  ReadDeltaPlayerState,
			WriteDeltaEntityState: WriteDeltaEntityState,
			ReadDeltaEntityState:  ReadDeltaEntityState,
			StringToAddr:          StringToAddr,
			SockToString:          SockToString,
			NetConnect:            NetConnect,
			NetListen:             NetListen,
			NetSend:               NetSend,
			NetOutOfBandPrint:     NetOutOfBandPrint,
			NetClose:              NetClose,
			NetchanSetup:          NetchanSetup,
			NetchanTransmit:       NetchanTransmit,
			NetchanProcess:        NetchanProcess,
			LoadBsp:               LoadBsp
		}
	};

	Object.defineProperty(exports.COM, 'frameTime', {
		get: function () { return frameTime; }
	});

	return exports;
}

	//
// Helper functions to get/set object properties based on a string.
//
var FLOAT64 = 0;
var INT8    = 1;
var UINT8   = 2;
var UINT16  = 3;
var UINT32  = 4;

function fnread(bits) {
	switch (bits) {
		case FLOAT64:
			return 'readFloat64';
		case INT8:
			return 'readInt8';
		case UINT8:
			return 'readUint8';
		case UINT16:
			return 'readUint16';
		case UINT32:
			return 'readUint32';
		default:
			throw new Error('fnread: bad bit count ' + bits);
	}
}

function fnwrite(bits) {
	switch (bits) {
		case FLOAT64:
			return 'writeFloat64';
		case INT8:
			return 'writeInt8';
		case UINT8:
			return 'writeUint8';
		case UINT16:
			return 'writeUint16';
		case UINT32:
			return 'writeUint32';
		default:
			throw new Error('fnwrite: bad bit count ' + bits);
	}
}

/**********************************************************
 *
 * Usercmd communication
 *
 **********************************************************/
var dummyUsercmd = new QS.UserCmd();

// var kbitmask = [
// 	0x00000001, 0x00000003, 0x00000007, 0x0000000F,
// 	0x0000001F, 0x0000003F, 0x0000007F, 0x000000FF,
// 	0x000001FF, 0x000003FF, 0x000007FF, 0x00000FFF,
// 	0x00001FFF, 0x00003FFF, 0x00007FFF, 0x0000FFFF,
// 	0x0001FFFF, 0x0003FFFF, 0x0007FFFF, 0x000FFFFF,
// 	0x001FFFFf, 0x003FFFFF, 0x007FFFFF, 0x00FFFFFF,
// 	0x01FFFFFF, 0x03FFFFFF, 0x07FFFFFF, 0x0FFFFFFF,
// 	0x1FFFFFFF, 0x3FFFFFFF, 0x7FFFFFFF, 0xFFFFFFFF
// ];

function WriteDeltaKey(msg, key, oldV, newV, bits) {
	if (oldV === newV) {
		msg.writeBits(0, 1);
		return;
	}
	msg.writeBits(1, 1);
	msg.writeBits(newV/* ^ key*/, bits);
}

function ReadDeltaKey(msg, key, oldV, bits) {
	if (msg.readBits(1)) {
		// Negative bits are signed.
		return msg.readBits(Math.abs(bits), (bits < 0))/* ^ (key & kbitmask[bits])*/;
	}
	return oldV;
}

function WriteDeltaUsercmd(msg, from, to) {
	if (!from) {
		from = dummyUsercmd;
	}

	if (to.serverTime - from.serverTime < 256) {
		msg.writeBits(1, 1);
		msg.writeBits(to.serverTime - from.serverTime, 8);
	} else {
		msg.writeBits(0, 1);
		msg.writeBits(to.serverTime, 32);
	}

	if (from.angles[0] === to.angles[0] &&
		from.angles[1] === to.angles[1] &&
		from.angles[2] === to.angles[2] &&
		from.forwardmove === to.forwardmove &&
		from.rightmove === to.rightmove &&
		from.upmove === to.upmove &&
		from.buttons === to.buttons &&
		from.weapon === to.weapon) {
			msg.writeBits(0, 1);  // no change
			return;
	}

	// key ^= to.serverTime;

	msg.writeBits(1, 1);  // change

	WriteDeltaKey(msg, 0/*key*/, from.angles[0], to.angles[0], 16);
	WriteDeltaKey(msg, 0/*key*/, from.angles[1], to.angles[1], 16);
	WriteDeltaKey(msg, 0/*key*/, from.angles[2], to.angles[2], 16);
	WriteDeltaKey(msg, 0/*key*/, from.forwardmove, to.forwardmove, 8);
	WriteDeltaKey(msg, 0/*key*/, from.rightmove, to.rightmove, 8);
	WriteDeltaKey(msg, 0/*key*/, from.upmove, to.upmove, 8);
	WriteDeltaKey(msg, 0/*key*/, from.buttons, to.buttons, 16);
	WriteDeltaKey(msg, 0/*key*/, from.weapon, to.weapon, 8);
}

function ReadDeltaUsercmd(msg, from, to) {
	if (!from) {
		from = dummyUsercmd;
	}

	if (msg.readBits(1)) {
		to.serverTime = from.serverTime + msg.readBits(8);
	} else {
		to.serverTime = msg.readBits(32);
	}

	if (msg.readBits(1)) {
		// key ^= to.serverTime;
		to.angles[0] = ReadDeltaKey(msg, 0/*key*/, from.angles[0], 16);
		to.angles[1] = ReadDeltaKey(msg, 0/*key*/, from.angles[1], 16);
		to.angles[2] = ReadDeltaKey(msg, 0/*key*/, from.angles[2], 16);
		to.forwardmove = ReadDeltaKey(msg, 0/*key*/, from.forwardmove, -8);
		to.rightmove = ReadDeltaKey(msg, 0/*key*/, from.rightmove, -8);
		to.upmove = ReadDeltaKey(msg, 0/*key*/, from.upmove, -8);
		to.buttons = ReadDeltaKey(msg, 0/*key*/, from.buttons, 16);
		to.weapon = ReadDeltaKey(msg, 0/*key*/, from.weapon, 8);
	} else {
		to.angles[0] = from.angles[0];
		to.angles[1] = from.angles[1];
		to.angles[2] = from.angles[2];
		to.forwardmove = from.forwardmove;
		to.rightmove = from.rightmove;
		to.upmove = from.upmove;
		to.buttons = from.buttons;
		to.weapon = from.weapon;
	}
}

/**********************************************************
 *
 * Playerstate communication
 *
 **********************************************************/

var playerStateFields = [
	{ path: QS.FTA('commandTime'),       bits: UINT32  },
	{ path: QS.FTA('origin[0]'),         bits: FLOAT64 },
	{ path: QS.FTA('origin[1]'),         bits: FLOAT64 },
	{ path: QS.FTA('bobCycle'),          bits: UINT8   },
	{ path: QS.FTA('velocity[0]'),       bits: FLOAT64 },
	{ path: QS.FTA('velocity[1]'),       bits: FLOAT64 },
	{ path: QS.FTA('viewangles[1]'),     bits: FLOAT64 },
	{ path: QS.FTA('viewangles[0]'),     bits: FLOAT64 },
	{ path: QS.FTA('weaponTime'),        bits: UINT16  },
	{ path: QS.FTA('origin[2]'),         bits: FLOAT64 },
	{ path: QS.FTA('velocity[2]'),       bits: FLOAT64 },
	{ path: QS.FTA('legsTimer'),         bits: UINT8   },
	{ path: QS.FTA('pm_time'),           bits: UINT16  },
	{ path: QS.FTA('eventSequence'),     bits: UINT16  },
	{ path: QS.FTA('torsoAnim'),         bits: UINT8   },
	{ path: QS.FTA('movementDir'),       bits: UINT8   }, /*4*/
	{ path: QS.FTA('events[0]'),         bits: UINT8   },
	{ path: QS.FTA('legsAnim'),          bits: UINT8   },
	{ path: QS.FTA('events[1]'),         bits: UINT8   },
	{ path: QS.FTA('pm_flags'),          bits: UINT16  },
	{ path: QS.FTA('groundEntityNum'),   bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('weaponState'),       bits: UINT8   }, /*4*/
	{ path: QS.FTA('eFlags'),            bits: UINT16  },
	{ path: QS.FTA('externalEvent'),     bits: UINT16  }, /*10*/
	{ path: QS.FTA('gravity'),           bits: UINT16  },
	{ path: QS.FTA('speed'),             bits: UINT16  },
	{ path: QS.FTA('delta_angles[1]'),   bits: UINT16  },
	{ path: QS.FTA('externalEventParm'), bits: UINT8   },
	{ path: QS.FTA('viewheight'),        bits: UINT8   },
	{ path: QS.FTA('damageEvent'),       bits: UINT8   },
	{ path: QS.FTA('damageYaw'),         bits: UINT8   },
	{ path: QS.FTA('damagePitch'),       bits: UINT8   },
	{ path: QS.FTA('damageCount'),       bits: UINT8   },
	{ path: QS.FTA('generic1'),          bits: UINT8   },
	{ path: QS.FTA('pm_type'),           bits: UINT8   },
	{ path: QS.FTA('delta_angles[0]'),   bits: UINT16  },
	{ path: QS.FTA('delta_angles[2]'),   bits: UINT16  },
	{ path: QS.FTA('torsoTimer'),        bits: UINT16  }, /*12*/
	{ path: QS.FTA('eventParms[0]'),     bits: UINT8   },
	{ path: QS.FTA('eventParms[1]'),     bits: UINT8   },
	{ path: QS.FTA('clientNum'),         bits: UINT8   },
	{ path: QS.FTA('weapon'),            bits: UINT8   }, /*5*/
	{ path: QS.FTA('viewangles[2]'),     bits: FLOAT64 },
	// { path: QS.FTA('grapplePoint[0]'),   bits: FLOAT64 },
	// { path: QS.FTA('grapplePoint[1]'),   bits: FLOAT64 },
	// { path: QS.FTA('grapplePoint[2]'),   bits: FLOAT64 },
	{ path: QS.FTA('jumppad_ent'),       bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('loopSound'),         bits: UINT16  },
	{ path: QS.FTA('arenaNum'),          bits: UINT16  }
];

var dummyPlayerState = new QS.PlayerState();

/**
 * WriteDeltaPlayerState
 */
function WriteDeltaPlayerState(msg, from, to) {
	var i, lastChanged;
	var field, fromF, toF, func;

	if (!from) {
		from = dummyPlayerState;
	}

	// Figure out the last changed field.
	lastChanged = 0;
	for (i = 0; i < playerStateFields.length; i++) {
		field = playerStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);

		if (fromF !== toF) {
			lastChanged = i + 1;
		}
	}

	msg.writeUint8(lastChanged);

	// Write out up to last changed, prefixing each field with a
	// 0 or 1 to indicated if they've changed.
	for (i = 0; i < lastChanged; i++) {
		field = playerStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);
		if (fromF === toF) {
			msg.writeBits(0, 1);  // no change
			continue;
		}

		msg.writeBits(1, 1);  // changed

		func = fnwrite(field.bits);

		msg[func](QS.AGET(to, field.path));
	}

	// Write out a 0 or 1 before each array indicating if
	// it's changed as well asa mask for each array describing
	// which of its elements have changed.
	var statsbits      = 0,
		persistantbits = 0,
		powerupbits    = 0,
		ammobits       = 0;

	for (i = 0; i < QS.MAX_STATS; i++) {
		if (to.stats[i] !== from.stats[i]) {
			statsbits |= 1 << i;
		}
	}
	for (i = 0; i < QS.MAX_PERSISTANT; i++) {
		if (to.persistant[i] !== from.persistant[i]) {
			persistantbits |= 1 << i;
		}
	}
	for (i = 0; i < QS.MAX_POWERUPS; i++) {
		if (to.powerups[i] !== from.powerups[i]) {
			powerupbits |= 1 << i;
		}
	}
	for (i = 0; i < QS.MAX_WEAPONS; i++) {
		if (to.ammo[i] !== from.ammo[i]) {
			ammobits |= 1 << i;
		}
	}

	if (!statsbits && !persistantbits && !powerupbits && !ammobits) {
		msg.writeBits(0, 1);  // no change
		return;
	}

	msg.writeBits(1, 1);  // changed

	if (statsbits) {
		msg.writeBits(1, 1);  // change
		msg.writeBits(statsbits, QS.MAX_STATS);
		for (i = 0; i < QS.MAX_STATS; i++) {
			if (statsbits & (1 << i)) {
				msg.writeInt16(to.stats[i]);
			}
		}
	} else {
		msg.writeBits(0, 1);  // no change
	}

	if (persistantbits) {
		msg.writeBits(1, 1);  // change
		msg.writeBits(persistantbits, QS.MAX_PERSISTANT);
		for (i = 0; i < QS.MAX_PERSISTANT; i++) {
			if (persistantbits & (1 << i)) {
				msg.writeInt16(to.persistant[i]);
			}
		}
	} else {
		msg.writeBits(0, 1);  // no change
	}

	if (powerupbits) {
		msg.writeBits(1, 1);  // change
		msg.writeBits(powerupbits, QS.MAX_POWERUPS);
		for (i = 0; i < QS.MAX_POWERUPS; i++) {
			if (powerupbits & (1 << i)) {
				msg.writeInt16(to.powerups[i]);
			}
		}
	} else {
		msg.writeBits(0, 1);  // no change
	}

	if (ammobits) {
		msg.writeBits(1, 1);  // change
		msg.writeBits(ammobits, QS.MAX_WEAPONS);
		for (i = 0; i < QS.MAX_WEAPONS; i++) {
			if (ammobits & (1 << i)) {
				msg.writeInt16(to.ammo[i]);
			}
		}
	} else {
		msg.writeBits(0, 1);  // no change
	}
}

function ReadDeltaPlayerState(msg, from, to) {
	var i, lastChanged;
	var idx, field, fromF, toF, func;

	if (!from) {
		from = dummyPlayerState;
	}

	// Clone the initial state.
	from.clone(to);

	// Get the last field index changed.
	lastChanged = msg.readUint8();

	if (lastChanged > playerStateFields.length || lastChanged < 0) {
		error('invalid playerState field count');
	}

	for (i = 0; i < lastChanged; i++) {
		if (!msg.readBits(1)) {
			continue;  // no change
		}

		field = playerStateFields[i];
		func = fnread(field.bits);
		QS.ASET(to, field.path, msg[func]());
	}

	if (msg.readBits(1)) {
		if (msg.readBits(1)) {
			var statsbits = msg.readBits(QS.MAX_STATS);
			for (i = 0; i < QS.MAX_STATS; i++) {
				if (statsbits & (1 << i)) {
					to.stats[i] = msg.readInt16();
				}
			}
		}

		if (msg.readBits(1)) {
			var persistantbits = msg.readBits(QS.MAX_PERSISTANT);
			for (i = 0; i < QS.MAX_PERSISTANT; i++) {
				if (persistantbits & (1 << i)) {
					to.persistant[i] = msg.readInt16();
				}
			}
		}

		if (msg.readBits(1)) {
			var powerupbits = msg.readBits(QS.MAX_POWERUPS);
			for (i = 0; i < QS.MAX_POWERUPS; i++) {
				if (powerupbits & (1 << i)) {
					to.powerups[i] = msg.readInt16();
				}
			}
		}

		if (msg.readBits(1)) {
			var ammobits = msg.readBits(QS.MAX_WEAPONS);
			for (i = 0; i < QS.MAX_WEAPONS; i++) {
				if (ammobits & (1 << i)) {
					to.ammo[i] = msg.readInt16();
				}
			}
		}
	}
}

/**********************************************************
 *
 * Entitystate communication
 *
 **********************************************************/

var entityStateFields = [
	{ path: QS.FTA('arenaNum'),        bits: UINT16  },
	{ path: QS.FTA('pos.trTime'),      bits: UINT32  },
	{ path: QS.FTA('pos.trBase[0]'),   bits: FLOAT64 },
	{ path: QS.FTA('pos.trBase[1]'),   bits: FLOAT64 },
	{ path: QS.FTA('pos.trDelta[0]'),  bits: FLOAT64 },
	{ path: QS.FTA('pos.trDelta[1]'),  bits: FLOAT64 },
	{ path: QS.FTA('pos.trBase[2]'),   bits: FLOAT64 },
	{ path: QS.FTA('apos.trBase[1]'),  bits: FLOAT64 },
	{ path: QS.FTA('pos.trDelta[2]'),  bits: FLOAT64 },
	{ path: QS.FTA('apos.trBase[0]'),  bits: FLOAT64 },
	{ path: QS.FTA('event'),           bits: UINT16  }, /*10*/
	{ path: QS.FTA('angles2[1]'),      bits: FLOAT64 },
	{ path: QS.FTA('eType'),           bits: UINT8   },
	{ path: QS.FTA('torsoAnim'),       bits: UINT8   },
	{ path: QS.FTA('eventParm'),       bits: UINT8   },
	{ path: QS.FTA('legsAnim'),        bits: UINT8   },
	{ path: QS.FTA('groundEntityNum'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('pos.trType'),      bits: UINT8   },
	{ path: QS.FTA('eFlags'),          bits: UINT32  }, /*19*/
	{ path: QS.FTA('otherEntityNum'),  bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('weapon'),          bits: UINT8   },
	{ path: QS.FTA('clientNum'),       bits: UINT8   },
	{ path: QS.FTA('angles[1]'),       bits: FLOAT64 },
	{ path: QS.FTA('pos.trDuration'),  bits: UINT32  },
	{ path: QS.FTA('apos.trType'),     bits: UINT8   },
	{ path: QS.FTA('origin[0]'),       bits: FLOAT64 },
	{ path: QS.FTA('origin[1]'),       bits: FLOAT64 },
	{ path: QS.FTA('origin[2]'),       bits: FLOAT64 },
	{ path: QS.FTA('solid'),           bits: UINT32  }, /*24*/
	{ path: QS.FTA('powerups'),        bits: UINT16  }, /*QS.MAX_POWERUPS*/
	{ path: QS.FTA('modelIndex'),      bits: UINT8   },
	{ path: QS.FTA('otherEntityNum2'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('loopSound'),       bits: UINT8   },
	{ path: QS.FTA('generic1'),        bits: UINT8   },
	{ path: QS.FTA('origin2[2]'),      bits: FLOAT64 },
	{ path: QS.FTA('origin2[0]'),      bits: FLOAT64 },
	{ path: QS.FTA('origin2[1]'),      bits: FLOAT64 },
	{ path: QS.FTA('modelIndex2'),     bits: UINT8   },
	{ path: QS.FTA('angles[0]'),       bits: FLOAT64 },
	{ path: QS.FTA('time'),            bits: UINT32  },
	{ path: QS.FTA('apos.trTime'),     bits: UINT32  },
	{ path: QS.FTA('apos.trDuration'), bits: UINT32  },
	{ path: QS.FTA('apos.trBase[2]'),  bits: FLOAT64 },
	{ path: QS.FTA('apos.trDelta[0]'), bits: FLOAT64 },
	{ path: QS.FTA('apos.trDelta[1]'), bits: FLOAT64 },
	{ path: QS.FTA('apos.trDelta[2]'), bits: FLOAT64 },
	{ path: QS.FTA('time2'),           bits: UINT32  },
	{ path: QS.FTA('angles[2]'),       bits: FLOAT64 },
	{ path: QS.FTA('angles2[0]'),      bits: FLOAT64 },
	{ path: QS.FTA('angles2[2]'),      bits: FLOAT64 },
	{ path: QS.FTA('constantLight'),   bits: UINT32  },
	{ path: QS.FTA('frame'),           bits: UINT16  }
];

/**
 * WriteDeltaEntityState
 *
 * Writes part of a packetentities message, including the entity number.
 * Can delta from either a baseline or a previous packet_entity.
 * If to is NULL, a remove entity update will be sent.
 * If force is not set, then nothing at all will be generated if the entity is
 * identical, under the assumption that the in-order delta code will catch it.
 */
function WriteDeltaEntityState(msg, from, to, force) {
	var i, lastChanged;
	var field, fromF, toF, func;

	// A null to is a delta remove message.
	if (to === null) {
		if (from === null) {
			return;
		}
		msg.writeInt16(from.number);  /* GENTITYNUM_BITS */
		msg.writeBits(1, 1);
		return;
	}

	// Sanity check.
	if (to.number < 0 || to.number >= QS.MAX_GENTITIES) {
		throw new Error('WriteDeltaEntityState: Bad entity number: ', to.number);
	}

	// Figure out the number of fields that have changed.
	lastChanged = 0;
	for (i = 0; i < entityStateFields.length; i++) {
		field = entityStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);

		if (fromF !== toF) {
			lastChanged = i + 1;
		}
	}

	if (lastChanged === 0) {
		// Nothing at all changed.
		if (!force) {
			return;  // write nothing
		}

		msg.writeInt16(to.number);  /* GENTITYNUM_BITS */
		msg.writeBits(0, 1);  // not removed
		msg.writeBits(0, 1);  // no delta
		return;
	}

	msg.writeInt16(to.number); /* GENTITYNUM_BITS */
	msg.writeBits(0, 1);  // not removed
	msg.writeBits(1, 1);  // we have a delta
	msg.writeInt8(lastChanged); // number of fields changed

	// Write out each field that has changed, prefixing
	// the field with a 0 or 1 denoting if it's changed.
	for (i = 0; i < lastChanged; i++) {
		field = entityStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);
		if (fromF === toF) {
			msg.writeBits(0, 1);  // no change
			continue;
		}

		msg.writeBits(1, 1);  // no change

		func = fnwrite(field.bits);

		msg[func](QS.AGET(to, field.path));
	}
}

/**
 * ReadDeltaEntityState
 *
 * The entity number has already been read from the message, which
 * is how the from state is identified.
 *
 * If the delta removes the entity, entityState.number will be set to QS.MAX_GENTITIES-1.
 *
 * Can go from either a baseline or a previous packet entity.
 */
function ReadDeltaEntityState(msg, from, to, number) {
	var i, lastChanged;
	var idx, field, fromF, toF, func;

	if (number < 0 || number >= QS.MAX_GENTITIES) {
		throw new Error('Bad delta entity number: ', number);
	}

	// Check for a remove.
	if (msg.readBits(1)) {
		to.reset();
		to.number = QS.MAX_GENTITIES - 1;
		return;
	}

	// Clone the initial state.
	from.clone(to);
	to.number = number;

	// Check for no delta.
	if (!msg.readBits(1)) {
		return;
	}

	// Get the last changed field index.
	lastChanged = msg.readInt8();

	// Read all the changed fields.
	for (i = 0; i < lastChanged; i++) {
		if (!msg.readBits(1)) {
			continue;  // not changed
		}

		field = entityStateFields[i];
		func = fnread(field.bits);

		QS.ASET(to, field.path, msg[func]());
	}
}

	var MAX_LOOPBACK  = 16;

// Global loopback accept handler.
var loopbackAccept = null;

var msgBuffer = new ArrayBuffer(MAX_MSGLEN);

var LoopbackSocket = function () {
	this.remoteSocket = null;
	this.onopen       = null;
	this.onmessage    = null;
	this.onclose      = null;
	this.msgs         = new Array(MAX_LOOPBACK);
	this.send         = 0;

	for (var i = 0; i < MAX_LOOPBACK; i++) {
		this.msgs[i] = new ArrayBuffer(MAX_MSGLEN);
	}
};

/**
 * StringToAddr
 */
function StringToAddr(str) {
	if (!str) {
		return null;
	}

	var addr = new QS.NetAdr();

	if (str.indexOf('localhost') !== -1) {
		addr.type = QS.NA.LOOPBACK;
		addr.ip = 'localhost';
		addr.port = 0;
		return addr;
	}

	addr.type = QS.NA.IP;

	var split = str.split(':');
	if (!split.length) {
		return null;
	}

	var port = parseInt(split[1], 10);
	if (isNaN(port)) {
		port = 80;
	}

	addr.ip = split[0];
	addr.port = port;

	return addr;
}

/**
 * SockToString
 */
function SockToString(socket) {
	if (socket instanceof LoopbackSocket) {
		return 'loopback';
	}

	return SYS.SockToString(socket);
}

/**
 * NetConnect
 */
function NetConnect(addr, opts) {
	var socket;

	// Client attempting to connect to faux loopback server.
	if (addr.type === QS.NA.LOOPBACK) {
		socket = new LoopbackSocket();

		// Create the loop.
		socket.remoteSocket = new LoopbackSocket();
		socket.remoteSocket.remoteSocket = socket;

		// Go ahead and trigger fake open / accept events.
		setTimeout(function () {
			if (!loopbackAccept) {
				socket.onclose && socket.onclose();
				return;
			}

			socket.onopen && socket.onopen();

			loopbackAccept(socket.remoteSocket);
		}, 0);
	} else {
		socket = SYS.NetConnect(addr.ip, addr.port);
	}

	socket.onopen = opts.onopen;
	socket.onmessage = opts.onmessage;
	socket.onclose = opts.onclose;

	return socket;
}

/**
 * NetListen
 */
function NetListen(addr, opts) {
	if (addr.type === QS.NA.LOOPBACK) {
		loopbackAccept = opts.onaccept;
		return;
	}

	SYS.NetListen(addr.ip, addr.port, opts);
}

/**
 * NetSendLoopPacket
 */
function NetSendLoopPacket(socket, view) {
	// Copy buffer to loopback view.
	var loopbackView = new Uint8Array(socket.msgs[socket.send++ % MAX_LOOPBACK]);
	for (var i = 0; i < view.length; i++) {
		loopbackView[i] = view[i];
	}

	// Trigger a fake message event on the remote socket.
	setTimeout(function () {
		socket.remoteSocket.onmessage && socket.remoteSocket.onmessage(loopbackView);
	}, 0);
}

/**
 * NetSend
 */
function NetSend(socket, view) {
	if (socket instanceof LoopbackSocket) {
		NetSendLoopPacket(socket, view);
		return;
	}

	SYS.NetSend(socket, view);
}

/**
 * NetOutOfBandPrint
 */
function NetOutOfBandPrint(socket, type, data) {
	var msg = new BitStream(msgBuffer);

	var str = JSON.stringify({
		type: type,
		data: data
	});

	msg.writeInt32(-1);
	msg.writeASCIIString(str);

	// Create a new view representing the contents of the message.
	var msgView = new Uint8Array(msg.buffer, 0, msg.byteIndex);

	NetSend(socket, msgView);
}

/**
 * NetClose
 */
function NetClose(socket) {
	if (socket instanceof LoopbackSocket) {
		// Trigger fake close event on both the client and server
		// so they both clean up properly.
		setTimeout(function () {
			socket.onclose && socket.onclose();
		}, 0);

		if (socket.remoteSocket) {
			setTimeout(function () {
				socket.remoteSocket.onclose && socket.remoteSocket.onclose();
			}, 0);
		}
		return;
	}

	SYS.NetClose(socket);
}

/**
 * NetchanSetup
 */
function NetchanSetup(socket) {
	var netchan = new NetChan();

	netchan.socket = socket;

	return netchan;
}

/**
 * NetchanTransmit
 */
function NetchanTransmit(netchan, buffer, length) {
	var msg = new BitStream(msgBuffer);

	// Write out the buffer to our internal message buffer.
	var bufferView = new Uint8Array(buffer);

	msg.writeInt32(netchan.outgoingSequence++);

	for (var i = 0; i < length; i++) {
		msg.writeUint8(bufferView[i]);
	}

	// Create a new view representing the contents of the message.
	var msgView = new Uint8Array(msg.buffer, 0, msg.byteIndex);

	NetSend(netchan.socket, msgView);
}

/**
 * NetchanProcess
 */
function NetchanProcess(netchan, msg) {
	var sequence = msg.readInt32();
	netchan.incomingSequence = sequence;
	return true;
}
	/**
 * LoadBsp
 */
function LoadBsp(mapname, callback) {
	SYS.ReadFile('maps/' + mapname + '.bsp', 'binary', function (err, data) {
		if (err) {
			return callback(err);
		}

		try {
			var world = BspSerializer.deserialize(data);
			callback(null, world);
		} catch (e) {
			callback(e);
		}
	});
}

// /**
//  * LoadMap
//  */
// function LoadMap(mapname, callback) {
// 	SYS.ReadFile('maps/' + mapname + '.map', 'utf8', function (err, data) {
// 		if (err) {
// 			return callback(err);
// 		}

// 		var map = MapSerializer.deserialize(data);
// 		var bsp = MapCompiler.compile(map);

// 		callback(null, bsp);
// 	});
// }

	return {
		PACKET_BACKUP: PACKET_BACKUP,

		SE:            SE,

		Init:          Init,
		Frame:         Frame,
		ExecuteBuffer: ExecuteBuffer,
		QueueEvent:    QueueEvent
	};
});

/*jshint node: true */
/*global setMatrixArrayType: true */

// r.js sucks in node require() calls as dependencies when using the
// simplified CommonJS module definition syntax we use for all other
// modules, so here we use the standard AMD definition.
define('system/dedicated/sys',[
	'vendor/async',
	'vendor/gl-matrix',
	'common/qshared',
	'common/com',
	'common/cvar'
],
function (async, glmatrix, QS, COM, Cvar) {
	

	/**
 * MetaSockets are the object we pass to the
 * cl, sv and com layers instead of the raw
 * WebSocket instance.
 */
var MetaSocket = function (handle) {
	this.handle    = handle;
	this.onopen    = null;
	this.onmessage = null;
	this.onclose   = null;
};
	// Proxies are namespaced callbacks used to enable modules
// to shutdown, preventing any pending callbacks from
// being executed.
var proxies = {};

/**
 * IsLocalFile
 *
 * Load files in root from local machine
 * (e.g. user.cfg and custom .cfg files).
 */
function IsLocalFile(path) {
	if (!path.match(/[\\\/]+/)) {
		return true;
	}

	return false;
}

/**
 * CancelFileCallbacks
 */
function CancelFileCallbacks(namespace) {
	var pending = proxies[namespace];

	if (!pending) {
		return;
	}

	for (var i = 0; i < pending.length; i++) {
		pending[i].active = false;
	}
}

/**
 * ProxyFileCallback
 */
function ProxyFileCallback(namespace, callback) {
	var fn = function () {
		if (!fn.active) {
			return;
		}

		return callback.apply(this, arguments);
	};

	fn.active = true;

	if (!proxies[namespace]) {
		proxies[namespace] = [];
	}

	proxies[namespace].push(fn);

	return fn;
}

/**
 * ReadFile
 */
function ReadFile(path, encoding, callback, namespace) {
	if (typeof(namespace) !== 'undefined') {
		callback = ProxyFileCallback(namespace, callback);
	}

	if (IsLocalFile(path)) {
		ReadLocalFile(path, encoding, callback);
	} else {
		ReadRemoteFile(path, encoding, callback);
	}
}

/**
 * WriteFile
 */
function WriteFile(path, data, encoding, callback, namespace) {
	if (typeof(namespace) !== 'undefined') {
		callback = ProxyFileCallback(namespace, callback);
	}

	var local = IsLocalFile(path);

	if (!local) {
		error('Can\'t write to remote files.');
		return;
	}

	WriteLocalFile(path, data, encoding, callback);
}
	var net = require('net');
var readline = require('readline');

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'SYS:');
	Function.apply.call(console.log, console, args);
}

/**
 * error
 */
function error(str) {
	console.trace();
	console.error(str);
	process.exit(0);
}

/**
 * Init
 */
function Init() {
	log('Starting dedicated server for version', QS.GAME_VERSION);

	// Override gl-matrix's default array type.
	setMatrixArrayType(Array);

	InitConsole();

	// Initialize the game.
	COM.Init(GetExports(), true, function () {
		// Start main loop.
		setInterval(function () {
			COM.Frame();
		}, 0);
	});
}

/**
 * InitConsole
 */
function InitConsole() {
	// If the stdin fd is bad, catch the error.
	process.stdin.on('error', function (err) {
		log('Error reading stdin:', err);
	});

	// Create readline interface.
	var rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	}).on('line', function (line) {
		// FIXME should queue an event, not directly execute.
		COM.ExecuteBuffer(line);

		rl.prompt(true);
	}).on('close', function () {
		log('stdin stream closed.');
	});

	rl.prompt(true);
}

/**
 * GetStartupCommands
 */
function GetStartupCommands() {
	var args = process.argv.slice(2);

	var cmds = [];

	args.forEach(function (arg) {
		if (arg.indexOf('--cmd') !== 0) {
			return;
		}

		var cmd = arg.substr(6);
		cmds.push(cmd);
	});

	return cmds;
}

/**
 * FullscreenChanged
 */
function FullscreenChanged() {
	error('FullscreenChanged: Should not happen');
}

/**
 * GetGLContext
 */
function GetGLContext() {
	error('GetGLContext: Should not happen');
}

/**
 * GetUIContext
 */
function GetUIContext() {
	error('GetUIContext: Should not happen');
}

/**
 * GetMilliseconds
 */
var timeBase;
function GetMilliseconds() {
	var time = process.hrtime();

	if (!timeBase) {
		timeBase = time[0] * 1000 + parseInt(time[1] / 1000000, 10);
	}

	return (time[0] * 1000 + parseInt(time[1] / 1000000, 10)) - timeBase;
}

/**
 * GetExports
 */
function GetExports() {
	return {
		Error:              error,
		GetMilliseconds:    GetMilliseconds,
		GetStartupCommands: GetStartupCommands,
		ReadFile:           ReadFile,
		WriteFile:          WriteFile,
		GetGLContext:       GetGLContext,
		GetUIContext:       GetUIContext,
		SockToString:       SockToString,
		NetListen:          NetListen,
		NetConnect:         NetConnect,
		NetSend:            NetSend,
		NetClose:           NetClose
	};
}
	var fs = require('fs');
var http = require('http');

/**
 * ReadLocalFile
 */
function ReadLocalFile(path, encoding, callback) {
	fs.readFile(path, encoding, function (err, data) {
		if (err) {
			log(err);
			return callback(err);
		}

		return callback(null, data);
	});
}

/**
 * ReadRemoteFile
 */
function ReadRemoteFile(path, encoding, callback) {
	var binary = encoding === 'binary';

	var com_filecdn = Cvar.AddCvar('com_filecdn');
	path = com_filecdn.get() + '/assets/' + path + '?v=' + QS.GAME_VERSION;

	http.get(path, function (res) {
		if (res.statusCode !== 200) {
			return callback(new Error('Failed to read remote file at \'' + path + '\'. Invalid HTTP response code ' + res.statusCode));
		}

		if (binary) {
			var length = res.headers['content-length'];
			var buffer = new ArrayBuffer(length);
			var view = new Uint8Array(buffer);
			var index = 0;

			res.on('data', function (chunk) {
				for (var i = 0, l = chunk.length; i < l; i++) {
					view[index++] = chunk[i];
				}
			}).on('end', function (err) {
				callback(null, buffer);
			});
		} else {
			var str = '';
			res.on('data', function (chunk) {
				str += chunk;
			}).on('end', function () {
				callback(null, str);
			});
		}
	}).on('error', function (err) {
		callback(new Error('Failed to read file: ' + path));
	});
}

/**
 * WriteLocalFile
 */
function WriteLocalFile(path, data, encoding, callback) {
	fs.writeFile(path, data, encoding, function (err) {
		if (err) {
			return callback(err);
		}

		return callback(null);
	});
}
	var http = require('http');
var url = require('url');
var WebSocketClient = require('ws');
var WebSocketServer = require('ws').Server;

/**
 * SockToString
 */
function SockToString(msocket) {
	return msocket.handle._socket.remoteAddress.toString();
}

/**
 * NetListen
 */
function NetListen(ip, port, opts) {
	var server = http.createServer();

	var wss = new WebSocketServer({
		server: server
	});

	wss.on('connection', function (ws) {
		// If a request handler was specified, call it.
		if (opts.onrequest && !opts.onrequest(ws._socket.remoteAddress)) {
			log((new Date()) + ' Connection from origin ' + ws._socket.origin + ' rejected.');
			ws.close();
			return;
		}

		var msocket = new MetaSocket(ws);

		// Persist the events down to the optional event handlers.
		ws.on('message', function (message) {
			var view = new Uint8Array(message);

			msocket.onmessage && msocket.onmessage(view);
		});

		ws.on('error', function () {
			msocket.onclose && msocket.onclose();
		});

		ws.on('close', function () {
			msocket.onclose && msocket.onclose();
		});

		// Trigger the onaccept callback.
		opts.onaccept && opts.onaccept(msocket);
	});

	log((new Date()), 'Attempting to start game server on', ip, port);

	server.listen(port, ip, function() {
		log((new Date()), 'Game server is listening on port', server.address().address, server.address().port);
	});
}

/**
 * NetConnect
 */
function NetConnect(ip, port) {
	var ws = new WebSocketClient('ws://' + ip + ':' + port);

	var msocket = new MetaSocket(ws);

	// Persist the events down to the optional event handlers.
	ws.on('open', function () {
		msocket.onopen && msocket.onopen();
	});

	ws.on('message', function (data, flags) {
		if (!flags.binary) {
			return;  // not supported
		}

		msocket.onmessage && msocket.onmessage(data);
	});

	ws.on('error', function () {
		msocket.onclose && msocket.onclose();
	});

	ws.on('close', function () {
		msocket.onclose && msocket.onclose();
	});

	return msocket;
}

/**
 * NetSend
 */
function NetSend(msocket, buffer) {
	var ws = msocket.handle;

	try {
		ws.send(buffer, { binary: true });
	} catch (e) {
		log('NetSend:', e.message);

		NetClose(msocket);
	}
}

/**
 * NetClose
 */
function NetClose(msocket) {
	var ws = msocket.handle;
	try {
		ws.close();
	} catch (e) {
		log('NetClose:', e.message);
	}
}

	return {
		Init: Init
	};
});

