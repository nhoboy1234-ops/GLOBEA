Add-Type -AssemblyName System.Drawing
$assetRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\GLOBEA_v3\assets'))
$records = Get-Content -LiteralPath (Join-Path $assetRoot 'photo-credits.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]84)
foreach ($record in $records) {
    $sourcePath = Join-Path $assetRoot $record.file
    $image = [System.Drawing.Image]::FromFile($sourcePath)
    foreach ($width in @(700, 1200)) {
        $height = [int][Math]::Round($image.Height * $width / $image.Width)
        $bitmap = New-Object System.Drawing.Bitmap($width, $height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($image, 0, 0, $width, $height)
        $targetPath = Join-Path $assetRoot ($record.file.Replace('.jpg', "-$width.jpg"))
        $bitmap.Save($targetPath, $jpegEncoder, $parameters)
        $graphics.Dispose()
        $bitmap.Dispose()
    }
    $optimized = New-Object System.Drawing.Bitmap($image.Width, $image.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($optimized)
    $graphics.DrawImage($image,0,0,$image.Width,$image.Height)
    $temporaryPath = Join-Path $assetRoot ($record.file.Replace('.jpg', '.optimized.jpg'))
    $optimized.Save($temporaryPath,$jpegEncoder,$parameters)
    $graphics.Dispose()
    $optimized.Dispose()
    $image.Dispose()
    if ((Get-Item -LiteralPath $temporaryPath).Length -lt (Get-Item -LiteralPath $sourcePath).Length) {
        Move-Item -LiteralPath $temporaryPath -Destination $sourcePath -Force
    } else {
        Remove-Item -LiteralPath $temporaryPath
    }
    Write-Output ($record.file + ' responsive sizes ready')
}
$parameters.Dispose()
