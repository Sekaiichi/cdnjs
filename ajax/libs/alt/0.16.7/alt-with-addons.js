(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Alt = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = require('./components/AltContainer.js');

},{"./components/AltContainer.js":2}],2:[function(require,module,exports){
(function (global){
/**
 * AltContainer.
 *
 * There are many ways to use AltContainer.
 *
 * Using the `stores` prop.
 *
 * <AltContainer stores={{ FooStore: FooStore }}>
 *   children get this.props.FooStore.storeData
 * </AltContainer>
 *
 * You can also pass in functions.
 *
 * <AltContainer stores={{ FooStore: function () { return { storeData: true } } }}>
 *   children get this.props.FooStore.storeData
 * </AltContainer>
 *
 * Using the `store` prop.
 *
 * <AltContainer store={FooStore}>
 *   children get this.props.storeData
 * </AltContainer>
 *
 * Passing in `flux` because you're using alt instances
 *
 * <AltContainer flux={flux}>
 *   children get this.props.flux
 * </AltContainer>
 *
 * Using a custom render function.
 *
 * <AltContainer
 *   render={function (props) {
 *     return <div />;
 *   }}
 * />
 *
 * Using the `transform` prop.
 *
 * <AltContainer
 *   stores={{ FooStore: FooStore, BarStore: BarStore }}
 *   transform={function(stores) {
 *     var FooStore = stores.FooStore;
 *     var BarStore = stores.BarStore;
 *     var products =
 *       FooStore.products
 *         .slice(0, 10)
 *         .concat(BarStore.products);
 *     return { products: products };
 *   }}
 * >
 *   children get this.props.products
 * </AltContainer>
 *
 * Full docs available at http://goatslacker.github.io/alt/
 */
'use strict';

var React = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);
var mixinContainer = require('./mixinContainer');
var assign = require('../utils/functions').assign;

var AltContainer = React.createClass(assign({
  displayName: 'AltContainer',

  render: function render() {
    return this.altRender('div');
  }
}, mixinContainer(React)));

module.exports = AltContainer;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils/functions":27,"./mixinContainer":3}],3:[function(require,module,exports){
'use strict';

var Subscribe = require('../mixins/Subscribe');
var assign = require('../utils/functions').assign;

function id(it) {
  return it;
}

function getStateFromStore(store, props) {
  return typeof store === 'function' ? store(props).value : store.getState();
}

function getStateFromKey(actions, props) {
  return typeof actions === 'function' ? actions(props) : actions;
}

function mixinContainer(React) {
  var cloneWithProps = React.addons.cloneWithProps;

  return {
    contextTypes: {
      flux: React.PropTypes.object
    },

    childContextTypes: {
      flux: React.PropTypes.object
    },

    getChildContext: function getChildContext() {
      var flux = this.props.flux || this.context.flux;
      return flux ? { flux: flux } : {};
    },

    getInitialState: function getInitialState() {
      if (this.props.stores && this.props.store) {
        throw new ReferenceError('Cannot define both store and stores');
      }

      return this.reduceState(this.props);
    },

    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
      this.destroySubscriptions();
      this.setState(this.reduceState(nextProps));
      this.registerStores(nextProps);
    },

    componentDidMount: function componentDidMount() {
      this.registerStores(this.props);
    },

    componentWillUnmount: function componentWillUnmount() {
      this.destroySubscriptions();
    },

    registerStores: function registerStores(props) {
      var stores = props.stores;
      Subscribe.create(this);

      if (props.store) {
        this.addSubscription(props.store);
      } else if (props.stores) {
        if (Array.isArray(stores)) {
          stores.forEach(function (store) {
            this.addSubscription(store);
          }, this);
        } else {
          Object.keys(stores).forEach(function (formatter) {
            this.addSubscription(stores[formatter]);
          }, this);
        }
      }
    },

    destroySubscriptions: function destroySubscriptions() {
      Subscribe.destroy(this);
    },

    getStateFromStores: function getStateFromStores(props) {
      var stores = props.stores;
      if (props.store) {
        return getStateFromStore(props.store, props);
      } else if (props.stores) {
        // If you pass in an array of stores then we are just listening to them
        // it should be an object then the state is added to the key specified
        if (!Array.isArray(stores)) {
          return Object.keys(stores).reduce(function (obj, key) {
            obj[key] = getStateFromStore(stores[key], props);
            return obj;
          }, {});
        }
      } else {
        return {};
      }
    },

    getStateFromActions: function getStateFromActions(props) {
      if (props.actions) {
        return getStateFromKey(props.actions, props);
      } else {
        return {};
      }
    },

    getInjected: function getInjected(props) {
      if (props.inject) {
        return Object.keys(props.inject).reduce(function (obj, key) {
          obj[key] = getStateFromKey(props.inject[key], props);
          return obj;
        }, {});
      } else {
        return {};
      }
    },

    reduceState: function reduceState(props) {
      return assign({}, this.getStateFromStores(props), this.getStateFromActions(props), this.getInjected(props));
    },

    addSubscription: function addSubscription(store) {
      if (typeof store === 'function') {
        Subscribe.add(this, store(this.props).store, this.altSetState);
      } else {
        Subscribe.add(this, store, this.altSetState);
      }
    },

    altSetState: function altSetState() {
      this.setState(this.reduceState(this.props));
    },

    getProps: function getProps() {
      var flux = this.props.flux || this.context.flux;
      var transform = typeof this.props.transform === 'function' ? this.props.transform : id;
      return transform(assign(flux ? { flux: flux } : {}, this.state));
    },

    shouldComponentUpdate: function shouldComponentUpdate() {
      return this.props.shouldComponentUpdate ? this.props.shouldComponentUpdate(this.getProps()) : true;
    },

    altRender: function altRender(Node) {
      var children = this.props.children;
      // Custom rendering function
      if (typeof this.props.render === 'function') {
        return this.props.render(this.getProps());
      } else if (this.props.component) {
        return React.createElement(this.props.component, this.getProps());
      }

      // Does not wrap child in a div if we don't have to.
      if (Array.isArray(children)) {
        return React.createElement(Node, null, children.map(function (child, i) {
          return cloneWithProps(child, assign({ key: i }, this.getProps()));
        }, this));
      } else if (children) {
        return cloneWithProps(children, this.getProps());
      } else {
        return React.createElement(Node, this.getProps());
      }
    }
  };
}

module.exports = mixinContainer;

},{"../mixins/Subscribe":4,"../utils/functions":27}],4:[function(require,module,exports){
'use strict';
var Symbol = require('es-symbol');
var MIXIN_REGISTRY = Symbol('alt store listeners');

var Subscribe = {
  create: function create(context) {
    context[MIXIN_REGISTRY] = context[MIXIN_REGISTRY] || [];
  },

  add: function add(context, store, handler) {
    context[MIXIN_REGISTRY].push({ store: store, handler: handler });
    store.listen(handler);
  },

  destroy: function destroy(context) {
    context[MIXIN_REGISTRY].forEach(function (x) {
      x.store.unlisten(x.handler);
    });
    context[MIXIN_REGISTRY] = [];
  },

  listeners: function listeners(context) {
    return context[MIXIN_REGISTRY];
  }
};

module.exports = Subscribe;

},{"es-symbol":5}],5:[function(require,module,exports){
"use strict";

var globalSymbolRegistryList = {};

// Aliases & Helpers
var make = Object.create;
var defProps = Object.defineProperties;
var defProp = Object.defineProperty;
var defValue = function (value) {
  var opts = arguments[1] === undefined ? {} : arguments[1];
  return {
    value: value,
    configurable: !!opts.c,
    writable: !!opts.w,
    enumerable: !!opts.e
  };
};
var isSymbol = function (symbol) {
  return symbol && symbol[xSymbol.toStringTag] === "Symbol";
};

var supportsAccessors = undefined;
try {
  var x = defProp({}, "y", { get: function () {
      return 1;
    } });
  supportsAccessors = x.y === 1;
} catch (e) {
  supportsAccessors = false;
}

var id = {};
var uid = function (desc) {
  desc = String(desc);
  var x = "";
  var i = 0;
  while (id[desc + x]) {
    x = i += 1;
  }
  id[desc + x] = 1;

  var tag = "Symbol(" + desc + "" + x + ")";

  /* istanbul ignore else */
  if (supportsAccessors) {
    // Make the symbols hidden to pre-es6 code
    defProp(Object.prototype, tag, {
      get: undefined,
      set: function (value) {
        defProp(this, tag, defValue(value, { c: true, w: true }));
      },
      configurable: true,
      enumerable: false
    });
  }

  return tag;
};

// The base symbol
var SymbolProto = make(null);

// 19.4.1.1
function xSymbol(descString) {
  if (this instanceof xSymbol) {
    throw new TypeError("Symbol is not a constructor");
  }

  descString = descString === undefined ? "" : String(descString);

  var tag = uid(descString);

  /* istanbul ignore next */
  if (!supportsAccessors) {
    return tag;
  }

  return make(SymbolProto, {
    __description__: defValue(descString),
    __tag__: defValue(tag)
  });
}

defProps(xSymbol, {
  // 19.4.2.1
  "for": defValue(function (key) {
    var stringKey = String(key);

    if (globalSymbolRegistryList[stringKey]) {
      return globalSymbolRegistryList[stringKey];
    }

    var symbol = xSymbol(stringKey);
    globalSymbolRegistryList[stringKey] = symbol;

    return symbol;
  }),

  // 19.4.2.5
  keyFor: defValue(function (sym) {
    if (supportsAccessors && !isSymbol(sym)) {
      throw new TypeError("" + sym + " is not a symbol");
    }

    for (var key in globalSymbolRegistryList) {
      if (globalSymbolRegistryList[key] === sym) {
        return supportsAccessors ? globalSymbolRegistryList[key].__description__ : globalSymbolRegistryList[key].substr(7, globalSymbolRegistryList[key].length - 8);
      }
    }
  })
});

// 6.1.5.1
defProps(xSymbol, {
  hasInstance: defValue(xSymbol("hasInstance")),
  isConcatSpreadable: defValue(xSymbol("isConcatSpreadable")),
  iterator: defValue(xSymbol("iterator")),
  match: defValue(xSymbol("match")),
  replace: defValue(xSymbol("replace")),
  search: defValue(xSymbol("search")),
  species: defValue(xSymbol("species")),
  split: defValue(xSymbol("split")),
  toPrimitive: defValue(xSymbol("toPrimitive")),
  toStringTag: defValue(xSymbol("toStringTag")),
  unscopables: defValue(xSymbol("unscopables"))
});

// 19.4.3
defProps(SymbolProto, {
  constructor: defValue(xSymbol),

  // 19.4.3.2
  toString: defValue(function () {
    return this.__tag__;
  }),

  // 19.4.3.3
  valueOf: defValue(function () {
    return "Symbol(" + this.__description__ + ")";
  })
});

// 19.4.3.5
/* istanbul ignore else */
if (supportsAccessors) {
  defProp(SymbolProto, xSymbol.toStringTag, defValue("Symbol", { c: true }));
}

module.exports = typeof Symbol === "function" ? Symbol : xSymbol;


},{}],6:[function(require,module,exports){
'use strict';

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} once Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Holds the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  if (!this._events || !this._events[event]) return [];
  if (this._events[event].fn) return [this._events[event].fn];

  for (var i = 0, l = this._events[event].length, ee = new Array(l); i < l; i++) {
    ee[i] = this._events[event][i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  if (!this._events || !this._events[event]) return false;

  var listeners = this._events[event]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this);

  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = listener;
  else {
    if (!this._events[event].fn) this._events[event].push(listener);
    else this._events[event] = [
      this._events[event], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true);

  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = listener;
  else {
    if (!this._events[event].fn) this._events[event].push(listener);
    else this._events[event] = [
      this._events[event], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, once) {
  if (!this._events || !this._events[event]) return this;

  var listeners = this._events[event]
    , events = [];

  if (fn) {
    if (listeners.fn && (listeners.fn !== fn || (once && !listeners.once))) {
      events.push(listeners);
    }
    if (!listeners.fn) for (var i = 0, length = listeners.length; i < length; i++) {
      if (listeners[i].fn !== fn || (once && !listeners[i].once)) {
        events.push(listeners[i]);
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[event] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[event];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[event];
  else this._events = {};

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the module.
//
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.EventEmitter2 = EventEmitter;
EventEmitter.EventEmitter3 = EventEmitter;

//
// Expose the module.
//
module.exports = EventEmitter;

},{}],7:[function(require,module,exports){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

module.exports.Dispatcher = require('./lib/Dispatcher')

},{"./lib/Dispatcher":8}],8:[function(require,module,exports){
/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * @typechecks
 */

"use strict";

var invariant = require('./invariant');

var _lastID = 1;
var _prefix = 'ID_';

/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *    CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *
 *         case 'city-update':
 *           FlightPriceStore.price =
 *             FlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

  function Dispatcher() {
    this.$Dispatcher_callbacks = {};
    this.$Dispatcher_isPending = {};
    this.$Dispatcher_isHandled = {};
    this.$Dispatcher_isDispatching = false;
    this.$Dispatcher_pendingPayload = null;
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   *
   * @param {function} callback
   * @return {string}
   */
  Dispatcher.prototype.register=function(callback) {
    var id = _prefix + _lastID++;
    this.$Dispatcher_callbacks[id] = callback;
    return id;
  };

  /**
   * Removes a callback based on its token.
   *
   * @param {string} id
   */
  Dispatcher.prototype.unregister=function(id) {
    invariant(
      this.$Dispatcher_callbacks[id],
      'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
      id
    );
    delete this.$Dispatcher_callbacks[id];
  };

  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   *
   * @param {array<string>} ids
   */
  Dispatcher.prototype.waitFor=function(ids) {
    invariant(
      this.$Dispatcher_isDispatching,
      'Dispatcher.waitFor(...): Must be invoked while dispatching.'
    );
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this.$Dispatcher_isPending[id]) {
        invariant(
          this.$Dispatcher_isHandled[id],
          'Dispatcher.waitFor(...): Circular dependency detected while ' +
          'waiting for `%s`.',
          id
        );
        continue;
      }
      invariant(
        this.$Dispatcher_callbacks[id],
        'Dispatcher.waitFor(...): `%s` does not map to a registered callback.',
        id
      );
      this.$Dispatcher_invokeCallback(id);
    }
  };

  /**
   * Dispatches a payload to all registered callbacks.
   *
   * @param {object} payload
   */
  Dispatcher.prototype.dispatch=function(payload) {
    invariant(
      !this.$Dispatcher_isDispatching,
      'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
    );
    this.$Dispatcher_startDispatching(payload);
    try {
      for (var id in this.$Dispatcher_callbacks) {
        if (this.$Dispatcher_isPending[id]) {
          continue;
        }
        this.$Dispatcher_invokeCallback(id);
      }
    } finally {
      this.$Dispatcher_stopDispatching();
    }
  };

  /**
   * Is this Dispatcher currently dispatching.
   *
   * @return {boolean}
   */
  Dispatcher.prototype.isDispatching=function() {
    return this.$Dispatcher_isDispatching;
  };

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @param {string} id
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_invokeCallback=function(id) {
    this.$Dispatcher_isPending[id] = true;
    this.$Dispatcher_callbacks[id](this.$Dispatcher_pendingPayload);
    this.$Dispatcher_isHandled[id] = true;
  };

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @param {object} payload
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_startDispatching=function(payload) {
    for (var id in this.$Dispatcher_callbacks) {
      this.$Dispatcher_isPending[id] = false;
      this.$Dispatcher_isHandled[id] = false;
    }
    this.$Dispatcher_pendingPayload = payload;
    this.$Dispatcher_isDispatching = true;
  };

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_stopDispatching=function() {
    this.$Dispatcher_pendingPayload = null;
    this.$Dispatcher_isDispatching = false;
  };


module.exports = Dispatcher;

},{"./invariant":9}],9:[function(require,module,exports){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (false) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports['default'] = makeAction;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _esSymbol = require('es-symbol');

var _esSymbol2 = _interopRequireDefault(_esSymbol);

var _symbolsSymbols = require('../symbols/symbols');

var Sym = _interopRequireWildcard(_symbolsSymbols);

var _utilsAltUtils = require('../utils/AltUtils');

var utils = _interopRequireWildcard(_utilsAltUtils);

var AltAction = (function () {
  function AltAction(alt, name, action, actions, actionDetails) {
    _classCallCheck(this, AltAction);

    this[Sym.ACTION_UID] = name;
    this[Sym.ACTION_HANDLER] = action.bind(this);
    this.actions = actions;
    this.actionDetails = actionDetails;
    this.alt = alt;
  }

  _createClass(AltAction, [{
    key: 'dispatch',
    value: function dispatch(data) {
      this.alt.dispatch(this[Sym.ACTION_UID], data, this.actionDetails);
    }
  }]);

  return AltAction;
})();

function makeAction(alt, namespace, name, implementation, obj) {
  // make sure each Symbol is unique
  var actionId = utils.uid(alt[Sym.ACTIONS_REGISTRY], '' + namespace + '.' + name);
  alt[Sym.ACTIONS_REGISTRY][actionId] = 1;
  var actionSymbol = _esSymbol2['default']['for']('alt/' + actionId);

  var data = {
    namespace: namespace,
    name: name,
    id: actionId,
    symbol: actionSymbol
  };

  // Wrap the action so we can provide a dispatch method
  var newAction = new AltAction(alt, actionSymbol, implementation, obj, data);

  // the action itself
  var action = newAction[Sym.ACTION_HANDLER];
  action.defer = function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    setTimeout(function () {
      newAction[Sym.ACTION_HANDLER].apply(null, args);
    });
  };
  action[Sym.ACTION_KEY] = actionSymbol;
  action.data = data;

  // ensure each reference is unique in the namespace
  var container = alt.actions[namespace];
  var id = utils.uid(container, name);
  container[id] = action;

  return action;
}

module.exports = exports['default'];

},{"../symbols/symbols":15,"../utils/AltUtils":16,"es-symbol":5}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var _bind = Function.prototype.bind;

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _flux = require('flux');

var _utilsStateFunctions = require('./utils/StateFunctions');

var StateFunctions = _interopRequireWildcard(_utilsStateFunctions);

var _symbolsSymbols = require('./symbols/symbols');

var Sym = _interopRequireWildcard(_symbolsSymbols);

var _utilsFunctions = require('../utils/functions');

var fn = _interopRequireWildcard(_utilsFunctions);

var _store = require('./store');

var store = _interopRequireWildcard(_store);

var _utilsAltUtils = require('./utils/AltUtils');

var utils = _interopRequireWildcard(_utilsAltUtils);

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var Alt = (function () {
  function Alt() {
    var config = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Alt);

    this.config = config;
    this.serialize = config.serialize || JSON.stringify;
    this.deserialize = config.deserialize || JSON.parse;
    this.dispatcher = config.dispatcher || new _flux.Dispatcher();
    this.actions = { global: {} };
    this.stores = {};
    this.storeTransforms = config.storeTransforms || [];
    this[Sym.ACTIONS_REGISTRY] = {};
    this[Sym.INIT_SNAPSHOT] = {};
    this[Sym.LAST_SNAPSHOT] = {};
  }

  _createClass(Alt, [{
    key: 'dispatch',
    value: function dispatch(action, data, details) {
      this.dispatcher.dispatch({ action: action, data: data, details: details });
    }
  }, {
    key: 'createUnsavedStore',
    value: function createUnsavedStore(StoreModel) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var key = StoreModel.displayName || '';
      store.createStoreConfig(this.config, StoreModel);
      var Store = store.transformStore(this.storeTransforms, StoreModel);

      return fn.isFunction(Store) ? store.createStoreFromClass.apply(store, [this, Store, key].concat(args)) : store.createStoreFromObject(this, Store, key);
    }
  }, {
    key: 'createStore',
    value: function createStore(StoreModel, iden) {
      for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        args[_key2 - 2] = arguments[_key2];
      }

      var key = iden || StoreModel.displayName || StoreModel.name || '';
      store.createStoreConfig(this.config, StoreModel);
      var Store = store.transformStore(this.storeTransforms, StoreModel);

      if (this.stores[key] || !key) {
        if (this.stores[key]) {
          utils.warn('A store named ' + key + ' already exists, double check your store ' + 'names or pass in your own custom identifier for each store');
        } else {
          utils.warn('Store name was not specified');
        }

        key = utils.uid(this.stores, key);
      }

      var storeInstance = fn.isFunction(Store) ? store.createStoreFromClass.apply(store, [this, Store, key].concat(args)) : store.createStoreFromObject(this, Store, key);

      this.stores[key] = storeInstance;
      StateFunctions.saveInitialSnapshot(this, key);

      return storeInstance;
    }
  }, {
    key: 'generateActions',
    value: function generateActions() {
      for (var _len3 = arguments.length, actionNames = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        actionNames[_key3] = arguments[_key3];
      }

      var actions = { name: 'global' };
      return this.createActions(actionNames.reduce(function (obj, action) {
        obj[action] = utils.dispatchIdentity;
        return obj;
      }, actions));
    }
  }, {
    key: 'createAction',
    value: function createAction(name, implementation, obj) {
      return (0, _actions2['default'])(this, 'global', name, implementation, obj);
    }
  }, {
    key: 'createActions',
    value: function createActions(ActionsClass) {
      for (var _len4 = arguments.length, argsForConstructor = Array(_len4 > 2 ? _len4 - 2 : 0), _key4 = 2; _key4 < _len4; _key4++) {
        argsForConstructor[_key4 - 2] = arguments[_key4];
      }

      var _this = this;

      var exportObj = arguments[1] === undefined ? {} : arguments[1];

      var actions = {};
      var key = utils.uid(this[Sym.ACTIONS_REGISTRY], ActionsClass.displayName || ActionsClass.name || 'Unknown');

      if (fn.isFunction(ActionsClass)) {
        (function () {
          fn.assign(actions, utils.getInternalMethods(ActionsClass, true));

          var ActionsGenerator = (function (_ActionsClass) {
            function ActionsGenerator() {
              for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
                args[_key5] = arguments[_key5];
              }

              _classCallCheck(this, ActionsGenerator);

              _get(Object.getPrototypeOf(ActionsGenerator.prototype), 'constructor', this).apply(this, args);
            }

            _inherits(ActionsGenerator, _ActionsClass);

            _createClass(ActionsGenerator, [{
              key: 'generateActions',
              value: function generateActions() {
                for (var _len6 = arguments.length, actionNames = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
                  actionNames[_key6] = arguments[_key6];
                }

                actionNames.forEach(function (actionName) {
                  actions[actionName] = utils.dispatchIdentity;
                });
              }
            }]);

            return ActionsGenerator;
          })(ActionsClass);

          fn.assign(actions, new (_bind.apply(ActionsGenerator, [null].concat(argsForConstructor)))());
        })();
      } else {
        fn.assign(actions, ActionsClass);
      }

      this.actions[key] = this.actions[key] || {};

      fn.eachObject(function (actionName, action) {
        if (!fn.isFunction(action)) {
          return;
        }

        // create the action
        exportObj[actionName] = (0, _actions2['default'])(_this, key, actionName, action, exportObj);

        // generate a constant
        var constant = utils.formatAsConstant(actionName);
        exportObj[constant] = exportObj[actionName][Sym.ACTION_KEY];
      }, [actions]);
      return exportObj;
    }
  }, {
    key: 'takeSnapshot',
    value: function takeSnapshot() {
      for (var _len7 = arguments.length, storeNames = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
        storeNames[_key7] = arguments[_key7];
      }

      var state = StateFunctions.snapshot(this, storeNames);
      fn.assign(this[Sym.LAST_SNAPSHOT], state);
      return this.serialize(state);
    }
  }, {
    key: 'rollback',
    value: function rollback() {
      StateFunctions.setAppState(this, this.serialize(this[Sym.LAST_SNAPSHOT]), function (storeInst) {
        storeInst[Sym.LIFECYCLE].emit('rollback');
        storeInst.emitChange();
      });
    }
  }, {
    key: 'recycle',
    value: function recycle() {
      for (var _len8 = arguments.length, storeNames = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
        storeNames[_key8] = arguments[_key8];
      }

      var initialSnapshot = storeNames.length ? StateFunctions.filterSnapshots(this, this[Sym.INIT_SNAPSHOT], storeNames) : this[Sym.INIT_SNAPSHOT];

      StateFunctions.setAppState(this, this.serialize(initialSnapshot), function (storeInst) {
        storeInst[Sym.LIFECYCLE].emit('init');
        storeInst.emitChange();
      });
    }
  }, {
    key: 'flush',
    value: function flush() {
      var state = this.serialize(StateFunctions.snapshot(this));
      this.recycle();
      return state;
    }
  }, {
    key: 'bootstrap',
    value: function bootstrap(data) {
      StateFunctions.setAppState(this, data, function (storeInst) {
        storeInst[Sym.LIFECYCLE].emit('bootstrap');
        storeInst.emitChange();
      });
    }
  }, {
    key: 'prepare',
    value: function prepare(storeInst, payload) {
      var data = {};
      if (!storeInst.displayName) {
        throw new ReferenceError('Store provided does not have a name');
      }
      data[storeInst.displayName] = payload;
      return this.serialize(data);
    }
  }, {
    key: 'addActions',

    // Instance type methods for injecting alt into your application as context

    value: function addActions(name, ActionsClass) {
      for (var _len9 = arguments.length, args = Array(_len9 > 2 ? _len9 - 2 : 0), _key9 = 2; _key9 < _len9; _key9++) {
        args[_key9 - 2] = arguments[_key9];
      }

      this.actions[name] = Array.isArray(ActionsClass) ? this.generateActions.apply(this, ActionsClass) : this.createActions.apply(this, [ActionsClass].concat(args));
    }
  }, {
    key: 'addStore',
    value: function addStore(name, StoreModel) {
      for (var _len10 = arguments.length, args = Array(_len10 > 2 ? _len10 - 2 : 0), _key10 = 2; _key10 < _len10; _key10++) {
        args[_key10 - 2] = arguments[_key10];
      }

      this.createStore.apply(this, [StoreModel, name].concat(args));
    }
  }, {
    key: 'getActions',
    value: function getActions(name) {
      return this.actions[name];
    }
  }, {
    key: 'getStore',
    value: function getStore(name) {
      return this.stores[name];
    }
  }]);

  return Alt;
})();

exports['default'] = Alt;
module.exports = exports['default'];

},{"../utils/functions":24,"./actions":10,"./store":14,"./symbols/symbols":15,"./utils/AltUtils":16,"./utils/StateFunctions":17,"flux":7}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _esSymbol = require('es-symbol');

var _esSymbol2 = _interopRequireDefault(_esSymbol);

var _symbolsSymbols = require('../symbols/symbols');

var Sym = _interopRequireWildcard(_symbolsSymbols);

var _utilsFunctions = require('../../utils/functions');

var fn = _interopRequireWildcard(_utilsFunctions);

// event emitter instance
var EE = (0, _esSymbol2['default'])();

var AltStore = (function () {
  function AltStore(alt, model, state, StoreModel) {
    var _this = this;

    _classCallCheck(this, AltStore);

    this[EE] = new _eventemitter32['default']();
    this[Sym.LIFECYCLE] = model[Sym.LIFECYCLE];
    this[Sym.STATE_CONTAINER] = state || model;

    this._storeName = model._storeName;
    this.boundListeners = model[Sym.ALL_LISTENERS];
    this.StoreModel = StoreModel;

    fn.assign(this, model[Sym.PUBLIC_METHODS]);

    // Register dispatcher
    this.dispatchToken = alt.dispatcher.register(function (payload) {
      _this[Sym.LIFECYCLE].emit('beforeEach', payload, _this[Sym.STATE_CONTAINER]);

      if (model[Sym.LISTENERS][payload.action]) {
        var result = false;

        try {
          result = model[Sym.LISTENERS][payload.action](payload.data);
        } catch (e) {
          if (model[Sym.HANDLING_ERRORS]) {
            _this[Sym.LIFECYCLE].emit('error', e, payload, _this[Sym.STATE_CONTAINER]);
          } else {
            throw e;
          }
        }

        if (result !== false) {
          _this.emitChange();
        }
      }

      _this[Sym.LIFECYCLE].emit('afterEach', payload, _this[Sym.STATE_CONTAINER]);
    });

    this[Sym.LIFECYCLE].emit('init');
  }

  _createClass(AltStore, [{
    key: 'getEventEmitter',
    value: function getEventEmitter() {
      return this[EE];
    }
  }, {
    key: 'emitChange',
    value: function emitChange() {
      this[EE].emit('change', this[Sym.STATE_CONTAINER]);
    }
  }, {
    key: 'listen',
    value: function listen(cb) {
      var _this2 = this;

      this[EE].on('change', cb);
      return function () {
        return _this2.unlisten(cb);
      };
    }
  }, {
    key: 'unlisten',
    value: function unlisten(cb) {
      this[Sym.LIFECYCLE].emit('unlisten');
      this[EE].removeListener('change', cb);
    }
  }, {
    key: 'getState',
    value: function getState() {
      return this.StoreModel.config.getState.call(this, this[Sym.STATE_CONTAINER]);
    }
  }]);

  return AltStore;
})();

exports['default'] = AltStore;
module.exports = exports['default'];

},{"../../utils/functions":24,"../symbols/symbols":15,"es-symbol":5,"eventemitter3":6}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _esSymbol = require('es-symbol');

var _esSymbol2 = _interopRequireDefault(_esSymbol);

var _symbolsSymbols = require('../symbols/symbols');

var Sym = _interopRequireWildcard(_symbolsSymbols);

var _utilsFunctions = require('../../utils/functions');

var fn = _interopRequireWildcard(_utilsFunctions);

var StoreMixin = {
  waitFor: function waitFor() {
    for (var _len = arguments.length, sources = Array(_len), _key = 0; _key < _len; _key++) {
      sources[_key] = arguments[_key];
    }

    if (!sources.length) {
      throw new ReferenceError('Dispatch tokens not provided');
    }

    var sourcesArray = sources;
    if (sources.length === 1) {
      sourcesArray = Array.isArray(sources[0]) ? sources[0] : sources;
    }

    var tokens = sourcesArray.map(function (source) {
      return source.dispatchToken || source;
    });

    this.dispatcher.waitFor(tokens);
  },

  exportAsync: function exportAsync(asyncMethods) {
    this.registerAsync(asyncMethods);
  },

  registerAsync: function registerAsync(asyncDef) {
    var _this = this;

    var loadCounter = 0;

    var asyncMethods = fn.isFunction(asyncDef) ? asyncDef(this.alt) : asyncDef;

    var toExport = Object.keys(asyncMethods).reduce(function (publicMethods, methodName) {
      var desc = asyncMethods[methodName];
      var spec = fn.isFunction(desc) ? desc(_this) : desc;

      var validHandlers = ['success', 'error', 'loading'];
      validHandlers.forEach(function (handler) {
        if (spec[handler] && !spec[handler][Sym.ACTION_KEY]) {
          throw new Error('' + handler + ' handler must be an action function');
        }
      });

      publicMethods[methodName] = function () {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        var state = _this.getInstance().getState();
        var value = spec.local && spec.local.apply(spec, [state].concat(args));
        var shouldFetch = spec.shouldFetch ? spec.shouldFetch.apply(spec, [state].concat(args)) : value == null;
        var intercept = spec.interceptResponse || function (x) {
          return x;
        };

        // if we don't have it in cache then fetch it
        if (shouldFetch) {
          loadCounter += 1;
          /* istanbul ignore else */
          if (spec.loading) spec.loading(intercept(null, spec.loading, args));
          spec.remote.apply(spec, [state].concat(args)).then(function (v) {
            loadCounter -= 1;
            spec.success(intercept(v, spec.success, args));
          })['catch'](function (v) {
            loadCounter -= 1;
            spec.error(intercept(v, spec.error, args));
          });
        } else {
          // otherwise emit the change now
          _this.emitChange();
        }
      };

      return publicMethods;
    }, {});

    this.exportPublicMethods(toExport);
    this.exportPublicMethods({
      isLoading: function isLoading() {
        return loadCounter > 0;
      }
    });
  },

  exportPublicMethods: function exportPublicMethods(methods) {
    var _this2 = this;

    fn.eachObject(function (methodName, value) {
      if (!fn.isFunction(value)) {
        throw new TypeError('exportPublicMethods expects a function');
      }

      _this2[Sym.PUBLIC_METHODS][methodName] = value;
    }, [methods]);
  },

  emitChange: function emitChange() {
    this.getInstance().emitChange();
  },

  on: function on(lifecycleEvent, handler) {
    if (lifecycleEvent === 'error') {
      this[Sym.HANDLING_ERRORS] = true;
    }
    this[Sym.LIFECYCLE].on(lifecycleEvent, handler.bind(this));
  },

  bindAction: function bindAction(symbol, handler) {
    if (!symbol) {
      throw new ReferenceError('Invalid action reference passed in');
    }
    if (!fn.isFunction(handler)) {
      throw new TypeError('bindAction expects a function');
    }

    if (handler.length > 1) {
      throw new TypeError('Action handler in store ' + this._storeName + ' for ' + ('' + (symbol[Sym.ACTION_KEY] || symbol).toString() + ' was defined with ') + 'two parameters. Only a single parameter is passed through the ' + 'dispatcher, did you mean to pass in an Object instead?');
    }

    // You can pass in the constant or the function itself
    var key = symbol[Sym.ACTION_KEY] ? symbol[Sym.ACTION_KEY] : symbol;
    this[Sym.LISTENERS][key] = handler.bind(this);
    this[Sym.ALL_LISTENERS].push(_esSymbol2['default'].keyFor(key));
  },

  bindActions: function bindActions(actions) {
    var _this3 = this;

    fn.eachObject(function (action, symbol) {
      var matchFirstCharacter = /./;
      var assumedEventHandler = action.replace(matchFirstCharacter, function (x) {
        return 'on' + x[0].toUpperCase();
      });
      var handler = null;

      if (_this3[action] && _this3[assumedEventHandler]) {
        // If you have both action and onAction
        throw new ReferenceError('You have multiple action handlers bound to an action: ' + ('' + action + ' and ' + assumedEventHandler));
      } else if (_this3[action]) {
        // action
        handler = _this3[action];
      } else if (_this3[assumedEventHandler]) {
        // onAction
        handler = _this3[assumedEventHandler];
      }

      if (handler) {
        _this3.bindAction(symbol, handler);
      }
    }, [actions]);
  },

  bindListeners: function bindListeners(obj) {
    var _this4 = this;

    fn.eachObject(function (methodName, symbol) {
      var listener = _this4[methodName];

      if (!listener) {
        throw new ReferenceError('' + methodName + ' defined but does not exist in ' + _this4._storeName);
      }

      if (Array.isArray(symbol)) {
        symbol.forEach(function (action) {
          _this4.bindAction(action, listener);
        });
      } else {
        _this4.bindAction(symbol, listener);
      }
    }, [obj]);
  }
};

exports['default'] = StoreMixin;
module.exports = exports['default'];

},{"../../utils/functions":24,"../symbols/symbols":15,"es-symbol":5}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var _bind = Function.prototype.bind;

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports.createStoreConfig = createStoreConfig;
exports.transformStore = transformStore;
exports.createStoreFromObject = createStoreFromObject;
exports.createStoreFromClass = createStoreFromClass;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _symbolsSymbols = require('../symbols/symbols');

var Sym = _interopRequireWildcard(_symbolsSymbols);

var _utilsAltUtils = require('../utils/AltUtils');

var utils = _interopRequireWildcard(_utilsAltUtils);

var _utilsFunctions = require('../../utils/functions');

var fn = _interopRequireWildcard(_utilsFunctions);

var _AltStore = require('./AltStore');

var _AltStore2 = _interopRequireDefault(_AltStore);

var _StoreMixin = require('./StoreMixin');

var _StoreMixin2 = _interopRequireDefault(_StoreMixin);

function doSetState(store, storeInstance, state) {
  if (!state) {
    return;
  }

  var config = storeInstance.StoreModel.config;

  var nextState = fn.isFunction(state) ? state(storeInstance[Sym.STATE_CONTAINER]) : state;

  storeInstance[Sym.STATE_CONTAINER] = config.setState.call(store, storeInstance[Sym.STATE_CONTAINER], nextState);

  if (!store.alt.dispatcher.isDispatching()) {
    store.emitChange();
  }
}

function createPrototype(proto, alt, key, extras) {
  proto[Sym.ALL_LISTENERS] = [];
  proto[Sym.LIFECYCLE] = new _eventemitter32['default']();
  proto[Sym.LISTENERS] = {};
  proto[Sym.PUBLIC_METHODS] = {};

  return fn.assign(proto, _StoreMixin2['default'], {
    _storeName: key,
    alt: alt,
    dispatcher: alt.dispatcher
  }, extras);
}

function createStoreConfig(globalConfig, StoreModel) {
  StoreModel.config = fn.assign({
    getState: function getState(state) {
      return fn.assign({}, state);
    },
    setState: fn.assign
  }, globalConfig, StoreModel.config);
}

function transformStore(transforms, StoreModel) {
  return transforms.reduce(function (Store, transform) {
    return transform(Store);
  }, StoreModel);
}

function createStoreFromObject(alt, StoreModel, key) {
  var storeInstance = undefined;

  var StoreProto = createPrototype({}, alt, key, fn.assign({
    getInstance: function getInstance() {
      return storeInstance;
    },
    setState: function setState(nextState) {
      doSetState(this, storeInstance, nextState);
    }
  }, StoreModel));

  // bind the store listeners
  /* istanbul ignore else */
  if (StoreProto.bindListeners) {
    _StoreMixin2['default'].bindListeners.call(StoreProto, StoreProto.bindListeners);
  }

  // bind the lifecycle events
  /* istanbul ignore else */
  if (StoreProto.lifecycle) {
    fn.eachObject(function (eventName, event) {
      _StoreMixin2['default'].on.call(StoreProto, eventName, event);
    }, [StoreProto.lifecycle]);
  }

  // create the instance and fn.assign the public methods to the instance
  storeInstance = fn.assign(new _AltStore2['default'](alt, StoreProto, StoreProto.state, StoreModel), StoreProto.publicMethods, { displayName: key });

  return storeInstance;
}

function createStoreFromClass(alt, StoreModel, key) {
  for (var _len = arguments.length, argsForClass = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
    argsForClass[_key - 3] = arguments[_key];
  }

  var storeInstance = undefined;
  var config = StoreModel.config;

  // Creating a class here so we don't overload the provided store's
  // prototype with the mixin behaviour and I'm extending from StoreModel
  // so we can inherit any extensions from the provided store.

  var Store = (function (_StoreModel) {
    function Store() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      _classCallCheck(this, Store);

      _get(Object.getPrototypeOf(Store.prototype), 'constructor', this).apply(this, args);
    }

    _inherits(Store, _StoreModel);

    return Store;
  })(StoreModel);

  createPrototype(Store.prototype, alt, key, {
    getInstance: function getInstance() {
      return storeInstance;
    },
    setState: function setState(nextState) {
      doSetState(this, storeInstance, nextState);
    }
  });

  var store = new (_bind.apply(Store, [null].concat(argsForClass)))();

  if (config.bindListeners) {
    store.bindListeners(config.bindListeners);
  }

  if (config.datasource) {
    store.exportAsync(config.datasource);
  }

  storeInstance = fn.assign(new _AltStore2['default'](alt, store, store[alt.config.stateKey] || store[config.stateKey] || null, StoreModel), utils.getInternalMethods(StoreModel), config.publicMethods, { displayName: key });

  return storeInstance;
}

},{"../../utils/functions":24,"../symbols/symbols":15,"../utils/AltUtils":16,"./AltStore":12,"./StoreMixin":13,"eventemitter3":6}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _esSymbol = require('es-symbol');

var _esSymbol2 = _interopRequireDefault(_esSymbol);

// action creator handler
var ACTION_HANDLER = (0, _esSymbol2['default'])();

exports.ACTION_HANDLER = ACTION_HANDLER;
// the action's uid symbol for listening
var ACTION_KEY = (0, _esSymbol2['default'])();

exports.ACTION_KEY = ACTION_KEY;
// per instance registry of actions
var ACTIONS_REGISTRY = (0, _esSymbol2['default'])();

exports.ACTIONS_REGISTRY = ACTIONS_REGISTRY;
// the action's name
var ACTION_UID = (0, _esSymbol2['default'])();

exports.ACTION_UID = ACTION_UID;
// store all of a store's listeners
var ALL_LISTENERS = (0, _esSymbol2['default'])();

exports.ALL_LISTENERS = ALL_LISTENERS;
// are we handling our own errors
var HANDLING_ERRORS = (0, _esSymbol2['default'])();

exports.HANDLING_ERRORS = HANDLING_ERRORS;
// initial snapshot
var INIT_SNAPSHOT = (0, _esSymbol2['default'])();

exports.INIT_SNAPSHOT = INIT_SNAPSHOT;
// last snapshot
var LAST_SNAPSHOT = (0, _esSymbol2['default'])();

exports.LAST_SNAPSHOT = LAST_SNAPSHOT;
// all lifecycle listeners
var LIFECYCLE = (0, _esSymbol2['default'])();

exports.LIFECYCLE = LIFECYCLE;
// store action listeners
var LISTENERS = (0, _esSymbol2['default'])();

exports.LISTENERS = LISTENERS;
// public methods
var PUBLIC_METHODS = (0, _esSymbol2['default'])();

exports.PUBLIC_METHODS = PUBLIC_METHODS;
// contains all state
var STATE_CONTAINER = (0, _esSymbol2['default'])();
exports.STATE_CONTAINER = STATE_CONTAINER;

},{"es-symbol":5}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getInternalMethods = getInternalMethods;
exports.warn = warn;
exports.uid = uid;
exports.formatAsConstant = formatAsConstant;
exports.dispatchIdentity = dispatchIdentity;
/* istanbul ignore next */
function NoopClass() {}

var builtIns = Object.getOwnPropertyNames(NoopClass);
var builtInProto = Object.getOwnPropertyNames(NoopClass.prototype);

function getInternalMethods(Obj, isProto) {
  var excluded = isProto ? builtInProto : builtIns;
  var obj = isProto ? Obj.prototype : Obj;
  return Object.getOwnPropertyNames(obj).reduce(function (value, m) {
    if (excluded.indexOf(m) !== -1) {
      return value;
    }

    value[m] = obj[m];
    return value;
  }, {});
}

function warn(msg) {
  /* istanbul ignore else */
  if (typeof console !== 'undefined') {
    console.warn(new ReferenceError(msg));
  }
}

function uid(container, name) {
  var count = 0;
  var key = name;
  while (Object.hasOwnProperty.call(container, key)) {
    key = name + String(++count);
  }
  return key;
}

function formatAsConstant(name) {
  return name.replace(/[a-z]([A-Z])/g, function (i) {
    return '' + i[0] + '_' + i[1].toLowerCase();
  }).toUpperCase();
}

function dispatchIdentity(x) {
  for (var _len = arguments.length, a = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    a[_key - 1] = arguments[_key];
  }

  this.dispatch(a.length ? [x].concat(a) : x);
}

},{}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.setAppState = setAppState;
exports.snapshot = snapshot;
exports.saveInitialSnapshot = saveInitialSnapshot;
exports.filterSnapshots = filterSnapshots;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _symbolsSymbols = require('../symbols/symbols');

var Sym = _interopRequireWildcard(_symbolsSymbols);

var _utilsFunctions = require('../../utils/functions');

var fn = _interopRequireWildcard(_utilsFunctions);

function setAppState(instance, data, onStore) {
  var obj = instance.deserialize(data);
  fn.eachObject(function (key, value) {
    var store = instance.stores[key];
    if (store) {
      var config = store.StoreModel.config;

      if (config.onDeserialize) {
        obj[key] = config.onDeserialize(value) || value;
      }
      fn.assign(store[Sym.STATE_CONTAINER], obj[key]);
      onStore(store);
    }
  }, [obj]);
}

function snapshot(instance) {
  var storeNames = arguments[1] === undefined ? [] : arguments[1];

  var stores = storeNames.length ? storeNames : Object.keys(instance.stores);
  return stores.reduce(function (obj, storeHandle) {
    var storeName = storeHandle.displayName || storeHandle;
    var store = instance.stores[storeName];
    var config = store.StoreModel.config;

    store[Sym.LIFECYCLE].emit('snapshot');
    var customSnapshot = config.onSerialize && config.onSerialize(store[Sym.STATE_CONTAINER]);
    obj[storeName] = customSnapshot ? customSnapshot : store.getState();
    return obj;
  }, {});
}

function saveInitialSnapshot(instance, key) {
  var state = instance.deserialize(instance.serialize(instance.stores[key][Sym.STATE_CONTAINER]));
  instance[Sym.INIT_SNAPSHOT][key] = state;
  instance[Sym.LAST_SNAPSHOT][key] = state;
}

function filterSnapshots(instance, state, stores) {
  return stores.reduce(function (obj, store) {
    var storeName = store.displayName || store;
    if (!state[storeName]) {
      throw new ReferenceError('' + storeName + ' is not a valid store');
    }
    obj[storeName] = state[storeName];
    return obj;
  }, {});
}

},{"../../utils/functions":24,"../symbols/symbols":15}],18:[function(require,module,exports){
/**
 * ActionListeners(alt: AltInstance): ActionListenersInstance
 *
 * > Globally listen to individual actions
 *
 * If you need to listen to an action but don't want the weight of a store
 * then this util is what you can use.
 *
 * Usage:
 *
 * ```js
 * var actionListener = new ActionListeners(alt);
 *
 * actionListener.addActionListener(Action.ACTION_NAME, function (data) {
 *   // do something with data
 * })
 * ```
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _esSymbol = require('es-symbol');

var _esSymbol2 = _interopRequireDefault(_esSymbol);

var ALT_LISTENERS = (0, _esSymbol2['default'])('global dispatcher listeners');

function ActionListeners(alt) {
  this.dispatcher = alt.dispatcher;
  this[ALT_LISTENERS] = {};
}

/*
 * addActionListener(symAction: symbol, handler: function): number
 * Adds a listener to a specified action and returns the dispatch token.
 */
ActionListeners.prototype.addActionListener = function (symAction, handler) {
  var id = this.dispatcher.register(function (payload) {
    /* istanbul ignore else */
    if (symAction === payload.action) {
      handler(payload.data, payload.details);
    }
  });
  this[ALT_LISTENERS][id] = true;
  return id;
};

/*
 * removeActionListener(id: number): undefined
 * Removes the specified dispatch registration.
 */
ActionListeners.prototype.removeActionListener = function (id) {
  delete this[ALT_LISTENERS][id];
  this.dispatcher.unregister(id);
};

/**
 * Remove all listeners.
 */
ActionListeners.prototype.removeAllActionListeners = function () {
  Object.keys(this[ALT_LISTENERS]).forEach(this.removeActionListener.bind(this));
  this[ALT_LISTENERS] = {};
};

exports['default'] = ActionListeners;
module.exports = exports['default'];

},{"es-symbol":5}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/**
 * AltManager(Alt: AltClass): undefined
 *
 * > AltManager Util
 *
 * AltManager util allows for a developer to create multiple alt instances in
 * their app. This is useful for building apps that encapsulates an alt instance
 * inside of a outer parent. Popular examples include HipMunk flight search or
 * Google Spreadsheets's multiple sheet tabs. This also allows for caching of
 * client side instance if you need to store a new copy of an alt for each
 * action.
 *
 * Usage:
 *
 * ```js
 * var Alt = require('alt'); // Alt class, not alt instance
 * var altManager = new AltManager(Alt);
 *
 * var altInstance = altManager.create('uniqueKeyName');
 * altInstance.createAction(SomeAction);
 * var someOtherOtherAlt = altManager.create('anotherKeyName');
 * altManager.delete('uniqueKeyName');
 *
 * ```
 */

var AltManager = (function () {
  function AltManager(Alt) {
    _classCallCheck(this, AltManager);

    this.Alt = Alt;
    this.alts = {};
  }

  _createClass(AltManager, [{
    key: 'create',
    value: function create(altKey) {
      if (this.get(altKey)) {
        throw new ReferenceError('Alt key ' + altKey + ' already exists');
      }

      if (typeof altKey !== 'string') {
        throw new TypeError('altKey must be a string');
      }

      this.alts[altKey] = new this.Alt();
      return this.alts[altKey];
    }
  }, {
    key: 'get',
    value: function get(altKey) {
      return this.alts[altKey];
    }
  }, {
    key: 'all',

    // returns all alt instances
    value: function all() {
      return this.alts;
    }
  }, {
    key: 'findWhere',
    value: function findWhere(regex) {
      var results = {};
      for (var i in this.alts) {
        if (regex.exec(i) === null) {
          continue;
        }

        results[i] = this.alts[i];
      }

      return results;
    }
  }, {
    key: 'delete',
    value: function _delete(altKey) {
      if (!this.get(altKey)) {
        return false;
      }

      delete this.alts[altKey];
      return true;
    }
  }, {
    key: 'getOrCreate',
    value: function getOrCreate(altKey) {
      var alt = this.get(altKey);
      if (alt) {
        return alt;
      }

      return this.create(altKey);
    }
  }]);

  return AltManager;
})();

exports['default'] = AltManager;
module.exports = exports['default'];

},{}],20:[function(require,module,exports){
/**
 * DispatcherRecorder(alt: AltInstance): DispatcherInstance
 *
 * > Record and replay your actions at any point in time.
 *
 * This util allows you to record a set of dispatches which you can later
 * replay at your convenience.
 *
 * Good for: Debugging, repeating, logging.
 *
 * Usage:
 *
 * ```js
 * var recorder = new DispatcherRecorder(alt);
 *
 * // start recording
 * recorder.record();
 *
 * // call a series of actions
 *
 * // stop recording
 * recorder.stop();
 *
 * // replay the events that took place
 * recorder.replay();
 * ```
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _esSymbol = require('es-symbol');

var _esSymbol2 = _interopRequireDefault(_esSymbol);

function DispatcherRecorder(alt) {
  var maxEvents = arguments[1] === undefined ? Infinity : arguments[1];

  this.alt = alt;
  this.events = [];
  this.dispatchToken = null;
  this.maxEvents = maxEvents;
}

/**
 * If recording started you get true, otherwise false since there's a recording
 * in progress.
 * record(): boolean
 */
DispatcherRecorder.prototype.record = function () {
  var _this = this;

  if (this.dispatchToken) {
    return false;
  }

  this.dispatchToken = this.alt.dispatcher.register(function (payload) {
    if (_this.events.length < _this.maxEvents) {
      _this.events.push(payload);
    }
  });

  return true;
};

/**
 * Stops the recording in progress.
 * stop(): undefined
 */
DispatcherRecorder.prototype.stop = function () {
  this.alt.dispatcher.unregister(this.dispatchToken);
  this.dispatchToken = null;
};

/**
 * Clear all events from memory.
 * clear(): undefined
 */
DispatcherRecorder.prototype.clear = function () {
  this.events = [];
};

/**
 * (As|S)ynchronously replay all events that were recorded.
 * replay(replayTime: ?number, done: ?function): undefined
 */
DispatcherRecorder.prototype.replay = function (replayTime, done) {
  var alt = this.alt;

  if (replayTime === void 0) {
    this.events.forEach(function (payload) {
      alt.dispatch(payload.action, payload.data);
    });
  }

  var onNext = function onNext(payload, nextAction) {
    return function () {
      setTimeout(function () {
        alt.dispatch(payload.action, payload.data);
        nextAction();
      }, replayTime);
    };
  };

  var next = done || function () {};
  var i = this.events.length - 1;
  while (i >= 0) {
    var _event = this.events[i];
    next = onNext(_event, next);
    i -= 1;
  }

  next();
};

/**
 * Serialize all the events so you can pass them around or load them into
 * a separate recorder.
 * serializeEvents(): string
 */
DispatcherRecorder.prototype.serializeEvents = function () {
  var events = this.events.map(function (event) {
    return {
      action: _esSymbol2['default'].keyFor(event.action),
      data: event.data
    };
  });
  return JSON.stringify(events);
};

/**
 * Load serialized events into the recorder and overwrite the current events
 * loadEvents(events: string): undefined
 */
DispatcherRecorder.prototype.loadEvents = function (events) {
  var parsedEvents = JSON.parse(events);
  this.events = parsedEvents.map(function (event) {
    return {
      action: _esSymbol2['default']['for'](event.action),
      data: event.data
    };
  });
};

exports['default'] = DispatcherRecorder;
module.exports = exports['default'];

},{"es-symbol":5}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports['default'] = atomic;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _makeFinalStore = require('./makeFinalStore');

var _makeFinalStore2 = _interopRequireDefault(_makeFinalStore);

var _functions = require('./functions');

function makeAtomicClass(alt, StoreModel) {
  var AtomicClass = (function (_StoreModel) {
    function AtomicClass() {
      _classCallCheck(this, AtomicClass);

      _get(Object.getPrototypeOf(AtomicClass.prototype), 'constructor', this).call(this);
      this.on('error', function () {
        return alt.rollback();
      });
    }

    _inherits(AtomicClass, _StoreModel);

    return AtomicClass;
  })(StoreModel);

  AtomicClass.displayName = StoreModel.displayName || StoreModel.name || 'AtomicClass';
  return AtomicClass;
}

function makeAtomicObject(alt, StoreModel) {
  StoreModel.lifecycle = StoreModel.lifecycle || {};
  StoreModel.lifecycle.error = function () {
    alt.rollback();
  };
  return StoreModel;
}

function atomic(alt) {
  var finalStore = (0, _makeFinalStore2['default'])(alt);

  finalStore.listen(function () {
    return alt.takeSnapshot();
  });

  return function (StoreModel) {
    return (0, _functions.isFunction)(StoreModel) ? makeAtomicClass(alt, StoreModel) : makeAtomicObject(alt, StoreModel);
  };
}

module.exports = exports['default'];

},{"./functions":24,"./makeFinalStore":25}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
/*global window*/
exports['default'] = chromeDebug;

function chromeDebug(alt) {
  if (typeof window !== 'undefined') window['alt.js.org'] = alt;
  return alt;
}

module.exports = exports['default'];

},{}],23:[function(require,module,exports){
(function (global){
/**
 * 'Higher Order Component' that controls the props of a wrapped
 * component via stores.
 *
 * Expects the Component to have two static methods:
 *   - getStores(): Should return an array of stores.
 *   - getPropsFromStores(props): Should return the props from the stores.
 *
 * Example using old React.createClass() style:
 *
 *    const MyComponent = React.createClass({
 *      statics: {
 *        getStores(props) {
 *          return [myStore]
 *        },
 *        getPropsFromStores(props) {
 *          return myStore.getState()
 *        }
 *      },
 *      render() {
 *        // Use this.props like normal ...
 *      }
 *    })
 *    MyComponent = connectToStores(MyComponent)
 *
 *
 * Example using ES6 Class:
 *
 *    class MyComponent extends React.Component {
 *      static getStores(props) {
 *        return [myStore]
 *      }
 *      static getPropsFromStores(props) {
 *        return myStore.getState()
 *      }
 *      render() {
 *        // Use this.props like normal ...
 *      }
 *    }
 *    MyComponent = connectToStores(MyComponent)
 *
 * A great explanation of the merits of higher order components can be found at
 * http://bit.ly/1abPkrP
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);

var _react2 = _interopRequireDefault(_react);

var _functions = require('./functions');

function connectToStores(Component) {
  // Check for required static methods.
  if (!(0, _functions.isFunction)(Component.getStores)) {
    throw new Error('connectToStores() expects the wrapped component to have a static getStores() method');
  }
  if (!(0, _functions.isFunction)(Component.getPropsFromStores)) {
    throw new Error('connectToStores() expects the wrapped component to have a static getPropsFromStores() method');
  }

  // Wrapper Component.
  var StoreConnection = _react2['default'].createClass({
    displayName: 'StoreConnection',

    getInitialState: function getInitialState() {
      return Component.getPropsFromStores(this.props);
    },

    componentDidMount: function componentDidMount() {
      var _this = this;

      var stores = Component.getStores(this.props);
      stores.forEach(function (store) {
        store.listen(_this.onChange);
      });
    },

    componentWillUnmount: function componentWillUnmount() {
      var _this2 = this;

      var stores = Component.getStores(this.props);
      stores.forEach(function (store) {
        store.unlisten(_this2.onChange);
      });
    },

    onChange: function onChange() {
      this.setState(Component.getPropsFromStores(this.props));
    },

    render: function render() {
      return _react2['default'].createElement(Component, (0, _functions.assign)({}, this.props, this.state));
    }
  });

  return StoreConnection;
}

exports['default'] = connectToStores;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./functions":24}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.eachObject = eachObject;
exports.assign = assign;
var isFunction = function isFunction(x) {
  return typeof x === 'function';
};

exports.isFunction = isFunction;

function eachObject(f, o) {
  o.forEach(function (from) {
    Object.keys(Object(from)).forEach(function (key) {
      f(key, from[key]);
    });
  });
}

function assign(target) {
  for (var _len = arguments.length, source = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    source[_key - 1] = arguments[_key];
  }

  eachObject(function (key, value) {
    return target[key] = value;
  }, source);
  return target;
}

},{}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = makeFinalStore;
/**
 * makeFinalStore(alt: AltInstance): AltStore
 *
 * > Creates a `FinalStore` which is a store like any other except that it
 * waits for all other stores in your alt instance to emit a change before it
 * emits a change itself.
 *
 * Want to know when a particular dispatch has completed? This is the util
 * you want.
 *
 * Good for: taking a snapshot and persisting it somewhere, saving data from
 * a set of stores, syncing data, etc.
 *
 * Usage:
 *
 * ```js
 * var FinalStore = makeFinalStore(alt);
 *
 * FinalStore.listen(function () {
 *   // all stores have now changed
 * });
 * ```
 */

function FinalStore() {
  var _this = this;

  this.dispatcher.register(function (payload) {
    var stores = Object.keys(_this.alt.stores).reduce(function (arr, store) {
      arr.push(_this.alt.stores[store].dispatchToken);
      return arr;
    }, []);

    _this.waitFor(stores);
    _this.setState({ payload: payload });
    _this.emitChange();
  });
}

function makeFinalStore(alt) {
  return alt.FinalStore ? alt.FinalStore : alt.FinalStore = alt.createUnsavedStore(FinalStore);
}

module.exports = exports["default"];

},{}],26:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = withAltContext;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);

var _react2 = _interopRequireDefault(_react);

function withAltContext(flux) {
  return function (Component) {
    return _react2['default'].createClass({
      childContextTypes: {
        flux: _react2['default'].PropTypes.object
      },

      getChildContext: function getChildContext() {
        return { flux: flux };
      },

      render: function render() {
        return _react2['default'].createElement(Component, this.props);
      }
    });
  };
}

module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.eachObject = eachObject;
exports.assign = assign;
var isFunction = function isFunction(x) {
  return typeof x === 'function';
};

exports.isFunction = isFunction;

function eachObject(f, o) {
  o.forEach(function (from) {
    Object.keys(Object(from)).forEach(function (key) {
      f(key, from[key]);
    });
  });
}

function assign(target) {
  for (var _len = arguments.length, source = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    source[_key - 1] = arguments[_key];
  }

  eachObject(function (key, value) {
    return target[key] = value;
  }, source);
  return target;
}

},{}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _ = require('./');

var _2 = _interopRequireDefault(_);

var _utilsActionListeners = require('../utils/ActionListeners');

var _utilsActionListeners2 = _interopRequireDefault(_utilsActionListeners);

var _utilsAltManager = require('../utils/AltManager');

var _utilsAltManager2 = _interopRequireDefault(_utilsAltManager);

var _utilsDispatcherRecorder = require('../utils/DispatcherRecorder');

var _utilsDispatcherRecorder2 = _interopRequireDefault(_utilsDispatcherRecorder);

var _utilsAtomic = require('../utils/atomic');

var _utilsAtomic2 = _interopRequireDefault(_utilsAtomic);

var _utilsConnectToStores = require('../utils/connectToStores');

var _utilsConnectToStores2 = _interopRequireDefault(_utilsConnectToStores);

var _utilsChromeDebug = require('../utils/chromeDebug');

var _utilsChromeDebug2 = _interopRequireDefault(_utilsChromeDebug);

var _utilsMakeFinalStore = require('../utils/makeFinalStore');

var _utilsMakeFinalStore2 = _interopRequireDefault(_utilsMakeFinalStore);

var _utilsWithAltContext = require('../utils/withAltContext');

var _utilsWithAltContext2 = _interopRequireDefault(_utilsWithAltContext);

var _AltContainer = require('../../AltContainer');

var _AltContainer2 = _interopRequireDefault(_AltContainer);

_2['default'].addons = {
  ActionListeners: _utilsActionListeners2['default'],
  AltContainer: _AltContainer2['default'],
  AltManager: _utilsAltManager2['default'],
  DispatcherRecorder: _utilsDispatcherRecorder2['default'],
  atomic: _utilsAtomic2['default'],
  chromeDebug: _utilsChromeDebug2['default'],
  connectToStores: _utilsConnectToStores2['default'],
  makeFinalStore: _utilsMakeFinalStore2['default'],
  withAltContext: _utilsWithAltContext2['default']
};

exports['default'] = _2['default'];
module.exports = exports['default'];

},{"../../AltContainer":1,"../utils/ActionListeners":18,"../utils/AltManager":19,"../utils/DispatcherRecorder":20,"../utils/atomic":21,"../utils/chromeDebug":22,"../utils/connectToStores":23,"../utils/makeFinalStore":25,"../utils/withAltContext":26,"./":11}]},{},[28])(28)
});