# jquery-uploader

[演示](./index.html)

![](https://s2.loli.net/2022/06/10/hPoU48TqBXZs7GY.png)

### 编译

* clone项目
* 进入项目目录
* `npm install`
* `npm run build`



### 使用
基础使用
```javascript
$("#input").uploader({
    multiple:true,
    ajaxConfig:{
        url:"/upload"
    }
})

```
* [options](./doc/options.md)
* [events](./doc/events.md)
* [methods](./doc/methods.md)


### 待续