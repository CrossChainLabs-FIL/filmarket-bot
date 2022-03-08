const CONTRACT_NAME = process.env.CONTRACT_NAME || 'filmarket_test1.testnet';

function getConfig(env) {
  switch (env) {
    case 'production':
    case 'mainnet':
      return {
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        contractName: CONTRACT_NAME,
        walletUrl: 'https://wallet.near.org',
        helperUrl: 'https://helper.mainnet.near.org',
        explorerUrl: 'https://explorer.mainnet.near.org',
      }
    case 'development':
    case 'testnet':
      return {
        networkId: 'testnet',
        nodeUrl: 'https://rpc.testnet.near.org',
        contractName: CONTRACT_NAME,
        walletUrl: 'https://wallet.testnet.near.org',
        helperUrl: 'https://helper.testnet.near.org',
        explorerUrl: 'https://explorer.testnet.near.org',
      }
    default:
      throw Error(`Unconfigured environment '${env}'. Can be configured in config.js.`)
  }
}

module.exports = {
  bot: {
    lotus_api: process.env.LOTUS_API || '',
    lotus_api_rps: process.env.LOTUS_API_RPS || 10,
    miners_api_fg: process.env.MINERS_API_FG || '',
    miners_api_rs: process.env.MINERS_API_RS || '',
    maxmind_id: process.env.MAXMIND_ID || '',
    maxmind_token: process.env.MAXMIND_TOKEN || '',
    coinmarketcap_apikey: process.env.COINMARKETCAP_APIKEY || '',
    update_slice: process.env.UPDATE_SLICE || 10,
    delete_slice: process.env.DELETE_SLICE || 2,
    max_TiB_price_per_year: process.env.MAX_TiB_PRICE_PER_YEAR || 50.0, //FIL
  },
  near: {
    account_id:  process.env.ACCOUNT_ID || '',
    account_key: process.env.ACCOUNT_KEY || '',
  },
  getConfig,
}; 