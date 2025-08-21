// Index.js para funções simples, sem TypeScript
const { runStorageBackup } = require('./executeBackup');
const { runFirestoreBackup } = require('./executeFirestoreBackup');

// Exportar funções de backup
exports.runStorageBackup = runStorageBackup;
exports.runFirestoreBackup = runFirestoreBackup;
