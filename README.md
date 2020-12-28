# bento

a lightweight, online Bitcoin wallet

## To start

Set environment variables for:

```
dbUrl=mysql://user:password@host:port/database

baseUrl=https://bento.me

emailAddress=info@bento.me
mailgunDomain=mg.bento.me
mailgunSecret=key-2333322424242424334

network=testnet

nodeInfoAddressUrl=https://testnet.blockchain.info/address/XXXXX?format=json
nodeInfoTxUrl=https://www.blockchain.com/btc-testnet/tx/XXXXX
nodeInfoUnspentUrl=https://testnet.blockchain.info/unspent?cors=true&active=XXXXX
nodeInfoRawTxUrl=https://testnet.blockchain.info/rawtx/XXXXX?cors=true&format=hex
nodePushTxUrl=https://api.blockcypher.com/v1/btc/test3/txs/push
```

Then

`npm run start-dev`

or for production:

Update `ecosystem.config.js` with env variables

`sh pm2-start.sh`

Then it's `pm2 logs`, `pm2 reload app`, etc.
```
