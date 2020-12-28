module.exports = {
  apps : [{
    name: 'app',
    script: 'app.js',
    args: ['--redis', '--prod'],
    instances : '2',
    exec_mode : 'cluster',
    watch: ['assets'],
    watch_delay: 3000,
    restart_delay: 10000,
    listen_timeout: 10000,
    ignore_watch : ['node_modules'],
    log_date_format: 'MM-DD HH:mm',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
