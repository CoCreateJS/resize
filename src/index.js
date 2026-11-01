// "use strict";
import observer from "@cocreate/observer";
import "./index.css";

const EVENTS = [
    "mousemove touchmove",
    "mousedown touchstart",
    "mouseup touchend"
];
const DIRECTIONS = ["left", "right", "top", "bottom"];

const styleEl = document.createElement("style");
styleEl.setAttribute("component", "resize");
document.head.appendChild(styleEl);
const styleSheet = styleEl.sheet;

const coCreateResize = {
    /**
     * CSS selector used by init() to find resizable elements.
 * @public
 * @environment client
     * @type {string}
 */
    selector: "", //'.resize',
    /**
     * Elements matched by the current selector.
 * @public
 * @environment client
     * @type {NodeList<Element>}
 */
    resizers: [],
    /**
     * Resize controller instances created for matching elements.
 * @public
 * @environment client
     * @type {CoCreateResize[]}
 */
    resizeWidgets: [],

    /**
     * Initializes resize controllers for elements matching handleObj.selector.
     *
 * @public
 * @environment client
     * @param {Object} handleObj - Selector and resize-handle selectors.
 */
    init: function (handleObj) {
        for (var handleKey in handleObj)
            if (handleObj.hasOwnProperty(handleKey) && handleKey == "selector")
                this.selector = handleObj[handleKey];

        this.resizers = document.querySelectorAll(this.selector);
        var _this = this;
        this.resizers.forEach(function (resize, idx) {
            let resizeWidget = new CoCreateResize(resize, handleObj);
            _this.resizeWidgets[idx] = resizeWidget;
        });
    },

    /**
     * Initializes a resize controller for one element using the default handle selectors.
     *
 * @public
 * @environment client
     * @param {Element} target - Element to make resizable.
 */
    initElement: function (target) {
        let resizeWidget = new CoCreateResize(target, {
            dragLeft: "[resize='left']",
            dragRight: "[resize='right']",
            dragTop: "[resize='top']",
            dragBottom: "[resize='bottom']"
        });
        this.resizeWidgets[0] = resizeWidget;
    }
};

function CoCreateResize(resizer, options) {
    this.resizeWidget = resizer;
    this.cornerSize = 10;
    this.init(options);
}

CoCreateResize.prototype = {
    init: function (handleObj) {
        if (this.resizeWidget) {
            this.initDrags = [];
            this.checkCorners = [];
            this.doDrags = [];
            this.Drags = [];

            //this is for grid
            this.isGrid = this.detectGrid();
            this.gridWidth = 0;
            this.gridHeight = 0;
            this.limitSpan = 0;
            this.widthSpan = 0;
            this.heightSpan = 0;
            this.originClassAttribute = this.resizeWidget.getAttribute("class");

            DIRECTIONS.map((d) => {
                this.Drags[d] = this.resizeWidget.querySelector(
                    handleObj["drag" + d.charAt(0).toUpperCase() + d.slice(1)]
                );
            });

            this.bindListeners();
            this.initResize();

            //this is just for grid system
            this.getGridProperty();
            window.addEventListener("resize", this.checkGridColumns.bind(this));
        }
    },

    getGridProperty: function () {
        if (!this.resizeWidget.parentNode) return;
        let compStyles = window.getComputedStyle(this.resizeWidget.parentNode);
        let gridColumns = compStyles.gridTemplateColumns;
        let height = compStyles.gridAutoRows;

        if (gridColumns !== "none") {
            let width = gridColumns.split(" ");
            this.limitSpan = width.length;
            this.gridColumnGap = Number.parseInt(compStyles.gridColumnGap);
            this.gridRowGap = Number.parseInt(compStyles.gridRowGap);
            this.gridWidth = Number.parseFloat(width[0]);
            this.gridHeight = Number.parseInt(height);
        }
    },

    checkGridColumns: function () {
        if (
            typeof this.resizeWidget !== "undefined" &&
            this.resizeWidget.parentNode
        ) {
            let compStylesOfParent = window.getComputedStyle(
                this.resizeWidget.parentNode
            );
            let spans = 0;
            let gridColumns = compStylesOfParent.gridTemplateColumns.split(" ");
            let temp = gridColumns[0];
            gridColumns.map((v) => {
                if (v == temp) spans++;
            });
            this.limitSpan = spans;
            if (this.resizeWidget.style["grid-column-end"]) {
                let curClassAttributes = this.resizeWidget
                    .getAttribute("class")
                    .split(" ");
                let prevColumnState =
                    curClassAttributes[curClassAttributes.length - 1].split(
                        "_"
                    );
                let prevSpan = Number.parseInt(prevColumnState[1]);
                let curColumnState =
                    this.resizeWidget.style["grid-column-end"].split(" ");
                let curSpan = Number.parseInt(curColumnState[1]);

                let span = 0;
                if (this.limitSpan >= prevSpan) span = prevSpan;
                else if (prevSpan > this.limitSpan) span = this.limitSpan;
                else span = Math.min(curSpan, this.limitSpan);

                this.resizeWidget.style["grid-column-end"] = "span " + span;
            }
        }
    },

    initResize: function () {
        DIRECTIONS.map((d) => {
            if (this.Drags[d])
                this.addListenerMulti(
                    this.Drags[d],
                    EVENTS[0],
                    this.checkCorners[d]
                );
        });
    },

    checkDragImplementation: function (e, from, to, offset, fcur, scur) {
        if (e.touches) e = e.touches[0];
        let other;
        if (to == "top") other = "bottom";
        else if (to == "bottom") other = "top";
        else if (to == "left") other = "right";
        else if (to == "right") other = "left";
        this.removeListenerMulti(
            this.Drags[from],
            EVENTS[1],
            this.initDrags[from]
        );
        this.removeListenerMulti(
            this.Drags[from],
            EVENTS[1],
            this.initDrags[to]
        );
        this.removeListenerMulti(
            this.Drags[from],
            EVENTS[1],
            this.initDrags[other]
        );
        this.addListenerMulti(
            this.Drags[from],
            EVENTS[1],
            this.initDrags[from]
        );

        if (offset < this.cornerSize && this.Drags[to]) {
            this.Drags[from].style.cursor = fcur;
            this.addListenerMulti(
                this.Drags[from],
                EVENTS[1],
                this.initDrags[to]
            );
        } else {
            this.Drags[from].style.cursor = scur;
        }
    },

    initDrag: function (e, idx) {
        e.preventDefault();

        if (!this.resizeWidget.hasAttribute("resizing")) {
            this.resizeWidget.setAttribute("resizing", "");
        }

        let selector = document.defaultView.getComputedStyle(this.resizeWidget);
        styleSheet.insertRule("iframe {pointer-events: none}", 0);

        if (idx == "top" || idx == "bottom") {
            this.startTop = parseInt(selector.top, 10);
            this.startHeight = parseInt(selector.height, 10);

            if (e.touches) this.startY = e.touches[0].clientY;
            else this.startY = e.clientY;
        } else {
            this.startLeft = parseInt(selector.left, 10);
            this.startRight = parseInt(selector.right, 10);
            this.startWidth = parseInt(selector.width, 10);

            if (e.touches) this.startX = e.touches[0].clientX;
            else this.startX = e.clientX;
        }

        this.addListenerMulti(
            document.documentElement,
            EVENTS[0],
            this.doDrags[idx]
        );
        this.addListenerMulti(
            document.documentElement,
            EVENTS[2],
            this.stopDrag
        );
    },

    initTopDrag: function (e) {
        this.initDrag(e, "top");
    },
    initBottomDrag: function (e) {
        this.initDrag(e, "bottom");
    },
    initLeftDrag: function (e) {
        this.initDrag(e, "left");
    },
    initRightDrag: function (e) {
        this.initDrag(e, "right");
    },

    //this is just for grid system
    setRowEnd: function (height) {
        if (this.gridHeight) {
            this.heightSpan = Math.ceil(
                (height - (this.heightSpan - 1) * this.gridRowGap) /
                this.gridHeight
            );
            this.resizeWidget.style["grid-row-end"] = "span " + this.heightSpan;
            this.collaborate({ rowEnd: this.heightSpan });
        }
    },

    doTopDrag: function (e) {
        let top, height;

        if (e.touches) e = e.touches[0];
        top = this.startTop + e.clientY - this.startY;
        height = this.startHeight - e.clientY + this.startY;

        if (height < 10) return;
        if (!this.isGrid) {
            this.resizeWidget.style.top = top + "px";
            this.collaborate({ top, height });
        }
        this.resizeWidget.style.height = height + "px";
        this.setRowEnd(height);
    },

    doBottomDrag: function (e) {
        let height;

        if (e.touches) e = e.touches[0];

        height = this.startHeight + e.clientY - this.startY;

        if (height < 10) return;
        if (!this.isGrid) this.collaborate({ height });

        this.resizeWidget.style.height = height + "px";
        this.setRowEnd(height);
    },

    //this is just for grid system
    setColumnEnd: function (width) {
        if (this.gridWidth) {
            let spans = Math.ceil(
                (width - (this.widthSpan - 1) * this.gridColumnGap) /
                this.gridWidth
            );
            this.widthSpan = spans > this.limitSpan ? this.limitSpan : spans;
            this.resizeWidget.style["grid-column-end"] =
                "span " + this.widthSpan;
            this.collaborate({ columnEnd: this.widthSpan });
        }
    },

    doLeftDrag: function (e) {
        let left, right, width;
        if (e.touches) e = e.touches[0];
        left = this.startLeft + e.clientX - this.startX;
        right = this.startRight;
        width = this.startWidth - e.clientX + this.startX;

        if (width < 10) return;
        if (!this.isGrid) {
            this.resizeWidget.style.left = "";
            this.resizeWidget.style.right = right + "px";
            this.collaborate({ left, width });
        }

        this.resizeWidget.style.width = width + "px";
        this.setColumnEnd(width);
    },

    doRightDrag: function (e) {
        let width;
        if (e.touches) e = e.touches[0];
        width = this.startWidth + e.clientX - this.startX;
        if (width < 10) return;

        if (!this.isGrid) this.collaborate({ width });

        this.resizeWidget.style.width = width + "px";
        this.setColumnEnd(width);
    },

    detectGrid: function () {
        let isGrid = false;
        if (this.resizeWidget.parentNode) {
            let compStyles = window.getComputedStyle(
                this.resizeWidget.parentNode
            );
            isGrid = compStyles.display === "grid";
        }
        this.isGrid = isGrid;
        return isGrid;
    },

    stopDrag: function (e) {
        styleSheet.deleteRule(0);
        if (this.resizeWidget.hasAttribute("resizing")) {
            this.resizeWidget.removeAttribute("resizing", "");
        }

        //this is just for grid system
        if (this.detectGrid()) {
            this.resizeWidget.style.width = null;
            this.resizeWidget.style.height = null;
            this.resizeWidget.style.left = null;
            this.resizeWidget.style.top = null;

            if (this.widthSpan)
                this.resizeWidget.setAttribute(
                    "class",
                    this.originClassAttribute +
                    " grid-column-end:span_" +
                    this.widthSpan
                );
            if (this.heightSpan)
                this.resizeWidget.setAttribute(
                    "class",
                    this.originClassAttribute +
                    " grid-row-end:span_" +
                    this.heightSpan
                );

            this.collaborate({});
        }

        DIRECTIONS.map((d) => {
            this.removeListenerMulti(
                document.documentElement,
                EVENTS[0],
                this.doDrags[d]
            );
        });
        this.removeListenerMulti(
            document.documentElement,
            EVENTS[2],
            this.stopDrag
        );
    },
    checkLeftCorners: function (e) {
        let offset =
            e.clientY -
            this.getDistance(this.Drags["left"], true) +
            document.documentElement.scrollTop;
        if (offset > 10) {
            offset =
                this.getDistance(this.Drags["left"], true) +
                this.Drags["left"].clientHeight -
                e.clientY -
                document.documentElement.scrollTop;
            this.checkDragImplementation(
                e,
                "left",
                "bottom",
                offset,
                "ne-resize",
                "e-resize"
            );
        } else {
            this.checkDragImplementation(
                e,
                "left",
                "top",
                offset,
                "se-resize",
                "e-resize"
            );
        }
    },
    checkTopCorners: function (e) {
        let offset =
            e.clientX -
            this.getDistance(this.Drags["top"], false) +
            document.documentElement.scrollTop;
        if (offset > 10) {
            offset =
                this.getDistance(this.Drags["top"], false) +
                this.Drags["top"].clientWidth -
                e.clientX -
                document.documentElement.scrollLeft;
            this.checkDragImplementation(
                e,
                "top",
                "right",
                offset,
                "ne-resize",
                "s-resize"
            );
        } else {
            this.checkDragImplementation(
                e,
                "top",
                "left",
                offset,
                "se-resize",
                "s-resize"
            );
        }
    },
    checkBottomCorners: function (e) {
        let offset =
            e.clientX -
            this.getDistance(this.Drags["bottom"], false) +
            document.documentElement.scrollTop;
        if (offset > 10) {
            offset =
                this.getDistance(this.Drags["bottom"], false) +
                this.Drags["bottom"].clientWidth -
                e.clientX -
                document.documentElement.scrollLeft;
            this.checkDragImplementation(
                e,
                "bottom",
                "right",
                offset,
                "se-resize",
                "s-resize"
            );
        } else {
            this.checkDragImplementation(
                e,
                "bottom",
                "left",
                offset,
                "ne-resize",
                "s-resize"
            );
        }
    },
    checkRightCorners: function (e) {
        let offset =
            e.clientY -
            this.getDistance(this.Drags["right"], true) +
            document.documentElement.scrollTop;
        if (offset > 10) {
            offset =
                this.getDistance(this.Drags["right"], true) +
                this.Drags["right"].clientHeight -
                e.clientY -
                document.documentElement.scrollTop;
            this.checkDragImplementation(
                e,
                "right",
                "bottom",
                offset,
                "se-resize",
                "e-resize"
            );
        } else {
            this.checkDragImplementation(
                e,
                "right",
                "top",
                offset,
                "ne-resize",
                "e-resize"
            );
        }
    },

    bindListeners: function () {
        this.doDrags["left"] = this.doLeftDrag.bind(this);
        this.doDrags["top"] = this.doTopDrag.bind(this);
        this.doDrags["right"] = this.doRightDrag.bind(this);
        this.doDrags["bottom"] = this.doBottomDrag.bind(this);

        this.stopDrag = this.stopDrag.bind(this);

        this.checkCorners["left"] = this.checkLeftCorners.bind(this);
        this.checkCorners["top"] = this.checkTopCorners.bind(this);
        this.checkCorners["bottom"] = this.checkBottomCorners.bind(this);
        this.checkCorners["right"] = this.checkRightCorners.bind(this);

        this.initDrags["top"] = this.initTopDrag.bind(this);
        this.initDrags["left"] = this.initLeftDrag.bind(this);
        this.initDrags["bottom"] = this.initBottomDrag.bind(this);
        this.initDrags["right"] = this.initRightDrag.bind(this);
    },

    getDistance: function (elem, flag) {
        var location = 0;
        if (!elem) return;
        if (elem.offsetParent) {
            do {
                location += flag ? elem.offsetTop : elem.offsetLeft;
                elem = elem.offsetParent;
            } while (elem);
        }
        return location >= 0 ? location : 0;
    },

    // Bind multiiple events to a listener
    addListenerMulti: function (element, eventNames, listener) {
        var events = eventNames.split(" ");
        for (var i = 0, iLen = events.length; i < iLen; i++) {
            element.addEventListener(events[i], listener, { passive: false });
        }
    },

    // Remove multiiple events from a listener
    removeListenerMulti: function (element, eventNames, listener) {
        var events = eventNames.split(" ");
        for (var i = 0, iLen = events.length; i < iLen; i++) {
            element.removeEventListener(events[i], listener, {
                passive: false
            });
        }
    },

    collaborate: function ({ left, top, width, height, rowEnd, columnEnd }) {
        const details = typeof this.resizeWidget.editor?.getStart === "function"
            ? this.resizeWidget.editor : this.resizeWidget.editorDetails;
        const editorElement = details?.element || details?.editorElement;
        if (typeof details?.setAttribute !== "function" && !editorElement?.editor?.setAttribute) return;

        const style = this.resizeWidget.ownerDocument.createElement("span").style;
        style.cssText = this.resizeWidget.getAttribute("style") || "";
        if (left !== undefined) style.left = left + "px";
        if (top !== undefined) style.top = top + "px";
        if (width !== undefined) style.width = width + "px";
        if (height !== undefined) style.height = height + "px";
        if (rowEnd !== undefined) style.setProperty("grid-row-end", "span " + rowEnd);
        if (columnEnd !== undefined) style.setProperty("grid-column-end", "span " + columnEnd);

        const result = typeof details.setAttribute === "function"
            ? details.setAttribute("style", style.cssText)
            : editorElement.editor.setAttribute({ target: this.resizeWidget, name: "style", value: style.cssText });
        result?.catch(error => this.resizeWidget.dispatchEvent(new CustomEvent("editor-error", {
            bubbles: true,
            detail: { error }
        })));
    }
};

// Function to auto-resize the element based on its content
function autoResizeElement(element) {
    if (!element) return;

    if (element.tagName === "TEXTAREA") {
        element.style.height = "auto";

        const style = getComputedStyle(element);
        const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        // scrollHeight includes padding, but not borders.
        const height = element.scrollHeight +
            (style.boxSizing === "border-box" ? border : -padding);
        element.style.height = Math.max(0, height) + "px";
    } else if (element.tagName === "SELECT" && element.multiple) {
        element.size = Math.max(element.options.length, 1); // Ensure at least 1 visible option
    }
}

// Observe the resize of the element
function observeElementResize(element) {
    const resizeObserver = new ResizeObserver(() => {
        autoResizeElement(element);
    });

    resizeObserver.observe(element);
}

// Listen for input events on the entire document
function initAutoHeight(element) {
    if (
        element &&
        !(element instanceof HTMLCollection) &&
        !(element instanceof NodeList) &&
        !Array.isArray(element)
    ) {
        element = [element];
    } else if (!element) {
        element = document.querySelectorAll('[height="auto"]');

        // Add event listener for iframes on load
        document.addEventListener(
            "input",
            function (event) {
                // Check if the target element has height="auto"
                if (event.target.getAttribute("height") === "auto") {
                    autoResizeElement(event.target);
                }
            },
            false
        );
    }

    for (let i = 0; i < element.length; i++) {
        if (element[i].tagName === "TEXTAREA") {
            element[i].rows = 1;
        }
        autoResizeElement(element[i]);
        observeElementResize(element[i]); // Observe resize changes.
    }
}

initAutoHeight();

observer.init({
    name: "CoCreateResize",
    types: ["addedNodes"],
    selector: "[resizable]:not([resizable='false'])",
    callback: function (mutation) {
        coCreateResize.initElement(mutation.target);
    }
});

observer.init({
    name: "CoCreateAutoResize",
    types: ["addedNodes"],
    selector: "[height='auto']",
    callback: function (mutation) {
        initAutoHeight(mutation.target);
    }
});

observer.init({
    name: "CoCreateAutoResizeOptions",
    types: ["addedNodes"],
    selector: "[height='auto'] option",
    callback: function (mutation) {
        autoResizeElement(mutation.target.parentElement);
    }
});

coCreateResize.init({
    selector: "[resizable]:not([resizable='false'])",
    dragLeft: "[resize='left']",
    dragRight: "[resize='right']",
    dragTop: "[resize='top']",
    dragBottom: "[resize='bottom']"
});
export default coCreateResize;

/**
 * Preserves the element's original class value while resize updates grid sizing.
 * @name class
 * @kind member
 * @attribute
 * @environment client
 * @type {string}
 */

/**
 * Internal marker applied to this module's injected style element.
 * @name component
 * @kind member
 * @attribute
 * @environment client
 * @type {string}
 * @private
 */

/**
 * Enables automatic content-based resizing when set to "auto". This applies to textareas and multiple selects.
 * @name height
 * @kind member
 * @attribute
 * @environment client
 * @type {string}
 * @acceptedValues auto
 * @example
 * <textarea height="auto"></textarea>
 */

/**
 * Runtime state marker added while a resize gesture is active.
 * @name resizing
 * @kind member
 * @attribute
 * @environment client
 * @type {boolean}
 */

/**
 * Inline styles updated with the element's resized dimensions and grid span.
 * @name style
 * @kind member
 * @attribute
 * @environment client
 * @type {string}
 */

/**
 * Enables interactive resizing unless explicitly set to "false".
 *
 * @name resizable
 * @kind member
 * @attribute
 * @environment client
 * @type {boolean}
 * @acceptedValues false
 * @example
 * <div resizable><span resize="right"></span></div>
 */

/**
 * Marks a child element as a resize handle and selects its drag direction.
 *
 * @name resize
 * @kind member
 * @attribute
 * @environment client
 * @type {string}
 * @acceptedValues left, right, top, bottom
 * @example
 * <span resize="right"></span>
 */

/**
 * A light weight resize handler make any element resizable by adding data attributes or usinng init object. Great for Customized text box or text area.
 *
 * @module resize
 * @environment client
 */

/**
 * Declarative selectors recognized by this module.
 *
 * @name declarative-selectors
 * @kind member
 * @selectors
 * @environment client
 * @example
 * ```json
 * [
 *   "",
 *   "[resizable]:not([resizable='false'])",
 *   "[height='auto']",
 *   "[height='auto'] option"
 * ]
 * ```
 */
