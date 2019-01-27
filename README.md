# chrome-launcher-proxy
> chrome-launcher server proxy.

## Install

```bash
$ npm install -g chrome-launcher-proxy
```

## Usage

  Run proxy in command line.
```bash
$ chrome-proxy [options]
```

### Options

 Show all options

```bash
$ chrome-proxy --help
  Usage: chrome-proxy [options]

  Options:

    -V, --version              output the version number
    -target [host[:port]]      target address, port default as listen port
    -h, --host [host]          listen address
    -p, --port [port]          listen port
    -v, --verbose              verbose
    -c, --config [configFile]  config file to load
    --help                     output usage information
```

  Configuration file
```js
{
  port: 5102,
  target: '192.168.1.1',
  host: '0.0.0.0',
  log4js: {
    ... // log4js configuration
  }
}
```