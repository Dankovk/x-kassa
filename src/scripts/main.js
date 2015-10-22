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



    $('#how-it-tab a').click(function (e) {
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

})(window.jQuery);
