// Generated by CoffeeScript 1.12.6
var misc, query, search, xmldoc;

misc = require('../lib/misc');

xmldoc = require('xmldoc');

search = function(txt, kind) {
  return misc.google("animenewsnetwork.com/encyclopedia/" + kind + "/" + txt).then(function(results) {
    var i, len, match, pat, r, url;
    for (i = 0, len = results.length; i < len; i++) {
      r = results[i];
      url = r.unescapedUrl;
      if (kind === 'anime') {
        pat = /^http:\/\/www\.animenewsnetwork\.com\/encyclopedia\/anime\.php\?id=(\d+)$/;
      } else {
        pat = /^http:\/\/www\.animenewsnetwork\.com\/encyclopedia\/manga\.php\?id=(\d+)$/;
      }
      match = pat.exec(url);
      if (match != null) {
        return match[1];
      }
    }
    return null;
  });
};

query = function(id, kind) {
  return misc.get("http://cdn.animenewsnetwork.com/encyclopedia/api.xml?" + kind + "=" + id).then(function(res) {
    return new xmldoc.XmlDocument(res);
  });
};

module.exports = {
  name: 'Anime',
  pattern: /!(аниме|anime|манга|manga) (.+)/,
  onMsg: function(msg, safe) {
    var kind, ref, txt;
    if ((ref = msg.match[1]) === 'аниме' || ref === 'anime') {
      kind = 'anime';
    } else {
      kind = 'manga';
    }
    txt = msg.match[2];
    return safe(search(txt, kind)).then(function(id) {
      if (id != null) {
        return safe(query(id, kind)).then(function(xml) {
          var answer, descr, details, i, ii, img, imgs, len, maxwidth, photoP, rating, ref1, ref2, ref3, ref4, title, url, width, year;
          url = "http://www.animenewsnetwork.com/encyclopedia/" + kind + ".php?id=" + id;
          details = xml.firstChild;
          title = details.childWithAttribute('type', 'Main title').val;
          imgs = details.childWithAttribute('type', 'Picture').childrenNamed('img');
          year = details.childWithAttribute('type', 'Vintage').val;
          rating = (ref1 = (ref2 = details.childNamed('ratings')) != null ? ref2.attr['weighted_score'] : void 0) != null ? ref1 : 'not rated';
          img = null;
          maxwidth = null;
          for (i = 0, len = imgs.length; i < len; i++) {
            ii = imgs[i];
            width = Number(ii.attr.width);
            if ((maxwidth == null) || maxwidth < width) {
              maxwidth = width;
              img = ii.attr.src;
            }
          }
          descr = (ref3 = (ref4 = details.childWithAttribute('type', 'Plot Summary')) != null ? ref4.val : void 0) != null ? ref3 : '';
          answer = title + " (" + year + ") :: " + rating + "\n" + url + "\n\n" + descr;
          photoP = safe(misc.download(img));
          return msg.send(answer, {
            preview: false
          }).then(function() {
            return photoP.then(function(photo) {
              return msg.sendPhoto(photo, {
                caption: title
              });
            });
          });
        });
      } else {
        return msg.reply('Ничего не найдено!');
      }
    });
  },
  onError: function(msg) {
    return msg.send('Я умею патчить KDE под FreeBSD.');
  }
};