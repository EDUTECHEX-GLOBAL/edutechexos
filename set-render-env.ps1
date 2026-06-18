# Run this once to push all env vars to Render and trigger a redeploy.
# Get your API key from: https://dashboard.render.com/u/settings#api-keys
#
# Usage:
#   .\set-render-env.ps1 -ApiKey "rnd_XXXXXXXXXXXXXXXXXX"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type"  = "application/json"
    "Accept"        = "application/json"
}

# ── 1. Find service ID by name ────────────────────────────────────────────────
Write-Host "Looking up service 'edutechexos-ueoq'..."
$services = Invoke-RestMethod -Uri "https://api.render.com/v1/services?limit=20" -Headers $headers
$service = $services | Where-Object { $_.service.name -like "*edutechexos*" } | Select-Object -First 1

if (-not $service) {
    Write-Error "No edutechexos service found. Check Render dashboard."
    exit 1
}

$serviceId = $service.service.id
Write-Host "Service name: $($service.service.name)"
Write-Host "Found service: $serviceId"

# ── 2. Build env var payload ──────────────────────────────────────────────────
$envVars = @(
    @{ key = "MONGODB_URI";        value = "YOUR_MONGODB_URI" }
    @{ key = "JWT_SECRET";         value = "YOUR_JWT_SECRET" }
    @{ key = "ENCRYPTION_KEY";     value = "YOUR_ENCRYPTION_KEY" }
    @{ key = "GEMINI_API_KEY";     value = "YOUR_GEMINI_API_KEY" }
    @{ key = "BREVO_API_KEY";      value = "YOUR_BREVO_API_KEY" }
    @{ key = "SMTP_HOST";          value = "smtp-relay.brevo.com" }
    @{ key = "SMTP_PORT";          value = "587" }
    @{ key = "SMTP_SECURE";        value = "false" }
    @{ key = "SMTP_USER";          value = "YOUR_SMTP_USER" }
    @{ key = "SMTP_PASS";          value = "YOUR_SMTP_PASS" }
    @{ key = "SMTP_FROM";          value = "YOUR_SMTP_FROM" }
    @{ key = "ADMIN_NOTIFY_EMAIL"; value = "YOUR_ADMIN_NOTIFY_EMAIL" }
    @{ key = "APP_URL";            value = "YOUR_APP_URL" }
    @{ key = "SYS_PASS_ADMIN";     value = "YOUR_SYS_PASS_ADMIN" }
    @{ key = "SYS_PASS_ADITYA";    value = "YOUR_SYS_PASS_ADITYA" }
    @{ key = "SYS_PASS_DEV_RK";    value = "YOUR_SYS_PASS_DEV_RK" }
    @{ key = "SYS_PASS_DESIGN";    value = "YOUR_SYS_PASS_DESIGN" }
    @{ key = "SYS_PASS_MOHAN_K";   value = "YOUR_SYS_PASS_MOHAN_K" }
    @{ key = "SYS_PASS_MOHAN_R";   value = "YOUR_SYS_PASS_MOHAN_R" }
    @{ key = "SYS_PASS_MOHAN_S";   value = "YOUR_SYS_PASS_MOHAN_S" }
)

# ── 3. Update env vars via Render API ────────────────────────────────────────
Write-Host "Setting $($envVars.Count) environment variables..."
$body = $envVars | ConvertTo-Json -Depth 3

Invoke-RestMethod `
    -Method PUT `
    -Uri "https://api.render.com/v1/services/$serviceId/env-vars" `
    -Headers $headers `
    -Body $body | Out-Null

Write-Host "Env vars set successfully."

# ── 4. Trigger a manual redeploy ─────────────────────────────────────────────
Write-Host "Triggering redeploy..."
Invoke-RestMethod `
    -Method POST `
    -Uri "https://api.render.com/v1/services/$serviceId/deploys" `
    -Headers $headers `
    -Body "{}" | Out-Null

Write-Host ""
Write-Host "Done! Render is redeploying with all env vars set."
Write-Host "Track progress at: https://dashboard.render.com"
