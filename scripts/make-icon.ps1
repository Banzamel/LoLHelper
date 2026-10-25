# Renders the app icon (build/icon.png, 512x512): gold hexagon with a teal core and "LH".
Add-Type -AssemblyName System.Drawing
$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear([System.Drawing.Color]::Transparent)

function Hex([float]$cx, [float]$cy, [float]$r) {
    $pts = @()
    for ($i = 0; $i -lt 6; $i++) {
        $a = [Math]::PI / 180 * (60 * $i - 90)
        $pts += New-Object System.Drawing.PointF ($cx + $r * [Math]::Cos($a)), ($cy + $r * [Math]::Sin($a))
    }
    return , $pts
}

$outer = Hex 256 256 250
$gold = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 512, 512), ([System.Drawing.Color]::FromArgb(240, 230, 210)), ([System.Drawing.Color]::FromArgb(120, 90, 40))
$g.FillPolygon($gold, $outer)
$g.FillPolygon((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(1, 10, 19))), (Hex 256 256 222))
$teal = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 60), (New-Object System.Drawing.Point 0, 460), ([System.Drawing.Color]::FromArgb(10, 200, 185)), ([System.Drawing.Color]::FromArgb(3, 70, 90))
$g.FillPolygon($teal, (Hex 256 256 200))
$g.FillPolygon((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(9, 20, 40))), (Hex 256 256 180))

$font = New-Object System.Drawing.Font 'Segoe UI', 150, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = 'Center'
$fmt.LineAlignment = 'Center'
$g.DrawString('LH', $font, $gold, (New-Object System.Drawing.RectangleF 0, 10, 512, 512), $fmt)

$out = Join-Path $PSScriptRoot '..\build\icon.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "Icon saved: $out"

# 256x256 copy for the .ico embedded into the exe (scripts/after-pack.js).
$src = [System.Drawing.Image]::FromFile((Resolve-Path $out))
$small = New-Object System.Drawing.Bitmap 256, 256
$g2 = [System.Drawing.Graphics]::FromImage($small)
$g2.InterpolationMode = 'HighQualityBicubic'
$g2.DrawImage($src, 0, 0, 256, 256)
$small.Save((Join-Path $PSScriptRoot '..\build\icon-256.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose(); $small.Dispose(); $src.Dispose()
