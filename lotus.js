'use strict';

const axios = require('axios');
const { rateLimit } = require('axios-rate-limit');

class Lotus {
    constructor(api, token) {
        this.id = 0
        this.api = api;
        this.token = token;
        this.http = rateLimit(axios.create(), { maxRequests: 5, perMilliseconds: 1000, maxRPS: 5 })
    }

    async LotusAPI(method, params, timeout = 10000) {
        let body = JSON.stringify({
            "jsonrpc": "2.0",
            "method": `Filecoin.${method}`,
            "params": params,
            "id": this.id++,
        });

        let response = undefined;

        if (this.token) {
            response = await this.http.post(this.api, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: timeout
            });
        } else {
            response = await this.http.post(this.api, body, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: timeout
            });
        }

        return response;
    }

    StateMinerPower(miner) {
        return this.LotusAPI("StateMinerPower", [miner, null]);
    }

    StateMinerInfo(miner) {
        return this.LotusAPI("StateMinerInfo", [miner, null]);
    }

    ClientQueryAsk(peerId, miner) {
        return this.LotusAPI("ClientQueryAsk", [peerId, miner]);
    }

    NetFindPeer(peerId) {
        return this.LotusAPI("NetFindPeer", [peerId]);
    }
}

module.exports = {
    Lotus
};