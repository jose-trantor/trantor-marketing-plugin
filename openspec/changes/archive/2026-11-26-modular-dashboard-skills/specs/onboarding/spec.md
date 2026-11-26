## MODIFIED Requirements

### Requirement: El onboarding soporta selección parcial por área
El onboarding SHALL funcionar con selección parcial: puede completarse pidiendo solo las cuentas necesarias para un área específica, sin requerir que el usuario tenga todas las fuentes conectadas. El skill de área indica al onboarding qué tipos de cuentas necesita.

#### Scenario: Onboarding solo para Meta Ads
- **WHEN** el skill `meta-ads` solicita el onboarding con scope `["meta_ads"]`
- **THEN** el onboarding solo ejecuta los pasos de verificación de conector, fuentes Meta y selección de cuentas publicitarias y campañas; no pregunta por página de Facebook, Instagram ni GA4

#### Scenario: Onboarding solo para Instagram
- **WHEN** el skill `instagram` solicita el onboarding con scope `["instagram"]`
- **THEN** el onboarding solo ejecuta los pasos de verificación de conector, fuentes Instagram y selección de cuenta de Instagram; no pregunta por cuentas publicitarias, página de Facebook ni GA4

#### Scenario: Onboarding solo para Facebook
- **WHEN** el skill `facebook` solicita el onboarding con scope `["facebook"]`
- **THEN** el onboarding solo ejecuta los pasos de verificación de conector, fuentes Facebook y selección de página; no pregunta por cuentas publicitarias, Instagram ni GA4

#### Scenario: Onboarding solo para GA4
- **WHEN** el skill `ga4` solicita el onboarding con scope `["ga4"]`
- **THEN** el onboarding solo ejecuta los pasos de verificación de conector, fuentes GA4 y selección de propiedad; no pregunta por Meta ni Instagram

#### Scenario: La selección previa se reutiliza sin preguntar
- **WHEN** en la misma conversación ya se ejecutó el onboarding para Meta Ads y ahora el skill `instagram` necesita el onboarding
- **THEN** el onboarding no repite los pasos ya completados (conector verificado, marca elegida) y solo pregunta por la cuenta de Instagram
