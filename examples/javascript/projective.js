// http://math.stackexchange.com/questions/296794/finding-the-transform-matrix-from-4-projected-points-with-javascript

var Projective = function (kwargs) {
	var self = {};

	kwargs = kwargs || {};
	self.from = kwargs.from || [];
	self.to = kwargs.to || [];

	var A = [];
	var B = [];
	var C = [];
	var Ai = [];
	var Bi = [];
	var Ci = [];
	var T = [];
	var offsetA = [];
	var offsetB = [];

	var projectiveTransform = function () {
		offsetA = self.from[0] || [0,0];
		offsetB = self.to[0] || [0,0];
		var a = [
			[self.from[0][0] - offsetA[0], self.from[1][0] - offsetA[0], self.from[2][0] - offsetA[0]],
			[self.from[0][1] - offsetA[1], self.from[1][1] - offsetA[1], self.from[2][1] - offsetA[1]],
			[1, 1, 1]
		];
		var b = [
			[self.to[0][0] - offsetB[0], self.to[1][0] - offsetB[0], self.to[2][0] - offsetB[0]],
			[self.to[0][1] - offsetB[1], self.to[1][1] - offsetB[1], self.to[2][1] - offsetB[1]],
			[1, 1, 1]
		];
		var x = numeric.solve(a, [self.from[3][0] - offsetA[0], self.from[3][1] - offsetA[1], 1]);
		var y = numeric.solve(b, [self.to[3][0] - offsetB[0], self.to[3][1] - offsetB[1], 1]);
		A = [
			[a[0][0]*x[0], a[0][1]*x[1], a[0][2]*x[2]],
			[a[1][0]*x[0], a[1][1]*x[1], a[1][2]*x[2]],
			[a[2][0]*x[0], a[2][1]*x[1], a[2][2]*x[2]]
		];
		B = [
			[b[0][0]*y[0], b[0][1]*y[1], b[0][2]*y[2]],
			[b[1][0]*y[0], b[1][1]*y[1], b[1][2]*y[2]],
			[b[2][0]*y[0], b[2][1]*y[1], b[2][2]*y[2]]
		];
		Ai = numeric.inv(A);
		Bi = numeric.inv(B);
		C = numeric.dot(B, Ai);
		Ci = numeric.dot(A, Bi);
	};
	var affineTransform = function () {
		A = new Array(2);
		B = new Array(2);
		offsetA = self.from.length > 2 ? self.from.pop() : new Array(2);
		offsetB = self.to.length > 2 ? self.to.pop() : new Array(2);
		for (var i = 0; i < self.from.length; i++) {
			for (var d = 0; d < 2; d++) {
				A[d] = A[d] || [];
				B[d] = B[d] || [];
				offsetA[d] = offsetA[d] || 0;
				offsetB[d] = offsetB[d] || 0;
				A[d][i] = self.from[i][d] - offsetA[d];
				B[d][i] = self.to[i][d] - offsetB[d];
			}
		}

		Ai = numeric.inv(A);
		Bi = numeric.inv(B);
		C = numeric.dot(B, Ai);
		Ci = numeric.dot(A, Bi);
	};

	var init = function () {
		if (self.to.length != self.from.length) {
			if (self.to.length > self.from.length) {
				self.to.length.splice(self.from.length);
			} else {
				self.from.length.splice(self.to.length);
			}
		}
		if (self.from.length < 4) {
			affineTransform();
		} else {
			projectiveTransform();
		}
	};

	self.inverse = function (point) {
		var result;
		if (self.from.length < 4) {
			result = numeric.dot(Ci, [point[0] - offsetB[0], point[1] - offsetB[1]]);
			result = [result[0] + offsetA[0], result[1] + offsetA[1]];
		} else {
			result = numeric.dot(Ci, [point[0] - offsetB[0], point[1] - offsetB[1], 1]);
			result = [result[0]/result[2] + offsetA[0], result[1]/result[2] + offsetA[1]];
		}
		return result;
	};

	self.transform = function (point) {
		var result;
		if (self.from.length < 4) {
			result = numeric.dot(C, [point[0] - offsetA[0], point[1] - offsetA[1]]);
			result = [result[0] + offsetB[0], result[1] + offsetB[1]];
		} else {
			result = numeric.dot(C, [point[0] - offsetA[0], point[1] - offsetA[1], 1]);
			result = [result[0]/result[2] + offsetB[0], result[1]/result[2] + offsetB[1]];
		}
		return result;
	};

	init();

	return self;
};

//if (typeof exports !== "undefined") exports.Projective = Projective;