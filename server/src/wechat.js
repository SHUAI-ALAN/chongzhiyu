const crypto = require('crypto');

function verifySignature({ token, signature, timestamp, nonce }) {
  if (!token || !signature || !timestamp || !nonce) {
    return false;
  }

  const sorted = [token, timestamp, nonce].sort().join('');
  const digest = crypto.createHash('sha1').update(sorted).digest('hex');
  return digest === signature;
}

function buildTextReply({ toUser, fromUser, content }) {
  const now = Math.floor(Date.now() / 1000);
  return [
    '<xml>',
    `<ToUserName><![CDATA[${toUser}]]></ToUserName>`,
    `<FromUserName><![CDATA[${fromUser}]]></FromUserName>`,
    `<CreateTime>${now}</CreateTime>`,
    '<MsgType><![CDATA[text]]></MsgType>',
    `<Content><![CDATA[${content}]]></Content>`,
    '</xml>'
  ].join('');
}

function readXmlText(xml, tagName) {
  const pattern = new RegExp(`<${tagName}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tagName}>`);
  const match = xml.match(pattern);
  return match ? match[1].trim() : '';
}

module.exports = {
  verifySignature,
  buildTextReply,
  readXmlText
};
