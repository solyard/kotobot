// Generated by CoffeeScript 1.12.7
var CB_DELAY, config, firstKeyboard, lastKeyboard, logger, misc, pageKeyboard, search;

logger = require('winston');

config = require('../lib/config');

misc = require('../lib/misc');

CB_DELAY = 1500;

search = function(txt, rsz, offset) {
  if (rsz == null) {
    rsz = 1;
  }
  if (offset == null) {
    offset = 1;
  }
  return misc.get("https://www.googleapis.com/customsearch/v1?", {
    qs: {
      key: config.options.googlekey,
      cx: config.options.googlecx,
      gl: 'ru',
      hl: 'ru',
      num: rsz,
      start: offset,
      safe: 'high',
      searchType: 'image',
      q: txt
    },
    json: true
  }).then(function(res) {
    return res.items;
  });
};

firstKeyboard = [
  [
    {
      text: 'Следующая',
      callback_data: 'next'
    }
  ]
];

lastKeyboard = [
  [
    {
      text: 'Предыдущая',
      callback_data: 'prev'
    }
  ]
];

pageKeyboard = [
  [
    {
      text: 'Предыдущая',
      callback_data: 'prev'
    }, {
      text: 'Следующая',
      callback_data: 'next'
    }
  ]
];

module.exports = {
  name: 'Images',
  pattern: /!(покажи|пик|пек|img|pic|moar|моар|more|еще|ещё)(?: (.+))?/,
  isConf: true,
  updateInline: function(context) {
    return context.msg.edit(context.pic.link, {
      inlineKeyboard: context.keyboard
    });
  },
  sendInline: function(msg, pic, picSet, txt) {
    var context, url;
    url = pic.link;
    context = {
      txt: txt,
      pic: pic,
      picSet: picSet,
      index: picSet.indexOf(pic),
      keyboard: firstKeyboard,
      isDisabled: false
    };
    return msg.send(url, {
      inlineKeyboard: context.keyboard,
      callback: (function(_this) {
        return function(cb, msg) {
          return _this.onCallback(context, cb, msg);
        };
      })(this)
    });
  },
  onCallback: function(context, cb, msg) {
    var now, res;
    if (context.isDisabled) {
      cb.answer('');
      return;
    }
    if (!this.bot.isSudo(cb)) {
      now = Date.now();
      if ((this.lastClick != null) && now - this.lastClick < CB_DELAY) {
        cb.answer('Слишком много запросов, подождите 3 секунды...');
        return;
      }
      this.lastClick = now;
    }
    context.msg = msg;
    switch (cb.data) {
      case 'prev':
        if (context.index > 1) {
          context.index -= 1;
        } else {
          logger.debug('disable prev button');
          context.index = 0;
          context.keyboard = firstKeyboard;
        }
        context.pic = context.picSet[context.index];
        this.updateInline(context);
        return cb.answer('');
      case 'next':
        res = new Promise((function(_this) {
          return function(res) {
            if (context.index + 1 < context.picSet.length) {
              context.index += 1;
              context.keyboard = pageKeyboard;
              return res();
            } else {
              logger.debug('make new request');
              context.isDisabled = true;
              return _this.search(context.txt, context.picSet.length).then(function(results) {
                context.isDisabled = false;
                context.index = context.picSet.length + 1;
                context.picSet = context.picSet.concat(results);
                return res();
              });
            }
          };
        })(this));
        return res.then((function(_this) {
          return function() {
            context.pic = context.picSet[context.index];
            _this.updateInline(context);
            return cb.answer('');
          };
        })(this));
    }
  },
  search: function(txt, offset) {
    return search(txt, 8, offset);
  },
  onMsg: function(msg, safe) {
    var ref, res, txt;
    txt = msg.match[2];
    if ((txt == null) && (((ref = msg.reply_to_message) != null ? ref.text : void 0) != null)) {
      txt = msg.reply_to_message.text;
    }
    if (txt == null) {
      return;
    }
    res = this.search(txt);
    return safe(res).then((function(_this) {
      return function(results) {
        var result;
        if ((results == null) || results.length === 0) {
          return msg.reply("Ничего не найдено!");
        } else {
          result = results[0];
          return _this.sendInline(msg, result, results, txt);
        }
      };
    })(this));
  },
  onError: function(msg) {
    return msg.send('Поиск не удался...');
  }
};
