import $ from "jquery"
import {
    EVENT_UPLOADER_INIT,
    DEFAULT_OPTIONS,
    EVENT_FILE_ADD,
    EVENT_FILE_REMOVE,
    // EVENT_FILE_CLEAR,
    EVENT_BEFORE_UPLOAD,
    EVENT_UPLOADING,
    EVENT_UPLOAD_SUCCESS,
    EVENT_UPLOAD_ERROR
} from "./constants"

const CARD_SELECTOR = {
    ACTION_DIV: ".jquery-uploader-preview-action",
    ACTION_DELETE: ".jquery-uploader-preview-action .file-delete",
    PROGRESS_DIV: ".jquery-uploader-preview-progress",
    PROGRESS_MASK: ".jquery-uploader-preview-progress > .progress-mask",
    PREVIEW_IMAGE: ".jquery-uploader-preview-main > img"
}

function uuid() {
    let s = [];
    let hexDigits = "0123456789abcdef";
    for (let i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = "-";
    return s.join("");
}

/**
 * 需要上传的文件
 */
class UploaderFile {
    constructor(id, name, url, status, file, $ele) {
        this.id = id
        this.name = name
        this.url = url
        this.status = status
        this.file = file
        this.$ele = $ele
    }
}

/**
 * jquery 上传插件
 * @author thetbw
 */
export default class Uploader {

    constructor($element, options) {
        this.$originEle = $element
        let globalDefaultOptions = window[DEFAULT_OPTIONS] ? window[DEFAULT_OPTIONS] : {}
        this.options = $.extend(true, {}, Uploader.defaults, globalDefaultOptions, options);
        /**
         * 待上传的文件
         * @type {UploaderFile[]}
         */
        this.files = []
        this.checkOptions()
        this.initEle()
        this.initEvent()
    }

    /**
     * 检查元素的配置是否正确
     */
    checkOptions() {
        // console.debug(this.options)
        if (this.options.mode !== Uploader.mode.url) {
            throw `暂不支持的模式 ${this.options.mode}`
        }
        if (this.$originEle.attr("type") !== "text" && this.$originEle.attr("type")) {
            throw `url模式下，元素的类型只能为 text,不能为 ${this.$originEle.attr("type")}`
        }
    }

    /**
     * 初始化元素
     */
    initEle() {
        //隐藏原生元素
        this.$originEle.css("display", "none")
        this.$selectCard = $(
            `<div class="jquery-uploader-select-card">
                <div class="jquery-uploader-select">
                    <div class="upload-button">
                        <i class="fa fa-plus"></i><br/>
                        <a>上传</a>
                    </div>
                </div>
            </div>`)
        this.$uploaderContainer = $(`<div class="jquery-uploader-preview-container"></div>`)
        this.$uploader = $(`<div class="jquery-uploader"></div>`)
            .append(this.$uploaderContainer)
        if (this.options.parent) {
            this.options.parent.append(this.$uploader)
        } else {
            this.$originEle.parent().append(this.$uploader)
        }

        if (this.options.mode === Uploader.mode.url) {
            //添加默认元素
            let value = this.$originEle.val()
            this.createDefaultFiles(value);
        }

        this.$originEle.trigger(EVENT_UPLOADER_INIT)
    }

    /**
     * 手动上传
     */
    upload() {
        this.handleFileUpload()
        return this.$originEle
    }

    /**
     * 清除所有文件
     */
    clean() {
        this.files = []
        this.refreshPreviewFileList()
        this.refreshValue()
        return this.$originEle
    }

    /**
     * 获取上传的文件
     * @return {UploaderFile[]} 上传的文件列表
     */
    uploadFiles() {
        return this.files
    }


    initEvent() {

    }

    //刷新元素的值
    refreshValue() {
        let oldValue = this.$originEle.val()
        let urls = [];
        this.files.forEach(file => {
            if (file.status === Uploader.fileStatus.uploaded || file.status === Uploader.fileStatus.initial) {
                urls.push(file.url)
            }
        })
        let newValue = urls.join(",")
        if (oldValue !== newValue) {
            this.$originEle.val(newValue).trigger("change")
        }

    }

    refreshPreviewFileList() {
        this.$uploaderContainer.empty();
        this.files.forEach(file => {
            this.$uploaderContainer.append(file.$ele)
            file.$ele.find(CARD_SELECTOR.ACTION_DELETE).on("click", this.handleFileDelete.bind(this))
        })
        if (this.options.multiple || this.files.length === 0) {
            this.$uploaderContainer.append(this.$selectCard)
            this.$selectCard.on("click", this.handleFileSelect.bind(this))
        }
    }

    createDefaultFiles(value) {
        let defaultFiles = []
        if (this.options.defaultValue) {
            defaultFiles = this.options.defaultValue
        } else if (value) {
            let links = this.options.multiple ? value.split(",") : [value];
            links.forEach((link, index) => {
                defaultFiles.push({
                    name: "default" + index,
                    url: link,
                })
            })
        }


        defaultFiles.forEach((file) => {
            let id = uuid();
            let $previewCard = $(
                `<div class="jquery-uploader-card" id="${id}">
                    <div class="jquery-uploader-preview-main">
                        <div class="jquery-uploader-preview-action">
                            <ul>
                                <li class="file-delete"><i class="fa fa-trash-o"></i></li>
                            </ul>
                        </div>
                        <img src="${file.url}" alt="preview"/>
                    </div>
                 </div>`)
            $previewCard.find(CARD_SELECTOR.ACTION_DELETE).on("click", this.handleFileDelete.bind(this))
            this.files.push({
                id: id,
                name: file.name,
                url: file.url,
                status: Uploader.fileStatus.initial,
                file: null,
                $ele: $previewCard
            })
        })
        this.refreshPreviewFileList()
        this.refreshValue()
    }

    //文件上传进度更新
    onFileUploadUpdate(file, progress) {
        file.$ele.find(CARD_SELECTOR.PROGRESS_MASK).css("height", 100 - progress + "%")
    }

    onFileUploadSuccess(file, data) {
        this.$originEle.trigger(EVENT_UPLOAD_SUCCESS, file, data)
        file.$ele.find(CARD_SELECTOR.PROGRESS_DIV).hide()
        file.$ele.find(CARD_SELECTOR.ACTION_DIV).show()
        let convertedRes
        try {
            convertedRes = this.options.ajaxConfig.responseConverter(file, data);
            if (!convertedRes.url) {
                console.error("数据格式错误，没有url字段")
                this.onFileUploadError(file, "数据格式错误，没有url字段")
                return;
            }
        } catch (e) {
            console.error("数据转换异常", e)
            this.onFileUploadError(file, "数据转换异常")
            return
        }
        file.name = convertedRes.name || file.name
        file.url = convertedRes.url
        file.status = Uploader.fileStatus.uploaded
        file.$ele.find(CARD_SELECTOR.PREVIEW_IMAGE).attr("src", file.url)
        this.refreshPreviewFileList()
        this.refreshValue()
    }

    // 文件上传失败
    onFileUploadError(file, errorMsg) {
        this.$originEle.trigger(EVENT_UPLOAD_ERROR, file, errorMsg)
        file.$ele.find(CARD_SELECTOR.PROGRESS_DIV).hide()
        file.$ele.find(CARD_SELECTOR.ACTION_DIV).show()
        file.$ele.attr("title", errorMsg)
        file.$ele.css("border-color", "red")
    }

    //选择文件
    handleFileSelect() {
        $(`<input type="file" ${this.options.multiple ? 'multiple' : ''} />`)
            .on('change', (event) => {
                this.handleFileAdd(event.target.files)
            }).click()
    }

    //添加文件
    handleFileAdd(files) {
        const windowURL = window.URL || window.webkitURL;
        let addFiles = []
        for (let i = 0; i < files.length; i++) {
            let file = files[i]
            let imageUrl = file.type.indexOf("image") !== -1 ? windowURL.createObjectURL(file) : null
            let id = uuid()
            let $previewCard = $(
                `<div class="jquery-uploader-card" id="${id}">
                    <div class="jquery-uploader-preview-main">
                        <div class="jquery-uploader-preview-action">
                            <ul>
                                <li class="file-delete"><i class="fa fa-trash-o"></i></li>
                            </ul>
                        </div>
                        <div class="jquery-uploader-preview-progress">
                            <div class="progress-mask"></div>
                            <div class="progress-loading">
                                <i class="fa fa-spinner fa-spin"></i>
                            </div>
                        </div>
                        <img src="${imageUrl}"/>
                    </div>
                 </div>`)
            $previewCard.find(".jquery-uploader-preview-action").hide()
            addFiles.push({
                id: id,
                name: file.name,
                url: imageUrl,
                status: Uploader.fileStatus.selected,
                file: file,
                $ele: $previewCard
            })
        }
        this.files.push(...addFiles)
        this.refreshPreviewFileList()
        this.$originEle.trigger(EVENT_FILE_ADD, addFiles)
        if (this.options.autoUpload === true) {
            this.handleFileUpload()
        }
    }

    //处理文件上传
    handleFileUpload() {
        let waitUploadFiles = []
        this.files.forEach(file => {
            if (file.status === Uploader.fileStatus.selected) {
                waitUploadFiles.push(file)
            }
        })
        this.$originEle.trigger(EVENT_BEFORE_UPLOAD, waitUploadFiles)
        waitUploadFiles.forEach(file => {
            this.$originEle.trigger(EVENT_UPLOADING, file)
            try {
                this.options.ajaxConfig.ajaxRequester(
                    this.options.ajaxConfig,
                    file,
                    (progress) => {
                        this.onFileUploadUpdate(file, progress)
                    },
                    (data) => {
                        this.onFileUploadSuccess(file, data)
                    },
                    (error) => {
                        this.onFileUploadError(file, error)
                    }
                )
            } catch (e) {
                this.onFileUploadError(file, "ajax请求异常")
            }

        })
    }


    //删除文件
    handleFileDelete(event) {
        let $deleteCard = $(event.target).parents(".jquery-uploader-card")
        let id = $deleteCard[0].id
        $deleteCard.remove()
        let index = -1;
        this.files.forEach((file, i) => {
                if (file.id === id) {
                    index = i
                }
            }
        )
        let removedFile = this.files.splice(index, 1)
        this.$originEle.trigger(EVENT_FILE_REMOVE, ...removedFile)
        this.refreshValue()
        this.refreshPreviewFileList()
    }
}

Uploader.config = {
    /**
     *  构建请求参数
     * @param uploaderFile {UploaderFile} 待上传的文件
     * @return {FormData}
     */
    paramsBuilder: function (uploaderFile) {
        let form = new FormData();
        form.append("file", uploaderFile.file)
        return form
    },
    /**
     * 负责转换上传的数据
     * @param uploaderFile {UploaderFile} 上传的文件
     * @param response  响应的数据
     * @return 转换后的数据，格式应该为
     * {
     *     url:"",//文件链接
     *     previewUrl:"",//预览地址，为空则为 url
     *     name: "",文件名称，为空则为 文件1，2，3，依次排序
     * }
     */
    responseConverter: function (uploaderFile, response) {
        return {
            url: response.data,
            name: null,
        }
    },
    /**
     * ajax 的具体请求,该方法必须为异步
     * @param config 请求配置
     * @param uploaderFile {UploaderFile} 需要上传的文件
     * @param progressCallback 更新上传进度 ,参数 0-100
     * @param successCallback 上传成功回调,上传成功后，应该返回响应信息，响应信息会由 responseConverter 解析
     * @param errorCallback  上传失败回调，可以传入失败信息
     */
    ajaxRequester: function (config, uploaderFile, progressCallback, successCallback, errorCallback) {
        $.ajax({
            url: config.url,
            contentType: false,
            processData: false,
            method: config.method,
            data: config.paramsBuilder(uploaderFile),
            success: function (response) {
                successCallback(response)
            },
            error: function (response) {
                console.error("上传异常", response)
                errorCallback("上传异常")
            },
            xhr: function () {
                let xhr = new XMLHttpRequest();
                //使用XMLHttpRequest.upload监听上传过程，注册progress事件，打印回调函数中的event事件
                xhr.upload.addEventListener('progress', function (e) {
                    let progressRate = (e.loaded / e.total) * 100;
                    progressCallback(progressRate)
                })
                return xhr;
            }
        })
    }
}

/**
 * 上传模式
 */
Uploader.mode = {
    //链接模式，输入框为一个文本框，文件上传成功后会设置对应url
    url: "url",
    //仅为文件选择，不涉及上传,选择后会设置到原元素,暂不支持
    file: "file",
    //什么都不做，暂不支持
    custom: "custom"
}

/**
 * 文件状态
 * */
Uploader.fileStatus = {
    //文件刚被选择
    selected: "selected",
    //文件上传中
    uploading: "uploading",
    //文件已上传
    uploaded: "uploaded",
    //文件上传失败
    error: "error",
    //文件是预览文件
    initial: " initial"
}


/**
 * 默认参数
 */
Uploader.defaults = {
    mode: Uploader.mode.url,
    //是否多选
    multiple: false,
    //默认值，如果该值不为null,将使用该值来作为 默认值，否则使用 input 的value值
    defaultValue: null,
    //展示的父元素，默认为当前元素同级
    parent: null,
    //允许的文件后缀，暂时不支持
    allowFileExt: "*",
    //是否自动上传
    autoUpload: true,
    //上传配置，仅当使用默认上传的时候启用
    ajaxConfig: {
        url: "",
        method: "post",
        //负责构建请求参数，当使用子定义 ajaxRequester 时，这个也可以忽略
        paramsBuilder: Uploader.config.paramsBuilder,
        //负责进行请求
        ajaxRequester: Uploader.config.ajaxRequester,
        //负责转换请求的数据
        responseConverter: Uploader.config.responseConverter
    },
}