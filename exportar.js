import fs from 'fs';
import path from 'path';

const outputFile = 'todo_mi_codigo.txt';
const carpetasIgnoradas = ['node_modules', '.git', 'dist', 'public', 'assets'];
const extensionesValidas = ['.ts', '.tsx', '.json', '.html'];

const output = fs.createWriteStream(outputFile);

function leerDirectorio(directorioActual) {
    const archivos = fs.readdirSync(directorioActual);

    archivos.forEach(archivo => {
        const rutaCompleta = path.join(directorioActual, archivo);
        const stats = fs.statSync(rutaCompleta);

        if (stats.isDirectory()) {
            if (!carpetasIgnoradas.includes(archivo)) {
                leerDirectorio(rutaCompleta);
            }
        } else {
            const ext = path.extname(archivo);
            if (extensionesValidas.includes(ext)) {
                const contenido = fs.readFileSync(rutaCompleta, 'utf8');
                output.write(`\n\n========================================\n`);
                output.write(`ARCHIVO: ${rutaCompleta}\n`);
                output.write(`========================================\n\n`);
                output.write(contenido);
            }
        }
    });
}

// Ejecutar usando el directorio actual
leerDirectorio(process.cwd());
output.end();
console.log(`¡Listo! Se ha generado el archivo ${outputFile}`);