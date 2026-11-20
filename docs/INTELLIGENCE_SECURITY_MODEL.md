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

Base de modelos, pantalla de entrada, ruta y navegación; reglas de lectura iniciales; callable para crear expedientes con origen MANUAL o INTERNAL. Aún no están habilitados el formulario de captura, consultas, carga de archivos, eventos, entidades, hallazgos, coincidencias ni informes. No se debe cargar información real hasta completar y probar esos flujos.
