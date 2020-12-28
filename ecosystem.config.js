module.exports = {
  apps : [{
    name: 'app',
    script: 'app.js',
    args: ['--redis', '--prod'],
    instances : '2',
    exec_mode : 'cluster',
    watch: [],
    watch_delay: 3000,
    restart_delay: 10000,
    listen_timeout: 10000,
    ignore_watch : ['node_modules', '.tmp'],
    log_date_format: 'MM-DD HH:mm',
    env: {
      NODE_ENV: 'production',
      network: 'testnet',
      dbUrl: 'mysql://user:password@host:port/database',
      baseUrl: 'https://bento.me',
      nodeInfoAddressUrl: 'https://testnet.blockchain.info/address/XXXXX?format=json',
      nodeInfoTxUrl: 'https://www.blockchain.com/btc-testnet/tx/XXXXX',
      nodeInfoUnspentUrl: 'https://testnet.blockchain.info/unspent?cors=true&active=XXXXX',
      nodeInfoRawTxUrl: 'https://testnet.blockchain.info/rawtx/XXXXX?cors=true&format=hex',
      nodePushTxUrl: 'https://api.blockcypher.com/v1/btc/test3/txs/push',
      mailgunDomain: 'mg.bento.me',
      mailgunSecret: 'key-22222222222222222222',
      emailAddress: 'info@bento.me'
    },
  }],
};
