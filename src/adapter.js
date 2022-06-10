import Uploader from "./uploader";
import {
    DATA_API,
    DEFAULT_OPTIONS
} from "./constants";

$.fn.uploader = function (options, ...args) {
    if (typeof options === 'string') {
        let $ele = $(this[0])
        let api = $ele.data(DATA_API);
        if (!api) {
            throw "this is not a uploader instance"
        }
        return api[options](...args)
    } else {
        return this.each(function () {
            let $ele = $(this)
            let api = $ele.data(DATA_API);
            if (!api) {
                api = new Uploader($ele, options || {});
                $ele.data(DATA_API, api);
            }
        })
    }

}
/**
 * 全局设置
 */
$.fn.uploaderSetup = function (options) {
    window[DEFAULT_OPTIONS] = options;
}

$.Uploader = Uploader