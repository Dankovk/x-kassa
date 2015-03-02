(function ($) {
    "use strict";

    // Closure vars
    // ------------

    var pluginName     = 'popelValidate';
    var pluginNs       = 'popel.validate';
    var pluginDefaults = {
        disabledClass: 'disabled', // Submit buttons are disabled while validating and for invalid forms

        // Control container classes
        okClass:      'has-success', // Validation successful
        errorClass:   'has-error',   // Validation failed
        promiseClass: 'validating',  // Validation in progress

        readonlyClass: 'readonly', // Control read-only (while validating)

        containerSelector: '.form-group', // Control container selector
        controlSelector:   'input,textarea,select', // Valid control selector
        ignoreSelector:    'button,input[type="button"],input[type="submit"],input[type="reset"]', // Ignored control selector
        checkSavedState:   true, // If true, controls are not re-validated if their value hasn't changed

        errorTemplate:      '<p class="help-block error-text"></p>', // Control error template
        errorSelector:      '.error-text', // Error element selector
        errorTextSelector:  '.help-block', // Error text selector
        errorInjectElement: '.form-control', // Error inject element selector
        errorInjectMethod:  'after' // Error inject method (called on error inject element)
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
        this.messages = _inheritFrom(Validate.messages);
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
        if (event.isDefaultPrevented()) return Validate.STATE_VALID; // Ignore validation

        // Disable submit buttons while validating
        this.$element.find(':submit')
            .prop('disabled', true)
            .addClass(this.options.disabledClass || '');

        // Check form fields
        var $fields  = this.$element.find(this.options.controlSelector),
            state    = Validate.STATE_VALID,
            ignore   = this.options.ignoreSelector || false,
            promises = [],
            self     = this;

        $fields.each(function () {
            var $field = $(this);

            // Check field
            var result = self.checkField($field, promises);

            // Result is false for ignored elements
            if (result === false) return;

            // Update form state
            if (result < state) state = result;
        });

        // Form validate callback
        var cb = function (state) {
            // Update submit buttons state
            self.$element.find(':submit')
                .prop('disabled', state === Validate.STATE_VALID)
                [(state === Validate.STATE_VALID ? 'remove' : 'add') + 'Class'](self.options.disabledClass || '');

            // Trigger validated event on the form
            self.$element.trigger($.Event('validated.' + pluginNs, {
                validateState: state
            }));
        };

        // Support async rules
        if (promises.length > 0) {
            $.when.apply($, promises).done(function () {
                cb.call(self, Validate.STATE_VALID);
            }).fail(function () {
                cb.call(self, Validate.STATE_INVALID);
            });
        } else cb.call(this, state);

        return state;
    };

    Validate.prototype.reset = function () {
        // Reset submit buttons
        this.$element.find(':submit')
            .prop('disabled', false)
            .removeClass(this.options.disabledClass || '');

        var $fields = this.$element.find(this.options.controlSelector),
            self    = this;

        $fields.each(function () {
            self.resetField(this);
        });
    };

    Validate.prototype.checkField = function (field, promisesArray) {
        promisesArray = promisesArray || [];

        var $field = $(field);

        // Check if field part of this form
        if (this.$element.has($field[0]).length == 0) return false;

        // Skip ignored fields
        if (this.options.ignoreSelector && $field.is(this.options.ignoreSelector)) return false;

        var value = $field.val();

        // Check if field changed since last saved state
        if (this.options.checkSavedState) {
            var savedState = this.getFieldState($field);

            if (savedState && savedState.value == value) {
                return savedState.state;
            }
        }

        // Iterate rules and apply each one
        var rules    = $field.data('rules').split(' '),
            state    = Validate.STATE_VALID,
            params   = [value, $field[0], this],
            promises = [],
            self     = this,
            rule, ruleName, result, promise, err;

        for (var i = 0, l = rules.length; i < l; i++) {
            ruleName = Validate.camelCase(rules[i]);
            rule     = this.rules[ruleName];

            // Ignore undefined rules and non-empty rules for empty fields
            if (!rule || (!rule.emptyRule && !this.rules.notEmpty(value))) continue;

            result = rule.apply($field[0], params);

            if (rule.asyncRule) {
                promise = result;
                result  = Validate.STATE_PROMISE;

                (function (ruleName, value) {
                    promise.done(function () {
                        self.resetFieldError($field);
                        self.setFieldState($field, {
                            value: value,
                            state: Validate.STATE_VALID
                        });
                    }).fail(function () {
                        self.setFieldError($field, self.getMessage(ruleName));
                        self.setFieldState($field, {
                            value: value,
                            state: Validate.STATE_INVALID
                        });
                    });
                })(ruleName, value);

                promises.push(promise);
            }

            // Convert boolean result to a valid state value
            if (typeof result == 'boolean') result = result ? Validate.STATE_VALID : Validate.STATE_INVALID;

            // Update field state
            if (result < state) state = result;

            // Stop further validation on validation error
            if (result === Validate.STATE_INVALID) {
                err = this.getMessage(ruleName);
                break;
            }
        }

        if (promises.length > 0 && promisesArray.push) promisesArray.push($.when.apply($, promises));

        this.resetFieldError($field);

        // Show error message on error
        if (state === Validate.STATE_INVALID) this.setFieldError($field, err);

        // Set field state
        this.setFieldState($field, {
            value: value,
            state: state
        });

        return state;
    };

    Validate.prototype.resetField = function (field) {
        var $field = $(field);

        // Check if field part of this form
        if (this.$element.has($field[0]).length == 0) return false;

        // Skip ignored fields
        if (this.options.ignoreSelector && $field.is(this.options.ignoreSelector)) return false;

        this.resetFieldError($field);
        this.resetFieldState($field);
    };

    Validate.prototype.setFieldError = function (field, message) {
        var $field = $(field),
            data   = $field.data();

        // Set replaceable params
        var params = {
            value: $field.val(),
            name:  $field.data('name') || $field.attr('name'),
            label: $field.data('caption')
        };

        $.each(data, function (prop, val) {
            if (typeof val == 'string'
                || typeof val == 'number'
                || typeof val == 'boolean'
                || val === null) params[Validate.camelCase('data-' + prop)] = val;
        });

        if (!params.label) {
            // Set label from the actual label
            var id = $field.attr('id'),
                $label;

            // Find label by id
            if (id) $label = $('label[for="' + id + '"]');

            // Find parent label
            if ($label.length === 0) $label = $field.closest('label');

            if ($label.length > 0) params.label = $label.data('caption') || $label.text();
            // Fall back to field name
            else params.label = name;
        }

        // Replace params in message text
        message = message.replace(/:([^\s]+)/g, function(match, name) {
            return params[name] || match;
        });

        // Render error message element
        var $error = $(this.options.errorTemplate),
            msgSel = this.options.errorTextSelector || this.options.errorSelector;

        if ($error.is(msgSel)) $error.text(message);
        else $error.find(msgSel).text(message);

        // Insert error message inside the DOM
        var $container      = $field.closest(this.options.containerSelector),
            method          = this.options.errorInjectMethod,
            $errorContainer = $container;

        if (this.options.errorInjectElement) {
            // Find error container
            $errorContainer = $container.find(this.options.errorInjectElement);
        }

        if (!method) {
            method = this.options.errorInjectElement ? 'after' : 'append';
        }

        $errorContainer[method]($error);
    };

    Validate.prototype.resetFieldError = function (field) {
        var $field     = $(field),
            $container = $field.closest(this.options.containerSelector),
            $error     = $container.find(this.options.errorSelector);

        $error.remove();
    };

    Validate.prototype.setFieldState = function (field, state) {
        var $field     = $(field),
            name       = $field.data('name') || $field.attr('name'),
            $container = $field.closest(this.options.containerSelector);

        this.savedState = this.savedState || {};
        this.savedState[name] = state;

        // Clear all classes from the container
        $container.removeClass([
            this.options.errorClass, this.options.okClass, this.options.promiseClass
        ].join(' '));

        // Set container state
        if (state.state === Validate.STATE_INVALID) $container.addClass(this.options.errorClass);
        else if (state.state === Validate.STATE_VALID) $container.addClass(this.options.okClass);
        else if (state.state === Validate.STATE_PROMISE) $container.addClass(this.options.promiseClass);

        // Set control readonly state
        $field.prop('readonly', state.state === Validate.STATE_PROMISE);
        $field[(state.state === Validate.STATE_PROMISE ? 'add' : 'remove') + 'Class'](this.options.readonlyClass);
    };

    Validate.prototype.getFieldState = function (field) {
        var $field = $(field),
            name   = $field.data('name') || $field.attr('name'),
            state  = this.savedState || {};

        return state[name];
    };

    Validate.prototype.resetFieldState = function (field) {
        if (!this.savedState) return;

        var $field = $(field),
            name   = $field.data('name') || $field.attr('name');

        delete this.savedState[name];

        // Clear all classes from the container
        $container.removeClass([
            this.options.errorClass, this.options.okClass, this.options.promiseClass
        ].join(' '));

        // Clear control readonly state
        $field.prop('readonly', false).removeClass(this.options.readonlyClass);
    };

    Validate.prototype.getMessage = function (name) {
        return this.messages[Validate.camelCase(name)];
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

        var _rules = this === Plugin ? Validate.rules : this.rules;

        _rules[Validate.camelCase(name)] = oncheck;
    };

    Validate.prototype.addAsyncRule = function (name, oncheck, onresolve) {
        // Ignore invalid rules
        if (typeof name != 'string' || typeof oncheck != 'function') return;

        // Create promise wrapper with onresolve callback support
        var rule = $.extend(function () {
            // Get rule arguments dynamicly
            var args    = Array.prototype.slice.call(arguments, 0),
                promise = $.Deferred(),
                inner   = oncheck.apply(this, args),
                self    = this;

            // If inner promise fails, fail outer promise
            inner.fail(function () {
                promise.reject();
            });

            inner.done(function () {
                var state = true,
                    args  = Array.prototype.slice.call(arguments, 0);

                // If custom onresolve callback exists, use it now
                if (onresolve) state = onresolve.apply(self, args);

                promise[state !== true ? 'reject' : 'resolve']();
            });

            return promise;
        }, {
            asyncRule: true
        });

        this.addRule(name, rule);
    };

    Validate.prototype.setMessage = function (name, message) {
        if (typeof name == 'object') {
            var self = this;
            $.each(name, function (prop, msg) {
                self.setMessage(prop, msg);
            });
            return;
        }

        if (typeof name != 'string' || typeof message != 'string') return;

        var _messages = this === Plugin ? Validate.messages : this.messages;

        _messages[Validate.camelCase(name)] = message;
    };


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
        return Validate.prototype.addRule.call(Plugin, name, oncheck);
    };

    Plugin.addAsyncRule = function (name, oncheck, onresolve) {
        return Validate.prototype.addAsyncRule.call(Plugin, name, oncheck, onresolve);
    };

    Plugin.setMessage = function (name, message) {
        return Validate.prototype.setMessage.call(Plugin, name, message);
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
        }),

        minLength: function (value, field) {
            var length = $(field).data('min-length');

            return value.length >= length;
        },

        maxLength: function (value, field) {
            var length = $(field).data('max-length');

            return value.length <= length;
        }

    });

    // Plugin messages
    Plugin.setMessage({

        notEmpty:  'This field cannot be empty',
        minLength: 'This field must be at least :dataMinLength characters',
        maxLength: 'This field must not exceed :dataMaxLength characters'

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
