(function(){
	
	var createFragment = function(element){
		if (element) {
			element.__frag__ = document.createDocumentFragment(element.innerHTML);
			element.__frag__.ownerDocument = document.implementation.createHTMLDocument('');
			element.__frag__.ownerDocument.addEventListener('error', function(){ return true; }, true);
			var script = document.createElement('script');
			script.type = 'html/template';
		}
	};
	
	document.register('template', {
		lifecycle: {
			created: function(){
				createFragment(this);
			}
		},
		'prototype': Object.create(HTMLScriptElement.prototype, {
			content: {
				get: function(){
					return this.__frag__;
				}
			}
		})
	});
	
})();
