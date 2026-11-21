import { fromB64 } from './base64.mts';

export class BitDecoder {
	private sextets: number[] = [];
	declare private readonly l: number;
	declare private pos: number;
	declare private bit: number;

	constructor(data: string) {
		for (let i = 0; i < data.length; ++i) {
			this.sextets.push(fromB64.get(data[i]!)!);
		}
		this.l = this.sextets.length;
		this.pos = 0;
		this.bit = 0b00100000;
	}

	readBit() {
		if (this.pos >= this.l) {
			throw new Error('out of data');
		}
		const v = Boolean(this.sextets[this.pos]! & this.bit);
		this.bit >>>= 1;
		if (!this.bit) {
			++this.pos;
			this.bit = 0b00100000;
		}
		return v;
	}

	readWhile(check: boolean | 1 | 0) {
		if (this.pos >= this.l) {
			throw new Error('out of data');
		}
		check = Boolean(check);
		let n = 0;
		while (Boolean(this.sextets[this.pos]! & this.bit) === check) {
			this.bit >>>= 1;
			if (!this.bit) {
				++this.pos;
				this.bit = 0b00100000;
				if (this.pos >= this.l) {
					throw new Error('out of data');
				}
			}
			++n;
		}
		return n;
	}

	readBits(count: number) {
		const r = [];
		for (let i = 0; i < count; ++i) {
			r.push(this.readBit());
		}
		return r;
	}

	pad() {
		if (this.bit !== 0b00100000) {
			++this.pos;
			this.bit = 0b00100000;
		}
	}

	readBinary(bits: number) {
		let r = 0;
		for (let i = 0; i < bits; ++i) {
			r = (r << 1) | (this.readBit() ? 1 : 0);
		}
		return r;
	}
}
