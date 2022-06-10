> jquery-upload 的事件

* `uploader-init` upload元素初始化完成触发
* `before-upload` 在准备好上传但是没有上传时触发
    * `waitUploadFiles` 待上传的文件列表
* `uploading` 已经开始上传时触发，每个文件触发一次
    * `file` 当前上传的文件
* `upload-success` 上传成功时触发
    * `file` 上传成功的文件
    * `data` 上传的响应信息
* `upload-error` 上传失败时触发
* `file-add` 新增文件时触发
* `file-remove` 删除一个文件时触发 