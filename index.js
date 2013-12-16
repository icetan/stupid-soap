var urlParse = require('url').parse;

/* Borrowed from https://code.google.com/p/x2js/ */
function escapeXmlChars(str) {
  if(typeof(str) == "string")
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
  else
    return str;
}

function toXml(res, el) {
  return res.concat(
    (el instanceof Array ?
      el.reduce(toXml, res) :
      (el instanceof Object ?
        Object.getOwnPropertyNames(el).map(function(name) {
          var attrs = el['$'+name];
          if (name.substr(0,1) === '$') return '';
          return '<'+name+
            (attrs instanceof Object ?
              ' ' + Object.getOwnPropertyNames(attrs).map(function(an) {
                return an + '="' + escapeXmlChars(''+attrs[an]) + '"';
              }).join(' ') : ''
            )+'>'+toXml([], el[name]).join('')+'</'+name+'>';
        }) : [escapeXmlChars(el)]
      )
    )
  );
}

module.exports = function (opt) {
  var xml, envelope;

  xml = '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
    ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
    ' xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<soap:Body>' +
      '<'+opt.action+' xmlns="'+opt.xmlns+'">' +
        toXml([], opt.params).join('') +
      '</'+opt.action+'>' +
    '</soap:Body></soap:Envelope>';

  envelope = {
    xml: xml,

    headers: {
      'content-type': 'text/xml; charset=utf-8',
      'content-length': xml.length,
      'accept': 'text/xml; charset=utf-8',
      'accept-charset': 'utf-8',
      'SOAPAction': opt.xmlns+opt.action
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
                m[1] : undefined
            },
            m, err, data, chunks;

        if (res.statusCode !== 200) {
          err = new Error('Status code ' + res.statusCode);
        }
        if (opt.raw) {
          chunks = [];
          res.on('data', function (chunk) { chunks.push(chunk); });
          res.on('end', function () {
            result.raw = Buffer.concat(chunks);
            callback(err, result);
          });
        } else {
          data = '';
          res.setEncoding('utf8');
          res.on('data', function (chunk) { data += chunk });
          res.on('end', function (chunk) {
            result.xml = data;
            callback(err, result);
          });
        }
      }).on('error', function(e) { callback(e); });
      req.write(xml);
      req.end();
    }
  };

  return envelope;
};
