$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Join-Path $PSScriptRoot '../assets/source/Mining-CC0'
$out=Join-Path $PSScriptRoot '../assets/generated/pixel-mine'
New-Item -ItemType Directory -Force $out | Out-Null
$images=@{}
function Asset([string]$name){
  if(-not $images.ContainsKey($name)){$images[$name]=[Drawing.Bitmap]::new((Join-Path $root $name))}
  return $images[$name]
}
$canvas=[Drawing.Bitmap]::new(720,1280)
$g=[Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
$g.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([Drawing.Color]::FromArgb(30,24,23))
function Rect($x,$y,$w,$h,$hex){$b=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($hex));$g.FillRectangle($b,$x,$y,$w,$h);$b.Dispose()}
function Blit($name,$x,$y,$w,$h){$g.DrawImage((Asset $name),[Drawing.Rectangle]::new($x,$y,$w,$h))}
function Bevel($x,$y,$w,$h,$fill){
  Rect $x $y $w $h '#111719'; Rect ($x+3) ($y+3) ($w-6) ($h-6) '#69736e'
  Rect ($x+6) ($y+7) ($w-12) ($h-14) $fill; Rect ($x+6) ($y+$h-8) ($w-12) 3 '#10181b'
}
$fonts=[Drawing.Text.PrivateFontCollection]::new()
$fonts.AddFontFile((Join-Path $PSScriptRoot '../assets/source/GolosText.ttf'))
function Text($str,$size,$x,$y,$w,$h,$hex,$align='Center'){
  $font=[Drawing.Font]::new($fonts.Families[0],$size,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel)
  $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($hex))
  $fmt=[Drawing.StringFormat]::new();$fmt.Alignment=[Drawing.StringAlignment]::$align;$fmt.LineAlignment=[Drawing.StringAlignment]::Center
  $g.DrawString($str,$font,$brush,[Drawing.RectangleF]::new($x,$y,$w,$h),$fmt)
  $brush.Dispose();$font.Dispose();$fmt.Dispose()
}

# The world is a cross-section, rather than a board placed on a card.
Blit 'background/background.png' 0 108 720 166
Blit 'background/lb-px-background_hill1.png' 0 132 720 168
Blit 'background/lb-px-background_forest1.png' 350 130 530 148
Blit 'home/lb-r-home.png' 62 140 160 112
# Replace the source building's small English sign with a timber sign.
Rect 128 195 32 13 '#493322'; Text 'БАЗА' 10 124 193 40 18 '#f7d98b'

for($row=0;$row -lt 12;$row++){
  for($col=0;$col -lt 12;$col++){
    $depth=[Math]::Min(7,[Math]::Floor($row/2))
    Blit "tiles/pxy-earth_$depth.png" ($col*64-24) (264+$row*64) 64 64
  }
}
for($col=0;$col -lt 12;$col++){Blit 'tiles/pxy-surface_1.png' ($col*64-24) 240 64 64}

# Side shafts and timber supports frame the mine, without a rounded UI shell.
Rect 36 288 40 610 '#181c20'; Rect 644 288 40 610 '#181c20'
for($y=306;$y -lt 900;$y+=64){
  Blit 'tiles/r-py-object_ladder.png' 41 $y 30 64
  Rect 642 $y 44 8 '#4b372b'; Rect 646 ($y+8) 4 47 '#74533a'
}
for($row=0;$row -lt 8;$row++){
  for($col=0;$col -lt 8;$col++){
    $tile=if(($row+$col)%2 -eq 0){4}else{5}
    Blit "tiles/pxy-earth_$tile.png" (104+$col*64) (312+$row*64) 64 64
  }
}
# A real sprite-based mining alcove below the playable face.
Rect 104 842 512 130 '#171b1d'
Rect 104 842 512 8 '#553e2b';Rect 112 850 8 114 '#72513a';Rect 600 850 8 114 '#72513a'
Blit 'tiles/r-tile_deco_0.png' 145 908 64 64
Blit 'tiles/r-cole.png' 215 914 64 64
Blit 'tiles/pxy-tile_lamp_1.png' 325 838 64 64

# Structural screen rails and the steel cockpit from the reference world.
foreach($x in @(0,704)){Rect $x 106 16 894 '#111719';Rect ($x+3) 106 5 894 '#707970';Rect ($x+9) 106 4 894 '#252f32'}
Bevel 0 0 720 112 '#293337'
Rect 22 20 302 72 '#172022'; Rect 345 20 353 72 '#10181b'
Text 'I DIG IT' 34 30 22 212 60 '#edc271'
Rect 104 299 512 12 '#171f21'
for($i=0;$i -lt 12;$i++){Rect (22+$i*58) 101 26 5 '#c6994f'}

Bevel 0 992 720 288 '#263034'
Rect 17 1010 686 5 '#b98b48'
# Gauge: the needle is a separate runtime sprite driven by remaining moves.
$pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#11191c'),14);$g.DrawEllipse($pen,43,1064,180,180);$pen.Dispose()
$pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#8a8a72'),3);$g.DrawEllipse($pen,43,1064,180,180);$pen.Dispose()
for($i=0;$i -le 10;$i++){
  $a=(-144+$i*10.8)*[Math]::PI/180
  $color=if($i -le 2){'#c26b4c'}else{'#b8c2ad'}
  $pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml($color),3)
  $g.DrawLine($pen,[single](133+[Math]::Cos($a)*71),[single](1154+[Math]::Sin($a)*71),[single](133+[Math]::Cos($a)*83),[single](1154+[Math]::Sin($a)*83));$pen.Dispose()
}
foreach($x in @(306,422,538)){Bevel $x 1060 64 64 '#172022'}
Bevel 286 1150 382 78 '#ac7c3d'
foreach($xy in @(@(13,13),@(693,13),@(13,1005),@(693,1005),@(13,1256),@(693,1256))){Rect $xy[0] $xy[1] 10 10 '#a2a38a';Rect ($xy[0]+4) ($xy[1]+1) 2 8 '#3b403b'}
$canvas.Save((Join-Path $out 'backdrop.png'),[Drawing.Imaging.ImageFormat]::Png)

# Workshop / contract screen. All functional type is rendered by Text objects.
Rect 0 112 720 1168 '#1d272a'
Bevel 0 0 720 112 '#293337';Rect 22 20 302 72 '#172022';Rect 345 20 353 72 '#10181b'
Text 'I DIG IT' 34 30 22 212 60 '#edc271'
for($i=0;$i -lt 12;$i++){Rect (22+$i*58) 101 26 5 '#c6994f'}
for($i=0;$i -lt 3;$i++){
  $y=404+$i*160
  Bevel 36 $y 648 144 '#263337'
  Bevel 508 ($y+10) 158 56 '#364443'
  Bevel 508 ($y+78) 158 52 '#29383a'
  $icon=if($i -eq 0){'item/item_energydrink.png'}elseif($i -eq 1){'item/item_dynamite0.png'}else{'item/item_altimeter.png'}
  Blit $icon 53 ($y+35) 66 66
}
Bevel 44 966 632 78 '#a77d42';Bevel 44 1062 632 68 '#334e4a';Bevel 44 1146 304 62 '#2b393b';Bevel 372 1146 304 62 '#2b393b'
$canvas.Save((Join-Path $out 'camp.png'),[Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$canvas.Dispose();$fonts.Dispose()

# Import the source resource sprites unchanged, on a consistent 64px cell.
$mapping=[ordered]@{GemRed='r-iron.png';GemGreen='r-uranium.png';GemBlue='r-silver.png';GemYellow='r-gold.png';GemPurple='r-cole.png'}
foreach($pair in $mapping.GetEnumerator()){
  Copy-Item -LiteralPath (Join-Path $root "tiles/$($pair.Value)") -Destination (Join-Path $out "$($pair.Key).png") -Force
}
# CC0 derivative: warm copper tint on a metal-nugget sprite; alpha is retained.
$copper=[Drawing.Bitmap]::new((Join-Path $out 'GemRed.png'))
for($y=0;$y -lt 64;$y++){for($x=0;$x -lt 64;$x++){
  $c=$copper.GetPixel($x,$y);if($c.A -eq 0){continue};$l=($c.R+$c.G+$c.B)/3
  $copper.SetPixel($x,$y,[Drawing.Color]::FromArgb($c.A,[int][Math]::Min(255,$l*1.1+35),[int][Math]::Min(255,$l*0.55+20),[int][Math]::Min(255,$l*0.27+10)))
}}
$copper.Save((Join-Path $out 'copper-temp.png'),[Drawing.Imaging.ImageFormat]::Png);$copper.Dispose();Move-Item -LiteralPath (Join-Path $out 'copper-temp.png') -Destination (Join-Path $out 'GemRed.png') -Force
Copy-Item -LiteralPath (Join-Path $root 'particle/p_earth.png') -Destination (Join-Path $out 'dust.png') -Force

$treasures=[ordered]@{RelicRing='tiles/r-artefact_ring.png';RelicIdol='tiles/r-artefact_g4.png';RelicFossil='tiles/r-artefact_bone1.png';BoostFuel='item/item_energydrink.png';BoostDynamite='item/item_dynamite0.png';BoostDrill='item/item_drill.png'}
foreach($pair in $treasures.GetEnumerator()){
  $source=Asset $pair.Value
  $b=[Drawing.Bitmap]::new(64,64);$bg=[Drawing.Graphics]::FromImage($b)
  $bg.Clear([Drawing.Color]::Transparent);$bg.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$bg.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
  $scale=[Math]::Min(58/$source.Width,58/$source.Height);$w=[int]($source.Width*$scale);$h=[int]($source.Height*$scale)
  $bg.DrawImage($source,[Drawing.Rectangle]::new([int]((64-$w)/2),[int]((64-$h)/2),$w,$h))
  $b.Save((Join-Path $out "$($pair.Key).png"),[Drawing.Imaging.ImageFormat]::Png);$bg.Dispose();$b.Dispose()
}

foreach($muted in @(0,1)){
  $b=[Drawing.Bitmap]::new(64,64);$sg=[Drawing.Graphics]::FromImage($b);$sg.Clear([Drawing.Color]::FromArgb(23,32,34))
  $sg.FillRectangle([Drawing.Brushes]::DarkSlateGray,2,2,60,3)
  $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#edc271'))
  $sg.FillRectangle($brush,13,26,12,15)
  $sg.FillPolygon($brush,[Drawing.Point[]]@([Drawing.Point]::new(24,26),[Drawing.Point]::new(36,16),[Drawing.Point]::new(36,50),[Drawing.Point]::new(24,41)))
  $pen=[Drawing.Pen]::new($brush,3);$sg.DrawArc($pen,29,19,23,29,-65,130)
  if($muted){$mute=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#ff9e7c'),5);$sg.DrawLine($mute,12,52,52,12);$mute.Dispose()}
  $b.Save((Join-Path $out "sound-$muted.png"),[Drawing.Imaging.ImageFormat]::Png);$pen.Dispose();$brush.Dispose();$sg.Dispose();$b.Dispose()
}

# Extract the CC0 drilling vehicle from gearshocky's supplied concept sheet.
$sheet=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot '../assets/source/drill-game.png'))
$drill=$sheet.Clone([Drawing.Rectangle]::new(48,25,32,63),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$base=$sheet.GetPixel(20,20)
for($y=0;$y -lt $drill.Height;$y++){for($x=0;$x -lt $drill.Width;$x++){
  $c=$drill.GetPixel($x,$y)
  if(([Math]::Abs($c.R-$base.R)+[Math]::Abs($c.G-$base.G)+[Math]::Abs($c.B-$base.B) -lt 32) -or ($c.R -eq 128 -and $c.G -eq 73 -and $c.B -eq 58)){$drill.SetPixel($x,$y,[Drawing.Color]::Transparent)}
}}
$drill.RotateFlip([Drawing.RotateFlipType]::Rotate270FlipNone)
$drill.Save((Join-Path $out 'drill.png'),[Drawing.Imaging.ImageFormat]::Png);$drill.Dispose();$sheet.Dispose()

# Small functional selection brackets and a gauge pointer, not decoration.
$marker=[Drawing.Bitmap]::new(64,64);$mg=[Drawing.Graphics]::FromImage($marker);$mg.Clear([Drawing.Color]::Transparent)
$pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#fff2a4'),3)
foreach($p in @(@(2,2),@(61,2),@(2,61),@(61,61))){$sx=if($p[0] -lt 32){1}else{-1};$sy=if($p[1] -lt 32){1}else{-1};$mg.DrawLine($pen,$p[0],$p[1],$p[0]+$sx*12,$p[1]);$mg.DrawLine($pen,$p[0],$p[1],$p[0],$p[1]+$sy*12)}
$marker.Save((Join-Path $out 'selection.png'),[Drawing.Imaging.ImageFormat]::Png);$pen.Dispose();$mg.Dispose();$marker.Dispose()
$needle=[Drawing.Bitmap]::new(76,8);$ng=[Drawing.Graphics]::FromImage($needle);$ng.Clear([Drawing.Color]::Transparent);$ng.FillRectangle([Drawing.Brushes]::Coral,0,2,72,4);$ng.FillRectangle([Drawing.Brushes]::MistyRose,59,1,14,2)
$needle.Save((Join-Path $out 'needle.png'),[Drawing.Imaging.ImageFormat]::Png);$ng.Dispose();$needle.Dispose()
$fill=[Drawing.Bitmap]::new(4,4);$fg=[Drawing.Graphics]::FromImage($fill);$fg.Clear([Drawing.ColorTranslator]::FromHtml('#edc271'));$fill.Save((Join-Path $out 'goal.png'));$fg.Dispose();$fill.Dispose()
$scan=[Drawing.Bitmap]::new(64,64);$sg=[Drawing.Graphics]::FromImage($scan);$sg.Clear([Drawing.Color]::Transparent)
$sb=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#ffc15f'));$sg.FillRectangle($sb,50,3,10,10);$sg.FillRectangle([Drawing.Brushes]::DarkSlateGray,53,6,4,4)
$scan.Save((Join-Path $out 'scan.png'));$sb.Dispose();$sg.Dispose();$scan.Dispose()
$images.Values|ForEach-Object{$_.Dispose()}
Write-Output "Pixel mine assets: $out"
