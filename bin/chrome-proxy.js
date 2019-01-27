#!/usr/bin/env node

const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const log4js = require('log4js');
const program = require('commander');
const logger = log4js.getLogger('chrome-server');

const BASE_PATH = process.cwd();
program
  .version('0.1.0')
  .allowUnknownOption()
  .option('--target [host:port]', 'target address')
  .option('-h, --host [host]', 'listen address', '0.0.0.0')
  .option('-p, --port [port]', 'listen port', parseInt, 0)
  .option('-v, --verbose', 'verbose')
  .option('-c, --config [configFile]', 'config file to load')
  .parse(process.argv);

/**
 * 默认日志配置
 */
const logConfig = {
  replaceConsole: true,
  appenders: {
    out: {
      type: 'stdout'
    }
  },
  categories: {
    default: {
      appenders: ['out'],
      level: program.verbose && 'trace' || 'debug'
    }
  }
};

/**
 * 配置信息,从当前运行目录加载配置
 */
let configs = [{
  log4js: logConfig
}];
if (program.config) {
  // 从配置文件中加载
  configs = configs.concat(glob.sync(program.config).map((file) => {
    return require(path.resolve(BASE_PATH, file));
  }));
}

const config = _.merge.apply(null, configs);
const port = program.port || parseInt(process.env.PORT, 0)
if (port >= 0) {
  config.port = port
}
if (program.host) {
  config.host = program.host;
}
if (program.target) {
  config.target = program.target;
}

/**
 * 启用日志配置信息
 */
log4js.configure(config.log4js);

if (!config.target) {
  return logger.error('Miss proxy target');
}
if (!/\:\d+/.test(config.target)) {
  config.target = config.target + ':' + config.port;
}

logger.trace('starting...');
const ChromeProxy = require('../lib/proxy').ChromeProxy;
const server = new ChromeProxy(config);
server.listen(config.port, config.host, (err) => {
  if (err) {
    return logger.error('Server start error', err);
  }
  const addr = server.address();
  logger.debug('listen => %s:%s', addr.address, addr.port);
  logger.debug('server started in `%s`', BASE_PATH);
});