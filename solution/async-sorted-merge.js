'use strict'

module.exports = (logSources, printer) => {
    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('async_logs.sqlite');

    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS logs (date DATETIME, msg TEXT)");
        db.run("CREATE INDEX IF NOT EXISTS date_index ON logs (date)");

        var stmt = db.prepare("INSERT INTO logs VALUES (?, ?)");
        function makeInsert(logSource) {
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
            logPromises += new Promise(function() {
                logSources[logIndex].popAsync().then(makeInsert(logSources[logIndex]));
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
