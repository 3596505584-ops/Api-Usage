import { $ as applyTransform, At as extend, Bt as isFunction, Et as defaults, Ft as indexOf, Gt as isString, It as inherits, Lt as isArray, Ot as each, Qt as mixin, S as color_exports, St as clone, Tt as curry, U as truncateText, Wt as isObject, Xt as map, Y as BoundingRect, Zt as merge, at as min, c as ZRImage, cn as util_exports$1, d as windingLine, dn as setPlatformAPI, fn as __extends, ft as identity, ht as mul, it as max, jt as filter, lt as vector_exports, mt as matrix_exports, pn as __exportAll, pt as invert, r as brushSingle, tn as reduce, xt as bind, yt as env } from "./graphic-BAx7jeh4.js";
import { $n as extendPath, $t as formatTime, A as registerVisual, Ai as linearMap, Ar as Polyline, Bi as parsePercent, C as registerPostInit, Ci as getPercentWithPrecision, D as registerTheme, Dr as Arc, E as registerProcessor, Ei as getPrecisionSafe, Er as CompoundPath, Et as ChartView, Fr as Circle, Gi as reformIntervals, Hi as quantile, I as ComponentView, Ir as Group, J as Axis, Ji as roundLegacy, Jn as clipRectByRect, Ki as remRadian, L as zrender_exports, Li as nice, Ln as Model, M as version, Mr as Ring, Nr as Sector, O as registerTransform, Oi as isNumeric, Or as BezierCurve, Ot as createSymbol, Pr as Ellipse, Ri as numericToNumber, S as registerMap, Sr as IncrementalDisplayable, T as registerPreprocessor, Ti as getPrecision, Tr as LinearGradient, U as throttle, Ui as quantity, Wi as quantityExponent, Xi as Rect, Xr as getECData, Xt as addCommas, Yi as ZRText, Yn as createIcon, Zt as capitalFirst, _ as registerAction, _r as initProps, a as PRIORITY, an as roundTime, at as determineAxisType, b as registerLayout, bi as asc, c as dependencies, cn as registerLocale, cr as mergePath, d as dispose, en as formatTpl, er as extendShape, f as getCoordinateSystemDimensions, g as init, h as getMap, hn as isDimensionStacked, i as use, in as format, it as createScaleByModel, j as setCanvasCreator, jr as Polygon, jt as SeriesModel, k as registerUpdateLifecycle, ki as isRadianAroundZero, kr as Line, l as disConnect, ln as encodeHTML, lr as registerShape, m as getInstanceById, mn as getStackedDimension, n as scaleCalcNice2, nn as normalizeCssArray, nr as getTransform, o as connect, or as makeImage, p as getInstanceByDom, pn as enableDataStack, qn as clipPointsByRect, qt as getLayoutRect, r as AxisModelCommonMixin, rn as toCamelCase, s as dataTool, sr as makePath, tn as getTooltipMarker, tr as getShapeClass, u as disconnect, ur as resizePath, v as registerCoordinateSystem, w as registerPostUpdate, wi as getPixelPrecision, wr as RadialGradient, x as registerLoading, xr as updateProps, y as registerCustomSeries, yi as MAX_SAFE_INTEGER, yn as SeriesData, zi as parseDate, zn as createTextStyle$1, zr as enableHoverEmphasis, zt as ComponentModel } from "./axisNiceTicks-C_GC5fUj.js";
import { n as createDimensions, t as createSeriesData } from "./createSeriesData-BbGgr7QR.js";
//#region node_modules/echarts/lib/legacy/getTextRect.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function getTextRect(text, font, align, verticalAlign, padding, rich, truncate, lineHeight) {
	return new ZRText({ style: {
		text,
		font,
		align,
		verticalAlign,
		padding,
		rich,
		overflow: truncate ? "truncate" : null,
		lineHeight
	} }).getBoundingRect();
}
//#endregion
//#region node_modules/zrender/lib/contain/polygon.js
var EPSILON = 1e-8;
function isAroundEqual(a, b) {
	return Math.abs(a - b) < EPSILON;
}
function contain(points, x, y) {
	var w = 0;
	var p = points[0];
	if (!p) return false;
	for (var i = 1; i < points.length; i++) {
		var p2 = points[i];
		w += windingLine(p[0], p[1], p2[0], p2[1], x, y);
		p = p2;
	}
	var p0 = points[0];
	if (!isAroundEqual(p[0], p0[0]) || !isAroundEqual(p[1], p0[1])) w += windingLine(p[0], p[1], p0[0], p0[1], x, y);
	return w !== 0;
}
//#endregion
//#region node_modules/echarts/lib/coord/geo/Region.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var TMP_TRANSFORM = [];
function transformPoints(points, transform) {
	for (var p = 0; p < points.length; p++) applyTransform(points[p], points[p], transform);
}
function updateBBoxFromPoints(points, min$1, max$1, projection) {
	for (var i = 0; i < points.length; i++) {
		var p = points[i];
		if (projection) p = projection.project(p);
		if (p && isFinite(p[0]) && isFinite(p[1])) {
			min(min$1, min$1, p);
			max(max$1, max$1, p);
		}
	}
}
function centroid(points) {
	var signedArea = 0;
	var cx = 0;
	var cy = 0;
	var len = points.length;
	var x0 = points[len - 1][0];
	var y0 = points[len - 1][1];
	for (var i = 0; i < len; i++) {
		var x1 = points[i][0];
		var y1 = points[i][1];
		var a = x0 * y1 - x1 * y0;
		signedArea += a;
		cx += (x0 + x1) * a;
		cy += (y0 + y1) * a;
		x0 = x1;
		y0 = y1;
	}
	return signedArea ? [
		cx / signedArea / 3,
		cy / signedArea / 3,
		signedArea
	] : [points[0][0] || 0, points[0][1] || 0];
}
var Region = function() {
	function Region(name) {
		this.name = name;
	}
	Region.prototype.setCenter = function(center) {
		this._center = center;
	};
	/**
	* Get center point in data unit. That is,
	* for GeoJSONRegion, the unit is lat/lng,
	* for GeoSVGRegion, the unit is SVG local coord.
	*/
	Region.prototype.getCenter = function() {
		var center = this._center;
		if (!center) center = this._center = this.calcCenter();
		return center;
	};
	return Region;
}();
var GeoJSONPolygonGeometry = function() {
	function GeoJSONPolygonGeometry(exterior, interiors) {
		this.type = "polygon";
		this.exterior = exterior;
		this.interiors = interiors;
	}
	return GeoJSONPolygonGeometry;
}();
var GeoJSONLineStringGeometry = function() {
	function GeoJSONLineStringGeometry(points) {
		this.type = "linestring";
		this.points = points;
	}
	return GeoJSONLineStringGeometry;
}();
var GeoJSONRegion = function(_super) {
	__extends(GeoJSONRegion, _super);
	function GeoJSONRegion(name, geometries, cp) {
		var _this = _super.call(this, name) || this;
		_this.type = "geoJSON";
		_this.geometries = geometries;
		_this._center = cp && [cp[0], cp[1]];
		return _this;
	}
	GeoJSONRegion.prototype.calcCenter = function() {
		var geometries = this.geometries;
		var largestGeo;
		var largestGeoSize = 0;
		for (var i = 0; i < geometries.length; i++) {
			var geo = geometries[i];
			var exterior = geo.exterior;
			var size = exterior && exterior.length;
			if (size > largestGeoSize) {
				largestGeo = geo;
				largestGeoSize = size;
			}
		}
		if (largestGeo) return centroid(largestGeo.exterior);
		var rect = this.getBoundingRect();
		return [rect.x + rect.width / 2, rect.y + rect.height / 2];
	};
	GeoJSONRegion.prototype.getBoundingRect = function(projection) {
		var rect = this._rect;
		if (rect && !projection) return rect;
		var min = [Infinity, Infinity];
		var max = [-Infinity, -Infinity];
		var geometries = this.geometries;
		each(geometries, function(geo) {
			if (geo.type === "polygon") updateBBoxFromPoints(geo.exterior, min, max, projection);
			else each(geo.points, function(points) {
				updateBBoxFromPoints(points, min, max, projection);
			});
		});
		if (!(isFinite(min[0]) && isFinite(min[1]) && isFinite(max[0]) && isFinite(max[1]))) min[0] = min[1] = max[0] = max[1] = 0;
		rect = new BoundingRect(min[0], min[1], max[0] - min[0], max[1] - min[1]);
		if (!projection) this._rect = rect;
		return rect;
	};
	GeoJSONRegion.prototype.contain = function(coord) {
		var rect = this.getBoundingRect();
		var geometries = this.geometries;
		if (!rect.contain(coord[0], coord[1])) return false;
		loopGeo: for (var i = 0, len = geometries.length; i < len; i++) {
			var geo = geometries[i];
			if (geo.type !== "polygon") continue;
			var exterior = geo.exterior;
			var interiors = geo.interiors;
			if (contain(exterior, coord[0], coord[1])) {
				for (var k = 0; k < (interiors ? interiors.length : 0); k++) if (contain(interiors[k], coord[0], coord[1])) continue loopGeo;
				return true;
			}
		}
		return false;
	};
	/**
	* Transform the raw coords to target bounding.
	* @param x
	* @param y
	* @param width
	* @param height
	*/
	GeoJSONRegion.prototype.transformTo = function(x, y, width, height) {
		var rect = this.getBoundingRect();
		var aspect = rect.width / rect.height;
		if (!width) width = aspect * height;
		else if (!height) height = width / aspect;
		var target = new BoundingRect(x, y, width, height);
		var transform = rect.calculateTransform(target);
		var geometries = this.geometries;
		for (var i = 0; i < geometries.length; i++) {
			var geo = geometries[i];
			if (geo.type === "polygon") {
				transformPoints(geo.exterior, transform);
				each(geo.interiors, function(interior) {
					transformPoints(interior, transform);
				});
			} else each(geo.points, function(points) {
				transformPoints(points, transform);
			});
		}
		rect = this._rect;
		rect.copy(target);
		this._center = [rect.x + rect.width / 2, rect.y + rect.height / 2];
	};
	GeoJSONRegion.prototype.cloneShallow = function(name) {
		name ?? (name = this.name);
		var newRegion = new GeoJSONRegion(name, this.geometries, this._center);
		newRegion._rect = this._rect;
		newRegion.transformTo = null;
		return newRegion;
	};
	return GeoJSONRegion;
}(Region);
(function(_super) {
	__extends(GeoSVGRegion, _super);
	function GeoSVGRegion(name, elOnlyForCalculate) {
		var _this = _super.call(this, name) || this;
		_this.type = "geoSVG";
		_this._elOnlyForCalculate = elOnlyForCalculate;
		return _this;
	}
	GeoSVGRegion.prototype.calcCenter = function() {
		var el = this._elOnlyForCalculate;
		var rect = el.getBoundingRect();
		var center = [rect.x + rect.width / 2, rect.y + rect.height / 2];
		var mat = identity(TMP_TRANSFORM);
		var target = el;
		while (target && !target.isGeoSVGGraphicRoot) {
			mul(mat, target.getLocalTransform(), mat);
			target = target.parent;
		}
		invert(mat, mat);
		applyTransform(center, center, mat);
		return center;
	};
	return GeoSVGRegion;
})(Region);
//#endregion
//#region node_modules/echarts/lib/coord/geo/parseGeoJson.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Parse and decode geo json
*/
function decode(json) {
	if (!json.UTF8Encoding) return json;
	var jsonCompressed = json;
	var encodeScale = jsonCompressed.UTF8Scale;
	if (encodeScale == null) encodeScale = 1024;
	var features = jsonCompressed.features;
	each(features, function(feature) {
		var geometry = feature.geometry;
		var encodeOffsets = geometry.encodeOffsets;
		var coordinates = geometry.coordinates;
		if (!encodeOffsets) return;
		switch (geometry.type) {
			case "LineString":
				geometry.coordinates = decodeRing(coordinates, encodeOffsets, encodeScale);
				break;
			case "Polygon":
				decodeRings(coordinates, encodeOffsets, encodeScale);
				break;
			case "MultiLineString":
				decodeRings(coordinates, encodeOffsets, encodeScale);
				break;
			case "MultiPolygon": each(coordinates, function(rings, idx) {
				return decodeRings(rings, encodeOffsets[idx], encodeScale);
			});
		}
	});
	jsonCompressed.UTF8Encoding = false;
	return jsonCompressed;
}
function decodeRings(rings, encodeOffsets, encodeScale) {
	for (var c = 0; c < rings.length; c++) rings[c] = decodeRing(rings[c], encodeOffsets[c], encodeScale);
}
function decodeRing(coordinate, encodeOffsets, encodeScale) {
	var result = [];
	var prevX = encodeOffsets[0];
	var prevY = encodeOffsets[1];
	for (var i = 0; i < coordinate.length; i += 2) {
		var x = coordinate.charCodeAt(i) - 64;
		var y = coordinate.charCodeAt(i + 1) - 64;
		x = x >> 1 ^ -(x & 1);
		y = y >> 1 ^ -(y & 1);
		x += prevX;
		y += prevY;
		prevX = x;
		prevY = y;
		result.push([x / encodeScale, y / encodeScale]);
	}
	return result;
}
function parseGeoJSON(geoJson, nameProperty) {
	geoJson = decode(geoJson);
	return map(filter(geoJson.features, function(featureObj) {
		return featureObj.geometry && featureObj.properties && featureObj.geometry.coordinates.length > 0;
	}), function(featureObj) {
		var properties = featureObj.properties;
		var geo = featureObj.geometry;
		var geometries = [];
		switch (geo.type) {
			case "Polygon":
				var coordinates = geo.coordinates;
				geometries.push(new GeoJSONPolygonGeometry(coordinates[0], coordinates.slice(1)));
				break;
			case "MultiPolygon":
				each(geo.coordinates, function(item) {
					if (item[0]) geometries.push(new GeoJSONPolygonGeometry(item[0], item.slice(1)));
				});
				break;
			case "LineString":
				geometries.push(new GeoJSONLineStringGeometry([geo.coordinates]));
				break;
			case "MultiLineString": geometries.push(new GeoJSONLineStringGeometry(geo.coordinates));
		}
		var region = new GeoJSONRegion(properties[nameProperty || "name"], geometries, properties.cp);
		region.properties = properties;
		return region;
	});
}
//#endregion
//#region node_modules/echarts/lib/export/api/helper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* This module exposes helper functions for developing extensions.
*/
var helper_exports = /* @__PURE__ */ __exportAll({
	createDimensions: () => createDimensions,
	createList: () => createList,
	createScale: () => createScale,
	createSymbol: () => createSymbol,
	createTextStyle: () => createTextStyle,
	dataStack: () => dataStack,
	enableHoverEmphasis: () => enableHoverEmphasis,
	getECData: () => getECData,
	getLayoutRect: () => getLayoutRect,
	mixinAxisModelCommonMethods: () => mixinAxisModelCommonMethods
});
/**
* Create a multi dimension List structure from seriesModel.
*/
function createList(seriesModel) {
	return createSeriesData(null, seriesModel);
}
var dataStack = {
	isDimensionStacked,
	enableDataStack,
	getStackedDimension
};
/**
* Externally used by echarts-gl.
* Create scale
* @param dataExtent
* @param option If `option.type`
*        is specified, it can only be `'value'` currently.
*/
function createScale(dataExtent, option) {
	var axisModel = option;
	if (!(option instanceof Model)) axisModel = new Model(option);
	var axisType = determineAxisType(axisModel);
	var scale = createScaleByModel(axisModel, axisType, false);
	if (dataExtent[1] < dataExtent[0]) dataExtent = dataExtent.slice().reverse();
	scaleCalcNice2(scale, axisModel, null, null, dataExtent);
	return scale;
}
/**
* Mixin common methods to axis model
*/
function mixinAxisModelCommonMethods(Model) {
	mixin(Model, AxisModelCommonMixin);
}
function createTextStyle(textStyleModel, opts) {
	opts = opts || {};
	return createTextStyle$1(textStyleModel, null, null, opts.state !== "normal");
}
//#endregion
//#region node_modules/echarts/lib/export/api/number.js
var number_exports = /* @__PURE__ */ __exportAll({
	MAX_SAFE_INTEGER: () => MAX_SAFE_INTEGER,
	asc: () => asc,
	getPercentWithPrecision: () => getPercentWithPrecision,
	getPixelPrecision: () => getPixelPrecision,
	getPrecision: () => getPrecision,
	getPrecisionSafe: () => getPrecisionSafe,
	isNumeric: () => isNumeric,
	isRadianAroundZero: () => isRadianAroundZero,
	linearMap: () => linearMap,
	nice: () => nice,
	numericToNumber: () => numericToNumber,
	parseDate: () => parseDate,
	parsePercent: () => parsePercent,
	quantile: () => quantile,
	quantity: () => quantity,
	quantityExponent: () => quantityExponent,
	reformIntervals: () => reformIntervals,
	remRadian: () => remRadian,
	round: () => roundLegacy
});
//#endregion
//#region node_modules/echarts/lib/export/api/time.js
var time_exports = /* @__PURE__ */ __exportAll({
	format: () => format,
	parse: () => parseDate,
	roundTime: () => roundTime
});
//#endregion
//#region node_modules/echarts/lib/export/api/graphic.js
var graphic_exports = /* @__PURE__ */ __exportAll({
	Arc: () => Arc,
	BezierCurve: () => BezierCurve,
	BoundingRect: () => BoundingRect,
	Circle: () => Circle,
	CompoundPath: () => CompoundPath,
	Ellipse: () => Ellipse,
	Group: () => Group,
	Image: () => ZRImage,
	IncrementalDisplayable: () => IncrementalDisplayable,
	Line: () => Line,
	LinearGradient: () => LinearGradient,
	Polygon: () => Polygon,
	Polyline: () => Polyline,
	RadialGradient: () => RadialGradient,
	Rect: () => Rect,
	Ring: () => Ring,
	Sector: () => Sector,
	Text: () => ZRText,
	clipPointsByRect: () => clipPointsByRect,
	clipRectByRect: () => clipRectByRect,
	createIcon: () => createIcon,
	extendPath: () => extendPath,
	extendShape: () => extendShape,
	getShapeClass: () => getShapeClass,
	getTransform: () => getTransform,
	initProps: () => initProps,
	makeImage: () => makeImage,
	makePath: () => makePath,
	mergePath: () => mergePath,
	registerShape: () => registerShape,
	resizePath: () => resizePath,
	updateProps: () => updateProps
});
//#endregion
//#region node_modules/echarts/lib/export/api/format.js
var format_exports = /* @__PURE__ */ __exportAll({
	addCommas: () => addCommas,
	capitalFirst: () => capitalFirst,
	encodeHTML: () => encodeHTML,
	formatTime: () => formatTime,
	formatTpl: () => formatTpl,
	getTextRect: () => getTextRect,
	getTooltipMarker: () => getTooltipMarker,
	normalizeCssArray: () => normalizeCssArray,
	toCamelCase: () => toCamelCase,
	truncateText: () => truncateText
});
//#endregion
//#region node_modules/echarts/lib/export/api/util.js
var util_exports = /* @__PURE__ */ __exportAll({
	bind: () => bind,
	clone: () => clone,
	curry: () => curry,
	defaults: () => defaults,
	each: () => each,
	extend: () => extend,
	filter: () => filter,
	indexOf: () => indexOf,
	inherits: () => inherits,
	isArray: () => isArray,
	isFunction: () => isFunction,
	isObject: () => isObject,
	isString: () => isString,
	map: () => map,
	merge: () => merge,
	reduce: () => reduce
});
//#endregion
//#region node_modules/echarts/lib/export/api.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function extendComponentModel(proto) {
	var Model = ComponentModel.extend(proto);
	ComponentModel.registerClass(Model);
	return Model;
}
function extendComponentView(proto) {
	var View = ComponentView.extend(proto);
	ComponentView.registerClass(View);
	return View;
}
function extendSeriesModel(proto) {
	var Model = SeriesModel.extend(proto);
	SeriesModel.registerClass(Model);
	return Model;
}
function extendChartView(proto) {
	var View = ChartView.extend(proto);
	ChartView.registerClass(View);
	return View;
}
//#endregion
export { Axis, ChartView, ComponentModel, ComponentView, SeriesData as List, Model, PRIORITY, SeriesModel, color_exports as color, connect, dataTool, dependencies, disConnect, disconnect, dispose, env, extendChartView, extendComponentModel, extendComponentView, extendSeriesModel, format_exports as format, getCoordinateSystemDimensions, getInstanceByDom, getInstanceById, getMap, graphic_exports as graphic, helper_exports as helper, init, brushSingle as innerDrawElementOnCanvas, matrix_exports as matrix, number_exports as number, parseGeoJSON, parseGeoJSON as parseGeoJson, registerAction, registerCoordinateSystem, registerCustomSeries, registerLayout, registerLoading, registerLocale, registerMap, registerPostInit, registerPostUpdate, registerPreprocessor, registerProcessor, registerTheme, registerTransform, registerUpdateLifecycle, registerVisual, setCanvasCreator, setPlatformAPI, throttle, time_exports as time, use, util_exports as util, vector_exports as vector, version, util_exports$1 as zrUtil, zrender_exports as zrender };
