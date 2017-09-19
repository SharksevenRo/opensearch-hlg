const opensearch = require('../index');

const CloudClient = opensearch.CloudClient;
const CloudSearch = opensearch.CloudSearch;

const client_opts = {
    host: 'http://opensearch-cn-qingdao.aliyuncs.com',
    accessKeyId: 'xxx',
    secret: 'xxxxx',
    debug: true
};

const client = new CloudClient(client_opts);

const search = new CloudSearch(client);
search.addIndex('sharkseven');
search.setQueryString('default:计算');
search.setFormat('json');
search.addFilter('feature=' + 2);
search.setStartHit(0);
search.setHits(2);
search.setFirstFormulaName('feature_order_by');
console.log(search);
search.search().then(data => {
    console.log(data);
});
