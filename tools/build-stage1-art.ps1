$ErrorActionPreference='Stop'
# Stage 1 art: every ore as one frame sheet, special badges, field tiles,
# explosion frames, a pulse ring, and a backdrop that leaves the field to the
# runtime: the ladder and the shaft keep to their own columns, the ship has a
# tunnel under the field. Sources are the CC0 mining set (see docs/art-bible/assets.md).
Add-Type -AssemblyName System.Drawing
$root=Join-Path $PSScriptRoot '../assets/source/Mining-CC0'
$out=Join-Path $PSScriptRoot '../assets/generated/pixel-mine'
New-Item -ItemType Directory -Force $out | Out-Null
function Load([string]$name){ [Drawing.Bitmap]::new((Join-Path $root $name)) }
function NewCanvas($w,$h){ $b=[Drawing.Bitmap]::new($w,$h); $g=[Drawing.Graphics]::FromImage($b); $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half; $g.Clear([Drawing.Color]::Transparent); return @($b,$g) }
function Save($b,$g,$file){ $b.Save((Join-Path $out $file),[Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $b.Dispose() }
# Source tiles are 66 px with a transparent 1 px margin: take the 64 px inside.
function Tile64([string]$name){
  $src=Load $name; $c=NewCanvas 64 64
  $off=[int](($src.Width-64)/2)
  $c[1].DrawImage($src,[Drawing.Rectangle]::new(0,0,64,64),[Drawing.Rectangle]::new($off,$off,[Math]::Min(64,$src.Width),[Math]::Min(64,$src.Height)),[Drawing.GraphicsUnit]::Pixel)
  $src.Dispose(); return $c
}
function Fit([string]$name,[int]$size){
  $src=Load $name; $c=NewCanvas 64 64
  $scale=[Math]::Min($size/$src.Width,$size/$src.Height); $w=[int]($src.Width*$scale); $h=[int]($src.Height*$scale)
  $c[1].DrawImage($src,[Drawing.Rectangle]::new([int]((64-$w)/2),[int]((64-$h)/2),$w,$h)); $src.Dispose(); return $c
}

# --- ores, in the order of ORES in scripts/pixel-mine/config.js.
# 7Soul1's CC0 gem and mineral icons (32 px, one artist), drawn at exactly 2x.
# Ores the set lacks are hue-shifted copies (CC0 allows it): hue in degrees, '' keeps colours.
$soul=Join-Path $PSScriptRoot '../assets/source/7soul1'
$oreSources=@(
  @('32x32/coal.png',''), @('I_BronzeBar.png','26'), @('32x32/rock_mineral_red_02.png',''), @('I_GoldBar.png',''),
  @('32x32/jade.png','84'), @('I_SilverBar.png',''), @('32x32/rock_mineral_blue_02.png',''), @('32x32/agate.png','140'),
  @('32x32/crystal_02.png',''), @('32x32/crystal_03.png',''), @('32x32/crystal_01.png',''), @('32x32/ruby.png','38'),
  @('32x32/ruby.png',''), @('32x32/diamond.png',''), @('32x32/amethist.png',''), @('32x32/sapphire.png','140'))
function HslToRgb($h,$s,$l){
  if($s -eq 0){$v=[int]($l*255);return @($v,$v,$v)}
  $q=if($l -lt 0.5){$l*(1+$s)}else{$l+$s-$l*$s}; $p=2*$l-$q
  $hh=$h/360; $parts=@(($hh+1/3), $hh, ($hh-1/3))
  $out=@(); foreach($t0 in $parts){ $t=$t0; if($t -lt 0){$t+=1}; if($t -gt 1){$t-=1}
    $v=if($t -lt 1/6){$p+($q-$p)*6*$t}elseif($t -lt 1/2){$q}elseif($t -lt 2/3){$p+($q-$p)*(2/3-$t)*6}else{$p}; $out+=[int][Math]::Round($v*255) }
  return $out
}
for($i=0;$i -lt $oreSources.Count;$i++){
  $src=[Drawing.Bitmap]::new((Join-Path $soul $oreSources[$i][0])); $c=NewCanvas 64 64
  # Integer 2x scale, centred; 34 px bar icons lose one transparent pixel per side.
  $c[1].DrawImage($src,[Drawing.Rectangle]::new([int](32-$src.Width),[int](32-$src.Height),$src.Width*2,$src.Height*2)); $src.Dispose()
  if($oreSources[$i][1] -ne ''){
    $hue=[double]$oreSources[$i][1]; $b=$c[0]
    for($y=0;$y -lt 64;$y++){for($x=0;$x -lt 64;$x++){$p=$b.GetPixel($x,$y);if($p.A -eq 0){continue}
      # Grey sources (the bronze bar) need colour put in, not just turned.
      $sat=[Math]::Min(1,[Math]::Max(0.6,$p.GetSaturation()*1.15)); $light=$p.GetBrightness(); $rgb=HslToRgb $hue $sat $light
      $b.SetPixel($x,$y,[Drawing.Color]::FromArgb($p.A,$rgb[0],$rgb[1],$rgb[2]))}}
  }
  Save $c[0] $c[1] ("ore-{0:d2}.png" -f $i)
}
$ores=$oreSources
# The diamond drill: the white diamond on a warm glow, so it reads as "special" and as no ore.
$c=NewCanvas 64 64; $g=$c[1]
foreach($r in @(30,24,18)){ $a=if($r -eq 30){40}elseif($r -eq 24){70}else{110}; $br=[Drawing.SolidBrush]::new([Drawing.Color]::FromArgb($a,255,226,140)); $g.FillEllipse($br,32-$r,32-$r,$r*2,$r*2); $br.Dispose() }
$d=Load 'item/item_diamond.png'; $g.DrawImage($d,[Drawing.Rectangle]::new(8,8,48,48)); $d.Dispose()
Save $c[0] $c[1] ("ore-{0:d2}.png" -f $ores.Count)

# --- special badges: arrows across the cell for rockets, a charge in the corner
function Arrow($g,$horizontal){
  $ink=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#fff2a4')); $edge=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#3a2a12'))
  if($horizontal){
    $g.FillRectangle($edge,4,27,56,10); $g.FillRectangle($ink,6,29,52,6)
    $g.FillPolygon($edge,[Drawing.Point[]]@([Drawing.Point]::new(0,32),[Drawing.Point]::new(12,20),[Drawing.Point]::new(12,44))); $g.FillPolygon($ink,[Drawing.Point[]]@([Drawing.Point]::new(3,32),[Drawing.Point]::new(11,24),[Drawing.Point]::new(11,40)))
    $g.FillPolygon($edge,[Drawing.Point[]]@([Drawing.Point]::new(64,32),[Drawing.Point]::new(52,20),[Drawing.Point]::new(52,44))); $g.FillPolygon($ink,[Drawing.Point[]]@([Drawing.Point]::new(61,32),[Drawing.Point]::new(53,24),[Drawing.Point]::new(53,40)))
  } else {
    $g.FillRectangle($edge,27,4,10,56); $g.FillRectangle($ink,29,6,6,52)
    $g.FillPolygon($edge,[Drawing.Point[]]@([Drawing.Point]::new(32,0),[Drawing.Point]::new(20,12),[Drawing.Point]::new(44,12))); $g.FillPolygon($ink,[Drawing.Point[]]@([Drawing.Point]::new(32,3),[Drawing.Point]::new(24,11),[Drawing.Point]::new(40,11)))
    $g.FillPolygon($edge,[Drawing.Point[]]@([Drawing.Point]::new(32,64),[Drawing.Point]::new(20,52),[Drawing.Point]::new(44,52))); $g.FillPolygon($ink,[Drawing.Point[]]@([Drawing.Point]::new(32,61),[Drawing.Point]::new(24,53),[Drawing.Point]::new(40,53)))
  }
  $ink.Dispose(); $edge.Dispose()
}
$c=NewCanvas 64 64; Arrow $c[1] $true; Save $c[0] $c[1] 'special-0.png'
$c=NewCanvas 64 64; Arrow $c[1] $false; Save $c[0] $c[1] 'special-1.png'
$c=NewCanvas 64 64; $g=$c[1]
$ring=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#ffb347'),3); $g.DrawRectangle($ring,3,3,57,57); $ring.Dispose()
$c4=Load 'item/item_c4.png'; $g.DrawImage($c4,[Drawing.Rectangle]::new(34,34,28,28)); $c4.Dispose()
Save $c[0] $c[1] 'special-2.png'

# --- field tiles: the rock behind the ore, darker than the earth around it
foreach($k in @(0,1)){
  $c=Tile64 ($(if($k -eq 0){'tiles/pxy-earth_4.png'}else{'tiles/pxy-earth_5.png'})); $b=$c[0]; $g=$c[1]
  $shade=[Drawing.SolidBrush]::new([Drawing.Color]::FromArgb($(if($k -eq 0){120}else{150}),14,16,18)); $g.FillRectangle($shade,0,0,64,64); $shade.Dispose()
  $line=[Drawing.Pen]::new([Drawing.Color]::FromArgb(110,0,0,0),1); $g.DrawRectangle($line,0,0,63,63); $line.Dispose()
  Save $b $g "tile-$k.png"
}

# --- explosion frames and the pulse ring, scaled to 64 px
for($i=0;$i -lt 10;$i++){ $c=Fit "particle/r-p_exp$i.png" 64; Save $c[0] $c[1] "blast-$i.png" }
$c=Fit 'particle/r-p_ring.png' 64; Save $c[0] $c[1] 'ring.png'

# --- the backdrop
$canvas=[Drawing.Bitmap]::new(720,1280); $g=[Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
$g.Clear([Drawing.Color]::FromArgb(30,24,23))
function Rect($x,$y,$w,$h,$hex){$b=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($hex));$g.FillRectangle($b,$x,$y,$w,$h);$b.Dispose()}
function Blit($name,$x,$y,$w,$h){$s=Load $name;$g.DrawImage($s,[Drawing.Rectangle]::new($x,$y,$w,$h));$s.Dispose()}
function BlitTile($name,$x,$y,$w,$h){$s=Load $name;$g.DrawImage($s,[Drawing.Rectangle]::new($x,$y,$w,$h),[Drawing.Rectangle]::new(1,1,64,64),[Drawing.GraphicsUnit]::Pixel);$s.Dispose()}
function Bevel($x,$y,$w,$h,$fill){ Rect $x $y $w $h '#111719'; Rect ($x+3) ($y+3) ($w-6) ($h-6) '#69736e'; Rect ($x+6) ($y+7) ($w-12) ($h-14) $fill; Rect ($x+6) ($y+$h-8) ($w-12) 3 '#10181b' }

Blit 'background/background.png' 0 108 720 166
Blit 'background/lb-px-background_hill1.png' 0 132 720 168
Blit 'background/lb-px-background_forest1.png' 350 130 530 148
Blit 'home/lb-r-home.png' 62 140 160 112
for($row=0;$row -lt 12;$row++){ for($col=0;$col -lt 12;$col++){ $depth=[Math]::Min(9,[Math]::Floor($row*10/12)); BlitTile "tiles/pxy-earth_$depth.png" ($col*64-24) (264+$row*64) 64 64 } }
for($col=0;$col -lt 12;$col++){ BlitTile 'tiles/pxy-surface_1.png' ($col*64-24) 240 64 64 }

# Ladder column (left) and shaft column (right): each keeps to its 44 px.
foreach($x0 in @(16,660)){ Rect $x0 264 44 724 '#14181b'; Rect $x0 264 3 724 '#4b372b'; Rect ($x0+41) 264 3 724 '#4b372b' }
for($y=270;$y -lt 980;$y+=40){ Rect 22 $y 32 4 '#8a6a44'; Rect 22 ($y+4) 32 2 '#4b372b' }
Rect 22 264 4 724 '#74533a'; Rect 50 264 4 724 '#74533a'
# Shaft: two guide rails and the cable; the cage itself is a runtime sprite later.
Rect 668 264 3 724 '#6f7a76'; Rect 689 264 3 724 '#6f7a76'; Rect 680 264 2 724 '#2c3134'
for($y=300;$y -lt 980;$y+=96){ Rect 662 $y 40 5 '#4b372b' }
# A small cage parked at the top, inside its column.
# The cage is a runtime sprite (Cage) that rides the shaft; nothing is baked here.

# Tunnel under the field, where the ship drives.
Rect 64 896 592 88 '#151a1c'; Rect 64 896 592 6 '#553e2b'; Rect 64 978 592 6 '#2a2016'
foreach($x in @(64,252,452,650)){ Rect $x 896 6 88 '#72513a' }
foreach($x in @(150,360,560)){ $lamp=Load 'tiles/pxy-tile_lamp_1.png'; $g.DrawImage($lamp,[Drawing.Rectangle]::new($x-12,898,24,24),[Drawing.Rectangle]::new(1,1,64,64),[Drawing.GraphicsUnit]::Pixel); $lamp.Dispose() }

# Screen rails, top bar and cockpit.
foreach($x in @(0,704)){Rect $x 106 16 894 '#111719';Rect ($x+3) 106 5 894 '#707970';Rect ($x+9) 106 4 894 '#252f32'}
Bevel 0 0 720 112 '#293337'
Rect 22 20 302 72 '#172022'; Rect 345 20 353 72 '#10181b'
for($i=0;$i -lt 12;$i++){Rect (22+$i*58) 101 26 5 '#c6994f'}
$fonts=[Drawing.Text.PrivateFontCollection]::new(); $fonts.AddFontFile((Join-Path $PSScriptRoot '../assets/source/GolosText.ttf'))
$font=[Drawing.Font]::new($fonts.Families[0],34,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel); $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#edc271'))
$fmt=[Drawing.StringFormat]::new(); $fmt.Alignment=[Drawing.StringAlignment]::Center; $fmt.LineAlignment=[Drawing.StringAlignment]::Center
$g.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
# The header boxes stay empty: the page cockpit writes the score and the buttons there.
$small=[Drawing.Font]::new($fonts.Families[0],10,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel); Rect 128 195 32 13 '#493322'; $g.DrawString((-join [char[]](0x0411,0x0410,0x0417,0x0410)),$small,[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#f7d98b')),[Drawing.RectangleF]::new(124,193,40,18),$fmt)
Rect 104 299 512 12 '#171f21'
Bevel 0 992 720 288 '#263034'
Rect 17 1010 686 5 '#b98b48'
$pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#11191c'),14);$g.DrawEllipse($pen,43,1064,180,180);$pen.Dispose()
$pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#8a8a72'),3);$g.DrawEllipse($pen,43,1064,180,180);$pen.Dispose()
for($i=0;$i -le 10;$i++){ $a=(-144+$i*10.8)*[Math]::PI/180; $color=if($i -le 2){'#c26b4c'}else{'#b8c2ad'}; $pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml($color),3); $g.DrawLine($pen,[single](133+[Math]::Cos($a)*71),[single](1154+[Math]::Sin($a)*71),[single](133+[Math]::Cos($a)*83),[single](1154+[Math]::Sin($a)*83));$pen.Dispose() }
# The hold slots, then a recess for the ability buttons.
foreach($x in @(306,422,538)){Bevel $x 1060 64 64 '#172022'}
Bevel 286 1146 382 86 '#172022'
foreach($xy in @(@(13,13),@(693,13),@(13,1005),@(693,1005),@(13,1256),@(693,1256))){Rect $xy[0] $xy[1] 10 10 '#a2a38a';Rect ($xy[0]+4) ($xy[1]+1) 2 8 '#3b403b'}
$canvas.Save((Join-Path $out 'backdrop.png'),[Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $canvas.Dispose(); $font.Dispose(); $small.Dispose(); $brush.Dispose(); $fonts.Dispose()

# --- the lift cage (acdrnx lift tile) and a miner (Kenney Pixel Platformer, CC0) in two climbing frames
$c=Tile64 'tiles/pxy-tile_lift_a0.png'; Save $c[0] $c[1] 'cage.png'
$kenney=Join-Path $PSScriptRoot '../assets/source/kenney-pixel-platformer/Tiles/Characters'
for($k=0;$k -lt 2;$k++){
  $src=[Drawing.Bitmap]::new((Join-Path $kenney ("tile_000{0}.png" -f $k))); $c=NewCanvas 48 48
  $c[1].DrawImage($src,[Drawing.Rectangle]::new(0,0,48,48)); $src.Dispose(); Save $c[0] $c[1] "miner-$k.png"
}

# --- building icons for the base screen (project files, 48 px)
$icons=[ordered]@{ storage='item/item_chest.png'; smelter='item/item_gold.png'; autodrill='item/item_drill.png'; generator='item/item_teleporter.png'; quarters='item/item_sleepingbag.png'; lift='item/item_lifta.png'; lab='item/item_altimeter.png'; museum='tiles/r-artefact_g4.png'; dock='DRILL'; lantern='item/lamp_small.png'; cart='item/item_blockgroup.png'; rails='tiles/r-px-tile_bridge.png'; statue='tiles/r-artefact_g2.png' }
foreach($pair in $icons.GetEnumerator()){
  if($pair.Value -eq 'DRILL'){ $src=[Drawing.Bitmap]::new((Join-Path $out 'drill.png')) } else { $src=Load $pair.Value }
  $c=NewCanvas 48 48; $scale=[Math]::Min(44/$src.Width,44/$src.Height); $w=[int]($src.Width*$scale); $h=[int]($src.Height*$scale)
  $c[1].DrawImage($src,[Drawing.Rectangle]::new([int]((48-$w)/2),[int]((48-$h)/2),$w,$h)); $src.Dispose()
  $c[0].Save((Join-Path $out ("b-" + $pair.Key + ".png")),[Drawing.Imaging.ImageFormat]::Png); $c[1].Dispose(); $c[0].Dispose()
}
Write-Output "Stage 1 art: $out"
