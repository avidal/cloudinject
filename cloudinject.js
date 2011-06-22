var CloudInject = (function(){

// if window.CloudInject exists already, then return it
if(typeof window.CloudInject != 'undefined') {
    return window.CloudInject;
}

// define a local copy
var CloudInject = {

    // map over CloudInject and ci in case of overwrite
    _CloudInject: window.CloudInject,
    _ci: window.ci,

    is_initialized: false,
    jquery_ready: false,
    controller_ready: false
};

CloudInject.prepare = function() {
    if(CloudInject.is_initialized) return;

    // if there's no plugin cache, create it
    if(typeof window.__ci_plugins == 'undefined') {
        window.__ci_plugins=[];
    }

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
        CloudInject.load_plugins(window.__ci_plugins);
        window.__ci_plugins=[];
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

CloudInject.load_plugins = function(plugin_cache) {

    for(var i = 0; i < plugin_cache.length; i++) {
        var plugin = plugin_cache[i];
        console.log('[CI] Loading plugin ' + plugin[0] + '@' + plugin[2]);
        plugin[1](this, window.jQuery);
    }

    console.log("[CI] All plugins loaded.");

};

return CloudInject;

})();

// start waiting for everything to become ready
CloudInject.prepare();
