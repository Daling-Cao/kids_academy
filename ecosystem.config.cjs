module.exports = {
  apps: [{
    name: 'kids-academy',
    script: 'server.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    cwd: '/var/www/kids-academy',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/kids-academy/error.log',
    out_file: '/var/log/kids-academy/out.log',
  }]
};
