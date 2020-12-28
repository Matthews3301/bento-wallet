module.exports = {


  friendlyName: 'Create Bitcoin address',

  fn: async function () {

    const bitcoin = require('bitcoinjs-lib')
    const bip39 = require('bip39')
    const bip32 = require('bip32')

    const mnemonic = bip39.generateMnemonic()
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const node = bip32.fromSeed(seed, (process.env.network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin))
    // const { address } = bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: bitcoin.networks.testnet })
    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network: (process.env.network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin) }),
    })
    const publicKey = node.publicKey.toString('hex')
    const wif = node.toWIF()

    return {
      address: address,
      publicKey: publicKey,
      mnemonic: mnemonic,
      wif: wif
    }

  }

};

