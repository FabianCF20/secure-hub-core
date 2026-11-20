# SecureHub — módulo de Inteligencia

## Alcance funcional

El módulo amplía el sistema existente. No reemplaza formularios, registros, minuta ni reportes.

- Recepción: fuentes internas y registro manual.
- Expedientes: clasificación, estado, cliente, responsable y trazabilidad.
- Entidades: personas, organizaciones, ubicaciones, activos y otros elementos.
- Eventos: hechos fechados vinculados al expediente.
- Evidencias: metadatos, procedencia, integridad y referencia privada de almacenamiento.
- Coincidencias: sugerencias explicables que requieren revisión humana.
- Hallazgos e informes: conclusiones relacionadas con fuentes y evidencias.

## Modelo inicial de colecciones

| Colección | Propósito | Relación |
| --- | --- | --- |
| intelligenceCases | Expediente principal | clientId, ownerId |
| intelligenceEntities | Personas/organizaciones/elementos | caseId, clientId |
| intelligenceEvents | Línea de tiempo | caseId, clientId |
| intelligenceEvidence | Metadatos de evidencia | caseId, clientId |
| intelligenceFindings | Hallazgos del analista | caseId, clientId |
| intelligenceMatches | Coincidencias sugeridas | caseId, clientId |

Los documentos secundarios deben incluir siempre `caseId` y `clientId`. No guardar contenido binario de evidencias directamente en Firestore.

## Matriz inicial de acceso

- ADMIN y CENTRAL: lectura global.
- COORDINADOR: lectura de expedientes de clientes asignados.
- SUPERVISOR y GUARDA: lectura únicamente cuando `ownerId` coincide con su UID.
- CLIENTE: sin acceso al módulo de inteligencia en esta fase.
- Escrituras: denegadas desde SDK cliente; operaciones sensibles deben exponerse como Cloud Functions callable y validar identidad, cuenta activa, rol, cliente y responsable.
- Eliminación: no habilitada; los cambios relevantes deben conservar trazabilidad.

## Reglas de seguridad obligatorias antes de producción

1. Mantener denegación por defecto en Firestore.
2. No confiar en roles, ownerId, clientId ni clasificación enviados por el navegador.
3. Revalidar el perfil y la asignación del cliente en cada Cloud Function.
4. Registrar creación, consulta sensible, cambios de clasificación, reasignación, revisión de coincidencias y exportaciones.
5. Guardar archivos en Storage privado, con reglas independientes que verifiquen el expediente; no generar URLs públicas permanentes.
6. Validar tipo MIME real, tamaño, hash y nombre de archivo; bloquear extensiones peligrosas.
7. No incluir datos personales sensibles en títulos, notificaciones, logs técnicos ni índices de búsqueda innecesarios.
8. Las coincidencias se presentan como hipótesis explicables; ninguna coincidencia se confirma automáticamente.
9. Probar permisos positivos y negativos con Firebase Emulator Suite antes de desplegar reglas.
10. Aplicar retención, archivo y eliminación conforme a política aprobada; no borrar evidencia sin autorización y registro.

## Estado de esta entrega

Implementado en rama de trabajo:
- Modelos, pantalla, ruta y navegación por rol.
- Recepción manual mediante Cloud Function con validación de perfil activo, rol, cliente y responsable.
- Listado de expedientes mediante Cloud Function con alcance ADMIN/CENTRAL global, COORDINADOR por clientes asignados y SUPERVISOR/GUARDA por propietario.
- Consulta de responsables asignables limitada al cliente.
- Auditoría de creación, consultas de expedientes y consulta de responsables.
- Reglas Firestore deniegan lectura y escritura directa para todas las colecciones de inteligencia. El acceso se realiza por callable para evitar exponer el contenido en la caché persistente del SDK Firestore.

Pendiente antes de uso real: ejecutar build/lint, compilar Cloud Functions, configurar y desplegar las reglas con la configuración Firebase del entorno, probar permisos con Emulator Suite y revisar el modelo de clasificación. No están habilitadas todavía las evidencias, eventos, entidades, hallazgos, coincidencias ni informes. No cargar información sensible real hasta completar las pruebas.
