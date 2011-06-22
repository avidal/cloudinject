var CloudInject = (function(){

// define a local copy which will be returned at the end
var CloudInject = function() {},

    // map over the existing library if it exists
    _CI = window.CloudInject,

    // set some initialization flags
    _is_initialized = false,
    _jquery_ready = false,
    _controller_ready = false,

    /*
     * _patchController
     *
     * This function deals with patching the IRCCloud controller to dispatch
     * custom jQuery events for most interesting events that the controller
     * itself deals with.
     *
     * TODO: Document all events, with argument descriptions
     *
     * Interesting Events:
     *  connecting.cloudinject:
     *      Sent when the controller is connecting to an IRC server.
     *
     *  message.cloudinject:
     *      Sent when the controller receives and processes
     *      a message from the backend.
     */
    _patchController = function() {
        console.groupCollapsed("[CI] Patching IRCCloud controller.");

        var $ = window.jQuery;

        // These are the events we are patching. The first item is the name
        // of the controller event, the second is the prefix for the jQuery
        // event that we will dispatch.
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
            var jquery_ev = events[i][1] + '.cloudinject';

            console.debug('Patching event %s with %s', ev, jquery_ev);

            // This is the name that will store the original event handler
            // as defined by the controller
            var monkey_ev_name = '__cloudinject_' + ev;

            if(controller.hasOwnProperty(monkey_ev_name)) {
                // only hook the controller once for any given event
                console.warn('Event %s is already patched!', ev);
                return;
            }

            // store a reference to the original event
            controller[monkey_ev_name] = controller[ev];

            // patch the original event to send jquery triggers
            controller[ev] = function() {
                // call the original handler
                controller[monkey_ev_name].apply(controller, arguments);
                // and fire the jquery event
                $(document).trigger(jquery_ev, arguments);
            };
        });

        console.groupEnd();

    };

/*
 * CloudInject.loadPlugins
 *
 * This function loads all of the plugins specified in the `plugin_store`
 * argument, passing them the CloudInject library and jQuery.
 */
CloudInject.loadPlugins = function(plugin_store) {

    console.groupCollapsed('[CI] Loading plugins.');
    console.info('Current plugin count: %d', plugin_store.length);

    for(var i = 0; i < plugin_store.length; i++) {

        // Each plugin should be an array of three values:
        // [<name>, <function>, <version>]
        var plugin = plugin_store[i];
        console.debug('Loading plugin %s@%s.', plugin[0], plugin[2]);

        // Call the plugin, passing it CloudInject (`this`) as well as
        // jQuery.
        plugin[1](this, window.jQuery);

    }

    console.info("All plugins loaded.");
    console.groupEnd();

};

/*
 * CloudInject.prepare
 *
 * This function deals with preparing the CloudInject library. It does this
 * by calling itself twice a second until both jQuery and the IRCCloud
 * controller are ready. Once the controller is ready, CloudInject calls
 * _patchController, which deals with patching controller events in order to
 * dispatch custom jQuery events, which means jQuery must be ready as well.
 *
 * Once everything is ready, then the plugins are loaded from the plugin store,
 * currently defined as window.__ci_plugins
 */
CloudInject.prepare = function() {
    if(_is_initialized) return;

    // if there's no plugin store, create it
    if(typeof window.__ci_plugins === 'undefined') {
        console.info('[CI] Creating plugin store.');
        window.__ci_plugins=[];
    }

    if(_jquery_ready === false) {
        if(typeof window.jQuery != 'undefined') {
            console.info("[CI] jQuery is ready.");
            _jquery_ready = true;
        }
    }

    if(_controller_ready === false) {
        if(typeof window.controller != 'undefined') {
            console.info("[CI] Controller is ready.");
            _patchController();
            _controller_ready = true;
        }
    }

    if(_jquery_ready && _controller_ready) {
        console.info("[CI] CloudInject is initialized.");
        _is_initialized = true;
        this.loadPlugins(window.__ci_plugins);
        window.__ci_plugins=[];
        return;
    }

    var _this = this;
    window.setTimeout(function() { _this.prepare() }, 500);
    return;

};


if(_CI) {
    console.warn('[CI] Library already exists.');
    return _CI;
}

console.info('[CI] Returning library.');
return CloudInject;

})();

// start waiting for everything to become ready
CloudInject.prepare();
