# Cotizador TECNISOLUCIONES

Rediseño web para administrar clientes, catálogo de productos y cotizaciones. Está alineado con el modelo entidad-relación entregado:

- `clientes` → `cotizaciones`
- `cotizaciones` → `detalle_cotizacion`
- `productos` → `detalle_cotizacion`

## Conexión MySQL

La aplicación toma la conexión mostrada en Workbench: host `127.0.0.1`, puerto `3306`, usuario `root` y esquema `TECNISOLUCIONES_BS`.

1. Copia `.env.example` como `.env`.
2. Escribe la contraseña real de MySQL en `DB_PASSWORD` (no la subas a Git).
3. Instala las dependencias con `npm install`.
4. Inicia el proyecto con `npm start`.
5. Abre `http://localhost:3000`.

Al iniciar, el servidor crea el esquema y las tablas de forma segura si no existen. También deja algunos productos iniciales. Si MySQL no está encendido, la interfaz se mantiene utilizable en modo local; los datos de ese modo se guardan solamente en `data/local-data.json`.

Si deseas crear la base desde Workbench, ejecuta primero [`database/schema.sql`](database/schema.sql). El servidor continuará usando esas mismas tablas.

## Operación

1. Registra al cliente en **Clientes**.
2. Agrega o modifica el catálogo en **Catálogo**.
3. Selecciona un cliente, añade artículos y guarda la cotización.
4. Consulta el historial o imprime una cotización guardada como PDF desde el diálogo de impresión del navegador.

## Acceso de administradores

Al iniciar el servidor se crea automáticamente la cuenta inicial si todavía no existe:

- Correo: `admin@tecnisoluciones.com`
- Contraseña: `Admin1234`

Las contraseñas se guardan con `bcryptjs` y 10 rondas de sal. Al iniciar sesión, el servidor emite una cookie `HttpOnly` válida por 24 horas. Las acciones de crear, editar o eliminar productos, clientes y cotizaciones requieren esa sesión.

Para crear otro administrador desde la consola:

```bash
npm run crear-admin -- nuevo_admin@tecnisoluciones.com ContraseñaSegura123
```

También puede usarse `POST /api/crear-admin` con un cuerpo JSON que contenga `username` y `password`. Este endpoint requiere una sesión de administrador activa.
