module.exports = {
  apps: [
    {
      name: "zeewear-erp",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      restart_delay: 2000,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
    },
  ],
};
