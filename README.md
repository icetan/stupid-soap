# SOAP, blä! 

This is a non complient SOAP client.

```javascript
var soap = require('stupid-soap');

soap({
  action: 'Gnurp',
  params: {
    i: 'do',
    not: 'like',
    soap: '!'
  }
  xmlns: 'http://example.com/'
}).send('https://example.com/my/barf/WebService.asmx', function (err, data) {
  console.log(err, data);
});
```
