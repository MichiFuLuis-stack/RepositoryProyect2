const db = require('./server/config/database').db;
db.prepare('DELETE FROM uploaded_files').run();
db.prepare('DELETE FROM generated_files').run();
console.log('Base de datos limpiada con éxito.');
