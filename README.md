# Day Counter

Una PWA móvil para saber qué medicación o suplementos has tomado, a qué hora y qué queda pendiente. Se puede instalar desde el navegador y cada tratamiento puede tener su propia etiqueta NFC.

**Aplicación:** https://joanp6.github.io/DayCounter/

## Funciones

- Día personalizable, configurado inicialmente de **03:00 a 03:00**. Una toma registrada a las 02:00 pertenece al día anterior.
- Varios tratamientos, cada uno con nombre, indicaciones y días de la semana.
- Un enlace NFC independiente por tratamiento, listo para copiar o compartir.
- Registro manual o mediante NFC, sin duplicar una toma ya registrada durante el mismo día.
- Calendario con el historial y las horas de cada toma.
- Corrección de hora y posibilidad de volver a marcar una toma como pendiente.
- Recordatorios visibles y notificaciones del sistema cuando la aplicación está abierta.
- Copia de seguridad de los datos en JSON.
- Funcionamiento offline e instalación como aplicación PWA.

## Etiquetas NFC

1. Abre **Tratamientos** en Day Counter.
2. Añade o edita el tratamiento.
3. Pulsa **Copiar enlace** en su apartado NFC.
4. En una aplicación como NFC Tools selecciona *Escribir → Añadir un registro → URL/URI*, pega el enlace y escríbelo en el tag.

Cada enlace contiene un identificador distinto, por ejemplo:

```text
https://joanp6.github.io/DayCounter/?take=creatina
```

Los tags anteriores con `?nfc=1` continúan funcionando y registran el primer tratamiento de la lista.

## Recordatorios

La aplicación muestra un aviso cuando pasa la hora configurada y la toma sigue pendiente. Si se conceden permisos, también genera una notificación mientras la PWA está abierta o en segundo plano.

Los navegadores móviles no garantizan alarmas exactas cuando una PWA lleva tiempo completamente cerrada. Para recordatorios médicos críticos hará falta una siguiente fase con notificaciones push y backend, o empaquetar la aplicación como nativa.

## Privacidad y datos

No hay backend ni analítica. Todo se guarda en `localStorage` en el dispositivo. La primera apertura migra automáticamente el historial de la versión antigua. Borrar los datos del navegador elimina el historial, por lo que conviene usar **Ajustes → Exportar mis datos** periódicamente.

## Desarrollo

Es una aplicación estática con HTML, CSS y módulos ES, sin framework ni proceso de compilación.

```text
app/
├─ index.html
├─ styles.css
├─ manifest.webmanifest
├─ sw.js
├─ icons/
└─ src/
   ├─ core.js
   ├─ storage.js
   └─ main.js
```

Para ejecutar las pruebas:

```bash
npm test
```

Para servirla localmente:

```bash
npx serve app
```

GitHub Actions publica la carpeta `app/` en GitHub Pages al hacer push a `main`.

## Limitaciones

- Android solo lee tags NFC con la pantalla desbloqueada.
- Los datos no se sincronizan todavía entre dispositivos.
- Los recordatorios con la aplicación totalmente cerrada requieren push o una app nativa.

## Licencia

MIT
