export function mirrorX({ data, width, height }) {
  const newData = new Uint8Array(data);
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      const ox = width - x - 1;
      newData[y * width + x] = data[y * width + ox];
    }
  }
  return { data: newData, width, height };
}

export function mirrorY({ data, width, height }) {
  const newData = new Uint8Array(data);
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      const oy = height - y - 1;
      newData[y * width + x] = data[oy * width + x];
    }
  }
  return { data: newData, width, height };
}

export function transpose({ data, width, height }) {
  const newData = new Uint8Array(data);
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      newData[x * height + y] = data[y * width + x];
    }
  }
  return { data: newData, width: height, height: width };
}

export const shift = (dx, dy) => ({ data, width, height }) => {
  const newData = new Uint8Array(data);
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      newData[y * width + x] = data[posmod(y + dy, height) * width + posmod(x + dx, width)];
    }
  }
  return { data: newData, width, height };
};

const posmod = (a, b) => ((a % b) + b) % b;
