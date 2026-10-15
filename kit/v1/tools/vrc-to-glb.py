# tweetpad agent kit v1: a VRChat avatar (.unitypackage, .fbx or .glb) as a GLB for /kit/v1/avatar.js.
# Runs inside Blender (4.x), headless:
#   blender -b --factory-startup -P vrc-to-glb.py -- <input> <output.glb> [--tex 512] [--alpha] [--map "Material=texture.png"]...
# What it does:
#   - a .unitypackage is unpacked into a temporary folder (paths are kept inside it), and its largest .fbx is the avatar;
#   - only the expressions avatar.js uses are kept (blink, the aa / oh / ih visemes, smile, surprised), since every shape key
#     stores its own copy of the vertices that move;
#   - each material gets its texture: one the FBX already links, else --map, else a texture whose file name shares a word with
#     the material's name, else the package's only texture; textures are scaled down to --tex pixels (512 by default) and saved
#     as JPEG; with --alpha, textures with see-through pixels stay PNG (for cut-out hair or lace; texture atlases often have
#     transparent padding that doesn't need it);
#   - the result is exported as a GLB with its skin and shape keys, and no animations.
# Then shrink it for embedding with gltfpack (see SKILL.md, "Bring a VRChat avatar").
import bpy, sys, os, re, tarfile, tempfile, shutil

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) < 2:
    print('usage: blender -b --factory-startup -P vrc-to-glb.py -- <input .unitypackage|.fbx|.glb> <output.glb> [--tex 512] [--map "Material=texture.png"]')
    sys.exit(1)
src, out = os.path.abspath(args[0]), os.path.abspath(args[1])
tex_size = int(args[args.index('--tex') + 1]) if '--tex' in args else 512
use_alpha = '--alpha' in args
maps = dict(a.split('=', 1) for i, a in enumerate(args) if i > 0 and args[i - 1] == '--map')

KEEP = [r'^(vrc\.)?blink(_left|_right)?$', r'^blink', r'[._]blink(_left|_right)?$', r'(^|[._])v[._]?(aa|oh|ih|ee|ou)$', r'^まばたき$', r'^ウィンク', r'^vrc\.v_(aa|oh|ih)$', r'^(v_)?(aa?|oh?|ih?)$', r'^[あいお]$',
        r'^smile$', r'^笑い$', r'surpris', r'^びっくり$',
        r'^(ah|there|your|cormorant)$', r'^a laugh$']   # MMD's あいおう and 笑い, as machine translation names them
TEX_EXT = ('.png', '.jpg', '.jpeg', '.tga', '.bmp', '.tif', '.tiff')

work = tempfile.mkdtemp(prefix='vrc-to-glb-')
textures = []

# ---------- unpack a .unitypackage: each entry is a folder holding `asset` and `pathname` ----------
if src.lower().endswith('.unitypackage'):
    raw = os.path.join(work, 'raw')
    with tarfile.open(src, 'r:gz') as tar:
        for m in tar.getmembers():   # only plain files, only inside raw/
            target = os.path.realpath(os.path.join(raw, m.name))
            if not m.isfile() or not target.startswith(os.path.realpath(raw) + os.sep):
                continue
            tar.extract(m, raw)
    files = os.path.join(work, 'files')
    for entry in os.listdir(raw):
        pn, asset = os.path.join(raw, entry, 'pathname'), os.path.join(raw, entry, 'asset')
        if not (os.path.isfile(pn) and os.path.isfile(asset)):
            continue
        rel = open(pn, encoding='utf-8', errors='replace').read().splitlines()[0].strip()
        dest = os.path.realpath(os.path.join(files, rel))
        if not dest.startswith(os.path.realpath(files) + os.sep):
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(asset, dest)
    found = [os.path.join(d, f) for d, _, fs in os.walk(files) for f in fs]
    fbx = [f for f in found if f.lower().endswith('.fbx')]
    if not fbx:
        print('no .fbx in the package'); sys.exit(1)
    src = max(fbx, key=os.path.getsize)
    textures = [f for f in found if f.lower().endswith(TEX_EXT)]
    print('AVATAR', os.path.relpath(src, files), '·', len(textures), 'textures')
else:
    folder = os.path.dirname(src)
    textures = [os.path.join(d, f) for d, _, fs in os.walk(folder) for f in fs if f.lower().endswith(TEX_EXT)]

# ---------- import ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
if src.lower().endswith('.fbx'):
    bpy.ops.import_scene.fbx(filepath=src)
else:
    bpy.ops.import_scene.gltf(filepath=src)

# ---------- expressions: keep what avatar.js uses ----------
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    sk = o.data.shape_keys
    if not sk:
        continue
    bpy.context.view_layer.objects.active = o
    names = [k.name for k in sk.key_blocks]
    for k in list(sk.key_blocks)[::-1]:
        if k.name != sk.reference_key.name and not any(re.search(p, k.name, re.I) for p in KEEP):
            o.shape_key_remove(k)
    kept = [k.name for k in o.data.shape_keys.key_blocks][1:] if o.data.shape_keys else []
    print('SHAPEKEYS', o.name, f'{len(kept)} of {len(names) - 1} kept:', ', '.join(kept))

# ---------- textures ----------
words = lambda s: set(w for w in re.split(r'[^a-z0-9]+', s.lower()) if len(w) > 2)
NOT_COLOUR = re.compile(r'normal|nrm|_n\b|bump|height|rough|metal|spec|gloss|ambient|occlusion|_ao\b|mask|emiss|_orm|_rma|opacity', re.I)
COLOUR = re.compile(r'albedo|base_?colou?r|diffuse|_d\b|_col\b|colou?r|_c\b', re.I)
def pick_texture(mat):
    if mat.name in maps:
        hit = [t for t in textures if os.path.basename(t) == maps[mat.name] or t.endswith(maps[mat.name])]
        if hit: return hit[0]
    stem = lambda t: os.path.splitext(os.path.basename(t))[0]
    named = [t for t in textures if words(mat.name) & words(stem(t)) and not NOT_COLOUR.search(stem(t))]
    named.sort(key=lambda t: not COLOUR.search(stem(t)))   # albedo / base colour / diffuse first
    if named: return named[0]
    colour = [t for t in textures if not NOT_COLOUR.search(stem(t))]
    return colour[0] if len(colour) == 1 else None

scene = bpy.context.scene
def shrink(img):
    """scale down to tex_size and re-save: JPEG at quality 72, or PNG (with --alpha) when any pixel is see-through"""
    w, h = img.size
    if max(w, h) <= 128:   # pixel art (a Minecraft skin): keep it lossless and unscaled
        path = os.path.join(work, re.sub(r'[^\w.-]', '_', img.name) + '.png')
        settings = scene.render.image_settings; settings.file_format, settings.color_mode = 'PNG', 'RGBA'
        img.save_render(path, scene=scene)
        return bpy.data.images.load(path), True
    if max(w, h) > tex_size:
        img.scale(max(1, w * tex_size // max(w, h)), max(1, h * tex_size // max(w, h)))
    alpha = False
    if use_alpha and img.channels == 4:
        import numpy as np
        px = np.empty(len(img.pixels), dtype=np.float32); img.pixels.foreach_get(px)
        alpha = bool((px[3::4] < 0.99).any())
    settings = scene.render.image_settings
    settings.file_format, settings.color_mode = ('PNG', 'RGBA') if alpha else ('JPEG', 'RGB')
    settings.quality, settings.compression = 72, 90
    path = os.path.join(work, re.sub(r'[^\w.-]', '_', img.name) + ('.png' if alpha else '.jpg'))
    img.save_render(path, scene=scene)
    small = bpy.data.images.load(path)
    return small, alpha

done = {}
for mat in bpy.data.materials:
    if not mat.use_nodes:
        mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        continue
    linked = next((l.from_node for l in links if l.to_node == bsdf and l.to_socket.name == 'Base Color' and l.from_node.type == 'TEX_IMAGE'), None)
    img = linked.image if linked and linked.image and linked.image.has_data else None
    if not img:
        path = pick_texture(mat)
        if not path:
            print('TEXTURE', mat.name, '-> none found (use --map "%s=<file>")' % mat.name); continue
        img = bpy.data.images.load(path)
    if img.name not in done:
        done[img.name] = shrink(img)
    small, alpha = done[img.name]
    node = linked or nodes.new('ShaderNodeTexImage')
    node.image = small
    links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
    if alpha:
        links.new(node.outputs['Alpha'], bsdf.inputs['Alpha'])
        if hasattr(mat, 'blend_method'): mat.blend_method = 'CLIP'
    else:   # opaque: Unity often keeps gloss in a texture's alpha, and FBX can carry that over as see-through
        for l in [l for l in links if l.to_node == bsdf and l.to_socket.name == 'Alpha']: links.remove(l)
        bsdf.inputs['Alpha'].default_value = 1.0
        if hasattr(mat, 'blend_method'): mat.blend_method = 'OPAQUE'
    bsdf.inputs['Roughness'].default_value = 0.7
    print('TEXTURE', mat.name, '->', small.name, small.size[0], 'px', 'PNG' if alpha else 'JPEG')

# ---------- the rig, as avatar.js will see it ----------
for o in bpy.data.objects:
    if o.type == 'ARMATURE':
        print('BONES', len(o.data.bones), ':', ', '.join(b.name for b in o.data.bones))

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_animations=False,
                          export_yup=True, export_image_format='AUTO', export_apply=False)
print('WROTE', out, os.path.getsize(out), 'bytes')
shutil.rmtree(work, ignore_errors=True)
