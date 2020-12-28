module.exports = {

  friendlyName: 'Returns balance of given account',

  inputs: {

    btcAddress: {
      type: 'string',
      required: true
    }

  },

  fn: async function ({ btcAddress }) {

    // FAUCET: https://testnet-faucet.mempool.co/
    // BLOCK EXPLORER: https://www.blockchain.com/btc-testnet/address/
    return new Promise(async (resolve, reject) => {
      const fetch = require('node-fetch')
      fetch(process.env.nodeInfoAddressUrl.replace('XXXXX', btcAddress), {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
      }).then(r => {
        if (r.status !== 200) {
          sails.log('ERROR connecting to blockchain.info: ' + r.statusText)
          reject('Blockchain.info error')
        } else {
          r.json()
            .then((r) => resolve(r.final_balance / 100000000.0))
        }
      }).catch(err => sails.log(err))
    })

  }

};

