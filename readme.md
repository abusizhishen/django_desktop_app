# django 应用打包桌面app

## 1. 安装pyinstaller

```bash
pip install pyinstaller
pyinstaller -F manage.py #打包成独立文件
```

```bash
cp /path_to_django/dist/manage . 
```

## 2.打包

```bash
cnpm install
cnpm run build
```

