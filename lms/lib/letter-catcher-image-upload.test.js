import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareLetterCatcherImageUpload } from './letter-catcher-image-upload';

let bitmap, ctx, canvas, file;
beforeEach(() => {
  bitmap = { width: 2400, height: 4800, close: vi.fn() };
  ctx = { fillRect: vi.fn(), drawImage: vi.fn() };
  canvas = {
    width: 0, height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((done, type) => done(new Blob(['encoded'], { type }))),
  };
  file = new Blob(['source'], { type: 'image/png' });
  vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
});
afterEach(() => vi.unstubAllGlobals());

describe('teacher word-image uploads', () => {
  it('retains high-resolution portrait content in a white 1024 square without cropping', async () => {
    const { blob, fileName } = await prepareLetterCatcherImageUpload(file);
    expect(createImageBitmap).toHaveBeenCalledWith(file);
    expect([canvas.width, canvas.height]).toEqual([1024, 1024]);
    expect(ctx.fillStyle).toBe('#fff');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);
    expect(ctx.drawImage).toHaveBeenCalledWith(bitmap, 297, 82, 430, 860);
    expect(ctx.fillRect.mock.invocationCallOrder[0]).toBeLessThan(ctx.drawImage.mock.invocationCallOrder[0]);
    expect(ctx.imageSmoothingQuality).toBe('high');
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.88);
    expect(blob.type).toBe('image/webp');
    expect(fileName).toMatch(/^word-\d+\.webp$/);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it('contains a wide image with symmetric margins and preserves its aspect ratio', async () => {
    bitmap.width = 4800; bitmap.height = 2400;
    await prepareLetterCatcherImageUpload(file);
    expect(ctx.drawImage).toHaveBeenCalledWith(bitmap, 82, 297, 860, 430);
  });

  it.each(['image/png', null, 'throws'])('uses the actual JPEG MIME and filename when WebP encoding returns %s', async type => {
    canvas.toBlob.mockImplementation((done, requested) => {
      if (requested === 'image/webp' && type === 'throws') throw new Error('WebP unsupported');
      done(requested === 'image/webp'
        ? (type ? new Blob(['unsupported'], { type }) : null)
        : new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
    const { blob, fileName } = await prepareLetterCatcherImageUpload(file);
    expect(canvas.toBlob).toHaveBeenNthCalledWith(2, expect.any(Function), 'image/jpeg', 0.88);
    expect(blob.type).toBe('image/jpeg');
    expect(fileName).toMatch(/^word-\d+\.jpg$/);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it('fails cleanly and frees the decoded image if both encoders return no image', async () => {
    canvas.toBlob.mockImplementation(done => done(null));
    await expect(prepareLetterCatcherImageUpload(file)).rejects.toThrow('تعذّر تجهيز الصورة');
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it('frees the decoded image if the browser cannot create a drawing context', async () => {
    canvas.getContext.mockReturnValue(null);
    await expect(prepareLetterCatcherImageUpload(file)).rejects.toThrow('تعذّر تجهيز الصورة');
    expect(bitmap.close).toHaveBeenCalledTimes(1);
    expect(canvas.toBlob).not.toHaveBeenCalled();
  });

  it('frees the decoded image when canvas encoding throws', async () => {
    canvas.toBlob.mockImplementation(() => { throw new Error('Canvas failed'); });
    await expect(prepareLetterCatcherImageUpload(file)).rejects.toThrow('Canvas failed');
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });
});
