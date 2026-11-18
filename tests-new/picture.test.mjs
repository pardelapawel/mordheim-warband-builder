import {test} from 'node:test';
import assert from 'node:assert/strict';
import {panPictureCrop,pictureCropRect} from '../src/picture.mjs';
import {normalizePicture} from '../src/model.mjs';

test('uploads retain original raster data beyond the old thumbnail limit',()=>{
  for(const type of ['jpeg','png','webp','gif']){
    const picture=`data:image/${type};base64,${'a'.repeat(300000)}`;
    assert.equal(normalizePicture(picture),picture);
  }
});
test('dragging tracks visible pixels at different zoom levels and aspect ratios',()=>{
  assert.deepEqual(panPictureCrop({x:50,y:50,zoom:1},20,20,200,200,400,200),{x:40,y:50,zoom:1});
  assert.deepEqual(panPictureCrop({x:50,y:50,zoom:2},20,-20,200,200,200,200),{x:40,y:60,zoom:2});
  assert.deepEqual(panPictureCrop({x:50,y:50,zoom:1},20,20,200,200,200,400),{x:50,y:40,zoom:1});
});
test('dragging stays within image edges and handles an unloaded preview',()=>{
  assert.deepEqual(panPictureCrop({x:50,y:50,zoom:2},1000,-1000,200,200,200,200),{x:0,y:100,zoom:2});
  assert.deepEqual(panPictureCrop({x:50,y:50,zoom:1},20,20,0,0,0,0),{x:50,y:50,zoom:1});
});
test('the saved crop is the image area visible in the portrait frame',()=>{
  // Square 400px image in a 100x200 frame: cover shows the middle half of its width.
  assert.deepEqual(pictureCropRect({x:50,y:50,zoom:1},100,200,400,400),{sx:100,sy:0,sw:200,sh:400});
  assert.deepEqual(pictureCropRect({x:0,y:50,zoom:1},100,200,400,400),{sx:0,sy:0,sw:200,sh:400});
  assert.deepEqual(pictureCropRect({x:100,y:50,zoom:1},100,200,400,400),{sx:200,sy:0,sw:200,sh:400});
  // Zooming 2x around the centre keeps the centre and halves the visible area.
  assert.deepEqual(pictureCropRect({x:50,y:50,zoom:2},100,200,400,400),{sx:150,sy:100,sw:100,sh:200});
  // Zooming around the top-left corner keeps that corner.
  assert.deepEqual(pictureCropRect({x:0,y:0,zoom:2},100,200,400,400),{sx:0,sy:0,sw:100,sh:200});
});
