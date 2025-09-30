let currentHeight = document.body.offsetHeight;

let sendMessage = function (data) {
    if (data instanceof Event) {
        window.parent.postMessage(JSON.stringify({
            ...data,
            event: data.name
        }), '*');
    } else if (data instanceof MonoAlert) {
        window.parent.postMessage(JSON.stringify({
            alert: data
        }), '*');
    } else {
        window.parent.postMessage(JSON.stringify(data), '*');
    }
}

class MonoAlert {
    constructor(type, message) {
        this.type = type;
        this.message = message;
    }
}

class Event {
    constructor(name) {
        this.name = name;
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
        this.mp_id = id;
        this.message = message;
    }
}

class OpenResourcePickerEvent extends Event {
    constructor(hmac, type, id) {
        super('open-resource-picker');
        this.mp_id = id;
        this.hmac = hmac;
        this.type = type;
    }
}

class AddSideNavigationLinkEvent extends Event {
    constructor(hmac, label, uri) {
        super('add-side-navigation-link');
        this.hmac = hmac;
        this.label = label;
        this.uri = uri;
    }
}


class setSideNavigationLinksEvent extends Event {
    constructor(hmac, links) {
        super('set-side-navigation-links');
        this.hmac = hmac;
        this.links = links;
    }
}

class Router {
    push(route, app) {
        sendMessage(new RouteChangeEvent(route, app))
    }
}

class MonoBillCore {

    listeners = {};

    constructor() {
        this.router = new Router();
        this.confirmActions = {};
        this.selectResourceCallBacks = {};
        sendMessage(new LoadEvent());
        let self = this;

        window.addEventListener('message', function (event) {
            let message = JSON.parse(event.data);
            if (message.request && message.request === 'height') {
                window.parent.postMessage(JSON.stringify({
                    height: document.body.offsetHeight + 35
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
                if (typeof self.selectResourceCallBacks[message.mp_id] === 'function') {
                    self.selectResourceCallBacks[message.mp_id](message.selected_resource);
                    delete self.selectResourceCallBacks[message.mp_id];
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

    openResourcePicker(hmac, type, func) {
        let id = Math.random().toString(36);
        this.selectResourceCallBacks[id] = func;
        sendMessage(new OpenResourcePickerEvent(hmac, type, id));
    }

    addSideNavigationLink(hmac, label, uri) {
        sendMessage(new AddSideNavigationLinkEvent(hmac, label, uri));
    }

    setSideNavigationLinks(hmac, links) {
        sendMessage(new setSideNavigationLinksEvent(hmac, links));
    }

    alert(type, message) {
        sendMessage(new MonoAlert(type, message));
    }

    scrollToFirstError() {
        sendMessage({
            scrollToFirstError: true,
        })
    }

    confirmAction(message, func) {
        let id = Math.random().toString(36);
        this.confirmActions[id] = func;
        sendMessage(new ConfirmActionEvent(id, message));
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
