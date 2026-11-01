# Dashboard Operativo v3: escritorio y TV

React conservado, modelo, tabla y endpoint compartidos. Build estático de Vite con
base './' en ../dashboard/. GitHub Pages sirve los archivos sin ejecutar un build.
No necesita Next.js, Vinext, Worker ni credenciales en esta demostración.

Con Node.js 24: npm ci, npm test y npm run build.
Para regenerar la muestra: node scripts/generate-demo.ts.
Desde la raíz del repo: python -m http.server 8000 --bind 127.0.0.1

Escritorio: http://localhost:8000/pda-mockup/?v=v36#dashboard
TV Callao: http://localhost:8000/pda-mockup/dashboard/?modo=tv&sede=callao&rango=hoy&seg=15&tema=navy&v=v36
TV Paita: cambiar sede=paita. Navy es predeterminado; fondo claro: tema=claro.
Fecha simulada: 05/08/2026 con hora de Lima corriendo. fecha=real activa el reloj
real para la integración futura; no modifica los datos ni el corte de cálculo.
Callao/Hoy tiene 179 naves; Paita/Hoy, 48, con flotas y KPIs independientes.
Rotación de rangos: rotar=1. Filas por página: filas=5 a 12. Segundos: seg=1 a 300.
Notas originales: editor=1, solo escritorio. TV no incluye notas ni marcas.

Datos: public/data/dashboard-demo.json. Hoja para proveedor: public/CAMBIOS-DESARROLLO.md.
El build conserva ambos archivos. Los registros manuales usan localStorage y se
superponen a las lecturas. Ver la hoja para alcance, esfuerzo y límites del mockup.

React y React DOM se empaquetan sin CDN de JavaScript. Poppins y Figtree usan
Google Fonts con fuentes de respaldo. Navy #021E2F, Pantone 296 C, manual COSMOS.
