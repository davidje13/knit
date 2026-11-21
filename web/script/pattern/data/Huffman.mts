interface HuffmanEntry<T> {
	value: T;
	length: number;
	pattern: (1 | 0)[];
}

interface HuffmanFrequency<T> {
	value: T;
	p: Rational;
	parent: HuffmanFrequency<T> | null;
}

type SymbolFrequency<T> = [T, number];
type SymbolLength<T> = [T, number];

export class Huffman<T> {
	private readonly symbols = new Map<T, HuffmanEntry<T>>();
	private readonly sorted: HuffmanEntry<T>[] = [];

	constructor(symbolLengths: SymbolLength<T>[]) {
		for (const [value, length] of symbolLengths) {
			if (length) {
				this.symbols.set(value, {
					value,
					length,
					pattern: null as any, // set later in this constructor
				});
			}
		}
		if (this.symbols.size === 1) {
			// special case: if there is only one symbol, its length is ignored and set to 0 because nothing else can be encoded
			this.symbols.values().next().value!.length = 0;
		}

		const v: (1 | 0)[] = [];
		// shorter codes first (sort is stable so order of elements is otherwise maintained)
		for (const symbol of [...this.symbols.values()].sort(
			(a, b) => a.length - b.length,
		)) {
			if (v.length) {
				// increment
				let i = v.length - 1;
				while (v[i]) {
					v[i] = 0;
					--i;
				}
				v[i] = 1;
			}
			while (v.length < symbol.length) {
				// grow
				v.push(0);
			}
			symbol.pattern = [...v];
			this.sorted.push(symbol);
		}
	}

	static frequenciesToLengths<T>(
		symbolFrequencies: Iterable<SymbolFrequency<T>>,
	) {
		const symbols = [...symbolFrequencies].map(
			([value, frequency]): HuffmanFrequency<T> => ({
				value,
				p: Rational.from(frequency),
				parent: null,
			}),
		);

		const queue: HuffmanFrequency<T | null>[] = symbols
			.filter((symbol) => symbol.p.compare(Rational.ZERO) > 0)
			.sort((a, b) => b.p.compare(a.p)); // low p at end

		if (queue.length === 1) {
			// special case: only one symbol - it will be encoded in 0 bits,
			// but we must record that it exists, which we do by giving it a non-zero length
			queue.pop()!.parent = { value: null, p: Rational.ZERO, parent: null };
		}
		while (queue.length > 1) {
			const c2 = queue.pop()!;
			const c1 = queue.pop()!;
			const parent: HuffmanFrequency<null> = {
				value: null,
				p: c1.p.add(c2.p),
				parent: null,
			};
			c1.parent = c2.parent = parent;
			// binary search for new location
			let p1 = 0;
			let p2 = queue.length;
			while (p2 > p1) {
				const p = (p1 + p2) >>> 1;
				if (queue[p]!.p.compare(parent.p) > 0) {
					p1 = p + 1;
				} else {
					p2 = p;
				}
			}
			queue.splice(p1, 0, parent);
		}

		return symbols.map((symbol): SymbolLength<T> => {
			let length = 0;
			for (let s = symbol; s.parent; s = s.parent) {
				++length;
			}
			return [symbol.value, length];
		});
	}

	static fromFrequencies<T>(symbolFrequencies: Iterable<SymbolFrequency<T>>) {
		return new Huffman(Huffman.frequenciesToLengths(symbolFrequencies));
	}

	write(encoder: { writeBits(bits: (1 | 0)[]): void }, value: T) {
		const symbol = this.symbols.get(value);
		if (!symbol) {
			throw new Error(`unknown symbol ${value}`);
		}
		encoder.writeBits(symbol.pattern);
	}

	read(decoder: { readBit(): boolean }) {
		let from = 0;
		let to = this.sorted.length;
		for (let i = 0; to > from + 1; ++i) {
			let p1 = from;
			let p2 = to;
			while (p2 > p1) {
				const p = (p1 + p2) >>> 1;
				if (this.sorted[p]!.pattern[i]) {
					p2 = p;
				} else {
					p1 = p + 1;
				}
			}
			if (decoder.readBit()) {
				from = p1;
			} else {
				to = p1;
			}
		}
		return this.sorted[from]!.value;
	}

	toString() {
		const r = [];
		for (const symbol of this.symbols.values()) {
			r.push(
				`${String(symbol.value).padStart(5, ' ')} => ${symbol.pattern.join('') || '-'}`,
			);
		}
		return r.join('\n');
	}
}

export class Rational {
	declare private num: number;
	declare private den: number;

	constructor(num: number, den = 1) {
		if (den < 0) {
			this.num = -num;
			this.den = -den;
		} else {
			this.num = num;
			this.den = den;
		}
		if (this.den > 1e5) {
			this.simplify();
		}
	}

	static from(v: number | Rational) {
		if (v instanceof Rational) {
			return v;
		} else if (typeof v === 'number') {
			return new Rational(v);
		} else {
			throw new Error(`invalid number ${v}`);
		}
	}

	static ZERO = new Rational(0);

	simplify() {
		const d = gcd(this.num, this.den);
		this.num /= d;
		this.den /= d;
	}

	compare(b: Rational) {
		return this.num * b.den - b.num * this.den;
	}

	add(b: Rational) {
		return new Rational(this.num * b.den + b.num * this.den, this.den * b.den);
	}

	toString() {
		return `${this.num}/${this.den}`;
	}

	toNumber() {
		return this.num / this.den;
	}
}

function gcd(a: number, b: number) {
	while (b) {
		const t = b;
		b = a % b;
		a = t;
	}
	return a;
}
