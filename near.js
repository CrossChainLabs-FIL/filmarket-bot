const { Contract, KeyPair, connect } = require('near-api-js');
const { InMemoryKeyStore } = require('near-api-js').keyStores;
const config = require('./config');

const near_config = config.getConfig(process.env.NODE_ENV || 'development');

const contractConfig = {
    viewMethods: ['get_status'],
    changeMethods: ['set_status']
}

class Near {
    constructor() {
        this.init = false;
        this.near = undefined;
        this.contract = undefined;
    }

    async Init() {
        let keyStore = new InMemoryKeyStore();
        const keypair = KeyPair.fromString("ed25519:" + config.near.account_key);
        await keyStore.setKey(near_config.networkId, config.near.account_id, keypair);

        this.near = await connect({ ...near_config, keyStore });

        const accountAcc = await this.near.account(near_config.contractName);

        this.contract = new Contract(accountAcc, near_config.contractName, contractConfig);
        this.init = true;

        await this.contract.set_status({ message: 'filmarket test' });
        console.log(await this.contract.get_status({ account_id: config.near.account_id }));
    }
}

module.exports = {
    Near
};