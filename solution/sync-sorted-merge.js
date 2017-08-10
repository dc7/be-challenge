'use strict'

module.exports = (logSources, printer) => {
    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('sync_logs.sqlite');

    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS logs (date DATETIME, msg TEXT)");
        db.run("CREATE INDEX IF NOT EXISTS date_index ON logs (date)");

        var stmt = db.prepare("INSERT INTO logs VALUES (?, ?)");
        for (var logIndex in logSources) {
            var logSource = logSources[logIndex];
            while(true) {
                var entry = logSource.pop();
                if (!entry) {
                    break;
                }
                stmt.run(new Date(entry.date), entry.msg);
            }
        }
        stmt.finalize();

        db.each("SELECT date, msg FROM logs ORDER BY date", function(err, row) {
            var entry = {"date": new Date(row.date), "msg": row.msg};
            printer.print(entry);
        });

        db.run("DROP TABLE logs");
    });

    db.close(function() {
        printer.done();
    });
}
