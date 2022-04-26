const { Contract, KeyPair, connect } = require('near-api-js');
const { InMemoryKeyStore } = require('near-api-js').keyStores;
const config = require('./config');
const Big = require('big.js');

const GAS = Big(3).times(10 ** 14).toFixed();

const near_config = config.getConfig('production');

const contractConfig = {
    viewMethods: [
        'get_storage_providers', 
        'get_active_per_region', 
        'get_price_per_region_list', 
        'get_latest_price_per_region'
    ],
    changeMethods: [
        'update_storage_providers',
        'delete_storage_providers',
        'set_active_per_region',
        'set_price_per_region',
        'delete_price_per_region'
    ]
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

    async DeleteStorageProviders(storage_providers) {
        if (storage_providers?.length) {
            var spsSlice = storage_providers;
            while (spsSlice.length) {
                try {
                    await this.contract.delete_storage_providers({
                        meta: 'Delete storage providers',
                        callbackUrl: undefined,
                        args: { storage_providers: spsSlice.splice(0, config.bot.delete_slice) },
                        amount: 0
                    });
                } catch (e) {

                }
            }
        }
    }

    async DeletePricePerRegion(timestamps) {
        if (timestamps?.length) {
                try {
                    await this.contract.delete_price_per_region({
                        meta: 'Delete price per region data points',
                        callbackUrl: undefined,
                        args: { timestamps: timestamps },
                        amount: 0
                    });
                } catch (e) {

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

    async GetActivePerRegion() {
        return await this.contract.get_active_per_region();
    }

    async GetPricePerRegionList() {
        return await this.contract.get_price_per_region_list();
    }

    async GetStorageProviders() {
        return await this.contract.get_storage_providers();
    }
}

module.exports = {
    Near
};