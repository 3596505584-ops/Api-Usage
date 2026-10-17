import { $t as noop, At as extend, Bt as isFunction, D as parse, Et as defaults, Ft as indexOf, Gt as isString, I as TRANSFORMABLE_PROPS, Jt as keys, Lt as isArray, O as stringify, Ot as each$2, Pt as hasOwn, Qt as mixin, Rt as isArrayLike, St as clone$1, Tt as curry$1, Ut as isNumber, Wt as isObject, Xt as map, Zt as merge, _t as translate, c as ZRImage, ct as sub, dt as create, fn as __extends, gt as rotate, h as Displayable, jt as filter, nn as retrieve, ot as normalize, q as getBoundingRect, rn as retrieve2, sn as trim, tn as reduce, u as Path, wt as createHashMap, x as cloneValue, xt as bind$1, yt as env, zt as isDom } from "./graphic-BAx7jeh4.js";
import { At as normalizeSymbolSize, Bi as parsePercent, Bn as getLabelStatesModels, Br as enterBlur, Bt as LOCATION_PARAMS, Di as isNullableNumberFinite, F as getVisualFromData, Fi as mathMin, Ft as getPaddingFromTooltipModel, H as createOrUpdate, Hn as setLabelStyle, Hr as leaveBlur, Ht as copyLayoutParams, I as ComponentView, Ir as Group$2, It as tokens, Jt as mergeLayoutParam, Kn as applyTransform, Kr as toggleHoverEmphasis, Kt as getLayoutParams, Ln as Model, Lt as DataFormatMixin, Mt as TooltipMarkupStyleCreator, N as createOrUpdatePatternFromDecal, Nt as buildTooltipMarkup, Or as BezierCurve, Ot as createSymbol$1, P as findEventDispatcher, Pi as mathMax, Pt as createTooltipMarkup, Qr as convertOptionIdName, Qt as convertToColorString, R as normalizeEvent, Rr as SPECIAL_STATES, Rt as normalizeTooltipFormatResult, Ti as getPrecision, Tn as parseDataValue, Ur as leaveEmphasis, Ut as createBoxLayoutReference, V as clear, Vr as enterEmphasis, Vt as box, Xi as Rect, Xr as getECData, Y as calcBandWidth, Yi as ZRText, Yn as createIcon, Yt as positionElement, _r as initProps, di as normalizeToArray, dn as transformLocalCoordClear, dr as retrieveZInfo, ei as createSimpleOverallStageHandler2, en as formatTpl, fi as preParseFinder, fn as inheritDefaultOption, fr as setTooltipConfig, gr as getAnimationConfig, hi as queryReferringComponents, hn as isDimensionStacked, hr as traverseUpdateZ, i as use, ii as getTooltipRenderMode, in as format, kr as Line$1, kt as normalizeSymbolOffset, li as makeInner, ln as encodeHTML, mi as queryDataIndex, mn as getStackedDimension, mr as traverseElements, nn as normalizeCssArray, ot as getAxisRawValue, qi as round, qt as getLayoutRect, rn as toCamelCase, rr as graphic_exports, si as isNameSpecified, ti as defaultEmphasis, tr as getShapeClass, ui as mappingToExists, un as transformLocalCoord, vi as throwError, xr as updateProps$1, yn as SeriesData, z as stop, zn as createTextStyle, zr as enableHoverEmphasis, zt as ComponentModel } from "./axisNiceTicks-C_GC5fUj.js";
import { a as makeKey, c as layout, f as isCoordinateSystemType, i as getAxisInfo$1, l as AxisBuilder, n as AxisView, p as SymbolDraw, r as collect, t as install$9 } from "./installSimple-D03HZlVo.js";
//#region node_modules/echarts/lib/util/styleCompat.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Whether need to call `convertEC4CompatibleStyle`.
*/
function isEC4CompatibleStyle(style, elType, hasOwnTextContentOption, hasOwnTextConfig) {
	return style && (style.legacy || style.legacy !== false && !hasOwnTextContentOption && !hasOwnTextConfig && elType !== "tspan" && (elType === "text" || hasOwn(style, "text")));
}
/**
* `EC4CompatibleStyle` is style that might be in echarts4 format or echarts5 format.
* @param hostStyle The properties might be modified.
* @return If be text el, `textContentStyle` and `textConfig` will not be returned.
*         Otherwise a `textContentStyle` and `textConfig` will be created, whose props area
*         retried from the `hostStyle`.
*/
function convertFromEC4CompatibleStyle(hostStyle, elType, isNormal) {
	var srcStyle = hostStyle;
	var textConfig;
	var textContent;
	var textContentStyle;
	if (elType === "text") textContentStyle = srcStyle;
	else {
		textContentStyle = {};
		hasOwn(srcStyle, "text") && (textContentStyle.text = srcStyle.text);
		hasOwn(srcStyle, "rich") && (textContentStyle.rich = srcStyle.rich);
		hasOwn(srcStyle, "textFill") && (textContentStyle.fill = srcStyle.textFill);
		hasOwn(srcStyle, "textStroke") && (textContentStyle.stroke = srcStyle.textStroke);
		hasOwn(srcStyle, "fontFamily") && (textContentStyle.fontFamily = srcStyle.fontFamily);
		hasOwn(srcStyle, "fontSize") && (textContentStyle.fontSize = srcStyle.fontSize);
		hasOwn(srcStyle, "fontStyle") && (textContentStyle.fontStyle = srcStyle.fontStyle);
		hasOwn(srcStyle, "fontWeight") && (textContentStyle.fontWeight = srcStyle.fontWeight);
		textContent = {
			type: "text",
			style: textContentStyle,
			silent: true
		};
		textConfig = {};
		var hasOwnPos = hasOwn(srcStyle, "textPosition");
		if (isNormal) textConfig.position = hasOwnPos ? srcStyle.textPosition : "inside";
		else hasOwnPos && (textConfig.position = srcStyle.textPosition);
		hasOwn(srcStyle, "textPosition") && (textConfig.position = srcStyle.textPosition);
		hasOwn(srcStyle, "textOffset") && (textConfig.offset = srcStyle.textOffset);
		hasOwn(srcStyle, "textRotation") && (textConfig.rotation = srcStyle.textRotation);
		hasOwn(srcStyle, "textDistance") && (textConfig.distance = srcStyle.textDistance);
	}
	convertEC4CompatibleRichItem(textContentStyle, hostStyle);
	each$2(textContentStyle.rich, function(richItem) {
		convertEC4CompatibleRichItem(richItem, richItem);
	});
	return {
		textConfig,
		textContent
	};
}
/**
* The result will be set to `out`.
*/
function convertEC4CompatibleRichItem(out, richItem) {
	if (!richItem) return;
	richItem.font = richItem.textFont || richItem.font;
	hasOwn(richItem, "textStrokeWidth") && (out.lineWidth = richItem.textStrokeWidth);
	hasOwn(richItem, "textAlign") && (out.align = richItem.textAlign);
	hasOwn(richItem, "textVerticalAlign") && (out.verticalAlign = richItem.textVerticalAlign);
	hasOwn(richItem, "textLineHeight") && (out.lineHeight = richItem.textLineHeight);
	hasOwn(richItem, "textWidth") && (out.width = richItem.textWidth);
	hasOwn(richItem, "textHeight") && (out.height = richItem.textHeight);
	hasOwn(richItem, "textBackgroundColor") && (out.backgroundColor = richItem.textBackgroundColor);
	hasOwn(richItem, "textPadding") && (out.padding = richItem.textPadding);
	hasOwn(richItem, "textBorderColor") && (out.borderColor = richItem.textBorderColor);
	hasOwn(richItem, "textBorderWidth") && (out.borderWidth = richItem.textBorderWidth);
	hasOwn(richItem, "textBorderRadius") && (out.borderRadius = richItem.textBorderRadius);
	hasOwn(richItem, "textBoxShadowColor") && (out.shadowColor = richItem.textBoxShadowColor);
	hasOwn(richItem, "textBoxShadowBlur") && (out.shadowBlur = richItem.textBoxShadowBlur);
	hasOwn(richItem, "textBoxShadowOffsetX") && (out.shadowOffsetX = richItem.textBoxShadowOffsetX);
	hasOwn(richItem, "textBoxShadowOffsetY") && (out.shadowOffsetY = richItem.textBoxShadowOffsetY);
}
//#endregion
//#region node_modules/echarts/lib/chart/helper/LinePath.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Line path for bezier and straight line draw
*/
var straightLineProto = Line$1.prototype;
var bezierCurveProto = BezierCurve.prototype;
var StraightLineShape = function() {
	function StraightLineShape() {
		this.x1 = 0;
		this.y1 = 0;
		this.x2 = 0;
		this.y2 = 0;
		this.percent = 1;
	}
	return StraightLineShape;
}();
/** @class */ (function(_super) {
	__extends(CurveShape, _super);
	function CurveShape() {
		return _super !== null && _super.apply(this, arguments) || this;
	}
	return CurveShape;
})(StraightLineShape);
function isStraightLine(shape) {
	return isNaN(+shape.cpx1) || isNaN(+shape.cpy1);
}
var ECLinePath = function(_super) {
	__extends(ECLinePath, _super);
	function ECLinePath(opts) {
		var _this = _super.call(this, opts) || this;
		_this.type = "ec-line";
		return _this;
	}
	ECLinePath.prototype.getDefaultStyle = function() {
		return {
			stroke: tokens.color.neutral99,
			fill: null
		};
	};
	ECLinePath.prototype.getDefaultShape = function() {
		return new StraightLineShape();
	};
	ECLinePath.prototype.buildPath = function(ctx, shape) {
		if (isStraightLine(shape)) straightLineProto.buildPath.call(this, ctx, shape);
		else bezierCurveProto.buildPath.call(this, ctx, shape);
	};
	ECLinePath.prototype.pointAt = function(t) {
		if (isStraightLine(this.shape)) return straightLineProto.pointAt.call(this, t);
		else return bezierCurveProto.pointAt.call(this, t);
	};
	ECLinePath.prototype.tangentAt = function(t) {
		var shape = this.shape;
		var p = isStraightLine(shape) ? [shape.x2 - shape.x1, shape.y2 - shape.y1] : bezierCurveProto.tangentAt.call(this, t);
		return normalize(p, p);
	};
	return ECLinePath;
}(Path);
//#endregion
//#region node_modules/echarts/lib/chart/helper/Line.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var SYMBOL_CATEGORIES = ["fromSymbol", "toSymbol"];
function makeSymbolTypeKey(symbolCategory) {
	return "_" + symbolCategory + "Type";
}
function makeSymbolTypeValue(name, lineData, idx) {
	var symbolType = lineData.getItemVisual(idx, name);
	if (!symbolType || symbolType === "none") return symbolType;
	var symbolSize = lineData.getItemVisual(idx, name + "Size");
	var symbolRotate = lineData.getItemVisual(idx, name + "Rotate");
	var symbolOffset = lineData.getItemVisual(idx, name + "Offset");
	var symbolKeepAspect = lineData.getItemVisual(idx, name + "KeepAspect");
	var symbolSizeArr = normalizeSymbolSize(symbolSize);
	var symbolOffsetArr = normalizeSymbolOffset(symbolOffset || 0, symbolSizeArr);
	return symbolType + symbolSizeArr + symbolOffsetArr + (symbolRotate || "") + (symbolKeepAspect || "");
}
/**
* @inner
*/
function createSymbol(name, lineData, idx) {
	var symbolType = lineData.getItemVisual(idx, name);
	if (!symbolType || symbolType === "none") return;
	var symbolSize = lineData.getItemVisual(idx, name + "Size");
	var symbolRotate = lineData.getItemVisual(idx, name + "Rotate");
	var symbolOffset = lineData.getItemVisual(idx, name + "Offset");
	var symbolKeepAspect = lineData.getItemVisual(idx, name + "KeepAspect");
	var symbolSizeArr = normalizeSymbolSize(symbolSize);
	var symbolOffsetArr = normalizeSymbolOffset(symbolOffset || 0, symbolSizeArr);
	var symbolPath = createSymbol$1(symbolType, -symbolSizeArr[0] / 2 + symbolOffsetArr[0], -symbolSizeArr[1] / 2 + symbolOffsetArr[1], symbolSizeArr[0], symbolSizeArr[1], null, symbolKeepAspect);
	symbolPath.__specifiedRotation = symbolRotate == null || isNaN(symbolRotate) ? void 0 : +symbolRotate * Math.PI / 180 || 0;
	symbolPath.name = name;
	return symbolPath;
}
function createLine(points) {
	var line = new ECLinePath({
		name: "line",
		subPixelOptimize: true
	});
	setLinePoints(line.shape, points);
	return line;
}
function setLinePoints(targetShape, points) {
	targetShape.x1 = points[0][0];
	targetShape.y1 = points[0][1];
	targetShape.x2 = points[1][0];
	targetShape.y2 = points[1][1];
	targetShape.percent = 1;
	var cp1 = points[2];
	if (cp1) {
		targetShape.cpx1 = cp1[0];
		targetShape.cpy1 = cp1[1];
	} else {
		targetShape.cpx1 = NaN;
		targetShape.cpy1 = NaN;
	}
}
var Line = function(_super) {
	__extends(Line, _super);
	function Line(lineData, idx, seriesScope) {
		var _this = _super.call(this) || this;
		_this._createLine(lineData, idx, seriesScope);
		return _this;
	}
	Line.prototype._createLine = function(lineData, idx, seriesScope) {
		var seriesModel = lineData.hostModel;
		var linePoints = lineData.getItemLayout(idx);
		var z2 = lineData.getItemVisual(idx, "z2");
		var line = createLine(linePoints);
		line.shape.percent = 0;
		initProps(line, {
			z2: retrieve2(z2, 0),
			shape: { percent: 1 }
		}, seriesModel, idx);
		this.add(line);
		each$2(SYMBOL_CATEGORIES, function(symbolCategory) {
			var symbol = createSymbol(symbolCategory, lineData, idx);
			this.add(symbol);
			this[makeSymbolTypeKey(symbolCategory)] = makeSymbolTypeValue(symbolCategory, lineData, idx);
		}, this);
		this._updateCommonStl(lineData, idx, seriesScope);
	};
	Line.prototype.updateData = function(lineData, idx, seriesScope) {
		var seriesModel = lineData.hostModel;
		var line = this.childOfName("line");
		var linePoints = lineData.getItemLayout(idx);
		var target = { shape: {} };
		setLinePoints(target.shape, linePoints);
		updateProps$1(line, target, seriesModel, idx);
		each$2(SYMBOL_CATEGORIES, function(symbolCategory) {
			var symbolType = makeSymbolTypeValue(symbolCategory, lineData, idx);
			var key = makeSymbolTypeKey(symbolCategory);
			if (this[key] !== symbolType) {
				this.remove(this.childOfName(symbolCategory));
				var symbol = createSymbol(symbolCategory, lineData, idx);
				this.add(symbol);
			}
			this[key] = symbolType;
		}, this);
		this._updateCommonStl(lineData, idx, seriesScope);
	};
	Line.prototype.getLinePath = function() {
		return this.childAt(0);
	};
	Line.prototype._updateCommonStl = function(lineData, idx, seriesScope) {
		var seriesModel = lineData.hostModel;
		var line = this.childOfName("line");
		var emphasisLineStyle = seriesScope && seriesScope.emphasisLineStyle;
		var blurLineStyle = seriesScope && seriesScope.blurLineStyle;
		var selectLineStyle = seriesScope && seriesScope.selectLineStyle;
		var labelStatesModels = seriesScope && seriesScope.labelStatesModels;
		var emphasisDisabled = seriesScope && seriesScope.emphasisDisabled;
		var focus = seriesScope && seriesScope.focus;
		var blurScope = seriesScope && seriesScope.blurScope;
		if (!seriesScope || lineData.hasItemOption) {
			var itemModel = lineData.getItemModel(idx);
			var emphasisModel = itemModel.getModel("emphasis");
			emphasisLineStyle = emphasisModel.getModel("lineStyle").getLineStyle();
			blurLineStyle = itemModel.getModel(["blur", "lineStyle"]).getLineStyle();
			selectLineStyle = itemModel.getModel(["select", "lineStyle"]).getLineStyle();
			emphasisDisabled = emphasisModel.get("disabled");
			focus = emphasisModel.get("focus");
			blurScope = emphasisModel.get("blurScope");
			labelStatesModels = getLabelStatesModels(itemModel);
		}
		var lineStyle = lineData.getItemVisual(idx, "style");
		var visualColor = lineStyle.stroke;
		line.useStyle(lineStyle);
		line.style.fill = null;
		line.style.strokeNoScale = true;
		line.ensureState("emphasis").style = emphasisLineStyle;
		line.ensureState("blur").style = blurLineStyle;
		line.ensureState("select").style = selectLineStyle;
		each$2(SYMBOL_CATEGORIES, function(symbolCategory) {
			var symbol = this.childOfName(symbolCategory);
			if (symbol) {
				symbol.setColor(visualColor);
				symbol.style.opacity = lineStyle.opacity;
				for (var i = 0; i < SPECIAL_STATES.length; i++) {
					var stateName = SPECIAL_STATES[i];
					var lineState = line.getState(stateName);
					if (lineState) {
						var lineStateStyle = lineState.style || {};
						var state = symbol.ensureState(stateName);
						var stateStyle = state.style || (state.style = {});
						if (lineStateStyle.stroke != null) stateStyle[symbol.__isEmptyBrush ? "stroke" : "fill"] = lineStateStyle.stroke;
						if (lineStateStyle.opacity != null) stateStyle.opacity = lineStateStyle.opacity;
					}
				}
				symbol.markRedraw();
			}
		}, this);
		var rawVal = seriesModel.getRawValue(idx);
		setLabelStyle(this, labelStatesModels, {
			labelDataIndex: idx,
			labelFetcher: { getFormattedLabel: function(dataIndex, stateName) {
				return seriesModel.getFormattedLabel(dataIndex, stateName, lineData.dataType);
			} },
			inheritColor: visualColor || tokens.color.neutral99,
			defaultOpacity: lineStyle.opacity,
			defaultText: (rawVal == null ? lineData.getName(idx) : isFinite(rawVal) ? round(rawVal, 10) : rawVal) + ""
		});
		var label = this.getTextContent();
		if (label) {
			var labelNormalModel = labelStatesModels.normal;
			label.__align = label.style.align;
			label.__verticalAlign = label.style.verticalAlign;
			label.__position = labelNormalModel.get("position") || "middle";
			var distance = labelNormalModel.get("distance");
			if (!isArray(distance)) distance = [distance, distance];
			label.__labelDistance = distance;
		}
		this.setTextConfig({
			position: null,
			local: true,
			inside: false
		});
		toggleHoverEmphasis(this, focus, blurScope, emphasisDisabled);
	};
	Line.prototype.highlight = function() {
		enterEmphasis(this);
	};
	Line.prototype.downplay = function() {
		leaveEmphasis(this);
	};
	Line.prototype.updateLayout = function(lineData, idx) {
		this.childOfName("line").stopAnimation();
		this.setLinePoints(lineData.getItemLayout(idx));
	};
	Line.prototype.setLinePoints = function(points) {
		var linePath = this.childOfName("line");
		setLinePoints(linePath.shape, points);
		linePath.dirty();
	};
	Line.prototype.beforeUpdate = function() {
		var lineGroup = this;
		var symbolFrom = lineGroup.childOfName("fromSymbol");
		var symbolTo = lineGroup.childOfName("toSymbol");
		var label = lineGroup.getTextContent();
		if (!symbolFrom && !symbolTo && (!label || label.ignore)) return;
		var invScale = 1;
		var parentNode = this.parent;
		while (parentNode) {
			if (parentNode.scaleX) invScale /= parentNode.scaleX;
			parentNode = parentNode.parent;
		}
		var line = lineGroup.childOfName("line");
		if (!this.__dirty && !line.__dirty) return;
		var percent = line.shape.percent;
		var fromPos = line.pointAt(0);
		var toPos = line.pointAt(percent);
		var d = sub([], toPos, fromPos);
		normalize(d, d);
		function setSymbolRotation(symbol, percent) {
			var specifiedRotation = symbol.__specifiedRotation;
			if (specifiedRotation == null) {
				var tangent = line.tangentAt(percent);
				symbol.attr("rotation", (percent === 1 ? -1 : 1) * Math.PI / 2 - Math.atan2(tangent[1], tangent[0]));
			} else symbol.attr("rotation", specifiedRotation);
		}
		if (symbolFrom) {
			symbolFrom.setPosition(fromPos);
			setSymbolRotation(symbolFrom, 0);
			symbolFrom.scaleX = symbolFrom.scaleY = invScale * percent;
			symbolFrom.markRedraw();
		}
		if (symbolTo) {
			symbolTo.setPosition(toPos);
			setSymbolRotation(symbolTo, 1);
			symbolTo.scaleX = symbolTo.scaleY = invScale * percent;
			symbolTo.markRedraw();
		}
		if (label && !label.ignore) {
			label.x = label.y = 0;
			label.originX = label.originY = 0;
			var textAlign = void 0;
			var textVerticalAlign = void 0;
			var distance = label.__labelDistance;
			var distanceX = distance[0] * invScale;
			var distanceY = distance[1] * invScale;
			var halfPercent = percent / 2;
			var tangent = line.tangentAt(halfPercent);
			var n = [tangent[1], -tangent[0]];
			var cp = line.pointAt(halfPercent);
			if (n[1] > 0) {
				n[0] = -n[0];
				n[1] = -n[1];
			}
			var dir = tangent[0] < 0 ? -1 : 1;
			if (label.__position !== "start" && label.__position !== "end") {
				var rotation = -Math.atan2(tangent[1], tangent[0]);
				if (toPos[0] < fromPos[0]) rotation = Math.PI + rotation;
				label.rotation = rotation;
			}
			var dy = void 0;
			switch (label.__position) {
				case "insideStartTop":
				case "insideMiddleTop":
				case "insideEndTop":
				case "middle":
					dy = -distanceY;
					textVerticalAlign = "bottom";
					break;
				case "insideStartBottom":
				case "insideMiddleBottom":
				case "insideEndBottom":
					dy = distanceY;
					textVerticalAlign = "top";
					break;
				default:
					dy = 0;
					textVerticalAlign = "middle";
			}
			switch (label.__position) {
				case "end":
					label.x = d[0] * distanceX + toPos[0];
					label.y = d[1] * distanceY + toPos[1];
					textAlign = d[0] > .8 ? "left" : d[0] < -.8 ? "right" : "center";
					textVerticalAlign = d[1] > .8 ? "top" : d[1] < -.8 ? "bottom" : "middle";
					break;
				case "start":
					label.x = -d[0] * distanceX + fromPos[0];
					label.y = -d[1] * distanceY + fromPos[1];
					textAlign = d[0] > .8 ? "right" : d[0] < -.8 ? "left" : "center";
					textVerticalAlign = d[1] > .8 ? "bottom" : d[1] < -.8 ? "top" : "middle";
					break;
				case "insideStartTop":
				case "insideStart":
				case "insideStartBottom":
					label.x = distanceX * dir + fromPos[0];
					label.y = fromPos[1] + dy;
					textAlign = tangent[0] < 0 ? "right" : "left";
					label.originX = -distanceX * dir;
					label.originY = -dy;
					break;
				case "insideMiddleTop":
				case "insideMiddle":
				case "insideMiddleBottom":
				case "middle":
					label.x = cp[0];
					label.y = cp[1] + dy;
					textAlign = "center";
					label.originY = -dy;
					break;
				case "insideEndTop":
				case "insideEnd":
				case "insideEndBottom":
					label.x = -distanceX * dir + toPos[0];
					label.y = toPos[1] + dy;
					textAlign = tangent[0] >= 0 ? "right" : "left";
					label.originX = distanceX * dir;
					label.originY = -dy;
			}
			label.scaleX = label.scaleY = invScale;
			label.setStyle({
				verticalAlign: label.__verticalAlign || textVerticalAlign,
				align: label.__align || textAlign
			});
		}
	};
	return Line;
}(Group$2);
//#endregion
//#region node_modules/echarts/lib/chart/helper/LineDraw.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var LineDraw = function() {
	function LineDraw(LineCtor) {
		this.group = new Group$2();
		this._LineCtor = LineCtor || Line;
	}
	LineDraw.prototype.updateData = function(lineData) {
		var _this = this;
		this._progressiveEls = null;
		var lineDraw = this;
		var group = lineDraw.group;
		var oldLineData = lineDraw._lineData;
		lineDraw._lineData = lineData;
		if (!oldLineData) group.removeAll();
		var seriesScope = makeSeriesScope(lineData);
		lineData.diff(oldLineData).add(function(idx) {
			_this._doAdd(lineData, idx, seriesScope);
		}).update(function(newIdx, oldIdx) {
			_this._doUpdate(oldLineData, lineData, oldIdx, newIdx, seriesScope);
		}).remove(function(idx) {
			group.remove(oldLineData.getItemGraphicEl(idx));
		}).execute();
	};
	LineDraw.prototype.updateLayout = function() {
		var lineData = this._lineData;
		if (!lineData) return;
		lineData.eachItemGraphicEl(function(el, idx) {
			el.updateLayout(lineData, idx);
		}, this);
	};
	LineDraw.prototype.incrementalPrepareUpdate = function(lineData) {
		this._seriesScope = makeSeriesScope(lineData);
		this._lineData = null;
		this.group.removeAll();
	};
	LineDraw.prototype.incrementalUpdate = function(taskParams, lineData, incrementalId) {
		this._progressiveEls = [];
		function updateIncrementalAndHover(el) {
			if (!el.isGroup && !isEffectObject(el)) {
				el.incremental = incrementalId;
				el.ensureState("emphasis").hoverLayer = 2;
			}
		}
		for (var idx = taskParams.start; idx < taskParams.end; idx++) if (lineNeedsDraw(lineData.getItemLayout(idx))) {
			var el = new this._LineCtor(lineData, idx, this._seriesScope);
			el.traverse(updateIncrementalAndHover);
			this.group.add(el);
			lineData.setItemGraphicEl(idx, el);
			this._progressiveEls.push(el);
		}
	};
	LineDraw.prototype.remove = function() {
		this.group.removeAll();
	};
	LineDraw.prototype.eachRendered = function(cb) {
		traverseElements(this._progressiveEls || this.group, cb);
	};
	LineDraw.prototype._doAdd = function(lineData, idx, seriesScope) {
		if (!lineNeedsDraw(lineData.getItemLayout(idx))) return;
		var el = new this._LineCtor(lineData, idx, seriesScope);
		lineData.setItemGraphicEl(idx, el);
		this.group.add(el);
	};
	LineDraw.prototype._doUpdate = function(oldLineData, newLineData, oldIdx, newIdx, seriesScope) {
		var itemEl = oldLineData.getItemGraphicEl(oldIdx);
		if (!lineNeedsDraw(newLineData.getItemLayout(newIdx))) {
			this.group.remove(itemEl);
			return;
		}
		if (!itemEl) itemEl = new this._LineCtor(newLineData, newIdx, seriesScope);
		else itemEl.updateData(newLineData, newIdx, seriesScope);
		newLineData.setItemGraphicEl(newIdx, itemEl);
		this.group.add(itemEl);
	};
	return LineDraw;
}();
function isEffectObject(el) {
	return el.animators && el.animators.length > 0;
}
function makeSeriesScope(lineData) {
	var hostModel = lineData.hostModel;
	var emphasisModel = hostModel.getModel("emphasis");
	return {
		lineStyle: hostModel.getModel("lineStyle").getLineStyle(),
		emphasisLineStyle: emphasisModel.getModel(["lineStyle"]).getLineStyle(),
		blurLineStyle: hostModel.getModel(["blur", "lineStyle"]).getLineStyle(),
		selectLineStyle: hostModel.getModel(["select", "lineStyle"]).getLineStyle(),
		emphasisDisabled: emphasisModel.get("disabled"),
		blurScope: emphasisModel.get("blurScope"),
		focus: emphasisModel.get("focus"),
		labelStatesModels: getLabelStatesModels(hostModel)
	};
}
function isPointNaN(pt) {
	return isNaN(pt[0]) || isNaN(pt[1]);
}
function lineNeedsDraw(pts) {
	return pts && !isPointNaN(pts[0]) && !isPointNaN(pts[1]);
}
//#endregion
//#region node_modules/echarts/lib/animation/customGraphicTransition.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var LEGACY_TRANSFORM_PROPS_MAP = {
	position: ["x", "y"],
	scale: ["scaleX", "scaleY"],
	origin: ["originX", "originY"]
};
var LEGACY_TRANSFORM_PROPS = keys(LEGACY_TRANSFORM_PROPS_MAP);
reduce(TRANSFORMABLE_PROPS, function(obj, key) {
	obj[key] = 1;
	return obj;
}, {});
TRANSFORMABLE_PROPS.join(", ");
var ELEMENT_ANIMATABLE_PROPS = [
	"",
	"style",
	"shape",
	"extra"
];
var transitionInnerStore = makeInner();
function getElementAnimationConfig(animationType, el, elOption, parentModel, dataIndex) {
	var animationProp = animationType + "Animation";
	var config = getAnimationConfig(animationType, parentModel, dataIndex) || {};
	var userDuring = transitionInnerStore(el).userDuring;
	if (config.duration > 0) {
		config.during = userDuring ? bind$1(duringCall, {
			el,
			userDuring
		}) : null;
		config.setToFinal = true;
		config.scope = animationType;
	}
	extend(config, elOption[animationProp]);
	return config;
}
function applyUpdateTransition(el, elOption, animatableModel, opts) {
	opts = opts || {};
	var dataIndex = opts.dataIndex, isInit = opts.isInit, clearStyle = opts.clearStyle;
	var hasAnimation = animatableModel.isAnimationEnabled();
	var store = transitionInnerStore(el);
	var styleOpt = elOption.style;
	store.userDuring = elOption.during;
	var transFromProps = {};
	var propsToSet = {};
	prepareTransformAllPropsFinal(el, elOption, propsToSet);
	if (el.type === "compound") {
		/**
		* We cannot directly clone shape for compoundPath,
		* because it makes the path to be an object instead of a Path instance,
		* and thus missing `buildPath` method.
		*/
		var paths = el.shape.paths;
		var optionPaths = elOption.shape.paths;
		for (var i = 0; i < optionPaths.length; i++) {
			var path = optionPaths[i];
			prepareShapeOrExtraAllPropsFinal("shape", path, paths[i]);
		}
	} else {
		prepareShapeOrExtraAllPropsFinal("shape", elOption, propsToSet);
		prepareShapeOrExtraAllPropsFinal("extra", elOption, propsToSet);
	}
	if (!isInit && hasAnimation) {
		prepareTransformTransitionFrom(el, elOption, transFromProps);
		prepareShapeOrExtraTransitionFrom("shape", el, elOption, transFromProps);
		prepareShapeOrExtraTransitionFrom("extra", el, elOption, transFromProps);
		prepareStyleTransitionFrom(el, elOption, styleOpt, transFromProps);
	}
	propsToSet.style = styleOpt;
	applyPropsDirectly(el, propsToSet, clearStyle);
	applyMiscProps(el, elOption);
	if (hasAnimation) {
		if (isInit) {
			var enterFromProps_1 = {};
			each$2(ELEMENT_ANIMATABLE_PROPS, function(propName) {
				var prop = propName ? elOption[propName] : elOption;
				if (prop && prop.enterFrom) {
					if (propName) enterFromProps_1[propName] = enterFromProps_1[propName] || {};
					extend(propName ? enterFromProps_1[propName] : enterFromProps_1, prop.enterFrom);
				}
			});
			var config = getElementAnimationConfig("enter", el, elOption, animatableModel, dataIndex);
			if (config.duration > 0) el.animateFrom(enterFromProps_1, config);
		} else applyPropsTransition(el, elOption, dataIndex || 0, animatableModel, transFromProps);
	}
	updateLeaveTo(el, elOption);
	styleOpt ? el.dirty() : el.markRedraw();
}
function updateLeaveTo(el, elOption) {
	var leaveToProps = transitionInnerStore(el).leaveToProps;
	for (var i = 0; i < ELEMENT_ANIMATABLE_PROPS.length; i++) {
		var propName = ELEMENT_ANIMATABLE_PROPS[i];
		var prop = propName ? elOption[propName] : elOption;
		if (prop && prop.leaveTo) {
			if (!leaveToProps) leaveToProps = transitionInnerStore(el).leaveToProps = {};
			if (propName) leaveToProps[propName] = leaveToProps[propName] || {};
			extend(propName ? leaveToProps[propName] : leaveToProps, prop.leaveTo);
		}
	}
}
function applyLeaveTransition(el, elOption, animatableModel, onRemove) {
	if (el) {
		var parent_1 = el.parent;
		var leaveToProps = transitionInnerStore(el).leaveToProps;
		if (leaveToProps) {
			var config = getElementAnimationConfig("update", el, elOption, animatableModel, 0);
			config.done = function() {
				parent_1 && parent_1.remove(el);
				onRemove && onRemove();
			};
			el.animateTo(leaveToProps, config);
		} else {
			parent_1 && parent_1.remove(el);
			onRemove && onRemove();
		}
	}
}
function isTransitionAll(transition) {
	return transition === "all";
}
function applyPropsDirectly(el, allPropsFinal, clearStyle) {
	var styleOpt = allPropsFinal.style;
	if (!el.isGroup && styleOpt) {
		if (clearStyle) {
			el.useStyle({});
			var animators = el.animators;
			for (var i = 0; i < animators.length; i++) {
				var animator = animators[i];
				if (animator.targetName === "style") animator.changeTarget(el.style);
			}
		}
		el.setStyle(styleOpt);
	}
	if (allPropsFinal) {
		allPropsFinal.style = null;
		allPropsFinal && el.attr(allPropsFinal);
		allPropsFinal.style = styleOpt;
	}
}
function applyPropsTransition(el, elOption, dataIndex, model, transFromProps) {
	if (transFromProps) {
		var config = getElementAnimationConfig("update", el, elOption, model, dataIndex);
		if (config.duration > 0) el.animateFrom(transFromProps, config);
	}
}
function applyMiscProps(el, elOption) {
	hasOwn(elOption, "silent") && (el.silent = elOption.silent);
	hasOwn(elOption, "ignore") && (el.ignore = elOption.ignore);
	if (el instanceof Displayable) hasOwn(elOption, "invisible") && (el.invisible = elOption.invisible);
	if (el instanceof Path) hasOwn(elOption, "autoBatch") && (el.autoBatch = elOption.autoBatch);
}
var tmpDuringScope = {};
var transitionDuringAPI = {
	setTransform: function(key, val) {
		tmpDuringScope.el[key] = val;
		return this;
	},
	getTransform: function(key) {
		return tmpDuringScope.el[key];
	},
	setShape: function(key, val) {
		var el = tmpDuringScope.el;
		var shape = el.shape || (el.shape = {});
		shape[key] = val;
		el.dirtyShape && el.dirtyShape();
		return this;
	},
	getShape: function(key) {
		var shape = tmpDuringScope.el.shape;
		if (shape) return shape[key];
	},
	setStyle: function(key, val) {
		var el = tmpDuringScope.el;
		var style = el.style;
		if (style) {
			style[key] = val;
			el.dirtyStyle && el.dirtyStyle();
		}
		return this;
	},
	getStyle: function(key) {
		var style = tmpDuringScope.el.style;
		if (style) return style[key];
	},
	setExtra: function(key, val) {
		var extra = tmpDuringScope.el.extra || (tmpDuringScope.el.extra = {});
		extra[key] = val;
		return this;
	},
	getExtra: function(key) {
		var extra = tmpDuringScope.el.extra;
		if (extra) return extra[key];
	}
};
function duringCall() {
	var scope = this;
	var el = scope.el;
	if (!el) return;
	var latestUserDuring = transitionInnerStore(el).userDuring;
	var scopeUserDuring = scope.userDuring;
	if (latestUserDuring !== scopeUserDuring) {
		scope.el = scope.userDuring = null;
		return;
	}
	tmpDuringScope.el = el;
	scopeUserDuring(transitionDuringAPI);
}
function prepareShapeOrExtraTransitionFrom(mainAttr, fromEl, elOption, transFromProps) {
	var attrOpt = elOption[mainAttr];
	if (!attrOpt) return;
	var elPropsInAttr = fromEl[mainAttr];
	var transFromPropsInAttr;
	if (elPropsInAttr) {
		var transition = elOption.transition;
		var attrTransition = attrOpt.transition;
		if (attrTransition) {
			!transFromPropsInAttr && (transFromPropsInAttr = transFromProps[mainAttr] = {});
			if (isTransitionAll(attrTransition)) extend(transFromPropsInAttr, elPropsInAttr);
			else {
				var transitionKeys = normalizeToArray(attrTransition);
				for (var i = 0; i < transitionKeys.length; i++) {
					var key = transitionKeys[i];
					var elVal = elPropsInAttr[key];
					transFromPropsInAttr[key] = elVal;
				}
			}
		} else if (isTransitionAll(transition) || indexOf(transition, mainAttr) >= 0) {
			!transFromPropsInAttr && (transFromPropsInAttr = transFromProps[mainAttr] = {});
			var elPropsInAttrKeys = keys(elPropsInAttr);
			for (var i = 0; i < elPropsInAttrKeys.length; i++) {
				var key = elPropsInAttrKeys[i];
				var elVal = elPropsInAttr[key];
				if (isNonStyleTransitionEnabled(attrOpt[key], elVal)) transFromPropsInAttr[key] = elVal;
			}
		}
	}
}
function prepareShapeOrExtraAllPropsFinal(mainAttr, elOption, allProps) {
	var attrOpt = elOption[mainAttr];
	if (!attrOpt) return;
	var allPropsInAttr = allProps[mainAttr] = {};
	var keysInAttr = keys(attrOpt);
	for (var i = 0; i < keysInAttr.length; i++) {
		var key = keysInAttr[i];
		allPropsInAttr[key] = cloneValue(attrOpt[key]);
	}
}
function prepareTransformTransitionFrom(el, elOption, transFromProps) {
	var transition = elOption.transition;
	var transitionKeys = isTransitionAll(transition) ? TRANSFORMABLE_PROPS : normalizeToArray(transition || []);
	for (var i = 0; i < transitionKeys.length; i++) {
		var key = transitionKeys[i];
		if (key === "style" || key === "shape" || key === "extra") continue;
		transFromProps[key] = el[key];
	}
}
function prepareTransformAllPropsFinal(el, elOption, allProps) {
	for (var i = 0; i < LEGACY_TRANSFORM_PROPS.length; i++) {
		var legacyName = LEGACY_TRANSFORM_PROPS[i];
		var xyName = LEGACY_TRANSFORM_PROPS_MAP[legacyName];
		var legacyArr = elOption[legacyName];
		if (legacyArr) {
			allProps[xyName[0]] = legacyArr[0];
			allProps[xyName[1]] = legacyArr[1];
		}
	}
	for (var i = 0; i < TRANSFORMABLE_PROPS.length; i++) {
		var key = TRANSFORMABLE_PROPS[i];
		if (elOption[key] != null) allProps[key] = elOption[key];
	}
}
function prepareStyleTransitionFrom(fromEl, elOption, styleOpt, transFromProps) {
	if (!styleOpt) return;
	var fromElStyle = fromEl.style;
	var transFromStyleProps;
	if (fromElStyle) {
		var styleTransition = styleOpt.transition;
		var elTransition = elOption.transition;
		if (styleTransition && !isTransitionAll(styleTransition)) {
			var transitionKeys = normalizeToArray(styleTransition);
			!transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
			for (var i = 0; i < transitionKeys.length; i++) {
				var key = transitionKeys[i];
				var elVal = fromElStyle[key];
				transFromStyleProps[key] = elVal;
			}
		} else if (fromEl.getAnimationStyleProps && (isTransitionAll(elTransition) || isTransitionAll(styleTransition) || indexOf(elTransition, "style") >= 0)) {
			var animationProps = fromEl.getAnimationStyleProps();
			var animationStyleProps = animationProps ? animationProps.style : null;
			if (animationStyleProps) {
				!transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
				var styleKeys = keys(styleOpt);
				for (var i = 0; i < styleKeys.length; i++) {
					var key = styleKeys[i];
					if (animationStyleProps[key]) {
						var elVal = fromElStyle[key];
						transFromStyleProps[key] = elVal;
					}
				}
			}
		}
	}
}
function isNonStyleTransitionEnabled(optVal, elVal) {
	return !isArrayLike(optVal) ? optVal != null && isFinite(optVal) : optVal !== elVal;
}
//#endregion
//#region node_modules/echarts/lib/animation/customGraphicKeyframeAnimation.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var getStateToRestore = makeInner();
var KEYFRAME_EXCLUDE_KEYS = [
	"percent",
	"easing",
	"shape",
	"style",
	"extra"
];
/**
* Stop previous keyframe animation and restore the attributes.
* Avoid new keyframe animation starts with wrong internal state when the percent: 0 is not set.
*/
function stopPreviousKeyframeAnimationAndRestore(el) {
	el.stopAnimation("keyframe");
	el.attr(getStateToRestore(el));
}
function applyKeyframeAnimation(el, animationOpts, animatableModel) {
	if (!animatableModel.isAnimationEnabled() || !animationOpts) return;
	if (isArray(animationOpts)) {
		each$2(animationOpts, function(singleAnimationOpts) {
			applyKeyframeAnimation(el, singleAnimationOpts, animatableModel);
		});
		return;
	}
	var keyframes = animationOpts.keyframes;
	var duration = animationOpts.duration;
	if (animatableModel && duration == null) {
		var config = getAnimationConfig("enter", animatableModel, 0);
		duration = config && config.duration;
	}
	if (!keyframes || !duration) return;
	var stateToRestore = getStateToRestore(el);
	each$2(ELEMENT_ANIMATABLE_PROPS, function(targetPropName) {
		if (targetPropName && !el[targetPropName]) return;
		var animator;
		keyframes.sort(function(a, b) {
			return a.percent - b.percent;
		});
		each$2(keyframes, function(kf) {
			var animators = el.animators;
			var kfValues = targetPropName ? kf[targetPropName] : kf;
			if (!kfValues) return;
			var propKeys = keys(kfValues);
			if (!targetPropName) propKeys = filter(propKeys, function(key) {
				return indexOf(KEYFRAME_EXCLUDE_KEYS, key) < 0;
			});
			if (!propKeys.length) return;
			if (!animator) {
				animator = el.animate(targetPropName, animationOpts.loop, true);
				animator.scope = "keyframe";
			}
			for (var i = 0; i < animators.length; i++) if (animators[i] !== animator && animators[i].targetName === animator.targetName) animators[i].stopTracks(propKeys);
			targetPropName && (stateToRestore[targetPropName] = stateToRestore[targetPropName] || {});
			var savedTarget = targetPropName ? stateToRestore[targetPropName] : stateToRestore;
			each$2(propKeys, function(key) {
				savedTarget[key] = ((targetPropName ? el[targetPropName] : el) || {})[key];
			});
			animator.whenWithKeys(duration * kf.percent, kfValues, propKeys, kf.easing);
		});
		if (!animator) return;
		animator.delay(animationOpts.delay || 0).duration(duration).start(animationOpts.easing);
	});
}
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/BaseAxisPointer.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var inner$6 = makeInner();
var clone = clone$1;
var bind = bind$1;
/**
* Base axis pointer class in 2D.
*/
var BaseAxisPointer = function() {
	function BaseAxisPointer() {
		this._dragging = false;
		/**
		* In px, arbitrary value. Do not set too small,
		* no animation is ok for most cases.
		*/
		this.animationThreshold = 15;
	}
	/**
	* @implement
	*/
	BaseAxisPointer.prototype.render = function(axisModel, axisPointerModel, api, forceRender) {
		var value = axisPointerModel.get("value");
		var status = axisPointerModel.get("status");
		this._axisModel = axisModel;
		this._axisPointerModel = axisPointerModel;
		this._api = api;
		if (!forceRender && this._lastValue === value && this._lastStatus === status) return;
		this._lastValue = value;
		this._lastStatus = status;
		var group = this._group;
		var handle = this._handle;
		if (!status || status === "hide") {
			group && group.hide();
			handle && handle.hide();
			return;
		}
		group && group.show();
		handle && handle.show();
		var elOption = {};
		this.makeElOption(elOption, value, axisModel, axisPointerModel, api);
		var graphicKey = elOption.graphicKey;
		if (graphicKey !== this._lastGraphicKey) this.clear(api);
		this._lastGraphicKey = graphicKey;
		var moveAnimation = this._moveAnimation = this.determineAnimation(axisModel, axisPointerModel);
		if (!group) {
			group = this._group = new Group$2();
			this.createPointerEl(group, elOption, axisModel, axisPointerModel);
			this.createLabelEl(group, elOption, axisModel, axisPointerModel);
			api.getZr().add(group);
		} else {
			var doUpdateProps = curry$1(updateProps, axisPointerModel, moveAnimation);
			this.updatePointerEl(group, elOption, doUpdateProps);
			this.updateLabelEl(group, elOption, doUpdateProps, axisPointerModel);
		}
		updateMandatoryProps(group, axisPointerModel, true);
		this._renderHandle(value);
	};
	/**
	* @implement
	*/
	BaseAxisPointer.prototype.remove = function(api) {
		this.clear(api);
	};
	/**
	* @implement
	*/
	BaseAxisPointer.prototype.dispose = function(api) {
		this.clear(api);
	};
	/**
	* @protected
	*/
	BaseAxisPointer.prototype.determineAnimation = function(axisModel, axisPointerModel) {
		var animation = axisPointerModel.get("animation");
		var axis = axisModel.axis;
		var isCategoryAxis = axis.type === "category";
		var useSnap = axisPointerModel.get("snap");
		if (!useSnap && !isCategoryAxis) return false;
		if (animation === "auto" || animation == null) {
			var animationThreshold = this.animationThreshold;
			if (isCategoryAxis && calcBandWidth(axis).w > animationThreshold) return true;
			if (useSnap) {
				var seriesDataCount = getAxisInfo$1(axisModel).seriesDataCount;
				var axisExtent = axis.getExtent();
				return Math.abs(axisExtent[0] - axisExtent[1]) / seriesDataCount > animationThreshold;
			}
			return false;
		}
		return animation === true;
	};
	/**
	* add {pointer, label, graphicKey} to elOption
	* @protected
	*/
	BaseAxisPointer.prototype.makeElOption = function(elOption, value, axisModel, axisPointerModel, api) {};
	/**
	* @protected
	*/
	BaseAxisPointer.prototype.createPointerEl = function(group, elOption, axisModel, axisPointerModel) {
		var pointerOption = elOption.pointer;
		if (pointerOption) {
			var pointerEl = inner$6(group).pointerEl = new graphic_exports[pointerOption.type](clone(elOption.pointer));
			group.add(pointerEl);
		}
	};
	/**
	* @protected
	*/
	BaseAxisPointer.prototype.createLabelEl = function(group, elOption, axisModel, axisPointerModel) {
		if (elOption.label) {
			var labelEl = inner$6(group).labelEl = new ZRText(clone(elOption.label));
			group.add(labelEl);
			updateLabelShowHide(labelEl, axisPointerModel);
		}
	};
	/**
	* @protected
	*/
	BaseAxisPointer.prototype.updatePointerEl = function(group, elOption, updateProps) {
		var pointerEl = inner$6(group).pointerEl;
		if (pointerEl && elOption.pointer) {
			pointerEl.setStyle(elOption.pointer.style);
			updateProps(pointerEl, { shape: elOption.pointer.shape });
		}
	};
	/**
	* @protected
	*/
	BaseAxisPointer.prototype.updateLabelEl = function(group, elOption, updateProps, axisPointerModel) {
		var labelEl = inner$6(group).labelEl;
		if (labelEl) {
			labelEl.setStyle(elOption.label.style);
			updateProps(labelEl, {
				x: elOption.label.x,
				y: elOption.label.y
			});
			updateLabelShowHide(labelEl, axisPointerModel);
		}
	};
	/**
	* @private
	*/
	BaseAxisPointer.prototype._renderHandle = function(value) {
		if (this._dragging || !this.updateHandleTransform) return;
		var axisPointerModel = this._axisPointerModel;
		var zr = this._api.getZr();
		var handle = this._handle;
		var handleModel = axisPointerModel.getModel("handle");
		var status = axisPointerModel.get("status");
		if (!handleModel.get("show") || !status || status === "hide") {
			handle && zr.remove(handle);
			this._handle = null;
			return;
		}
		var isInit;
		if (!this._handle) {
			isInit = true;
			handle = this._handle = createIcon(handleModel.get("icon"), {
				cursor: "move",
				draggable: true,
				onmousemove: function(e) {
					stop(e.event);
				},
				onmousedown: bind(this._onHandleDragMove, this, 0, 0),
				drift: bind(this._onHandleDragMove, this),
				ondragend: bind(this._onHandleDragEnd, this)
			});
			zr.add(handle);
		}
		updateMandatoryProps(handle, axisPointerModel, false);
		handle.setStyle(handleModel.getItemStyle(null, [
			"color",
			"borderColor",
			"borderWidth",
			"opacity",
			"shadowColor",
			"shadowBlur",
			"shadowOffsetX",
			"shadowOffsetY"
		]));
		var handleSize = handleModel.get("size");
		if (!isArray(handleSize)) handleSize = [handleSize, handleSize];
		handle.scaleX = handleSize[0] / 2;
		handle.scaleY = handleSize[1] / 2;
		createOrUpdate(this, "_doDispatchAxisPointer", handleModel.get("throttle") || 0, "fixRate");
		this._moveHandleToValue(value, isInit);
	};
	BaseAxisPointer.prototype._moveHandleToValue = function(value, isInit) {
		updateProps(this._axisPointerModel, !isInit && this._moveAnimation, this._handle, getHandleTransProps(this.getHandleTransform(value, this._axisModel, this._axisPointerModel)));
	};
	BaseAxisPointer.prototype._onHandleDragMove = function(dx, dy) {
		var handle = this._handle;
		if (!handle) return;
		this._dragging = true;
		var trans = this.updateHandleTransform(getHandleTransProps(handle), [dx, dy], this._axisModel, this._axisPointerModel);
		this._payloadInfo = trans;
		handle.stopAnimation();
		handle.attr(getHandleTransProps(trans));
		inner$6(handle).lastProp = null;
		this._doDispatchAxisPointer();
	};
	/**
	* Throttled method.
	*/
	BaseAxisPointer.prototype._doDispatchAxisPointer = function() {
		if (!this._handle) return;
		var payloadInfo = this._payloadInfo;
		var axisModel = this._axisModel;
		this._api.dispatchAction({
			type: "updateAxisPointer",
			x: payloadInfo.cursorPoint[0],
			y: payloadInfo.cursorPoint[1],
			tooltipOption: payloadInfo.tooltipOption,
			axesInfo: [{
				axisDim: axisModel.axis.dim,
				axisIndex: axisModel.componentIndex
			}]
		});
	};
	BaseAxisPointer.prototype._onHandleDragEnd = function() {
		this._dragging = false;
		if (!this._handle) return;
		var value = this._axisPointerModel.get("value");
		this._moveHandleToValue(value);
		this._api.dispatchAction({ type: "hideTip" });
	};
	/**
	* @private
	*/
	BaseAxisPointer.prototype.clear = function(api) {
		this._lastValue = null;
		this._lastStatus = null;
		var zr = api.getZr();
		var group = this._group;
		var handle = this._handle;
		if (zr && group) {
			this._lastGraphicKey = null;
			group && zr.remove(group);
			handle && zr.remove(handle);
			this._group = null;
			this._handle = null;
			this._payloadInfo = null;
		}
		clear(this, "_doDispatchAxisPointer");
	};
	/**
	* @protected
	*/
	BaseAxisPointer.prototype.doClear = function() {};
	BaseAxisPointer.prototype.buildLabel = function(xy, wh, xDimIndex) {
		xDimIndex = xDimIndex || 0;
		return {
			x: xy[xDimIndex],
			y: xy[1 - xDimIndex],
			width: wh[xDimIndex],
			height: wh[1 - xDimIndex]
		};
	};
	return BaseAxisPointer;
}();
function updateProps(animationModel, moveAnimation, el, props) {
	if (!propsEqual(inner$6(el).lastProp, props)) {
		inner$6(el).lastProp = props;
		moveAnimation ? updateProps$1(el, props, animationModel) : (el.stopAnimation(), el.attr(props));
	}
}
function propsEqual(lastProps, newProps) {
	if (isObject(lastProps) && isObject(newProps)) {
		var equals_1 = true;
		each$2(newProps, function(item, key) {
			equals_1 = equals_1 && propsEqual(lastProps[key], item);
		});
		return !!equals_1;
	} else return lastProps === newProps;
}
function updateLabelShowHide(labelEl, axisPointerModel) {
	labelEl[axisPointerModel.get(["label", "show"]) ? "show" : "hide"]();
}
function getHandleTransProps(trans) {
	return {
		x: trans.x || 0,
		y: trans.y || 0,
		rotation: trans.rotation || 0
	};
}
function updateMandatoryProps(group, axisPointerModel, silent) {
	var z = axisPointerModel.get("z");
	var zlevel = axisPointerModel.get("zlevel");
	group && group.traverse(function(el) {
		if (el.type !== "group") {
			z != null && (el.z = z);
			zlevel != null && (el.zlevel = zlevel);
			el.silent = silent;
		}
	});
}
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/viewHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function buildElStyle(axisPointerModel) {
	var axisPointerType = axisPointerModel.get("type");
	var styleModel = axisPointerModel.getModel(axisPointerType + "Style");
	var style;
	if (axisPointerType === "line") {
		style = styleModel.getLineStyle();
		style.fill = null;
	} else if (axisPointerType === "shadow") {
		style = styleModel.getAreaStyle();
		style.stroke = null;
	}
	return style;
}
/**
* @param {Function} labelPos {align, verticalAlign, position}
*/
function buildLabelElOption(elOption, axisModel, axisPointerModel, api, labelPos) {
	var text = getValueLabel(axisPointerModel.get("value"), axisModel.axis, axisModel.ecModel, axisPointerModel.get("seriesDataIndices"), {
		precision: axisPointerModel.get(["label", "precision"]),
		formatter: axisPointerModel.get(["label", "formatter"])
	});
	var labelModel = axisPointerModel.getModel("label");
	var paddings = normalizeCssArray(labelModel.get("padding") || 0);
	var font = labelModel.getFont();
	var textRect = getBoundingRect(text, font);
	var position = labelPos.position;
	var width = textRect.width + paddings[1] + paddings[3];
	var height = textRect.height + paddings[0] + paddings[2];
	var align = labelPos.align;
	align === "right" && (position[0] -= width);
	align === "center" && (position[0] -= width / 2);
	var verticalAlign = labelPos.verticalAlign;
	verticalAlign === "bottom" && (position[1] -= height);
	verticalAlign === "middle" && (position[1] -= height / 2);
	confineInContainer(position, width, height, api);
	var bgColor = labelModel.get("backgroundColor");
	if (!bgColor || bgColor === "auto") bgColor = axisModel.get([
		"axisLine",
		"lineStyle",
		"color"
	]);
	elOption.label = {
		x: position[0],
		y: position[1],
		style: createTextStyle(labelModel, {
			text,
			font,
			fill: labelModel.getTextColor(),
			padding: paddings,
			backgroundColor: bgColor
		}),
		z2: 10
	};
}
function confineInContainer(position, width, height, api) {
	var viewWidth = api.getWidth();
	var viewHeight = api.getHeight();
	position[0] = Math.min(position[0] + width, viewWidth) - width;
	position[1] = Math.min(position[1] + height, viewHeight) - height;
	position[0] = Math.max(position[0], 0);
	position[1] = Math.max(position[1], 0);
}
function getValueLabel(value, axis, ecModel, seriesDataIndices, opt) {
	value = axis.scale.parse(value);
	var text = axis.scale.getLabel({ value }, { precision: opt.precision });
	var formatter = opt.formatter;
	if (formatter) {
		var params_1 = {
			value: getAxisRawValue(axis, { value }),
			axisDimension: axis.dim,
			axisIndex: axis.index,
			seriesData: []
		};
		each$2(seriesDataIndices, function(idxItem) {
			var series = ecModel.getSeriesByIndex(idxItem.seriesIndex);
			var dataIndex = idxItem.dataIndexInside;
			var dataParams = series && series.getDataParams(dataIndex);
			dataParams && params_1.seriesData.push(dataParams);
		});
		if (isString(formatter)) text = formatter.replace("{value}", text);
		else if (isFunction(formatter)) text = formatter(params_1);
	}
	return text;
}
function getTransformedPosition(axis, value, layoutInfo) {
	var transform = create();
	rotate(transform, transform, layoutInfo.rotation);
	translate(transform, transform, layoutInfo.position);
	return applyTransform([axis.dataToCoord(value), (layoutInfo.labelOffset || 0) + (layoutInfo.labelDirection || 1) * (layoutInfo.labelMargin || 0)], transform);
}
function buildCartesianSingleLabelElOption(value, elOption, layoutInfo, axisModel, axisPointerModel, api) {
	var textLayout = AxisBuilder.innerTextLayout(layoutInfo.rotation, 0, layoutInfo.labelDirection);
	layoutInfo.labelMargin = axisPointerModel.get(["label", "margin"]);
	buildLabelElOption(elOption, axisModel, axisPointerModel, api, {
		position: getTransformedPosition(axisModel.axis, value, layoutInfo),
		align: textLayout.textAlign,
		verticalAlign: textLayout.textVerticalAlign
	});
}
function makeLineShape(p1, p2, xDimIndex) {
	xDimIndex = xDimIndex || 0;
	return {
		x1: p1[xDimIndex],
		y1: p1[1 - xDimIndex],
		x2: p2[xDimIndex],
		y2: p2[1 - xDimIndex]
	};
}
function makeRectShape(xy, wh, xDimIndex) {
	xDimIndex = xDimIndex || 0;
	return {
		x: xy[xDimIndex],
		y: xy[1 - xDimIndex],
		width: wh[xDimIndex],
		height: wh[1 - xDimIndex]
	};
}
function calcAxisPointerShadowBandWidth(axis, seriesDataIndices, ecModel) {
	return calcBandWidth(axis, {
		fromStat: { sers: map(seriesDataIndices, function(item) {
			return ecModel.getSeriesByIndex(item.seriesIndex);
		}) },
		min: 1
	}).w;
}
/**
* Return a [min, max] in pixel clampped by `axisExtent`.
*/
function calcAxisPointerShadowEnds(val, axisExtent, bandWidth) {
	return [mathMax(mathMin(axisExtent[0], axisExtent[1]), val - bandWidth / 2), mathMin(val + bandWidth / 2, mathMax(axisExtent[0], axisExtent[1]))];
}
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/CartesianAxisPointer.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var CartesianAxisPointer = function(_super) {
	__extends(CartesianAxisPointer, _super);
	function CartesianAxisPointer() {
		return _super !== null && _super.apply(this, arguments) || this;
	}
	/**
	* @override
	*/
	CartesianAxisPointer.prototype.makeElOption = function(elOption, value, axisModel, axisPointerModel, api) {
		var axis = axisModel.axis;
		var grid = axis.grid;
		var axisPointerType = axisPointerModel.get("type");
		var thisExtent = axis.getGlobalExtent();
		var otherExtent = getCartesian(grid, axis).getOtherAxis(axis).getGlobalExtent();
		var pixelValue = axis.toGlobalCoord(axis.dataToCoord(value, true));
		if (axisPointerType && axisPointerType !== "none") {
			var elStyle = buildElStyle(axisPointerModel);
			var pointerOption = pointerShapeBuilder[axisPointerType](axis, pixelValue, thisExtent, otherExtent, axisPointerModel.get("seriesDataIndices"), axisPointerModel.ecModel);
			pointerOption.style = elStyle;
			elOption.graphicKey = pointerOption.type;
			elOption.pointer = pointerOption;
		}
		buildCartesianSingleLabelElOption(value, elOption, layout(grid.getRect(), axisModel), axisModel, axisPointerModel, api);
	};
	/**
	* @override
	*/
	CartesianAxisPointer.prototype.getHandleTransform = function(value, axisModel, axisPointerModel) {
		var layoutInfo = layout(axisModel.axis.grid.getRect(), axisModel, { labelInside: false });
		layoutInfo.labelMargin = axisPointerModel.get(["handle", "margin"]);
		var pos = getTransformedPosition(axisModel.axis, value, layoutInfo);
		return {
			x: pos[0],
			y: pos[1],
			rotation: layoutInfo.rotation + (layoutInfo.labelDirection < 0 ? Math.PI : 0)
		};
	};
	/**
	* @override
	*/
	CartesianAxisPointer.prototype.updateHandleTransform = function(transform, delta, axisModel, axisPointerModel) {
		var axis = axisModel.axis;
		var grid = axis.grid;
		var axisExtent = axis.getGlobalExtent(true);
		var otherExtent = getCartesian(grid, axis).getOtherAxis(axis).getGlobalExtent();
		var dimIndex = axis.dim === "x" ? 0 : 1;
		var currPosition = [transform.x, transform.y];
		currPosition[dimIndex] += delta[dimIndex];
		currPosition[dimIndex] = mathMin(axisExtent[1], currPosition[dimIndex]);
		currPosition[dimIndex] = mathMax(axisExtent[0], currPosition[dimIndex]);
		var cursorOtherValue = (otherExtent[1] + otherExtent[0]) / 2;
		var cursorPoint = [cursorOtherValue, cursorOtherValue];
		cursorPoint[dimIndex] = currPosition[dimIndex];
		return {
			x: currPosition[0],
			y: currPosition[1],
			rotation: transform.rotation,
			cursorPoint,
			tooltipOption: [{ verticalAlign: "middle" }, { align: "center" }][dimIndex]
		};
	};
	return CartesianAxisPointer;
}(BaseAxisPointer);
function getCartesian(grid, axis) {
	var opt = {};
	opt[axis.dim + "AxisIndex"] = axis.index;
	return grid.getCartesian(opt);
}
var pointerShapeBuilder = {
	line: function(axis, pixelValue, thisExtent, otherExtent) {
		return {
			type: "Line",
			subPixelOptimize: true,
			shape: makeLineShape([pixelValue, otherExtent[0]], [pixelValue, otherExtent[1]], getAxisDimIndex(axis))
		};
	},
	shadow: function(axis, pixelValue, thisExtent, otherExtent, seriesDataIndices, ecModel) {
		var bandWidth = calcAxisPointerShadowBandWidth(axis, seriesDataIndices, ecModel);
		var otherSpan = otherExtent[1] - otherExtent[0];
		var _a = calcAxisPointerShadowEnds(pixelValue, thisExtent, bandWidth), min = _a[0], max = _a[1];
		return {
			type: "Rect",
			shape: makeRectShape([min, otherExtent[0]], [max - min, otherSpan], getAxisDimIndex(axis))
		};
	}
};
function getAxisDimIndex(axis) {
	return axis.dim === "x" ? 0 : 1;
}
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/AxisPointerModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var AxisPointerModel = function(_super) {
	__extends(AxisPointerModel, _super);
	function AxisPointerModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = AxisPointerModel.type;
		return _this;
	}
	AxisPointerModel.type = "axisPointer";
	AxisPointerModel.defaultOption = {
		show: "auto",
		z: 50,
		type: "line",
		snap: false,
		triggerTooltip: true,
		triggerEmphasis: true,
		value: null,
		status: null,
		link: [],
		animation: null,
		animationDurationUpdate: 200,
		lineStyle: {
			color: tokens.color.border,
			width: 1,
			type: "dashed"
		},
		shadowStyle: { color: tokens.color.shadowTint },
		label: {
			show: true,
			formatter: null,
			precision: "auto",
			margin: 3,
			color: tokens.color.neutral00,
			padding: [
				5,
				7,
				5,
				7
			],
			backgroundColor: tokens.color.accent60,
			borderColor: null,
			borderWidth: 0,
			borderRadius: 3
		},
		handle: {
			show: false,
			icon: "M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7v-1.2h6.6z M13.3,22H6.7v-1.2h6.6z M13.3,19.6H6.7v-1.2h6.6z",
			size: 45,
			margin: 50,
			color: tokens.color.accent40,
			throttle: 40
		}
	};
	return AxisPointerModel;
}(ComponentModel);
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/globalListener.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var inner$5 = makeInner();
var each$1 = each$2;
function register(key, api, handler) {
	if (env.node) return;
	var zr = api.getZr();
	inner$5(zr).records || (inner$5(zr).records = {});
	initGlobalListeners(zr, api);
	var record = inner$5(zr).records[key] || (inner$5(zr).records[key] = {});
	record.handler = handler;
}
function initGlobalListeners(zr, api) {
	if (inner$5(zr).initialized) return;
	inner$5(zr).initialized = true;
	useHandler("click", curry$1(doEnter, "click"));
	useHandler("mousemove", curry$1(doEnter, "mousemove"));
	useHandler("mousewheel", curry$1(doEnter, "mousewheel"));
	useHandler("globalout", onLeave);
	function useHandler(eventType, cb) {
		zr.on(eventType, function(e) {
			var dis = makeDispatchAction$1(api);
			each$1(inner$5(zr).records, function(record) {
				record && cb(record, e, dis.dispatchAction);
			});
			dispatchTooltipFinally(dis.pendings, api);
		});
	}
}
function dispatchTooltipFinally(pendings, api) {
	var showLen = pendings.showTip.length;
	var hideLen = pendings.hideTip.length;
	var actuallyPayload;
	if (showLen) actuallyPayload = pendings.showTip[showLen - 1];
	else if (hideLen) actuallyPayload = pendings.hideTip[hideLen - 1];
	if (actuallyPayload) {
		actuallyPayload.dispatchAction = null;
		api.dispatchAction(actuallyPayload);
	}
}
function onLeave(record, e, dispatchAction) {
	record.handler("leave", null, dispatchAction);
}
function doEnter(currTrigger, record, e, dispatchAction) {
	record.handler(currTrigger, e, dispatchAction);
}
function makeDispatchAction$1(api) {
	var pendings = {
		showTip: [],
		hideTip: []
	};
	var dispatchAction = function(payload) {
		var pendingList = pendings[payload.type];
		if (pendingList) pendingList.push(payload);
		else {
			payload.dispatchAction = dispatchAction;
			api.dispatchAction(payload);
		}
	};
	return {
		dispatchAction,
		pendings
	};
}
function unregister(key, api) {
	if (env.node) return;
	var zr = api.getZr();
	if ((inner$5(zr).records || {})[key]) inner$5(zr).records[key] = null;
}
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/AxisPointerView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var AxisPointerView = function(_super) {
	__extends(AxisPointerView, _super);
	function AxisPointerView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = AxisPointerView.type;
		return _this;
	}
	AxisPointerView.prototype.render = function(globalAxisPointerModel, ecModel, api) {
		var globalTooltipModel = ecModel.getComponent("tooltip");
		var triggerOn = globalAxisPointerModel.get("triggerOn") || globalTooltipModel && globalTooltipModel.get("triggerOn") || "mousemove|click|mousewheel";
		register("axisPointer", api, function(currTrigger, e, dispatchAction) {
			if (triggerOn !== "none" && (currTrigger === "leave" || triggerOn.indexOf(currTrigger) >= 0)) dispatchAction({
				type: "updateAxisPointer",
				currTrigger,
				x: e && e.offsetX,
				y: e && e.offsetY
			});
		});
	};
	AxisPointerView.prototype.remove = function(ecModel, api) {
		unregister("axisPointer", api);
	};
	AxisPointerView.prototype.dispose = function(ecModel, api) {
		unregister("axisPointer", api);
	};
	AxisPointerView.type = "axisPointer";
	return AxisPointerView;
}(ComponentView);
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/findPointFromSeries.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* @param finder contains {seriesIndex, dataIndex, dataIndexInside}
* @param ecModel
* @return  {point: [x, y], el: ...} point Will not be null.
*/
function findPointFromSeries(finder, ecModel) {
	var point = [];
	var seriesIndex = finder.seriesIndex;
	var seriesModel;
	if (seriesIndex == null || !(seriesModel = ecModel.getSeriesByIndex(seriesIndex))) return { point: [] };
	var data = seriesModel.getData();
	var dataIndex = queryDataIndex(data, finder);
	if (dataIndex == null || dataIndex < 0 || isArray(dataIndex)) return { point: [] };
	var el = data.getItemGraphicEl(dataIndex);
	var coordSys = seriesModel.coordinateSystem;
	if (seriesModel.getTooltipPosition) point = seriesModel.getTooltipPosition(dataIndex) || [];
	else if (coordSys && coordSys.dataToPoint) {
		if (finder.isStacked) {
			var baseAxis = coordSys.getBaseAxis();
			var valueAxisDim = coordSys.getOtherAxis(baseAxis).dim;
			var baseAxisDim = baseAxis.dim;
			var baseDataOffset = valueAxisDim === "x" || valueAxisDim === "radius" ? 1 : 0;
			var baseDim = data.mapDimension(baseAxisDim);
			var stackedData = [];
			stackedData[baseDataOffset] = data.get(baseDim, dataIndex);
			stackedData[1 - baseDataOffset] = data.get(data.getCalculationInfo("stackResultDimension"), dataIndex);
			point = coordSys.dataToPoint(stackedData) || [];
		} else point = coordSys.dataToPoint(data.getValues(map(coordSys.dimensions, function(dim) {
			return data.mapDimension(dim);
		}), dataIndex)) || [];
	} else if (el) {
		var rect = el.getBoundingRect().clone();
		rect.applyTransform(el.transform);
		point = [rect.x + rect.width / 2, rect.y + rect.height / 2];
	}
	return {
		point,
		el
	};
}
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/axisTrigger.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var inner$4 = makeInner();
/**
* Basic logic: check all axis, if they do not demand show/highlight,
* then hide/downplay them.
*
* @return content of event obj for echarts.connect.
*/
function axisTrigger(payload, ecModel, api) {
	var currTrigger = payload.currTrigger;
	var point = [payload.x, payload.y];
	var finder = payload;
	var dispatchAction = payload.dispatchAction || bind$1(api.dispatchAction, api);
	var coordSysAxesInfo = ecModel.getComponent("axisPointer").coordSysAxesInfo;
	if (!coordSysAxesInfo) return;
	if (illegalPoint(point)) point = findPointFromSeries({
		seriesIndex: finder.seriesIndex,
		dataIndex: finder.dataIndex
	}, ecModel).point;
	var isIllegalPoint = illegalPoint(point);
	var inputAxesInfo = finder.axesInfo;
	var axesInfo = coordSysAxesInfo.axesInfo;
	var shouldHide = currTrigger === "leave" || illegalPoint(point);
	var outputPayload = {};
	var showValueMap = {};
	var dataByCoordSys = {
		list: [],
		map: {}
	};
	var updaters = {
		showPointer: curry$1(showPointer, showValueMap),
		showTooltip: curry$1(showTooltip, dataByCoordSys)
	};
	each$2(coordSysAxesInfo.coordSysMap, function(coordSys, coordSysKey) {
		var coordSysContainsPoint = isIllegalPoint || coordSys.containPoint(point);
		each$2(coordSysAxesInfo.coordSysAxesInfo[coordSysKey], function(axisInfo, key) {
			var axis = axisInfo.axis;
			var inputAxisInfo = findInputAxisInfo(inputAxesInfo, axisInfo);
			if (!shouldHide && coordSysContainsPoint && (!inputAxesInfo || inputAxisInfo)) {
				var val = inputAxisInfo && inputAxisInfo.value;
				if (val == null && !isIllegalPoint) val = axis.pointToData(point);
				val != null && processOnAxis(axisInfo, val, updaters, false, outputPayload);
			}
		});
	});
	var linkTriggers = {};
	each$2(axesInfo, function(tarAxisInfo, tarKey) {
		var linkGroup = tarAxisInfo.linkGroup;
		if (linkGroup && !showValueMap[tarKey]) each$2(linkGroup.axesInfo, function(srcAxisInfo, srcKey) {
			var srcValItem = showValueMap[srcKey];
			if (srcAxisInfo !== tarAxisInfo && srcValItem) {
				var val = srcValItem.value;
				linkGroup.mapper && (val = tarAxisInfo.axis.scale.parse(linkGroup.mapper(val, makeMapperParam(srcAxisInfo), makeMapperParam(tarAxisInfo))));
				linkTriggers[tarAxisInfo.key] = val;
			}
		});
	});
	each$2(linkTriggers, function(val, tarKey) {
		processOnAxis(axesInfo[tarKey], val, updaters, true, outputPayload);
	});
	updateModelActually(showValueMap, axesInfo, outputPayload);
	dispatchTooltipActually(dataByCoordSys, point, payload, dispatchAction);
	dispatchHighDownActually(axesInfo, dispatchAction, api);
	return outputPayload;
}
function processOnAxis(axisInfo, newValue, updaters, noSnap, outputFinder) {
	var axis = axisInfo.axis;
	if (axis.scale.isBlank() || !axis.containData(newValue)) return;
	if (!axisInfo.involveSeries) {
		updaters.showPointer(axisInfo, newValue);
		return;
	}
	var payloadInfo = buildPayloadsBySeries(newValue, axisInfo);
	var payloadBatch = payloadInfo.payloadBatch;
	var snapToValue = payloadInfo.snapToValue;
	if (payloadBatch[0] && outputFinder.seriesIndex == null) extend(outputFinder, payloadBatch[0]);
	if (!noSnap && axisInfo.snap) {
		if (axis.containData(snapToValue) && snapToValue != null) newValue = snapToValue;
	}
	updaters.showPointer(axisInfo, newValue, payloadBatch);
	updaters.showTooltip(axisInfo, payloadInfo, snapToValue);
}
function buildPayloadsBySeries(value, axisInfo) {
	var axis = axisInfo.axis;
	var dim = axis.dim;
	var snapToValue = value;
	var payloadBatch = [];
	var minDist = Number.MAX_VALUE;
	var minDiff = -1;
	each$2(axisInfo.seriesModels, function(series, idx) {
		var dataDim = series.getData().mapDimensionsAll(dim);
		var seriesNestestValue;
		var dataIndices;
		if (series.getAxisTooltipData) {
			var result = series.getAxisTooltipData(dataDim, value, axis);
			dataIndices = result.dataIndices;
			seriesNestestValue = result.nestestValue;
		} else {
			dataIndices = series.indicesOfNearest(dim, dataDim[0], value, axis.type === "category" ? .5 : null);
			if (!dataIndices.length) return;
			seriesNestestValue = series.getData().get(dataDim[0], dataIndices[0]);
		}
		if (!isNullableNumberFinite(seriesNestestValue)) return;
		var diff = value - seriesNestestValue;
		var dist = Math.abs(diff);
		if (dist <= minDist) {
			if (dist < minDist || diff >= 0 && minDiff < 0) {
				minDist = dist;
				minDiff = diff;
				snapToValue = seriesNestestValue;
				payloadBatch.length = 0;
			}
			each$2(dataIndices, function(dataIndex) {
				payloadBatch.push({
					seriesIndex: series.seriesIndex,
					dataIndexInside: dataIndex,
					dataIndex: series.getData().getRawIndex(dataIndex)
				});
			});
		}
	});
	return {
		payloadBatch,
		snapToValue
	};
}
function showPointer(showValueMap, axisInfo, value, payloadBatch) {
	showValueMap[axisInfo.key] = {
		value,
		payloadBatch
	};
}
function showTooltip(dataByCoordSys, axisInfo, payloadInfo, value) {
	var payloadBatch = payloadInfo.payloadBatch;
	var axis = axisInfo.axis;
	var axisModel = axis.model;
	var axisPointerModel = axisInfo.axisPointerModel;
	if (!axisInfo.triggerTooltip || !payloadBatch.length) return;
	var coordSysModel = axisInfo.coordSys.model;
	var coordSysKey = makeKey(coordSysModel);
	var coordSysItem = dataByCoordSys.map[coordSysKey];
	if (!coordSysItem) {
		coordSysItem = dataByCoordSys.map[coordSysKey] = {
			coordSysId: coordSysModel.id,
			coordSysIndex: coordSysModel.componentIndex,
			coordSysType: coordSysModel.type,
			coordSysMainType: coordSysModel.mainType,
			dataByAxis: []
		};
		dataByCoordSys.list.push(coordSysItem);
	}
	coordSysItem.dataByAxis.push({
		axisDim: axis.dim,
		axisIndex: axisModel.componentIndex,
		axisType: axisModel.type,
		axisId: axisModel.id,
		value,
		valueLabelOpt: {
			precision: axisPointerModel.get(["label", "precision"]),
			formatter: axisPointerModel.get(["label", "formatter"])
		},
		seriesDataIndices: payloadBatch.slice()
	});
}
function updateModelActually(showValueMap, axesInfo, outputPayload) {
	var outputAxesInfo = outputPayload.axesInfo = [];
	each$2(axesInfo, function(axisInfo, key) {
		var option = axisInfo.axisPointerModel.option;
		var valItem = showValueMap[key];
		if (valItem) {
			!axisInfo.useHandle && (option.status = "show");
			option.value = valItem.value;
			option.seriesDataIndices = (valItem.payloadBatch || []).slice();
		} else !axisInfo.useHandle && (option.status = "hide");
		option.status === "show" && outputAxesInfo.push({
			axisDim: axisInfo.axis.dim,
			axisIndex: axisInfo.axis.model.componentIndex,
			value: option.value
		});
	});
}
function dispatchTooltipActually(dataByCoordSys, point, payload, dispatchAction) {
	if (illegalPoint(point) || !dataByCoordSys.list.length) {
		dispatchAction({ type: "hideTip" });
		return;
	}
	var sampleItem = ((dataByCoordSys.list[0].dataByAxis[0] || {}).seriesDataIndices || [])[0] || {};
	dispatchAction({
		type: "showTip",
		escapeConnect: true,
		x: point[0],
		y: point[1],
		tooltipOption: payload.tooltipOption,
		position: payload.position,
		dataIndexInside: sampleItem.dataIndexInside,
		dataIndex: sampleItem.dataIndex,
		seriesIndex: sampleItem.seriesIndex,
		dataByCoordSys: dataByCoordSys.list
	});
}
function dispatchHighDownActually(axesInfo, dispatchAction, api) {
	var zr = api.getZr();
	var highDownKey = "axisPointerLastHighlights";
	var lastHighlights = inner$4(zr)[highDownKey] || {};
	var newHighlights = inner$4(zr)[highDownKey] = {};
	each$2(axesInfo, function(axisInfo, key) {
		var option = axisInfo.axisPointerModel.option;
		option.status === "show" && axisInfo.triggerEmphasis && each$2(option.seriesDataIndices, function(batchItem) {
			newHighlights[batchItem.seriesIndex + "|" + batchItem.dataIndex] = batchItem;
		});
	});
	var toHighlight = [];
	var toDownplay = [];
	function makeHighDownItem(batchItem) {
		return {
			seriesIndex: batchItem.seriesIndex,
			dataIndex: batchItem.dataIndex
		};
	}
	each$2(lastHighlights, function(batchItem, key) {
		!newHighlights[key] && toDownplay.push(makeHighDownItem(batchItem));
	});
	each$2(newHighlights, function(batchItem, key) {
		!lastHighlights[key] && toHighlight.push(makeHighDownItem(batchItem));
	});
	toDownplay.length && api.dispatchAction({
		type: "downplay",
		escapeConnect: true,
		notBlur: true,
		batch: toDownplay
	});
	toHighlight.length && api.dispatchAction({
		type: "highlight",
		escapeConnect: true,
		notBlur: true,
		batch: toHighlight
	});
}
function findInputAxisInfo(inputAxesInfo, axisInfo) {
	for (var i = 0; i < (inputAxesInfo || []).length; i++) {
		var inputAxisInfo = inputAxesInfo[i];
		if (axisInfo.axis.dim === inputAxisInfo.axisDim && axisInfo.axis.model.componentIndex === inputAxisInfo.axisIndex) return inputAxisInfo;
	}
}
function makeMapperParam(axisInfo) {
	var axisModel = axisInfo.axis.model;
	var item = {};
	var dim = item.axisDim = axisInfo.axis.dim;
	item.axisIndex = item[dim + "AxisIndex"] = axisModel.componentIndex;
	item.axisName = item[dim + "AxisName"] = axisModel.name;
	item.axisId = item[dim + "AxisId"] = axisModel.id;
	return item;
}
function illegalPoint(point) {
	return !point || point[0] == null || isNaN(point[0]) || point[1] == null || isNaN(point[1]);
}
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$8(registers) {
	AxisView.registerAxisPointerClass("CartesianAxisPointer", CartesianAxisPointer);
	registers.registerComponentModel(AxisPointerModel);
	registers.registerComponentView(AxisPointerView);
	registers.registerPreprocessor(function(option) {
		if (option) {
			(!option.axisPointer || option.axisPointer.length === 0) && (option.axisPointer = {});
			var link = option.axisPointer.link;
			if (link && !isArray(link)) option.axisPointer.link = [link];
		}
	});
	registers.registerProcessor(registers.PRIORITY.PROCESSOR.STATISTIC, { overallReset: function(ecModel, api) {
		ecModel.getComponent("axisPointer").coordSysAxesInfo = collect(ecModel, api);
	} });
	registers.registerAction({
		type: "updateAxisPointer",
		event: "updateAxisPointer",
		update: ":updateAxisPointer"
	}, axisTrigger);
}
//#endregion
//#region node_modules/echarts/lib/component/grid/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$1(registers) {
	use(install$9);
	use(install$8);
}
//#endregion
//#region node_modules/echarts/lib/component/graphic/GraphicModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function setKeyInfoToNewElOption(resultItem, newElOption) {
	var existElOption = resultItem.existing;
	newElOption.id = resultItem.keyInfo.id;
	!newElOption.type && existElOption && (newElOption.type = existElOption.type);
	if (newElOption.parentId == null) {
		var newElParentOption = newElOption.parentOption;
		if (newElParentOption) newElOption.parentId = newElParentOption.id;
		else if (existElOption) newElOption.parentId = existElOption.parentId;
	}
	newElOption.parentOption = null;
}
function isSetLoc(obj, props) {
	var isSet;
	each$2(props, function(prop) {
		obj[prop] != null && obj[prop] !== "auto" && (isSet = true);
	});
	return isSet;
}
function mergeNewElOptionToExist(existList, index, newElOption) {
	var newElOptCopy = extend({}, newElOption);
	var existElOption = existList[index];
	var $action = newElOption.$action || "merge";
	if ($action === "merge") {
		if (existElOption) {
			merge(existElOption, newElOptCopy, true);
			mergeLayoutParam(existElOption, newElOptCopy, { ignoreSize: true });
			copyLayoutParams(newElOption, existElOption);
			copyTransitionInfo(newElOption, existElOption);
			copyTransitionInfo(newElOption, existElOption, "shape");
			copyTransitionInfo(newElOption, existElOption, "style");
			copyTransitionInfo(newElOption, existElOption, "extra");
			newElOption.clipPath = existElOption.clipPath;
		} else existList[index] = newElOptCopy;
	} else if ($action === "replace") existList[index] = newElOptCopy;
	else if ($action === "remove") existElOption && (existList[index] = null);
}
var TRANSITION_PROPS_TO_COPY = [
	"transition",
	"enterFrom",
	"leaveTo"
];
var ROOT_TRANSITION_PROPS_TO_COPY = TRANSITION_PROPS_TO_COPY.concat([
	"enterAnimation",
	"updateAnimation",
	"leaveAnimation"
]);
function copyTransitionInfo(target, source, targetProp) {
	if (targetProp) {
		if (!target[targetProp] && source[targetProp]) target[targetProp] = {};
		target = target[targetProp];
		source = source[targetProp];
	}
	if (!target || !source) return;
	var props = targetProp ? TRANSITION_PROPS_TO_COPY : ROOT_TRANSITION_PROPS_TO_COPY;
	for (var i = 0; i < props.length; i++) {
		var prop = props[i];
		if (target[prop] == null && source[prop] != null) target[prop] = source[prop];
	}
}
function setLayoutInfoToExist(existItem, newElOption) {
	if (!existItem) return;
	existItem.hv = newElOption.hv = [isSetLoc(newElOption, ["left", "right"]), isSetLoc(newElOption, ["top", "bottom"])];
	if (existItem.type === "group") {
		var existingGroupOpt = existItem;
		var newGroupOpt = newElOption;
		existingGroupOpt.width ?? (existingGroupOpt.width = newGroupOpt.width = 0);
		existingGroupOpt.height ?? (existingGroupOpt.height = newGroupOpt.height = 0);
	}
}
var GraphicComponentModel = function(_super) {
	__extends(GraphicComponentModel, _super);
	function GraphicComponentModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = GraphicComponentModel.type;
		_this.preventAutoZ = true;
		return _this;
	}
	GraphicComponentModel.prototype.mergeOption = function(option, ecModel) {
		var elements = this.option.elements;
		this.option.elements = null;
		_super.prototype.mergeOption.call(this, option, ecModel);
		this.option.elements = elements;
	};
	GraphicComponentModel.prototype.optionUpdated = function(newOption, isInit) {
		var thisOption = this.option;
		var newList = (isInit ? thisOption : newOption).elements;
		var existList = thisOption.elements = isInit ? [] : thisOption.elements;
		var flattenedList = [];
		this._flatten(newList, flattenedList, null);
		var mappingResult = mappingToExists(existList, flattenedList, "normalMerge");
		var elOptionsToUpdate = this._elOptionsToUpdate = [];
		each$2(mappingResult, function(resultItem, index) {
			var newElOption = resultItem.newOption;
			if (!newElOption) return;
			elOptionsToUpdate.push(newElOption);
			setKeyInfoToNewElOption(resultItem, newElOption);
			mergeNewElOptionToExist(existList, index, newElOption);
			setLayoutInfoToExist(existList[index], newElOption);
		}, this);
		thisOption.elements = filter(existList, function(item) {
			item && delete item.$action;
			return item != null;
		});
	};
	/**
	* Convert
	* [{
	*  type: 'group',
	*  id: 'xx',
	*  children: [{type: 'circle'}, {type: 'polygon'}]
	* }]
	* to
	* [
	*  {type: 'group', id: 'xx'},
	*  {type: 'circle', parentId: 'xx'},
	*  {type: 'polygon', parentId: 'xx'}
	* ]
	*/
	GraphicComponentModel.prototype._flatten = function(optionList, result, parentOption) {
		each$2(optionList, function(option) {
			if (!option) return;
			if (parentOption) option.parentOption = parentOption;
			result.push(option);
			var children = option.children;
			if (children && children.length) this._flatten(children, result, option);
			delete option.children;
		}, this);
	};
	GraphicComponentModel.prototype.useElOptionsToUpdate = function() {
		var els = this._elOptionsToUpdate;
		this._elOptionsToUpdate = null;
		return els;
	};
	GraphicComponentModel.type = "graphic";
	GraphicComponentModel.defaultOption = { elements: [] };
	return GraphicComponentModel;
}(ComponentModel);
//#endregion
//#region node_modules/echarts/lib/component/graphic/GraphicView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var nonShapeGraphicElements = {
	path: null,
	compoundPath: null,
	group: Group$2,
	image: ZRImage,
	text: ZRText
};
var inner$3 = makeInner();
var GraphicComponentView = function(_super) {
	__extends(GraphicComponentView, _super);
	function GraphicComponentView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = GraphicComponentView.type;
		return _this;
	}
	GraphicComponentView.prototype.init = function() {
		this._elMap = createHashMap();
	};
	GraphicComponentView.prototype.render = function(graphicModel, ecModel, api) {
		if (graphicModel !== this._lastGraphicModel) this._clear();
		this._lastGraphicModel = graphicModel;
		this._updateElements(graphicModel);
		this._relocate(graphicModel, api);
	};
	/**
	* Update graphic elements.
	*/
	GraphicComponentView.prototype._updateElements = function(graphicModel) {
		var elOptionsToUpdate = graphicModel.useElOptionsToUpdate();
		if (!elOptionsToUpdate) return;
		var elMap = this._elMap;
		var rootGroup = this.group;
		var globalZ = graphicModel.get("z");
		var globalZLevel = graphicModel.get("zlevel");
		each$2(elOptionsToUpdate, function(elOption) {
			var id = convertOptionIdName(elOption.id, null);
			var elExisting = id != null ? elMap.get(id) : null;
			var parentId = convertOptionIdName(elOption.parentId, null);
			var targetElParent = parentId != null ? elMap.get(parentId) : rootGroup;
			var elType = elOption.type;
			var elOptionStyle = elOption.style;
			if (elType === "text" && elOptionStyle) {
				if (elOption.hv && elOption.hv[1]) elOptionStyle.textVerticalAlign = elOptionStyle.textBaseline = elOptionStyle.verticalAlign = elOptionStyle.align = null;
			}
			var textContentOption = elOption.textContent;
			var textConfig = elOption.textConfig;
			if (elOptionStyle && isEC4CompatibleStyle(elOptionStyle, elType, !!textConfig, !!textContentOption)) {
				var convertResult = convertFromEC4CompatibleStyle(elOptionStyle, elType, true);
				if (!textConfig && convertResult.textConfig) textConfig = elOption.textConfig = convertResult.textConfig;
				if (!textContentOption && convertResult.textContent) textContentOption = convertResult.textContent;
			}
			var elOptionCleaned = getCleanedElOption(elOption);
			var $action = elOption.$action || "merge";
			var isMerge = $action === "merge";
			var isReplace = $action === "replace";
			if (isMerge) {
				var isInit = !elExisting;
				var el_1 = elExisting;
				if (isInit) el_1 = createEl(id, targetElParent, elOption.type, elMap);
				else {
					el_1 && (inner$3(el_1).isNew = false);
					stopPreviousKeyframeAnimationAndRestore(el_1);
				}
				if (el_1) {
					applyUpdateTransition(el_1, elOptionCleaned, graphicModel, { isInit });
					updateCommonAttrs(el_1, elOption, globalZ, globalZLevel);
				}
			} else if (isReplace) {
				removeEl(elExisting, elOption, elMap, graphicModel);
				var el_2 = createEl(id, targetElParent, elOption.type, elMap);
				if (el_2) {
					applyUpdateTransition(el_2, elOptionCleaned, graphicModel, { isInit: true });
					updateCommonAttrs(el_2, elOption, globalZ, globalZLevel);
				}
			} else if ($action === "remove") {
				updateLeaveTo(elExisting, elOption);
				removeEl(elExisting, elOption, elMap, graphicModel);
			}
			var el = elMap.get(id);
			if (el && textContentOption) {
				if (isMerge) {
					var textContentExisting = el.getTextContent();
					textContentExisting ? textContentExisting.attr(textContentOption) : el.setTextContent(new ZRText(textContentOption));
				} else if (isReplace) el.setTextContent(new ZRText(textContentOption));
			}
			if (el) {
				var clipPathOption = elOption.clipPath;
				if (clipPathOption) {
					var clipPathType = clipPathOption.type;
					var clipPath = void 0;
					var isInit = false;
					if (isMerge) {
						var oldClipPath = el.getClipPath();
						isInit = !oldClipPath || inner$3(oldClipPath).type !== clipPathType;
						clipPath = isInit ? newEl(clipPathType) : oldClipPath;
					} else if (isReplace) {
						isInit = true;
						clipPath = newEl(clipPathType);
					}
					el.setClipPath(clipPath);
					applyUpdateTransition(clipPath, clipPathOption, graphicModel, { isInit });
					applyKeyframeAnimation(clipPath, clipPathOption.keyframeAnimation, graphicModel);
				}
				var elInner = inner$3(el);
				el.setTextConfig(textConfig);
				elInner.option = elOption;
				setEventData(el, graphicModel, elOption);
				setTooltipConfig({
					el,
					componentModel: graphicModel,
					itemName: el.name,
					itemTooltipOption: elOption.tooltip
				});
				applyKeyframeAnimation(el, elOption.keyframeAnimation, graphicModel);
			}
		});
	};
	/**
	* Locate graphic elements.
	*/
	GraphicComponentView.prototype._relocate = function(graphicModel, api) {
		var elOptions = graphicModel.option.elements;
		var rootGroup = this.group;
		var elMap = this._elMap;
		var apiWidth = api.getWidth();
		var apiHeight = api.getHeight();
		var xy = ["x", "y"];
		for (var i = 0; i < elOptions.length; i++) {
			var elOption = elOptions[i];
			var id = convertOptionIdName(elOption.id, null);
			var el = id != null ? elMap.get(id) : null;
			if (!el || !el.isGroup) continue;
			var parentEl = el.parent;
			var isParentRoot = parentEl === rootGroup;
			var elInner = inner$3(el);
			var parentElInner = inner$3(parentEl);
			elInner.width = parsePercent(elInner.option.width, isParentRoot ? apiWidth : parentElInner.width) || 0;
			elInner.height = parsePercent(elInner.option.height, isParentRoot ? apiHeight : parentElInner.height) || 0;
		}
		for (var i = elOptions.length - 1; i >= 0; i--) {
			var elOption = elOptions[i];
			var id = convertOptionIdName(elOption.id, null);
			var el = id != null ? elMap.get(id) : null;
			if (!el) continue;
			var parentEl = el.parent;
			var parentElInner = inner$3(parentEl);
			var containerInfo = parentEl === rootGroup ? {
				width: apiWidth,
				height: apiHeight
			} : {
				width: parentElInner.width,
				height: parentElInner.height
			};
			var layoutPos = {};
			var layouted = positionElement(el, elOption, containerInfo, null, {
				hv: elOption.hv,
				boundingMode: elOption.bounding
			}, layoutPos);
			if (!inner$3(el).isNew && layouted) {
				var transition = elOption.transition;
				var animatePos = {};
				for (var k = 0; k < xy.length; k++) {
					var key = xy[k];
					var val = layoutPos[key];
					if (transition && (isTransitionAll(transition) || indexOf(transition, key) >= 0)) animatePos[key] = val;
					else el[key] = val;
				}
				updateProps$1(el, animatePos, graphicModel, 0);
			} else el.attr(layoutPos);
		}
	};
	/**
	* Clear all elements.
	*/
	GraphicComponentView.prototype._clear = function() {
		var _this = this;
		var elMap = this._elMap;
		elMap.each(function(el) {
			removeEl(el, inner$3(el).option, elMap, _this._lastGraphicModel);
		});
		this._elMap = createHashMap();
	};
	GraphicComponentView.prototype.dispose = function() {
		this._clear();
	};
	GraphicComponentView.type = "graphic";
	return GraphicComponentView;
}(ComponentView);
function newEl(graphicType) {
	var el = new (hasOwn(nonShapeGraphicElements, graphicType) ? nonShapeGraphicElements[graphicType] : getShapeClass(graphicType))({});
	inner$3(el).type = graphicType;
	return el;
}
function createEl(id, targetElParent, graphicType, elMap) {
	var el = newEl(graphicType);
	targetElParent.add(el);
	elMap.set(id, el);
	inner$3(el).id = id;
	inner$3(el).isNew = true;
	return el;
}
function removeEl(elExisting, elOption, elMap, graphicModel) {
	if (elExisting && elExisting.parent) {
		elExisting.type === "group" && elExisting.traverse(function(el) {
			removeEl(el, elOption, elMap, graphicModel);
		});
		applyLeaveTransition(elExisting, elOption, graphicModel);
		elMap.removeKey(inner$3(elExisting).id);
	}
}
function updateCommonAttrs(el, elOption, defaultZ, defaultZlevel) {
	if (!el.isGroup) each$2([
		["cursor", Displayable.prototype.cursor],
		["zlevel", defaultZlevel || 0],
		["z", defaultZ || 0],
		["z2", 0]
	], function(item) {
		var prop = item[0];
		if (hasOwn(elOption, prop)) el[prop] = retrieve2(elOption[prop], item[1]);
		else if (el[prop] == null) el[prop] = item[1];
	});
	each$2(keys(elOption), function(key) {
		if (key.indexOf("on") === 0) {
			var val = elOption[key];
			el[key] = isFunction(val) ? val : null;
		}
	});
	if (hasOwn(elOption, "draggable")) el.draggable = elOption.draggable;
	elOption.name != null && (el.name = elOption.name);
	elOption.id != null && (el.id = elOption.id);
}
function getCleanedElOption(elOption) {
	elOption = extend({}, elOption);
	each$2([
		"id",
		"parentId",
		"$action",
		"hv",
		"bounding",
		"textContent",
		"clipPath"
	].concat(LOCATION_PARAMS), function(name) {
		delete elOption[name];
	});
	return elOption;
}
function setEventData(el, graphicModel, elOption) {
	var eventData = getECData(el).eventData;
	if (!el.silent && !el.ignore && !eventData) eventData = getECData(el).eventData = {
		componentType: "graphic",
		componentIndex: graphicModel.componentIndex,
		name: el.name
	};
	if (eventData) eventData.info = elOption.info;
}
//#endregion
//#region node_modules/echarts/lib/component/graphic/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install(registers) {
	registers.registerComponentModel(GraphicComponentModel);
	registers.registerComponentView(GraphicComponentView);
	registers.registerPreprocessor(function(option) {
		var graphicOption = option.graphic;
		if (isArray(graphicOption)) {
			if (!graphicOption[0] || !graphicOption[0].elements) option.graphic = [{ elements: graphicOption }];
			else option.graphic = [option.graphic[0]];
		} else if (graphicOption && !graphicOption.elements) option.graphic = [{ elements: [graphicOption] }];
	});
}
//#endregion
//#region node_modules/echarts/lib/component/helper/listComponent.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function makeBackground(rect, componentModel) {
	var padding = normalizeCssArray(componentModel.get("padding"));
	var style = componentModel.getItemStyle(["color", "opacity"]);
	style.fill = componentModel.get("backgroundColor");
	return new Rect({
		shape: {
			x: rect.x - padding[3],
			y: rect.y - padding[0],
			width: rect.width + padding[1] + padding[3],
			height: rect.height + padding[0] + padding[2],
			r: componentModel.get("borderRadius")
		},
		style,
		silent: true,
		z2: -1
	});
}
//#endregion
//#region node_modules/echarts/lib/component/tooltip/TooltipModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var TooltipModel = function(_super) {
	__extends(TooltipModel, _super);
	function TooltipModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = TooltipModel.type;
		return _this;
	}
	TooltipModel.type = "tooltip";
	TooltipModel.dependencies = ["axisPointer"];
	TooltipModel.defaultOption = {
		z: 60,
		show: true,
		showContent: true,
		trigger: "item",
		triggerOn: "mousemove|click|mousewheel",
		alwaysShowContent: false,
		renderMode: "auto",
		confine: null,
		showDelay: 0,
		hideDelay: 100,
		transitionDuration: .4,
		displayTransition: true,
		enterable: false,
		backgroundColor: tokens.color.neutral00,
		shadowBlur: 10,
		shadowColor: "rgba(0, 0, 0, .2)",
		shadowOffsetX: 1,
		shadowOffsetY: 2,
		borderRadius: 4,
		borderWidth: 1,
		defaultBorderColor: tokens.color.border,
		padding: null,
		extraCssText: "",
		axisPointer: {
			type: "line",
			axis: "auto",
			animation: "auto",
			animationDurationUpdate: 200,
			animationEasingUpdate: "exponentialOut",
			crossStyle: {
				color: tokens.color.borderShade,
				width: 1,
				type: "dashed",
				textStyle: {}
			}
		},
		textStyle: {
			color: tokens.color.tertiary,
			fontSize: 14
		}
	};
	return TooltipModel;
}(ComponentModel);
//#endregion
//#region node_modules/echarts/lib/component/tooltip/helper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function shouldTooltipConfine(tooltipModel) {
	var confineOption = tooltipModel.get("confine");
	return confineOption != null ? !!confineOption : tooltipModel.get("renderMode") === "richText";
}
function testStyle(styleProps) {
	if (!env.domSupported) return;
	var style = document.documentElement.style;
	for (var i = 0, len = styleProps.length; i < len; i++) if (styleProps[i] in style) return styleProps[i];
}
var TRANSFORM_VENDOR = testStyle([
	"transform",
	"webkitTransform",
	"OTransform",
	"MozTransform",
	"msTransform"
]);
var TRANSITION_VENDOR = testStyle([
	"webkitTransition",
	"transition",
	"OTransition",
	"MozTransition",
	"msTransition"
]);
function toCSSVendorPrefix(styleVendor, styleProp) {
	if (!styleVendor) return styleProp;
	styleProp = toCamelCase(styleProp, true);
	var idx = styleVendor.indexOf(styleProp);
	styleVendor = idx === -1 ? styleProp : "-" + styleVendor.slice(0, idx) + "-" + styleProp;
	return styleVendor.toLowerCase();
}
function getComputedStyle(el, style) {
	var stl = el.currentStyle || document.defaultView && document.defaultView.getComputedStyle(el);
	return stl ? style ? stl[style] : stl : null;
}
//#endregion
//#region node_modules/echarts/lib/component/tooltip/TooltipHTMLContent.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var CSS_TRANSITION_VENDOR = toCSSVendorPrefix(TRANSITION_VENDOR, "transition");
var CSS_TRANSFORM_VENDOR = toCSSVendorPrefix(TRANSFORM_VENDOR, "transform");
var gCssText = "position:absolute;display:block;border-style:solid;white-space:nowrap;z-index:9999999;" + (env.transform3dSupported ? "will-change:transform;" : "");
function mirrorPos(pos) {
	pos = pos === "left" ? "right" : pos === "right" ? "left" : pos === "top" ? "bottom" : "top";
	return pos;
}
function assembleArrow(tooltipModel, borderColor, arrowPosition) {
	if (!isString(arrowPosition) || arrowPosition === "inside") return "";
	var backgroundColor = tooltipModel.get("backgroundColor");
	var borderWidth = tooltipModel.get("borderWidth");
	borderColor = convertToColorString(borderColor);
	var arrowPos = mirrorPos(arrowPosition);
	var arrowSize = Math.max(Math.round(borderWidth) * 1.5, 6);
	var positionStyle = "";
	var transformStyle = CSS_TRANSFORM_VENDOR + ":";
	var rotateDeg;
	if (indexOf(["left", "right"], arrowPos) > -1) {
		positionStyle += "top:50%";
		transformStyle += "translateY(-50%) rotate(" + (rotateDeg = arrowPos === "left" ? -225 : -45) + "deg)";
	} else {
		positionStyle += "left:50%";
		transformStyle += "translateX(-50%) rotate(" + (rotateDeg = arrowPos === "top" ? 225 : 45) + "deg)";
	}
	var rotateRadian = rotateDeg * Math.PI / 180;
	var arrowWH = arrowSize + borderWidth;
	var rotatedWH = arrowWH * Math.abs(Math.cos(rotateRadian)) + arrowWH * Math.abs(Math.sin(rotateRadian));
	var arrowOffset = Math.round(((rotatedWH - Math.SQRT2 * borderWidth) / 2 + Math.SQRT2 * borderWidth - (rotatedWH - arrowWH) / 2) * 100) / 100;
	positionStyle += ";" + arrowPos + ":-" + arrowOffset + "px";
	var borderStyle = borderColor + " solid " + borderWidth + "px;";
	return "<div style=\"" + [
		"position:absolute;width:" + arrowSize + "px;height:" + arrowSize + "px;z-index:-1;",
		positionStyle + ";" + transformStyle + ";",
		"border-bottom:" + borderStyle,
		"border-right:" + borderStyle,
		"background-color:" + backgroundColor + ";"
	].join("") + "\"></div>";
}
function assembleTransition(duration, onlyFadeTransition, enableDisplayTransition) {
	var transitionCurve = "cubic-bezier(0.23,1,0.32,1)";
	var transitionOption = "";
	var transitionText = "";
	if (enableDisplayTransition) {
		transitionOption = " " + duration / 2 + "s " + transitionCurve;
		transitionText = "opacity" + transitionOption + ",visibility" + transitionOption;
	}
	if (!onlyFadeTransition) {
		transitionOption = " " + duration + "s " + transitionCurve;
		transitionText += (transitionText.length ? "," : "") + (env.transformSupported ? "" + CSS_TRANSFORM_VENDOR + transitionOption : ",left" + transitionOption + ",top" + transitionOption);
	}
	return CSS_TRANSITION_VENDOR + ":" + transitionText;
}
function assembleTransform(x, y, toString) {
	var x0 = x.toFixed(0) + "px";
	var y0 = y.toFixed(0) + "px";
	if (!env.transformSupported) return toString ? "top:" + y0 + ";left:" + x0 + ";" : [["top", y0], ["left", x0]];
	var is3d = env.transform3dSupported;
	var translate = "translate" + (is3d ? "3d" : "") + "(" + x0 + "," + y0 + (is3d ? ",0" : "") + ")";
	return toString ? "top:0;left:0;" + CSS_TRANSFORM_VENDOR + ":" + translate + ";" : [
		["top", 0],
		["left", 0],
		[TRANSFORM_VENDOR, translate]
	];
}
/**
* @param {Object} textStyle
* @return {string}
* @inner
*/
function assembleFont(textStyleModel) {
	var cssText = [];
	var fontSize = textStyleModel.get("fontSize");
	var color = textStyleModel.getTextColor();
	color && cssText.push("color:" + color);
	cssText.push("font:" + textStyleModel.getFont());
	var lineHeight = retrieve2(textStyleModel.get("lineHeight"), Math.round(fontSize * 3 / 2));
	fontSize && cssText.push("line-height:" + lineHeight + "px");
	var shadowColor = textStyleModel.get("textShadowColor");
	var shadowBlur = textStyleModel.get("textShadowBlur") || 0;
	var shadowOffsetX = textStyleModel.get("textShadowOffsetX") || 0;
	var shadowOffsetY = textStyleModel.get("textShadowOffsetY") || 0;
	shadowColor && shadowBlur && cssText.push("text-shadow:" + shadowOffsetX + "px " + shadowOffsetY + "px " + shadowBlur + "px " + shadowColor);
	each$2(["decoration", "align"], function(name) {
		var val = textStyleModel.get(name);
		val && cssText.push("text-" + name + ":" + val);
	});
	return cssText.join(";");
}
function assembleCssText(tooltipModel, enableTransition, onlyFadeTransition, enableDisplayTransition) {
	var cssText = [];
	var transitionDuration = tooltipModel.get("transitionDuration");
	var backgroundColor = tooltipModel.get("backgroundColor");
	var shadowBlur = tooltipModel.get("shadowBlur");
	var shadowColor = tooltipModel.get("shadowColor");
	var shadowOffsetX = tooltipModel.get("shadowOffsetX");
	var shadowOffsetY = tooltipModel.get("shadowOffsetY");
	var textStyleModel = tooltipModel.getModel("textStyle");
	var padding = getPaddingFromTooltipModel(tooltipModel, "html");
	var boxShadow = shadowOffsetX + "px " + shadowOffsetY + "px " + shadowBlur + "px " + shadowColor;
	cssText.push("box-shadow:" + boxShadow);
	enableTransition && transitionDuration > 0 && cssText.push(assembleTransition(transitionDuration, onlyFadeTransition, enableDisplayTransition));
	if (backgroundColor) cssText.push("background-color:" + backgroundColor);
	each$2([
		"width",
		"color",
		"radius"
	], function(name) {
		var borderName = "border-" + name;
		var camelCase = toCamelCase(borderName);
		var val = tooltipModel.get(camelCase);
		val != null && cssText.push(borderName + ":" + val + (name === "color" ? "" : "px"));
	});
	cssText.push(assembleFont(textStyleModel));
	if (padding != null) cssText.push("padding:" + normalizeCssArray(padding).join("px ") + "px");
	return cssText.join(";") + ";";
}
function makeStyleCoord$1(out, zr, container, zrX, zrY) {
	var zrPainter = zr && zr.painter;
	if (container) {
		var zrViewportRoot = zrPainter && zrPainter.getViewportRoot();
		if (zrViewportRoot) transformLocalCoord(out, zrViewportRoot, container, zrX, zrY);
	} else {
		out[0] = zrX;
		out[1] = zrY;
		var viewportRootOffset = zrPainter && zrPainter.getViewportRootOffset();
		if (viewportRootOffset) {
			out[0] += viewportRootOffset.offsetLeft;
			out[1] += viewportRootOffset.offsetTop;
		}
	}
	out[2] = out[0] / zr.getWidth();
	out[3] = out[1] / zr.getHeight();
}
var TooltipHTMLContent = function() {
	function TooltipHTMLContent(api, opt) {
		this._show = false;
		this._styleCoord = [
			0,
			0,
			0,
			0
		];
		this._enterable = true;
		this._alwaysShowContent = false;
		this._firstShow = true;
		this._longHide = true;
		if (env.wxa) return null;
		var el = document.createElement("div");
		el.domBelongToZr = true;
		this.el = el;
		var zr = this._zr = api.getZr();
		var appendTo = opt.appendTo;
		var container = appendTo && (isString(appendTo) ? document.querySelector(appendTo) : isDom(appendTo) ? appendTo : isFunction(appendTo) && appendTo(api.getDom()));
		makeStyleCoord$1(this._styleCoord, zr, container, api.getWidth() / 2, api.getHeight() / 2);
		(container || api.getDom()).appendChild(el);
		this._api = api;
		this._container = container;
		var self = this;
		el.onmouseenter = function() {
			if (self._enterable) {
				clearTimeout(self._hideTimeout);
				self._show = true;
			}
			self._inContent = true;
		};
		el.onmousemove = function(e) {
			e = e || window.event;
			if (!self._enterable) {
				var handler = zr.handler;
				var zrViewportRoot = zr.painter.getViewportRoot();
				normalizeEvent(zrViewportRoot, e, true);
				handler.dispatch("mousemove", e);
			}
		};
		el.onmouseleave = function() {
			self._inContent = false;
			if (self._enterable) {
				if (self._show) self.hideLater(self._hideDelay);
			}
		};
	}
	/**
	* Update when tooltip is rendered
	*/
	TooltipHTMLContent.prototype.update = function(tooltipModel) {
		if (!this._container) {
			var container = this._api.getDom();
			var position = getComputedStyle(container, "position");
			var domStyle = container.style;
			if (domStyle.position !== "absolute" && position !== "absolute") domStyle.position = "relative";
		}
		var alwaysShowContent = tooltipModel.get("alwaysShowContent");
		alwaysShowContent && this._moveIfResized();
		this._alwaysShowContent = alwaysShowContent;
		this._enableDisplayTransition = tooltipModel.get("displayTransition") && tooltipModel.get("transitionDuration") > 0;
		this.el.className = tooltipModel.get("className") || "";
	};
	TooltipHTMLContent.prototype.show = function(tooltipModel, nearPointColor) {
		clearTimeout(this._hideTimeout);
		clearTimeout(this._longHideTimeout);
		var el = this.el;
		var style = el.style;
		var styleCoord = this._styleCoord;
		if (!el.innerHTML) style.display = "none";
		else style.cssText = gCssText + assembleCssText(tooltipModel, !this._firstShow, this._longHide, this._enableDisplayTransition) + assembleTransform(styleCoord[0], styleCoord[1], true) + ("border-color:" + convertToColorString(nearPointColor) + ";") + (tooltipModel.get("extraCssText") || "") + (";pointer-events:" + (this._enterable ? "auto" : "none"));
		this._show = true;
		this._firstShow = false;
		this._longHide = false;
	};
	TooltipHTMLContent.prototype.setContent = function(content, markers, tooltipModel, borderColor, arrowPosition) {
		var el = this.el;
		if (content == null) {
			el.innerHTML = "";
			return;
		}
		var arrow = "";
		if (isString(arrowPosition) && tooltipModel.get("trigger") === "item" && !shouldTooltipConfine(tooltipModel)) arrow = assembleArrow(tooltipModel, borderColor, arrowPosition);
		if (isString(content)) el.innerHTML = content + arrow;
		else if (content) {
			el.innerHTML = "";
			if (!isArray(content)) content = [content];
			for (var i = 0; i < content.length; i++) if (isDom(content[i]) && content[i].parentNode !== el) el.appendChild(content[i]);
			if (arrow && el.childNodes.length) {
				var arrowEl = document.createElement("div");
				arrowEl.innerHTML = arrow;
				el.appendChild(arrowEl);
			}
		}
	};
	TooltipHTMLContent.prototype.setEnterable = function(enterable) {
		this._enterable = enterable;
	};
	TooltipHTMLContent.prototype.getSize = function() {
		var el = this.el;
		return el ? [el.offsetWidth, el.offsetHeight] : [0, 0];
	};
	TooltipHTMLContent.prototype.moveTo = function(zrX, zrY) {
		if (!this.el) return;
		var styleCoord = this._styleCoord;
		makeStyleCoord$1(styleCoord, this._zr, this._container, zrX, zrY);
		if (styleCoord[0] != null && styleCoord[1] != null) {
			var style_1 = this.el.style;
			var transforms = assembleTransform(styleCoord[0], styleCoord[1]);
			each$2(transforms, function(transform) {
				style_1[transform[0]] = transform[1];
			});
		}
	};
	/**
	* when `alwaysShowContent` is true,
	* move the tooltip after chart resized
	*/
	TooltipHTMLContent.prototype._moveIfResized = function() {
		var ratioX = this._styleCoord[2];
		var ratioY = this._styleCoord[3];
		this.moveTo(ratioX * this._zr.getWidth(), ratioY * this._zr.getHeight());
	};
	TooltipHTMLContent.prototype.hide = function() {
		var _this = this;
		var style = this.el.style;
		if (this._enableDisplayTransition) {
			style.visibility = "hidden";
			style.opacity = "0";
		} else style.display = "none";
		env.transform3dSupported && (style.willChange = "");
		this._show = false;
		this._longHideTimeout = setTimeout(function() {
			return _this._longHide = true;
		}, 500);
	};
	TooltipHTMLContent.prototype.hideLater = function(time) {
		if (this._show && !(this._inContent && this._enterable) && !this._alwaysShowContent) {
			if (time) {
				this._hideDelay = time;
				this._show = false;
				this._hideTimeout = setTimeout(bind$1(this.hide, this), time);
			} else this.hide();
		}
	};
	TooltipHTMLContent.prototype.isShow = function() {
		return this._show;
	};
	TooltipHTMLContent.prototype.dispose = function() {
		clearTimeout(this._hideTimeout);
		clearTimeout(this._longHideTimeout);
		var zr = this._zr;
		transformLocalCoordClear(zr && zr.painter && zr.painter.getViewportRoot(), this._container);
		var el = this.el;
		if (el) {
			el.onmouseenter = el.onmousemove = el.onmouseleave = null;
			var parentNode = el.parentNode;
			parentNode && parentNode.removeChild(el);
		}
		this.el = this._container = null;
	};
	return TooltipHTMLContent;
}();
//#endregion
//#region node_modules/echarts/lib/component/tooltip/TooltipRichContent.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var TooltipRichContent = function() {
	function TooltipRichContent(api) {
		this._show = false;
		this._styleCoord = [
			0,
			0,
			0,
			0
		];
		this._alwaysShowContent = false;
		this._enterable = true;
		this._zr = api.getZr();
		makeStyleCoord(this._styleCoord, this._zr, api.getWidth() / 2, api.getHeight() / 2);
	}
	/**
	* Update when tooltip is rendered
	*/
	TooltipRichContent.prototype.update = function(tooltipModel) {
		var alwaysShowContent = tooltipModel.get("alwaysShowContent");
		alwaysShowContent && this._moveIfResized();
		this._alwaysShowContent = alwaysShowContent;
	};
	TooltipRichContent.prototype.show = function() {
		if (this._hideTimeout) clearTimeout(this._hideTimeout);
		this.el.show();
		this._show = true;
	};
	/**
	* Set tooltip content
	*/
	TooltipRichContent.prototype.setContent = function(content, markupStyleCreator, tooltipModel, borderColor, arrowPosition) {
		var _this = this;
		if (isObject(content)) throwError("");
		if (this.el) this._zr.remove(this.el);
		var textStyleModel = tooltipModel.getModel("textStyle");
		this.el = new ZRText({
			style: {
				rich: markupStyleCreator.richTextStyles,
				text: content,
				lineHeight: 22,
				borderWidth: 1,
				borderColor,
				textShadowColor: textStyleModel.get("textShadowColor"),
				fill: tooltipModel.get(["textStyle", "color"]),
				padding: getPaddingFromTooltipModel(tooltipModel, "richText"),
				verticalAlign: "top",
				align: "left"
			},
			z: tooltipModel.get("z")
		});
		each$2([
			"backgroundColor",
			"borderRadius",
			"shadowColor",
			"shadowBlur",
			"shadowOffsetX",
			"shadowOffsetY"
		], function(propName) {
			_this.el.style[propName] = tooltipModel.get(propName);
		});
		each$2([
			"textShadowBlur",
			"textShadowOffsetX",
			"textShadowOffsetY"
		], function(propName) {
			_this.el.style[propName] = textStyleModel.get(propName) || 0;
		});
		this._zr.add(this.el);
		var self = this;
		this.el.on("mouseover", function() {
			if (self._enterable) {
				clearTimeout(self._hideTimeout);
				self._show = true;
			}
			self._inContent = true;
		});
		this.el.on("mouseout", function() {
			if (self._enterable) {
				if (self._show) self.hideLater(self._hideDelay);
			}
			self._inContent = false;
		});
	};
	TooltipRichContent.prototype.setEnterable = function(enterable) {
		this._enterable = enterable;
	};
	TooltipRichContent.prototype.getSize = function() {
		var el = this.el;
		var bounding = this.el.getBoundingRect();
		var shadowOuterSize = calcShadowOuterSize(el.style);
		return [bounding.width + shadowOuterSize.left + shadowOuterSize.right, bounding.height + shadowOuterSize.top + shadowOuterSize.bottom];
	};
	TooltipRichContent.prototype.moveTo = function(x, y) {
		var el = this.el;
		if (el) {
			var styleCoord = this._styleCoord;
			makeStyleCoord(styleCoord, this._zr, x, y);
			x = styleCoord[0];
			y = styleCoord[1];
			var style = el.style;
			var borderWidth = mathMaxWith0(style.borderWidth || 0);
			var shadowOuterSize = calcShadowOuterSize(style);
			el.x = x + borderWidth + shadowOuterSize.left;
			el.y = y + borderWidth + shadowOuterSize.top;
			el.markRedraw();
		}
	};
	/**
	* when `alwaysShowContent` is true,
	* move the tooltip after chart resized
	*/
	TooltipRichContent.prototype._moveIfResized = function() {
		var ratioX = this._styleCoord[2];
		var ratioY = this._styleCoord[3];
		this.moveTo(ratioX * this._zr.getWidth(), ratioY * this._zr.getHeight());
	};
	TooltipRichContent.prototype.hide = function() {
		if (this.el) this.el.hide();
		this._show = false;
	};
	TooltipRichContent.prototype.hideLater = function(time) {
		if (this._show && !(this._inContent && this._enterable) && !this._alwaysShowContent) {
			if (time) {
				this._hideDelay = time;
				this._show = false;
				this._hideTimeout = setTimeout(bind$1(this.hide, this), time);
			} else this.hide();
		}
	};
	TooltipRichContent.prototype.isShow = function() {
		return this._show;
	};
	TooltipRichContent.prototype.dispose = function() {
		this._zr.remove(this.el);
	};
	return TooltipRichContent;
}();
function mathMaxWith0(val) {
	return Math.max(0, val);
}
function calcShadowOuterSize(style) {
	var shadowBlur = mathMaxWith0(style.shadowBlur || 0);
	var shadowOffsetX = mathMaxWith0(style.shadowOffsetX || 0);
	var shadowOffsetY = mathMaxWith0(style.shadowOffsetY || 0);
	return {
		left: mathMaxWith0(shadowBlur - shadowOffsetX),
		right: mathMaxWith0(shadowBlur + shadowOffsetX),
		top: mathMaxWith0(shadowBlur - shadowOffsetY),
		bottom: mathMaxWith0(shadowBlur + shadowOffsetY)
	};
}
function makeStyleCoord(out, zr, zrX, zrY) {
	out[0] = zrX;
	out[1] = zrY;
	out[2] = out[0] / zr.getWidth();
	out[3] = out[1] / zr.getHeight();
}
//#endregion
//#region node_modules/echarts/lib/component/tooltip/TooltipView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var proxyRect = new Rect({ shape: {
	x: -1,
	y: -1,
	width: 2,
	height: 2
} });
var TooltipView = function(_super) {
	__extends(TooltipView, _super);
	function TooltipView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = TooltipView.type;
		return _this;
	}
	TooltipView.prototype.init = function(ecModel, api) {
		if (env.node || !api.getDom()) return;
		var tooltipModel = ecModel.getComponent("tooltip");
		var renderMode = this._renderMode = getTooltipRenderMode(tooltipModel.get("renderMode"));
		this._tooltipContent = renderMode === "richText" ? new TooltipRichContent(api) : new TooltipHTMLContent(api, { appendTo: tooltipModel.get("appendToBody", true) ? "body" : tooltipModel.get("appendTo", true) });
	};
	TooltipView.prototype.render = function(tooltipModel, ecModel, api) {
		if (env.node || !api.getDom()) return;
		this.group.removeAll();
		this._tooltipModel = tooltipModel;
		this._ecModel = ecModel;
		this._api = api;
		var tooltipContent = this._tooltipContent;
		tooltipContent.update(tooltipModel);
		tooltipContent.setEnterable(tooltipModel.get("enterable"));
		this._initGlobalListener();
		this._keepShow();
		if (this._renderMode !== "richText" && tooltipModel.get("transitionDuration")) createOrUpdate(this, "_updatePosition", 50, "fixRate");
		else clear(this, "_updatePosition");
	};
	TooltipView.prototype._initGlobalListener = function() {
		var triggerOn = this._tooltipModel.get("triggerOn");
		register("itemTooltip", this._api, bind$1(function(currTrigger, e, dispatchAction) {
			if (triggerOn !== "none") {
				if (triggerOn.indexOf(currTrigger) >= 0) this._tryShow(e, dispatchAction);
				else if (currTrigger === "leave") this._hide(dispatchAction);
			}
		}, this));
	};
	TooltipView.prototype._keepShow = function() {
		var tooltipModel = this._tooltipModel;
		var ecModel = this._ecModel;
		var api = this._api;
		var triggerOn = tooltipModel.get("triggerOn");
		if (tooltipModel.get("trigger") !== "axis") {
			this._lastDataByCoordSys = null;
			this._cbParamsList = null;
		}
		if (this._lastX != null && this._lastY != null && triggerOn !== "none" && triggerOn !== "click") {
			var self_1 = this;
			clearTimeout(this._refreshUpdateTimeout);
			this._refreshUpdateTimeout = setTimeout(function() {
				!api.isDisposed() && self_1.manuallyShowTip(tooltipModel, ecModel, api, {
					x: self_1._lastX,
					y: self_1._lastY,
					dataByCoordSys: self_1._lastDataByCoordSys
				});
			});
		}
	};
	/**
	* Show tip manually by
	* dispatchAction({
	*     type: 'showTip',
	*     x: 10,
	*     y: 10
	* });
	* Or
	* dispatchAction({
	*      type: 'showTip',
	*      seriesIndex: 0,
	*      dataIndex or dataIndexInside or name
	* });
	*
	*  TODO Batch
	*/
	TooltipView.prototype.manuallyShowTip = function(tooltipModel, ecModel, api, payload) {
		if (payload.from === this.uid || env.node || !api.getDom()) return;
		var dispatchAction = makeDispatchAction(payload, api);
		this._ticket = "";
		var dataByCoordSys = payload.dataByCoordSys;
		var cmptRef = findComponentReference(payload, ecModel, api);
		if (cmptRef) {
			var rect = cmptRef.el.getBoundingRect().clone();
			rect.applyTransform(cmptRef.el.transform);
			this._tryShow({
				offsetX: rect.x + rect.width / 2,
				offsetY: rect.y + rect.height / 2,
				target: cmptRef.el,
				position: payload.position,
				positionDefault: "bottom"
			}, dispatchAction);
		} else if (payload.tooltip && payload.x != null && payload.y != null) {
			var el = proxyRect;
			el.x = payload.x;
			el.y = payload.y;
			el.update();
			getECData(el).tooltipConfig = {
				name: null,
				option: payload.tooltip
			};
			this._tryShow({
				offsetX: payload.x,
				offsetY: payload.y,
				target: el
			}, dispatchAction);
		} else if (dataByCoordSys) this._tryShow({
			offsetX: payload.x,
			offsetY: payload.y,
			position: payload.position,
			dataByCoordSys,
			tooltipOption: payload.tooltipOption
		}, dispatchAction);
		else if (payload.seriesIndex != null) {
			if (this._manuallyAxisShowTip(tooltipModel, ecModel, api, payload)) return;
			var pointInfo = findPointFromSeries(payload, ecModel);
			var cx = pointInfo.point[0];
			var cy = pointInfo.point[1];
			if (cx != null && cy != null) this._tryShow({
				offsetX: cx,
				offsetY: cy,
				target: pointInfo.el,
				position: payload.position,
				positionDefault: "bottom"
			}, dispatchAction);
		} else if (payload.x != null && payload.y != null) {
			api.dispatchAction({
				type: "updateAxisPointer",
				x: payload.x,
				y: payload.y
			});
			this._tryShow({
				offsetX: payload.x,
				offsetY: payload.y,
				position: payload.position,
				target: api.getZr().findHover(payload.x, payload.y).target
			}, dispatchAction);
		}
	};
	TooltipView.prototype.manuallyHideTip = function(tooltipModel, ecModel, api, payload) {
		var tooltipContent = this._tooltipContent;
		if (this._tooltipModel) tooltipContent.hideLater(this._tooltipModel.get("hideDelay"));
		this._lastX = this._lastY = this._lastDataByCoordSys = null;
		this._cbParamsList = null;
		if (payload.from !== this.uid) this._hide(makeDispatchAction(payload, api));
	};
	TooltipView.prototype._manuallyAxisShowTip = function(tooltipModel, ecModel, api, payload) {
		var seriesIndex = payload.seriesIndex;
		var dataIndex = payload.dataIndex;
		var coordSysAxesInfo = ecModel.getComponent("axisPointer").coordSysAxesInfo;
		if (seriesIndex == null || dataIndex == null || coordSysAxesInfo == null) return;
		var seriesModel = ecModel.getSeriesByIndex(seriesIndex);
		if (!seriesModel) return;
		if (buildTooltipModel([
			seriesModel.getData().getItemModel(dataIndex),
			seriesModel,
			(seriesModel.coordinateSystem || {}).model
		], this._tooltipModel).get("trigger") !== "axis") return;
		api.dispatchAction({
			type: "updateAxisPointer",
			seriesIndex,
			dataIndex,
			position: payload.position
		});
		return true;
	};
	TooltipView.prototype._tryShow = function(e, dispatchAction) {
		var el = e.target;
		if (!this._tooltipModel) return;
		this._lastX = e.offsetX;
		this._lastY = e.offsetY;
		var dataByCoordSys = e.dataByCoordSys;
		if (dataByCoordSys && dataByCoordSys.length) this._showAxisTooltip(dataByCoordSys, e);
		else if (el) {
			if (getECData(el).ssrType === "legend") return;
			this._lastDataByCoordSys = null;
			this._cbParamsList = null;
			var seriesDispatcher_1;
			var cmptDispatcher_1;
			findEventDispatcher(el, function(target) {
				if (target.tooltipDisabled) {
					seriesDispatcher_1 = cmptDispatcher_1 = null;
					return true;
				}
				if (seriesDispatcher_1 || cmptDispatcher_1) return;
				if (getECData(target).dataIndex != null) seriesDispatcher_1 = target;
				else if (getECData(target).tooltipConfig != null) cmptDispatcher_1 = target;
			}, true);
			if (seriesDispatcher_1) this._showSeriesItemTooltip(e, seriesDispatcher_1, dispatchAction);
			else if (cmptDispatcher_1) this._showComponentItemTooltip(e, cmptDispatcher_1, dispatchAction);
			else this._hide(dispatchAction);
		} else {
			this._lastDataByCoordSys = null;
			this._cbParamsList = null;
			this._hide(dispatchAction);
		}
	};
	TooltipView.prototype._showOrMove = function(tooltipModel, cb) {
		var delay = tooltipModel.get("showDelay");
		cb = bind$1(cb, this);
		clearTimeout(this._showTimout);
		delay > 0 ? this._showTimout = setTimeout(cb, delay) : cb();
	};
	TooltipView.prototype._showAxisTooltip = function(dataByCoordSys, e) {
		var ecModel = this._ecModel;
		var globalTooltipModel = this._tooltipModel;
		var point = [e.offsetX, e.offsetY];
		var singleTooltipModel = buildTooltipModel([e.tooltipOption], globalTooltipModel);
		var renderMode = this._renderMode;
		var cbParamsList = [];
		var articleMarkup = createTooltipMarkup("section", {
			blocks: [],
			noHeader: true
		});
		var markupTextArrLegacy = [];
		var markupStyleCreator = new TooltipMarkupStyleCreator();
		each$2(dataByCoordSys, function(itemCoordSys) {
			each$2(itemCoordSys.dataByAxis, function(axisItem) {
				var axisModel = ecModel.getComponent(axisItem.axisDim + "Axis", axisItem.axisIndex);
				var axisValue = axisItem.value;
				var axis = axisModel.axis;
				var axisValueParsed = axis.scale.parse(axisValue);
				if (!axisModel || axisValue == null) return;
				var axisValueLabel = getValueLabel(axisValue, axis, ecModel, axisItem.seriesDataIndices, axisItem.valueLabelOpt);
				var axisSectionMarkup = createTooltipMarkup("section", {
					header: axisValueLabel,
					noHeader: !trim(axisValueLabel),
					sortBlocks: true,
					blocks: []
				});
				articleMarkup.blocks.push(axisSectionMarkup);
				each$2(axisItem.seriesDataIndices, function(idxItem) {
					var series = ecModel.getSeriesByIndex(idxItem.seriesIndex);
					var dataIndex = idxItem.dataIndexInside;
					var cbParams = series.getDataParams(dataIndex);
					if (cbParams.dataIndex < 0) return;
					cbParams.axisDim = axisItem.axisDim;
					cbParams.axisIndex = axisItem.axisIndex;
					cbParams.axisType = axisItem.axisType;
					cbParams.axisId = axisItem.axisId;
					cbParams.axisValue = getAxisRawValue(axisModel.axis, { value: axisValueParsed });
					cbParams.axisValueLabel = axisValueLabel;
					cbParams.marker = markupStyleCreator.makeTooltipMarker("item", convertToColorString(cbParams.color), renderMode);
					var seriesTooltipResult = normalizeTooltipFormatResult(series.formatTooltip(dataIndex, true, null));
					var frag = seriesTooltipResult.frag;
					if (frag) {
						var valueFormatter = buildTooltipModel([series], globalTooltipModel).get("valueFormatter");
						axisSectionMarkup.blocks.push(valueFormatter ? extend({ valueFormatter }, frag) : frag);
					}
					if (seriesTooltipResult.text) markupTextArrLegacy.push(seriesTooltipResult.text);
					cbParamsList.push(cbParams);
				});
			});
		});
		articleMarkup.blocks.reverse();
		markupTextArrLegacy.reverse();
		var positionExpr = e.position;
		var orderMode = singleTooltipModel.get("order");
		var builtMarkupText = buildTooltipMarkup(articleMarkup, markupStyleCreator, renderMode, orderMode, ecModel.get("useUTC"), singleTooltipModel.get("textStyle"));
		builtMarkupText && markupTextArrLegacy.unshift(builtMarkupText);
		var blockBreak = renderMode === "richText" ? "\n\n" : "<br/>";
		var allMarkupText = markupTextArrLegacy.join(blockBreak);
		this._showOrMove(singleTooltipModel, function() {
			if (this._updateContentNotChangedOnAxis(dataByCoordSys, cbParamsList)) this._updatePosition(singleTooltipModel, positionExpr, point[0], point[1], this._tooltipContent, cbParamsList);
			else this._showTooltipContent(singleTooltipModel, allMarkupText, cbParamsList, Math.random() + "", point[0], point[1], positionExpr, null, markupStyleCreator);
		});
	};
	TooltipView.prototype._showSeriesItemTooltip = function(e, dispatcher, dispatchAction) {
		var ecModel = this._ecModel;
		var ecData = getECData(dispatcher);
		var seriesIndex = ecData.seriesIndex;
		var seriesModel = ecModel.getSeriesByIndex(seriesIndex);
		var dataModel = ecData.dataModel || seriesModel;
		var dataIndex = ecData.dataIndex;
		var dataType = ecData.dataType;
		var data = dataModel.getData(dataType);
		var renderMode = this._renderMode;
		var positionDefault = e.positionDefault;
		var tooltipModel = buildTooltipModel([
			data.getItemModel(dataIndex),
			dataModel,
			seriesModel && (seriesModel.coordinateSystem || {}).model
		], this._tooltipModel, positionDefault ? { position: positionDefault } : null);
		var tooltipTrigger = tooltipModel.get("trigger");
		if (tooltipTrigger != null && tooltipTrigger !== "item") return;
		var params = dataModel.getDataParams(dataIndex, dataType);
		var markupStyleCreator = new TooltipMarkupStyleCreator();
		params.marker = markupStyleCreator.makeTooltipMarker("item", convertToColorString(params.color), renderMode);
		var seriesTooltipResult = normalizeTooltipFormatResult(dataModel.formatTooltip(dataIndex, false, dataType));
		var orderMode = tooltipModel.get("order");
		var valueFormatter = tooltipModel.get("valueFormatter");
		var frag = seriesTooltipResult.frag;
		var markupText = frag ? buildTooltipMarkup(valueFormatter ? extend({ valueFormatter }, frag) : frag, markupStyleCreator, renderMode, orderMode, ecModel.get("useUTC"), tooltipModel.get("textStyle")) : seriesTooltipResult.text;
		var asyncTicket = "item_" + dataModel.name + "_" + dataIndex;
		this._showOrMove(tooltipModel, function() {
			this._showTooltipContent(tooltipModel, markupText, params, asyncTicket, e.offsetX, e.offsetY, e.position, e.target, markupStyleCreator);
		});
		dispatchAction({
			type: "showTip",
			dataIndexInside: dataIndex,
			dataIndex: data.getRawIndex(dataIndex),
			seriesIndex,
			from: this.uid
		});
	};
	TooltipView.prototype._showComponentItemTooltip = function(e, el, dispatchAction) {
		var isHTMLRenderMode = this._renderMode === "html";
		var ecData = getECData(el);
		var tooltipOpt = ecData.tooltipConfig.option || {};
		var encodeHTMLContent = tooltipOpt.encodeHTMLContent;
		if (isString(tooltipOpt)) {
			var content = tooltipOpt;
			tooltipOpt = {
				content,
				formatter: content
			};
			encodeHTMLContent = true;
		}
		if (encodeHTMLContent && isHTMLRenderMode && tooltipOpt.content) {
			tooltipOpt = clone$1(tooltipOpt);
			tooltipOpt.content = encodeHTML(tooltipOpt.content);
		}
		var tooltipModelCascade = [tooltipOpt];
		var cmpt = this._ecModel.getComponent(ecData.componentMainType, ecData.componentIndex);
		if (cmpt) tooltipModelCascade.push(cmpt);
		tooltipModelCascade.push({ formatter: tooltipOpt.content });
		var positionDefault = e.positionDefault;
		var subTooltipModel = buildTooltipModel(tooltipModelCascade, this._tooltipModel, positionDefault ? { position: positionDefault } : null);
		var defaultHtml = subTooltipModel.get("content");
		var asyncTicket = Math.random() + "";
		var markupStyleCreator = new TooltipMarkupStyleCreator();
		this._showOrMove(subTooltipModel, function() {
			var formatterParams = clone$1(subTooltipModel.get("formatterParams") || {});
			this._showTooltipContent(subTooltipModel, defaultHtml, formatterParams, asyncTicket, e.offsetX, e.offsetY, e.position, el, markupStyleCreator);
		});
		dispatchAction({
			type: "showTip",
			from: this.uid
		});
	};
	TooltipView.prototype._showTooltipContent = function(tooltipModel, defaultHtml, params, asyncTicket, x, y, positionExpr, el, markupStyleCreator) {
		this._ticket = "";
		if (!tooltipModel.get("showContent") || !tooltipModel.get("show")) return;
		var tooltipContent = this._tooltipContent;
		tooltipContent.setEnterable(tooltipModel.get("enterable"));
		var formatter = tooltipModel.get("formatter");
		positionExpr = positionExpr || tooltipModel.get("position");
		var html = defaultHtml;
		var nearPointColor = this._getNearestPoint([x, y], params, tooltipModel.get("trigger"), tooltipModel.get("borderColor"), tooltipModel.get("defaultBorderColor", true)).color;
		if (formatter) {
			if (isString(formatter)) {
				var useUTC = tooltipModel.ecModel.get("useUTC");
				var params0 = isArray(params) ? params[0] : params;
				var isTimeAxis = params0 && params0.axisType && params0.axisType.indexOf("time") >= 0;
				html = formatter;
				if (isTimeAxis) html = format(params0.axisValue, html, useUTC);
				html = formatTpl(html, params, true);
			} else if (isFunction(formatter)) {
				var callback = bind$1(function(cbTicket, html) {
					if (cbTicket === this._ticket) {
						tooltipContent.setContent(html, markupStyleCreator, tooltipModel, nearPointColor, positionExpr);
						this._updatePosition(tooltipModel, positionExpr, x, y, tooltipContent, params, el);
					}
				}, this);
				this._ticket = asyncTicket;
				html = formatter(params, asyncTicket, callback);
			} else html = formatter;
		}
		tooltipContent.setContent(html, markupStyleCreator, tooltipModel, nearPointColor, positionExpr);
		tooltipContent.show(tooltipModel, nearPointColor);
		this._updatePosition(tooltipModel, positionExpr, x, y, tooltipContent, params, el);
	};
	TooltipView.prototype._getNearestPoint = function(point, tooltipDataParams, trigger, borderColor, defaultBorderColor) {
		if (trigger === "axis" || isArray(tooltipDataParams)) return { color: borderColor || defaultBorderColor };
		if (!isArray(tooltipDataParams)) return { color: borderColor || tooltipDataParams.color || tooltipDataParams.borderColor };
	};
	TooltipView.prototype._updatePosition = function(tooltipModel, positionExpr, x, y, content, params, el) {
		var viewWidth = this._api.getWidth();
		var viewHeight = this._api.getHeight();
		positionExpr = positionExpr || tooltipModel.get("position");
		var contentSize = content.getSize();
		var align = tooltipModel.get("align");
		var vAlign = tooltipModel.get("verticalAlign");
		var rect = el && el.getBoundingRect().clone();
		el && rect.applyTransform(el.transform);
		if (isFunction(positionExpr)) positionExpr = positionExpr([x, y], params, content.el, rect, {
			viewSize: [viewWidth, viewHeight],
			contentSize: contentSize.slice()
		});
		if (isArray(positionExpr)) {
			x = parsePercent(positionExpr[0], viewWidth);
			y = parsePercent(positionExpr[1], viewHeight);
		} else if (isObject(positionExpr)) {
			var boxLayoutPosition = positionExpr;
			boxLayoutPosition.width = contentSize[0];
			boxLayoutPosition.height = contentSize[1];
			var layoutRect = getLayoutRect(boxLayoutPosition, {
				width: viewWidth,
				height: viewHeight
			});
			x = layoutRect.x;
			y = layoutRect.y;
			align = null;
			vAlign = null;
		} else if (isString(positionExpr) && el) {
			var pos = calcTooltipPosition(positionExpr, rect, contentSize, tooltipModel.get("borderWidth"));
			x = pos[0];
			y = pos[1];
		} else {
			var pos = refixTooltipPosition(x, y, content, viewWidth, viewHeight, align ? null : 20, vAlign ? null : 20);
			x = pos[0];
			y = pos[1];
		}
		align && (x -= isCenterAlign(align) ? contentSize[0] / 2 : align === "right" ? contentSize[0] : 0);
		vAlign && (y -= isCenterAlign(vAlign) ? contentSize[1] / 2 : vAlign === "bottom" ? contentSize[1] : 0);
		if (shouldTooltipConfine(tooltipModel)) {
			var pos = confineTooltipPosition(x, y, content, viewWidth, viewHeight);
			x = pos[0];
			y = pos[1];
		}
		content.moveTo(x, y);
	};
	TooltipView.prototype._updateContentNotChangedOnAxis = function(dataByCoordSys, cbParamsList) {
		var lastCoordSys = this._lastDataByCoordSys;
		var lastCbParamsList = this._cbParamsList;
		var contentNotChanged = !!lastCoordSys && lastCoordSys.length === dataByCoordSys.length;
		contentNotChanged && each$2(lastCoordSys, function(lastItemCoordSys, indexCoordSys) {
			var lastDataByAxis = lastItemCoordSys.dataByAxis || [];
			var thisDataByAxis = (dataByCoordSys[indexCoordSys] || {}).dataByAxis || [];
			contentNotChanged = contentNotChanged && lastDataByAxis.length === thisDataByAxis.length;
			contentNotChanged && each$2(lastDataByAxis, function(lastItem, indexAxis) {
				var thisItem = thisDataByAxis[indexAxis] || {};
				var lastIndices = lastItem.seriesDataIndices || [];
				var newIndices = thisItem.seriesDataIndices || [];
				contentNotChanged = contentNotChanged && lastItem.value === thisItem.value && lastItem.axisType === thisItem.axisType && lastItem.axisId === thisItem.axisId && lastIndices.length === newIndices.length;
				contentNotChanged && each$2(lastIndices, function(lastIdxItem, j) {
					var newIdxItem = newIndices[j];
					contentNotChanged = contentNotChanged && lastIdxItem.seriesIndex === newIdxItem.seriesIndex && lastIdxItem.dataIndex === newIdxItem.dataIndex;
				});
				lastCbParamsList && each$2(lastItem.seriesDataIndices, function(idxItem) {
					var seriesIdx = idxItem.seriesIndex;
					var cbParams = cbParamsList[seriesIdx];
					var lastCbParams = lastCbParamsList[seriesIdx];
					if (cbParams && lastCbParams && lastCbParams.data !== cbParams.data) contentNotChanged = false;
				});
			});
		});
		this._lastDataByCoordSys = dataByCoordSys;
		this._cbParamsList = cbParamsList;
		return !!contentNotChanged;
	};
	TooltipView.prototype._hide = function(dispatchAction) {
		this._lastDataByCoordSys = null;
		this._cbParamsList = null;
		dispatchAction({
			type: "hideTip",
			from: this.uid
		});
	};
	TooltipView.prototype.dispose = function(ecModel, api) {
		if (env.node || !api.getDom()) return;
		clear(this, "_updatePosition");
		this._tooltipContent.dispose();
		unregister("itemTooltip", api);
		this._tooltipContent = null;
		this._tooltipModel = null;
		this._lastDataByCoordSys = null;
		this._cbParamsList = null;
	};
	TooltipView.type = "tooltip";
	return TooltipView;
}(ComponentView);
/**
* From top to bottom. (the last one should be globalTooltipModel);
*/
function buildTooltipModel(modelCascade, globalTooltipModel, defaultTooltipOption) {
	var ecModel = globalTooltipModel.ecModel;
	var resultModel;
	if (defaultTooltipOption) {
		resultModel = new Model(defaultTooltipOption, ecModel, ecModel);
		resultModel = new Model(globalTooltipModel.option, resultModel, ecModel);
	} else resultModel = globalTooltipModel;
	for (var i = modelCascade.length - 1; i >= 0; i--) {
		var tooltipOpt = modelCascade[i];
		if (tooltipOpt) {
			if (tooltipOpt instanceof Model) tooltipOpt = tooltipOpt.get("tooltip", true);
			if (isString(tooltipOpt)) tooltipOpt = { formatter: tooltipOpt };
			if (tooltipOpt) resultModel = new Model(tooltipOpt, resultModel, ecModel);
		}
	}
	return resultModel;
}
function makeDispatchAction(payload, api) {
	return payload.dispatchAction || bind$1(api.dispatchAction, api);
}
function refixTooltipPosition(x, y, content, viewWidth, viewHeight, gapH, gapV) {
	var size = content.getSize();
	var width = size[0];
	var height = size[1];
	if (gapH != null) {
		if (x + width + gapH + 2 > viewWidth) x -= width + gapH;
		else x += gapH;
	}
	if (gapV != null) {
		if (y + height + gapV > viewHeight) y -= height + gapV;
		else y += gapV;
	}
	return [x, y];
}
function confineTooltipPosition(x, y, content, viewWidth, viewHeight) {
	var size = content.getSize();
	var width = size[0];
	var height = size[1];
	x = Math.min(x + width, viewWidth) - width;
	y = Math.min(y + height, viewHeight) - height;
	x = Math.max(x, 0);
	y = Math.max(y, 0);
	return [x, y];
}
function calcTooltipPosition(position, rect, contentSize, borderWidth) {
	var domWidth = contentSize[0];
	var domHeight = contentSize[1];
	var offset = Math.ceil(Math.SQRT2 * borderWidth) + 8;
	var x = 0;
	var y = 0;
	var rectWidth = rect.width;
	var rectHeight = rect.height;
	switch (position) {
		case "inside":
			x = rect.x + rectWidth / 2 - domWidth / 2;
			y = rect.y + rectHeight / 2 - domHeight / 2;
			break;
		case "top":
			x = rect.x + rectWidth / 2 - domWidth / 2;
			y = rect.y - domHeight - offset;
			break;
		case "bottom":
			x = rect.x + rectWidth / 2 - domWidth / 2;
			y = rect.y + rectHeight + offset;
			break;
		case "left":
			x = rect.x - domWidth - offset;
			y = rect.y + rectHeight / 2 - domHeight / 2;
			break;
		case "right":
			x = rect.x + rectWidth + offset;
			y = rect.y + rectHeight / 2 - domHeight / 2;
	}
	return [x, y];
}
function isCenterAlign(align) {
	return align === "center" || align === "middle";
}
/**
* Find target component by payload like:
* ```js
* { legendId: 'some_id', name: 'xxx' }
* { toolboxIndex: 1, name: 'xxx' }
* { geoName: 'some_name', name: 'xxx' }
* ```
* PENDING: at present only
*
* If not found, return null/undefined.
*/
function findComponentReference(payload, ecModel, api) {
	var queryOptionMap = preParseFinder(payload).queryOptionMap;
	var componentMainType = queryOptionMap.keys()[0];
	if (!componentMainType || componentMainType === "series") return;
	var model = queryReferringComponents(ecModel, componentMainType, queryOptionMap.get(componentMainType), {
		useDefault: false,
		enableAll: false,
		enableNone: false
	}).models[0];
	if (!model) return;
	var view = api.getViewOfComponentModel(model);
	var el;
	view.group.traverse(function(subEl) {
		var tooltipConfig = getECData(subEl).tooltipConfig;
		if (tooltipConfig && tooltipConfig.name === payload.name) {
			el = subEl;
			return true;
		}
	});
	if (el) return {
		componentMainType,
		componentIndex: model.componentIndex,
		el
	};
}
//#endregion
//#region node_modules/echarts/lib/component/tooltip/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$5(registers) {
	use(install$8);
	registers.registerComponentModel(TooltipModel);
	registers.registerComponentView(TooltipView);
	/**
	* @action
	* @property {string} type
	* @property {number} seriesIndex
	* @property {number} dataIndex
	* @property {number} [x]
	* @property {number} [y]
	*/
	registers.registerAction({
		type: "showTip",
		event: "showTip",
		update: "tooltip:manuallyShowTip"
	}, noop);
	registers.registerAction({
		type: "hideTip",
		event: "hideTip",
		update: "tooltip:manuallyHideTip"
	}, noop);
}
//#endregion
//#region node_modules/echarts/lib/component/marker/checkMarkerInSeries.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function checkMarkerInSeries(seriesOpts, markerType) {
	if (!seriesOpts) return false;
	var seriesOptArr = isArray(seriesOpts) ? seriesOpts : [seriesOpts];
	for (var idx = 0; idx < seriesOptArr.length; idx++) if (seriesOptArr[idx] && seriesOptArr[idx][markerType]) return true;
	return false;
}
//#endregion
//#region node_modules/echarts/lib/component/marker/MarkerModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function fillLabel(opt) {
	defaultEmphasis(opt, "label", ["show"]);
}
var inner$2 = makeInner();
var MarkerModel = function(_super) {
	__extends(MarkerModel, _super);
	function MarkerModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = MarkerModel.type;
		/**
		* If marker model is created by self from series
		*/
		_this.createdBySelf = false;
		_this.preventAutoZ = true;
		return _this;
	}
	/**
	* @overrite
	*/
	MarkerModel.prototype.init = function(option, parentModel, ecModel) {
		this.mergeDefaultAndTheme(option, ecModel);
		this._mergeOption(option, ecModel, false, true);
	};
	MarkerModel.prototype.isAnimationEnabled = function() {
		if (env.node) return false;
		var hostSeries = this.__hostSeries;
		return this.getShallow("animation") && hostSeries && hostSeries.isAnimationEnabled();
	};
	/**
	* @overrite
	*/
	MarkerModel.prototype.mergeOption = function(newOpt, ecModel) {
		this._mergeOption(newOpt, ecModel, false, false);
	};
	MarkerModel.prototype._mergeOption = function(newOpt, ecModel, createdBySelf, isInit) {
		var componentType = this.mainType;
		if (!createdBySelf) ecModel.eachSeries(function(seriesModel) {
			var markerOpt = seriesModel.get(this.mainType, true);
			var markerModel = inner$2(seriesModel)[componentType];
			if (!markerOpt || !markerOpt.data) {
				inner$2(seriesModel)[componentType] = null;
				return;
			}
			if (!markerModel) {
				if (isInit) fillLabel(markerOpt);
				each$2(markerOpt.data, function(item) {
					if (item instanceof Array) {
						fillLabel(item[0]);
						fillLabel(item[1]);
					} else fillLabel(item);
				});
				markerModel = this.createMarkerModelFromSeries(markerOpt, this, ecModel);
				extend(markerModel, {
					mainType: this.mainType,
					seriesIndex: seriesModel.seriesIndex,
					name: seriesModel.name,
					createdBySelf: true
				});
				markerModel.__hostSeries = seriesModel;
			} else markerModel._mergeOption(markerOpt, ecModel, true);
			inner$2(seriesModel)[componentType] = markerModel;
		}, this);
	};
	MarkerModel.prototype.formatTooltip = function(dataIndex, multipleSeries, dataType) {
		var data = this.getData();
		var value = this.getRawValue(dataIndex);
		var itemName = data.getName(dataIndex);
		return createTooltipMarkup("section", {
			header: this.name,
			blocks: [createTooltipMarkup("nameValue", {
				name: itemName,
				value,
				noName: !itemName,
				noValue: value == null
			})]
		});
	};
	MarkerModel.prototype.getData = function() {
		return this._data;
	};
	MarkerModel.prototype.setData = function(data) {
		this._data = data;
	};
	MarkerModel.prototype.getDataParams = function(dataIndex, dataType) {
		var params = DataFormatMixin.prototype.getDataParams.call(this, dataIndex, dataType);
		var hostSeries = this.__hostSeries;
		if (hostSeries) {
			params.seriesId = hostSeries.id;
			params.seriesName = hostSeries.name;
			params.seriesType = hostSeries.subType;
		}
		return params;
	};
	MarkerModel.getMarkerModelFromSeries = function(seriesModel, componentType) {
		return inner$2(seriesModel)[componentType];
	};
	MarkerModel.type = "marker";
	MarkerModel.dependencies = [
		"series",
		"grid",
		"polar",
		"geo"
	];
	return MarkerModel;
}(ComponentModel);
mixin(MarkerModel, DataFormatMixin.prototype);
//#endregion
//#region node_modules/echarts/lib/component/marker/MarkPointModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var MarkPointModel = function(_super) {
	__extends(MarkPointModel, _super);
	function MarkPointModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = MarkPointModel.type;
		return _this;
	}
	MarkPointModel.prototype.createMarkerModelFromSeries = function(markerOpt, masterMarkerModel, ecModel) {
		return new MarkPointModel(markerOpt, masterMarkerModel, ecModel);
	};
	MarkPointModel.type = "markPoint";
	MarkPointModel.defaultOption = {
		z: 5,
		symbol: "pin",
		symbolSize: 50,
		tooltip: { trigger: "item" },
		label: {
			show: true,
			position: "inside"
		},
		itemStyle: { borderWidth: 2 },
		emphasis: { label: { show: true } }
	};
	return MarkPointModel;
}(MarkerModel);
//#endregion
//#region node_modules/echarts/lib/component/marker/markerHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function hasXOrY(item) {
	return !(isNaN(parseFloat(item.x)) && isNaN(parseFloat(item.y)));
}
function hasXAndY(item) {
	return !isNaN(parseFloat(item.x)) && !isNaN(parseFloat(item.y));
}
function markerTypeCalculatorWithExtent(markerType, data, axisDim, otherDataDim, targetDataDim, otherCoordIndex, targetCoordIndex) {
	var coordArr = [];
	var calcDataDim = isDimensionStacked(data, targetDataDim) ? data.getCalculationInfo("stackResultDimension") : targetDataDim;
	var value = numCalculate(data, calcDataDim, markerType);
	var dataIndex = data.hostModel.indicesOfNearest(axisDim, calcDataDim, value)[0];
	coordArr[otherCoordIndex] = data.get(otherDataDim, dataIndex);
	coordArr[targetCoordIndex] = data.get(calcDataDim, dataIndex);
	var coordArrValue = data.get(targetDataDim, dataIndex);
	var precision = getPrecision(data.get(targetDataDim, dataIndex));
	precision = Math.min(precision, 20);
	if (precision >= 0) coordArr[targetCoordIndex] = +coordArr[targetCoordIndex].toFixed(precision);
	return [coordArr, coordArrValue];
}
var markerTypeCalculator = {
	min: curry$1(markerTypeCalculatorWithExtent, "min"),
	max: curry$1(markerTypeCalculatorWithExtent, "max"),
	average: curry$1(markerTypeCalculatorWithExtent, "average"),
	median: curry$1(markerTypeCalculatorWithExtent, "median")
};
/**
* Transform markPoint data item to format used in List by do the following
* 1. Calculate statistic like `max`, `min`, `average`
* 2. Convert `item.xAxis`, `item.yAxis` to `item.coord` array
*/
function dataTransform(seriesModel, item) {
	if (!item) return;
	var data = seriesModel.getData();
	var coordSys = seriesModel.coordinateSystem;
	var dims = coordSys && coordSys.dimensions;
	if (!hasXAndY(item) && !isArray(item.coord) && isArray(dims)) {
		var axisInfo = getAxisInfo(item, data, coordSys, seriesModel);
		item = clone$1(item);
		if (item.type && markerTypeCalculator[item.type] && axisInfo.baseAxis && axisInfo.valueAxis) {
			var otherCoordIndex = indexOf(dims, axisInfo.baseAxis.dim);
			var targetCoordIndex = indexOf(dims, axisInfo.valueAxis.dim);
			var coordInfo = markerTypeCalculator[item.type](data, axisInfo.valueAxis.dim, axisInfo.baseDataDim, axisInfo.valueDataDim, otherCoordIndex, targetCoordIndex);
			item.coord = coordInfo[0];
			item.value = coordInfo[1];
		} else item.coord = [item.xAxis != null ? item.xAxis : item.radiusAxis, item.yAxis != null ? item.yAxis : item.angleAxis];
	}
	if (item.coord == null || !isArray(dims)) {
		item.coord = [];
		var baseAxis = seriesModel.getBaseAxis();
		if (baseAxis && item.type && markerTypeCalculator[item.type]) {
			var otherAxis = coordSys.getOtherAxis(baseAxis);
			if (otherAxis) item.value = numCalculate(data, data.mapDimension(otherAxis.dim), item.type);
		}
	} else {
		var coord = item.coord;
		for (var i = 0; i < 2; i++) if (markerTypeCalculator[coord[i]]) coord[i] = numCalculate(data, data.mapDimension(dims[i]), coord[i]);
	}
	return item;
}
function getAxisInfo(item, data, coordSys, seriesModel) {
	var ret = {};
	if (item.valueIndex != null || item.valueDim != null) {
		ret.valueDataDim = item.valueIndex != null ? data.getDimension(item.valueIndex) : item.valueDim;
		ret.valueAxis = coordSys.getAxis(dataDimToCoordDim(seriesModel, ret.valueDataDim));
		ret.baseAxis = coordSys.getOtherAxis(ret.valueAxis);
		ret.baseDataDim = data.mapDimension(ret.baseAxis.dim);
	} else {
		ret.baseAxis = seriesModel.getBaseAxis();
		ret.valueAxis = coordSys.getOtherAxis(ret.baseAxis);
		ret.baseDataDim = data.mapDimension(ret.baseAxis.dim);
		ret.valueDataDim = data.mapDimension(ret.valueAxis.dim);
	}
	return ret;
}
function dataDimToCoordDim(seriesModel, dataDim) {
	var dimItem = seriesModel.getData().getDimensionInfo(dataDim);
	return dimItem && dimItem.coordDim;
}
/**
* Filter data which is out of coordinateSystem range
* [dataFilter description]
*/
function dataFilter(coordSys, item) {
	return coordSys && coordSys.containData && item.coord && !hasXOrY(item) ? coordSys.containData(item.coord) : true;
}
function createMarkerDimValueGetter(inCoordSys, dims) {
	return inCoordSys ? function(item, dimName, dataIndex, dimIndex) {
		var rawVal = dimIndex < 2 ? item.coord && item.coord[dimIndex] : item.value;
		return parseDataValue(rawVal, dims[dimIndex]);
	} : function(item, dimName, dataIndex, dimIndex) {
		return parseDataValue(item.value, dims[dimIndex]);
	};
}
function numCalculate(data, valueDataDim, type) {
	if (type === "average") {
		var sum_1 = 0;
		var count_1 = 0;
		data.each(valueDataDim, function(val, idx) {
			if (!isNaN(val)) {
				sum_1 += val;
				count_1++;
			}
		});
		return sum_1 / count_1;
	} else if (type === "median") return data.getMedian(valueDataDim);
	else return data.getDataExtent(valueDataDim)[type === "max" ? 1 : 0];
}
//#endregion
//#region node_modules/echarts/lib/component/marker/MarkerView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var inner$1 = makeInner();
var MarkerView = function(_super) {
	__extends(MarkerView, _super);
	function MarkerView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = MarkerView.type;
		return _this;
	}
	MarkerView.prototype.init = function() {
		this.markerGroupMap = createHashMap();
	};
	MarkerView.prototype.render = function(markerModel, ecModel, api) {
		var _this = this;
		var markerGroupMap = this.markerGroupMap;
		markerGroupMap.each(function(item) {
			inner$1(item).keep = false;
		});
		ecModel.eachSeries(function(seriesModel) {
			var markerModel = MarkerModel.getMarkerModelFromSeries(seriesModel, _this.type);
			markerModel && _this.renderSeries(seriesModel, markerModel, ecModel, api);
		});
		markerGroupMap.each(function(item) {
			!inner$1(item).keep && _this.group.remove(item.group);
		});
		updateZ(ecModel, markerGroupMap, this.type);
	};
	MarkerView.prototype.markKeep = function(drawGroup) {
		inner$1(drawGroup).keep = true;
	};
	MarkerView.prototype.toggleBlurSeries = function(seriesModelList, isBlur) {
		var _this = this;
		each$2(seriesModelList, function(seriesModel) {
			var markerModel = MarkerModel.getMarkerModelFromSeries(seriesModel, _this.type);
			if (markerModel) markerModel.getData().eachItemGraphicEl(function(el) {
				if (el) isBlur ? enterBlur(el) : leaveBlur(el);
			});
		});
	};
	MarkerView.type = "marker";
	return MarkerView;
}(ComponentView);
function updateZ(ecModel, markerGroupMap, type) {
	ecModel.eachSeries(function(seriesModel) {
		var markerModel = MarkerModel.getMarkerModelFromSeries(seriesModel, type);
		var markerDraw = markerGroupMap.get(seriesModel.id);
		if (markerModel && markerDraw && markerDraw.group) {
			var _a = retrieveZInfo(markerModel), z = _a.z, zlevel = _a.zlevel;
			traverseUpdateZ(markerDraw.group, z, zlevel);
		}
	});
}
//#endregion
//#region node_modules/echarts/lib/component/marker/MarkPointView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function updateMarkerLayout(mpData, seriesModel, api) {
	var coordSys = seriesModel.coordinateSystem;
	var apiWidth = api.getWidth();
	var apiHeight = api.getHeight();
	var coordRect = coordSys && coordSys.getArea && coordSys.getArea();
	mpData.each(function(idx) {
		var itemModel = mpData.getItemModel(idx);
		var isRelativeToCoordinate = itemModel.get("relativeTo") === "coordinate";
		var width = isRelativeToCoordinate ? coordRect ? coordRect.width : 0 : apiWidth;
		var height = isRelativeToCoordinate ? coordRect ? coordRect.height : 0 : apiHeight;
		var left = isRelativeToCoordinate && coordRect ? coordRect.x : 0;
		var top = isRelativeToCoordinate && coordRect ? coordRect.y : 0;
		var point;
		var xPx = parsePercent(itemModel.get("x"), width) + left;
		var yPx = parsePercent(itemModel.get("y"), height) + top;
		if (!isNaN(xPx) && !isNaN(yPx)) point = [xPx, yPx];
		else if (seriesModel.getMarkerPosition) point = seriesModel.getMarkerPosition(mpData.getValues(mpData.dimensions, idx));
		else if (coordSys) {
			var x = mpData.get(coordSys.dimensions[0], idx);
			var y = mpData.get(coordSys.dimensions[1], idx);
			point = coordSys.dataToPoint([x, y]);
		}
		if (!isNaN(xPx)) point[0] = xPx;
		if (!isNaN(yPx)) point[1] = yPx;
		mpData.setItemLayout(idx, point);
	});
}
var MarkPointView = function(_super) {
	__extends(MarkPointView, _super);
	function MarkPointView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = MarkPointView.type;
		return _this;
	}
	MarkPointView.prototype.updateTransform = function(markPointModel, ecModel, api) {
		ecModel.eachSeries(function(seriesModel) {
			var mpModel = MarkerModel.getMarkerModelFromSeries(seriesModel, "markPoint");
			if (mpModel) {
				updateMarkerLayout(mpModel.getData(), seriesModel, api);
				this.markerGroupMap.get(seriesModel.id).updateLayout();
			}
		}, this);
	};
	MarkPointView.prototype.renderSeries = function(seriesModel, mpModel, ecModel, api) {
		var coordSys = seriesModel.coordinateSystem;
		var seriesId = seriesModel.id;
		var seriesData = seriesModel.getData();
		var symbolDrawMap = this.markerGroupMap;
		var symbolDraw = symbolDrawMap.get(seriesId) || symbolDrawMap.set(seriesId, new SymbolDraw());
		var mpData = createData(coordSys, seriesModel, mpModel);
		mpModel.setData(mpData);
		updateMarkerLayout(mpModel.getData(), seriesModel, api);
		mpData.each(function(idx) {
			var itemModel = mpData.getItemModel(idx);
			var symbol = itemModel.getShallow("symbol");
			var symbolSize = itemModel.getShallow("symbolSize");
			var symbolRotate = itemModel.getShallow("symbolRotate");
			var symbolOffset = itemModel.getShallow("symbolOffset");
			var symbolKeepAspect = itemModel.getShallow("symbolKeepAspect");
			if (isFunction(symbol) || isFunction(symbolSize) || isFunction(symbolRotate) || isFunction(symbolOffset)) {
				var rawIdx = mpModel.getRawValue(idx);
				var dataParams = mpModel.getDataParams(idx);
				if (isFunction(symbol)) symbol = symbol(rawIdx, dataParams);
				if (isFunction(symbolSize)) symbolSize = symbolSize(rawIdx, dataParams);
				if (isFunction(symbolRotate)) symbolRotate = symbolRotate(rawIdx, dataParams);
				if (isFunction(symbolOffset)) symbolOffset = symbolOffset(rawIdx, dataParams);
			}
			var style = itemModel.getModel("itemStyle").getItemStyle();
			var z2 = itemModel.get("z2");
			var color = getVisualFromData(seriesData, "color");
			if (!style.fill) style.fill = color;
			mpData.setItemVisual(idx, {
				z2: retrieve2(z2, 0),
				symbol,
				symbolSize,
				symbolRotate,
				symbolOffset,
				symbolKeepAspect,
				style
			});
		});
		symbolDraw.updateData(mpData);
		this.group.add(symbolDraw.group);
		mpData.eachItemGraphicEl(function(el) {
			el.traverse(function(child) {
				getECData(child).dataModel = mpModel;
			});
		});
		this.markKeep(symbolDraw);
		symbolDraw.group.silent = mpModel.get("silent") || seriesModel.get("silent");
	};
	MarkPointView.type = "markPoint";
	return MarkPointView;
}(MarkerView);
function createData(coordSys, seriesModel, mpModel) {
	var coordDimsInfos;
	if (coordSys) coordDimsInfos = map(coordSys && coordSys.dimensions, function(coordDim) {
		var data = seriesModel.getData();
		var info = data.getDimensionInfo(data.mapDimension(coordDim)) || {};
		return extend(extend({}, info), {
			name: coordDim,
			ordinalMeta: null
		});
	});
	else coordDimsInfos = [{
		name: "value",
		type: "float"
	}];
	var mpData = new SeriesData(coordDimsInfos, mpModel);
	var dataOpt = map(mpModel.get("data"), curry$1(dataTransform, seriesModel));
	if (coordSys) dataOpt = filter(dataOpt, curry$1(dataFilter, coordSys));
	var dimValueGetter = createMarkerDimValueGetter(!!coordSys, coordDimsInfos);
	mpData.initData(dataOpt, null, dimValueGetter);
	return mpData;
}
//#endregion
//#region node_modules/echarts/lib/component/marker/installMarkPoint.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$4(registers) {
	registers.registerComponentModel(MarkPointModel);
	registers.registerComponentView(MarkPointView);
	registers.registerPreprocessor(function(opt) {
		if (checkMarkerInSeries(opt.series, "markPoint")) opt.markPoint = opt.markPoint || {};
	});
}
//#endregion
//#region node_modules/echarts/lib/component/marker/MarkLineModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var MarkLineModel = function(_super) {
	__extends(MarkLineModel, _super);
	function MarkLineModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = MarkLineModel.type;
		return _this;
	}
	MarkLineModel.prototype.createMarkerModelFromSeries = function(markerOpt, masterMarkerModel, ecModel) {
		return new MarkLineModel(markerOpt, masterMarkerModel, ecModel);
	};
	MarkLineModel.type = "markLine";
	MarkLineModel.defaultOption = {
		z: 5,
		symbol: ["circle", "arrow"],
		symbolSize: [8, 16],
		symbolOffset: 0,
		precision: 2,
		tooltip: { trigger: "item" },
		label: {
			show: true,
			position: "end",
			distance: 5
		},
		lineStyle: { type: "dashed" },
		emphasis: {
			label: { show: true },
			lineStyle: { width: 3 }
		},
		animationEasing: "linear"
	};
	return MarkLineModel;
}(MarkerModel);
//#endregion
//#region node_modules/echarts/lib/component/marker/MarkLineView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var inner = makeInner();
var markLineTransform = function(seriesModel, coordSys, mlModel, item) {
	var data = seriesModel.getData();
	var itemArray;
	if (!isArray(item)) {
		var mlType = item.type;
		if (mlType === "min" || mlType === "max" || mlType === "average" || mlType === "median" || item.xAxis != null || item.yAxis != null) {
			var valueAxis = void 0;
			var value = void 0;
			if (item.yAxis != null || item.xAxis != null) {
				valueAxis = coordSys.getAxis(item.yAxis != null ? "y" : "x");
				value = retrieve(item.yAxis, item.xAxis);
			} else {
				var axisInfo = getAxisInfo(item, data, coordSys, seriesModel);
				valueAxis = axisInfo.valueAxis;
				value = numCalculate(data, getStackedDimension(data, axisInfo.valueDataDim), mlType);
			}
			var valueIndex = valueAxis.dim === "x" ? 0 : 1;
			var baseIndex = 1 - valueIndex;
			var mlFrom = clone$1(item);
			var mlTo = { coord: [] };
			mlFrom.type = null;
			mlFrom.coord = [];
			mlFrom.coord[baseIndex] = -Infinity;
			mlTo.coord[baseIndex] = Infinity;
			var precision = mlModel.get("precision");
			if (precision >= 0 && isNumber(value)) value = +value.toFixed(Math.min(precision, 20));
			mlFrom.coord[valueIndex] = mlTo.coord[valueIndex] = value;
			itemArray = [
				mlFrom,
				mlTo,
				{
					type: mlType,
					valueIndex: item.valueIndex,
					value
				}
			];
		} else itemArray = [];
	} else itemArray = item;
	var normalizedItem = [
		dataTransform(seriesModel, itemArray[0]),
		dataTransform(seriesModel, itemArray[1]),
		extend({}, itemArray[2])
	];
	normalizedItem[2].type = normalizedItem[2].type || null;
	merge(normalizedItem[2], normalizedItem[0]);
	merge(normalizedItem[2], normalizedItem[1]);
	return normalizedItem;
};
function isInfinity(val) {
	return !isNaN(val) && !isFinite(val);
}
function ifMarkLineHasOnlyDim(dimIndex, fromCoord, toCoord, coordSys) {
	var otherDimIndex = 1 - dimIndex;
	var dimName = coordSys.dimensions[dimIndex];
	return isInfinity(fromCoord[otherDimIndex]) && isInfinity(toCoord[otherDimIndex]) && fromCoord[dimIndex] === toCoord[dimIndex] && coordSys.getAxis(dimName).containData(fromCoord[dimIndex]);
}
function markLineFilter(coordSys, item) {
	if (coordSys.type === "cartesian2d") {
		var fromCoord = item[0].coord;
		var toCoord = item[1].coord;
		if (fromCoord && toCoord && (ifMarkLineHasOnlyDim(1, fromCoord, toCoord, coordSys) || ifMarkLineHasOnlyDim(0, fromCoord, toCoord, coordSys))) return true;
	}
	return dataFilter(coordSys, item[0]) && dataFilter(coordSys, item[1]);
}
function updateSingleMarkerEndLayout(data, idx, isFrom, seriesModel, api) {
	var coordSys = seriesModel.coordinateSystem;
	var itemModel = data.getItemModel(idx);
	var point;
	var xPx = parsePercent(itemModel.get("x"), api.getWidth());
	var yPx = parsePercent(itemModel.get("y"), api.getHeight());
	if (!isNaN(xPx) && !isNaN(yPx)) point = [xPx, yPx];
	else {
		if (seriesModel.getMarkerPosition) point = seriesModel.getMarkerPosition(data.getValues(data.dimensions, idx));
		else {
			var dims = coordSys.dimensions;
			var x = data.get(dims[0], idx);
			var y = data.get(dims[1], idx);
			point = coordSys.dataToPoint([x, y]);
		}
		if (isCoordinateSystemType(coordSys, "cartesian2d")) {
			var xAxis = coordSys.getAxis("x");
			var yAxis = coordSys.getAxis("y");
			var dims = coordSys.dimensions;
			if (isInfinity(data.get(dims[0], idx))) point[0] = xAxis.toGlobalCoord(xAxis.getExtent()[isFrom ? 0 : 1]);
			else if (isInfinity(data.get(dims[1], idx))) point[1] = yAxis.toGlobalCoord(yAxis.getExtent()[isFrom ? 0 : 1]);
		}
		if (!isNaN(xPx)) point[0] = xPx;
		if (!isNaN(yPx)) point[1] = yPx;
	}
	data.setItemLayout(idx, point);
}
var MarkLineView = function(_super) {
	__extends(MarkLineView, _super);
	function MarkLineView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = MarkLineView.type;
		return _this;
	}
	MarkLineView.prototype.updateTransform = function(markLineModel, ecModel, api) {
		ecModel.eachSeries(function(seriesModel) {
			var mlModel = MarkerModel.getMarkerModelFromSeries(seriesModel, "markLine");
			if (mlModel) {
				var mlData_1 = mlModel.getData();
				var fromData_1 = inner(mlModel).from;
				var toData_1 = inner(mlModel).to;
				fromData_1.each(function(idx) {
					updateSingleMarkerEndLayout(fromData_1, idx, true, seriesModel, api);
					updateSingleMarkerEndLayout(toData_1, idx, false, seriesModel, api);
				});
				mlData_1.each(function(idx) {
					mlData_1.setItemLayout(idx, [fromData_1.getItemLayout(idx), toData_1.getItemLayout(idx)]);
				});
				this.markerGroupMap.get(seriesModel.id).updateLayout();
			}
		}, this);
	};
	MarkLineView.prototype.renderSeries = function(seriesModel, mlModel, ecModel, api) {
		var coordSys = seriesModel.coordinateSystem;
		var seriesId = seriesModel.id;
		var seriesData = seriesModel.getData();
		var lineDrawMap = this.markerGroupMap;
		var lineDraw = lineDrawMap.get(seriesId) || lineDrawMap.set(seriesId, new LineDraw());
		this.group.add(lineDraw.group);
		var mlData = createList(coordSys, seriesModel, mlModel);
		var fromData = mlData.from;
		var toData = mlData.to;
		var lineData = mlData.line;
		inner(mlModel).from = fromData;
		inner(mlModel).to = toData;
		mlModel.setData(lineData);
		var symbolType = mlModel.get("symbol");
		var symbolSize = mlModel.get("symbolSize");
		var symbolRotate = mlModel.get("symbolRotate");
		var symbolOffset = mlModel.get("symbolOffset");
		if (!isArray(symbolType)) symbolType = [symbolType, symbolType];
		if (!isArray(symbolSize)) symbolSize = [symbolSize, symbolSize];
		if (!isArray(symbolRotate)) symbolRotate = [symbolRotate, symbolRotate];
		if (!isArray(symbolOffset)) symbolOffset = [symbolOffset, symbolOffset];
		mlData.from.each(function(idx) {
			updateDataVisualAndLayout(fromData, idx, true);
			updateDataVisualAndLayout(toData, idx, false);
		});
		lineData.each(function(idx) {
			var itemModel = lineData.getItemModel(idx);
			var lineStyle = itemModel.getModel("lineStyle").getLineStyle();
			lineData.setItemLayout(idx, [fromData.getItemLayout(idx), toData.getItemLayout(idx)]);
			var z2 = itemModel.get("z2");
			if (lineStyle.stroke == null) lineStyle.stroke = fromData.getItemVisual(idx, "style").fill;
			lineData.setItemVisual(idx, {
				z2: retrieve2(z2, 0),
				fromSymbolKeepAspect: fromData.getItemVisual(idx, "symbolKeepAspect"),
				fromSymbolOffset: fromData.getItemVisual(idx, "symbolOffset"),
				fromSymbolRotate: fromData.getItemVisual(idx, "symbolRotate"),
				fromSymbolSize: fromData.getItemVisual(idx, "symbolSize"),
				fromSymbol: fromData.getItemVisual(idx, "symbol"),
				toSymbolKeepAspect: toData.getItemVisual(idx, "symbolKeepAspect"),
				toSymbolOffset: toData.getItemVisual(idx, "symbolOffset"),
				toSymbolRotate: toData.getItemVisual(idx, "symbolRotate"),
				toSymbolSize: toData.getItemVisual(idx, "symbolSize"),
				toSymbol: toData.getItemVisual(idx, "symbol"),
				style: lineStyle
			});
		});
		lineDraw.updateData(lineData);
		mlData.line.eachItemGraphicEl(function(el) {
			getECData(el).dataModel = mlModel;
			el.traverse(function(child) {
				getECData(child).dataModel = mlModel;
			});
		});
		function updateDataVisualAndLayout(data, idx, isFrom) {
			var itemModel = data.getItemModel(idx);
			updateSingleMarkerEndLayout(data, idx, isFrom, seriesModel, api);
			var style = itemModel.getModel("itemStyle").getItemStyle();
			if (style.fill == null) style.fill = getVisualFromData(seriesData, "color");
			data.setItemVisual(idx, {
				symbolKeepAspect: itemModel.get("symbolKeepAspect"),
				symbolOffset: retrieve2(itemModel.get("symbolOffset", true), symbolOffset[isFrom ? 0 : 1]),
				symbolRotate: retrieve2(itemModel.get("symbolRotate", true), symbolRotate[isFrom ? 0 : 1]),
				symbolSize: retrieve2(itemModel.get("symbolSize"), symbolSize[isFrom ? 0 : 1]),
				symbol: retrieve2(itemModel.get("symbol", true), symbolType[isFrom ? 0 : 1]),
				style
			});
		}
		this.markKeep(lineDraw);
		lineDraw.group.silent = mlModel.get("silent") || seriesModel.get("silent");
	};
	MarkLineView.type = "markLine";
	return MarkLineView;
}(MarkerView);
function createList(coordSys, seriesModel, mlModel) {
	var coordDimsInfos;
	if (coordSys) coordDimsInfos = map(coordSys && coordSys.dimensions, function(coordDim) {
		var data = seriesModel.getData();
		var info = data.getDimensionInfo(data.mapDimension(coordDim)) || {};
		return extend(extend({}, info), {
			name: coordDim,
			ordinalMeta: null
		});
	});
	else coordDimsInfos = [{
		name: "value",
		type: "float"
	}];
	var fromData = new SeriesData(coordDimsInfos, mlModel);
	var toData = new SeriesData(coordDimsInfos, mlModel);
	var lineData = new SeriesData([], mlModel);
	var optData = map(mlModel.get("data"), curry$1(markLineTransform, seriesModel, coordSys, mlModel));
	if (coordSys) optData = filter(optData, curry$1(markLineFilter, coordSys));
	var dimValueGetter = createMarkerDimValueGetter(!!coordSys, coordDimsInfos);
	fromData.initData(map(optData, function(item) {
		return item[0];
	}), null, dimValueGetter);
	toData.initData(map(optData, function(item) {
		return item[1];
	}), null, dimValueGetter);
	lineData.initData(map(optData, function(item) {
		return item[2];
	}));
	lineData.hasItemOption = true;
	return {
		from: fromData,
		to: toData,
		line: lineData
	};
}
//#endregion
//#region node_modules/echarts/lib/component/marker/installMarkLine.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$3(registers) {
	registers.registerComponentModel(MarkLineModel);
	registers.registerComponentView(MarkLineView);
	registers.registerPreprocessor(function(opt) {
		if (checkMarkerInSeries(opt.series, "markLine")) opt.markLine = opt.markLine || {};
	});
}
//#endregion
//#region node_modules/echarts/lib/component/legend/LegendModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var getDefaultSelectorOptions = function(ecModel, type) {
	if (type === "all") return {
		type: "all",
		title: ecModel.getLocaleModel().get([
			"legend",
			"selector",
			"all"
		])
	};
	else if (type === "inverse") return {
		type: "inverse",
		title: ecModel.getLocaleModel().get([
			"legend",
			"selector",
			"inverse"
		])
	};
};
var LegendModel = function(_super) {
	__extends(LegendModel, _super);
	function LegendModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = LegendModel.type;
		_this.layoutMode = {
			type: "box",
			ignoreSize: true
		};
		return _this;
	}
	LegendModel.prototype.init = function(option, parentModel, ecModel) {
		this.mergeDefaultAndTheme(option, ecModel);
		option.selected = option.selected || {};
		this._updateSelector(option);
	};
	LegendModel.prototype.mergeOption = function(option, ecModel) {
		_super.prototype.mergeOption.call(this, option, ecModel);
		this._updateSelector(option);
	};
	LegendModel.prototype._updateSelector = function(option) {
		var selector = option.selector;
		var ecModel = this.ecModel;
		if (selector === true) selector = option.selector = ["all", "inverse"];
		if (isArray(selector)) each$2(selector, function(item, index) {
			isString(item) && (item = { type: item });
			selector[index] = merge(item, getDefaultSelectorOptions(ecModel, item.type));
		});
	};
	LegendModel.prototype.optionUpdated = function() {
		this._updateData(this.ecModel);
		var legendData = this._data;
		if (legendData[0] && this.get("selectedMode") === "single") {
			var hasSelected = false;
			for (var i = 0; i < legendData.length; i++) {
				var name_1 = legendData[i].get("name");
				if (this.isSelected(name_1)) {
					this.select(name_1);
					hasSelected = true;
					break;
				}
			}
			!hasSelected && this.select(legendData[0].get("name"));
		}
	};
	LegendModel.prototype._updateData = function(ecModel) {
		var potentialData = [];
		var availableNames = [];
		ecModel.eachRawSeries(function(seriesModel) {
			var seriesName = seriesModel.name;
			availableNames.push(seriesName);
			var isPotential;
			if (seriesModel.legendVisualProvider) {
				var names = seriesModel.legendVisualProvider.getAllNames();
				if (!ecModel.isSeriesFiltered(seriesModel)) availableNames = availableNames.concat(names);
				if (names.length) potentialData = potentialData.concat(names);
				else isPotential = true;
			} else isPotential = true;
			if (isPotential && isNameSpecified(seriesModel)) potentialData.push(seriesModel.name);
		});
		/**
		* @type {Array.<string>}
		* @private
		*/
		this._availableNames = availableNames;
		var rawData = this.get("data") || potentialData;
		var legendNameMap = createHashMap();
		var legendData = map(rawData, function(dataItem) {
			if (isString(dataItem) || isNumber(dataItem)) dataItem = { name: dataItem };
			if (legendNameMap.get(dataItem.name)) return null;
			legendNameMap.set(dataItem.name, true);
			return new Model(dataItem, this, this.ecModel);
		}, this);
		/**
		* @type {Array.<module:echarts/model/Model>}
		* @private
		*/
		this._data = filter(legendData, function(item) {
			return !!item;
		});
	};
	LegendModel.prototype.getData = function() {
		return this._data;
	};
	LegendModel.prototype.select = function(name) {
		var selected = this.option.selected;
		if (this.get("selectedMode") === "single") {
			var data = this._data;
			each$2(data, function(dataItem) {
				selected[dataItem.get("name")] = false;
			});
		}
		selected[name] = true;
	};
	LegendModel.prototype.unSelect = function(name) {
		if (this.get("selectedMode") !== "single") this.option.selected[name] = false;
	};
	LegendModel.prototype.toggleSelected = function(name) {
		var selected = this.option.selected;
		if (!selected.hasOwnProperty(name)) selected[name] = true;
		this[selected[name] ? "unSelect" : "select"](name);
	};
	LegendModel.prototype.allSelect = function() {
		var data = this._data;
		var selected = this.option.selected;
		each$2(data, function(dataItem) {
			selected[dataItem.get("name", true)] = true;
		});
	};
	LegendModel.prototype.inverseSelect = function() {
		var data = this._data;
		var selected = this.option.selected;
		each$2(data, function(dataItem) {
			var name = dataItem.get("name", true);
			if (!selected.hasOwnProperty(name)) selected[name] = true;
			selected[name] = !selected[name];
		});
	};
	LegendModel.prototype.isSelected = function(name) {
		var selected = this.option.selected;
		return !(selected.hasOwnProperty(name) && !selected[name]) && indexOf(this._availableNames, name) >= 0;
	};
	LegendModel.prototype.getOrient = function() {
		return this.get("orient") === "vertical" ? {
			index: 1,
			name: "vertical"
		} : {
			index: 0,
			name: "horizontal"
		};
	};
	LegendModel.type = "legend.plain";
	LegendModel.dependencies = ["series"];
	LegendModel.defaultOption = {
		z: 4,
		show: true,
		orient: "horizontal",
		left: "center",
		bottom: tokens.size.m,
		align: "auto",
		backgroundColor: tokens.color.transparent,
		borderColor: tokens.color.border,
		borderRadius: 0,
		borderWidth: 0,
		padding: 5,
		itemGap: 8,
		itemWidth: 25,
		itemHeight: 14,
		symbolRotate: "inherit",
		symbolKeepAspect: true,
		inactiveColor: tokens.color.disabled,
		inactiveBorderColor: tokens.color.disabled,
		inactiveBorderWidth: "auto",
		itemStyle: {
			color: "inherit",
			opacity: "inherit",
			borderColor: "inherit",
			borderWidth: "auto",
			borderCap: "inherit",
			borderJoin: "inherit",
			borderDashOffset: "inherit",
			borderMiterLimit: "inherit"
		},
		lineStyle: {
			width: "auto",
			color: "inherit",
			inactiveColor: tokens.color.disabled,
			inactiveWidth: 2,
			opacity: "inherit",
			type: "inherit",
			cap: "inherit",
			join: "inherit",
			dashOffset: "inherit",
			miterLimit: "inherit"
		},
		textStyle: { color: tokens.color.secondary },
		selectedMode: true,
		selector: false,
		selectorLabel: {
			show: true,
			borderRadius: 10,
			padding: [
				3,
				5,
				3,
				5
			],
			fontSize: 12,
			fontFamily: "sans-serif",
			color: tokens.color.tertiary,
			borderWidth: 1,
			borderColor: tokens.color.border
		},
		emphasis: { selectorLabel: {
			show: true,
			color: tokens.color.quaternary
		} },
		selectorPosition: "auto",
		selectorItemGap: 7,
		selectorButtonGap: 10,
		tooltip: { show: false },
		triggerEvent: false
	};
	return LegendModel;
}(ComponentModel);
//#endregion
//#region node_modules/echarts/lib/component/legend/LegendView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var curry = curry$1;
var each = each$2;
var Group$1 = Group$2;
var LegendView = function(_super) {
	__extends(LegendView, _super);
	function LegendView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = LegendView.type;
		_this.newlineDisabled = false;
		return _this;
	}
	LegendView.prototype.init = function() {
		this.group.add(this._contentGroup = new Group$1());
		this.group.add(this._selectorGroup = new Group$1());
		this._isFirstRender = true;
	};
	/**
	* @protected
	*/
	LegendView.prototype.getContentGroup = function() {
		return this._contentGroup;
	};
	/**
	* @protected
	*/
	LegendView.prototype.getSelectorGroup = function() {
		return this._selectorGroup;
	};
	/**
	* @override
	*/
	LegendView.prototype.render = function(legendModel, ecModel, api) {
		var isFirstRender = this._isFirstRender;
		this._isFirstRender = false;
		this.resetInner();
		if (!legendModel.get("show", true)) return;
		var itemAlign = legendModel.get("align");
		var orient = legendModel.get("orient");
		if (!itemAlign || itemAlign === "auto") itemAlign = legendModel.get("left") === "right" && orient === "vertical" ? "right" : "left";
		var selector = legendModel.get("selector", true);
		var selectorPosition = legendModel.get("selectorPosition", true);
		if (selector && (!selectorPosition || selectorPosition === "auto")) selectorPosition = orient === "horizontal" ? "end" : "start";
		this.renderInner(itemAlign, legendModel, ecModel, api, selector, orient, selectorPosition);
		var refContainer = createBoxLayoutReference(legendModel, api).refContainer;
		var positionInfo = legendModel.getBoxLayoutParams();
		var padding = legendModel.get("padding");
		var maxSize = getLayoutRect(positionInfo, refContainer, padding);
		var mainRect = this.layoutInner(legendModel, itemAlign, maxSize, isFirstRender, selector, selectorPosition);
		var layoutRect = getLayoutRect(defaults({
			width: mainRect.width,
			height: mainRect.height
		}, positionInfo), refContainer, padding);
		this.group.x = layoutRect.x - mainRect.x;
		this.group.y = layoutRect.y - mainRect.y;
		this.group.markRedraw();
		this.group.add(this._backgroundEl = makeBackground(mainRect, legendModel));
	};
	LegendView.prototype.resetInner = function() {
		this.getContentGroup().removeAll();
		this._backgroundEl && this.group.remove(this._backgroundEl);
		this.getSelectorGroup().removeAll();
	};
	LegendView.prototype.renderInner = function(itemAlign, legendModel, ecModel, api, selector, orient, selectorPosition) {
		var contentGroup = this.getContentGroup();
		var legendDrawnMap = createHashMap();
		var selectMode = legendModel.get("selectedMode");
		var triggerEvent = legendModel.get("triggerEvent");
		var excludeSeriesId = [];
		ecModel.eachRawSeries(function(seriesModel) {
			!seriesModel.get("legendHoverLink") && excludeSeriesId.push(seriesModel.id);
		});
		each(legendModel.getData(), function(legendItemModel, dataIndex) {
			var _this = this;
			var name = legendItemModel.get("name");
			if (!this.newlineDisabled && (name === "" || name === "\n")) {
				var g = new Group$1();
				g.newline = true;
				contentGroup.add(g);
				return;
			}
			var seriesModel = ecModel.getSeriesByName(name)[0];
			if (legendDrawnMap.get(name)) return;
			if (seriesModel) {
				var data = seriesModel.getData();
				var lineVisualStyle = data.getVisual("legendLineStyle") || {};
				var legendIcon = data.getVisual("legendIcon");
				/**
				* `data.getVisual('style')` may be the color from the register
				* in series. For example, for line series,
				*/
				var style = data.getVisual("style");
				var itemGroup = this._createItem(seriesModel, name, dataIndex, legendItemModel, legendModel, itemAlign, lineVisualStyle, style, legendIcon, selectMode, api);
				itemGroup.on("click", curry(dispatchSelectAction, name, null, api, excludeSeriesId)).on("mouseover", curry(dispatchHighlightAction, seriesModel.name, null, api, excludeSeriesId)).on("mouseout", curry(dispatchDownplayAction, seriesModel.name, null, api, excludeSeriesId));
				if (ecModel.ssr) itemGroup.eachChild(function(child) {
					var ecData = getECData(child);
					ecData.seriesIndex = seriesModel.seriesIndex;
					ecData.dataIndex = dataIndex;
					ecData.ssrType = "legend";
				});
				if (triggerEvent) itemGroup.eachChild(function(child) {
					_this.packEventData(child, legendModel, seriesModel, dataIndex, name);
				});
				legendDrawnMap.set(name, true);
			} else ecModel.eachRawSeries(function(seriesModel) {
				var _this = this;
				if (legendDrawnMap.get(name)) return;
				if (seriesModel.legendVisualProvider) {
					var provider = seriesModel.legendVisualProvider;
					if (!provider.containName(name)) return;
					var idx = provider.indexOfName(name);
					var style = provider.getItemVisual(idx, "style");
					var legendIcon = provider.getItemVisual(idx, "legendIcon");
					var colorArr = parse(style.fill);
					if (colorArr && colorArr[3] === 0) {
						colorArr[3] = .2;
						style = extend(extend({}, style), { fill: stringify(colorArr, "rgba") });
					}
					var itemGroup = this._createItem(seriesModel, name, dataIndex, legendItemModel, legendModel, itemAlign, {}, style, legendIcon, selectMode, api);
					itemGroup.on("click", curry(dispatchSelectAction, null, name, api, excludeSeriesId)).on("mouseover", curry(dispatchHighlightAction, null, name, api, excludeSeriesId)).on("mouseout", curry(dispatchDownplayAction, null, name, api, excludeSeriesId));
					if (ecModel.ssr) itemGroup.eachChild(function(child) {
						var ecData = getECData(child);
						ecData.seriesIndex = seriesModel.seriesIndex;
						ecData.dataIndex = dataIndex;
						ecData.ssrType = "legend";
					});
					if (triggerEvent) itemGroup.eachChild(function(child) {
						_this.packEventData(child, legendModel, seriesModel, dataIndex, name);
					});
					legendDrawnMap.set(name, true);
				}
			}, this);
		}, this);
		if (selector) this._createSelector(selector, legendModel, api, orient, selectorPosition);
	};
	LegendView.prototype.packEventData = function(el, legendModel, seriesModel, dataIndex, name) {
		var eventData = {
			componentType: "legend",
			componentIndex: legendModel.componentIndex,
			dataIndex,
			value: name,
			seriesIndex: seriesModel.seriesIndex
		};
		getECData(el).eventData = eventData;
	};
	LegendView.prototype._createSelector = function(selector, legendModel, api, orient, selectorPosition) {
		var selectorGroup = this.getSelectorGroup();
		each(selector, function createSelectorButton(selectorItem) {
			var type = selectorItem.type;
			var labelText = new ZRText({
				style: {
					x: 0,
					y: 0,
					align: "center",
					verticalAlign: "middle"
				},
				onclick: function() {
					api.dispatchAction({
						type: type === "all" ? "legendAllSelect" : "legendInverseSelect",
						legendId: legendModel.id
					});
				}
			});
			selectorGroup.add(labelText);
			var labelModel = legendModel.getModel("selectorLabel");
			var emphasisLabelModel = legendModel.getModel(["emphasis", "selectorLabel"]);
			setLabelStyle(labelText, {
				normal: labelModel,
				emphasis: emphasisLabelModel
			}, { defaultText: selectorItem.title });
			enableHoverEmphasis(labelText);
		});
	};
	LegendView.prototype._createItem = function(seriesModel, name, dataIndex, legendItemModel, legendModel, itemAlign, lineVisualStyle, itemVisualStyle, legendIcon, selectMode, api) {
		var drawType = seriesModel.visualDrawType;
		var itemWidth = legendModel.get("itemWidth");
		var itemHeight = legendModel.get("itemHeight");
		var isSelected = legendModel.isSelected(name);
		var iconRotate = legendItemModel.get("symbolRotate");
		var symbolKeepAspect = legendItemModel.get("symbolKeepAspect");
		var legendIconType = legendItemModel.get("icon");
		legendIcon = legendIconType || legendIcon || "roundRect";
		var style = getLegendStyle(legendIcon, legendItemModel, lineVisualStyle, itemVisualStyle, drawType, isSelected, api);
		var itemGroup = new Group$1();
		var textStyleModel = legendItemModel.getModel("textStyle");
		if (isFunction(seriesModel.getLegendIcon) && (!legendIconType || legendIconType === "inherit")) itemGroup.add(seriesModel.getLegendIcon({
			itemWidth,
			itemHeight,
			icon: legendIcon,
			iconRotate,
			itemStyle: style.itemStyle,
			lineStyle: style.lineStyle,
			symbolKeepAspect
		}));
		else {
			var rotate = legendIconType === "inherit" && seriesModel.getData().getVisual("symbol") ? iconRotate === "inherit" ? seriesModel.getData().getVisual("symbolRotate") : iconRotate : 0;
			itemGroup.add(getDefaultLegendIcon({
				itemWidth,
				itemHeight,
				icon: legendIcon,
				iconRotate: rotate,
				itemStyle: style.itemStyle,
				lineStyle: style.lineStyle,
				symbolKeepAspect
			}));
		}
		var textX = itemAlign === "left" ? itemWidth + 5 : -5;
		var textAlign = itemAlign;
		var formatter = legendModel.get("formatter");
		var content = name;
		if (isString(formatter) && formatter) content = formatter.replace("{name}", name != null ? name : "");
		else if (isFunction(formatter)) content = formatter(name);
		var textColor = isSelected ? textStyleModel.getTextColor() : legendItemModel.get("inactiveColor");
		itemGroup.add(new ZRText({ style: createTextStyle(textStyleModel, {
			text: content,
			x: textX,
			y: itemHeight / 2,
			fill: textColor,
			align: textAlign,
			verticalAlign: "middle"
		}, { inheritColor: textColor }) }));
		var hitRect = new Rect({
			shape: itemGroup.getBoundingRect(),
			style: { fill: "transparent" }
		});
		var tooltipModel = legendItemModel.getModel("tooltip");
		if (tooltipModel.get("show")) setTooltipConfig({
			el: hitRect,
			componentModel: legendModel,
			itemName: name,
			itemTooltipOption: tooltipModel.option
		});
		itemGroup.add(hitRect);
		itemGroup.eachChild(function(child) {
			child.silent = true;
		});
		hitRect.silent = !selectMode;
		this.getContentGroup().add(itemGroup);
		enableHoverEmphasis(itemGroup);
		itemGroup.__legendDataIndex = dataIndex;
		return itemGroup;
	};
	LegendView.prototype.layoutInner = function(legendModel, itemAlign, maxSize, isFirstRender, selector, selectorPosition) {
		var contentGroup = this.getContentGroup();
		var selectorGroup = this.getSelectorGroup();
		box(legendModel.get("orient"), contentGroup, legendModel.get("itemGap"), maxSize.width, maxSize.height);
		var contentRect = contentGroup.getBoundingRect();
		var contentPos = [-contentRect.x, -contentRect.y];
		selectorGroup.markRedraw();
		contentGroup.markRedraw();
		if (selector) {
			box("horizontal", selectorGroup, legendModel.get("selectorItemGap", true));
			var selectorRect = selectorGroup.getBoundingRect();
			var selectorPos = [-selectorRect.x, -selectorRect.y];
			var selectorButtonGap = legendModel.get("selectorButtonGap", true);
			var orientIdx = legendModel.getOrient().index;
			var wh = orientIdx === 0 ? "width" : "height";
			var hw = orientIdx === 0 ? "height" : "width";
			var yx = orientIdx === 0 ? "y" : "x";
			if (selectorPosition === "end") selectorPos[orientIdx] += contentRect[wh] + selectorButtonGap;
			else contentPos[orientIdx] += selectorRect[wh] + selectorButtonGap;
			selectorPos[1 - orientIdx] += contentRect[hw] / 2 - selectorRect[hw] / 2;
			selectorGroup.x = selectorPos[0];
			selectorGroup.y = selectorPos[1];
			contentGroup.x = contentPos[0];
			contentGroup.y = contentPos[1];
			var mainRect = {
				x: 0,
				y: 0
			};
			mainRect[wh] = contentRect[wh] + selectorButtonGap + selectorRect[wh];
			mainRect[hw] = Math.max(contentRect[hw], selectorRect[hw]);
			mainRect[yx] = Math.min(0, selectorRect[yx] + selectorPos[1 - orientIdx]);
			return mainRect;
		} else {
			contentGroup.x = contentPos[0];
			contentGroup.y = contentPos[1];
			return this.group.getBoundingRect();
		}
	};
	/**
	* @protected
	*/
	LegendView.prototype.remove = function() {
		this.getContentGroup().removeAll();
		this._isFirstRender = true;
	};
	LegendView.type = "legend.plain";
	return LegendView;
}(ComponentView);
function getLegendStyle(iconType, legendItemModel, lineVisualStyle, itemVisualStyle, drawType, isSelected, api) {
	/**
	* Use series style if is inherit;
	* elsewise, use legend style
	*/
	function handleCommonProps(style, visualStyle) {
		if (style.lineWidth === "auto") style.lineWidth = visualStyle.lineWidth > 0 ? 2 : 0;
		each(style, function(propVal, propName) {
			style[propName] === "inherit" && (style[propName] = visualStyle[propName]);
		});
	}
	var itemStyleModel = legendItemModel.getModel("itemStyle");
	var itemStyle = itemStyleModel.getItemStyle();
	var iconBrushType = iconType.lastIndexOf("empty", 0) === 0 ? "fill" : "stroke";
	var decalStyle = itemStyleModel.getShallow("decal");
	itemStyle.decal = !decalStyle || decalStyle === "inherit" ? itemVisualStyle.decal : createOrUpdatePatternFromDecal(decalStyle, api);
	if (itemStyle.fill === "inherit")
 /**
	* Series with visualDrawType as 'stroke' should have
	* series stroke as legend fill
	*/
	itemStyle.fill = itemVisualStyle[drawType];
	if (itemStyle.stroke === "inherit")
 /**
	* icon type with "emptyXXX" should use fill color
	* in visual style
	*/
	itemStyle.stroke = itemVisualStyle[iconBrushType];
	if (itemStyle.opacity === "inherit")
 /**
	* Use lineStyle.opacity if drawType is stroke
	*/
	itemStyle.opacity = (drawType === "fill" ? itemVisualStyle : lineVisualStyle).opacity;
	handleCommonProps(itemStyle, itemVisualStyle);
	var legendLineModel = legendItemModel.getModel("lineStyle");
	var lineStyle = legendLineModel.getLineStyle();
	handleCommonProps(lineStyle, lineVisualStyle);
	itemStyle.fill === "auto" && (itemStyle.fill = itemVisualStyle.fill);
	itemStyle.stroke === "auto" && (itemStyle.stroke = itemVisualStyle.fill);
	lineStyle.stroke === "auto" && (lineStyle.stroke = itemVisualStyle.fill);
	if (!isSelected) {
		var borderWidth = legendItemModel.get("inactiveBorderWidth");
		/**
		* Since stroke is set to be inactiveBorderColor, it may occur that
		* there is no border in series but border in legend, so we need to
		* use border only when series has border if is set to be auto
		*/
		var visualHasBorder = itemStyle[iconBrushType];
		itemStyle.lineWidth = borderWidth === "auto" ? itemVisualStyle.lineWidth > 0 && visualHasBorder ? 2 : 0 : itemStyle.lineWidth;
		itemStyle.fill = legendItemModel.get("inactiveColor");
		itemStyle.stroke = legendItemModel.get("inactiveBorderColor");
		lineStyle.stroke = legendLineModel.get("inactiveColor");
		lineStyle.lineWidth = legendLineModel.get("inactiveWidth");
	}
	return {
		itemStyle,
		lineStyle
	};
}
function getDefaultLegendIcon(opt) {
	var symboType = opt.icon || "roundRect";
	var icon = createSymbol$1(symboType, 0, 0, opt.itemWidth, opt.itemHeight, opt.itemStyle.fill, opt.symbolKeepAspect);
	icon.setStyle(opt.itemStyle);
	icon.rotation = (opt.iconRotate || 0) * Math.PI / 180;
	icon.setOrigin([opt.itemWidth / 2, opt.itemHeight / 2]);
	if (symboType.indexOf("empty") > -1) {
		icon.style.stroke = icon.style.fill;
		icon.style.fill = tokens.color.neutral00;
		icon.style.lineWidth = 2;
	}
	return icon;
}
function dispatchSelectAction(seriesName, dataName, api, excludeSeriesId) {
	dispatchDownplayAction(seriesName, dataName, api, excludeSeriesId);
	api.dispatchAction({
		type: "legendToggleSelect",
		name: seriesName != null ? seriesName : dataName
	});
	dispatchHighlightAction(seriesName, dataName, api, excludeSeriesId);
}
function dispatchHighlightAction(seriesName, dataName, api, excludeSeriesId) {
	if (!api.usingTHL()) api.dispatchAction({
		type: "highlight",
		seriesName,
		name: dataName,
		excludeSeriesId
	});
}
function dispatchDownplayAction(seriesName, dataName, api, excludeSeriesId) {
	if (!api.usingTHL()) api.dispatchAction({
		type: "downplay",
		seriesName,
		name: dataName,
		excludeSeriesId
	});
}
//#endregion
//#region node_modules/echarts/lib/component/legend/legendAction.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function legendSelectActionHandler(methodName, payload, ecModel) {
	var isAllSelect = methodName === "allSelect" || methodName === "inverseSelect";
	var selectedMap = {};
	var actionLegendIndices = [];
	ecModel.eachComponent({
		mainType: "legend",
		query: payload
	}, function(legendModel) {
		if (isAllSelect) legendModel[methodName]();
		else legendModel[methodName](payload.name);
		makeSelectedMap(legendModel, selectedMap);
		actionLegendIndices.push(legendModel.componentIndex);
	});
	var allSelectedMap = {};
	ecModel.eachComponent("legend", function(legendModel) {
		each$2(selectedMap, function(isSelected, name) {
			legendModel[isSelected ? "select" : "unSelect"](name);
		});
		makeSelectedMap(legendModel, allSelectedMap);
	});
	return isAllSelect ? {
		selected: allSelectedMap,
		legendIndex: actionLegendIndices
	} : {
		name: payload.name,
		selected: allSelectedMap
	};
}
function makeSelectedMap(legendModel, out) {
	var selectedMap = out || {};
	each$2(legendModel.getData(), function(model) {
		var name = model.get("name");
		if (name === "\n" || name === "") return;
		var isItemSelected = legendModel.isSelected(name);
		if (hasOwn(selectedMap, name)) selectedMap[name] = selectedMap[name] && isItemSelected;
		else selectedMap[name] = isItemSelected;
	});
	return selectedMap;
}
function installLegendAction(registers) {
	/**
	* @event legendToggleSelect
	* @type {Object}
	* @property {string} type 'legendToggleSelect'
	* @property {string} [from]
	* @property {string} name Series name or data item name
	*/
	registers.registerAction("legendToggleSelect", "legendselectchanged", curry$1(legendSelectActionHandler, "toggleSelected"));
	registers.registerAction("legendAllSelect", "legendselectall", curry$1(legendSelectActionHandler, "allSelect"));
	registers.registerAction("legendInverseSelect", "legendinverseselect", curry$1(legendSelectActionHandler, "inverseSelect"));
	/**
	* @event legendSelect
	* @type {Object}
	* @property {string} type 'legendSelect'
	* @property {string} name Series name or data item name
	*/
	registers.registerAction("legendSelect", "legendselected", curry$1(legendSelectActionHandler, "select"));
	/**
	* @event legendUnSelect
	* @type {Object}
	* @property {string} type 'legendUnSelect'
	* @property {string} name Series name or data item name
	*/
	registers.registerAction("legendUnSelect", "legendunselected", curry$1(legendSelectActionHandler, "unSelect"));
}
//#endregion
//#region node_modules/echarts/lib/component/legend/legendFilter.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var legendFilterStageHandler = createSimpleOverallStageHandler2(legendFilter);
function legendFilter(ecModel) {
	var legendModels = ecModel.findComponents({ mainType: "legend" });
	if (legendModels && legendModels.length) ecModel.filterSeries(function(series) {
		for (var i = 0; i < legendModels.length; i++) if (!legendModels[i].isSelected(series.name)) return false;
		return true;
	});
}
//#endregion
//#region node_modules/echarts/lib/component/legend/installLegendPlain.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$7(registers) {
	registers.registerComponentModel(LegendModel);
	registers.registerComponentView(LegendView);
	registers.registerProcessor(registers.PRIORITY.PROCESSOR.SERIES_FILTER, legendFilterStageHandler);
	registers.registerSubTypeDefaulter("legend", function() {
		return "plain";
	});
	installLegendAction(registers);
}
//#endregion
//#region node_modules/echarts/lib/component/legend/ScrollableLegendModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var ScrollableLegendModel = function(_super) {
	__extends(ScrollableLegendModel, _super);
	function ScrollableLegendModel() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = ScrollableLegendModel.type;
		return _this;
	}
	/**
	* @param {number} scrollDataIndex
	*/
	ScrollableLegendModel.prototype.setScrollDataIndex = function(scrollDataIndex) {
		this.option.scrollDataIndex = scrollDataIndex;
	};
	ScrollableLegendModel.prototype.init = function(option, parentModel, ecModel) {
		var inputPositionParams = getLayoutParams(option);
		_super.prototype.init.call(this, option, parentModel, ecModel);
		mergeAndNormalizeLayoutParams(this, option, inputPositionParams);
	};
	/**
	* @override
	*/
	ScrollableLegendModel.prototype.mergeOption = function(option, ecModel) {
		_super.prototype.mergeOption.call(this, option, ecModel);
		mergeAndNormalizeLayoutParams(this, this.option, option);
	};
	ScrollableLegendModel.type = "legend.scroll";
	ScrollableLegendModel.defaultOption = inheritDefaultOption(LegendModel.defaultOption, {
		scrollDataIndex: 0,
		pageButtonItemGap: 5,
		pageButtonGap: null,
		pageButtonPosition: "end",
		pageFormatter: "{current}/{total}",
		pageIcons: {
			horizontal: ["M0,0L12,-10L12,10z", "M0,0L-12,-10L-12,10z"],
			vertical: ["M0,0L20,0L10,-20z", "M0,0L20,0L10,20z"]
		},
		pageIconColor: tokens.color.accent50,
		pageIconInactiveColor: tokens.color.accent10,
		pageIconSize: 15,
		pageTextStyle: { color: tokens.color.tertiary },
		animationDurationUpdate: 800
	});
	return ScrollableLegendModel;
}(LegendModel);
function mergeAndNormalizeLayoutParams(legendModel, target, raw) {
	var orient = legendModel.getOrient();
	var ignoreSize = [1, 1];
	ignoreSize[orient.index] = 0;
	mergeLayoutParam(target, raw, {
		type: "box",
		ignoreSize: !!ignoreSize
	});
}
//#endregion
//#region node_modules/echarts/lib/component/legend/ScrollableLegendView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Separate legend and scrollable legend to reduce package size.
*/
var Group = Group$2;
var WH = ["width", "height"];
var XY = ["x", "y"];
var ScrollableLegendView = function(_super) {
	__extends(ScrollableLegendView, _super);
	function ScrollableLegendView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = ScrollableLegendView.type;
		_this.newlineDisabled = true;
		_this._currentIndex = 0;
		return _this;
	}
	ScrollableLegendView.prototype.init = function() {
		_super.prototype.init.call(this);
		this.group.add(this._containerGroup = new Group());
		this._containerGroup.add(this.getContentGroup());
		this.group.add(this._controllerGroup = new Group());
	};
	/**
	* @override
	*/
	ScrollableLegendView.prototype.resetInner = function() {
		_super.prototype.resetInner.call(this);
		this._controllerGroup.removeAll();
		this._containerGroup.removeClipPath();
		this._containerGroup.__rectSize = null;
	};
	/**
	* @override
	*/
	ScrollableLegendView.prototype.renderInner = function(itemAlign, legendModel, ecModel, api, selector, orient, selectorPosition) {
		var self = this;
		_super.prototype.renderInner.call(this, itemAlign, legendModel, ecModel, api, selector, orient, selectorPosition);
		var controllerGroup = this._controllerGroup;
		var pageIconSize = legendModel.get("pageIconSize", true);
		var pageIconSizeArr = isArray(pageIconSize) ? pageIconSize : [pageIconSize, pageIconSize];
		createPageButton("pagePrev", 0);
		var pageTextStyleModel = legendModel.getModel("pageTextStyle");
		controllerGroup.add(new ZRText({
			name: "pageText",
			style: {
				text: "xx/xx",
				fill: pageTextStyleModel.getTextColor(),
				font: pageTextStyleModel.getFont(),
				verticalAlign: "middle",
				align: "center"
			},
			silent: true
		}));
		createPageButton("pageNext", 1);
		function createPageButton(name, iconIdx) {
			var pageDataIndexName = name + "DataIndex";
			var icon = createIcon(legendModel.get("pageIcons", true)[legendModel.getOrient().name][iconIdx], { onclick: bind$1(self._pageGo, self, pageDataIndexName, legendModel, api) }, {
				x: -pageIconSizeArr[0] / 2,
				y: -pageIconSizeArr[1] / 2,
				width: pageIconSizeArr[0],
				height: pageIconSizeArr[1]
			});
			icon.name = name;
			controllerGroup.add(icon);
		}
	};
	/**
	* @override
	*/
	ScrollableLegendView.prototype.layoutInner = function(legendModel, itemAlign, maxSize, isFirstRender, selector, selectorPosition) {
		var selectorGroup = this.getSelectorGroup();
		var orientIdx = legendModel.getOrient().index;
		var wh = WH[orientIdx];
		var xy = XY[orientIdx];
		var hw = WH[1 - orientIdx];
		var yx = XY[1 - orientIdx];
		selector && box("horizontal", selectorGroup, legendModel.get("selectorItemGap", true));
		var selectorButtonGap = legendModel.get("selectorButtonGap", true);
		var selectorRect = selectorGroup.getBoundingRect();
		var selectorPos = [-selectorRect.x, -selectorRect.y];
		var processMaxSize = clone$1(maxSize);
		selector && (processMaxSize[wh] = maxSize[wh] - selectorRect[wh] - selectorButtonGap);
		var mainRect = this._layoutContentAndController(legendModel, isFirstRender, processMaxSize, orientIdx, wh, hw, yx, xy);
		if (selector) {
			if (selectorPosition === "end") selectorPos[orientIdx] += mainRect[wh] + selectorButtonGap;
			else {
				var offset = selectorRect[wh] + selectorButtonGap;
				selectorPos[orientIdx] -= offset;
				mainRect[xy] -= offset;
			}
			mainRect[wh] += selectorRect[wh] + selectorButtonGap;
			selectorPos[1 - orientIdx] += mainRect[yx] + mainRect[hw] / 2 - selectorRect[hw] / 2;
			mainRect[hw] = Math.max(mainRect[hw], selectorRect[hw]);
			mainRect[yx] = Math.min(mainRect[yx], selectorRect[yx] + selectorPos[1 - orientIdx]);
			selectorGroup.x = selectorPos[0];
			selectorGroup.y = selectorPos[1];
			selectorGroup.markRedraw();
		}
		return mainRect;
	};
	ScrollableLegendView.prototype._layoutContentAndController = function(legendModel, isFirstRender, maxSize, orientIdx, wh, hw, yx, xy) {
		var contentGroup = this.getContentGroup();
		var containerGroup = this._containerGroup;
		var controllerGroup = this._controllerGroup;
		box(legendModel.get("orient"), contentGroup, legendModel.get("itemGap"), !orientIdx ? null : maxSize.width, orientIdx ? null : maxSize.height);
		box("horizontal", controllerGroup, legendModel.get("pageButtonItemGap", true));
		var contentRect = contentGroup.getBoundingRect();
		var controllerRect = controllerGroup.getBoundingRect();
		var showController = this._showController = contentRect[wh] > maxSize[wh];
		var contentPos = [-contentRect.x, -contentRect.y];
		if (!isFirstRender) contentPos[orientIdx] = contentGroup[xy];
		var containerPos = [0, 0];
		var controllerPos = [-controllerRect.x, -controllerRect.y];
		var pageButtonGap = retrieve2(legendModel.get("pageButtonGap", true), legendModel.get("itemGap", true));
		if (showController) {
			if (legendModel.get("pageButtonPosition", true) === "end") controllerPos[orientIdx] += maxSize[wh] - controllerRect[wh];
			else containerPos[orientIdx] += controllerRect[wh] + pageButtonGap;
		}
		controllerPos[1 - orientIdx] += contentRect[hw] / 2 - controllerRect[hw] / 2;
		contentGroup.setPosition(contentPos);
		containerGroup.setPosition(containerPos);
		controllerGroup.setPosition(controllerPos);
		var mainRect = {
			x: 0,
			y: 0
		};
		mainRect[wh] = showController ? maxSize[wh] : contentRect[wh];
		mainRect[hw] = Math.max(contentRect[hw], controllerRect[hw]);
		mainRect[yx] = Math.min(0, controllerRect[yx] + controllerPos[1 - orientIdx]);
		containerGroup.__rectSize = maxSize[wh];
		if (showController) {
			var clipShape = {
				x: 0,
				y: 0
			};
			clipShape[wh] = Math.max(maxSize[wh] - controllerRect[wh] - pageButtonGap, 0);
			clipShape[hw] = mainRect[hw];
			containerGroup.setClipPath(new Rect({ shape: clipShape }));
			containerGroup.__rectSize = clipShape[wh];
		} else controllerGroup.eachChild(function(child) {
			child.attr({
				invisible: true,
				silent: true
			});
		});
		var pageInfo = this._getPageInfo(legendModel);
		pageInfo.pageIndex != null && updateProps$1(contentGroup, {
			x: pageInfo.contentPosition[0],
			y: pageInfo.contentPosition[1]
		}, showController ? legendModel : null);
		this._updatePageInfoView(legendModel, pageInfo);
		return mainRect;
	};
	ScrollableLegendView.prototype._pageGo = function(to, legendModel, api) {
		var scrollDataIndex = this._getPageInfo(legendModel)[to];
		scrollDataIndex != null && api.dispatchAction({
			type: "legendScroll",
			scrollDataIndex,
			legendId: legendModel.id
		});
	};
	ScrollableLegendView.prototype._updatePageInfoView = function(legendModel, pageInfo) {
		var controllerGroup = this._controllerGroup;
		each$2(["pagePrev", "pageNext"], function(name) {
			var canJump = pageInfo[name + "DataIndex"] != null;
			var icon = controllerGroup.childOfName(name);
			if (icon) {
				icon.setStyle("fill", canJump ? legendModel.get("pageIconColor", true) : legendModel.get("pageIconInactiveColor", true));
				icon.cursor = canJump ? "pointer" : "default";
			}
		});
		var pageText = controllerGroup.childOfName("pageText");
		var pageFormatter = legendModel.get("pageFormatter");
		var pageIndex = pageInfo.pageIndex;
		var current = pageIndex != null ? pageIndex + 1 : 0;
		var total = pageInfo.pageCount;
		pageText && pageFormatter && pageText.setStyle("text", isString(pageFormatter) ? pageFormatter.replace("{current}", current == null ? "" : current + "").replace("{total}", total == null ? "" : total + "") : pageFormatter({
			current,
			total
		}));
	};
	/**
	*  contentPosition: Array.<number>, null when data item not found.
	*  pageIndex: number, null when data item not found.
	*  pageCount: number, always be a number, can be 0.
	*  pagePrevDataIndex: number, null when no previous page.
	*  pageNextDataIndex: number, null when no next page.
	* }
	*/
	ScrollableLegendView.prototype._getPageInfo = function(legendModel) {
		var scrollDataIndex = legendModel.get("scrollDataIndex", true);
		var contentGroup = this.getContentGroup();
		var containerRectSize = this._containerGroup.__rectSize;
		var orientIdx = legendModel.getOrient().index;
		var wh = WH[orientIdx];
		var xy = XY[orientIdx];
		var targetItemIndex = this._findTargetItemIndex(scrollDataIndex);
		var children = contentGroup.children();
		var targetItem = children[targetItemIndex];
		var itemCount = children.length;
		var pCount = !itemCount ? 0 : 1;
		var result = {
			contentPosition: [contentGroup.x, contentGroup.y],
			pageCount: pCount,
			pageIndex: pCount - 1,
			pagePrevDataIndex: null,
			pageNextDataIndex: null
		};
		if (!targetItem) return result;
		var targetItemInfo = getItemInfo(targetItem);
		result.contentPosition[orientIdx] = -targetItemInfo.s;
		for (var i = targetItemIndex + 1, winStartItemInfo = targetItemInfo, winEndItemInfo = targetItemInfo, currItemInfo = null; i <= itemCount; ++i) {
			currItemInfo = getItemInfo(children[i]);
			if (!currItemInfo && winEndItemInfo.e > winStartItemInfo.s + containerRectSize || currItemInfo && !intersect(currItemInfo, winStartItemInfo.s)) {
				if (winEndItemInfo.i > winStartItemInfo.i) winStartItemInfo = winEndItemInfo;
				else winStartItemInfo = currItemInfo;
				if (winStartItemInfo) {
					if (result.pageNextDataIndex == null) result.pageNextDataIndex = winStartItemInfo.i;
					++result.pageCount;
				}
			}
			winEndItemInfo = currItemInfo;
		}
		for (var i = targetItemIndex - 1, winStartItemInfo = targetItemInfo, winEndItemInfo = targetItemInfo, currItemInfo = null; i >= -1; --i) {
			currItemInfo = getItemInfo(children[i]);
			if ((!currItemInfo || !intersect(winEndItemInfo, currItemInfo.s)) && winStartItemInfo.i < winEndItemInfo.i) {
				winEndItemInfo = winStartItemInfo;
				if (result.pagePrevDataIndex == null) result.pagePrevDataIndex = winStartItemInfo.i;
				++result.pageCount;
				++result.pageIndex;
			}
			winStartItemInfo = currItemInfo;
		}
		return result;
		function getItemInfo(el) {
			if (el) {
				var itemRect = el.getBoundingRect();
				var start = itemRect[xy] + el[xy];
				return {
					s: start,
					e: start + itemRect[wh],
					i: el.__legendDataIndex
				};
			}
		}
		function intersect(itemInfo, winStart) {
			return itemInfo.e >= winStart && itemInfo.s <= winStart + containerRectSize;
		}
	};
	ScrollableLegendView.prototype._findTargetItemIndex = function(targetDataIndex) {
		if (!this._showController) return 0;
		var index;
		var contentGroup = this.getContentGroup();
		var defaultIndex;
		contentGroup.eachChild(function(child, idx) {
			var legendDataIdx = child.__legendDataIndex;
			if (defaultIndex == null && legendDataIdx != null) defaultIndex = idx;
			if (legendDataIdx === targetDataIndex) index = idx;
		});
		return index != null ? index : defaultIndex;
	};
	ScrollableLegendView.type = "legend.scroll";
	return ScrollableLegendView;
}(LegendView);
//#endregion
//#region node_modules/echarts/lib/component/legend/scrollableLegendAction.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function installScrollableLegendAction(registers) {
	/**
	* @event legendScroll
	* @type {Object}
	* @property {string} type 'legendScroll'
	* @property {string} scrollDataIndex
	*/
	registers.registerAction("legendScroll", "legendscroll", function(payload, ecModel) {
		var scrollDataIndex = payload.scrollDataIndex;
		scrollDataIndex != null && ecModel.eachComponent({
			mainType: "legend",
			subType: "scroll",
			query: payload
		}, function(legendModel) {
			legendModel.setScrollDataIndex(scrollDataIndex);
		});
	});
}
//#endregion
//#region node_modules/echarts/lib/component/legend/installLegendScroll.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$6(registers) {
	use(install$7);
	registers.registerComponentModel(ScrollableLegendModel);
	registers.registerComponentView(ScrollableLegendView);
	installScrollableLegendAction(registers);
}
//#endregion
//#region node_modules/echarts/lib/component/legend/install.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function install$2(registers) {
	use(install$7);
	use(install$6);
}
//#endregion
export { install as GraphicComponent, install$1 as GridComponent, install$2 as LegendComponent, install$3 as MarkLineComponent, install$4 as MarkPointComponent, install$5 as TooltipComponent };
