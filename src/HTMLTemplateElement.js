(function(){
  
  if (!window.HTMLTemplateElement) {
    
    document.templateContentsOwner = document.implementation.createHTMLDocument('');
    
    function createFragment(element){
      var wrap = document.createElement('div'),
          range = document.createRange();
      document.body.appendChild(wrap).innerHTML = element.innerHTML;
      range.setStartBefore(wrap.firstChild);
      range.setEndAfter(wrap.childNodes[wrap.childNodes.length - 1]);
      var frag = range.extractContents();
      document.body.removeChild(wrap);
      Object.defineProperty(frag, 'ownerDocument', { value: document.templateContentsOwner });
      return frag;
    };
    
    HTMLTemplateElement = document.register('template', {
      lifecycle: {
        created: function(){
          
        }
      },
      'prototype': Object.create(HTMLObjectElement.prototype, {
        content: {
          get: function(){
            var frag = this.__frag__ || (this.__frag__ = createFragment(this));
            if (!frag.childNodes.length) this.innerHTML = '';
            return frag;
          }
        }
      })
    });
    
  }
  
})();
