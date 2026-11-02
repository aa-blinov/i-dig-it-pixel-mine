# Pre-scales the pixel art with nearest neighbour, so the game can sample it
# smoothly on high-density screens: pixels stay square, edges stay clean.
# Sprites x4, full-screen backdrops x2. Run once after the art is rebuilt;
# it skips images that are already scaled. Usage: py tools/upscale-art.py
import json, glob, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIG = {'backdrop', 'campbackdrop'}

for path in sorted(glob.glob(os.path.join(ROOT, 'objectTypes', '*.json'))):
    data = json.load(open(path, encoding='utf-8'))
    anims = (data.get('animations') or {}).get('items') or []
    if not anims: continue
    name = data['name'].lower()
    factor = 2 if name in BIG else 4
    changed = False
    for anim in anims:
        for index, frame in enumerate(anim['frames']):
            image = os.path.join(ROOT, 'images', '%s-%s-%03d.png' % (name, anim['name'].lower(), index))
            if not os.path.exists(image): continue
            img = Image.open(image)
            if img.width != frame['width']: continue  # already scaled
            img.resize((img.width * factor, img.height * factor), Image.NEAREST).save(image)
            frame['width'] *= factor; frame['height'] *= factor
            changed = True
    if changed:
        json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent='\t')
        print('scaled', name, 'x%d' % factor)
