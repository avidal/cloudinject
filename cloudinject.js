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

        // Patch context menus
        // TODO: Clean this up and consolidate it with the above
        // code
        var ctx = controller.view.memberContextMenuView;
        var patch_name = '__cloudinject_showMenu';

        if(ctx.hasOwnProperty(patch_name)) {
            console.warn('Member context showMenu is already patched!');
        } else {
            ctx[patch_name] = ctx.showMenu;
            ctx.showMenu = function() {
                ctx[patch_name].apply(controller.view.memberContextMenuView,
                                      arguments);
                var member = ctx.memberView.member;
                $(document).trigger('show.membercontext.cloudinject', member);
            }
           controller.view.memberContextMenuView = ctx;
        }

        console.groupEnd();

    };

CloudInject.version = '0.1.1';

/*
 * CloudInject.addToMemberContext
 *
 * Adds an option to the IRCCloud member context menu (accessible via clicking
 * on a user).
 *
 * Pass it an element and that element will be added to the context menu.
 * You can optionally pass in a callback that will be fired when your menu
 * item is clicked.
 *
 * The second form is where you pass in the element, followed by an options
 * object. The options object can have the following keys:
 *
 *  selector: A selector used to determine the element to bind to.
 *  event: Which event to bind.
 *  callback: A function that will be called when the `event` is triggerd on
 *      the `selector`.
 *
 * Your callback will be passed a member object representing the member that
 * the context menu was opened for.
 *
 * Note, whatever you pass will be wrapped in an <li> tag. This means that if
 * you pass in a single entry that contains multiple elements (like a paragraph
 * and an input) you must wrap them all in a single element first (such as
 * a form).
 */
CloudInject.addToMemberContext = function(elem, options) {
    console.log('[CI] Adding to member context menu.');

    // make sure the passed element is a jQuery object
    elem = jQuery(elem);

    var ctx = controller.view.memberContextMenuView.container;
    var menu = ctx.find('ul.actions.cloudinject-context');

    // if there isn't an additional ul.actions, add it
    if(menu.length === 0) {
        console.debug('[CI] Creating CloudInject member context submenu.');
        menu = jQuery('<ul/>', {
            'class': 'actions __ci-context',
            'style': 'display:block;'
        });

        ctx.append(menu);
    }

    menu.append(elem);

    // wrap the passed element in an li
    elem.wrap('<li/>');

    var selector, evt, callback;

    if(typeof options === 'function') {
        selector = elem;
        evt = 'click';
        callback = options;
    } else {
        selector = options.selector;
        evt = options.evt;
        callback = options.callback;
    }

    var fn = function(event) {
        var member = controller.view.memberContextMenuView.memberView.member;
        callback.call(this, event, member);
    };

    if(elem === selector) {
        elem.bind(evt, fn);
    } else {
        elem.find(selector).bind(evt, fn);
    }

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
    console.warn('[CI] Library already exists. Existing version: %s',
                 _CI.version);
    return _CI;
}

console.info('[CI] CloudInject version %s successfully initialized.',
             CloudInject.version);
return CloudInject;

})();

// start waiting for everything to become ready
CloudInject.prepare();
