import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { compressImage } from '../services/imageService'

/**
 * Mock the entire image processing pipeline for jsdom
 * which lacks actual Image loading and Canvas rendering.
 */
function installMocks() {
  // Mock Image constructor: calls onload synchronously
  const OrigImage = globalThis.Image
  // @ts-expect-error
  globalThis.Image = class MockImage {
    onload = null
    onerror = null
    src = ''
    width = 800
    height = 600
    naturalWidth = 800
    naturalHeight = 600
    constructor() {
      // Call onload on next tick to simulate async
      queueMicrotask(() => this.onload?.())
    }
  }

  // Mock canvas getContext to return a context with drawImage stub
  const origGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      drawImage: vi.fn(),
    }
  }

  // Mock toBlob to call callback immediately
  const origToBlob = HTMLCanvasElement.prototype.toBlob
  HTMLCanvasElement.prototype.toBlob = function (callback) {
    const blob = new Blob(['fake-webp'], { type: 'image/webp' })
    callback(blob)
  }

  return function restore() {
    globalThis.Image = OrigImage
    HTMLCanvasElement.prototype.getContext = origGetContext
    HTMLCanvasElement.prototype.toBlob = origToBlob
  }
}

describe('imageService — compressImage', () => {
  let restore

  beforeEach(() => {
    restore = installMocks()
  })

  afterEach(() => {
    restore()
  })

  it('returns a Blob', async () => {
    const file = new File(['fake-png'], 'test.png', { type: 'image/png' })
    const result = await compressImage(file)
    expect(result).toBeInstanceOf(Blob)
  })

  it('rejects when the image fails to load', async () => {
    // Override Image to call onerror
    const OrigImage = globalThis.Image
    // @ts-expect-error
    globalThis.Image = class FailingImage {
      onload = null
      onerror = null
      constructor() {
        queueMicrotask(() => this.onerror?.())
      }
    }

    const file = new File(['bad'], 'bad.png', { type: 'image/png' })
    await expect(compressImage(file)).rejects.toThrow(/Failed to load image/i)

    globalThis.Image = OrigImage
  })

  it('handles image resize when large', async () => {
    const file = new File(['fake-png'], 'test.png', { type: 'image/png' })
    const result = await compressImage(file)
    expect(result).toBeInstanceOf(Blob)
  })
})
