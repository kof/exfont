/**
 * Exfont plugin for jquery
 *  
 * @depends jquery.js, jquery.flash.js
 * @version: 0.1
 * @author Oleg Slobodskoi aka Kof
 */

(function($, window, undefined){

$.fn.exfont = function( method, options ) {
    if ( !$.fn.flash ) $.error('flash plugin is required');
    
    if ( typeof method != 'string' ) {
        options = method;
        method = 'init';
    };
    
    var args = Array.prototype.slice.call(arguments, 1),
        ret;
    this.each(function(){
        var instance = $.data(this, 'exfont') || $.data(this, 'exfont', exfont(this, options));
        ret = instance[method].apply(instance, args);        
    });
    return ret || this;    
};

$.fn.exfont.defaults = {
    host: 'localhost',
    path: '/exfont/exfont',
    fontFamily: null,
    fontSize: null,
    lineHeight: null,
    fontWeight: null,
    textAlign: null,
    wordWrap: true,
    color: null,
    text: null,
    width: null,
    height: null,
    frameSize: 0,
    frameColor: '',
    flashSettings: {
        version: '8.0.0',
        attr: {
            salign: 'lt'
        }
    },
    onload: $.noop,
    onready: true // load flash movie after domready
};

var timestamp = (new Date).getTime();

function exfont( elem, options ) {
    
    var self = {},
        s = $.extend(true, {}, $.fn.exfont.defaults, options),
        $elem = $(elem),
        flashElem,
        // save original element size, because we will restore it
        _elemSize ,
        loaded = false;
        
    
    self.init = function() {
        loaded = false;

        s.text = $.trim( s.text ? s.text : $elem[0].innerHTML );
        s.fontFamily = parseFontFamily( s.fontFamily ? s.fontFamily : $elem.css('fontFamily') );
        !s.fontSize && (s.fontSize = parseInt( $elem.css('fontSize') ) );
        !s.lineHeight && (s.lineHeight = parseInt( $elem.css('lineHeight') ) );
        !s.textAlign && (s.textAlign = $elem.css('textAlign') );
        !s.fontWeight && (s.fontWeight = $elem.css('fontWeight') );
        !s.color && (s.color = '#' + rgb2hex( $elem.css('color') ) );
        
        // global callback name, make it short because space is needed for jsonp
        // increase timestamp each time, because new Date isn't always correct in miliseconds area 
        var callbackName = 'exf' + timestamp++;

        // cache original css dimensions
        _elemSize = {
            width: elem.width || null,
            height: elem.height || null
        };

        window[callbackName] = function jsonpCallback( status, data ) {
            // if status is error, then data is the error message
            if (status == 'error') return $.error(data);

            var flashvars = {
                fontSize: s.fontSize,
                textAlign: s.textAlign,
                fontWeight: s.fontWeight,
                color: s.color,
                callback: callbackName,
                enableFrame: !!s.frameSize,
                frameColor: s.frameColor,
                frameSize: s.frameSize,
                wordWrap: s.wordWrap
            };

            s.width && (flashvars.width = s.width);
            s.height && (flashvars.height = s.height);

            var flashSettings = $.extend(true, {
                    swf: data,
                    params: {flashvars: flashvars}
                }, s.flashSettings);

            // reuse the same global namespace
            window[callbackName] = function flashCallback( width, height ) {
                flashElem = $elem.flash('get');
                // exfont getter and setter methods are sometimes later available on IE
                if ( !flashElem || !flashElem.exfontGet ) {
                    return setTimeout(function(){
                        flashCallback(width, height);    
                    }, 50);
                }
                
                // set flash size
                resize({width: width, height: height});
                loaded = true;
                // call the onload callback
                s.onload.call(elem, s); 
                $elem.trigger('exfontonload', [width, height]);
                // delete global namespace
                try{ delete window[callbackName]; } catch(e) { window[callbackName] = undefined; };
            };

            $elem.addClass('exfont')
            // if no width or height given take the dome node dimension temporary, 
            // it will be overwritten after flash is loaded
            .css({
                width: s.width || $elem.width(),
                height: s.height || $elem.height()
            });
            
            // load flash file after the document is ready is onready is true
            s.onready ? $(function(){ 
                $elem.flash(flashSettings); 
            }) : $elem.flash(flashSettings);
        };
        
        $.ajax({
            url: 'http://' + s.host + s.path + ".js",
            dataType: 'script',
            scriptCharset: 'UTF-8',
            data: {
                c: callbackName,
                f: s.fontFamily,
                t: s.text
            }
        });       
    };
    
    self.destroy = function() {
        $elem.css(_elemSize).removeData('exfont')
        .removeClass('exfont').flash('destroy');
    };
    
    self.option = function( name, value ) {
        if ( !loaded ) return;
        // setter
        if ( value ) {
            flashElem.exfontSet(name, value);
            /fontSize|lineHeight|fontWeight|width|height/.test(name) && resize();
        // getter    
        } else {
            return flashElem.exfontGet(name);    
        };
    };
    
    self.text = function( t ) {
        if ( t ) {
            s.text = t;
            $elem.flash('destroy');
            self.init();    
        } else
            return s.text;    
    };
    
    self.fontFamily = function( f ) {
        s.fontFamily = parseFontFamily(f);
        $elem.flash('destroy');
        self.init();                
    };
    
    function resize( size ) {
        !size && (size = {});
        !size.width && (size.width = flashElem.exfontGet('width'));
        !size.height && (size.height = flashElem.exfontGet('height'));
        $(flashElem).attr(size);
        $elem.css(size);
    };
    
    return self;
};   

    
function rgb2hex( c ) {
    c = c.toUpperCase();
    if (/RGB/.test(c)) {
        c = /RGB\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(c);
        return tohex(parseInt(c[1], 10)) + tohex(parseInt(c[2], 10)) + tohex(parseInt(c[3], 10));
    } else 
        return c.replace('#','');            
};

function tohex( d ) {
    if ( d == null ) return "00";
    d=parseInt(d); 
    if (d==0 || isNaN(d)) return "00";
    d=Math.max(0,d); 
    d=Math.min(d,255); 
    d=Math.round(d);
    return "0123456789ABCDEF".charAt((d-d%16)/16) + "0123456789ABCDEF".charAt(d%16);
};

function parseFontFamily(f) {
    return $.trim(f.replace(/"/gi, '').split(',')[0]);    
};

})(jQuery, this);
 