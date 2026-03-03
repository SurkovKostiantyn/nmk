param(
    [string]$FilePath = ""
)

# Скрипт для конвертації Markdown (.md) файлів у формат PDF
# Використовує бібліотеку md-to-pdf через Node.js (npx)

$sourceFolder = $PSScriptRoot
if ([string]::IsNullOrEmpty($sourceFolder)) { $sourceFolder = Get-Location }

$configFile = Join-Path -Path $sourceFolder -ChildPath "pdf_config.js"

if ([string]::IsNullOrEmpty($FilePath)) {
    Write-Host "Пошук файлів lecture_*.md, practice_*.md, lab_*.md у папці та підпапках: $sourceFolder" -ForegroundColor Cyan

    # Шукаємо всі .md файли у поточній папці та у підпапках
    $files = Get-ChildItem -Path $sourceFolder -Filter "*.md" -Recurse -File | Where-Object {
        ($_.Name -like "lecture_*" -or $_.Name -like "practice_*" -or $_.Name -like "lab_*") -and
        ($_.Name -notmatch "_01_[a-d]\.md")
    }

    Write-Host "Знайдено файлів для генерації: $($files.Count)" -ForegroundColor Cyan
} else {
    $targetFile = Get-Item -Path $FilePath -ErrorAction SilentlyContinue
    if (-not $targetFile -or -not $targetFile.Exists) {
        Write-Host "Помилка: Файл '$FilePath' не знайдено." -ForegroundColor Red
        exit 1
    }
    $files = @($targetFile)
    Write-Host "Конвертація окремого файлу: $($targetFile.FullName)" -ForegroundColor Cyan
}

foreach ($file in $files) {
    Write-Host "Конвертую: $($file.FullName) -> $($file.BaseName).pdf" -ForegroundColor Yellow
    
    # Перевіряємо, чи існує файл конфігурації
    if (Test-Path $configFile) {
        npx --yes md-to-pdf $file.FullName --config-file $configFile
    } else {
        npx --yes md-to-pdf $file.FullName
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Успішно!" -ForegroundColor Green
    } else {
        Write-Host "Помилка при конвертації $($file.Name)" -ForegroundColor Red
    }
}

Write-Host "Конвертацію завершено!" -ForegroundColor Green
