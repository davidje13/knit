import { BitDecoder } from '../data/BitDecoder.mjs';
import { BitEncoder } from '../data/BitEncoder.mjs';
import { ExpGolomb } from '../data/ExpGolomb.mjs';
import { Huffman } from '../data/Huffman.mjs';

const sizeFormat = new ExpGolomb(4);
const MAX_SIZE = 1000;
const MAX_PALETTE = 255;

export function compressImage({ width, height, data }, palette) {
  const encoder = new BitEncoder();
  const p = palette.length;
  sizeFormat.write(encoder, width);
  sizeFormat.write(encoder, height);
  sizeFormat.write(encoder, p);
  const pUsed = new Map();
  for (let i = 0; i < palette.length; ++i) {
    const p = palette[i];
    encoder.writeBinary(p, 24);
    const used = data.includes(i);
    encoder.writeBit(used);
    if (used) {
      pUsed.set(i, pUsed.size);
    }
  }
  const huff = getUniformHuffman(pUsed.size - 1);
  for (let i = 0; i < width * height; ++i) {
    huff.write(encoder, pUsed.get(data[i]));
  }
  return `I${encoder}`;
}

export function decompressImage(compressed) {
  if (compressed[0] !== 'I') {
    throw new Error('unknown image compression');
  }
  const decoder = new BitDecoder(compressed.substring(1));

  const width = sizeFormat.read(decoder);
  const height = sizeFormat.read(decoder);
  const p = sizeFormat.read(decoder);
  if (width > MAX_SIZE || height > MAX_SIZE || p > MAX_PALETTE) {
    throw new Error('unsupported size');
  }
  const palette = [];
  const pUsed = [];
  for (let i = 0; i < p; ++i) {
    palette.push(decoder.readBinary(24));
    if (decoder.readBit()) {
      pUsed.push(i);
    }
  }

  const data = new Uint8Array(width * height);
  const huff = getUniformHuffman(pUsed.length - 1);
  for (let i = 0; i < width * height; ++i) {
    data[i] = pUsed[huff.read(decoder)];
  }

  return { width, height, data, palette };
}

function getUniformHuffman(limit) {
  if (limit < 0) {
    throw new Error(`invalid huffman limit: ${limit}`);
  }
  if (!HUFFMAN_CACHE.has(limit)) {
    const symbols = [];
    for (let i = 0; i <= limit; ++i) {
      symbols.push([i, 1]);
    }
    HUFFMAN_CACHE.set(limit, Huffman.fromFrequencies(symbols));
  }
  return HUFFMAN_CACHE.get(limit);
}

const HUFFMAN_CACHE = new Map();
