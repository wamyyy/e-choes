import os
from PIL import Image
import numpy as np
from collections import defaultdict

files = sorted([f for f in os.listdir('images') if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])

# Let's inspect features of each image
info_list = []
for f in files:
    path = os.path.join('images', f)
    with Image.open(path) as img:
        img_rgb = img.convert('RGB')
        w, h = img_rgb.size
        
        # sample colors
        small = img_rgb.resize((64, 64))
        arr = np.array(small)
        
        # background color (edges)
        top_edge = arr[0, :, :].mean(axis=0)
        
        # shoe pixels (center region or non-bg)
        center = arr[16:48, 16:48]
        
        # Color channels
        r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
        
        # Redness
        is_red = (r > 120) & (g < 70) & (b < 70)
        # Greenness (dark green vs light green)
        is_dark_green = (g > 50) & (g < 130) & (r < 70) & (b < 70)
        is_light_green = (g > 100) & (r < 120) & (b < 120)
        # Blue
        is_blue = (b > 110) & (r < 90) & (g < 120)
        is_baby_blue = (b > 140) & (g > 120) & (r < 140)
        # Black
        is_black = (r < 50) & (g < 50) & (b < 50)
        # Gum / brown sole
        is_gum = (r > 110) & (r < 180) & (g > 70) & (g < 130) & (b > 30) & (b < 80)
        # Grey suede
        is_grey = (np.abs(r.astype(int) - g.astype(int)) < 15) & (np.abs(r.astype(int) - b.astype(int)) < 15) & (r > 100) & (r < 180)

        info_list.append({
            'file': f,
            'w': w, 'h': h,
            'red': int(is_red.sum()),
            'dgreen': int(is_dark_green.sum()),
            'lgreen': int(is_light_green.sum()),
            'blue': int(is_blue.sum()),
            'bblue': int(is_baby_blue.sum()),
            'black': int(is_black.sum()),
            'gum': int(is_gum.sum()),
            'grey': int(is_grey.sum()),
            'mean_r': float(r.mean()),
            'mean_g': float(g.mean()),
            'mean_b': float(b.mean())
        })

for item in info_list:
    print(f"{item['file']}: red={item['red']} dgr={item['dgreen']} lgr={item['lgreen']} bl={item['blue']} bbl={item['bblue']} blk={item['black']} gum={item['gum']} gry={item['grey']} (mean RGB: {item['mean_r']:.0f},{item['mean_g']:.0f},{item['mean_b']:.0f})")
