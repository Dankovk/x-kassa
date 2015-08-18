(function ($, undefined) {
    "use strict";


    // Measure function
    // ----------------

    var measureScroll = function () {
        var scrollDiv = document.createElement('div'),
            $body     = $(document.body);

        scrollDiv.className = 'scrollbar-measure';

        $body.append(scrollDiv);
        var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
        $body[0].removeChild(scrollDiv);

        return scrollbarWidth;
    };


    // Plugin function
    // ---------------

    $.measureScroll = measureScroll;


    // Event handlers
    // --------------

    $(document).on('show.bs.modal', '.modal', function (event) {
        var scrollSize      = measureScroll(),
            fullWindowWidth = window.innerWidth;

        if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
            var documentElementRect = document.documentElement.getBoundingClientRect();
            fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left);
        }

        var bodyOverflowing = document.body.clientWidth < fullWindowWidth;

        if (bodyOverflowing) {
            // Add padding to fixed navbars and custom fixed elements
            $('.navbar-fixed-top, .navbar-fixed-bottom, [data-adapt-to="modal"]').each(function () {
                var $this   = $(this),
                    initial = parseInt(($this.css('padding-right') || 0), 10);

                $this.data('popel.measurescroll.initialPadding', this.style.paddingRight || '');
                $this.css('padding-right', initial + scrollSize);
            });
        }

        // Trigger event for custom use cases
        var e = $.Event('modalshow.popel.measurescroll', {
            scrollSize: scrollSize,
            bodyOverflowing: bodyOverflowing
        });

        $(this).trigger(e);
    });

    $(document).on('hidden.bs.modal', '.modal', function () {

        // Handle fixed navbars
        $('.navbar-fixed-top, .navbar-fixed-bottom, [data-adapt-to="modal"]').each(function () {
            var $this = $(this);

            var initial = $this.data('popel.measurescroll.initialPadding');

            if (initial !== undefined) {
                $this.css('padding-right', initial);
                $this.removeData('popel.measurescroll.initialPadding');
            }
        });

        // Trigger event for custom use cases
        $(this).trigger('modalhidden.popel.measurescroll');
    });

})(window.jQuery);
