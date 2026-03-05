PLAYWRIGHT_CAPTURE_SCRIPT=scripts/playwright/capture.mjs
PLAYWRIGHT_CAPTURE_RUN=$(COMPOSE) --profile e2e run --rm e2e-vitest node $(PLAYWRIGHT_CAPTURE_SCRIPT)
PLAYWRIGHT_DEFAULT_OUT=var/screenshots/screenshot.png
SHOT_DEFAULT_WIDTH=1920
SHOT_DEFAULT_HEIGHT=1080
SHOT_RES_WIDTH=$(word 1,$(subst x, ,$(RESOLUTION)))
SHOT_RES_HEIGHT=$(word 2,$(subst x, ,$(RESOLUTION)))
SHOT_WIDTH=$(if $(WIDTH),$(WIDTH),$(if $(SHOT_RES_WIDTH),$(SHOT_RES_WIDTH),$(SHOT_DEFAULT_WIDTH)))
SHOT_HEIGHT=$(if $(HEIGHT),$(HEIGHT),$(if $(SHOT_RES_HEIGHT),$(SHOT_RES_HEIGHT),$(SHOT_DEFAULT_HEIGHT)))

.PHONY: shot
shot: ## Capture screenshot with Playwright. URL is required. RESOLUTION=1920x1080 or WIDTH/HEIGHT.
	$(TARGET_HEADER)
	@if [ -z "$(URL)" ]; then echo "URL is required. Example: make shot URL=https://example.com OUT=var/screenshots/example.png"; exit 1; fi
	@if [ -n "$(RESOLUTION)" ] && ! echo "$(RESOLUTION)" | grep -Eq '^[0-9]+x[0-9]+$$'; then echo "Invalid RESOLUTION format: $(RESOLUTION). Use WIDTHxHEIGHT, e.g. 1920x1080"; exit 1; fi
	@mkdir -p var/screenshots
	$(PLAYWRIGHT_CAPTURE_RUN) \
		--url "$(URL)" \
		--out "$(if $(OUT),$(OUT),$(PLAYWRIGHT_DEFAULT_OUT))" \
		$(if $(HOST),--host "$(HOST)",) \
		$(if $(SHOT_WIDTH),--width "$(SHOT_WIDTH)",) \
		$(if $(SHOT_HEIGHT),--height "$(SHOT_HEIGHT)",) \
		$(if $(WAIT_MS),--wait-ms "$(WAIT_MS)",) \
		$(if $(TIMEOUT_MS),--timeout-ms "$(TIMEOUT_MS)",) \
		$(if $(FULL_PAGE),--full-page,)

.PHONY: shot-astro
shot-astro: ## Capture screenshot of Astro docs page (default /).
	$(TARGET_HEADER)
	$(COMPOSE) up -d astro
	$(MAKE) shot \
		URL="$(if $(URL),$(URL),http://astro:4321/)" \
		OUT="$(if $(OUT),$(OUT),var/screenshots/astro-home.png)" \
		WAIT_MS="$(if $(WAIT_MS),$(WAIT_MS),500)"

.PHONY: shot-web
shot-web: ## Capture screenshot of an external page. URL is required.
	$(TARGET_HEADER)
	@if [ -z "$(URL)" ]; then echo "URL is required. Example: make shot-web URL=https://pinia.vuejs.org/"; exit 1; fi
	$(MAKE) shot \
		URL="$(URL)" \
		OUT="$(if $(OUT),$(OUT),var/screenshots/web-page.png)" \
		WAIT_MS="$(if $(WAIT_MS),$(WAIT_MS),1000)"
