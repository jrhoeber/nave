PORT     := 5173
API_PROD := https://api.naveapp.co
API_LOCAL := http://localhost:8000

.PHONY: install build run run-local preview type-check clean

## Install dependencies
install:
	npm install

## Build production bundle → dist/
build:
	npm run build

## Dev server against the deployed API (https://api.naveapp.co)
run:
	VITE_API_BASE_URL=$(API_PROD) npm run dev -- --port $(PORT)

## Dev server against a locally running API (http://localhost:8000)
run-local:
	VITE_API_BASE_URL=$(API_LOCAL) npm run dev -- --port $(PORT)

## Serve the built dist/ bundle locally (mirrors production behaviour)
preview: build
	npm run preview -- --port $(PORT)

## TypeScript type-check (no emit)
type-check:
	npx tsc --noEmit

## Remove build artefacts and installed packages
clean:
	rm -rf dist node_modules
