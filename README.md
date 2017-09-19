#opersearch-hlg
### 仿阿里云Opensearch PHP sdk的Node sdk
##Showcase

```
const osn = require('opensearch-hlg');
const CloudClient = osn.CloudClient;
const CloudSearch = osn.CloudSearch;

const clientOpts = {
    // 替换host
	host: 'http://opensearch-cn-qingdao.aliyuncs.com',
	accessKeyId: '替换AccessKey',
	secret: '替换secret'
};

const client = new CloudClient(client_opts);

const search = new CloudSearch(client);

search.addIndex('替换opensearch应用名');
search.setQueryString("default:计算");
search.setFormat('json');

const result = search.search()
.then(data ={
    //查询结果
});
```
