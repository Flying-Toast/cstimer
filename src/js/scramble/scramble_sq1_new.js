"use strict";

var sq1 = (function(setNPerm, getNPerm, circle, rn) {

	function SqCubie() {
		this.ul = 0x011233; // 0 UB, 1 UBL, 2 UL, 3 UFL
		this.ur = 0x455677; // 4 UF, 5 UFR, 6 UR, 7 UBR
		this.dl = 0x998bba; // 9 DBR, 8 DR, b DFR, a DF
		this.dr = 0xddcffe; // d DFL, c DL, f DBL, e DB
		this.ml = 0;
	}

	var _ = SqCubie.prototype;

	_.toString = function() {
		return this.ul.toString(16).padStart(6, 0) +
			this.ur.toString(16).padStart(6, 0) +
			"|/".charAt(this.ml) +
			this.dl.toString(16).padStart(6, 0) +
			this.dr.toString(16).padStart(6, 0);
	}

	_.pieceAt = function(idx) {
		var ret;
		if (idx < 6) {
			ret = this.ul >> ((5 - idx) << 2);
		} else if (idx < 12) {
			ret = this.ur >> ((11 - idx) << 2);
		} else if (idx < 18) {
			ret = this.dl >> ((17 - idx) << 2);
		} else {
			ret = this.dr >> ((23 - idx) << 2);
		}
		return ret & 0xf;
	}

	_.setPiece = function(idx, value) {
		if (idx < 6) {
			this.ul &= ~(0xf << ((5 - idx) << 2));
			this.ul |= value << ((5 - idx) << 2);
		} else if (idx < 12) {
			this.ur &= ~(0xf << ((11 - idx) << 2));
			this.ur |= value << ((11 - idx) << 2);
		} else if (idx < 18) {
			this.dl &= ~(0xf << ((17 - idx) << 2));
			this.dl |= value << ((17 - idx) << 2);
		} else {
			this.dr &= ~(0xf << ((23 - idx) << 2));
			this.dr |= value << ((23 - idx) << 2);
		}
	}

	_.copy = function(c) {
		this.ul = c.ul;
		this.ur = c.ur;
		this.dl = c.dl;
		this.dr = c.dr;
		this.ml = c.ml;
	}

	_.doMove = function(move) {
		var temp;
		move <<= 2;
		if (move > 24) {
			move = 48 - move;
			temp = this.ul;
			this.ul = (this.ul >> move | this.ur << 24 - move) & 0xffffff;
			this.ur = (this.ur >> move | temp << 24 - move) & 0xffffff;
		} else if (move > 0) {
			temp = this.ul;
			this.ul = (this.ul << move | this.ur >> 24 - move) & 0xffffff;
			this.ur = (this.ur << move | temp >> 24 - move) & 0xffffff;
		} else if (move == 0) {
			temp = this.ur;
			this.ur = this.dl;
			this.dl = temp;
			this.ml = 1 - this.ml;
		} else if (move >= -24) {
			move = -move;
			temp = this.dl;
			this.dl = (this.dl << move | this.dr >> 24 - move) & 0xffffff;
			this.dr = (this.dr << move | temp >> 24 - move) & 0xffffff;
		} else if (move < -24) {
			move = 48 + move;
			temp = this.dl;
			this.dl = (this.dl >> move | this.dr << 24 - move) & 0xffffff;
			this.dr = (this.dr >> move | temp << 24 - move) & 0xffffff;
		}
	}

	function FullCube_getParity(obj) {
		var a, b, cnt, i, p, arr;
		cnt = 0;
		arr = [obj.pieceAt(0)];
		for (i = 1; i < 24; ++i) {
			if (obj.pieceAt(i) != arr[cnt]) {
				arr[++cnt] = obj.pieceAt(i);
			}
		}
		p = 0;
		for (a = 0; a < 16; ++a) {
			for (b = a + 1; b < 16; ++b) {
				arr[a] > arr[b] && (p ^= 1);
			}
		}
		return p;
	}

	function FullCube_getShapeIdx(obj) {
		var dlx, drx, ulx, urx;
		urx = obj.ur & 0x111111;
		urx |= urx >> 3;
		urx |= urx >> 6;
		urx = urx & 15 | urx >> 12 & 48;
		ulx = obj.ul & 0x111111;
		ulx |= ulx >> 3;
		ulx |= ulx >> 6;
		ulx = ulx & 15 | ulx >> 12 & 48;
		drx = obj.dr & 0x111111;
		drx |= drx >> 3;
		drx |= drx >> 6;
		drx = drx & 15 | drx >> 12 & 48;
		dlx = obj.dl & 0x111111;
		dlx |= dlx >> 3;
		dlx |= dlx >> 6;
		dlx = dlx & 15 | dlx >> 12 & 48;
		return Shape_getShape2Idx(FullCube_getParity(obj) << 24 | ulx << 18 | urx << 12 | dlx << 6 | drx);
	}

	function FullCube_getSquare(obj, sq) {
		var a, b;
		var prm = [];
		for (a = 0; a < 8; ++a) {
			prm[a] = obj.pieceAt(a * 3 + 1) >> 1;
		}
		sq.cornperm = getNPerm(prm, 8);
		sq.topEdgeFirst = obj.pieceAt(0) == obj.pieceAt(1);
		a = sq.topEdgeFirst ? 2 : 0;
		for (b = 0; b < 4; a += 3, ++b)
			prm[b] = obj.pieceAt(a) >> 1;
		sq.botEdgeFirst = obj.pieceAt(12) == obj.pieceAt(13);
		a = sq.botEdgeFirst ? 14 : 12;
		for (; b < 8; a += 3, ++b)
			prm[b] = obj.pieceAt(a) >> 1;
		sq.edgeperm = getNPerm(prm, 8);
		sq.ml = obj.ml;
	}

	function FullCube_randomCube(indice) {
		var f, i, shape, edge, corner, n_edge, n_corner, rnd, m;
		if (indice === undefined) {
			indice = rn(3678);
		}
		f = new SqCubie;
		shape = Shape_ShapeIdx[indice];
		corner = 0x01234567 << 1 | 0x11111111;
		edge = 0x01234567 << 1;
		n_corner = n_edge = 8;
		for (i = 0; i < 24; i++) {
			if (((shape >> i) & 1) == 0) { //edge
				rnd = rn(n_edge) << 2;
				f.setPiece(23 - i, (edge >> rnd) & 0xf);
				m = (1 << rnd) - 1;
				edge = (edge & m) + ((edge >> 4) & ~m);
				--n_edge;
			} else { //corner
				rnd = rn(n_corner) << 2;
				f.setPiece(23 - i, (corner >> rnd) & 0xf);
				f.setPiece(22 - i, (corner >> rnd) & 0xf);
				m = (1 << rnd) - 1;
				corner = (corner & m) + ((corner >> 4) & ~m);
				--n_corner;
				++i;
			}
		}
		f.ml = rn(2);
		return f;
	}

	function Search_init2(obj) {
		var corner, edge, i, j, ml, prun;
		obj.Search_d.copy(obj.Search_c);
		for (i = 0; i < obj.Search_length1; ++i) {
			obj.Search_d.doMove(obj.Search_move[i]);
		}
		FullCube_getSquare(obj.Search_d, obj.Search_sq);
		edge = obj.Search_sq.edgeperm;
		corner = obj.Search_sq.cornperm;
		ml = obj.Search_sq.ml;
		prun = Math.max(SquarePrun[obj.Search_sq.edgeperm << 1 | ml], SquarePrun[obj.Search_sq.cornperm << 1 | ml]);
		for (i = prun; i < obj.Search_maxlen2; ++i) {
			if (Search_phase2(obj, edge, corner, obj.Search_sq.topEdgeFirst, obj.Search_sq.botEdgeFirst, ml, i, obj.Search_length1, 0)) {
				for (j = 0; j < i; ++j) {
					obj.Search_d.doMove(obj.Search_move[obj.Search_length1 + j]);
				}
				obj.Search_sol_string = Search_move2string(obj, i + obj.Search_length1);
				return true;
			}
		}
		return false;
	}

	function Search_move2string(obj, len) {
		var s = "";
		var top = 0,
			bottom = 0;
		for (var i = len - 1; i >= 0; i--) {
			var val = obj.Search_move[i];
			//console.log(val);
			if (val > 0) {
				val = 12 - val;
				top = (val > 6) ? (val - 12) : val;
			} else if (val < 0) {
				val = 12 + val;
				bottom = (val > 6) ? (val - 12) : val;
			} else {
				var twst = "/";
				if (i == obj.Search_length1 - 1) {
					twst = "`/`";
				}
				if (top == 0 && bottom == 0) {
					s += twst;
				} else {
					s += " (" + top + "," + bottom + ")" + twst;
				}
				top = bottom = 0;
			}
		}
		if (top == 0 && bottom == 0) {} else {
			s += " (" + top + "," + bottom + ") ";
		}
		return s; // + " (" + len + "t)";
	}

	function Search_phase1(obj, shape, prunvalue, maxl, depth, lm) {
		var m, prunx, shapex;
		if (prunvalue == 0 && maxl < 4) {
			return maxl == 0 && Search_init2(obj);
		}
		if (lm != 0) {
			shapex = Shape_TwistMove[shape];
			prunx = ShapePrun[shapex];
			if (prunx < maxl) {
				obj.Search_move[depth] = 0;
				if (Search_phase1(obj, shapex, prunx, maxl - 1, depth + 1, 0)) {
					return true;
				}
			}
		}
		shapex = shape;
		if (lm <= 0) {
			m = 0;
			while (true) {
				m += Shape_TopMove[shapex];
				shapex = m >> 4;
				m &= 15;
				if (m >= 12) {
					break;
				}
				prunx = ShapePrun[shapex];
				if (prunx > maxl) {
					break;
				} else if (prunx < maxl) {
					obj.Search_move[depth] = m;
					if (Search_phase1(obj, shapex, prunx, maxl - 1, depth + 1, 1)) {
						return true;
					}
				}
			}
		}
		shapex = shape;
		if (lm <= 1) {
			m = 0;
			while (true) {
				m += Shape_BottomMove[shapex];
				shapex = m >> 4;
				m &= 15;
				if (m >= 6) {
					break;
				}
				prunx = ShapePrun[shapex];
				if (prunx > maxl) {
					break;
				} else if (prunx < maxl) {
					obj.Search_move[depth] = -m;
					if (Search_phase1(obj, shapex, prunx, maxl - 1, depth + 1, 2)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	function Search_phase2(obj, edge, corner, topEdgeFirst, botEdgeFirst, ml, maxl, depth, lm) {
		var botEdgeFirstx, cornerx, edgex, m, prun1, prun2, topEdgeFirstx;
		if (maxl == 0 && !topEdgeFirst && botEdgeFirst) {
			return true;
		}
		if (lm != 0 && topEdgeFirst == botEdgeFirst) {
			edgex = Square_TwistMove[edge];
			cornerx = Square_TwistMove[corner];
			if (SquarePrun[edgex << 1 | 1 - ml] < maxl && SquarePrun[cornerx << 1 | 1 - ml] < maxl) {
				obj.Search_move[depth] = 0;
				if (Search_phase2(obj, edgex, cornerx, topEdgeFirst, botEdgeFirst, 1 - ml, maxl - 1, depth + 1, 0)) {
					return true;
				}
			}
		}
		if (lm <= 0) {
			topEdgeFirstx = !topEdgeFirst;
			edgex = topEdgeFirstx ? Square_TopMove[edge] : edge;
			cornerx = topEdgeFirstx ? corner : Square_TopMove[corner];
			m = topEdgeFirstx ? 1 : 2;
			prun1 = SquarePrun[edgex << 1 | ml];
			prun2 = SquarePrun[cornerx << 1 | ml];
			while (m < 12 && prun1 <= maxl && prun1 <= maxl) {
				if (prun1 < maxl && prun2 < maxl) {
					obj.Search_move[depth] = m;
					if (Search_phase2(obj, edgex, cornerx, topEdgeFirstx, botEdgeFirst, ml, maxl - 1, depth + 1, 1)) {
						return true;
					}
				}
				topEdgeFirstx = !topEdgeFirstx;
				if (topEdgeFirstx) {
					edgex = Square_TopMove[edgex];
					prun1 = SquarePrun[edgex << 1 | ml];
					m += 1;
				} else {
					cornerx = Square_TopMove[cornerx];
					prun2 = SquarePrun[cornerx << 1 | ml];
					m += 2;
				}
			}
		}
		if (lm <= 1) {
			botEdgeFirstx = !botEdgeFirst;
			edgex = botEdgeFirstx ? Square_BottomMove[edge] : edge;
			cornerx = botEdgeFirstx ? corner : Square_BottomMove[corner];
			m = botEdgeFirstx ? 1 : 2;
			prun1 = SquarePrun[edgex << 1 | ml];
			prun2 = SquarePrun[cornerx << 1 | ml];
			while (m < (maxl > 6 ? 6 : 12) && prun1 <= maxl && prun1 <= maxl) {
				if (prun1 < maxl && prun2 < maxl) {
					obj.Search_move[depth] = -m;
					if (Search_phase2(obj, edgex, cornerx, topEdgeFirst, botEdgeFirstx, ml, maxl - 1, depth + 1, 2)) {
						return true;
					}
				}
				botEdgeFirstx = !botEdgeFirstx;
				if (botEdgeFirstx) {
					edgex = Square_BottomMove[edgex];
					prun1 = SquarePrun[edgex << 1 | ml];
					m += 1;
				} else {
					cornerx = Square_BottomMove[cornerx];
					prun2 = SquarePrun[cornerx << 1 | ml];
					m += 2;
				}
			}
		}
		return false;
	}

	function Search_solution(obj, c) {
		var shape;
		obj.Search_c = c;
		shape = FullCube_getShapeIdx(c);
		//console.log(shape);
		for (obj.Search_length1 = ShapePrun[shape]; obj.Search_length1 < 100; ++obj.Search_length1) {
			//console.log(obj.Search_length1);
			obj.Search_maxlen2 = Math.min(32 - obj.Search_length1, 17);
			if (Search_phase1(obj, shape, ShapePrun[shape], obj.Search_length1, 0, -1)) {
				break;
			}
		}
		return obj.Search_sol_string;
	}

	function Search_Search() {
		this.Search_move = [];
		this.Search_d = new SqCubie;
		this.Search_sq = new Square_Square;
	}

	function Search() {}

	_ = Search_Search.prototype = Search.prototype;
	_.Search_c = null;
	_.Search_length1 = 0;
	_.Search_maxlen2 = 0;
	_.Search_sol_string = null;

	function Shape_$clinit() {
		Shape_$clinit = $.noop;
		Shape_halflayer = [0, 3, 6, 12, 15, 24, 27, 30, 48, 51, 54, 60, 63];
		Shape_ShapeIdx = [];
		ShapePrun = [];
		Shape_TopMove = [];
		Shape_BottomMove = [];
		Shape_TwistMove = [];
		Shape_init();
	}

	function Shape_bottomMove(obj) {
		var move, moveParity;
		move = 0;
		moveParity = 0;
		do {
			if ((obj.bottom & 2048) == 0) {
				move += 1;
				obj.bottom = obj.bottom << 1;
			} else {
				move += 2;
				obj.bottom = obj.bottom << 2 ^ 12291;
			}
			moveParity = 1 - moveParity;
		}
		while ((bitCount(obj.bottom & 63) & 1) != 0);
		(bitCount(obj.bottom) & 2) == 0 && (obj.Shape_parity ^= moveParity);
		return move;
	}

	function Shape_getIdx(obj) {
		var ret;
		ret = binarySearch(Shape_ShapeIdx, obj.top << 12 | obj.bottom) << 1 | obj.Shape_parity;
		return ret;
	}

	function Shape_setIdx(obj, idx) {
		obj.Shape_parity = idx & 1;
		obj.top = Shape_ShapeIdx[idx >> 1];
		obj.bottom = obj.top & 4095;
		obj.top >>= 12;
	}

	function Shape_topMove(obj) {
		var move, moveParity;
		move = 0;
		moveParity = 0;
		do {
			if ((obj.top & 2048) == 0) {
				move += 1;
				obj.top = obj.top << 1;
			} else {
				move += 2;
				obj.top = obj.top << 2 ^ 12291;
			}
			moveParity = 1 - moveParity;
		}
		while ((bitCount(obj.top & 63) & 1) != 0);
		(bitCount(obj.top) & 2) == 0 && (obj.Shape_parity ^= moveParity);
		return move;
	}

	function Shape_Shape() {}

	function Shape_getShape2Idx(shp) {
		var ret;
		ret = binarySearch(Shape_ShapeIdx, shp & 0xffffff) << 1 | shp >> 24;
		return ret;
	}

	function Shape_init() {
		var count, depth, dl, done, done0, dr, i, idx, m, s, ul, ur, value, p1, p3, temp;
		count = 0;
		for (i = 0; i < 28561; ++i) {
			dr = Shape_halflayer[i % 13];
			dl = Shape_halflayer[~~(i / 13) % 13];
			ur = Shape_halflayer[~~(~~(i / 13) / 13) % 13];
			ul = Shape_halflayer[~~(~~(~~(i / 13) / 13) / 13)];
			value = ul << 18 | ur << 12 | dl << 6 | dr;
			bitCount(value) == 16 && (Shape_ShapeIdx[count++] = value);
		}
		s = new Shape_Shape;
		for (i = 0; i < 7356; ++i) {
			Shape_setIdx(s, i);
			Shape_TopMove[i] = Shape_topMove(s);
			Shape_TopMove[i] |= Shape_getIdx(s) << 4;
			Shape_setIdx(s, i);
			Shape_BottomMove[i] = Shape_bottomMove(s);
			Shape_BottomMove[i] |= Shape_getIdx(s) << 4;
			Shape_setIdx(s, i);
			temp = s.top & 63;
			p1 = bitCount(temp);
			p3 = bitCount(s.bottom & 4032);
			s.Shape_parity ^= 1 & (p1 & p3) >> 1;
			s.top = s.top & 4032 | s.bottom >> 6 & 63;
			s.bottom = s.bottom & 63 | temp << 6;
			Shape_TwistMove[i] = Shape_getIdx(s);
		}
		for (i = 0; i < 7536; ++i) {
			ShapePrun[i] = -1;
		}
		ShapePrun[Shape_getShape2Idx(14378715)] = 0;
		ShapePrun[Shape_getShape2Idx(31157686)] = 0;
		ShapePrun[Shape_getShape2Idx(23967451)] = 0;
		ShapePrun[Shape_getShape2Idx(7191990)] = 0;
		done = 4;
		done0 = 0;
		depth = -1;
		while (done != done0) {
			done0 = done;
			++depth;
			for (i = 0; i < 7536; ++i) {
				if (ShapePrun[i] == depth) {
					m = 0;
					idx = i;
					do {
						idx = Shape_TopMove[idx];
						m += idx & 15;
						idx >>= 4;
						if (ShapePrun[idx] == -1) {
							++done;
							ShapePrun[idx] = depth + 1;
						}
					}
					while (m != 12);
					m = 0;
					idx = i;
					do {
						idx = Shape_BottomMove[idx];
						m += idx & 15;
						idx >>= 4;
						if (ShapePrun[idx] == -1) {
							++done;
							ShapePrun[idx] = depth + 1;
						}
					}
					while (m != 12);
					idx = Shape_TwistMove[i];
					if (ShapePrun[idx] == -1) {
						++done;
						ShapePrun[idx] = depth + 1;
					}
				}
			}
		}
	}

	function Shape() {}

	_ = Shape_Shape.prototype = Shape.prototype;
	_.bottom = 0;
	_.Shape_parity = 0;
	_.top = 0;
	var Shape_BottomMove, Shape_ShapeIdx, ShapePrun, Shape_TopMove, Shape_TwistMove, Shape_halflayer;

	function Square_$clinit() {
		Square_$clinit = $.noop;
		SquarePrun = [];
		Square_TwistMove = [];
		Square_TopMove = [];
		Square_BottomMove = [];
		Square_init();
	}

	function Square_Square() {}

	function Square_init() {
		var check, depth, done, find, i, idx, idxx, inv, m, ml, pos;
		pos = [];
		for (i = 0; i < 40320; ++i) {
			setNPerm(pos, i, 8);
			circle(pos, 2, 4)(pos, 3, 5);
			Square_TwistMove[i] = getNPerm(pos, 8);
			setNPerm(pos, i, 8);
			circle(pos, 0, 3, 2, 1);
			Square_TopMove[i] = getNPerm(pos, 8);
			setNPerm(pos, i, 8);
			circle(pos, 4, 7, 6, 5);
			Square_BottomMove[i] = getNPerm(pos, 8);
		}
		for (i = 0; i < 80640; ++i) {
			SquarePrun[i] = -1;
		}
		SquarePrun[0] = 0;
		depth = 0;
		done = 1;
		while (done < 80640) {
			//console.log(done);
			inv = depth >= 11;
			find = inv ? -1 : depth;
			check = inv ? depth : -1;
			++depth;
			OUT: for (i = 0; i < 80640; ++i) {
				if (SquarePrun[i] == find) {
					idx = i >> 1;
					ml = i & 1;
					idxx = Square_TwistMove[idx] << 1 | 1 - ml;
					if (SquarePrun[idxx] == check) {
						++done;
						SquarePrun[inv ? i : idxx] = depth;
						if (inv)
							continue OUT;
					}
					idxx = idx;
					for (m = 0; m < 4; ++m) {
						idxx = Square_TopMove[idxx];
						if (SquarePrun[idxx << 1 | ml] == check) {
							++done;
							SquarePrun[inv ? i : idxx << 1 | ml] = depth;
							if (inv)
								continue OUT;
						}
					}
					for (m = 0; m < 4; ++m) {
						idxx = Square_BottomMove[idxx];
						if (SquarePrun[idxx << 1 | ml] == check) {
							++done;
							SquarePrun[inv ? i : idxx << 1 | ml] = depth;
							if (inv)
								continue OUT;
						}
					}
				}
			}
		}
	}

	function Square() {}

	_ = Square_Square.prototype = Square.prototype;
	_.botEdgeFirst = false;
	_.cornperm = 0;
	_.edgeperm = 0;
	_.ml = 0;
	_.topEdgeFirst = false;
	var Square_BottomMove, SquarePrun, Square_TopMove, Square_TwistMove;

	function bitCount(x) {
		x -= x >> 1 & 1431655765;
		x = (x >> 2 & 858993459) + (x & 858993459);
		x = (x >> 4) + x & 252645135;
		x += x >> 8;
		x += x >> 16;
		return x & 63;
	}

	function binarySearch(sortedArray, key) {
		var high, low, mid, midVal;
		low = 0;
		high = sortedArray.length - 1;
		while (low <= high) {
			mid = low + ((high - low) >> 1);
			midVal = sortedArray[mid];
			if (midVal < key) {
				low = mid + 1;
			} else if (midVal > key) {
				high = mid - 1;
			} else {
				return mid;
			}
		}
		return -low - 1;
	}

	// Star_x8 = [0];
	// Star_x71 = [1];
	// Star_x62 = [3];
	// Star_x44 = [18];
	// Star_x53 = [19];

	// Square_Scallop = [1004];
	// Square_rPawn = [1005];
	// Square_Shield = [1006];
	// Square_Barrel = [1007];
	// Square_rFist = [1008];
	// Square_Mushroom = [1009];
	// Square_lPawn = [1011];
	// Square_Square = [1015];
	// Square_lFist = [1016];
	// Square_Kite = [1018];

	// Kite_Scallop = [1154];
	// Kite_rPawn = [1155];
	// Kite_Shield = [1156];
	// Kite_Barrel = [1157];
	// Kite_rFist = [1158];
	// Kite_Mushroom = [1159];
	// Kite_lPawn = [1161];
	// Kite_lFist = [1166];
	// Kite_Kite = [1168];

	// Barrel_Scallop = [424];
	// Barrel_rPawn = [425];
	// Barrel_Shield = [426];
	// Barrel_Barrel = [427];
	// Barrel_rFist = [428];
	// Barrel_Mushroom = [429];
	// Barrel_lPawn = [431];
	// Barrel_lFist = [436];

	// Scallop_Scallop = [95];
	// Scallop_rPawn = [218];
	// Scallop_Shield = [341];
	// Scallop_rFist = [482];
	// Scallop_Mushroom = [528];
	// Scallop_lPawn = [632];
	// Scallop_lFist = [1050];

	// Shield_rPawn = [342];
	// Shield_Shield = [343];
	// Shield_rFist = [345];
	// Shield_Mushroom = [346];
	// Shield_lPawn = [348];
	// Shield_lFist = [353];

	// Mushroom_rPawn = [223];
	// Mushroom_rFist = [487];
	// Mushroom_Mushroom = [533];
	// Mushroom_lPawn = [535];
	// Mushroom_lFist = [1055];

	// Pawn_rPawn_rPawn = [219];
	// Pawn_rPawn_lPawn = [225];
	// Pawn_rPawn_rFist = [483];
	// Pawn_lPawn_rFist = [489];
	// Pawn_lPawn_lPawn = [639];
	// Pawn_rPawn_lFist = [1051];
	// Pawn_lPawn_lFist = [1057];

	// Fist_rFist_rFist = [486];
	// Fist_lFist_rFist = [1054];
	// Fist_lFist_lFist = [1062];

	// Pair_x6 = [6];
	// Pair_r42 = [21];
	// Pair_x411 = [34];
	// Pair_r51 = [46];
	// Pair_l42 = [59];
	// Pair_l51 = [71];
	// Pair_x33 = [144];
	// Pair_x312 = [157];
	// Pair_x321 = [182];
	// Pair_x222 = [305];

	// L_x6 = [7];
	// L_r42 = [22];
	// L_x411 = [35];
	// L_r51 = [47];
	// L_l42 = [60];
	// L_l51 = [72];
	// L_x33 = [145];
	// L_x312 = [158];
	// L_x321 = [183];
	// L_x222 = [306];

	// Line_x6 = [8];
	// Line_r42 = [23];
	// Line_x411 = [36];
	// Line_r51 = [48];
	// Line_l42 = [61];
	// Line_l51 = [73];
	// Line_x33 = [146];
	// Line_x312 = [159];
	// Line_x321 = [184];
	// Line_x222 = [307];

	var cspcases = [0, 1, 3, 18, 19, 1004, 1005, 1006, 1007, 1008, 1009, 1011, 1015, 1016, 1018, 1154, 1155, 1156, 1157, 1158, 1159, 1161, 1166, 1168, 424, 425, 426, 427, 428, 429, 431, 436, 95, 218, 341, 482, 528, 632, 1050, 342, 343, 345, 346, 348, 353, 223, 487, 533, 535, 1055, 219, 225, 483, 489, 639, 1051, 1057, 486, 1054, 1062, 6, 21, 34, 46, 59, 71, 144, 157, 182, 305, 7, 22, 35, 47, 60, 72, 145, 158, 183, 306, 8, 23, 36, 48, 61, 73, 146, 159, 184, 307];

	function CSPInit() {
		CSPInit = $.noop;
		var s = new Shape_Shape;
		for (var csp = 0; csp < cspcases.length; csp++) {
			var curCases = [cspcases[csp]];
			for (var i = 0; i < curCases.length; i++) {
				var shape = curCases[i];
				do {
					shape = Shape_TopMove[shape << 1] >> 5;
					if (curCases.indexOf(shape) == -1) {
						curCases.push(shape);
					}
				} while (shape != curCases[i]);
				do {
					shape = Shape_BottomMove[shape << 1] >> 5;
					if (curCases.indexOf(shape) == -1) {
						curCases.push(shape);
					}
				} while (shape != curCases[i]);
				Shape_setIdx(s, shape << 1);
				var tmp = s.top;
				s.top = s.bottom;
				s.bottom = tmp;
				shape = Shape_getIdx(s) >> 1;
				if (curCases.indexOf(shape) == -1) {
					curCases.push(shape);
				}
			}
			cspcases[csp] = curCases;
		}
	}

	var cspfilter = ['Star-x8', 'Star-x71', 'Star-x62', 'Star-x44', 'Star-x53', 'Square-Scallop', 'Square-rPawn', 'Square-Shield', 'Square-Barrel', 'Square-rFist', 'Square-Mushroom', 'Square-lPawn', 'Square-Square', 'Square-lFist', 'Square-Kite', 'Kite-Scallop', 'Kite-rPawn', 'Kite-Shield', 'Kite-Barrel', 'Kite-rFist', 'Kite-Mushroom', 'Kite-lPawn', 'Kite-lFist', 'Kite-Kite', 'Barrel-Scallop', 'Barrel-rPawn', 'Barrel-Shield', 'Barrel-Barrel', 'Barrel-rFist', 'Barrel-Mushroom', 'Barrel-lPawn', 'Barrel-lFist', 'Scallop-Scallop', 'Scallop-rPawn', 'Scallop-Shield', 'Scallop-rFist', 'Scallop-Mushroom', 'Scallop-lPawn', 'Scallop-lFist', 'Shield-rPawn', 'Shield-Shield', 'Shield-rFist', 'Shield-Mushroom', 'Shield-lPawn', 'Shield-lFist', 'Mushroom-rPawn', 'Mushroom-rFist', 'Mushroom-Mushroom', 'Mushroom-lPawn', 'Mushroom-lFist', 'Pawn-rPawn-rPawn', 'Pawn-rPawn-lPawn', 'Pawn-rPawn-rFist', 'Pawn-lPawn-rFist', 'Pawn-lPawn-lPawn', 'Pawn-rPawn-lFist', 'Pawn-lPawn-lFist', 'Fist-rFist-rFist', 'Fist-lFist-rFist', 'Fist-lFist-lFist', 'Pair-x6', 'Pair-r42', 'Pair-x411', 'Pair-r51', 'Pair-l42', 'Pair-l51', 'Pair-x33', 'Pair-x312', 'Pair-x321', 'Pair-x222', 'L-x6', 'L-r42', 'L-x411', 'L-r51', 'L-l42', 'L-l51', 'L-x33', 'L-x312', 'L-x321', 'L-x222', 'Line-x6', 'Line-r42', 'Line-x411', 'Line-r51', 'Line-l42', 'Line-l51', 'Line-x33', 'Line-x312', 'Line-x321', 'Line-x222'];
	var cspprobs = [16, 16, 16, 10, 16, 24, 16, 24, 16, 24, 16, 16, 4, 24, 16, 48, 32, 48, 32, 48, 32, 32, 48, 16, 48, 32, 48, 16, 48, 32, 32, 48, 36, 48, 72, 72, 48, 48, 72, 48, 36, 72, 48, 48, 72, 32, 48, 16, 32, 48, 16, 32, 48, 48, 16, 48, 48, 36, 72, 36, 72, 96, 96, 72, 96, 72, 72, 72, 72, 24, 48, 64, 64, 48, 64, 48, 48, 48, 48, 16, 24, 32, 32, 24, 32, 24, 24, 24, 24, 8];

	var search = new Search_Search;

	function square1SolverGetRandomScramble(type, length, cases) {
		Shape_$clinit();
		Square_$clinit();
		var scrambleString = Search_solution(search, FullCube_randomCube());
		return scrambleString;
	}

	function getCSPScramble(type, length, cases) {
		Shape_$clinit();
		Square_$clinit();
		CSPInit();
		var idx = mathlib.rndEl(cspcases[scrMgr.fixCase(cases, cspprobs)]);
		var scrambleString = Search_solution(search, FullCube_randomCube(idx));
		return scrambleString;
	}

	var pll_map = [
		[0x1032, 0x3210], // H
		[0x3102, 0x3210], // Ua
		[0x3021, 0x3210], // Ub
		[0x2301, 0x3210], // Z
		[0x3210, 0x3021], // Aa
		[0x3210, 0x3102], // Ab
		[0x3210, 0x2301], // E
		[0x3012, 0x3201], // F
		[0x2130, 0x3021], // Gb
		[0x1320, 0x3102], // Ga
		[0x3021, 0x3102], // Gc
		[0x3102, 0x3021], // Gd
		[0x3201, 0x3201], // Ja
		[0x3120, 0x3201], // Jb
		[0x1230, 0x3012], // Na
		[0x3012, 0x3012], // Nb
		[0x0213, 0x3201], // Ra
		[0x2310, 0x3201], // Rb
		[0x1230, 0x3201], // T
		[0x3120, 0x3012], // V
		[0x3201, 0x3012] // Y
	];

	var pllprobs = [
		1, 4, 4, 2,
		4, 4, 2, 4,
		4, 4, 4, 4,
		4, 4, 1, 1,
		4, 4, 4, 4, 4
	];

	var pllfilter = [
		'H', 'Ua', 'Ub', 'Z',
		'Aa', 'Ab', 'E', 'F',
		'Ga', 'Gb', 'Gc', 'Gd',
		'Ja', 'Jb', 'Na', 'Nb',
		'Ra', 'Rb', 'T', 'V', 'Y'
	];

	function getPLLScramble(type, length, cases) {
		Shape_$clinit();
		Square_$clinit();
		var pllcase = pll_map[scrMgr.fixCase(cases, pllprobs)];
		var cc = new SqCubie;
		var rn = mathlib.rn(4) * 0x1111;
		var rn2 = mathlib.rn(4) * 4;
		var ep = (0x4444 - pllcase[0] + rn) & 0x3333;
		var cp = (0x3333 - pllcase[1] + rn) & 0x3333;
		ep = (ep | ep << 16) >> rn2;
		cp = (cp | cp << 16) >> rn2;
		for (var i = 0; i < 4; i++) {
			var c = (cp >> (12 - i * 4) & 0xf) << 1 | 1;
			cc.setPiece(i * 3 + 1, c);
			cc.setPiece(i * 3 + 2, c);
			cc.setPiece((i * 3 + 3) % 12, (ep >> (12 - i * 4) & 0xf) << 1);
		}
		if (mathlib.rn(2) != 0) {
			cc.doMove(1);
		}
		cc.ml = mathlib.rn(2);
		return Search_solution(search, cc);
	}

	function getPLLImage(cases, canvas) {
		Shape_$clinit();
		Square_$clinit();
		var pllcase = pll_map[scrMgr.fixCase(cases, pllprobs)];
		var cc = new SqCubie;
		var ep = (0x4444 - pllcase[0]) & 0x3333;
		var cp = (0x3333 - pllcase[1]) & 0x3333;
		for (var i = 0; i < 4; i++) {
			var c = (cp >> (12 - i * 4) & 0xf) << 1 | 1;
			cc.setPiece(i * 3 + 1, c);
			cc.setPiece(i * 3 + 2, c);
			cc.setPiece((i * 3 + 3) % 12, (ep >> (12 - i * 4) & 0xf) << 1);
		}
		if (!canvas) {
			return [cc, false, null];
		}
		image.sqllImage(cc, false, canvas);
	}

	scrMgr.reg('sqrs', square1SolverGetRandomScramble);
	scrMgr.reg('sqrcsp', getCSPScramble, [cspfilter, cspprobs]);
	scrMgr.reg('sq1pll', getPLLScramble, [pllfilter, pllprobs, getPLLImage]);

	return {
		initialize: $.noop,
		SqCubie: SqCubie,
		getRandomScramble: square1SolverGetRandomScramble
	};

})(mathlib.setNPerm, mathlib.getNPerm, mathlib.circle, mathlib.rn);
