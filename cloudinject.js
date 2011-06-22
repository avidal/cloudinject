var CloudInject = (function(){

// define a local copy
var CloudInject = function() {},

    // map over the existing library if it exists
    _CI = window.CloudInject,

    // set some initialization flags
    _is_initialized = false,
    _jquery_ready = false,
    _controller_ready = false,

    // some private utility functions
    _hookController = function() {
        console.log("[CI] Hooking IRCCloud controller.");

        var $ = window.jQuery;

        var events = [
            ['onConnecting', 'connecting'],
            ['onNoSocketData', 'nosocketdata'],
            ['onDisconnect', 'disconnect'],
            ['onBacklogMessage', 'backlogmessage'],
            ['onMessage', 'message'],
            ['onBufferScroll', 'bufferscroll']
        ];

        $.each(events, function(i) {
            var ev = events[i][0];
            var jquery_ev = events[i][1];
            var monkey_ev_name = '__cloudinject_' + ev;

            if(controller.hasOwnProperty(monkey_ev_name)) {
                // only hook the controller once for any given event
                return;
            }

            // store a reference to the original event
            controller[monkey_ev_name] = controller[ev];

            // patch the original event to send jquery triggers
            controller[ev] = function() {
                var ev_name = jquery_ev + '.cloudinject';
                // call the original handler
                controller[monkey_ev_name].apply(controller, arguments);
                // and fire the jquery event
                $(document).trigger(ev_name, arguments);
            };
        });
    };

CloudInject.prepare = function() {
    console.log('[CI] Preparing library.');
    if(_is_initialized) return;

    // if there's no plugin cache, create it
    if(typeof window.__ci_plugins === 'undefined') {
        window.__ci_plugins=[];
    }

    if(_jquery_ready === false) {
        if(typeof window.jQuery != 'undefined') {
            console.log("[CI] jQuery is ready.");
            _jquery_ready = true;
        }
    }

    if(_controller_ready === false) {
        if(typeof window.controller != 'undefined') {
            console.log("[CI] Controller is ready.");
            _hookController();
            _controller_ready = true;
        }
    }

    if(_jquery_ready && _controller_ready) {
        console.log("[CI] CloudInject is initialized.");
        _is_initialized = true;
        this.loadPlugins(window.__ci_plugins);
        window.__ci_plugins=[];
        return;
    }

    var _this = this;
    window.setTimeout(function() { _this.prepare() }, 500);
    return;

};

CloudInject.loadPlugins = function(plugin_cache) {

    for(var i = 0; i < plugin_cache.length; i++) {
        var plugin = plugin_cache[i];
        console.log('[CI] Loading plugin ' + plugin[0] + '@' + plugin[2]);
        plugin[1](this, window.jQuery);
    }

    console.log("[CI] All plugins loaded.");

};

if(_CI) {
    console.log('window.CloudInject already exists. Returning it.');
    return _CI;
}

console.log('[CI] Returning library.');
return CloudInject;

})();

// start waiting for everything to become ready
CloudInject.prepare();
