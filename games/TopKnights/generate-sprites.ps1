Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
$assetDir = Join-Path $root "art\sprites\assets"
$unitDir = Join-Path $root "art\sprites\units"
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null
New-Item -ItemType Directory -Force -Path $unitDir | Out-Null

$assetOrder = @(
  "royal_keep","village_house","army_house","archer_house","stable","watch_tower","stone_tower","wall","gatehouse","outpost",
  "market","farm","lumber_camp","quarry","blacksmith","academy","hospital","chapel","granary","siege_workshop",
  "cannon_nest","mortar_pit","bridge","dock","power_plant","refinery","radar_hub","bunker","command_hall","capital_wall",
  "guard_barracks","ranger_lodge","lancer_stable","repair_bay","signal_beacon","tesla_spire","flame_tower","missile_silo","supply_depot","imperial_mint",
  "war_foundry","observatory","storm_generator","citadel","shield_bastion","siege_foundry","drone_lab","airstrip","hover_port","rail_fort"
)

$unitOrder = @(
  "villager","warrior","archer","knight","scout","captain","engineer","marine","militia","catapult",
  "ballista","ram","cannon","musketeer","mortarTeam","machineNest","armoredCar","ww1Tank","halftrack","lightTank",
  "mediumTank","heavyTank","rocketTruck","missileCarrier","hovercraft","apc","drone","copter","bomb","cluster",
  "buster","emp","nuke","repair","civilian","deer","boar","axe","sword","gun","rifle",
  "pikeman","crossbowman","paladin","warWagon","fireCart","sapper","sniper","medic","flameTank","aaHalftrack",
  "railgunTank","siegeMech","gunship","stealthDrone","assaultSkiff","shieldCarrier","carpet","orbital","nano","gravity"
)

function New-Color($hex, $alpha = 255) {
  $base = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return [System.Drawing.Color]::FromArgb($alpha, $base.R, $base.G, $base.B)
}

function Pt($x, $y) {
  return [System.Drawing.PointF]::new([float]$x, [float]$y)
}

function New-SpriteCanvas($size = 128) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $bmp.MakeTransparent()
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  return @{ Bitmap = $bmp; Graphics = $g; Size = $size }
}

function Save-Sprite($canvas, $path) {
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

function Fill-Ellipse($g, $hex, $x, $y, $w, $h, $alpha = 255) {
  $brush = New-Object System.Drawing.SolidBrush (New-Color $hex $alpha)
  $g.FillEllipse($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Fill-Rect($g, $hex, $x, $y, $w, $h, $alpha = 255) {
  $brush = New-Object System.Drawing.SolidBrush (New-Color $hex $alpha)
  $g.FillRectangle($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Fill-Poly($g, $hex, $points, $alpha = 255) {
  $brush = New-Object System.Drawing.SolidBrush (New-Color $hex $alpha)
  $g.FillPolygon($brush, $points)
  $brush.Dispose()
}

function Stroke-Poly($g, $hex, $width, $points, $alpha = 255) {
  $pen = New-Object System.Drawing.Pen (New-Color $hex $alpha), $width
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPolygon($pen, $points)
  $pen.Dispose()
}

function Stroke-Rect($g, $hex, $width, $x, $y, $w, $h, $alpha = 255) {
  $pen = New-Object System.Drawing.Pen (New-Color $hex $alpha), $width
  $g.DrawRectangle($pen, $x, $y, $w, $h)
  $pen.Dispose()
}

function Stroke-Ellipse($g, $hex, $width, $x, $y, $w, $h, $alpha = 255) {
  $pen = New-Object System.Drawing.Pen (New-Color $hex $alpha), $width
  $g.DrawEllipse($pen, $x, $y, $w, $h)
  $pen.Dispose()
}

function Stroke-Line($g, $hex, $width, $x1, $y1, $x2, $y2, $alpha = 255) {
  $pen = New-Object System.Drawing.Pen (New-Color $hex $alpha), $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($pen, $x1, $y1, $x2, $y2)
  $pen.Dispose()
}

function Fill-RoundedRect($g, $hex, $x, $y, $w, $h, $r, $alpha = 255) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $r, $r, 180, 90)
  $path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  $brush = New-Object System.Drawing.SolidBrush (New-Color $hex $alpha)
  $g.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

function Draw-Shadow($g, $cx, $cy, $w, $h) {
  Fill-Ellipse $g "#081014" ($cx - $w / 2) ($cy - $h / 2) $w $h 80
}

function Get-Variant($key, $values) {
  $sum = 0
  foreach ($char in $key.ToCharArray()) { $sum += [int][char]$char }
  return $values[$sum % $values.Length]
}

function Draw-Windows($g, $points) {
  foreach ($point in $points) {
    Fill-Rect $g "#f4f2ea" $point[0] $point[1] $point[2] $point[3]
  }
}

function Draw-HouseFamily($g, $key, $roofPalette, $trimHex) {
  $roof = Get-Variant $key $roofPalette
  $roofDark = Get-Variant $key @("#774936", "#6e5a40", "#5a432c", "#874f38")
  $wall = Get-Variant $key @("#ddd6c8", "#d8cfbf", "#cfc4b0")
  Draw-Shadow $g 64 92 90 26
  Fill-Poly $g "#544437" @((Pt 30 86),(Pt 70 74),(Pt 102 82),(Pt 78 98),(Pt 36 94))
  Fill-Poly $g $wall @((Pt 34 76),(Pt 68 66),(Pt 96 76),(Pt 76 92),(Pt 40 88))
  Fill-Poly $g $roof @((Pt 22 62),(Pt 52 28),(Pt 90 34),(Pt 108 58),(Pt 80 92),(Pt 36 86))
  Fill-Poly $g $roofDark @((Pt 62 36),(Pt 90 34),(Pt 108 58),(Pt 80 92),(Pt 58 68))
  Fill-Poly $g "#fff4e0" @((Pt 28 60),(Pt 52 32),(Pt 66 36),(Pt 50 72),(Pt 36 80)) 84
  Fill-Poly $g "#68503e" @((Pt 72 42),(Pt 80 40),(Pt 86 58),(Pt 78 62))
  Fill-Rect $g $trimHex 77 32 8 24
  Fill-Rect $g "#6a4c34" 56 70 14 18
  Draw-Windows $g @(
    @(44, 62, 10, 10),
    @(72, 54, 10, 10)
  )
  Fill-Poly $g "#d1b37f" @((Pt 48 88),(Pt 78 82),(Pt 74 94),(Pt 52 98))
  Stroke-Line $g "#f8e9c8" 2 37 64 55 42 120
  Stroke-Line $g "#6f4f3a" 2 58 34 77 56 90
  Stroke-Poly $g "#44362d" 2 @((Pt 22 62),(Pt 52 28),(Pt 90 34),(Pt 108 58),(Pt 80 92),(Pt 36 86)) 90
}

function Draw-KeepFamily($g, $key) {
  Draw-Shadow $g 64 94 96 28
  Fill-Poly $g "#797168" @((Pt 24 80),(Pt 34 34),(Pt 94 34),(Pt 104 80),(Pt 78 98),(Pt 48 98))
  Fill-RoundedRect $g "#c7c0b6" 36 42 56 38 14
  Fill-RoundedRect $g "#5d554d" 48 48 32 24 10
  Fill-Rect $g "#4f473f" 56 74 16 16
  foreach ($tower in @(@(18,28),@(84,28),@(24,68),@(82,68))) {
    Fill-Ellipse $g "#8b8379" $tower[0] $tower[1] 26 26
    Fill-Poly $g "#665f57" @(
      (Pt ($tower[0] + 5) ($tower[1] + 16)),
      (Pt ($tower[0] + 13) ($tower[1] + 4)),
      (Pt ($tower[0] + 21) ($tower[1] + 16)),
      (Pt ($tower[0] + 13) ($tower[1] + 24))
    )
    Stroke-Ellipse $g "#d7d1c9" 2 ($tower[0] + 4) ($tower[1] + 4) 18 18 80
  }
  Fill-Rect $g "#efe7da" 46 46 10 9
  Fill-Rect $g "#efe7da" 72 46 10 9
  Fill-Rect $g "#efe7da" 58 60 8 8
  Fill-Rect $g "#67d7ff" 82 24 7 40
  Stroke-Rect $g "#4c443d" 2 36 42 56 38 90
  Stroke-Line $g "#ddd4c5" 2 42 58 88 58 80
  if ($key -eq "imperial_mint") {
    Fill-Ellipse $g "#f0d48e" 54 18 20 20
    Fill-Rect $g "#f0d48e" 52 54 24 8
  }
  if ($key -eq "citadel") {
    Fill-Rect $g "#5b544c" 30 24 12 12
    Fill-Rect $g "#5b544c" 86 24 12 12
    Stroke-Line $g "#efe7da" 2 28 34 100 34 80
  }
  if ($key -eq "command_hall") {
    Fill-Poly $g "#f0d48e" @((Pt 62 20),(Pt 70 34),(Pt 54 34))
  }
}

function Draw-TowerFamily($g, $key, $stoneHex) {
  Draw-Shadow $g 64 94 60 22
  Fill-Ellipse $g "#7b756a" 32 30 64 52
  Fill-Ellipse $g $stoneHex 40 38 48 36
  Fill-Ellipse $g "#d6d3cd" 48 46 32 18
  Fill-Ellipse $g "#6c655b" 44 28 40 18
  for ($i = 0; $i -lt 6; $i++) {
    Fill-Rect $g "#5f584f" (44 + $i * 6) 26 4 8
  }
  Fill-Rect $g "#5d554d" 60 50 8 14
  Stroke-Ellipse $g "#ebe6db" 2 48 46 32 18 90
  Fill-Rect $g "#67d7ff" 80 28 6 30
  if ($key -eq "signal_beacon") {
    Stroke-Line $g "#8ff0ff" 3 60 20 60 54
    Stroke-Line $g "#8ff0ff" 3 42 36 78 36
  }
  if ($key -eq "tesla_spire") {
    Stroke-Line $g "#9fe8ff" 3 50 26 64 42
    Stroke-Line $g "#9fe8ff" 3 64 42 54 56
    Stroke-Line $g "#9fe8ff" 3 54 56 74 70
  }
  if ($key -eq "flame_tower") {
    Fill-Poly $g "#ffb36e" @((Pt 60 22),(Pt 70 38),(Pt 60 46),(Pt 52 38))
  }
  if ($key -eq "observatory") {
    Fill-Ellipse $g "#cfdbe2" 48 32 28 18
    Stroke-Line $g "#8fdcff" 2 44 40 84 40
  }
}

function Draw-WallFamily($g, $steel = $false) {
  Draw-Shadow $g 64 92 92 18
  $base = if ($steel) { "#75838e" } else { "#a7a29b" }
  $top = if ($steel) { "#56626b" } else { "#7f7a72" }
  Fill-Rect $g $base 20 56 88 24
  Fill-Rect $g $top 20 48 88 8
  for ($i = 0; $i -lt 5; $i++) {
    Fill-Rect $g $top (22 + $i * 16) 48 10 10
  }
  Stroke-Rect $g "#3f4347" 2 20 56 88 24 70
}

function Draw-BridgeFamily($g, $dock = $false) {
  Draw-Shadow $g 64 92 92 16
  Fill-Rect $g "#8a6b49" 18 54 92 18
  for ($i = 0; $i -lt 6; $i++) {
    Stroke-Line $g "#cda77a" 2 (24 + $i * 14) 54 (24 + $i * 14) 72
  }
  Stroke-Line $g "#6f5338" 2 18 54 110 54
  Stroke-Line $g "#6f5338" 2 18 72 110 72
  if ($dock) {
    Fill-Rect $g "#67d7ff" 84 28 6 24
    Fill-Rect $g "#6a4b30" 86 72 4 18
  }
}

function Draw-IndustrialFamily($g, $key, $accent) {
  Draw-Shadow $g 64 94 88 24
  Fill-RoundedRect $g "#5a656e" 22 54 84 26 16
  Fill-RoundedRect $g "#414950" 50 34 30 22 10
  Fill-Ellipse $g "#75828c" 24 32 32 32
  Fill-Ellipse $g "#c9d3da" 34 42 12 12
  Fill-Rect $g "#c6d0d8" 70 44 14 22
  Fill-Rect $g "#73828d" 88 42 12 16
  Stroke-Line $g "#313a40" 3 26 68 104 68
  Stroke-Line $g $accent 5 84 48 100 38
  Fill-Rect $g $accent 92 26 8 26
  Fill-Rect $g "#2e353b" 58 38 14 8
  Fill-Rect $g "#2e353b" 58 48 18 4
  Stroke-Rect $g "#3f464d" 2 22 54 84 26 80
  if ($key -eq "repair_bay") {
    Fill-Rect $g "#ff8686" 56 34 6 24
    Fill-Rect $g "#ff8686" 47 43 24 6
  }
  if ($key -eq "missile_silo") {
    Fill-RoundedRect $g "#d0d7de" 56 18 16 34 8
    Fill-Poly $g "#ffcf8a" @((Pt 56 18),(Pt 64 8),(Pt 72 18))
  }
  if ($key -eq "storm_generator") {
    Stroke-Line $g "#95d8ff" 3 42 30 58 48
    Stroke-Line $g "#95d8ff" 3 58 48 46 62
    Stroke-Line $g "#95d8ff" 3 46 62 72 82
  }
  if ($key -eq "drone_lab") {
    Fill-Ellipse $g "#dfe9ef" 52 26 24 12
    Fill-Ellipse $g "#dfe9ef" 74 32 12 8
  }
  if ($key -eq "shield_bastion") {
    Stroke-Ellipse $g "#9fdcff" 3 30 40 68 34 120
  }
  if ($key -eq "rail_fort") {
    Fill-Rect $g "#24303a" 62 42 30 6
  }
  if ($key -eq "airstrip") {
    Fill-Rect $g "#2c3339" 18 76 92 14
    Fill-Rect $g "#d7dee3" 62 78 6 10
    Fill-Rect $g "#d7dee3" 76 78 6 10
  }
}

function Draw-FarmFamily($g) {
  Draw-HouseFamily $g "farm" @("#a9703d", "#b47b44", "#8f5a2f") "#b99257"
  Fill-Rect $g "#d7bf63" 18 88 92 10
  for ($i = 0; $i -lt 6; $i++) {
    Stroke-Line $g "#b69748" 1.5 (22 + $i * 14) 88 (26 + $i * 14) 98
  }
}

function Draw-QuarryFamily($g) {
  Draw-Shadow $g 64 92 78 20
  Fill-Poly $g "#8d949a" @((Pt 28 74),(Pt 42 48),(Pt 72 42),(Pt 96 60),(Pt 88 88),(Pt 52 92))
  Fill-Rect $g "#667078" 56 28 12 32
  Stroke-Line $g "#cfd6db" 2 62 28 82 40
  Fill-Ellipse $g "#cfd6db" 78 36 10 10
  Fill-Ellipse $g "#6c7278" 34 74 16 12
  Fill-Ellipse $g "#737980" 72 78 18 12
}

function Draw-UnitInfantry($g, $key, $armor, $weaponHex) {
  Draw-Shadow $g 64 92 34 14
  Fill-Ellipse $g "#eadcc5" 50 34 18 18
  Fill-Ellipse $g "#c9b9a4" 48 30 22 10 80
  Fill-RoundedRect $g $armor 48 52 22 28 10
  Fill-RoundedRect $g "#2f3942" 52 56 14 18 6 120
  Stroke-Line $g $armor 6 58 58 40 72
  Stroke-Line $g $armor 6 60 58 78 72
  Stroke-Line $g "#2f3942" 4 66 56 84 48
  Stroke-Line $g "#2f3942" 3 52 78 46 92
  Stroke-Line $g "#2f3942" 3 66 78 72 92
  if ($weaponHex) {
    Stroke-Line $g $weaponHex 4 62 60 90 46
  }
  if ($key -eq "archer") {
    Stroke-Line $g "#d2b06c" 2 76 50 88 66
    Stroke-Line $g "#d2b06c" 2 82 46 94 62
  }
  if ($key -eq "crossbowman") {
    Stroke-Line $g "#d2b06c" 2 72 50 90 56
    Stroke-Line $g "#d2b06c" 2 72 62 90 56
  }
  if ($key -eq "pikeman") {
    Stroke-Line $g "#d8d8d8" 3 62 48 92 24
  }
  if ($key -eq "marine" -or $key -eq "musketeer") {
    Fill-Rect $g "#3f4c56" 48 48 20 6
  }
  if ($key -eq "sniper") {
    Fill-Rect $g "#3f4c56" 50 48 24 6
  }
  if ($key -eq "medic") {
    Fill-Rect $g "#ff8686" 54 48 6 18
    Fill-Rect $g "#ff8686" 48 54 18 6
  }
  if ($key -eq "captain") {
    Fill-Rect $g "#d8c27e" 46 50 4 18
  }
}

function Draw-UnitCavalry($g, $key) {
  Draw-Shadow $g 64 92 52 18
  Fill-Ellipse $g "#7d573a" 34 54 46 22
  Fill-Ellipse $g "#a27852" 72 50 16 14
  Fill-Ellipse $g "#eadcc5" 44 38 16 16
  Fill-RoundedRect $g "#8f97a3" 46 52 18 22 8
  Fill-RoundedRect $g "#5d3f2d" 48 60 14 8 4
  Stroke-Line $g "#4a3428" 3 40 74 34 90
  Stroke-Line $g "#4a3428" 3 56 74 52 92
  Stroke-Line $g "#4a3428" 3 72 74 76 92
  Stroke-Line $g "#d8d8d8" 4 60 52 86 44
  if ($key -eq "paladin") {
    Fill-Rect $g "#f0d48e" 46 48 6 20
    Fill-Rect $g "#f0d48e" 44 54 14 6
  }
}

function Draw-UnitVehicle($g, $key, $body, $accent, $barrelLength = 26, $hover = $false) {
  Draw-Shadow $g 64 92 60 18
  Fill-Rect $g "#2e343b" 28 52 12 28
  Fill-Rect $g "#2e343b" 88 52 12 28
  Fill-RoundedRect $g $body 32 48 64 32 10
  Fill-RoundedRect $g $accent 46 38 28 20 8
  Fill-Rect $g "#263039" 64 46 $barrelLength 6
  Fill-Rect $g "#95a0a7" 52 42 16 6 110
  Fill-Rect $g "#22292f" 36 54 56 4
  Fill-Rect $g "#22292f" 36 68 56 4
  Fill-Ellipse $g "#bcc7cd" 54 44 10 8 110
  Stroke-Rect $g "#252b30" 2 32 48 64 32 90
  if ($hover) {
    Stroke-Line $g "#8fdcff" 4 34 82 94 82
    Stroke-Line $g "#8fdcff" 3 36 76 92 76 120
  }
  if ($key -eq "rocketTruck" -or $key -eq "missileCarrier") {
    Fill-Rect $g "#4f5961" 38 34 30 8
    Fill-Rect $g "#d9c6a4" 42 30 4 8
  }
  if ($key -eq "fireCart") {
    Fill-Poly $g "#ffb06a" @((Pt 72 38),(Pt 82 28),(Pt 90 40),(Pt 82 48))
  }
  if ($key -eq "shieldCarrier") {
    Stroke-Ellipse $g "#9fdcff" 3 42 36 34 24 120
  }
  if ($key -eq "ww1Tank" -or $key -eq "heavyTank") {
    Fill-Rect $g "#394248" 28 46 10 36
    Fill-Rect $g "#394248" 90 46 10 36
  }
}

function Draw-UnitAir($g, $key, $body, $rotor = $false) {
  Draw-Shadow $g 64 96 54 16
  Fill-Ellipse $g $body 44 46 40 20
  Fill-Poly $g "#dce8ef" @((Pt 40 56),(Pt 18 46),(Pt 20 40),(Pt 44 48))
  Fill-Poly $g "#dce8ef" @((Pt 84 56),(Pt 108 46),(Pt 106 40),(Pt 80 48))
  Fill-Rect $g "#56656e" 58 40 12 28
  Fill-Rect $g "#dce8ef" 78 50 18 5
  Fill-Ellipse $g "#eef6fb" 54 50 8 6 110
  if ($rotor) {
    Stroke-Line $g "#414c55" 4 24 38 104 38
    Stroke-Line $g "#5f6c73" 3 62 28 62 48
  }
  if ($key -eq "stealthDrone") {
    Fill-Rect $g "#9fdcff" 52 44 18 4
  }
}

function Draw-AbilityIcon($g, $kind) {
  Draw-Shadow $g 64 92 34 14
  switch ($kind) {
    "bomb" {
      Fill-Ellipse $g "#2d3740" 40 46 34 34
      Fill-Rect $g "#f3b06f" 54 30 6 18
    }
    "cluster" {
      Fill-Ellipse $g "#3a4047" 32 50 22 22
      Fill-Ellipse $g "#3a4047" 54 42 22 22
      Fill-Ellipse $g "#3a4047" 66 58 18 18
    }
    "buster" {
      Fill-RoundedRect $g "#616b73" 38 40 50 24 10
      Fill-Rect $g "#f7c58a" 72 34 8 18
    }
    "emp" {
      Fill-Ellipse $g "#4b5a68" 40 44 40 40
      Stroke-Line $g "#7ef7ff" 5 60 34 60 94
      Stroke-Line $g "#7ef7ff" 5 34 60 86 60
    }
    "nuke" {
      Fill-RoundedRect $g "#5a636c" 46 28 20 52 8
      Fill-Poly $g "#ffcf8a" @((Pt 46 28),(Pt 56 14),(Pt 66 28))
    }
    "carpet" {
      Fill-Ellipse $g "#394149" 32 50 18 18
      Fill-Ellipse $g "#394149" 52 44 18 18
      Fill-Ellipse $g "#394149" 72 38 18 18
    }
    "orbital" {
      Fill-Rect $g "#9fe8ff" 58 20 8 64
      Fill-Ellipse $g "#f5fdff" 48 36 28 18
    }
    "nano" {
      Fill-Ellipse $g "#4c6168" 40 42 40 40
      Stroke-Ellipse $g "#8affd9" 3 34 36 52 52
    }
    "gravity" {
      Fill-Ellipse $g "#57647d" 42 44 36 36
      Stroke-Line $g "#cfd8ff" 3 32 60 48 60
      Stroke-Line $g "#cfd8ff" 3 80 60 64 60
      Stroke-Line $g "#cfd8ff" 3 60 32 60 48
      Stroke-Line $g "#cfd8ff" 3 60 88 60 72
    }
  }
}

function Draw-DropIcon($g, $kind) {
  Draw-Shadow $g 64 94 30 12
  switch ($kind) {
    "axe" {
      Stroke-Line $g "#7b5634" 6 56 34 70 80
      Fill-Poly $g "#c9d1d8" @((Pt 48 42),(Pt 72 32),(Pt 78 48),(Pt 62 54))
    }
    "sword" {
      Stroke-Line $g "#efe3bc" 5 56 30 56 82
      Fill-Rect $g "#6d4e35" 46 72 20 5
    }
    "gun" {
      Fill-Rect $g "#93a9b7" 40 48 36 10
      Fill-Rect $g "#2b3238" 62 40 12 8
    }
    "rifle" {
      Fill-Rect $g "#7ef2d0" 32 50 44 8
      Fill-Rect $g "#2b3238" 64 40 16 8
    }
  }
}

function Draw-CivilianSprite($g) {
  Draw-Shadow $g 64 94 28 12
  Fill-Ellipse $g "#eadcc5" 50 36 16 16
  Fill-RoundedRect $g "#7f5f44" 48 52 20 28 8
  Fill-Rect $g "#5f4632" 52 76 4 12
  Fill-Rect $g "#5f4632" 62 76 4 12
}

function Draw-AnimalSprite($g, $kind) {
  $body = if ($kind -eq "deer") { "#bf8e62" } else { "#5a3d28" }
  $head = if ($kind -eq "deer") { "#d6b08a" } else { "#7a5740" }
  Draw-Shadow $g 64 94 44 14
  Fill-Ellipse $g $body 40 54 32 18
  Fill-Ellipse $g $head 68 48 16 12
  Stroke-Line $g "#402a1f" 3 46 68 42 90
  Stroke-Line $g "#402a1f" 3 58 68 54 90
  Stroke-Line $g "#402a1f" 3 70 66 68 90
  if ($kind -eq "deer") {
    Stroke-Line $g "#f1d7a3" 3 76 46 88 30
    Stroke-Line $g "#f1d7a3" 3 72 48 80 28
  }
}

function Draw-AssetSprite($id) {
  $canvas = New-SpriteCanvas
  $g = $canvas.Graphics
  switch ($id) {
    { $_ -in @("village_house","army_house","archer_house","stable","market","hospital","chapel","granary","farm","lumber_camp","guard_barracks","ranger_lodge","lancer_stable","supply_depot") } {
      $palette = switch ($id) {
        "army_house" { @("#8d5d44", "#9b6a50", "#7b4c36") }
        "archer_house" { @("#7e664a", "#906f55", "#6d553c") }
        "stable" { @("#6f5337", "#7f6040", "#5d452d") }
        "market" { @("#cc7751", "#d88258", "#b66743") }
        "guard_barracks" { @("#8c5e46", "#9d6b52", "#754a37") }
        "ranger_lodge" { @("#65724d", "#75835d", "#4d5b37") }
        "lancer_stable" { @("#6f5337", "#846545", "#584128") }
        "supply_depot" { @("#8e6e47", "#9d7c55", "#735a38") }
        "hospital" { @("#667b8d", "#5c7284", "#506673") }
        "chapel" { @("#8b8883", "#9b978f", "#7a7670") }
        "granary" { @("#9c6d3b", "#ae804a", "#85592f") }
        "farm" { @("#a86f3d", "#bb8048", "#8a592d") }
        "lumber_camp" { @("#6a4a2d", "#7e5735", "#583c23") }
        default { @("#c46d49", "#d88055", "#aa6042") }
      }
      Draw-HouseFamily $g $id $palette "#66d7ff"
      if ($id -eq "farm") { Draw-FarmFamily $g }
    }
    { $_ -in @("royal_keep","academy","command_hall","imperial_mint","citadel") } { Draw-KeepFamily $g $id }
    { $_ -in @("watch_tower","stone_tower","outpost","signal_beacon","tesla_spire","flame_tower","observatory") } { Draw-TowerFamily $g $id "#9c9689" }
    { $_ -in @("wall","capital_wall") } { Draw-WallFamily $g ($id -eq "capital_wall") }
    "gatehouse" {
      Draw-WallFamily $g $false
      Fill-Rect $g "#5b3a25" 54 56 20 24
    }
    "bridge" { Draw-BridgeFamily $g $false }
    "dock" { Draw-BridgeFamily $g $true }
    "hover_port" {
      Draw-BridgeFamily $g $true
      Fill-Ellipse $g "#9fe8ff" 46 40 16 10
      Fill-Ellipse $g "#9fe8ff" 66 46 16 10
    }
    "quarry" { Draw-QuarryFamily $g }
    { $_ -in @("blacksmith","siege_workshop","power_plant","refinery","radar_hub","bunker","cannon_nest","mortar_pit","repair_bay","missile_silo","war_foundry","storm_generator","shield_bastion","siege_foundry","drone_lab","airstrip","rail_fort") } {
      $accent = switch ($id) {
        "blacksmith" { "#ffb06a" }
        "power_plant" { "#9bd4ff" }
        "refinery" { "#78d3b4" }
        "radar_hub" { "#86eff7" }
        "repair_bay" { "#8affd9" }
        "missile_silo" { "#ffd089" }
        "war_foundry" { "#ffb06a" }
        "storm_generator" { "#9bd4ff" }
        "drone_lab" { "#9fe8ff" }
        "airstrip" { "#d7dee3" }
        default { "#67d7ff" }
      }
      Draw-IndustrialFamily $g $id $accent
      if ($id -eq "radar_hub") {
        Fill-Ellipse $g "#cfdbe2" 56 30 26 16
        Stroke-Line $g "#88f3ff" 3 50 38 86 38
      }
      if ($id -eq "cannon_nest" -or $id -eq "mortar_pit") {
        Fill-Rect $g "#263039" 62 44 26 6
      }
    }
    default { Draw-HouseFamily $g $id @("#8d6c5c", "#9b775f", "#745845") "#66d7ff" }
  }
  $path = Join-Path $assetDir ($id + ".png")
  Save-Sprite $canvas $path
}

function Draw-UnitSprite($key) {
  $canvas = New-SpriteCanvas
  $g = $canvas.Graphics
  switch ($key) {
    { $_ -in @("villager","civilian") } { Draw-CivilianSprite $g }
    { $_ -in @("warrior","militia","captain","engineer","musketeer","marine","archer","scout","repair","pikeman","crossbowman","sapper","sniper","medic") } {
      $body = switch ($key) {
        "captain" { "#4b5d71" }
        "musketeer" { "#6b7c8d" }
        "marine" { "#6d8a95" }
        "archer" { "#6b624f" }
        "repair" { "#728690" }
        "pikeman" { "#7a6953" }
        "crossbowman" { "#6d5f4a" }
        "sapper" { "#7f6b55" }
        "sniper" { "#546872" }
        "medic" { "#6d808e" }
        default { "#7f6950" }
      }
      $weapon = switch ($key) {
        "archer" { "#e6bc75" }
        "musketeer" { "#8e6337" }
        "marine" { "#8e6337" }
        "repair" { "#8bf0d4" }
        "pikeman" { "#d8d8d8" }
        "crossbowman" { "#c9b27a" }
        "sniper" { "#9fc0d2" }
        "medic" { "#8bf0d4" }
        default { "#d8d8d8" }
      }
      Draw-UnitInfantry $g $key $body $weapon
    }
    { $_ -in @("knight","paladin") } { Draw-UnitCavalry $g $key }
    { $_ -in @("catapult","ballista","ram","cannon","mortarTeam","machineNest") } {
      $body = if ($key -in @("catapult","ballista","ram")) { "#806249" } else { "#66737c" }
      $accent = if ($key -eq "machineNest") { "#93c8df" } else { "#8998a2" }
      $barrelLength = if ($key -eq "ram") { 10 } elseif ($key -eq "catapult") { 18 } else { 24 }
      Draw-UnitVehicle $g $key $body $accent $barrelLength $false
    }
    { $_ -in @("armoredCar","ww1Tank","halftrack","lightTank","mediumTank","heavyTank","rocketTruck","missileCarrier","hovercraft","apc","warWagon","fireCart","flameTank","aaHalftrack","railgunTank","siegeMech","assaultSkiff","shieldCarrier") } {
      $body = switch ($key) {
        "warWagon" { "#7d654c" }
        "fireCart" { "#7c5438" }
        "rocketTruck" { "#6d7d5d" }
        "missileCarrier" { "#667685" }
        "hovercraft" { "#627983" }
        "flameTank" { "#795c4d" }
        "railgunTank" { "#5c6e86" }
        "siegeMech" { "#666f79" }
        "assaultSkiff" { "#5c7882" }
        "shieldCarrier" { "#5f6977" }
        default { "#6c7880" }
      }
      $accent = switch ($key) {
        "warWagon" { "#b99063" }
        "fireCart" { "#ffb06a" }
        "lightTank" { "#7f8f96" }
        "heavyTank" { "#8c969c" }
        "rocketTruck" { "#99ab79" }
        "hovercraft" { "#96dfff" }
        "flameTank" { "#ffb06a" }
        "railgunTank" { "#a3c0ff" }
        "siegeMech" { "#919ca5" }
        "assaultSkiff" { "#96dfff" }
        "shieldCarrier" { "#9fdcff" }
        default { "#83949c" }
      }
      $barrelLength = if ($key -eq "armoredCar" -or $key -eq "apc" -or $key -eq "warWagon" -or $key -eq "assaultSkiff") { 16 } elseif ($key -eq "rocketTruck" -or $key -eq "missileCarrier") { 20 } elseif ($key -eq "fireCart") { 12 } else { 26 }
      $isHover = $key -eq "hovercraft" -or $key -eq "assaultSkiff"
      Draw-UnitVehicle $g $key $body $accent $barrelLength $isHover
    }
    { $_ -in @("drone","copter","gunship","stealthDrone") } {
      $body = if ($key -eq "drone" -or $key -eq "stealthDrone") { "#93a5b3" } else { "#8699a5" }
      $hasRotor = $key -eq "copter" -or $key -eq "gunship"
      Draw-UnitAir $g $key $body $hasRotor
    }
    { $_ -in @("bomb","cluster","buster","emp","nuke","carpet","orbital","nano","gravity") } { Draw-AbilityIcon $g $key }
    { $_ -in @("axe","sword","gun","rifle") } { Draw-DropIcon $g $key }
    { $_ -in @("deer","boar") } { Draw-AnimalSprite $g $key }
    default { Draw-UnitInfantry $g $key "#7f6950" "#d8d8d8" }
  }
  $path = Join-Path $unitDir ($key + ".png")
  Save-Sprite $canvas $path
}

foreach ($id in $assetOrder) { Draw-AssetSprite $id }
foreach ($key in $unitOrder) { Draw-UnitSprite $key }

$assetMap = @{}
Get-ChildItem $assetDir -Filter *.png | Sort-Object BaseName | ForEach-Object {
  $assetMap[$_.BaseName] = "data:image/png;base64," + [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($_.FullName))
}

$unitMap = @{}
Get-ChildItem $unitDir -Filter *.png | Sort-Object BaseName | ForEach-Object {
  $unitMap[$_.BaseName] = "data:image/png;base64," + [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($_.FullName))
}

$payload = @{ assets = $assetMap; units = $unitMap } | ConvertTo-Json -Depth 5 -Compress
Set-Content -Path (Join-Path $root "sprite-data.js") -Value ("window.TOP_KNIGHTS_SPRITES = " + $payload + ";") -Encoding UTF8
