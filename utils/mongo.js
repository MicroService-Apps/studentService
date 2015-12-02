/**
 * Created by Wayne on 10/21/15.
 */
var mongoskin = require('mongoskin');

module.exports = (function(){
    var host = "localhost",
        port = "27017",
        dbName = "testdb" + process.argv[2],
        str = 'mongodb://'+host+':'+port+'/'+dbName;
    var option={
        native_parser:true
    };
    return mongoskin.db(str,option);
})();