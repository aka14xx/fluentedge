# Restructure project for Render
# Usage: Open PowerShell in project root and run: .\scripts\restructure_for_render.ps1

$root = Get-Location
$templates = Join-Path $root 'templates'
$static = Join-Path $root 'static'
$staticImages = Join-Path $static 'images'

Write-Output "Creating templates and static directories..."
New-Item -ItemType Directory -Force -Path $templates | Out-Null
New-Item -ItemType Directory -Force -Path $static | Out-Null
New-Item -ItemType Directory -Force -Path $staticImages | Out-Null

# Move HTML files into templates (skip files inside existing templates/pronunciation-ai/templates)
Write-Output "Moving top-level HTML files into templates/ (will overwrite if exists)..."
$topHtml = Get-ChildItem -Path $root -Filter *.html -File
foreach ($f in $topHtml) {
    $dest = Join-Path $templates $f.Name
    Copy-Item -Path $f.FullName -Destination $dest -Force
    Write-Output "Copied $($f.Name) -> templates/$($f.Name)"
}

# Move CSS and JS from root into static
Write-Output "Copying CSS and JS files into static/"
$cssjs = Get-ChildItem -Path $root -Include *.css,*.js -File
foreach ($f in $cssjs) {
    $dest = Join-Path $static $f.Name
    Copy-Item -Path $f.FullName -Destination $dest -Force
    Write-Output "Copied $($f.Name) -> static/$($f.Name)"
}

# Copy images folder into static/images
Write-Output "Copying images/ -> static/images/ (recursive)"
$imagesDir = Join-Path $root 'images'
if (Test-Path $imagesDir) {
    Copy-Item -Path $imagesDir\* -Destination $staticImages -Recurse -Force
    Write-Output "Images copied"
} else {
    Write-Output "No images folder found at $imagesDir"
}

# Update HTML references to use /static/ prefix for CSS/JS and /static/images/ for images
Write-Output "Updating HTML references to /static/ paths in templates/*.html"
Get-ChildItem -Path $templates -Filter *.html -File | ForEach-Object {
    $content = Get-Content -Raw -Path $_.FullName
    $new = $content -replace 'href="(?!/static/)([^\"]+\.css)"','href="/static/$1"'
    $new = $new -replace 'src="(?!/static/)([^\"]+\.js)"','src="/static/$1"'
    $new = $new -replace 'src="images/','src="/static/images/'
    $new = $new -replace 'href="images/','href="/static/images/'
    Set-Content -Path $_.FullName -Value $new -Force
    Write-Output "Patched $_.Name"
}

Write-Output "Done. Review templates/ and static/ and then delete original files if everything looks good."