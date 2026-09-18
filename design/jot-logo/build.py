from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from html import escape
ROOT=Path(__file__).resolve().parent
INK='#272925';ORANGE='#D97945';PAPER='#F7F5EF';WHITE='#FFFFFF';MUTED='#777A70';LINE='#E5E4DC'
GLYPHS={
'j':['....##','....##','......','....##','....##','##..##','######','.####.'],
'o':['......','......','.####.','##..##','##..##','##..##','##..##','.####.'],
't':['..##..','..##..','######','######','..##..','..##..','..####','...###']}
def cells(word, body=INK, accent=ORANGE):
 out=[]
 for i,letter in enumerate(word):
  for y,row in enumerate(GLYPHS[letter]):
   for x,v in enumerate(row):
    if v=='#':out.append((i*8+x,y,accent if letter=='j' and y<2 else body))
 return out

def svg(word, body=INK, accent=ORANGE):
 # 8-unit grid per character; standalone j has one unit of sidebearing each side.
 width=8 if word=='j' else len(word)*8-2
 offset=1 if word=='j' else 0
 rects=''.join(f'<rect x="{(x+offset)*2}" y="{y*2}" width="2" height="2" fill="{color}"/>' for x,y,color in cells(word,body,accent))
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width*2} 16" role="img" aria-label="Jot" shape-rendering="crispEdges"><title>Jot</title>{rects}</svg>\n'
for name,word,body,accent in [('jot-mark','j',INK,ORANGE),('jot-wordmark','jot',INK,ORANGE),('jot-mark-mono','j',INK,INK),('jot-wordmark-mono','jot',INK,INK),('jot-mark-dark','j',PAPER,ORANGE),('jot-wordmark-dark','jot',PAPER,ORANGE)]:
 (ROOT/f'{name}.svg').write_text(svg(word,body,accent))

def paint(im,word,x,y,unit,body=INK,accent=ORANGE,center_mark=False):
 d=ImageDraw.Draw(im)
 for a,b,color in cells(word,body,accent):
  a+=1 if center_mark else 0
  d.rectangle((x+a*unit,y+b*unit,x+(a+1)*unit-1,y+(b+1)*unit-1),fill=color)
for size in [16,24,32,48,64,128,256,512]:
 im=Image.new('RGBA',(size,size),(0,0,0,0));paint(im,'j',0,0,size//8,center_mark=True);im.save(ROOT/f'jot-mark-{size}.png')
im=Image.new('RGBA',(704,256),(0,0,0,0));paint(im,'jot',0,0,32);im.save(ROOT/'jot-wordmark.png')
S=2;im=Image.new('RGB',(1440*S,1056*S),PAPER);d=ImageDraw.Draw(im)
regular='/System/Library/Fonts/Supplemental/Arial.ttf';bold='/System/Library/Fonts/Supplemental/Arial Bold.ttf';mono='/System/Library/Fonts/Supplemental/Courier New.ttf'
def text(x,y,value,size=16,color=INK,font=regular):d.text((x*S,y*S),value,font=ImageFont.truetype(font,size*S),fill=color)
def rect(box,fill,outline=None):d.rectangle(tuple(int(v*S) for v in box),fill=fill,outline=outline,width=S)
def draw(word,x,y,u,body=INK,accent=ORANGE,center=False):paint(im,word,x*S,y*S,u*S,body,accent,center)
text(48,38,'JOT / IDENTITY 01',16,MUTED,mono);text(1050,38,'ONE DOT. A SMALL START.',15,MUTED,mono)
rect((48,98,918,660),WHITE,LINE);rect((942,98,1392,660),INK)
text(78,130,'01   PIXEL WORDMARK',13,MUTED,mono)
draw('jot',164,254,28)
text(80,576,'A name you can draw on a grid.',23,INK,bold)
text(80,614,'Three letters. One warm dot. No extra decoration.',16,MUTED)
text(972,130,'02   APP MARK',13,'#B6B9AD',mono)
draw('j',1039,256,32,body=PAPER,center=True)
text(972,596,'The dot stays. The rest gets to work.',15,'#B6B9AD')
rect((48,684,468,986),WHITE,LINE);rect((492,684,912,986),WHITE,LINE);rect((936,684,1392,986),WHITE,LINE)
text(78,714,'03   ONE COLOR',13,MUTED,mono);draw('jot',98,800,13,body=INK,accent=INK)
text(78,943,'Works without the accent.',15,MUTED)
text(522,714,'04   SMALL SIZES',13,MUTED,mono)
for x,size in [(534,16),(610,24),(695,32),(792,64)]:
 draw('j',x,830-size//2,size//8,center=True);text(x,898,str(size)+'px',12,MUTED,mono)
text(522,943,'Pixel-aligned at 16 / 24 / 32 / 64.',14,MUTED)
text(966,714,'05   PALETTE',13,MUTED,mono)
for x,c,label in [(966,INK,'272925'),(1098,ORANGE,'D97945'),(1230,PAPER,'F7F5EF')]:
 rect((x,790,x+100,862),c,LINE if c==PAPER else None);text(x,878,'#'+label,13,MUTED,mono)
text(966,943,'Ink / terracotta / warm paper.',14,MUTED)
text(48,1010,'Jot  /  A chat agent built from choices.',14,MUTED)
text(1080,1010,'VECTOR + PIXEL ASSETS',13,MUTED,mono)
im.save(ROOT/'jot-logo-board.png')
(ROOT/'preview.html').write_text('''<!doctype html><html><head><meta charset="utf-8"><title>Jot / Pixel identity</title><style>body{margin:0;background:#f7f5ef}img{display:block;width:100%;max-width:1440px;height:auto;margin:auto}</style></head><body><img src="jot-logo-board.png" alt="Jot pixel identity design board"></body></html>''')
