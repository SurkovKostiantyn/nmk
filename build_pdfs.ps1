param(
    [string]$FilePath = ""
)

# Скрипт для інкрементальної конвертації Markdown (.md) файлів у формат PDF
# Шукає всі .md файли, зберігаючи структуру папок у вихідній директорії /pdf
# Конвертує лише змінені файли.
# Використовує бібліотеку md-to-pdf через Node.js (npx)

$sourceFolder = $PSScriptRoot
if ([string]::IsNullOrEmpty($sourceFolder)) { $sourceFolder = Get-Location }

$pdfFolder = Join-Path -Path $sourceFolder -ChildPath "pdf"
$configFile = Join-Path -Path $sourceFolder -ChildPath "pdf_config.js"

if ([string]::IsNullOrEmpty($FilePath)) {
    Write-Host "Пошук файлів *.md у папці та підпапках: $sourceFolder" -ForegroundColor Cyan

    # Шукаємо всі .md файли, виключаючи непотрібні системні, службові папки та кореневу директорію
    $files = Get-ChildItem -Path $sourceFolder -Filter "*.md" -Recurse -File | Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\\.git\\" -and
        $_.FullName -notmatch "\\\.gemini\\" -and
        $_.FullName -notmatch "\\pdf\\" -and
        $_.DirectoryName -ne $sourceFolder
    }

    Write-Host "Знайдено .md файлів для аналізу: $($files.Count)" -ForegroundColor Cyan
} else {
    $targetFile = Get-Item -Path $FilePath -ErrorAction SilentlyContinue
    if (-not $targetFile -or -not $targetFile.Exists) {
        Write-Host "Помилка: Файл '$FilePath' не знайдено." -ForegroundColor Red
        exit 1
    }
    $files = @($targetFile)
    Write-Host "Аналіз окремого файлу: $($targetFile.FullName)" -ForegroundColor Cyan
}

$convertedCount = 0
$skippedCount = 0

foreach ($file in $files) {
    # Визначаємо відносний шлях файлу
    # Врахування слешів для коректного вирізання
    $relativePath = $file.FullName.Substring($sourceFolder.Length).TrimStart('\', '/')
    
    # Формуємо шлях до цільового PDF файлу в папці pdf
    $pdfRelativePath = [System.IO.Path]::ChangeExtension($relativePath, ".pdf")
    $targetPdf = Join-Path -Path $pdfFolder -ChildPath $pdfRelativePath
    
    # Створюємо підпапку в /pdf, якщо її ще не існує
    $targetPdfDir = Split-Path $targetPdf
    if (-not (Test-Path $targetPdfDir)) {
        New-Item -ItemType Directory -Path $targetPdfDir -Force | Out-Null
    }

    # Перевіряємо, чи потрібна конвертація (PDF відсутній АБО MD файл новіший)
    $needsConversion = $true

    if (Test-Path $targetPdf) {
        $pdfItem = Get-Item $targetPdf
        if ($file.LastWriteTime -le $pdfItem.LastWriteTime) {
            $needsConversion = $false
        }
    }

    if ($needsConversion) {
        Write-Host "Конвертую: $($relativePath) -> pdf\$($pdfRelativePath)" -ForegroundColor Yellow
        
        # md-to-pdf створює файл поруч із вихідним .md, тому ми визначаємо його назву:
        $generatedPdf = [System.IO.Path]::ChangeExtension($file.FullName, ".pdf")

        if (Test-Path $configFile) {
            npx --yes md-to-pdf $file.FullName --config-file $configFile
        } else {
            npx --yes md-to-pdf $file.FullName
        }

        # Якщо конвертація успішна і файл дійсно з'явився поруч - переміщуємо його зі спробами
        if ($LASTEXITCODE -eq 0 -and (Test-Path $generatedPdf)) {
            $maxRetries = 5
            $retryCount = 0
            $moved = $false

            while (-not $moved -and $retryCount -lt $maxRetries) {
                try {
                    Move-Item -Path $generatedPdf -Destination $targetPdf -Force -ErrorAction Stop
                    $moved = $true
                    Write-Host "Успішно!" -ForegroundColor Green
                    $convertedCount++
                } catch {
                    $retryCount++
                    Write-Host "Файл зайнятий, очікуємо (Спроба $retryCount/$maxRetries)..." -ForegroundColor Yellow
                    Start-Sleep -Milliseconds 500
                }
            }

            if (-not $moved) {
                Write-Host "Помилка: не вдалося перемістити файл $($file.Name) після $maxRetries спроб." -ForegroundColor Red
            }
        } else {
            Write-Host "Помилка при конвертації $($file.Name)" -ForegroundColor Red
        }
    } else {
        $skippedCount++
        # Розкоментуйте лінію нижче, якщо хочете бачити повідомлення про пропуск
        # Write-Host "Пропущено (без змін): $($relativePath)" -ForegroundColor DarkGray
    }
}

Write-Host "===========================" -ForegroundColor Cyan
Write-Host "Завершено! Згенеровано нових/змінених: $convertedCount, Пропущено (актуальні): $skippedCount" -ForegroundColor Green
