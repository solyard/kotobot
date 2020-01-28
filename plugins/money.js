// Generated by CoffeeScript 1.12.7
var config, formatDate, getCurrencies, logger, misc, oil, ph, pq, search, unpack, xor;

logger = require('winston');

misc = require('../lib/misc');

config = require('../lib/config');

pq = require('../lib/promise');

ph = new (require('telegraph-node'));

xor = require('lodash.xor');

search = function() {
  return misc.get("https://openexchangerates.org/api/latest.json", {
    qs: {
      app_id: config.options.exchangekey,
      show_alternative: 1
    },
    json: true
  });
};

getCurrencies = function() {
  return misc.get("https://openexchangerates.org/api/currencies.json", {
    qs: {
      show_alternative: 1
    },
    json: true
  });
};

unpack = function(code) {
  var env;
  env = {
    "eval": function(c) {
      return code = c;
    },
    window: {},
    document: {}
  };
  eval("with(env) {" + code + "}");
  return code;
};

oil = function() {
  return misc.get("http://www.forexpf.ru/_informer_/commodities.php").then(function(first) {
    var id;
    id = /comod\.php\?id=(\d+)/.exec(first)[1];
    return misc.get("http://www.forexpf.ru/_informer_/comod.php?id=" + id);
  }).then(function(second) {
    var cbrenta, cbrentb;
    second = unpack(second);
    cbrenta = Number(/document\.getElementById\(\"cbrenta\"\)\.innerHTML=\"([\d\.]+)\"/.exec(second)[1]);
    cbrentb = Number(/document\.getElementById\(\"cbrentb\"\)\.innerHTML=\"([\d\.]+)\"/.exec(second)[1]);
    return (cbrenta + cbrentb) / 2;
  });
};

formatDate = function(date) {
  var d, m, y;
  d = date.getDate();
  if (d < 10) {
    d = "0" + d;
  }
  m = date.getMonth() + 1;
  if (m < 10) {
    m = "0" + m;
  }
  y = date.getFullYear();
  return (d + "." + m + "." + y + " ") + date.toLocaleTimeString();
};

module.exports = {
  name: 'Currency',
  pattern: /!(курс|деньги)(?:\s+([\d\.]+)?\s*([A-Za-z]{3})\s*([A-Za-z]{3})?)?\s*$/,
  isConf: true,
  lastCurr: [],
  lastCurrUrl: 'Денег нет',
  money: function(msg) {
    return (function(_this) {
      return function(c) {
        var cond, diff, k, nodes, v;
        diff = xor(_this.lastCurr, Object.keys(c));
        cond = _this.lastCurr.length > 0 && diff.length === 0;
        if (cond) {
          return msg.send(_this.lastCurrUrl);
        }
        _this.lastCurr = Object.keys(c);
        nodes = (function() {
          var results;
          results = [];
          for (k in c) {
            v = c[k];
            results.push({
              tag: 'p',
              children: [
                {
                  tag: 'b',
                  children: [k]
                }, " - " + v
              ]
            });
          }
          return results;
        })();
        return ph.editPage(config.options.telegraph, 'Dengi-07-12-2', 'Деньги', nodes).then(function(arg) {
          var url;
          url = arg.url;
          _this.lastCurrUrl = url;
          return msg.send(url);
        });
      };
    })(this);
  },
  searchCached: function() {
    if ((this.lastResultTime != null) && Date.now() - this.lastResultTime < 1800 * 1000) {
      return pq.resolved(this.lastResult);
    } else {
      return search();
    }
  },
  onMsg: function(msg, safe) {
    var amount, isSpecific, reqFrom, reqTo, resQuery;
    if (msg.match[1].toLowerCase() === 'деньги') {
      safe(getCurrencies().then(this.money(msg)));
      return;
    }
    if (msg.match[3] != null) {
      amount = msg.match[2] != null ? Number(msg.match[2]) : 1;
      reqFrom = msg.match[3].toUpperCase();
      reqTo = msg.match[4] != null ? msg.match[4].toUpperCase() : 'RUB';
      isSpecific = true;
    } else {
      isSpecific = false;
    }
    if (isSpecific) {
      resQuery = safe(pq.all([this.searchCached()]));
    } else {
      resQuery = safe(pq.all([search(), oil()]));
    }
    return resQuery.then((function(_this) {
      return function(arg) {
        var calc, date, e, json, oil, ref, reqToS, txt;
        json = arg[0], oil = arg[1];
        try {
          _this.lastResult = json;
          _this.lastResultTime = Date.now();
          date = new Date(json.timestamp * 1000);
          calc = function(from, to, amount) {
            var f, fix, n, t;
            if (amount == null) {
              amount = 1;
            }
            f = json.rates[from];
            t = json.rates[to];
            n = t / f * amount;
            f = -Math.floor(Math.log10(n)) + 1;
            fix = f < 2 ? 2 : f;
            return '*' + n.toFixed(fix) + '*';
          };
          if (isSpecific) {
            if (amount > 0 && amount < 1000000000) {
              if (reqFrom in json.rates && reqTo in json.rates) {
                if (reqTo === 'RUB') {
                  reqToS = 'деревяшек';
                } else if (reqTo === 'BYR') {
                  reqToS = 'перков';
                } else if (reqTo === 'BYN') {
                  reqToS = 'новоперков';
                } else {
                  reqToS = reqTo;
                }
                txt = amount + " " + reqFrom + " = " + (calc(reqFrom, reqTo, amount)) + " " + reqToS;
                return msg.send(txt, {
                  parseMode: 'Markdown'
                });
              } else {
                return msg.reply('Не знаю такой валюты!');
              }
            } else {
              return msg.reply('Не могу посчитать!');
            }
          } else {
            txt = "Курс на *" + (formatDate(date)) + "*\n\n1 Brent = *" + ((ref = oil != null ? oil.toFixed(2) : void 0) != null ? ref : '???') + "*$\n1 $ = " + (calc('USD', 'RUB')) + " деревяшек\n1 € = " + (calc('EUR', 'RUB')) + " деревяшек\n1 Swiss franc = " + (calc('CHF', 'RUB')) + " деревяшек\n" + (calc('USD', 'JPY')) + " ¥ = 1$\n1 Bitcoin = " + (calc('BTC', 'ETH')) + " ETH = " + (calc('BTC', 'USD', 1, 0)) + "$\n" + (calc('USD', 'UAH')) + " укрорублей = 1$\n1 бульба = " + (calc('BYN', 'USD')) + "$ = " + (calc('BYN', 'RUB')) + " деревяшек";
            return msg.send(txt, {
              parseMode: 'Markdown'
            });
          }
        } catch (error) {
          e = error;
          return _this._onError(msg, e);
        }
      };
    })(this));
  },
  onError: function(msg) {
    return msg.send('65 копеек, как у дедов!');
  }
};
