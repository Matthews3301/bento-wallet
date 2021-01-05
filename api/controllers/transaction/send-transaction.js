module.exports = {


  friendlyName: 'Send Bitcoin transaction',


  inputs: {

    destinationAddress: {
      type: 'string',
      required: true
    },

    amount: {
      type: 'string',
      required: true
    },

    currency: {
      type: 'string',
      required: true
    },

  },


  exits: {
    success: {
      description: 'Transaction processed.'
    },
  },


  fn: async function ({destinationAddress, amount, currency}) {

    if (!this.req.me) {
      throw {redirect:'/login'}
    }

    if (amount <= 0) {
      return {
        success: false,
        reason: 'Amount error',
      }
    }

    const userObj = await User.findOne({id: this.req.session.userId})
    if (!userObj) {
      return {
        success: false,
        reason: 'User error',
      }
    }

    let btcBalance = userObj.bitcoinData.btcBalance || 0.0
    let btcBalanceUsd = userObj.bitcoinData.btcBalanceUsd || 0.0
    const btcUsdPrice = await sails.helpers.getBtcUsdPrice()

    function getAvgTransactionFee() {
      return new Promise(async (resolve, reject) => {
        const fetch = require('node-fetch')
        fetch(process.env.nodeInfoMempoolFees, {
          method: 'GET',
          headers: {'Content-Type': 'application/json'},
        }).then(r => {
          if (r.status !== 200) {
            sails.log('ERROR connecting to blockchain.info: ' + r.statusText)
            reject('Blockchain.info error')
          } else {
            r.json().then((r) => {
              resolve(r)
            })
          }
        }).catch(err => sails.log(err))
      })
    }

    let transactionFee = 500
    if (process.env.nodeInfoMempoolFees) {
      const mempoolFees = await getAvgTransactionFee()
      const minFee = (mempoolFees.limits.min * 220 * 0.8)
      if ((btcUsdPrice * (minFee / 100000000.0)) > 2.0) {
        // fee higher than $2, default to $2
        transactionFee = Math.round((2 / btcUsdPrice) * 100000000.0)
      } else {
        transactionFee = Math.round(minFee)
      }
    }
    // const transactionFeeUsd = (transactionFee / 100000000.0) * (await sails.helpers.getBtcUsdPrice())

    if (currency === 'USD') {
      if ((btcBalanceUsd - amount) < 0.0) {
        return {
          success: false,
          reason: 'Not enough funds in your account for this transaction',
        }
      }
    } else {
      if ((btcBalance - amount) < 0.0) {
        return {
          success: false,
          reason: 'Not enough funds in your account for this transaction',
        }
      }
    }

    let destinationBtcAddress = ''
    let destinationAccountEmail
    let newAccountDestination = false
    if (destinationAddress.includes('@')) {
      const destinationUserObj = await User.findOne({emailAddress: destinationAddress.toLowerCase()})
      if (destinationUserObj) {
        destinationBtcAddress = destinationUserObj.bitcoinData.btcAddress
        destinationAccountEmail = destinationUserObj.emailAddress
      } else {

        const { address, publicKey, mnemonic, wif } = await sails.helpers.createAddress()

        const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

        await User.create(_.extend({
          emailAddress: destinationAddress,
          password: await sails.helpers.passwords.hashPassword(password),
          bitcoinData: {
            btcAddress: address,
            btcPublicKey: publicKey,
            btcPrivateWif: wif,
            btcMnemonic: mnemonic,
            btcBalance: 0,
            btcLast: Date.now()
          },
          tosAcceptedByIp: this.req.ip
        }, sails.config.custom.verifyEmailAddresses? {
          emailProofToken: await sails.helpers.strings.random('url-friendly'),
          emailProofTokenExpiresAt: Date.now() + sails.config.custom.emailProofTokenTTL,
          emailStatus: 'unconfirmed'
        }:{}))
          .intercept('E_UNIQUE', 'emailAlreadyInUse')
          .intercept({name: 'UsageError'}, 'invalid')
          .fetch()

        await sails.helpers.sendTemplateEmail.with({
          to: destinationAddress,
          subject: userObj.emailAddress + ' has sent you some Bitcoin using Bento Wallet',
          template: 'email-new-account-send',
          templateData: {
            sourceEmail: userObj.emailAddress,
            password: password,
            mnemonic: mnemonic.split(' ')
          }
        })

        destinationBtcAddress = address
        newAccountDestination = true
      }
    } else {
      destinationBtcAddress = destinationAddress
      const destinationUserObj = await User.findOne({bitcoinData: {contains: `"${destinationAddress}"`}})
      if (destinationUserObj) destinationAccountEmail = destinationUserObj.emailAddress
    }

    if (!destinationBtcAddress) {
      return {
        success: false,
        reason: 'Destination address error',
      }
    }

    const bitcoin = require('bitcoinjs-lib')

    if (currency === 'USD') {
      amount = parseFloat((parseFloat(amount) / btcUsdPrice))
    }

    if ((amount * 100000000.0) <= transactionFee) {
      return {
        success: false,
        reason: 'Transaction amount is too low',
      }
    }

    const fetch = require('node-fetch')
    function getLastTransactionsData() {
      return new Promise(async (resolve, reject) => {
        const fetch = require('node-fetch')
        fetch(process.env.nodeInfoAddressUrl.replace('XXXXX', userObj.bitcoinData.btcAddress), {
          method: 'GET',
          headers: {'Content-Type': 'application/json'},
        }).then(r => {
          if (r.status !== 200) {
            sails.log('ERROR connecting to blockchain.info: ' + r.statusText)
            reject('Blockchain.info error')
          } else {
            r.json().then((r) => {
              resolve(r.txs)
            })
          }
        }).catch(err => sails.log(err))
      })
    }

    function getUnspentTransactions(btcAddress) {
      return new Promise(async (resolve, reject) => {
        const fetch = require('node-fetch')
        fetch(process.env.nodeInfoUnspentUrl.replace('XXXXX', btcAddress), {
          method: 'GET',
          headers: {'Content-Type': 'application/json'},
        }).then(r => {
          if (r.status !== 200) {
            sails.log('ERROR connecting to blockchain.info: ' + r.statusText)
            reject('Blockchain.info error')
          } else {
            r.json().then((r) => {
              resolve(r.unspent_outputs)
            })
          }
        }).catch(err => sails.log(err))
      })
    }


    const network = (process.env.network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin)
    const sourceAccount = bitcoin.ECPair.fromWIF(userObj.bitcoinData.btcPrivateWif, network)
    const psbt = new bitcoin.Psbt({ network })
    const transactionsData = await getLastTransactionsData()
    const unspentTransactions = await getUnspentTransactions(userObj.bitcoinData.btcAddress)

    // to create a new account from the same seed:
    // node.deriveHardened(0).derive(isChange ? 1 : 0).derive(index)
    // or sourceAccount.deriveChild(i)

    // const txID = await this.createTransaction(privateKey, tx.amount, fromaddress, toaddress)


    let totalIncludedFromUtxos = 0
    let utxosAdded = 0
    const amountToRemove = (amount * 100000000.0) + transactionFee
    for (let i = 0; i < unspentTransactions.length; i++) {
      const utxo = unspentTransactions[i]
      // for (let i = 0; i < transactionsData.length; i++) {
      /*const transaction = transactionsData[i]
      const transactionHex = (await getTransactionHex(transaction.hash)).toString()
      */

      const payment = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({
          pubkey: sourceAccount.publicKey,
        })
      })

      // if (utxo.confirmations >= 6) {
      let inputData = {
        hash: utxo.tx_hash_big_endian,
        index: utxo.tx_output_n,
      }

      let urlTxes = await fetch(process.env.nodeInfoRawTxUrl.replace('XXXXX', utxo.tx_hash_big_endian)).then(r => r.buffer())
      const isSegwit = urlTxes.toString().substring(8, 12) === '0001'

      if (isSegwit) {
        inputData.witnessUtxo = {
          script: Buffer.from(utxo.script,'hex'),
          value: utxo.value,
        }
        inputData.redeemScript = payment.redeem.output
      } else {
        inputData.nonWitnessUtxo = Buffer.from(urlTxes.toString(), 'hex')
      }

      psbt.addInput(inputData)

      totalIncludedFromUtxos += utxo.value
      utxosAdded = i + 1
      if (totalIncludedFromUtxos >= amountToRemove) break
      // const lastUnspentTransaction = transaction.out.find(out => out.addr === userObj.bitcoinData.btcAddress)
    }

    // let amountWeHave = (await sails.helpers.getBtcBalance(userObj.bitcoinData.btcAddress)) * 100000000.0
    // let amountToKeep = amountWeHave - (amount * 100000000.0)
    // let amountToSend = (amount * 100000000.0) - transactionFee

    psbt.addOutput({
      address: destinationBtcAddress,
      value: Math.floor((amount * 100000000.0) - transactionFee),
    })
    const changeAmount = Math.floor(totalIncludedFromUtxos - (amount * 100000000.0))
    if (changeAmount > 50) { // Don't keep dust as change
      psbt.addOutput({
        address: userObj.bitcoinData.btcAddress,
        value: changeAmount,
      })
    }

    for (let i = 0; i < utxosAdded; i++) {
      psbt.signInput(i, sourceAccount)
    }
    psbt.validateSignaturesOfInput(0)
    psbt.finalizeAllInputs()

    const tx = psbt.extractTransaction()
    const txid = tx.getId()
    const thex = tx.toHex()

    // 'https://blockchain.info/pushtx'
    fetch(process.env.nodePushTxUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        tx: thex
      })
    }).then(r => {
      sails.log(r.statusText)
    }).catch(err => sails.log(err))

    console.log(txid)

    const amountUsd = (parseFloat(amount) * btcUsdPrice).toFixed(2)
    amount = parseFloat(amount).toFixed(7)

    await sails.helpers.sendTemplateEmail.with({
      to: userObj.emailAddress,
      subject: 'Transaction sent',
      template: 'email-transaction',
      templateData: {
        destination: destinationAddress.includes('@') ? destinationAddress + ` ${destinationBtcAddress}` : destinationBtcAddress,
        amountBTC: '฿' + amount,
        amountUSD: '$' + amountUsd,
        fee: transactionFee + 'sat',
        time: new Date().toGMTString(),
        explorer: process.env.nodeInfoTxUrl.replace('XXXXX', txid),
      }
    })

    if (destinationAccountEmail && !newAccountDestination) {
      await sails.helpers.sendTemplateEmail.with({
        to: destinationAccountEmail,
        subject: 'You just received ' + amount + ' BTC',
        template: 'email-received',
        templateData: {
          sourceEmail: userObj.emailAddress,
          amountBTC: '฿' + amount,
          amountUSD: '$' + amountUsd,
        }
      })
    }

    return {
      success: true,
      transactionId: txid
    }


  }

};
