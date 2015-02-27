(function ($) {
    "use strict";

    // Closure vars
    // ------------

    var pluginName     = 'popelValidate';
    var pluginNs       = 'popel.validate';
    var pluginDefaults = {
        disabledClass: 'disabled',
        fieldSelector: 'input,textarea,select',
        ignoreSelector: 'button,input[type="button"],input[type="submit"],input[type="reset"]',
        checkSavedState: true
    };

    var _inheritFrom = Object.create || function (obj) {
        function Empty() {};
        Empty.prototype = obj;

        return new Empty();
    };


    // Class definition
    // ----------------

    var Validate = function (element, options) {
        this.$element = $(element);
        this.options  = $.extend({}, pluginDefaults, options);
        this.rules    = _inheritFrom(Validate.rules);
    };

    // Class properties
    // Validate.STATE_NONE    = 0;
    Validate.STATE_INVALID = 1;
    Validate.STATE_PROMISE = 2;
    Validate.STATE_VALID   = 3;

    Validate.rules = {};

    Validate.messages = {};

    // Class static methods
    Validate.camelCase = function (str) {
        return String(str).replace(/-\D/g, function (match) {
            return match.charAt(1).toUpperCase();
        });
    };

    // Class methods
    Validate.prototype.submit = function (event) {
        var state = this.check();

        if (!state || state < Validate.STATE_VALID) event.preventDefault();

        if (state === Validate.STATE_PROMISE) this.$element.one('validated.' + pluginNs, function (event) {
            if (event.validateState === Validate.STATE_VALID) this.submit();
        });
    };

    Validate.prototype.check = function () {
        // Trigger check event
        var event = $.Event('validate.' + pluginNs);
        this.$element.trigger(event);
        if (e.isDefaultPrevented()) return Validate.STATE_VALID; // Ignore validation

        // Disable submit buttons while validating
        this.$element.find(':submit')
            .prop('disabled', true)
            .addClass(this.options.disabledClass || '');

        // Check form fields
        var $fields  = this.$element.find(this.options.fieldSelector),
            state    = Validate.STATE_VALID,
            ignore   = this.options.ignoreSelector || false,
            promises = [];

        $fields.each(function () {
            var $field = $(this);

            // Check field
            var result = this.checkField($field, promises);

            // Result is false for ignored elements
            if (result === false) return;

            // Update form state
            if (result < state) state = result;
        });

        // Form validate callback
        var cb = function (state) {
            // Update submit buttons state
            this.$element.find(':submit')
                .prop('disabled', state === Validate.STATE_VALID)
                [(state === Validate.STATE_VALID ? 'remove' : 'add') + 'Class'](this.options.disabledClass || '');

            // Trigger validated event on the form
            this.$element.trigger($.Event('validated.' + pluginNs, {
                validateState: state
            }));
        };

        // Support async rules
        if (promises.length > 0) {
            var self = this;

            $.when.apply($, promises).done(function () {
                cb.call(self, Validate.STATE_VALID);
            }).fail(function () {
                cb.call(self, Validate.STATE_INVALID);
            });
        } else cb.call(this, state);

        return state;
    };

    Validate.prototype.checkField = function (field, promisesArray) {
        promisesArray = promisesArray || [];

        var $field = $(field);

        // Check if field part of this form
        if (this.$element.has($field[0]).length == 0) return false;

        // Skip ignored fields
        if (this.options.ignoreSelector && $field.is(this.options.ignoreSelector)) return false;

        var name  = $field.data('name') || $field.attr('name'),
            value = $field.val();

        // Check if field changed since last saved state
        if (this.options.checkSavedState) {
            var savedState = this.getFieldState(name);

            if (savedState && savedState.value && savedState.value == value) {
                return savedState.state;
            }
        }

        // Iterate rules and apply each one
        var rules    = $field.data('rules').split(' '),
            state    = Validate.STATE_VALID,
            params   = [value, this.$element[0], this],
            promises = [],
            self     = this,
            rule, ruleName, result, promise;

        for (var i = 0, l = rules.length; i < l; i++) {
            ruleName = Validate.camelCase(rules[i]);
            rule     = this.rules[ruleName];

            // Ignore undefined rules and non-empty rules for empty fields
            if (!rule || (!rule.emptyRule && !this.rules.notEmpty(value))) continue;

            result = rule.apply($field[0], params);

            if (rule.asyncRule) {
                promise = result;
                result  = Validate.STATE_PROMISE;

                promises.push(promise);
            }

            // Convert boolean result to a valid state value
            if (typeof result == 'boolean') result = result ? Validate.STATE_VALID : Validate.STATE_INVALID;

            // Stop further validation on validation error
            if (result === Validate.STATE_INVALID) {
                this.triggerFieldError($field, this.getMessage(ruleName));
                break;
            }

            // Update field state
            if (result < state) state = result;
        }

        if (promises.length > 0 && promisesArray.push) promisesArray.push($.when.apply($, promises));

        // Set field state
        this.setFieldState(name, {
            value: value,
            state: state
        });

        return state;
    };

    Validate.prototype.addRule = function (name, oncheck) {
        if (typeof name == 'object') {
            var self = this;
            $.each(name, function (prop, fn) {
                self.addRule(prop, fn);
            });
            return;
        }

        if (typeof name != 'string' || typeof oncheck != 'function') return;

        this.rules[Validate.camelCase(name)] = oncheck;
    };

    Validate.prototype.addAsyncRule = function (name, oncheck, onresolve) {};

    Validate.prototype.setMessage = function (name, message) {};


    // Plugin definition
    // -----------------

    var Plugin = function (option) {
        return this.each(function () {
            var $this   = $(this),
                data    = $this.data(pluginNs),
                options = typeof option == 'object' && option;

            if (!data) $this.data(pluginNs, (data = new Validate(this, options)));
            if (typeof option == 'string') data[option]();
        });
    };

    Plugin.addRule = function (name, oncheck) {
        if (typeof name == 'object') {
            $.each(name, function (prop, fn) {
                Plugin.addRule(prop, fn);
            });
            return;
        }

        if (typeof name != 'string' || typeof oncheck != 'function') return;

        Validate.rules[Validate.camelCase(name)] = oncheck;
    };

    Plugin.addAsyncRule = function (name, oncheck, onresolve) {

    };

    Plugin.setMessage = function (name, message) {
        if (typeof name == 'object') {
            $.each(name, function (prop, msg) {
                Plugin.setMessage(prop, msg);
            });
            return;
        }

        if (typeof name != 'string' || typeof message != 'function') return;

        Validate.messages[Validate.camelCase(name)] = message;
    };

    $.fn[pluginName]             = Plugin;
    $.fn[pluginName].Constructor = Validate;
    $.fn[pluginName].defaults    = pluginDefaults;

    // Plugin rules
    Plugin.addRule({

        notEmpty: $.extend(function (value) {
            if (this.type == 'file' && this.files && this.files.length) return this.files.length > 0;
            if (value && value.length) return value.length > 0;
            return !!value;
        }, {
            emptyRule: true
        })

    });


    // Data-API
    // --------

    $(document).on('ready.' + pluginNs + '.data-api', function () {
        $('form[data-toggle="' + pluginNs + '"]').each(function () {
            var $this = $(this);
            Plugin.call($this, $this.data());
        });
    });

    $(document).on('submit.' + pluginNs, 'form[data-toggle="' + pluginNs + '"]', function (event) {
        var $this = $(this),
            data  = $this.data(pluginNs);

        data.submit(event);
    });

})(window.jQuery);
