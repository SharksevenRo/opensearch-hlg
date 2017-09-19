/**
 * Cloudsearch service。
 *
 * 此方法主要提供一下功能：
 * 1、根据请求的参数来生成签名和nonce。
 * 2、请求API服务并返回response结果。
 */

const extend = require('extend');
const utility = require('utility');
const request = require('request');
const s2 = require('small2');

/**
 * version:    当前API的版本号。
 * sdkVersion: SDK的版本号。
 * method:     请求方式，post/get。
 * timeout:    请求API的时间，单位为秒。
 * connect_timeout: 请求API的连接超时时间，单位为秒。
 * host:     请求的domain地址。
 * protocol: 请求协议，默认http
 * connect:  当前的请求方式，有socket和curl两种。
 * gzip: 是否打开gzip功能。
 * 如果打开gzip功能，则会在请求头中加上Accept-Encoding:gzip信息，同时如果服务器也设置了
 * 此功能的话，则服务器会返回zip的数据，此类会拿到gzip数据然后解压缩得到真实的数据。
 *
 * 此功能是用服务器计算换取网络耗时，对整个latency会有所降低。
 * debug: 是否开启debug信息。
 * debugInfo: debug信息，当debug = true时 存储sdk调用时产生的debug信息，供 getRequest 调用。
 * key_type: 指定使用加密key和对应的secret。enum('opensearch','aliyun')。
 * signatureMethod:  指定阿里云签名算法方式。enum('HMAC-SHA1'）。
 * signatureVersion: 指定阿里云签名算法版本。enum('HMAC-SHA1'）。
 * accessKeyId: 用户阿里云网站中的accessKeyId,key_type为aliyun使用。此信息阿里云网站中提供。
 * secret:  用户阿里云accessKeyId对应的秘钥，key_type为aliyun使用。此信息阿里云网站中提供。
 * baseURI: 请求API的base URI。
 *
 * @type {Object}
 */
var default_opts = {
    version: 'v2',
    sdkVersion: 'v2.0.6',
    method: 'GET',
    timeout: 30,
    connect_timeout: 30,
    host: 'http://opensearch.aliyuncs.com',
    protocol: 'http',
    gzip: false,
    debug: false,
    key_type: 'aliyun',
    signatureMethod: 'HMAC-SHA1',
    signatureVersion: '1.0',
    accessKeyId: '',
    secret: '',
    baseURI: ''
};

/**
* 构造函数
*
* 与服务器交互的客户端，支持单例方式调用
*
* @param array opts   包含下面一些可选信息
* @subparam string accessKeyId    用户的key，从阿里云网站中获取的Access Key ID。
* @subparam string secret  用户的secret，对应的Access Key Secret。
* @subparam string version 使用的API版本。 默认值为:v2
* @subparam string host    指定请求的host地址。默认值为:http://opensearch-cn-hangzhou.aliyuncs.com
* @subparam string gzip    指定返回的结果用gzip压缩。 默认值为:false
* @subparam string debug   打印debug信息。 默认值为:false
* @subparam string signatureMethod  签名方式，目前支持HMAC-SHA1。 默认值为:HMAC-SHA1
* @subparam string signatureVersion 签名算法版本。 默认值为:1.0
* @subparam string key_type key和secret类型，在这里必须设定为'aliyun'，表示这个是aliyun颁发的
*/
function CloudClient(opts) {
    this._opts = extend({}, default_opts, opts);

    // 对于用户通过参数指定的host，需要检查host结尾是否有/，有则去掉
    this._opts.host = this._opts.host.replace(/\/$/g, '');
    this._opts.baseURI = this._opts.host;
}

// CloudClient.prototype._opts = {}

/**
* 请求服务器
*
* 向服务器发出请求并获得返回结果。
*
* @param string path  当前请求的path路径。
* @param array params 当前请求的所有参数数组。
* @param string method 当前请求的方法。默认值为:GET
* @return string 返回获取的结果。
* @donotgeneratedoc
*/
CloudClient.prototype.callRequest = function(path, params, method) {
    const opts = this._opts;
    const url = opts.baseURI + path;

    opts.method = method || opts.method;
    params = (params || {});

    params['Version'] = opts.version;
    params['AccessKeyId'] = opts.accessKeyId;
    params['SignatureMethod'] = opts.signatureMethod;
    params['SignatureVersion'] = opts.signatureVersion;
    params['SignatureNonce'] = _nonceAliyun();
    params['Timestamp'] = s2.getUTCDate('YYYY-mm-ddTHH:ii:ssZ');
    params['Signature'] = _signAliyun(params, opts);

    if(opts.protocol === 'http') {
        return _httpRequest(url, params, opts);
    }
};

/**
 * 生产当前的aliyun签名方式对应的nonce值
 *
 * NOTE：这个值要保证访问唯一性，建议用如下算法，商家也可以自己设置一个唯一值
 *
 * @return string  返回生产的nonce串
 */
function _nonceAliyun() {
    return Date.now() + '' + parseInt(Math.random() * 8999 + 1000);
}

/**
 * 根据参数生成当前得签名
 *
 * 如果指定了sign_mode且sign_mode为1，则参数中的items将不会被计算签名
 *
 * @param array $params 返回生成签名
 * @return string
 */
function _signAliyun(params, opts) {
    let _params = extend({}, params);
    (_params['sign_mode'] === 1) && delete _params.items;

    _params = _paramsFilter(_params);
    const query = _percentEncode(_params);
    const baseString = opts.method.toUpperCase() + '&%2F&' + _percentEncode(query);

    return utility.hmac('sha1', opts.secret + '&', baseString);
}

/**
 * 过滤阿里云签名中不用来签名的参数,并且排序
 *
 * @param array parameters
 * @return array
 *
 */
function _paramsFilter(parameters) {
    const params = {};
    const keys = Object.keys(parameters).sort();

    // 去除空值的参数和Signature
    keys.map(function(k) {
        if(k !== 'Signature' && (!!parameters[k] || parameters[k] === 0)) {
            params[k] = parameters[k];
        }
    });
    return params;
}

/**
 * 阿狸云的编码方式
 *
 * @param  object code 要转码的code
 * @return string      转码结果
 *
 */
function _percentEncode(code) {
    // 使用encodeURIComponent编码后，
    // 将 !, ', (, ), *做替换即满足 API规定的编码规范
    var res = s2.parseString(code, true);

    // TODO 空格和+，也许还有问题
    res = res.replace(/\*/g, '%2A');
    res = res.replace(/!/g, '%21');
    res = res.replace(/'/g, '%27');
    res = res.replace(/\(/g, '%28');
    res = res.replace(/\)/g, '%29');

    return res;
}

/**
 * 通过http请求阿里云
 *
 * @param string url 请求的URI。
 * @param array params 请求的参数数组。
 * @param object opts
 * @subparam string method 请求的方法，默认为GET。
 * @subparam boolean gzip 是否通过GZIP压缩，默认为false。
 * @subparam string sdkVersion 阿里云SDK版本，默认v2.0.6。
 *
 * @return string 返回获取的结果。
 */
function _httpRequest(url, params, opts) {

    // console.log("url===>\n" + url)
    // console.log("params===>\n")
    // for(var i in params) {
    //   console.log(i+":"+params[i])
    // }
    const paramSerialize = _percentEncode(params);
    const method = opts.method.toUpperCase();
    if(method === 'GET') {
        url += (url.indexOf('?') === -1 ? '?' : '&') + paramSerialize;
    }

    // request的请求参数
    const httpOpts = {
        method: method,
        url: url,
        headers: {
            'User-Agent': 'opensearch/node sdk ' + opts.sdkVersion,
            'timeout': opts.timeout || 30,
            'gzip': opts.gzip || false
        }
    };
    console.log(url);
    return new Promise(function(resolve, reject) {
        request(httpOpts, function(err, res, body) {
            if(err) {
                reject(err);
            }
            resolve(body);
        });
    });
}

module.exports = exports = CloudClient;
