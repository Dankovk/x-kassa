(function ($) {
    "use strict";


    // Closure vars
    // ------------

    var pluginName     = 'popelValidator';
    var pluginDefaults = {
        // Should submit buttons be disabled until validation passes
        disableSubmits: true,

        // Submit button selector for the disableSubmits option
        submitSelector: ':submit',

        // This class (if any) is added to the disabled submit buttons
        disabledClass: 'disabled',


        // This is the selector for the controls that should be validated
        controlSelector: 'input,textarea,select',

        // Ignore these controls
        ignoredControlSelector: 'button,input[type="button"],input[type="submit"],input[type="reset"]',

        // If true, unchanged controls will not be re-validated
        checkSavedState: true,


        // Control group selector
        controlGroupSelector: '.form-group',

        // Validation in progress
        validatingClass: 'validating',

        // Validation failed
        errorClass: 'has-error',

        // Validation passed
        okClass: 'has-success',

        // Control read-only (while validating)
        readonlyClass: 'readonly',


        // Control message element selector
        messageSelector: '.help-block',

        // Control message text element selector
        messageTextSelector: '.help-block',

        // Control message template
        messageTemplate: '<p class="help-block"></p>',

        // Message inject element selector
        messageInjectElement: '.form-control',

        // Message inject method (called on message inject element)
        messageInjectMethod:  'after',


        // Delay before keyup event triggers control validation
        keyupTimeout: 500
    };

    // A simple Object.create polyfill
    var _object_create = Object.create || function (obj) {
        function Empty() {};
        Empty.prototype = obj;

        return new Empty();
    };


    // Validator class
    // --------------

    var Validator = function (element, options) {
        // Add data-toggle attribute in case we initialized this validator manually
        this.$element = $(element).attr('data-toggle', 'popel-validator');

        // Use correct global values in case they are changed at runtime and local values are not set
        this.options  = $.extend(_object_create(pluginDefaults), options);
        this.rules    = _object_create(Validator.rules);
        this.messages = _object_create(Validator.messages);
    };


    // Class properties
    // ----------------

    Validator.STATE_NONE       = 0; // This is the initial state
    Validator.STATE_INVALID    = 1;
    Validator.STATE_VALIDATING = 2;
    Validator.STATE_VALID      = 3;

    Validator.rules    = {};
    Validator.messages = {};


    // Class static methods
    // --------------------

    Validator.camelCase = function (str) {
        // This is a direct port from the awesome Mootools framework
        // See: https://github.com/mootools/mootools-core/blob/1.5.1/Source/Types/String.js#L37
        return String(str).replace(/-\D/g, function (match) {
            return match.charAt(1).toUpperCase();
        });
    };


    // Class methods
    // -------------

    Validator.prototype.validate = function () {
        var deferred  = $.Deferred(),
            validator = this,
            promises  = [];

        // Trigger validate event (cancellable)
        var event = $.Event('validate.popel.validator');
        this.$element.trigger(event);

        // If the event has been cancelled, return a rejected promise
        if (event.isDefaultPrevented()) return deferred.rejectWith(this).promise();

        // Disable submit buttons
        if (this.options.disableSubmits) {
            this.$element.find(this.options.submitSelector)
                .prop('disabled', true)
                .addClass(this.options.disabledClass || '');
        }

        // Find and validate all controls
        this.$element.find(this.options.controlSelector).each(function () {
            promises.push(validator.validateControl(this));
        });

        // Protect our promise from outside resolvement/rejection
        var promise = deferred.promise();

        $.when.apply($, promises)
            .done(function () {
                // Re-enable submit buttons
                if (validator.options.disableSubmits) {
                    validator.$element.find(validator.options.submitSelector)
                        .prop('disabled', false)
                        .removeClass(validator.options.disabledClass || '');
                }

                // Resolve our promise
                deferred.resolveWith(validator);

                // Trigger validated event (notificating)
                var event = $.Event('validated.popel.validator', {
                    state:   Validator.STATE_VALID,
                    promise: promise
                });

                validator.$element.trigger(event);
            })
            .fail(function () {
                // Reject our promise
                deferred.rejectWith(validator);

                // Trigger validated event (notificating)
                var event = $.Event('validated.popel.validator', {
                    state:   Validator.STATE_INVALID,
                    promise: promise
                });

                validator.$element.trigger(event);
            });

        // Return protected promise
        return promise;
    };

    Validator.prototype.reset = function () {
        // Reset submit buttons
        if (this.options.disableSubmits) {
            this.$element.find(this.options.submitSelector)
                .prop('disabled', false)
                .removeClass(this.options.disabledClass || '');
        }

        // Trigger reset event (cancellable)
        var event = $.Event('reset.popel.validator');
        this.$element.trigger(event);

        if (event.isDefaultPrevented()) return this;

        var validator = this;

        this.$element.find(this.options.controlSelector).each(function () {
            validator.resetControlMessage(this);
            validator.resetControlState(this);
        });

        return this;
    };

    Validator.prototype.update = function () {
        var $controls = this.$element.find(this.options.controlSelector),
            state     = Validator.STATE_VALID,
            $control, saved, value, empty, rules, ruleName, rule;

        for (var i = 0, il = $controls.length; i < il; i++) {
            $control = $controls.eq(i);

            if (!this.isValidControl($control)) continue;

            // Use saved state if any
            saved = this.getControlState($control);

            if (saved == Validator.STATE_VALID) continue;
            else if (saved == Validator.STATE_VALIDATING || saved == Validator.STATE_INVALID) {
                state = state > saved ? saved : state;
                break;
            }

            // Detect state
            value = this.getControlValue($control);
            empty = !this.rules.notEmpty(value);

            if (!empty) {
                // Non-empty controls with valid rules are required to validate
                state = state > Validator.STATE_VALIDATING ? Validator.STATE_VALIDATING : state;
                break;
            }

            rules = $control.data('rules').split(' ');

            for (var j = 0, jl = rules.length; j < jl; j++) {
                ruleName = Validator.camelCase(rules[j]);
                rule     = this.rules[ruleName];

                if (!rule || !rule.emptyRule) continue;

                state = state > Validator.STATE_VALIDATING ? Validator.STATE_VALIDATING : state;
                break;
            }

            if (state < Validator.STATE_VALID) break;
        }

        // Re-enable submit buttons
        if (this.options.disableSubmits) {
            this.$element.find(this.options.submitSelector)
                .prop('disabled', state < Validator.STATE_VALID)
                [(state < Validator.STATE_VALID ? 'add' : 'remove') + 'Class'](this.options.disabledClass || '');
        }
    };

    Validator.prototype.isValidControl = function (control) {
        var $control = $(control);

        // Check if control part of this form
        if (this.$element.has($control[0]).length == 0) return false;

        // Skip controls with no rules
        if (!$control.data('rules')) return false;

        // Skip ignored controls
        var ignored = this.options.ignoredControlSelector;

        if (ignored && $control.is(ignored)) return false;

        return true;
    };

    Validator.prototype.validateControl = function (control) {
        var $control  = $(control),
            deferred  = $.Deferred(),
            validator = this,
            promises  = [];

        if (!this.isValidControl($control)) return deferred.resolveWith(this).promise();

        // Trigger controlvalidate event (cancellable)
        var event = $.Event('controlvalidate.popel.validator');
        $control.trigger(event);

        // If the event has been cancelled, return a rejected promise
        if (event.isDefaultPrevented()) return deferred.rejectWith(this).promise();

        var value = this.getControlValue($control);

        // Check if control state changed since last validation
        if (this.options.checkSavedState) {
            var cache = $control.data('popel.validator.cache');

            if (cache && cache.value == value) return cache.promise;
        }

        // Set control state to validating
        this.setControlState($control, Validator.STATE_VALIDATING);

        // Iterate rules and apply each one
        var rules  = $control.data('rules').split(' '),
            empty  = !this.rules.notEmpty(value),
            params = [value, $control[0], this.$element[0], this];

        $.each(rules, function (i, name) {
            var rule = validator.rules[Validator.camelCase(name)];

            // Ignore undefined rules and non-empty rules for empty controls
            if (!rule || (empty && !rule.emptyRule)) return;

            var promise = $.Deferred(),
                result  = rule.apply($control[0], params);

            if (result.done && result.fail) {
                result.done(function () {
                    promise.resolve();
                });
                result.fail(function () {
                    promise.reject(validator.getRuleMessage(name));
                });
            } else if (!result) {
                promise.reject(validator.getRuleMessage(name));
            } else promise.resolve();

            promises.push(promise);
        });

        // Protect our promise from outside resolvement/rejection
        var promise = deferred.promise();

        $.when.apply($, promises)
            .done(function () {
                validator.resetControlMessage($control);

                validator.setControlState($control, Validator.STATE_VALID);
                $control.data('popel.validator.cache', {
                    value:   value,
                    promise: promise
                });

                // Resolve our promise
                deferred.resolveWith(validator);

                // Trigger validated event (notificating)
                var event = $.Event('controlvalidated.popel.validator', {
                    state:   Validator.STATE_VALID,
                    promise: promise
                });

                $control.trigger(event);
            })
            .fail(function (message) {
                validator.resetControlMessage($control);

                validator.setControlState($control, Validator.STATE_INVALID);
                $control.data('popel.validator.cache', {
                    value:   value,
                    promise: promise
                });

                validator.setControlMessage($control, message);

                // Reject our promise
                deferred.rejectWith(validator, [message]);

                // Trigger validated event (notificating)
                var event = $.Event('controlvalidated.popel.validator', {
                    state:   Validator.STATE_INVALID,
                    promise: promise
                });

                $control.trigger(event);
            });

        // Return protected promise
        return promise;
    };

    Validator.prototype.getControlValue = function (control) {
        var $control = $(control);

        // TODO: add support for checkboxes and radiobuttons

        return $control.val();
    };

    Validator.prototype.getControlState = function (control) {
        var $control = $(control),
            state    = $control.data('popel.validator.state');

        return state || Validator.STATE_NONE;
    };

    Validator.prototype.setControlState = function (control, state) {
        var className;

        // Check state value
        switch (state) {
            case Validator.STATE_VALIDATING: {
                className = this.options.validatingClass;
            } break;

            case Validator.STATE_INVALID: {
                className = this.options.errorClass;
            } break;

            case Validator.STATE_VALID: {
                className = this.options.okClass;
            } break;

            default: {
                // Unsupported control state
                return this;
            } break;
        }

        var $control = $(control),
            selector = this.options.controlGroupSelector || false,
            $group   = selector ? $control.closest(selector) : $control;

        // Clear all classes from the group
        $group.removeClass([
            this.options.validatingClass,
            this.options.errorClass,
            this.options.okClass
        ].join(' '));

        // Set group class
        $group.addClass(className);

        // Update control readonly state
        $control.prop('readonly', state === Validator.STATE_VALIDATING);

        // Switch readonly class on control
        if (this.options.readonlyClass) {
            var method = (state === Validator.STATE_VALIDATING ? 'add' : 'remove') + 'Class';
            $control[method](this.options.readonlyClass);
        }

        // Save control state
        $control.data('popel.validator.state', state);

        return this;
    };

    Validator.prototype.resetControlState = function (control) {
        var $control = $(control),
            selector = this.options.controlGroupSelector || false,
            $group   = selector ? $control.closest(selector) : $control;

        // Clear all classes from the group
        $group.removeClass([
            this.options.validatingClass,
            this.options.errorClass,
            this.options.okClass
        ].join(' '));

        // Reset control readonly state
        $control.prop('readonly', false);

        // Remove readonly class from control
        if (this.options.readonlyClass) {
            $control.removeClass(this.options.readonlyClass);
        }

        // Remove control state
        $control.removeData('popel.validator.state');

        return this;
    };

    Validator.prototype.setControlMessage = function (control, message) {
        var $control = $(control),
            data     = $control.data();

        // Set replaceable params
        var params = {
            value: this.getControlValue($control),
            name:  $control.data('name') || $control.attr('name'),
            // Actual control label is searched for below
            label: $control.data('caption')
        };

        $.each(data, function (prop, val) {
            if (typeof val == 'string' || typeof val == 'number'
              || typeof val == 'boolean' || val === null) {
                params[Validator.camelCase('data-' + prop)] = val;
            }
        });

        if (!params.label) {
            // Set label from the actual label
            var id = $control.attr('id'),
                $label;

            // Find label by id
            if (id) {
                $label = $('label[for="' + id + '"]');
            }

            // Find parent label
            if (!$label || $label.length === 0) {
                $label = $control.closest('label');
            }

            if ($label && $label.length > 0) {
                params.label = $label.data('caption') || $label.text();
            } else {
                // Fallback to field name
                params.label = params.name;
            }
        }

        // Replace params in message text
        message = message.replace(/:([^\s]+)/g, function (match, name) {
            return params[name] || match;
        });

        // Render message element
        var $message = $(this.options.messageTemplate),
            selector;

        selector = this.options.messageTextSelector || this.options.messageSelector;

        if ($message.is(selector)) {
            $message.text(message);
        } else {
            $message.find(selector).text(message);
        }

        // Trigger set event (cancellable)
        var event = $.Event('setcontrolmessage.popel.validator', {
            relatedTarget: $message[0],
            message: message
        });

        $control.trigger(event);

        if (event.isDefaultPrevented()) return this;

        // Insert message into the document
        var element  = this.options.messageInjectElement || false,
            method   = this.options.messageInjectMethod  || false,
            $element = $control, // Default
            $group;

        if (element && !$control.is(element)) {
            if (this.options.controlGroupSelector) {
                $group = $control.closest(this.options.controlGroupSelector);

                if ($group.is(element)) {
                    $element = $group;
                } else {
                    $element = $group.find(element);
                }
            } else {
                $element = $control.find(element);
            }
        }

        if (!$element || $element.length === 0) {
            $element = $control;
        }

        if (!method || !$element[method]) {
            method = $control.is($element) ? 'after' : 'append';
        }

        $element[method]($message);

        return this;
    };

    Validator.prototype.resetControlMessage = function (control) {
        var $control = $(control),
            selector = this.options.controlGroupSelector || false,
            $group   = selector ? $control.closest(selector) : $control,
            $message = $group.find(this.options.messageSelector);

        // Trigger reset event (cancellable)
        var event = $.Event('resetcontrolmessage.popel.validator', {
            relatedTarget: $message[0]
        });

        $control.trigger(event);

        if (event.isDefaultPrevented()) return this;

        $message.remove();

        return this;
    };

    Validator.prototype.getRuleMessage = function (name) {
        var messages = this === Plugin ? Validator.messages : this.messages;

        return messages[Validator.camelCase(name)];
    };

    Validator.prototype.setRuleMessage = function (name, message) {
        if (typeof name == 'object') {
            var validator = this;

            $.each(name, function (n, m) {
                validator.setRuleMessage(n, m);
            });

            return;
        }

        if (typeof name != 'string' || typeof message != 'string') return;

        var messages = this === Plugin ? Validator.messages : this.messages;

        messages[Validator.camelCase(name)] = message;
    };

    Validator.prototype.addRule = function (name, rule) {
        if (typeof name == 'object') {
            var validator = this;

            $.each(name, function (prop, fn) {
                validator.addRule(prop, fn);
            });

            return;
        }

        if (typeof name != 'string' || typeof rule != 'function') return;

        var rules = this === Plugin ? Validator.rules : this.rules;

        rules[Validator.camelCase(name)] = rule;
    };


    // Plugin definition
    // -----------------

    var Plugin = function (option) {
        return this.each(function () {
            var $this   = $(this),
                data    = $this.data('popel.validator'),
                options = typeof option == 'object' && option;

            if (!data) {
                $this.data('popel.validator', (data = new Validator(this, options)));
            }

            if (typeof option == 'string') {
                data[option]();
            }
        });
    };

    Plugin.addRule = function (name, rule) {
        return Validator.prototype.addRule.call(Plugin, name, rule);
    };

    Plugin.setRuleMessage = function (name, message) {
        return Validator.prototype.setRuleMessage.call(Plugin, name, message);
    };

    $.fn[pluginName]             = Plugin;
    $.fn[pluginName].Constructor = Validator;
    $.fn[pluginName].defaults    = pluginDefaults;


    // Plugin rules
    // ------------

    Plugin.addRule({

        notEmpty: $.extend(function (value) {
            if (this.type == 'file' && this.files && this.files.length) return this.files.length > 0;
            if (value && value.length) return value.length > 0;
            return !!value;
        }, {
            emptyRule: true
        }),

        minLength: function (value, control) {
            var length = $(control).data('min-length');

            return value.length >= length;
        },

        maxLength: function (value, control) {
            var length = $(control).data('max-length');

            return value.length <= length;
        },

        email: function (value) {
            /**
             * Basic email pattern
             *
             * PCRE-compatible analogue: https://regex101.com/r/iR0uT9
             */
            var stringEmail = /^[^<>\(\)\[\]\\\.,;:\s@\"]+(?:[\+\.][^<>\(\)\[\]\\\.,;:\s@\"]+)*@(?:[a-z\-\d]+\.)+[a-z]{2,}$/i;
            return stringEmail.test(value);
        },

        password: function (value) {
            var groupDigits  = /[0-9]+/;    // One or more digits anywhere in given value
            var groupLetters = /[A-Za-z]+/; // One or more letter characters anywhere in given value
            return groupDigits.test(value) && groupLetters.test(value);
        },

        sameAs: function (value, control, form, validator) {
            var sameAs    = $(control).data('same-as'),
                $form     = $(form),
                $controls = $form.find(validator.options.controlSelector),
                $control, $other, name, ignored;

            for (var i = 0, il = $controls.length; i < il; i++) {
                $control = $controls.eq(i);

                ignored = validator.options.ignoredControlSelector;

                if (ignored && $control.is(ignored)) continue;

                name = $control.data('name') || $control.attr('name');

                if (name === sameAs) {
                    $other = $control;
                    break;
                }
            }

            if ($other.length < 1) return true; // Other control does not exist, skip this validation

            return validator.getControlValue($other) === value;
        }

    });


    // Plugin messages
    // ---------------

    Plugin.setRuleMessage({

        notEmpty:  'This field cannot be empty',
        minLength: 'This field must be at least :dataMinLength characters',
        maxLength: 'This field must not exceed :dataMaxLength characters',
        email:     'This email is invalid',
        password:  'This password is too weak',
        sameAs:    'Passwords do not match'

    });


    // Data-API
    // --------

    var _formSelector    = 'form[data-toggle="popel-validator"]',
        _controlSelector = _formSelector + ' input,textarea,select';

    /* Blur is triggered when control loses focus
     * change is triggerred when the value is autocompleted (among other things)
     */
    $(document).on('blur.popel.validator change.popel.validator', _controlSelector, function (event) {
        var $control = $(this),
            $form    = $control.closest(_formSelector);

        // Create validator instance if not created yet
        if (!$form.data('popel.validator')) {
            Plugin.call($form, $form.data());
        }

        $form.data('popel.validator').validateControl($control).always(function () {
            this.update();
        });
    });

    // Trigger delayed control validation on value change
    $(document).on('keyup.popel.validator', _controlSelector, function (event) {
        var $control = $(this),
            $form    = $control.closest(_formSelector),
            tid      = $control.data('popel.validator.timeout.keyup');

        // Clear any existing timeout by a previously stored id (see below)
        if (tid) {
            window.clearTimeout(tid);
        }

        // If tab pressed, blur event will soon follow
        if (event.which == 9) return true;

        // Create validator instance if not created yet
        if (!$form.data('popel.validator')) {
            Plugin.call($form, $form.data());
        }

        var validator = $form.data('popel.validator');

        // Schedule control check using timeout
        tid = window.setTimeout(function () {
            // Remove stored timeout id as the timeout has already triggered
            $control.removeData('popel.validator.timeout.keyup');

            validator.validateControl($control).always(function () {
                this.update();
            });
        }, validator.options.keyupTimeout);

        // Store timeout id for future use
        $control.data('popel.validator.timeout.keyup', tid);
    });

    // Trigger form validation on form submit
    $(document).on('submit.popel.validator', _formSelector, function (event) {
        var $form   = $(this),
            _submit = !event.isDefaultPrevented();

        if (!$form.data('popel.validator')) {
            Plugin.call($form, $form.data());
        }

        /* Since validation is async, we always cancel the form submit.
         * In case it wasn't cancelled by other handlers (event state was saved above),
         * we re-submit the form manually after the validation passes (see below)
         */
        event.preventDefault();

        $form.data('popel.validator').validate().done(function () {
            if (_submit) {
                $form[0].submit();
            }
        });
    });

})(window.jQuery);
