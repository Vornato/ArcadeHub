Add-Type -AssemblyName System.Drawing

$artDir = Join-Path $PSScriptRoot "art"
New-Item -ItemType Directory -Force -Path $artDir | Out-Null

function New-Canvas($width, $height) {
  $bmp = New-Object System.Drawing.Bitmap $width, $height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Save-Canvas($canvas, $path) {
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

function Fill-RoundedRect($g, $brush, $x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $r, $r, 180, 90)
  $path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function Stroke-RoundedRect($g, $pen, $x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $r, $r, 180, 90)
  $path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  $g.DrawPath($pen, $path)
  $path.Dispose()
}

function Draw-Glyph($g, $kind, $x, $y, $size) {
  $bg = if ($kind -eq "assets") { [System.Drawing.Color]::FromArgb(255, 222, 195, 139) } else { [System.Drawing.Color]::FromArgb(255, 166, 197, 214) }
  $brush = New-Object System.Drawing.SolidBrush $bg
  Fill-RoundedRect $g $brush $x $y $size $size 16
  $brush.Dispose()
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 255, 255, 255)), 2
  Stroke-RoundedRect $g $pen $x $y $size $size 16
  $pen.Dispose()
  $ink = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 9, 14, 18))
  if ($kind -eq "assets") {
    $g.FillRectangle($ink, $x + $size * 0.24, $y + $size * 0.42, $size * 0.52, $size * 0.3)
    $pts = [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new($x + $size * 0.18, $y + $size * 0.42),
      [System.Drawing.PointF]::new($x + $size * 0.5, $y + $size * 0.14),
      [System.Drawing.PointF]::new($x + $size * 0.82, $y + $size * 0.42)
    )
    $g.FillPolygon($ink, $pts)
  } elseif ($kind -eq "weapons") {
    $g.FillRectangle($ink, $x + $size * 0.18, $y + $size * 0.34, $size * 0.64, $size * 0.32)
    $g.FillRectangle($ink, $x + $size * 0.34, $y + $size * 0.2, $size * 0.3, $size * 0.2)
    $g.FillRectangle($ink, $x + $size * 0.54, $y + $size * 0.42, $size * 0.26, $size * 0.08)
  } else {
    $g.FillEllipse($ink, $x + $size * 0.3, $y + $size * 0.34, $size * 0.4, $size * 0.4)
    $g.FillRectangle($ink, $x + $size * 0.44, $y + $size * 0.16, $size * 0.12, $size * 0.3)
  }
  $ink.Dispose()
}

$map = New-Canvas 1200 900
$g = $map.Graphics
$bgRect = New-Object System.Drawing.Rectangle 0,0,1200,900
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bgRect, ([System.Drawing.Color]::FromArgb(255, 12, 28, 35)), ([System.Drawing.Color]::FromArgb(255, 23, 61, 71)), 90
$g.FillRectangle($bgBrush, $bgRect)
$bgBrush.Dispose()

for ($y = 0; $y -lt 900; $y += 40) {
  for ($x = 0; $x -lt 1200; $x += 40) {
    $value = [Math]::Sin($x * 0.013) * [Math]::Cos($y * 0.011) + [Math]::Sin(($x + $y) * 0.004)
    $color = if ([Math]::Abs($x - 620) -lt 70 + 25 * [Math]::Sin($y * 0.02)) {
      [System.Drawing.Color]::FromArgb(255, 47, 118, 160)
    } elseif ($value -gt 1.0) {
      [System.Drawing.Color]::FromArgb(255, 131, 113, 86)
    } elseif ($value -gt 0.25) {
      [System.Drawing.Color]::FromArgb(255, 61, 97, 58)
    } elseif ($value -lt -0.7) {
      [System.Drawing.Color]::FromArgb(255, 83, 102, 76)
    } else {
      [System.Drawing.Color]::FromArgb(255, 92, 133, 72)
    }
    $tile = New-Object System.Drawing.SolidBrush $color
    $g.FillRectangle($tile, $x, $y, 40, 40)
    $tile.Dispose()
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(28, 255, 255, 255)), 1
    $g.DrawRectangle($pen, $x, $y, 40, 40)
    $pen.Dispose()
  }
}

$riverPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(110, 149, 215, 255)), 24
$g.DrawBezier($riverPen, 580, 0, 720, 250, 500, 580, 660, 900)
$riverPen.Dispose()
$roadPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 186, 166, 129)), 10
$g.DrawLine($roadPen, 160, 460, 1020, 460)
$roadPen.Dispose()

$fortBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 203, 192, 172))
$enemyBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 208, 108, 108))
$enemy2Brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 222, 165, 92))
$allyBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 104, 215, 255))
$g.FillEllipse($allyBrush, 170, 620, 120, 120)
$g.FillEllipse($enemyBrush, 900, 160, 120, 120)
$g.FillEllipse($enemy2Brush, 960, 650, 120, 120)
$g.FillRectangle($fortBrush, 220, 660, 32, 32)
$g.FillRectangle($fortBrush, 950, 200, 32, 32)
$g.FillRectangle($fortBrush, 1008, 690, 32, 32)
$fortBrush.Dispose()
$enemyBrush.Dispose()
$enemy2Brush.Dispose()
$allyBrush.Dispose()

$titleFont = New-Object System.Drawing.Font("Georgia", 34, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font("Georgia", 15, [System.Drawing.FontStyle]::Regular)
$goldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 222, 155))
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 247, 241, 228))
$g.DrawString("Top Knights", $titleFont, $goldBrush, 48, 48)
$g.DrawString("Rotating empire war map", $subFont, $textBrush, 52, 92)
$titleFont.Dispose()
$subFont.Dispose()
$goldBrush.Dispose()
$textBrush.Dispose()
Save-Canvas $map (Join-Path $artDir "top-knights-map.png")

$banner = New-Canvas 900 320
$g = $banner.Graphics
$rect = New-Object System.Drawing.Rectangle 0,0,900,320
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 13, 25, 34)), ([System.Drawing.Color]::FromArgb(255, 33, 54, 66)), 0
$g.FillRectangle($grad, $rect)
$grad.Dispose()
$sunOuter = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 255, 222, 145))
$sunInner = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(95, 255, 222, 145))
$g.FillEllipse($sunOuter, 620, 10, 260, 260)
$g.FillEllipse($sunInner, 680, 70, 140, 140)
$sunOuter.Dispose()
$sunInner.Dispose()
$font1 = New-Object System.Drawing.Font("Georgia", 18, [System.Drawing.FontStyle]::Regular)
$font2 = New-Object System.Drawing.Font("Georgia", 48, [System.Drawing.FontStyle]::Bold)
$font3 = New-Object System.Drawing.Font("Georgia", 16, [System.Drawing.FontStyle]::Regular)
$gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 214, 174, 99))
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 248, 243, 232))
$blue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 104, 215, 255))
$g.DrawString("Empire Strategy Sandbox", $font1, $gold, 52, 48)
$g.DrawString("Top Knights", $font2, $white, 48, 74)
$g.DrawString("Build, tax, harvest, and conquer rival nations.", $font3, $white, 54, 150)
$g.FillRectangle($blue, 60, 212, 12, 74)
$flag = [System.Drawing.PointF[]]@(
  [System.Drawing.PointF]::new(72, 212),
  [System.Drawing.PointF]::new(154, 232),
  [System.Drawing.PointF]::new(72, 252)
)
$g.FillPolygon($gold, $flag)
$font1.Dispose()
$font2.Dispose()
$font3.Dispose()
$gold.Dispose()
$white.Dispose()
$blue.Dispose()
Save-Canvas $banner (Join-Path $artDir "top-knights-banner.png")

foreach ($sheetName in @("assets", "weapons")) {
  $sheet = New-Canvas 1200 360
  $g = $sheet.Graphics
  $baseRect = New-Object System.Drawing.Rectangle 0,0,1200,360
  $sheetBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $baseRect, ([System.Drawing.Color]::FromArgb(255, 12, 22, 30)), ([System.Drawing.Color]::FromArgb(255, 26, 42, 52)), 0
  $g.FillRectangle($sheetBrush, $baseRect)
  $sheetBrush.Dispose()
  $labelFont = New-Object System.Drawing.Font("Georgia", 18, [System.Drawing.FontStyle]::Bold)
  $textFont = New-Object System.Drawing.Font("Georgia", 12, [System.Drawing.FontStyle]::Regular)
  $labelBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 228, 205))
  $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 176, 192, 201))
  $g.DrawString(("Top Knights " + $sheetName + " sheet"), $labelFont, $labelBrush, 38, 24)
  $g.DrawString("Generated locally for the in-game catalog.", $textFont, $mutedBrush, 42, 54)
  $items = if ($sheetName -eq "assets") {
    @("Army House","Archer House","Tower","Walls","Market","Quarry","Keep","Dock")
  } else {
    @("Warriors","Catapult","Tank","Hovercraft","Bomb","EMP","Nuke","Drone")
  }
  for ($i = 0; $i -lt $items.Count; $i++) {
    $col = $i % 4
    $row = [Math]::Floor($i / 4)
    $x = 40 + $col * 280
    $y = 96 + $row * 118
    $cardBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(36, 255, 255, 255))
    Fill-RoundedRect $g $cardBrush $x $y 250 92 18
    $cardBrush.Dispose()
    $cardPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(60, 255, 255, 255)), 1
    Stroke-RoundedRect $g $cardPen $x $y 250 92 18
    $cardPen.Dispose()
    Draw-Glyph $g $sheetName ($x + 16) ($y + 14) 56
    $g.DrawString($items[$i], $labelFont, $labelBrush, $x + 88, $y + 18)
    $g.DrawString("Catalog preview art", $textFont, $mutedBrush, $x + 88, $y + 50)
  }
  $labelFont.Dispose()
  $textFont.Dispose()
  $labelBrush.Dispose()
  $mutedBrush.Dispose()
  Save-Canvas $sheet (Join-Path $artDir ("top-knights-" + $sheetName + ".png"))
}
