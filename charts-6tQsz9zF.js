import { At as extend, Bt as isFunction, C as lerp, Et as defaults, Gt as isString, J as parsePercent, K as calculateTextPosition, Lt as isArray, Ot as each, Pt as hasOwn, St as clone, Tt as curry, Ut as isNumber, Xt as map, Y as BoundingRect, Z as Point, f as PathProxy, fn as __extends, in as retrieve3, j as cubicRootAt, k as cubicAt, p as normalizeArcAngles, rn as retrieve2, rt as lerp$1, tt as dist, u as Path, wt as createHashMap, xt as bind } from "./graphic-BAx7jeh4.js";
import { $ as eachSeriesOnAxisOnKey, $r as createSimpleOverallStageHandler, Ai as linearMap, Ar as Polyline, B as createLegacyDataSelectAction, Bi as parsePercent$1, Bn as getLabelStatesModels, Di as isNullableNumberFinite, Dn as passesSanitizationFilter, Dt as createRenderPlanner, En as parseSanitizationFilter, Et as ChartView, Fi as mathMin$2, G as registerAxisContainShapeHandler, Gr as setStatesStylesFromModel, Gt as getCircleLayout, Hn as setLabelStyle, In as makeSeriesEncodeForNameBased, Ir as Group, It as tokens, Kr as toggleHoverEmphasis, Lr as DISPLAY_STATES, Nr as Sector, Ot as createSymbol, Pi as mathMax$2, Q as eachSeriesDealForAxisStat, Qt as convertToColorString, Rr as SPECIAL_STATES, Si as getPercentSeats, St as isOrdinalScale, Tr as LinearGradient, U as throttle, Un as setLabelValueAnimation, Vn as labelInner, Wr as setStatesFlag, Xi as Rect, Xr as getECData, Y as calcBandWidth, Yi as ZRText, Z as eachAxisOnKey, _i as unionExtentFromNumber, _r as initProps, ai as initExtentForUnion, bi as asc, br as saveOldStyle, ci as makeCallOnlyOnce, ct as getTickValueOutermost, et as registerMetricImpl, fn as inheritDefaultOption, hn as isDimensionStacked, i as use, ji as mathAbs, jt as SeriesModel, li as makeInner, mi as queryDataIndex, mr as traverseElements, oi as interpolateRawValues, pi as preparePipelineContext, qi as round, ri as getIncrementalId, ti as defaultEmphasis, tt as requireAxisStatistics, vn as registerLayOutOnCoordSysUsage, xr as updateProps, yi as MAX_SAFE_INTEGER, yn as SeriesData, yr as removeElementWithFadeOut } from "./axisNiceTicks-C_GC5fUj.js";
import { r as prepareSeriesDataSchema, t as createSeriesData } from "./createSeriesData-BbGgr7QR.js";
import { d as shiftLayoutOnXY, f as isCoordinateSystemType, g as getDefaultLabel, h as getDefaultInterpolatedLabel, m as Symbol, o as COORD_SYS_TYPE_CARTESIAN_2D, p as SymbolDraw, s as isCartesian2DInjectedAsDataCoordSys, t as install$4, u as computeLabelGeometry } from "./installSimple-D03HZlVo.js";
//#region node_modules/echarts/lib/chart/line/LineSeries.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var LineSeriesModel = function(_super) {
	__extends(LineSeriesModel, _super);
	function LineSeriesModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = LineSeriesModel.type;
		_this.hasSymbolVisual = true;
		return _this;
	}
	LineSeriesModel.prototype.getInitialData = function(option) {
		return createSeriesData(null, this, { useEncodeDefaulter: true });
	};
	LineSeriesModel.prototype.getLegendIcon = function(opt) {
		var group = new Group();
		var line = createSymbol("line", 0, opt.itemHeight / 2, opt.itemWidth, 0, opt.lineStyle.stroke, false);
		group.add(line);
		line.setStyle(opt.lineStyle);
		var visualType = this.getData().getVisual("symbol");
		var visualRotate = this.getData().getVisual("symbolRotate");
		var symbolType = visualType === "none" ? "circle" : visualType;
		var size = opt.itemHeight * .8;
		var symbol = createSymbol(symbolType, (opt.itemWidth - size) / 2, (opt.itemHeight - size) / 2, size, size, opt.itemStyle.fill);
		group.add(symbol);
		symbol.setStyle(opt.itemStyle);
		symbol.rotation = (opt.iconRotate === "inherit" ? visualRotate : opt.iconRotate || 0) * Math.PI / 180;
		symbol.setOrigin([opt.itemWidth / 2, opt.itemHeight / 2]);
		if (symbolType.indexOf("empty") > -1) {
			symbol.style.stroke = symbol.style.fill;
			symbol.style.fill = tokens.color.neutral00;
			symbol.style.lineWidth = 2;
		}
		return group;
	};
	LineSeriesModel.type = "series.line";
	LineSeriesModel.dependencies = ["grid", "polar"];
	LineSeriesModel.defaultOption = {
		z: 3,
		coordinateSystem: "cartesian2d",
		legendHoverLink: true,
		clip: true,
		label: { position: "top" },
		endLabel: {
			show: false,
			valueAnimation: true,
			distance: 8
		},
		lineStyle: {
			width: 2,
			type: "solid"
		},
		emphasis: { scale: true },
		step: false,
		smooth: false,
		smoothMonotone: null,
		symbol: "emptyCircle",
		symbolSize: 6,
		symbolRotate: null,
		showSymbol: true,
		showAllSymbol: "auto",
		connectNulls: false,
		sampling: "none",
		animationEasing: "linear",
		progressive: 0,
		hoverLayerThreshold: Infinity,
		universalTransition: { divideShape: "clone" },
		/**
		* @deprecated
		*/
		triggerLineEvent: false,
		triggerEvent: false
	};
	return LineSeriesModel;
}(SeriesModel);
//#endregion
//#region node_modules/echarts/lib/chart/line/helper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function prepareDataCoordInfo(coordSys, data, valueOrigin) {
	var baseAxis = coordSys.getBaseAxis();
	var valueAxis = coordSys.getOtherAxis(baseAxis);
	var valueStart = getValueStart(valueAxis, valueOrigin);
	var baseAxisDim = baseAxis.dim;
	var valueAxisDim = valueAxis.dim;
	var valueDim = data.mapDimension(valueAxisDim);
	var baseDim = data.mapDimension(baseAxisDim);
	var baseDataOffset = valueAxisDim === "x" || valueAxisDim === "radius" ? 1 : 0;
	var dims = map(coordSys.dimensions, function(coordDim) {
		return data.mapDimension(coordDim);
	});
	var stacked = false;
	var stackResultDim = data.getCalculationInfo("stackResultDimension");
	if (isDimensionStacked(data, dims[0])) {
		stacked = true;
		dims[0] = stackResultDim;
	}
	if (isDimensionStacked(data, dims[1])) {
		stacked = true;
		dims[1] = stackResultDim;
	}
	return {
		dataDimsForPoint: dims,
		valueStart,
		valueAxisDim,
		baseAxisDim,
		stacked: !!stacked,
		valueDim,
		baseDim,
		baseDataOffset,
		stackedOverDimension: data.getCalculationInfo("stackedOverDimension")
	};
}
function getValueStart(valueAxis, valueOrigin) {
	var valueStart = 0;
	var extent = valueAxis.scale.getExtent();
	if (valueOrigin === "start") valueStart = extent[0];
	else if (valueOrigin === "end") valueStart = extent[1];
	else if (isNumber(valueOrigin) && !isNaN(valueOrigin)) valueStart = valueOrigin;
	else if (extent[0] > 0) valueStart = extent[0];
	else if (extent[1] < 0) valueStart = extent[1];
	return valueStart;
}
function getStackedOnPoint(dataCoordInfo, coordSys, data, idx) {
	var value = NaN;
	if (dataCoordInfo.stacked) value = data.get(data.getCalculationInfo("stackedOverDimension"), idx);
	if (isNaN(value)) value = dataCoordInfo.valueStart;
	var baseDataOffset = dataCoordInfo.baseDataOffset;
	var stackedData = [];
	stackedData[baseDataOffset] = data.get(dataCoordInfo.baseDim, idx);
	stackedData[1 - baseDataOffset] = value;
	return coordSys.dataToPoint(stackedData);
}
function isPointIllegal(xOrY, yOrX) {
	return !isFinite(xOrY) || !isFinite(yOrX);
}
//#endregion
//#region node_modules/echarts/lib/util/vendor.js
var Float32ArrayCtor = typeof Float32Array !== "undefined" ? Float32Array : void 0;
var Float64ArrayCtor = typeof Float64Array !== "undefined" ? Float64Array : void 0;
function createFloat32Array(capacity) {
	return tryEnsureTypedArray({ ctor: Float32ArrayCtor }, capacity).arr;
}
function tryEnsureTypedArray(tyArr, capacity) {
	var existingArr = tyArr.arr;
	var ctor = tyArr.ctor;
	if (capacity > MAX_SAFE_INTEGER) capacity = MAX_SAFE_INTEGER;
	if (!existingArr || tyArr.typed && existingArr.length < capacity) {
		var nextArr = void 0;
		if (ctor) try {
			nextArr = new ctor(capacity);
			tyArr.typed = true;
			existingArr && nextArr.set(existingArr);
		} catch (e) {}
		if (!nextArr) {
			nextArr = [];
			tyArr.typed = false;
			if (existingArr) for (var i = 0, len = existingArr.length; i < len; i++) nextArr[i] = existingArr[i];
		}
		tyArr.arr = nextArr;
	}
	return tyArr;
}
//#endregion
//#region node_modules/echarts/lib/chart/line/lineAnimationDiff.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function diffData(oldData, newData) {
	var diffResult = [];
	newData.diff(oldData).add(function(idx) {
		diffResult.push({
			cmd: "+",
			idx
		});
	}).update(function(newIdx, oldIdx) {
		diffResult.push({
			cmd: "=",
			idx: oldIdx,
			idx1: newIdx
		});
	}).remove(function(idx) {
		diffResult.push({
			cmd: "-",
			idx
		});
	}).execute();
	return diffResult;
}
function lineAnimationDiff(oldData, newData, oldStackedOnPoints, newStackedOnPoints, oldCoordSys, newCoordSys, oldValueOrigin, newValueOrigin) {
	var diff = diffData(oldData, newData);
	var currPoints = [];
	var nextPoints = [];
	var currStackedPoints = [];
	var nextStackedPoints = [];
	var status = [];
	var sortedIndices = [];
	var rawIndices = [];
	var newDataOldCoordInfo = prepareDataCoordInfo(oldCoordSys, newData, oldValueOrigin);
	var oldPoints = oldData.getLayout("points") || [];
	var newPoints = newData.getLayout("points") || [];
	for (var i = 0; i < diff.length; i++) {
		var diffItem = diff[i];
		var pointAdded = true;
		var oldIdx2 = void 0;
		var newIdx2 = void 0;
		switch (diffItem.cmd) {
			case "=":
				oldIdx2 = diffItem.idx * 2;
				newIdx2 = diffItem.idx1 * 2;
				var currentX = oldPoints[oldIdx2];
				var currentY = oldPoints[oldIdx2 + 1];
				var nextX = newPoints[newIdx2];
				var nextY = newPoints[newIdx2 + 1];
				if (isNaN(currentX) || isNaN(currentY)) {
					currentX = nextX;
					currentY = nextY;
				}
				currPoints.push(currentX, currentY);
				nextPoints.push(nextX, nextY);
				currStackedPoints.push(oldStackedOnPoints[oldIdx2], oldStackedOnPoints[oldIdx2 + 1]);
				nextStackedPoints.push(newStackedOnPoints[newIdx2], newStackedOnPoints[newIdx2 + 1]);
				rawIndices.push(newData.getRawIndex(diffItem.idx1));
				break;
			case "+":
				var newIdx = diffItem.idx;
				var newDataDimsForPoint = newDataOldCoordInfo.dataDimsForPoint;
				var oldPt = oldCoordSys.dataToPoint([newData.get(newDataDimsForPoint[0], newIdx), newData.get(newDataDimsForPoint[1], newIdx)]);
				newIdx2 = newIdx * 2;
				currPoints.push(oldPt[0], oldPt[1]);
				nextPoints.push(newPoints[newIdx2], newPoints[newIdx2 + 1]);
				var stackedOnPoint = getStackedOnPoint(newDataOldCoordInfo, oldCoordSys, newData, newIdx);
				currStackedPoints.push(stackedOnPoint[0], stackedOnPoint[1]);
				nextStackedPoints.push(newStackedOnPoints[newIdx2], newStackedOnPoints[newIdx2 + 1]);
				rawIndices.push(newData.getRawIndex(newIdx));
				break;
			case "-": pointAdded = false;
		}
		if (pointAdded) {
			status.push(diffItem);
			sortedIndices.push(sortedIndices.length);
		}
	}
	sortedIndices.sort(function(a, b) {
		return rawIndices[a] - rawIndices[b];
	});
	var len = currPoints.length;
	var sortedCurrPoints = createFloat32Array(len);
	var sortedNextPoints = createFloat32Array(len);
	var sortedCurrStackedPoints = createFloat32Array(len);
	var sortedNextStackedPoints = createFloat32Array(len);
	var sortedStatus = [];
	for (var i = 0; i < sortedIndices.length; i++) {
		var idx = sortedIndices[i];
		var i2 = i * 2;
		var idx2 = idx * 2;
		sortedCurrPoints[i2] = currPoints[idx2];
		sortedCurrPoints[i2 + 1] = currPoints[idx2 + 1];
		sortedNextPoints[i2] = nextPoints[idx2];
		sortedNextPoints[i2 + 1] = nextPoints[idx2 + 1];
		sortedCurrStackedPoints[i2] = currStackedPoints[idx2];
		sortedCurrStackedPoints[i2 + 1] = currStackedPoints[idx2 + 1];
		sortedNextStackedPoints[i2] = nextStackedPoints[idx2];
		sortedNextStackedPoints[i2 + 1] = nextStackedPoints[idx2 + 1];
		sortedStatus[i] = status[idx];
	}
	return {
		current: sortedCurrPoints,
		next: sortedNextPoints,
		stackedOnCurrent: sortedCurrStackedPoints,
		stackedOnNext: sortedNextStackedPoints,
		status: sortedStatus
	};
}
//#endregion
//#region node_modules/echarts/lib/chart/line/poly.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var mathMin$1 = Math.min;
var mathMax$1 = Math.max;
/**
* Draw smoothed line in non-monotone, in may cause undesired curve in extreme
* situations. This should be used when points are non-monotone neither in x or
* y dimension.
*/
function drawSegment(ctx, points, start, segLen, allLen, dir, smooth, smoothMonotone, connectNulls) {
	var prevX;
	var prevY;
	var cpx0;
	var cpy0;
	var cpx1;
	var cpy1;
	var idx = start;
	var k = 0;
	for (; k < segLen; k++) {
		var x = points[idx * 2];
		var y = points[idx * 2 + 1];
		if (idx >= allLen || idx < 0) break;
		if (isPointIllegal(x, y)) {
			if (connectNulls) {
				idx += dir;
				continue;
			}
			break;
		}
		if (idx === start) {
			ctx[dir > 0 ? "moveTo" : "lineTo"](x, y);
			cpx0 = x;
			cpy0 = y;
		} else {
			var dx = x - prevX;
			var dy = y - prevY;
			if (dx * dx + dy * dy < .5) {
				idx += dir;
				continue;
			}
			if (smooth > 0) {
				var nextIdx = idx + dir;
				var nextX = points[nextIdx * 2];
				var nextY = points[nextIdx * 2 + 1];
				while (nextX === x && nextY === y && k < segLen) {
					k++;
					nextIdx += dir;
					idx += dir;
					nextX = points[nextIdx * 2];
					nextY = points[nextIdx * 2 + 1];
					x = points[idx * 2];
					y = points[idx * 2 + 1];
					dx = x - prevX;
					dy = y - prevY;
				}
				var tmpK = k + 1;
				if (connectNulls) while (isPointIllegal(nextX, nextY) && tmpK < segLen) {
					tmpK++;
					nextIdx += dir;
					nextX = points[nextIdx * 2];
					nextY = points[nextIdx * 2 + 1];
				}
				var ratioNextSeg = .5;
				var vx = 0;
				var vy = 0;
				var nextCpx0 = void 0;
				var nextCpy0 = void 0;
				if (tmpK >= segLen || isPointIllegal(nextX, nextY)) {
					cpx1 = x;
					cpy1 = y;
				} else {
					vx = nextX - prevX;
					vy = nextY - prevY;
					var dx0 = x - prevX;
					var dx1 = nextX - x;
					var dy0 = y - prevY;
					var dy1 = nextY - y;
					var lenPrevSeg = void 0;
					var lenNextSeg = void 0;
					if (smoothMonotone === "x") {
						lenPrevSeg = Math.abs(dx0);
						lenNextSeg = Math.abs(dx1);
						var dir_1 = vx > 0 ? 1 : -1;
						cpx1 = x - dir_1 * lenPrevSeg * smooth;
						cpy1 = y;
						nextCpx0 = x + dir_1 * lenNextSeg * smooth;
						nextCpy0 = y;
					} else if (smoothMonotone === "y") {
						lenPrevSeg = Math.abs(dy0);
						lenNextSeg = Math.abs(dy1);
						var dir_2 = vy > 0 ? 1 : -1;
						cpx1 = x;
						cpy1 = y - dir_2 * lenPrevSeg * smooth;
						nextCpx0 = x;
						nextCpy0 = y + dir_2 * lenNextSeg * smooth;
					} else {
						lenPrevSeg = Math.sqrt(dx0 * dx0 + dy0 * dy0);
						lenNextSeg = Math.sqrt(dx1 * dx1 + dy1 * dy1);
						ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);
						cpx1 = x - vx * smooth * (1 - ratioNextSeg);
						cpy1 = y - vy * smooth * (1 - ratioNextSeg);
						nextCpx0 = x + vx * smooth * ratioNextSeg;
						nextCpy0 = y + vy * smooth * ratioNextSeg;
						nextCpx0 = mathMin$1(nextCpx0, mathMax$1(nextX, x));
						nextCpy0 = mathMin$1(nextCpy0, mathMax$1(nextY, y));
						nextCpx0 = mathMax$1(nextCpx0, mathMin$1(nextX, x));
						nextCpy0 = mathMax$1(nextCpy0, mathMin$1(nextY, y));
						vx = nextCpx0 - x;
						vy = nextCpy0 - y;
						cpx1 = x - vx * lenPrevSeg / lenNextSeg;
						cpy1 = y - vy * lenPrevSeg / lenNextSeg;
						cpx1 = mathMin$1(cpx1, mathMax$1(prevX, x));
						cpy1 = mathMin$1(cpy1, mathMax$1(prevY, y));
						cpx1 = mathMax$1(cpx1, mathMin$1(prevX, x));
						cpy1 = mathMax$1(cpy1, mathMin$1(prevY, y));
						vx = x - cpx1;
						vy = y - cpy1;
						nextCpx0 = x + vx * lenNextSeg / lenPrevSeg;
						nextCpy0 = y + vy * lenNextSeg / lenPrevSeg;
					}
				}
				ctx.bezierCurveTo(cpx0, cpy0, cpx1, cpy1, x, y);
				cpx0 = nextCpx0;
				cpy0 = nextCpy0;
			} else ctx.lineTo(x, y);
		}
		prevX = x;
		prevY = y;
		idx += dir;
	}
	return k;
}
var ECPolylineShape = function() {
	function ECPolylineShape() {
		this.smooth = 0;
		this.smoothConstraint = true;
	}
	return ECPolylineShape;
}();
var ECPolyline = function(_super) {
	__extends(ECPolyline, _super);
	function ECPolyline(opts) {
		var _this = _super.call(this, opts) || this;
		_this.type = "ec-polyline";
		return _this;
	}
	ECPolyline.prototype.getDefaultStyle = function() {
		return {
			stroke: tokens.color.neutral99,
			fill: null
		};
	};
	ECPolyline.prototype.getDefaultShape = function() {
		return new ECPolylineShape();
	};
	ECPolyline.prototype.buildPath = function(ctx, shape) {
		var points = shape.points;
		var i = 0;
		var len = points.length / 2;
		if (shape.connectNulls) {
			for (; len > 0; len--) if (!isPointIllegal(points[len * 2 - 2], points[len * 2 - 1])) break;
			for (; i < len; i++) if (!isPointIllegal(points[i * 2], points[i * 2 + 1])) break;
		}
		while (i < len) i += drawSegment(ctx, points, i, len, len, 1, shape.smooth, shape.smoothMonotone, shape.connectNulls) + 1;
	};
	ECPolyline.prototype.getPointOn = function(xOrY, dim) {
		if (!this.path) {
			this.createPathProxy();
			this.buildPath(this.path, this.shape);
		}
		var data = this.path.data;
		var CMD = PathProxy.CMD;
		var x0;
		var y0;
		var isDimX = dim === "x";
		var roots = [];
		for (var i = 0; i < data.length;) {
			var cmd = data[i++];
			var x = void 0;
			var y = void 0;
			var x2 = void 0;
			var y2 = void 0;
			var x3 = void 0;
			var y3 = void 0;
			var t = void 0;
			switch (cmd) {
				case CMD.M:
					x0 = data[i++];
					y0 = data[i++];
					break;
				case CMD.L:
					x = data[i++];
					y = data[i++];
					t = isDimX ? (xOrY - x0) / (x - x0) : (xOrY - y0) / (y - y0);
					if (t <= 1 && t >= 0) {
						var val = isDimX ? (y - y0) * t + y0 : (x - x0) * t + x0;
						return isDimX ? [xOrY, val] : [val, xOrY];
					}
					x0 = x;
					y0 = y;
					break;
				case CMD.C:
					x = data[i++];
					y = data[i++];
					x2 = data[i++];
					y2 = data[i++];
					x3 = data[i++];
					y3 = data[i++];
					var nRoot = isDimX ? cubicRootAt(x0, x, x2, x3, xOrY, roots) : cubicRootAt(y0, y, y2, y3, xOrY, roots);
					if (nRoot > 0) for (var i_1 = 0; i_1 < nRoot; i_1++) {
						var t_1 = roots[i_1];
						if (t_1 <= 1 && t_1 >= 0) {
							var val = isDimX ? cubicAt(y0, y, y2, y3, t_1) : cubicAt(x0, x, x2, x3, t_1);
							return isDimX ? [xOrY, val] : [val, xOrY];
						}
					}
					x0 = x3;
					y0 = y3;
			}
		}
	};
	return ECPolyline;
}(Path);
var ECPolygonShape = function(_super) {
	__extends(ECPolygonShape, _super);
	function ECPolygonShape() {
		return _super !== null && _super.apply(this, arguments) || this;
	}
	return ECPolygonShape;
}(ECPolylineShape);
var ECPolygon = function(_super) {
	__extends(ECPolygon, _super);
	function ECPolygon(opts) {
		var _this = _super.call(this, opts) || this;
		_this.type = "ec-polygon";
		return _this;
	}
	ECPolygon.prototype.getDefaultShape = function() {
		return new ECPolygonShape();
	};
	ECPolygon.prototype.buildPath = function(ctx, shape) {
		var points = shape.points;
		var stackedOnPoints = shape.stackedOnPoints;
		var i = 0;
		var len = points.length / 2;
		var smoothMonotone = shape.smoothMonotone;
		if (shape.connectNulls) {
			for (; len > 0; len--) if (!isPointIllegal(points[len * 2 - 2], points[len * 2 - 1])) break;
			for (; i < len; i++) if (!isPointIllegal(points[i * 2], points[i * 2 + 1])) break;
		}
		while (i < len) {
			var k = drawSegment(ctx, points, i, len, len, 1, shape.smooth, smoothMonotone, shape.connectNulls);
			drawSegment(ctx, stackedOnPoints, i + k - 1, k, len, -1, shape.stackedOnSmooth, smoothMonotone, shape.connectNulls);
			i += k + 1;
			ctx.closePath();
		}
	};
	return ECPolygon;
}(Path);
//#endregion
//#region node_modules/echarts/lib/chart/helper/createClipPathFromCoordSys.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function createGridClipPath(cartesian, hasAnimation, seriesModel, done, during) {
	var rect = cartesian.getArea();
	var x = rect.x;
	var y = rect.y;
	var width = rect.width;
	var height = rect.height;
	var lineWidth = seriesModel.get(["lineStyle", "width"]) || 0;
	x -= lineWidth / 2;
	y -= lineWidth / 2;
	width += lineWidth;
	height += lineWidth;
	width = Math.ceil(width);
	if (x !== Math.floor(x)) {
		x = Math.floor(x);
		width++;
	}
	var clipPath = new Rect({ shape: {
		x,
		y,
		width,
		height
	} });
	if (hasAnimation) {
		var baseAxis = cartesian.getBaseAxis();
		var isHorizontal = baseAxis.isHorizontal();
		var isAxisInversed = baseAxis.inverse;
		if (isHorizontal) {
			if (isAxisInversed) clipPath.shape.x += width;
			clipPath.shape.width = 0;
		} else {
			if (!isAxisInversed) clipPath.shape.y += height;
			clipPath.shape.height = 0;
		}
		var duringCb = isFunction(during) ? function(percent) {
			during(percent, clipPath);
		} : null;
		initProps(clipPath, { shape: {
			width,
			height,
			x,
			y
		} }, seriesModel, null, done, duringCb);
	}
	return clipPath;
}
function createPolarClipPath(polar, hasAnimation, seriesModel) {
	var sectorArea = polar.getArea();
	var r0 = round(sectorArea.r0, 1);
	var r = round(sectorArea.r, 1);
	var clipPath = new Sector({ shape: {
		cx: round(polar.cx, 1),
		cy: round(polar.cy, 1),
		r0,
		r,
		startAngle: sectorArea.startAngle,
		endAngle: sectorArea.endAngle,
		clockwise: sectorArea.clockwise
	} });
	if (hasAnimation) {
		if (polar.getBaseAxis().dim === "angle") clipPath.shape.endAngle = sectorArea.startAngle;
		else clipPath.shape.r = r0;
		initProps(clipPath, { shape: {
			endAngle: sectorArea.endAngle,
			r
		} }, seriesModel);
	}
	return clipPath;
}
function createClipPath(coordSys, hasAnimation, seriesModel, done, during) {
	if (!coordSys) return null;
	else if (coordSys.type === "polar") return createPolarClipPath(coordSys, hasAnimation, seriesModel);
	else if (coordSys.type === "cartesian2d") return createGridClipPath(coordSys, hasAnimation, seriesModel, done, during);
	return null;
}
function createCoordSysClipAreaSimply(seriesModel) {
	var coordSys = seriesModel.coordinateSystem;
	if (seriesModel.get("clip", true) && coordSys && (!coordSys.shouldClip || coordSys.shouldClip())) return coordSys.getArea && coordSys.getArea(.1);
}
//#endregion
//#region node_modules/echarts/lib/chart/line/LineView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function isPointsSame(points1, points2) {
	if (points1.length !== points2.length) return;
	for (var i = 0; i < points1.length; i++) if (points1[i] !== points2[i]) return;
	return true;
}
function xyExtentFromPoints(points) {
	var xExtent = initExtentForUnion();
	var yExtent = initExtentForUnion();
	for (var i = 0; i < points.length;) {
		var x = points[i++];
		var y = points[i++];
		if (!isPointIllegal(x, y)) {
			unionExtentFromNumber(xExtent, x);
			unionExtentFromNumber(yExtent, y);
		}
	}
	return [xExtent, yExtent];
}
function getBoundingDiff(points1, points2) {
	var _a = xyExtentFromPoints(points1), xExtent1 = _a[0], yExtent1 = _a[1];
	var _b = xyExtentFromPoints(points2), xExtent2 = _b[0], yExtent2 = _b[1];
	return Math.max(Math.abs(xExtent1[0] - xExtent2[0]), Math.abs(yExtent1[0] - yExtent2[0]), Math.abs(xExtent1[1] - xExtent2[1]), Math.abs(yExtent1[1] - yExtent2[1]));
}
function getSmooth(smooth) {
	return isNumber(smooth) ? smooth : smooth ? .5 : 0;
}
function getStackedOnPoints(coordSys, data, dataCoordInfo) {
	if (dataCoordInfo.valueDim == null) return [];
	var len = data.count();
	var points = createFloat32Array(len * 2);
	for (var idx = 0; idx < len; idx++) {
		var pt = getStackedOnPoint(dataCoordInfo, coordSys, data, idx);
		points[idx * 2] = pt[0];
		points[idx * 2 + 1] = pt[1];
	}
	return points;
}
/**
* Filter the null data and extend data for step considering `stepTurnAt`
*
* @param points data to convert, that may containing null
* @param basePoints base data to reference, used only for areaStyle points
* @param coordSys coordinate system
* @param stepTurnAt 'start' | 'end' | 'middle' | true
* @param connectNulls whether to connect nulls
* @returns converted point positions
*/
function turnPointsIntoStep(points, basePoints, coordSys, stepTurnAt, connectNulls) {
	var baseAxis = coordSys.getBaseAxis();
	var baseIndex = baseAxis.dim === "x" || baseAxis.dim === "radius" ? 0 : 1;
	var stepPoints = [];
	var i = 0;
	var stepPt = [];
	var pt = [];
	var nextPt = [];
	var filteredPoints = [];
	if (connectNulls) {
		for (i = 0; i < points.length; i += 2) {
			/**
			* For areaStyle of stepped lines, `stackedOnPoints` should be
			* filtered the same as `points` so that the base axis values
			* should stay the same as the lines above. See #20021
			*/
			var reference = basePoints || points;
			if (!isPointIllegal(reference[i], reference[i + 1])) filteredPoints.push(points[i], points[i + 1]);
		}
		points = filteredPoints;
	}
	for (i = 0; i < points.length - 2; i += 2) {
		nextPt[0] = points[i + 2];
		nextPt[1] = points[i + 3];
		pt[0] = points[i];
		pt[1] = points[i + 1];
		stepPoints.push(pt[0], pt[1]);
		switch (stepTurnAt) {
			case "end":
				stepPt[baseIndex] = nextPt[baseIndex];
				stepPt[1 - baseIndex] = pt[1 - baseIndex];
				stepPoints.push(stepPt[0], stepPt[1]);
				break;
			case "middle":
				var middle = (pt[baseIndex] + nextPt[baseIndex]) / 2;
				var stepPt2 = [];
				stepPt[baseIndex] = stepPt2[baseIndex] = middle;
				stepPt[1 - baseIndex] = pt[1 - baseIndex];
				stepPt2[1 - baseIndex] = nextPt[1 - baseIndex];
				stepPoints.push(stepPt[0], stepPt[1]);
				stepPoints.push(stepPt2[0], stepPt2[1]);
				break;
			default:
				stepPt[baseIndex] = pt[baseIndex];
				stepPt[1 - baseIndex] = nextPt[1 - baseIndex];
				stepPoints.push(stepPt[0], stepPt[1]);
		}
	}
	stepPoints.push(points[i++], points[i++]);
	return stepPoints;
}
/**
* Clip color stops to edge. Avoid creating too large gradients.
* Which may lead to blurry when GPU acceleration is enabled. See #15680
*
* The stops has been sorted from small to large.
*/
function clipColorStops(colorStops, maxSize) {
	var newColorStops = [];
	var len = colorStops.length;
	var prevOutOfRangeColorStop;
	var prevInRangeColorStop;
	function lerpStop(stop0, stop1, clippedCoord) {
		var coord0 = stop0.coord;
		var p = (clippedCoord - coord0) / (stop1.coord - coord0);
		return {
			coord: clippedCoord,
			color: lerp(p, [stop0.color, stop1.color])
		};
	}
	for (var i = 0; i < len; i++) {
		var stop_1 = colorStops[i];
		var coord = stop_1.coord;
		if (coord < 0) prevOutOfRangeColorStop = stop_1;
		else if (coord > maxSize) {
			if (prevInRangeColorStop) newColorStops.push(lerpStop(prevInRangeColorStop, stop_1, maxSize));
			else if (prevOutOfRangeColorStop) newColorStops.push(lerpStop(prevOutOfRangeColorStop, stop_1, 0), lerpStop(prevOutOfRangeColorStop, stop_1, maxSize));
			break;
		} else {
			if (prevOutOfRangeColorStop) {
				newColorStops.push(lerpStop(prevOutOfRangeColorStop, stop_1, 0));
				prevOutOfRangeColorStop = null;
			}
			newColorStops.push(stop_1);
			prevInRangeColorStop = stop_1;
		}
	}
	return newColorStops;
}
function getVisualGradient(data, coordSys, api) {
	var visualMetaList = data.getVisual("visualMeta");
	if (!visualMetaList || !visualMetaList.length || !data.count()) return;
	if (coordSys.type !== "cartesian2d") return;
	var coordDim;
	var visualMeta;
	for (var i = visualMetaList.length - 1; i >= 0; i--) {
		var dimInfo = data.getDimensionInfo(visualMetaList[i].dimension);
		coordDim = dimInfo && dimInfo.coordDim;
		if (coordDim === "x" || coordDim === "y") {
			visualMeta = visualMetaList[i];
			break;
		}
	}
	if (!visualMeta) return;
	var axis = coordSys.getAxis(coordDim);
	var colorStops = map(visualMeta.stops, function(stop) {
		return {
			coord: axis.toGlobalCoord(axis.dataToCoord(stop.value)),
			color: stop.color
		};
	});
	var stopLen = colorStops.length;
	var outerColors = visualMeta.outerColors.slice();
	if (stopLen && colorStops[0].coord > colorStops[stopLen - 1].coord) {
		colorStops.reverse();
		outerColors.reverse();
	}
	var colorStopsInRange = clipColorStops(colorStops, coordDim === "x" ? api.getWidth() : api.getHeight());
	var inRangeStopLen = colorStopsInRange.length;
	if (!inRangeStopLen && stopLen) return colorStops[0].coord < 0 ? outerColors[1] ? outerColors[1] : colorStops[stopLen - 1].color : outerColors[0] ? outerColors[0] : colorStops[0].color;
	var tinyExtent = 10;
	var minCoord = colorStopsInRange[0].coord - tinyExtent;
	var maxCoord = colorStopsInRange[inRangeStopLen - 1].coord + tinyExtent;
	var coordSpan = maxCoord - minCoord;
	if (coordSpan < .001) return "transparent";
	each(colorStopsInRange, function(stop) {
		stop.offset = (stop.coord - minCoord) / coordSpan;
	});
	colorStopsInRange.push({
		offset: inRangeStopLen ? colorStopsInRange[inRangeStopLen - 1].offset : .5,
		color: outerColors[1] || "transparent"
	});
	colorStopsInRange.unshift({
		offset: inRangeStopLen ? colorStopsInRange[0].offset : .5,
		color: outerColors[0] || "transparent"
	});
	var gradient = new LinearGradient(0, 0, 0, 0, colorStopsInRange, true);
	gradient[coordDim] = minCoord;
	gradient[coordDim + "2"] = maxCoord;
	return gradient;
}
function getIsIgnoreFunc(seriesModel, data, coordSys) {
	var showAllSymbol = seriesModel.get("showAllSymbol");
	var isAuto = showAllSymbol === "auto";
	if (showAllSymbol && !isAuto) return;
	var categoryAxis = coordSys.getAxesByScale("ordinal")[0];
	if (!categoryAxis) return;
	if (isAuto && canShowAllSymbolForCategory(categoryAxis, data)) return;
	var categoryDataDim = data.mapDimension(categoryAxis.dim);
	var labelMap = {};
	each(categoryAxis.getViewLabels(), function(labelItem) {
		if (!labelItem.tick.offInterval) labelMap[getTickValueOutermost(categoryAxis.scale, labelItem.tick)] = 1;
	});
	return function(dataIndex) {
		return !labelMap.hasOwnProperty(data.get(categoryDataDim, dataIndex));
	};
}
function canShowAllSymbolForCategory(categoryAxis, data) {
	var axisExtent = categoryAxis.getExtent();
	var availSize = Math.abs(axisExtent[1] - axisExtent[0]) / categoryAxis.scale.count();
	isNaN(availSize) && (availSize = 0);
	var dataLen = data.count();
	var step = Math.max(1, Math.round(dataLen / 5));
	for (var dataIndex = 0; dataIndex < dataLen; dataIndex += step) if (Symbol.getSymbolSize(data, dataIndex)[categoryAxis.isHorizontal() ? 1 : 0] * 1.5 > availSize) return false;
	return true;
}
function getLastIndexNotNull(points) {
	var len = points.length / 2;
	for (; len > 0; len--) if (!isPointIllegal(points[len * 2 - 2], points[len * 2 - 1])) break;
	return len - 1;
}
function getPointAtIndex(points, idx) {
	return [points[idx * 2], points[idx * 2 + 1]];
}
function getIndexRange(points, xOrY, dim) {
	var len = points.length / 2;
	var dimIdx = dim === "x" ? 0 : 1;
	var a;
	var b;
	var prevIndex = 0;
	var nextIndex = -1;
	for (var i = 0; i < len; i++) {
		b = points[i * 2 + dimIdx];
		if (isPointIllegal(b, points[i * 2 + 1 - dimIdx])) continue;
		if (i === 0) {
			a = b;
			continue;
		}
		if (a <= xOrY && b >= xOrY || a >= xOrY && b <= xOrY) {
			nextIndex = i;
			break;
		}
		prevIndex = i;
		a = b;
	}
	return {
		range: [prevIndex, nextIndex],
		t: (xOrY - a) / (b - a)
	};
}
function anyStateShowEndLabel(seriesModel) {
	if (seriesModel.get(["endLabel", "show"])) return true;
	for (var i = 0; i < SPECIAL_STATES.length; i++) if (seriesModel.get([
		SPECIAL_STATES[i],
		"endLabel",
		"show"
	])) return true;
	return false;
}
function createLineClipPath(lineView, coordSys, hasAnimation, seriesModel) {
	if (isCoordinateSystemType(coordSys, "cartesian2d")) {
		var endLabelModel_1 = seriesModel.getModel("endLabel");
		var valueAnimation_1 = endLabelModel_1.get("valueAnimation");
		var data_1 = seriesModel.getData();
		var labelAnimationRecord_1 = { lastFrameIndex: 0 };
		var during = anyStateShowEndLabel(seriesModel) ? function(percent, clipRect) {
			lineView._endLabelOnDuring(percent, clipRect, data_1, labelAnimationRecord_1, valueAnimation_1, endLabelModel_1, coordSys);
		} : null;
		var isHorizontal = coordSys.getBaseAxis().isHorizontal();
		var clipPath = createGridClipPath(coordSys, hasAnimation, seriesModel, function() {
			var endLabel = lineView._endLabel;
			if (endLabel && hasAnimation) {
				if (labelAnimationRecord_1.originalX != null) endLabel.attr({
					x: labelAnimationRecord_1.originalX,
					y: labelAnimationRecord_1.originalY
				});
			}
		}, during);
		if (!seriesModel.get("clip", true)) {
			var rectShape = clipPath.shape;
			var expandSize = Math.max(rectShape.width, rectShape.height);
			if (isHorizontal) {
				rectShape.y -= expandSize;
				rectShape.height += expandSize * 2;
			} else {
				rectShape.x -= expandSize;
				rectShape.width += expandSize * 2;
			}
		}
		if (during) during(1, clipPath);
		return clipPath;
	} else return createPolarClipPath(coordSys, hasAnimation, seriesModel);
}
function getEndLabelStateSpecified(endLabelModel, coordSys) {
	var baseAxis = coordSys.getBaseAxis();
	var isHorizontal = baseAxis.isHorizontal();
	var isBaseInversed = baseAxis.inverse;
	var align = isHorizontal ? isBaseInversed ? "right" : "left" : "center";
	var verticalAlign = isHorizontal ? "middle" : isBaseInversed ? "top" : "bottom";
	return { normal: {
		align: endLabelModel.get("align") || align,
		verticalAlign: endLabelModel.get("verticalAlign") || verticalAlign
	} };
}
var LineView = function(_super) {
	__extends(LineView, _super);
	function LineView() {
		return _super !== null && _super.apply(this, arguments) || this;
	}
	LineView.prototype.init = function() {
		var lineGroup = new Group();
		var symbolDraw = new SymbolDraw();
		this.group.add(symbolDraw.group);
		this._symbolDraw = symbolDraw;
		this._lineGroup = lineGroup;
		this._changePolyState = bind(this._changePolyState, this);
	};
	LineView.prototype.render = function(seriesModel, ecModel, api) {
		var coordSys = seriesModel.coordinateSystem;
		var group = this.group;
		var data = seriesModel.getData();
		var lineStyleModel = seriesModel.getModel("lineStyle");
		var areaStyleModel = seriesModel.getModel("areaStyle");
		var points = data.getLayout("points") || [];
		var isCoordSysPolar = coordSys.type === "polar";
		var prevCoordSys = this._coordSys;
		var symbolDraw = this._symbolDraw;
		var polyline = this._polyline;
		var polygon = this._polygon;
		var lineGroup = this._lineGroup;
		var hasAnimation = !ecModel.ssr && seriesModel.get("animation");
		var isAreaChart = !areaStyleModel.isEmpty();
		var valueOrigin = areaStyleModel.get("origin");
		var dataCoordInfo = prepareDataCoordInfo(coordSys, data, valueOrigin);
		var stackedOnPoints = isAreaChart && getStackedOnPoints(coordSys, data, dataCoordInfo);
		var showSymbol = seriesModel.get("showSymbol");
		var connectNulls = seriesModel.get("connectNulls");
		var isIgnoreFunc = showSymbol && !isCoordSysPolar && getIsIgnoreFunc(seriesModel, data, coordSys);
		var oldData = this._data;
		oldData && oldData.eachItemGraphicEl(function(el, idx) {
			if (el.__temp) {
				group.remove(el);
				oldData.setItemGraphicEl(idx, null);
			}
		});
		if (!showSymbol) symbolDraw.remove();
		group.add(lineGroup);
		var step = !isCoordSysPolar ? seriesModel.get("step") : false;
		var clipShapeForSymbol;
		if (coordSys && coordSys.getArea && seriesModel.get("clip", true)) {
			clipShapeForSymbol = coordSys.getArea();
			if (clipShapeForSymbol.width != null) {
				clipShapeForSymbol.x -= .1;
				clipShapeForSymbol.y -= .1;
				clipShapeForSymbol.width += .2;
				clipShapeForSymbol.height += .2;
			} else if (clipShapeForSymbol.r0) {
				clipShapeForSymbol.r0 -= .5;
				clipShapeForSymbol.r += .5;
			}
		}
		this._clipShapeForSymbol = clipShapeForSymbol;
		var visualColor = getVisualGradient(data, coordSys, api) || data.getVisual("style")[data.getVisual("drawType")];
		if (!(polyline && prevCoordSys.type === coordSys.type && step === this._step)) {
			showSymbol && symbolDraw.updateData(data, {
				isIgnore: isIgnoreFunc,
				clipShape: clipShapeForSymbol,
				disableAnimation: true,
				getSymbolPoint: function(idx) {
					return [points[idx * 2], points[idx * 2 + 1]];
				}
			});
			hasAnimation && this._initSymbolLabelAnimation(data, coordSys, clipShapeForSymbol);
			if (step) {
				if (stackedOnPoints) stackedOnPoints = turnPointsIntoStep(stackedOnPoints, points, coordSys, step, connectNulls);
				points = turnPointsIntoStep(points, null, coordSys, step, connectNulls);
			}
			polyline = this._newPolyline(points);
			if (isAreaChart) polygon = this._newPolygon(points, stackedOnPoints);
			else if (polygon) {
				lineGroup.remove(polygon);
				polygon = this._polygon = null;
			}
			if (!isCoordSysPolar) this._initOrUpdateEndLabel(seriesModel, coordSys, convertToColorString(visualColor));
			lineGroup.setClipPath(createLineClipPath(this, coordSys, true, seriesModel));
		} else {
			if (isAreaChart && !polygon) polygon = this._newPolygon(points, stackedOnPoints);
			else if (polygon && !isAreaChart) {
				lineGroup.remove(polygon);
				polygon = this._polygon = null;
			}
			if (!isCoordSysPolar) this._initOrUpdateEndLabel(seriesModel, coordSys, convertToColorString(visualColor));
			var oldClipPath = lineGroup.getClipPath();
			if (oldClipPath) {
				var newClipPath = createLineClipPath(this, coordSys, false, seriesModel);
				initProps(oldClipPath, { shape: newClipPath.shape }, seriesModel);
			} else lineGroup.setClipPath(createLineClipPath(this, coordSys, true, seriesModel));
			showSymbol && symbolDraw.updateData(data, {
				isIgnore: isIgnoreFunc,
				clipShape: clipShapeForSymbol,
				disableAnimation: true,
				getSymbolPoint: function(idx) {
					return [points[idx * 2], points[idx * 2 + 1]];
				}
			});
			if (!isPointsSame(this._stackedOnPoints, stackedOnPoints) || !isPointsSame(this._points, points)) {
				if (hasAnimation) this._doUpdateAnimation(data, stackedOnPoints, coordSys, api, step, valueOrigin, connectNulls);
				else {
					if (step) {
						if (stackedOnPoints) stackedOnPoints = turnPointsIntoStep(stackedOnPoints, points, coordSys, step, connectNulls);
						points = turnPointsIntoStep(points, null, coordSys, step, connectNulls);
					}
					polyline.setShape({ points });
					polygon && polygon.setShape({
						points,
						stackedOnPoints
					});
				}
			}
		}
		var emphasisModel = seriesModel.getModel("emphasis");
		var focus = emphasisModel.get("focus");
		var blurScope = emphasisModel.get("blurScope");
		var emphasisDisabled = emphasisModel.get("disabled");
		polyline.useStyle(defaults(lineStyleModel.getLineStyle(), {
			fill: "none",
			stroke: visualColor,
			lineJoin: "bevel"
		}));
		setStatesStylesFromModel(polyline, seriesModel, "lineStyle");
		if (polyline.style.lineWidth > 0 && seriesModel.get([
			"emphasis",
			"lineStyle",
			"width"
		]) === "bolder") {
			var emphasisLineStyle = polyline.getState("emphasis").style;
			emphasisLineStyle.lineWidth = +polyline.style.lineWidth + 1;
		}
		getECData(polyline).seriesIndex = seriesModel.seriesIndex;
		toggleHoverEmphasis(polyline, focus, blurScope, emphasisDisabled);
		var smooth = getSmooth(seriesModel.get("smooth"));
		var smoothMonotone = seriesModel.get("smoothMonotone");
		polyline.setShape({
			smooth,
			smoothMonotone,
			connectNulls
		});
		if (polygon) {
			var stackedOnSeries = data.getCalculationInfo("stackedOnSeries");
			var stackedOnSmooth = 0;
			polygon.useStyle(defaults(areaStyleModel.getAreaStyle(), {
				fill: visualColor,
				opacity: .7,
				lineJoin: "bevel",
				decal: data.getVisual("style").decal
			}));
			if (stackedOnSeries) stackedOnSmooth = getSmooth(stackedOnSeries.get("smooth"));
			polygon.setShape({
				smooth,
				stackedOnSmooth,
				smoothMonotone,
				connectNulls
			});
			setStatesStylesFromModel(polygon, seriesModel, "areaStyle");
			getECData(polygon).seriesIndex = seriesModel.seriesIndex;
			toggleHoverEmphasis(polygon, focus, blurScope, emphasisDisabled);
		}
		var changePolyState = this._changePolyState;
		data.eachItemGraphicEl(function(el) {
			el && (el.onHoverStateChange = changePolyState);
		});
		this._polyline.onHoverStateChange = changePolyState;
		this._data = data;
		this._coordSys = coordSys;
		this._stackedOnPoints = stackedOnPoints;
		this._points = points;
		this._step = step;
		this._valueOrigin = valueOrigin;
		var triggerEvent = seriesModel.get("triggerEvent");
		var triggerLineEvent = seriesModel.get("triggerLineEvent");
		var shouldTriggerLineEvent = triggerLineEvent === true || triggerEvent === true || triggerEvent === "line";
		var shouldTriggerAreaEvent = triggerLineEvent === true || triggerEvent === true || triggerEvent === "area";
		this.packEventData(seriesModel, polyline, shouldTriggerLineEvent);
		polygon && this.packEventData(seriesModel, polygon, shouldTriggerAreaEvent);
	};
	LineView.prototype.packEventData = function(seriesModel, el, enable) {
		getECData(el).eventData = enable ? {
			componentType: "series",
			componentSubType: "line",
			componentIndex: seriesModel.componentIndex,
			seriesIndex: seriesModel.seriesIndex,
			seriesName: seriesModel.name,
			seriesType: "line",
			selfType: el === this._polygon ? "area" : "line"
		} : null;
	};
	LineView.prototype.highlight = function(seriesModel, ecModel, api, payload) {
		var data = seriesModel.getData();
		var dataIndex = queryDataIndex(data, payload);
		this._changePolyState("emphasis");
		if (!(dataIndex instanceof Array) && dataIndex != null && dataIndex >= 0) {
			var points = data.getLayout("points");
			var symbol = data.getItemGraphicEl(dataIndex);
			if (!symbol) {
				var x = points[dataIndex * 2];
				var y = points[dataIndex * 2 + 1];
				if (isPointIllegal(x, y)) return;
				if (this._clipShapeForSymbol && !this._clipShapeForSymbol.contain(x, y)) return;
				var zlevel = seriesModel.get("zlevel") || 0;
				var z = seriesModel.get("z") || 0;
				symbol = new Symbol(data, dataIndex);
				symbol.x = x;
				symbol.y = y;
				symbol.setZ(zlevel, z);
				var symbolLabel = symbol.getSymbolPath().getTextContent();
				if (symbolLabel) {
					symbolLabel.zlevel = zlevel;
					symbolLabel.z = z;
					symbolLabel.z2 = this._polyline.z2 + 1;
				}
				symbol.__temp = true;
				data.setItemGraphicEl(dataIndex, symbol);
				symbol.stopSymbolAnimation(true);
				this.group.add(symbol);
			}
			symbol.highlight();
		} else ChartView.prototype.highlight.call(this, seriesModel, ecModel, api, payload);
	};
	LineView.prototype.downplay = function(seriesModel, ecModel, api, payload) {
		var data = seriesModel.getData();
		var dataIndex = queryDataIndex(data, payload);
		this._changePolyState("normal");
		if (dataIndex != null && dataIndex >= 0) {
			var symbol = data.getItemGraphicEl(dataIndex);
			if (symbol) {
				if (symbol.__temp) {
					data.setItemGraphicEl(dataIndex, null);
					this.group.remove(symbol);
				} else symbol.downplay();
			}
		} else ChartView.prototype.downplay.call(this, seriesModel, ecModel, api, payload);
	};
	LineView.prototype._changePolyState = function(toState) {
		var polygon = this._polygon;
		setStatesFlag(this._polyline, toState);
		polygon && setStatesFlag(polygon, toState);
	};
	LineView.prototype._newPolyline = function(points) {
		var polyline = this._polyline;
		if (polyline) this._lineGroup.remove(polyline);
		polyline = new ECPolyline({
			shape: { points },
			segmentIgnoreThreshold: 2,
			z2: 10
		});
		this._lineGroup.add(polyline);
		this._polyline = polyline;
		return polyline;
	};
	LineView.prototype._newPolygon = function(points, stackedOnPoints) {
		var polygon = this._polygon;
		if (polygon) this._lineGroup.remove(polygon);
		polygon = new ECPolygon({
			shape: {
				points,
				stackedOnPoints
			},
			segmentIgnoreThreshold: 2
		});
		this._lineGroup.add(polygon);
		this._polygon = polygon;
		return polygon;
	};
	LineView.prototype._initSymbolLabelAnimation = function(data, coordSys, clipShape) {
		var isHorizontalOrRadial;
		var isCoordSysPolar;
		var baseAxis = coordSys.getBaseAxis();
		var isAxisInverse = baseAxis.inverse;
		if (coordSys.type === "cartesian2d") {
			isHorizontalOrRadial = baseAxis.isHorizontal();
			isCoordSysPolar = false;
		} else if (coordSys.type === "polar") {
			isHorizontalOrRadial = baseAxis.dim === "angle";
			isCoordSysPolar = true;
		}
		var seriesModel = data.hostModel;
		var seriesDuration = seriesModel.get("animationDuration");
		if (isFunction(seriesDuration)) seriesDuration = seriesDuration(null);
		var seriesDelay = seriesModel.get("animationDelay") || 0;
		var seriesDelayValue = isFunction(seriesDelay) ? seriesDelay(null) : seriesDelay;
		data.eachItemGraphicEl(function(symbol, idx) {
			var el = symbol;
			if (el) {
				var point = [symbol.x, symbol.y];
				var start = void 0;
				var end = void 0;
				var current = void 0;
				if (clipShape) {
					if (isCoordSysPolar) {
						var polarClip = clipShape;
						var coord = coordSys.pointToCoord(point);
						if (isHorizontalOrRadial) {
							start = polarClip.startAngle;
							end = polarClip.endAngle;
							current = -coord[1] / 180 * Math.PI;
						} else {
							start = polarClip.r0;
							end = polarClip.r;
							current = coord[0];
						}
					} else {
						var gridClip = clipShape;
						if (isHorizontalOrRadial) {
							start = gridClip.x;
							end = gridClip.x + gridClip.width;
							current = symbol.x;
						} else {
							start = gridClip.y + gridClip.height;
							end = gridClip.y;
							current = symbol.y;
						}
					}
				}
				var ratio = end === start ? 0 : (current - start) / (end - start);
				if (isAxisInverse) ratio = 1 - ratio;
				var delay = isFunction(seriesDelay) ? seriesDelay(idx) : seriesDuration * ratio + seriesDelayValue;
				var symbolPath = el.getSymbolPath();
				var text = symbolPath.getTextContent();
				el.attr({
					scaleX: 0,
					scaleY: 0
				});
				el.animateTo({
					scaleX: 1,
					scaleY: 1
				}, {
					duration: 200,
					setToFinal: true,
					delay
				});
				if (text) text.animateFrom({ style: { opacity: 0 } }, {
					duration: 300,
					delay
				});
				symbolPath.disableLabelAnimation = true;
			}
		});
	};
	LineView.prototype._initOrUpdateEndLabel = function(seriesModel, coordSys, inheritColor) {
		var endLabelModel = seriesModel.getModel("endLabel");
		if (anyStateShowEndLabel(seriesModel)) {
			var data_2 = seriesModel.getData();
			var polyline = this._polyline;
			var points = data_2.getLayout("points");
			if (!points) {
				polyline.removeTextContent();
				this._endLabel = null;
				return;
			}
			var endLabel = this._endLabel;
			if (!endLabel) {
				endLabel = this._endLabel = new ZRText({ z2: 200 });
				endLabel.ignoreClip = true;
				polyline.setTextContent(this._endLabel);
				polyline.disableLabelAnimation = true;
			}
			var dataIndex = getLastIndexNotNull(points);
			if (dataIndex >= 0) {
				setLabelStyle(polyline, getLabelStatesModels(seriesModel, "endLabel"), {
					inheritColor,
					labelFetcher: seriesModel,
					labelDataIndex: dataIndex,
					defaultText: function(dataIndex, opt, interpolatedValue) {
						return interpolatedValue != null ? getDefaultInterpolatedLabel(data_2, interpolatedValue) : getDefaultLabel(data_2, dataIndex);
					},
					enableTextSetter: true
				}, getEndLabelStateSpecified(endLabelModel, coordSys));
				polyline.textConfig.position = null;
			}
		} else if (this._endLabel) {
			this._polyline.removeTextContent();
			this._endLabel = null;
		}
	};
	LineView.prototype._endLabelOnDuring = function(percent, clipRect, data, animationRecord, valueAnimation, endLabelModel, coordSys) {
		var endLabel = this._endLabel;
		var polyline = this._polyline;
		if (endLabel) {
			if (percent < 1 && animationRecord.originalX == null) {
				animationRecord.originalX = endLabel.x;
				animationRecord.originalY = endLabel.y;
			}
			var points = data.getLayout("points");
			var seriesModel = data.hostModel;
			var connectNulls = seriesModel.get("connectNulls");
			var precision = endLabelModel.get("precision");
			var distance = endLabelModel.get("distance") || 0;
			var baseAxis = coordSys.getBaseAxis();
			var isHorizontal = baseAxis.isHorizontal();
			var isBaseInversed = baseAxis.inverse;
			var clipShape = clipRect.shape;
			var xOrY = isBaseInversed ? isHorizontal ? clipShape.x : clipShape.y + clipShape.height : isHorizontal ? clipShape.x + clipShape.width : clipShape.y;
			var distanceX = (isHorizontal ? distance : 0) * (isBaseInversed ? -1 : 1);
			var distanceY = (isHorizontal ? 0 : -distance) * (isBaseInversed ? -1 : 1);
			var dim = isHorizontal ? "x" : "y";
			var dataIndexRange = getIndexRange(points, xOrY, dim);
			var indices = dataIndexRange.range;
			var diff = indices[1] - indices[0];
			var value = void 0;
			if (diff >= 1) {
				if (diff > 1 && !connectNulls) {
					var pt = getPointAtIndex(points, indices[0]);
					endLabel.attr({
						x: pt[0] + distanceX,
						y: pt[1] + distanceY
					});
					valueAnimation && (value = seriesModel.getRawValue(indices[0]));
				} else {
					var pt = polyline.getPointOn(xOrY, dim);
					pt && endLabel.attr({
						x: pt[0] + distanceX,
						y: pt[1] + distanceY
					});
					var startValue = seriesModel.getRawValue(indices[0]);
					var endValue = seriesModel.getRawValue(indices[1]);
					valueAnimation && (value = interpolateRawValues(data, precision, startValue, endValue, dataIndexRange.t));
				}
				animationRecord.lastFrameIndex = indices[0];
			} else {
				var idx = percent === 1 || animationRecord.lastFrameIndex > 0 ? indices[0] : 0;
				var pt = getPointAtIndex(points, idx);
				valueAnimation && (value = seriesModel.getRawValue(idx));
				endLabel.attr({
					x: pt[0] + distanceX,
					y: pt[1] + distanceY
				});
			}
			if (valueAnimation) {
				var inner = labelInner(endLabel);
				if (typeof inner.setLabelText === "function") inner.setLabelText(value);
			}
		}
	};
	/**
	* @private
	*/
	LineView.prototype._doUpdateAnimation = function(data, stackedOnPoints, coordSys, api, step, valueOrigin, connectNulls) {
		var polyline = this._polyline;
		var polygon = this._polygon;
		var seriesModel = data.hostModel;
		var diff = lineAnimationDiff(this._data, data, this._stackedOnPoints, stackedOnPoints, this._coordSys, coordSys, this._valueOrigin, valueOrigin);
		var current = diff.current;
		var stackedOnCurrent = diff.stackedOnCurrent;
		var next = diff.next;
		var stackedOnNext = diff.stackedOnNext;
		if (step) {
			stackedOnCurrent = turnPointsIntoStep(diff.stackedOnCurrent, diff.current, coordSys, step, connectNulls);
			current = turnPointsIntoStep(diff.current, null, coordSys, step, connectNulls);
			stackedOnNext = turnPointsIntoStep(diff.stackedOnNext, diff.next, coordSys, step, connectNulls);
			next = turnPointsIntoStep(diff.next, null, coordSys, step, connectNulls);
		}
		if (getBoundingDiff(current, next) > 3e3 || polygon && getBoundingDiff(stackedOnCurrent, stackedOnNext) > 3e3) {
			polyline.stopAnimation();
			polyline.setShape({ points: next });
			if (polygon) {
				polygon.stopAnimation();
				polygon.setShape({
					points: next,
					stackedOnPoints: stackedOnNext
				});
			}
			return;
		}
		polyline.shape.__points = diff.current;
		polyline.shape.points = current;
		var target = { shape: { points: next } };
		if (diff.current !== current) target.shape.__points = diff.next;
		polyline.stopAnimation();
		updateProps(polyline, target, seriesModel);
		if (polygon) {
			polygon.setShape({
				points: current,
				stackedOnPoints: stackedOnCurrent
			});
			polygon.stopAnimation();
			updateProps(polygon, { shape: { stackedOnPoints: stackedOnNext } }, seriesModel);
			if (polyline.shape.points !== polygon.shape.points) polygon.shape.points = polyline.shape.points;
		}
		var updatedDataInfo = [];
		var diffStatus = diff.status;
		for (var i = 0; i < diffStatus.length; i++) if (diffStatus[i].cmd === "=") {
			var el = data.getItemGraphicEl(diffStatus[i].idx1);
			if (el) updatedDataInfo.push({
				el,
				ptIdx: i
			});
		}
		if (polyline.animators && polyline.animators.length) polyline.animators[0].during(function() {
			polygon && polygon.dirtyShape();
			var points = polyline.shape.__points;
			for (var i = 0; i < updatedDataInfo.length; i++) {
				var el = updatedDataInfo[i].el;
				var offset = updatedDataInfo[i].ptIdx * 2;
				el.x = points[offset];
				el.y = points[offset + 1];
				el.markRedraw();
			}
		});
	};
	LineView.prototype.remove = function(ecModel) {
		var group = this.group;
		var oldData = this._data;
		this._lineGroup.removeAll();
		this._symbolDraw.remove(true);
		oldData && oldData.eachItemGraphicEl(function(el, idx) {
			if (el.__temp) {
				group.remove(el);
				oldData.setItemGraphicEl(idx, null);
			}
		});
		this._polyline = this._polygon = this._coordSys = this._points = this._stackedOnPoints = this._endLabel = this._data = null;
	};
	LineView.type = "line";
	return LineView;
}(ChartView);
//#endregion
//#region node_modules/echarts/lib/layout/points.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function pointsLayout(seriesType, forceStoreInTypedArray) {
	return {
		seriesType,
		plan: createRenderPlanner(),
		reset: function(seriesModel) {
			var data = seriesModel.getData();
			var coordSys = seriesModel.coordinateSystem;
			var pipelineContext = seriesModel.pipelineContext;
			var useTypedArray = forceStoreInTypedArray || pipelineContext.large;
			if (!coordSys) return;
			var dims = map(coordSys.dimensions, function(dim) {
				return data.mapDimension(dim);
			}).slice(0, 2);
			var dimLen = dims.length;
			var stackResultDim = data.getCalculationInfo("stackResultDimension");
			if (isDimensionStacked(data, dims[0])) dims[0] = stackResultDim;
			if (isDimensionStacked(data, dims[1])) dims[1] = stackResultDim;
			var store = data.getStore();
			var dimIdx0 = data.getDimensionIndex(dims[0]);
			var dimIdx1 = data.getDimensionIndex(dims[1]);
			return dimLen && { progress: function(params, data) {
				var segCount = params.end - params.start;
				var points = useTypedArray && createFloat32Array(segCount * dimLen);
				var tmpIn = [];
				var tmpOut = [];
				for (var i = params.start, offset = 0; i < params.end; i++) {
					var point = void 0;
					if (dimLen === 1) {
						var x = store.get(dimIdx0, i);
						point = coordSys.dataToPoint(x, null, tmpOut);
					} else {
						tmpIn[0] = store.get(dimIdx0, i);
						tmpIn[1] = store.get(dimIdx1, i);
						point = coordSys.dataToPoint(tmpIn, null, tmpOut);
					}
					if (useTypedArray) {
						points[offset++] = point[0];
						points[offset++] = point[1];
					} else data.setItemLayout(i, point.slice());
				}
				if (useTypedArray) {
					data.setLayout("points", points);
					data.setLayout("pointsRange", {
						start: params.start,
						end: params.end
					});
				}
			} };
		}
	};
}
//#endregion
//#region node_modules/echarts/lib/processor/dataSample.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var samplers = {
	average: function(frame) {
		var sum = 0;
		var count = 0;
		for (var i = 0; i < frame.length; i++) if (!isNaN(frame[i])) {
			sum += frame[i];
			count++;
		}
		return count === 0 ? NaN : sum / count;
	},
	sum: function(frame) {
		var sum = 0;
		for (var i = 0; i < frame.length; i++) sum += frame[i] || 0;
		return sum;
	},
	max: function(frame) {
		var max = -Infinity;
		for (var i = 0; i < frame.length; i++) frame[i] > max && (max = frame[i]);
		return isFinite(max) ? max : NaN;
	},
	min: function(frame) {
		var min = Infinity;
		for (var i = 0; i < frame.length; i++) frame[i] < min && (min = frame[i]);
		return isFinite(min) ? min : NaN;
	},
	nearest: function(frame) {
		return frame[0];
	}
};
var indexSampler = function(frame) {
	return Math.round(frame.length / 2);
};
function dataSample(seriesType) {
	return {
		seriesType,
		reset: function(seriesModel, ecModel, api) {
			var data = seriesModel.getData();
			var sampling = seriesModel.get("sampling");
			var coordSys = seriesModel.coordinateSystem;
			var count = data.count();
			if (count > 10 && coordSys.type === "cartesian2d" && sampling) {
				var baseAxis = coordSys.getBaseAxis();
				var valueAxis = coordSys.getOtherAxis(baseAxis);
				var extent = baseAxis.getExtent();
				var dpr = api.getDevicePixelRatio();
				var size = Math.abs(extent[1] - extent[0]) * (dpr || 1);
				var rate = Math.round(count / size);
				if (isFinite(rate) && rate > 1) {
					if (sampling === "lttb") seriesModel.setData(data.lttbDownSample(data.mapDimension(valueAxis.dim), 1 / rate));
					else if (sampling === "minmax") seriesModel.setData(data.minmaxDownSample(data.mapDimension(valueAxis.dim), 1 / rate));
					var sampler = void 0;
					if (isString(sampling)) sampler = samplers[sampling];
					else if (isFunction(sampling)) sampler = sampling;
					if (sampler) seriesModel.setData(data.downSample(data.mapDimension(valueAxis.dim), 1 / rate, sampler, indexSampler));
				}
			}
		}
	};
}
//#endregion
//#region node_modules/echarts/lib/chart/line/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$1(registers) {
	registers.registerChartView(LineView);
	registers.registerSeriesModel(LineSeriesModel);
	registers.registerLayout(pointsLayout("line", true));
	registers.registerVisual({
		seriesType: "line",
		reset: function(seriesModel) {
			var data = seriesModel.getData();
			var lineStyle = seriesModel.getModel("lineStyle").getLineStyle();
			if (lineStyle && !lineStyle.stroke) lineStyle.stroke = data.getVisual("style").fill;
			data.setVisual("legendLineStyle", lineStyle);
		}
	});
	registers.registerProcessor(registers.PRIORITY.PROCESSOR.STATISTIC, dataSample("line"));
}
//#endregion
//#region node_modules/echarts/lib/coord/axisStatisticsMetricsImpl.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function registerMetricImplLiPosMinGap() {
	registerMetricImpl("liPosMinGap", metricLiPosMinGapImpl);
}
function metricLiPosMinGapImpl(ecModel, perKeyPerAxis, ecPreparePerKeyPerAxis) {
	var newSerUids = createHashMap();
	var ecPrepareSerUids = ecPreparePerKeyPerAxis.serUids;
	var ecPrepareLiPosMinGap = ecPreparePerKeyPerAxis.liPosMinGap;
	var ecPrepareCacheMiss;
	var axis = perKeyPerAxis.axis;
	var scale = axis.scale;
	var needTransform = scale.needTransform();
	var filter = scale.getFilter ? scale.getFilter() : null;
	var filterParsed = parseSanitizationFilter(filter);
	function eachSeries(cb) {
		eachSeriesDealForAxisStat(ecModel, perKeyPerAxis.sers, function(seriesModel) {
			var rawData = seriesModel.getRawData();
			var dimStoreIdx = rawData.getDimensionIndex(rawData.mapDimension(axis.dim));
			if (dimStoreIdx >= 0) cb(dimStoreIdx, seriesModel, rawData.getStore());
		});
	}
	var bufferCapacity = 0;
	eachSeries(function(dimStoreIdx, seriesModel, rawDataStore) {
		newSerUids.set(seriesModel.uid, 1);
		if (!ecPrepareSerUids || !ecPrepareSerUids.hasKey(seriesModel.uid)) ecPrepareCacheMiss = true;
		bufferCapacity += rawDataStore.count();
	});
	if (!ecPrepareSerUids || ecPrepareSerUids.keys().length !== newSerUids.keys().length) ecPrepareCacheMiss = true;
	if (!ecPrepareCacheMiss && ecPrepareLiPosMinGap != null) {
		perKeyPerAxis.liPosMinGap = ecPrepareLiPosMinGap;
		return;
	}
	tryEnsureTypedArray(tmpValueBuffer, bufferCapacity);
	var writeIdx = 0;
	eachSeries(function(dimStoreIdx, seriesModel, store) {
		for (var i = 0, cnt = store.count(); i < cnt; ++i) {
			var val = store.get(dimStoreIdx, i);
			if (isFinite(val) && (!filter || passesSanitizationFilter(filterParsed, val))) {
				if (needTransform) val = scale.transformIn(val, null);
				tmpValueBuffer.arr[writeIdx++] = val;
			}
		}
	});
	var tmpValueBufferView = tmpValueBuffer.typed ? tmpValueBuffer.arr.subarray(0, writeIdx) : (tmpValueBuffer.arr.length = writeIdx, tmpValueBuffer.arr);
	if (tmpValueBuffer.typed) tmpValueBufferView.sort();
	else asc(tmpValueBufferView);
	var min = Infinity;
	for (var j = 1; j < writeIdx; ++j) {
		var delta = tmpValueBufferView[j] - tmpValueBufferView[j - 1];
		if (delta > 0 && delta < min) min = delta;
	}
	ecPreparePerKeyPerAxis.liPosMinGap = perKeyPerAxis.liPosMinGap = isNullableNumberFinite(min) ? min : writeIdx > 0 ? -2 : -1;
	ecPreparePerKeyPerAxis.serUids = newSerUids;
}
var tmpValueBuffer = tryEnsureTypedArray({ ctor: Float64ArrayCtor }, 50);
//#endregion
//#region node_modules/echarts/lib/chart/helper/axisSnippets.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Require `requireAxisStatistics`.
*
* Simply expand `Scale` extent by half bandWidth.
* Do nothing if an `OrdinalScale` has `boundaryGap: true`.
*/
function createBandWidthBasedAxisContainShapeHandler(axisStatKey) {
	return function(axis, ecModel) {
		var bandWidthResult = calcBandWidth(axis, { fromStat: { key: axisStatKey } });
		if (isNullableNumberFinite(bandWidthResult.w2)) return [-bandWidthResult.w2 / 2, bandWidthResult.w2 / 2];
	};
}
function makeAxisStatKey2(seriesType, coordSysType) {
	return seriesType + "|&" + coordSysType;
}
/**
* A pre-built `getMetrics`.
*/
function createMetricsNonOrdinalLinearPositiveMinGap(axis) {
	registerMetricImplLiPosMinGap();
	return { liPosMinGap: !isOrdinalScale(axis.scale) };
}
//#endregion
//#region node_modules/echarts/lib/layout/barCommon.js
function requireAxisStatisticsForBaseBar(registers, axisStatKey, seriesType, coordSysType) {
	requireAxisStatistics(registers, {
		key: axisStatKey,
		seriesType,
		coordSysType,
		getMetrics: createMetricsNonOrdinalLinearPositiveMinGap
	});
}
function getStartValue(baseAxis) {
	return baseAxis.scale.rawExtentInfo.makeRenderInfo().startValue;
}
//#endregion
//#region node_modules/echarts/lib/layout/barGrid.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var callOnlyOnce = makeCallOnlyOnce();
var STACK_PREFIX = "__ec_stack_";
function getSeriesStackId(seriesModel) {
	return seriesModel.get("stack") || STACK_PREFIX + seriesModel.seriesIndex;
}
/**
* NOTICE: This layout is based on axis pixel extent and scale extent.
*  It may be used on estimation, where axis pixel extent and scale extent
*  are approximately set. But the result should not be cached since the
*  axis pixel extent and scale extent may be changed finally.
*/
function makeColumnLayoutOnAxisReal(baseAxis, seriesType) {
	var seriesInfoListOnAxis = createLayoutInfoListOnAxis(baseAxis, seriesType);
	seriesInfoListOnAxis.columnMap = calcBarWidthAndOffset(seriesInfoListOnAxis);
	return seriesInfoListOnAxis;
}
function createLayoutInfoListOnAxis(baseAxis, seriesType) {
	var axisStatKey = makeAxisStatKey2(seriesType, COORD_SYS_TYPE_CARTESIAN_2D);
	var seriesInfoOnAxis = [];
	var bandWidthResult = calcBandWidth(baseAxis, {
		fromStat: { key: axisStatKey },
		min: 1
	});
	eachSeriesOnAxisOnKey(baseAxis, axisStatKey, function(seriesModel) {
		seriesInfoOnAxis.push({
			barWidth: parsePercent$1(seriesModel.get("barWidth"), bandWidthResult.w),
			barMaxWidth: parsePercent$1(seriesModel.get("barMaxWidth"), bandWidthResult.w),
			barMinWidth: parsePercent$1(seriesModel.get("barMinWidth") || (isInLargeMode(seriesModel) ? .5 : 1), bandWidthResult.w),
			barGap: seriesModel.get("barGap"),
			barCategoryGap: seriesModel.get("barCategoryGap"),
			defaultBarGap: seriesModel.get("defaultBarGap"),
			stackId: getSeriesStackId(seriesModel)
		});
	});
	return {
		bandWidthResult,
		seriesInfo: seriesInfoOnAxis
	};
}
/**
* CAUTION: When multiple series are laid out on one axis, relevant ec options effect all series.
* But for historical reason, these options are configured on each series option, which may
* introduce confliction. The legacy implementation uses some options (e.g., `defaultBarGap`)
* from the first declared series, and other options (e.g., `barGap`, `barCategoryGap`) from the last declared
* series. Nevertheless, We remain this design to avoid breaking change.
*/
function calcBarWidthAndOffset(seriesInfoOnAxis) {
	var bandWidth = seriesInfoOnAxis.bandWidthResult.w;
	var remainedWidth = bandWidth;
	var autoWidthCount = 0;
	var barCategoryGapOption;
	var barGapOption;
	var stackIdList = [];
	var stackMap = {};
	each(seriesInfoOnAxis.seriesInfo, function(seriesInfo, idx) {
		if (!idx) barGapOption = seriesInfo.defaultBarGap || 0;
		var stackId = seriesInfo.stackId;
		if (!hasOwn(stackMap, stackId)) autoWidthCount++;
		var stackItem = stackMap[stackId];
		if (!stackItem) {
			stackItem = stackMap[stackId] = {
				width: 0,
				maxWidth: 0
			};
			stackIdList.push(stackId);
		}
		var barWidth = seriesInfo.barWidth;
		if (barWidth && !stackItem.width) {
			stackItem.width = barWidth;
			barWidth = mathMin$2(remainedWidth, barWidth);
			remainedWidth -= barWidth;
		}
		var barMaxWidth = seriesInfo.barMaxWidth;
		barMaxWidth && (stackItem.maxWidth = barMaxWidth);
		var barMinWidth = seriesInfo.barMinWidth;
		barMinWidth && (stackItem.minWidth = barMinWidth);
		var barGap = seriesInfo.barGap;
		barGap != null && (barGapOption = barGap);
		var barCategoryGap = seriesInfo.barCategoryGap;
		barCategoryGap != null && (barCategoryGapOption = barCategoryGap);
	});
	if (barCategoryGapOption == null) barCategoryGapOption = mathMax$2(35 - stackIdList.length * 4, 15) + "%";
	var barCategoryGapNum = parsePercent$1(barCategoryGapOption, bandWidth);
	var barGapPercent = parsePercent$1(barGapOption, 1);
	var autoWidth = (remainedWidth - barCategoryGapNum) / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
	autoWidth = mathMax$2(autoWidth, 0);
	each(stackIdList, function(stackId) {
		var column = stackMap[stackId];
		var maxWidth = column.maxWidth;
		var minWidth = column.minWidth;
		if (!column.width) {
			var finalWidth = autoWidth;
			if (maxWidth && maxWidth < finalWidth) finalWidth = mathMin$2(maxWidth, remainedWidth);
			if (minWidth && minWidth > finalWidth) finalWidth = minWidth;
			if (finalWidth !== autoWidth) {
				column.width = finalWidth;
				remainedWidth -= finalWidth + barGapPercent * finalWidth;
				autoWidthCount--;
			}
		} else {
			var finalWidth = column.width;
			if (maxWidth) finalWidth = mathMin$2(finalWidth, maxWidth);
			if (minWidth) finalWidth = mathMax$2(finalWidth, minWidth);
			column.width = finalWidth;
			remainedWidth -= finalWidth + barGapPercent * finalWidth;
			autoWidthCount--;
		}
	});
	autoWidth = (remainedWidth - barCategoryGapNum) / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
	autoWidth = mathMax$2(autoWidth, 0);
	var widthSum = 0;
	var lastColumn;
	each(stackIdList, function(stackId) {
		var column = stackMap[stackId];
		if (!column.width) column.width = autoWidth;
		lastColumn = column;
		widthSum += column.width * (1 + barGapPercent);
	});
	if (lastColumn) widthSum -= lastColumn.width * barGapPercent;
	var result = {};
	var offset = -widthSum / 2;
	each(stackIdList, function(stackId) {
		var column = stackMap[stackId];
		result[stackId] = result[stackId] || {
			bandWidth,
			offset,
			width: column.width
		};
		offset += column.width * (1 + barGapPercent);
	});
	return result;
}
function createCrossSeriesLayoutHandler(seriesType) {
	return {
		seriesType,
		overallReset: function(ecModel) {
			var axisStatKey = makeAxisStatKey2(seriesType, COORD_SYS_TYPE_CARTESIAN_2D);
			eachAxisOnKey(ecModel, axisStatKey, function(axis) {
				var columnLayout = makeColumnLayoutOnAxisReal(axis, seriesType);
				eachSeriesOnAxisOnKey(axis, axisStatKey, function(seriesModel) {
					var columnLayoutInfo = columnLayout.columnMap[getSeriesStackId(seriesModel)];
					seriesModel.getData().setLayout({
						bandWidth: columnLayoutInfo.bandWidth,
						offset: columnLayoutInfo.offset,
						size: columnLayoutInfo.width
					});
				});
			});
		}
	};
}
function createProgressiveLayout(seriesType) {
	return {
		seriesType,
		plan: createRenderPlanner(),
		reset: function(seriesModel) {
			if (!isCartesian2DInjectedAsDataCoordSys(seriesModel)) return;
			var data = seriesModel.getData();
			var cartesian = seriesModel.coordinateSystem;
			var baseAxis = cartesian.getBaseAxis();
			var valueAxis = cartesian.getOtherAxis(baseAxis);
			var valueDimIdx = data.getDimensionIndex(data.mapDimension(valueAxis.dim));
			var baseDimIdx = data.getDimensionIndex(data.mapDimension(baseAxis.dim));
			var drawBackground = seriesModel.get("showBackground", true);
			var valueDim = data.mapDimension(valueAxis.dim);
			var stackResultDim = data.getCalculationInfo("stackResultDimension");
			var stacked = isDimensionStacked(data, valueDim) && !!data.getCalculationInfo("stackedOnSeries");
			var isValueAxisH = valueAxis.isHorizontal();
			var valueAxisStart = valueAxis.toGlobalCoord(valueAxis.dataToCoord(getStartValue(valueAxis)));
			var isLarge = isInLargeMode(seriesModel);
			var barMinHeight = seriesModel.get("barMinHeight") || 0;
			var stackedDimIdx = stackResultDim && data.getDimensionIndex(stackResultDim);
			var columnWidth = data.getLayout("size");
			var columnOffset = data.getLayout("offset");
			return { progress: function(params, data) {
				var count = params.count;
				var largePoints = isLarge && createFloat32Array(count * 3);
				var largeBackgroundPoints = isLarge && drawBackground && createFloat32Array(count * 3);
				var largeDataIndices = isLarge && createFloat32Array(count);
				var coordLayout = cartesian.master.getRect();
				var bgSize = isValueAxisH ? coordLayout.width : coordLayout.height;
				var dataIndex;
				var store = data.getStore();
				var idxOffset = 0;
				while ((dataIndex = params.next()) != null) {
					var value = store.get(stacked ? stackedDimIdx : valueDimIdx, dataIndex);
					var baseValue = store.get(baseDimIdx, dataIndex);
					var baseCoord = valueAxisStart;
					var stackStartValue = void 0;
					if (stacked) stackStartValue = +value - store.get(valueDimIdx, dataIndex);
					var x = void 0;
					var y = void 0;
					var width = void 0;
					var height = void 0;
					if (isValueAxisH) {
						var coord = cartesian.dataToPoint([value, baseValue]);
						if (stacked) baseCoord = cartesian.dataToPoint([stackStartValue, baseValue])[0];
						x = baseCoord;
						y = coord[1] + columnOffset;
						width = coord[0] - baseCoord;
						height = columnWidth;
						if (mathAbs(width) < barMinHeight) width = (width < 0 ? -1 : 1) * barMinHeight;
					} else {
						var coord = cartesian.dataToPoint([baseValue, value]);
						if (stacked) baseCoord = cartesian.dataToPoint([baseValue, stackStartValue])[1];
						x = coord[0] + columnOffset;
						y = baseCoord;
						width = columnWidth;
						height = coord[1] - baseCoord;
						if (mathAbs(height) < barMinHeight) height = (height <= 0 ? -1 : 1) * barMinHeight;
					}
					if (!isLarge) data.setItemLayout(dataIndex, {
						x,
						y,
						width,
						height
					});
					else {
						largePoints[idxOffset] = x;
						largePoints[idxOffset + 1] = y;
						largePoints[idxOffset + 2] = isValueAxisH ? width : height;
						if (largeBackgroundPoints) {
							largeBackgroundPoints[idxOffset] = isValueAxisH ? coordLayout.x : x;
							largeBackgroundPoints[idxOffset + 1] = isValueAxisH ? y : coordLayout.y;
							largeBackgroundPoints[idxOffset + 2] = bgSize;
						}
						largeDataIndices[dataIndex] = dataIndex;
					}
					idxOffset += 3;
				}
				if (isLarge) data.setLayout({
					largePoints,
					largeDataIndices,
					largeBackgroundPoints,
					valueAxisHorizontal: isValueAxisH
				});
			} };
		}
	};
}
function isInLargeMode(seriesModel) {
	return seriesModel.pipelineContext && seriesModel.pipelineContext.large;
}
function barGridCreateAxisContainShapeHandler(seriesType) {
	return createBandWidthBasedAxisContainShapeHandler(makeAxisStatKey2(seriesType, COORD_SYS_TYPE_CARTESIAN_2D));
}
function registerBarGridAxisHandlers(registers) {
	callOnlyOnce(registers, function() {
		function register(seriesType) {
			var axisStatKey = makeAxisStatKey2(seriesType, COORD_SYS_TYPE_CARTESIAN_2D);
			requireAxisStatisticsForBaseBar(registers, axisStatKey, seriesType, COORD_SYS_TYPE_CARTESIAN_2D);
			registerAxisContainShapeHandler(axisStatKey, barGridCreateAxisContainShapeHandler(seriesType));
		}
		register("bar");
		register("pictorialBar");
	});
}
//#endregion
//#region node_modules/echarts/lib/chart/bar/BaseBarSeries.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var BaseBarSeriesModel = function(_super) {
	__extends(BaseBarSeriesModel, _super);
	function BaseBarSeriesModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = BaseBarSeriesModel.type;
		return _this;
	}
	BaseBarSeriesModel.prototype.getInitialData = function(option, ecModel) {
		return createSeriesData(null, this, { useEncodeDefaulter: true });
	};
	BaseBarSeriesModel.prototype.getMarkerPosition = function(value, dims, startingAtTick) {
		var coordSys = this.coordinateSystem;
		if (coordSys && coordSys.clampData) {
			var clampData_1 = coordSys.clampData(value);
			var pt_1 = coordSys.dataToPoint(clampData_1);
			if (startingAtTick) each(coordSys.getAxes(), function(axis, idx) {
				if (axis.type === "category" && dims != null) {
					var tickCoords = axis.getTicksCoords();
					var alignTicksWithLabel = axis.getTickModel().get("alignWithLabel");
					var targetTickId = clampData_1[idx];
					var isEnd = dims[idx] === "x1" || dims[idx] === "y1";
					if (isEnd && !alignTicksWithLabel) targetTickId += 1;
					if (tickCoords.length < 2) return;
					else if (tickCoords.length === 2) {
						pt_1[idx] = axis.toGlobalCoord(axis.getExtent()[isEnd ? 1 : 0]);
						return;
					}
					var leftCoord = void 0;
					var coord = void 0;
					var stepTickValue = 1;
					for (var i = 0; i < tickCoords.length; i++) {
						var tickCoord = tickCoords[i].coord;
						var tickValue = i === tickCoords.length - 1 ? tickCoords[i - 1].tickValue + stepTickValue : tickCoords[i].tickValue;
						if (tickValue === targetTickId) {
							coord = tickCoord;
							break;
						} else if (tickValue < targetTickId) leftCoord = tickCoord;
						else if (leftCoord != null && tickValue > targetTickId) {
							coord = (tickCoord + leftCoord) / 2;
							break;
						}
						if (i === 1) stepTickValue = tickValue - tickCoords[0].tickValue;
					}
					if (coord == null) {
						if (!leftCoord) coord = tickCoords[0].coord;
						else if (leftCoord) coord = tickCoords[tickCoords.length - 1].coord;
					}
					pt_1[idx] = axis.toGlobalCoord(coord);
				}
			});
			else {
				var data = this.getData();
				var offset = data.getLayout("offset");
				var size = data.getLayout("size");
				var offsetIndex = coordSys.getBaseAxis().isHorizontal() ? 0 : 1;
				pt_1[offsetIndex] += offset + size / 2;
			}
			return pt_1;
		}
		return [NaN, NaN];
	};
	/**
	* @implements
	*/
	BaseBarSeriesModel.prototype.__requireStartValue = function(axis) {
		return this.getBaseAxis() !== axis;
	};
	BaseBarSeriesModel.type = "series.__base_bar__";
	BaseBarSeriesModel.defaultOption = {
		z: 2,
		coordinateSystem: "cartesian2d",
		legendHoverLink: true,
		barMinHeight: 0,
		barMinAngle: 0,
		large: false,
		largeThreshold: 400,
		progressive: 3e3,
		progressiveChunkMode: "mod",
		defaultBarGap: "10%"
	};
	return BaseBarSeriesModel;
}(SeriesModel);
SeriesModel.registerClass(BaseBarSeriesModel);
//#endregion
//#region node_modules/echarts/lib/chart/bar/BarSeries.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var BarSeriesModel = function(_super) {
	__extends(BarSeriesModel, _super);
	function BarSeriesModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = BarSeriesModel.type;
		return _this;
	}
	BarSeriesModel.prototype.getInitialData = function() {
		return createSeriesData(null, this, {
			useEncodeDefaulter: true,
			createInvertedIndices: !!this.get("realtimeSort", true) || null
		});
	};
	/**
	* @override
	*/
	BarSeriesModel.prototype.getProgressive = function() {
		return this.get("large") ? this.get("progressive") : false;
	};
	/**
	* @implement
	*/
	BarSeriesModel.prototype.__preparePipelineContext = function(view, pipeline) {
		var context = preparePipelineContext(this, view, pipeline);
		if (context.progressiveRender) context.large = true;
		return context;
	};
	BarSeriesModel.prototype.brushSelector = function(dataIndex, data, selectors) {
		return selectors.rect(data.getItemLayout(dataIndex));
	};
	BarSeriesModel.type = "series.bar";
	BarSeriesModel.dependencies = ["grid", "polar"];
	BarSeriesModel.defaultOption = inheritDefaultOption(BaseBarSeriesModel.defaultOption, {
		clip: true,
		roundCap: false,
		showBackground: false,
		backgroundStyle: {
			color: "rgba(180, 180, 180, 0.2)",
			borderColor: null,
			borderWidth: 0,
			borderType: "solid",
			borderRadius: 0,
			shadowBlur: 0,
			shadowColor: null,
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			opacity: 1
		},
		select: { itemStyle: {
			borderColor: tokens.color.primary,
			borderWidth: 2
		} },
		realtimeSort: false
	});
	return BarSeriesModel;
}(BaseBarSeriesModel);
//#endregion
//#region node_modules/echarts/lib/util/shape/sausage.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Sausage: similar to sector, but have half circle on both sides
*/
var SausageShape = function() {
	function SausageShape() {
		this.cx = 0;
		this.cy = 0;
		this.r0 = 0;
		this.r = 0;
		this.startAngle = 0;
		this.endAngle = Math.PI * 2;
		this.clockwise = true;
	}
	return SausageShape;
}();
var SausagePath = function(_super) {
	__extends(SausagePath, _super);
	function SausagePath(opts) {
		var _this = _super.call(this, opts) || this;
		_this.type = "sausage";
		return _this;
	}
	SausagePath.prototype.getDefaultShape = function() {
		return new SausageShape();
	};
	SausagePath.prototype.buildPath = function(ctx, shape) {
		var cx = shape.cx;
		var cy = shape.cy;
		var r0 = Math.max(shape.r0 || 0, 0);
		var r = Math.max(shape.r, 0);
		var dr = (r - r0) * .5;
		var rCenter = r0 + dr;
		var startAngle = shape.startAngle;
		var endAngle = shape.endAngle;
		var clockwise = shape.clockwise;
		var PI2 = Math.PI * 2;
		var lessThanCircle = clockwise ? endAngle - startAngle < PI2 : startAngle - endAngle < PI2;
		if (!lessThanCircle) startAngle = endAngle - (clockwise ? PI2 : -PI2);
		var unitStartX = Math.cos(startAngle);
		var unitStartY = Math.sin(startAngle);
		var unitEndX = Math.cos(endAngle);
		var unitEndY = Math.sin(endAngle);
		if (lessThanCircle) {
			ctx.moveTo(unitStartX * r0 + cx, unitStartY * r0 + cy);
			ctx.arc(unitStartX * rCenter + cx, unitStartY * rCenter + cy, dr, -Math.PI + startAngle, startAngle, !clockwise);
		} else ctx.moveTo(unitStartX * r + cx, unitStartY * r + cy);
		ctx.arc(cx, cy, r, startAngle, endAngle, !clockwise);
		ctx.arc(unitEndX * rCenter + cx, unitEndY * rCenter + cy, dr, endAngle - Math.PI * 2, endAngle - Math.PI, !clockwise);
		if (r0 !== 0) ctx.arc(cx, cy, r0, endAngle, startAngle, clockwise);
	};
	return SausagePath;
}(Path);
//#endregion
//#region node_modules/echarts/lib/label/sectorLabel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function createSectorCalculateTextPosition(positionMapping, opts) {
	opts = opts || {};
	var isRoundCap = opts.isRoundCap;
	return function(out, opts, boundingRect) {
		var textPosition = opts.position;
		if (!textPosition || textPosition instanceof Array) return calculateTextPosition(out, opts, boundingRect);
		var mappedSectorPosition = positionMapping(textPosition);
		var distance = opts.distance != null ? opts.distance : 5;
		var sector = this.shape;
		var cx = sector.cx;
		var cy = sector.cy;
		var r = sector.r;
		var r0 = sector.r0;
		var middleR = (r + r0) / 2;
		var startAngle = sector.startAngle;
		var endAngle = sector.endAngle;
		var middleAngle = (startAngle + endAngle) / 2;
		var extraDist = isRoundCap ? Math.abs(r - r0) / 2 : 0;
		var mathCos = Math.cos;
		var mathSin = Math.sin;
		var x = cx + r * mathCos(startAngle);
		var y = cy + r * mathSin(startAngle);
		var textAlign = "left";
		var textVerticalAlign = "top";
		switch (mappedSectorPosition) {
			case "startArc":
				x = cx + (r0 - distance) * mathCos(middleAngle);
				y = cy + (r0 - distance) * mathSin(middleAngle);
				textAlign = "center";
				textVerticalAlign = "top";
				break;
			case "insideStartArc":
				x = cx + (r0 + distance) * mathCos(middleAngle);
				y = cy + (r0 + distance) * mathSin(middleAngle);
				textAlign = "center";
				textVerticalAlign = "bottom";
				break;
			case "startAngle":
				x = cx + middleR * mathCos(startAngle) + adjustAngleDistanceX(startAngle, distance + extraDist, false);
				y = cy + middleR * mathSin(startAngle) + adjustAngleDistanceY(startAngle, distance + extraDist, false);
				textAlign = "right";
				textVerticalAlign = "middle";
				break;
			case "insideStartAngle":
				x = cx + middleR * mathCos(startAngle) + adjustAngleDistanceX(startAngle, -distance + extraDist, false);
				y = cy + middleR * mathSin(startAngle) + adjustAngleDistanceY(startAngle, -distance + extraDist, false);
				textAlign = "left";
				textVerticalAlign = "middle";
				break;
			case "middle":
				x = cx + middleR * mathCos(middleAngle);
				y = cy + middleR * mathSin(middleAngle);
				textAlign = "center";
				textVerticalAlign = "middle";
				break;
			case "endArc":
				x = cx + (r + distance) * mathCos(middleAngle);
				y = cy + (r + distance) * mathSin(middleAngle);
				textAlign = "center";
				textVerticalAlign = "bottom";
				break;
			case "insideEndArc":
				x = cx + (r - distance) * mathCos(middleAngle);
				y = cy + (r - distance) * mathSin(middleAngle);
				textAlign = "center";
				textVerticalAlign = "top";
				break;
			case "endAngle":
				x = cx + middleR * mathCos(endAngle) + adjustAngleDistanceX(endAngle, distance + extraDist, true);
				y = cy + middleR * mathSin(endAngle) + adjustAngleDistanceY(endAngle, distance + extraDist, true);
				textAlign = "left";
				textVerticalAlign = "middle";
				break;
			case "insideEndAngle":
				x = cx + middleR * mathCos(endAngle) + adjustAngleDistanceX(endAngle, -distance + extraDist, true);
				y = cy + middleR * mathSin(endAngle) + adjustAngleDistanceY(endAngle, -distance + extraDist, true);
				textAlign = "right";
				textVerticalAlign = "middle";
				break;
			default: return calculateTextPosition(out, opts, boundingRect);
		}
		out = out || {};
		out.x = x;
		out.y = y;
		out.align = textAlign;
		out.verticalAlign = textVerticalAlign;
		return out;
	};
}
function setSectorTextRotation(sector, textPosition, positionMapping, rotateType) {
	if (isNumber(rotateType)) {
		sector.setTextConfig({ rotation: rotateType });
		return;
	} else if (isArray(textPosition)) {
		sector.setTextConfig({ rotation: 0 });
		return;
	}
	var shape = sector.shape;
	var startAngle = shape.clockwise ? shape.startAngle : shape.endAngle;
	var endAngle = shape.clockwise ? shape.endAngle : shape.startAngle;
	var middleAngle = (startAngle + endAngle) / 2;
	var anchorAngle;
	var mappedSectorPosition = positionMapping(textPosition);
	switch (mappedSectorPosition) {
		case "startArc":
		case "insideStartArc":
		case "middle":
		case "insideEndArc":
		case "endArc":
			anchorAngle = middleAngle;
			break;
		case "startAngle":
		case "insideStartAngle":
			anchorAngle = startAngle;
			break;
		case "endAngle":
		case "insideEndAngle":
			anchorAngle = endAngle;
			break;
		default:
			sector.setTextConfig({ rotation: 0 });
			return;
	}
	var rotate = Math.PI * 1.5 - anchorAngle;
	/**
	* TODO: labels with rotate > Math.PI / 2 should be rotate another
	* half round flipped to increase readability. However, only middle
	* position supports this for now, because in other positions, the
	* anchor point is not at the center of the text, so the positions
	* after rotating is not as expected.
	*/
	if (mappedSectorPosition === "middle" && rotate > Math.PI / 2 && rotate < Math.PI * 1.5) rotate -= Math.PI;
	sector.setTextConfig({ rotation: rotate });
}
function adjustAngleDistanceX(angle, distance, isEnd) {
	return distance * Math.sin(angle) * (isEnd ? -1 : 1);
}
function adjustAngleDistanceY(angle, distance, isEnd) {
	return distance * Math.cos(angle) * (isEnd ? 1 : -1);
}
//#endregion
//#region node_modules/echarts/lib/chart/helper/sectorHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function getSectorCornerRadius(model, shape, zeroIfNull) {
	var cornerRadius = model.get("borderRadius");
	if (cornerRadius == null) return zeroIfNull ? { cornerRadius: 0 } : null;
	if (!isArray(cornerRadius)) cornerRadius = [
		cornerRadius,
		cornerRadius,
		cornerRadius,
		cornerRadius
	];
	var dr = Math.abs(shape.r || 0 - shape.r0 || 0);
	return { cornerRadius: map(cornerRadius, function(cr) {
		return parsePercent(cr, dr);
	}) };
}
//#endregion
//#region node_modules/echarts/lib/chart/bar/BarView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var mathMax = Math.max;
var mathMin = Math.min;
var BarView = function(_super) {
	__extends(BarView, _super);
	function BarView() {
		var _this = _super.call(this) || this;
		_this.type = "bar";
		_this._isFirstFrame = true;
		return _this;
	}
	BarView.prototype.render = function(seriesModel, ecModel, api, payload) {
		this._model = seriesModel;
		this._removeOnRenderedListener(api);
		this._updateDrawMode(seriesModel);
		var coordinateSystemType = seriesModel.get("coordinateSystem");
		if (coordinateSystemType === "cartesian2d" || coordinateSystemType === "polar") {
			this._progressiveEls = null;
			this._isLargeDraw ? this._renderLarge(seriesModel, ecModel, api) : this._renderNormal(seriesModel, ecModel, api, payload);
		}
	};
	BarView.prototype.incrementalPrepareRender = function(seriesModel) {
		this._clear();
		this._updateDrawMode(seriesModel);
		this._updateLargeClip(seriesModel);
	};
	BarView.prototype.incrementalRender = function(params, seriesModel) {
		this._progressiveEls = [];
		this._incrementalRenderLarge(params, seriesModel);
	};
	BarView.prototype.eachRendered = function(cb) {
		traverseElements(this._progressiveEls || this.group, cb);
	};
	BarView.prototype._updateDrawMode = function(seriesModel) {
		var isLargeDraw = seriesModel.pipelineContext.large;
		if (this._isLargeDraw == null || isLargeDraw !== this._isLargeDraw) {
			this._isLargeDraw = isLargeDraw;
			this._clear();
		}
	};
	BarView.prototype._renderNormal = function(seriesModel, ecModel, api, payload) {
		var group = this.group;
		var data = seriesModel.getData();
		var oldData = this._data;
		var coord = seriesModel.coordinateSystem;
		var baseAxis = coord.getBaseAxis();
		var isHorizontalOrRadial;
		if (coord.type === "cartesian2d") isHorizontalOrRadial = baseAxis.isHorizontal();
		else if (coord.type === "polar") isHorizontalOrRadial = baseAxis.dim === "angle";
		var animationModel = seriesModel.isAnimationEnabled() ? seriesModel : null;
		var realtimeSortCfg = shouldRealtimeSort(seriesModel, coord);
		if (realtimeSortCfg) this._enableRealtimeSort(realtimeSortCfg, data, api);
		var needsClip = seriesModel.get("clip", true) || realtimeSortCfg;
		var coordSysClipArea = coord.getArea();
		group.removeClipPath();
		var roundCap = seriesModel.get("roundCap", true);
		var drawBackground = seriesModel.get("showBackground", true);
		var backgroundModel = seriesModel.getModel("backgroundStyle");
		var barBorderRadius = backgroundModel.get("borderRadius") || 0;
		var bgEls = [];
		var oldBgEls = this._backgroundEls;
		var isInitSort = payload && payload.isInitSort;
		var isChangeOrder = payload && payload.type === "changeAxisOrder";
		function createBackground(dataIndex) {
			var bgLayout = getLayout[coord.type](data, dataIndex);
			if (!bgLayout) return null;
			var bgEl = createBackgroundEl(coord, isHorizontalOrRadial, bgLayout);
			bgEl.useStyle(backgroundModel.getItemStyle());
			if (coord.type === "cartesian2d") bgEl.setShape("r", barBorderRadius);
			else bgEl.setShape("cornerRadius", barBorderRadius);
			bgEls[dataIndex] = bgEl;
			return bgEl;
		}
		data.diff(oldData).add(function(dataIndex) {
			var itemModel = data.getItemModel(dataIndex);
			var layout = getLayout[coord.type](data, dataIndex, itemModel);
			if (!layout) return;
			if (drawBackground) createBackground(dataIndex);
			if (!data.hasValue(dataIndex) || !isValidLayout[coord.type](layout)) return;
			var isClipped = false;
			if (needsClip) isClipped = clip[coord.type](coordSysClipArea, layout);
			var el = elementCreator[coord.type](seriesModel, data, dataIndex, layout, isHorizontalOrRadial, animationModel, baseAxis.model, false, roundCap);
			if (realtimeSortCfg)
 /**
			* Force label animation because even if the element is
			* ignored because it's clipped, it may not be clipped after
			* changing order. Then, if not using forceLabelAnimation,
			* the label animation was never started, in which case,
			* the label will be the final value and doesn't have label
			* animation.
			*/
			el.forceLabelAnimation = true;
			updateStyle(el, data, dataIndex, itemModel, layout, seriesModel, isHorizontalOrRadial, coord.type === "polar");
			if (isInitSort) el.attr({ shape: layout });
			else if (realtimeSortCfg) updateRealtimeAnimation(realtimeSortCfg, animationModel, el, layout, dataIndex, isHorizontalOrRadial, false, false);
			else initProps(el, { shape: layout }, seriesModel, dataIndex);
			data.setItemGraphicEl(dataIndex, el);
			group.add(el);
			el.ignore = isClipped;
		}).update(function(newIndex, oldIndex) {
			var itemModel = data.getItemModel(newIndex);
			var layout = getLayout[coord.type](data, newIndex, itemModel);
			if (!layout) return;
			if (drawBackground) {
				var bgEl = void 0;
				if (oldBgEls.length === 0) bgEl = createBackground(oldIndex);
				else {
					bgEl = oldBgEls[oldIndex];
					bgEl.useStyle(backgroundModel.getItemStyle());
					if (coord.type === "cartesian2d") bgEl.setShape("r", barBorderRadius);
					else bgEl.setShape("cornerRadius", barBorderRadius);
					bgEls[newIndex] = bgEl;
				}
				var bgLayout = getLayout[coord.type](data, newIndex);
				var shape = createBackgroundShape(isHorizontalOrRadial, bgLayout, coord);
				updateProps(bgEl, { shape }, animationModel, newIndex);
			}
			var el = oldData.getItemGraphicEl(oldIndex);
			if (!data.hasValue(newIndex) || !isValidLayout[coord.type](layout)) {
				group.remove(el);
				return;
			}
			var isClipped = false;
			if (needsClip) {
				isClipped = clip[coord.type](coordSysClipArea, layout);
				if (isClipped) group.remove(el);
			}
			if (el && (el.type === "sector" && roundCap || el.type === "sausage" && !roundCap)) {
				el && removeElementWithFadeOut(el, seriesModel, oldIndex);
				el = null;
			}
			if (!el) el = elementCreator[coord.type](seriesModel, data, newIndex, layout, isHorizontalOrRadial, animationModel, baseAxis.model, true, roundCap);
			else saveOldStyle(el);
			if (realtimeSortCfg) el.forceLabelAnimation = true;
			if (isChangeOrder) {
				var textEl = el.getTextContent();
				if (textEl) {
					var labelInnerStore = labelInner(textEl);
					if (labelInnerStore.prevValue != null)
 /**
					* Set preValue to be value so that no new label
					* should be started, otherwise, it will take a full
					* `animationDurationUpdate` time to finish the
					* animation, which is not expected.
					*/
					labelInnerStore.prevValue = labelInnerStore.value;
				}
			} else updateStyle(el, data, newIndex, itemModel, layout, seriesModel, isHorizontalOrRadial, coord.type === "polar");
			if (isInitSort) el.attr({ shape: layout });
			else if (realtimeSortCfg) updateRealtimeAnimation(realtimeSortCfg, animationModel, el, layout, newIndex, isHorizontalOrRadial, true, isChangeOrder);
			else updateProps(el, { shape: layout }, seriesModel, newIndex, null);
			data.setItemGraphicEl(newIndex, el);
			el.ignore = isClipped;
			group.add(el);
		}).remove(function(dataIndex) {
			var el = oldData.getItemGraphicEl(dataIndex);
			el && removeElementWithFadeOut(el, seriesModel, dataIndex);
		}).execute();
		var bgGroup = this._backgroundGroup || (this._backgroundGroup = new Group());
		bgGroup.removeAll();
		for (var i = 0; i < bgEls.length; ++i) bgGroup.add(bgEls[i]);
		group.add(bgGroup);
		this._backgroundEls = bgEls;
		this._data = data;
	};
	BarView.prototype._renderLarge = function(seriesModel, ecModel, api) {
		this._clear();
		createLarge(seriesModel, this.group);
		this._updateLargeClip(seriesModel);
	};
	BarView.prototype._incrementalRenderLarge = function(params, seriesModel) {
		this._removeBackground();
		createLarge(seriesModel, this.group, this._progressiveEls, true);
	};
	BarView.prototype._updateLargeClip = function(seriesModel) {
		var clipPath = seriesModel.get("clip", true) && createClipPath(seriesModel.coordinateSystem, false, seriesModel);
		var group = this.group;
		if (clipPath) group.setClipPath(clipPath);
		else group.removeClipPath();
	};
	BarView.prototype._enableRealtimeSort = function(realtimeSortCfg, data, api) {
		var _this = this;
		if (!data.count()) return;
		var baseAxis = realtimeSortCfg.baseAxis;
		if (this._isFirstFrame) {
			this._dispatchInitSort(data, realtimeSortCfg, api);
			this._isFirstFrame = false;
		} else {
			var orderMapping_1 = function(idx) {
				var el = data.getItemGraphicEl(idx);
				var shape = el && el.shape;
				return shape && Math.abs(baseAxis.isHorizontal() ? shape.height : shape.width) || 0;
			};
			this._onRendered = function() {
				_this._updateSortWithinSameData(data, orderMapping_1, baseAxis, api);
			};
			api.getZr().on("rendered", this._onRendered);
		}
	};
	BarView.prototype._dataSort = function(data, baseAxis, orderMapping) {
		var info = [];
		data.each(data.mapDimension(baseAxis.dim), function(ordinalNumber, dataIdx) {
			var mappedValue = orderMapping(dataIdx);
			mappedValue = mappedValue == null ? NaN : mappedValue;
			info.push({
				dataIndex: dataIdx,
				mappedValue,
				ordinalNumber
			});
		});
		info.sort(function(a, b) {
			return b.mappedValue - a.mappedValue;
		});
		return { ordinalNumbers: map(info, function(item) {
			return item.ordinalNumber;
		}) };
	};
	BarView.prototype._isOrderChangedWithinSameData = function(data, orderMapping, baseAxis) {
		var scale = baseAxis.scale;
		var ordinalDataDim = data.mapDimension(baseAxis.dim);
		var lastValue = Number.MAX_VALUE;
		for (var tickNum = 0, len = scale.getOrdinalMeta().categories.length; tickNum < len; ++tickNum) {
			var rawIdx = data.rawIndexOf(ordinalDataDim, scale.getRawOrdinalNumber(tickNum));
			var value = rawIdx < 0 ? Number.MIN_VALUE : orderMapping(data.indexOfRawIndex(rawIdx));
			if (value > lastValue) return true;
			lastValue = value;
		}
		return false;
	};
	BarView.prototype._isOrderDifferentInView = function(orderInfo, baseAxis) {
		var scale = baseAxis.scale;
		var extent = scale.getExtent();
		var tickNum = Math.max(0, extent[0]);
		var tickMax = Math.min(extent[1], scale.getOrdinalMeta().categories.length - 1);
		for (; tickNum <= tickMax; ++tickNum) if (orderInfo.ordinalNumbers[tickNum] !== scale.getRawOrdinalNumber(tickNum)) return true;
	};
	BarView.prototype._updateSortWithinSameData = function(data, orderMapping, baseAxis, api) {
		if (!this._isOrderChangedWithinSameData(data, orderMapping, baseAxis)) return;
		var sortInfo = this._dataSort(data, baseAxis, orderMapping);
		if (this._isOrderDifferentInView(sortInfo, baseAxis)) {
			this._removeOnRenderedListener(api);
			api.dispatchAction({
				type: "changeAxisOrder",
				componentType: baseAxis.dim + "Axis",
				axisId: baseAxis.index,
				sortInfo
			});
		}
	};
	BarView.prototype._dispatchInitSort = function(data, realtimeSortCfg, api) {
		var baseAxis = realtimeSortCfg.baseAxis;
		var sortResult = this._dataSort(data, baseAxis, function(dataIdx) {
			return data.get(data.mapDimension(realtimeSortCfg.otherAxis.dim), dataIdx);
		});
		api.dispatchAction({
			type: "changeAxisOrder",
			componentType: baseAxis.dim + "Axis",
			isInitSort: true,
			axisId: baseAxis.index,
			sortInfo: sortResult
		});
	};
	BarView.prototype.remove = function(ecModel, api) {
		this._clear(this._model);
		this._removeOnRenderedListener(api);
	};
	BarView.prototype.dispose = function(ecModel, api) {
		this._removeOnRenderedListener(api);
	};
	BarView.prototype._removeOnRenderedListener = function(api) {
		if (this._onRendered) {
			api.getZr().off("rendered", this._onRendered);
			this._onRendered = null;
		}
	};
	BarView.prototype._clear = function(model) {
		var group = this.group;
		var data = this._data;
		if (model && model.isAnimationEnabled() && data && !this._isLargeDraw) {
			this._removeBackground();
			this._backgroundEls = [];
			data.eachItemGraphicEl(function(el) {
				removeElementWithFadeOut(el, model, getECData(el).dataIndex);
			});
		} else group.removeAll();
		this._data = null;
		this._isFirstFrame = true;
	};
	BarView.prototype._removeBackground = function() {
		this.group.remove(this._backgroundGroup);
		this._backgroundGroup = null;
	};
	BarView.type = "bar";
	return BarView;
}(ChartView);
var clip = {
	cartesian2d: function(coordSysClipArea, layout) {
		var signWidth = layout.width < 0 ? -1 : 1;
		var signHeight = layout.height < 0 ? -1 : 1;
		if (signWidth < 0) {
			layout.x += layout.width;
			layout.width = -layout.width;
		}
		if (signHeight < 0) {
			layout.y += layout.height;
			layout.height = -layout.height;
		}
		var coordSysX2 = coordSysClipArea.x + coordSysClipArea.width;
		var coordSysY2 = coordSysClipArea.y + coordSysClipArea.height;
		var x = mathMax(layout.x, coordSysClipArea.x);
		var x2 = mathMin(layout.x + layout.width, coordSysX2);
		var y = mathMax(layout.y, coordSysClipArea.y);
		var y2 = mathMin(layout.y + layout.height, coordSysY2);
		var xClipped = x2 < x;
		var yClipped = y2 < y;
		layout.x = xClipped && x > coordSysX2 ? x2 : x;
		layout.y = yClipped && y > coordSysY2 ? y2 : y;
		layout.width = xClipped ? 0 : x2 - x;
		layout.height = yClipped ? 0 : y2 - y;
		if (signWidth < 0) {
			layout.x += layout.width;
			layout.width = -layout.width;
		}
		if (signHeight < 0) {
			layout.y += layout.height;
			layout.height = -layout.height;
		}
		return xClipped || yClipped;
	},
	polar: function(coordSysClipArea, layout) {
		var signR = layout.r0 <= layout.r ? 1 : -1;
		if (signR < 0) {
			var tmp = layout.r;
			layout.r = layout.r0;
			layout.r0 = tmp;
		}
		var r = mathMin(layout.r, coordSysClipArea.r);
		var r0 = mathMax(layout.r0, coordSysClipArea.r0);
		layout.r = r;
		layout.r0 = r0;
		var clipped = r - r0 < 0;
		if (signR < 0) {
			var tmp = layout.r;
			layout.r = layout.r0;
			layout.r0 = tmp;
		}
		return clipped;
	}
};
var elementCreator = {
	cartesian2d: function(seriesModel, data, newIndex, layout, isHorizontal, animationModel, axisModel, isUpdate, roundCap) {
		var rect = new Rect({
			shape: extend({}, layout),
			z2: 1
		});
		rect.__dataIndex = newIndex;
		rect.name = "item";
		if (animationModel) {
			var rectShape = rect.shape;
			var animateProperty = isHorizontal ? "height" : "width";
			rectShape[animateProperty] = 0;
		}
		return rect;
	},
	polar: function(seriesModel, data, newIndex, layout, isRadial, animationModel, axisModel, isUpdate, roundCap) {
		var ShapeClass = !isRadial && roundCap ? SausagePath : Sector;
		var sector = new ShapeClass({
			shape: layout,
			z2: 1
		});
		sector.name = "item";
		sector.calculateTextPosition = createSectorCalculateTextPosition(createPolarPositionMapping(isRadial), { isRoundCap: ShapeClass === SausagePath });
		if (animationModel) {
			var sectorShape = sector.shape;
			var animateProperty = isRadial ? "r" : "endAngle";
			var animateTarget = {};
			sectorShape[animateProperty] = isRadial ? layout.r0 : layout.startAngle;
			animateTarget[animateProperty] = layout[animateProperty];
			(isUpdate ? updateProps : initProps)(sector, { shape: animateTarget }, animationModel);
		}
		return sector;
	}
};
function shouldRealtimeSort(seriesModel, coordSys) {
	var realtimeSortOption = seriesModel.get("realtimeSort", true);
	var baseAxis = coordSys.getBaseAxis();
	if (realtimeSortOption && baseAxis.type === "category" && coordSys.type === "cartesian2d") return {
		baseAxis,
		otherAxis: coordSys.getOtherAxis(baseAxis)
	};
}
function updateRealtimeAnimation(realtimeSortCfg, seriesAnimationModel, el, layout, newIndex, isHorizontal, isUpdate, isChangeOrder) {
	var seriesTarget;
	var axisTarget;
	if (isHorizontal) {
		axisTarget = {
			x: layout.x,
			width: layout.width
		};
		seriesTarget = {
			y: layout.y,
			height: layout.height
		};
	} else {
		axisTarget = {
			y: layout.y,
			height: layout.height
		};
		seriesTarget = {
			x: layout.x,
			width: layout.width
		};
	}
	if (!isChangeOrder) (isUpdate ? updateProps : initProps)(el, { shape: seriesTarget }, seriesAnimationModel, newIndex, null);
	var axisAnimationModel = seriesAnimationModel ? realtimeSortCfg.baseAxis.model : null;
	(isUpdate ? updateProps : initProps)(el, { shape: axisTarget }, axisAnimationModel, newIndex);
}
function checkPropertiesNotValid(obj, props) {
	for (var i = 0; i < props.length; i++) if (!isFinite(obj[props[i]])) return true;
	return false;
}
var rectPropties = [
	"x",
	"y",
	"width",
	"height"
];
var polarPropties = [
	"cx",
	"cy",
	"r",
	"startAngle",
	"endAngle"
];
var isValidLayout = {
	cartesian2d: function(layout) {
		return !checkPropertiesNotValid(layout, rectPropties);
	},
	polar: function(layout) {
		return !checkPropertiesNotValid(layout, polarPropties);
	}
};
var getLayout = {
	cartesian2d: function(data, dataIndex, itemModel) {
		var layout = data.getItemLayout(dataIndex);
		if (!layout) return null;
		var fixedLineWidth = itemModel ? getLineWidth(itemModel, layout) : 0;
		var signX = layout.width > 0 ? 1 : -1;
		var signY = layout.height > 0 ? 1 : -1;
		return {
			x: layout.x + signX * fixedLineWidth / 2,
			y: layout.y + signY * fixedLineWidth / 2,
			width: layout.width - signX * fixedLineWidth,
			height: layout.height - signY * fixedLineWidth
		};
	},
	polar: function(data, dataIndex, itemModel) {
		var layout = data.getItemLayout(dataIndex);
		return {
			cx: layout.cx,
			cy: layout.cy,
			r0: layout.r0,
			r: layout.r,
			startAngle: layout.startAngle,
			endAngle: layout.endAngle,
			clockwise: layout.clockwise
		};
	}
};
function isZeroOnPolar(layout) {
	return layout.startAngle != null && layout.endAngle != null && layout.startAngle === layout.endAngle;
}
function createPolarPositionMapping(isRadial) {
	return function(isRadial) {
		var arcOrAngle = isRadial ? "Arc" : "Angle";
		return function(position) {
			switch (position) {
				case "start":
				case "insideStart":
				case "end":
				case "insideEnd": return position + arcOrAngle;
				default: return position;
			}
		};
	}(isRadial);
}
function updateStyle(el, data, dataIndex, itemModel, layout, seriesModel, isHorizontalOrRadial, isPolar) {
	var style = data.getItemVisual(dataIndex, "style");
	if (!isPolar) {
		var borderRadius = itemModel.get(["itemStyle", "borderRadius"]) || 0;
		el.setShape("r", borderRadius);
	} else if (!seriesModel.get("roundCap")) {
		var sectorShape = el.shape;
		var cornerRadius = getSectorCornerRadius(itemModel.getModel("itemStyle"), sectorShape, true);
		extend(sectorShape, cornerRadius);
		el.setShape(sectorShape);
	}
	el.useStyle(style);
	var cursorStyle = itemModel.getShallow("cursor");
	cursorStyle && el.attr("cursor", cursorStyle);
	var labelPositionOutside = isPolar ? isHorizontalOrRadial ? layout.r >= layout.r0 ? "endArc" : "startArc" : layout.endAngle >= layout.startAngle ? "endAngle" : "startAngle" : isHorizontalOrRadial ? getLabelPositionForHorizontal(layout, seriesModel.coordinateSystem) : getLabelPositionForVertical(layout, seriesModel.coordinateSystem);
	var labelStatesModels = getLabelStatesModels(itemModel);
	setLabelStyle(el, labelStatesModels, {
		labelFetcher: seriesModel,
		labelDataIndex: dataIndex,
		defaultText: getDefaultLabel(seriesModel.getData(), dataIndex),
		inheritColor: style.fill,
		defaultOpacity: style.opacity,
		defaultOutsidePosition: labelPositionOutside
	});
	var label = el.getTextContent();
	if (isPolar && label) {
		var position = itemModel.get(["label", "position"]);
		el.textConfig.inside = position === "middle" ? true : null;
		setSectorTextRotation(el, position === "outside" ? labelPositionOutside : position, createPolarPositionMapping(isHorizontalOrRadial), itemModel.get(["label", "rotate"]));
	}
	setLabelValueAnimation(label, labelStatesModels, seriesModel.getRawValue(dataIndex), function(value) {
		return getDefaultInterpolatedLabel(data, value);
	});
	var emphasisModel = itemModel.getModel(["emphasis"]);
	toggleHoverEmphasis(el, emphasisModel.get("focus"), emphasisModel.get("blurScope"), emphasisModel.get("disabled"));
	setStatesStylesFromModel(el, itemModel);
	if (isZeroOnPolar(layout)) {
		el.style.fill = "none";
		el.style.stroke = "none";
		each(el.states, function(state) {
			if (state.style) state.style.fill = state.style.stroke = "none";
		});
	}
}
function getLineWidth(itemModel, rawLayout) {
	var borderColor = itemModel.get(["itemStyle", "borderColor"]);
	if (!borderColor || borderColor === "none") return 0;
	var lineWidth = itemModel.get(["itemStyle", "borderWidth"]) || 0;
	var width = isNaN(rawLayout.width) ? Number.MAX_VALUE : Math.abs(rawLayout.width);
	var height = isNaN(rawLayout.height) ? Number.MAX_VALUE : Math.abs(rawLayout.height);
	return Math.min(lineWidth, width, height);
}
var LagePathShape = function() {
	function LagePathShape() {}
	return LagePathShape;
}();
var LargePath = function(_super) {
	__extends(LargePath, _super);
	function LargePath(opts) {
		var _this = _super.call(this, opts) || this;
		_this.type = "largeBar";
		return _this;
	}
	LargePath.prototype.getDefaultShape = function() {
		return new LagePathShape();
	};
	LargePath.prototype.buildPath = function(ctx, shape) {
		var points = shape.points;
		var baseDimIdx = this.baseDimIdx;
		var valueDimIdx = 1 - this.baseDimIdx;
		var startPoint = [];
		var size = [];
		var barWidth = this.barWidth;
		for (var i = 0; i < points.length; i += 3) {
			size[baseDimIdx] = barWidth;
			size[valueDimIdx] = points[i + 2];
			startPoint[baseDimIdx] = points[i + baseDimIdx];
			startPoint[valueDimIdx] = points[i + valueDimIdx];
			ctx.rect(startPoint[0], startPoint[1], size[0], size[1]);
		}
	};
	return LargePath;
}(Path);
function createLarge(seriesModel, group, progressiveEls, incremental) {
	var data = seriesModel.getData();
	var baseDimIdx = data.getLayout("valueAxisHorizontal") ? 1 : 0;
	var largeDataIndices = data.getLayout("largeDataIndices");
	var barWidth = data.getLayout("size");
	var backgroundModel = seriesModel.getModel("backgroundStyle");
	var bgPoints = data.getLayout("largeBackgroundPoints");
	var incrementalId = incremental ? getIncrementalId(seriesModel) : 0;
	if (bgPoints) {
		var bgEl = new LargePath({
			shape: { points: bgPoints },
			incremental: incrementalId,
			silent: true,
			z2: 0
		});
		bgEl.baseDimIdx = baseDimIdx;
		bgEl.largeDataIndices = largeDataIndices;
		bgEl.barWidth = barWidth;
		bgEl.useStyle(backgroundModel.getItemStyle());
		group.add(bgEl);
		progressiveEls && progressiveEls.push(bgEl);
	}
	var el = new LargePath({
		shape: { points: data.getLayout("largePoints") },
		incremental: incrementalId,
		ignoreCoarsePointer: true,
		z2: 1
	});
	el.baseDimIdx = baseDimIdx;
	el.largeDataIndices = largeDataIndices;
	el.barWidth = barWidth;
	group.add(el);
	el.useStyle(data.getVisual("style"));
	el.style.stroke = null;
	getECData(el).seriesIndex = seriesModel.seriesIndex;
	if (!seriesModel.get("silent")) {
		el.on("mousedown", largePathUpdateDataIndex);
		el.on("mousemove", largePathUpdateDataIndex);
	}
	progressiveEls && progressiveEls.push(el);
}
var largePathUpdateDataIndex = throttle(function(event) {
	var largePath = this;
	var dataIndex = largePathFindDataIndex(largePath, event.offsetX, event.offsetY);
	getECData(largePath).dataIndex = dataIndex >= 0 ? dataIndex : null;
}, 30, false);
function largePathFindDataIndex(largePath, x, y) {
	var baseDimIdx = largePath.baseDimIdx;
	var valueDimIdx = 1 - baseDimIdx;
	var points = largePath.shape.points;
	var largeDataIndices = largePath.largeDataIndices;
	var startPoint = [];
	var size = [];
	var barWidth = largePath.barWidth;
	for (var i = 0, len = points.length / 3; i < len; i++) {
		var ii = i * 3;
		size[baseDimIdx] = barWidth;
		size[valueDimIdx] = points[ii + 2];
		startPoint[baseDimIdx] = points[ii + baseDimIdx];
		startPoint[valueDimIdx] = points[ii + valueDimIdx];
		if (size[valueDimIdx] < 0) {
			startPoint[valueDimIdx] += size[valueDimIdx];
			size[valueDimIdx] = -size[valueDimIdx];
		}
		if (x >= startPoint[0] && x <= startPoint[0] + size[0] && y >= startPoint[1] && y <= startPoint[1] + size[1]) return largeDataIndices[i];
	}
	return -1;
}
function createBackgroundShape(isHorizontalOrRadial, layout, coord) {
	if (isCoordinateSystemType(coord, "cartesian2d")) {
		var rectShape = layout;
		var coordLayout = coord.getArea();
		return {
			x: isHorizontalOrRadial ? rectShape.x : coordLayout.x,
			y: isHorizontalOrRadial ? coordLayout.y : rectShape.y,
			width: isHorizontalOrRadial ? rectShape.width : coordLayout.width,
			height: isHorizontalOrRadial ? coordLayout.height : rectShape.height
		};
	} else {
		var coordLayout = coord.getArea();
		var sectorShape = layout;
		return {
			cx: coordLayout.cx,
			cy: coordLayout.cy,
			r0: isHorizontalOrRadial ? coordLayout.r0 : sectorShape.r0,
			r: isHorizontalOrRadial ? coordLayout.r : sectorShape.r,
			startAngle: isHorizontalOrRadial ? sectorShape.startAngle : 0,
			endAngle: isHorizontalOrRadial ? sectorShape.endAngle : Math.PI * 2
		};
	}
}
function createBackgroundEl(coord, isHorizontalOrRadial, layout) {
	return new (coord.type === "polar" ? Sector : Rect)({
		shape: createBackgroundShape(isHorizontalOrRadial, layout, coord),
		silent: true,
		z2: 0
	});
}
function getLabelPositionForHorizontal(layout, coordSys) {
	if (layout.height === 0) return coordSys.getOtherAxis(coordSys.getBaseAxis()).inverse ? "bottom" : "top";
	return layout.height > 0 ? "bottom" : "top";
}
function getLabelPositionForVertical(layout, coordSys) {
	if (layout.width === 0) return coordSys.getOtherAxis(coordSys.getBaseAxis()).inverse ? "left" : "right";
	return layout.width >= 0 ? "right" : "left";
}
//#endregion
//#region node_modules/echarts/lib/chart/bar/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install(registers) {
	registers.registerChartView(BarView);
	registers.registerSeriesModel(BarSeriesModel);
	registers.registerLayout(registers.PRIORITY.VISUAL.LAYOUT, createCrossSeriesLayoutHandler("bar"));
	registers.registerLayout(registers.PRIORITY.VISUAL.PROGRESSIVE_LAYOUT, createProgressiveLayout("bar"));
	registers.registerProcessor(registers.PRIORITY.PROCESSOR.STATISTIC, dataSample("bar"));
	/**
	* @payload
	* @property {string} [componentType=series]
	* @property {number} [dx]
	* @property {number} [dy]
	* @property {number} [zoom]
	* @property {number} [originX]
	* @property {number} [originY]
	*/
	registers.registerAction({
		type: "changeAxisOrder",
		event: "changeAxisOrder",
		update: "update"
	}, function(payload, ecModel) {
		var componentType = payload.componentType || "series";
		ecModel.eachComponent({
			mainType: componentType,
			query: payload
		}, function(componentModel) {
			if (payload.sortInfo) componentModel.axis.setCategorySortInfo(payload.sortInfo);
		});
	});
	registerBarGridAxisHandlers(registers);
}
//#endregion
//#region node_modules/echarts/lib/processor/dataFilter.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function dataFilter(seriesType) {
	return {
		seriesType,
		reset: function(seriesModel, ecModel) {
			var legendModels = ecModel.findComponents({ mainType: "legend" });
			if (!legendModels || !legendModels.length) return;
			var data = seriesModel.getData();
			data.filterSelf(function(idx) {
				var name = data.getName(idx);
				for (var i = 0; i < legendModels.length; i++) if (!legendModels[i].isSelected(name)) return false;
				return true;
			});
		}
	};
}
//#endregion
//#region node_modules/echarts/lib/chart/helper/createSeriesDataSimply.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* [Usage]:
* (1)
* createListSimply(seriesModel, ['value']);
* (2)
* createListSimply(seriesModel, {
*     coordDimensions: ['value'],
*     dimensionsCount: 5
* });
*/
function createSeriesDataSimply(seriesModel, opt, nameList) {
	opt = isArray(opt) && { coordDimensions: opt } || extend({ encodeDefine: seriesModel.getEncode() }, opt);
	var source = seriesModel.getSource();
	var dimensions = prepareSeriesDataSchema(source, opt).dimensions;
	var list = new SeriesData(dimensions, seriesModel);
	list.initData(source, nameList);
	return list;
}
//#endregion
//#region node_modules/echarts/lib/visual/LegendVisualProvider.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* LegendVisualProvider is an bridge that pick encoded color from data and
* provide to the legend component.
*/
var LegendVisualProvider = function() {
	function LegendVisualProvider(getDataWithEncodedVisual, getRawData) {
		this._getDataWithEncodedVisual = getDataWithEncodedVisual;
		this._getRawData = getRawData;
	}
	LegendVisualProvider.prototype.getAllNames = function() {
		var rawData = this._getRawData();
		return rawData.mapArray(rawData.getName);
	};
	LegendVisualProvider.prototype.containName = function(name) {
		return this._getRawData().indexOfName(name) >= 0;
	};
	LegendVisualProvider.prototype.indexOfName = function(name) {
		return this._getDataWithEncodedVisual().indexOfName(name);
	};
	LegendVisualProvider.prototype.getItemVisual = function(dataIndex, key) {
		return this._getDataWithEncodedVisual().getItemVisual(dataIndex, key);
	};
	return LegendVisualProvider;
}();
var innerData = makeInner();
var PieSeriesModel = function(_super) {
	__extends(PieSeriesModel, _super);
	function PieSeriesModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = PieSeriesModel.type;
		return _this;
	}
	/**
	* @overwrite
	*/
	PieSeriesModel.prototype.init = function(option) {
		_super.prototype.init.apply(this, arguments);
		this.legendVisualProvider = new LegendVisualProvider(bind(this.getData, this), bind(this.getRawData, this));
		this._defaultLabelLine(option);
	};
	/**
	* @overwrite
	*/
	PieSeriesModel.prototype.mergeOption = function() {
		_super.prototype.mergeOption.apply(this, arguments);
	};
	/**
	* @overwrite
	*/
	PieSeriesModel.prototype.getInitialData = function() {
		return createSeriesDataSimply(this, {
			coordDimensions: ["value"],
			encodeDefaulter: curry(makeSeriesEncodeForNameBased, this)
		});
	};
	/**
	* @overwrite
	*/
	PieSeriesModel.prototype.getDataParams = function(dataIndex) {
		var data = this.getData();
		var dataInner = innerData(data);
		var seats = dataInner.seats;
		if (!seats) {
			var valueList_1 = [];
			data.each(data.mapDimension("value"), function(value) {
				valueList_1.push(value);
			});
			seats = dataInner.seats = getPercentSeats(valueList_1, data.hostModel.get("percentPrecision"));
		}
		var params = _super.prototype.getDataParams.call(this, dataIndex);
		params.percent = seats[dataIndex] || 0;
		params.$vars.push("percent");
		return params;
	};
	PieSeriesModel.prototype._defaultLabelLine = function(option) {
		defaultEmphasis(option, "labelLine", ["show"]);
		var labelLineNormalOpt = option.labelLine;
		var labelLineEmphasisOpt = option.emphasis.labelLine;
		labelLineNormalOpt.show = labelLineNormalOpt.show && option.label.show;
		labelLineEmphasisOpt.show = labelLineEmphasisOpt.show && option.emphasis.label.show;
	};
	PieSeriesModel.type = "series.pie";
	PieSeriesModel.defaultOption = {
		z: 2,
		legendHoverLink: true,
		colorBy: "data",
		center: ["50%", "50%"],
		radius: [0, "50%"],
		clockwise: true,
		startAngle: 90,
		endAngle: "auto",
		padAngle: 0,
		minAngle: 0,
		minShowLabelAngle: 0,
		selectedOffset: 10,
		percentPrecision: 2,
		stillShowZeroSum: true,
		coordinateSystemUsage: "box",
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
		width: null,
		height: null,
		label: {
			rotate: 0,
			show: true,
			overflow: "truncate",
			position: "outer",
			alignTo: "none",
			edgeDistance: "25%",
			distanceToLabelLine: 5
		},
		labelLine: {
			show: true,
			length: 15,
			length2: 30,
			smooth: false,
			minTurnAngle: 90,
			maxSurfaceAngle: 90,
			lineStyle: {
				width: 1,
				type: "solid"
			}
		},
		itemStyle: {
			borderWidth: 1,
			borderJoin: "round"
		},
		showEmptyCircle: true,
		emptyCircleStyle: {
			color: "lightgray",
			opacity: 1
		},
		labelLayout: { hideOverlap: true },
		emphasis: {
			scale: true,
			scaleSize: 5
		},
		avoidLabelOverlap: true,
		animationType: "expansion",
		animationDuration: 1e3,
		animationTypeUpdate: "transition",
		animationEasingUpdate: "cubicInOut",
		animationDurationUpdate: 500,
		animationEasing: "cubicInOut"
	};
	return PieSeriesModel;
}(SeriesModel);
registerLayOutOnCoordSysUsage({
	fullType: PieSeriesModel.type,
	getCoord2: function(model) {
		return model.getShallow("center");
	}
});
Math.PI * 2;
PathProxy.CMD;
function projectPointToLine(x1, y1, x2, y2, x, y, out, limitToEnds) {
	var dx = x - x1;
	var dy = y - y1;
	var dx1 = x2 - x1;
	var dy1 = y2 - y1;
	var lineLen = Math.sqrt(dx1 * dx1 + dy1 * dy1);
	dx1 /= lineLen;
	dy1 /= lineLen;
	var t = (dx * dx1 + dy * dy1) / lineLen;
	if (limitToEnds) t = Math.min(Math.max(t, 0), 1);
	t *= lineLen;
	var ox = out[0] = x1 + t * dx1;
	var oy = out[1] = y1 + t * dy1;
	return Math.sqrt((ox - x) * (ox - x) + (oy - y) * (oy - y));
}
var pt0 = new Point();
var pt1 = new Point();
var pt2 = new Point();
var dir = new Point();
var dir2 = new Point();
var tmpArr = [];
var tmpProjPoint = new Point();
/**
* Reduce the line segment attached to the label to limit the turn angle between two segments.
* @param linePoints
* @param minTurnAngle Radian of minimum turn angle. 0 - 180
*/
function limitTurnAngle(linePoints, minTurnAngle) {
	if (!(minTurnAngle <= 180 && minTurnAngle > 0)) return;
	minTurnAngle = minTurnAngle / 180 * Math.PI;
	pt0.fromArray(linePoints[0]);
	pt1.fromArray(linePoints[1]);
	pt2.fromArray(linePoints[2]);
	Point.sub(dir, pt0, pt1);
	Point.sub(dir2, pt2, pt1);
	var len1 = dir.len();
	var len2 = dir2.len();
	if (len1 < .001 || len2 < .001) return;
	dir.scale(1 / len1);
	dir2.scale(1 / len2);
	var angleCos = dir.dot(dir2);
	if (Math.cos(minTurnAngle) < angleCos) {
		var d = projectPointToLine(pt1.x, pt1.y, pt2.x, pt2.y, pt0.x, pt0.y, tmpArr, false);
		tmpProjPoint.fromArray(tmpArr);
		tmpProjPoint.scaleAndAdd(dir2, d / Math.tan(Math.PI - minTurnAngle));
		var t = pt2.x !== pt1.x ? (tmpProjPoint.x - pt1.x) / (pt2.x - pt1.x) : (tmpProjPoint.y - pt1.y) / (pt2.y - pt1.y);
		if (isNaN(t)) return;
		if (t < 0) Point.copy(tmpProjPoint, pt1);
		else if (t > 1) Point.copy(tmpProjPoint, pt2);
		tmpProjPoint.toArray(linePoints[1]);
	}
}
/**
* Limit the angle of line and the surface
* @param maxSurfaceAngle Radian of minimum turn angle. 0 - 180. 0 is same direction to normal. 180 is opposite
*/
function limitSurfaceAngle(linePoints, surfaceNormal, maxSurfaceAngle) {
	if (!(maxSurfaceAngle <= 180 && maxSurfaceAngle > 0)) return;
	maxSurfaceAngle = maxSurfaceAngle / 180 * Math.PI;
	pt0.fromArray(linePoints[0]);
	pt1.fromArray(linePoints[1]);
	pt2.fromArray(linePoints[2]);
	Point.sub(dir, pt1, pt0);
	Point.sub(dir2, pt2, pt1);
	var len1 = dir.len();
	var len2 = dir2.len();
	if (len1 < .001 || len2 < .001) return;
	dir.scale(1 / len1);
	dir2.scale(1 / len2);
	if (dir.dot(surfaceNormal) < Math.cos(maxSurfaceAngle)) {
		var d = projectPointToLine(pt1.x, pt1.y, pt2.x, pt2.y, pt0.x, pt0.y, tmpArr, false);
		tmpProjPoint.fromArray(tmpArr);
		var HALF_PI = Math.PI / 2;
		var newAngle = HALF_PI + Math.acos(dir2.dot(surfaceNormal)) - maxSurfaceAngle;
		if (newAngle >= HALF_PI) Point.copy(tmpProjPoint, pt2);
		else {
			tmpProjPoint.scaleAndAdd(dir2, d / Math.tan(Math.PI / 2 - newAngle));
			var t = pt2.x !== pt1.x ? (tmpProjPoint.x - pt1.x) / (pt2.x - pt1.x) : (tmpProjPoint.y - pt1.y) / (pt2.y - pt1.y);
			if (isNaN(t)) return;
			if (t < 0) Point.copy(tmpProjPoint, pt1);
			else if (t > 1) Point.copy(tmpProjPoint, pt2);
		}
		tmpProjPoint.toArray(linePoints[1]);
	}
}
function setLabelLineState(labelLine, ignore, stateName, stateModel) {
	var isNormal = stateName === "normal";
	var stateObj = isNormal ? labelLine : labelLine.ensureState(stateName);
	stateObj.ignore = ignore;
	var smooth = stateModel.get("smooth");
	smooth = smooth === true ? .3 : Math.max(+smooth, 0) || 0;
	stateObj.shape = stateObj.shape || {};
	stateObj.shape.smooth = smooth;
	var styleObj = stateModel.getModel("lineStyle").getLineStyle();
	isNormal ? labelLine.useStyle(styleObj) : stateObj.style = styleObj;
}
function buildLabelLinePath(path, shape) {
	var smooth = shape.smooth;
	var points = shape.points;
	if (!points) return;
	path.moveTo(points[0][0], points[0][1]);
	if (smooth > 0 && points.length >= 3) {
		var len1 = dist(points[0], points[1]);
		var len2 = dist(points[1], points[2]);
		if (!len1 || !len2) {
			path.lineTo(points[1][0], points[1][1]);
			path.lineTo(points[2][0], points[2][1]);
			return;
		}
		var moveLen = Math.min(len1, len2) * smooth;
		var midPoint0 = lerp$1([], points[1], points[0], moveLen / len1);
		var midPoint2 = lerp$1([], points[1], points[2], moveLen / len2);
		var midPoint1 = lerp$1([], midPoint0, midPoint2, .5);
		path.bezierCurveTo(midPoint0[0], midPoint0[1], midPoint0[0], midPoint0[1], midPoint1[0], midPoint1[1]);
		path.bezierCurveTo(midPoint2[0], midPoint2[1], midPoint2[0], midPoint2[1], points[2][0], points[2][1]);
	} else for (var i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1]);
}
/**
* Create a label line if necessary and set it's style.
*/
function setLabelLineStyle(targetEl, statesModels, defaultStyle) {
	var labelLine = targetEl.getTextGuideLine();
	var label = targetEl.getTextContent();
	if (!label) {
		if (labelLine) targetEl.removeTextGuideLine();
		return;
	}
	var normalModel = statesModels.normal;
	var showNormal = normalModel.get("show");
	var labelIgnoreNormal = label.ignore;
	for (var i = 0; i < DISPLAY_STATES.length; i++) {
		var stateName = DISPLAY_STATES[i];
		var stateModel = statesModels[stateName];
		var isNormal = stateName === "normal";
		if (stateModel) {
			var stateShow = stateModel.get("show");
			if ((isNormal ? labelIgnoreNormal : retrieve2(label.states[stateName] && label.states[stateName].ignore, labelIgnoreNormal)) || !retrieve2(stateShow, showNormal)) {
				var stateObj = isNormal ? labelLine : labelLine && labelLine.states[stateName];
				if (stateObj) stateObj.ignore = true;
				if (!!labelLine) setLabelLineState(labelLine, true, stateName, stateModel);
				continue;
			}
			if (!labelLine) {
				labelLine = new Polyline();
				targetEl.setTextGuideLine(labelLine);
				if (!isNormal && (labelIgnoreNormal || !showNormal)) setLabelLineState(labelLine, true, "normal", statesModels.normal);
				if (targetEl.stateProxy) labelLine.stateProxy = targetEl.stateProxy;
			}
			setLabelLineState(labelLine, false, stateName, stateModel);
		}
	}
	if (labelLine) {
		defaults(labelLine.style, defaultStyle);
		labelLine.style.fill = null;
		var showAbove = normalModel.get("showAbove");
		var labelLineConfig = targetEl.textGuideLineConfig = targetEl.textGuideLineConfig || {};
		labelLineConfig.showAbove = showAbove || false;
		labelLine.buildPath = buildLabelLinePath;
	}
}
function getLabelLineStatesModels(itemModel, labelLineName) {
	labelLineName = labelLineName || "labelLine";
	var statesModels = { normal: itemModel.getModel(labelLineName) };
	for (var i = 0; i < SPECIAL_STATES.length; i++) {
		var stateName = SPECIAL_STATES[i];
		statesModels[stateName] = itemModel.getModel([stateName, labelLineName]);
	}
	return statesModels;
}
//#endregion
//#region node_modules/echarts/lib/chart/pie/labelLayout.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var RADIAN$1 = Math.PI / 180;
function adjustSingleSide(list, cx, cy, r, dir, viewWidth, viewHeight, viewLeft, viewTop, farthestX) {
	if (list.length < 2) return;
	function recalculateXOnSemiToAlignOnEllipseCurve(semi) {
		var rB = semi.rB;
		var rB2 = rB * rB;
		for (var i = 0; i < semi.list.length; i++) {
			var item = semi.list[i];
			var dy = Math.abs(item.label.y - cy);
			var rA = r + item.len;
			var rA2 = rA * rA;
			var newX = cx + (Math.sqrt(Math.abs((1 - dy * dy / rB2) * rA2)) + item.len2) * dir;
			var deltaX = newX - item.label.x;
			constrainTextWidth(item, item.targetTextWidth - deltaX * dir, true);
			item.label.x = newX;
		}
	}
	function recalculateX(items) {
		var topSemi = {
			list: [],
			maxY: 0
		};
		var bottomSemi = {
			list: [],
			maxY: 0
		};
		for (var i = 0; i < items.length; i++) {
			if (items[i].labelAlignTo !== "none") continue;
			var item = items[i];
			var semi = item.label.y > cy ? bottomSemi : topSemi;
			var dy = Math.abs(item.label.y - cy);
			if (dy >= semi.maxY) {
				var dx = item.label.x - cx - item.len2 * dir;
				var rA = r + item.len;
				semi.rB = Math.abs(dx) < rA ? Math.sqrt(dy * dy / (1 - dx * dx / rA / rA)) : rA;
				semi.maxY = dy;
			}
			semi.list.push(item);
		}
		recalculateXOnSemiToAlignOnEllipseCurve(topSemi);
		recalculateXOnSemiToAlignOnEllipseCurve(bottomSemi);
	}
	var len = list.length;
	for (var i = 0; i < len; i++) if (list[i].position === "outer" && list[i].labelAlignTo === "labelLine") {
		var dx = list[i].label.x - farthestX;
		list[i].linePoints[1][0] += dx;
		list[i].label.x = farthestX;
	}
	if (shiftLayoutOnXY(list, 1, viewTop, viewTop + viewHeight)) recalculateX(list);
}
function avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight, viewLeft, viewTop) {
	var leftList = [];
	var rightList = [];
	var leftmostX = Number.MAX_VALUE;
	var rightmostX = -Number.MAX_VALUE;
	for (var i = 0; i < labelLayoutList.length; i++) {
		var label = labelLayoutList[i].label;
		if (isPositionCenter(labelLayoutList[i])) continue;
		if (label.x < cx) {
			leftmostX = Math.min(leftmostX, label.x);
			leftList.push(labelLayoutList[i]);
		} else {
			rightmostX = Math.max(rightmostX, label.x);
			rightList.push(labelLayoutList[i]);
		}
	}
	for (var i = 0; i < labelLayoutList.length; i++) {
		var layout = labelLayoutList[i];
		if (!isPositionCenter(layout) && layout.linePoints) {
			if (layout.labelStyleWidth != null) continue;
			var label = layout.label;
			var linePoints = layout.linePoints;
			var targetTextWidth = void 0;
			if (layout.labelAlignTo === "edge") {
				if (label.x < cx) targetTextWidth = linePoints[2][0] - layout.labelDistance - viewLeft - layout.edgeDistance;
				else targetTextWidth = viewLeft + viewWidth - layout.edgeDistance - linePoints[2][0] - layout.labelDistance;
			} else if (layout.labelAlignTo === "labelLine") {
				if (label.x < cx) targetTextWidth = leftmostX - viewLeft - layout.bleedMargin;
				else targetTextWidth = viewLeft + viewWidth - rightmostX - layout.bleedMargin;
			} else if (label.x < cx) targetTextWidth = label.x - viewLeft - layout.bleedMargin;
			else targetTextWidth = viewLeft + viewWidth - label.x - layout.bleedMargin;
			layout.targetTextWidth = targetTextWidth;
			constrainTextWidth(layout, targetTextWidth, false);
		}
	}
	adjustSingleSide(rightList, cx, cy, r, 1, viewWidth, viewHeight, viewLeft, viewTop, rightmostX);
	adjustSingleSide(leftList, cx, cy, r, -1, viewWidth, viewHeight, viewLeft, viewTop, leftmostX);
	for (var i = 0; i < labelLayoutList.length; i++) {
		var layout = labelLayoutList[i];
		if (!isPositionCenter(layout) && layout.linePoints) {
			var label = layout.label;
			var linePoints = layout.linePoints;
			var isAlignToEdge = layout.labelAlignTo === "edge";
			var padding = label.style.padding;
			var paddingH = padding ? padding[1] + padding[3] : 0;
			var extraPaddingH = label.style.backgroundColor ? 0 : paddingH;
			var realTextWidth = layout.rect.width + extraPaddingH;
			var dist = linePoints[1][0] - linePoints[2][0];
			if (isAlignToEdge) {
				if (label.x < cx) linePoints[2][0] = viewLeft + layout.edgeDistance + realTextWidth + layout.labelDistance;
				else linePoints[2][0] = viewLeft + viewWidth - layout.edgeDistance - realTextWidth - layout.labelDistance;
			} else {
				if (label.x < cx) linePoints[2][0] = label.x + layout.labelDistance;
				else linePoints[2][0] = label.x - layout.labelDistance;
				linePoints[1][0] = linePoints[2][0] + dist;
			}
			linePoints[1][1] = linePoints[2][1] = label.y;
		}
	}
}
/**
* Set max width of each label, and then wrap each label to the max width.
*
* @param layout label layout
* @param availableWidth max width for the label to display
* @param forceRecalculate recaculate the text layout even if the current width
* is smaller than `availableWidth`. This is useful when the text was previously
* wrapped by calling `constrainTextWidth` but now `availableWidth` changed, in
* which case, previous wrapping should be redo.
*/
function constrainTextWidth(layout, availableWidth, forceRecalculate) {
	if (layout.labelStyleWidth != null) return;
	var label = layout.label;
	var style = label.style;
	var textRect = layout.rect;
	var bgColor = style.backgroundColor;
	var padding = style.padding;
	var paddingH = padding ? padding[1] + padding[3] : 0;
	var overflow = style.overflow;
	var oldOuterWidth = textRect.width + (bgColor ? 0 : paddingH);
	if (availableWidth < oldOuterWidth || forceRecalculate) {
		if (overflow && overflow.match("break")) {
			label.setStyle("backgroundColor", null);
			label.setStyle("width", availableWidth - paddingH);
			var innerRect = label.getBoundingRect();
			label.setStyle("width", Math.ceil(innerRect.width));
			label.setStyle("backgroundColor", bgColor);
		} else {
			var availableInnerWidth = availableWidth - paddingH;
			var newWidth = availableWidth < oldOuterWidth ? availableInnerWidth : forceRecalculate ? availableInnerWidth > layout.unconstrainedWidth ? null : availableInnerWidth : null;
			label.setStyle("width", newWidth);
		}
		computeLabelGlobalRect(textRect, label);
	}
}
function computeLabelGlobalRect(out, label) {
	_tmpLabelGeometry.rect = out;
	computeLabelGeometry(_tmpLabelGeometry, label, _computeLabelGeometryOpt);
}
var _computeLabelGeometryOpt = {
	minMarginForce: [
		null,
		0,
		null,
		0
	],
	marginDefault: [
		1,
		0,
		1,
		0
	]
};
var _tmpLabelGeometry = {};
function isPositionCenter(sectorShape) {
	return sectorShape.position === "center";
}
function pieLabelLayout(seriesModel) {
	var data = seriesModel.getData();
	var labelLayoutList = [];
	var cx;
	var cy;
	var hasLabelRotate = false;
	var minShowLabelRadian = (seriesModel.get("minShowLabelAngle") || 0) * RADIAN$1;
	var viewRect = data.getLayout("viewRect");
	var r = data.getLayout("r");
	var viewWidth = viewRect.width;
	var viewLeft = viewRect.x;
	var viewTop = viewRect.y;
	var viewHeight = viewRect.height;
	function setNotShow(el) {
		el.ignore = true;
	}
	function isLabelShown(label) {
		if (!label.ignore) return true;
		for (var key in label.states) if (label.states[key].ignore === false) return true;
		return false;
	}
	data.each(function(idx) {
		var sector = data.getItemGraphicEl(idx);
		var sectorShape = sector.shape;
		var label = sector.getTextContent();
		var labelLine = sector.getTextGuideLine();
		var itemModel = data.getItemModel(idx);
		var labelModel = itemModel.getModel("label");
		var labelPosition = labelModel.get("position") || itemModel.get([
			"emphasis",
			"label",
			"position"
		]);
		var labelDistance = labelModel.get("distanceToLabelLine");
		var labelAlignTo = labelModel.get("alignTo");
		var edgeDistance = parsePercent$1(labelModel.get("edgeDistance"), viewWidth);
		var bleedMargin = labelModel.get("bleedMargin");
		if (bleedMargin == null) bleedMargin = Math.min(viewWidth, viewHeight) > 200 ? 10 : 2;
		var labelLineModel = itemModel.getModel("labelLine");
		var labelLineLen = labelLineModel.get("length");
		labelLineLen = parsePercent$1(labelLineLen, viewWidth);
		var labelLineLen2 = labelLineModel.get("length2");
		labelLineLen2 = parsePercent$1(labelLineLen2, viewWidth);
		if (Math.abs(sectorShape.endAngle - sectorShape.startAngle) < minShowLabelRadian) {
			each(label.states, setNotShow);
			label.ignore = true;
			if (labelLine) {
				each(labelLine.states, setNotShow);
				labelLine.ignore = true;
			}
			return;
		}
		if (!isLabelShown(label)) return;
		var midAngle = (sectorShape.startAngle + sectorShape.endAngle) / 2;
		var nx = Math.cos(midAngle);
		var ny = Math.sin(midAngle);
		var textX;
		var textY;
		var linePoints;
		var textAlign;
		cx = sectorShape.cx;
		cy = sectorShape.cy;
		var isLabelInside = labelPosition === "inside" || labelPosition === "inner";
		if (labelPosition === "center") {
			textX = sectorShape.cx;
			textY = sectorShape.cy;
			textAlign = "center";
		} else {
			var x1 = (isLabelInside ? (sectorShape.r + sectorShape.r0) / 2 * nx : sectorShape.r * nx) + cx;
			var y1 = (isLabelInside ? (sectorShape.r + sectorShape.r0) / 2 * ny : sectorShape.r * ny) + cy;
			textX = x1 + nx * 3;
			textY = y1 + ny * 3;
			if (!isLabelInside) {
				var x2 = x1 + nx * (labelLineLen + r - sectorShape.r);
				var y2 = y1 + ny * (labelLineLen + r - sectorShape.r);
				var x3 = x2 + (nx < 0 ? -1 : 1) * labelLineLen2;
				var y3 = y2;
				if (labelAlignTo === "edge") textX = nx < 0 ? viewLeft + edgeDistance : viewLeft + viewWidth - edgeDistance;
				else textX = x3 + (nx < 0 ? -labelDistance : labelDistance);
				textY = y3;
				linePoints = [
					[x1, y1],
					[x2, y2],
					[x3, y3]
				];
			}
			textAlign = isLabelInside ? "center" : labelAlignTo === "edge" ? nx > 0 ? "right" : "left" : nx > 0 ? "left" : "right";
		}
		var PI = Math.PI;
		var labelRotate = 0;
		var rotate = labelModel.get("rotate");
		if (isNumber(rotate)) labelRotate = rotate * (PI / 180);
		else if (labelPosition === "center") labelRotate = 0;
		else if (rotate === "radial" || rotate === true) labelRotate = nx < 0 ? -midAngle + PI : -midAngle;
		else if (rotate === "tangential" || rotate === "tangential-noflip" && labelPosition !== "outside" && labelPosition !== "outer") {
			var rad = Math.atan2(nx, ny);
			if (rad < 0) rad = PI * 2 + rad;
			if (ny > 0 && rotate !== "tangential-noflip") rad = PI + rad;
			labelRotate = rad - PI;
		}
		hasLabelRotate = !!labelRotate;
		label.x = textX;
		label.y = textY;
		label.rotation = labelRotate;
		label.setStyle({ verticalAlign: "middle" });
		if (!isLabelInside) {
			var textRect = new BoundingRect(0, 0, 0, 0);
			computeLabelGlobalRect(textRect, label);
			labelLayoutList.push({
				label,
				labelLine,
				position: labelPosition,
				len: labelLineLen,
				len2: labelLineLen2,
				minTurnAngle: labelLineModel.get("minTurnAngle"),
				maxSurfaceAngle: labelLineModel.get("maxSurfaceAngle"),
				surfaceNormal: new Point(nx, ny),
				linePoints,
				textAlign,
				labelDistance,
				labelAlignTo,
				edgeDistance,
				bleedMargin,
				rect: textRect,
				unconstrainedWidth: textRect.width,
				labelStyleWidth: label.style.width
			});
		} else {
			label.setStyle({ align: textAlign });
			var selectState = label.states.select;
			if (selectState) {
				selectState.x += label.x;
				selectState.y += label.y;
			}
		}
		sector.setTextConfig({ inside: isLabelInside });
	});
	if (!hasLabelRotate && seriesModel.get("avoidLabelOverlap")) avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight, viewLeft, viewTop);
	for (var i = 0; i < labelLayoutList.length; i++) {
		var layout = labelLayoutList[i];
		var label = layout.label;
		var labelLine = layout.labelLine;
		var notShowLabel = isNaN(label.x) || isNaN(label.y);
		if (label) {
			label.setStyle({ align: layout.textAlign });
			if (notShowLabel) {
				each(label.states, setNotShow);
				label.ignore = true;
			}
			var selectState = label.states.select;
			if (selectState) {
				selectState.x += label.x;
				selectState.y += label.y;
			}
		}
		if (labelLine) {
			var linePoints = layout.linePoints;
			if (notShowLabel || !linePoints) {
				each(labelLine.states, setNotShow);
				labelLine.ignore = true;
			} else {
				limitTurnAngle(linePoints, layout.minTurnAngle);
				limitSurfaceAngle(linePoints, layout.surfaceNormal, layout.maxSurfaceAngle);
				labelLine.setShape({ points: linePoints });
				label.__hostTarget.textGuideLineConfig = { anchor: new Point(linePoints[0][0], linePoints[0][1]) };
			}
		}
	}
}
//#endregion
//#region node_modules/echarts/lib/chart/pie/pieLayout.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var PI2 = Math.PI * 2;
var RADIAN = Math.PI / 180;
var pieLayoutStageHandler = createSimpleOverallStageHandler("pie", pieLayout);
function pieLayout(ecModel, api) {
	ecModel.eachSeriesByType("pie", function(seriesModel) {
		var data = seriesModel.getData();
		var valueDim = data.mapDimension("value");
		var _a = getCircleLayout(seriesModel, api), cx = _a.cx, cy = _a.cy, r = _a.r, r0 = _a.r0, viewRect = _a.viewRect;
		var startAngle = -seriesModel.get("startAngle") * RADIAN;
		var endAngle = seriesModel.get("endAngle");
		var padAngle = seriesModel.get("padAngle") * RADIAN;
		endAngle = endAngle === "auto" ? startAngle - PI2 : -endAngle * RADIAN;
		var minAndPadAngle = seriesModel.get("minAngle") * RADIAN + padAngle;
		var validDataCount = 0;
		data.each(valueDim, function(value) {
			!isNaN(value) && validDataCount++;
		});
		var sum = data.getSum(valueDim);
		var unitRadian = Math.PI / (sum || validDataCount) * 2;
		var clockwise = seriesModel.get("clockwise");
		var roseType = seriesModel.get("roseType");
		var stillShowZeroSum = seriesModel.get("stillShowZeroSum");
		var extent = data.getDataExtent(valueDim);
		extent[0] = 0;
		var dir = clockwise ? 1 : -1;
		var angles = [startAngle, endAngle];
		var halfPadAngle = dir * padAngle / 2;
		normalizeArcAngles(angles, !clockwise);
		startAngle = angles[0], endAngle = angles[1];
		var layoutData = getSeriesLayoutData(seriesModel);
		layoutData.startAngle = startAngle;
		layoutData.endAngle = endAngle;
		layoutData.clockwise = clockwise;
		layoutData.cx = cx;
		layoutData.cy = cy;
		layoutData.r = r;
		layoutData.r0 = r0;
		var angleRange = Math.abs(endAngle - startAngle);
		var restAngle = angleRange;
		var valueSumLargerThanMinAngle = 0;
		var currentAngle = startAngle;
		data.setLayout({
			viewRect,
			r
		});
		data.each(valueDim, function(value, idx) {
			var angle;
			if (isNaN(value)) {
				data.setItemLayout(idx, {
					angle: NaN,
					startAngle: NaN,
					endAngle: NaN,
					clockwise,
					cx,
					cy,
					r0,
					r: roseType ? NaN : r
				});
				return;
			}
			if (roseType !== "area") angle = sum === 0 && stillShowZeroSum ? unitRadian : value * unitRadian;
			else angle = angleRange / validDataCount;
			if (angle < minAndPadAngle) {
				angle = minAndPadAngle;
				restAngle -= minAndPadAngle;
			} else valueSumLargerThanMinAngle += value;
			var endAngle = currentAngle + dir * angle;
			var actualStartAngle = 0;
			var actualEndAngle = 0;
			if (padAngle > angle) {
				actualStartAngle = currentAngle + dir * angle / 2;
				actualEndAngle = actualStartAngle;
			} else {
				actualStartAngle = currentAngle + halfPadAngle;
				actualEndAngle = endAngle - halfPadAngle;
			}
			data.setItemLayout(idx, {
				angle,
				startAngle: actualStartAngle,
				endAngle: actualEndAngle,
				clockwise,
				cx,
				cy,
				r0,
				r: roseType ? linearMap(value, extent, [r0, r]) : r
			});
			currentAngle = endAngle;
		});
		if (restAngle < PI2 && validDataCount) {
			if (restAngle <= .001) {
				var angle_1 = angleRange / validDataCount;
				data.each(valueDim, function(value, idx) {
					if (!isNaN(value)) {
						var layout = data.getItemLayout(idx);
						layout.angle = angle_1;
						var actualStartAngle = 0;
						var actualEndAngle = 0;
						if (angle_1 < padAngle) {
							actualStartAngle = startAngle + dir * (idx + 1 / 2) * angle_1;
							actualEndAngle = actualStartAngle;
						} else {
							actualStartAngle = startAngle + dir * idx * angle_1 + halfPadAngle;
							actualEndAngle = startAngle + dir * (idx + 1) * angle_1 - halfPadAngle;
						}
						layout.startAngle = actualStartAngle;
						layout.endAngle = actualEndAngle;
					}
				});
			} else {
				unitRadian = restAngle / valueSumLargerThanMinAngle;
				currentAngle = startAngle;
				data.each(valueDim, function(value, idx) {
					if (!isNaN(value)) {
						var layout = data.getItemLayout(idx);
						var angle = layout.angle === minAndPadAngle ? minAndPadAngle : value * unitRadian;
						var actualStartAngle = 0;
						var actualEndAngle = 0;
						if (angle < padAngle) {
							actualStartAngle = currentAngle + dir * angle / 2;
							actualEndAngle = actualStartAngle;
						} else {
							actualStartAngle = currentAngle + halfPadAngle;
							actualEndAngle = currentAngle + dir * angle - halfPadAngle;
						}
						layout.startAngle = actualStartAngle;
						layout.endAngle = actualEndAngle;
						currentAngle += dir * angle;
					}
				});
			}
		}
	});
}
var getSeriesLayoutData = makeInner();
//#endregion
//#region node_modules/echarts/lib/chart/pie/PieView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Piece of pie including Sector, Label, LabelLine
*/
var PiePiece = function(_super) {
	__extends(PiePiece, _super);
	function PiePiece(data, idx, startAngle) {
		var _this = _super.call(this) || this;
		_this.z2 = 2;
		var text = new ZRText();
		_this.setTextContent(text);
		_this.updateData(data, idx, startAngle, true);
		return _this;
	}
	PiePiece.prototype.updateData = function(data, idx, startAngle, firstCreate) {
		var sector = this;
		var seriesModel = data.hostModel;
		var itemModel = data.getItemModel(idx);
		var emphasisModel = itemModel.getModel("emphasis");
		var layout = data.getItemLayout(idx);
		var sectorShape = extend(getSectorCornerRadius(itemModel.getModel("itemStyle"), layout, true), layout);
		if (isNaN(sectorShape.startAngle)) {
			sector.setShape(sectorShape);
			return;
		}
		if (firstCreate) {
			sector.setShape(sectorShape);
			var animationType = seriesModel.getShallow("animationType");
			if (seriesModel.ecModel.ssr) {
				initProps(sector, {
					scaleX: 0,
					scaleY: 0
				}, seriesModel, {
					dataIndex: idx,
					isFrom: true
				});
				sector.originX = sectorShape.cx;
				sector.originY = sectorShape.cy;
			} else if (animationType === "scale") {
				sector.shape.r = layout.r0;
				initProps(sector, { shape: { r: layout.r } }, seriesModel, idx);
			} else if (startAngle != null) {
				sector.setShape({
					startAngle,
					endAngle: startAngle
				});
				initProps(sector, { shape: {
					startAngle: layout.startAngle,
					endAngle: layout.endAngle
				} }, seriesModel, idx);
			} else {
				sector.shape.endAngle = layout.startAngle;
				updateProps(sector, { shape: { endAngle: layout.endAngle } }, seriesModel, idx);
			}
		} else {
			saveOldStyle(sector);
			updateProps(sector, { shape: sectorShape }, seriesModel, idx);
		}
		sector.useStyle(data.getItemVisual(idx, "style"));
		setStatesStylesFromModel(sector, itemModel);
		var midAngle = (layout.startAngle + layout.endAngle) / 2;
		var offset = seriesModel.get("selectedOffset");
		var dx = Math.cos(midAngle) * offset;
		var dy = Math.sin(midAngle) * offset;
		var cursorStyle = itemModel.getShallow("cursor");
		cursorStyle && sector.attr("cursor", cursorStyle);
		this._updateLabel(seriesModel, data, idx);
		sector.ensureState("emphasis").shape = extend({ r: layout.r + (emphasisModel.get("scale") ? emphasisModel.get("scaleSize") || 0 : 0) }, getSectorCornerRadius(emphasisModel.getModel("itemStyle"), layout));
		extend(sector.ensureState("select"), {
			x: dx,
			y: dy,
			shape: getSectorCornerRadius(itemModel.getModel(["select", "itemStyle"]), layout)
		});
		extend(sector.ensureState("blur"), { shape: getSectorCornerRadius(itemModel.getModel(["blur", "itemStyle"]), layout) });
		var labelLine = sector.getTextGuideLine();
		var labelText = sector.getTextContent();
		labelLine && extend(labelLine.ensureState("select"), {
			x: dx,
			y: dy
		});
		extend(labelText.ensureState("select"), {
			x: dx,
			y: dy
		});
		toggleHoverEmphasis(this, emphasisModel.get("focus"), emphasisModel.get("blurScope"), emphasisModel.get("disabled"));
	};
	PiePiece.prototype._updateLabel = function(seriesModel, data, idx) {
		var sector = this;
		var itemModel = data.getItemModel(idx);
		var labelLineModel = itemModel.getModel("labelLine");
		var style = data.getItemVisual(idx, "style");
		var visualColor = style && style.fill;
		var visualOpacity = style && style.opacity;
		setLabelStyle(sector, getLabelStatesModels(itemModel), {
			labelFetcher: data.hostModel,
			labelDataIndex: idx,
			inheritColor: visualColor,
			defaultOpacity: visualOpacity,
			defaultText: seriesModel.getFormattedLabel(idx, "normal") || data.getName(idx)
		});
		var labelText = sector.getTextContent();
		sector.setTextConfig({
			position: null,
			rotation: null
		});
		labelText.attr({ z2: 10 });
		var labelPosition = itemModel.get(["label", "position"]);
		if (labelPosition !== "outside" && labelPosition !== "outer") sector.removeTextGuideLine();
		else {
			var polyline = this.getTextGuideLine();
			if (!polyline) {
				polyline = new Polyline();
				this.setTextGuideLine(polyline);
			}
			setLabelLineStyle(this, getLabelLineStatesModels(itemModel), {
				stroke: visualColor,
				opacity: retrieve3(labelLineModel.get(["lineStyle", "opacity"]), visualOpacity, 1)
			});
		}
	};
	return PiePiece;
}(Sector);
var PieView = function(_super) {
	__extends(PieView, _super);
	function PieView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = "pie";
		_this.ignoreLabelLineUpdate = true;
		return _this;
	}
	PieView.prototype.render = function(seriesModel, ecModel, api, payload) {
		var data = seriesModel.getData();
		var oldData = this._data;
		var group = this.group;
		var startAngle;
		if (!oldData && data.count() > 0) {
			var shape = data.getItemLayout(0);
			for (var s = 1; isNaN(shape && shape.startAngle) && s < data.count(); ++s) shape = data.getItemLayout(s);
			if (shape) startAngle = shape.startAngle;
		}
		if (this._emptyCircleSector) group.remove(this._emptyCircleSector);
		if (data.count() === 0 && seriesModel.get("showEmptyCircle")) {
			var layoutData = getSeriesLayoutData(seriesModel);
			var sector = new Sector({ shape: clone(layoutData) });
			sector.useStyle(seriesModel.getModel("emptyCircleStyle").getItemStyle());
			this._emptyCircleSector = sector;
			group.add(sector);
		}
		data.diff(oldData).add(function(idx) {
			var piePiece = new PiePiece(data, idx, startAngle);
			data.setItemGraphicEl(idx, piePiece);
			group.add(piePiece);
		}).update(function(newIdx, oldIdx) {
			var piePiece = oldData.getItemGraphicEl(oldIdx);
			piePiece.updateData(data, newIdx, startAngle);
			piePiece.off("click");
			group.add(piePiece);
			data.setItemGraphicEl(newIdx, piePiece);
		}).remove(function(idx) {
			var piePiece = oldData.getItemGraphicEl(idx);
			removeElementWithFadeOut(piePiece, seriesModel, idx);
		}).execute();
		pieLabelLayout(seriesModel);
		if (seriesModel.get("animationTypeUpdate") !== "expansion") this._data = data;
	};
	PieView.prototype.dispose = function() {};
	PieView.prototype.containPoint = function(point, seriesModel) {
		var itemLayout = seriesModel.getData().getItemLayout(0);
		if (itemLayout) {
			var dx = point[0] - itemLayout.cx;
			var dy = point[1] - itemLayout.cy;
			var radius = Math.sqrt(dx * dx + dy * dy);
			return radius <= itemLayout.r && radius >= itemLayout.r0;
		}
	};
	PieView.type = "pie";
	return PieView;
}(ChartView);
//#endregion
//#region node_modules/echarts/lib/processor/negativeDataFilter.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function negativeDataFilter(seriesType) {
	return {
		seriesType,
		reset: function(seriesModel, ecModel) {
			var data = seriesModel.getData();
			data.filterSelf(function(idx) {
				var valueDim = data.mapDimension("value");
				var curValue = data.get(valueDim, idx);
				if (isNumber(curValue) && !isNaN(curValue) && curValue < 0) return false;
				return true;
			});
		}
	};
}
//#endregion
//#region node_modules/echarts/lib/chart/pie/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$2(registers) {
	registers.registerChartView(PieView);
	registers.registerSeriesModel(PieSeriesModel);
	createLegacyDataSelectAction("pie", registers.registerAction);
	registers.registerLayout(pieLayoutStageHandler);
	registers.registerProcessor(dataFilter("pie"));
	registers.registerProcessor(negativeDataFilter("pie"));
}
//#endregion
//#region node_modules/echarts/lib/chart/scatter/ScatterSeries.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var ScatterSeriesModel = function(_super) {
	__extends(ScatterSeriesModel, _super);
	function ScatterSeriesModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = ScatterSeriesModel.type;
		_this.hasSymbolVisual = true;
		return _this;
	}
	ScatterSeriesModel.prototype.getInitialData = function(option, ecModel) {
		return createSeriesData(null, this, { useEncodeDefaulter: true });
	};
	ScatterSeriesModel.prototype.getProgressive = function() {
		var progressive = this.option.progressive;
		if (progressive == null) return this.option.large ? 5e3 : this.get("progressive");
		return progressive;
	};
	ScatterSeriesModel.prototype.getProgressiveThreshold = function() {
		var progressiveThreshold = this.option.progressiveThreshold;
		if (progressiveThreshold == null) return this.option.large ? 1e4 : this.get("progressiveThreshold");
		return progressiveThreshold;
	};
	ScatterSeriesModel.prototype.brushSelector = function(dataIndex, data, selectors) {
		return selectors.point(data.getItemLayout(dataIndex));
	};
	ScatterSeriesModel.prototype.getZLevelKey = function() {
		return this.getData().count() > this.getProgressiveThreshold() ? this.id : "";
	};
	ScatterSeriesModel.type = "series.scatter";
	ScatterSeriesModel.dependencies = [
		"grid",
		"polar",
		"geo",
		"singleAxis",
		"calendar",
		"matrix"
	];
	ScatterSeriesModel.defaultOption = {
		coordinateSystem: "cartesian2d",
		z: 2,
		legendHoverLink: true,
		symbolSize: 10,
		large: false,
		largeThreshold: 2e3,
		itemStyle: { opacity: .8 },
		emphasis: { scale: true },
		clip: true,
		select: { itemStyle: { borderColor: tokens.color.primary } },
		universalTransition: { divideShape: "clone" }
	};
	return ScatterSeriesModel;
}(SeriesModel);
//#endregion
//#region node_modules/echarts/lib/chart/helper/LargeSymbolDraw.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var BOOST_SIZE_THRESHOLD = 4;
var LargeSymbolPathShape = function() {
	function LargeSymbolPathShape() {}
	return LargeSymbolPathShape;
}();
var LargeSymbolPath = function(_super) {
	__extends(LargeSymbolPath, _super);
	function LargeSymbolPath(opts) {
		var _this = _super.call(this, opts) || this;
		_this._off = 0;
		_this.hoverDataIdx = -1;
		return _this;
	}
	LargeSymbolPath.prototype.getDefaultShape = function() {
		return new LargeSymbolPathShape();
	};
	LargeSymbolPath.prototype.reset = function() {
		this.notClear = false;
		this._off = 0;
	};
	LargeSymbolPath.prototype.beforeBrush = function(param) {
		if (param && !param.contentRetained) this.reset();
	};
	LargeSymbolPath.prototype.buildPath = function(path, shape) {
		var points = shape.points;
		var size = shape.size;
		var symbolProxy = this.symbolProxy;
		var symbolProxyShape = symbolProxy.shape;
		var ctx = path.getContext ? path.getContext() : path;
		var canBoost = ctx && size[0] < BOOST_SIZE_THRESHOLD;
		var softClipShape = this.softClipShape;
		var i;
		if (canBoost) {
			this._ctx = ctx;
			return;
		}
		this._ctx = null;
		for (i = this._off; i < points.length;) {
			var x = points[i++];
			var y = points[i++];
			if (isNaN(x) || isNaN(y)) continue;
			if (softClipShape && !softClipShape.contain(x, y)) continue;
			symbolProxyShape.x = x - size[0] / 2;
			symbolProxyShape.y = y - size[1] / 2;
			symbolProxyShape.width = size[0];
			symbolProxyShape.height = size[1];
			symbolProxy.buildPath(path, symbolProxyShape, true);
		}
		if (this.incremental) {
			this._off = i;
			this.notClear = true;
		}
	};
	LargeSymbolPath.prototype.afterBrush = function() {
		var shape = this.shape;
		var points = shape.points;
		var size = shape.size;
		var ctx = this._ctx;
		var softClipShape = this.softClipShape;
		var i;
		if (!ctx) return;
		for (i = this._off; i < points.length;) {
			var x = points[i++];
			var y = points[i++];
			if (isNaN(x) || isNaN(y)) continue;
			if (softClipShape && !softClipShape.contain(x, y)) continue;
			ctx.fillRect(x - size[0] / 2, y - size[1] / 2, size[0], size[1]);
		}
		if (this.incremental) {
			this._off = i;
			this.notClear = true;
		}
	};
	LargeSymbolPath.prototype.findDataIndex = function(x, y) {
		var shape = this.shape;
		var points = shape.points;
		var size = shape.size;
		var w = Math.max(size[0], 4);
		var h = Math.max(size[1], 4);
		for (var idx = points.length / 2 - 1; idx >= 0; idx--) {
			var i = idx * 2;
			var x0 = points[i] - w / 2;
			var y0 = points[i + 1] - h / 2;
			if (x >= x0 && y >= y0 && x <= x0 + w && y <= y0 + h) return idx;
		}
		return -1;
	};
	LargeSymbolPath.prototype.contain = function(x, y) {
		var localPos = this.transformCoordToLocal(x, y);
		var rect = this.getBoundingRect();
		x = localPos[0];
		y = localPos[1];
		if (rect.contain(x, y)) return (this.hoverDataIdx = this.findDataIndex(x, y)) >= 0;
		this.hoverDataIdx = -1;
		return false;
	};
	LargeSymbolPath.prototype.getBoundingRect = function() {
		var rect = this._rect;
		if (!rect) {
			var shape = this.shape;
			var points = shape.points;
			var size = shape.size;
			var w = size[0];
			var h = size[1];
			var minX = Infinity;
			var minY = Infinity;
			var maxX = -Infinity;
			var maxY = -Infinity;
			for (var i = 0; i < points.length;) {
				var x = points[i++];
				var y = points[i++];
				minX = Math.min(x, minX);
				maxX = Math.max(x, maxX);
				minY = Math.min(y, minY);
				maxY = Math.max(y, maxY);
			}
			rect = this._rect = new BoundingRect(minX - w / 2, minY - h / 2, maxX - minX + w, maxY - minY + h);
		}
		return rect;
	};
	return LargeSymbolPath;
}(Path);
var LargeSymbolDraw = function() {
	function LargeSymbolDraw() {
		this.group = new Group();
	}
	/**
	* Update symbols draw by new data
	*/
	LargeSymbolDraw.prototype.updateData = function(data, opt) {
		this._clear();
		this._data = data;
		var symbolEl = this._create();
		symbolEl.setShape({ points: data.getLayout("points") });
		this._setCommon(symbolEl, data, opt);
	};
	LargeSymbolDraw.prototype.updateLayout = function(opt) {
		var data = this._data;
		if (!data) return;
		var points = data.getLayout("points");
		this.group.eachChild(function(child) {
			if (child.startIndex != null) {
				var len = (child.endIndex - child.startIndex) * 2;
				var byteOffset = child.startIndex * 4 * 2;
				points = new Float32Array(points.buffer, byteOffset, len);
			}
			child.setShape("points", points);
			child.reset();
			child.stopAnimation();
		});
	};
	LargeSymbolDraw.prototype.incrementalPrepareUpdate = function(data) {
		this._clear();
	};
	LargeSymbolDraw.prototype.incrementalUpdate = function(taskParams, data, incrementalId, opt) {
		var lastAdded = this._newAdded[0];
		var points = data.getLayout("points");
		var oldPoints = lastAdded && lastAdded.shape.points;
		if (oldPoints && oldPoints.length < 2e4) {
			var oldLen = oldPoints.length;
			var newPoints = new Float32Array(oldLen + points.length);
			newPoints.set(oldPoints);
			newPoints.set(points, oldLen);
			lastAdded.endIndex = taskParams.end;
			lastAdded.setShape({ points: newPoints });
		} else {
			this._newAdded = [];
			var symbolEl = this._create();
			symbolEl.startIndex = taskParams.start;
			symbolEl.endIndex = taskParams.end;
			symbolEl.incremental = incrementalId;
			symbolEl.setShape({ points });
			this._setCommon(symbolEl, data, opt);
		}
	};
	LargeSymbolDraw.prototype.eachRendered = function(cb) {
		this._newAdded[0] && cb(this._newAdded[0]);
	};
	LargeSymbolDraw.prototype._create = function() {
		var symbolEl = new LargeSymbolPath({ cursor: "default" });
		symbolEl.ignoreCoarsePointer = true;
		this.group.add(symbolEl);
		this._newAdded.push(symbolEl);
		return symbolEl;
	};
	LargeSymbolDraw.prototype._setCommon = function(symbolEl, data, opt) {
		var hostModel = data.hostModel;
		opt = opt || {};
		var size = data.getVisual("symbolSize");
		symbolEl.setShape("size", size instanceof Array ? size : [size, size]);
		symbolEl.softClipShape = opt.clipShape || null;
		symbolEl.symbolProxy = createSymbol(data.getVisual("symbol"), 0, 0, 0, 0);
		symbolEl.setColor = symbolEl.symbolProxy.setColor;
		var extrudeShadow = symbolEl.shape.size[0] < BOOST_SIZE_THRESHOLD;
		symbolEl.useStyle(hostModel.getModel("itemStyle").getItemStyle(extrudeShadow ? [
			"color",
			"shadowBlur",
			"shadowColor"
		] : ["color"]));
		var globalStyle = data.getVisual("style");
		var visualColor = globalStyle && globalStyle.fill;
		if (visualColor) symbolEl.setColor(visualColor);
		var ecData = getECData(symbolEl);
		ecData.seriesIndex = hostModel.seriesIndex;
		symbolEl.on("mousemove", function(e) {
			ecData.dataIndex = null;
			var dataIndex = symbolEl.hoverDataIdx;
			if (dataIndex >= 0) ecData.dataIndex = dataIndex + (symbolEl.startIndex || 0);
		});
	};
	LargeSymbolDraw.prototype.remove = function() {
		this._clear();
	};
	LargeSymbolDraw.prototype._clear = function() {
		this._newAdded = [];
		this.group.removeAll();
	};
	return LargeSymbolDraw;
}();
//#endregion
//#region node_modules/echarts/lib/chart/scatter/ScatterView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var ScatterView = function(_super) {
	__extends(ScatterView, _super);
	function ScatterView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = ScatterView.type;
		return _this;
	}
	ScatterView.prototype.render = function(seriesModel, ecModel, api) {
		var data = seriesModel.getData();
		this._updateSymbolDraw(data, seriesModel).updateData(data, createSymbolDrawOpt(seriesModel));
		this._finished = true;
	};
	ScatterView.prototype.incrementalPrepareRender = function(seriesModel, ecModel, api) {
		var data = seriesModel.getData();
		this._updateSymbolDraw(data, seriesModel).incrementalPrepareUpdate(data);
		this._finished = false;
	};
	ScatterView.prototype.incrementalRender = function(taskParams, seriesModel, ecModel) {
		this._symbolDraw.incrementalUpdate(taskParams, seriesModel.getData(), getIncrementalId(seriesModel), createSymbolDrawOpt(seriesModel));
		this._finished = taskParams.end === seriesModel.getData().count();
	};
	/**
	* See also VIEW_COORD_SYS_ANIMATION
	*/
	ScatterView.prototype.updateTransform = function(seriesModel, ecModel, api) {
		var data = seriesModel.getData();
		this.group.dirty();
		if (!this._finished) return { update: true };
		else {
			var res = pointsLayout("").reset(seriesModel, ecModel, api);
			if (res.progress) res.progress({
				start: 0,
				end: data.count(),
				count: data.count()
			}, data);
			this._symbolDraw.updateLayout(createSymbolDrawOpt(seriesModel));
		}
	};
	ScatterView.prototype.eachRendered = function(cb) {
		this._symbolDraw && this._symbolDraw.eachRendered(cb);
	};
	ScatterView.prototype._updateSymbolDraw = function(data, seriesModel) {
		var symbolDraw = this._symbolDraw;
		var isLargeDraw = seriesModel.pipelineContext.large;
		if (!symbolDraw || isLargeDraw !== this._isLargeDraw) {
			symbolDraw && symbolDraw.remove();
			symbolDraw = this._symbolDraw = isLargeDraw ? new LargeSymbolDraw() : new SymbolDraw();
			this._isLargeDraw = isLargeDraw;
			this.group.removeAll();
		}
		this.group.add(symbolDraw.group);
		return symbolDraw;
	};
	ScatterView.prototype.remove = function(ecModel, api) {
		this._symbolDraw && this._symbolDraw.remove(true);
		this._symbolDraw = null;
	};
	ScatterView.prototype.dispose = function() {};
	ScatterView.type = "scatter";
	return ScatterView;
}(ChartView);
function createSymbolDrawOpt(seriesModel) {
	return { clipShape: createCoordSysClipAreaSimply(seriesModel) };
}
//#endregion
//#region node_modules/echarts/lib/chart/scatter/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$3(registers) {
	use(install$4);
	registers.registerSeriesModel(ScatterSeriesModel);
	registers.registerChartView(ScatterView);
	registers.registerLayout(pointsLayout("scatter"));
}
//#endregion
export { install as BarChart, install$1 as LineChart, install$2 as PieChart, install$3 as ScatterChart };
