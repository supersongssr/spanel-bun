# SPanel Development Guidelines
你可以直接读写文件
## 环境


## Tests
测试脚本存放在 tests/ 目录
测试代码不应该污染主项目代码.
tests/ 下的脚本,必须在 $System_Config['environmet'] = test;   时候才能生效! 
生成 tests/ 目录下的脚本的时候,应该自动测试

## Build/Lint/  Commands



## 命令与语法约束
```where```: 修改的文件的位置 或 模块位置
```why```: 为什么修改
```how```: 如何修改代码

```input```: 模块接受哪些数据
```output```: 模块应该输出什么数据
```do```: 模块做哪些任务和工作

```must```:  模块收到哪些 约束 , 必须遵守的条件


## 工作流程 wordflow 
0. 读取 *README.md* 获取项目的结构 和 数据结构 和模块信息; 
1. 跟随 <where> 快速定位要修改的代码部分,了解当前代码状态
2. 根据 <why> 了解修改意图
3. 根据 <how> 了解 代码 修改的思路
4. 修改的代码 必须 满足 <must> 中约束的条件
5. 读取 *AI* 文件夹中的 yaml 文件, 获取 要修改的模块对应的 <input> <output> <must>数据结构和约束.
6. 代码 coding 完成后, 必须按照 <must> 的要求, 更新 *tests/* 中的测试文件
8. 代码 coding 完成后, 更新 *AI* 文件夹对应的 功能 、 模块 、 API 中的 内容.
9. 代理 coding 完成后, 更新 *docs* 文件夹中 的 文档. 
10. 代码 coding 完成后, 在 AI/updates/ 目录下, 按照 <YYYY-MM-DD_HH-mm>.yaml 记录这次 更改. 记录格式如下:
```yaml
when: 2000-01-01T11:22:30 #什么时候更新的  <ISO 8601 时间格式>
where: #更新了哪些文件
why: # 为什么更新
how: # 怎么更新的
must: # 约束条件是什么
```
