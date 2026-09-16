# Informe de importación

Generado el 16/9/2026, 02:52:15.

## Filas cargadas

| Tabla | Total | Nuevas | Actualizadas |
|---|---|---|---|
| empresas | 10 | 0 | 10 |
| lugares | 7 | 0 | 7 |
| personal | 55 | 0 | 55 |
| equipos | 96 | 0 | 96 |

## Lo que hay que revisar a mano

### Empresas que solo están en un libro (2)

- **GD 208 · hoja Empresas · fila 8** — "Daniele Jayson Edgar" (CUIT 20-93759576-0) está en GD 208 pero no en GD 200. Se importó igual; confirmar si opera.
- **GD 208 · hoja Empresas · fila 10** — "LH Group SH" (CUIT 30-71527320-5) está en GD 208 pero no en GD 200. Se importó igual; confirmar si opera.

### Empresas sin CUIT que no se pudieron unificar (1)

- **GD 208 · hoja Empresas · fila 13** — "Salomon Silvana" (GDE020) no tiene CUIT, así que no se puede saber si es una de las 8 empresas de GD 200 o una distinta. No se importó.

### Empresas sin CUIT (1)

- **GD 200 · hoja Empresas** — "Hard Norton Rental SRL" (GD08) no tiene CUIT cargado. Hay que completarlo antes de facturar.

### Legajos repetidos (2)

- **GD 200 · hoja Personal** — El legajo GDL012 figura en 2 personas: Garay Esteban Horacio / Giambroni Sergio Leonardo. Se importaron las dos; hay que corregir uno.
- **GD 200 · hoja Personal** — El legajo GDL043 figura en 2 personas: Montenegro Mariano Manuel / Montenegro Matias Marcial. Se importaron las dos; hay que corregir uno.

### Personal sin documento (4)

- **GD 200 · hoja Personal · fila 43** — "Lazarte Lucas Matias" no tiene número de documento. Se importó, pero el documento es la clave que evita duplicados.
- **GD 200 · hoja Personal · fila 44** — "Salvo Jonathan Nicolas" no tiene número de documento. Se importó, pero el documento es la clave que evita duplicados.
- **GD 200 · hoja Personal · fila 49** — "Toloza Lucas" no tiene número de documento. Se importó, pero el documento es la clave que evita duplicados.
- **GD 200 · hoja Personal · fila 50** — "Torres Franco Nicolas" no tiene número de documento. Se importó, pero el documento es la clave que evita duplicados.

### Personas que solo están en GD 208 (6)

- **GD 208 · hoja Personal · fila 3** — "Almiron Cristian" no figura en el maestro de GD 200. Se importó sin documento ni puesto; hay que completarlos.
- **GD 208 · hoja Personal · fila 22** — "Frano Gabriela Vanesa" no figura en el maestro de GD 200. Se importó sin documento ni puesto; hay que completarlos.
- **GD 208 · hoja Personal · fila 31** — "Ibiri Jose" no figura en el maestro de GD 200. Se importó sin documento ni puesto; hay que completarlos.
- **GD 208 · hoja Personal · fila 33** — "Ledesma Daniel Ramon" no figura en el maestro de GD 200. Se importó sin documento ni puesto; hay que completarlos.
- **GD 208 · hoja Personal · fila 40** — "Pais Abel" no figura en el maestro de GD 200. Se importó sin documento ni puesto; hay que completarlos.
- **GD 208 · hoja Personal · fila 49** — "Trovato Carlos Alberto" no figura en el maestro de GD 200. Se importó sin documento ni puesto; hay que completarlos.

### Verificadores y operadores sin persona (1)

- **GD 200 · hoja Operador · fila 7** — "Stuto Abril Daiana" figura como operador pero no está en el maestro de Personal. No se marcó.

### Personal con empresa desconocida (5)

- **GD 200 · hoja Personal · fila 18** — "Daniele Calvin Max" figura en la empresa "Grupo Daniele", que no está en el maestro de Empresas. Se importó sin empresa.
- **GD 200 · hoja Personal · fila 19** — "Daniele Edgardo Rodolfo" figura en la empresa "Grupo Daniele", que no está en el maestro de Empresas. Se importó sin empresa.
- **GD 200 · hoja Personal · fila 20** — "Daniele Jayson Edgar" figura en la empresa "Grupo Daniele", que no está en el maestro de Empresas. Se importó sin empresa.
- **GD 200 · hoja Personal · fila 21** — "Daniele Nicolas Marvin" figura en la empresa "Grupo Daniele", que no está en el maestro de Empresas. Se importó sin empresa.
- **GD 200 · hoja Personal · fila 41** — "Recines Alejandro" figura en la empresa "Grupo Daniele", que no está en el maestro de Empresas. Se importó sin empresa.

### Internos corregidos (1)

- **GD 200 · hoja Equipos · fila 30** — El interno venía como "111", sin el prefijo. Se importó como GDU111.

### Comodines que no son unidades reales (2)

- **GD 200 · hoja Equipos · fila 96** — "GDUVAR" (Equipos Varios) es un comodín del desplegable, no una unidad. No se importó. Si operaciones lo usa para registrar movimientos, hay que resolverlo de otra forma en la app.
- **GD 200 · hoja Equipos · fila 97** — "GDUXXX" (Movimiento Stock) es un comodín del desplegable, no una unidad. No se importó. Si operaciones lo usa para registrar movimientos, hay que resolverlo de otra forma en la app.

### Internos duplicados (4)

- **GD 200 · hoja Equipos · fila 100** — GDU200 ya figura en la GD 200 · hoja Equipos · fila 32, con las columnas bien puestas. Las filas 100 a 104 son una copia del bloque de carretones y semirremolques con las columnas corridas. Se conservó la primera.
- **GD 200 · hoja Equipos · fila 101** — GDU201 ya figura en la GD 200 · hoja Equipos · fila 33, con las columnas bien puestas. Las filas 100 a 104 son una copia del bloque de carretones y semirremolques con las columnas corridas. Se conservó la primera.
- **GD 200 · hoja Equipos · fila 103** — GDU300 ya figura en la GD 200 · hoja Equipos · fila 35, con las columnas bien puestas. Las filas 100 a 104 son una copia del bloque de carretones y semirremolques con las columnas corridas. Se conservó la primera.
- **GD 200 · hoja Equipos · fila 104** — GDU301 ya figura en la GD 200 · hoja Equipos · fila 36, con las columnas bien puestas. Las filas 100 a 104 son una copia del bloque de carretones y semirremolques con las columnas corridas. Se conservó la primera.

### Filas con las columnas corridas (1)

- **GD 200 · hoja Equipos · fila 102** — GDU203 tenía las columnas desplazadas un lugar: la marca ("MARCELLINI") estaba en la columna Tipo y la patente en la columna Marca. Se reacomodó al importar, pero conviene arreglarlo en el Excel si se lo sigue usando.

### Filas de la hoja Equipos que no son equipos (9)

- **GD 200 · hoja Equipos · fila 107** — "Transporte Montera" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.
- **GD 200 · hoja Equipos · fila 108** — "Transporte Rivas" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.
- **GD 200 · hoja Equipos · fila 109** — "Transporte FBM" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.
- **GD 200 · hoja Equipos · fila 110** — "Transporte EusKal" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.
- **GD 200 · hoja Equipos · fila 113** — "Carreton" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.
- **GD 200 · hoja Equipos · fila 114** — "Semirremolque" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.
- **GD 200 · hoja Equipos · fila 119** — "Chofer Montera" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.
- **GD 200 · hoja Equipos · fila 120** — "Almaraz Miguel" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.
- **GD 200 · hoja Equipos · fila 121** — "Chofer Montera" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.

### Equipos que solo están en GD 208 (2)

- **GD 208 · hoja Unidades · fila 7** — GDU011 (CHEVROLET CELTA) no está en el maestro de GD 200. Se importó.
- **GD 208 · hoja Unidades · fila 13** — GDU061 (RENAULT KANGOO) no está en el maestro de GD 200. Se importó.

### Patentes repetidas (1)

- **Maestro de equipos** — La patente OGZ054 figura en 2 internos: GDU055, GDU350. Revisar cuál corresponde.

### Equipos sin patente (1)

- **Maestro de equipos** — 25 equipos no tienen patente: GDU202, GDU700, GDU701, GDU702, GDU703, GDU704, GDU705, GDU800, GDU801, GDU802, GDU803, GDU804, GDU805, GDU806, GDU807, GDU808, GDU809, GDU810, GDU811, GDU900, GDU901, GDU902, GDU903, GDU904, GDU905. En autoelevadores y manipuladores es normal.
