'use strict';

const Koa = require('koa');
const convert = require('koa-convert');
const route = require('koa-route');
const bodyParser = require('koa-bodyparser');
const rp = require('request-promise');
const http = require('http');
const httpProxy = require('http-proxy');
const logger = require('log4js').getLogger('chrome-server');

const ProxyServers = {};

class ChromeProxy {

  constructor(options) {
    this.options = options;
    const app = this.app = new Koa();
    app.use(convert(bodyParser()));
    app.use(route.post('/api/launch/:id', this._launch.bind(this)));
    app.use(route.post('/api/kill/:id', this._kill.bind(this)));
  }

  listen(port, host, callback) {
    let self = this;
    this.app.listen(port, host, function (...args) {
      self._address = this.address.bind(this);
      return callback && callback(...args);
    });
    return this;
  }

  address() {
    return this._address && this._address();
  }

  _launch(ctx, id) {
    const address = ctx.socket.address();
    logger.info('launch request => %s %j %j', id, address, ctx.request.body);
    return rp.post(`http://${this.options.target}${ctx.request.url}`, {
      json: true,
      body: ctx.request.body
    }).then(rsp => {
      logger.info('chrome lauched => %j', rsp);
      if (rsp.success) {
        const proxyServer = http.createServer();
        return Promise.resolve(new Promise(resolve => {
          proxyServer.listen(0, address.address, address.family, () => {
            resolve(proxyServer);
          })
        })).then(proxyServer => {
          ProxyServers[id] = proxyServer
          const addr = proxyServer.address()
          const proxy = new httpProxy.createProxyServer({
            target: {
              host: this.options.target.split(':')[0],
              port: rsp.data.port
            }
          });
          proxyServer.on('request', function (req, res) {
            logger.debug('proxy request =>', req.url);
            proxy.web(req, res);
          });
          proxyServer.on('upgrade', function (req, socket, head) {
            logger.debug('proxy upgrade=>', req.url);
            // socket.on('data', (buffer) => {
            //   console.log(buffer.toString())
            // })
            proxy.ws(req, socket, head);
          });
          proxy.on('error', (error) => {
            logger.debug('proxy error=>', error);
            proxyServer.close();
            proxy.close();
          });
          rsp.data.port = addr.port;
          ctx.body = rsp;
        });
      } else {
        ctx.body = rsp;
      }
    })
  }

  _kill(ctx, id) {
    const body = ctx.req.body || {};
    logger.info('kill request =>', id, body);
    return rp.post(`http://${this.options.target}${ctx.request.url}`, {
      json: true,
      body: ctx.request.body
    }).then(rsp => {
      const proxyServer = ProxyServers[id];
      if (proxyServer) {
        delete ProxyServers[id];
        proxyServer.close();
      }
      ctx.body = rsp;
    })
  }
}

module.exports.ChromeProxy = ChromeProxy;