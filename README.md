# jquery-uploader

[演示](https://thetbw.github.io/jquery-uploader/)

![](https://s2.loli.net/2022/06/10/hPoU48TqBXZs7GY.png)

### 编译

* clone项目
* 进入项目目录
* `npm install`
* `npm run build`

### 依赖
* jquery *
* font-awesome 4.7^

可选依赖

* [`viewerjs`](https://github.com/fengyuanchen/viewerjs) 用于支持图片放大预览

### 使用

基础使用
```javascript
$("#input").uploader({
    multiple: true,
    ajaxConfig: {
        url: "/upload"
    }
})

```

* [options](./doc/options.md)
* [events](./doc/events.md)
* [methods](./doc/methods.md)

### 待完善

* 小图预览，其他类型会显示默认图标