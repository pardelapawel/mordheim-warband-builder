import {normalizePictureCrop} from './model.mjs';

// object-fit:cover plus scale leaves this much image outside the viewport.
// Position percentages move through that overflow, so dragging follows the pointer.
export function panPictureCrop(crop,dx,dy,width,height,imageWidth,imageHeight) {
  const start=normalizePictureCrop(crop);
  if(Math.min(width,height,imageWidth,imageHeight)<=0)return start;
  const scale=Math.max(width/imageWidth,height/imageHeight)*start.zoom;
  const overflowX=imageWidth*scale-width,overflowY=imageHeight*scale-height;
  return normalizePictureCrop({...start,
    x:overflowX>0.01?start.x-dx/overflowX*100:start.x,
    y:overflowY>0.01?start.y-dy/overflowY*100:start.y});
}
