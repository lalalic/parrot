introduction
----------
make chrome extension code usable for react-native-web

protocol
--------
* content_scripts: export each bro as single function [name], and mapped in exported uri {[name]:url}
* services:
* background.js

merged
====
```js

//from bros/wechat.js as a content_script
export function wechat(){

}

export const uri={
    "wechat":"https://wx.qq.com",//from manifest.json#content_scripts.matches[0]
}

//from services/diffusion.js
function diffusion(){

}

export const services={
    diffusion,
}

export function subscriptAsHelper({helper, chrome, window, Qili}){
    `${fs.readFileSync(`background.js`)}`
}

```
