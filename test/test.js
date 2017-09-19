const opensearch = require('../index');

const CloudClient = opensearch.CloudClient;
const CloudSearch = opensearch.CloudSearch;

const client_opts = {
    host: 'http://opensearch-cn-qingdao.aliyuncs.com',
    accessKeyId: 'LTAI3hadfiygtVRH',
    secret: 'UBFWT8rtzLeDRlEHSOA0AgkAsjzWjn',
    debug: true
};

const client = new CloudClient(client_opts);

const search = new CloudSearch(client);
search.addIndex('sharkseven');
search.setQueryString('default:搜索');
// search.setFormat('json');
console.log(search);
const result = search.search().then(data => {
    console.log(data);
});
console.log(result);
