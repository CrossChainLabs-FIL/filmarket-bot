'use strict';
const { ERROR } = require('./logs');
const axios = require('axios');
const LIMIT = 1000;

class MinersClient {
    constructor(api) {
        this.api = api;
    }

    async Get(route, params, timeout = 30000) {
        const response = await axios.get(this.api+route, params, timeout);
        return response;
    }

    async GetMiners() {
        let result = [];
        let offset = 0;
        let have_miners = false;

        do {
            try {
                const response = (await this.Get(`?limit=${LIMIT}&offset=${offset}`))?.data;

                if (response?.miners?.length) {
                    offset += LIMIT;
                    result = [...result, ...response.miners];

                    if (response?.miners?.length === LIMIT) {
                        have_miners = true;
                    } else {
                        have_miners = false;
                    }
                }
            } catch (e) {
                ERROR(`GetMiners: ${e}`);
            }

        } while (have_miners);

        return result;
    }
}

module.exports = {
    MinersClient
};

