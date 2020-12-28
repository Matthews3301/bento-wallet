module.exports = {


  friendlyName: 'View transactions',


  description: 'Display "Transactions" page.',


  exits: {

    success: {
      viewTemplatePath: 'pages/entrance/transactions',
    },

    redirect: {
      description: 'The requesting user is already logged in.',
      responseType: 'redirect'
    }

  },


  fn: async function () {

    if (!this.req.me) {
      throw {redirect: '/'};
    }

    const userObj = await User.findOne({id: this.req.session.userId})

    function getTransactionData() {
      return new Promise(async (resolve) => {
        const fetch = require('node-fetch')
        fetch(process.env.nodeInfoAddressUrl.replace('XXXXX', userObj.bitcoinData.btcAddress), {
          method: 'GET',
          headers: {'Content-Type': 'application/json'},
        }).then(r => {
          if (r.status !== 200) {
            sails.log('ERROR connecting to blockchain.info: ' + r.statusText)
            resolve({txs: []})
          } else {
            r.json()
              .then((r) => {
                resolve(r)
              })
          }
        }).catch(err => sails.log(err))
      })
    }

    let transactions = (await getTransactionData()).txs.map(transaction => ({
      time: transaction.time,
      hash: transaction.hash,
      amount: transaction.result
    }))

    let currentAccountTotal = 0
    for (var i = transactions.length - 1; i >= 0; i--) {
      currentAccountTotal += transactions[i].amount
      transactions[i].accountBalance = currentAccountTotal
    }

    return {
      nodeInfoTxUrl: process.env.nodeInfoTxUrl,
      transactions
    }

  }


};
