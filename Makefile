BRANCH    := $(shell git rev-parse --abbrev-ref HEAD)
TIMESTAMP := $(shell git log -1 --format="%cd" --date=format:"%Y%m%dT%H%M%S")

ifeq ($(BRANCH),staging)
DIST := trantor-marketing-staging-$(TIMESTAMP).zip
else
DIST := trantor-marketing-$(TIMESTAMP).zip
endif

.PHONY: help claude-build claude-clean

help:
	@echo "Trantor Marketing Plugin"
	@echo ""
	@echo "  claude-build   - Crea el zip del plugin de Claude (rama: $(BRANCH))"
	@echo "  claude-clean   - Elimina los zips del plugin de Claude"

claude-build:
	@echo "→ Generando $(DIST)..."
	@zip -r $(DIST) claude/ .claude-plugin/ README.md
	@echo "✓ $(DIST)"

claude-clean:
	@rm -f trantor-marketing-*.zip
	@echo "✓ Zips eliminados"
