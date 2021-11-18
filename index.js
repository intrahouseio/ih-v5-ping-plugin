const ping = require ("net-ping");
const dns = require ("dns");
const plugin = require('ih-plugin-api')();

const session = ping.createSession();


let opt = {};
let settings = {};
let channels = [];


const DATA = {};

function getIP(channel) {
  return new Promise(resolve => {
    dns.resolve4(channel.ip, (err, ip) => {
      if (err || ip.length === 0) {
        resolve(channel)
      } else {
        channel.ip = ip[0];
        resolve(channel)
      }
    })
  });
}


function getIPtoHost(channels) {
  return Promise.all(channels.map(getIP));
}

function check(ip, id) {
  if (DATA[ip].error > DATA[ip].lost) {
    plugin.log(`${id} ${ip}: offline`);
    plugin.sendData([{ id, value: 0, ext: {} }]);

    DATA[ip].error = 0;
  } else {
    if (DATA[ip].error === 0) {
      plugin.log(`${id} ${ip}: online `);
      plugin.sendData([{ id, value: 1, ext: {} }]);

      DATA[ip].error = 0;
    }
  }
}

function response(error, ip, id) {
  if (error) {
    DATA[ip].error = DATA[ip].error + 1;
  } else {
    DATA[ip].error = 0;
  }
  check(ip, id);
}

function createPinger(id, ip, interval, lost) {
  DATA[ip] = { error: 0, lost };
  setInterval(() => session.pingHost(ip, (err, ip) => response(err, ip, id)), interval * 1000)
  session.pingHost(ip, (err, ip) => response(err, ip, id));
}

async function main() {
  opt = plugin.opt;
  settings = await plugin.params.get();
  channels = await plugin.channels.get();

  getIPtoHost(channels)
    .then((items) => {
      items.forEach(item => {
        createPinger(item.id, item.ip, item.interval, item.lost);
      });
    });
}


main();
