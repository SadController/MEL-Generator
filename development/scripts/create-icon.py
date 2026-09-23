from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1]
im = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rounded_rectangle((20,20,1004,1004), radius=250, fill='#0080ff')
for points in [[(512,160),(512,850)],[(175,625),(512,470),(849,625)],[(360,850),(512,745),(664,850)]]:
    d.line(points, fill='white', width=56, joint='curve')
    for x,y in points:
        d.ellipse((x-28,y-28,x+28,y+28), fill='white')
im.resize((256,256),Image.Resampling.LANCZOS).save(root/'ui/icon.png')
im.save(root/'resources/icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
