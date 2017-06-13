// Component control library
// Author - Quincey James (qubbe@qubbe.net)
// Version - 1.5.52
// Ver: 1.5.00 Added Mustache.js support
var QComps = new function(){
	var _comps = {};
	var _this = this;
	var pattern = /\[CDATA\[((\s*?.*?)*?)]]/;
	var pattern_script = /<script>((\s*?.*?)*?)<\/script>/;
	var _externalFile;
	var _activeStyles = {};
	var _styleSheet;
	var _globals = {};
	var _uidCount = 0;
	var _pathHelper = document.createElement('a');
	var _uniquePaths = {};
	var __qCompPaths = {};


	this.getComps = function(){
		return _comps;
	}

	this.hasComp = function(name){
		return _comps[name] != null;
	}

	
	_this.update = function(extUrl, cb, ignoreTags){
		if(extUrl == null){
			$("component").each(_parseComps);
			$("component").remove();
			findCompTags($(document));
		}else{
			$.get(extUrl, function(d){
				
				_parseExternalComps(d);

				if(!ignoreTags)findCompTags($(document));
				console.log('QComp Update Call Complete', extUrl);
				
			}).done(function(){
				console.log("QComp Update Successful");
				if(cb != null)cb(true);
			}).fail(function(){
				console.log("QComp Update Failed");
				if(cb != null)cb(false);
			})
		}
		
		//console.log("Componenets", _comps);
	}

	this.resolvePath = resolvePath;
	function resolvePath(p){
		_pathHelper.href = p;
		return _pathHelper.pathname;
	}
	
	function cssParser(styles){
		var patterns = {
			'@media' : /@media[^{]+\{([\s\S]+?})\s*}/g,
		};

		var mediaQueries = styles.match(patterns['@media']);
		var leftOver = styles.replace(patterns['@media'], '');

		var cssObj = {};

		function parseStyle(s){
			var r1 = s.split('}');
			var o = {};
			for(var i=0; i < r1.length; i++){
				
				var style = r1[i].split('{');
				//console.log('style:', r1[i])
				if(style.length < 2)continue;
				var selector = style[0].trim();
				var rules = style[1].split(';');
				if(o[selector] == null)o[selector] = [];
				for(var j=0; j < rules.length ; j++){
					var rule = rules[j].trim();
					if(!rule)continue;
					o[selector].push(rule);
				}
			}

			return o
		}


		function parseMedia(query){
			var start = query.indexOf('{');
			var end = query.lastIndexOf('}');
			var styles = query.slice(start + 1, end);
			var queryTag = query.slice(0, start).toLowerCase().trim();
			return {'query': queryTag, styles:  parseStyle(styles)};
		}

		cssObj = parseStyle(leftOver);
		if(mediaQueries){
			for(var i=0; i < mediaQueries.length; i++){
				var mq = parseMedia(mediaQueries[i]);
				var selector = mq.query;
				var styles = mq.styles;
				if(cssObj[selector] == null)cssObj[selector] = [];
				cssObj[selector].push(mq.styles);
			}
		}
		

		return cssObj;
		
	}

	function encodeStyle(cssObj, prefix){
		var style = '';	
		//var prefix = "[qcomp='" + name + "']";
		for(var selector in cssObj){
			if(selector.substr(0, 6) == '@media' ){
				var ms = cssObj[selector];
				var msq = ''
				for(var i=0; i < ms.length; i++){
					msq += encodeStyle(ms[i], prefix);
				}

				style += selector + "{" + msq + "}\n";

				
			}else{
				var rules = cssObj[selector];
				var isMulti = selector.split(',');
				if(isMulti.length > 1){
					selector = isMulti.map(function(obj){
						return applyPrefix(obj, prefix);
					}).join(', ');
				}else{
					selector = applyPrefix(selector, prefix);
				}
				style += selector + "{" + rules.join(";") + "}";
			}		
		}
		
		return style;

		function applyPrefix(selector, prefix){
			selector = selector.trim();

			if(selector.charAt(0) == '&'){
				selector = selector.replace('&', prefix);
			}else{
				selector = prefix + ' ' + selector;
			}

			return selector;
		}
	}

	function parseGlobals(d){
		var globals = extractElements(d, "global");
		for(var p in globals){
			var gs = extractElements(globals[p].content, 'script');
			console.log('gs:', gs)
			for(var script in gs){
				var s = gs[script];
				if(s.attributes['src'] != null){
					var path = resolvePath(s.attributes['src']);
					if(_uniquePaths[path] == null){
						$('head').append(s.element);
						_uniquePaths[path] = s.element;
					}						
				}else{
					var func = eval("(function(_global){" + gs[script].content + "})");
					_globals[script] = new func(_globals);
				}
				
			}				
		}

		//console.log('unique paths:', _uniquePaths)

		//console.log("Globals:", _globals)
	}

	function _parseExternalComps(d){
		var o = extractElements(d, "component");

		parseGlobals(d);



		var tags = ['script', 'style'];
		for(var p in o){
			var comp = o[p].content;
			_comps[p] = {};
			for(var i = 0; i < tags.length; i++){
				var tagName = tags[i];
				var extraction = extractTag(comp, tagName);
				var tag = extraction.content;
				comp = extraction.leftOver.trim() || '<div style="display:none"></div>';
				//console.log('extraction.leftOver:', comp)
				if(tag != null){
					_comps[p][tagName] = (tagName == 'style')? cssParser(tag) : tag.trim();
				}
			}

			_comps[p].html = comp.trim();

		}			
	}

	function _parseComps(){
		var ih = this.innerHTML;

		var scripts = pattern.exec(ih);
		
		var c = $(this);

		var fih = ih.replace(pattern, "").replace("<!---->", "").trim();

		_comps[c.attr("name")] = {html:fih};

		if(scripts != null){
			if(scripts[1] != null){
				_comps[c.attr("name")].script = scripts[1];
			}
		}
	}

	_this.getComp = function(c){
		//console.log(_comps);
		if(c == null)return _comps;
		return _comps[c];
	}

	/*_this.update("common.comps", function(){
		if(window.onQComps){
			window.onQComps();
		}
	});*/
	
	function objCopy(o){
		var t = {};
		for(var p in o){
			t[p] = o[p];
		}
		return t;
	}
	
	function toBool(v){
	    switch(typeof(v)){
	        case 'boolean':
	        case 'number':
	            return Boolean(v);
	        break;
	        case 'string':
	            switch(v.toLowerCase(v).trim()){
	                case 'true':
	                    return true;
	                break;
	                case 'false':
	                    return false;
	                break;
	            }
	        break;
	    }
	    return Boolean(v);
	}

	function parseAttrObj(v){

		//key1:value; key2:value etc...
		
		if(typeof v != 'string')return v;

		if(v.indexOf(":") == -1)return v.trim();;
		var kvp = v.split(";");
		var kv = {};
		for(var i=0; i < kvp.length; i++){
			var itm = kvp[i].split(":");
			kv[itm[0].trim()] = itm[1].trim();
		}

		return kv;
	}

	function parseQComp(value, root, optns){
		var targ = $(value);
		var name = targ.text().trim();
		var options = objCopy(optns || {});
		for(var j=0; j < value.attributes.length; j++){
			var atr = value.attributes[j];
			var valType = atr.name.split(':');
			var atrName = atr.name;
			var atrVal = atr.value;
			
			if(valType.length > 1){
				var castType = valType[1];
				atrName = valType[0];						
				switch(castType.toLowerCase()){
					case 'bool':
						atrVal = toBool(atrVal);
					break;
					case 'number':
						atrVal = Number(atrVal);
					break;
					case 'string':
						atrVal = String(atrVal);
					break;
					case 'json':
						atrVal = JSON.parse(atrVal);
					break;
					case 'keyval':
					case 'style':
						atrVal = parseAttrObj(atrVal);
					break;
				}
			}
			options[atrName] = atrVal;
		}


		var newComp = _getComponent(name, root, options, true);

		console.log('Get Component: ' + name + "  ", newComp)

		
		for(var i=0; i < value.attributes.length; i++){
			var atr = value.attributes[i];
			switch(atr.name.toLowerCase()){
				case 'class':
					newComp.addClass(atr.value)
				break;
				case 'id':
					newComp.attr("id", atr.value);
				break;
				case 'style':
					var s = atr.value.split(";");
					for(var k = 0; k < s.length; k++){
						var itm = s[k].split(":");
						if(itm.length == 2)newComp.css(itm[0].trim(), itm[1].trim());
					}
				break;
			}

			var valType = atr.name.split(':');
			if(valType.length > 1){
				var castType = valType[1];
				atrName = valType[0];						
				switch(castType.toLowerCase()){
					case 'attr':
						newComp.attr(atrName, atr.value);
					break;
				}
			}
			
		}

		var parent;

		if(root.prop('qcomp') != null){
			parent = root;
		}

		_applyScript(name, newComp, options, parent);

		targ.replaceWith(newComp);
	}

	function findCompTags(root, optns){
		//console.log('Comps Found:', compsFound);
		root.find("qcomp").each(function(index, value){
			parseQComp(value, root, optns);
		})
	}

	
	function getStyleSheet(){
		if(_styleSheet == null){
			_styleSheet = $('<style></style>');
			$('head').prepend(_styleSheet);
		}

		return _styleSheet;
	}

	function _applyStyle(name){
		var styleSheet = getStyleSheet();
		if(_activeStyles[name])return;

		_activeStyles[name] = true;	

		
		var style = _comps[name]['style'];
		if(style){
			var prefix = "[qcomp='" + name + "']";
			styleSheet.append(encodeStyle(style, prefix));
		}

		//console.log('stylesheet:', styleSheet);
		//var styleSheet = $('head').append('style');

	}

	function _applyScript(name, comp, options, parent){
		if(_comps[name] != null){
			var s = _comps[name].script;
			if(s != null){
				var func = eval("(function(_view, _self, _options, _parent, _global){" + s + "})");
				//var compscript = new func(comp, options || {}, _parent);
				//comp.data("qcomp_script", compscript);
				comp.prop('qcomp').script = new func(comp, comp, options || {}, parent, _globals);
			}				
		}
	}

	_this.applyScript = function(name, comp, options){
		if(_this.getScript(comp)) return;
		_applyScript(name, comp, options);
	}

	_this.getComponentHTML = function(name){
		if(_comps[name])return _comps[name].html
	}

	_this.NodeToComponent = function(node, name, parent, options){			
		var comp = $(node);
		if(_this.getScript(comp)) return comp;

		comp.prop('qcomp',{name:name, parent:parent});
		comp.attr('qcomp', name);

		findCompTags(comp, options);				
		_applyScript(name, comp, options);	
		return comp;
	}

	function objPathVal(o, s) {

		//console.log('is null?', (o == null));

		if(o == null)return;

		var tp = typeof(o);


		//console.log('o:', o);
		//console.log("ooo.toString: ",o.toString());

		if(tp != 'array' && tp != 'object'){
			return;
		}
	    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
	    s = s.replace(/^\./, '');           // strip a leading dot
	    var a = s.split('.');
	    for (var i = 0, n = a.length; i < n; ++i) {
	        var k = a[i];
	        if (typeof(o) == 'object' && (k in o)) {
	            o = o[k];
	        } else {
	            return;
	        }
	    }
	    return o;
	}

	function interpolate(str) {
	    return function(o) {
	        return str.replace(/{([^{}]*)}/g, function (a, b) {
	            var r = objPathVal(o, b.trim());
	            return typeof r === 'string' || typeof r === 'number' ? r : a;
	        });
	    }
	}

	function _getComponent(name, parent, options, ignoreScript){
		if(_comps[name] != null){
			var comp = (window['Mustache'] != null)? $(Mustache.render(_comps[name].html, options || {})) : $(interpolate(_comps[name].html)(options || {}));
			comp.prop('qcomp',{name:name, parent:parent});
			comp.attr('qcomp', name);

			findCompTags(comp, options);

			if(!ignoreScript){
				_applyScript(name, comp, options, parent);
			}

			_applyStyle(name);

			return comp;
		}
	}

	this.isComponent = function(dom){
		return $(dom).prop('qcomp') != null;
	}

	/*
		returns a custom component;
		name - String: Name of the compounent to return
		options - Object: name value pari object of properties and values to pass to the component
	*/
	_this.getComponent = function(name, options){
		return _getComponent(name, null, options);
	}

	/*
		return reference to the script function attached to a component
		comp - QComponent: reference to already created QComponent to get script reference
	*/
	_this.getScript = function(comp){
		if(comp == null)return
		return comp.prop("qcomp").script;
	}

	function extractElements(data, elementName){
		var index = 0;
		var result = {};
		while((index = data.indexOf("<" + elementName, index)) != -1){
			var cIndexStart = data.indexOf(">", index);
			var cIndexEnd = data.indexOf("</" + elementName, index);

			var element = $(data.slice(index, cIndexStart + 1));
			var name = element.attr("name");
			var attr ={}; 
			for(var i=0;i< element[0].attributes.length; i++){
				var a = element[0].attributes[i];
				attr[a.name.toLowerCase()] = a.value;
			} 
			var content = data.slice(cIndexStart + 1, cIndexEnd);

			if(name == null){
				name = elementName + '_' + _uidCount;
				_uidCount++
			}

			result[name] = {content:content, attributes:attr, element:data.slice(index, cIndexEnd + ("</" + elementName + ">").length  )};
			index = cIndexEnd;
		}

		return result;
	}

	function extractTag(data, elementName){
		var index = data.indexOf("<" + elementName, 0)
		var result = {};


		//console.log("Extract Tag:", elementName, "  index:", index)

		if(index == -1)return {content:null , leftOver:data}


		var cIndexStart = data.indexOf('>', index);
		var cIndexEnd = data.indexOf('</' + elementName, cIndexStart);
		var content = data.slice(cIndexStart + 1, cIndexEnd);

		var ele = data.slice(index, data.indexOf('>', cIndexEnd) + 1);

		//console.log("Script: " + ele);
		
		return {content:content , leftOver:data.split(ele).join("")}
	}


	var observer;
	var observer_config = { attributes: false, childList: true, subtree: true };

	if(window.MutationObserver != null){
		// create an observer instance
		observer = new MutationObserver(function(mutations) {
			//console.log("Mutations", mutations);
		    mutations.forEach(function(mutation) {
		    	handleMutation(mutation);
		  	});   
		});
	}

	function handleMutation(mutation){
		switch(mutation.type){
			case "childList":
				//console.log("Muttion childlist", mutation);
				for(var i=0; i < mutation.addedNodes.length; i++){
	    			var node = $(mutation.addedNodes[i]);

	    			if(QComps.isComponent(node)){
	    				var comp = new QComponent(node);		    				
	    				if(comp.controller['_onAdded']){		    					
	    					comp.controller._onAdded();
	    				}
	    			}

	    			node.find('[qcomp]').each(function(){
						var c = new QComponent($(this));
						if(c.controller['_onAdded']){
							c.controller._onAdded();
						}
					})		    			
	    		}

	    		for(var i=0; i < mutation.removedNodes.length; i++){
	    			var node = $(mutation.removedNodes[i]);

	    			if(QComps.isComponent(node)){
	    				var comp = new QComponent(node);		    				
	    				if(comp.controller['_onRemoved']){		    					
	    					comp.controller._onRemoved();
	    				}
	    			}	

	    			node.find('[qcomp]').each(function(){
						var c = new QComponent($(this));
						if(c.controller['_onRemoved']){
							c.controller._onRemoved();
						}
					})		    			
	    		}
			break;
		}
	}

	

	function startObserver(){

		if(window.MutationObserver == null) return;
		stopObserver();

		// select the target node
		var target = document;// document.querySelector('body');
		 
		// pass in the target node, as well as the observer options
		observer.observe(target, observer_config);

		//console.log("Observer Started")
	}

	function stopObserver(){
		if(window.MutationObserver == null) return;
		observer.disconnect();
	}
	startObserver();

	this.import = importComponents;

	/**
		Imports multiple component files, then loads any unloaded components in the web document.
		paths -> a path or an array of file paths ['/compfile1.qc', '/compfile2.qc']
		cb -> Callback function called after all files have loaded and (<qcomp> tags) are processed
	*/
	function importComponents(paths, cb){
		if(!(paths instanceof Array)){
			paths = [paths];
		}
		for(var i=0; i < paths.length; i++){
			importComponent(paths[i], function(success){
				for(var p in __qCompPaths){
					if(__qCompPaths[p] == 'loading')return;
				}
				QComps.update();
				if(cb)cb(true);
			}, true)
		}
	}

	/**
		Imports a component file, then processes any (<qcomp> tags) in the web document used by import
		p -> path to the component file
		cb -> function to be called after (<qcomp> tags) are processed.
		ignoreTags -> if set to true documents components (<qcomp> tags) will not be processed after.
	*/
	function importComponent(p, cb, ignoreTags){
		var path = resolvePath(p);
		var paths = __qCompPaths;

		if(paths[path] == null || paths[path] == 'error'){
			__qCompPaths[path] = 'loading';
			QComps.update(path, function(success){
				__qCompPaths[path] = (success) ? 'complete':'error';
				if(cb)cb(success);
			}, ignoreTags)

		}else{
			console.log("Already Loaded:" + p);
			if(cb)cb(true);
		}	
	}

}

//** Component Utils

var ImportComponent = QComps.import;
var ImportComponents = QComps.import

/**
	loads a component.
	id -> components name / or component object
	options -> options to be passed to the component
*/
function QComponent(id, options){	
	
	var comp;
	var script; 


	if(QComps.isComponent(id)){
		comp = id;
		script = QComps.getScript(id);
	}else{
		comp = QComps.getComponent(id, options);
		script = QComps.getScript(comp) || {};
	}


	Object.defineProperty(this, 'controller' ,{
		get: function(){
			return script || {};
		}
	})

	Object.defineProperty(this, 'view', {
		get:function(){
			return comp;
		}
	})

}

QComponent.prototype.addChild = function(component, target) {
	var targ = this.view;
	if(target != null){
		targ = this.view.find(target);
	}
	if(component instanceof QComponent){
		targ.append(component.view);
	}else{
		targ.append(component);
	}

	return this;	
};

QComponent.prototype.removeChild = function(component){
	var comp = (component instanceof QComponent) ? component.view : component;

	if($.contains(this, comp)){
		comp.remove();
	}
	
	return this;
}