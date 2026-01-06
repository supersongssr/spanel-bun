# version 0

- [] 项目初始化, 我现在需要开发 项目, 请帮我初始化环境
    1. 创建podman容器, bun , 映射本地址 /root/git/spanel-bun 到容器中; 
        容器加入 main 自定义网络;  
    完成 docs/INSTALL.md 安装文档
    2. 安装 playwright mcp 服务到 podman 容器中, 然后 告诉我如何在 claude code 接入 这个 mcp .
容器文件放在 podman/目录下
创建的 playwright mcp 是通用的, 可以给所有的 项目使用 ; 名字改为一下

将根目录的文件清理一下, 保持根目录清爽, 多余的文件按照目录放在 doc/ 
检查 ~/.calude 中的 settings.json 文件中是否配置了 playwright 的 mcp服务,配置是否有误
