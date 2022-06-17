> jquery-upload 的选项

默认的选项

```javascript
//文件格式为
class UploaderFile {
    constructor(id, type, name, url, status, file, $ele) {
        //文件唯一id，自动生成
        this.id = id
        //文件类型，目前只支持 image,other，如果type为空，type将根据url推断
        this.type = type
        //文件名称，暂时没别的用处
        this.name = name
        //文件url,选择文件后是 blob链接，上传成功后会被替换成上传链接
        this.url = url
        //文件状态，暂时不建议外部操作
        this.status = status
        //文件 file 对象
        this.file = file
        //文件元素
        this.$ele = $ele
    }
}

Uploader.config = {
    /**
     *  构建请求参数，
     * @param uploaderFile {UploaderFile} 待上传的文件
     * @return {FormData} 返回的数据用于 ajax的data
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
     * @param successCallback 上传成功回调,上传成功后，应该返回具体的信息 响应信息会由 responseConverter 解析
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

const defaultOptions = {
    mode: Uploader.mode.url,
    //是否多选
    multiple: false,
    /**
     * 默认值，如果该值不为null,将使用该值来作为 默认值，否则使用 input 的value值
     * 格式见上面 UploaderFile
     * 需要提供 至少 url 一个属性
     * 如果 type为空，type将根据url推断
     */
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
        //负责构建请求参数 当使用子定义 ajaxRequester 时，这个也可以忽略
        paramsBuilder: Uploader.config.paramsBuilder,
        //负责进行请求
        ajaxRequester: Uploader.config.ajaxRequester,
        //负责转换请求的数据
        responseConverter: Uploader.config.responseConverter
    }
}
```