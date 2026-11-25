BRANCH    := $(shell git rev-parse --abbrev-ref HEAD)
TIMESTAMP := $(shell git log -1 --format="%cd" --date=format:"%Y%m%dT%H%M%S")

BUILD_DIR := builds

ifeq ($(BRANCH),staging)
DIST := $(BUILD_DIR)/trantor-marketing-staging-$(TIMESTAMP).zip
else
DIST := $(BUILD_DIR)/trantor-marketing-$(TIMESTAMP).zip
endif

.PHONY: help claude-build claude-clean

help:
	@echo "Trantor Marketing Plugin"
	@echo ""
	@echo "  claude-build   - Crea el zip del plugin de Claude (rama: $(BRANCH))"
	@echo "  claude-clean   - Elimina los zips del plugin de Claude"

claude-build:
	@mkdir -p $(BUILD_DIR)
	@echo "→ Generando $(DIST)..."
	@zip -r $(DIST) claude/ .claude-plugin/ README.md
	@echo "✓ $(DIST)"

claude-clean:
	@rm -rf $(BUILD_DIR)
	@echo "✓ $(BUILD_DIR)/ eliminado"
