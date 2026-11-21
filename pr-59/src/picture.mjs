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

// The part of the source image that the portrait frame shows, in image pixels.
// Mirrors the CSS: object-fit:cover with object-position x% y%, then
// scale(zoom) around the same x% y% point.
export function pictureCropRect(crop,width,height,imageWidth,imageHeight) {
  const {x,y,zoom}=normalizePictureCrop(crop);
  const cover=Math.max(width/imageWidth,height/imageHeight);
  const axis=(frame,image,percent)=>{
    const offset=(frame-image*cover)*percent/100,origin=frame*percent/100;
    return [(origin*(1-1/zoom)-offset)/cover,frame/zoom/cover];
  };
  const [sx,sw]=axis(width,imageWidth,x),[sy,sh]=axis(height,imageHeight,y);
  return {sx,sy,sw,sh};
}
