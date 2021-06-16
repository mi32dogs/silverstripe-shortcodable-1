(function($) {

    shortcodable = {

        controller_url: 'admin/shortcodable',

        init: function() {

            // handle change on shortcode-type field
            $('body').on('change', 'select.shortcode-type', function() {
                $.post(shortcodable.controller_url, $(this).parents('form').serializeArray(), function(data){
                    // (use the intermediary xhr_buffer element in order to have jQuery parse/activate listeners etc
                    simpler.modal.bodyHtml = $('#xhr_buffer').html(data).html();
                });
            });

            // shortcode form submit button handler
            $('body').on('submit', '#Form_ShortcodeForm', function(event) {
                event.preventDefault();
                shortcodable.insertShortcode();
                simpler.modal.show = false;
                return false;
            });
        },

        openDialog: function() {
            simpler.modal.show = true;
            simpler.modal.title = 'Insert/edit shortcode';
            simpler.modal.closeBtn = false;
            simpler.modal.closeTxt = 'Close';
            simpler.modal.saveBtn = false;
            simpler.modal.saveTxt = 'Insert shortcode';
            simpler.modal.bodyHtml = simpler.spinner;
            $.post(shortcodable.controller_url, shortcodable.getCurrentEditorSelectionAsParsedShortcodeData(), function(data){
                // (use the intermediary xhr_buffer element in order to have jQuery parse/activate listeners etc
                simpler.modal.bodyHtml = $('#xhr_buffer').html(data).html();
            });
        },

        // insert shortcode into editor
        insertShortcode: function() {
            let shortcodeData = $('#Form_ShortcodeForm').serializeArray();
            // [ {name: "ShortcodeType", value: "featuredimage"} {name: "title", value: "test"} {name: "SecurityID", value: "..."} ]
            let shortcodeParts = [ '...' ]; // @[0] to be replaced with actual shortcode
            $.each(shortcodeData, function( index, data ){
                if(data.name==="SecurityID") return;
                if(data.name==="ShortcodeType") {
                    shortcodeParts[0] = data.value;
                } else {
                    shortcodeParts.push(`${data.name}="${data.value}"`);
                }
            });
            let shortcode = `[${shortcodeParts.join(' ')}]`;

            if (shortcode.length) {
                tinyMCE.activeEditor.selection.setContent(shortcode);
                tinyMCE.activeEditor.undoManager.add(); // make snapshot so setContent is undo-able

//                this.modifySelection(function(ed){
//                    var shortcodable = tinyMCE.activeEditor.plugins.shortcodable;
//                    ed.replaceContent(shortcode);
//                    var newContent = shortcodable.replaceShortcodesWithPlaceholders(ed.getContent(), ed.getInstance());
//                    ed.setContent(newContent);
//                });
            }
        },

        // @TODO try & 'grow' selection to shortcode and parse
        getCurrentEditorSelectionAsParsedShortcodeData: function() {
            if(tinyMCE.activeEditor.selection.isCollapsed()){
                return;
            }

            var selectedTxt = tinymce.activeEditor.selection.getContent({format: 'text'}).trim();
            if( selectedTxt.length<=2 || selectedTxt.charAt(0)!=='[' || selectedTxt.slice(-1)!==']') {
                return;
            }

            var shortcodeData = { 'ShortcodeType': selectedTxt.slice(1,-1).split(' ').shift() };
            $.each($(`<${selectedTxt.slice(1,-1)} />`).get(0).attributes, function(index, attr){
                shortcodeData[attr.name] = attr.value
            });

            return shortcodeData;
        },

        // get an attribute from a shortcode string by its key, eg 'id' from '[myshortcode id="1" other="etc"]
        parseAttributeValue: function (string, key) {
            var attr = new RegExp(key + '=\"([^\"]+)\"', 'g').exec(string);
            // via tinymce.DOM.decode to decode any HTML entities, such as &aring;
            return attr ? tinymce.DOM.decode(attr[1]) : '';
        },

        // Substitute shortcodes with placeholder images
        shortcodesToPlaceholders: function(source, editor) {
            var placeholder_shortcodes = $(editor.targetElm).data('shortcodableplaceholdercodes');
            if (placeholder_shortcodes) {
                return source.replace(/\[([a-z_]+)\s*([^\]]*)\]/gi, function (found, name, params) {
                   if (placeholder_shortcodes.indexOf(name) !== -1) {
                       var id = shortcodable.parseAttributeValue(params, 'id');
                       var src = encodeURI(shortcodable.controller_url + '/placeholder/' + name + '/' + id + '?sc=[' + name + ' ' + params + ']');
                       var img = jQuery('<img/>')
                           .attr('class', 'sc-placeholder mceItem mceNonEditable')
                           .attr('title', name + ' ' + params)
                           .attr('src', src);
                       return img.prop('outerHTML');
                   }
                   return found;
                });
            }
            // else/default:
            return source;
        },

        // Substitutes placeholder images with their shortcode equivalents
        placeholdersToShortcodes: function(source, editor) {
            // find & replace .sc-placeholder images in the html
            var content = jQuery(source);
            content.find('.sc-placeholder').each(function () {
                var el = jQuery(this);
                var shortCode = '[' + tinymce.trim(el.attr('title')) + ']';
                el.replaceWith(shortCode);
            });

            // What's happening here? Sort of wrapping/cleaning stuff or so?
            var originalContent = '';
            content.each(function () {
                if (this.outerHTML !== undefined) {
                    originalContent += this.outerHTML;
                }
            });

            return originalContent;
        }

    };





})(jQuery);