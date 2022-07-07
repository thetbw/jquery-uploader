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


/**
 * 文件card选择器
 */
const CARD_SELECTOR = {
    ACTION_DIV: ".jquery-uploader-preview-action",
    ACTION_DELETE: ".jquery-uploader-preview-action .file-delete",
    ACTION_VIEW: ".jquery-uploader-preview-action .file-view",
    PROGRESS_DIV: ".jquery-uploader-preview-progress",
    PROGRESS_MASK: ".jquery-uploader-preview-progress > .progress-mask",
    PREVIEW_IMAGE: ".jquery-uploader-preview-main > img"
}

/**
 * 文件类型，用于根据类型来展示预览
 */
const FILE_TYPE = {
    IMAGE: "image",
    OTHER: "other"
}

const IMAGE_EXT = [
    "jpg", "png", "jpeg", "gif", "bmp"
]

const BLOB_UTILS = function () {
    const windowURL = window.URL || window.webkitURL;
    /**
     * blob缓存
     * @type {Map<String, Blob>}
     */
    let dict = new Map()
    return {
        // 创建blob url
        createBlobUrl: function (blob) {
            let blobUrl = windowURL.createObjectURL(blob)
            dict.set(blobUrl, blob)
            return blobUrl
        },
        // 销毁 blob 对象
        revokeBlobUrl: function (url) {
            windowURL.revokeObjectURL(url)
            dict.delete(url)
        },
        //根据 url 获取 blob对象
        getBlobFromUrl: function (url) {
            return dict.get(url)
        }
    }
}()

function exitsViewerJs() {
    return window.Viewer && typeof (window.Viewer) == "function"
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

function getFileTypesFromUrl(url) {
    if (!url || url.length === 0) {
        return FILE_TYPE.OTHER
    }
    if (url.startsWith("blob")) {
        let blob = BLOB_UTILS.getBlobFromUrl(url)
        if (blob.type.indexOf("image") !== -1) {
            return FILE_TYPE.IMAGE
        }
        return FILE_TYPE.OTHER
    } else {
        for (let ext of IMAGE_EXT) {
            if (url.endsWith(ext)) {
                return FILE_TYPE.IMAGE
            }
        }
        return FILE_TYPE.OTHER
    }
}

/**
 * 需要上传的文件
 */
class UploaderFile {
    constructor(id, type, name, url, status, file, $ele) {
        this.id = id
        this.type = type
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
        this.id = uuid()
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
        //判断只读模式
        if (this.$originEle[0].hasAttribute("readonly")
            || this.$originEle[0].hasAttribute("disabled")
            || this.options.readonly) {
            this.readonly = true
            if (!this.$originEle.val()) {
                console.error("只读模式的值不能为空")
            }
        } else {
            this.readonly = false
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
     * 创建上传文件
     * @param id 文件id
     * @param url 文件url
     * @param type 文件的类型，如果为空，将从url解析
     * @return {*|jQuery|HTMLElement}
     */
    createFileCardEle(id, url, type) {
        let filePreview = type === FILE_TYPE.IMAGE ? `<img alt="preview" class="files_img" src="${url}"/>` : `<div class="file_other"></div>`

        //判断当前是否支持预览
        let viewerHtml = "";
        let deleteHtml = ""
        if (exitsViewerJs() && type === FILE_TYPE.IMAGE) {
            viewerHtml = `<li class="file-view"><i class="fa fa-eye"></i></li>`
        }
        if (!this.readonly) {
            deleteHtml = `<li class="file-delete"><i class="fa fa-trash-o"></i></li>`
        }
        let $previewCard = $(
            `<div class="jquery-uploader-card" id="${id}">
                    <div class="jquery-uploader-preview-main">
                        <div class="jquery-uploader-preview-action">
                            <ul>
                                ${viewerHtml}
                                ${deleteHtml}
                            </ul>
                        </div>
                        <div class="jquery-uploader-preview-progress">
                            <div class="progress-mask"></div>
                            <div class="progress-loading">
                                <i class="fa fa-spinner fa-spin"></i>
                            </div>
                        </div>
                        ${filePreview}
                    </div>
                 </div>`)
        $previewCard.find(CARD_SELECTOR.PROGRESS_DIV).hide()
        return $previewCard
    }

    /**
     * 警告样式
     * @param $ele
     */
    fileCardWaring($ele) {
        $ele.css("box-shadow", "0px 0px 3px 1px #f8ac59 inset")
    }

    /**
     * error 样式
     * @param $ele 错误样式
     */
    fileCardError($ele) {
        $ele.css("box-shadow", "0px 0px 3px 1px #ed5565 inset")
    }

    /**
     * 默认样式
     * @param $ele 文件元素
     */
    fileCardDefault($ele) {
        $ele.css("box-shadow", "")
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
            file.$ele.find(CARD_SELECTOR.ACTION_VIEW).on("click", this.handleFileView.bind(this))
        })
        if ((this.options.multiple || this.files.length === 0) && !this.readonly) {
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
                let type = getFileTypesFromUrl(link)
                defaultFiles.push({
                    name: "default" + index,
                    type: type,
                    url: link,
                })
            })
        }


        defaultFiles.forEach((file) => {
            let id = uuid();
            if (!file.type) {
                file.type = getFileTypesFromUrl(file.url)
            }
            let $previewCard = this.createFileCardEle(id, file.url, file.type)
            this.files.push({
                id: id,
                type: file.type,
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
        if (file.url && file.url.startsWith("blob")) {
            //销毁旧的资源
            BLOB_UTILS.revokeBlobUrl(file.url)
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
        file.$ele.attr("title", errorMsg)
        this.fileCardError(file.$ele)
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
        let addFiles = []
        for (let i = 0; i < files.length; i++) {
            let file = files[i]
            let type = file.type.indexOf("image") !== -1 ? FILE_TYPE.IMAGE : FILE_TYPE.OTHER
            let url = BLOB_UTILS.createBlobUrl(file)
            let id = uuid()
            let $previewCard = this.createFileCardEle(id, url, type)
            this.fileCardWaring($previewCard)
            addFiles.push({
                id: id,
                type: type,
                name: file.name,
                url: type,
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
                this.fileCardDefault(file.$ele)
                file.$ele.find(CARD_SELECTOR.PROGRESS_DIV).show()
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
        if (removedFile.url) {
            BLOB_UTILS.revokeBlobUrl(removedFile.url)
        }
        this.$originEle.trigger(EVENT_FILE_REMOVE, ...removedFile)
        this.refreshValue()
        this.refreshPreviewFileList()
    }

    handleFileView(event) {
        let $selectCard = $(event.target).parents(".jquery-uploader-card")
        let id = $selectCard[0].id
        let uploaderFile = null
        //移除旧的图片容器
        this.viewer && this.viewer.destroy()
        $("#viewer--" + this.id).remove()
        //添加新的
        let $imageViewContainer = $(`<div style="display: none" id="viewer-${this.id}"></div>`)
        this.files.forEach((file) => {
                if (file.id === id) {
                    uploaderFile = file
                }
                if (file.type === FILE_TYPE.IMAGE) {
                    $imageViewContainer.append($(`<img id="img-${file.id}" src="${file.url}" alt="${file.name}"/>`))
                }
            }
        )
        if (!uploaderFile) {
            throw "error,file data not found"
        }
        $(document.body).append($imageViewContainer)
        this.viewer = new window.Viewer(document.getElementById("viewer-" + this.id))
        $("#img-" + uploaderFile.id).click()


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
    /**
     * 是否为只读模式,默认 false
     * 满足一下其中一个条件，则为只读模式，否则为正常模式 (只读模式值不能为空)
     * 1 元素有 `readonly` 属性
     * 2 元素有 `disabled` 属性
     * 3 option 中 readonly 为 true
     */
    readonly: false,
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