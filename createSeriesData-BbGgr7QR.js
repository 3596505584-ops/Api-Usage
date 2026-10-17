import { At as extend, Bt as isFunction, Et as defaults, Gt as isString, Lt as isArray, Ot as each, Tt as curry, Wt as isObject, Xt as map, wt as createHashMap } from "./graphic-BAx7jeh4.js";
import { Cn as shouldOmitUnusedDimensions, Fn as makeSeriesEncodeForAxisCoordSys, Mn as isSourceInstance, Nn as BE_ORDINAL, On as SeriesDimensionDefine, Pn as guessOrdinal, Sn as ensureSourceDimNameMap, Yr as VISUAL_DIMENSIONS, Zr as SINGLE_REFERRING, bn as SeriesDataSchema, di as normalizeToArray, gi as removeDuplicates, gn as CoordinateSystemManager, jn as createSourceFromSeriesDataOption, kn as getDimensionTypeByAxis, ni as getDataItemValue, pn as enableDataStack, qr as SOURCE_FORMAT_ORIGINAL, wn as CtorInt32Array, xn as createDimNameMap, yn as SeriesData } from "./axisNiceTicks-C_GC5fUj.js";
//#region node_modules/echarts/lib/data/helper/createDimensions.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* For outside usage compat (like echarts-gl are using it).
*/
function createDimensions(source, opt) {
	return prepareSeriesDataSchema(source, opt).dimensions;
}
/**
* This method builds the relationship between:
* + "what the coord sys or series requires (see `coordDimensions`)",
* + "what the user defines (in `encode` and `dimensions`, see `opt.dimensionsDefine` and `opt.encodeDefine`)"
* + "what the data source provids (see `source`)".
*
* Some guess strategy will be adapted if user does not define something.
* If no 'value' dimension specified, the first no-named dimension will be
* named as 'value'.
*
* @return The results are always sorted by `storeDimIndex` asc.
*/
function prepareSeriesDataSchema(source, opt) {
	if (!isSourceInstance(source)) source = createSourceFromSeriesDataOption(source);
	opt = opt || {};
	var sysDims = opt.coordDimensions || [];
	var dimsDef = opt.dimensionsDefine || source.dimensionsDefine || [];
	var coordDimNameMap = createHashMap();
	var resultList = [];
	var dimCount = getDimCount(source, sysDims, dimsDef, opt.dimensionsCount);
	var omitUnusedDimensions = opt.canOmitUnusedDimensions && shouldOmitUnusedDimensions(dimCount);
	var isUsingSourceDimensionsDef = dimsDef === source.dimensionsDefine;
	var dataDimNameMap = isUsingSourceDimensionsDef ? ensureSourceDimNameMap(source) : createDimNameMap(dimsDef);
	var encodeDef = opt.encodeDefine;
	if (!encodeDef && opt.encodeDefaulter) encodeDef = opt.encodeDefaulter(source, dimCount);
	var encodeDefMap = createHashMap(encodeDef);
	var indicesMap = new CtorInt32Array(dimCount);
	for (var i = 0; i < indicesMap.length; i++) indicesMap[i] = -1;
	function getResultItem(dimIdx) {
		var idx = indicesMap[dimIdx];
		if (idx < 0) {
			var dimDefItemRaw = dimsDef[dimIdx];
			var dimDefItem = isObject(dimDefItemRaw) ? dimDefItemRaw : { name: dimDefItemRaw };
			var resultItem = new SeriesDimensionDefine();
			var userDimName = dimDefItem.name;
			if (userDimName != null && dataDimNameMap.get(userDimName) != null) resultItem.name = resultItem.displayName = userDimName;
			dimDefItem.type != null && (resultItem.type = dimDefItem.type);
			dimDefItem.displayName != null && (resultItem.displayName = dimDefItem.displayName);
			indicesMap[dimIdx] = resultList.length;
			resultItem.storeDimIndex = dimIdx;
			resultList.push(resultItem);
			return resultItem;
		}
		return resultList[idx];
	}
	if (!omitUnusedDimensions) for (var i = 0; i < dimCount; i++) getResultItem(i);
	encodeDefMap.each(function(dataDimsRaw, coordDim) {
		var dataDims = normalizeToArray(dataDimsRaw).slice();
		if (dataDims.length === 1 && !isString(dataDims[0]) && dataDims[0] < 0) {
			encodeDefMap.set(coordDim, false);
			return;
		}
		var validDataDims = encodeDefMap.set(coordDim, []);
		each(dataDims, function(resultDimIdxOrName, idx) {
			var resultDimIdx = isString(resultDimIdxOrName) ? dataDimNameMap.get(resultDimIdxOrName) : resultDimIdxOrName;
			if (resultDimIdx != null && resultDimIdx < dimCount) {
				validDataDims[idx] = resultDimIdx;
				applyDim(getResultItem(resultDimIdx), coordDim, idx);
			}
		});
	});
	var availDimIdx = 0;
	each(sysDims, function(sysDimItemRaw) {
		var coordDim;
		var sysDimItemDimsDef;
		var sysDimItemOtherDims;
		var sysDimItem;
		if (isString(sysDimItemRaw)) {
			coordDim = sysDimItemRaw;
			sysDimItem = {};
		} else {
			sysDimItem = sysDimItemRaw;
			coordDim = sysDimItem.name;
			var ordinalMeta = sysDimItem.ordinalMeta;
			sysDimItem.ordinalMeta = null;
			sysDimItem = extend({}, sysDimItem);
			sysDimItem.ordinalMeta = ordinalMeta;
			sysDimItemDimsDef = sysDimItem.dimsDef;
			sysDimItemOtherDims = sysDimItem.otherDims;
			sysDimItem.name = sysDimItem.coordDim = sysDimItem.coordDimIndex = sysDimItem.dimsDef = sysDimItem.otherDims = null;
		}
		var dataDims = encodeDefMap.get(coordDim);
		if (dataDims === false) return;
		dataDims = normalizeToArray(dataDims);
		if (!dataDims.length) for (var i = 0; i < (sysDimItemDimsDef && sysDimItemDimsDef.length || 1); i++) {
			while (availDimIdx < dimCount && getResultItem(availDimIdx).coordDim != null) availDimIdx++;
			availDimIdx < dimCount && dataDims.push(availDimIdx++);
		}
		each(dataDims, function(resultDimIdx, coordDimIndex) {
			var resultItem = getResultItem(resultDimIdx);
			if (isUsingSourceDimensionsDef && sysDimItem.type != null) resultItem.type = sysDimItem.type;
			applyDim(defaults(resultItem, sysDimItem), coordDim, coordDimIndex);
			if (resultItem.name == null && sysDimItemDimsDef) {
				var sysDimItemDimsDefItem = sysDimItemDimsDef[coordDimIndex];
				!isObject(sysDimItemDimsDefItem) && (sysDimItemDimsDefItem = { name: sysDimItemDimsDefItem });
				resultItem.name = resultItem.displayName = sysDimItemDimsDefItem.name;
				resultItem.defaultTooltip = sysDimItemDimsDefItem.defaultTooltip;
			}
			sysDimItemOtherDims && defaults(resultItem.otherDims, sysDimItemOtherDims);
		});
	});
	function applyDim(resultItem, coordDim, coordDimIndex) {
		if (VISUAL_DIMENSIONS.get(coordDim) != null) resultItem.otherDims[coordDim] = coordDimIndex;
		else {
			resultItem.coordDim = coordDim;
			resultItem.coordDimIndex = coordDimIndex;
			coordDimNameMap.set(coordDim, true);
		}
	}
	var generateCoord = opt.generateCoord;
	var generateCoordCount = opt.generateCoordCount;
	var fromZero = generateCoordCount != null;
	generateCoordCount = generateCoord ? generateCoordCount || 1 : 0;
	var extra = generateCoord || "value";
	function ifNoNameFillWithCoordName(resultItem) {
		if (resultItem.name == null) resultItem.name = resultItem.coordDim;
	}
	if (!omitUnusedDimensions) for (var resultDimIdx = 0; resultDimIdx < dimCount; resultDimIdx++) {
		var resultItem = getResultItem(resultDimIdx);
		if (resultItem.coordDim == null) {
			resultItem.coordDim = genCoordDimName(extra, coordDimNameMap, fromZero);
			resultItem.coordDimIndex = 0;
			if (!generateCoord || generateCoordCount <= 0) resultItem.isExtraCoord = true;
			generateCoordCount--;
		}
		ifNoNameFillWithCoordName(resultItem);
		if (resultItem.type == null && (guessOrdinal(source, resultDimIdx) === BE_ORDINAL.Must || resultItem.isExtraCoord && (resultItem.otherDims.itemName != null || resultItem.otherDims.seriesName != null))) resultItem.type = "ordinal";
	}
	else {
		each(resultList, function(resultItem) {
			ifNoNameFillWithCoordName(resultItem);
		});
		resultList.sort(function(item0, item1) {
			return item0.storeDimIndex - item1.storeDimIndex;
		});
	}
	removeDuplicates(resultList, function(item) {
		return item.name;
	}, function(item, existingCount) {
		if (existingCount > 0) item.name = item.name + (existingCount - 1);
	});
	return new SeriesDataSchema({
		source,
		dimensions: resultList,
		fullDimensionCount: dimCount,
		dimensionOmitted: omitUnusedDimensions
	});
}
function getDimCount(source, sysDims, dimsDef, optDimCount) {
	var dimCount = Math.max(source.dimensionsDetectedCount || 1, sysDims.length, dimsDef.length, optDimCount || 0);
	each(sysDims, function(sysDimItem) {
		var sysDimItemDimsDef;
		if (isObject(sysDimItem) && (sysDimItemDimsDef = sysDimItem.dimsDef)) dimCount = Math.max(dimCount, sysDimItemDimsDef.length);
	});
	return dimCount;
}
function genCoordDimName(name, map, fromZero) {
	if (fromZero || map.hasKey(name)) {
		var i = 0;
		while (map.hasKey(name + i)) i++;
		name += i;
	}
	map.set(name, true);
	return name;
}
//#endregion
//#region node_modules/echarts/lib/model/referHelper.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
/**
* Helper for model references.
* There are many manners to refer axis/coordSys.
*/
/**
* @class
* For example:
* {
*     coordSysName: 'cartesian2d',
*     coordSysDims: ['x', 'y', ...],
*     axisMap: HashMap({
*         x: xAxisModel,
*         y: yAxisModel
*     }),
*     categoryAxisMap: HashMap({
*         x: xAxisModel,
*         y: undefined
*     }),
*     // The index of the first category axis in `coordSysDims`.
*     // `null/undefined` means no category axis exists.
*     firstCategoryDimIndex: 1,
*     // To replace user specified encode.
* }
*/
var SeriesModelCoordSysInfo = function() {
	function SeriesModelCoordSysInfo(coordSysName) {
		this.coordSysDims = [];
		this.axisMap = createHashMap();
		this.categoryAxisMap = createHashMap();
		this.coordSysName = coordSysName;
	}
	return SeriesModelCoordSysInfo;
}();
function getCoordSysInfoBySeries(seriesModel) {
	var coordSysName = seriesModel.get("coordinateSystem");
	var result = new SeriesModelCoordSysInfo(coordSysName);
	var fetch = fetchers[coordSysName];
	if (fetch) {
		fetch(seriesModel, result, result.axisMap, result.categoryAxisMap);
		return result;
	}
}
var fetchers = {
	cartesian2d: function(seriesModel, result, axisMap, categoryAxisMap) {
		var xAxisModel = seriesModel.getReferringComponents("xAxis", SINGLE_REFERRING).models[0];
		var yAxisModel = seriesModel.getReferringComponents("yAxis", SINGLE_REFERRING).models[0];
		result.coordSysDims = ["x", "y"];
		axisMap.set("x", xAxisModel);
		axisMap.set("y", yAxisModel);
		if (isCategory(xAxisModel)) {
			categoryAxisMap.set("x", xAxisModel);
			result.firstCategoryDimIndex = 0;
		}
		if (isCategory(yAxisModel)) {
			categoryAxisMap.set("y", yAxisModel);
			result.firstCategoryDimIndex ?? (result.firstCategoryDimIndex = 1);
		}
	},
	singleAxis: function(seriesModel, result, axisMap, categoryAxisMap) {
		var singleAxisModel = seriesModel.getReferringComponents("singleAxis", SINGLE_REFERRING).models[0];
		result.coordSysDims = ["single"];
		axisMap.set("single", singleAxisModel);
		if (isCategory(singleAxisModel)) {
			categoryAxisMap.set("single", singleAxisModel);
			result.firstCategoryDimIndex = 0;
		}
	},
	polar: function(seriesModel, result, axisMap, categoryAxisMap) {
		var polarModel = seriesModel.getReferringComponents("polar", SINGLE_REFERRING).models[0];
		var radiusAxisModel = polarModel.findAxisModel("radiusAxis");
		var angleAxisModel = polarModel.findAxisModel("angleAxis");
		result.coordSysDims = ["radius", "angle"];
		axisMap.set("radius", radiusAxisModel);
		axisMap.set("angle", angleAxisModel);
		if (isCategory(radiusAxisModel)) {
			categoryAxisMap.set("radius", radiusAxisModel);
			result.firstCategoryDimIndex = 0;
		}
		if (isCategory(angleAxisModel)) {
			categoryAxisMap.set("angle", angleAxisModel);
			result.firstCategoryDimIndex ?? (result.firstCategoryDimIndex = 1);
		}
	},
	geo: function(seriesModel, result, axisMap, categoryAxisMap) {
		result.coordSysDims = ["lng", "lat"];
	},
	parallel: function(seriesModel, result, axisMap, categoryAxisMap) {
		var ecModel = seriesModel.ecModel;
		var parallelModel = ecModel.getComponent("parallel", seriesModel.get("parallelIndex"));
		var coordSysDims = result.coordSysDims = parallelModel.dimensions.slice();
		each(parallelModel.parallelAxisIndex, function(axisIndex, index) {
			var axisModel = ecModel.getComponent("parallelAxis", axisIndex);
			var axisDim = coordSysDims[index];
			axisMap.set(axisDim, axisModel);
			if (isCategory(axisModel)) {
				categoryAxisMap.set(axisDim, axisModel);
				if (result.firstCategoryDimIndex == null) result.firstCategoryDimIndex = index;
			}
		});
	},
	matrix: function(seriesModel, result, axisMap, categoryAxisMap) {
		var matrixModel = seriesModel.getReferringComponents("matrix", SINGLE_REFERRING).models[0];
		result.coordSysDims = ["x", "y"];
		var xModel = matrixModel.getDimensionModel("x");
		var yModel = matrixModel.getDimensionModel("y");
		axisMap.set("x", xModel);
		axisMap.set("y", yModel);
		categoryAxisMap.set("x", xModel);
		categoryAxisMap.set("y", yModel);
	}
};
function isCategory(axisModel) {
	return axisModel.get("type") === "category";
}
//#endregion
//#region node_modules/echarts/lib/chart/helper/createSeriesData.js
/**
* AUTO-GENERATED FILE. DO NOT MODIFY.
*/
function getCoordSysDimDefs(seriesModel, coordSysInfo) {
	var coordSysName = seriesModel.get("coordinateSystem");
	var registeredCoordSys = CoordinateSystemManager.get(coordSysName);
	var coordSysDimDefs;
	if (coordSysInfo && coordSysInfo.coordSysDims) coordSysDimDefs = map(coordSysInfo.coordSysDims, function(dim) {
		var dimInfo = { name: dim };
		var axisModel = coordSysInfo.axisMap.get(dim);
		if (axisModel) {
			var axisType = axisModel.get("type");
			dimInfo.type = getDimensionTypeByAxis(axisType);
		}
		return dimInfo;
	});
	if (!coordSysDimDefs) coordSysDimDefs = registeredCoordSys && (registeredCoordSys.getDimensionsInfo ? registeredCoordSys.getDimensionsInfo() : registeredCoordSys.dimensions.slice()) || ["x", "y"];
	return coordSysDimDefs;
}
function injectOrdinalMeta(dimInfoList, createInvertedIndices, coordSysInfo) {
	var firstCategoryDimIndex;
	var hasNameEncode;
	coordSysInfo && each(dimInfoList, function(dimInfo, dimIndex) {
		var coordDim = dimInfo.coordDim;
		var categoryAxisModel = coordSysInfo.categoryAxisMap.get(coordDim);
		if (categoryAxisModel) {
			if (firstCategoryDimIndex == null) firstCategoryDimIndex = dimIndex;
			dimInfo.ordinalMeta = categoryAxisModel.getOrdinalMeta();
			if (createInvertedIndices) dimInfo.createInvertedIndices = true;
		}
		if (dimInfo.otherDims.itemName != null) hasNameEncode = true;
	});
	if (!hasNameEncode && firstCategoryDimIndex != null) dimInfoList[firstCategoryDimIndex].otherDims.itemName = 0;
	return firstCategoryDimIndex;
}
/**
* Caution: there are side effects to `sourceManager` in this method.
* Should better only be called in `Series['getInitialData']`.
*/
function createSeriesData(sourceRaw, seriesModel, opt) {
	opt = opt || {};
	var sourceManager = seriesModel.getSourceManager();
	var source;
	var isOriginalSource = false;
	if (sourceRaw) {
		isOriginalSource = true;
		source = createSourceFromSeriesDataOption(sourceRaw);
	} else {
		source = sourceManager.getSource();
		isOriginalSource = source.sourceFormat === SOURCE_FORMAT_ORIGINAL;
	}
	var coordSysInfo = getCoordSysInfoBySeries(seriesModel);
	var coordSysDimDefs = getCoordSysDimDefs(seriesModel, coordSysInfo);
	var useEncodeDefaulter = opt.useEncodeDefaulter;
	var encodeDefaulter = isFunction(useEncodeDefaulter) ? useEncodeDefaulter : useEncodeDefaulter ? curry(makeSeriesEncodeForAxisCoordSys, coordSysDimDefs, seriesModel) : null;
	var createDimensionOptions = {
		coordDimensions: coordSysDimDefs,
		generateCoord: opt.generateCoord,
		encodeDefine: seriesModel.getEncode(),
		encodeDefaulter,
		canOmitUnusedDimensions: !isOriginalSource
	};
	var schema = prepareSeriesDataSchema(source, createDimensionOptions);
	var firstCategoryDimIndex = injectOrdinalMeta(schema.dimensions, opt.createInvertedIndices, coordSysInfo);
	var store = !isOriginalSource ? sourceManager.getSharedDataStore(schema) : null;
	var stackCalculationInfo = enableDataStack(seriesModel, {
		schema,
		store
	});
	var data = new SeriesData(schema, seriesModel);
	data.setCalculationInfo(stackCalculationInfo);
	var dimValueGetter = firstCategoryDimIndex != null && isNeedCompleteOrdinalData(source) ? function(itemOpt, dimName, dataIndex, dimIndex) {
		return dimIndex === firstCategoryDimIndex ? dataIndex : this.defaultDimValueGetter(itemOpt, dimName, dataIndex, dimIndex);
	} : null;
	data.hasItemOption = false;
	data.initData(isOriginalSource ? source : store, null, dimValueGetter);
	return data;
}
function isNeedCompleteOrdinalData(source) {
	if (source.sourceFormat === "original") {
		var sampleItem = firstDataNotNull(source.data || []);
		return !isArray(getDataItemValue(sampleItem));
	}
}
function firstDataNotNull(arr) {
	var i = 0;
	while (i < arr.length && arr[i] == null) i++;
	return arr[i];
}
//#endregion
export { createDimensions as n, prepareSeriesDataSchema as r, createSeriesData as t };
