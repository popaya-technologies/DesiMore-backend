"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = exports.BackupService = exports.MAX_BACKUP_BYTES = void 0;
exports.selection = selection;
exports.parseBackup = parseBackup;
exports.restoreOrder = restoreOrder;
const crypto_1 = require("crypto");
const data_source_1 = require("../data-source");
const api_error_1 = require("../utils/api-error");
exports.MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const MAX_ROWS = 100000;
const quote = (name) => '"' + name.replace(/"/g, '""') + '"';
const tableSQL = (name) => '"public".' + quote(name);
function catalog(db) {
    return __awaiter(this, void 0, void 0, function* () {
        const columns = yield db.query(`SELECT c.relname AS "table", a.attname AS name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
    a.attgenerated <> '' AS generated, a.attidentity <> '' AS identity
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relispartition
      AND NOT c.relrowsecurity AND a.attnum > 0 AND NOT a.attisdropped
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_inherits i WHERE i.inhrelid = c.oid OR i.inhparent = c.oid)
    ORDER BY c.relname, a.attnum`);
        const tables = new Map();
        for (let _a of columns) {
            const { table } = _a, column = __rest(_a, ["table"]);
            if (!tables.has(table))
                tables.set(table, { name: table, columns: [] });
            tables.get(table).columns.push(column);
        }
        return [...tables.values()];
    });
}
function foreignKeys(db) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.query(`SELECT child.relname AS child, parent.relname AS parent,
    cn.nspname AS "childSchema", pn.nspname AS "parentSchema", f.condeferrable AS deferred
    FROM pg_catalog.pg_constraint f
    JOIN pg_catalog.pg_class child ON child.oid = f.conrelid
    JOIN pg_catalog.pg_class parent ON parent.oid = f.confrelid
    JOIN pg_catalog.pg_namespace cn ON cn.oid = child.relnamespace
    JOIN pg_catalog.pg_namespace pn ON pn.oid = parent.relnamespace
    WHERE f.contype = 'f' AND (cn.nspname = 'public' OR pn.nspname = 'public')`);
    });
}
function selection(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(k => k !== "tables"))
        throw new api_error_1.ApiError(400, 'Body must be { "tables": ["table_name"] }');
    const names = input.tables;
    if (!Array.isArray(names) || !names.length || names.length > 500 ||
        names.some(n => typeof n !== "string" || !n.length || n.length > 63) || new Set(names).size !== names.length)
        throw new api_error_1.ApiError(400, "Select 1 to 500 distinct table names");
    return [...names].sort();
}
function parseBackup(buffer) {
    if (buffer.length > exports.MAX_BACKUP_BYTES)
        throw new api_error_1.ApiError(413, "Backup exceeds 50 MB");
    let file;
    try {
        file = JSON.parse(buffer.toString("utf8"));
    }
    catch (_a) {
        throw new api_error_1.ApiError(400, "Invalid backup JSON");
    }
    if (!file || file.format !== "desimore-backup" || file.version !== 1 || typeof file.createdAt !== "string" ||
        !Array.isArray(file.tables))
        throw new api_error_1.ApiError(400, "Upload a version 1 DesiMore backup exported by this API");
    selection({ tables: file.tables.map((t) => t === null || t === void 0 ? void 0 : t.name) });
    let count = 0;
    for (const table of file.tables) {
        if (!Array.isArray(table.columns) || !table.columns.length || table.columns.length > 1600 ||
            table.columns.some((c) => !c || typeof c.name !== "string" || typeof c.type !== "string") ||
            new Set(table.columns.map((c) => c.name)).size !== table.columns.length || !Array.isArray(table.rows))
            throw new api_error_1.ApiError(400, "Invalid backup columns or rows");
        count += table.rows.length;
        if (count > MAX_ROWS)
            throw new api_error_1.ApiError(400, "Backup exceeds 100000 rows");
        for (const row of table.rows) {
            if (!Array.isArray(row) || row.length !== table.columns.length || row.some((v) => v !== null && typeof v !== "string"))
                throw new api_error_1.ApiError(400, "Backup values must be PostgreSQL text values or null");
        }
    }
    return file;
}
function restoreOrder(names, keys) {
    const selected = new Set(names);
    for (const fk of keys) {
        if (fk.parentSchema === "public" && selected.has(fk.parent) &&
            (fk.childSchema !== "public" || !selected.has(fk.child)))
            throw new api_error_1.ApiError(400, `Include dependent table ${fk.childSchema}.${fk.child} to restore ${fk.parent}`);
    }
    const remaining = new Set(names), ordered = [];
    while (remaining.size) {
        const ready = [...remaining].filter(name => !keys.some(fk => fk.childSchema === "public" && fk.parentSchema === "public" &&
            fk.child === name && fk.parent !== name && !fk.deferred && remaining.has(fk.parent)));
        if (!ready.length)
            throw new api_error_1.ApiError(400, "These tables contain a non-deferrable foreign key cycle; use pgAdmin for this backup");
        for (const name of ready) {
            ordered.push(name);
            remaining.delete(name);
        }
    }
    return ordered;
}
class BackupService {
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
        this.jobs = new Map();
        this.restoring = false;
    }
    list() {
        return __awaiter(this, void 0, void 0, function* () {
            const tables = yield catalog(this.db), keys = yield foreignKeys(this.db);
            return { data: tables.map(t => ({ name: t.name, schema: "public",
                    dependencies: [...new Set(keys.filter(k => k.childSchema === "public" && k.child === t.name).map(k => k.parentSchema + "." + k.parent))],
                    referencedBy: [...new Set(keys.filter(k => k.parentSchema === "public" && k.parent === t.name).map(k => k.childSchema + "." + k.child))] })),
                meta: { total: tables.length, format: "desimore-backup", version: 1, maxFileBytes: exports.MAX_BACKUP_BYTES } };
        });
    }
    export(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const names = selection(input);
            return this.db.transaction("REPEATABLE READ", (manager) => __awaiter(this, void 0, void 0, function* () {
                yield manager.query("SET TRANSACTION READ ONLY");
                yield manager.query("SET LOCAL statement_timeout = '60s'");
                yield manager.query("SET LOCAL TIME ZONE 'UTC'");
                yield manager.query("SET LOCAL DateStyle = 'ISO, YMD'");
                yield manager.query("SET LOCAL IntervalStyle = 'postgres'");
                const tables = yield catalog(manager);
                const backup = { format: "desimore-backup", version: 1, createdAt: new Date().toISOString(), tables: [] };
                let rowCount = 0, bytes = 0;
                for (const name of names) {
                    const table = tables.find(t => t.name === name);
                    if (!table)
                        throw new api_error_1.ApiError(400, "Unknown or unsupported table: " + name);
                    const columns = table.columns.filter(c => !c.generated);
                    if (!columns.length)
                        throw new api_error_1.ApiError(400, "Table has no writable columns: " + name);
                    const rows = yield manager.query(`SELECT ${columns.map((c, i) => quote(c.name) + '::text AS ' + quote('c' + i)).join(', ')}
          FROM ${tableSQL(name)} LIMIT ${MAX_ROWS - rowCount + 1}`);
                    rowCount += rows.length;
                    if (rowCount > MAX_ROWS)
                        throw new api_error_1.ApiError(400, "Select fewer tables: backup exceeds 100000 rows");
                    const data = { name, columns: columns.map(c => ({ name: c.name, type: c.type })),
                        rows: rows.map(r => columns.map((_c, i) => r['c' + i])) };
                    bytes += Buffer.byteLength(JSON.stringify(data));
                    if (bytes > exports.MAX_BACKUP_BYTES)
                        throw new api_error_1.ApiError(413, "Select fewer tables: backup exceeds 50 MB");
                    backup.tables.push(data);
                }
                const result = Buffer.from(JSON.stringify(backup));
                if (result.length > exports.MAX_BACKUP_BYTES)
                    throw new api_error_1.ApiError(413, "Backup exceeds 50 MB");
                return result;
            }));
        });
    }
    start(file, ownerId) {
        if (this.restoring)
            throw new api_error_1.ApiError(409, "A restore is already running");
        for (const [id, job] of this.jobs)
            if (job.finishedAt && Date.parse(job.finishedAt) < Date.now() - 3600000)
                this.jobs.delete(id);
        if (this.jobs.size >= 20) {
            const done = [...this.jobs.values()].find(j => j.finishedAt);
            if (done)
                this.jobs.delete(done.id);
            else
                throw new api_error_1.ApiError(429, "Too many restore jobs");
        }
        const job = { id: (0, crypto_1.randomUUID)(), ownerId, status: "queued", progress: 0, completedTables: 0,
            totalTables: file.tables.length, restoredRows: 0, createdAt: new Date().toISOString() };
        this.jobs.set(job.id, job);
        this.restoring = true;
        // Queue after returning the ID so the frontend can start polling.
        setImmediate(() => { void this.run(file, job); });
        return this.publicJob(job);
    }
    progress(id, ownerId, superAdmin) {
        const job = this.jobs.get(id);
        if (!job || (!superAdmin && job.ownerId !== ownerId))
            throw new api_error_1.ApiError(404, "Restore job not found");
        return this.publicJob(job);
    }
    publicJob(_a) { var { ownerId } = _a, job = __rest(_a, ["ownerId"]); return Object.assign({}, job); }
    run(file, job) {
        return __awaiter(this, void 0, void 0, function* () {
            job.status = "running";
            try {
                yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    yield manager.query("SET LOCAL lock_timeout = '5s'");
                    yield manager.query("SET LOCAL statement_timeout = '60s'");
                    yield manager.query("SET LOCAL TIME ZONE 'UTC'");
                    yield manager.query("SET LOCAL DateStyle = 'ISO, YMD'");
                    yield manager.query("SET LOCAL IntervalStyle = 'postgres'");
                    const [lock] = yield manager.query("SELECT pg_try_advisory_xact_lock(742013, 1) AS locked");
                    if (!lock.locked)
                        throw new api_error_1.ApiError(409, "Another server is already restoring a backup");
                    const tables = yield catalog(manager);
                    const names = file.tables.map(t => t.name);
                    const order = restoreOrder(names, yield foreignKeys(manager));
                    for (const source of file.tables) {
                        const target = tables.find(t => t.name === source.name);
                        const columns = target === null || target === void 0 ? void 0 : target.columns.filter(c => !c.generated);
                        if (!columns || JSON.stringify(source.columns) !== JSON.stringify(columns.map(c => ({ name: c.name, type: c.type }))))
                            throw new api_error_1.ApiError(400, "Backup schema does not match table: " + source.name);
                    }
                    // RESTRICT prevents silently truncating tables absent from the uploaded backup.
                    yield manager.query(`TRUNCATE TABLE ${[...names].sort().map(tableSQL).join(', ')} RESTART IDENTITY RESTRICT`);
                    yield manager.query("SET CONSTRAINTS ALL DEFERRED");
                    for (const name of order) {
                        const source = file.tables.find(t => t.name === name);
                        const target = tables.find(t => t.name === name);
                        const columns = target.columns.filter(c => !c.generated);
                        if (source.rows.length) {
                            // Use a single statement per table, including self-referencing FK rows.
                            const objects = source.rows.map(row => Object.fromEntries(columns.map((c, i) => [c.name, row[i]])));
                            yield manager.query(`INSERT INTO ${tableSQL(name)} (${columns.map(c => quote(c.name)).join(', ')})
              ${columns.some(c => c.identity) ? 'OVERRIDING SYSTEM VALUE' : ''}
              SELECT ${columns.map(c => 'CAST(' + quote(c.name) + ' AS ' + c.type + ')').join(', ')} FROM jsonb_to_recordset($1::jsonb)
              AS restored(${columns.map(c => quote(c.name) + ' text').join(', ')})`, [JSON.stringify(objects)]);
                        }
                        yield this.resetSequences(manager, target);
                        job.completedTables++;
                        job.restoredRows += source.rows.length;
                        job.progress = Math.min(99, Math.floor(job.completedTables / job.totalTables * 99));
                    }
                    // Force deferred checks before reporting success; COMMIT still runs afterwards.
                    yield manager.query("SET CONSTRAINTS ALL IMMEDIATE");
                }));
                job.status = "completed";
                job.progress = 100;
                job.message = "Backup restored successfully";
            }
            catch (error) {
                job.status = "failed";
                job.progress = 0;
                job.completedTables = 0;
                job.restoredRows = 0;
                job.message = error instanceof api_error_1.ApiError ? error.message : "Restore failed; all table changes were rolled back. Check schema, constraints and database privileges.";
                if (!(error instanceof api_error_1.ApiError))
                    console.error("Backup restore failed", { code: error.code });
            }
            finally {
                job.finishedAt = new Date().toISOString();
                this.restoring = false;
            }
        });
    }
    resetSequences(manager, table) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const column of table.columns.filter(c => !c.generated)) {
                const [seq] = yield manager.query(`SELECT n.nspname AS schema, c.relname AS name,
        s.seqincrement::text AS increment, s.seqstart::text AS start, s.seqmin::text AS min, s.seqmax::text AS max
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_catalog.pg_sequence s ON s.seqrelid=c.oid
        WHERE c.oid=pg_get_serial_sequence($1, $2)::regclass`, [tableSQL(table.name), column.name]);
                if (!seq)
                    continue;
                const aggregate = BigInt(seq.increment) > BigInt(0) ? "MAX" : "MIN";
                const [result] = yield manager.query(`SELECT ${aggregate}(${quote(column.name)})::text AS value FROM ${tableSQL(table.name)}`);
                let next = result.value === null ? BigInt(seq.start) : BigInt(result.value) + BigInt(seq.increment);
                if (BigInt(seq.increment) > BigInt(0) && next < BigInt(seq.start))
                    next = BigInt(seq.start);
                if (BigInt(seq.increment) < BigInt(0) && next > BigInt(seq.start))
                    next = BigInt(seq.start);
                if (next < BigInt(seq.min) || next > BigInt(seq.max))
                    throw new api_error_1.ApiError(400, "Restored sequence is exhausted: " + seq.name);
                yield manager.query(`ALTER SEQUENCE ${quote(seq.schema)}.${quote(seq.name)} RESTART WITH ${next.toString()}`);
            }
        });
    }
}
exports.BackupService = BackupService;
exports.backupService = new BackupService();
