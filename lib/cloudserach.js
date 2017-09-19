
/**
 * opensearch 搜索接口。
 *
 * 此接口提供给用户通过简单的方式来生成问天3的语法，并提交服务进行查询。
 *
 * 此接口生成的http 请求串的参数包含：query、client_id、index_name、fetch_fields、
 * formula_name和summary。
 *
 * example：
 * <code>
 * $search = new CloudsearchSearch($client);
 * $search->search(array('indexes' => 'my_indexname'));
 * </code>
 * 或
 *
 * <code>
 * $search = new CloudsearchSearch($client);
 * $search->addIndex('my_indexname');
 * $search->search();
 * </code>
 *
 */

const extend = require('extend');
const s2 = require('small2');


/**
 * 设定搜索结果集升降排序的标志，"+"为升序，"-"为降序。
 *
 * @const string
 */
const SORT_INCREASE = '+';
const SORT_DECREASE = '-';

const SEARCH_TYPE_SCAN = 'scan';

/**
 *
 * @type {Object}
 */
const default_opts = {};

/**
 * 此次检索指定的应用名称。
 *
 * 可以指定单个应用名称，也可以指定多个应用名称结合。
 *
 * @const array
 */
default_opts.indexes = [];

/**
 * 指定某些字段的一些summary展示规则。
 *
 * 这些字段必需为可分词的text类型的字段。
 *
 * 例如:
 * 指定title字段为： summary_field=>title
 * 指定title长度为50：summary_len=>50
 * 指定title飘红标签：summary_element=>em
 * 指定title省略符号：summary_ellipsis=>...
 * 指定summary缩略段落个数：summary_snipped=>1
 * 那么当前的字段值为：
 * <code>
 * array('title' => array(
 *   'summary_field' => 'title',
 *   'summary_len' => 50,
 *   'summary_element' => 'em',
 *   'summary_ellipsis' => '...',
 *   'summary_snipped' => 1,
 *   'summary_element_prefix' => 'em',
 *   'summary_element_postfix' => '/em')
 * );
 * </code>
 * @const array
 */
default_opts.summary = {};

/**
 * config 子句。
 * [TODO 未被用到]
 *
 * config子句只能接收三个参数（start, format, hit），其中：
 * start为当前结果集的偏移量；
 * format为当前返回结果的格式，有json，xml和protobuf三种格式；
 * hit为当前获取结果条数。
 *
 * 例如 "start:0,format:xml,hit:20"
 *
 * @const string
 */
default_opts.clauseConfig = '';

/**
 * 返回的数据的格式，有json、xml，protobuf三种类型可选；默认为json格式。
 * @const string
 */
default_opts.format = 'json';

/**
 * 设定返回结果集的offset，默认为0。
 * @const int
 */
default_opts.start = 0;

/**
 * 设定返回结果集的个数，默认为20。
 * @const int
 */
default_opts.hits = 20;

/**
 * 设定排序规则。
 * @const array
 */
default_opts.sort = {};

/**
 * 设定过滤条件。
 * @const string
 */
default_opts.filters = '';

/**
 * aggregate设定规则。
 * @const array
 */
default_opts.aggregate = {};

/**
 * distinct 排序。
 * @const array
 */
default_opts.distinct = {};

/**
 * 返回字段过滤。
 *
 * 如果设定了此字段，则只返回此字段里边的field。
 * @const array
 */
default_opts.fetches = [];

/**
 * rerankSize表示参与精排算分的文档个数，一般不用使用默认值就能满足，不用设置,会自动使用默认值200
 * @const int
 */
default_opts.rerankSize = 200;

/**
 * query 子句。
 *
 * query子句可以为query='鲜花'，也可以指定索引来搜索，例如：query=title:'鲜花'。
 * 详情请浏览setQueryString($query)方法。
 *
 * @const string
 */
default_opts.query = '';

/**
 * 指定表达式名称，表达式名称和结构在网站中指定。
 *
 *
 * @const string
 */
default_opts.formulaName = '';

/**
 * 指定粗排表达式名称，表达式名称和结构在网站中指定。
 * @const string
 */
default_opts.firstFormulaName = '';

/**
 * 指定kvpairs子句的内容，内容为k1:v1,k2:v2的方式表示。
 * @const string
 */
default_opts.kvpair = '';

/**
 * 指定qp 名称。
 * @const array
 */
default_opts.QPName = [];

/**
 * 指定关闭的方法名称。
 * @const unknown
 */
default_opts.functions = {};

/**
 * 设定自定义参数。
 *
 * 如果api有新功能（参数）发布，用户不想更新sdk版本，则可以自己来添加自定义的参数。
 *
 * @const string
 */
default_opts.customParams = {};

/**
 * scrollId 扫描起始id
 *
 * @type {[type]}
 */
default_opts.scrollId = null;

default_opts.searchType = '';

default_opts.scroll = null;

/**
 * 请求API的部分path。
 * @const string
 */
default_opts.path = '/search';


/**
 * 构造函数
 *
 * @param CloudsearchClient $client 此对象由CloudsearchClient类实例化。
 */
function CloudSearch(client, opts) {
    this._opts = extend({}, default_opts, opts);
    this.client = client;
};

/**
 * 设置scroll扫描起始id
 *
 * @param scrollId 扫描起始id
 */
CloudSearch.prototype.setScrollId = function(scrollId) {
    this._opts.scrollId = scrollId;
};

/**
 * 获取scroll扫描起始id
 *
 * @return string 扫描起始id
 */
CloudSearch.prototype.getScrollId = function() {
    return this._opts.scrollId;
};

/**
 * 请求scroll api。
 *
 * 类似search接口，但是不支持sort, aggregate, distinct, formula_name, summary及qp,
 * start 等功能。
 *
 * scroll实现方式：
 * 第一次正常带有指定的子句和参数调用scroll接口，此接口会返回scroll_id信息。
 * 第二次请求时只带此scroll_id信息和scroll参数即可。
 *
 * 类似第一次请求：
 * $search = new CloudsearchSearch($client);
 * $search->addIndex("juhuasuan");
 * $search->setQueryString("default:'酒店'");
 * $search->setFormat('json');
 * $search->setHits(10);
 * $search->setScroll("1m");
 * $result = $search->scroll();
 *
 * $array = json_decode($result, true);
 * $scrollId = $array['result']['scroll_id'];
 *
 * 第二次请求：
 * $search = new CloudsearchSearch($client);
 * $search->setScroll("1m");
 * $search->setScrollId($scrollId);
 * $result = $search->scroll();
 *
 * @param array $opts 扫描请求所需参数
 * @return string 扫描结果
 */
CloudSearch.prototype.scroll = function(opts) {
    this.extract(opts || [], 'scroll');
    return this.callQuery('scroll');
};

/**
 * 执行搜索
 *
 * 执行向API提出搜索请求。
 * 更多说明请参见 [API 配置config子句]({{!api-reference/query-clause&config-clause!}})
 * @param array $opts 此参数如果被复制，则会把此参数的内容分别赋给相应的变量。此参数的值可能有以下内容：
 * @subparam string query 指定的搜索查询串，可以为query=>"索引名:'鲜花'"。
 * @subparam array indexes 指定的搜索应用，可以为一个应用，也可以多个应用查询。
 * @subparam array fetch_fields 设定返回的字段列表，如果只返回url和title，则为 array('url', 'title')。
 * @subparam string format 指定返回的数据格式，有json,xml和protobuf三种格式可选。默认值为：'xml'
 * @subparam string formula_name 指定的表达式名称，此名称需在网站中设定。
 * @subparam array summary 指定summary字段一些标红、省略、截断等规则。
 * @subparam int start 指定搜索结果集的偏移量。默认为0。
 * @subparam int hits 指定返回结果集的数量。默认为20。
 * @subparam array sort 指定排序规则。默认值为：'self::SORT_DECREASE' (降序)
 * @subparam string filter 指定通过某些条件过滤结果集。
 * @subparam array aggregate 指定统计类的信息。
 * @subparam array distinct 指定distinct排序。
 * @subparam string kvpair 指定的kvpair。
 *
 * @return string 返回搜索结果。
 *
 */
CloudSearch.prototype.search = function(opts) {
    this.extract(opts || []);
    return this.callQuery();
};
CloudSearch.prototype.queryIndex = function(indexName, params) {
    return this.client.callRequest('/index/' + indexName, params, 'GET');
};
CloudSearch.prototype.queryError = function(indexName, params) {
    return this.client.callRequest('/index/error/' + indexName, params, 'GET');
};

/**
 * 增加新的应用来进行检索
 * @param string\array $indexName 应用名称或应用名称列表.
 */
CloudSearch.prototype.addIndex = function(indexName) {
    const self = this;
    const indexes = self._opts.indexes || [];
    if(indexName.map) {
        // 去重复数据
        indexName.map(function(e) {
            // TODO
            (self.indexes.indexOf(e) === -1) && self.indexes.push(e);
        });
    }
    else {
        indexes.push(indexName);
    }
    self._opts.indexes = indexes;
};

/**
 * 删除待搜索的应用
 *
 * 在当前检索中删除此应用的检索结果。
 * @param string $indexName 待删除的应用名称
 */
CloudSearch.prototype.removeIndex = function(indexName) {
    // TODO
    // $flip = array_flip($this->indexes);
    // unset($flip[$indexName]);
    // $this->indexes = array_values(array_flip($flip));
    const index = this._opts.indexes.indexOf(indexName);
    (index !== -1) && this._opts.indexes.splice(index, 1);
};

/**
 * 获得请求应用列表
 *
 * 当前请求中所有的应用名列表。
 *
 * @return array 返回当前搜索的所有应用列表。
 */
CloudSearch.prototype.getSearchIndexes = function() {
    return (this._opts.indexes || []);
};

/**
 * 设置表达式名称
 * 此表达式名称和结构需要在网站中已经设定。
 * @param string $formulaName 表达式名称。
 */
CloudSearch.prototype.setFormulaName = function(formulaName) {
    this._opts.formulaName = formulaName;
};

/**
 * 获取表达式名称
 *
 * 获得当前请求中设置的表达式名称。
 *
 * @return string 返回当前设定的表达式名称。
 */
CloudSearch.prototype.getFormulaName = function() {
    return this._opts.formulaName;
}

/**
 * 清空精排表达式名称设置
 */
CloudSearch.prototype.clearFormulaName = function() {
    this._opts.formulaName = '';
}

/**
 * 设置粗排表达式名称
 *
 * 此表达式名称和结构需要在网站中已经设定。
 *
 * @param string $FormulaName 表达式名称。
 */
CloudSearch.prototype.setFirstFormulaName = function(formulaName) {
    this._opts.firstFormulaName = formulaName;
}

/**
 * 获取粗排表达式设置
 *
 * 获取当前设置的粗排表达式名称。
 *
 * @return string 返回当前设定的表达式名称。
 */
CloudSearch.prototype.getFirstFormulaName = function() {
    return this._opts.firstFormulaName;
}

/**
 * 清空粗排表达式名称设置
 */
CloudSearch.prototype.clearFirstFormulaName = function() {
    this._opts.firstFormulaName = '';
}

/**
 * 添加一条summary信息
 * @param string $fieldName 指定的生效的字段。此字段必需为可分词的text类型的字段。
 * @param string $len 指定结果集返回的词字段的字节长度，一个汉字为2个字节。
 * @param string $element 指定命中的query的标红标签，可以为em等。
 * @param string $ellipsis 指定用什么符号来标注未展示完的数据，例如“...”。
 * @param string $snipped 指定query命中几段summary内容。
 * @param string $elementPrefix 如果指定了此参数，则标红的开始标签以此为准。
 * @param string $elementPostfix 如果指定了此参数，则标红的结束标签以此为准。
 */
CloudSearch.prototype.addSummary = function(fieldName, len, element,
    ellipsis, snipped, elementPrefix, elementPostfix) {

    if(!fieldName) {
        return false;
    }

    const summary = {};
    summary['summary_field'] = fieldName;
    // 若参数有值，则添加
    !!len && (summary['summary_len'] = len + 0);
    !!element && (summary['summary_element'] = element);
    !!ellipsis && (summary['summary_ellipsis'] = ellipsis);
    !!snipped && (summary['summary_snipped'] = snipped + 0);
    !!elementPrefix && (summary['summary_element_prefix'] = elementPrefix);
    !!elementPostfix && (summary['summary_element_postfix'] = elementPostfix);

    this._opts.summary[fieldName] = summary;
}

/**
 * 获取当前的summary信息
 * 可以通过指定字段名称返回指定字段的summary信息
 *
 * @param string $field 指定的字段，如果此字段为空，则返回整个summary信息，否则返回指定field的summary信息。
 * @return array 返回summary信息。
 */
CloudSearch.prototype.getSummary = function(field) {
    return !field ? this._opts.summary : this._opts.summary[field];
};

/**
 * 获取summary字符串
 *
 * 把summary信息生成字符串并返回。
 *
 * @return string 返回字符串的summary信息。
 *
 * eg.(from)
 * {title:{fieldName:title,len:20,element:'<em>'},body:{fieldName:body,len:100,element:'<em>'}}
 *
 * (to)
 * fieldName:title,len:20,element:'<em>';fieldName:body,len:100,element:'<em>'
 */
CloudSearch.prototype.getSummaryString = function() {
    const smy = [];
    const summary = this.getSummary();
    for(const k in summary) {
        smy.push(s2.parseString(summary[k], false, ',', ':'));
    }

    return smy.join(';');
};

/**
 * 设置返回的数据格式
 *
 * @param string $format 数据格式名称，有xml, json和protobuf 三种类型。
 */
CloudSearch.prototype.setFormat = function(format) {
    this._opts.format = format;
};

/**
 * 获取当前的数据格式名称
 *
 * @return string 返回当前的数据格式名称。
 */
CloudSearch.prototype.getFormat = function() {
    return this._opts.format;
};

/**
 * 设置返回结果的offset偏移量
 *
 * @param int $start 偏移量。
 */
CloudSearch.prototype.setStartHit = function(start) {
    this._opts.start = start + 0;
};

/**
 * 获取返回结果的offset偏移量
 *
 * @return int 返回当前设定的偏移量。
 */
CloudSearch.prototype.getStartHit = function() {
    return this._opts.start;
};

/**
 * 设置结果集大小
 *
 * 设置当前返回结果集的doc个数。
 *
 * @param number $hits 指定的doc个数。默认值：20
 */
CloudSearch.prototype.setHits = function(hits) {
    this._opts.hits = (hits || 20);
};

/**
 * 获取结果集大小
 *
 * 获取当前设定的结果集的doc数。
 *
 * @return number 返回当前指定的doc个数。
 */
CloudSearch.prototype.getHits = function() {
    return this._opts.hits;
};

/**
 * 添加排序设置
 *
 * 增加一个排序字段及排序方式。
 * 更多说明请参见[API 排序sort子句]({{!api-reference/query-clause&sort-clause!}})
 * @param string $field 字段名称。
 * @param string $sortChar 排序方式，有升序+和降序-两种方式。
 */
CloudSearch.prototype.addSort = function(field, sortChar) {
    if(!field) {
        return false;
    }
    this._opts.sort[field] = (sortChar || SORT_DECREASE);
};

/**
 * 删除指定字段的排序
 *
 * @param string $field 指定的字段名称。
 */
CloudSearch.prototype.removeSort = function(field) {
    delete this._opts.sort[field];
};

/**
 * 获取排序信息
 *
 * @param string $sortKey 如果此字段为空，则返回所有排序信息，否则只返回指定字段的排序值。
 * @return string\array 返回排序值。
 */
CloudSearch.prototype.getSort = function(sortKey) {
    return !sortKey ? this._opts.sort : this._opts.sort[sortKey];
};

/**
 * 获取排序字符串
 *
 * 把排序信息生成字符串并返回。
 *
 * @return string 返回字符串类型的排序规则。
 *
 * eg.(from)
 *   {name:'+',age:'-',time:'-'}
 *
 * (to)
 *   +name;-age;-time
 */
CloudSearch.prototype.getSortString = function() {

    const sort = this.getSort();
    let sortString = '';
    for(const k in sort) {
        sortString += sort[k] + k + ';';
    }

    // 去除末尾的;
    return sortString.replace(/;$/g, '');
};

/**
 * 添加过滤规则
 *
 * 针对指定的字段添加过滤规则。
 * 更多说明请参见 [API 过滤filter子句]({{!api-reference/query-clause&filter-clause!}})
 *
 * @param string $filter 过滤规则，例如fieldName>=1。
 * @param string $operator 操作符，可以为 AND OR。默认值为：'AND'
 */
CloudSearch.prototype.addFilter = function(filter, operator) {

    operator = (operator || 'AND');
    if(!this._opts.filters && filter) {
        this._opts.filters = filter;
    }
    else if(filter) {
        this._opts.filters += ' ' + operator + ' ' + filter;
    }
};

/**
 * 获取过滤规则
 *
 * @return filter 返回字符串类型的过滤规则。
 */
CloudSearch.prototype.getFilter = function() {
    return this._opts.filters;
}

/**
 * 添加统计信息相关参数
 *
 * 一个关键词通常能命中数以万计的文档，用户不太可能浏览所有文档来获取信息。而用户感兴趣的可
 * 能是一些统计类的信息，比如，查询“手机”这个关键词，想知道每个卖家所有商品中的最高价格。
 * 则可以按照卖家的user_id分组，统计每个小组中最大的price值：
 * groupKey:user_id, aggFun: max(price)
 * 更多说明请参见 [APi aggregate子句说明]({{!api-reference/query-clause&aggregate-clause!}})
 *
 * @param string $groupKey 指定的group key.
 * @param string $aggFun 指定的function。当前支持：count、max、min、sum。
 * @param string $range 指定统计范围。
 * @param string $maxGroup 最大组个数。
 * @param string $aggFilter 表示仅统计满足特定条件的文档。
 * @param string $aggSamplerThresHold 抽样统计的阈值。表示该值之前的文档会依次统计，该值之后的文档会进行抽样统计。
 * @param string $aggSamplerStep 抽样统计的步长。
 */
CloudSearch.prototype.addAggregate = function(groupKey, aggFun, range, maxGroup,
    aggFilter, aggSamplerThresHold, aggSamplerStep) {
    if(!groupKey || !aggFun) {
        return false;
    }

    const aggregate = {};
    aggregate['group_key'] = groupKey;
    aggregate['agg_fun'] = aggFun;

    !!range && (aggregate['range'] = range);
    !!maxGroup && (aggregate['max_group'] = maxGroup);
    !!aggFilter && (aggregate['agg_filter'] = aggFilter);
    !!aggSamplerThresHold && (aggregate['agg_sampler_threshold'] = aggSamplerThresHold);
    !!aggSamplerStep && (aggregate['agg_sampler_step'] = aggSamplerStep);

    this._opts.aggregate[groupKey] = (this._opts.aggregate[groupKey] || []);
    this._opts.aggregate[groupKey].push(aggregate);
};

/**
 * 删除指定的统计数据
 *
 * @param string $groupKey 指定的group key。
 */
CloudSearch.prototype.removeAggregate = function(groupKey) {
    delete this._opts.aggregate[groupKey];
};

/**
 * 获取统计相关信息
 *
 * @param string $groupKey 指定group key获取其相关信息，如果为空，则返回整个信息。
 * @return array 统计相关信息
 */
CloudSearch.prototype.getAggregate = function(key) {
    return !key ? this._opts.aggregate : this._opts.aggregate[key];
};

/**
 * 获取字符串类型的统计信息
 *
 * @return string 获取字符串类型的统计信息
 *
 * eg.(from)
 *   {group_id:[{group_key:group_id,agg_fun:sum(price)#max(price)},{group_key:group_id,agg_fun:count()}],
 *   company_id:[{group_key:company_id,agg_fun:count()}]}
 *
 * (to)
 *    group_key:group_id,agg_fun:sum(price)#max(price);group_key:group_id,agg_fun:sum(price)#max(price);
 *    group_key:company_id,agg_fun:count()
 */
CloudSearch.prototype.getAggregateString = function() {

    const aggregate = [];
    const agg = this.getAggregate();
    for(let k1 in agg) {
        agg[k1].map(function(e, k2) {
            aggregate.push(s2.parseString(e, false, ',', ':'));
        });
    }

    return aggregate.join(';');
};

/**
 * 添加distinct排序信息
 *
 * 例如：检索关键词“手机”共获得10个结果，分别为：doc1，doc2，doc3，doc4，doc5，doc6，
 * doc7，doc8，doc9，doc10。其中前三个属于用户A，doc4-doc6属于用户B，剩余四个属于用户C。
 * 如果前端每页仅展示5个商品，则用户C将没有展示的机会。但是如果按照user_id进行抽取，每轮抽
 * 取1个，抽取2次，并保留抽取剩余的结果，则可以获得以下文档排列顺序：doc1、doc4、doc7、
 * doc2、doc5、doc8、doc3、doc6、doc9、doc10。可以看出，通过distinct排序，各个用户的
 * 商品都得到了展示机会，结果排序更趋于合理。
 * 更多说明请参见 [API distinct子句]({{!api-reference/query-clause&distinct-clause!}})
 *
 * @param string $key 为用户用于做distinct抽取的字段，该字段要求建立Attribute索引。
 * @param int $distCount 为一次抽取的document数量，默认值为1。
 * @param int $distTimes 为抽取的次数，默认值为1。
 * @param string $reserved 为是否保留抽取之后剩余的结果，true为保留，false则丢弃，丢弃时totalHits的个数会减去被distinct而丢弃的个数，但这个结果不一定准确，默认为true。
 * @param string $distFilter 为过滤条件，被过滤的doc不参与distinct，只在后面的 排序中，这些被过滤的doc将和被distinct出来的第一组doc一起参与排序。默认是全部参与distinct。
 * @param string $updateTotalHit 当reserved为false时，设置update_total_hit为true，则最终total_hit会减去被distinct丢弃的的数目（不一定准确），为false则不减；默认为false。
 * @param int $maxItemCount 设置计算distinct时最多保留的doc数目。
 * @param number $grade 指定档位划分阈值。
 */
CloudSearch.prototype.addDistinct = function(key, distCount, distTimes,
    reserved, distFilter, updateTotalHit,
    maxItemCount, grade) {

    if(!key) {
        return false;
    }

    const distinct = {};
    distinct['dist_key'] = key;
    !!distCount && (distinct['dist_count'] = distCount + 0);
    !!distTimes && (distinct['dist_times'] = distTimes + 0);
    !!reserved && (distinct['reserved'] = reserved);
    !!distFilter && (distinct['dist_filter'] = distFilter);
    !!updateTotalHit && (distinct['update_total_hit'] = updateTotalHit);
    !!maxItemCount && (distinct['max_item_count'] = maxItemCount + 0);
    !!grade && (distinct['grade'] = grade);

    this._opts.distinct[key] = distinct;
};

/**
 * 删除某个字段的所有distinct排序信息
 *
 * @param string $distinctKey 指定的字段
 */
CloudSearch.prototype.removeDistinct = function(distinctKey) {
    delete this._opts.distinct[distinctKey];
};

/**
 * 获取某字段的distinct排序信息
 *
 * @param string $key 指定的distinct字段，如果字段为空则返回所有distinct信息。
 * @return array 指定字段的distinct排序信息
 */
CloudSearch.prototype.getDistinct = function(key) {
    return key ? this._opts.distinct[key] : this._opts.distinct;
};

/**
 * 获取字符串类型的所有的distinct信息
 * @return string 字符串类型的所有的distinct信息
 * eg. (from)
 * {company_id:{dist_key:company_id,dist_count:1},
 * user_id:{dist_key:user_id,dist_times:1}}
 *
 * (to)
 * dist_key:company_id,dist_count:1;dist_key:user_id,dist_times:1
 */
CloudSearch.prototype.getDistinctString = function() {
    // TODO qsy
    const dist = this.getDistinct();
    const distinct = [];
    for(let attr in dist) {

        // if(attr != 'none_dist') {
        distinct.push(s2.parseString(dist[attr], false, ',', ':'));
        // } else {
        //   distinct.push(attr['dist_key']);
        // }
    }
    return distinct.join(';');
};

/**
 * 设定指定索引字段范围的搜索关键词
 *
 * [NOTE]:$query必须指定索引名称，格式类似为 索引名称:'搜索关键词'。
 *
 * 此query是查询必需的一部分，可以指定不同的索引名，并同时可指定多个查询及之间的关系
 * （AND, OR, ANDNOT, RANK）。
 *
 * 例如查询subject索引字段的query:“手机”，可以设置为
 * query=subject:'手机'。
 *
 * NOTE: text类型索引在建立时做了分词，而string类型的索引则没有分词
 * 更多说明请参见 [API query子句]({{!api-reference/query-clause&query-clause!}})
 *
 * @param string $query 设定搜索的查询词。
 * @param string $fieldName 设定的索引范围。
 *
 */
CloudSearch.prototype.setQueryString = function(query) {
    this._opts.query = query;
}

/**
 * 获取当前指定的查询词内容
 *
 * @return string 当前指定的查询词内容
 */
CloudSearch.prototype.getQuery = function() {
    return this._opts.query;
}

/**
 * 添加指定结果集返回的字段
 *
 * @param array\string $field 结果集返回的字段。
 */
CloudSearch.prototype.addFetchFields = function(field) {
    const fetches = this._opts.fetches || [];
    if(field.map) {
        field.map(function(e) {
            if(this._opts.indexOf(e) === -1) {
                fetches.push(e);
            }
        });
    }
    else if(this._opts.indexOf(field) === -1) {
        fetches.push(field);
    }

    this._opts.fetches = fetches;
}

/**
 * 删除指定结果集的返回字段
 *
 * @param string $fieldName 指定字段名称。
 */
CloudSearch.prototype.removeFetchField = function(fieldName) {
    const index = this._opts.fetches.indexOf(fieldName);
    (index === -1) && this._opts.fetches.splice(index, 1);
};

/**
 * 设置kvpair
 * 更多说明请参见 [API 自定义kvpair子句]({{!api-reference/query-clause&kvpair-clause!}})
 *
 * @param string $pair 指定的pair信息。
 */
CloudSearch.prototype.setPair = function(pair) {
    this._opts.kvpair = pair;
};

/**
 * 获取当前的kvpair
 *
 * @return string 返回当前设定的kvpair。
 */
CloudSearch.prototype.getPair = function() {
    return this._opts.kvpair;
};

/**
 * 增加自定义参数
 *
 * @param string $paramKey 参数名称。
 * @param string $paramValue 参数值。
 */
CloudSearch.prototype.addCustomParam = function(paramKey, paramValue) {
    this._opts.customParams[paramKey] = paramValue;
};

/**
 * 指定精排算分的文档个数
 *
 * 若不指定则使用默认值200
 *
 * @param int $rerankSize 精排算分文档个数
 */
CloudSearch.prototype.addRerankSize = function(rerankSize) {
    this._opts.rerankSize = rerankSize;
};

/**
 * 添加一条查询分析规则
 *
 * @param QPName 查询分析规则
 */
CloudSearch.prototype.addQPName = function(QPName) {
    const qp = this._opts.QPName || [];
    qp.concat(QPName);
    // if(qp.map) {
    //   QPName.map(function(e) {
    //       qp.push(e);
    //   });
    // } else {
    //   qp.push(QPName);
    // }
    this._opts.QPName = qp;
};

/**
 * 获取设置的查询分析规则
 *
 * @return String 设置的查询分析规则
 */
CloudSearch.prototype.getQPName = function() {
    return this._opts.QPName;
};

/**
 * 关闭某些功能模块。
 *
 * 有如下场景需要考虑：
 * 1、如果要关闭整个qp的功能，则参数为空即可。
 * 2、要指定某个索引关闭某个功能，则可以指定disableValue="processer:index",
 * processer:index为指定关闭某个processer的某个索引功能，其中index为索引名称，多个索引可以用“|”分隔，可以为index1[|index2...]
 * 3、如果要关闭多个processor可以传递数组。
 * qp processor 有如下模块：
 * 1、spell_check: 检查用户查询串中的拼写错误，并给出纠错建议。
 * 2、term_weighting: 分析查询中每个词的重要程度，并将其量化成权重，权重较低的词可能不会参与召回。
 * 3、stop_word: 根据系统内置的停用词典过滤查询中无意义的词
 * 4、synonym: 根据系统提供的通用同义词库和语义模型，对查询串进行同义词扩展，以便扩大召回。
 * example:
 * "" 表示关闭整个qp。
 * "spell_check" 表示关闭qp的拼音纠错功能。
 * "stop_word:index1|index2" 表示关闭qp中索引名为index1和index2上的停用词功能。
 *
 * @param string $functionName 指定的functionName，例如“qp”等
 * @param string|array $disableValue 需要关闭的值
 */
CloudSearch.prototype.addDisabledQP = function(disableValue) {
    this.addDisabledFunction('qp', disableValue);
};

/**
 * 添加一项禁止的功能模块
 *
 * @param functionName 功能模块名称
 * @param disableValue 禁用的功能细节
 */
CloudSearch.prototype.addDisabledFunction = function(functionName, disableValue) {
    // TODO
    const functions = this._opts.functions[functionName] || [];
    if(!disableValue) {
        return;
    }

    functions.concat(disableValue);
    // if(disableValue.map) {
    //   disableValue.map(function(e) {
    //     if(-1 === functions.indexOf(e)) {
    //       functions.push(e);
    //     }
    //   });
    // } else if(-1 === functions.indexOf(disableValue)){
    //   functions.push(disableValue);
    // }

    this._opts.functions[functionName] = functions;
};

/**
 * 获取所有禁止的功能模块
 *
 * @return array 所有禁止的功能模块
 */
CloudSearch.prototype.getDisabledFunction = function() {
    return this._opts.functions || [];
};

/**
 * 以字符串的格式返回disable的内容。
 *
 * @return string
 *
 * eg.(from)
 * {'fun1':['fileter','dist'],'fun2':['group','filter']}
 *
 * (to)
 * fun1:'fileter','dist';fun2:'group','filter'
 *
 */
CloudSearch.prototype.getDisabledFunctionString = function() {
    const functions = this.getDisabledFunction();
    const disFuns = [];
    for(let name in functions) {
        disFuns.push(name + ':' + functions[name].join());
    }

    return disFuns.join(';');
};

/**
 * 获取精排算分文档个数
 *
 * @return int 精排算分文档个数
 */
CloudSearch.prototype.getRerankSize = function() {
    return this._opts.rerankSize;
};

/**
 * 获取自定义参数
 *
 * @return string 自定义参数
 */
CloudSearch.prototype.getCustomParam = function() {
    return this._opts.customParams;
};

/**
 * 获取指定结果集返回的字段列表
 *
 * @return array 指定结果集返回的字段列表
 */
CloudSearch.prototype.getFetchFields = function() {
    return this._opts.fetches;
};

/**
 * 设置此次获取的scroll id的期时间。
 *
 * 可以为整形数字，默认为毫秒。也可以用1m表示1min；支持的时间单位包括：
 * w=Week, d=Day, h=Hour, m=minute, s=second
 *
 * @param string|int $scroll
 */
CloudSearch.prototype.setScroll = function(scroll) {
    this._opts.scroll = scroll;
};

/**
 * 获取scroll的失效时间。
 *
 * @return string|int
 */
CloudSearch.prototype.getScroll = function() {
    return this._opts.scroll;
};

/**
 * 设置搜索类型
 *
 * @param searchType 搜索类型
 */
CloudSearch.prototype.setSearchType = function(searchType) {
    this._opts.searchType = searchType;
};

/**
 * 获取设置的搜索类型
 *
 * @return String 设置的搜索类型
 */
CloudSearch.prototype.getSearchType = function() {
    return this._opts.searchType;
};


/**
 * 从opts数组中抽取所有的需要的参数并复制到属性中。
 *
 * @param array $opts
 */
CloudSearch.prototype.extract = function(opts, type) {
    type = type || 'search';


    if(opts) {
        !!opts['query'] && (this.setQueryString(opts['query']));
        !!opts['fetch_field'] && (this.addFetchFields(opts['fetch_field']));
        !!opts['format'] && (this.setFormat(opts['format']));
        !!opts['start'] && (this.setStartHit(opts['start']));
        !!opts['hits'] && (this.setHits(opts['hits']));
        !!opts['filters'] && (this.addFilter(opts['filters']));
        !!opts['kvpair'] && (this.setPair(opts['kvpair']));
        !!opts['rerankSize'] && (this.addRerankSize(opts['rerankSize']));

        if(type === 'search') {
            !!opts['sort'] && (this._opts.sort = opts['sort']);
            !!opts['aggregate'] && (this._opts.aggregate = opts['aggregate']);
            !!opts['distinct'] && (this._opts.distinct = opts['distinct']);
            !!opts['formula_name'] && (this.setFormulaName(opts['formula_name']));
            !!opts['summary'] && (this._opts.summary = opts['summary']);
            !!opts['qp'] && (this.addQPName(opts['qp']));
            !!opts['disable_qp'] && (this.addDisabledQP(opts['disable']));
        }
        else if(type === 'scroll') {
            !!opts['scroll_id'] && (this.setScrollId(opts['scroll_id']));
            !!opts['scroll'] && (this.setScroll(opts['scroll']));
            this.setSearchType(SEARCH_TYPE_SCAN);
        }
    }
};

/**
 * 生成HTTP的请求串，并通过CloudsearchClient类向API服务发出请求并返回结果。
 *
 * query参数中的query子句和config子句必需的，其它子句可选。
 *
 * @return string
 */
CloudSearch.prototype.callQuery = function(type) {

    type = type || 'search';
    const haquery = {};
    haquery['query'] = (this.getQuery() || "''") + '';
    haquery['config'] = this.clauseConfig();
    let temp = '';
    (temp = s2.goneEmpty(this.getFilter())) && (haquery['filter'] = temp);
    (temp = s2.goneEmpty(this.getPair())) && (haquery['kvpairs'] = temp);
    if(type === 'search') {
        (temp = s2.goneEmpty(this.getSortString())) && (haquery['sort'] = temp);
        (temp = s2.goneEmpty(this.getDistinctString())) && (haquery['distinct'] = temp);
        (temp = s2.goneEmpty(this.getAggregateString())) && (haquery['aggregate'] = temp);
    }

    const params = {
        'query': s2.parseString(haquery).replace(/&/g, '&&'),
        'index_name': this.getSearchIndexes().join(';'),
        'Format': this.getFormat()
    };

    const result = this.getCustomParam();
    for(let k in result) {
        params[k] = result[k];
    }

    (temp = s2.goneEmpty(this.getFetchFields())) && (params['fetch_fields'] = temp.join(';'));
    if(type === 'search') {
        (temp = s2.goneEmpty(this.getFormulaName())) && (params['formula_name'] = temp);
        (temp = s2.goneEmpty(this.getFirstFormulaName())) && (params['first_formula_name'] = temp);
        (temp = s2.goneEmpty(this.getSummaryString())) && (params['summary'] = temp);
        (temp = s2.goneEmpty(this.getQPName())) && (params['qp'] = temp.join());
        (temp = s2.goneEmpty(this.getDisabledFunctionString())) && (params['disable'] = temp);
    }
    else if(type === 'scroll') {
        (temp = s2.goneEmpty(this.getScroll())) && (params['scroll'] = temp);
        (temp = s2.goneEmpty(this.getScrollId())) && (params['scroll_id'] = temp);
        params['search_type'] = SEARCH_TYPE_SCAN;
    }

    return this.client.callRequest(this._opts.path, params, 'GET');
};

/**
 * 生成语法的config子句并返回。
 * @return string
 */
CloudSearch.prototype.clauseConfig = function() {
    let config = [];
    let r = '';
    config.push('format:' + this.getFormat());
    config.push('start:' + this.getStartHit());
    config.push('hit:' + this.getHits());
    (r = this.getRerankSize()) && (config.push('rerank_size:' + r));

    return config.join();
};


module.exports = exports = CloudSearch;
