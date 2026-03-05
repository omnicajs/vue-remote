COMPOSE ?= docker compose
TARGET_HEADER=@echo -e '===== \e[34m' $@ '\e[0m'
YARN=$(COMPOSE) run --rm node yarn

.PHONY: node_modules
node_modules: package.json yarn.lock ## Installs dependencies
	$(TARGET_HEADER)
	@$(COMPOSE) run --rm node yarn install --silent
	@touch node_modules || true

.PHONY: build
build: ## Builds the package
	$(TARGET_HEADER)
	$(YARN) build

.PHONY: release
release: ## Bumps version and creates tag
	$(TARGET_HEADER)
ifdef as
	$(YARN) release:$(as)
else
	$(YARN) release
endif

.PHONY: tests
tests: ## Runs autotests
	$(TARGET_HEADER)
ifdef cli
	$(YARN) test $(cli) --passWithNoTests
else
	$(YARN) test
endif

.PHONY: tests-coverage
tests-coverage: ## Runs unit/integration tests with coverage
	$(TARGET_HEADER)
ifdef cli
	$(YARN) test:coverage $(cli)
else
	$(YARN) test:coverage
endif

.PHONY: tests-e2e
tests-e2e: ## Runs new browser e2e tests (vitest + playwright provider)
	$(TARGET_HEADER)
ifdef cli
	$(COMPOSE) --profile e2e run --rm e2e-vitest yarn test:e2e $(cli)
else
	$(COMPOSE) --profile e2e run --rm e2e-vitest yarn test:e2e
endif

.PHONY: tests-e2e-coverage
tests-e2e-coverage: ## Runs browser e2e tests with coverage
	$(TARGET_HEADER)
ifdef cli
	$(COMPOSE) --profile e2e run --rm e2e-vitest yarn test:e2e:coverage $(cli)
else
	$(COMPOSE) --profile e2e run --rm e2e-vitest yarn test:e2e:coverage
endif

.PHONY: tests-all-coverage
tests-all-coverage: ## Runs full merged coverage (unit/integration + browser e2e)
	$(TARGET_HEADER)
ifdef cli
	$(COMPOSE) --profile e2e run --rm e2e-vitest yarn test:all:coverage $(cli)
else
	$(COMPOSE) --profile e2e run --rm e2e-vitest yarn test:all:coverage
endif

.PHONY: actionlint
actionlint: ## Lints GitHub Actions workflows
	$(TARGET_HEADER)
	docker run --rm -v "$$(pwd):/repo" -w /repo rhysd/actionlint:latest

.PHONY: help
help: ## Calls recipes list
	@cat $(MAKEFILE_LIST) | grep -e "^[a-zA-Z0-9_\-]*: *.*## *" | awk '\
	    BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

-include recipies/playwright.mk

# Colors
$(call computable,CC_BLACK,$(shell tput -Txterm setaf 0 2>/dev/null))
$(call computable,CC_RED,$(shell tput -Txterm setaf 1 2>/dev/null))
$(call computable,CC_GREEN,$(shell tput -Txterm setaf 2 2>/dev/null))
$(call computable,CC_YELLOW,$(shell tput -Txterm setaf 3 2>/dev/null))
$(call computable,CC_BLUE,$(shell tput -Txterm setaf 4 2>/dev/null))
$(call computable,CC_MAGENTA,$(shell tput -Txterm setaf 5 2>/dev/null))
$(call computable,CC_CYAN,$(shell tput -Txterm setaf 6 2>/dev/null))
$(call computable,CC_WHITE,$(shell tput -Txterm setaf 7 2>/dev/null))
$(call computable,CC_END,$(shell tput -Txterm sgr0 2>/dev/null))

.PHONY: tsc
tsc: ## Runs all TypeScript checks
	$(TARGET_HEADER)
	$(YARN) typecheck
