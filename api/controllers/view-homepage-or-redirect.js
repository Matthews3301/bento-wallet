module.exports = {


  friendlyName: 'View homepage or redirect',


  description: 'Display or redirect to the appropriate homepage, depending on login status.',


  exits: {

    success: {
      statusCode: 200,
      description: 'Requesting user is a guest, so show the public landing page.',
      viewTemplatePath: 'pages/homepage'
    },

    redirect: {
      responseType: 'redirect',
      description: 'Requesting user is logged in, so redirect to the internal welcome page.'
    },

  },


  fn: async function () {

    if (!this.req.me) {
      // throw {redirect:'/login'}
      throw {redirect:'/landing'}
    }

    const userObj = await User.findOne({id: this.req.session.userId})

    const btcAddress = userObj.bitcoinData.btcAddress
    let btcBalance = userObj.bitcoinData.btcBalance || 0.0
    let btcBalanceUsd = userObj.bitcoinData.btcBalanceUsd || 0.0

    function removeTrailingZeros(number) {
      let trailingZeros = 0
      for (var i = number.length - 1; i >= 0; i--) {
        if (number[i] !== '0' || (i > 0 && number[i - 1] === '.')) {
          trailingZeros = number.length - i - 1
          break
        }
      }
      return trailingZeros > 0 ? number.slice(0, -trailingZeros) : number
    }

    btcBalance = removeTrailingZeros((await sails.helpers.getBtcBalance(btcAddress)).toFixed(7))
    btcBalanceUsd = parseFloat((parseFloat(btcBalance) * (await sails.helpers.getBtcUsdPrice())).toFixed(2)).toLocaleString()
    if (btcBalance !== userObj.bitcoinData.btcBalance || btcBalanceUsd !== userObj.bitcoinData.btcBalanceUsd) {
      let bitcoinDataObj = userObj.bitcoinData
      bitcoinDataObj.btcBalance = btcBalance
      bitcoinDataObj.btcBalanceUsd = btcBalanceUsd
      bitcoinDataObj.btcLast = Date.now()
      await User.updateOne({id: this.req.session.userId})
        .set({bitcoinData: bitcoinDataObj})
    }

    let users = 0
    if (userObj.emailAddress === 'salamon.mat@gmail.com') users = await User.count({})


    return {
      btcAddress: btcAddress,
      btcBalance: btcBalance,
      btcBalanceUsd: btcBalanceUsd,
      users: users,
    }

  }


};
