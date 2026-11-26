## ADDED Requirements

### Requirement: El orchestrator es el punto de entrada único para crear y ampliar dashboards
El sistema SHALL exponer un skill `orchestrator` que reemplaza al skill `dashboard-marketing`. El usuario interactúa únicamente con el orchestrator; este delega en los skills de área.

#### Scenario: Primera ejecución — dashboard nuevo
- **WHEN** el usuario pide un dashboard de marketing y no existe manifest en la conversación
- **THEN** el orchestrator ejecuta el onboarding, pregunta qué área quiere instalar primero y delega en el skill de área correspondiente

#### Scenario: Añadir área a dashboard existente
- **WHEN** el usuario pide añadir una nueva área y ya existe un manifest en la conversación
- **THEN** el orchestrator muestra las áreas ya instaladas, ofrece las áreas disponibles (no instaladas) con `AskUserQuestion` y delega en el skill correspondiente sin repetir el onboarding completo

### Requirement: El orchestrator gestiona el Resumen automáticamente
El orchestrator SHALL invocar el skill `resumen` automáticamente cuando `installed_tabs` pase a tener tabs de 2 o más áreas distintas, sin que el usuario lo solicite explícitamente.

#### Scenario: Resumen se activa al instalar la segunda área
- **WHEN** el orchestrator termina de instalar una nueva área y el total de áreas instaladas es exactamente 2
- **THEN** invoca el skill `resumen` a continuación

#### Scenario: Resumen se actualiza al instalar áreas adicionales
- **WHEN** el orchestrator termina de instalar una nueva área y ya había 2 o más áreas instaladas
- **THEN** invoca el skill `resumen` para actualizar la pestaña Resumen con la nueva área

#### Scenario: Resumen no se muestra con una sola área
- **WHEN** solo hay una área instalada
- **THEN** el orchestrator no invoca el skill `resumen` y la pestaña Resumen permanece oculta

### Requirement: El orchestrator informa del estado actual del dashboard
Al inicio de cualquier interacción sobre un dashboard existente, el orchestrator SHALL mostrar un resumen del estado: áreas instaladas, título y áreas disponibles para añadir.

#### Scenario: Resumen de estado al añadir área
- **WHEN** el usuario pide añadir una área a un dashboard que ya tiene áreas instaladas
- **THEN** el orchestrator muestra: "Tu dashboard «[título]» tiene instaladas: [lista]. Puedes añadir: [lista restante]."
