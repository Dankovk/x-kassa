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


})(window.jQuery);
