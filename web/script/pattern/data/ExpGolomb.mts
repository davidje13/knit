interface Encoder {
	writeBit(bit: 1 | 0): void;
	writeBinary(value: number, bits: number): void;
}

interface Decoder {
	readWhile(check: 1 | 0): number;
	readBinary(bits: number): number;
}

export class ExpGolomb {
	constructor(private readonly k = 0) {}

	write(encoder: Encoder, value: number) {
		if (value < 0) {
			throw new Error(`value ${value} out of bounds (positive integer)`);
		}
		const a = (value >>> this.k) + 1;
		const bits = bitLength(a);
		for (let i = 0; i < bits - 1; ++i) {
			encoder.writeBit(0);
		}
		encoder.writeBinary(a, bits);
		if (this.k) {
			encoder.writeBinary(value & ((1 << this.k) - 1), this.k);
		}
	}

	read(decoder: Decoder) {
		const bits = decoder.readWhile(0) + 1;
		const a = decoder.readBinary(bits) - 1;
		if (!this.k) {
			return a;
		}
		const b = decoder.readBinary(this.k);
		return (a << this.k) | b;
	}
}

function bitLength(v: number) {
	let n = 0;
	for (; v; v >>>= 1) {
		++n;
	}
	return n;
}
