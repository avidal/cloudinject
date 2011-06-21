var CloudInject = (function(){

// define a local copy
var CloudInject = {

    // map over CloudInject and ci in case of overwrite
    _CloudInject: window.CloudInject,
    _ci: window.ci,

    _plugin_cache: [],

    is_initialized: false,
    jquery_ready: false,
    controller_ready: false
};

CloudInject.prepare = function() {
    if(CloudInject.is_initialized) return;

    if(CloudInject.jquery_ready === false) {
        if(typeof window.jQuery != 'undefined') {
            console.log("[CI] jQuery is ready.");
            CloudInject.jquery_ready = true;
        }
    }

    if(CloudInject.controller_ready === false) {
        if(typeof window.controller != 'undefined') {
            console.log("[CI] Controller is ready.");
            CloudInject.hook_controller();
            CloudInject.controller_ready = true;
        }
    }

    if(CloudInject.jquery_ready && CloudInject.controller_ready) {
        console.log("[CI] CloudInject is initialized.");
        CloudInject.is_initialized = true;
        return;
    }

    window.setTimeout(CloudInject.prepare, 500);
    return;

};

CloudInject.hook_controller = function() {

    console.log("[CI] Hooking IRCCloud controller.");

    var events = [
        ['onConnecting', 'connecting'],
        ['onNoSocketData', 'nosocketdata'],
        ['onDisconnect', 'disconnect'],
        ['onBacklogMessage', 'backlogmessage'],
        ['onMessage', 'message'],
        ['onBufferScroll', 'bufferscroll']
    ];

    jQuery.each(events, function(i) {
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

CloudInject.inject = function(name, fn, version) {
    /* CloudInject.inject
     *
     * This function receives the plugin and evaluates it once jQuery
     * and the controller are ready.
     */

    console.log("[CI] Injecting " + name + "@" + version);

    // stuff plugins in the cache until everything is ready
    if(!this.is_initialized) {
        console.log("[CI] Injector is not initialized. Inserting into cache.");
        this._plugin_cache.push([name, fn, version]);
        return;
    }

    console.log("[CI] CloudInject is initialized already.");

    // now that everything is ready, create a script element on the page and
    // start adding in plugins

    var s = document.createElement('script');
    jQuery.each(this._plugin_cache, function(i, plugin) {
        console.log('[CI] Injecting plugin ' + plugin[0]);
        s.textContent += "(" + plugin[1] + ")(window.CloudInject, window.jQuery);";
        s.textContent += "\n\n";
    });

    jQuery("body").appendChild(s);
    console.log("[CI] All plugins injected.");

};

return CloudInject;

})();

// start waiting for everything to become ready
CloudInject.prepare();
