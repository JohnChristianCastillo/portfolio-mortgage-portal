# Build the Angular app, then serve it + the API from the Python backend as
# one image - same pattern as the other apps in this gateway stack.

# --- stage 1: build the Angular app ---
FROM node:22-alpine AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
# The gateway proxies /mortgage/* here, stripping the slug before forwarding, so
# the app itself is served at its own root - but the BROWSER still requests assets
# from /mortgage/..., which only resolves correctly if the build's <base href>
# matches. Same fix trading/bartender apply via Vite's `base` option.
RUN npx ng build --base-href /mortgage/

# --- stage 2: backend serving /api and the built Angular app ---
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MORTGAGE_STATIC_DIR=/app/webroot
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=frontend /fe/dist/frontend/browser ./webroot
EXPOSE 8500
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8500"]
