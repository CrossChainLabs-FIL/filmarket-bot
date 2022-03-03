const { Contract, KeyPair, connect } = require('near-api-js');
const { InMemoryKeyStore } = require('near-api-js').keyStores;
const config = require('./config');
const Big = require('big.js');

const GAS = Big(3).times(10 ** 14).toFixed();

const near_config = config.getConfig(process.env.NODE_ENV || 'development');

const contractConfig = {
    viewMethods: ['get_storage_providers', 'get_active_per_region', 'get_price_per_region', 'get_global_price', 'get_fil_price'],
    changeMethods: ['new', 'update_storage_providers', 'set_active_per_region', 'set_price_per_region', 'set_global_price', 'set_fil_price']
}

class Near {
    constructor() {
        this.init = false;
        this.near = undefined;
        this.contract = undefined;
    }

    async Init() {
        if (!this.init) {
            let keyStore = new InMemoryKeyStore();
            const keypair = KeyPair.fromString("ed25519:" + config.near.account_key);
            await keyStore.setKey(near_config.networkId, config.near.account_id, keypair);

            this.near = await connect({ ...near_config, keyStore });

            const accountAcc = await this.near.account(near_config.contractName);

            this.contract = new Contract(accountAcc, near_config.contractName, contractConfig);
            //await this.contract.new();
            this.init = true;
        }
    }

    async UpdateStorageProviders(storage_providers) {
        if (storage_providers?.length) {
            var spsSlice = storage_providers;
            while (spsSlice.length) {
                try {
                    await this.contract.update_storage_providers({
                        meta: 'Update storage providers',
                        callbackUrl: undefined,
                        args: { storage_providers: spsSlice.splice(0, config.bot.update_slice) },
                        amount: 0
                    });
                } catch (e) {

                }
            }
        }
    }

    async SetActivePerRegion(active_per_region) {
        if (active_per_region) {
            await this.contract.set_active_per_region({
                meta: 'Set active per region',
                callbackUrl: undefined,
                args: { active_per_region: active_per_region },
                GAS,
                amount: 0
            });
        }
    }

    async SetPricePerRegion(price_per_region) {
        if (price_per_region) {
            await this.contract.set_price_per_region({
                meta: 'Set price per region',
                callbackUrl: undefined,
                args: { price_per_region: price_per_region },
                amount: 0
            });
        }
    }

    async SetGlobalPrice(global_price) {
        if (global_price) {
            await this.contract.set_global_price({
                meta: 'Set global price',
                callbackUrl: undefined,
                args: { global_price: global_price },
                amount: 0
            });
        }
    }

    async SetFILPrice(fil_price) {
        if (fil_price) {
            await this.contract.set_fil_price({
                meta: 'Set global price',
                callbackUrl: undefined,
                args: { fil_price: fil_price },
                amount: 0
            });
        }
    }

    async GetActivePerRegion() {
        return await this.contract.get_active_per_region();
    }

    async GetPricePerRegion() {
        return await this.contract.get_price_per_region();
    }

    async GetStorageProviders() {
        return await this.contract.get_storage_providers();
    }

    async GetGlobalPrice() {
        return await this.contract.get_global_price();
    }

    async GetFILPrice() {
        return await this.contract.get_fil_price();
    }
}

module.exports = {
    Near
};