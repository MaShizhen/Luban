import os from 'os';
import EventEmitter from 'events';
import zipWith from 'lodash/zipWith';
import { createSocket } from 'dgram';
import logger from '../../lib/logger';
import { CONNECTION_TYPE_WIFI } from '../../constants';

const log = logger('lib:deviceManager');

const DISCOVER_SERVER_PORT = 20054;
let intervalHandle = null;


/**
 * A singleton to manage devices remotely.
 */
class WifiServerManager extends EventEmitter {
    client = createSocket('udp4');

    devices = [];

    sockets = [];

    refreshing = false;

    constructor() {
        super();
        this.init();
    }

    init = () => {
        this.client.bind(() => {
            this.client.setBroadcast(true);
        });

        this.client.on('message', (msg) => {
            const message = msg.toString('utf8');

            const parts = message.split('|');
            if (parts.length === 0 || parts[0].indexOf('@') === -1) {
                // Not a valid message
                return;
            }
            const [name, address] = parts[0].split('@');

            const device = { name, address };
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                if (part.indexOf(':') === -1) {
                    continue;
                }
                const [key, value] = part.split(':');

                device[key.toLowerCase()] = value;
            }

            this.devices.push(device);
            for (const socket of this.sockets) {
                socket.emit('machine:discover', {
                    devices: this.devices,
                    type: CONNECTION_TYPE_WIFI
                });
            }
        });
    };


    refreshDevices = () => {
        // Clear devices and send broadcast only when not refreshing to avoid duplicated refresh
        if (this.refreshing) {
            return;
        }

        this.refreshing = true;
        this.devices = [];

        const message = Buffer.from('discover');

        const ifaces = os.networkInterfaces();
        for (const key of Object.keys(ifaces)) {
            const iface = ifaces[key];
            for (const address of iface) {
                if (address.family === 'IPv4' && !address.internal) {
                    const broadcastAddress = zipWith(
                        address.address.split('.').map(d => Number(d)),
                        address.netmask.split('.').map(d => Number(d)),
                        (p, q) => {
                            return (p | (~q & 255));
                        }
                    ).join('.');

                    this.client.send(message, DISCOVER_SERVER_PORT, broadcastAddress, (err) => {
                        if (err) {
                            log.error(err);
                            this.refreshing = false;
                        }
                    });
                }
            }
        }

        // debounce to avoid multiple sequential calls
        // Note: 500ms reaction time, 3000ms is too long.
        setTimeout(() => {
            this.refreshing = false;
        }, 500);
    };

    onConnection = (socket) => {
        this.sockets.push(socket);
        intervalHandle = setInterval(this.refreshDevices, 1000);
    };

    onDisconnection = (socket) => {
        this.sockets = this.sockets.filter(e => e !== socket);
        clearInterval(intervalHandle);
    }
}

const wifiServerManager = new WifiServerManager();

export default wifiServerManager;
