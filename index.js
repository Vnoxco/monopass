let currentHeight = document.body.offsetHeight + 35;

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
        if (!app) {
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
        this.id = id;
        this.message = message;
    }
}

class Router {
    push(route, app) {
        sendMessage(new RouteChangeEvent(route, app))
    }
}

// class HeightChange extends Event {
//     constructor() {
//         super('height-change');
//         // this.height = document.body.offsetHeight + 40;
//     }
// }

class MonoBillCore {

    listeners = {};

    constructor() {
        this.router = new Router();
        this.confirmActions = {};
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
                }
            }
        });

        window.addEventListener('click', function (event) {
            let targetLink = event.target.closest('a[data-router-link]');
            if (targetLink) {
                event.preventDefault();
                let appLink = targetLink.getAttribute('data-router-link-app');
                if (appLink === 'undefined' || appLink !== 'false') {
                    appLink = true;
                }
                self.router.push(targetLink.getAttribute('data-router-link'), appLink);
            }
        });
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
