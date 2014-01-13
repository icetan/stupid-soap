var urlParse = require('url').parse,
    iconv = require('iconv-lite');


/* Borrowed from https://code.google.com/p/x2js/ */
function escapeXmlChars(str) {
  if(typeof(str) == "string")
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
  else
    return str;
}

function _toXml(res, el) {
  return res.concat(
    (el instanceof Array ?
      el.reduce(_toXml, res) :
      (el instanceof Object ?
        Object.getOwnPropertyNames(el).map(function(name) {
          var attrs = el['$'+name];
          if (name.substr(0,1) === '$') return '';
          return '<'+name+
            (attrs instanceof Object ?
              ' ' + Object.getOwnPropertyNames(attrs).map(function(an) {
                return an + '="' + escapeXmlChars(''+attrs[an]) + '"';
              }).join(' ') : ''
            )+'>'+_toXml([], el[name]).join('')+'</'+name+'>';
        }) : [escapeXmlChars(el)]
      )
    )
  );
}

function toXml(obj) {
  return _toXml([], obj).join('');
}

module.exports = function (opt) {
  var xml, envelope;

  xml = (opt.raw ?
      (opt.xml ||
        '<?xml version="1.0" encoding="utf-8"?>\n' + toXml(opt.params)
      ) :
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
      ' xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
      '<soap:Body>' +
        '<'+opt.action+' xmlns="'+opt.xmlns+'">' +
          (opt.xml || toXml(opt.params)) +
        '</'+opt.action+'>' +
      '</soap:Body></soap:Envelope>'
    );

  envelope = {
    xml: xml,

    headers: {
      'content-type': 'text/xml; charset=utf-8',
      'content-length': xml.length,
      'accept': 'text/xml; charset=utf-8',
      'accept-charset': 'utf-8'
    },

    send: function (url, callback) {
      var urlParts = urlParse(url),
          protocol = urlParts.protocol.slice(0,-1),
          opt_ = {
            hostname: urlParts.hostname,
            port: urlParts.port,
            path: urlParts.path,
            method: 'POST',
            headers: envelope.headers
          }, req;
      req = require(protocol).request(opt_, function (res) {
        var ct = res.headers['content-type'],
            result = {
              headers: res.headers,
              charset: (ct && (m = ct.match(/charset=([^\s]+)/i)) && m[1]) ?
                m[1].toLowerCase() : undefined
            },
            chunks = [],
            m, err;

        if (res.statusCode !== 200) {
          err = new Error('Status code ' + res.statusCode);
        }
        res.on('data', function (chunk) { chunks.push(chunk); });
        res.on('end', function () {
          result.raw = Buffer.concat(chunks);
          result.xml = iconv.decode(result.raw, result.charset || 'utf8');
          callback(err, result);
        });
      }).on('error', function(e) { callback(e); });
      req.write(xml);
      req.end();
    }
  };

  if (!opt.raw) envelope.headers.SOAPAction = opt.xmlns+opt.action;

  return envelope;
};

module.exports.toXml = toXml;
