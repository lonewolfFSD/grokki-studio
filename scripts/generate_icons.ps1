Add-Type -AssemblyName System.Drawing

$assetsDir = 'E:\Assistant AI\assets'
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

function Create-GrokIcon([int]$size, [string]$outFile) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [float]$size / 64.0

    # Background Orb with deep slate dark fill
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $g.FillEllipse($bgBrush, 2.0 * $scale, 2.0 * $scale, 60.0 * $scale, 60.0 * $scale)

    # Outer Neon Electric Cyan Glow Ring
    $penWidth = [float](3.5 * $scale)
    $glowColor = [System.Drawing.Color]::FromArgb(235, 56, 189, 248)
    $glowPen = New-Object System.Drawing.Pen($glowColor, $penWidth)
    $g.DrawEllipse($glowPen, [float](3.5 * $scale), [float](3.5 * $scale), [float](57.0 * $scale), [float](57.0 * $scale))

    # Grokki Cyber Eyes (Glowing Neon Pill/Circle Eyes with White Specular Highlights)
    $eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

    # Left eye
    $g.FillEllipse($eyeBrush, [float](17.0 * $scale), [float](20.0 * $scale), [float](9.0 * $scale), [float](12.0 * $scale))
    $g.FillEllipse($whiteBrush, [float](18.5 * $scale), [float](21.0 * $scale), [float](3.5 * $scale), [float](3.5 * $scale))

    # Right eye
    $g.FillEllipse($eyeBrush, [float](38.0 * $scale), [float](20.0 * $scale), [float](9.0 * $scale), [float](12.0 * $scale))
    $g.FillEllipse($whiteBrush, [float](39.5 * $scale), [float](21.0 * $scale), [float](3.5 * $scale), [float](3.5 * $scale))

    # Cute Smile Arc
    $smileWidth = [float](3.2 * $scale)
    $smilePen = New-Object System.Drawing.Pen($glowColor, $smileWidth)
    $smilePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $smilePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($smilePen, [float](21.0 * $scale), [float](30.0 * $scale), [float](22.0 * $scale), [float](16.0 * $scale), 20.0, 140.0)

    # Accent blush dots
    $blushBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 14, 165, 233))
    $g.FillEllipse($blushBrush, 11.0 * $scale, 32.0 * $scale, 5.0 * $scale, 4.0 * $scale)
    $g.FillEllipse($blushBrush, 48.0 * $scale, 32.0 * $scale, 5.0 * $scale, 4.0 * $scale)

    $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Create-GrokIcon 32 'E:\Assistant AI\assets\grokki_tray.png'
Create-GrokIcon 64 'E:\Assistant AI\assets\grokki_icon.png'
Create-GrokIcon 256 'E:\Assistant AI\assets\grokki_icon_large.png'

# Also generate a multi-size .ico file
$trayBmp = [System.Drawing.Bitmap]::FromFile('E:\Assistant AI\assets\grokki_tray.png')
$hIcon = $trayBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream('E:\Assistant AI\assets\grokki_icon.ico', [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$trayBmp.Dispose()

Write-Output "ALL_ICONS_CREATED"
