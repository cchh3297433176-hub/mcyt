# 📱 toAPP 备份/恢复完全指南

> 本文档告诉你如何在 toAPP 打包的 APP 里实现存档的备份和恢复。
> **如果你用的是 toAPP，直接看下面的「⭐ 首选方案：图片备份」即可，不需要配置任何东西！**

---

## ⭐ 首选方案：图片备份（toAPP 用户必看，零配置）

**这是专门为 toAPP 设计的方案，完全不需要 toAPP 支持文件下载，不需要任何权限配置！**

### 原理
把存档 JSON 数据压缩后编码成 PNG 图片的像素数据，生成一张图片。你只需要**长按图片 → 保存到相册**，就能把存档存到手机里。恢复时从相册选这张图片，自动解码还原存档。

### 备份步骤
1. 打开游戏，点顶部的「📤 备份」按钮（或初始页的「📤 备份存档」）
2. 点最下面的「🖼️ 生成图片备份（长按保存到相册）」
3. 等待几秒，会生成一张彩色图片
4. **长按这张图片 → 保存到相册**（或分享到微信/QQ）
5. 搞定！存档已经存在你的相册里了

### 恢复步骤
1. 打开游戏，点「📥 恢复」按钮（或初始页的「📥 导入备份」）
2. 找到「方式三：从图片恢复」
3. 点「🖼️ 从相册选图片」→ 选择你之前保存的备份图片
4. 或者：先在相册里长按备份图片 → 复制，然后回到游戏点「📋 粘贴图片」
5. 等待解码，存档自动恢复！

### 注意事项
- ⚠️ **一定要保存原图，不要截图！** 截图会导致像素数据损坏，无法解码
- ⚠️ 用微信发送图片时，选「原图」发送，否则微信会压缩图片导致数据损坏
- 图片顶部有彩色条纹，这是备份图片的标识，不要裁剪掉
- 一张图片就能存下整个存档（包括所有角色、聊天记录、剧情）

---

## 其他方案（可选）

如果你想尝试更"原生"的下载/分享方式，可以参考下面的配置。但对于 toAPP 用户，图片备份已经完全够用，下面的内容可以跳过。

---

## 🤔 为什么需要配置？

mcyt 模拟器是纯网页游戏，通过 toAPP 打包成 APK 后运行在 Android **WebView** 里。
WebView 默认有这些限制：

| 功能 | 浏览器里 | toAPP WebView 里（默认） |
|------|---------|------------------------|
| 网页生成文件并下载 | ✅ 正常 | ❌ 被拦截，报 "Can only download HTTP/HTTPS URIs" |
| 调用系统分享（navigator.share） | ✅ 正常 | ❌ WebView 不支持 |
| 点击「选择文件」按钮 | ✅ 正常 | ❌ 按钮点了没反应 |
| localStorage 持久化 | ✅ 正常 | ⚠️ 更新/重装 APP 可能被清空 |

本项目已经内置了 **NativeBridge 原生桥接层**（`js/10-native-bridge.js`），它会：
1. 自动检测 toAPP 是否暴露了原生 JS 接口
2. 如果有，直接调用原生能力下载/分享/选文件
3. 如果没有，自动降级到 Blob 下载 → Web Share → 复制文本

**但要让第 1 步（原生能力）生效，需要你在 toAPP 里做以下配置。**

---

## 🚀 配置步骤（toAPP）

### 方法一：开启 toAPP 的「文件下载」和「文件选择」权限（最简单）

1. 打开 toAPP，进入你的项目配置
2. 找到 **「WebView 设置」** 或 **「高级设置」**
3. 开启以下选项（如果有）：
   - ✅ **允许文件下载** / **支持 Blob 下载**
   - ✅ **允许文件选择** / **支持 input type=file**
   - ✅ **允许访问存储权限** / **写入外部存储**
4. 找到 **「权限」** 设置，确保申请了：
   - `android.permission.WRITE_EXTERNAL_STORAGE`（写入存储）
   - `android.permission.READ_EXTERNAL_STORAGE`（读取存储）
5. 重新打包 APK，安装后测试备份功能

### 方法二：配置自定义 JS 接口（如果 toAPP 支持）

如果 toAPP 支持「自定义 JavaScript 接口」或「Java 注入对象」，按以下步骤配置：

1. 在 toAPP 项目设置中找到 **「JS 接口」** / **「Java 对象注入」** / **「原生交互」**
2. 添加一个 JS 接口对象，**接口名（对象名）** 填：`mcytBridge`
3. 添加以下方法（如果 toAPP 是可视化配置，按方法名添加；如果需要写代码，参考本文档末尾的 Java 示例）：

| 方法名 | 参数 | 作用 |
|--------|------|------|
| `downloadFile` | `(String fileName, String content, String mimeType)` | 把文本内容保存为手机文件 |
| `shareFile` | `(String content, String fileName, String mimeType, String title)` | 调用系统分享面板分享文件 |
| `pickFile` | `(String accept)` | 打开系统文件选择器 |

4. 保存配置，重新打包

> 💡 **接口名不一定要叫 mcytBridge**，NativeBridge 会自动检测 `android`、`bridge`、`app`、`native`、`toAPP`、`webview` 等常见命名。
> 如果你用了其他名字，可以在游戏内的浏览器控制台执行：
> ```js
> NativeBridge.registerCustomBridge(window.你的接口名, 'downloadFile', 'shareFile', 'pickFile')
> ```

### 方法三：如果 toAPP 什么都不支持（终极方案）

如果 toAPP 是极简版，不支持任何自定义配置，别担心——NativeBridge 的多层降级机制仍然能工作：

1. **备份时**：点「📋 复制备份内容」→ 打开手机备忘录/微信文件传输助手 → 粘贴保存
2. **恢复时**：打开备份的文本 → 全选复制 → 回到游戏点「📥 恢复」→ 粘贴到文本框 → 导入
3. **分享时**：复制文本后，在微信/QQ/网盘里粘贴发送

虽然不如原生一键方便，但**100% 能保住你的存档数据**。

---

## ✅ 验证配置是否成功

1. 打开打包好的 APP
2. 进入游戏后，点顶部的「📤 备份」按钮
3. 看弹窗顶部的提示条：
   - 🟢 **绿色提示「✅ 已检测到APP原生接口，下载/分享功能可用」** → 配置成功！
   - 🟠 **橙色提示「📱 当前环境支持系统分享」** → 部分支持，分享可用，下载可能需要用复制
   - 🔴 **橙色提示「⚠️ 未检测到原生接口」** → 原生能力未生效，请用复制文本方式，或检查 toAPP 配置

4. 点「💾 下载到手机文件」测试：
   - 如果弹出「✅ 文件已保存到手机下载目录」→ 原生下载工作正常！
   - 去手机的「文件管理」→「Download」文件夹，应该能看到 `.json` 备份文件

5. 点「📲 分享备份」测试：
   - 如果弹出系统分享面板（能选微信/QQ/网盘等）→ 原生分享工作正常！

---

## 📂 Java 原生桥接代码示例（高级用户）

如果你使用的 toAPP 支持写入自定义 Java 代码，或者你自己用 Android Studio 打包，
可以用以下代码实现原生桥接。把它加入到你的 WebView Activity 中：

```java
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class McytNativeBridge {
    private final Activity context;
    private ValueCallback<Uri[]> filePathCallback;

    public McytNativeBridge(Activity context) {
        this.context = context;
    }

    // 注册到 WebView：webView.addJavascriptInterface(new McytNativeBridge(this), "mcytBridge");

    @JavascriptInterface
    public void downloadFile(String fileName, String content, String mimeType) {
        try {
            File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, fileName);
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(content.getBytes("UTF-8"));
            fos.close();
            // 通知系统扫描新文件
            context.sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(file)));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @JavascriptInterface
    public void shareFile(String content, String fileName, String mimeType, String title) {
        try {
            // 先保存到缓存目录
            File cacheDir = context.getCacheDir();
            File file = new File(cacheDir, fileName);
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(content.getBytes("UTF-8"));
            fos.close();

            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType(mimeType != null ? mimeType : "application/json");
            share.putExtra(Intent.EXTRA_STREAM, Uri.fromFile(file));
            share.putExtra(Intent.EXTRA_SUBJECT, title);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            context.startActivity(Intent.createChooser(share, title));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // 文件选择需要在 WebChromeClient 中实现 onShowFileChooser：
    // 在你的 Activity 中设置：
    // webView.setWebChromeClient(new WebChromeClient() {
    //     @Override
    //     public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
    //             FileChooserParams fileChooserParams) {
    //         McytNativeBridge.this.filePathCallback = filePathCallback;
    //         Intent i = new Intent(Intent.ACTION_GET_CONTENT);
    //         i.addCategory(Intent.CATEGORY_OPENABLE);
    //         i.setType("*/*");
    //         startActivityForResult(Intent.createChooser(i, "选择文件"), 1001);
    //         return true;
    //     }
    // });
    //
    // @Override
    // protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    //     if (requestCode == 1001 && filePathCallback != null) {
    //         Uri[] results = null;
    //         if (resultCode == Activity.RESULT_OK && data != null) {
    //             results = new Uri[]{ data.getData() };
    //         }
    //         filePathCallback.onReceiveValue(results);
    //         filePathCallback = null;
    //     }
    // }
}
```

---

## 💡 使用建议

1. **更新 APP 前必做**：打开游戏 → 点「📤 备份」→ 点「📲 分享备份」发到微信文件传输助手或网盘
2. **更新 APP 后**：打开游戏 → 如果发现自建角色/群聊没了 → 点「📥 恢复」→ 选择之前分享的文件或粘贴文本
3. **定期备份**：建议每周备份一次，或者在重大进度（解锁成就、建好群聊）后备份
4. **备份文件命名**：默认会自动命名为「频道名_第X天_备份.json」，方便你区分不同进度

---

## ❓ 常见问题

**Q: 点了「下载到手机文件」但找不到文件？**
A: 去手机的「文件管理」→「内部存储」→「Download」（下载）文件夹里找。如果用的是原生接口，也可能在「文档」或「APP 专属目录」里。

**Q: 分享到微信后，对方收到的是乱码？**
A: 微信对 `.json` 文件的预览可能有问题，但文件本身是完整的。让对方用「用其他应用打开」→ 选择文本编辑器，或者直接在游戏里「📥 恢复」→「选择文件」导入即可。

**Q: 备份文件太大复制不了？**
A: 存档里包含大量聊天记录和剧情时可能会比较大。这种情况建议用「分享备份」功能直接发文件，不要用复制文本。

**Q: 导入备份后还是有些东西没了？**
A: 检查备份时是否在游戏中（G.phase === 'playing'）。如果在初始页备份，会导出自动存档（mcyt_autosave）。建议在游戏进行中备份，这样数据最完整。
