import { $ as applyTransform, At as extend, Bt as isFunction, Et as defaults, Ft as indexOf, Gt as isString, Jt as keys, Lt as isArray, Mt as find, Ot as each, Pt as hasOwn, Qt as mixin, R as copyTransform, St as clone, Tt as curry, Ut as isNumber, Wt as isObject, Xt as map, Y as BoundingRect, Z as Point, Zt as merge, c as ZRImage, dt as create, fn as __extends, ft as identity, gt as rotate, ht as mul, in as retrieve3, jt as filter, kt as eqNaN, nn as retrieve, pt as invert, rn as retrieve2, wt as createHashMap } from "./graphic-BAx7jeh4.js";
import { An as retrieveRawValue, At as normalizeSymbolSize, Bn as getLabelStatesModels, Cr as OrientedBoundingRect, Ct as isTimeScale, Di as isNullableNumberFinite, Gn as XY, Hn as setLabelStyle, I as ComponentView, Ii as mathRound, Ir as Group, It as tokens, J as Axis, Jt as mergeLayoutParam, K as scaleRawExtentInfoCreate, Ki as remRadian, Kr as toggleHoverEmphasis, Kt as getLayoutParams, Li as nice, Ln as Model, Mi as mathCeil, Ni as mathFloor, Ot as createSymbol, Pi as mathMax, Qn as expandOrShrinkRect, Rn as LabelMarginType, St as isOrdinalScale, Tt as OrdinalMeta, Ui as quantity, Ur as leaveEmphasis, Ut as createBoxLayoutReference, Vi as parsePositionSizeOption, Vr as enterEmphasis, W as adoptScaleRawExtentInfoAndPrepare, Wn as WH, Wt as fetchLayoutMode, X as associateSeriesWithAxis, Xi as Rect, Xn as ensureCopyRect, Xr as getECData, Yi as ZRText, Zn as ensureCopyTransform, Zr as SINGLE_REFERRING, _n as injectCoordSysByOption, _r as initProps, _t as getIntervalPrecision, ar as isBoundingRectAxisAligned, at as determineAxisType, br as saveOldStyle, bt as isIntervalOrLogScale, ct as getTickValueOutermost, dt as isOnAxisZeroDiscouraged, fr as setTooltipConfig, ft as retrieveAxisBreaksOption, gt as AXIS_TYPES, ht as updateIntervalOrLogScaleForNiceOrAligned, ir as groupTransition, it as createScaleByModel, ji as mathAbs, ki as isRadianAroundZero, kr as Line, kt as normalizeSymbolOffset, li as makeInner, lt as isAxisOnBand, mr as traverseElements, mt as shouldShowAllLabels, nt as AxisTickLabelComputingKind, on as getScaleBreakHelper, pr as subPixelOptimizeLine, pt as shouldAxisShow, q as scaleRawExtentInfoEnableBoxCoordSysUsage, qi as round, qt as getLayoutRect, r as AxisModelCommonMixin, rt as createAxisLabelsComputingContext, sn as hasBreaks, st as getScaleValuePositionKind, t as scaleCalcNice, ut as isNameLocationCenter, vr as removeElement, vt as increaseInterval, wt as getScaleExtentForMappingUnsafe, xi as getAcceptableTickPrecision, xn as createDimNameMap, xr as updateProps, xt as isLogScale, yt as intervalScaleEnsureValidExtent, zn as createTextStyle, zt as ComponentModel } from "./axisNiceTicks-C_GC5fUj.js";
//#region node_modules/echarts/lib/chart/helper/labelHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* @return label string. Not null/undefined
*/
function getDefaultLabel(data, dataIndex) {
	var labelDims = data.mapDimensionsAll("defaultedLabel");
	var len = labelDims.length;
	if (len === 1) {
		var rawVal = retrieveRawValue(data, dataIndex, labelDims[0]);
		return rawVal != null ? rawVal + "" : null;
	} else if (len) {
		var vals = [];
		for (var i = 0; i < labelDims.length; i++) vals.push(retrieveRawValue(data, dataIndex, labelDims[i]));
		return vals.join(" ");
	}
}
function getDefaultInterpolatedLabel(data, interpolatedValue) {
	var labelDims = data.mapDimensionsAll("defaultedLabel");
	if (!isArray(interpolatedValue)) return interpolatedValue + "";
	var vals = [];
	for (var i = 0; i < labelDims.length; i++) {
		var dimIndex = data.getDimensionIndex(labelDims[i]);
		if (dimIndex >= 0) vals.push(interpolatedValue[dimIndex]);
	}
	return vals.join(" ");
}
//#endregion
//#region node_modules/echarts/lib/chart/helper/Symbol.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var Symbol = function(_super) {
	__extends(Symbol, _super);
	function Symbol(data, idx, seriesScope, opts) {
		var _this = _super.call(this) || this;
		_this.updateData(data, idx, seriesScope, opts);
		return _this;
	}
	Symbol.prototype._createSymbol = function(symbolType, data, idx, symbolSize, z2, keepAspect) {
		this.removeAll();
		var symbolPath = createSymbol(symbolType, -1, -1, 2, 2, null, keepAspect);
		symbolPath.attr({
			z2: retrieve2(z2, 100),
			culling: true,
			scaleX: symbolSize[0] / 2,
			scaleY: symbolSize[1] / 2
		});
		symbolPath.drift = driftSymbol;
		this._symbolType = symbolType;
		this.add(symbolPath);
	};
	/**
	* Stop animation
	* @param {boolean} toLastFrame
	*/
	Symbol.prototype.stopSymbolAnimation = function(toLastFrame) {
		this.childAt(0).stopAnimation(null, toLastFrame);
	};
	Symbol.prototype.getSymbolType = function() {
		return this._symbolType;
	};
	/**
	* FIXME:
	* Caution: This method breaks the encapsulation of this module,
	* but it indeed brings convenience. So do not use the method
	* unless you detailedly know all the implements of `Symbol`,
	* especially animation.
	*
	* Get symbol path element.
	*/
	Symbol.prototype.getSymbolPath = function() {
		return this.childAt(0);
	};
	/**
	* Highlight symbol
	*/
	Symbol.prototype.highlight = function() {
		enterEmphasis(this.childAt(0));
	};
	/**
	* Downplay symbol
	*/
	Symbol.prototype.downplay = function() {
		leaveEmphasis(this.childAt(0));
	};
	/**
	* @param {number} zlevel
	* @param {number} z
	*/
	Symbol.prototype.setZ = function(zlevel, z) {
		var symbolPath = this.childAt(0);
		symbolPath.zlevel = zlevel;
		symbolPath.z = z;
	};
	Symbol.prototype.setDraggable = function(draggable, hasCursorOption) {
		var symbolPath = this.childAt(0);
		symbolPath.draggable = draggable;
		symbolPath.cursor = !hasCursorOption && draggable ? "move" : symbolPath.cursor;
	};
	/**
	* Update symbol properties
	*/
	Symbol.prototype.updateData = function(data, idx, seriesScope, opts) {
		this.silent = false;
		var symbolType = data.getItemVisual(idx, "symbol") || "circle";
		var seriesModel = data.hostModel;
		var symbolSize = Symbol.getSymbolSize(data, idx);
		var z2 = Symbol.getSymbolZ2(data, idx);
		var isInit = symbolType !== this._symbolType;
		var disableAnimation = opts && opts.disableAnimation;
		if (isInit) {
			var keepAspect = data.getItemVisual(idx, "symbolKeepAspect");
			this._createSymbol(symbolType, data, idx, symbolSize, z2, keepAspect);
		} else {
			var symbolPath = this.childAt(0);
			symbolPath.silent = false;
			var target = {
				scaleX: symbolSize[0] / 2,
				scaleY: symbolSize[1] / 2
			};
			disableAnimation ? symbolPath.attr(target) : updateProps(symbolPath, target, seriesModel, idx);
			saveOldStyle(symbolPath);
		}
		this._updateCommon(data, idx, symbolSize, seriesScope, opts);
		if (isInit) {
			var symbolPath = this.childAt(0);
			if (!disableAnimation) {
				var target = {
					scaleX: this._sizeX,
					scaleY: this._sizeY,
					style: { opacity: symbolPath.style.opacity }
				};
				symbolPath.scaleX = symbolPath.scaleY = 0;
				symbolPath.style.opacity = 0;
				initProps(symbolPath, target, seriesModel, idx);
			}
		}
		if (disableAnimation) this.childAt(0).stopAnimation("leave");
	};
	Symbol.prototype._updateCommon = function(data, idx, symbolSize, seriesScope, opts) {
		var symbolPath = this.childAt(0);
		var seriesModel = data.hostModel;
		var emphasisItemStyle;
		var blurItemStyle;
		var selectItemStyle;
		var focus;
		var blurScope;
		var emphasisDisabled;
		var labelStatesModels;
		var hoverScale;
		var cursorStyle;
		if (seriesScope) {
			emphasisItemStyle = seriesScope.emphasisItemStyle;
			blurItemStyle = seriesScope.blurItemStyle;
			selectItemStyle = seriesScope.selectItemStyle;
			focus = seriesScope.focus;
			blurScope = seriesScope.blurScope;
			labelStatesModels = seriesScope.labelStatesModels;
			hoverScale = seriesScope.hoverScale;
			cursorStyle = seriesScope.cursorStyle;
			emphasisDisabled = seriesScope.emphasisDisabled;
		}
		if (!seriesScope || data.hasItemOption) {
			var itemModel = seriesScope && seriesScope.itemModel ? seriesScope.itemModel : data.getItemModel(idx);
			var emphasisModel = itemModel.getModel("emphasis");
			emphasisItemStyle = emphasisModel.getModel("itemStyle").getItemStyle();
			selectItemStyle = itemModel.getModel(["select", "itemStyle"]).getItemStyle();
			blurItemStyle = itemModel.getModel(["blur", "itemStyle"]).getItemStyle();
			focus = emphasisModel.get("focus");
			blurScope = emphasisModel.get("blurScope");
			emphasisDisabled = emphasisModel.get("disabled");
			labelStatesModels = getLabelStatesModels(itemModel);
			hoverScale = emphasisModel.getShallow("scale");
			cursorStyle = itemModel.getShallow("cursor");
		}
		var symbolRotate = data.getItemVisual(idx, "symbolRotate");
		symbolPath.attr("rotation", (symbolRotate || 0) * Math.PI / 180 || 0);
		var symbolOffset = normalizeSymbolOffset(data.getItemVisual(idx, "symbolOffset"), symbolSize);
		if (symbolOffset) {
			symbolPath.x = symbolOffset[0];
			symbolPath.y = symbolOffset[1];
		}
		cursorStyle && symbolPath.attr("cursor", cursorStyle);
		var symbolStyle = data.getItemVisual(idx, "style");
		var visualColor = symbolStyle.fill;
		if (symbolPath instanceof ZRImage) {
			var pathStyle = symbolPath.style;
			symbolPath.useStyle(extend({
				image: pathStyle.image,
				x: pathStyle.x,
				y: pathStyle.y,
				width: pathStyle.width,
				height: pathStyle.height
			}, symbolStyle));
		} else {
			if (symbolPath.__isEmptyBrush) symbolPath.useStyle(extend({}, symbolStyle));
			else symbolPath.useStyle(symbolStyle);
			symbolPath.style.decal = null;
			symbolPath.setColor(visualColor, opts && opts.symbolInnerColor);
			symbolPath.style.strokeNoScale = true;
		}
		var liftZ = data.getItemVisual(idx, "liftZ");
		var z2Origin = this._z2;
		if (liftZ != null) {
			if (z2Origin == null) {
				this._z2 = symbolPath.z2;
				symbolPath.z2 += liftZ;
			}
		} else if (z2Origin != null) {
			symbolPath.z2 = z2Origin;
			this._z2 = null;
		}
		var useNameLabel = opts && opts.useNameLabel;
		setLabelStyle(symbolPath, labelStatesModels, {
			labelFetcher: seriesModel,
			labelDataIndex: idx,
			defaultText: getLabelDefaultText,
			inheritColor: visualColor,
			defaultOpacity: symbolStyle.opacity
		});
		function getLabelDefaultText(idx) {
			return useNameLabel ? data.getName(idx) : getDefaultLabel(data, idx);
		}
		this._sizeX = symbolSize[0] / 2;
		this._sizeY = symbolSize[1] / 2;
		var emphasisState = symbolPath.ensureState("emphasis");
		emphasisState.style = emphasisItemStyle;
		symbolPath.ensureState("select").style = selectItemStyle;
		symbolPath.ensureState("blur").style = blurItemStyle;
		var scaleRatio = hoverScale == null || hoverScale === true ? Math.max(1.1, 3 / this._sizeY) : isFinite(hoverScale) && hoverScale > 0 ? +hoverScale : 1;
		emphasisState.scaleX = this._sizeX * scaleRatio;
		emphasisState.scaleY = this._sizeY * scaleRatio;
		this.setSymbolScale(1);
		toggleHoverEmphasis(this, focus, blurScope, emphasisDisabled);
	};
	Symbol.prototype.setSymbolScale = function(scale) {
		this.scaleX = this.scaleY = scale;
	};
	Symbol.prototype.fadeOut = function(cb, seriesModel, opt) {
		var symbolPath = this.childAt(0);
		var dataIndex = getECData(this).dataIndex;
		var animationOpt = opt && opt.animation;
		this.silent = symbolPath.silent = true;
		if (opt && opt.fadeLabel) {
			var textContent = symbolPath.getTextContent();
			if (textContent) removeElement(textContent, { style: { opacity: 0 } }, seriesModel, {
				dataIndex,
				removeOpt: animationOpt,
				cb: function() {
					symbolPath.removeTextContent();
				}
			});
		} else symbolPath.removeTextContent();
		removeElement(symbolPath, {
			style: { opacity: 0 },
			scaleX: 0,
			scaleY: 0
		}, seriesModel, {
			dataIndex,
			cb,
			removeOpt: animationOpt
		});
	};
	Symbol.getSymbolSize = function(data, idx) {
		return normalizeSymbolSize(data.getItemVisual(idx, "symbolSize"));
	};
	Symbol.getSymbolZ2 = function(data, idx) {
		return data.getItemVisual(idx, "z2");
	};
	return Symbol;
}(Group);
function driftSymbol(dx, dy) {
	this.parent.drift(dx, dy);
}
//#endregion
//#region node_modules/echarts/lib/chart/helper/SymbolDraw.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function symbolNeedsDraw(data, point, idx, opt) {
	return point && !isNaN(point[0]) && !isNaN(point[1]) && !(opt && opt.isIgnore && opt.isIgnore(idx)) && !(opt && opt.clipShape && !opt.clipShape.contain(point[0], point[1])) && data.getItemVisual(idx, "symbol") !== "none";
}
function normalizeUpdateOpt(opt) {
	if (opt != null && !isObject(opt)) opt = { isIgnore: opt };
	return opt || {};
}
function makeSeriesScope(data) {
	var seriesModel = data.hostModel;
	var emphasisModel = seriesModel.getModel("emphasis");
	return {
		emphasisItemStyle: emphasisModel.getModel("itemStyle").getItemStyle(),
		blurItemStyle: seriesModel.getModel(["blur", "itemStyle"]).getItemStyle(),
		selectItemStyle: seriesModel.getModel(["select", "itemStyle"]).getItemStyle(),
		focus: emphasisModel.get("focus"),
		blurScope: emphasisModel.get("blurScope"),
		emphasisDisabled: emphasisModel.get("disabled"),
		hoverScale: emphasisModel.get("scale"),
		labelStatesModels: getLabelStatesModels(seriesModel),
		cursorStyle: seriesModel.get("cursor")
	};
}
function createEl(SymbolCtor, data, newIdx, seriesScope, symbolUpdateOpt, point, group) {
	var symbolEl = new SymbolCtor(data, newIdx, seriesScope, symbolUpdateOpt);
	symbolEl.setPosition(point);
	data.setItemGraphicEl(newIdx, symbolEl);
	group.add(symbolEl);
	return symbolEl;
}
var SymbolDraw = function() {
	function SymbolDraw(SymbolCtor) {
		this.group = new Group();
		this._SymbolCtor = SymbolCtor || Symbol;
	}
	/**
	* Update symbols draw by new data
	*/
	SymbolDraw.prototype.updateData = function(data, opt) {
		this._progressiveEls = null;
		opt = normalizeUpdateOpt(opt);
		var group = this.group;
		var seriesModel = data.hostModel;
		var oldData = this._data;
		var SymbolCtor = this._SymbolCtor;
		var disableAnimation = opt.disableAnimation;
		var seriesScope = this._seriesScope = makeSeriesScope(data);
		var symbolUpdateOpt = { disableAnimation };
		var getSymbolPoint = opt.getSymbolPoint || function(idx) {
			return data.getItemLayout(idx);
		};
		if (!oldData) group.removeAll();
		data.diff(oldData).add(function(newIdx) {
			var point = getSymbolPoint(newIdx);
			if (symbolNeedsDraw(data, point, newIdx, opt)) createEl(SymbolCtor, data, newIdx, seriesScope, symbolUpdateOpt, point, group);
		}).update(function(newIdx, oldIdx) {
			var symbolEl = oldData.getItemGraphicEl(oldIdx);
			var point = getSymbolPoint(newIdx);
			if (!symbolNeedsDraw(data, point, newIdx, opt)) {
				group.remove(symbolEl);
				return;
			}
			var newSymbolType = data.getItemVisual(newIdx, "symbol") || "circle";
			var oldSymbolType = symbolEl && symbolEl.getSymbolType && symbolEl.getSymbolType();
			if (!symbolEl || oldSymbolType && oldSymbolType !== newSymbolType) {
				group.remove(symbolEl);
				symbolEl = new SymbolCtor(data, newIdx, seriesScope, symbolUpdateOpt);
				symbolEl.setPosition(point);
			} else {
				symbolEl.updateData(data, newIdx, seriesScope, symbolUpdateOpt);
				var target = {
					x: point[0],
					y: point[1]
				};
				disableAnimation ? symbolEl.attr(target) : updateProps(symbolEl, target, seriesModel);
			}
			group.add(symbolEl);
			data.setItemGraphicEl(newIdx, symbolEl);
		}).remove(function(oldIdx) {
			var el = oldData.getItemGraphicEl(oldIdx);
			el && el.fadeOut(function() {
				group.remove(el);
			}, seriesModel);
		}).execute();
		this._getSymbolPoint = getSymbolPoint;
		this._data = data;
	};
	SymbolDraw.prototype.updateLayout = function(opt) {
		var data = this._data;
		if (!data) return;
		var symbolDraw = this;
		var store = data.getStore();
		for (var idx = 0, len = store.count(); idx < len; idx++) {
			var el = data.getItemGraphicEl(idx);
			var point = symbolDraw._getSymbolPoint(idx);
			if (symbolNeedsDraw(data, point, idx, opt)) {
				el = el || createEl(symbolDraw._SymbolCtor, data, idx, symbolDraw._seriesScope, { disableAnimation: true }, point, symbolDraw.group);
				el.stopAnimation();
				el.setPosition(point);
				el.markRedraw();
			} else if (el) {
				symbolDraw.group.remove(el);
				data.setItemGraphicEl(idx, null);
			}
		}
	};
	SymbolDraw.prototype.incrementalPrepareUpdate = function(data) {
		this._seriesScope = makeSeriesScope(data);
		this._data = null;
		this.group.removeAll();
	};
	SymbolDraw.prototype.incrementalUpdate = function(taskParams, data, incrementalId, opt) {
		this._progressiveEls = [];
		opt = normalizeUpdateOpt(opt);
		function updateIncrementalAndHover(el) {
			if (!el.isGroup) {
				el.incremental = incrementalId;
				el.ensureState("emphasis").hoverLayer = 2;
			}
		}
		for (var idx = taskParams.start; idx < taskParams.end; idx++) {
			var point = data.getItemLayout(idx);
			if (symbolNeedsDraw(data, point, idx, opt)) {
				var el = new this._SymbolCtor(data, idx, this._seriesScope);
				el.traverse(updateIncrementalAndHover);
				el.setPosition(point);
				this.group.add(el);
				data.setItemGraphicEl(idx, el);
				this._progressiveEls.push(el);
			}
		}
	};
	SymbolDraw.prototype.eachRendered = function(cb) {
		traverseElements(this._progressiveEls || this.group, cb);
	};
	SymbolDraw.prototype.remove = function(enableAnimation) {
		var group = this.group;
		var data = this._data;
		if (data && enableAnimation) data.eachItemGraphicEl(function(el) {
			el.fadeOut(function() {
				group.remove(el);
			}, data.hostModel);
		});
		else group.removeAll();
	};
	return SymbolDraw;
}();
//#endregion
//#region node_modules/echarts/lib/coord/CoordinateSystem.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function isCoordinateSystemType(coordSys, type) {
	return coordSys.type === type;
}
//#endregion
//#region node_modules/echarts/lib/coord/cartesian/Axis2D.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var Axis2D = function(_super) {
	__extends(Axis2D, _super);
	function Axis2D(dim, scale, coordExtent, axisType, position) {
		var _this = _super.call(this, dim, scale, coordExtent) || this;
		/**
		* Index of axis, can be used as key
		* Injected outside.
		*/
		_this.index = 0;
		_this.type = axisType || "value";
		_this.position = position || "bottom";
		return _this;
	}
	Axis2D.prototype.isHorizontal = function() {
		var position = this.position;
		return position === "top" || position === "bottom";
	};
	/**
	* Each item cooresponds to this.getExtent(), which
	* means globalExtent[0] may greater than globalExtent[1],
	* unless `asc` is input.
	*
	* @param {boolean} [asc]
	* @return {Array.<number>}
	*/
	Axis2D.prototype.getGlobalExtent = function(asc) {
		var ret = this.getExtent();
		ret[0] = this.toGlobalCoord(ret[0]);
		ret[1] = this.toGlobalCoord(ret[1]);
		asc && ret[0] > ret[1] && ret.reverse();
		return ret;
	};
	Axis2D.prototype.pointToData = function(point, clamp) {
		return this.coordToData(this.toLocalCoord(point[this.dim === "x" ? 0 : 1]), clamp);
	};
	/**
	* Set ordinalSortInfo
	* @param info new OrdinalSortInfo
	*/
	Axis2D.prototype.setCategorySortInfo = function(info) {
		if (this.type !== "category") return false;
		this.model.option.categorySortInfo = info;
		this.scale.setSortInfo(info);
	};
	return Axis2D;
}(Axis);
//#endregion
//#region node_modules/echarts/lib/label/labelLayoutHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var LABEL_LAYOUT_BASE_PROPS = [
	"label",
	"labelLine",
	"layoutOption",
	"priority",
	"defaultAttr",
	"marginForce",
	"minMarginForce",
	"marginDefault",
	"suggestIgnore"
];
var LABEL_LAYOUT_DIRTY_BIT_OTHERS = 1;
var LABEL_LAYOUT_DIRTY_BIT_OBB = 2;
var LABEL_LAYOUT_DIRTY_ALL = LABEL_LAYOUT_DIRTY_BIT_OTHERS | LABEL_LAYOUT_DIRTY_BIT_OBB;
function setLabelLayoutDirty(labelGeometry, dirtyOrClear, dirtyBits) {
	dirtyBits = dirtyBits || LABEL_LAYOUT_DIRTY_ALL;
	dirtyOrClear ? labelGeometry.dirty |= dirtyBits : labelGeometry.dirty &= ~dirtyBits;
}
function isLabelLayoutDirty(labelGeometry, dirtyBits) {
	dirtyBits = dirtyBits || LABEL_LAYOUT_DIRTY_ALL;
	return labelGeometry.dirty == null || !!(labelGeometry.dirty & dirtyBits);
}
/**
* [CAUTION]
*  - No auto dirty propagation mechanism yet. If the transform of the raw label or any of its ancestors is
*    changed, must sync the changes to the props of `LabelGeometry` by:
*    either explicitly call:
*      `setLabelLayoutDirty(labelLayout, true); ensureLabelLayoutWithGeometry(labelLayout);`
*    or call (if only translation is performed):
*      `labelLayoutApplyTranslation(labelLayout);`
*  - `label.ignore` is not necessarily falsy, and not considered in computing `LabelGeometry`,
*    since it might be modified by some overlap resolving handling.
*  - To duplicate or make a variation:
*    use `newLabelLayoutWithGeometry`.
*
* The result can also be the input of this method.
* @return `NullUndefined` if and only if `labelLayout` is `NullUndefined`.
*/
function ensureLabelLayoutWithGeometry(labelLayout) {
	if (!labelLayout) return;
	if (isLabelLayoutDirty(labelLayout)) computeLabelGeometry(labelLayout, labelLayout.label, labelLayout);
	return labelLayout;
}
/**
* The props in `out` will be filled if existing, or created.
*/
function computeLabelGeometry(out, label, opt) {
	var rawTransform = label.getComputedTransform();
	out.transform = ensureCopyTransform(out.transform, rawTransform);
	var outLocalRect = out.localRect = ensureCopyRect(out.localRect, label.getBoundingRect());
	var labelStyleExt = label.style;
	var margin = labelStyleExt.margin;
	var marginForce = opt && opt.marginForce;
	var minMarginForce = opt && opt.minMarginForce;
	var marginDefault = opt && opt.marginDefault;
	var marginType = labelStyleExt.__marginType;
	if (marginType == null && marginDefault) {
		margin = marginDefault;
		marginType = LabelMarginType.textMargin;
	}
	for (var i = 0; i < 4; i++) _tmpLabelMargin[i] = marginType === LabelMarginType.minMargin && minMarginForce && minMarginForce[i] != null ? minMarginForce[i] : marginForce && marginForce[i] != null ? marginForce[i] : margin ? margin[i] : 0;
	if (marginType === LabelMarginType.textMargin) expandOrShrinkRect(outLocalRect, _tmpLabelMargin, false, false);
	var outGlobalRect = out.rect = ensureCopyRect(out.rect, outLocalRect);
	if (rawTransform) outGlobalRect.applyTransform(rawTransform);
	if (marginType === LabelMarginType.minMargin) expandOrShrinkRect(outGlobalRect, _tmpLabelMargin, false, false);
	out.axisAligned = isBoundingRectAxisAligned(rawTransform);
	(out.label = out.label || {}).ignore = label.ignore;
	setLabelLayoutDirty(out, false);
	setLabelLayoutDirty(out, true, LABEL_LAYOUT_DIRTY_BIT_OBB);
	return out;
}
var _tmpLabelMargin = [
	0,
	0,
	0,
	0
];
/**
* The props in `out` will be filled if existing, or created.
*/
function computeLabelGeometry2(out, rawLocalRect, rawTransform) {
	out.transform = ensureCopyTransform(out.transform, rawTransform);
	out.localRect = ensureCopyRect(out.localRect, rawLocalRect);
	out.rect = ensureCopyRect(out.rect, rawLocalRect);
	if (rawTransform) out.rect.applyTransform(rawTransform);
	out.axisAligned = isBoundingRectAxisAligned(rawTransform);
	out.obb = void 0;
	(out.label = out.label || {}).ignore = false;
	return out;
}
/**
* This is a shortcut of
*   ```js
*   labelLayout.label.x = newX;
*   labelLayout.label.y = newY;
*   setLabelLayoutDirty(labelLayout, true);
*   ensureLabelLayoutWithGeometry(labelLayout);
*   ```
* and provide better performance in this common case.
*/
function labelLayoutApplyTranslation(labelLayout, offset) {
	if (!labelLayout) return;
	labelLayout.label.x += offset.x;
	labelLayout.label.y += offset.y;
	labelLayout.label.markRedraw();
	var transform = labelLayout.transform;
	if (transform) {
		transform[4] += offset.x;
		transform[5] += offset.y;
	}
	var globalRect = labelLayout.rect;
	if (globalRect) {
		globalRect.x += offset.x;
		globalRect.y += offset.y;
	}
	var obb = labelLayout.obb;
	if (obb) obb.fromBoundingRect(labelLayout.localRect, transform);
}
/**
* To duplicate or make a variation of a label layout.
* Copy the only relevant properties to avoid the conflict or wrongly reuse of the props of `LabelLayoutWithGeometry`.
*/
function newLabelLayoutWithGeometry(newBaseWithDefaults, source) {
	for (var i = 0; i < LABEL_LAYOUT_BASE_PROPS.length; i++) {
		var prop = LABEL_LAYOUT_BASE_PROPS[i];
		if (newBaseWithDefaults[prop] == null) newBaseWithDefaults[prop] = source[prop];
	}
	return ensureLabelLayoutWithGeometry(newBaseWithDefaults);
}
/**
* Create obb if no one, can cache it.
*/
function ensureOBB(labelGeometry) {
	var obb = labelGeometry.obb;
	if (!obb || isLabelLayoutDirty(labelGeometry, LABEL_LAYOUT_DIRTY_BIT_OBB)) {
		labelGeometry.obb = obb = obb || new OrientedBoundingRect();
		obb.fromBoundingRect(labelGeometry.localRect, labelGeometry.transform);
		setLabelLayoutDirty(labelGeometry, false, LABEL_LAYOUT_DIRTY_BIT_OBB);
	}
	return obb;
}
/**
* Adjust labels on x/y direction to avoid overlap.
*
* PENDING: the current implementation is based on the global bounding rect rather than the local rect,
*  which may be not preferable in some edge cases when the label has rotation, but works for most cases,
*  since rotation is unnecessary when there is sufficient space, while squeezing is applied regardless
*  of overlapping when there is no enough space.
*
* NOTICE:
*  - The input `list` and its content will be modified (sort, label.x/y, rect).
*  - The caller should sync the modifications to the other parts by
*    `setLabelLayoutDirty` and `ensureLabelLayoutWithGeometry` if needed.
*
* @return adjusted
*/
function shiftLayoutOnXY(list, xyDimIdx, minBound, maxBound, balanceShift) {
	var len = list.length;
	var xyDim = XY[xyDimIdx];
	var sizeDim = WH[xyDimIdx];
	if (len < 2) return false;
	list.sort(function(a, b) {
		return a.rect[xyDim] - b.rect[xyDim];
	});
	var lastPos = 0;
	var delta;
	var adjusted = false;
	var totalShifts = 0;
	for (var i = 0; i < len; i++) {
		var item = list[i];
		var rect = item.rect;
		delta = rect[xyDim] - lastPos;
		if (delta < 0) {
			rect[xyDim] -= delta;
			item.label[xyDim] -= delta;
			adjusted = true;
		}
		var shift = Math.max(-delta, 0);
		totalShifts += shift;
		lastPos = rect[xyDim] + rect[sizeDim];
	}
	if (totalShifts > 0 && balanceShift) shiftList(-totalShifts / len, 0, len);
	var first = list[0];
	var last = list[len - 1];
	var minGap;
	var maxGap;
	updateMinMaxGap();
	minGap < 0 && squeezeGaps(-minGap, .8);
	maxGap < 0 && squeezeGaps(maxGap, .8);
	updateMinMaxGap();
	takeBoundsGap(minGap, maxGap, 1);
	takeBoundsGap(maxGap, minGap, -1);
	updateMinMaxGap();
	if (minGap < 0) squeezeWhenBailout(-minGap);
	if (maxGap < 0) squeezeWhenBailout(maxGap);
	function updateMinMaxGap() {
		minGap = first.rect[xyDim] - minBound;
		maxGap = maxBound - last.rect[xyDim] - last.rect[sizeDim];
	}
	function takeBoundsGap(gapThisBound, gapOtherBound, moveDir) {
		if (gapThisBound < 0) {
			var moveFromMaxGap = Math.min(gapOtherBound, -gapThisBound);
			if (moveFromMaxGap > 0) {
				shiftList(moveFromMaxGap * moveDir, 0, len);
				var remained = moveFromMaxGap + gapThisBound;
				if (remained < 0) squeezeGaps(-remained * moveDir, 1);
			} else squeezeGaps(-gapThisBound * moveDir, 1);
		}
	}
	function shiftList(delta, start, end) {
		if (delta !== 0) adjusted = true;
		for (var i = start; i < end; i++) {
			var item = list[i];
			var rect = item.rect;
			rect[xyDim] += delta;
			item.label[xyDim] += delta;
		}
	}
	function squeezeGaps(delta, maxSqeezePercent) {
		var gaps = [];
		var totalGaps = 0;
		for (var i = 1; i < len; i++) {
			var prevItemRect = list[i - 1].rect;
			var gap = Math.max(list[i].rect[xyDim] - prevItemRect[xyDim] - prevItemRect[sizeDim], 0);
			gaps.push(gap);
			totalGaps += gap;
		}
		if (!totalGaps) return;
		var squeezePercent = Math.min(Math.abs(delta) / totalGaps, maxSqeezePercent);
		if (delta > 0) for (var i = 0; i < len - 1; i++) {
			var movement = gaps[i] * squeezePercent;
			shiftList(movement, 0, i + 1);
		}
		else for (var i = len - 1; i > 0; i--) {
			var movement = gaps[i - 1] * squeezePercent;
			shiftList(-movement, i, len);
		}
	}
	/**
	* Squeeze to allow overlap if there is no more space available.
	* Let other overlapping strategy like hideOverlap do the job instead of keep exceeding the bounds.
	*/
	function squeezeWhenBailout(delta) {
		var dir = delta < 0 ? -1 : 1;
		delta = Math.abs(delta);
		var moveForEachLabel = Math.ceil(delta / (len - 1));
		for (var i = 0; i < len - 1; i++) {
			if (dir > 0) shiftList(moveForEachLabel, 0, i + 1);
			else shiftList(-moveForEachLabel, len - i - 1, len);
			delta -= moveForEachLabel;
			if (delta <= 0) return;
		}
	}
	return adjusted;
}
/**
* [NOTICE - restore]:
*  'series:layoutlabels' may be triggered during some EC_PARTIAL_UPDATE passes, such as zooming in series.graph/geo
*  (`updateLabelLayout`), where the modified `Element` props should be restorable from `defaultAttr`.
*  @see `SavedLabelAttr` in `LabelManager.ts`
*  `restoreIgnore` can be called to perform the restore, if needed.
*
* [NOTICE - state]:
*  Regarding Element's states, this method is only designed for the normal state.
*  PENDING: although currently this method is effectively called in other states in `updateLabelLayout` case,
*      the bad case is not noticeable in the zooming scenario.
*/
function hideOverlap(labelList) {
	var displayedLabels = [];
	labelList.sort(function(a, b) {
		return (b.suggestIgnore ? 1 : 0) - (a.suggestIgnore ? 1 : 0) || b.priority - a.priority;
	});
	function hideEl(el) {
		if (!el.ignore) {
			var emphasisState = el.ensureState("emphasis");
			if (emphasisState.ignore == null) emphasisState.ignore = false;
		}
		el.ignore = true;
	}
	for (var i = 0; i < labelList.length; i++) {
		var labelItem = ensureLabelLayoutWithGeometry(labelList[i]);
		if (labelItem.label.ignore) continue;
		var label = labelItem.label;
		var labelLine = labelItem.labelLine;
		var overlapped = false;
		for (var j = 0; j < displayedLabels.length; j++) if (labelIntersect(labelItem, displayedLabels[j], null, { touchThreshold: .05 })) {
			overlapped = true;
			break;
		}
		if (overlapped) {
			hideEl(label);
			labelLine && hideEl(labelLine);
		} else displayedLabels.push(labelItem);
	}
}
/**
* Enable fast check for performance; use obb if inevitable.
* If `mtv` is used, `targetLayoutInfo` can be moved based on the values filled into `mtv`.
*
* This method is based only on the current `Element` states (regardless of other states).
* Typically this method (and the entire layout process) is performed in normal state.
*/
function labelIntersect(baseLayoutInfo, targetLayoutInfo, mtv, intersectOpt) {
	if (!baseLayoutInfo || !targetLayoutInfo) return false;
	if (baseLayoutInfo.label && baseLayoutInfo.label.ignore || targetLayoutInfo.label && targetLayoutInfo.label.ignore) return false;
	if (!baseLayoutInfo.rect.intersect(targetLayoutInfo.rect, mtv, intersectOpt)) return false;
	if (baseLayoutInfo.axisAligned && targetLayoutInfo.axisAligned) return true;
	return ensureOBB(baseLayoutInfo).intersect(ensureOBB(targetLayoutInfo), mtv, intersectOpt);
}
//#endregion
//#region node_modules/echarts/lib/component/axis/axisBreakHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var _impl = null;
function getAxisBreakHelper() {
	return _impl;
}
//#endregion
//#region node_modules/echarts/lib/component/axis/axisAction.js
var AXIS_BREAK_EXPAND_ACTION_TYPE = "expandAxisBreak";
//#endregion
//#region node_modules/echarts/lib/component/axis/AxisBuilder.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var PI = Math.PI;
var DEFAULT_CENTER_NAME_MARGIN_LEVELS = [
	[
		1,
		2,
		1,
		2
	],
	[
		5,
		3,
		5,
		3
	],
	[
		8,
		3,
		8,
		3
	]
];
var DEFAULT_ENDS_NAME_MARGIN_LEVELS = [
	[
		0,
		1,
		0,
		1
	],
	[
		0,
		3,
		0,
		3
	],
	[
		0,
		3,
		0,
		3
	]
];
var getLabelInner = makeInner();
var getTickInner = makeInner();
/**
* A context shared by difference axisBuilder instances.
* For cross-axes overlap resolving.
*
* Lifecycle constraint: should not over a pass of ec main process.
*  If model is changed, the context must be disposed.
*
* @see AxisBuilderLocalContext
*/
var AxisBuilderSharedContext = function() {
	function AxisBuilderSharedContext(resolveAxisNameOverlap) {
		/**
		* [CAUTION] Do not modify this data structure outside this class.
		*/
		this.recordMap = {};
		this.resolveAxisNameOverlap = resolveAxisNameOverlap;
	}
	AxisBuilderSharedContext.prototype.ensureRecord = function(axisModel) {
		var dim = axisModel.axis.dim;
		var idx = axisModel.componentIndex;
		var recordMap = this.recordMap;
		var records = recordMap[dim] || (recordMap[dim] = []);
		return records[idx] || (records[idx] = { ready: {} });
	};
	return AxisBuilderSharedContext;
}();
/**
* [CAUTION]
*  1. The call of this function must be after axisLabel overlap handlings
*     (such as `hideOverlap`, `fixMinMaxLabelShow`) and after transform calculating.
*  2. Can be called multiple times and should be idempotent.
*/
function resetOverlapRecordToShared(cfg, shared, axisModel, labelLayoutList) {
	var axis = axisModel.axis;
	var record = shared.ensureRecord(axisModel);
	var labelInfoList = [];
	var stOccupiedRect;
	var useStOccupiedRect = hasAxisName(cfg.axisName) && isNameLocationCenter(cfg.nameLocation);
	each(labelLayoutList, function(layout) {
		var layoutInfo = ensureLabelLayoutWithGeometry(layout);
		if (!layoutInfo || layoutInfo.label.ignore) return;
		labelInfoList.push(layoutInfo);
		var transGroup = record.transGroup;
		if (useStOccupiedRect) {
			transGroup.transform ? invert(_stTransTmp, transGroup.transform) : identity(_stTransTmp);
			if (layoutInfo.transform) mul(_stTransTmp, _stTransTmp, layoutInfo.transform);
			BoundingRect.copy(_stLabelRectTmp, layoutInfo.localRect);
			_stLabelRectTmp.applyTransform(_stTransTmp);
			stOccupiedRect ? stOccupiedRect.union(_stLabelRectTmp) : BoundingRect.copy(stOccupiedRect = new BoundingRect(0, 0, 0, 0), _stLabelRectTmp);
		}
	});
	var sortByDim = Math.abs(record.dirVec.x) > .1 ? "x" : "y";
	var sortByValue = record.transGroup[sortByDim];
	labelInfoList.sort(function(info1, info2) {
		return Math.abs(info1.label[sortByDim] - sortByValue) - Math.abs(info2.label[sortByDim] - sortByValue);
	});
	if (useStOccupiedRect && stOccupiedRect) {
		var extent = axis.getExtent();
		var axisLineX = Math.min(extent[0], extent[1]);
		var axisLineWidth = Math.max(extent[0], extent[1]) - axisLineX;
		stOccupiedRect.union(new BoundingRect(axisLineX, 0, axisLineWidth, 1));
	}
	record.stOccupiedRect = stOccupiedRect;
	record.labelInfoList = labelInfoList;
}
var _stTransTmp = create();
var _stLabelRectTmp = new BoundingRect(0, 0, 0, 0);
/**
* The default resolver does not involve other axes within the same coordinate system.
*/
var resolveAxisNameOverlapDefault = function(cfg, ctx, axisModel, nameLayoutInfo, nameMoveDirVec, thisRecord) {
	if (isNameLocationCenter(cfg.nameLocation)) {
		var stOccupiedRect = thisRecord.stOccupiedRect;
		if (stOccupiedRect) moveIfOverlap(computeLabelGeometry2({}, stOccupiedRect, thisRecord.transGroup.transform), nameLayoutInfo, nameMoveDirVec);
	} else moveIfOverlapByLinearLabels(thisRecord.labelInfoList, thisRecord.dirVec, nameLayoutInfo, nameMoveDirVec);
};
function moveIfOverlap(basedLayoutInfo, movableLayoutInfo, moveDirVec) {
	var mtv = new Point();
	if (labelIntersect(basedLayoutInfo, movableLayoutInfo, mtv, {
		direction: Math.atan2(moveDirVec.y, moveDirVec.x),
		bidirectional: false,
		touchThreshold: .05
	})) labelLayoutApplyTranslation(movableLayoutInfo, mtv);
}
function moveIfOverlapByLinearLabels(baseLayoutInfoList, baseDirVec, movableLayoutInfo, moveDirVec) {
	var sameDir = Point.dot(moveDirVec, baseDirVec) >= 0;
	for (var idx = 0, len = baseLayoutInfoList.length; idx < len; idx++) {
		var labelInfo = baseLayoutInfoList[sameDir ? idx : len - 1 - idx];
		if (!labelInfo.label.ignore) moveIfOverlap(labelInfo, movableLayoutInfo, moveDirVec);
	}
}
/**
* @caution
* - Ensure it is called after the data processing stage finished.
* - It might be called before `CahrtView#render`, sush as called at `CoordinateSystem#update`,
*  thus ensure the result the same whenever it is called.
*
* A builder for a straight-line axis.
*
* A final axis is translated and rotated from a "standard axis".
* So opt.position and opt.rotation is required.
*
* A "standard axis" is the axis [0,0]-->[abs(axisExtent[1]-axisExtent[0]),0]
* for example: [0,0]-->[50,0]
*/
var AxisBuilder = function() {
	/**
	* [CAUTION]: axisModel.axis.extent/scale must be ready to use.
	*/
	function AxisBuilder(axisModel, api, opt, shared) {
		this.group = new Group();
		this._axisModel = axisModel;
		this._api = api;
		this._local = {};
		this._shared = shared || new AxisBuilderSharedContext(resolveAxisNameOverlapDefault);
		this._resetCfgDetermined(opt);
	}
	/**
	* Regarding axis label related configurations, only the change of label.x/y is supported; other
	* changes are not necessary and not performant. To be specific, only `axis.position`
	* (and consequently `labelOffset`) and `axis.extent` can be changed, and assume everything in
	* `axisModel` are not changed.
	* Axis line related configurations can be changed since this method can only be called
	* before they are created.
	*/
	AxisBuilder.prototype.updateCfg = function(opt) {
		var raw = this._cfg.raw;
		raw.position = opt.position;
		raw.labelOffset = opt.labelOffset;
		this._resetCfgDetermined(raw);
	};
	/**
	* [CAUTION] For debug usage. Never change it outside!
	*/
	AxisBuilder.prototype.__getRawCfg = function() {
		return this._cfg.raw;
	};
	AxisBuilder.prototype._resetCfgDetermined = function(raw) {
		var axisModel = this._axisModel;
		var axisModelDefaultOption = axisModel.getDefaultOption ? axisModel.getDefaultOption() : {};
		var axisName = retrieve2(raw.axisName, axisModel.get("name"));
		var nameMoveOverlapOption = axisModel.get("nameMoveOverlap");
		if (nameMoveOverlapOption == null || nameMoveOverlapOption === "auto") nameMoveOverlapOption = retrieve2(raw.defaultNameMoveOverlap, true);
		var cfg = {
			raw,
			position: raw.position,
			rotation: raw.rotation,
			nameDirection: retrieve2(raw.nameDirection, 1),
			tickDirection: retrieve2(raw.tickDirection, 1),
			labelDirection: retrieve2(raw.labelDirection, 1),
			labelOffset: retrieve2(raw.labelOffset, 0),
			silent: retrieve2(raw.silent, true),
			axisName,
			nameLocation: retrieve3(axisModel.get("nameLocation"), axisModelDefaultOption.nameLocation, "end"),
			shouldNameMoveOverlap: hasAxisName(axisName) && nameMoveOverlapOption,
			optionHideOverlap: axisModel.get(["axisLabel", "hideOverlap"]),
			showMinorTicks: axisModel.get(["minorTick", "show"])
		};
		this._cfg = cfg;
		var transformGroup = new Group({
			x: cfg.position[0],
			y: cfg.position[1],
			rotation: cfg.rotation
		});
		transformGroup.updateTransform();
		this._transformGroup = transformGroup;
		var record = this._shared.ensureRecord(axisModel);
		record.transGroup = this._transformGroup;
		record.dirVec = new Point(Math.cos(-cfg.rotation), Math.sin(-cfg.rotation));
	};
	AxisBuilder.prototype.build = function(axisPartNameMap, extraParams) {
		var _this = this;
		if (!axisPartNameMap) axisPartNameMap = {
			axisLine: true,
			axisTickLabelEstimate: false,
			axisTickLabelDetermine: true,
			axisName: true
		};
		each(AXIS_BUILDER_AXIS_PART_NAMES, function(partName) {
			if (axisPartNameMap[partName]) builders[partName](_this._cfg, _this._local, _this._shared, _this._axisModel, _this.group, _this._transformGroup, _this._api, extraParams || {});
		});
		return this;
	};
	/**
	* Currently only get text align/verticalAlign by rotation.
	* NO `position` is involved, otherwise it have to be performed for each `updateAxisLabelChangableProps`.
	*/
	AxisBuilder.innerTextLayout = function(axisRotation, textRotation, direction) {
		var rotationDiff = remRadian(textRotation - axisRotation);
		var textAlign;
		var textVerticalAlign;
		if (isRadianAroundZero(rotationDiff)) {
			textVerticalAlign = direction > 0 ? "top" : "bottom";
			textAlign = "center";
		} else if (isRadianAroundZero(rotationDiff - PI)) {
			textVerticalAlign = direction > 0 ? "bottom" : "top";
			textAlign = "center";
		} else {
			textVerticalAlign = "middle";
			if (rotationDiff > 0 && rotationDiff < PI) textAlign = direction > 0 ? "right" : "left";
			else textAlign = direction > 0 ? "left" : "right";
		}
		return {
			rotation: rotationDiff,
			textAlign,
			textVerticalAlign
		};
	};
	AxisBuilder.makeAxisEventDataBase = function(axisModel) {
		var eventData = {
			componentType: axisModel.mainType,
			componentIndex: axisModel.componentIndex
		};
		eventData[axisModel.mainType + "Index"] = axisModel.componentIndex;
		return eventData;
	};
	AxisBuilder.isLabelSilent = function(axisModel) {
		var tooltipOpt = axisModel.get("tooltip");
		return axisModel.get("silent") || !(axisModel.get("triggerEvent") || tooltipOpt && tooltipOpt.show);
	};
	return AxisBuilder;
}();
var AXIS_BUILDER_AXIS_PART_NAMES = [
	"axisLine",
	"axisTickLabelEstimate",
	"axisTickLabelDetermine",
	"axisName"
];
var builders = {
	axisLine: function(cfg, local, shared, axisModel, group, transformGroup, api) {
		var shown = axisModel.get(["axisLine", "show"]);
		if (shown === "auto") {
			shown = true;
			if (cfg.raw.axisLineAutoShow != null) shown = !!cfg.raw.axisLineAutoShow;
		}
		if (!shown) return;
		var extent = axisModel.axis.getExtent();
		var matrix = transformGroup.transform;
		var pt1 = [extent[0], 0];
		var pt2 = [extent[1], 0];
		var inverse = pt1[0] > pt2[0];
		if (matrix) {
			applyTransform(pt1, pt1, matrix);
			applyTransform(pt2, pt2, matrix);
		}
		var lineStyle = extend({ lineCap: "round" }, axisModel.getModel(["axisLine", "lineStyle"]).getLineStyle());
		var pathBaseProp = {
			strokeContainThreshold: cfg.raw.strokeContainThreshold || 5,
			silent: true,
			z2: 1,
			style: lineStyle
		};
		if (axisModel.get(["axisLine", "breakLine"]) && hasBreaks(axisModel.axis.scale)) getAxisBreakHelper().buildAxisBreakLine(axisModel, group, transformGroup, pathBaseProp);
		else {
			var line = new Line(extend({ shape: {
				x1: pt1[0],
				y1: pt1[1],
				x2: pt2[0],
				y2: pt2[1]
			} }, pathBaseProp));
			subPixelOptimizeLine(line.shape, line.style.lineWidth);
			line.anid = "line";
			group.add(line);
		}
		var arrows = axisModel.get(["axisLine", "symbol"]);
		if (arrows != null) {
			var arrowSize = axisModel.get(["axisLine", "symbolSize"]);
			if (isString(arrows)) arrows = [arrows, arrows];
			if (isString(arrowSize) || isNumber(arrowSize)) arrowSize = [arrowSize, arrowSize];
			var arrowOffset = normalizeSymbolOffset(axisModel.get(["axisLine", "symbolOffset"]) || 0, arrowSize);
			var symbolWidth_1 = arrowSize[0];
			var symbolHeight_1 = arrowSize[1];
			each([{
				rotate: cfg.rotation + Math.PI / 2,
				offset: arrowOffset[0],
				r: 0
			}, {
				rotate: cfg.rotation - Math.PI / 2,
				offset: arrowOffset[1],
				r: Math.sqrt((pt1[0] - pt2[0]) * (pt1[0] - pt2[0]) + (pt1[1] - pt2[1]) * (pt1[1] - pt2[1]))
			}], function(point, index) {
				if (arrows[index] !== "none" && arrows[index] != null) {
					var symbol = createSymbol(arrows[index], -symbolWidth_1 / 2, -symbolHeight_1 / 2, symbolWidth_1, symbolHeight_1, lineStyle.stroke, true);
					var r = point.r + point.offset;
					var pt = inverse ? pt2 : pt1;
					symbol.attr({
						rotation: point.rotate,
						x: pt[0] + r * Math.cos(cfg.rotation),
						y: pt[1] - r * Math.sin(cfg.rotation),
						silent: true,
						z2: 11
					});
					group.add(symbol);
				}
			});
		}
	},
	/**
	* [CAUTION] This method can be called multiple times, following the change due to `resetCfg` called
	*  in size measurement. Thus this method should be idempotent, and should be performant.
	*/
	axisTickLabelEstimate: function(cfg, local, shared, axisModel, group, transformGroup, api, extraParams) {
		if (dealLastTickLabelResultReusable(local, group, extraParams)) layOutAxisTickLabel(cfg, local, shared, axisModel, group, transformGroup, api, AxisTickLabelComputingKind.estimate);
	},
	/**
	* Finish axis tick label build.
	* Can be only called once.
	*/
	axisTickLabelDetermine: function(cfg, local, shared, axisModel, group, transformGroup, api, extraParams) {
		if (dealLastTickLabelResultReusable(local, group, extraParams)) layOutAxisTickLabel(cfg, local, shared, axisModel, group, transformGroup, api, AxisTickLabelComputingKind.determine);
		var ticksEls = buildAxisMajorTicks(cfg, group, transformGroup, axisModel);
		syncLabelIgnoreToMajorTicks(cfg, local.labelLayoutList, ticksEls);
		buildAxisMinorTicks(cfg, group, transformGroup, axisModel, cfg.tickDirection);
	},
	/**
	* [CAUTION] This method can be called multiple times, following the change due to `resetCfg` called
	*  in size measurement. Thus this method should be idempotent, and should be performant.
	*/
	axisName: function(cfg, local, shared, axisModel, group, transformGroup, api, extraParams) {
		var sharedRecord = shared.ensureRecord(axisModel);
		if (local.nameEl) {
			group.remove(local.nameEl);
			local.nameEl = sharedRecord.nameLayout = sharedRecord.nameLocation = null;
		}
		var name = cfg.axisName;
		if (!hasAxisName(name)) return;
		var nameLocation = cfg.nameLocation;
		var nameDirection = cfg.nameDirection;
		var textStyleModel = axisModel.getModel("nameTextStyle");
		var gap = axisModel.get("nameGap") || 0;
		var extent = axisModel.axis.getExtent();
		var gapStartEndSignal = axisModel.axis.inverse ? -1 : 1;
		var pos = new Point(0, 0);
		var nameMoveDirVec = new Point(0, 0);
		if (nameLocation === "start") {
			pos.x = extent[0] - gapStartEndSignal * gap;
			nameMoveDirVec.x = -gapStartEndSignal;
		} else if (nameLocation === "end") {
			pos.x = extent[1] + gapStartEndSignal * gap;
			nameMoveDirVec.x = gapStartEndSignal;
		} else {
			pos.x = (extent[0] + extent[1]) / 2;
			pos.y = cfg.labelOffset + nameDirection * gap;
			nameMoveDirVec.y = nameDirection;
		}
		var mt = create();
		nameMoveDirVec.transform(rotate(mt, mt, cfg.rotation));
		var nameRotation = axisModel.get("nameRotate");
		if (nameRotation != null) nameRotation = nameRotation * PI / 180;
		var labelLayout;
		var axisNameAvailableWidth;
		if (isNameLocationCenter(nameLocation)) labelLayout = AxisBuilder.innerTextLayout(cfg.rotation, nameRotation != null ? nameRotation : cfg.rotation, nameDirection);
		else {
			labelLayout = endTextLayout(cfg.rotation, nameLocation, nameRotation || 0, extent);
			axisNameAvailableWidth = cfg.raw.axisNameAvailableWidth;
			if (axisNameAvailableWidth != null) {
				axisNameAvailableWidth = Math.abs(axisNameAvailableWidth / Math.sin(labelLayout.rotation));
				!isFinite(axisNameAvailableWidth) && (axisNameAvailableWidth = null);
			}
		}
		var textFont = textStyleModel.getFont();
		var truncateOpt = axisModel.get("nameTruncate", true) || {};
		var ellipsis = truncateOpt.ellipsis;
		var maxWidth = retrieve(cfg.raw.nameTruncateMaxWidth, truncateOpt.maxWidth, axisNameAvailableWidth);
		var nameMarginLevel = extraParams.nameMarginLevel || 0;
		var textEl = new ZRText({
			x: pos.x,
			y: pos.y,
			rotation: labelLayout.rotation,
			silent: AxisBuilder.isLabelSilent(axisModel),
			style: createTextStyle(textStyleModel, {
				text: name,
				font: textFont,
				overflow: "truncate",
				width: maxWidth,
				ellipsis,
				fill: textStyleModel.getTextColor() || axisModel.get([
					"axisLine",
					"lineStyle",
					"color"
				]),
				align: textStyleModel.get("align") || labelLayout.textAlign,
				verticalAlign: textStyleModel.get("verticalAlign") || labelLayout.textVerticalAlign
			}),
			z2: 1
		});
		setTooltipConfig({
			el: textEl,
			componentModel: axisModel,
			itemName: name
		});
		textEl.__fullText = name;
		textEl.anid = "name";
		if (axisModel.get("triggerEvent")) {
			var eventData = AxisBuilder.makeAxisEventDataBase(axisModel);
			eventData.targetType = "axisName";
			eventData.name = name;
			getECData(textEl).eventData = eventData;
		}
		transformGroup.add(textEl);
		textEl.updateTransform();
		local.nameEl = textEl;
		var nameLayout = sharedRecord.nameLayout = ensureLabelLayoutWithGeometry({
			label: textEl,
			priority: textEl.z2,
			defaultAttr: { ignore: textEl.ignore },
			marginDefault: isNameLocationCenter(nameLocation) ? DEFAULT_CENTER_NAME_MARGIN_LEVELS[nameMarginLevel] : DEFAULT_ENDS_NAME_MARGIN_LEVELS[nameMarginLevel]
		});
		sharedRecord.nameLocation = nameLocation;
		group.add(textEl);
		textEl.decomposeTransform();
		if (cfg.shouldNameMoveOverlap && nameLayout) {
			var record = shared.ensureRecord(axisModel);
			shared.resolveAxisNameOverlap(cfg, shared, axisModel, nameLayout, nameMoveDirVec, record);
		}
	}
};
function layOutAxisTickLabel(cfg, local, shared, axisModel, group, transformGroup, api, kind) {
	if (!axisLabelBuildResultExists(local)) buildAxisLabel(cfg, local, group, kind, axisModel, api);
	var labelLayoutList = local.labelLayoutList;
	updateAxisLabelChangableProps(cfg, axisModel, labelLayoutList, transformGroup);
	adjustBreakLabels(axisModel, cfg.rotation, labelLayoutList);
	var optionHideOverlap = cfg.optionHideOverlap;
	fixMinMaxLabelShow(axisModel, labelLayoutList, optionHideOverlap);
	if (optionHideOverlap) hideOverlap(filter(labelLayoutList, function(layout) {
		return layout && !layout.label.ignore;
	}));
	resetOverlapRecordToShared(cfg, shared, axisModel, labelLayoutList);
}
function endTextLayout(rotation, textPosition, textRotate, extent) {
	var rotationDiff = remRadian(textRotate - rotation);
	var textAlign;
	var textVerticalAlign;
	var inverse = extent[0] > extent[1];
	var onLeft = textPosition === "start" && !inverse || textPosition !== "start" && inverse;
	if (isRadianAroundZero(rotationDiff - PI / 2)) {
		textVerticalAlign = onLeft ? "bottom" : "top";
		textAlign = "center";
	} else if (isRadianAroundZero(rotationDiff - PI * 1.5)) {
		textVerticalAlign = onLeft ? "top" : "bottom";
		textAlign = "center";
	} else {
		textVerticalAlign = "middle";
		if (rotationDiff < PI * 1.5 && rotationDiff > PI / 2) textAlign = onLeft ? "left" : "right";
		else textAlign = onLeft ? "right" : "left";
	}
	return {
		rotation: rotationDiff,
		textAlign,
		textVerticalAlign
	};
}
/**
* Assume `labelLayoutList` has no `label.ignore: true`.
* Assume `labelLayoutList` have been sorted by value ascending order.
*/
function fixMinMaxLabelShow(axisModel, labelLayoutList, optionHideOverlap) {
	var axis = axisModel.axis;
	var customValuesOption = axisModel.get(["axisLabel", "customValues"]);
	if (shouldShowAllLabels(axis)) return;
	function deal(showMinMaxLabelOption, outmostLabelIdx, innerLabelIdx) {
		var outmostLabelLayout = ensureLabelLayoutWithGeometry(labelLayoutList[outmostLabelIdx]);
		var innerLabelLayout = ensureLabelLayoutWithGeometry(labelLayoutList[innerLabelIdx]);
		var scale = axis.scale;
		if (!outmostLabelLayout || !innerLabelLayout) return;
		if (showMinMaxLabelOption == null) {
			if (!optionHideOverlap && customValuesOption) return;
			var tick = getLabelInner(outmostLabelLayout.label).labelInfo.tick;
			if (isTimeScale(scale) && tick.notNice || isOrdinalScale(scale) && tick.offInterval) {
				ignoreEl(outmostLabelLayout.label);
				return;
			}
		}
		if (showMinMaxLabelOption === false || outmostLabelLayout.suggestIgnore) {
			ignoreEl(outmostLabelLayout.label);
			return;
		}
		if (innerLabelLayout.suggestIgnore) {
			ignoreEl(innerLabelLayout.label);
			return;
		}
		var touchThreshold = .1;
		if (!optionHideOverlap) {
			var marginForce = [
				0,
				0,
				0,
				0
			];
			outmostLabelLayout = newLabelLayoutWithGeometry({ marginForce }, outmostLabelLayout);
			innerLabelLayout = newLabelLayoutWithGeometry({ marginForce }, innerLabelLayout);
		}
		if (labelIntersect(outmostLabelLayout, innerLabelLayout, null, { touchThreshold })) {
			if (showMinMaxLabelOption) ignoreEl(innerLabelLayout.label);
			else ignoreEl(outmostLabelLayout.label);
		}
	}
	var showMinLabelOption = axisModel.get(["axisLabel", "showMinLabel"]);
	var showMaxLabelOption = axisModel.get(["axisLabel", "showMaxLabel"]);
	var labelsLen = labelLayoutList.length;
	deal(showMinLabelOption, 0, 1);
	deal(showMaxLabelOption, labelsLen - 1, labelsLen - 2);
}
function syncLabelIgnoreToMajorTicks(cfg, labelLayoutList, tickEls) {
	if (cfg.showMinorTicks) return;
	each(labelLayoutList, function(labelLayout) {
		if (labelLayout && labelLayout.label.ignore) for (var idx = 0; idx < tickEls.length; idx++) {
			var tickEl = tickEls[idx];
			var tickInner = getTickInner(tickEl);
			var labelInner = getLabelInner(labelLayout.label);
			if (tickInner.tickValue != null && !tickInner.onBand && tickInner.tickValue === labelInner.labelInfo.tick.value) {
				ignoreEl(tickEl);
				return;
			}
		}
	});
}
function ignoreEl(el) {
	el && (el.ignore = true);
}
function createTicks(ticksCoords, tickTransform, tickEndCoord, tickLineStyle, anidPrefix) {
	var tickEls = [];
	var pt1 = [];
	var pt2 = [];
	for (var i = 0; i < ticksCoords.length; i++) {
		var tickCoord = ticksCoords[i].coord;
		pt1[0] = tickCoord;
		pt1[1] = 0;
		pt2[0] = tickCoord;
		pt2[1] = tickEndCoord;
		if (tickTransform) {
			applyTransform(pt1, pt1, tickTransform);
			applyTransform(pt2, pt2, tickTransform);
		}
		var tickEl = new Line({
			shape: {
				x1: pt1[0],
				y1: pt1[1],
				x2: pt2[0],
				y2: pt2[1]
			},
			style: tickLineStyle,
			z2: 2,
			autoBatch: true,
			silent: true
		});
		subPixelOptimizeLine(tickEl.shape, tickEl.style.lineWidth);
		tickEl.anid = anidPrefix + "_" + ticksCoords[i].tickValue;
		tickEls.push(tickEl);
		var inner = getTickInner(tickEl);
		inner.onBand = !!ticksCoords[i].onBand;
		inner.tickValue = ticksCoords[i].tickValue;
	}
	return tickEls;
}
function buildAxisMajorTicks(cfg, group, transformGroup, axisModel) {
	var axis = axisModel.axis;
	var tickModel = axisModel.getModel("axisTick");
	var shown = tickModel.get("show");
	if (shown === "auto") {
		shown = true;
		if (cfg.raw.axisTickAutoShow != null) shown = !!cfg.raw.axisTickAutoShow;
	}
	if (!shown || axis.scale.isBlank()) return [];
	var lineStyleModel = tickModel.getModel("lineStyle");
	var tickEndCoord = cfg.tickDirection * tickModel.get("length");
	var ticksEls = createTicks(axis.getTicksCoords(), transformGroup.transform, tickEndCoord, defaults(lineStyleModel.getLineStyle(), { stroke: axisModel.get([
		"axisLine",
		"lineStyle",
		"color"
	]) }), "ticks");
	for (var i = 0; i < ticksEls.length; i++) group.add(ticksEls[i]);
	return ticksEls;
}
function buildAxisMinorTicks(cfg, group, transformGroup, axisModel, tickDirection) {
	var axis = axisModel.axis;
	var minorTickModel = axisModel.getModel("minorTick");
	if (!cfg.showMinorTicks || axis.scale.isBlank()) return;
	var minorTicksCoords = axis.getMinorTicksCoords();
	if (!minorTicksCoords.length) return;
	var lineStyleModel = minorTickModel.getModel("lineStyle");
	var tickEndCoord = tickDirection * minorTickModel.get("length");
	var minorTickLineStyle = defaults(lineStyleModel.getLineStyle(), defaults(axisModel.getModel("axisTick").getLineStyle(), { stroke: axisModel.get([
		"axisLine",
		"lineStyle",
		"color"
	]) }));
	for (var i = 0; i < minorTicksCoords.length; i++) {
		var minorTicksEls = createTicks(minorTicksCoords[i], transformGroup.transform, tickEndCoord, minorTickLineStyle, "minorticks_" + i);
		for (var k = 0; k < minorTicksEls.length; k++) group.add(minorTicksEls[k]);
	}
}
function dealLastTickLabelResultReusable(local, group, extraParams) {
	if (axisLabelBuildResultExists(local)) {
		var noPxChangeTryDetermine = local.axisLabelsCreationContext.out.noPxChangeTryDetermine;
		if (extraParams.noPxChange) {
			var canDetermine = true;
			for (var idx = 0; idx < noPxChangeTryDetermine.length; idx++) canDetermine = canDetermine && noPxChangeTryDetermine[idx]();
			if (canDetermine) return false;
		}
		if (noPxChangeTryDetermine.length) {
			group.remove(local.labelGroup);
			axisLabelBuildResultSet(local, null, null, null);
		}
	}
	return true;
}
function buildAxisLabel(cfg, local, group, kind, axisModel, api) {
	var axis = axisModel.axis;
	var show = retrieve(cfg.raw.axisLabelShow, axisModel.get(["axisLabel", "show"]));
	var labelGroup = new Group();
	group.add(labelGroup);
	var axisLabelCreationCtx = createAxisLabelsComputingContext(kind);
	if (!show || axis.scale.isBlank()) {
		axisLabelBuildResultSet(local, [], labelGroup, axisLabelCreationCtx);
		return;
	}
	var labelModel = axisModel.getModel("axisLabel");
	var labels = axis.getViewLabels(axisLabelCreationCtx);
	var labelRotation = (retrieve(cfg.raw.labelRotate, labelModel.get("rotate")) || 0) * PI / 180;
	var labelLayout = AxisBuilder.innerTextLayout(cfg.rotation, labelRotation, cfg.labelDirection);
	var rawCategoryData = axisModel.getCategories && axisModel.getCategories(true);
	var labelEls = [];
	var triggerEvent = axisModel.get("triggerEvent");
	var z2Min = Infinity;
	var z2Max = -Infinity;
	each(labels, function(labelItem, index) {
		var _a;
		var labelItemTick = labelItem.tick;
		var formattedLabel = labelItem.formattedLabel;
		var rawLabel = labelItem.rawLabel;
		var itemLabelModel = labelModel;
		var tickValue = getTickValueOutermost(axis.scale, labelItemTick);
		if (rawCategoryData && rawCategoryData[tickValue]) {
			var rawCategoryItem = rawCategoryData[tickValue];
			if (isObject(rawCategoryItem) && rawCategoryItem.textStyle) itemLabelModel = new Model(rawCategoryItem.textStyle, labelModel, axisModel.ecModel);
		}
		var textColor = itemLabelModel.getTextColor() || axisModel.get([
			"axisLine",
			"lineStyle",
			"color"
		]);
		var align = itemLabelModel.getShallow("align", true) || labelLayout.textAlign;
		var alignMin = retrieve2(itemLabelModel.getShallow("alignMinLabel", true), align);
		var alignMax = retrieve2(itemLabelModel.getShallow("alignMaxLabel", true), align);
		var verticalAlign = itemLabelModel.getShallow("verticalAlign", true) || itemLabelModel.getShallow("baseline", true) || labelLayout.textVerticalAlign;
		var verticalAlignMin = retrieve2(itemLabelModel.getShallow("verticalAlignMinLabel", true), verticalAlign);
		var verticalAlignMax = retrieve2(itemLabelModel.getShallow("verticalAlignMaxLabel", true), verticalAlign);
		var z2 = 10 + (((_a = labelItemTick.time) === null || _a === void 0 ? void 0 : _a.level) || 0);
		z2Min = Math.min(z2Min, z2);
		z2Max = Math.max(z2Max, z2);
		var textEl = new ZRText({
			x: 0,
			y: 0,
			rotation: 0,
			silent: AxisBuilder.isLabelSilent(axisModel),
			z2,
			style: createTextStyle(itemLabelModel, {
				text: formattedLabel,
				align: index === 0 ? alignMin : index === labels.length - 1 ? alignMax : align,
				verticalAlign: index === 0 ? verticalAlignMin : index === labels.length - 1 ? verticalAlignMax : verticalAlign,
				fill: isFunction(textColor) ? textColor(axis.type === "category" ? rawLabel : axis.type === "value" ? tickValue + "" : tickValue, index) : textColor
			})
		});
		textEl.anid = "label_" + tickValue;
		var inner = getLabelInner(textEl);
		inner.labelInfo = labelItem;
		inner.layoutRotation = labelLayout.rotation;
		setTooltipConfig({
			el: textEl,
			componentModel: axisModel,
			itemName: formattedLabel,
			formatterParamsExtra: {
				isTruncated: function() {
					return textEl.isTruncated;
				},
				value: rawLabel,
				tickIndex: index
			}
		});
		if (triggerEvent) {
			var eventData = AxisBuilder.makeAxisEventDataBase(axisModel);
			eventData.targetType = "axisLabel";
			eventData.value = rawLabel;
			eventData.tickIndex = index;
			var labelItemTickBreak = labelItem.tick["break"];
			if (labelItemTickBreak) {
				var labelItemTickBreakParsedBreak = labelItemTickBreak.parsedBreak;
				eventData["break"] = {
					start: labelItemTickBreakParsedBreak.vmin,
					end: labelItemTickBreakParsedBreak.vmax
				};
			}
			if (axis.type === "category") eventData.dataIndex = tickValue;
			getECData(textEl).eventData = eventData;
			if (labelItemTickBreak) addBreakEventHandler(axisModel, api, textEl, labelItemTickBreak);
		}
		labelEls.push(textEl);
		labelGroup.add(textEl);
	});
	axisLabelBuildResultSet(local, map(labelEls, function(label) {
		return {
			label,
			priority: getLabelInner(label).labelInfo.tick["break"] ? label.z2 + (z2Max - z2Min + 1) : label.z2,
			defaultAttr: { ignore: label.ignore }
		};
	}), labelGroup, axisLabelCreationCtx);
}
function axisLabelBuildResultExists(local) {
	return !!local.labelLayoutList;
}
function axisLabelBuildResultSet(local, labelLayoutList, labelGroup, axisLabelsCreationContext) {
	local.labelLayoutList = labelLayoutList;
	local.labelGroup = labelGroup;
	local.axisLabelsCreationContext = axisLabelsCreationContext;
}
function updateAxisLabelChangableProps(cfg, axisModel, labelLayoutList, transformGroup) {
	var labelMargin = axisModel.get(["axisLabel", "margin"]);
	each(labelLayoutList, function(layout, idx) {
		var geometry = ensureLabelLayoutWithGeometry(layout);
		if (!geometry) return;
		var labelEl = geometry.label;
		var inner = getLabelInner(labelEl);
		geometry.suggestIgnore = labelEl.ignore;
		labelEl.ignore = false;
		copyTransform(_tmpLayoutEl, _tmpLayoutElReset);
		var axis = axisModel.axis;
		_tmpLayoutEl.x = axis.dataToCoord(getTickValueOutermost(axis.scale, inner.labelInfo.tick));
		_tmpLayoutEl.y = cfg.labelOffset + cfg.labelDirection * labelMargin;
		_tmpLayoutEl.rotation = inner.layoutRotation;
		transformGroup.add(_tmpLayoutEl);
		_tmpLayoutEl.updateTransform();
		transformGroup.remove(_tmpLayoutEl);
		_tmpLayoutEl.decomposeTransform();
		copyTransform(labelEl, _tmpLayoutEl);
		labelEl.markRedraw();
		setLabelLayoutDirty(geometry, true);
		ensureLabelLayoutWithGeometry(geometry);
	});
}
var _tmpLayoutEl = new Rect();
var _tmpLayoutElReset = new Rect();
function hasAxisName(axisName) {
	return !!axisName;
}
function addBreakEventHandler(axisModel, api, textEl, visualBreak) {
	textEl.on("click", function(params) {
		var payload = {
			type: AXIS_BREAK_EXPAND_ACTION_TYPE,
			breaks: [{
				start: visualBreak.parsedBreak.breakOption.start,
				end: visualBreak.parsedBreak.breakOption.end
			}]
		};
		payload[axisModel.axis.dim + "AxisIndex"] = axisModel.componentIndex;
		api.dispatchAction(payload);
	});
}
function adjustBreakLabels(axisModel, axisRotation, labelLayoutList) {
	var scaleBreakHelper = getScaleBreakHelper();
	if (!scaleBreakHelper) return;
	var breakLabelIndexPairs = scaleBreakHelper.retrieveAxisBreakPairs(labelLayoutList, function(layoutInfo) {
		return layoutInfo && getLabelInner(layoutInfo.label).labelInfo.tick["break"];
	}, true);
	var moveOverlap = axisModel.get(["breakLabelLayout", "moveOverlap"], true);
	if (moveOverlap === true || moveOverlap === "auto") each(breakLabelIndexPairs, function(idxPair) {
		getAxisBreakHelper().adjustBreakLabelPair(axisModel.axis.inverse, axisRotation, [ensureLabelLayoutWithGeometry(labelLayoutList[idxPair[0]]), ensureLabelLayoutWithGeometry(labelLayoutList[idxPair[1]])]);
	});
}
//#endregion
//#region node_modules/echarts/lib/coord/cartesian/cartesianAxisHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* [__CAUTION__]
*  MUST guarantee: if only the input `rect` and `axis.extent` changed,
*  only `layout.position` changes.
*  This character is replied on `grid.contain` calculation in `AxisBuilder`.
*  @see updateCartesianAxisViewCommonPartBuilder
*
* Can only be called after coordinate system creation stage.
* (Can be called before coordinate system update stage).
*/
function layout(rect, axisModel, opt) {
	opt = opt || {};
	var axis = axisModel.axis;
	var layout = {};
	var otherAxisOnZeroOf = axis.getAxesOnZeroOf()[0];
	var rawAxisPosition = axis.position;
	var axisPosition = otherAxisOnZeroOf ? "onZero" : rawAxisPosition;
	var axisDim = axis.dim;
	var rectBound = [
		rect.x,
		rect.x + rect.width,
		rect.y,
		rect.y + rect.height
	];
	var idx = {
		left: 0,
		right: 1,
		top: 0,
		bottom: 1,
		onZero: 2
	};
	var axisOffset = axisModel.get("offset") || 0;
	var posBound = axisDim === "x" ? [rectBound[2] - axisOffset, rectBound[3] + axisOffset] : [rectBound[0] - axisOffset, rectBound[1] + axisOffset];
	if (otherAxisOnZeroOf) {
		var onZeroCoord = otherAxisOnZeroOf.toGlobalCoord(otherAxisOnZeroOf.dataToCoord(0));
		posBound[idx.onZero] = Math.max(Math.min(onZeroCoord, posBound[1]), posBound[0]);
	}
	layout.position = [axisDim === "y" ? posBound[idx[axisPosition]] : rectBound[0], axisDim === "x" ? posBound[idx[axisPosition]] : rectBound[3]];
	layout.rotation = Math.PI / 2 * (axisDim === "x" ? 0 : 1);
	layout.labelDirection = layout.tickDirection = layout.nameDirection = {
		top: -1,
		bottom: 1,
		left: -1,
		right: 1
	}[rawAxisPosition];
	layout.labelOffset = otherAxisOnZeroOf ? posBound[idx[rawAxisPosition]] - posBound[idx.onZero] : 0;
	if (axisModel.get(["axisTick", "inside"])) layout.tickDirection = -layout.tickDirection;
	if (retrieve(opt.labelInside, axisModel.get(["axisLabel", "inside"]))) layout.labelDirection = -layout.labelDirection;
	var labelRotate = axisModel.get(["axisLabel", "rotate"]);
	layout.labelRotate = axisPosition === "top" ? -labelRotate : labelRotate;
	layout.z2 = 1;
	return layout;
}
/**
* Note: If pie (or other similar series) use cartesian2d, here
*  option `seriesModel.get('coordinateSystem') === 'cartesian2d'`
*  and `seriesModel.coordinateSystem !== cartesian2dCoordSysInstance`
*  and `seriesModel.boxCoordinateSystem === cartesian2dCoordSysInstance`,
*  the logic below is probably wrong, therefore skip it temporarily.
*/
function isCartesian2DInjectedAsDataCoordSys(seriesModel) {
	return seriesModel.coordinateSystem && seriesModel.coordinateSystem.type === "cartesian2d";
}
function findAxisModels(seriesModel) {
	var axisModelMap = {
		xAxisModel: null,
		yAxisModel: null
	};
	each(axisModelMap, function(v, key) {
		var axisType = key.replace(/Model$/, "");
		axisModelMap[key] = seriesModel.getReferringComponents(axisType, SINGLE_REFERRING).models[0];
	});
	return axisModelMap;
}
function createCartesianAxisViewCommonPartBuilder(gridRect, cartesians, axisModel, api, ctx, defaultNameMoveOverlap) {
	var layoutResult = layout(gridRect, axisModel);
	var axisLineAutoShow = false;
	var axisTickAutoShow = false;
	for (var i = 0; i < cartesians.length; i++) if (isIntervalOrLogScale(cartesians[i].getOtherAxis(axisModel.axis).scale)) {
		axisLineAutoShow = axisTickAutoShow = true;
		if (axisModel.axis.type === "category" && axisModel.axis.onBand) axisTickAutoShow = false;
	}
	layoutResult.axisLineAutoShow = axisLineAutoShow;
	layoutResult.axisTickAutoShow = axisTickAutoShow;
	layoutResult.defaultNameMoveOverlap = defaultNameMoveOverlap;
	return new AxisBuilder(axisModel, api, layoutResult, ctx);
}
function updateCartesianAxisViewCommonPartBuilder(axisBuilder, gridRect, axisModel) {
	var newRaw = layout(gridRect, axisModel);
	axisBuilder.updateCfg(newRaw);
}
//#endregion
//#region node_modules/echarts/lib/coord/cartesian/GridModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var OUTER_BOUNDS_DEFAULT = {
	left: 0,
	right: 0,
	top: 0,
	bottom: 0
};
var OUTER_BOUNDS_CLAMP_DEFAULT = ["25%", "25%"];
var COORD_SYS_TYPE_CARTESIAN_2D = "cartesian2d";
var GridModel = function(_super) {
	__extends(GridModel, _super);
	function GridModel() {
		return _super !== null && _super.apply(this, arguments) || this;
	}
	GridModel.prototype.mergeDefaultAndTheme = function(option, ecModel) {
		var outerBoundsCp = getLayoutParams(option.outerBounds);
		_super.prototype.mergeDefaultAndTheme.apply(this, arguments);
		if (outerBoundsCp && option.outerBounds) mergeLayoutParam(option.outerBounds, outerBoundsCp);
	};
	GridModel.prototype.mergeOption = function(newOption, ecModel) {
		_super.prototype.mergeOption.apply(this, arguments);
		if (this.option.outerBounds && newOption.outerBounds) mergeLayoutParam(this.option.outerBounds, newOption.outerBounds);
	};
	GridModel.type = "grid";
	GridModel.dependencies = ["xAxis", "yAxis"];
	GridModel.layoutMode = "box";
	GridModel.defaultOption = {
		show: false,
		z: 0,
		left: "15%",
		top: 65,
		right: "10%",
		bottom: 80,
		containLabel: false,
		outerBoundsMode: "auto",
		outerBounds: OUTER_BOUNDS_DEFAULT,
		outerBoundsContain: "all",
		outerBoundsClampWidth: OUTER_BOUNDS_CLAMP_DEFAULT[0],
		outerBoundsClampHeight: OUTER_BOUNDS_CLAMP_DEFAULT[1],
		backgroundColor: tokens.color.transparent,
		borderWidth: 1,
		borderColor: tokens.color.neutral30
	};
	return GridModel;
}(ComponentModel);
//#endregion
//#region node_modules/echarts/lib/coord/cartesian/AxisModel.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var CartesianAxisModel = function(_super) {
	__extends(CartesianAxisModel, _super);
	function CartesianAxisModel() {
		return _super !== null && _super.apply(this, arguments) || this;
	}
	CartesianAxisModel.prototype.getCoordSysModel = function() {
		return this.getReferringComponents("grid", SINGLE_REFERRING).models[0];
	};
	CartesianAxisModel.type = "cartesian2dAxis";
	return CartesianAxisModel;
}(ComponentModel);
mixin(CartesianAxisModel, AxisModelCommonMixin);
//#endregion
//#region node_modules/echarts/lib/coord/axisDefault.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var defaultOption = {
	show: true,
	z: 0,
	inverse: false,
	name: "",
	nameLocation: "end",
	nameRotate: null,
	nameTruncate: {
		maxWidth: null,
		ellipsis: "...",
		placeholder: "."
	},
	nameTextStyle: {},
	nameGap: 15,
	silent: false,
	triggerEvent: false,
	tooltip: { show: false },
	axisPointer: {},
	axisLine: {
		show: true,
		onZero: "auto",
		onZeroAxisIndex: null,
		lineStyle: {
			color: tokens.color.axisLine,
			width: 1,
			type: "solid"
		},
		symbol: ["none", "none"],
		symbolSize: [10, 15],
		breakLine: true
	},
	axisTick: {
		show: true,
		inside: false,
		length: 5,
		lineStyle: { width: 1 }
	},
	axisLabel: {
		show: true,
		inside: false,
		rotate: 0,
		showMinLabel: null,
		showMaxLabel: null,
		margin: 8,
		fontSize: 12,
		color: tokens.color.axisLabel,
		textMargin: [0, 3]
	},
	splitLine: {
		show: true,
		showMinLine: true,
		showMaxLine: true,
		lineStyle: {
			color: tokens.color.axisSplitLine,
			width: 1,
			type: "solid"
		}
	},
	splitArea: {
		show: false,
		areaStyle: { color: [tokens.color.backgroundTint, tokens.color.backgroundTransparent] }
	},
	breakArea: {
		show: true,
		itemStyle: {
			color: tokens.color.neutral00,
			borderColor: tokens.color.border,
			borderWidth: 1,
			borderType: [3, 3],
			opacity: .6
		},
		zigzagAmplitude: 4,
		zigzagMinSpan: 4,
		zigzagMaxSpan: 20,
		zigzagZ: 100,
		expandOnClick: true
	},
	breakLabelLayout: { moveOverlap: "auto" }
};
var categoryAxis = merge({
	boundaryGap: true,
	deduplication: null,
	jitter: 0,
	jitterOverlap: true,
	jitterMargin: 2,
	splitLine: { show: false },
	axisTick: {
		alignWithLabel: false,
		interval: "auto",
		show: "auto"
	},
	axisLabel: { interval: "auto" }
}, defaultOption);
var valueAxis = merge({
	boundaryGap: [0, 0],
	axisLine: { show: "auto" },
	axisTick: { show: "auto" },
	splitNumber: 5,
	minorTick: {
		show: false,
		splitNumber: 5,
		length: 3,
		lineStyle: {}
	},
	minorSplitLine: {
		show: false,
		lineStyle: {
			color: tokens.color.axisMinorSplitLine,
			width: 1
		}
	}
}, defaultOption);
var axisDefault_default = {
	category: categoryAxis,
	value: valueAxis,
	time: merge({
		splitNumber: 6,
		axisLabel: { rich: { primary: { fontWeight: "bold" } } },
		splitLine: { show: false }
	}, valueAxis),
	log: defaults({ logBase: 10 }, valueAxis)
};
//#endregion
//#region node_modules/echarts/lib/coord/axisModelCreator.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Generate sub axis model class
* @param axisName 'x' 'y' 'radius' 'angle' 'parallel' ...
*/
function axisModelCreator(registers, axisName, BaseAxisModelClass, extraDefaultOption) {
	each(AXIS_TYPES, function(v, axisType) {
		var defaultOption = merge(merge({}, axisDefault_default[axisType], true), extraDefaultOption, true);
		var AxisModel = function(_super) {
			__extends(AxisModel, _super);
			function AxisModel() {
				var _this = _super !== null && _super.apply(this, arguments) || this;
				_this.type = axisName + "Axis." + axisType;
				return _this;
			}
			AxisModel.prototype.mergeDefaultAndTheme = function(option, ecModel) {
				var layoutMode = fetchLayoutMode(this);
				var inputPositionParams = layoutMode ? getLayoutParams(option) : {};
				var themeModel = ecModel.getTheme();
				merge(option, themeModel.get(axisType + "Axis"));
				merge(option, this.getDefaultOption());
				option.type = getAxisType(option);
				if (layoutMode) mergeLayoutParam(option, inputPositionParams, layoutMode);
			};
			AxisModel.prototype.optionUpdated = function() {
				if (this.option.type === "category") this.__ordinalMeta = OrdinalMeta.createByAxisModel(this);
			};
			/**
			* Should not be called before all of 'getInitailData' finished.
			* Because categories are collected during initializing data.
			*/
			AxisModel.prototype.getCategories = function(rawData) {
				var option = this.option;
				if (option.type === "category") {
					if (rawData) return option.data;
					return this.__ordinalMeta.categories;
				}
			};
			AxisModel.prototype.getOrdinalMeta = function() {
				return this.__ordinalMeta;
			};
			AxisModel.prototype.updateAxisBreaks = function(payload) {
				var axisBreakHelper = getAxisBreakHelper();
				return axisBreakHelper ? axisBreakHelper.updateModelAxisBreak(this, payload) : { breaks: [] };
			};
			AxisModel.type = axisName + "Axis." + axisType;
			AxisModel.defaultOption = defaultOption;
			return AxisModel;
		}(BaseAxisModelClass);
		registers.registerComponentModel(AxisModel);
	});
	registers.registerSubTypeDefaulter(axisName + "Axis", getAxisType);
}
function getAxisType(option) {
	return option.type || (option.data ? "category" : "value");
}
//#endregion
//#region node_modules/echarts/lib/coord/cartesian/Cartesian.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var Cartesian = function() {
	function Cartesian(name) {
		this.type = "cartesian";
		this._dimList = [];
		this._axes = {};
		this.name = name || "";
	}
	Cartesian.prototype.getAxis = function(dim) {
		return this._axes[dim];
	};
	Cartesian.prototype.getAxes = function() {
		return map(this._dimList, function(dim) {
			return this._axes[dim];
		}, this);
	};
	Cartesian.prototype.getAxesByScale = function(scaleType) {
		scaleType = scaleType.toLowerCase();
		return filter(this.getAxes(), function(axis) {
			return axis.scale.type === scaleType;
		});
	};
	Cartesian.prototype.addAxis = function(axis) {
		var dim = axis.dim;
		this._axes[dim] = axis;
		this._dimList.push(dim);
	};
	return Cartesian;
}();
//#endregion
//#region node_modules/echarts/lib/coord/cartesian/Cartesian2D.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var cartesian2DDimensions = ["x", "y"];
function canCalculateAffineTransform(scale) {
	return (scale.type === "interval" || scale.type === "time") && !hasBreaks(scale);
}
var Cartesian2D = function(_super) {
	__extends(Cartesian2D, _super);
	function Cartesian2D() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = COORD_SYS_TYPE_CARTESIAN_2D;
		_this.dimensions = cartesian2DDimensions;
		return _this;
	}
	/**
	* Calculate an affine transform matrix if two axes are time or value.
	* It's mainly for accelartion on the large time series data.
	*/
	Cartesian2D.prototype.calcAffineTransform = function() {
		this._transform = this._invTransform = null;
		var xAxisScale = this.getAxis("x").scale;
		var yAxisScale = this.getAxis("y").scale;
		if (!canCalculateAffineTransform(xAxisScale) || !canCalculateAffineTransform(yAxisScale)) return;
		var xScaleExtent = getScaleExtentForMappingUnsafe(xAxisScale, null);
		var yScaleExtent = getScaleExtentForMappingUnsafe(yAxisScale, null);
		var start = this.dataToPoint([xScaleExtent[0], yScaleExtent[0]]);
		var end = this.dataToPoint([xScaleExtent[1], yScaleExtent[1]]);
		var xScaleSpan = xScaleExtent[1] - xScaleExtent[0];
		var yScaleSpan = yScaleExtent[1] - yScaleExtent[0];
		if (!xScaleSpan || !yScaleSpan) return;
		var scaleX = (end[0] - start[0]) / xScaleSpan;
		var scaleY = (end[1] - start[1]) / yScaleSpan;
		var translateX = start[0] - xScaleExtent[0] * scaleX;
		var translateY = start[1] - yScaleExtent[0] * scaleY;
		var m = this._transform = [
			scaleX,
			0,
			0,
			scaleY,
			translateX,
			translateY
		];
		this._invTransform = invert([], m);
	};
	/**
	* Base axis will be used on stacking and series such as 'bar', 'pictorialBar', etc.
	*/
	Cartesian2D.prototype.getBaseAxis = function() {
		return this.getAxesByScale("ordinal")[0] || this.getAxesByScale("time")[0] || this.getAxis("x");
	};
	Cartesian2D.prototype.containPoint = function(point) {
		var axisX = this.getAxis("x");
		var axisY = this.getAxis("y");
		return axisX.contain(axisX.toLocalCoord(point[0])) && axisY.contain(axisY.toLocalCoord(point[1]));
	};
	Cartesian2D.prototype.containData = function(data) {
		return this.getAxis("x").containData(data[0]) && this.getAxis("y").containData(data[1]);
	};
	Cartesian2D.prototype.containZone = function(data1, data2) {
		var zoneDiag1 = this.dataToPoint(data1);
		var zoneDiag2 = this.dataToPoint(data2);
		var area = this.getArea();
		var zone = new BoundingRect(zoneDiag1[0], zoneDiag1[1], zoneDiag2[0] - zoneDiag1[0], zoneDiag2[1] - zoneDiag1[1]);
		return area.intersect(zone);
	};
	Cartesian2D.prototype.dataToPoint = function(data, clamp, out) {
		out = out || [];
		var xVal = data[0];
		var yVal = data[1];
		if (this._transform && xVal != null && isFinite(xVal) && yVal != null && isFinite(yVal)) return applyTransform(out, data, this._transform);
		var xAxis = this.getAxis("x");
		var yAxis = this.getAxis("y");
		out[0] = xAxis.toGlobalCoord(xAxis.dataToCoord(xVal, clamp));
		out[1] = yAxis.toGlobalCoord(yAxis.dataToCoord(yVal, clamp));
		return out;
	};
	Cartesian2D.prototype.clampData = function(data, out) {
		var xScale = this.getAxis("x").scale;
		var yScale = this.getAxis("y").scale;
		var xAxisExtent = xScale.getExtent();
		var yAxisExtent = yScale.getExtent();
		var x = xScale.parse(data[0]);
		var y = yScale.parse(data[1]);
		out = out || [];
		out[0] = Math.min(Math.max(Math.min(xAxisExtent[0], xAxisExtent[1]), x), Math.max(xAxisExtent[0], xAxisExtent[1]));
		out[1] = Math.min(Math.max(Math.min(yAxisExtent[0], yAxisExtent[1]), y), Math.max(yAxisExtent[0], yAxisExtent[1]));
		return out;
	};
	Cartesian2D.prototype.pointToData = function(point, clamp, out) {
		out = out || [];
		if (this._invTransform) return applyTransform(out, point, this._invTransform);
		var xAxis = this.getAxis("x");
		var yAxis = this.getAxis("y");
		out[0] = xAxis.coordToData(xAxis.toLocalCoord(point[0]), clamp);
		out[1] = yAxis.coordToData(yAxis.toLocalCoord(point[1]), clamp);
		return out;
	};
	Cartesian2D.prototype.getOtherAxis = function(axis) {
		return this.getAxis(axis.dim === "x" ? "y" : "x");
	};
	/**
	* Get rect area of cartesian.
	* Area will have a contain function to determine if a point is in the coordinate system.
	*/
	Cartesian2D.prototype.getArea = function(tolerance) {
		tolerance = tolerance || 0;
		var xExtent = this.getAxis("x").getGlobalExtent();
		var yExtent = this.getAxis("y").getGlobalExtent();
		var x = Math.min(xExtent[0], xExtent[1]) - tolerance;
		var y = Math.min(yExtent[0], yExtent[1]) - tolerance;
		var width = Math.max(xExtent[0], xExtent[1]) - x + tolerance;
		var height = Math.max(yExtent[0], yExtent[1]) - y + tolerance;
		return new BoundingRect(x, y, width, height);
	};
	return Cartesian2D;
}(Cartesian);
//#endregion
//#region node_modules/echarts/lib/coord/axisAlignTicks.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* NOTE: See the summary of the process of extent determination in the comment of `scaleMapper.setExtent`.
*
* @see SCALE_EXTENT_CONSTRUCTION for the full processing flow.
*/
function scaleCalcAlign(targetAxis, alignToScale) {
	var targetScale = targetAxis.scale;
	var targetAxisModel = targetAxis.model;
	var targetExtentInfo = adoptScaleRawExtentInfoAndPrepare(targetScale, targetAxisModel, targetAxisModel.ecModel, targetAxis, null);
	var isTargetLogScale = isLogScale(targetScale);
	var alignToScaleLinear = isLogScale(alignToScale) ? alignToScale.intervalStub : alignToScale;
	var targetIntervalStub = isTargetLogScale ? targetScale.intervalStub : targetScale;
	var targetLogScaleBase = targetScale.base;
	var alignToTicks = alignToScaleLinear.getTicks();
	var alignToExpNiceTicks = alignToScaleLinear.getTicks({ expandToNicedExtent: true });
	var alignToSegCount = alignToTicks.length - 1;
	var t0;
	var t1;
	var alignToNiceSegCount;
	if (alignToSegCount === 1) {
		t0 = t1 = 0;
		alignToNiceSegCount = 1;
	} else if (alignToSegCount === 2) {
		var interval0 = mathAbs(alignToTicks[0].value - alignToTicks[1].value);
		var interval1 = mathAbs(alignToTicks[1].value - alignToTicks[2].value);
		t0 = t1 = 0;
		if (interval0 === interval1) alignToNiceSegCount = 2;
		else {
			alignToNiceSegCount = 1;
			if (interval0 < interval1) t0 = interval0 / interval1;
			else t1 = interval1 / interval0;
		}
	} else {
		var alignToInterval = alignToScaleLinear.getConfig().interval;
		t0 = (1 - (alignToTicks[0].value - alignToExpNiceTicks[0].value) / alignToInterval) % 1;
		t1 = (1 - (alignToExpNiceTicks[alignToSegCount].value - alignToTicks[alignToSegCount].value) / alignToInterval) % 1;
		alignToNiceSegCount = alignToSegCount - (t0 ? 1 : 0) - (t1 ? 1 : 0);
	}
	var dataZoomFixMinMax = targetExtentInfo.zoomFixMM;
	var hasDataZoomFixMinMax = dataZoomFixMinMax[0] || dataZoomFixMinMax[1];
	var targetMinMaxFixed = [targetExtentInfo.fixMM[0] || hasDataZoomFixMinMax, targetExtentInfo.fixMM[1] || hasDataZoomFixMinMax];
	var targetOldOutermostExtent = targetScale.getExtent();
	var targetOldIntervalExtent = targetIntervalStub.getExtent();
	var targetExtent = intervalScaleEnsureValidExtent(targetOldIntervalExtent, targetMinMaxFixed);
	var min;
	var max;
	var interval;
	var intervalPrecision;
	var maxNice;
	var minNice;
	function loopIncreaseInterval(cb) {
		var LOOP_MAX = 50;
		var loopGuard = 0;
		for (; loopGuard < LOOP_MAX; loopGuard++) {
			if (cb()) break;
			interval = isTargetLogScale ? interval * mathMax(targetLogScaleBase, 2) : increaseInterval(interval);
			intervalPrecision = getIntervalPrecision(interval);
		}
	}
	function updateMinFromMinNice() {
		min = round(minNice - interval * t0, intervalPrecision);
	}
	function updateMaxFromMaxNice() {
		max = round(maxNice + interval * t1, intervalPrecision);
	}
	function updateMinNiceFromMinT0Interval() {
		minNice = t0 ? round(min + interval * t0, intervalPrecision) : min;
	}
	function updateMaxNiceFromMaxT1Interval() {
		maxNice = t1 ? round(max - interval * t1, intervalPrecision) : max;
	}
	if (targetMinMaxFixed[0] && targetMinMaxFixed[1]) {
		min = targetExtent[0];
		max = targetExtent[1];
		interval = (max - min) / (alignToNiceSegCount + t0 + t1);
		var axisPxExtent = targetAxis.getExtent();
		var pxSpan = mathAbs(axisPxExtent[1] - axisPxExtent[0]);
		intervalPrecision = getAcceptableTickPrecision([max, min], pxSpan, .5 / alignToNiceSegCount);
		updateMinNiceFromMinT0Interval();
		updateMaxNiceFromMaxT1Interval();
		if (isNullableNumberFinite(intervalPrecision)) interval = round(interval, intervalPrecision);
	} else {
		var targetSpan = targetExtent[1] - targetExtent[0];
		interval = isTargetLogScale ? mathMax(quantity(targetSpan), 1) : nice(targetSpan / alignToNiceSegCount, 2);
		intervalPrecision = getIntervalPrecision(interval);
		if (targetMinMaxFixed[0]) {
			min = targetExtent[0];
			loopIncreaseInterval(function() {
				updateMinNiceFromMinT0Interval();
				maxNice = round(minNice + interval * alignToNiceSegCount, intervalPrecision);
				updateMaxFromMaxNice();
				if (max >= targetExtent[1]) return true;
			});
		} else if (targetMinMaxFixed[1]) {
			max = targetExtent[1];
			loopIncreaseInterval(function() {
				updateMaxNiceFromMaxT1Interval();
				minNice = round(maxNice - interval * alignToNiceSegCount, intervalPrecision);
				updateMinFromMinNice();
				if (min <= targetExtent[0]) return true;
			});
		} else loopIncreaseInterval(function() {
			minNice = round(mathCeil(targetExtent[0] / interval) * interval, intervalPrecision);
			maxNice = round(mathFloor(targetExtent[1] / interval) * interval, intervalPrecision);
			var currIntervalCount = mathRound((maxNice - minNice) / interval);
			if (currIntervalCount <= alignToNiceSegCount) {
				var moreCount = alignToNiceSegCount - currIntervalCount;
				var moreCountPair = void 0;
				var mayEnhanceZero = targetExtentInfo.incl0 || isTargetLogScale;
				if (mayEnhanceZero && targetExtent[0] === 0) moreCountPair = [0, moreCount];
				else if (mayEnhanceZero && targetExtent[1] === 0) moreCountPair = [moreCount, 0];
				else {
					var lessHalfCount = mathFloor(moreCount / 2);
					moreCountPair = moreCount % 2 === 0 ? [lessHalfCount, lessHalfCount] : min + max < targetExtent[0] + targetExtent[1] ? [lessHalfCount, lessHalfCount + 1] : [lessHalfCount + 1, lessHalfCount];
				}
				minNice = round(minNice - interval * moreCountPair[0], intervalPrecision);
				maxNice = round(maxNice + interval * moreCountPair[1], intervalPrecision);
				updateMinFromMinNice();
				updateMaxFromMaxNice();
				if (min <= targetExtent[0] && max >= targetExtent[1]) return true;
			}
		});
	}
	updateIntervalOrLogScaleForNiceOrAligned(targetScale, targetMinMaxFixed, targetOldIntervalExtent, [min, max], targetOldOutermostExtent, {
		interval,
		intervalCount: alignToNiceSegCount,
		intervalPrecision,
		niceExtent: [minNice, maxNice]
	});
}
//#endregion
//#region node_modules/echarts/lib/coord/cartesian/Grid.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Grid is a region which contains at most 4 cartesian systems
*
* TODO Default cartesian
*/
var XY_TO_MARGIN_IDX = [[3, 1], [0, 2]];
var Grid = function() {
	function Grid(gridModel, ecModel, api) {
		this.type = "grid";
		this._coordsMap = {};
		this._coordsList = [];
		this._axesMap = {};
		this._axesList = [];
		this.axisPointerEnabled = true;
		this.dimensions = cartesian2DDimensions;
		this._initCartesian(gridModel, ecModel, api);
		this.model = gridModel;
	}
	Grid.prototype.getRect = function() {
		return this._rect;
	};
	Grid.prototype.update = function(ecModel, api) {
		var axesMap = this._axesMap;
		each(this._axesList, function(axis) {
			scaleRawExtentInfoCreate(axis, 1);
			var scale = axis.scale;
			if (isOrdinalScale(scale)) scale.setSortInfo(axis.model.get("categorySortInfo"));
		});
		function updateAxisTicks(axes) {
			var axesIndices = keys(axes);
			var axisNeedsAlign = [];
			for (var i = axesIndices.length - 1; i >= 0; i--) {
				var axis = axes[+axesIndices[i]];
				if (axis.__alignTo) axisNeedsAlign.push(axis);
				else scaleCalcNice(axis);
			}
			each(axisNeedsAlign, function(axis) {
				if (incapableOfAlignNeedFallback(axis, axis.__alignTo)) scaleCalcNice(axis);
				else scaleCalcAlign(axis, axis.__alignTo.scale);
			});
		}
		updateAxisTicks(axesMap.x);
		updateAxisTicks(axesMap.y);
		var onZeroRecords = {};
		each(axesMap.x, function(xAxis) {
			fixAxisOnZero(axesMap, "y", xAxis, onZeroRecords);
		});
		each(axesMap.y, function(yAxis) {
			fixAxisOnZero(axesMap, "x", yAxis, onZeroRecords);
		});
		this.resize(this.model, api);
	};
	/**
	* Resize the grid.
	*
	* [NOTE]
	* If both "grid.containLabel/grid.contain" and pixel-required-data-processing (such as, "dataSampling")
	* exist, circular dependency occurs in logic.
	* The final compromised sequence is:
	*  1. Calculate "axis.extent" (pixel extent) and AffineTransform based on only "grid layout options".
	*      Not accurate if "grid.containLabel/grid.contain" is required, but it is a compromise to avoid
	*      circular dependency.
	*  2. Perform "series data processing" (where "dataSampling" requires "axis.extent").
	*  3. Calculate "scale.extent" (data extent) based on "processed series data".
	*  4. Modify "axis.extent" for "grid.containLabel/grid.contain":
	*      4.1. Calculate "axis labels" based on "scale.extent".
	*      4.2. Modify "axis.extent" by the bounding rects of "axis labels and names".
	*/
	Grid.prototype.resize = function(gridModel, api, beforeDataProcessing) {
		var layoutRef = createBoxLayoutReference(gridModel, api);
		var gridRect = this._rect = getLayoutRect(gridModel.getBoxLayoutParams(), layoutRef.refContainer);
		var axesMap = this._axesMap;
		var coordsList = this._coordsList;
		var optionContainLabel = gridModel.get("containLabel");
		updateAllAxisExtentTransByGridRect(axesMap, gridRect);
		if (!beforeDataProcessing) {
			var axisBuilderSharedCtx = createAxisBiulders(gridRect, coordsList, axesMap, optionContainLabel, api);
			var noPxChange = void 0;
			if (optionContainLabel) {
				if (legacyLayOutGridByContainLabel) {
					legacyLayOutGridByContainLabel(this._axesList, gridRect);
					updateAllAxisExtentTransByGridRect(axesMap, gridRect);
				} else noPxChange = layOutGridByOuterBounds(gridRect.clone(), "axisLabel", null, gridRect, axesMap, axisBuilderSharedCtx, layoutRef);
			} else {
				var _a = prepareOuterBounds(gridModel, gridRect, layoutRef), outerBoundsRect = _a.outerBoundsRect, parsedOuterBoundsContain = _a.parsedOuterBoundsContain, outerBoundsClamp = _a.outerBoundsClamp;
				if (outerBoundsRect) noPxChange = layOutGridByOuterBounds(outerBoundsRect, parsedOuterBoundsContain, outerBoundsClamp, gridRect, axesMap, axisBuilderSharedCtx, layoutRef);
			}
			createOrUpdateAxesView(gridRect, axesMap, AxisTickLabelComputingKind.determine, null, noPxChange, layoutRef);
			each(this._coordsList, function(coord) {
				coord.calcAffineTransform();
			});
		}
	};
	Grid.prototype.getAxis = function(dim, axisIndex) {
		var axesMapOnDim = this._axesMap[dim];
		if (axesMapOnDim != null) return axesMapOnDim[axisIndex || 0];
	};
	Grid.prototype.getAxes = function() {
		return this._axesList.slice();
	};
	Grid.prototype.getCartesian = function(xAxisIndex, yAxisIndex) {
		if (xAxisIndex != null && yAxisIndex != null) {
			var key = "x" + xAxisIndex + "y" + yAxisIndex;
			return this._coordsMap[key];
		}
		if (isObject(xAxisIndex)) {
			yAxisIndex = xAxisIndex.yAxisIndex;
			xAxisIndex = xAxisIndex.xAxisIndex;
		}
		for (var i = 0, coordList = this._coordsList; i < coordList.length; i++) if (coordList[i].getAxis("x").index === xAxisIndex || coordList[i].getAxis("y").index === yAxisIndex) return coordList[i];
	};
	Grid.prototype.getCartesians = function() {
		return this._coordsList.slice();
	};
	/**
	* @implements
	*/
	Grid.prototype.convertToPixel = function(ecModel, finder, value) {
		var target = this._findConvertTarget(finder);
		return target.cartesian ? target.cartesian.dataToPoint(value) : target.axis ? target.axis.toGlobalCoord(target.axis.dataToCoord(value)) : null;
	};
	/**
	* @implements
	*/
	Grid.prototype.convertFromPixel = function(ecModel, finder, value) {
		var target = this._findConvertTarget(finder);
		return target.cartesian ? target.cartesian.pointToData(value) : target.axis ? target.axis.coordToData(target.axis.toLocalCoord(value)) : null;
	};
	Grid.prototype._findConvertTarget = function(finder) {
		var seriesModel = finder.seriesModel;
		var xAxisModel = finder.xAxisModel || seriesModel && seriesModel.getReferringComponents("xAxis", SINGLE_REFERRING).models[0];
		var yAxisModel = finder.yAxisModel || seriesModel && seriesModel.getReferringComponents("yAxis", SINGLE_REFERRING).models[0];
		var gridModel = finder.gridModel;
		var coordsList = this._coordsList;
		var cartesian;
		var axis;
		if (seriesModel) {
			cartesian = seriesModel.coordinateSystem;
			indexOf(coordsList, cartesian) < 0 && (cartesian = null);
		} else if (xAxisModel && yAxisModel) cartesian = this.getCartesian(xAxisModel.componentIndex, yAxisModel.componentIndex);
		else if (xAxisModel) axis = this.getAxis("x", xAxisModel.componentIndex);
		else if (yAxisModel) axis = this.getAxis("y", yAxisModel.componentIndex);
		else if (gridModel) {
			if (gridModel.coordinateSystem === this) cartesian = this._coordsList[0];
		}
		return {
			cartesian,
			axis
		};
	};
	/**
	* @implements
	*/
	Grid.prototype.containPoint = function(point) {
		var coord = this._coordsList[0];
		if (coord) return coord.containPoint(point);
	};
	/**
	* Initialize cartesian coordinate systems
	*/
	Grid.prototype._initCartesian = function(gridModel, ecModel, api) {
		var _this = this;
		var grid = this;
		var axisPositionUsed = {
			left: false,
			right: false,
			top: false,
			bottom: false
		};
		var axesMap = {
			x: {},
			y: {}
		};
		var axesCount = {
			x: 0,
			y: 0
		};
		ecModel.eachComponent("xAxis", createAxisCreator("x"), this);
		ecModel.eachComponent("yAxis", createAxisCreator("y"), this);
		if (!axesCount.x || !axesCount.y) {
			this._axesMap = {};
			this._axesList = [];
			return;
		}
		this._axesMap = axesMap;
		each(axesMap.x, function(xAxis, xAxisIndex) {
			each(axesMap.y, function(yAxis, yAxisIndex) {
				var key = "x" + xAxisIndex + "y" + yAxisIndex;
				var cartesian = new Cartesian2D(key);
				cartesian.master = _this;
				cartesian.model = gridModel;
				_this._coordsMap[key] = cartesian;
				_this._coordsList.push(cartesian);
				cartesian.addAxis(xAxis);
				cartesian.addAxis(yAxis);
			});
		});
		prepareAlignToInCoordSysCreate(axesMap.x);
		prepareAlignToInCoordSysCreate(axesMap.y);
		function createAxisCreator(dimName) {
			return function(axisModel, idx) {
				if (!isAxisUsedInTheGrid(axisModel, gridModel)) return;
				var axisPosition = axisModel.get("position");
				if (dimName === "x") {
					if (axisPosition !== "top" && axisPosition !== "bottom") axisPosition = axisPositionUsed.bottom ? "top" : "bottom";
				} else if (axisPosition !== "left" && axisPosition !== "right") axisPosition = axisPositionUsed.left ? "right" : "left";
				axisPositionUsed[axisPosition] = true;
				var axisType = determineAxisType(axisModel);
				var axis = new Axis2D(dimName, createScaleByModel(axisModel, axisType, true), [0, 0], axisType, axisPosition);
				axis.onBand = isAxisOnBand(axis.scale, axisModel);
				axis.inverse = axisModel.get("inverse");
				axisModel.axis = axis;
				axis.model = axisModel;
				axis.grid = grid;
				axis.index = idx;
				grid._axesList.push(axis);
				axesMap[dimName][idx] = axis;
				axesCount[dimName]++;
			};
		}
	};
	/**
	* @param dim 'x' or 'y' or 'auto' or null/undefined
	*/
	Grid.prototype.getTooltipAxes = function(dim) {
		var baseAxes = [];
		var otherAxes = [];
		each(this.getCartesians(), function(cartesian) {
			var baseAxis = dim != null && dim !== "auto" ? cartesian.getAxis(dim) : cartesian.getBaseAxis();
			var otherAxis = cartesian.getOtherAxis(baseAxis);
			indexOf(baseAxes, baseAxis) < 0 && baseAxes.push(baseAxis);
			indexOf(otherAxes, otherAxis) < 0 && otherAxes.push(otherAxis);
		});
		return {
			baseAxes,
			otherAxes
		};
	};
	Grid.create = function(ecModel, api) {
		var grids = [];
		ecModel.eachComponent("grid", function(gridModel, idx) {
			var grid = new Grid(gridModel, ecModel, api);
			grid.name = "grid_" + idx;
			grid.resize(gridModel, api, true);
			gridModel.coordinateSystem = grid;
			grids.push(grid);
			each(grid._axesList, function(axis) {
				scaleRawExtentInfoEnableBoxCoordSysUsage(axis, Grid.dimIdxMap);
			});
		});
		ecModel.eachSeries(function(seriesModel) {
			var xAxis;
			var yAxis;
			injectCoordSysByOption({
				targetModel: seriesModel,
				coordSysType: COORD_SYS_TYPE_CARTESIAN_2D,
				coordSysProvider
			});
			function coordSysProvider() {
				var axesModelMap = findAxisModels(seriesModel);
				var xAxisModel = axesModelMap.xAxisModel;
				var yAxisModel = axesModelMap.yAxisModel;
				xAxis = xAxisModel.axis;
				yAxis = yAxisModel.axis;
				return xAxisModel.getCoordSysModel().coordinateSystem.getCartesian(xAxisModel.componentIndex, yAxisModel.componentIndex);
			}
			if (xAxis && yAxis) {
				associateSeriesWithAxis(xAxis, seriesModel, COORD_SYS_TYPE_CARTESIAN_2D);
				associateSeriesWithAxis(yAxis, seriesModel, COORD_SYS_TYPE_CARTESIAN_2D);
			}
		}, this);
		return grids;
	};
	Grid.dimensions = cartesian2DDimensions;
	Grid.dimIdxMap = createDimNameMap(cartesian2DDimensions);
	return Grid;
}();
/**
* Check if the axis is used in the specified grid.
*/
function isAxisUsedInTheGrid(axisModel, gridModel) {
	return axisModel.getCoordSysModel() === gridModel;
}
function fixAxisOnZero(axesMap, otherAxisDim, axis, onZeroRecords) {
	axis.getAxesOnZeroOf = function() {
		return otherAxisOnZeroOf ? [otherAxisOnZeroOf] : [];
	};
	var otherAxes = axesMap[otherAxisDim];
	var otherAxisOnZeroOf;
	var axisModel = axis.model;
	var onZero = axisModel.get(["axisLine", "onZero"]);
	var onZeroAxisIndex = axisModel.get(["axisLine", "onZeroAxisIndex"]);
	if (!onZero) return;
	if (onZeroAxisIndex != null) {
		if (canOnZeroToAxis(onZero, otherAxes[onZeroAxisIndex])) otherAxisOnZeroOf = otherAxes[onZeroAxisIndex];
	} else for (var idx in otherAxes) if (hasOwn(otherAxes, idx) && canOnZeroToAxis(onZero, otherAxes[idx]) && !onZeroRecords[getOnZeroRecordKey(otherAxes[idx])]) {
		otherAxisOnZeroOf = otherAxes[idx];
		break;
	}
	if (otherAxisOnZeroOf) onZeroRecords[getOnZeroRecordKey(otherAxisOnZeroOf)] = true;
	function getOnZeroRecordKey(axis) {
		return axis.dim + "_" + axis.index;
	}
}
/**
* CAVEAT: Must not be called before `CoordinateSystem#update` due to `__dontOnMyZero`.
*/
function canOnZeroToAxis(onZeroOption, axis) {
	if (!axis) return false;
	var scale = axis.scale;
	var kindEffective = getScaleValuePositionKind(scale, 0, false);
	var can = axis && axis.type !== "category" && axis.type !== "time" && kindEffective !== 3;
	if (can && onZeroOption === "auto" && isOnAxisZeroDiscouraged(axis)) can = false;
	return can;
}
/**
* [CAVEAT] This method is called before data processing stage.
*  Do not rely on any info that is determined afterward.
*/
function prepareAlignToInCoordSysCreate(axes) {
	var axesIndices = keys(axes);
	var alignTo;
	var axisNeedsAlign = [];
	for (var i = axesIndices.length - 1; i >= 0; i--) {
		var axis = axes[+axesIndices[i]];
		if (isIntervalOrLogScale(axis.scale) && retrieveAxisBreaksOption(axis.model, axis.type, true) == null) {
			if (axis.model.get("alignTicks") && axis.model.get("interval") == null) axisNeedsAlign.push(axis);
			else alignTo = axis;
		}
	}
	if (!alignTo) alignTo = axisNeedsAlign.pop();
	if (alignTo) each(axisNeedsAlign, function(axis) {
		axis.__alignTo = alignTo;
	});
}
/**
* This is just a defence code. They are unlikely to be actually `true`,
* since these cases have been addressed in `prepareAlignToInCoordSysCreate`.
*
* Can not be called BEFORE "nice" performed.
*/
function incapableOfAlignNeedFallback(targetAxis, alignTo) {
	return hasBreaks(targetAxis.scale) || hasBreaks(alignTo.scale) || alignTo.scale.getTicks().length < 2;
}
function updateAxisTransform(axis, coordBase) {
	var axisExtent = axis.getExtent();
	var axisExtentSum = axisExtent[0] + axisExtent[1];
	axis.toGlobalCoord = axis.dim === "x" ? function(coord) {
		return coord + coordBase;
	} : function(coord) {
		return axisExtentSum - coord + coordBase;
	};
	axis.toLocalCoord = axis.dim === "x" ? function(coord) {
		return coord - coordBase;
	} : function(coord) {
		return axisExtentSum - coord + coordBase;
	};
}
function updateAllAxisExtentTransByGridRect(axesMap, gridRect) {
	each(axesMap.x, function(axis) {
		return updateAxisExtentTransByGridRect(axis, gridRect.x, gridRect.width);
	});
	each(axesMap.y, function(axis) {
		return updateAxisExtentTransByGridRect(axis, gridRect.y, gridRect.height);
	});
}
function updateAxisExtentTransByGridRect(axis, gridXY, gridWH) {
	var extent = [0, gridWH];
	var idx = axis.inverse ? 1 : 0;
	axis.setExtent(extent[idx], extent[1 - idx]);
	updateAxisTransform(axis, gridXY);
}
var legacyLayOutGridByContainLabel;
function layOutGridByOuterBounds(outerBoundsRect, outerBoundsContain, outerBoundsClamp, gridRect, axesMap, axisBuilderSharedCtx, layoutRef) {
	createOrUpdateAxesView(gridRect, axesMap, AxisTickLabelComputingKind.estimate, outerBoundsContain, false, layoutRef);
	var margin = [
		0,
		0,
		0,
		0
	];
	fillLabelNameOverflowOnOneDimension(0);
	fillLabelNameOverflowOnOneDimension(1);
	fillMarginOnOneDimension(gridRect, 0, NaN);
	fillMarginOnOneDimension(gridRect, 1, NaN);
	var noPxChange = find(margin, function(item) {
		return item > 0;
	}) == null;
	expandOrShrinkRect(gridRect, margin, true, true, outerBoundsClamp);
	updateAllAxisExtentTransByGridRect(axesMap, gridRect);
	return noPxChange;
	function fillLabelNameOverflowOnOneDimension(xyIdx) {
		each(axesMap[XY[xyIdx]], function(axis) {
			if (!shouldAxisShow(axis.model)) return;
			var sharedRecord = axisBuilderSharedCtx.ensureRecord(axis.model);
			var labelInfoList = sharedRecord.labelInfoList;
			if (labelInfoList) for (var idx = 0; idx < labelInfoList.length; idx++) {
				var labelInfo = labelInfoList[idx];
				var proportion = axis.scale.normalize(getTickValueOutermost(axis.scale, getLabelInner(labelInfo.label).labelInfo.tick));
				proportion = xyIdx === 1 ? 1 - proportion : proportion;
				fillMarginOnOneDimension(labelInfo.rect, xyIdx, proportion);
				fillMarginOnOneDimension(labelInfo.rect, 1 - xyIdx, NaN);
			}
			var nameLayout = sharedRecord.nameLayout;
			if (nameLayout) {
				var proportion = isNameLocationCenter(sharedRecord.nameLocation) ? .5 : NaN;
				fillMarginOnOneDimension(nameLayout.rect, xyIdx, proportion);
				fillMarginOnOneDimension(nameLayout.rect, 1 - xyIdx, NaN);
			}
		});
	}
	function fillMarginOnOneDimension(itemRect, xyIdx, proportion) {
		var overflow1 = outerBoundsRect[XY[xyIdx]] - itemRect[XY[xyIdx]];
		var overflow2 = itemRect[WH[xyIdx]] + itemRect[XY[xyIdx]] - (outerBoundsRect[WH[xyIdx]] + outerBoundsRect[XY[xyIdx]]);
		overflow1 = applyProportion(overflow1, 1 - proportion);
		overflow2 = applyProportion(overflow2, proportion);
		var minIdx = XY_TO_MARGIN_IDX[xyIdx][0];
		var maxIdx = XY_TO_MARGIN_IDX[xyIdx][1];
		margin[minIdx] = mathMax(margin[minIdx], overflow1);
		margin[maxIdx] = mathMax(margin[maxIdx], overflow2);
	}
	function applyProportion(overflow, proportion) {
		if (overflow > 0 && !eqNaN(proportion) && proportion > 1e-4) overflow /= proportion;
		return overflow;
	}
}
function createAxisBiulders(gridRect, cartesians, axesMap, optionContainLabel, api) {
	var axisBuilderSharedCtx = new AxisBuilderSharedContext(resolveAxisNameOverlapForGrid);
	each(axesMap, function(axisList) {
		return each(axisList, function(axis) {
			if (shouldAxisShow(axis.model)) {
				var defaultNameMoveOverlap = !optionContainLabel;
				axis.axisBuilder = createCartesianAxisViewCommonPartBuilder(gridRect, cartesians, axis.model, api, axisBuilderSharedCtx, defaultNameMoveOverlap);
			}
		});
	});
	return axisBuilderSharedCtx;
}
/**
* Promote the axis-elements-building from "view render" stage to "coordinate system resize" stage.
* This is aimed to resovle overlap across multiple axes, since currently it's hard to reconcile
* multiple axes in "view render" stage.
*
* [CAUTION] But this promotion assumes that the subsequent "visual mapping" stage does not affect
* this axis-elements-building; otherwise we have to refactor it again.
*/
function createOrUpdateAxesView(gridRect, axesMap, kind, outerBoundsContain, noPxChange, layoutRef) {
	var isDetermine = kind === AxisTickLabelComputingKind.determine;
	each(axesMap, function(axisList) {
		return each(axisList, function(axis) {
			if (shouldAxisShow(axis.model)) {
				updateCartesianAxisViewCommonPartBuilder(axis.axisBuilder, gridRect, axis.model);
				axis.axisBuilder.build(isDetermine ? { axisTickLabelDetermine: true } : { axisTickLabelEstimate: true }, { noPxChange });
			}
		});
	});
	var nameMarginLevelMap = {
		x: 0,
		y: 0
	};
	calcNameMarginLevel(0);
	calcNameMarginLevel(1);
	function calcNameMarginLevel(xyIdx) {
		nameMarginLevelMap[XY[1 - xyIdx]] = gridRect[WH[xyIdx]] <= layoutRef.refContainer[WH[xyIdx]] * .5 ? 0 : 1 - xyIdx === 1 ? 2 : 1;
	}
	each(axesMap, function(axisList, xy) {
		return each(axisList, function(axis) {
			if (shouldAxisShow(axis.model)) {
				if (outerBoundsContain === "all" || isDetermine) axis.axisBuilder.build({ axisName: true }, { nameMarginLevel: nameMarginLevelMap[xy] });
				if (isDetermine) axis.axisBuilder.build({ axisLine: true });
			}
		});
	});
}
function prepareOuterBounds(gridModel, rawGridRect, layoutRef) {
	var outerBoundsRect;
	var optionOuterBoundsMode = gridModel.get("outerBoundsMode", true);
	if (optionOuterBoundsMode === "same") outerBoundsRect = rawGridRect.clone();
	else if (optionOuterBoundsMode == null || optionOuterBoundsMode === "auto") outerBoundsRect = getLayoutRect(gridModel.get("outerBounds", true) || OUTER_BOUNDS_DEFAULT, layoutRef.refContainer);
	else if (optionOuterBoundsMode !== "none") {}
	var optionOuterBoundsContain = gridModel.get("outerBoundsContain", true);
	var parsedOuterBoundsContain;
	if (optionOuterBoundsContain == null || optionOuterBoundsContain === "auto") parsedOuterBoundsContain = "all";
	else if (indexOf(["all", "axisLabel"], optionOuterBoundsContain) < 0) parsedOuterBoundsContain = "all";
	else parsedOuterBoundsContain = optionOuterBoundsContain;
	var outerBoundsClamp = [parsePositionSizeOption(retrieve2(gridModel.get("outerBoundsClampWidth", true), OUTER_BOUNDS_CLAMP_DEFAULT[0]), rawGridRect.width), parsePositionSizeOption(retrieve2(gridModel.get("outerBoundsClampHeight", true), OUTER_BOUNDS_CLAMP_DEFAULT[1]), rawGridRect.height)];
	return {
		outerBoundsRect,
		parsedOuterBoundsContain,
		outerBoundsClamp
	};
}
var resolveAxisNameOverlapForGrid = function(cfg, ctx, axisModel, nameLayoutInfo, nameMoveDirVec, thisRecord) {
	var perpendicularDim = axisModel.axis.dim === "x" ? "y" : "x";
	resolveAxisNameOverlapDefault(cfg, ctx, axisModel, nameLayoutInfo, nameMoveDirVec, thisRecord);
	if (!isNameLocationCenter(cfg.nameLocation)) each(ctx.recordMap[perpendicularDim], function(perpenRecord) {
		if (perpenRecord && perpenRecord.labelInfoList && perpenRecord.dirVec) moveIfOverlapByLinearLabels(perpenRecord.labelInfoList, perpenRecord.dirVec, nameLayoutInfo, nameMoveDirVec);
	});
};
//#endregion
//#region node_modules/echarts/lib/component/axisPointer/modelHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function collect(ecModel, api) {
	var result = {
		/**
		* key: makeKey(axis.model)
		* value: {
		*      axis,
		*      coordSys,
		*      axisPointerModel,
		*      triggerTooltip,
		*      triggerEmphasis,
		*      involveSeries,
		*      snap,
		*      seriesModels,
		*      seriesDataCount
		* }
		*/
		axesInfo: {},
		seriesInvolved: false,
		/**
		* key: makeKey(coordSys.model)
		* value: Object: key makeKey(axis.model), value: axisInfo
		*/
		coordSysAxesInfo: {},
		coordSysMap: {}
	};
	collectAxesInfo(result, ecModel, api);
	result.seriesInvolved && collectSeriesInfo(result, ecModel);
	return result;
}
function collectAxesInfo(result, ecModel, api) {
	var globalTooltipModel = ecModel.getComponent("tooltip");
	var globalAxisPointerModel = ecModel.getComponent("axisPointer");
	var linksOption = globalAxisPointerModel.get("link", true) || [];
	var linkGroups = [];
	each(api.getCoordinateSystems(), function(coordSys) {
		if (!coordSys.axisPointerEnabled) return;
		var coordSysKey = makeKey(coordSys.model);
		var axesInfoInCoordSys = result.coordSysAxesInfo[coordSysKey] = {};
		result.coordSysMap[coordSysKey] = coordSys;
		var baseTooltipModel = coordSys.model.getModel("tooltip", globalTooltipModel);
		each(coordSys.getAxes(), curry(saveTooltipAxisInfo, false, null));
		if (coordSys.getTooltipAxes && globalTooltipModel && baseTooltipModel.get("show")) {
			var triggerAxis = baseTooltipModel.get("trigger") === "axis";
			var cross = baseTooltipModel.get(["axisPointer", "type"]) === "cross";
			var tooltipAxes = coordSys.getTooltipAxes(baseTooltipModel.get(["axisPointer", "axis"]));
			if (triggerAxis || cross) each(tooltipAxes.baseAxes, curry(saveTooltipAxisInfo, cross ? "cross" : true, triggerAxis));
			if (cross) each(tooltipAxes.otherAxes, curry(saveTooltipAxisInfo, "cross", false));
		}
		function saveTooltipAxisInfo(fromTooltip, triggerTooltip, axis) {
			var axisPointerModel = axis.model.getModel("axisPointer", globalAxisPointerModel);
			var axisPointerShow = axisPointerModel.get("show");
			if (!axisPointerShow || axisPointerShow === "auto" && !fromTooltip && !isHandleTrigger(axisPointerModel)) return;
			if (triggerTooltip == null) triggerTooltip = axisPointerModel.get("triggerTooltip");
			axisPointerModel = fromTooltip ? makeAxisPointerModel(axis, baseTooltipModel, globalAxisPointerModel, ecModel, fromTooltip, triggerTooltip) : axisPointerModel;
			var snap = axisPointerModel.get("snap");
			var triggerEmphasis = axisPointerModel.get("triggerEmphasis");
			var axisKey = makeKey(axis.model);
			var involveSeries = triggerTooltip || snap || axis.type === "category";
			var axisInfo = result.axesInfo[axisKey] = {
				key: axisKey,
				axis,
				coordSys,
				axisPointerModel,
				triggerTooltip,
				triggerEmphasis,
				involveSeries,
				snap,
				useHandle: isHandleTrigger(axisPointerModel),
				seriesModels: [],
				linkGroup: null
			};
			axesInfoInCoordSys[axisKey] = axisInfo;
			result.seriesInvolved = result.seriesInvolved || involveSeries;
			var groupIndex = getLinkGroupIndex(linksOption, axis);
			if (groupIndex != null) {
				var linkGroup = linkGroups[groupIndex] || (linkGroups[groupIndex] = { axesInfo: {} });
				linkGroup.axesInfo[axisKey] = axisInfo;
				linkGroup.mapper = linksOption[groupIndex].mapper;
				axisInfo.linkGroup = linkGroup;
			}
		}
	});
}
function makeAxisPointerModel(axis, baseTooltipModel, globalAxisPointerModel, ecModel, fromTooltip, triggerTooltip) {
	var tooltipAxisPointerModel = baseTooltipModel.getModel("axisPointer");
	var fields = [
		"type",
		"snap",
		"lineStyle",
		"shadowStyle",
		"label",
		"animation",
		"animationDurationUpdate",
		"animationEasingUpdate",
		"z"
	];
	var volatileOption = {};
	each(fields, function(field) {
		volatileOption[field] = clone(tooltipAxisPointerModel.get(field));
	});
	volatileOption.snap = axis.type !== "category" && !!triggerTooltip;
	if (tooltipAxisPointerModel.get("type") === "cross") volatileOption.type = "line";
	var labelOption = volatileOption.label || (volatileOption.label = {});
	labelOption.show ?? (labelOption.show = false);
	if (fromTooltip === "cross") {
		var tooltipAxisPointerLabelShow = tooltipAxisPointerModel.get(["label", "show"]);
		labelOption.show = tooltipAxisPointerLabelShow != null ? tooltipAxisPointerLabelShow : true;
		if (!triggerTooltip) {
			var crossStyle = volatileOption.lineStyle = tooltipAxisPointerModel.get("crossStyle");
			crossStyle && defaults(labelOption, crossStyle.textStyle);
		}
	}
	return axis.model.getModel("axisPointer", new Model(volatileOption, globalAxisPointerModel, ecModel));
}
function collectSeriesInfo(result, ecModel) {
	ecModel.eachSeries(function(seriesModel) {
		var coordSys = seriesModel.coordinateSystem;
		var seriesTooltipTrigger = seriesModel.get(["tooltip", "trigger"], true);
		var seriesTooltipShow = seriesModel.get(["tooltip", "show"], true);
		if (!coordSys || !coordSys.model || seriesTooltipTrigger === "none" || seriesTooltipTrigger === false || seriesTooltipTrigger === "item" || seriesTooltipShow === false || seriesModel.get(["axisPointer", "show"], true) === false) return;
		each(result.coordSysAxesInfo[makeKey(coordSys.model)], function(axisInfo) {
			var axis = axisInfo.axis;
			if (coordSys.getAxis(axis.dim) === axis) {
				axisInfo.seriesModels.push(seriesModel);
				axisInfo.seriesDataCount ?? (axisInfo.seriesDataCount = 0);
				axisInfo.seriesDataCount += seriesModel.getData().count();
			}
		});
	});
}
/**
* For example:
* {
*     axisPointer: {
*         links: [{
*             xAxisIndex: [2, 4],
*             yAxisIndex: 'all'
*         }, {
*             xAxisId: ['a5', 'a7'],
*             xAxisName: 'xxx'
*         }]
*     }
* }
*/
function getLinkGroupIndex(linksOption, axis) {
	var axisModel = axis.model;
	var dim = axis.dim;
	for (var i = 0; i < linksOption.length; i++) {
		var linkOption = linksOption[i] || {};
		if (checkPropInLink(linkOption[dim + "AxisId"], axisModel.id) || checkPropInLink(linkOption[dim + "AxisIndex"], axisModel.componentIndex) || checkPropInLink(linkOption[dim + "AxisName"], axisModel.name)) return i;
	}
}
function checkPropInLink(linkPropValue, axisPropValue) {
	return linkPropValue === "all" || isArray(linkPropValue) && indexOf(linkPropValue, axisPropValue) >= 0 || linkPropValue === axisPropValue;
}
function fixValue(axisModel) {
	var axisInfo = getAxisInfo(axisModel);
	if (!axisInfo) return;
	var axisPointerModel = axisInfo.axisPointerModel;
	var scale = axisInfo.axis.scale;
	var option = axisPointerModel.option;
	var status = axisPointerModel.get("status");
	var value = axisPointerModel.get("value");
	if (value != null) value = scale.parse(value);
	var useHandle = isHandleTrigger(axisPointerModel);
	if (status == null) option.status = useHandle ? "show" : "hide";
	var extent = scale.getExtent();
	if (value == null || value > extent[1]) value = extent[1];
	if (value < extent[0]) value = extent[0];
	option.value = value;
	if (useHandle) option.status = axisInfo.axis.scale.isBlank() ? "hide" : "show";
}
function getAxisInfo(axisModel) {
	var coordSysAxesInfo = (axisModel.ecModel.getComponent("axisPointer") || {}).coordSysAxesInfo;
	return coordSysAxesInfo && coordSysAxesInfo.axesInfo[makeKey(axisModel)];
}
function getAxisPointerModel(axisModel) {
	var axisInfo = getAxisInfo(axisModel);
	return axisInfo && axisInfo.axisPointerModel;
}
function isHandleTrigger(axisPointerModel) {
	return !!axisPointerModel.get(["handle", "show"]);
}
/**
* @param {module:echarts/model/Model} model
* @return {string} unique key
*/
function makeKey(model) {
	return model.type + "||" + model.id;
}
//#endregion
//#region node_modules/echarts/lib/component/axis/AxisView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var axisPointerClazz = {};
/**
* Base class of AxisView.
*/
var AxisView = function(_super) {
	__extends(AxisView, _super);
	function AxisView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = AxisView.type;
		return _this;
	}
	/**
	* @override
	*/
	AxisView.prototype.render = function(axisModel, ecModel, api, payload) {
		this.axisPointerClass && fixValue(axisModel);
		_super.prototype.render.apply(this, arguments);
		this._doUpdateAxisPointerClass(axisModel, api, true);
	};
	/**
	* Action handler.
	*/
	AxisView.prototype.updateAxisPointer = function(axisModel, ecModel, api, payload) {
		this._doUpdateAxisPointerClass(axisModel, api, false);
	};
	/**
	* @override
	*/
	AxisView.prototype.remove = function(ecModel, api) {
		var axisPointer = this._axisPointer;
		axisPointer && axisPointer.remove(api);
	};
	/**
	* @override
	*/
	AxisView.prototype.dispose = function(ecModel, api) {
		this._disposeAxisPointer(api);
		_super.prototype.dispose.apply(this, arguments);
	};
	AxisView.prototype._doUpdateAxisPointerClass = function(axisModel, api, forceRender) {
		var Clazz = AxisView.getAxisPointerClass(this.axisPointerClass);
		if (!Clazz) return;
		var axisPointerModel = getAxisPointerModel(axisModel);
		axisPointerModel ? (this._axisPointer || (this._axisPointer = new Clazz())).render(axisModel, axisPointerModel, api, forceRender) : this._disposeAxisPointer(api);
	};
	AxisView.prototype._disposeAxisPointer = function(api) {
		this._axisPointer && this._axisPointer.dispose(api);
		this._axisPointer = null;
	};
	AxisView.registerAxisPointerClass = function(type, clazz) {
		axisPointerClazz[type] = clazz;
	};
	AxisView.getAxisPointerClass = function(type) {
		return type && axisPointerClazz[type];
	};
	AxisView.type = "axis";
	return AxisView;
}(ComponentView);
//#endregion
//#region node_modules/echarts/lib/component/axis/axisSplitHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var inner = makeInner();
function rectCoordAxisBuildSplitArea(axisView, axisGroup, axisModel, gridModel) {
	var axis = axisModel.axis;
	if (axis.scale.isBlank()) return;
	var splitAreaModel = axisModel.getModel("splitArea");
	var areaStyleModel = splitAreaModel.getModel("areaStyle");
	var areaColors = areaStyleModel.get("color");
	var gridRect = gridModel.coordinateSystem.getRect();
	var ticksCoords = axis.getTicksCoords({
		tickModel: splitAreaModel,
		breakTicks: "none",
		pruneByBreak: "preserve_extent_bound"
	});
	if (!ticksCoords.length) return;
	var areaColorsLen = areaColors.length;
	var lastSplitAreaColors = inner(axisView).splitAreaColors;
	var newSplitAreaColors = createHashMap();
	var colorIndex = 0;
	if (lastSplitAreaColors) for (var i = 0; i < ticksCoords.length; i++) {
		var cIndex = lastSplitAreaColors.get(ticksCoords[i].tickValue);
		if (cIndex != null) {
			colorIndex = (cIndex + (areaColorsLen - 1) * i) % areaColorsLen;
			break;
		}
	}
	var prev = axis.toGlobalCoord(ticksCoords[0].coord);
	var areaStyle = areaStyleModel.getAreaStyle();
	areaColors = isArray(areaColors) ? areaColors : [areaColors];
	for (var i = 1; i < ticksCoords.length; i++) {
		var tickCoord = axis.toGlobalCoord(ticksCoords[i].coord);
		var x = void 0;
		var y = void 0;
		var width = void 0;
		var height = void 0;
		if (axis.isHorizontal()) {
			x = prev;
			y = gridRect.y;
			width = tickCoord - x;
			height = gridRect.height;
			prev = x + width;
		} else {
			x = gridRect.x;
			y = prev;
			width = gridRect.width;
			height = tickCoord - y;
			prev = y + height;
		}
		var tickValue = ticksCoords[i - 1].tickValue;
		tickValue != null && newSplitAreaColors.set(tickValue, colorIndex);
		axisGroup.add(new Rect({
			anid: tickValue != null ? "area_" + tickValue : null,
			shape: {
				x,
				y,
				width,
				height
			},
			style: defaults({ fill: areaColors[colorIndex] }, areaStyle),
			autoBatch: true,
			silent: true
		}));
		colorIndex = (colorIndex + 1) % areaColorsLen;
	}
	inner(axisView).splitAreaColors = newSplitAreaColors;
}
function rectCoordAxisHandleRemove(axisView) {
	inner(axisView).splitAreaColors = null;
}
//#endregion
//#region node_modules/echarts/lib/component/axis/CartesianAxisView.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var selfBuilderAttrs = [
	"splitArea",
	"splitLine",
	"minorSplitLine",
	"breakArea"
];
var CartesianAxisView = function(_super) {
	__extends(CartesianAxisView, _super);
	function CartesianAxisView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = CartesianAxisView.type;
		_this.axisPointerClass = "CartesianAxisPointer";
		return _this;
	}
	/**
	* @override
	*/
	CartesianAxisView.prototype.render = function(axisModel, ecModel, api, payload) {
		this.group.removeAll();
		var oldAxisGroup = this._axisGroup;
		this._axisGroup = new Group();
		this.group.add(this._axisGroup);
		if (!shouldAxisShow(axisModel)) return;
		this._axisGroup.add(axisModel.axis.axisBuilder.group);
		each(selfBuilderAttrs, function(name) {
			if (axisModel.get([name, "show"])) axisElementBuilders[name](this, this._axisGroup, axisModel, axisModel.getCoordSysModel(), api);
		}, this);
		if (!(payload && payload.type === "changeAxisOrder" && payload.isInitSort)) groupTransition(oldAxisGroup, this._axisGroup, axisModel);
		_super.prototype.render.call(this, axisModel, ecModel, api, payload);
	};
	CartesianAxisView.prototype.remove = function() {
		rectCoordAxisHandleRemove(this);
	};
	CartesianAxisView.type = "cartesianAxis";
	return CartesianAxisView;
}(AxisView);
var axisElementBuilders = {
	splitLine: function(axisView, axisGroup, axisModel, gridModel, api) {
		var axis = axisModel.axis;
		if (axis.scale.isBlank()) return;
		var splitLineModel = axisModel.getModel("splitLine");
		var lineStyleModel = splitLineModel.getModel("lineStyle");
		var lineColors = lineStyleModel.get("color");
		var showMinLine = splitLineModel.get("showMinLine") !== false;
		var showMaxLine = splitLineModel.get("showMaxLine") !== false;
		lineColors = isArray(lineColors) ? lineColors : [lineColors];
		var gridRect = gridModel.coordinateSystem.getRect();
		var isHorizontal = axis.isHorizontal();
		var lineCount = 0;
		var ticksCoords = axis.getTicksCoords({
			tickModel: splitLineModel,
			breakTicks: "none",
			pruneByBreak: "preserve_extent_bound"
		});
		var p1 = [];
		var p2 = [];
		var lineStyle = lineStyleModel.getLineStyle();
		for (var i = 0; i < ticksCoords.length; i++) {
			var tickCoord = axis.toGlobalCoord(ticksCoords[i].coord);
			if (i === 0 && !showMinLine || i === ticksCoords.length - 1 && !showMaxLine) continue;
			var tickValue = ticksCoords[i].tickValue;
			if (isHorizontal) {
				p1[0] = tickCoord;
				p1[1] = gridRect.y;
				p2[0] = tickCoord;
				p2[1] = gridRect.y + gridRect.height;
			} else {
				p1[0] = gridRect.x;
				p1[1] = tickCoord;
				p2[0] = gridRect.x + gridRect.width;
				p2[1] = tickCoord;
			}
			var colorIndex = lineCount++ % lineColors.length;
			var line = new Line({
				anid: tickValue != null ? "line_" + tickValue : null,
				autoBatch: true,
				shape: {
					x1: p1[0],
					y1: p1[1],
					x2: p2[0],
					y2: p2[1]
				},
				style: defaults({ stroke: lineColors[colorIndex] }, lineStyle),
				silent: true
			});
			subPixelOptimizeLine(line.shape, lineStyle.lineWidth);
			axisGroup.add(line);
		}
	},
	minorSplitLine: function(axisView, axisGroup, axisModel, gridModel, api) {
		var axis = axisModel.axis;
		var lineStyleModel = axisModel.getModel("minorSplitLine").getModel("lineStyle");
		var gridRect = gridModel.coordinateSystem.getRect();
		var isHorizontal = axis.isHorizontal();
		var minorTicksCoords = axis.getMinorTicksCoords();
		if (!minorTicksCoords.length) return;
		var p1 = [];
		var p2 = [];
		var lineStyle = lineStyleModel.getLineStyle();
		for (var i = 0; i < minorTicksCoords.length; i++) for (var k = 0; k < minorTicksCoords[i].length; k++) {
			var tickCoord = axis.toGlobalCoord(minorTicksCoords[i][k].coord);
			if (isHorizontal) {
				p1[0] = tickCoord;
				p1[1] = gridRect.y;
				p2[0] = tickCoord;
				p2[1] = gridRect.y + gridRect.height;
			} else {
				p1[0] = gridRect.x;
				p1[1] = tickCoord;
				p2[0] = gridRect.x + gridRect.width;
				p2[1] = tickCoord;
			}
			var line = new Line({
				anid: "minor_line_" + minorTicksCoords[i][k].tickValue,
				autoBatch: true,
				shape: {
					x1: p1[0],
					y1: p1[1],
					x2: p2[0],
					y2: p2[1]
				},
				style: lineStyle,
				silent: true
			});
			subPixelOptimizeLine(line.shape, lineStyle.lineWidth);
			axisGroup.add(line);
		}
	},
	splitArea: function(axisView, axisGroup, axisModel, gridModel, api) {
		rectCoordAxisBuildSplitArea(axisView, axisGroup, axisModel, gridModel);
	},
	breakArea: function(axisView, axisGroup, axisModel, gridModel, api) {
		var axisBreakHelper = getAxisBreakHelper();
		var scale = axisModel.axis.scale;
		if (axisBreakHelper && scale.type !== "ordinal") axisBreakHelper.rectCoordBuildBreakAxis(axisGroup, axisView, axisModel, gridModel.coordinateSystem.getRect(), api);
	}
};
var CartesianXAxisView = function(_super) {
	__extends(CartesianXAxisView, _super);
	function CartesianXAxisView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = CartesianXAxisView.type;
		return _this;
	}
	CartesianXAxisView.type = "xAxis";
	return CartesianXAxisView;
}(CartesianAxisView);
var CartesianYAxisView = function(_super) {
	__extends(CartesianYAxisView, _super);
	function CartesianYAxisView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = CartesianXAxisView.type;
		return _this;
	}
	CartesianYAxisView.type = "yAxis";
	return CartesianYAxisView;
}(CartesianAxisView);
//#endregion
//#region node_modules/echarts/lib/component/grid/installSimple.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
var GridView = function(_super) {
	__extends(GridView, _super);
	function GridView() {
		var _this = _super !== null && _super.apply(this, arguments) || this;
		_this.type = "grid";
		return _this;
	}
	GridView.prototype.render = function(gridModel, ecModel) {
		this.group.removeAll();
		if (gridModel.get("show")) this.group.add(new Rect({
			shape: gridModel.coordinateSystem.getRect(),
			style: defaults({ fill: gridModel.get("backgroundColor") }, gridModel.getItemStyle()),
			silent: true,
			z2: -1
		}));
	};
	GridView.type = "grid";
	return GridView;
}(ComponentView);
var extraOption = { offset: 0 };
function install(registers) {
	registers.registerComponentView(GridView);
	registers.registerComponentModel(GridModel);
	registers.registerCoordinateSystem("cartesian2d", Grid);
	axisModelCreator(registers, "x", CartesianAxisModel, extraOption);
	axisModelCreator(registers, "y", CartesianAxisModel, extraOption);
	registers.registerComponentView(CartesianXAxisView);
	registers.registerComponentView(CartesianYAxisView);
	registers.registerPreprocessor(function(option) {
		if (option.xAxis && option.yAxis && !option.grid) option.grid = {};
	});
}
//#endregion
export { makeKey as a, layout as c, shiftLayoutOnXY as d, isCoordinateSystemType as f, getDefaultLabel as g, getDefaultInterpolatedLabel as h, getAxisInfo as i, AxisBuilder as l, Symbol as m, AxisView as n, COORD_SYS_TYPE_CARTESIAN_2D as o, SymbolDraw as p, collect as r, isCartesian2DInjectedAsDataCoordSys as s, install as t, computeLabelGeometry as u };
