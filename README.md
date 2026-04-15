# Fondos-Base-Datos

Esta herramienta web está diseñada para la gestión integral de fondos, permitiendo el registro y control de cortes e ingresos. Facilita la visualización y análisis de datos financieros a través de diversas funcionalidades.

## Funcionalidades Principales

### 1. Gestión de Cortes e Ingresos
- **Registro Detallado:** Permite ingresar nuevos cortes (gastos) e ingresos de forma individual o masiva.
- **Campos de Registro:** Cada transacción incluye campos como Fecha, Número de Corte, Establecimiento, Código/Tipo, Monto, Mes, Semana y Año.
- **Validación Inteligente:** Se valida la información requerida (Corte, Establecimiento, Código/Tipo, Monto) para asegurar la integridad de los datos.

### 2. Visualización y Filtrado de Datos
- **Vista de Cortes:** Muestra una lista paginada y con scroll virtual de todos los cortes e ingresos registrados.
- **Búsqueda Avanzada:** Permite filtrar registros por múltiples criterios (Fecha, Usuario, Corte, Establecimiento, Código, Descripción, Monto, Mes, Año) con opciones configurables.
- **Detección de Duplicados:** Resalta visualmente registros que podrían ser duplicados, ya sea por código/descripción o por monto.
- **Modo de Selección Múltiple:** Habilita la selección de varios registros para acciones masivas.

### 3. Reportes y Análisis
- **Reporte Unitario:** Detalla los montos por código/tipo para un número de corte específico, con opción de desglosar totales e ingresos/egresos.
- **Reporte de Rango Conjunto:** Permite analizar transacciones dentro de un rango de números de corte, con filtros por año y tipo (ingresos/egresos).
- **Reportes Personalizados (Pestaña 'Reportes'):**
    - **Filtros Flexibles:** Permite filtrar por año (usando el año guardado o la fecha de ingreso), tipo (ingresos/egresos), establecimiento y cortes específicos o rangos.
    - **Visualización Resumida:** Opción para agrupar y sumarizar los datos por código/tipo de transacción.
    - **Ordenamiento por Mes:** Permite ordenar los resultados por mes para un análisis subtotalizado.
- **Consolidado:** Muestra un resumen anual por establecimiento, con totales mensuales y anuales.
- **Resumen de Cortes:** Lista todos los números de corte registrados, con su total y la opción de eliminar cortes completos.

### 4. Acciones Masivas
- **Eliminación Masiva:** Permite seleccionar múltiples registros y eliminarlos en conjunto tras una confirmación de seguridad.
- **Modificación Masiva:** Abre una interfaz de tabla editable para modificar varios registros seleccionados simultáneamente y guardarlos en bloque.

### 5. Funcionalidad "Usar Fecha de Ingreso"
- **Filtros de Año Flexibles:** En los reportes ('Reportes', 'Reporte Unitario', 'Reporte de Rango Conjunto'), esta opción permite elegir si el filtro de año debe basarse en el campo 'Año' guardado en el registro o en el año extraído de la 'Fecha de Ingreso' (primera columna). Esto asegura la correcta visualización de datos independientemente de cómo se haya registrado el año.

### 6. Seguridad y Autenticación
- **Inicio de Sesión:** Requiere autenticación para acceder a las funcionalidades de registro y modificación de datos.
- **Cierre de Sesión:** Opción segura para finalizar la sesión.

Esta herramienta proporciona una solución robusta para la gestión financiera, ofreciendo flexibilidad y control sobre los datos registrados.
