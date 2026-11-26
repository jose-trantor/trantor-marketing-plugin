BRANCH    := $(shell git rev-parse --abbrev-ref HEAD)
TIMESTAMP := $(shell git log -1 --format="%cd" --date=format:"%Y%m%dT%H%M%S")

MCP_URL_PROD    := https://skull-api.trantorai.ws/mcp
MCP_URL_STAGING := https://skull-api-staging.trantorai.ws/mcp

# STAGE y MCP_URL: sufijo del zip y URL del MCP que se fija en el paquete de ChatGPT
ifeq ($(BRANCH),staging)
STAGE   := -staging
MCP_URL := $(MCP_URL_STAGING)
else
STAGE   :=
MCP_URL := $(MCP_URL_PROD)
endif

# URL que debe tener claude/.mcp.json en el repo; vacía = rama sin comprobación estricta
ifeq ($(BRANCH),main)
CLAUDE_MCP_EXPECTED := $(MCP_URL_PROD)
else ifeq ($(BRANCH),staging)
CLAUDE_MCP_EXPECTED := $(MCP_URL_STAGING)
else
CLAUDE_MCP_EXPECTED :=
endif

OUT_DIR := builds

# Nombre del zip: builds/trantor-marketing-<plataforma>[-staging]-<timestamp>.zip
dist = $(OUT_DIR)/trantor-marketing-$(1)$(STAGE)-$(TIMESTAMP).zip

CLAUDE_DIST  := $(call dist,claude)
CHATGPT_DIST := $(call dist,chatgpt)
CHATGPT_TMP  := $(OUT_DIR)/.chatgpt

.PHONY: help setup check-mcp fix-mcp claude-build claude-clean chatgpt-build chatgpt-clean

help:
	@echo "Trantor Marketing Plugin"
	@echo ""
	@echo "  setup          - Configura el driver de merge 'ours' en este clon (una vez)"
	@echo "  check-mcp      - Comprueba la URL de claude/.mcp.json para la rama $(BRANCH)"
	@echo "  fix-mcp        - Corrige la URL de claude/.mcp.json para la rama $(BRANCH) (sin commit)"
	@echo "  claude-build   - Crea $(CLAUDE_DIST)"
	@echo "  claude-clean   - Elimina los zips del plugin de Claude"
	@echo "  chatgpt-build  - Crea $(CHATGPT_DIST) (MCP: $(MCP_URL))"
	@echo "  chatgpt-clean  - Elimina los zips del plugin de ChatGPT"
	@$(MAKE) --no-print-directory help-dev

setup:
	@git config merge.ours.driver true
	@echo "✓ merge.ours.driver configurado"

check-mcp:
	@found=$$(grep -oF -e '$(MCP_URL_PROD)' -e '$(MCP_URL_STAGING)' claude/.mcp.json | head -1); \
	if [ -z "$(CLAUDE_MCP_EXPECTED)" ]; then \
		echo "ℹ claude/.mcp.json → $${found:-URL desconocida} (rama $(BRANCH): sin comprobación)"; \
	elif [ "$$found" = "$(CLAUDE_MCP_EXPECTED)" ]; then \
		echo "✓ claude/.mcp.json → $$found (rama $(BRANCH))"; \
	else \
		echo "✗ claude/.mcp.json apunta a $${found:-una URL desconocida}; en la rama $(BRANCH) debe ser $(CLAUDE_MCP_EXPECTED)"; \
		echo "  Corrígelo con 'make fix-mcp' y haz commit del cambio por separado."; \
		exit 1; \
	fi

# Corrección manual: solo cuando la lanzas tú. Ni check-mcp, ni claude-build ni CI la usan,
# para que una URL equivocada siempre se vea. No hace commit.
fix-mcp:
	@[ -n "$(CLAUDE_MCP_EXPECTED)" ] || { \
		echo "✗ En la rama $(BRANCH) no hay URL esperada; fix-mcp solo funciona en main y staging"; exit 1; }
	@found=$$(grep -oF -e '$(MCP_URL_PROD)' -e '$(MCP_URL_STAGING)' claude/.mcp.json | head -1); \
	if [ "$$found" = "$(CLAUDE_MCP_EXPECTED)" ]; then \
		echo "✓ claude/.mcp.json ya apunta a $$found (rama $(BRANCH)); nada que hacer"; exit 0; \
	fi; \
	if [ -z "$$found" ]; then \
		echo "✗ claude/.mcp.json no contiene ninguna URL conocida; revísalo y corrígelo a mano"; exit 1; \
	fi; \
	sed "s|$$found|$(CLAUDE_MCP_EXPECTED)|g" claude/.mcp.json > claude/.mcp.json.tmp && \
		mv claude/.mcp.json.tmp claude/.mcp.json; \
	echo "→ claude/.mcp.json: $$found → $(CLAUDE_MCP_EXPECTED)"; \
	$(MAKE) --no-print-directory check-mcp || exit 1; \
	git --no-pager diff --stat -- claude/.mcp.json; \
	echo "  Haz commit de este cambio por separado:"; \
	echo "  git commit -m 'fix: Point Claude MCP to $(BRANCH) URL' claude/.mcp.json"

claude-build: check-mcp
	@echo "→ Generando $(CLAUDE_DIST)..."
	@mkdir -p $(OUT_DIR)
	@rm -f $(CLAUDE_DIST)
	@zip -qr $(CLAUDE_DIST) claude/ -x '*.DS_Store'
	@echo "✓ $(CLAUDE_DIST)"

claude-clean:
	@rm -f $(OUT_DIR)/trantor-marketing-claude-*.zip
	@rmdir $(OUT_DIR) 2>/dev/null || true
	@echo "✓ Zips de Claude eliminados"

chatgpt-build:
	@echo "→ Generando $(CHATGPT_DIST) (MCP: $(MCP_URL))..."
	@mkdir -p $(OUT_DIR)
	@rm -f $(CHATGPT_DIST)
	@rm -rf $(CHATGPT_TMP)
	@cp -R chatgpt $(CHATGPT_TMP)
	@sed 's|$(MCP_URL_PROD)|$(MCP_URL)|g' chatgpt/mcp.json > $(CHATGPT_TMP)/mcp.json
	@grep -qF '"$(MCP_URL)"' $(CHATGPT_TMP)/mcp.json || { \
		echo "✗ chatgpt/mcp.json no contiene $(MCP_URL_PROD); no se puede fijar $(MCP_URL)"; \
		rm -rf $(CHATGPT_TMP); exit 1; }
	@cd $(CHATGPT_TMP) && zip -qr $(CURDIR)/$(CHATGPT_DIST) . -x '*.DS_Store'
	@rm -rf $(CHATGPT_TMP)
	@echo "✓ $(CHATGPT_DIST)"

chatgpt-clean:
	@rm -f $(OUT_DIR)/trantor-marketing-chatgpt-*.zip
	@rmdir $(OUT_DIR) 2>/dev/null || true
	@echo "✓ Zips de ChatGPT eliminados"

# Comandos de desarrollo del MCP. Al final para que `help` siga siendo el objetivo por defecto.
include development.mk
