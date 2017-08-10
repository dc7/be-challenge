'use strict'

module.exports = (logSources, printer) => {
    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('async_logs.sqlite');

    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS logs (date DATETIME, msg TEXT)");

        var stmt = db.prepare("INSERT INTO logs VALUES (?, ?)");
        function makeInsert(resolve, logSource) {
            function insert (entry) {
                if (entry) {
                    stmt.run(new Date(entry.date), entry.msg);
                    logSource.popAsync().then(insert);
                }
            }
            return insert;
        }

        var logPromises = [];
        for (var logIndex in logSources) {
            logPromises += new Promise(function(resolve, reject) {
                logSources[logIndex].popAsync().then(makeInsert(resolve, logSources[logIndex]));
            });
        }

        Promise.all(logPromises).then(function() {
            db.each("SELECT date, msg FROM logs ORDER BY date", function(err, row) {
                var entry = {"date": new Date(row.date), "msg": row.msg};
                printer.print(entry);
            });

            db.run("DROP TABLE logs");
        });
    });

    db.close(function() {
        printer.done();
    });
}
