const dimension = value => Number.isFinite(value) ? Math.max(0, value) : 0;

/** imageWidth is the contained picture's actual width, excluding frame whitespace. */
export function letterCatcherPictureLayout({ available, size, imageWidth } = {}) {
  const width = dimension(available);
  const pictureWidth = dimension(imageWidth);
  const videoWidth = Math.min(120, dimension(size) * 0.55, width * 0.26);
  const gap = pictureWidth && videoWidth ? Math.min(8, width - videoWidth) : 0;
  const imageScale = pictureWidth ? Math.min(1, Math.max(0, width - videoWidth - gap) / pictureWidth) : 1;
  return {
    videoWidth,
    imageScale,
    imageOffset: (videoWidth + gap) / 2,
    videoOffset: (pictureWidth * imageScale + gap) / 2,
  };
}
