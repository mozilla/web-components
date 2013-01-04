(function(){
	
	var win = window,
		doc = document,
		tags = {},
		tokens = [],
		domready = false,
		mutation = win.MutationObserver || win.WebKitMutationObserver ||  win.MozMutationObserver,
		register = doc.register || function(name, options){
			if (!tags[name]) tokens.push(name);
			var options = options || {},
				lifecycle = options.lifecycle || {},
				proto = options['prototype'] || Object.create((win.HTMLSpanElement || win.HTMLElement).prototype),
				tag = tags[name] = {
					'prototype': wrapAttributes(proto),
					'fragment': options.fragment || document.createDocumentFragment(),
					'lifecycle': {
						created: lifecycle.created || function(){},
						removed: lifecycle.removed || function(){},
						inserted: lifecycle.inserted || function(){},
						attributeChanged: lifecycle.attributeChanged ||  function(){}
					}
				};
			if (domready) query(doc, name).forEach(function(element){
				upgrade(element, true);
			});
			return tag['prototype'];
		};
	
	var unsliceable = ['number', 'boolean', 'string', 'function'];
	function toArray(obj){
      return unsliceable.indexOf(typeof obj) == -1 ? 
			Array.prototype.slice.call(obj, 0) :
			[obj];
    };
	
	function query(element, selector){
      return toArray(element.querySelectorAll(selector));
    };
	
	function getTag(element){
		return element.nodeName ? tags[element.nodeName.toLowerCase()] : false;
	};
	
	function wrapAttributes(proto){
		var original = proto.setAttribute;
		proto.setAttribute = function(attr, value){
			var last = this.getAttribute(attr);
			original.call(this, attr, value);
			if (this.nodeName && this.nodeName.match(/^X-/) && last != this.getAttribute(attr)) {
				var tag = getTag(this);
				if (tag) tag.lifecycle.attributeChanged.call(this, attr, value, last);
			}
		};
		return proto;
	};
	
	function manipulate(element, fn){
        var next = element.nextSibling,
            parent = element.parentNode,
			frag = doc.createDocumentFragment(),
			returned = fn.call(frag.appendChild(element), frag) || element;
        next ? parent.insertBefore(returned, next) : parent.appendChild(returned);
    };
	
	function upgrade(element, replace){
		if (!element._elementupgraded && !element._suppressObservers) {
			var tag = getTag(element);
			if (tag) {
				var upgraded = element;
				if (replace) {
					element._suppressObservers = true;
					manipulate(element, function(){
						upgraded = doc.createElement(element.nodeName);
						upgraded._suppressObservers = true;
						while (element.firstChild) upgraded.appendChild(element.firstChild);
						var index = element.attributes.length;
						while (index--) {
							var attr = element.attributes[index];
							upgraded.setAttribute(attr.name, attr.value);
						}
						return upgraded;
					});
				}
				upgraded.__proto__ = tag['prototype'];
				upgraded._elementupgraded = true;
				if (!mutation) delete upgraded._suppressObservers;
				tag.lifecycle.created.call(upgraded, tag['prototype']);
				if (replace) fireEvent(element, 'elementreplace', { upgrade: upgraded }, { bubbles: false });
				fireEvent(upgraded, 'elementupgrade');
			}
		}
	};
	
	function inserted(element, event){
		var tag = getTag(element);
		if (tag){
			if (!element._elementupgraded) upgrade(element, true);
			else {
				if (element._suppressObservers) {
					delete element._suppressObservers;
					return element;
				}
				if (!element._suppressObservers && doc.documentElement.contains(element)) {
					tag.lifecycle.inserted.call(element);
				}
				if (element.childNodes.length) query(element, tokens).forEach(function(el){
					getTag(el).lifecycle.inserted.call(el);
				});
			}
		}
	};
	
	function removed(element){
		if (element._elementupgraded) {
			if (element._suppressObservers) delete element._suppressObservers;
			else {
				getTag(element).lifecycle.removed.call(element);
				if (element.childNodes.length) query(element, tokens).forEach(function(el){
					removed(el);
				});
			}
		}
	};
	
	function addObserver(element, type, fn){
		if (!element._observer) {
			element._observer = { inserted: [], removed: [] };
			if (mutation){
				var observer = new mutation(function(mutations) {
					parseMutations(element, mutations);
				});
				observer.observe(element, {
					subtree: true,
					childList: true,
					attributes: !true,
					characterData: false
				});
			}
			else ['Inserted', 'Removed'].forEach(function(type){
				element.addEventListener('DOMNode' + type, function(event){
					event._mutation = true;
					element._observer[type.toLowerCase()].forEach(function(fn){
						fn(event.target, event);
					});
				}, false);
			});
		}
		if (element._observer[type].indexOf(fn) == -1) element._observer[type].push(fn);
	};
	
	function removeObserver(element, type, fn){
		var obj = element._observer;
		if (obj) (fn) ? obj[type].splice(obj[type].indexOf(fn), 1) : obj[type] = [];
	};
		
	function parseMutations(element, mutations) {
		var diff = { added: [], removed: [] };
		mutations.forEach(function(record){
			record._mutation = true;
			for (var z in diff) {
				var type = element._observer[(z == 'added') ? 'inserted' : 'removed'],
					nodes = record[z + 'Nodes'], length = nodes.length;
				for (i = 0; i < length && diff[z].indexOf(nodes[i]) == -1; i++){
					diff[z].push(nodes[i]);
					type.forEach(function(fn){
						fn(nodes[i], record);
					});
				}
			}
		});
	};
		
	function fireEvent(element, type, data, options){
		var options = options || {},
		event = doc.createEvent('Event');
		event.initEvent(type, 'bubbles' in options ? options.bubbles : true, 'cancelable' in options ? options.cancelable : true);
		for (var z in data) event[z] = data[z];
		element.dispatchEvent(event);
	};
	
 	if (!doc.register) {
		doc.register = register;
		function initialize(){
			addObserver(doc.documentElement, 'inserted', inserted);
			addObserver(doc.documentElement, 'removed', removed);
			
			if (tokens.length) query(doc, tokens).forEach(function(element){
				upgrade(element, true);
			});
			
			var _createElement = doc.createElement;
			doc.createElement = function createElement(tag){
				var element = _createElement.call(this, tag);
				upgrade(element);
				return element;
			};
			
			domready = true;    
			fireEvent(doc, 'DOMComponentsLoaded');
			fireEvent(doc, '__DOMComponentsLoaded__');    
		}
		
		if (doc.readyState == 'complete') initialize();
		else doc.addEventListener(doc.readyState == 'interactive' ? 'readystatechange' : 'DOMContentLoaded', initialize); 
	}

})();
