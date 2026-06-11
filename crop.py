from PIL import Image, ImageChops

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

im = Image.open('public/logo.png')
im = im.convert("RGBA")
print("Original size:", im.size)

cropped = trim(im)
print("Cropped size:", cropped.size)

# If it's a square aspect ratio we want it to be a square for the favicon so it's not squished.
# Let's add transparent padding to make it a square.
w, h = cropped.size
size = max(w, h)
square = Image.new('RGBA', (size, size), (255, 255, 255, 0))
square.paste(cropped, ((size - w) // 2, (size - h) // 2))

square.save('public/favicon.png')
print("Favicon saved.")

