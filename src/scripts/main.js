//in viewport
(function(e){e.fn.visible=function(t,n,r){var i=e(this).eq(0),s=i.get(0),o=e(window),u=o.scrollTop(),a=u+o.height(),f=o.scrollLeft(),l=f+o.width(),c=i.offset().top,h=c+i.height(),p=i.offset().left,d=p+i.width(),v=t===true?h:c,m=t===true?c:h,g=t===true?d:p,y=t===true?p:d,b=n===true?s.offsetWidth*s.offsetHeight:true,r=r?r:"both";if(r==="both")return!!b&&m<=a&&v>=u&&y<=l&&g>=f;else if(r==="vertical")return!!b&&m<=a&&v>=u;else if(r==="horizontal")return!!b&&y<=l&&g>=f}})(jQuery)

//
    $(window).on("scroll", function(){
        if($('.accept').visible(true)){
            $('.icon').addClass('slide-in');
        }
    });


(function ($) {
    "use strict";

    $('.selectize').selectize({
        sortField: 'text'
    });

    $('.selectize-tag').selectize({
        plugins: ['remove_button'],
        delimiter: ',',
        persist: false,
        create: function (input) {
            return {
                value: input,
                text: input
            };
        }
    });
    var url = document.location.toString();
    if (url.match('#')) {
        $('.register-login-cont a[href=#'+url.split('#')[1]+']').tab('show');
        window.scrollTo(0, 0);

    }
    $('.register-login-cont a').on('shown.bs.tab', function (e) {
        window.location.hash = e.target.hash;
        window.scrollTo(0, 0);
    })

    $('.country a').on("click", function(){
        $('.country-wrap').find('.active').removeClass('active');
        $(this).addClass('active');
    });
    $('.question').on('show.bs.collapse', function(){
        $(this).find('.icon-x-down-arrow').addClass('up-arrow');
    });
    $('.question').on('hide.bs.collapse', function(){
        $(this).find('.icon-x-down-arrow').removeClass('up-arrow');
    });
    $('#how-it-tab a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
    $('.developer-tabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
    $('.country-tabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
    $('.icon-x-right-arrow').click(function(){
        $('.nav-tabs > .active').next('li').find('a').trigger('click');
    });
    $('.accept').on("click",function(){
        $('.icon').addClass('slide-in');
    });
    $(window).on('load', function () {
        var $preloader = $('.page-preloader'),
            $spinner   = $preloader.find('.preloader-itself');
        $spinner.fadeOut();
        $preloader.delay(350).fadeOut('slow');
    });


    var wow = new WOW(
        {
            boxClass:     'wow',      // default
            animateClass: 'animated', // default
            offset:       40,          // default
            mobile:       true,       // default
            live:         true        // default
        }
    )
    wow.init();
    $('.carousel').carousel({
        interval: 8000
    });

    $(document).on('scroll',function(){
        var scrolled = $(window).scrollTop();
        if(scrolled>$(window).height()){
            $('.navbar-fixed').addClass('viewed');
            $('.navbar-fixed').addClass('slided');
        }
        if(scrolled<$(window).height()){
            $('.navbar-fixed').removeClass('viewed');
            $('.navbar-fixed').removeClass('slided');
        }

    });



})(window.jQuery);

(function ($) {
    $('[data-toggle="gmaps"]').each(function () {
        var $container = $(this),
            lat = Number($container.data('lat') || 51.522668),
            lng = Number($container.data('lng') || -0.085768);
        zoom = Number($container.data('zoom') || 15);

        // Map
        var coords = new google.maps.LatLng(lat, lng);




        // Map objects
        var objects = [],
            _table = {
                center: coords
            };

        $container.find('> *').each(function () {
            var $this = $(this),
                data  = $this.data();
            if (data.type == 'InfoWindow') data.content = $this.html();
            objects.push(data);
            $this.remove();
        });

        // Map init
        var initialize = function () {
            var mapOptions = {
                zoom: zoom,
                center: coords,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.BOTTOM_LEFT
                }
            };

            var styles = [{
                stylers: [{
                    saturation: '-59'
                }, {
                    lightness: '10'
                }, {
                    gamma: '1.02'
                }]
            }];

            var map = new google.maps.Map($container[0], mapOptions);
            map.setOptions({
                styles: styles
            });

            var data, opts, obj;
            for (var i = 0, l = objects.length; i < l; i++) {
                data = objects[i];
                if (!data.type || !google.maps[data.type]) continue;

                if (data.type == 'Marker') {
                    opts = {
                        map: map,
                        draggable: data.draggable && data.draggable != 'false' ? true : false
                    }
                    if (data.icon) opts.icon = data.icon;
                    if (data.position && _table[data.position]) opts.position = _table[data.position];
                    if (data.title) opts.title = data.title;
                }

                if (data.type == 'InfoWindow') {
                    opts = {
                        content: data.content
                    };
                    if (data.position && _table[data.position]) opts.position = _table[data.position];
                }

                obj = new google.maps[data.type](opts);

                if (data.type == 'InfoWindow' && data.marker && _table[data.marker]) {
                    google.maps.event.addListener(_table[data.marker], 'click', (function (marker, infowindow) {
                        return function () {
                            infowindow.open(map, marker);
                        }
                    })(_table[data.marker], obj));
                }

                if (data.name) _table[data.name] = obj;
            }
            $('.russia').on('click',function(e){
                e.preventDefault();
                var latlng = new google.maps.LatLng(59.132333, 37.909181);
                map.setCenter(latlng);
                var marker = new google.maps.Marker({
                    position: latlng,
                });
                marker.setMap(map);
            });
            $('.ukraine').on('click',function(e){
                e.preventDefault();
                var latlng = new google.maps.LatLng(50.450100, 30.523400);
                map.setCenter(latlng);
                var marker = new google.maps.Marker({
                    position: latlng,
                });
                marker.setMap(map);
            });
            $('.lithuania').on('click',function(e){
                e.preventDefault();
                var latlng = new google.maps.LatLng(54.6744334, 25.28193740000006);
                map.setCenter(latlng);
                var marker = new google.maps.Marker({
                    position: latlng,
                });
                marker.setMap(map);
            });

        };

        google.maps.event.addDomListener(window, 'resize', initialize);
        google.maps.event.addDomListener(window, 'load', initialize);


    });
})(window.jQuery);
