let currentHeight = document.body.offsetHeight;

class Event {
    constructor(name) {
        this.name = name;
    }
}

class MonoAlert extends Event {
    constructor(type, message) {
        super('alert');
        this.type = type;
        this.message = message;
    }
}

class LoadEvent extends Event {
    constructor() {
        super('load');
        this.height = document.body.offsetHeight + 35;
    }
}

class RouteChangeEvent extends Event {
    constructor(route, app) {
        if (typeof app === 'undefined') {
            app = true;
        }
        super('route-change');
        this.route = route
        this.app = app;
    }
}

class ConfirmActionEvent extends Event {
    constructor(id, message) {
        super('confirm-action');
        this.callback_id = id;
        this.message = message;
    }
}

class OpenResourcePickerEvent extends Event {
    constructor(type, id) {
        super('open-resource-picker');
        this.callback_id = id;
        this.type = type;
    }
}

class AddSideNavigationLinkEvent extends Event {
    constructor(label, uri) {
        super('add-side-navigation-link');
        this.label = label;
        this.uri = uri;
    }
}


class setSideNavigationLinksEvent extends Event {
    constructor(links) {
        super('set-side-navigation-links');
        this.links = links;
    }
}

class Router {

    static core;

    constructor(core) {
        this.core = core;
    }

    push(route, app) {
        this.core.sendMessage(new RouteChangeEvent(route, app))
    }
}

class MonoBillCore {

    listeners = {};
    hmac = null;

    constructor(hmac) {
        this.hmac = hmac;
        if(!this.hmac) {
            this.hmac = window.hmac;
        }
        this.router = new Router(this);
        this.confirmActions = {};
        this.selectResourceCallBacks = {};
        this.sendMessage(new LoadEvent());
        let self = this;

        window.addEventListener('message', function (event) {
            let message = JSON.parse(event.data);
            if (message.request && message.request === 'height') {
                window.parent.postMessage(JSON.stringify({
                    height: document.body.offsetHeight + 35,
                    hmac: self.hmac
                }), '*');
            }
            if (message.route && typeof self.listeners['route-change'] !== 'undefined') {
                let listeners = self.listeners['route-change'];
                for (let i = 0; i < listeners.length; i++) {
                    if (typeof listeners[i] === 'function') {
                        listeners[i](message.route);
                    }
                }
            }
            if (typeof message.confirm_action !== 'undefined') {
                if (typeof self.confirmActions[message.confirm_action] === 'function') {
                    self.confirmActions[message.confirm_action]();
                    delete self.confirmActions[message.confirm_action];
                }
            }
            if(typeof message.selected_resource !== 'undefined'){
                if (typeof self.selectResourceCallBacks[message.callback_id] === 'function') {
                    self.selectResourceCallBacks[message.callback_id](message.selected_resource);
                    delete self.selectResourceCallBacks[message.callback_id];
                }
            }
        });

        window.addEventListener('click', function (event) {
            let targetLink = event.target.closest('a[data-router-link]');
            if (targetLink) {
                event.preventDefault();
                let appLink = targetLink.getAttribute('data-router-link-app') === 'true';
                self.router.push(targetLink.getAttribute('data-router-link'), appLink);
            }
        });
    }

   sendMessage(data) {
        if (data instanceof Event) {
            window.parent.postMessage(JSON.stringify({
                ...data,
                event: data.name,
                hmac: this.hmac
            }), '*');
        } else if (data instanceof MonoAlert) {
            window.parent.postMessage(JSON.stringify({
                alert: data
            }), '*');
        } else {
            window.parent.postMessage(JSON.stringify(data), '*');
        }
    }

    openResourcePicker(type, func) {
        let id = Math.random().toString(36);
        this.selectResourceCallBacks[id] = func;
        this.sendMessage(new OpenResourcePickerEvent(type, id));
    }

    addSideNavigationLink(label, uri) {
        this.sendMessage(new AddSideNavigationLinkEvent(label, uri));
    }

    setSideNavigationLinks(links) {
        this.sendMessage(new setSideNavigationLinksEvent(links));
    }

    alert(type, message) {
        this.sendMessage(new MonoAlert(type, message));
    }

    scrollToFirstError() {
        this.sendMessage({
            scrollToFirstError: true,
        })
    }

    confirmAction(message, func) {
        let id = Math.random().toString(36);
        this.confirmActions[id] = func;
        this.sendMessage(new ConfirmActionEvent(id, message));
    }

    on(eventName, callable) {
        if (typeof this.listeners[eventName] === 'undefined') {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callable);
    }
}

const MonoBill = new MonoBillCore();

module.exports = MonoBill;
