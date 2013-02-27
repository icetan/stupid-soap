var urlParse = require('url').parse;

module.exports = function (opt) {
  var xml, envelope;

  function params() {
    var res = [], i;
    for (i in opt.params)
      res.push('<'+i+'>'+opt.params[i]+'</'+i+'>');
    return res.join('');
  }

  xml = '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
    ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
    ' xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<soap:Body>' +
      '<'+opt.action+' xmlns="'+opt.xmlns+'">' +
        params() +
      '</'+opt.action+'>' +
    '</soap:Body></soap:Envelope>';

  envelope = {
    xml: xml,

    headers: {
      'content-type': 'text/xml; charset=utf-8',
      'content-length': xml.length,
      'SOAPAction': opt.xmlns+opt.action
    },

    send: function (url, callback) {
      var urlParts = urlParse(url),
          protocol = urlParts.protocol.slice(0,-1),
          opt = {
            hostname: urlParts.hostname,
            port: urlParts.port,
            path: urlParts.path,
            method: 'POST',
            headers: envelope.headers
          }, req;
      req = require(protocol).request(opt, function (res) {
        var err, data = '';
        if (res.statusCode !== 200) {
          err = 'Status code not OK: ' + res.statusCode;
        }
        res.setEncoding('utf8');
        res.on('data', function (chunk) { data += chunk });
        res.on('end', function (chunk) {
          callback(err, {
            xml: data,
            headers: res.headers
          });
        });
      }).on('error', function(e) {
        callback('problem with request: ' + e.message);
      });
      req.write(xml);
      req.end();
    }
  };

  return envelope;
};
