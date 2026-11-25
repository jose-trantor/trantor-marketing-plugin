# Trantor Marketing

Dashboards e informes de marketing en vivo, creados por un asistente de IA a partir de tus cuentas de Meta Ads, Instagram, Facebook y Google Analytics 4, sin conocimientos técnicos.

Este repo contiene la integración de Trantor Marketing para cada plataforma de IA. Cada una vive en su propia carpeta, con su README y su versión.

## Plataformas

| Plataforma | Estado         | Versión | Documentación                          |
| ---------- | -------------- | ------- | -------------------------------------- |
| Claude     | Disponible     | 0.4.0   | [claude/README.md](claude/README.md)   |
| ChatGPT    | En preparación | —       | [chatgpt/README.md](chatgpt/README.md) |

## Datos y privacidad

Todas las plataformas consultan los datos a través del conector Trantor (<https://trantorai.ws>), siempre con las cuentas que cada persona ha autorizado. Las integraciones no guardan datos propios.

Para empezar necesitas una cuenta de Trantor (<https://staging.trantorai.ws/signup/>) y tus fuentes habilitadas en <https://staging.trantorai.ws/connectors/>.

## Estructura del repo

```text
claude/            Plugin de Claude (skills, MCP, manifest)
chatgpt/           Integración de ChatGPT (en preparación)
.claude-plugin/    Marketplace de Claude; apunta a claude/
openspec/          Especificaciones y cambios (OpenSpec)
.claude/           Comandos y skills de desarrollo de este repo; no forman parte del plugin
```

## Licencia

[MIT](LICENSE)
