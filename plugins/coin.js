// Generated by CoffeeScript 1.12.7
var misc, promise, search;

misc = require('../lib/misc');

promise = require('../lib/promise');

search = function() {
  var coins, rkn;
  coins = misc.get("https://api.coinmarketcap.com/v1/ticker/", {
    json: true
  });
  rkn = misc.get("https://2018.schors.spb.ru/d1_ipblock.json", {
    json: true
  });
  return promise.all([coins, rkn]);
};

module.exports = {
  name: 'CryptoCurrency',
  pattern: /!(coin|койн|коин|к|c)(?:\s+([\d\.]+)?\s*([A-Za-z]+)\s*([A-Za-z]+)?)?\s*$/,
  isConf: true,
  onMsg: function(msg, safe) {
    var amount, isSpecific, ref, reqFrom, reqTo, resQuery;
    if (msg.match[3] != null) {
      amount = msg.match[2] != null ? Number(msg.match[2]) : 1;
      reqFrom = msg.match[3].toUpperCase();
      reqTo = (ref = msg.match[4]) != null ? ref.toUpperCase() : void 0;
      isSpecific = true;
    } else {
      isSpecific = false;
    }
    resQuery = safe(search());
    return resQuery.then((function(_this) {
      return function(arg) {
        var calc, calcBtc, calcUsd, dataFrom, dataTo, e, getData, json, rkn, txt;
        json = arg[0], rkn = arg[1];
        getData = function(code) {
          var q;
          if (code == null) {
            return null;
          }
          return ((function() {
            var i, len, results;
            results = [];
            for (i = 0, len = json.length; i < len; i++) {
              q = json[i];
              if (q.symbol === code) {
                results.push(q);
              }
            }
            return results;
          })())[0];
        };
        try {
          calc = function(from, to, amount) {
            var f, fix, n, t;
            if (amount == null) {
              amount = 1;
            }
            f = Number(from.price_btc);
            t = Number(to.price_btc);
            n = t / f * amount;
            f = -Math.floor(Math.log10(n)) + 1;
            fix = f < 2 ? 2 : f;
            return '*' + n.toFixed(fix) + '*';
          };
          calcUsd = function(from, amount) {
            var f, fix, n;
            if (amount == null) {
              amount = 1;
            }
            n = (Number(from.price_usd)) * amount;
            f = -Math.floor(Math.log10(n)) + 1;
            fix = f < 2 ? 2 : f;
            return '*' + n.toFixed(fix) + '*';
          };
          calcBtc = function(from, amount) {
            var f, fix, n;
            if (amount == null) {
              amount = 1;
            }
            n = (Number(from.price_btc)) * amount;
            f = -Math.floor(Math.log10(n)) + 3;
            fix = f < 4 ? 4 : f;
            return '*' + n.toFixed(fix) + '*';
          };
          if (isSpecific) {
            if (amount > 0 && amount <= 1000000000) {
              dataFrom = getData(reqFrom);
              dataTo = getData(reqTo);
              if ((dataFrom != null) && (dataTo != null)) {
                txt = amount + " " + dataFrom.name + " = " + (calc(dataTo, dataFrom, amount)) + " " + dataTo.name + "\n1h: *" + dataFrom.percent_change_1h + "* 24h: *" + dataFrom.percent_change_24h + "* 7d: *" + dataFrom.percent_change_7d + "*";
                return msg.send(txt, {
                  parseMode: 'Markdown'
                });
              } else if (dataFrom != null) {
                txt = amount + " " + dataFrom.name + " = " + (calcUsd(dataFrom, amount)) + "$\n1h: *" + dataFrom.percent_change_1h + "* 24h: *" + dataFrom.percent_change_24h + "* 7d: *" + dataFrom.percent_change_7d + "*";
                return msg.send(txt, {
                  parseMode: 'Markdown'
                });
              } else {
                return msg.reply('Не знаю такой монеты!');
              }
            } else {
              return msg.reply('Не могу посчитать!');
            }
          } else {
            txt = "1 Bitcoin = " + (calcUsd(getData('BTC'))) + "$\n1 Bitcoin Cash = " + (calcUsd(getData('BCH'))) + "$\n1 Ethereum = " + (calcUsd(getData('ETH'))) + "$\n1 Litecoin = " + (calcBtc(getData('LTC'))) + " BTC\n1 Dash = " + (calcBtc(getData('DASH'))) + " BTC\n1 Ripple = " + (calcBtc(getData('XRP'))) + " BTC\n1 Roskomnadzor = *" + rkn[rkn.length - 1].y + "* блокировок";
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
    return msg.send('Just HODL man');
  }
};
