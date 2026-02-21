// Multiplayer networking module — client-side WebSocket
// Wraps connection to relay server and provides send/receive helpers

const ENEMY_TYPE_IDX = { grunt: 0, runner: 1, tank: 2, healer: 3, boss: 4, swarm: 5, wobbler: 6, flying: 7, megaboss: 8, royboss: 9, dragonflyer: 10, foreststalker: 11, stormherald: 12, sandtitan: 13, magmabrute: 14, magmafragment: 15, siegegolem: 16, voidsovereign: 17 };
const IDX_ENEMY_TYPE = Object.fromEntries(Object.entries(ENEMY_TYPE_IDX).map(([k, v]) => [v, k]));

export class Net {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.connected = false;
        this.roomCode = null;
        this.playerId = 0; // 1 = host, 2 = client
        this.partnerConnected = false;
        this.syncCounter = 0;

        // Callbacks — set by game.js
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPartnerJoined = null;
        this.onPartnerLeft = null;
        this.onError = null;
    }

    get isHost() { return this.playerId === 1; }

    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);
            } catch (e) {
                reject(e);
                return;
            }
            this.ws.onopen = () => {
                this.connected = true;
                resolve();
            };
            this.ws.onerror = () => reject(new Error('Connection failed'));
            this.ws.onclose = () => {
                this.connected = false;
                this.partnerConnected = false;
            };
            this.ws.onmessage = e => this._onMessage(e.data);
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.partnerConnected = false;
        this.roomCode = null;
        this.playerId = 0;
    }

    createRoom() {
        this._send({ type: 'CREATE_ROOM' });
    }

    joinRoom(code) {
        this._send({ type: 'JOIN_ROOM', code: code.toUpperCase() });
    }

    // ── Relay helpers ─────────────────────────────────────
    _send(msg) {
        if (this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    _relay(payload) {
        this._send({ type: 'RELAY', d: payload });
    }

    // ── Outgoing game messages ────────────────────────────
    sendMapSelect(mapId, layoutIndex) {
        this._relay({ t: 'MAP', mapId, li: layoutIndex });
    }

    sendGameStart() {
        this._relay({ t: 'START' });
    }

    sendTowerPlace(typeName, gx, gy, towerId, ownerId) {
        this._relay({ t: 'TP', tn: typeName, gx, gy, id: towerId, oid: ownerId });
    }

    sendTowerPlaceRequest(typeName, gx, gy) {
        this._relay({ t: 'TPR', tn: typeName, gx, gy });
    }

    sendTowerSell(towerId) {
        this._relay({ t: 'TS', id: towerId });
    }

    sendTowerUpgrade(towerId) {
        this._relay({ t: 'TU', id: towerId });
    }

    sendWaveStart() {
        this._relay({ t: 'WS' });
    }

    sendWaveDef(waveDef, modifier, modifierDef, waveTag, hpModifier) {
        this._relay({
            t: 'WD',
            def: waveDef.map(g => ({
                type: ENEMY_TYPE_IDX[g.type] ?? 0,
                count: g.count,
                interval: g.interval,
                delay: g.delay || 0,
            })),
            mod: modifier,
            modDef: modifierDef ? { name: modifierDef.name, color: modifierDef.color, desc: modifierDef.desc } : null,
            tag: waveTag,
            hpMod: hpModifier,
        });
    }

    sendStateSync(state) {
        this._relay({ t: 'SS', ...state });
    }

    sendSpeedChange(speed) {
        this._relay({ t: 'SPD', s: speed });
    }

    sendGameOver() {
        this._relay({ t: 'GO' });
    }

    sendGoldUpdate(hostGold, clientGold) {
        this._relay({ t: 'GU', hg: hostGold, cg: clientGold });
    }

    // ── Incoming message dispatch ─────────────────────────
    _onMessage(raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        switch (msg.type) {
            case 'ROOM_CREATED':
                this.roomCode = msg.code;
                this.playerId = 1;
                this.onRoomCreated?.(msg.code);
                break;
            case 'ROOM_JOINED':
                this.roomCode = msg.code;
                this.playerId = msg.playerId;
                this.partnerConnected = true;
                this.onRoomJoined?.(msg.code, msg.playerId);
                break;
            case 'PARTNER_JOINED':
                this.partnerConnected = true;
                this.onPartnerJoined?.();
                break;
            case 'PARTNER_LEFT':
                this.partnerConnected = false;
                this.onPartnerLeft?.();
                break;
            case 'ERROR':
                this.onError?.(msg.msg);
                break;
            case 'RELAY':
                this._handleRelay(msg.d);
                break;
        }
    }

    _handleRelay(d) {
        const game = this.game;
        switch (d.t) {
            case 'MAP':
                game._onNetMapSelect(d.mapId, d.li);
                break;
            case 'START':
                game._onNetGameStart();
                break;
            case 'TP':
                game._onNetTowerPlace(d.tn, d.gx, d.gy, d.id, d.oid);
                break;
            case 'TPR':
                game._onNetTowerPlaceRequest(d.tn, d.gx, d.gy);
                break;
            case 'TS':
                game._onNetTowerSell(d.id);
                break;
            case 'TU':
                game._onNetTowerUpgrade(d.id);
                break;
            case 'WS':
                // Client requesting wave start
                if (this.isHost) {
                    game.waves.startNextWave();
                }
                break;
            case 'WD':
                game._onNetWaveDef(d);
                break;
            case 'SS':
                game._onNetStateSync(d);
                break;
            case 'SPD':
                game.speed = d.s;
                game.ui.update();
                break;
            case 'GO':
                game.gameOver();
                break;
            case 'GU':
                game._onNetGoldUpdate(d.hg, d.cg);
                break;
        }
    }
}

export { ENEMY_TYPE_IDX, IDX_ENEMY_TYPE };
