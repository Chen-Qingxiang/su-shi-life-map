# 章节知识关系数据结构

## 目标

把章节、行程、人物、事件、作品和来源从并列列表变成可追踪的知识关系。

```text
Journey
├── Visit
├── PersonLink
├── EventGroup
├── Work
├── VisitLink
└── SourceRef
```

## Journey

章节旅程继续使用 `journey_id`、`chapter`、年代、摘要、阶段和 `source_note`。`source_note` 是当前章节最基础的来源记录。

## Visit

行程节点来自各章 `sushi-journey-chapter-XX.js`，重要字段包括：

```js
{
  visit_id,
  journey_id,
  phase_id,
  order,
  time,
  stage,
  ancient_place,
  modern,
  event,
  reading,
  certainty
}
```

`certainty` 分为：

- `high`：城市、任所或文献明确地点；
- `medium`：范围较可靠，但具体点位仍是近似；
- `low`：古迹、园亭、驿站或路线范围待核。

## PersonLink

人物与章节的关系记录：

```js
{
  link_id,
  journey_id,
  person_id,
  relation_status,
  role_in_chapter,
  certainty,
  visit_ids,
  work_ids,
  seed_event_ids,
  source_refs,
  evidence_note
}
```

`relation_status`：

- `curated`：人工明确；
- `event_seed`：来自已建档章节事件；
- `text_match`：由姓名、字、号在章节文字中匹配；
- `derived`：程序从其他关系派生。

自动匹配必须显示 `evidence_note`，不能冒充人工考据。

## EventGroup

事件不等同于单个行程节点。当前实现按“章节阶段 + 事件性质”聚合：

```js
{
  event_id,
  journey_id,
  phase_id,
  phase_title,
  title,
  type,
  visits,
  works,
  people,
  certainty,
  summary,
  source_refs
}
```

后续可把徐州抗洪、乌台诗狱等升级为人工事件档案。

## VisitLink

节点级知识关系：

```js
{
  link_id,
  journey_id,
  visit_id,
  person_ids,
  work_ids,
  event_ids,
  source_refs,
  certainty,
  relation_status
}
```

这使地图节点、时间轴、人物、事件和作品可以使用稳定 ID 双向跳转。

## 作品正文状态

```text
local     本地校录原文
external  明确外部全文页面
search    需要自动检索
missing   尚无全文
```

`local` 只能用于正文已保存于仓库的作品。

## SourceRef

```js
{
  source_id,
  label,
  citation,
  kind
}
```

后续建议扩展作者、书名、卷次、页码、版本、URL、引文与访问日期。

## 当前实现文件

- `data/sushi-knowledge.js`：补充人物、人物别名、每章明确人物种子及状态定义。
- `data/sushi-local-work-texts.js`：重要作品本地正文、来源页和校录状态。
- `src/knowledge-model.js`：生成章节上下文，建立 PersonLink、EventGroup 和 VisitLink，并渲染人物与事件详情。
