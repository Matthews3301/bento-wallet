module.exports = {

  friendlyName: 'Get BTC price in Usd',

  fn: async function () {

    return new Promise(async (resolve, reject) => {
      const fetch = require('node-fetch')
      fetch('https://blockchain.info/ticker', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
      }).then(r => {
        if (r.status !== 200) {
          sails.log('ERROR connecting to blockchain.info: ' + r.statusText)
          reject('Blockchain.info error')
        } else {
          r.json()
            .then((r) => resolve(r.USD.last))
        }
      }).catch(err => sails.log(err))
    })

  }

};

